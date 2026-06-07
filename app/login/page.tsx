"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  cadastrarComEmail,
  carregarDadosDaNuvem,
  entrarComEmail,
  obterUsuarioAtual,
  sairDaNuvem,
  salvarDadosNaNuvem,
} from "@/lib/cloud-sync";
import {
  lerDadosFinanceirosLocais,
  salvarDadosFinanceirosLocais,
} from "@/lib/dados-financeiros";
import { marcarDadosNuvemAtualizados } from "@/lib/sync-metadata";

type UsuarioNuvem = {
  id: string;
  email?: string;
};

export default function LoginPage() {
  const [usuario, setUsuario] = useState<UsuarioNuvem | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    void atualizarUsuario();
  }, []);

  async function executar(acao: () => Promise<void>) {
    setCarregando(true);
    setMensagem("");

    try {
      await acao();
    } catch (error) {
      console.error("Erro na nuvem:", error);
      setMensagem(error instanceof Error ? error.message : "Erro ao sincronizar.");
    } finally {
      setCarregando(false);
    }
  }

  async function atualizarUsuario() {
    try {
      const user = await obterUsuarioAtual();
      setUsuario(user ? { id: user.id, email: user.email } : null);
    } catch {
      setUsuario(null);
    }
  }

  function lerDadosLocais() {
    return lerDadosFinanceirosLocais(window.localStorage);
  }

  async function entrar() {
    await entrarComEmail(email, senha);
    await atualizarUsuario();
    setMensagem("Login realizado.");
  }

  async function cadastrar() {
    await cadastrarComEmail(email, senha);
    await atualizarUsuario();
    setMensagem("Cadastro enviado. Confirme o email se o Supabase solicitar.");
  }

  async function salvarNaNuvem() {
    const dadosSalvos = await salvarDadosNaNuvem(lerDadosLocais());

    marcarDadosNuvemAtualizados(window.localStorage, dadosSalvos.atualizadoEm);
    setMensagem("Dados locais salvos na nuvem.");
  }

  async function carregarDaNuvem() {
    const dados = await carregarDadosDaNuvem();

    if (!dados) {
      setMensagem("Nenhum dado salvo na nuvem ainda.");
      return;
    }

    if (!confirm("Carregar dados da nuvem e substituir os dados locais?")) {
      return;
    }

    salvarDadosFinanceirosLocais(window.localStorage, dados, {
      atualizadoEmLocal: dados.atualizadoEm,
      atualizadoEmNuvem: dados.atualizadoEm,
    });
    setMensagem("Dados da nuvem carregados. Reabra a planilha para ver tudo atualizado.");
  }

  async function sair() {
    await sairDaNuvem();
    setUsuario(null);
    setMensagem("Sessao encerrada.");
  }

  return (
    <AppShell
      title="Nuvem"
      subtitle="Login e sincronizacao dos dados financeiros"
    >
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
          <h2 className="text-base font-semibold">Conta</h2>

          {usuario ? (
            <div className="mt-4 rounded-md bg-[#f8fafc] p-3 text-sm">
              <p className="font-semibold">{usuario.email || usuario.id}</p>
              <p className="mt-1 text-[#64748b]">Sessao ativa no Supabase.</p>
            </div>
          ) : (
            <form className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-[#334155]">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                />
              </label>

              <label className="grid gap-1 text-sm font-medium text-[#334155]">
                Senha
                <input
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={carregando}
                  onClick={() => void executar(entrar)}
                  className="h-10 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  disabled={carregando}
                  onClick={() => void executar(cadastrar)}
                  className="h-10 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#334155] transition hover:border-[#64748b] disabled:cursor-not-allowed disabled:text-[#94a3b8]"
                >
                  Criar conta
                </button>
              </div>
            </form>
          )}

          {mensagem ? (
            <p className="mt-4 rounded-md bg-[#f8fafc] p-3 text-sm text-[#334155]">
              {mensagem}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
          <h2 className="text-base font-semibold">Sincronizacao</h2>
          <p className="mt-1 text-sm text-[#64748b]">
            Salve o estado local na nuvem ou substitua os dados locais pelo backup
            da sua conta.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!usuario || carregando}
              onClick={() => void executar(salvarNaNuvem)}
              className="h-10 rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            >
              Salvar na nuvem
            </button>
            <button
              type="button"
              disabled={!usuario || carregando}
              onClick={() => void executar(carregarDaNuvem)}
              className="h-10 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            >
              Carregar da nuvem
            </button>
            <button
              type="button"
              disabled={!usuario || carregando}
              onClick={() => void executar(sair)}
              className="h-10 rounded-md border border-[#fecaca] px-4 text-sm font-semibold text-[#b91c1c] transition hover:border-[#ef4444] disabled:cursor-not-allowed disabled:border-[#e2e8f0] disabled:text-[#94a3b8]"
            >
              Sair
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
