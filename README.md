# Controle Financeiro

App domestico para substituir uma planilha simples de controle financeiro.

## Recursos

- Planilha unica para receitas e despesas.
- Edicao inline de data, tipo, descricao, categoria, conta, valor e status.
- Resumo automatico de receitas, despesas, saldo e valores pendentes.
- Filtros por periodo, tipo e busca textual.
- Resumo de despesas por categoria.
- Central do mes com receitas, contas a pagar, contas pagas e saldo.
- Cadastro de contas recorrentes e geracao mensal.
- Fechamento do mes com status aberto, revisado ou fechado.
- Metas de despesas por categoria.
- Dados salvos no navegador, com backup/importacao JSON.
- Exportacao CSV compativel com Excel.
- Login e sincronizacao Supabase preparados na rota `/login`.

## Desenvolvimento

Crie um arquivo `.env` local com base em `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Deploy na Vercel

Este projeto e um app Next.js e nao precisa de `vercel.json` para deploy basico.

1. Suba o repositorio para GitHub, GitLab ou Bitbucket.
2. Na Vercel, escolha **Add New > Project** e importe o repositorio.
3. Mantenha o preset **Next.js**. A Vercel deve detectar:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: padrao do Next.js
4. Em **Project Settings > Environment Variables**, cadastre em Production e Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. No Supabase, aplique a migration em `supabase/migrations/20260521000100_controle_financeiro_dados.sql`.
6. Se o Supabase exigir confirmacao por email, configure as URLs do Auth para o dominio da Vercel, por exemplo `https://seu-projeto.vercel.app/login`.

## Verificacao

```bash
npm run lint
npx tsc --noEmit
npm run build
```
