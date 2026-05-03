# Controle Financeiro

App domestico para substituir planilhas simples de controle financeiro.

## Recursos

- Dashboard com receitas, despesas e saldo do mes.
- Filtro por periodo.
- Lancamentos de receita e despesa.
- Categorias com limite mensal para despesas.
- Contas para organizar origem ou destino dos lancamentos.
- Login por email via Supabase.

## Configuracao

Crie o arquivo `.env` com:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

No Supabase, execute o SQL de [supabase/schema.sql](./supabase/schema.sql)
para criar as tabelas `categorias` e `lancamentos` com RLS.

## Desenvolvimento

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Verificacao

```bash
npm run lint
npx tsc --noEmit
npm run build
```
