grant usage on schema public to authenticated;

grant select, insert, update
  on table public.controle_financeiro_dados
  to authenticated;

grant select, insert, delete
  on table public.controle_financeiro_backups
  to authenticated;

