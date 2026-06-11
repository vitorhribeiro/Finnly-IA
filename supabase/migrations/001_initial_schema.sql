-- =====================================================
-- FINNLY — Schema inicial
-- Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- 1. PROFILES (espelho de auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuário vê apenas seu próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuário atualiza apenas seu próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Usuário insere apenas seu próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger para criar profile automaticamente ao cadastrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. FINANCIAL PROFILES (dados do onboarding)
create table if not exists public.financial_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  monthly_income numeric(12,2),
  income_frequency text check (income_frequency in ('mensal', 'quinzenal', 'semanal', 'irregular')) default 'mensal',
  main_goal text,
  has_emergency_fund boolean default false,
  has_debts boolean default false,
  preferred_usage text check (preferred_usage in ('app', 'whatsapp', 'ambos')) default 'app',
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.financial_profiles enable row level security;

create policy "Usuário gerencia apenas seu próprio perfil financeiro"
  on public.financial_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 3. RECEITAS
create table if not exists public.incomes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'Outros',
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

alter table public.incomes enable row level security;

create policy "Usuário gerencia apenas suas receitas"
  on public.incomes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists incomes_user_date_idx on public.incomes (user_id, date desc);


-- 4. DESPESAS
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'Outros',
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

alter table public.expenses enable row level security;

create policy "Usuário gerencia apenas suas despesas"
  on public.expenses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);


-- 5. METAS
create table if not exists public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) default 0 check (current_amount >= 0),
  target_date date,
  icon text default 'target',
  color text default '#01584C',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.goals enable row level security;

create policy "Usuário gerencia apenas suas metas"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 6. CONVERSAS COM IA
create table if not exists public.ai_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  question text not null,
  answer text not null,
  created_at timestamptz default now()
);

alter table public.ai_conversations enable row level security;

create policy "Usuário gerencia apenas suas conversas"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, created_at desc);
