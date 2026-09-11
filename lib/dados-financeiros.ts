import type { DadosFinanceirosNuvem } from "@/lib/cloud-sync";
import {
  lerFechamentosSalvos,
  lerMetasSalvas,
  lerRecorrenciasSalvas,
  salvarFechamentos,
  salvarMetas,
  salvarRecorrencias,
} from "@/lib/planejamento";
import type {
  FechamentoMes,
  LancamentoRecorrente,
  MetaCategoria,
} from "@/lib/planejamento";
import {
  lerLancamentosSalvos,
  salvarLancamentos,
} from "@/lib/storage-lancamentos";
import type { LancamentoPlanilha } from "@/lib/lancamentos";
import {
  marcarDadosLocaisAtualizados,
  marcarDadosNuvemAtualizados,
} from "@/lib/sync-metadata";

export type DadosFinanceirosLocais = {
  lancamentos: LancamentoPlanilha[];
  recorrencias: LancamentoRecorrente[];
  metas: MetaCategoria[];
  fechamentos: Record<string, FechamentoMes>;
};

type SalvarDadosLocaisOptions = {
  atualizadoEmLocal?: string;
  atualizadoEmNuvem?: string;
};

export function lerDadosFinanceirosLocais(
  storage: Storage,
): DadosFinanceirosLocais {
  return {
    lancamentos: lerLancamentosSalvos(storage),
    recorrencias: lerRecorrenciasSalvas(storage),
    metas: lerMetasSalvas(storage),
    fechamentos: lerFechamentosSalvos(storage),
  };
}

export function salvarDadosFinanceirosLocais(
  storage: Storage,
  dados: DadosFinanceirosLocais,
  options: SalvarDadosLocaisOptions = {},
) {
  salvarLancamentos(storage, dados.lancamentos);
  salvarRecorrencias(storage, dados.recorrencias);
  salvarMetas(storage, dados.metas);
  salvarFechamentos(storage, dados.fechamentos);

  if (options.atualizadoEmLocal) {
    marcarDadosLocaisAtualizados(storage, options.atualizadoEmLocal);
  }

  if (options.atualizadoEmNuvem) {
    marcarDadosNuvemAtualizados(storage, options.atualizadoEmNuvem);
  }
}

export function limparDadosFinanceirosLocais(storage: Storage) {
  storage.removeItem("controle-financeiro-domestico-v1");
  storage.removeItem("controle-financeiro-recorrencias-v1");
  storage.removeItem("controle-financeiro-metas-categorias-v1");
  storage.removeItem("controle-financeiro-fechamentos-mes-v1");
  storage.removeItem("controle-financeiro-local-atualizado-em-v1");
  storage.removeItem("controle-financeiro-nuvem-atualizado-em-v1");
  storage.removeItem("controle-financeiro-local-substituido-pela-nuvem-v1");
}

export function extrairDadosLocaisDaNuvem(
  dados: DadosFinanceirosNuvem,
): DadosFinanceirosLocais {
  return {
    lancamentos: dados.lancamentos,
    recorrencias: dados.recorrencias,
    metas: dados.metas,
    fechamentos: dados.fechamentos,
  };
}

export function dadosFinanceirosTemConteudo(dados: DadosFinanceirosLocais) {
  return (
    dados.lancamentos.length > 0 ||
    dados.recorrencias.length > 0 ||
    dados.metas.length > 0 ||
    Object.keys(dados.fechamentos).length > 0
  );
}

