-- 011_add_advanced_fields.sql

-- Tags (text array)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tags text[] NULL;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS tags text[] NULL;

-- Notes (text)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS notes text NULL;
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS notes text NULL;

-- Expense Type (fixed or variable)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_type text NOT NULL DEFAULT 'variable';

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_expense_type_check;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_expense_type_check
CHECK (expense_type IN ('fixed', 'variable'));

-- Update RPCs to handle new fields atomically

DROP FUNCTION IF EXISTS update_paid_expense_rpc(uuid, numeric, text, text, date, uuid, text, date);
CREATE OR REPLACE FUNCTION update_paid_expense_rpc(
    p_expense_id uuid,
    p_amount numeric,
    p_category text,
    p_description text,
    p_date date,
    p_paid_account_id uuid,
    p_payment_method text,
    p_paid_at date,
    p_tags text[] DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_expense_type text DEFAULT 'variable'
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
        paid_at = p_paid_at,
        tags = p_tags,
        notes = p_notes,
        expense_type = p_expense_type
    WHERE id = p_expense_id;

    RETURN json_build_object('success', true);
END;
$$;


DROP FUNCTION IF EXISTS create_paid_expense_rpc(numeric, text, text, date, integer, integer, uuid, text, date);
CREATE OR REPLACE FUNCTION create_paid_expense_rpc(
    p_amount numeric,
    p_category text,
    p_description text,
    p_date date,
    p_installment_number integer,
    p_installments_total integer,
    p_paid_account_id uuid,
    p_payment_method text,
    p_paid_at date,
    p_tags text[] DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_expense_type text DEFAULT 'variable'
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
        paid_account_id, payment_method, paid_at,
        tags, notes, expense_type
    ) VALUES (
        v_user_id, p_amount, p_category, p_description, p_date,
        p_installment_number, p_installments_total, true,
        p_paid_account_id, p_payment_method, p_paid_at,
        p_tags, p_notes, p_expense_type
    ) RETURNING id INTO v_expense_id;

    UPDATE public.accounts
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE id = p_paid_account_id;

    RETURN json_build_object('success', true, 'expense_id', v_expense_id);
END;
$$;
