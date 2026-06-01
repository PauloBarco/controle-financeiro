import { lerValor } from "@/lib/lancamentos";
import type { LancamentoPlanilha } from "@/lib/lancamentos";

export type ResumoDespesasPorCategoria = {
  nome: string;
  valor: number;
  percentual: number;
};

export type DadosMesEvoluacao = {
  mes: string;
  data: string;
  receitas: number;
  despesas: number;
  saldo: number;
};

export type DadosReceitaVsDespesa = {
  nome: string;
  receitas: number;
  despesas: number;
};

export type StatsDashboard = {
  totalReceitas: number;
  totalDespesas: number;
  saldoTotal: number;
  despesasPendentes: number;
  maiorDespesa: LancamentoPlanilha | null;
  maiorReceita: LancamentoPlanilha | null;
  categoriaComMaiorDespesa: string | null;
};

/**
 * Calcula estatísticas gerais do dashboard
 */
export function calcularStatsDashboard(
  lancamentos: LancamentoPlanilha[],
): StatsDashboard {
  let totalReceitas = 0;
  let totalDespesas = 0;
  let despesasPendentes = 0;
  let maiorDespesa: LancamentoPlanilha | null = null;
  let maiorReceita: LancamentoPlanilha | null = null;

  const despesasPorCategoria = new Map<string, number>();

  lancamentos.forEach((lancamento) => {
    const valor = lerValor(lancamento.valor);

    if (lancamento.tipo === "receita") {
      totalReceitas += valor;

      if (!maiorReceita || valor > lerValor(maiorReceita.valor)) {
        maiorReceita = lancamento;
      }
    } else {
      totalDespesas += valor;

      if (!maiorDespesa || valor > lerValor(maiorDespesa.valor)) {
        maiorDespesa = lancamento;
      }

      if (lancamento.status === "pendente") {
        despesasPendentes += valor;
      }

      const categoria = lancamento.categoria || "Sem categoria";
      despesasPorCategoria.set(
        categoria,
        (despesasPorCategoria.get(categoria) || 0) + valor,
      );
    }
  });

  const categoriaComMaiorDespesa = Array.from(despesasPorCategoria.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalReceitas,
    totalDespesas,
    saldoTotal: totalReceitas - totalDespesas,
    despesasPendentes,
    maiorDespesa,
    maiorReceita,
    categoriaComMaiorDespesa,
  };
}

/**
 * Agrupa despesas por categoria com percentuais
 */
export function agruparDespesasPorCategoria(
  lancamentos: LancamentoPlanilha[],
): ResumoDespesasPorCategoria[] {
  const mapa = new Map<string, number>();
  let total = 0;

  lancamentos.forEach((lancamento) => {
    if (lancamento.tipo !== "despesa") return;

    const valor = lerValor(lancamento.valor);
    const categoria = lancamento.categoria.trim() || "Sem categoria";

    mapa.set(categoria, (mapa.get(categoria) || 0) + valor);
    total += valor;
  });

  return Array.from(mapa.entries())
    .map(([nome, valor]) => ({
      nome,
      valor,
      percentual: total > 0 ? (valor / total) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Calcula evolução de receitas e despesas por mês
 */
export function calcularEvolucaoMensal(
  lancamentos: LancamentoPlanilha[],
): DadosMesEvoluacao[] {
  const mesesMap = new Map<string, { receitas: number; despesas: number }>();

  lancamentos.forEach((lancamento) => {
    const mes = lancamento.data.slice(0, 7); // YYYY-MM
    const valor = lerValor(lancamento.valor);

    const dadosMes = mesesMap.get(mes) || { receitas: 0, despesas: 0 };

    if (lancamento.tipo === "receita") {
      dadosMes.receitas += valor;
    } else {
      dadosMes.despesas += valor;
    }

    mesesMap.set(mes, dadosMes);
  });

  // Ordenar e formatar
  return Array.from(mesesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, dados]) => ({
      mes: mes.slice(5), // MM
      data: mes,
      receitas: dados.receitas,
      despesas: dados.despesas,
      saldo: dados.receitas - dados.despesas,
    }));
}

/**
 * Calcula receitas vs despesas por categoria
 */
export function calcularReceitaVsDespesaPorCategoria(
  lancamentos: LancamentoPlanilha[],
): DadosReceitaVsDespesa[] {
  const categoriasMap = new Map<
    string,
    { receitas: number; despesas: number }
  >();

  lancamentos.forEach((lancamento) => {
    const categoria = lancamento.categoria.trim() || "Sem categoria";
    const valor = lerValor(lancamento.valor);

    const dados = categoriasMap.get(categoria) || {
      receitas: 0,
      despesas: 0,
    };

    if (lancamento.tipo === "receita") {
      dados.receitas += valor;
    } else {
      dados.despesas += valor;
    }

    categoriasMap.set(categoria, dados);
  });

  return Array.from(categoriasMap.entries())
    .filter(([, dados]) => dados.receitas > 0 || dados.despesas > 0)
    .map(([nome, dados]) => ({
      nome,
      receitas: dados.receitas,
      despesas: dados.despesas,
    }))
    .sort(
      (a, b) =>
        b.receitas +
        b.despesas -
        (a.receitas + a.despesas),
    );
}
