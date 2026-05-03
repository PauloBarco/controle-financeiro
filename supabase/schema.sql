-- Execute este arquivo no SQL Editor do Supabase para ativar a versao
-- domestica do app: categorias e lancamentos de receitas/despesas.

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  limite_mensal numeric(12, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  conta_id uuid references public.contas(id) on delete set null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  data_lancamento date not null default current_date,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists categorias_user_id_idx
  on public.categorias (user_id);

create index if not exists lancamentos_user_data_idx
  on public.lancamentos (user_id, data_lancamento desc);

create index if not exists lancamentos_categoria_id_idx
  on public.lancamentos (categoria_id);

alter table public.categorias enable row level security;
alter table public.lancamentos enable row level security;

drop policy if exists "Categorias visiveis pelo dono" on public.categorias;
create policy "Categorias visiveis pelo dono"
  on public.categorias
  for select
  using (auth.uid() = user_id);

drop policy if exists "Categorias criadas pelo dono" on public.categorias;
create policy "Categorias criadas pelo dono"
  on public.categorias
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Categorias editadas pelo dono" on public.categorias;
create policy "Categorias editadas pelo dono"
  on public.categorias
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Categorias excluidas pelo dono" on public.categorias;
create policy "Categorias excluidas pelo dono"
  on public.categorias
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Lancamentos visiveis pelo dono" on public.lancamentos;
create policy "Lancamentos visiveis pelo dono"
  on public.lancamentos
  for select
  using (auth.uid() = user_id);

drop policy if exists "Lancamentos criados pelo dono" on public.lancamentos;
create policy "Lancamentos criados pelo dono"
  on public.lancamentos
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Lancamentos editados pelo dono" on public.lancamentos;
create policy "Lancamentos editados pelo dono"
  on public.lancamentos
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Lancamentos excluidos pelo dono" on public.lancamentos;
create policy "Lancamentos excluidos pelo dono"
  on public.lancamentos
  for delete
  using (auth.uid() = user_id);
