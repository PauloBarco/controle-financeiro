/**
 * Utilitário para exibir notificações toast usando Sonner
 * 
 * @example
 * import { notificar } from "@/lib/notificacoes";
 * 
 * notificar.sucesso("Lançamento salvo!");
 * notificar.erro("Erro ao salvar");
 * notificar.info("Processando...");
 * notificar.aviso("Cuidado!");
 */

import { toast } from "sonner";

export const notificar = {
  /**
   * Mostrar notificação de sucesso (verde)
   */
  sucesso: (mensagem: string, opcoes?: { duracao?: number }) => {
    toast.success(mensagem, {
      duration: opcoes?.duracao || 3000,
    });
  },

  /**
   * Mostrar notificação de erro (vermelho)
   */
  erro: (mensagem: string, opcoes?: { duracao?: number }) => {
    toast.error(mensagem, {
      duration: opcoes?.duracao || 4000,
    });
  },

  /**
   * Mostrar notificação de informação (azul)
   */
  info: (mensagem: string, opcoes?: { duracao?: number }) => {
    toast.info(mensagem, {
      duration: opcoes?.duracao || 3000,
    });
  },

  /**
   * Mostrar notificação de aviso (amarelo)
   */
  aviso: (mensagem: string, opcoes?: { duracao?: number }) => {
    toast.warning(mensagem, {
      duration: opcoes?.duracao || 3500,
    });
  },

  /**
   * Mostrar notificação customizada
   */
  custom: (
    conteudo: React.ReactNode,
    opcoes?: { duracao?: number; tipo?: "default" | "success" | "error" | "info" | "warning" }
  ) => {
    toast.custom(conteudo, {
      duration: opcoes?.duracao || 4000,
    });
  },

  /**
   * Promessa em progresso com transformação ao finalizar
   */
  promessa: <T,>(
    promessa: Promise<T>,
    mensagens: {
      carregando: string;
      sucesso: string;
      erro: string;
    }
  ) => {
    return toast.promise(promessa, {
      loading: mensagens.carregando,
      success: mensagens.sucesso,
      error: mensagens.erro,
    });
  },
};
