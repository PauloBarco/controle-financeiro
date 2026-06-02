import { salvarDadosNaNuvem, obterUsuarioAtual } from "@/lib/cloud-sync";
import { lerLancamentosSalvos } from "@/lib/storage-lancamentos";
import {
  lerFechamentosSalvos,
  lerMetasSalvas,
  lerRecorrenciasSalvas,
} from "@/lib/planejamento";

/**
 * Sistema de sincronização automática com a nuvem (Supabase)
 * Sincroniza dados a cada alteração, com debounce para evitar requisições excessivas
 */

type AutoSyncConfig = {
  delayMs: number;
  debugMode: boolean;
};

const DEFAULT_CONFIG: AutoSyncConfig = {
  delayMs: 3000, // Aguarda 3 segundos após última alteração
  debugMode: false,
};

let syncTimeoutId: NodeJS.Timeout | null = null;
let isSyncing = false;
let lastSyncTime = 0;
let lastSyncHash = "";
let config = DEFAULT_CONFIG;

// Callback para notificar UI sobre status de sincronização
let syncStatusCallback: ((status: AutoSyncStatus) => void) | null = null;

export type AutoSyncStatus = {
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
  isOnline: boolean;
};

export function configureAutoSync(newConfig: Partial<AutoSyncConfig>) {
  config = { ...config, ...newConfig };
}

export function onAutoSyncStatusChange(
  callback: (status: AutoSyncStatus) => void,
) {
  syncStatusCallback = callback;
  notifySyncStatus();
}

function notifySyncStatus() {
  if (!syncStatusCallback) return;

  syncStatusCallback({
    isSyncing,
    lastSyncTime: lastSyncTime || null,
    error: null,
    isOnline: navigator.onLine,
  });
}

async function calcularHashDados(storage: Storage) {
  const lancamentos = lerLancamentosSalvos(storage);
  const recorrencias = lerRecorrenciasSalvas(storage);
  const metas = lerMetasSalvas(storage);
  const fechamentos = lerFechamentosSalvos(storage);

  const dados = JSON.stringify({
    lancamentos,
    recorrencias,
    metas,
    fechamentos,
  });

  // Simples hash para detectar mudanças
  let hash = 0;
  for (let i = 0; i < dados.length; i++) {
    const char = dados.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Converter para 32-bit integer
  }
  return String(hash);
}

function enviarNotificacao(titulo: string, opcoes?: NotificationOptions) {
  // Apenas em produção e se permissão concedida
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(titulo, {
      icon: "/icon.svg",
      ...opcoes,
    });
  }
}

export async function sincronizarAgora(storage: Storage) {
  if (isSyncing) {
    if (config.debugMode) {
      console.log("[AutoSync] Sincronização já em progresso, aguardando...");
    }
    return;
  }

  if (!navigator.onLine) {
    console.warn("[AutoSync] Offline. Sincronização será tentada quando online.");
    return;
  }

  try {
    const usuarioAtual = await obterUsuarioAtual();
    if (!usuarioAtual) {
      if (config.debugMode) {
        console.log("[AutoSync] Usuário não logado, ignorando sincronização.");
      }
      return;
    }

    // Verificar se dados realmente mudaram
    const novoHash = await calcularHashDados(storage);
    if (novoHash === lastSyncHash) {
      if (config.debugMode) {
        console.log("[AutoSync] Nenhuma mudança detectada, ignorando sincronização.");
      }
      return;
    }

    isSyncing = true;
    notifySyncStatus();

    if (config.debugMode) {
      console.log("[AutoSync] Iniciando sincronização...");
    }

    const lancamentos = lerLancamentosSalvos(storage);
    const recorrencias = lerRecorrenciasSalvas(storage);
    const metas = lerMetasSalvas(storage);
    const fechamentos = lerFechamentosSalvos(storage);

    await salvarDadosNaNuvem({
      lancamentos,
      recorrencias,
      metas,
      fechamentos,
    });

    lastSyncTime = Date.now();
    lastSyncHash = novoHash;

    if (config.debugMode) {
      console.log("[AutoSync] Sincronização concluída com sucesso!");
    }

    // Notificar usuário em background
    enviarNotificacao("Dados sincronizados na nuvem", {
      body: `${lancamentos.length} lançamentos salvos com segurança.`,
      tag: "auto-sync",
    });
  } catch (error) {
    console.error("[AutoSync] Erro ao sincronizar:", error);

    const mensagem =
      error instanceof Error ? error.message : "Erro desconhecido";

    enviarNotificacao("Erro ao sincronizar com a nuvem", {
      body: mensagem,
      tag: "auto-sync-error",
    });
  } finally {
    isSyncing = false;
    notifySyncStatus();
  }
}

/**
 * Agenda sincronização com debounce
 * Se chamado novamente antes de expirar, reseta o timer
 */
export function agendarSincronizacao(storage: Storage) {
  // Limpar timeout anterior se existir
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }

  // Agendar nova sincronização
  syncTimeoutId = setTimeout(() => {
    syncTimeoutId = null;
    void sincronizarAgora(storage);
  }, config.delayMs);

  if (config.debugMode) {
    console.log(`[AutoSync] Sincronização agendada em ${config.delayMs}ms`);
  }
}

/**
 * Cancelar sincronização agendada
 */
export function cancelarSincronizacao() {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
    if (config.debugMode) {
      console.log("[AutoSync] Sincronização cancelada");
    }
  }
}

/**
 * Obter status atual de sincronização
 */
export function obterStatusAutoSync(): AutoSyncStatus {
  return {
    isSyncing,
    lastSyncTime: lastSyncTime || null,
    error: null,
    isOnline: navigator.onLine,
  };
}

/**
 * Resetar estado da sincronização (útil em testes)
 */
export function resetarAutoSync() {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
  }
  isSyncing = false;
  lastSyncTime = 0;
  lastSyncHash = "";
  syncStatusCallback = null;
}

// Listener para conectividade de rede
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (config.debugMode) {
      console.log("[AutoSync] Reconectado à internet. Sincronizando...");
    }
    // Sincronizar quando voltar online
    const storage = window.localStorage;
    void sincronizarAgora(storage);
  });

  window.addEventListener("offline", () => {
    if (config.debugMode) {
      console.log("[AutoSync] Perdeu conexão com a internet.");
    }
  });

  // Solicitar permissão para notificações
  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }
}
