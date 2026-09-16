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
  titularConta?: string;
  formaPagamento: string;
  valor: string;
  status: StatusLancamento;
  observacao: string;
  comprovante?: Comprovante;
  recorrenciaId?: string;
  mesReferencia?: string;
  parcelamentoId?: string;
  parcelaAtual?: number;
  parcelasTotal?: number;
  valorParcela?: string;
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
  "Poupanca",
  "Vale alimentacao",
  "Vale refeicao",
  "Cartao de credito",
  "Dinheiro",
  "Pix",
];

export const formasPagamento = [
  "Pix",
  "Cartao de debito",
  "Cartao de credito",
  "Dinheiro",
  "Boleto",
  "Transferencia",
];

export const FORMA_CARTAO_CREDITO = "Cartao de credito";

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

function normalizarNumeroParcela(valor: unknown) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 1) return undefined;

  return Math.floor(numero);
}

export function ehCartaoCredito(formaPagamento?: string) {
  return formaPagamento === FORMA_CARTAO_CREDITO;
}

export function adicionarMesesData(data: string, meses: number) {
  const [anoTexto, mesTexto, diaTexto] = data.split("-");
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  if (!ano || !mes || !dia) {
    return data;
  }

  const dataAlvo = new Date(ano, mes - 1 + meses, 1);
  const ultimoDia = new Date(
    dataAlvo.getFullYear(),
    dataAlvo.getMonth() + 1,
    0,
  ).getDate();

  dataAlvo.setDate(Math.min(dia, ultimoDia));

  return formatDateInput(dataAlvo);
}

export function obterRotuloParcela(
  lancamento: Pick<LancamentoPlanilha, "parcelaAtual" | "parcelasTotal">,
) {
  if (
    !lancamento.parcelaAtual ||
    !lancamento.parcelasTotal ||
    lancamento.parcelasTotal <= 1
  ) {
    return "";
  }

  return `Parcela ${lancamento.parcelaAtual}/${lancamento.parcelasTotal}`;
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
  const parcelaAtual = normalizarNumeroParcela(item.parcelaAtual);
  const parcelasTotal = normalizarNumeroParcela(item.parcelasTotal);
  const temParcela =
    parcelaAtual !== undefined &&
    parcelasTotal !== undefined &&
    parcelasTotal > 1;
  const parcelaAtualNormalizada = temParcela
    ? Math.min(parcelaAtual ?? 1, parcelasTotal ?? 1)
    : undefined;

  return {
    id: item.id || criarId(),
    data: item.data || formatDateInput(new Date()),
    tipo: item.tipo === "receita" ? "receita" : "despesa",
    descricao: item.descricao || "",
    categoria: item.categoria || "",
    conta: item.conta || "",
    titularConta: item.titularConta || "",
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
    parcelamentoId:
      temParcela && item.parcelamentoId
        ? String(item.parcelamentoId)
        : undefined,
    parcelaAtual: parcelaAtualNormalizada,
    parcelasTotal: temParcela ? parcelasTotal : undefined,
    valorParcela:
      temParcela && item.valorParcela !== undefined && item.valorParcela !== null
        ? String(item.valorParcela).replace(",", ".")
        : undefined,
  };
}

export function lerValor(valor: string) {
  const numero = Number(String(valor).replace(",", "."));

  return Number.isFinite(numero) ? numero : 0;
}
