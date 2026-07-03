-- 014_enforce_security_and_rls.sql

-- 1. Inserir usuário B fictício para testes de RLS se não existir
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  '00000000-0000-0000-0000-00000000000b',
  'userb@finnlytest.com',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Usuário B"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 2. Inserir dados de teste para o Usuário B
INSERT INTO public.accounts (id, user_id, name, balance, initial_balance, type)
VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Conta Secreta B', 500.00, 500.00, 'corrente')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.credit_cards (id, user_id, name, "limit", closing_day, due_day)
VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000b', 'Cartão Secreto B', 1000.00, 10, 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.incomes (id, user_id, account_id, amount, category, description, payment_status, date)
VALUES ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 100.00, 'Outros', 'Receita Secreta B', true, '2026-07-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.expenses (id, user_id, account_id, amount, category, description, payment_status, date)
VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 50.00, 'Outros', 'Despesa Secreta B', false, '2026-07-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.expense_categories (id, user_id, name, color, icon)
VALUES ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000b', 'Categoria Secreta B', '#FF5722', 'Lock')
ON CONFLICT (id) DO NOTHING;


-- 3. Restringir funções de recálculo de saldo de conta para validar ownership e autenticação

CREATE OR REPLACE FUNCTION public.recalculate_account_balance(account_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid uuid;
  init_bal numeric;
  total_incomes numeric;
  total_expenses numeric;
  total_transfers_sent numeric;
  total_transfers_received numeric;
  calculated_balance numeric;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não autenticado.';
  END IF;

  -- Validar que a conta pertence ao usuário autenticado
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE id = account_uuid AND user_id = v_auth_uid
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Conta não encontrada ou não pertence ao usuário.';
  END IF;

  -- Obter saldo inicial
  SELECT coalesce(initial_balance, 0.00) INTO init_bal
  FROM public.accounts
  WHERE id = account_uuid;

  -- Somar receitas recebidas
  SELECT coalesce(sum(amount), 0.00) INTO total_incomes
  FROM public.incomes
  WHERE account_id = account_uuid AND payment_status = true;

  -- Somar despesas pagas
  SELECT coalesce(sum(amount), 0.00) INTO total_expenses
  FROM public.expenses
  WHERE account_id = account_uuid AND payment_status = true;

  -- Somar transferências enviadas
  SELECT coalesce(sum(amount), 0.00) INTO total_transfers_sent
  FROM public.transfers
  WHERE source_account_id = account_uuid;

  -- Somar transferências recebidas
  SELECT coalesce(sum(amount), 0.00) INTO total_transfers_received
  FROM public.transfers
  WHERE destination_account_id = account_uuid;

  calculated_balance := init_bal + total_incomes - total_expenses - total_transfers_sent + total_transfers_received;

  RETURN calculated_balance;
END;
$$;


CREATE OR REPLACE FUNCTION public.sync_account_balance(account_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid uuid;
  new_balance numeric;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não autenticado.';
  END IF;

  -- Validar que a conta pertence ao usuário autenticado
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE id = account_uuid AND user_id = v_auth_uid
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Conta não encontrada ou não pertence ao usuário.';
  END IF;

  new_balance := public.recalculate_account_balance(account_uuid);
  UPDATE public.accounts
  SET balance = new_balance,
      updated_at = now()
  WHERE id = account_uuid;
  
  RETURN new_balance;
END;
$$;


CREATE OR REPLACE FUNCTION public.verify_account_balance(
  account_uuid uuid,
  OUT saved_balance numeric,
  OUT calculated_balance numeric,
  OUT is_consistent boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid uuid;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não autenticado.';
  END IF;

  -- Validar que a conta pertence ao usuário autenticado
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE id = account_uuid AND user_id = v_auth_uid
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Conta não encontrada ou não pertence ao usuário.';
  END IF;

  SELECT balance INTO saved_balance
  FROM public.accounts
  WHERE id = account_uuid;

  calculated_balance := public.recalculate_account_balance(account_uuid);
  is_consistent := (saved_balance = calculated_balance);
END;
$$;


-- Revogar acesso público e conceder apenas a authenticated
REVOKE EXECUTE ON FUNCTION public.recalculate_account_balance(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_account_balance(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_account_balance(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recalculate_account_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_account_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_account_balance(uuid) TO authenticated;


-- 4. Triggers de integridade e RLS para prevenir cross-ownership de contas/cartões

CREATE OR REPLACE FUNCTION public.check_cross_ownership_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid uuid;
BEGIN
    v_auth_uid := auth.uid();
    
    -- Se for executado por um usuário autenticado
    IF v_auth_uid IS NOT NULL THEN
        -- Garantir que o user_id do registro é o próprio usuário logado
        IF NEW.user_id <> v_auth_uid THEN
            RAISE EXCEPTION 'Acesso negado: Tentativa de criar/editar registro para outro usuário.';
        END IF;
    END IF;

    -- Validar a conta em incomes
    IF TG_TABLE_NAME = 'incomes' THEN
        IF NEW.account_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.accounts 
                WHERE id = NEW.account_id AND user_id = NEW.user_id
            ) THEN
                RAISE EXCEPTION 'Acesso negado: A conta informada não pertence ao usuário.';
            END IF;
        END IF;
    END IF;

    -- Validar a conta/cartão em expenses
    IF TG_TABLE_NAME = 'expenses' THEN
        IF NEW.account_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.accounts 
                WHERE id = NEW.account_id AND user_id = NEW.user_id
            ) THEN
                RAISE EXCEPTION 'Acesso negado: A conta informada não pertence ao usuário.';
            END IF;
        END IF;
        IF NEW.credit_card_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.credit_cards 
                WHERE id = NEW.credit_card_id AND user_id = NEW.user_id
            ) THEN
                RAISE EXCEPTION 'Acesso negado: O cartão de crédito informado não pertence ao usuário.';
            END IF;
        END IF;
        IF NEW.paid_account_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.accounts 
                WHERE id = NEW.paid_account_id AND user_id = NEW.user_id
            ) THEN
                RAISE EXCEPTION 'Acesso negado: A conta de pagamento informada não pertence ao usuário.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Vincular Triggers
DROP TRIGGER IF EXISTS trg_income_cross_ownership ON public.incomes;
CREATE TRIGGER trg_income_cross_ownership
BEFORE INSERT OR UPDATE ON public.incomes
FOR EACH ROW EXECUTE FUNCTION public.check_cross_ownership_integrity();

DROP TRIGGER IF EXISTS trg_expense_cross_ownership ON public.expenses;
CREATE TRIGGER trg_expense_cross_ownership
BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.check_cross_ownership_integrity();


-- 5. Redefinir RPCs financeiras de Despesa para suportar campo is_recurring e ownership restrito

DROP FUNCTION IF EXISTS update_paid_expense_rpc(uuid, numeric, text, text, date, uuid, text, date, text[], text, text);
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
    p_expense_type text DEFAULT 'variable',
    p_is_recurring boolean DEFAULT false
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

    -- Garantir que a nova conta pertence ao mesmo usuário
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_paid_account_id AND user_id = v_user_id) THEN
        RETURN json_build_object('error', 'Conta de pagamento não encontrada ou não pertence ao usuário');
    END IF;

    -- deterministic lock order to avoid deadlocks
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
        expense_type = p_expense_type,
        is_recurring = p_is_recurring
    WHERE id = p_expense_id;

    RETURN json_build_object('success', true);
END;
$$;


DROP FUNCTION IF EXISTS create_paid_expense_rpc(numeric, text, text, date, integer, integer, uuid, text, date, text[], text, text);
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
    p_expense_type text DEFAULT 'variable',
    p_is_recurring boolean DEFAULT false
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

    -- Lock and verify account
    SELECT * INTO v_account 
    FROM public.accounts 
    WHERE id = p_paid_account_id AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN RETURN json_build_object('error', 'Conta não encontrada ou não pertence ao usuário'); END IF;

    PERFORM set_config('app.expense_payment_rpc', 'true', true);

    INSERT INTO public.expenses (
        user_id, amount, category, description, date, 
        installment_number, installments_total, payment_status,
        paid_account_id, payment_method, paid_at,
        tags, notes, expense_type, is_recurring
    ) VALUES (
        v_user_id, p_amount, p_category, p_description, p_date,
        p_installment_number, p_installments_total, true,
        p_paid_account_id, p_payment_method, p_paid_at,
        p_tags, p_notes, p_expense_type, p_is_recurring
    ) RETURNING id INTO v_expense_id;

    UPDATE public.accounts
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE id = p_paid_account_id;

    RETURN json_build_object('success', true, 'expense_id', v_expense_id);
END;
$$;

GRANT EXECUTE ON FUNCTION update_paid_expense_rpc(uuid, numeric, text, text, date, uuid, text, date, text[], text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION create_paid_expense_rpc(numeric, text, text, date, integer, integer, uuid, text, date, text[], text, text, boolean) TO authenticated;
