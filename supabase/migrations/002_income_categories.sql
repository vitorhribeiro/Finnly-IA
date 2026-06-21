-- =====================================================
-- FINNLY — Módulo de Receitas: categorias + novos campos
-- Execute no SQL Editor do Supabase
-- =====================================================

-- 1. CATEGORIAS DE RECEITAS
create table if not exists public.income_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  color text not null default '#01584C',
  icon text not null default 'Wallet',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.income_categories enable row level security;

-- Usuários veem categorias padrão (user_id IS NULL) + as suas próprias
create policy "income_categories_select"
  on public.income_categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "income_categories_insert"
  on public.income_categories for insert
  with check (auth.uid() = user_id);

create policy "income_categories_update"
  on public.income_categories for update
  using (auth.uid() = user_id);

create policy "income_categories_delete"
  on public.income_categories for delete
  using (auth.uid() = user_id);

-- Índice único para evitar duplicatas nos padrões
create unique index if not exists income_categories_default_name_uq
  on public.income_categories (name)
  where user_id is null;

-- Categorias padrão
insert into public.income_categories (user_id, name, color, icon, is_default) values
  (null, 'Salário',          '#01584C', 'Wallet',      true),
  (null, 'Freelance',        '#0288D1', 'Laptop',      true),
  (null, 'Comissão',         '#F57C00', 'Percent',     true),
  (null, 'Dividendos',       '#FFB300', 'TrendingUp',  true),
  (null, 'Reembolso',        '#28A745', 'Receipt',     true),
  (null, 'Aluguel Recebido', '#7B1FA2', 'Home',        true),
  (null, 'Vendas',           '#E91E63', 'ShoppingBag', true),
  (null, 'Presente',         '#FF5722', 'Gift',        true),
  (null, 'Outros',           '#90A4AE', 'Sparkles',    true)
on conflict (name) where user_id is null do nothing;

-- 2. NOVOS CAMPOS NA TABELA INCOMES
alter table public.incomes
  add column if not exists is_recurring boolean default false,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz default now();
