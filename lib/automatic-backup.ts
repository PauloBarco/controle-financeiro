import { getSupabaseClient } from "./supabase";
import { obterUsuarioAtual } from "./cloud-sync";
import type { LancamentoPlanilha } from "./lancamentos";

interface BackupConfig {
  delayMs?: number;
  debugMode?: boolean;
}

interface BackupStatusCallback {
  (status: {
    timestamp: string;
    success: boolean;
    message: string;
    backup_id?: string;
  }): void;
}

let backupStatusCallbacks: Set<BackupStatusCallback> = new Set();
let ultimoBackupDiario: string | null = null;
let ultimoBackupHash: string | null = null;

/**
 * Calcula hash dos lançamentos para detectar mudanças
 */
function calcularHashBackup(lancamentos: LancamentoPlanilha[]): string {
  const dados = JSON.stringify(lancamentos);
  let hash = 0;
  for (let i = 0; i < dados.length; i++) {
    const char = dados.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Converter para 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Verifica se já fez backup hoje
 */
function jafezBackupHoje(): boolean {
  if (!ultimoBackupDiario) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const ultimoBackup = new Date(ultimoBackupDiario);
  ultimoBackup.setHours(0, 0, 0, 0);

  return hoje.getTime() === ultimoBackup.getTime();
}

/**
 * Executa o backup dos lançamentos na Supabase
 */
async function executarBackupAgora(
  storage: Storage,
): Promise<{ success: boolean; message: string; backup_id?: string }> {
  const debug = (msg: string) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[AUTO-BACKUP]", msg);
    }
  };

  try {
    debug("Iniciando backup automático...");

    // 1. Verificar autenticação
    const usuario = await obterUsuarioAtual();
    if (!usuario) {
      debug("Usuário não autenticado - backup ignorado");
      return {
        success: false,
        message: "Usuário não autenticado",
      };
    }

    // 2. Verificar se já fez backup hoje
    if (jafezBackupHoje()) {
      debug("Backup diário já realizado hoje");
      return {
        success: false,
        message: "Backup diário já realizado hoje",
      };
    }

    // 3. Carregar lançamentos do localStorage
    const lancamentosJson = storage.getItem("lancamentos");
    if (!lancamentosJson) {
      debug("Nenhum lançamento para fazer backup");
      return {
        success: false,
        message: "Nenhum lançamento para fazer backup",
      };
    }

    const lancamentos: LancamentoPlanilha[] = JSON.parse(lancamentosJson);

    // 4. Calcular hash para detectar mudanças
    const hashAtual = calcularHashBackup(lancamentos);
    if (ultimoBackupHash === hashAtual) {
      debug("Dados não mudaram desde último backup");
      return {
        success: false,
        message: "Dados não mudaram desde último backup",
      };
    }

    // 5. Preparar dados do backup
    const backupData = {
      timestamp: new Date().toISOString(),
      user_id: usuario.id,
      lancamentos_count: lancamentos.length,
      backup_hash: hashAtual,
      dados: {
        lancamentos,
        backup_date: new Date().toISOString(),
        total_receitas: lancamentos
          .filter((l) => l.tipo === "receita")
          .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0),
        total_despesas: lancamentos
          .filter((l) => l.tipo === "despesa")
          .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0),
      },
    };

    // 6. Salvar na Supabase (tabela de backups)
    const supabseClient = getSupabaseClient();
    if (!supabseClient) {
      debug("Cliente Supabase não configurado");
      return {
        success: false,
        message: "Cliente Supabase não configurado",
      };
    }

    // Salvar como JSON na tabela de dados (ou criar nova tabela de backups)
    const { data, error } = await supabseClient
      .from("controle_financeiro_backups")
      .insert([
        {
          user_id: usuario.id,
          backup_date: new Date().toISOString(),
          lancamentos_count: lancamentos.length,
          dados: backupData.dados,
          backup_hash: hashAtual,
        },
      ])
      .select("id");

    if (error) {
      debug(`Erro ao salvar backup: ${error.message}`);
      throw error;
    }

    const backup_id = data?.[0]?.id;

    // 7. Atualizar estado local
    ultimoBackupDiario = new Date().toISOString();
    ultimoBackupHash = hashAtual;

    // 8. Notificar listeners
    const statusMsg = {
      timestamp: new Date().toISOString(),
      success: true,
      message: `Backup realizado: ${lancamentos.length} lançamentos`,
      backup_id,
    };

    backupStatusCallbacks.forEach((callback) => {
      try {
        callback(statusMsg);
      } catch (err) {
        console.error("Erro ao chamar callback de status:", err);
      }
    });

    debug(
      `✅ Backup bem-sucedido: ${lancamentos.length} lançamentos, ID: ${backup_id}`,
    );

    return {
      success: true,
      message: `Backup realizado: ${lancamentos.length} lançamentos`,
      backup_id,
    };
  } catch (erro) {
    const errorMsg =
      erro instanceof Error ? erro.message : "Erro desconhecido";
    console.error("[AUTO-BACKUP] Erro:", errorMsg);

    // Notificar listeners do erro
    const statusMsg = {
      timestamp: new Date().toISOString(),
      success: false,
      message: `Erro no backup: ${errorMsg}`,
    };

    backupStatusCallbacks.forEach((callback) => {
      try {
        callback(statusMsg);
      } catch (err) {
        console.error("Erro ao chamar callback de status:", err);
      }
    });

    return {
      success: false,
      message: `Erro no backup: ${errorMsg}`,
    };
  }
}

let backupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Agenda o backup automático para rodar uma vez por dia
 * Verifica a cada hora se precisa fazer backup
 */
export function agendarBackupAutomatico(storage: Storage): void {
  // Limpar timer anterior se existir
  if (backupTimer) {
    clearInterval(backupTimer);
  }

  // Executar backup imediatamente se não foi feito ainda hoje
  if (!jafezBackupHoje()) {
    executarBackupAgora(storage);
  }

  // Verificar a cada hora se precisa fazer backup (para backup diário)
  backupTimer = setInterval(() => {
    if (!jafezBackupHoje()) {
      executarBackupAgora(storage);
    }
  }, 60 * 60 * 1000); // A cada 1 hora

  // Limpar ao descarregar
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (backupTimer) {
        clearInterval(backupTimer);
        backupTimer = null;
      }
    });
  }
}

/**
 * Força um backup imediato (útil para testes ou backup manual)
 */
export async function forcarBackupAgora(
  storage: Storage,
): Promise<{ success: boolean; message: string; backup_id?: string }> {
  // Limpar estado para forçar backup mesmo se já fez hoje
  ultimoBackupDiario = null;
  ultimoBackupHash = null;

  return executarBackupAgora(storage);
}

/**
 * Registra um callback para receber atualizações de status de backup
 */
export function onBackupStatusChange(
  callback: BackupStatusCallback,
): () => void {
  backupStatusCallbacks.add(callback);

  // Retornar função para desinscrever
  return () => {
    backupStatusCallbacks.delete(callback);
  };
}

/**
 * Obter estado do backup
 */
export function obterStatusBackup() {
  return {
    ultimoBackupDiario,
    jafezBackupHoje: jafezBackupHoje(),
  };
}
