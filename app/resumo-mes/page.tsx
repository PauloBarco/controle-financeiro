"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import AppShell from "@/components/AppShell";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  getCurrentMonthRange,
} from "@/lib/format";

type TipoLancamento = "receita" | "despesa";
type StatusLancamento = "pago" | "pendente";

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
  valor: string;
  status: StatusLancamento;
  observacao: string;
  comprovante?: Comprovante;
};

const STORAGE_KEY = "controle-financeiro-domestico-v1";

function lerValor(valor: string) {
  const numero = Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarLancamento(
  item: Partial<LancamentoPlanilha>,
): LancamentoPlanilha {
  const id =
    item.id ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  return {
    id,
    data: item.data || formatDateInput(new Date()),
    tipo: item.tipo === "receita" ? "receita" : "despesa",
    descricao: item.descricao || "",
    categoria: item.categoria || "",
    conta: item.conta || "",
    valor:
      item.valor === undefined || item.valor === null
        ? ""
        : String(item.valor).replace(",", "."),
    status: item.status === "pendente" ? "pendente" : "pago",
    observacao: item.observacao || "",
    comprovante:
      item.comprovante && typeof item.comprovante === "object"
        ? {
            nome: String(
              (item.comprovante as { nome?: unknown }).nome ?? "",
            ),
            tipo: String(
              (item.comprovante as { tipo?: unknown }).tipo ?? "",
            ),
            dataUrl: String(
              (item.comprovante as { dataUrl?: unknown }).dataUrl ?? "",
            ),
          }
        : undefined,
  };
}

function montarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(new Error("Falha ao ler arquivo"));

    reader.onload = () =>
      resolve(String(reader.result));

    reader.readAsDataURL(file);
  });
}

type ResumoCardProps = {
  titulo: string;
  valor: number;
  tom: "receita" | "despesa" | "saldo" | "pendente";
};

function ResumoCard({
  titulo,
  valor,
  tom,
}: ResumoCardProps) {
  const destaque =
    tom === "receita"
      ? "text-[#15803d]"
      : tom === "despesa" || tom === "pendente"
        ? "text-[#b91c1c]"
        : valor >= 0
          ? "text-[#15803d]"
          : "text-[#b91c1c]";

  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-[#64748b]">
        {titulo}
      </p>

      <strong
        className={`mt-2 block text-2xl font-semibold ${destaque}`}
      >
        {formatCurrency(valor)}
      </strong>
    </div>
  );
}

type ComprovanteDespesaItemProps = {
  lancamento: LancamentoPlanilha;
  onMarcarPago: (comprovante?: Comprovante) => void;
};

function ComprovanteDespesaItem({
  lancamento,
  onMarcarPago,
}: ComprovanteDespesaItemProps) {
  const [anexando, setAnexando] = useState(false);

  const [comprovanteLocal, setComprovanteLocal] =
    useState<Comprovante | undefined>(
      lancamento.comprovante,
    );

  async function handleFileChange(file?: File) {
    if (!file) return;

    setAnexando(true);

    try {
      const dataUrl = await montarDataUrl(file);

      setComprovanteLocal({
        nome: file.name,
        tipo: file.type,
        dataUrl,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setAnexando(false);
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[240px]">
          <div className="text-sm font-semibold">
            {lancamento.descricao || "(sem descrição)"}
          </div>

          <div className="text-xs text-[#64748b]">
            {lancamento.data
              ? formatDate(lancamento.data)
              : ""}
            {" • "}
            {lancamento.categoria || "Sem categoria"}
            {" • "}
            {lancamento.conta || ""}
          </div>

          {lancamento.observacao ? (
            <div className="mt-1 text-xs text-[#64748b]">
              {lancamento.observacao}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-sm font-semibold text-[#b91c1c]">
            {formatCurrency(
              lerValor(lancamento.valor),
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              onMarcarPago(comprovanteLocal)
            }
            className="h-8 rounded-md bg-[#16a34a] px-3 text-xs font-semibold text-white transition hover:bg-[#15803d] disabled:opacity-60"
          >
            Marcar como pago
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#cbd5e1] px-3 py-1 text-xs font-semibold text-[#334155] transition hover:border-[#64748b]">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={anexando}
              onChange={(e) =>
                handleFileChange(
                  e.target.files?.[0],
                )
              }
            />

            {anexando
              ? "Lendo..."
              : comprovanteLocal
                ? "Trocar comprovante"
                : "Anexar comprovante"}
          </label>

          {comprovanteLocal ? (
            <div className="w-full max-w-[320px]">
              {comprovanteLocal.tipo.startsWith(
                "image/",
              ) ? (
                <Image
                  src={comprovanteLocal.dataUrl}
                  alt="Comprovante"
                  width={400}
                  height={300}
                  className="mt-2 max-h-40 w-full rounded-md border border-[#e2e8f0] object-contain"
                  unoptimized
                />
              ) : (
                <a
                  href={comprovanteLocal.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#2563eb] ring-1 ring-[#cbd5e1] hover:bg-[#f8fafc]"
                >
                  Visualizar comprovante (PDF)
                </a>
              )}

              <div className="mt-1 truncate text-[11px] text-[#64748b]">
                {comprovanteLocal.nome}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ResumoMesPage() {
  const rangeInicial = useMemo(
    () => getCurrentMonthRange(),
    [],
  );

  const { start, end } = rangeInicial;

  const [lancamentos, setLancamentos] = useState<
    LancamentoPlanilha[]
  >([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const salvo =
      window.localStorage.getItem(STORAGE_KEY);

    if (!salvo) return;

    try {
      const dados = JSON.parse(salvo);

      if (Array.isArray(dados)) {
        setLancamentos(
          dados.map(normalizarLancamento),
        );
      }
    } catch (error) {
      console.error(
        "Erro ao carregar lançamentos:",
        error,
      );
    }
  }, []);

  function persistir(next: LancamentoPlanilha[]) {
    setLancamentos(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next),
      );
    }
  }

  const lancamentosMes = useMemo(() => {
    return lancamentos
      .filter(
        (l) => l.data >= start && l.data <= end,
      )
      .sort((a, b) =>
        b.data.localeCompare(a.data),
      );
  }, [end, lancamentos, start]);

  const receitasMes = useMemo(
    () =>
      lancamentosMes.filter(
        (l) => l.tipo === "receita",
      ),
    [lancamentosMes],
  );

  const despesasMesPendentes = useMemo(
    () =>
      lancamentosMes.filter(
        (l) =>
          l.tipo === "despesa" &&
          l.status === "pendente",
      ),
    [lancamentosMes],
  );

  const despesasMesPagas = useMemo(
    () =>
      lancamentosMes.filter(
        (l) =>
          l.tipo === "despesa" &&
          l.status === "pago",
      ),
    [lancamentosMes],
  );

  const totais = useMemo(() => {
    return lancamentosMes.reduce(
      (acc, l) => {
        const v = lerValor(l.valor);

        if (l.tipo === "receita") {
          acc.receitas += v;
          acc.saldo += v;
        } else {
          acc.despesas += v;

          if (l.status === "pendente") {
            acc.pendente += v;
          }

          acc.saldo -= v;
        }

        return acc;
      },
      {
        receitas: 0,
        despesas: 0,
        pendente: 0,
        saldo: 0,
      },
    );
  }, [lancamentosMes]);

  function onMarcarPago(
    id: string,
    comprovante?: Comprovante,
  ) {
    const next = lancamentos.map((l) => {
      if (l.id !== id) return l;

      return {
        ...l,
        status: "pago" as const,
        comprovante:
          comprovante || l.comprovante,
      };
    });

    persistir(next);
  }

  return (
    <AppShell
      title="Resumo do mês"
      subtitle={`${formatDate(start)} - ${formatDate(
        end,
      )} (receitas + contas a pagar)`}
    >
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ResumoCard
            titulo="Receitas"
            valor={totais.receitas}
            tom="receita"
          />

          <ResumoCard
            titulo="Despesas"
            valor={totais.despesas}
            tom="despesa"
          />

          <ResumoCard
            titulo="Saldo"
            valor={totais.saldo}
            tom="saldo"
          />

          <ResumoCard
            titulo="A pagar"
            valor={totais.pendente}
            tom="pendente"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <section className="rounded-lg border border-[#d8dee8] bg-white">
              <div className="border-b border-[#e2e8f0] px-4 py-4">
                <h2 className="text-base font-semibold">
                  Receitas do mês
                </h2>

                <p className="mt-1 text-sm text-[#64748b]">
                  {receitasMes.length === 0
                    ? "Nenhuma receita"
                    : `${receitasMes.length} itens`}
                </p>
              </div>

              <div className="divide-y divide-[#eef2f7]">
                {receitasMes.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-[#64748b]">
                    Nenhuma receita no mês.
                  </div>
                ) : (
                  receitasMes.map((l) => (
                    <div
                      key={l.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-[220px]">
                        <div className="text-sm font-semibold">
                          {l.descricao ||
                            "(sem descrição)"}
                        </div>

                        <div className="text-xs text-[#64748b]">
                          {l.data
                            ? formatDate(l.data)
                            : ""}
                          {" • "}
                          {l.categoria ||
                            "Sem categoria"}
                          {" • "}
                          {l.conta || ""}
                        </div>
                      </div>

                      <div className="text-sm font-semibold text-[#15803d]">
                        {formatCurrency(
                          lerValor(l.valor),
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#d8dee8] bg-white">
              <div className="border-b border-[#e2e8f0] px-4 py-4">
                <h2 className="text-base font-semibold">
                  Contas a pagar
                </h2>

                <p className="mt-1 text-sm text-[#64748b]">
                  Despesas pendentes no mês
                </p>
              </div>

              <div className="divide-y divide-[#eef2f7]">
                {despesasMesPendentes.length ===
                0 ? (
                  <div className="px-4 py-6 text-sm text-[#64748b]">
                    Nenhuma despesa pendente no
                    mês.
                  </div>
                ) : (
                  despesasMesPendentes.map(
                    (l) => (
                      <ComprovanteDespesaItem
                        key={l.id}
                        lancamento={l}
                        onMarcarPago={(
                          comprovante,
                        ) =>
                          onMarcarPago(
                            l.id,
                            comprovante,
                          )
                        }
                      />
                    ),
                  )
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
              <h2 className="text-base font-semibold">
                Pagas no mês
              </h2>

              <p className="mt-1 text-sm text-[#64748b]">
                Despesas marcadas como pagas
              </p>

              <div className="mt-4 space-y-3">
                {despesasMesPagas.length ===
                0 ? (
                  <p className="text-sm text-[#64748b]">
                    Sem despesas pagas no mês.
                  </p>
                ) : (
                  despesasMesPagas
                    .slice(0, 10)
                    .map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {l.descricao}
                          </div>

                          <div className="truncate text-xs text-[#64748b]">
                            {l.conta}
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-[#b91c1c]">
                          {formatCurrency(
                            lerValor(l.valor),
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}