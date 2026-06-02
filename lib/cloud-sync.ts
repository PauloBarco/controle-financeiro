import { getSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/lib/supabase";
import { normalizarLancamento } from "@/lib/lancamentos";
import type { LancamentoPlanilha } from "@/lib/lancamentos";
import {
  normalizarFechamentos,
  normalizarMeta,
  normalizarRecorrencia,
} from "@/lib/planejamento";
import type {
  FechamentoMes,
  LancamentoRecorrente,
  MetaCategoria,
} from "@/lib/planejamento";

export type DadosFinanceirosNuvem = {
  versao: 1;
  atualizadoEm: string;
  lancamentos: LancamentoPlanilha[];
  recorrencias: LancamentoRecorrente[];
  metas: MetaCategoria[];
  fechamentos: Record<string, FechamentoMes>;
};

function getClientOrThrow() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  return supabase;
}

function normalizarDadosNuvem(dados: unknown): DadosFinanceirosNuvem {
  const item = dados && typeof dados === "object" ? dados : {};
  const parcial = item as Partial<DadosFinanceirosNuvem>;

  return {
    versao: 1,
    atualizadoEm: parcial.atualizadoEm || "",
    lancamentos: Array.isArray(parcial.lancamentos)
      ? parcial.lancamentos.map((lancamento) =>
          normalizarLancamento(lancamento as Partial<LancamentoPlanilha>),
        )
      : [],
    recorrencias: Array.isArray(parcial.recorrencias)
      ? parcial.recorrencias.map((recorrencia) =>
          normalizarRecorrencia(recorrencia as Partial<LancamentoRecorrente>),
        )
      : [],
    metas: Array.isArray(parcial.metas)
      ? parcial.metas
          .map((meta) => normalizarMeta(meta as Partial<MetaCategoria>))
          .filter((meta) => meta.categoria)
      : [],
    fechamentos: normalizarFechamentos(parcial.fechamentos),
  };
}

export async function obterUsuarioAtual() {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.message === "Auth session missing!") {
      return null;
    }

    throw error;
  }

  return data.user;
}

export async function entrarComEmail(email: string, password: string) {
  const supabase = getClientOrThrow();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
}

export async function cadastrarComEmail(email: string, password: string) {
  const supabase = getClientOrThrow();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) throw error;
}

export async function sairDaNuvem() {
  const supabase = getClientOrThrow();
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function salvarDadosNaNuvem(
  dados: Omit<DadosFinanceirosNuvem, "versao" | "atualizadoEm">,
) {
  const supabase = getClientOrThrow();
  const user = await obterUsuarioAtual();

  if (!user) {
    throw new Error("Entre na conta antes de sincronizar.");
  }

  const atualizadoEm = new Date().toISOString();
  const payload: DadosFinanceirosNuvem = {
    versao: 1,
    atualizadoEm,
    ...dados,
  };
  const { error } = await supabase.from("controle_financeiro_dados").upsert(
    {
      user_id: user.id,
      dados: payload as unknown as Json,
      updated_at: atualizadoEm,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function carregarDadosDaNuvem() {
  const supabase = getClientOrThrow();
  const user = await obterUsuarioAtual();

  if (!user) {
    throw new Error("Entre na conta antes de sincronizar.");
  }

  const { data, error } = await supabase
    .from("controle_financeiro_dados")
    .select("dados, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    ...normalizarDadosNuvem(data.dados),
    atualizadoEm: data.updated_at,
  };
}
