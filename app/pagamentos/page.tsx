"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import Upload from "@/components/Upload";
import { formatCurrency, formatDateInput } from "@/lib/format";

type Conta = {
  id: string;
  nome: string;
  user_id: string;
};

export default function PagamentosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [valor, setValor] = useState("");
  const [dataPagamento, setDataPagamento] = useState(() =>
    formatDateInput(new Date()),
  );
  const [comprovante, setComprovante] = useState("");
  const [salvando, setSalvando] = useState(false);

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

  async function salvar() {
    if (!user) {
      alert("Precisa estar logado");
      return;
    }

    if (!contaId || !contas.some((conta) => conta.id === contaId)) {
      alert("Selecione uma conta valida");
      return;
    }

    const valorNumerico = Number(valor.replace(",", "."));

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      alert("Informe um valor maior que zero");
      return;
    }

    if (!dataPagamento) {
      alert("Informe a data do pagamento");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.from("pagamentos").insert([
      {
        user_id: user.id,
        conta_id: contaId,
        valor: valorNumerico,
        status: "pago",
        data_pagamento: dataPagamento,
        comprovante_url: comprovante || null,
      },
    ]);

    if (error) {
      console.error("Erro ao salvar pagamento:", error);
      alert("Erro ao salvar pagamento");
      setSalvando(false);
      return;
    }

    alert("Pagamento salvo!");
    setContaId("");
    setValor("");
    setDataPagamento(formatDateInput(new Date()));
    setComprovante("");
    setSalvando(false);
  }

  const valorPreview = Number(valor.replace(",", "."));
  const contaSelecionada = contas.find((conta) => conta.id === contaId);

  return (
    <AppShell
      title="Novo pagamento"
      subtitle="Lancamento"
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-[#d8dee8] bg-white p-5">
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Conta
              <select
                value={contaId}
                onChange={(event) => setContaId(event.target.value)}
                className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="">Selecione a conta</option>
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
              </select>
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
                  value={dataPagamento}
                  onChange={(event) => setDataPagamento(event.target.value)}
                  className="h-11 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                />
              </label>
            </div>

            <div className="grid gap-2 text-sm font-medium text-[#334155]">
              Comprovante
              <div className="rounded-md border border-dashed border-[#94a3b8] bg-[#f8fafc] p-4">
                <Upload
                  userId={user?.id ?? null}
                  onUpload={setComprovante}
                  disabled={!user}
                />
                {comprovante ? (
                  <p className="mt-3 text-xs font-medium text-[#15803d]">
                    Comprovante anexado
                  </p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="h-11 rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            >
              {salvando ? "Salvando..." : "Salvar pagamento"}
            </button>
          </div>
        </section>

        <aside className="rounded-lg border border-[#d8dee8] bg-[#111827] p-5 text-white">
          <p className="text-sm font-medium text-[#cbd5e1]">Resumo</p>
          <strong className="mt-3 block text-3xl font-semibold tracking-normal">
            {Number.isFinite(valorPreview) && valorPreview > 0
              ? formatCurrency(valorPreview)
              : formatCurrency(0)}
          </strong>

          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-[#cbd5e1]">Conta</dt>
              <dd className="font-medium">{contaSelecionada?.nome || "-"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-[#cbd5e1]">Status</dt>
              <dd className="font-medium">Pago</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#cbd5e1]">Comprovante</dt>
              <dd className="font-medium">{comprovante ? "Anexado" : "-"}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}
