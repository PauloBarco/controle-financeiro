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

Este projeto é um app Next.js e pode rodar na Vercel usando o preset Next.js.

1. Suba o repositório para GitHub, GitLab ou Bitbucket.
2. Na Vercel, escolha **Add New > Project** e importe o repositório.
3. Mantenha o preset **Next.js**. O `vercel.json` deste projeto reforça:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: padrão do Next.js
4. Cadastre as variáveis em **Project Settings > Environment Variables** para **Production** e **Preview**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Não coloque os valores dessas variáveis no `vercel.json`; variáveis `NEXT_PUBLIC_*` são embutidas no bundle durante `npm run build`.
6. No Supabase, aplique as migrations em `supabase/migrations`.
7. Se o Supabase exigir confirmação por email, configure as URLs do Auth para o domínio da Vercel, por exemplo `https://seu-projeto.vercel.app/login`.

## Verificação

```bash
npm run lint
npx tsc --noEmit
npm run build
```
