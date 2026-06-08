"use client";

import { useEffect, useRef } from "react";
import { carregarDadosFinanceirosIniciais } from "@/lib/cloud-bootstrap";
import type {
  ResultadoCargaFinanceira,
} from "@/lib/cloud-bootstrap";
import type { DadosFinanceirosLocais } from "@/lib/dados-financeiros";

type UseCloudAutoRefreshOptions = {
  enabled: boolean;
  intervalMs?: number;
  onAtualizar: (
    dados: DadosFinanceirosLocais,
    resultado: ResultadoCargaFinanceira,
  ) => void;
  onErro?: (mensagem: string) => void;
};

const DEFAULT_INTERVAL_MS = 30000;
const MIN_INTERVAL_BETWEEN_CHECKS_MS = 5000;

export function useCloudAutoRefresh({
  enabled,
  intervalMs = DEFAULT_INTERVAL_MS,
  onAtualizar,
  onErro,
}: UseCloudAutoRefreshOptions) {
  const onAtualizarRef = useRef(onAtualizar);
  const onErroRef = useRef(onErro);

  useEffect(() => {
    onAtualizarRef.current = onAtualizar;
    onErroRef.current = onErro;
  }, [onAtualizar, onErro]);

  useEffect(() => {
    if (!enabled) return;

    let ativo = true;
    let verificando = false;
    let ultimaChecagem = 0;

    async function verificarNuvem() {
      const agora = Date.now();

      if (
        verificando ||
        agora - ultimaChecagem < MIN_INTERVAL_BETWEEN_CHECKS_MS
      ) {
        return;
      }

      verificando = true;
      ultimaChecagem = agora;

      try {
        const resultado = await carregarDadosFinanceirosIniciais(
          window.localStorage,
        );

        if (!ativo) return;

        if (resultado.origem === "nuvem") {
          onAtualizarRef.current(resultado.dados, resultado);
          return;
        }

        if (resultado.erro) {
          onErroRef.current?.(resultado.erro);
        }
      } finally {
        verificando = false;
      }
    }

    function verificarQuandoVisivel() {
      if (document.visibilityState === "visible") {
        void verificarNuvem();
      }
    }

    const timer = window.setInterval(verificarQuandoVisivel, intervalMs);

    window.addEventListener("focus", verificarQuandoVisivel);
    document.addEventListener("visibilitychange", verificarQuandoVisivel);

    return () => {
      ativo = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", verificarQuandoVisivel);
      document.removeEventListener("visibilitychange", verificarQuandoVisivel);
    };
  }, [enabled, intervalMs]);
}
