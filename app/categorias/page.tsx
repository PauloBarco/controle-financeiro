"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";
import type { Categoria, TipoLancamento } from "@/lib/finance";
import { getValorSeguro } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export default function CategoriasPage() {
  const [user, setUser] = useState<User | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoLancamento>("despesa");
  const [limiteMensal, setLimiteMensal] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregarCategorias = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nome, tipo, limite_mensal, user_id")
      .eq("user_id", userId)
      .order("tipo", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar categorias:", error);
      alert("Erro ao carregar categorias");
      return;
    }

    setCategorias(data || []);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function init() {
      const { data, error } = await supabase.auth.getUser();

      if (ignore) return;

      if (error) {
        console.error("Erro ao buscar usuario:", error);
        alert("Erro ao verificar login");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setCategorias([]);
        setLoading(false);
        return;
      }

      setUser(data.user);
      await carregarCategorias(data.user.id);
      setLoading(false);
    }

    void init();

    return () => {
      ignore = true;
    };
  }, [carregarCategorias]);

  async function salvarCategoria() {
    if (!user) return alert("Precisa estar logado");

    const nomeLimpo = nome.trim();
    const limiteNumerico = limiteMensal
      ? Number(limiteMensal.replace(",", "."))
      : null;

    if (!nomeLimpo) {
      alert("Informe o nome da categoria");
      return;
    }

    if (
      limiteMensal &&
      (!Number.isFinite(limiteNumerico) || Number(limiteNumerico) < 0)
    ) {
      alert("Informe um limite mensal valido");
      return;
    }

    setSalvando(true);

    const payload = {
      nome: nomeLimpo,
      tipo,
      limite_mensal: tipo === "despesa" ? limiteNumerico : null,
      user_id: user.id,
    };

    const { error } = editandoId
      ? await supabase
          .from("categorias")
          .update(payload)
          .eq("id", editandoId)
          .eq("user_id", user.id)
      : await supabase.from("categorias").insert([payload]);

    if (error) {
      console.error("Erro ao salvar categoria:", error);
      alert("Erro ao salvar categoria");
      setSalvando(false);
      return;
    }

    setNome("");
    setTipo("despesa");
    setLimiteMensal("");
    setEditandoId(null);
    await carregarCategorias(user.id);
    setSalvando(false);
  }

  function editarCategoria(categoria: Categoria) {
    setNome(categoria.nome);
    setTipo(categoria.tipo);
    setLimiteMensal(
      categoria.limite_mensal === null ? "" : String(categoria.limite_mensal),
    );
    setEditandoId(categoria.id);
  }

  function cancelarEdicao() {
    setNome("");
    setTipo("despesa");
    setLimiteMensal("");
    setEditandoId(null);
  }

  async function excluirCategoria(id: string) {
    if (!user) return alert("Precisa estar logado");
    if (!confirm("Deseja excluir esta categoria?")) return;

    const { error } = await supabase
      .from("categorias")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao excluir categoria:", error);
      alert("Erro ao excluir categoria");
      return;
    }

    await carregarCategorias(user.id);
  }

  const receitas = categorias.filter((categoria) => categoria.tipo === "receita");
  const despesas = categorias.filter((categoria) => categoria.tipo === "despesa");

  return (
    <AppShell title="Categorias" subtitle="Plano domestico">
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-[#d8dee8] bg-white p-5">
          <h2 className="text-base font-semibold">
            {editandoId ? "Editar categoria" : "Nova categoria"}
          </h2>

          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-[#f1f5f9] p-1">
              {(["despesa", "receita"] as TipoLancamento[]).map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => setTipo(opcao)}
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
              Nome
              <input
                placeholder="Ex.: Mercado"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            {tipo === "despesa" ? (
              <label className="grid gap-1 text-sm font-medium text-[#334155]">
                Limite mensal
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Opcional"
                  value={limiteMensal}
                  onChange={(event) => setLimiteMensal(event.target.value)}
                  className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                />
              </label>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={salvarCategoria}
                disabled={salvando}
                className="h-11 rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
              >
                {salvando ? "Salvando..." : "Salvar categoria"}
              </button>

              {editandoId ? (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="h-11 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#334155] transition hover:border-[#64748b]"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#d8dee8] bg-white">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-4">
            <h2 className="text-base font-semibold">Categorias cadastradas</h2>
            <span className="text-sm text-[#64748b]">
              {loading ? "..." : categorias.length}
            </span>
          </div>

          <div className="grid gap-5 p-4 md:grid-cols-2">
            <CategoriaLista
              titulo="Despesas"
              categorias={despesas}
              onEditar={editarCategoria}
              onExcluir={excluirCategoria}
            />
            <CategoriaLista
              titulo="Receitas"
              categorias={receitas}
              onEditar={editarCategoria}
              onExcluir={excluirCategoria}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

type CategoriaListaProps = {
  titulo: string;
  categorias: Categoria[];
  onEditar: (categoria: Categoria) => void;
  onExcluir: (id: string) => void;
};

function CategoriaLista({
  titulo,
  categorias,
  onEditar,
  onExcluir,
}: CategoriaListaProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#64748b]">{titulo}</h3>
      <div className="mt-3 space-y-2">
        {categorias.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#cbd5e1] px-3 py-4 text-sm text-[#64748b]">
            Nenhuma categoria.
          </p>
        ) : (
          categorias.map((categoria) => (
            <div
              key={categoria.id}
              className="rounded-md border border-[#e2e8f0] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{categoria.nome}</p>
                  {categoria.tipo === "despesa" &&
                  categoria.limite_mensal !== null ? (
                    <p className="mt-1 text-xs text-[#64748b]">
                      Limite {formatCurrency(getValorSeguro(categoria.limite_mensal))}
                    </p>
                  ) : null}
                </div>

                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    categoria.tipo === "receita"
                      ? "bg-[#dcfce7] text-[#166534]"
                      : "bg-[#fee2e2] text-[#991b1b]"
                  }`}
                >
                  {categoria.tipo === "receita" ? "Receita" : "Despesa"}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onEditar(categoria)}
                  className="h-8 rounded-md border border-[#cbd5e1] px-3 text-xs font-semibold text-[#334155] transition hover:border-[#64748b]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onExcluir(categoria.id)}
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
  );
}
