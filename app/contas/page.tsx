"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Conta = {
  id: string;
  nome: string;
  user_id: string;
};

export default function ContasPage() {
  const [nome, setNome] = useState("");
  const [contas, setContas] = useState<Conta[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const carregarContas = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("contas")
      .select("id, nome, user_id")
      .eq("user_id", userId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar contas:", error);
      alert("Erro ao carregar contas");
      return;
    }

    setContas(data || []);
  }, []);

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Erro ao buscar usuario:", error);
        alert("Erro ao verificar login");
        return;
      }

      if (!data.user) {
        setContas([]);
        return;
      }

      setUser(data.user);
      await carregarContas(data.user.id);
    }

    void init();
  }, [carregarContas]);

  async function salvarConta() {
    if (!user) return alert("Precisa estar logado");

    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      alert("Informe o nome da conta");
      return;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("contas")
        .update({ nome: nomeLimpo })
        .eq("id", editandoId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao atualizar conta:", error);
        alert("Erro ao atualizar conta");
        return;
      }

      setEditandoId(null);
    } else {
      const { error } = await supabase.from("contas").insert([
        {
          nome: nomeLimpo,
          user_id: user.id,
        },
      ]);

      if (error) {
        console.error("Erro ao criar conta:", error);
        alert("Erro ao criar conta");
        return;
      }
    }

    setNome("");
    await carregarContas(user.id);
  }

  function editarConta(conta: Conta) {
    setNome(conta.nome);
    setEditandoId(conta.id);
  }

  function cancelarEdicao() {
    setNome("");
    setEditandoId(null);
  }

  async function excluirConta(id: string) {
    if (!user) return alert("Precisa estar logado");
    if (!confirm("Deseja excluir?")) return;

    const { error } = await supabase
      .from("contas")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao excluir conta:", error);
      alert("Erro ao excluir conta");
      return;
    }

    await carregarContas(user.id);
  }

  return (
    <AppShell
      title="Contas"
      subtitle="Carteira"
    >
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-[#d8dee8] bg-white p-5">
          <h2 className="text-base font-semibold">
            {editandoId ? "Editar conta" : "Nova conta"}
          </h2>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Nome da conta
              <input
                placeholder="Ex.: Cartao principal"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={salvarConta}
                className="h-11 rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d]"
              >
                {editandoId ? "Atualizar conta" : "Salvar conta"}
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
            <h2 className="text-base font-semibold">Contas cadastradas</h2>
            <span className="text-sm text-[#64748b]">{contas.length}</span>
          </div>

          <div className="divide-y divide-[#e2e8f0]">
            {contas.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#64748b]">
                Nenhuma conta cadastrada.
              </p>
            ) : (
              contas.map((conta) => (
                <div
                  key={conta.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{conta.nome}</p>
                    <p className="mt-1 text-xs text-[#64748b]">Conta ativa</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editarConta(conta)}
                      className="h-9 rounded-md border border-[#cbd5e1] px-3 text-sm font-semibold text-[#334155] transition hover:border-[#64748b]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirConta(conta.id)}
                      className="h-9 rounded-md border border-[#fecaca] px-3 text-sm font-semibold text-[#b91c1c] transition hover:border-[#ef4444]"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
