-- =====================================================
-- FINNLY — Recursos do Mobills + Gamificação & IA
-- Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- 1. CONTAS FINANCEIRAS
create table if not exists public.accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text check (type in ('corrente', 'poupanca', 'investimento', 'carteira', 'outros')) not null default 'corrente',
  balance numeric(12,2) not null default 0.00,
  color text not null default '#01584C',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.accounts enable row level security;

create policy "Usuário gerencia suas próprias contas"
  on public.accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists accounts_user_idx on public.accounts (user_id);


-- 2. CARTÕES DE CRÉDITO
create table if not exists public.credit_cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  "limit" numeric(12,2) not null check ("limit" > 0),
  closing_day integer not null check (closing_day >= 1 and closing_day <= 31),
  due_day integer not null check (due_day >= 1 and due_day <= 31),
  color text not null default '#B9842F',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.credit_cards enable row level security;

create policy "Usuário gerencia seus próprios cartões"
  on public.credit_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists credit_cards_user_idx on public.credit_cards (user_id);


-- 3. TRANSFERÊNCIAS ENTRE CONTAS
create table if not exists public.transfers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  source_account_id uuid references public.accounts on delete cascade not null,
  destination_account_id uuid references public.accounts on delete cascade not null,
  date date not null default current_date,
  description text,
  created_at timestamptz default now()
);

alter table public.transfers enable row level security;

create policy "Usuário gerencia suas próprias transferências"
  on public.transfers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists transfers_user_idx on public.transfers (user_id);


-- 4. INVESTIMENTOS
create table if not exists public.investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text check (type in ('renda_fixa', 'acoes', 'fiis', 'cripto', 'fundos', 'outros')) not null default 'renda_fixa',
  amount numeric(12,2) not null check (amount >= 0),
  yield_rate numeric(12,2) default 0.00,
  date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.investments enable row level security;

create policy "Usuário gerencia seus próprios investimentos"
  on public.investments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists investments_user_idx on public.investments (user_id);


-- 5. CATEGORIAS DE DESPESA CUSTOMIZADAS
create table if not exists public.expense_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  color text not null default '#90A4AE',
  icon text not null default 'Sparkles',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.expense_categories enable row level security;

create policy "expense_categories_select"
  on public.expense_categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "expense_categories_insert"
  on public.expense_categories for insert
  with check (auth.uid() = user_id);

create policy "expense_categories_update"
  on public.expense_categories for update
  using (auth.uid() = user_id);

create policy "expense_categories_delete"
  on public.expense_categories for delete
  using (auth.uid() = user_id);

create unique index if not exists expense_categories_default_name_uq
  on public.expense_categories (name)
  where user_id is null;

-- Inserir categorias de despesa padrão se não existirem
insert into public.expense_categories (user_id, name, color, icon, is_default) values
  (null, 'Alimentação', '#F57C00', 'UtensilsCrossed', true),
  (null, 'Transporte',  '#FFB300', 'Car',             true),
  (null, 'Moradia',     '#01584C', 'Shield',          true),
  (null, 'Saúde',       '#28A745', 'PiggyBank',       true),
  (null, 'Educação',    '#0288D1', 'Laptop',          true),
  (null, 'Lazer',       '#7B1FA2', 'Film',            true),
  (null, 'Cartões',     '#B9842F', 'CreditCard',      true),
  (null, 'Assinaturas', '#455A64', 'Calendar',        true),
  (null, 'Outros',      '#90A4AE', 'Sparkles',        true)
on conflict (name) where user_id is null do nothing;


-- 6. GAMIFICAÇÃO: STREAKS E CONQUISTAS
create table if not exists public.financial_streaks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  current_streak integer default 0 check (current_streak >= 0),
  longest_streak integer default 0 check (longest_streak >= 0),
  last_active_date date default current_date,
  updated_at timestamptz default now()
);

alter table public.financial_streaks enable row level security;

create policy "Usuário gerencia sua própria ofensiva"
  on public.financial_streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  achievement_key text not null,
  unlocked_at timestamptz default now(),
  unique (user_id, achievement_key)
);

alter table public.user_achievements enable row level security;

create policy "Usuário gerencia suas próprias conquistas"
  on public.user_achievements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_achievements_user_idx on public.user_achievements (user_id);


-- 7. ALTERAÇÕES NAS TABELAS DE RECEITAS E DESPESAS
alter table public.incomes 
  add column if not exists account_id uuid references public.accounts on delete set null,
  add column if not exists installment_number integer default null,
  add column if not exists installments_total integer default null,
  add column if not exists payment_status boolean default true;

alter table public.expenses
  add column if not exists account_id uuid references public.accounts on delete set null,
  add column if not exists credit_card_id uuid references public.credit_cards on delete set null,
  add column if not exists installment_number integer default null,
  add column if not exists installments_total integer default null,
  add column if not exists payment_status boolean default true;

create index if not exists incomes_account_idx on public.incomes (account_id);
create index if not exists expenses_account_idx on public.expenses (account_id);
create index if not exists expenses_card_idx on public.expenses (credit_card_id);
