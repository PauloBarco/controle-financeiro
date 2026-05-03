"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";
import type {
  Categoria,
  Conta,
  Lancamento,
  TipoLancamento,
} from "@/lib/finance";
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
  formatDateInput,
  getCurrentMonthRange,
  getNextDate,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";

export default function LancamentosPage() {
  const rangeInicial = useMemo(() => getCurrentMonthRange(), []);
  const [user, setUser] = useState<User | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [tipo, setTipo] = useState<TipoLancamento>("despesa");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataLancamento, setDataLancamento] = useState(() =>
    formatDateInput(new Date()),
  );
  const [categoriaId, setCategoriaId] = useState("");
  const [contaId, setContaId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const categoriasFiltradas = categorias.filter(
    (categoria) => categoria.tipo === tipo,
  );
  const totais = calcularTotais(lancamentos);

  const carregarDados = useCallback(
    async (userId: string) => {
      const [contasResult, categoriasResult, lancamentosResult] =
        await Promise.all([
          supabase
            .from("contas")
            .select("id, nome, user_id")
            .eq("user_id", userId)
            .order("nome", { ascending: true }),
          supabase
            .from("categorias")
            .select("id, nome, tipo, limite_mensal, user_id")
            .eq("user_id", userId)
            .order("tipo", { ascending: true })
            .order("nome", { ascending: true }),
          supabase
            .from("lancamentos")
            .select(LANCAMENTOS_SELECT)
            .eq("user_id", userId)
            .gte("data_lancamento", rangeInicial.start)
            .lt("data_lancamento", getNextDate(rangeInicial.end))
            .order("data_lancamento", { ascending: false }),
        ]);

      if (contasResult.error) throw new Error("Erro ao carregar contas");
      if (categoriasResult.error) throw new Error("Erro ao carregar categorias");
      if (lancamentosResult.error)
        throw new Error("Erro ao carregar lancamentos");

      setContas(contasResult.data || []);
      setCategorias(categoriasResult.data || []);
      setLancamentos(lancamentosResult.data || []);
    },
    [rangeInicial.end, rangeInicial.start],
  );

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (ignore) return;

        if (error) throw new Error("Erro ao verificar login");

        if (!data.user) {
          setLoading(false);
          return;
        }

        setUser(data.user);
        await carregarDados(data.user.id);
        setErro("");
      } catch (error) {
        if (ignore) return;

        console.error(error);
        setErro("Nao foi possivel carregar os lancamentos.");
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
  }, [carregarDados]);

  function limparFormulario() {
    setTipo("despesa");
    setDescricao("");
    setValor("");
    setDataLancamento(formatDateInput(new Date()));
    setCategoriaId("");
    setContaId("");
    setObservacao("");
    setEditandoId(null);
  }

  async function salvarLancamento() {
    if (!user) return alert("Precisa estar logado");

    const descricaoLimpa = descricao.trim();
    const valorNumerico = Number(valor.replace(",", "."));

    if (!descricaoLimpa) {
      alert("Informe uma descricao");
      return;
    }

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      alert("Informe um valor maior que zero");
      return;
    }

    if (!dataLancamento) {
      alert("Informe a data");
      return;
    }

    if (!categoriaId) {
      alert("Selecione uma categoria");
      return;
    }

    setSalvando(true);

    const payload = {
      user_id: user.id,
      categoria_id: categoriaId,
      conta_id: contaId || null,
      tipo,
      descricao: descricaoLimpa,
      valor: valorNumerico,
      data_lancamento: dataLancamento,
      observacao: observacao.trim() || null,
    };

    const { error } = editandoId
      ? await supabase
          .from("lancamentos")
          .update(payload)
          .eq("id", editandoId)
          .eq("user_id", user.id)
      : await supabase.from("lancamentos").insert([payload]);

    if (error) {
      console.error("Erro ao salvar lancamento:", error);
      alert("Erro ao salvar lancamento");
      setSalvando(false);
      return;
    }

    limparFormulario();
    await carregarDados(user.id);
    setSalvando(false);
  }

  function editarLancamento(lancamento: Lancamento) {
    setEditandoId(lancamento.id);
    setTipo(lancamento.tipo);
    setDescricao(lancamento.descricao);
    setValor(String(getValorSeguro(lancamento.valor)));
    setDataLancamento(
      lancamento.data_lancamento || formatDateInput(new Date()),
    );
    setCategoriaId(lancamento.categoria_id || "");
    setContaId(lancamento.conta_id || "");
    setObservacao(lancamento.observacao || "");
  }

  async function excluirLancamento(id: string) {
    if (!user) return alert("Precisa estar logado");
    if (!confirm("Deseja excluir este lancamento?")) return;

    const { error } = await supabase
      .from("lancamentos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao excluir lancamento:", error);
      alert("Erro ao excluir lancamento");
      return;
    }

    await carregarDados(user.id);
  }

  function trocarTipo(novoTipo: TipoLancamento) {
    setTipo(novoTipo);
    setCategoriaId("");
  }

  return (
    <AppShell
      title="Lancamentos"
      subtitle="Receitas e despesas"
      action={
        <Link
          href="/categorias"
          className="inline-flex rounded-md border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#334155] transition hover:border-[#64748b]"
        >
          Categorias
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-[#d8dee8] bg-white p-5">
          <h2 className="text-base font-semibold">
            {editandoId ? "Editar lancamento" : "Novo lancamento"}
          </h2>

          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-[#f1f5f9] p-1">
              {(["despesa", "receita"] as TipoLancamento[]).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => trocarTipo(opcao)}
                  className={`h-10 rounded-md text-sm font-semibold transition ${
                    tipo === opcao
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#64748b] hover:text-[#111827]"
                  }`}
                >
                  {opcao === "despesa" ? "Despesa" : "Receita"}
                </button>
              ))}
            </div>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Descricao
              <input
                placeholder="Ex.: Mercado da semana"
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-[#334155]">
                Valor
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={(event) => setValor(event.target.value)}
                  className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-[#334155]">
                Data
                <input
                  type="date"
                  value={dataLancamento}
                  onChange={(event) => setDataLancamento(event.target.value)}
                  className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Categoria
              <select
                value={categoriaId}
                onChange={(event) => setCategoriaId(event.target.value)}
                className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="">Selecione uma categoria</option>
                {categoriasFiltradas.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Conta
              <select
                value={contaId}
                onChange={(event) => setContaId(event.target.value)}
                className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="">Sem conta vinculada</option>
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Observacao
              <textarea
                rows={3}
                placeholder="Opcional"
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            {categoriasFiltradas.length === 0 ? (
              <div className="rounded-md border border-[#f59e0b] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
                Cadastre uma categoria de{" "}
                {tipo === "despesa" ? "despesa" : "receita"} antes de lancar.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={salvarLancamento}
                disabled={salvando || categoriasFiltradas.length === 0}
                className="h-11 rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
              >
                {salvando ? "Salvando..." : "Salvar lancamento"}
              </button>

              {editandoId ? (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="h-11 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#334155] transition hover:border-[#64748b]"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {erro ? (
            <div className="rounded-md border border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
              {erro}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <ResumoCard titulo="Receitas" valor={totais.receitas} tipo="receita" />
            <ResumoCard titulo="Despesas" valor={totais.despesas} tipo="despesa" />
            <ResumoCard titulo="Saldo" valor={totais.saldo} tipo="saldo" />
          </div>

          <div className="rounded-lg border border-[#d8dee8] bg-white">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-4">
              <h2 className="text-base font-semibold">Lancamentos do mes</h2>
              <span className="text-sm text-[#64748b]">
                {loading ? "..." : lancamentos.length}
              </span>
            </div>

            <div className="divide-y divide-[#e2e8f0]">
              {loading ? (
                <p className="px-4 py-6 text-sm text-[#64748b]">
                  Carregando lancamentos...
                </p>
              ) : lancamentos.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[#64748b]">
                  Nenhum lancamento neste mes.
                </p>
              ) : (
                lancamentos.map((lancamento) => (
                  <div key={lancamento.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
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

                      <strong
                        className={`shrink-0 text-sm font-semibold ${
                          lancamento.tipo === "receita"
                            ? "text-[#15803d]"
                            : "text-[#b91c1c]"
                        }`}
                      >
                        {lancamento.tipo === "receita" ? "+" : "-"}
                        {formatCurrency(getValorSeguro(lancamento.valor))}
                      </strong>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => editarLancamento(lancamento)}
                        className="h-8 rounded-md border border-[#cbd5e1] px-3 text-xs font-semibold text-[#334155] transition hover:border-[#64748b]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirLancamento(lancamento.id)}
                        className="h-8 rounded-md border border-[#fecaca] px-3 text-xs font-semibold text-[#b91c1c] transition hover:border-[#ef4444]"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

type ResumoCardProps = {
  titulo: string;
  valor: number;
  tipo: "receita" | "despesa" | "saldo";
};

function ResumoCard({ titulo, valor, tipo }: ResumoCardProps) {
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
      <strong className={`mt-2 block text-lg font-semibold ${color}`}>
        {formatCurrency(valor)}
      </strong>
    </div>
  );
}
