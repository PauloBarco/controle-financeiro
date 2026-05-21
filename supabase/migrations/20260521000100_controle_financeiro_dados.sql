create table if not exists public.controle_financeiro_dados (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.controle_financeiro_dados enable row level security;

drop policy if exists "Usuarios leem seus dados financeiros" on public.controle_financeiro_dados;
create policy "Usuarios leem seus dados financeiros"
  on public.controle_financeiro_dados
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Usuarios gravam seus dados financeiros" on public.controle_financeiro_dados;
create policy "Usuarios gravam seus dados financeiros"
  on public.controle_financeiro_dados
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Usuarios atualizam seus dados financeiros" on public.controle_financeiro_dados;
create policy "Usuarios atualizam seus dados financeiros"
  on public.controle_financeiro_dados
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
