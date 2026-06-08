"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  GraficoReceitaVsDespesa,
  GraficoEvolucaoMensal,
  GraficoDespesasPorCategoria,
} from "@/components/GraficosDashboard";
import { formatCurrency, formatDate } from "@/lib/format";
import { carregarDadosFinanceirosIniciais } from "@/lib/cloud-bootstrap";
import { useCloudAutoRefresh } from "@/lib/use-cloud-auto-refresh";
import {
  calcularStatsDashboard,
  agruparDespesasPorCategoria,
  calcularEvolucaoMensal,
  calcularReceitaVsDespesaPorCategoria,
} from "@/lib/dashboard-stats";
import type { LancamentoPlanilha } from "@/lib/lancamentos";

type StatCard = {
  titulo: string;
  valor: number;
  formato: "currency" | "number";
  tom: "receita" | "despesa" | "saldo" | "pendente";
  icone?: string;
};

function StatCardComponent({ titulo, valor, formato, tom, icone }: StatCard) {
  const cores: Record<string, { bg: string; text: string; icon: string }> = {
    receita: { bg: "bg-[#dcfce7]", text: "text-[#166534]", icon: "⬆️" },
    despesa: { bg: "bg-[#fee2e2]", text: "text-[#991b1b]", icon: "⬇️" },
    saldo: {
      bg: valor >= 0 ? "bg-[#dcfce7]" : "bg-[#fee2e2]",
      text: valor >= 0 ? "text-[#166534]" : "text-[#991b1b]",
      icon: "💰",
    },
    pendente: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", icon: "⏳" },
  };

  const estilo = cores[tom];
  const textoValor =
    formato === "currency" ? formatCurrency(valor) : valor.toString();

  return (
    <div className={`rounded-lg ${estilo.bg} p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-semibold ${estilo.text} opacity-75`}>
            {titulo}
          </p>
          <p className={`mt-2 text-2xl font-bold ${estilo.text}`}>
            {textoValor}
          </p>
        </div>
        <span className="text-2xl">{icone || estilo.icon}</span>
      </div>
    </div>
  );
}

function MaiorItemCard({
  titulo,
  item,
  tipo,
}: {
  titulo: string;
  item: LancamentoPlanilha | null;
  tipo: "receita" | "despesa";
}) {
  if (!item) {
    return (
      <div className="rounded-lg border border-[#d8dee8] bg-white p-6">
        <p className="text-sm font-semibold text-[#64748b]">{titulo}</p>
        <p className="mt-4 text-sm text-[#94a3b8]">Nenhum registro</p>
      </div>
    );
  }

  const cor = tipo === "receita" ? "text-[#15803d]" : "text-[#b91c1c]";

  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-6">
      <p className="text-sm font-semibold text-[#64748b]">{titulo}</p>
      <div className="mt-4 space-y-2">
        <p className="font-semibold text-[#111827]">{item.descricao}</p>
        <p className={`text-lg font-bold ${cor}`}>
          {formatCurrency(parseFloat(item.valor))}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-[#334155]">
            {item.categoria}
          </span>
          <span className="rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-medium text-[#334155]">
            {formatDate(item.data)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [lancamentos, setLancamentos] = useState<LancamentoPlanilha[]>([]);
  const [carregado, setCarregado] = useState(false);

  const aplicarAtualizacaoDaNuvem = useCallback(
    (dados: { lancamentos: LancamentoPlanilha[] }) => {
      setLancamentos(dados.lancamentos);
    },
    [],
  );

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      const resultado = await carregarDadosFinanceirosIniciais(window.localStorage);

      if (!ativo) return;

      setLancamentos(resultado.dados.lancamentos);
      setCarregado(true);
    }

    void carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  useCloudAutoRefresh({
    enabled: carregado,
    onAtualizar: aplicarAtualizacaoDaNuvem,
  });

  const stats = useMemo(
    () => calcularStatsDashboard(lancamentos),
    [lancamentos],
  );

  const despesasPorCategoria = useMemo(
    () => agruparDespesasPorCategoria(lancamentos),
    [lancamentos],
  );

  const evolucaoMensal = useMemo(
    () => calcularEvolucaoMensal(lancamentos),
    [lancamentos],
  );

  const receitaVsDespesa = useMemo(
    () => calcularReceitaVsDespesaPorCategoria(lancamentos),
    [lancamentos],
  );

  const statCards: StatCard[] = [
    {
      titulo: "Total de Receitas",
      valor: stats.totalReceitas,
      formato: "currency",
      tom: "receita",
      icone: "📈",
    },
    {
      titulo: "Total de Despesas",
      valor: stats.totalDespesas,
      formato: "currency",
      tom: "despesa",
      icone: "📉",
    },
    {
      titulo: "Saldo",
      valor: stats.saldoTotal,
      formato: "currency",
      tom: "saldo",
      icone: "💰",
    },
    {
      titulo: "Despesas Pendentes",
      valor: stats.despesasPendentes,
      formato: "currency",
      tom: "pendente",
      icone: "⏳",
    },
  ];

  return (
    <AppShell
      title="Dashboard"
      subtitle="Visualização completa das suas finanças"
      action={
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
        >
          Voltar para planilha
        </Link>
      }
    >
      {!carregado ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-[#64748b]">Carregando dashboard...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cards de Resumo Estilo Kanban */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCardComponent key={card.titulo} {...card} />
            ))}
          </section>

          {/* Maior Receita e Maior Despesa */}
          <section className="grid gap-4 md:grid-cols-2">
            <MaiorItemCard
              titulo="Maior Receita"
              item={stats.maiorReceita}
              tipo="receita"
            />
            <MaiorItemCard
              titulo="Maior Despesa"
              item={stats.maiorDespesa}
              tipo="despesa"
            />
          </section>

          {/* Categoria com Maior Despesa */}
          {stats.categoriaComMaiorDespesa && (
            <section className="rounded-lg border border-[#d8dee8] bg-white p-6">
              <p className="text-sm font-semibold text-[#64748b]">
                Categoria com Maior Despesa
              </p>
              <p className="mt-4 text-xl font-bold text-[#b91c1c]">
                {stats.categoriaComMaiorDespesa}
              </p>
              <p className="mt-2 text-sm text-[#64748b]">
                Total na categoria:{" "}
                {formatCurrency(
                  despesasPorCategoria.find(
                    (d) => d.nome === stats.categoriaComMaiorDespesa,
                  )?.valor || 0,
                )}
              </p>
            </section>
          )}

          {/* Gráficos */}
          <section className="space-y-6">
            {/* Evolução Mensal */}
            <GraficoEvolucaoMensal dados={evolucaoMensal} />

            {/* Receitas vs Despesas */}
            <GraficoReceitaVsDespesa dados={receitaVsDespesa} />

            {/* Despesas por Categoria */}
            <GraficoDespesasPorCategoria dados={despesasPorCategoria} />
          </section>

          {/* Info vazia */}
          {lancamentos.length === 0 && (
            <section className="rounded-lg border border-[#fecaca] bg-[#fee2e2] p-6">
              <p className="text-sm font-semibold text-[#991b1b]">
                Nenhum lançamento registrado
              </p>
              <p className="mt-2 text-sm text-[#b91c1c]">
                Adicione lançamentos na planilha para visualizar dados neste dashboard.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex h-9 items-center rounded-md bg-[#dc2626] px-3 text-sm font-semibold text-white transition hover:bg-[#b91c1c]"
              >
                Ir para planilha
              </Link>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
