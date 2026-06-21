-- =====================================================
-- FINNLY — Dashboard Layout Customizer and Subscriptions
-- Execute este arquivo no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar coluna dashboard_layout na tabela financial_profiles para salvar preferências do painel
alter table public.financial_profiles 
add column if not exists dashboard_layout jsonb default null;

-- 2. Criar a tabela subscriptions para rastrear as contas recorrentes e assinaturas
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_day integer not null check (due_day >= 1 and due_day <= 31),
  category text not null default 'Assinaturas',
  last_paid_month text default null, -- Formato YYYY-MM (ex: 2026-06)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ativar RLS
alter table public.subscriptions enable row level security;

-- Criar políticas de segurança (RLS)
create policy "Usuário gerencia apenas suas próprias assinaturas"
  on public.subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Criar índices
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
