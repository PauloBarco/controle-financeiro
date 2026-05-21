import { formatDateInput } from "@/lib/format";

export type TipoLancamento = "receita" | "despesa";
export type StatusLancamento = "pago" | "pendente";

export type Comprovante = {
  nome: string;
  tipo: string;
  dataUrl: string;
};

export type LancamentoPlanilha = {
  id: string;
  data: string;
  tipo: TipoLancamento;
  descricao: string;
  categoria: string;
  conta: string;
  formaPagamento: string;
  valor: string;
  status: StatusLancamento;
  observacao: string;
  comprovante?: Comprovante;
  recorrenciaId?: string;
  mesReferencia?: string;
};

export type CampoLancamento = keyof LancamentoPlanilha;

export const STORAGE_KEY = "controle-financeiro-domestico-v1";

export const categoriasDespesa = [
  "Mercado",
  "Moradia",
  "Transporte",
  "Saude",
  "Educacao",
  "Lazer",
  "Cartao",
  "Conta fixa",
  "Outros",
];

export const categoriasReceita = [
  "Salario",
  "Freelance",
  "Rendimento",
  "Reembolso",
  "Outros",
];

export const contasSugeridas = [
  "Conta corrente",
  "Cartao de credito",
  "Dinheiro",
  "Pix",
  "Poupanca",
];

export const formasPagamento = [
  "Pix",
  "Cartao de debito",
  "Cartao de credito",
  "Dinheiro",
  "Boleto",
  "Transferencia",
];

export function criarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function inferirFormaPagamento(conta?: string) {
  const texto = (conta || "").toLowerCase();

  if (texto.includes("credito")) return "Cartao de credito";
  if (texto.includes("debito")) return "Cartao de debito";
  if (texto.includes("pix")) return "Pix";
  if (texto.includes("dinheiro")) return "Dinheiro";

  return "";
}

export function normalizarComprovante(
  comprovante: unknown,
): Comprovante | undefined {
  if (!comprovante || typeof comprovante !== "object") return undefined;

  const item = comprovante as Partial<Comprovante>;
  const dataUrl = String(item.dataUrl || "");

  if (!dataUrl) return undefined;

  return {
    nome: String(item.nome || "comprovante"),
    tipo: String(item.tipo || ""),
    dataUrl,
  };
}

export function normalizarLancamento(
  item: Partial<LancamentoPlanilha>,
): LancamentoPlanilha {
  return {
    id: item.id || criarId(),
    data: item.data || formatDateInput(new Date()),
    tipo: item.tipo === "receita" ? "receita" : "despesa",
    descricao: item.descricao || "",
    categoria: item.categoria || "",
    conta: item.conta || "",
    formaPagamento: item.formaPagamento || inferirFormaPagamento(item.conta),
    valor:
      item.valor === undefined || item.valor === null
        ? ""
        : String(item.valor).replace(",", "."),
    status: item.status === "pendente" ? "pendente" : "pago",
    observacao: item.observacao || "",
    comprovante: normalizarComprovante(item.comprovante),
    recorrenciaId: item.recorrenciaId ? String(item.recorrenciaId) : undefined,
    mesReferencia: item.mesReferencia ? String(item.mesReferencia) : undefined,
  };
}

export function lerValor(valor: string) {
  const numero = Number(String(valor).replace(",", "."));

  return Number.isFinite(numero) ? numero : 0;
}
