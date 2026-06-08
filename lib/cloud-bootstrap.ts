import { carregarDadosDaNuvem } from "@/lib/cloud-sync";
import {
  dadosFinanceirosTemConteudo,
  extrairDadosLocaisDaNuvem,
  lerDadosFinanceirosLocais,
  salvarDadosFinanceirosLocais,
} from "@/lib/dados-financeiros";
import type { DadosFinanceirosLocais } from "@/lib/dados-financeiros";
import {
  marcarDadosLocaisAtualizados,
  marcarDadosNuvemAtualizados,
  obterDadosLocaisAtualizadosEm,
  obterDadosNuvemAtualizadosEm,
} from "@/lib/sync-metadata";

export type ResultadoCargaFinanceira = {
  dados: DadosFinanceirosLocais;
  origem: "local" | "nuvem";
  atualizadoEm?: string;
  erro?: string;
};

const SNAPSHOT_LOCAL_SUBSTITUIDO_KEY =
  "controle-financeiro-local-substituido-pela-nuvem-v1";

function timestamp(valor: string) {
  const time = Date.parse(valor);
  return Number.isFinite(time) ? time : 0;
}

function salvarSnapshotLocalSubstituido(
  storage: Storage,
  dados: DadosFinanceirosLocais,
) {
  if (!dadosFinanceirosTemConteudo(dados)) return;

  storage.setItem(
    SNAPSHOT_LOCAL_SUBSTITUIDO_KEY,
    JSON.stringify({
      salvoEm: new Date().toISOString(),
      dados,
    }),
  );
}

function protegerDadosLocaisExistentes(storage: Storage, dados: DadosFinanceirosLocais) {
  if (
    dadosFinanceirosTemConteudo(dados) &&
    !obterDadosLocaisAtualizadosEm(storage)
  ) {
    marcarDadosLocaisAtualizados(storage);
  }
}

export async function carregarDadosFinanceirosIniciais(
  storage: Storage,
): Promise<ResultadoCargaFinanceira> {
  const dadosLocais = lerDadosFinanceirosLocais(storage);
  const localTemConteudo = dadosFinanceirosTemConteudo(dadosLocais);
  const localAtualizadoEm = obterDadosLocaisAtualizadosEm(storage);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    protegerDadosLocaisExistentes(storage, dadosLocais);
    return { dados: dadosLocais, origem: "local" };
  }

  try {
    const dadosNuvem = await carregarDadosDaNuvem();

    if (!dadosNuvem) {
      protegerDadosLocaisExistentes(storage, dadosLocais);
      return { dados: dadosLocais, origem: "local" };
    }

    const dadosRemotos = extrairDadosLocaisDaNuvem(dadosNuvem);
    const nuvemTemConteudo = dadosFinanceirosTemConteudo(dadosRemotos);
    const nuvemAtualizadaEm = dadosNuvem.atualizadoEm || "";
    const nuvemTime = timestamp(nuvemAtualizadaEm);
    const ultimoSnapshotNuvemTime = timestamp(
      obterDadosNuvemAtualizadosEm(storage),
    );
    const localTime = timestamp(localAtualizadoEm);
    const conheceSnapshotNuvem = ultimoSnapshotNuvemTime > 0;
    const nuvemMaisNova =
      conheceSnapshotNuvem && nuvemTime > ultimoSnapshotNuvemTime;
    const localFoiAlteradoDepoisDaNuvem =
      conheceSnapshotNuvem && localTime > ultimoSnapshotNuvemTime;
    const localLegadoSemHistorico =
      localTemConteudo && !conheceSnapshotNuvem && localTime === 0;
    const nuvemMaisNovaQueLocalSemSnapshot =
      localTemConteudo &&
      !conheceSnapshotNuvem &&
      localTime > 0 &&
      nuvemTime > localTime;

    if (
      nuvemTemConteudo &&
      (!localTemConteudo ||
        localLegadoSemHistorico ||
        nuvemMaisNovaQueLocalSemSnapshot ||
        (nuvemMaisNova && !localFoiAlteradoDepoisDaNuvem))
    ) {
      salvarSnapshotLocalSubstituido(storage, dadosLocais);
      salvarDadosFinanceirosLocais(storage, dadosRemotos, {
        atualizadoEmLocal: nuvemAtualizadaEm,
        atualizadoEmNuvem: nuvemAtualizadaEm,
      });

      return {
        dados: dadosRemotos,
        origem: "nuvem",
        atualizadoEm: nuvemAtualizadaEm,
      };
    }

    if (nuvemAtualizadaEm) {
      marcarDadosNuvemAtualizados(storage, nuvemAtualizadaEm);
    }

    protegerDadosLocaisExistentes(storage, dadosLocais);

    return { dados: dadosLocais, origem: "local" };
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Erro ao carregar dados da nuvem.";

    protegerDadosLocaisExistentes(storage, dadosLocais);

    return {
      dados: dadosLocais,
      origem: "local",
      erro: mensagem,
    };
  }
}
