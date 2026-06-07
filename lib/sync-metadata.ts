const LOCAL_UPDATED_AT_KEY = "controle-financeiro-local-atualizado-em-v1";
const CLOUD_UPDATED_AT_KEY = "controle-financeiro-nuvem-atualizado-em-v1";

export function obterDadosLocaisAtualizadosEm(storage: Storage) {
  return storage.getItem(LOCAL_UPDATED_AT_KEY) || "";
}

export function obterDadosNuvemAtualizadosEm(storage: Storage) {
  return storage.getItem(CLOUD_UPDATED_AT_KEY) || "";
}

export function marcarDadosLocaisAtualizados(
  storage: Storage,
  atualizadoEm = new Date().toISOString(),
) {
  storage.setItem(LOCAL_UPDATED_AT_KEY, atualizadoEm);
}

export function marcarDadosNuvemAtualizados(
  storage: Storage,
  atualizadoEm = new Date().toISOString(),
) {
  storage.setItem(CLOUD_UPDATED_AT_KEY, atualizadoEm);
}

