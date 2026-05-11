"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { formatCurrency, formatDate, formatDateInput, getCurrentMonthRange } from "@/lib/format";

type TipoLancamento = "receita" | "despesa";
type StatusLancamento = "pago" | "pendente";
type FiltroTipo = "todos" | TipoLancamento;

type LancamentoPlanilha = {
  id: string;
  data: string;
  tipo: TipoLancamento;
  descricao: string;
  categoria: string;
  conta: string;
  valor: string;
  status: StatusLancamento;
  observacao: string;
};

type CampoLancamento = keyof LancamentoPlanilha;

const STORAGE_KEY = "controle-financeiro-domestico-v1";

const categoriasDespesa = [
  "Mercado",
  "Moradia",
  "Transporte",
  "Saude",
  "Educacao",
  "Lazer",
  "Cartao",
  "Outros",
];

const categoriasReceita = [
  "Salario",
  "Freelance",
  "Rendimento",
  "Reembolso",
  "Outros",
];

const contasSugeridas = [
  "Conta corrente",
  "Cartao de credito",
  "Dinheiro",
  "Pix",
  "Poupanca",
];

function criarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function criarLinhaVazia(): LancamentoPlanilha {
  return {
    id: criarId(),
    data: formatDateInput(new Date()),
    tipo: "despesa",
    descricao: "",
    categoria: "",
    conta: "",
    valor: "",
    status: "pago",
    observacao: "",
  };
}

function normalizarLancamento(item: Partial<LancamentoPlanilha>): LancamentoPlanilha {
  return {
    id: item.id || criarId(),
    data: item.data || formatDateInput(new Date()),
    tipo: item.tipo === "receita" ? "receita" : "despesa",
    descricao: item.descricao || "",
    categoria: item.categoria || "",
    conta: item.conta || "",
    valor:
      item.valor === undefined || item.valor === null
        ? ""
        : String(item.valor).replace(",", "."),
    status: item.status === "pendente" ? "pendente" : "pago",
    observacao: item.observacao || "",
  };
}

function lerValor(valor: string) {
  const numero = Number(valor.replace(",", "."));

  return Number.isFinite(numero) ? numero : 0;
}

function calcularTotais(lancamentos: LancamentoPlanilha[]) {
  return lancamentos.reduce(
    (totais, lancamento) => {
      const valor = lerValor(lancamento.valor);

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
        pendente:
          lancamento.status === "pendente" ? totais.pendente + valor : totais.pendente,
        saldo: totais.saldo - valor,
      };
    },
    { receitas: 0, despesas: 0, pendente: 0, saldo: 0 },
  );
}

function agruparDespesasPorCategoria(lancamentos: LancamentoPlanilha[]) {
  const mapa = new Map<string, number>();

  lancamentos.forEach((lancamento) => {
    if (lancamento.tipo !== "despesa") return;

    const categoria = lancamento.categoria.trim() || "Sem categoria";
    mapa.set(categoria, (mapa.get(categoria) || 0) + lerValor(lancamento.valor));
  });

  return Array.from(mapa.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total);
}

function escaparCsv(valor: string) {
  return `"${valor.replace(/"/g, '""')}"`;
}

function montarCsv(lancamentos: LancamentoPlanilha[]) {
  const cabecalho = [
    "data",
    "tipo",
    "descricao",
    "categoria",
    "conta",
    "valor",
    "status",
    "observacao",
  ];

  const linhas = lancamentos.map((lancamento) =>
    [
      lancamento.data,
      lancamento.tipo,
      lancamento.descricao,
      lancamento.categoria,
      lancamento.conta,
      lerValor(lancamento.valor).toFixed(2).replace(".", ","),
      lancamento.status,
      lancamento.observacao,
    ]
      .map(escaparCsv)
      .join(";"),
  );

  return [cabecalho.join(";"), ...linhas].join("\n");
}

export default function Home() {
  const rangeInicial = useMemo(() => getCurrentMonthRange(), []);
  const [lancamentos, setLancamentos] = useState<LancamentoPlanilha[]>([]);
  const [dataInicio, setDataInicio] = useState(rangeInicial.start);
  const [dataFim, setDataFim] = useState(rangeInicial.end);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [busca, setBusca] = useState("");
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const salvo = window.localStorage.getItem(STORAGE_KEY);

      if (salvo) {
        try {
          const dados = JSON.parse(salvo);

          if (Array.isArray(dados)) {
            setLancamentos(dados.map(normalizarLancamento));
          }
        } catch (error) {
          console.error("Erro ao ler planilha local:", error);
        }
      }

      setCarregado(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!carregado) return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos));
  }, [carregado, lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return lancamentos
      .filter((lancamento) => {
        const dentroDoPeriodo =
          (!dataInicio || lancamento.data >= dataInicio) &&
          (!dataFim || lancamento.data <= dataFim);
        const tipoOk = filtroTipo === "todos" || lancamento.tipo === filtroTipo;
        const buscaOk =
          !termo ||
          [
            lancamento.descricao,
            lancamento.categoria,
            lancamento.conta,
            lancamento.observacao,
          ]
            .join(" ")
            .toLowerCase()
            .includes(termo);

        return dentroDoPeriodo && tipoOk && buscaOk;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [busca, dataFim, dataInicio, filtroTipo, lancamentos]);

  const totais = calcularTotais(lancamentosFiltrados);
  const despesasPorCategoria = agruparDespesasPorCategoria(lancamentosFiltrados);
  const maiorDespesa = despesasPorCategoria[0]?.total || 0;

  function adicionarLinha() {
    setLancamentos((atuais) => [criarLinhaVazia(), ...atuais]);
  }

  function duplicarLinha(lancamento: LancamentoPlanilha) {
    setLancamentos((atuais) => [
      {
        ...lancamento,
        id: criarId(),
        descricao: lancamento.descricao ? `${lancamento.descricao} copia` : "",
      },
      ...atuais,
    ]);
  }

  function removerLinha(id: string) {
    if (!confirm("Remover este lancamento?")) return;

    setLancamentos((atuais) => atuais.filter((lancamento) => lancamento.id !== id));
  }

  function atualizarLinha(
    id: string,
    campo: CampoLancamento,
    valor: LancamentoPlanilha[CampoLancamento],
  ) {
    setLancamentos((atuais) =>
      atuais.map((lancamento) => {
        if (lancamento.id !== id) return lancamento;

        if (campo === "tipo") {
          return {
            ...lancamento,
            tipo: valor as TipoLancamento,
            categoria: "",
          };
        }

        return {
          ...lancamento,
          [campo]: valor,
        };
      }),
    );
  }

  function limparFiltros() {
    setDataInicio(rangeInicial.start);
    setDataFim(rangeInicial.end);
    setFiltroTipo("todos");
    setBusca("");
  }

  function exportarCsv() {
    const csv = montarCsv(lancamentosFiltrados);
    const blob = new Blob([`\ufeff${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `controle-financeiro-${dataInicio || "inicio"}-${dataFim || "fim"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function limparPlanilha() {
    if (!confirm("Apagar todos os lancamentos desta planilha?")) return;

    setLancamentos([]);
  }

  return (
    <AppShell
      title="Planilha domestica"
      subtitle="Controle simples para receitas e despesas da casa"
      action={
        <button
          type="button"
          onClick={adicionarLinha}
          className="inline-flex h-10 items-center rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d]"
        >
          Nova linha
        </button>
      }
    >
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard titulo="Receitas" valor={totais.receitas} tom="receita" />
          <ResumoCard titulo="Despesas" valor={totais.despesas} tom="despesa" />
          <ResumoCard titulo="Saldo" valor={totais.saldo} tom="saldo" />
          <ResumoCard titulo="A pagar" valor={totais.pendente} tom="pendente" />
        </section>

        <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.9fr_1.2fr_auto_auto] lg:items-end">
            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Data inicial
              <input
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Data final
              <input
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Tipo
              <select
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value as FiltroTipo)}
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="todos">Todos</option>
                <option value="despesa">Despesas</option>
                <option value="receita">Receitas</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Busca
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Descricao, categoria ou conta"
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <button
              type="button"
              onClick={limparFiltros}
              className="h-10 rounded-md border border-[#cbd5e1] px-3 text-sm font-semibold text-[#334155] transition hover:border-[#64748b]"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={exportarCsv}
              className="h-10 rounded-md bg-[#2563eb] px-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              Exportar CSV
            </button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
          <div className="overflow-hidden rounded-lg border border-[#d8dee8] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#e2e8f0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Lancamentos</h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  {carregado ? `${lancamentosFiltrados.length} linhas no periodo` : "Carregando..."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={adicionarLinha}
                  className="h-9 rounded-md bg-[#16a34a] px-3 text-sm font-semibold text-white transition hover:bg-[#15803d]"
                >
                  Nova linha
                </button>
                <button
                  type="button"
                  onClick={limparPlanilha}
                  disabled={lancamentos.length === 0}
                  className="h-9 rounded-md border border-[#fecaca] px-3 text-sm font-semibold text-[#b91c1c] transition hover:border-[#ef4444] disabled:cursor-not-allowed disabled:border-[#e2e8f0] disabled:text-[#94a3b8]"
                >
                  Apagar tudo
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-sm">
                <thead className="bg-[#f8fafc] text-left text-xs font-semibold uppercase tracking-normal text-[#64748b]">
                  <tr>
                    <th className="w-[132px] border-b border-[#e2e8f0] px-3 py-3">
                      Data
                    </th>
                    <th className="w-[120px] border-b border-[#e2e8f0] px-3 py-3">
                      Tipo
                    </th>
                    <th className="w-[220px] border-b border-[#e2e8f0] px-3 py-3">
                      Descricao
                    </th>
                    <th className="w-[160px] border-b border-[#e2e8f0] px-3 py-3">
                      Categoria
                    </th>
                    <th className="w-[160px] border-b border-[#e2e8f0] px-3 py-3">
                      Conta
                    </th>
                    <th className="w-[130px] border-b border-[#e2e8f0] px-3 py-3 text-right">
                      Valor
                    </th>
                    <th className="w-[120px] border-b border-[#e2e8f0] px-3 py-3">
                      Status
                    </th>
                    <th className="w-[210px] border-b border-[#e2e8f0] px-3 py-3">
                      Observacao
                    </th>
                    <th className="w-[150px] border-b border-[#e2e8f0] px-3 py-3">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-[#64748b]">
                        Nenhum lancamento encontrado.
                      </td>
                    </tr>
                  ) : (
                    lancamentosFiltrados.map((lancamento) => (
                      <tr key={lancamento.id} className="border-b border-[#eef2f7] last:border-0">
                        <td className="px-3 py-2 align-top">
                          <input
                            type="date"
                            value={lancamento.data}
                            onChange={(event) =>
                              atualizarLinha(lancamento.id, "data", event.target.value)
                            }
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            value={lancamento.tipo}
                            onChange={(event) =>
                              atualizarLinha(
                                lancamento.id,
                                "tipo",
                                event.target.value as TipoLancamento,
                              )
                            }
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          >
                            <option value="despesa">Despesa</option>
                            <option value="receita">Receita</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={lancamento.descricao}
                            onChange={(event) =>
                              atualizarLinha(lancamento.id, "descricao", event.target.value)
                            }
                            placeholder="Ex.: Mercado"
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            list={
                              lancamento.tipo === "despesa"
                                ? "categorias-despesa"
                                : "categorias-receita"
                            }
                            value={lancamento.categoria}
                            onChange={(event) =>
                              atualizarLinha(lancamento.id, "categoria", event.target.value)
                            }
                            placeholder="Categoria"
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            list="contas-sugeridas"
                            value={lancamento.conta}
                            onChange={(event) =>
                              atualizarLinha(lancamento.id, "conta", event.target.value)
                            }
                            placeholder="Conta"
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lancamento.valor}
                            onChange={(event) =>
                              atualizarLinha(lancamento.id, "valor", event.target.value)
                            }
                            placeholder="0,00"
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-right outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            value={lancamento.status}
                            onChange={(event) =>
                              atualizarLinha(
                                lancamento.id,
                                "status",
                                event.target.value as StatusLancamento,
                              )
                            }
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          >
                            <option value="pago">Pago</option>
                            <option value="pendente">Pendente</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={lancamento.observacao}
                            onChange={(event) =>
                              atualizarLinha(lancamento.id, "observacao", event.target.value)
                            }
                            placeholder="Opcional"
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => duplicarLinha(lancamento)}
                              className="h-9 rounded-md border border-[#cbd5e1] px-3 text-xs font-semibold text-[#334155] transition hover:border-[#64748b]"
                            >
                              Copiar
                            </button>
                            <button
                              type="button"
                              onClick={() => removerLinha(lancamento.id)}
                              className="h-9 rounded-md border border-[#fecaca] px-3 text-xs font-semibold text-[#b91c1c] transition hover:border-[#ef4444]"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-[#d8dee8] bg-white">
              <div className="border-b border-[#e2e8f0] px-4 py-4">
                <h2 className="text-base font-semibold">Resumo por categoria</h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  {formatDate(dataInicio)} ate {formatDate(dataFim)}
                </p>
              </div>

              <div className="space-y-4 p-4">
                {despesasPorCategoria.length === 0 ? (
                  <p className="text-sm text-[#64748b]">Sem despesas no periodo.</p>
                ) : (
                  despesasPorCategoria.slice(0, 8).map((item) => {
                    const largura = maiorDespesa > 0 ? (item.total / maiorDespesa) * 100 : 0;

                    return (
                      <div key={item.categoria}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold">{item.categoria}</p>
                          <span className="shrink-0 text-sm font-semibold text-[#b91c1c]">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-[#e2e8f0]">
                          <div
                            className="h-2 rounded-full bg-[#ef4444]"
                            style={{ width: `${largura}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#64748b]">Linhas salvas</dt>
                  <dd className="font-semibold">{lancamentos.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#64748b]">No filtro</dt>
                  <dd className="font-semibold">{lancamentosFiltrados.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#64748b]">Periodo</dt>
                  <dd className="font-semibold">
                    {formatDate(dataInicio)} - {formatDate(dataFim)}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </section>
      </div>

      <datalist id="categorias-despesa">
        {categoriasDespesa.map((categoria) => (
          <option key={categoria} value={categoria} />
        ))}
      </datalist>
      <datalist id="categorias-receita">
        {categoriasReceita.map((categoria) => (
          <option key={categoria} value={categoria} />
        ))}
      </datalist>
      <datalist id="contas-sugeridas">
        {contasSugeridas.map((conta) => (
          <option key={conta} value={conta} />
        ))}
      </datalist>
    </AppShell>
  );
}

type ResumoCardProps = {
  titulo: string;
  valor: number;
  tom: "receita" | "despesa" | "saldo" | "pendente";
};

function ResumoCard({ titulo, valor, tom }: ResumoCardProps) {
  const destaque =
    tom === "receita"
      ? "text-[#15803d]"
      : tom === "despesa" || tom === "pendente"
        ? "text-[#b91c1c]"
        : valor >= 0
          ? "text-[#15803d]"
          : "text-[#b91c1c]";

  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-[#64748b]">
        {titulo}
      </p>
      <strong className={`mt-2 block text-2xl font-semibold ${destaque}`}>
        {formatCurrency(valor)}
      </strong>
    </div>
  );
}
