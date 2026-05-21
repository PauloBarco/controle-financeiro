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
