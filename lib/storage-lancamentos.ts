import {
  STORAGE_KEY,
  normalizarLancamento,
} from "@/lib/lancamentos";
import type { LancamentoPlanilha } from "@/lib/lancamentos";

type BackupLancamentos = {
  app: "controle-financeiro";
  versao: 1;
  exportadoEm: string;
  lancamentos: LancamentoPlanilha[];
};

export function lerLancamentosSalvos(storage: Storage) {
  const salvo = storage.getItem(STORAGE_KEY);

  if (!salvo) return [];

  try {
    const dados = JSON.parse(salvo);

    if (Array.isArray(dados)) {
      return dados.map(normalizarLancamento);
    }
  } catch (error) {
    console.error("Erro ao ler lancamentos salvos:", error);
  }

  return [];
}

export function salvarLancamentos(
  storage: Storage,
  lancamentos: LancamentoPlanilha[],
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(lancamentos));
}

export function montarBackupLancamentos(lancamentos: LancamentoPlanilha[]) {
  const backup: BackupLancamentos = {
    app: "controle-financeiro",
    versao: 1,
    exportadoEm: new Date().toISOString(),
    lancamentos,
  };

  return JSON.stringify(backup, null, 2);
}

export function baixarBackupLancamentos(lancamentos: LancamentoPlanilha[]) {
  const blob = new Blob([montarBackupLancamentos(lancamentos)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const hoje = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `controle-financeiro-backup-${hoje}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importarLancamentosDeBackup(conteudo: string) {
  const dados = JSON.parse(conteudo) as Partial<BackupLancamentos> | unknown[];
  const lancamentos = Array.isArray(dados)
    ? dados
    : Array.isArray(dados.lancamentos)
      ? dados.lancamentos
      : null;

  if (!lancamentos) {
    throw new Error("Arquivo de backup invalido.");
  }

  return lancamentos.map((item) =>
    normalizarLancamento(item as Partial<LancamentoPlanilha>),
  );
}
