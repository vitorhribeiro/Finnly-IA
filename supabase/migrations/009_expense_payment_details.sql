-- Add payment tracking fields to expenses
ALTER TABLE public.expenses
ADD COLUMN paid_at date null,
ADD COLUMN payment_method text null,
ADD COLUMN paid_account_id uuid null references public.accounts(id) on delete set null;

-- Add constraint for payment methods
ALTER TABLE public.expenses
ADD CONSTRAINT check_expense_payment_method 
CHECK (payment_method IN ('pix', 'debit', 'cash', 'transfer', 'boleto', 'other') OR payment_method IS NULL);

-- Create RPC for paying an expense securely
CREATE OR REPLACE FUNCTION pay_expense_rpc(
    p_expense_id uuid,
    p_user_id uuid,
    p_paid_account_id uuid,
    p_payment_method text,
    p_paid_at date
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expense record;
    v_account record;
    v_result json;
BEGIN
    -- 1. Fetch and lock the expense to prevent race conditions
    SELECT * INTO v_expense 
    FROM public.expenses 
    WHERE id = p_expense_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Despesa não encontrada');
    END IF;

    -- 2. Ensure it is not already paid
    IF v_expense.payment_status = true THEN
        RETURN json_build_object('error', 'Esta despesa já está paga');
    END IF;

    -- 3. Block payment of credit card expenses via this method
    IF v_expense.credit_card_id IS NOT NULL THEN
        RETURN json_build_object('error', 'Despesas de cartão de crédito devem ser pagas pela fatura');
    END IF;

    -- 4. Fetch the target account
    SELECT * INTO v_account 
    FROM public.accounts 
    WHERE id = p_paid_account_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Conta de pagamento não encontrada');
    END IF;

    -- 5. Deduct from account balance
    UPDATE public.accounts
    SET balance = balance - v_expense.amount,
        updated_at = now()
    WHERE id = p_paid_account_id;

    -- 6. Update the expense
    UPDATE public.expenses
    SET payment_status = true,
        paid_at = p_paid_at,
        payment_method = p_payment_method,
        paid_account_id = p_paid_account_id
    WHERE id = p_expense_id;

    RETURN json_build_object('success', true);
END;
$$;

-- Create RPC for undoing an expense payment
CREATE OR REPLACE FUNCTION undo_expense_payment_rpc(
    p_expense_id uuid,
    p_user_id uuid,
    p_fallback_account_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expense record;
    v_account record;
    v_target_account_id uuid;
BEGIN
    -- 1. Fetch and lock the expense
    SELECT * INTO v_expense 
    FROM public.expenses 
    WHERE id = p_expense_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Despesa não encontrada');
    END IF;

    -- 2. Ensure it is actually paid
    IF v_expense.payment_status = false THEN
        RETURN json_build_object('error', 'Esta despesa não está paga');
    END IF;

    -- 3. Determine the account to refund
    IF v_expense.paid_account_id IS NOT NULL THEN
        -- Check if original account still exists
        SELECT id INTO v_target_account_id 
        FROM public.accounts 
        WHERE id = v_expense.paid_account_id;
        
        IF NOT FOUND THEN
            -- Original account deleted, need fallback
            IF p_fallback_account_id IS NULL THEN
                RETURN json_build_object('error', 'ACCOUNT_NOT_FOUND', 'message', 'Conta original foi excluída. Informe uma conta de destino.');
            ELSE
                v_target_account_id := p_fallback_account_id;
            END IF;
        END IF;
    ELSE
        -- Legacy paid expenses might not have paid_account_id, fallback to account_id or request fallback
        IF v_expense.account_id IS NOT NULL THEN
            SELECT id INTO v_target_account_id 
            FROM public.accounts 
            WHERE id = v_expense.account_id;
            
            IF NOT FOUND THEN
                IF p_fallback_account_id IS NULL THEN
                    RETURN json_build_object('error', 'ACCOUNT_NOT_FOUND', 'message', 'Conta original não encontrada. Informe uma conta.');
                ELSE
                    v_target_account_id := p_fallback_account_id;
                END IF;
            END IF;
        ELSE
            -- Completely detached expense
            IF p_fallback_account_id IS NULL THEN
                RETURN json_build_object('error', 'ACCOUNT_NOT_FOUND', 'message', 'Sem conta vinculada. Informe uma conta.');
            ELSE
                v_target_account_id := p_fallback_account_id;
            END IF;
        END IF;
    END IF;

    -- 4. Refund the account balance
    UPDATE public.accounts
    SET balance = balance + v_expense.amount,
        updated_at = now()
    WHERE id = v_target_account_id;

    -- 5. Reset expense fields
    UPDATE public.expenses
    SET payment_status = false,
        paid_at = NULL,
        payment_method = NULL,
        paid_account_id = NULL
    WHERE id = p_expense_id;

    RETURN json_build_object('success', true);
END;
$$;
