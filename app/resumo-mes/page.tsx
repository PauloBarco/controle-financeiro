"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppShell from "@/components/AppShell";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  getCurrentFullMonthRange,
} from "@/lib/format";

type TipoLancamento = "receita" | "despesa";
type StatusLancamento = "pago" | "pendente";
type FiltroContas = "todas" | "pendentes" | "pagas";

type Comprovante = {
  nome: string;
  tipo: string;
  dataUrl: string;
};

type LancamentoPlanilha = {
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
};

type NovoGastoForm = {
  data: string;
  descricao: string;
  categoria: string;
  conta: string;
  formaPagamento: string;
  valor: string;
  status: StatusLancamento;
  observacao: string;
};

const STORAGE_KEY = "controle-financeiro-domestico-v1";

const categoriasDespesa = [
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

const contasSugeridas = [
  "Conta corrente",
  "Cartao de credito",
  "Dinheiro",
  "Pix",
  "Poupanca",
];

const formasPagamento = [
  "Pix",
  "Cartao de debito",
  "Cartao de credito",
  "Dinheiro",
  "Boleto",
  "Transferencia",
];

function criarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function inferirFormaPagamento(conta?: string) {
  const texto = (conta || "").toLowerCase();

  if (texto.includes("credito")) return "Cartao de credito";
  if (texto.includes("debito")) return "Cartao de debito";
  if (texto.includes("pix")) return "Pix";
  if (texto.includes("dinheiro")) return "Dinheiro";

  return "";
}

function normalizarComprovante(comprovante: unknown): Comprovante | undefined {
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

function normalizarLancamento(item: Partial<LancamentoPlanilha>): LancamentoPlanilha {
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
  };
}

function lerValor(valor: string) {
  const numero = Number(String(valor).replace(",", "."));

  return Number.isFinite(numero) ? numero : 0;
}

function montarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function criarFormularioInicial(): NovoGastoForm {
  return {
    data: formatDateInput(new Date()),
    descricao: "",
    categoria: "",
    conta: "",
    formaPagamento: "",
    valor: "",
    status: "pendente",
    observacao: "",
  };
}

type ResumoCardProps = {
  titulo: string;
  valor: number | string;
  tom: "neutro" | "despesa" | "pago" | "pendente";
};

function ResumoCard({ titulo, valor, tom }: ResumoCardProps) {
  const cor =
    tom === "pago"
      ? "text-[#15803d]"
      : tom === "pendente" || tom === "despesa"
        ? "text-[#b91c1c]"
        : "text-[#111827]";

  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-[#64748b]">
        {titulo}
      </p>
      <strong className={`mt-2 block text-2xl font-semibold ${cor}`}>
        {typeof valor === "number" ? formatCurrency(valor) : valor}
      </strong>
    </div>
  );
}

type ContaMesItemProps = {
  lancamento: LancamentoPlanilha;
  onSalvarComprovante: (comprovante: Comprovante) => void;
  onRemoverComprovante: () => void;
  onAlterarStatus: (status: StatusLancamento) => void;
};

function ContaMesItem({
  lancamento,
  onSalvarComprovante,
  onRemoverComprovante,
  onAlterarStatus,
}: ContaMesItemProps) {
  const [anexando, setAnexando] = useState(false);

  async function handleFileChange(file?: File) {
    if (!file) return;

    setAnexando(true);

    try {
      const dataUrl = await montarDataUrl(file);

      onSalvarComprovante({
        nome: file.name,
        tipo: file.type,
        dataUrl,
      });
    } catch (error) {
      console.error("Erro ao anexar comprovante:", error);
      alert("Nao foi possivel anexar este comprovante.");
    } finally {
      setAnexando(false);
    }
  }

  const pago = lancamento.status === "pago";

  return (
    <div className="px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">
              {lancamento.descricao || "(sem descricao)"}
            </h3>
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                pago
                  ? "bg-[#dcfce7] text-[#166534]"
                  : "bg-[#fee2e2] text-[#991b1b]"
              }`}
            >
              {pago ? "Pago" : "Pendente"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
            <span>{formatDate(lancamento.data)}</span>
            <span>{lancamento.categoria || "Sem categoria"}</span>
            <span>{lancamento.conta || "Sem conta"}</span>
            <span>{lancamento.formaPagamento || "Sem forma de pagamento"}</span>
          </div>

          {lancamento.observacao ? (
            <p className="mt-2 text-xs text-[#64748b]">{lancamento.observacao}</p>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="text-base font-semibold text-[#b91c1c]">
            {formatCurrency(lerValor(lancamento.valor))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAlterarStatus(pago ? "pendente" : "pago")}
              className={`h-9 rounded-md px-3 text-xs font-semibold text-white transition ${
                pago
                  ? "bg-[#64748b] hover:bg-[#475569]"
                  : "bg-[#16a34a] hover:bg-[#15803d]"
              }`}
            >
              {pago ? "Voltar para pendente" : "Marcar como pago"}
            </button>

            <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-[#cbd5e1] px-3 text-xs font-semibold text-[#334155] transition hover:border-[#64748b]">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={anexando}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  void handleFileChange(file);
                }}
              />
              {anexando
                ? "Anexando..."
                : lancamento.comprovante
                  ? "Trocar comprovante"
                  : "Anexar comprovante"}
            </label>
          </div>
        </div>
      </div>

      {lancamento.comprovante ? (
        <div className="mt-4 rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#334155]">
                {lancamento.comprovante.nome}
              </p>
              <p className="mt-1 text-xs text-[#64748b]">Comprovante anexado</p>
            </div>

            <button
              type="button"
              onClick={onRemoverComprovante}
              className="h-8 rounded-md border border-[#fecaca] px-3 text-xs font-semibold text-[#b91c1c] transition hover:border-[#ef4444]"
            >
              Remover
            </button>
          </div>

          {lancamento.comprovante.tipo.startsWith("image/") ? (
            <Image
              src={lancamento.comprovante.dataUrl}
              alt="Comprovante"
              width={560}
              height={320}
              className="mt-3 max-h-56 w-full rounded-md border border-[#e2e8f0] bg-white object-contain"
              unoptimized
            />
          ) : (
            <a
              href={lancamento.comprovante.dataUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-9 items-center rounded-md bg-white px-3 text-xs font-semibold text-[#2563eb] ring-1 ring-[#cbd5e1] hover:bg-[#f8fafc]"
            >
              Visualizar comprovante
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

type ListaContasProps = {
  titulo: string;
  descricao: string;
  vazio: string;
  contas: LancamentoPlanilha[];
  onSalvarComprovante: (id: string, comprovante: Comprovante) => void;
  onRemoverComprovante: (id: string) => void;
  onAlterarStatus: (id: string, status: StatusLancamento) => void;
};

function ListaContas({
  titulo,
  descricao,
  vazio,
  contas,
  onSalvarComprovante,
  onRemoverComprovante,
  onAlterarStatus,
}: ListaContasProps) {
  return (
    <section className="rounded-lg border border-[#d8dee8] bg-white">
      <div className="border-b border-[#e2e8f0] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{titulo}</h2>
            <p className="mt-1 text-sm text-[#64748b]">{descricao}</p>
          </div>
          <span className="rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#334155]">
            {contas.length} itens
          </span>
        </div>
      </div>

      <div className="divide-y divide-[#eef2f7]">
        {contas.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[#64748b]">{vazio}</div>
        ) : (
          contas.map((lancamento) => (
            <ContaMesItem
              key={lancamento.id}
              lancamento={lancamento}
              onSalvarComprovante={(comprovante) =>
                onSalvarComprovante(lancamento.id, comprovante)
              }
              onRemoverComprovante={() => onRemoverComprovante(lancamento.id)}
              onAlterarStatus={(status) => onAlterarStatus(lancamento.id, status)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function ResumoMesPage() {
  const rangeInicial = useMemo(() => getCurrentFullMonthRange(), []);
  const [lancamentos, setLancamentos] = useState<LancamentoPlanilha[]>([]);
  const [filtroContas, setFiltroContas] = useState<FiltroContas>("todas");
  const [form, setForm] = useState<NovoGastoForm>(() => criarFormularioInicial());
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const salvo = window.localStorage.getItem(STORAGE_KEY);

      if (salvo) {
        try {
          const dados = JSON.parse(salvo);

          if (Array.isArray(dados)) {
            setLancamentos(dados.map(normalizarLancamento));
          }
        } catch (error) {
          console.error("Erro ao carregar lancamentos:", error);
        }
      }

      setCarregado(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function persistir(next: LancamentoPlanilha[]) {
    setLancamentos(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const lancamentosMes = useMemo(() => {
    return lancamentos
      .filter(
        (lancamento) =>
          lancamento.data >= rangeInicial.start &&
          lancamento.data <= rangeInicial.end,
      )
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [lancamentos, rangeInicial.end, rangeInicial.start]);

  const contasMes = useMemo(
    () => lancamentosMes.filter((lancamento) => lancamento.tipo === "despesa"),
    [lancamentosMes],
  );

  const contasPendentes = useMemo(
    () => contasMes.filter((lancamento) => lancamento.status === "pendente"),
    [contasMes],
  );

  const contasPagas = useMemo(
    () => contasMes.filter((lancamento) => lancamento.status === "pago"),
    [contasMes],
  );

  const totais = useMemo(() => {
    return contasMes.reduce(
      (acc, lancamento) => {
        const valor = lerValor(lancamento.valor);

        acc.gastos += valor;

        if (lancamento.status === "pendente") {
          acc.pendente += valor;
        } else {
          acc.pago += valor;
        }

        if (lancamento.comprovante) {
          acc.comprovantes += 1;
        }

        return acc;
      },
      {
        gastos: 0,
        pendente: 0,
        pago: 0,
        comprovantes: 0,
      },
    );
  }, [contasMes]);

  const gastosPorPagamento = useMemo(() => {
    const mapa = new Map<string, number>();

    contasMes.forEach((lancamento) => {
      const forma = lancamento.formaPagamento || "Nao informado";
      mapa.set(forma, (mapa.get(forma) || 0) + lerValor(lancamento.valor));
    });

    return Array.from(mapa.entries())
      .map(([forma, total]) => ({ forma, total }))
      .sort((a, b) => b.total - a.total);
  }, [contasMes]);

  function atualizarCampo(campo: keyof NovoGastoForm, valor: string) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function adicionarGasto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.descricao.trim() && !form.valor.trim()) {
      alert("Informe pelo menos a descricao ou o valor do gasto.");
      return;
    }

    const novoLancamento: LancamentoPlanilha = {
      id: criarId(),
      data: form.data || formatDateInput(new Date()),
      tipo: "despesa",
      descricao: form.descricao.trim(),
      categoria: form.categoria.trim(),
      conta: form.conta.trim(),
      formaPagamento: form.formaPagamento,
      valor: form.valor.replace(",", "."),
      status: form.status,
      observacao: form.observacao.trim(),
    };

    persistir([novoLancamento, ...lancamentos]);
    setForm((atual) => ({
      ...criarFormularioInicial(),
      data: atual.data,
      status: "pendente",
    }));
  }

  function salvarComprovante(id: string, comprovante: Comprovante) {
    persistir(
      lancamentos.map((lancamento) =>
        lancamento.id === id ? { ...lancamento, comprovante } : lancamento,
      ),
    );
  }

  function removerComprovante(id: string) {
    persistir(
      lancamentos.map((lancamento) => {
        if (lancamento.id !== id) return lancamento;

        return {
          ...lancamento,
          comprovante: undefined,
        };
      }),
    );
  }

  function alterarStatus(id: string, status: StatusLancamento) {
    persistir(
      lancamentos.map((lancamento) =>
        lancamento.id === id ? { ...lancamento, status } : lancamento,
      ),
    );
  }

  const mostrarPendentes = filtroContas === "todas" || filtroContas === "pendentes";
  const mostrarPagas = filtroContas === "todas" || filtroContas === "pagas";

  return (
    <AppShell
      title="Resumo do mes"
      subtitle={`${formatDate(rangeInicial.start)} - ${formatDate(
        rangeInicial.end,
      )} com contas a pagar, pagas e comprovantes`}
    >
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard titulo="A pagar" valor={totais.pendente} tom="pendente" />
          <ResumoCard titulo="Ja pagas" valor={totais.pago} tom="pago" />
          <ResumoCard titulo="Gastos do mes" valor={totais.gastos} tom="despesa" />
          <ResumoCard
            titulo="Com comprovante"
            valor={`${totais.comprovantes}/${contasMes.length}`}
            tom="neutro"
          />
        </section>

        <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold">Visao das contas do mes</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                {carregado
                  ? `${contasMes.length} contas encontradas no periodo`
                  : "Carregando contas salvas..."}
              </p>
            </div>

            <div className="inline-flex w-full rounded-md border border-[#cbd5e1] bg-[#f8fafc] p-1 sm:w-auto">
              {[
                { value: "todas", label: "Todas" },
                { value: "pendentes", label: "A pagar" },
                { value: "pagas", label: "Pagas" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFiltroContas(item.value as FiltroContas)}
                  className={`h-9 flex-1 rounded-md px-3 text-sm font-semibold transition sm:flex-none ${
                    filtroContas === item.value
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#64748b] hover:text-[#111827]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Adicionar gasto do mes</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Cadastre uma conta, compra ou pagamento avulso direto neste resumo.
            </p>
          </div>

          <form
            onSubmit={adicionarGasto}
            className="grid gap-3 lg:grid-cols-[0.9fr_1.5fr_1fr_1fr_1fr_0.9fr_0.9fr] lg:items-end"
          >
            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Data
              <input
                type="date"
                value={form.data}
                onChange={(event) => atualizarCampo("data", event.target.value)}
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Gasto
              <input
                value={form.descricao}
                onChange={(event) => atualizarCampo("descricao", event.target.value)}
                placeholder="Ex.: compra do mercado"
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Categoria
              <input
                list="categorias-despesa-resumo"
                value={form.categoria}
                onChange={(event) => atualizarCampo("categoria", event.target.value)}
                placeholder="Ex.: Mercado"
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Conta
              <input
                list="contas-sugeridas-resumo"
                value={form.conta}
                onChange={(event) => atualizarCampo("conta", event.target.value)}
                placeholder="Ex.: Banco"
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Pagamento
              <select
                value={form.formaPagamento}
                onChange={(event) => atualizarCampo("formaPagamento", event.target.value)}
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="">Selecione</option>
                {formasPagamento.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Valor
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={(event) => atualizarCampo("valor", event.target.value)}
                placeholder="0,00"
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155]">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  atualizarCampo("status", event.target.value as StatusLancamento)
                }
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-[#334155] lg:col-span-6">
              Observacao
              <input
                value={form.observacao}
                onChange={(event) => atualizarCampo("observacao", event.target.value)}
                placeholder="Opcional"
                className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <button
              type="submit"
              className="h-10 rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d]"
            >
              Adicionar
            </button>
          </form>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            {mostrarPendentes ? (
              <ListaContas
                titulo="Contas a pagar"
                descricao="Despesas pendentes dentro do mes atual"
                vazio="Nenhuma conta pendente neste mes."
                contas={contasPendentes}
                onSalvarComprovante={salvarComprovante}
                onRemoverComprovante={removerComprovante}
                onAlterarStatus={alterarStatus}
              />
            ) : null}

            {mostrarPagas ? (
              <ListaContas
                titulo="Contas pagas"
                descricao="Despesas ja marcadas como pagas"
                vazio="Nenhuma conta paga neste mes."
                contas={contasPagas}
                onSalvarComprovante={salvarComprovante}
                onRemoverComprovante={removerComprovante}
                onAlterarStatus={alterarStatus}
              />
            ) : null}
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
              <h2 className="text-base font-semibold">Gastos por pagamento</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Debito, credito, Pix e outras formas usadas no mes.
              </p>

              <div className="mt-4 space-y-4">
                {gastosPorPagamento.length === 0 ? (
                  <p className="text-sm text-[#64748b]">Sem gastos no mes.</p>
                ) : (
                  gastosPorPagamento.map((item) => (
                    <div key={item.forma}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold">{item.forma}</p>
                        <span className="shrink-0 text-sm font-semibold text-[#b91c1c]">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[#e2e8f0]">
                        <div
                          className="h-2 rounded-full bg-[#2563eb]"
                          style={{
                            width: `${
                              totais.gastos > 0 ? (item.total / totais.gastos) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
              <h2 className="text-base font-semibold">Fechamento rapido</h2>

              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#64748b]">Contas do mes</dt>
                  <dd className="font-semibold">{contasMes.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#64748b]">Pendentes</dt>
                  <dd className="font-semibold text-[#b91c1c]">{contasPendentes.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#64748b]">Pagas</dt>
                  <dd className="font-semibold text-[#15803d]">{contasPagas.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#64748b]">Periodo</dt>
                  <dd className="font-semibold">
                    {formatDate(rangeInicial.start)} - {formatDate(rangeInicial.end)}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </section>
      </div>

      <datalist id="categorias-despesa-resumo">
        {categoriasDespesa.map((categoria) => (
          <option key={categoria} value={categoria} />
        ))}
      </datalist>
      <datalist id="contas-sugeridas-resumo">
        {contasSugeridas.map((conta) => (
          <option key={conta} value={conta} />
        ))}
      </datalist>
    </AppShell>
  );
}
