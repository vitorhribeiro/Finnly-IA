-- 1. ADICIONAR COLUNA initial_balance EM public.accounts
alter table public.accounts 
  add column if not exists initial_balance numeric(12,2) not null default 0.00;

-- Sincronizar initial_balance com o saldo atual para contas já existentes
update public.accounts 
set initial_balance = balance 
where initial_balance = 0.00 and balance <> 0.00;

-- 2. FUNÇÃO E TRIGGER PARA TRATAR ALTERAÇÕES DE SALDO POR INCOMES
create or replace function public.handle_income_balance_change()
returns trigger language plpgsql security definer as $$
begin
  -- INSERT
  if (TG_OP = 'INSERT') then
    if (NEW.payment_status = true and NEW.account_id is not null) then
      update public.accounts
      set balance = balance + NEW.amount
      where id = NEW.account_id;
    end if;
    return NEW;

  -- DELETE
  elsif (TG_OP = 'DELETE') then
    if (OLD.payment_status = true and OLD.account_id is not null) then
      update public.accounts
      set balance = balance - OLD.amount
      where id = OLD.account_id;
    end if;
    return OLD;

  -- UPDATE
  elsif (TG_OP = 'UPDATE') then
    -- Se alterou o status de pagamento
    if (NEW.payment_status <> OLD.payment_status) then
      -- Unpaid -> Paid (Recebido)
      if (NEW.payment_status = true) then
        if (NEW.account_id is not null) then
          update public.accounts
          set balance = balance + NEW.amount
          where id = NEW.account_id;
        end if;
      -- Paid -> Unpaid (Desmarcado Recebido)
      else
        if (OLD.account_id is not null) then
          update public.accounts
          set balance = balance - OLD.amount
          where id = OLD.account_id;
        end if;
      end if;

    -- Se permaneceu Recebido (payment_status = true) mas mudou conta ou valor
    elsif (NEW.payment_status = true) then
      -- Se mudou a conta vinculada
      if (NEW.account_id <> OLD.account_id or (NEW.account_id is not null and OLD.account_id is null) or (NEW.account_id is null and OLD.account_id is not null)) then
        -- Remove valor da conta antiga
        if (OLD.account_id is not null) then
          update public.accounts
          set balance = balance - OLD.amount
          where id = OLD.account_id;
        end if;
        -- Adiciona valor na conta nova
        if (NEW.account_id is not null) then
          update public.accounts
          set balance = balance + NEW.amount
          where id = NEW.account_id;
        end if;
      -- Se a conta permaneceu a mesma, mas alterou o valor
      elsif (NEW.amount <> OLD.amount and NEW.account_id is not null) then
        update public.accounts
        set balance = balance + (NEW.amount - OLD.amount)
        where id = NEW.account_id;
      end if;
    end if;
    return NEW;
  end if;
end;
$$;

-- Vincular Trigger na tabela public.incomes
drop trigger if exists trg_income_balance_change on public.incomes;
create trigger trg_income_balance_change
  after insert or update or delete
  on public.incomes
  for each row
  execute function public.handle_income_balance_change();

-- 3. FUNÇÕES PARA RECALCULO E AUDITORIA DE SALDOS

-- Função interna para recalcular o saldo esperado de uma conta
create or replace function public.recalculate_account_balance(account_uuid uuid)
returns numeric language plpgsql security definer as $$
declare
  init_bal numeric;
  total_incomes numeric;
  total_expenses numeric;
  total_transfers_sent numeric;
  total_transfers_received numeric;
  calculated_balance numeric;
begin
  -- Obter saldo inicial
  select coalesce(initial_balance, 0.00) into init_bal
  from public.accounts
  where id = account_uuid;

  -- Somar receitas recebidas
  select coalesce(sum(amount), 0.00) into total_incomes
  from public.incomes
  where account_id = account_uuid and payment_status = true;

  -- Somar despesas pagas
  select coalesce(sum(amount), 0.00) into total_expenses
  from public.expenses
  where account_id = account_uuid and payment_status = true;

  -- Somar transferências enviadas
  select coalesce(sum(amount), 0.00) into total_transfers_sent
  from public.transfers
  where source_account_id = account_uuid;

  -- Somar transferências recebidas
  select coalesce(sum(amount), 0.00) into total_transfers_received
  from public.transfers
  where destination_account_id = account_uuid;

  calculated_balance := init_bal + total_incomes - total_expenses - total_transfers_sent + total_transfers_received;

  return calculated_balance;
end;
$$;

-- Função para sincronizar/forçar o saldo calculado no saldo da conta
create or replace function public.sync_account_balance(account_uuid uuid)
returns numeric language plpgsql security definer as $$
declare
  new_balance numeric;
begin
  new_balance := public.recalculate_account_balance(account_uuid);
  update public.accounts
  set balance = new_balance
  where id = account_uuid;
  return new_balance;
end;
$$;

-- Função de verificação que retorna o saldo salvo, saldo calculado e se são consistentes
create or replace function public.verify_account_balance(
  account_uuid uuid,
  out saved_balance numeric,
  out calculated_balance numeric,
  out is_consistent boolean
) language plpgsql security definer as $$
begin
  select balance into saved_balance
  from public.accounts
  where id = account_uuid;

  calculated_balance := public.recalculate_account_balance(account_uuid);
  is_consistent := (saved_balance = calculated_balance);
end;
$$;
