-- Adiciona a coluna received_at à tabela public.incomes se não existir
alter table public.incomes 
  add column if not exists received_at timestamptz default null;
