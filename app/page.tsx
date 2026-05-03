"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";
import type { Categoria, Lancamento } from "@/lib/finance";
import {
  LANCAMENTOS_SELECT,
  calcularTotais,
  getCategoriaNome,
  getContaNome,
  getValorSeguro,
} from "@/lib/finance";
import {
  formatCurrency,
  formatDate,
  getCurrentMonthRange,
  getNextDate,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";

type DashboardResult = {
  user: User | null;
  categorias: Categoria[];
  lancamentosPeriodo: Lancamento[];
  lancamentosMes: Lancamento[];
};

type CategoriaResumo = {
  id: string;
  nome: string;
  limite: number;
  gasto: number;
};

async function carregarDashboard(
  dataInicio: string,
  dataFim: string,
): Promise<DashboardResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw new Error("Erro ao verificar login");
  }

  if (!authData.user) {
    return {
      user: null,
      categorias: [],
      lancamentosPeriodo: [],
      lancamentosMes: [],
    };
  }

  const mesAtual = getCurrentMonthRange();
  const [categoriasResult, periodoResult, mesResult] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nome, tipo, limite_mensal, user_id")
      .eq("user_id", authData.user.id)
      .order("nome", { ascending: true }),
    supabase
      .from("lancamentos")
      .select(LANCAMENTOS_SELECT)
      .eq("user_id", authData.user.id)
      .gte("data_lancamento", dataInicio)
      .lt("data_lancamento", getNextDate(dataFim))
      .order("data_lancamento", { ascending: false }),
    supabase
      .from("lancamentos")
      .select(LANCAMENTOS_SELECT)
      .eq("user_id", authData.user.id)
      .gte("data_lancamento", mesAtual.start)
      .lt("data_lancamento", getNextDate(mesAtual.end))
      .order("data_lancamento", { ascending: false }),
  ]);

  if (categoriasResult.error) {
    throw new Error("Erro ao carregar categorias");
  }

  if (periodoResult.error) {
    throw new Error("Erro ao carregar lancamentos do periodo");
  }

  if (mesResult.error) {
    throw new Error("Erro ao carregar lancamentos do mes");
  }

  return {
    user: authData.user,
    categorias: categoriasResult.data || [],
    lancamentosPeriodo: periodoResult.data || [],
    lancamentosMes: mesResult.data || [],
  };
}

function calcularCategoriasDoMes(
  categorias: Categoria[],
  lancamentosMes: Lancamento[],
) {
  const despesasComLimite = categorias.filter(
    (categoria) =>
      categoria.tipo === "despesa" && categoria.limite_mensal !== null,
  );

  return despesasComLimite.map<CategoriaResumo>((categoria) => {
    const gasto = lancamentosMes.reduce((total, lancamento) => {
      if (lancamento.tipo !== "despesa") return total;

      const nomeCategoria = getCategoriaNome(lancamento.categorias);

      if (nomeCategoria !== categoria.nome) return total;

      return total + getValorSeguro(lancamento.valor);
    }, 0);

    return {
      id: categoria.id,
      nome: categoria.nome,
      limite: Number(categoria.limite_mensal),
      gasto,
    };
  });
}

export default function Home() {
  const rangeInicial = useMemo(() => getCurrentMonthRange(), []);
  const [dataInicio, setDataInicio] = useState(rangeInicial.start);
  const [dataFim, setDataFim] = useState(rangeInicial.end);
  const [user, setUser] = useState<User | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lancamentosPeriodo, setLancamentosPeriodo] = useState<Lancamento[]>([]);
  const [lancamentosMes, setLancamentosMes] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const totaisPeriodo = calcularTotais(lancamentosPeriodo);
  const totaisMes = calcularTotais(lancamentosMes);
  const categoriasDoMes = calcularCategoriasDoMes(categorias, lancamentosMes);

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const resultado = await carregarDashboard(
          rangeInicial.start,
          rangeInicial.end,
        );

        if (ignore) return;

        setUser(resultado.user);
        setCategorias(resultado.categorias);
        setLancamentosPeriodo(resultado.lancamentosPeriodo);
        setLancamentosMes(resultado.lancamentosMes);
        setErro("");
      } catch (error) {
        if (ignore) return;

        console.error(error);
        setErro(
          "Nao foi possivel carregar o dashboard. Confira se o schema novo foi executado no Supabase.",
        );
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
      const resultado = await carregarDashboard(dataInicio, dataFim);

      setUser(resultado.user);
      setCategorias(resultado.categorias);
      setLancamentosPeriodo(resultado.lancamentosPeriodo);
      setLancamentosMes(resultado.lancamentosMes);
      setErro("");
    } catch (error) {
      console.error(error);
      setErro(
        "Nao foi possivel aplicar os filtros. Confira se o schema novo foi executado no Supabase.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Resumo domestico"
      action={
        <Link
          href="/lancamentos"
          className="inline-flex rounded-md bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#15803d]"
        >
          Novo lancamento
        </Link>
      }
    >
      {!user && !loading ? (
        <section className="rounded-lg border border-[#d8dee8] bg-white p-5">
          <h2 className="text-lg font-semibold">Acesso necessario</h2>
          <p className="mt-1 text-sm text-[#64748b]">
            Entre para visualizar seus lancamentos, categorias e saldos.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-md bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f172a]"
          >
            Fazer login
          </Link>
        </section>
      ) : (
        <div className="space-y-5">
          {erro ? (
            <div className="rounded-md border border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
              {erro}
            </div>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg bg-[#111827] p-5 text-white">
              <p className="text-sm font-medium text-[#cbd5e1]">Saldo do mes</p>
              <strong
                className={`mt-3 block text-4xl font-semibold tracking-normal ${
                  totaisMes.saldo >= 0 ? "text-white" : "text-[#fecaca]"
                }`}
              >
                {loading ? "Carregando..." : formatCurrency(totaisMes.saldo)}
              </strong>
              <p className="mt-3 text-sm text-[#cbd5e1]">
                {formatDate(rangeInicial.start)} ate {formatDate(rangeInicial.end)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <ResumoCard
                titulo="Receitas"
                valor={totaisMes.receitas}
                tipo="receita"
                loading={loading}
              />
              <ResumoCard
                titulo="Despesas"
                valor={totaisMes.despesas}
                tipo="despesa"
                loading={loading}
              />
              <ResumoCard
                titulo="Saldo periodo"
                valor={totaisPeriodo.saldo}
                tipo="saldo"
                loading={loading}
              />
            </div>
          </section>

          <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
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
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-lg border border-[#d8dee8] bg-white">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-4">
                <h2 className="text-base font-semibold">Limites do mes</h2>
                <Link
                  href="/categorias"
                  className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                >
                  Ajustar
                </Link>
              </div>

              <div className="space-y-4 p-4">
                {loading ? (
                  <p className="text-sm text-[#64748b]">Carregando limites...</p>
                ) : categoriasDoMes.length === 0 ? (
                  <p className="text-sm text-[#64748b]">
                    Cadastre limites nas categorias de despesa para acompanhar o
                    mes.
                  </p>
                ) : (
                  categoriasDoMes.map((categoria) => (
                    <CategoriaLimite key={categoria.id} categoria={categoria} />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[#d8dee8] bg-white">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-4">
                <h2 className="text-base font-semibold">Ultimos lancamentos</h2>
                <Link
                  href="/lancamentos"
                  className="text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8]"
                >
                  Ver todos
                </Link>
              </div>

              <div className="divide-y divide-[#e2e8f0]">
                {loading ? (
                  <p className="px-4 py-5 text-sm text-[#64748b]">
                    Carregando lancamentos...
                  </p>
                ) : lancamentosPeriodo.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-[#64748b]">
                    Nenhum lancamento no periodo.
                  </p>
                ) : (
                  lancamentosPeriodo.slice(0, 6).map((lancamento) => (
                    <div
                      key={lancamento.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {lancamento.descricao}
                        </p>
                        <p className="mt-1 text-xs text-[#64748b]">
                          {getCategoriaNome(lancamento.categorias) ||
                            "Sem categoria"}{" "}
                          - {formatDate(lancamento.data_lancamento)}
                          {getContaNome(lancamento.contas)
                            ? ` - ${getContaNome(lancamento.contas)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold ${
                          lancamento.tipo === "receita"
                            ? "text-[#15803d]"
                            : "text-[#b91c1c]"
                        }`}
                      >
                        {lancamento.tipo === "receita" ? "+" : "-"}
                        {formatCurrency(getValorSeguro(lancamento.valor))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

type ResumoCardProps = {
  titulo: string;
  valor: number;
  tipo: "receita" | "despesa" | "saldo";
  loading: boolean;
};

function ResumoCard({ titulo, valor, tipo, loading }: ResumoCardProps) {
  const color =
    tipo === "receita"
      ? "text-[#15803d]"
      : tipo === "despesa"
        ? "text-[#b91c1c]"
        : valor >= 0
          ? "text-[#15803d]"
          : "text-[#b91c1c]";

  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-[#64748b]">
        {titulo}
      </p>
      <strong className={`mt-2 block text-xl font-semibold ${color}`}>
        {loading ? "..." : formatCurrency(valor)}
      </strong>
    </div>
  );
}

function CategoriaLimite({ categoria }: { categoria: CategoriaResumo }) {
  const percentual =
    categoria.limite > 0 ? Math.min((categoria.gasto / categoria.limite) * 100, 100) : 0;
  const passouLimite = categoria.gasto > categoria.limite;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{categoria.nome}</p>
        <span
          className={`text-sm font-semibold ${
            passouLimite ? "text-[#b91c1c]" : "text-[#334155]"
          }`}
        >
          {formatCurrency(categoria.gasto)} / {formatCurrency(categoria.limite)}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#e2e8f0]">
        <div
          className={`h-2 rounded-full ${
            passouLimite ? "bg-[#ef4444]" : "bg-[#16a34a]"
          }`}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}
