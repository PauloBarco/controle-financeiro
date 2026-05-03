"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  formatCurrency,
  formatDate,
  getCurrentMonthRange,
  getNextDate,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";

type ContaResumo = {
  nome: string;
};

type Pagamento = {
  id: string;
  valor: number | null;
  data_pagamento: string | null;
  comprovante_url: string | null;
  contas: ContaResumo | ContaResumo[] | null;
};

function getNomeConta(contas: Pagamento["contas"]) {
  if (Array.isArray(contas)) {
    return contas[0]?.nome;
  }

  return contas?.nome;
}

function somarPagamentos(pagamentos: Pagamento[]) {
  return pagamentos.reduce((total, pagamento) => {
    if (
      typeof pagamento.valor === "number" &&
      Number.isFinite(pagamento.valor)
    ) {
      return total + pagamento.valor;
    }

    return total;
  }, 0);
}

async function buscarPagamentos(dataInicio: string, dataFim: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw new Error("Erro ao verificar login");
  }

  if (!authData.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("pagamentos")
    .select(
      `
        id,
        valor,
        data_pagamento,
        comprovante_url,
        contas ( nome )
      `,
    )
    .eq("user_id", authData.user.id)
    .gte("data_pagamento", dataInicio)
    .lt("data_pagamento", getNextDate(dataFim))
    .order("data_pagamento", { ascending: false });

  if (error) {
    throw new Error("Erro ao carregar pagamentos");
  }

  return data || [];
}

export default function ListaPagamentos() {
  const rangeInicial = useMemo(() => getCurrentMonthRange(), []);
  const [dataInicio, setDataInicio] = useState(rangeInicial.start);
  const [dataFim, setDataFim] = useState(rangeInicial.end);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const totalPeriodo = somarPagamentos(pagamentos);

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const data = await buscarPagamentos(rangeInicial.start, rangeInicial.end);

        if (ignore) return;

        setPagamentos(data);
        setErro("");
      } catch (error) {
        if (ignore) return;

        console.error(error);
        setErro("Nao foi possivel carregar os pagamentos.");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      ignore = true;
    };
  }, [rangeInicial.end, rangeInicial.start]);

  async function aplicarFiltros() {
    if (!dataInicio || !dataFim) {
      alert("Informe as duas datas do periodo");
      return;
    }

    if (dataInicio > dataFim) {
      alert("A data inicial precisa ser menor ou igual a data final");
      return;
    }

    setLoading(true);

    try {
      const data = await buscarPagamentos(dataInicio, dataFim);

      setPagamentos(data);
      setErro("");
    } catch (error) {
      console.error(error);
      setErro("Nao foi possivel aplicar os filtros.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Historico de pagamentos"
      subtitle="Periodo"
      action={
        <Link
          href="/pagamentos"
          className="inline-flex rounded-md bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d]"
        >
          Novo pagamento
        </Link>
      }
    >
      <div className="space-y-5">
        {erro ? (
          <div className="rounded-md border border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            {erro}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg bg-[#111827] p-5 text-white">
            <p className="text-sm font-medium text-[#cbd5e1]">
              Total do periodo
            </p>
            <strong className="mt-3 block text-4xl font-semibold tracking-normal">
              {loading ? "Carregando..." : formatCurrency(totalPeriodo)}
            </strong>
            <p className="mt-3 text-sm text-[#cbd5e1]">
              {formatDate(dataInicio)} ate {formatDate(dataFim)}
            </p>
          </div>

          <div className="rounded-lg border border-[#d8dee8] bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="grid gap-1 text-sm font-medium text-[#334155]">
                Data inicial
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(event) => setDataInicio(event.target.value)}
                  className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-[#334155]">
                Data final
                <input
                  type="date"
                  value={dataFim}
                  onChange={(event) => setDataFim(event.target.value)}
                  className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                />
              </label>

              <button
                type="button"
                onClick={aplicarFiltros}
                className="h-11 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
              >
                Filtrar
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#d8dee8] bg-white">
          <div className="flex flex-col gap-1 border-b border-[#e2e8f0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">Pagamentos</h2>
            <span className="text-sm text-[#64748b]">
              {loading ? "Carregando..." : `${pagamentos.length} registros`}
            </span>
          </div>

          <div className="divide-y divide-[#e2e8f0]">
            {loading ? (
              <p className="px-4 py-6 text-sm text-[#64748b]">
                Carregando pagamentos...
              </p>
            ) : pagamentos.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#64748b]">
                Nenhum pagamento encontrado.
              </p>
            ) : (
              pagamentos.map((pagamento) => (
                <div
                  key={pagamento.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {getNomeConta(pagamento.contas) || "Sem conta"}
                    </p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      {formatDate(pagamento.data_pagamento)}
                    </p>
                  </div>

                  <strong className="text-sm font-semibold text-[#b91c1c]">
                    {formatCurrency(pagamento.valor || 0)}
                  </strong>

                  {pagamento.comprovante_url ? (
                    <a
                      href={pagamento.comprovante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                    >
                      Comprovante
                    </a>
                  ) : (
                    <span className="text-sm text-[#94a3b8]">
                      Sem comprovante
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
