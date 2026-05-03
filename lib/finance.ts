export type TipoLancamento = "receita" | "despesa";

export type Conta = {
  id: string;
  nome: string;
  user_id: string;
};

export type Categoria = {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  limite_mensal: number | string | null;
  user_id: string;
};

export type CategoriaResumo = {
  nome: string;
  tipo: TipoLancamento;
  limite_mensal: number | string | null;
};

export type ContaResumo = {
  nome: string;
};

export type Lancamento = {
  id: string;
  categoria_id: string | null;
  conta_id: string | null;
  descricao: string;
  tipo: TipoLancamento;
  valor: number | string | null;
  data_lancamento: string | null;
  observacao: string | null;
  categorias: CategoriaResumo | CategoriaResumo[] | null;
  contas: ContaResumo | ContaResumo[] | null;
};

export const LANCAMENTOS_SELECT = `
  id,
  categoria_id,
  conta_id,
  descricao,
  tipo,
  valor,
  data_lancamento,
  observacao,
  categorias ( nome, tipo, limite_mensal ),
  contas ( nome )
`;

export function getCategoriaNome(categoria: Lancamento["categorias"]) {
  if (Array.isArray(categoria)) {
    return categoria[0]?.nome;
  }

  return categoria?.nome;
}

export function getContaNome(conta: Lancamento["contas"]) {
  if (Array.isArray(conta)) {
    return conta[0]?.nome;
  }

  return conta?.nome;
}

export function getValorSeguro(valor: number | string | null) {
  const valorNumerico = typeof valor === "string" ? Number(valor) : valor;

  if (typeof valorNumerico === "number" && Number.isFinite(valorNumerico)) {
    return valorNumerico;
  }

  return 0;
}

export function calcularTotais(lancamentos: Lancamento[]) {
  return lancamentos.reduce(
    (totais, lancamento) => {
      const valor = getValorSeguro(lancamento.valor);

      if (lancamento.tipo === "receita") {
        return {
          ...totais,
          receitas: totais.receitas + valor,
          saldo: totais.saldo + valor,
        };
      }

      return {
        ...totais,
        despesas: totais.despesas + valor,
        saldo: totais.saldo - valor,
      };
    },
    { receitas: 0, despesas: 0, saldo: 0 },
  );
}
