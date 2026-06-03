"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import AppShell from "@/components/AppShell";
import BackupLancamentos from "@/components/BackupLancamentos";
import { PaginationControls } from "@/components/PaginationControls";
import { SaldoCard } from "@/components/SaldoCard";
import { formatCurrency, formatDate, formatDateInput, getCurrentMonthRange } from "@/lib/format";
import { usePagination } from "@/lib/usePagination";
import { notificar } from "@/lib/notificacoes";
import {
  categoriasDespesa,
  categoriasReceita,
  contasSugeridas,
  criarId,
  formasPagamento,
  lerValor,
} from "@/lib/lancamentos";
import {
  lerLancamentosSalvos,
  salvarLancamentos,
} from "@/lib/storage-lancamentos";
import { agendarSincronizacao } from "@/lib/auto-sync";
import { agendarBackupAutomatico } from "@/lib/automatic-backup";
import type {
  CampoLancamento,
  LancamentoPlanilha,
  StatusLancamento,
  TipoLancamento,
} from "@/lib/lancamentos";

type FiltroTipo = "todos" | TipoLancamento;

function criarLinhaVazia(): LancamentoPlanilha {
  return {
    id: criarId(),
    data: formatDateInput(new Date()),
    tipo: "despesa",
    descricao: "",
    categoria: "",
    conta: "",
    formaPagamento: "",
    valor: "",
    status: "pago",
    observacao: "",
  };
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
    "forma_pagamento",
    "valor",
    "status",
    "observacao",
    "comprovante",
  ];

  const linhas = lancamentos.map((lancamento) =>
    [
      lancamento.data,
      lancamento.tipo,
      lancamento.descricao,
      lancamento.categoria,
      lancamento.conta,
      lancamento.formaPagamento,
      lerValor(lancamento.valor).toFixed(2).replace(".", ","),
      lancamento.status,
      lancamento.observacao,
      lancamento.comprovante?.nome || "",
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
      setLancamentos(lerLancamentosSalvos(window.localStorage));
      setCarregado(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!carregado) return;

    salvarLancamentos(window.localStorage, lancamentos);
    // Sincronizar automaticamente após alterações
    agendarSincronizacao(window.localStorage);
    // Fazer backup automático
    agendarBackupAutomatico(window.localStorage);
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
            lancamento.formaPagamento,
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

  // Usar hook de paginação (50 registros por página)
  const paginacao = usePagination({
    items: lancamentosFiltrados,
    itemsPerPage: 50,
  });

  function adicionarLinha() {
    setLancamentos((atuais) => [criarLinhaVazia(), ...atuais]);
    notificar.info("Nova linha adicionada");
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
    notificar.sucesso("Lançamento duplicado");
  }

  function removerLinha(id: string) {
    if (!confirm("Remover este lancamento?")) return;

    setLancamentos((atuais) => atuais.filter((lancamento) => lancamento.id !== id));
    notificar.sucesso("Lançamento removido");
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
    notificar.info("Filtros limpos");
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
    notificar.sucesso("CSV exportado com sucesso");
  }

  function limparPlanilha() {
    if (!confirm("Apagar todos os lancamentos desta planilha?")) return;

    setLancamentos([]);
    notificar.sucesso("Planilha limpa");
  }

  function importarBackup(lancamentosImportados: LancamentoPlanilha[]) {
    setLancamentos(lancamentosImportados);
    salvarLancamentos(window.localStorage, lancamentosImportados);
    setCarregado(true);
    notificar.sucesso(`${lancamentosImportados.length} lançamentos importados`);
  }

  return (
    <AppShell
      title="Planilha Doméstica"
      subtitle="Controle simples para receitas e despesas da casa"
      action={
        <div className="flex flex-wrap gap-2">
          <BackupLancamentos
            lancamentos={lancamentos}
            onImportar={importarBackup}
          />
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-linear-to-r from-purple-600 to-purple-700 px-4 text-sm font-semibold text-white transition hover:shadow-lg dark:from-purple-700 dark:to-purple-800"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/resumo-mes"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-4 text-sm font-semibold text-white transition hover:shadow-lg dark:from-blue-700 dark:to-blue-800"
          >
            📅 Resumo
          </Link>
          <button
            type="button"
            onClick={adicionarLinha}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-linear-to-r from-green-600 to-green-700 px-4 text-sm font-semibold text-white transition hover:shadow-lg dark:from-green-700 dark:to-green-800"
          >
            <Plus className="w-4 h-4" />
            Nova linha
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Cards de saldo (modo bancário moderno) */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SaldoCard 
            titulo="Receitas" 
            valor={totais.receitas} 
            tipo="receita"
          />
          <SaldoCard 
            titulo="Despesas" 
            valor={totais.despesas} 
            tipo="despesa"
          />
          <SaldoCard 
            titulo="Saldo" 
            valor={totais.saldo} 
            tipo="saldo"
          />
          <SaldoCard 
            titulo="A pagar" 
            valor={totais.pendente} 
            tipo="pendente"
          />
        </section>

        {/* Filtros */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.9fr_1.2fr_auto_auto] lg:items-end">
            <label className="grid gap-1 text-sm font-medium">
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
              className="h-10 rounded-lg border border-gray-300 dark:border-gray-700 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Limpar
            </button>

            <button
              type="button"
              onClick={exportarCsv}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-4 text-sm font-semibold text-white transition hover:shadow-lg dark:from-blue-700 dark:to-blue-800"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
          <div className="overflow-hidden rounded-lg border border-[#d8dee8] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#e2e8f0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Lancamentos</h2>
                <p className="mt-1 text-sm text-[#64748b]">
                  {carregado ? `${lancamentosFiltrados.length} linhas no periodo (página ${paginacao.currentPage}/${paginacao.totalPages})` : "Carregando..."}
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

            {/* Controle de paginação superior */}
            {paginacao.totalItems > paginacao.itemsPerPage && (
              <div className="border-b border-[#e2e8f0] px-4 py-3">
                <PaginationControls
                  currentPage={paginacao.currentPage}
                  totalPages={paginacao.totalPages}
                  totalItems={paginacao.totalItems}
                  itemsPerPage={paginacao.itemsPerPage}
                  canGoNext={paginacao.canGoNext}
                  canGoPrevious={paginacao.canGoPrevious}
                  onGoToPage={paginacao.goToPage}
                  onGoToNext={paginacao.goToNextPage}
                  onGoToPrevious={paginacao.goToPreviousPage}
                  onGoToFirst={paginacao.goToFirstPage}
                  onGoToLast={paginacao.goToLastPage}
                />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-7xl border-collapse text-sm">
                <thead className="bg-[#f8fafc] text-left text-xs font-semibold uppercase tracking-normal text-[#64748b]">
                  <tr>
                    <th className="w-33 border-b border-[#e2e8f0] px-3 py-3">
                      Data
                    </th>
                    <th className="w-30 border-b border-[#e2e8f0] px-3 py-3">
                      Tipo
                    </th>
                    <th className="w-55 border-b border-[#e2e8f0] px-3 py-3">
                      Descricao
                    </th>
                    <th className="w-40 border-b border-[#e2e8f0] px-3 py-3">
                      Categoria
                    </th>
                    <th className="w-40 border-b border-[#e2e8f0] px-3 py-3">
                      Conta
                    </th>
                    <th className="w-40 border-b border-[#e2e8f0] px-3 py-3">
                      Pagamento
                    </th>
                    <th className="w-32.5 border-b border-[#e2e8f0] px-3 py-3 text-right">
                      Valor
                    </th>
                    <th className="w-30 border-b border-[#e2e8f0] px-3 py-3">
                      Status
                    </th>
                    <th className="w-52.5 border-b border-[#e2e8f0] px-3 py-3">
                      Observacao
                    </th>
                    <th className="w-37.5 border-b border-[#e2e8f0] px-3 py-3">
                      Acoes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-[#64748b]">
                        Nenhum lancamento encontrado.
                      </td>
                    </tr>
                  ) : (
                    paginacao.paginatedItems.map((lancamento) => (
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
                          <select
                            value={lancamento.formaPagamento}
                            onChange={(event) =>
                              atualizarLinha(
                                lancamento.id,
                                "formaPagamento",
                                event.target.value,
                              )
                            }
                            className="h-9 w-full rounded-md border border-transparent bg-transparent px-2 outline-none transition hover:border-[#cbd5e1] focus:border-[#2563eb] focus:bg-white"
                          >
                            <option value="">Selecione</option>
                            {formasPagamento.map((forma) => (
                              <option key={forma} value={forma}>
                                {forma}
                              </option>
                            ))}
                          </select>
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

            {/* Controle de paginação inferior */}
            {paginacao.totalItems > paginacao.itemsPerPage && (
              <div className="border-t border-[#e2e8f0] px-4 py-3">
                <PaginationControls
                  currentPage={paginacao.currentPage}
                  totalPages={paginacao.totalPages}
                  totalItems={paginacao.totalItems}
                  itemsPerPage={paginacao.itemsPerPage}
                  canGoNext={paginacao.canGoNext}
                  canGoPrevious={paginacao.canGoPrevious}
                  onGoToPage={paginacao.goToPage}
                  onGoToNext={paginacao.goToNextPage}
                  onGoToPrevious={paginacao.goToPreviousPage}
                  onGoToFirst={paginacao.goToFirstPage}
                  onGoToLast={paginacao.goToLastPage}
                />
              </div>
            )}
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
