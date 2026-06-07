import {
  criarId,
  lerValor,
} from "@/lib/lancamentos";
import { marcarDadosLocaisAtualizados } from "@/lib/sync-metadata";
import type {
  LancamentoPlanilha,
  StatusLancamento,
  TipoLancamento,
} from "@/lib/lancamentos";

export type LancamentoRecorrente = {
  id: string;
  tipo: TipoLancamento;
  dia: string;
  descricao: string;
  categoria: string;
  conta: string;
  formaPagamento: string;
  valor: string;
  status: StatusLancamento;
  observacao: string;
  ativo: boolean;
};

export type MetaCategoria = {
  id: string;
  categoria: string;
  limite: string;
};

export type StatusFechamentoMes = "aberto" | "revisado" | "fechado";

export type FechamentoMes = {
  mes: string;
  status: StatusFechamentoMes;
  atualizadoEm: string;
};

export const RECORRENCIAS_KEY = "controle-financeiro-recorrencias-v1";
export const METAS_CATEGORIA_KEY = "controle-financeiro-metas-categorias-v1";
export const FECHAMENTOS_MES_KEY = "controle-financeiro-fechamentos-mes-v1";

export function obterChaveMes(data: string) {
  return data.slice(0, 7);
}

export function montarDataNoMes(mesInicio: string, dia: string) {
  const [anoTexto, mesTexto] = mesInicio.split("-");
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const diaNumerico = Math.max(1, Math.min(Number(dia) || 1, ultimoDia));

  return `${anoTexto}-${mesTexto}-${String(diaNumerico).padStart(2, "0")}`;
}

export function normalizarRecorrencia(
  item: Partial<LancamentoRecorrente>,
): LancamentoRecorrente {
  return {
    id: item.id || criarId(),
    tipo: item.tipo === "receita" ? "receita" : "despesa",
    dia: String(item.dia || "1"),
    descricao: item.descricao || "",
    categoria: item.categoria || "",
    conta: item.conta || "",
    formaPagamento: item.formaPagamento || "",
    valor:
      item.valor === undefined || item.valor === null
        ? ""
        : String(item.valor).replace(",", "."),
    status: item.status === "pago" ? "pago" : "pendente",
    observacao: item.observacao || "",
    ativo: item.ativo !== false,
  };
}

export function normalizarMeta(item: Partial<MetaCategoria>): MetaCategoria {
  return {
    id: item.id || criarId(),
    categoria: item.categoria || "",
    limite:
      item.limite === undefined || item.limite === null
        ? ""
        : String(item.limite).replace(",", "."),
  };
}

export function normalizarFechamentos(
  dados: unknown,
): Record<string, FechamentoMes> {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return {};

  return Object.fromEntries(
    Object.entries(dados)
      .filter(([, value]) => value && typeof value === "object")
      .map(([mes, value]) => {
        const item = value as Partial<FechamentoMes>;
        const status =
          item.status === "fechado" || item.status === "revisado"
            ? item.status
            : "aberto";

        return [
          mes,
          {
            mes: item.mes || mes,
            status,
            atualizadoEm: item.atualizadoEm || "",
          },
        ];
      }),
  );
}

export function lerRecorrenciasSalvas(storage: Storage) {
  const salvo = storage.getItem(RECORRENCIAS_KEY);

  if (!salvo) return [];

  try {
    const dados = JSON.parse(salvo);

    if (Array.isArray(dados)) {
      return dados.map(normalizarRecorrencia);
    }
  } catch (error) {
    console.error("Erro ao ler recorrencias:", error);
  }

  return [];
}

export function salvarRecorrencias(
  storage: Storage,
  recorrencias: LancamentoRecorrente[],
) {
  storage.setItem(RECORRENCIAS_KEY, JSON.stringify(recorrencias));
  marcarDadosLocaisAtualizados(storage);
}

export function lerMetasSalvas(storage: Storage) {
  const salvo = storage.getItem(METAS_CATEGORIA_KEY);

  if (!salvo) return [];

  try {
    const dados = JSON.parse(salvo);

    if (Array.isArray(dados)) {
      return dados.map(normalizarMeta).filter((meta) => meta.categoria);
    }
  } catch (error) {
    console.error("Erro ao ler metas:", error);
  }

  return [];
}

export function salvarMetas(storage: Storage, metas: MetaCategoria[]) {
  storage.setItem(METAS_CATEGORIA_KEY, JSON.stringify(metas));
  marcarDadosLocaisAtualizados(storage);
}

export function lerFechamentosSalvos(storage: Storage) {
  const salvo = storage.getItem(FECHAMENTOS_MES_KEY);

  if (!salvo) return {};

  try {
    const dados = JSON.parse(salvo);

    if (dados && typeof dados === "object" && !Array.isArray(dados)) {
      return normalizarFechamentos(dados);
    }
  } catch (error) {
    console.error("Erro ao ler fechamentos:", error);
  }

  return {};
}

export function salvarFechamentos(
  storage: Storage,
  fechamentos: Record<string, FechamentoMes>,
) {
  storage.setItem(FECHAMENTOS_MES_KEY, JSON.stringify(fechamentos));
  marcarDadosLocaisAtualizados(storage);
}

export function criarLancamentoDeRecorrencia(
  recorrencia: LancamentoRecorrente,
  mesInicio: string,
): LancamentoPlanilha {
  const mesReferencia = obterChaveMes(mesInicio);

  return {
    id: criarId(),
    data: montarDataNoMes(mesInicio, recorrencia.dia),
    tipo: recorrencia.tipo,
    descricao: recorrencia.descricao,
    categoria: recorrencia.categoria,
    conta: recorrencia.conta,
    formaPagamento: recorrencia.formaPagamento,
    valor: String(lerValor(recorrencia.valor)),
    status: recorrencia.tipo === "receita" ? "pago" : recorrencia.status,
    observacao: recorrencia.observacao,
    recorrenciaId: recorrencia.id,
    mesReferencia,
  };
}
