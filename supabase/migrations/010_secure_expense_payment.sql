-- 010_secure_expense_payment.sql

-- 1. Create a trigger function to block direct updates/inserts to protected payment fields
CREATE OR REPLACE FUNCTION check_expense_payment_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se a flag de bypass da RPC não estiver ativa
    IF current_setting('app.expense_payment_rpc', true) IS DISTINCT FROM 'true' THEN
        
        IF TG_OP = 'INSERT' THEN
            IF NEW.payment_status = true OR NEW.paid_at IS NOT NULL OR NEW.payment_method IS NOT NULL OR NEW.paid_account_id IS NOT NULL THEN
                RAISE EXCEPTION 'Acesso negado: Campos de pagamento protegidos. Use as funções RPC apropriadas.';
            END IF;
        END IF;

        IF TG_OP = 'UPDATE' THEN
            IF NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
               NEW.paid_at IS DISTINCT FROM OLD.paid_at OR
               NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
               NEW.paid_account_id IS DISTINCT FROM OLD.paid_account_id THEN
                RAISE EXCEPTION 'Acesso negado: Modificação direta de campos de pagamento protegida. Use as funções RPC apropriadas.';
            END IF;
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_expense_payment_integrity ON public.expenses;
CREATE TRIGGER enforce_expense_payment_integrity
BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION check_expense_payment_integrity();


-- 2. Refactor pay_expense_rpc
DROP FUNCTION IF EXISTS pay_expense_rpc(uuid, uuid, uuid, text, date);

CREATE OR REPLACE FUNCTION pay_expense_rpc(
    p_expense_id uuid,
    p_paid_account_id uuid,
    p_payment_method text,
    p_paid_at date
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_expense record;
    v_account record;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Usuário não autenticado');
    END IF;

    -- Fetch and lock the expense
    SELECT * INTO v_expense 
    FROM public.expenses 
    WHERE id = p_expense_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Despesa não encontrada');
    END IF;

    IF v_expense.payment_status = true THEN
        RETURN json_build_object('error', 'Esta despesa já está paga');
    END IF;

    IF v_expense.credit_card_id IS NOT NULL THEN
        RETURN json_build_object('error', 'Despesas de cartão de crédito devem ser pagas pela fatura');
    END IF;

    -- Fetch the target account
    SELECT * INTO v_account 
    FROM public.accounts 
    WHERE id = p_paid_account_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Conta de pagamento não encontrada');
    END IF;

    -- Execute operations bypassing the trigger
    PERFORM set_config('app.expense_payment_rpc', 'true', true);

    -- Deduct from account balance
    UPDATE public.accounts
    SET balance = balance - v_expense.amount,
        updated_at = now()
    WHERE id = p_paid_account_id;

    -- Update the expense
    UPDATE public.expenses
    SET payment_status = true,
        paid_at = p_paid_at,
        payment_method = p_payment_method,
        paid_account_id = p_paid_account_id
    WHERE id = p_expense_id;

    RETURN json_build_object('success', true);
END;
$$;


-- 3. Refactor undo_expense_payment_rpc
DROP FUNCTION IF EXISTS undo_expense_payment_rpc(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION undo_expense_payment_rpc(
    p_expense_id uuid,
    p_fallback_account_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_expense record;
    v_target_account_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'Usuário não autenticado');
    END IF;

    SELECT * INTO v_expense 
    FROM public.expenses 
    WHERE id = p_expense_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Despesa não encontrada');
    END IF;

    IF v_expense.payment_status = false THEN
        RETURN json_build_object('error', 'Esta despesa não está paga');
    END IF;

    -- Determine the account to refund
    IF v_expense.paid_account_id IS NOT NULL THEN
        SELECT id INTO v_target_account_id 
        FROM public.accounts 
        WHERE id = v_expense.paid_account_id AND user_id = v_user_id
        FOR UPDATE;
        
        IF NOT FOUND THEN
            IF p_fallback_account_id IS NULL THEN
                RETURN json_build_object('error', 'ACCOUNT_NOT_FOUND', 'message', 'Conta original foi excluída. Informe uma conta de destino.');
            ELSE
                v_target_account_id := p_fallback_account_id;
                -- Lock fallback account
                PERFORM 1 FROM public.accounts WHERE id = v_target_account_id AND user_id = v_user_id FOR UPDATE;
                IF NOT FOUND THEN
                     RETURN json_build_object('error', 'Conta de destino inválida ou não pertence ao usuário.');
                END IF;
            END IF;
        END IF;
    ELSE
        IF v_expense.account_id IS NOT NULL THEN
            SELECT id INTO v_target_account_id 
            FROM public.accounts 
            WHERE id = v_expense.account_id AND user_id = v_user_id
            FOR UPDATE;
            
            IF NOT FOUND THEN
                IF p_fallback_account_id IS NULL THEN
                    RETURN json_build_object('error', 'ACCOUNT_NOT_FOUND', 'message', 'Conta original não encontrada. Informe uma conta.');
                ELSE
                    v_target_account_id := p_fallback_account_id;
                    PERFORM 1 FROM public.accounts WHERE id = v_target_account_id AND user_id = v_user_id FOR UPDATE;
                    IF NOT FOUND THEN RETURN json_build_object('error', 'Conta inválida.'); END IF;
                END IF;
            END IF;
        ELSE
            IF p_fallback_account_id IS NULL THEN
                RETURN json_build_object('error', 'ACCOUNT_NOT_FOUND', 'message', 'Sem conta vinculada. Informe uma conta.');
            ELSE
                v_target_account_id := p_fallback_account_id;
                PERFORM 1 FROM public.accounts WHERE id = v_target_account_id AND user_id = v_user_id FOR UPDATE;
                IF NOT FOUND THEN RETURN json_build_object('error', 'Conta inválida.'); END IF;
            END IF;
        END IF;
    END IF;

    PERFORM set_config('app.expense_payment_rpc', 'true', true);

    -- Refund the account balance
    UPDATE public.accounts
    SET balance = balance + v_expense.amount,
        updated_at = now()
    WHERE id = v_target_account_id;

    -- Reset expense fields
    UPDATE public.expenses
    SET payment_status = false,
        paid_at = NULL,
        payment_method = NULL,
        paid_account_id = NULL
    WHERE id = p_expense_id;

    RETURN json_build_object('success', true);
END;
$$;


-- 4. Create update_paid_expense_rpc
CREATE OR REPLACE FUNCTION update_paid_expense_rpc(
    p_expense_id uuid,
    p_amount numeric,
    p_category text,
    p_description text,
    p_date date,
    p_paid_account_id uuid,
    p_payment_method text,
    p_paid_at date
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_expense record;
    v_old_account record;
    v_new_account record;
    v_diff numeric;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN json_build_object('error', 'Usuário não autenticado'); END IF;

    -- Lock the expense
    SELECT * INTO v_expense 
    FROM public.expenses 
    WHERE id = p_expense_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN RETURN json_build_object('error', 'Despesa não encontrada'); END IF;
    IF v_expense.payment_status = false THEN RETURN json_build_object('error', 'Despesa não está paga, utilize a atualização normal'); END IF;

    -- If changing paid_account_id, we need to lock both accounts in a deterministic order to avoid deadlocks
    IF v_expense.paid_account_id IS NOT NULL AND v_expense.paid_account_id <> p_paid_account_id THEN
        IF v_expense.paid_account_id < p_paid_account_id THEN
            SELECT * INTO v_old_account FROM public.accounts WHERE id = v_expense.paid_account_id AND user_id = v_user_id FOR UPDATE;
            SELECT * INTO v_new_account FROM public.accounts WHERE id = p_paid_account_id AND user_id = v_user_id FOR UPDATE;
        ELSE
            SELECT * INTO v_new_account FROM public.accounts WHERE id = p_paid_account_id AND user_id = v_user_id FOR UPDATE;
            SELECT * INTO v_old_account FROM public.accounts WHERE id = v_expense.paid_account_id AND user_id = v_user_id FOR UPDATE;
        END IF;

        IF v_old_account IS NULL OR v_new_account IS NULL THEN
            RETURN json_build_object('error', 'Conta original ou nova não encontrada');
        END IF;

        -- Refund old
        UPDATE public.accounts SET balance = balance + v_expense.amount WHERE id = v_old_account.id;
        -- Deduct new
        UPDATE public.accounts SET balance = balance - p_amount WHERE id = v_new_account.id;

    ELSE
        -- Same account, just difference
        IF v_expense.paid_account_id IS NOT NULL THEN
            SELECT * INTO v_old_account FROM public.accounts WHERE id = v_expense.paid_account_id AND user_id = v_user_id FOR UPDATE;
            IF NOT FOUND THEN RETURN json_build_object('error', 'Conta não encontrada'); END IF;
            
            v_diff := p_amount - v_expense.amount;
            IF v_diff <> 0 THEN
                UPDATE public.accounts SET balance = balance - v_diff WHERE id = v_old_account.id;
            END IF;
        END IF;
    END IF;

    PERFORM set_config('app.expense_payment_rpc', 'true', true);

    UPDATE public.expenses
    SET amount = p_amount,
        category = p_category,
        description = p_description,
        date = p_date,
        paid_account_id = p_paid_account_id,
        payment_method = p_payment_method,
        paid_at = p_paid_at
    WHERE id = p_expense_id;

    RETURN json_build_object('success', true);
END;
$$;


-- 5. Create create_paid_expense_rpc
CREATE OR REPLACE FUNCTION create_paid_expense_rpc(
    p_amount numeric,
    p_category text,
    p_description text,
    p_date date,
    p_installment_number integer,
    p_installments_total integer,
    p_paid_account_id uuid,
    p_payment_method text,
    p_paid_at date
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_account record;
    v_expense_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN json_build_object('error', 'Usuário não autenticado'); END IF;

    SELECT * INTO v_account 
    FROM public.accounts 
    WHERE id = p_paid_account_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN RETURN json_build_object('error', 'Conta não encontrada'); END IF;

    PERFORM set_config('app.expense_payment_rpc', 'true', true);

    INSERT INTO public.expenses (
        user_id, amount, category, description, date, 
        installment_number, installments_total, payment_status,
        paid_account_id, payment_method, paid_at
    ) VALUES (
        v_user_id, p_amount, p_category, p_description, p_date,
        p_installment_number, p_installments_total, true,
        p_paid_account_id, p_payment_method, p_paid_at
    ) RETURNING id INTO v_expense_id;

    UPDATE public.accounts
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE id = p_paid_account_id;

    RETURN json_build_object('success', true, 'expense_id', v_expense_id);
END;
$$;

-- Revoke public execution for all these RPCs
REVOKE EXECUTE ON FUNCTION pay_expense_rpc(uuid, uuid, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION undo_expense_payment_rpc(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_paid_expense_rpc(uuid, numeric, text, text, date, uuid, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_paid_expense_rpc(numeric, text, text, date, integer, integer, uuid, text, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION pay_expense_rpc(uuid, uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION undo_expense_payment_rpc(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_paid_expense_rpc(uuid, numeric, text, text, date, uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION create_paid_expense_rpc(numeric, text, text, date, integer, integer, uuid, text, date) TO authenticated;
