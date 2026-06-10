"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import AppShell from "@/components/AppShell";
import BackupLancamentos from "@/components/BackupLancamentos";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  getCurrentFullMonthRange,
} from "@/lib/format";
import {
  categoriasDespesa,
  categoriasReceita,
  contasSugeridas,
  criarId,
  formasPagamento,
  lerValor,
} from "@/lib/lancamentos";
import {
  salvarLancamentos,
} from "@/lib/storage-lancamentos";
import {
  criarLancamentoDeRecorrencia,
  montarDataNoMes,
  obterChaveMes,
  salvarFechamentos,
  salvarMetas,
  salvarRecorrencias,
} from "@/lib/planejamento";
import { agendarSincronizacao } from "@/lib/auto-sync";
import { carregarDadosFinanceirosIniciais } from "@/lib/cloud-bootstrap";
import { notificar } from "@/lib/notificacoes";
import { useCloudAutoRefresh } from "@/lib/use-cloud-auto-refresh";
import type {
  Comprovante,
  LancamentoPlanilha,
  StatusLancamento,
  TipoLancamento,
} from "@/lib/lancamentos";
import type {
  FechamentoMes,
  LancamentoRecorrente,
  MetaCategoria,
  StatusFechamentoMes,
} from "@/lib/planejamento";

type FiltroResumo = "todos" | "receitas" | "pendentes" | "pagas";

type NovoLancamentoForm = {
  tipo: TipoLancamento;
  data: string;
  descricao: string;
  categoria: string;
  conta: string;
  titularConta: string;
  formaPagamento: string;
  valor: string;
  status: StatusLancamento;
  observacao: string;
};

type RecorrenciaForm = {
  tipo: TipoLancamento;
  dia: string;
  descricao: string;
  categoria: string;
  formaPagamento: string;
  valor: string;
  status: StatusLancamento;
  observacao: string;
};

type MetaForm = {
  categoria: string;
  limite: string;
};

function montarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function criarFormularioInicial(): NovoLancamentoForm {
  return {
    tipo: "despesa",
    data: formatDateInput(new Date()),
    descricao: "",
    categoria: "",
    conta: "",
    titularConta: "",
    formaPagamento: "",
    valor: "",
    status: "pendente",
    observacao: "",
  };
}

function criarRecorrenciaInicial(): RecorrenciaForm {
  return {
    tipo: "despesa",
    dia: "5",
    descricao: "",
    categoria: "",
    formaPagamento: "",
    valor: "",
    status: "pendente",
    observacao: "",
  };
}

function criarMetaInicial(): MetaForm {
  return {
    categoria: "",
    limite: "",
  };
}

type ResumoCardProps = {
  titulo: string;
  valor: number | string;
  tom: "neutro" | "receita" | "despesa" | "pago" | "pendente" | "saldo";
};

function ResumoCard({ titulo, valor, tom }: ResumoCardProps) {
  const cor =
    tom === "receita" || tom === "pago"
      ? "text-[#15803d]"
      : tom === "pendente" || tom === "despesa"
        ? "text-[#b91c1c]"
        : tom === "saldo" && typeof valor === "number"
          ? valor >= 0
            ? "text-[#15803d]"
            : "text-[#b91c1c]"
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

function normalizarChave(valor: string) {
  return valor.trim().toLowerCase();
}

function criarChaveRecorrenciaNoMes(
  recorrencia: LancamentoRecorrente,
  mesInicio: string,
) {
  return [
    obterChaveMes(mesInicio),
    montarDataNoMes(mesInicio, recorrencia.dia),
    recorrencia.tipo,
    normalizarChave(recorrencia.descricao),
    normalizarChave(recorrencia.categoria),
    normalizarChave(recorrencia.conta),
    normalizarChave(recorrencia.formaPagamento),
    lerValor(recorrencia.valor).toFixed(2),
  ].join("|");
}

function criarChaveLancamentoRecorrente(lancamento: LancamentoPlanilha) {
  return [
    lancamento.mesReferencia || obterChaveMes(lancamento.data),
    lancamento.data,
    lancamento.tipo,
    normalizarChave(lancamento.descricao),
    normalizarChave(lancamento.categoria),
    normalizarChave(lancamento.conta),
    normalizarChave(lancamento.formaPagamento),
    lerValor(lancamento.valor).toFixed(2),
  ].join("|");
}

function gerarLancamentosRecorrentesParaMes(
  lancamentosAtuais: LancamentoPlanilha[],
  recorrenciasAtuais: LancamentoRecorrente[],
  mesInicio: string,
) {
  const mesReferencia = obterChaveMes(mesInicio);
  const lancamentosDoMes = lancamentosAtuais.filter(
    (lancamento) =>
      (lancamento.mesReferencia || obterChaveMes(lancamento.data)) ===
      mesReferencia,
  );
  const recorrenciasGeradas = new Set(
    lancamentosDoMes
      .map((lancamento) => lancamento.recorrenciaId)
      .filter(Boolean),
  );
  const chavesExistentes = new Set(
    lancamentosDoMes.map(criarChaveLancamentoRecorrente),
  );
  const novas: LancamentoPlanilha[] = [];

  recorrenciasAtuais
    .filter((recorrencia) => recorrencia.ativo)
    .forEach((recorrencia) => {
      const chave = criarChaveRecorrenciaNoMes(recorrencia, mesInicio);

      if (recorrenciasGeradas.has(recorrencia.id) || chavesExistentes.has(chave)) {
        return;
      }

      novas.push(criarLancamentoDeRecorrencia(recorrencia, mesInicio));
      chavesExistentes.add(chave);
      recorrenciasGeradas.add(recorrencia.id);
    });

  return {
    novas,
    lancamentos:
      novas.length > 0 ? [...novas, ...lancamentosAtuais] : lancamentosAtuais,
  };
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

type ReceitaMesItemProps = {
  lancamento: LancamentoPlanilha;
};

function ReceitaMesItem({ lancamento }: ReceitaMesItemProps) {
  return (
    <div className="px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">
              {lancamento.descricao || "(sem descricao)"}
            </h3>
            <span className="rounded-md bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]">
              Receita
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
            <span>{formatDate(lancamento.data)}</span>
            <span>{lancamento.categoria || "Sem categoria"}</span>
            {lancamento.conta ? <span>{lancamento.conta}</span> : null}
            {lancamento.titularConta ? (
              <span>Conta de {lancamento.titularConta}</span>
            ) : null}
            <span>{lancamento.formaPagamento || "Sem forma de recebimento"}</span>
          </div>

          {lancamento.observacao ? (
            <p className="mt-2 text-xs text-[#64748b]">{lancamento.observacao}</p>
          ) : null}
        </div>

        <div className="text-base font-semibold text-[#15803d]">
          {formatCurrency(lerValor(lancamento.valor))}
        </div>
      </div>
    </div>
  );
}

type ListaReceitasProps = {
  receitas: LancamentoPlanilha[];
};

function ListaReceitas({ receitas }: ListaReceitasProps) {
  return (
    <section className="rounded-lg border border-[#d8dee8] bg-white">
      <div className="border-b border-[#e2e8f0] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Receitas</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Entradas registradas dentro do mes atual
            </p>
          </div>
          <span className="rounded-md bg-[#f1f5f9] px-2 py-1 text-xs font-semibold text-[#334155]">
            {receitas.length} itens
          </span>
        </div>
      </div>

      <div className="divide-y divide-[#eef2f7]">
        {receitas.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[#64748b]">
            Nenhuma receita neste mes.
          </div>
        ) : (
          receitas.map((lancamento) => (
            <ReceitaMesItem key={lancamento.id} lancamento={lancamento} />
          ))
        )}
      </div>
    </section>
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
  const [filtroResumo, setFiltroResumo] = useState<FiltroResumo>("todos");
  const [form, setForm] = useState<NovoLancamentoForm>(() =>
    criarFormularioInicial(),
  );
  const [recorrencias, setRecorrencias] = useState<LancamentoRecorrente[]>([]);
  const [recorrenciaForm, setRecorrenciaForm] = useState<RecorrenciaForm>(() =>
    criarRecorrenciaInicial(),
  );
  const [metas, setMetas] = useState<MetaCategoria[]>([]);
  const [metaForm, setMetaForm] = useState<MetaForm>(() => criarMetaInicial());
  const [fechamentos, setFechamentos] = useState<Record<string, FechamentoMes>>({});
  const [carregado, setCarregado] = useState(false);

  const aplicarAtualizacaoDaNuvem = useCallback(
    (dados: {
      lancamentos: LancamentoPlanilha[];
      recorrencias: LancamentoRecorrente[];
      metas: MetaCategoria[];
      fechamentos: Record<string, FechamentoMes>;
    }) => {
      const resultadoRecorrencias = gerarLancamentosRecorrentesParaMes(
        dados.lancamentos,
        dados.recorrencias,
        rangeInicial.start,
      );

      setLancamentos(resultadoRecorrencias.lancamentos);
      setRecorrencias(dados.recorrencias);
      setMetas(dados.metas);
      setFechamentos(dados.fechamentos);

      if (resultadoRecorrencias.novas.length > 0) {
        salvarLancamentos(window.localStorage, resultadoRecorrencias.lancamentos);
        agendarSincronizacao(window.localStorage);
      }

      notificar.sucesso("Dados atualizados da nuvem");
    },
    [rangeInicial.start],
  );

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      const resultado = await carregarDadosFinanceirosIniciais(window.localStorage);

      if (!ativo) return;

      const resultadoRecorrencias = gerarLancamentosRecorrentesParaMes(
        resultado.dados.lancamentos,
        resultado.dados.recorrencias,
        rangeInicial.start,
      );

      setLancamentos(resultadoRecorrencias.lancamentos);
      setRecorrencias(resultado.dados.recorrencias);
      setMetas(resultado.dados.metas);
      setFechamentos(resultado.dados.fechamentos);
      setCarregado(true);

      if (resultadoRecorrencias.novas.length > 0) {
        salvarLancamentos(window.localStorage, resultadoRecorrencias.lancamentos);
        agendarSincronizacao(window.localStorage);
        notificar.info(
          `${resultadoRecorrencias.novas.length} contas fixas geradas para este mes`,
        );
      }
    }

    void carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  useCloudAutoRefresh({
    enabled: carregado,
    onAtualizar: aplicarAtualizacaoDaNuvem,
  });

  function persistir(next: LancamentoPlanilha[]) {
    setLancamentos(next);
    salvarLancamentos(window.localStorage, next);
    agendarSincronizacao(window.localStorage);
  }

  function persistirRecorrencias(next: LancamentoRecorrente[]) {
    setRecorrencias(next);
    salvarRecorrencias(window.localStorage, next);
    agendarSincronizacao(window.localStorage);
  }

  function persistirMetas(next: MetaCategoria[]) {
    setMetas(next);
    salvarMetas(window.localStorage, next);
    agendarSincronizacao(window.localStorage);
  }

  function persistirFechamentos(next: Record<string, FechamentoMes>) {
    setFechamentos(next);
    salvarFechamentos(window.localStorage, next);
    agendarSincronizacao(window.localStorage);
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

  const receitasMes = useMemo(
    () => lancamentosMes.filter((lancamento) => lancamento.tipo === "receita"),
    [lancamentosMes],
  );

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

  const mesAtual = obterChaveMes(rangeInicial.start);
  const fechamentoAtual = fechamentos[mesAtual] || {
    mes: mesAtual,
    status: "aberto" as StatusFechamentoMes,
    atualizadoEm: "",
  };

  const totais = useMemo(() => {
    return lancamentosMes.reduce(
      (acc, lancamento) => {
        const valor = lerValor(lancamento.valor);

        if (lancamento.tipo === "receita") {
          acc.receitas += valor;
          return acc;
        }

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
        receitas: 0,
        gastos: 0,
        pendente: 0,
        pago: 0,
        comprovantes: 0,
      },
    );
  }, [lancamentosMes]);

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

  const metasComUso = useMemo(() => {
    return metas.map((meta) => {
      const gasto = contasMes
        .filter((lancamento) => lancamento.categoria === meta.categoria)
        .reduce((total, lancamento) => total + lerValor(lancamento.valor), 0);
      const limite = lerValor(meta.limite);
      const percentual = limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0;

      return {
        ...meta,
        gasto,
        limite,
        percentual,
        excedeu: limite > 0 && gasto > limite,
      };
    });
  }, [contasMes, metas]);

  function atualizarCampo(campo: keyof NovoLancamentoForm, valor: string) {
    if (campo === "tipo") {
      const tipo = valor as TipoLancamento;

      setForm((atual) => ({
        ...atual,
        tipo,
        categoria: "",
        conta: tipo === "receita" ? atual.conta : "",
        titularConta: tipo === "receita" ? atual.titularConta : "",
        status: tipo === "receita" ? "pago" : "pendente",
      }));
      return;
    }

    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function atualizarRecorrenciaCampo(campo: keyof RecorrenciaForm, valor: string) {
    if (campo === "tipo") {
      const tipo = valor as TipoLancamento;

      setRecorrenciaForm((atual) => ({
        ...atual,
        tipo,
        categoria: "",
        status: tipo === "receita" ? "pago" : "pendente",
      }));
      return;
    }

    setRecorrenciaForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function adicionarRecorrencia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recorrenciaForm.descricao.trim() || lerValor(recorrenciaForm.valor) <= 0) {
      alert("Informe descricao e valor da recorrencia.");
      return;
    }

    const novaRecorrencia: LancamentoRecorrente = {
      id: criarId(),
      tipo: recorrenciaForm.tipo,
      dia: recorrenciaForm.dia,
      descricao: recorrenciaForm.descricao.trim(),
      categoria: recorrenciaForm.categoria.trim(),
      conta: "",
      formaPagamento: recorrenciaForm.formaPagamento,
      valor: recorrenciaForm.valor.replace(",", "."),
      status:
        recorrenciaForm.tipo === "receita" ? "pago" : recorrenciaForm.status,
      observacao: recorrenciaForm.observacao.trim(),
      ativo: true,
    };

    persistirRecorrencias([novaRecorrencia, ...recorrencias]);

    const resultadoRecorrencias = gerarLancamentosRecorrentesParaMes(
      lancamentos,
      [novaRecorrencia],
      rangeInicial.start,
    );

    if (resultadoRecorrencias.novas.length > 0) {
      persistir(resultadoRecorrencias.lancamentos);
    }

    setRecorrenciaForm((atual) => ({
      ...criarRecorrenciaInicial(),
      tipo: atual.tipo,
      status: atual.tipo === "receita" ? "pago" : "pendente",
    }));
  }

  function alternarRecorrencia(id: string) {
    persistirRecorrencias(
      recorrencias.map((recorrencia) =>
        recorrencia.id === id
          ? { ...recorrencia, ativo: !recorrencia.ativo }
          : recorrencia,
      ),
    );
  }

  function removerRecorrencia(id: string) {
    if (
      !confirm(
        "Remover esta recorrencia e os lancamentos gerados deste mes em diante?",
      )
    ) {
      return;
    }

    persistirRecorrencias(
      recorrencias.filter((recorrencia) => recorrencia.id !== id),
    );

    const lancamentosSemRecorrencia = lancamentos.filter((lancamento) => {
      if (lancamento.recorrenciaId !== id) return true;

      const mesLancamento =
        lancamento.mesReferencia || obterChaveMes(lancamento.data);

      return mesLancamento < mesAtual;
    });

    if (lancamentosSemRecorrencia.length !== lancamentos.length) {
      persistir(lancamentosSemRecorrencia);
    }
  }

  function gerarRecorrenciasDoMes() {
    const resultadoRecorrencias = gerarLancamentosRecorrentesParaMes(
      lancamentos,
      recorrencias,
      rangeInicial.start,
    );
    const { novas } = resultadoRecorrencias;

    if (novas.length === 0) {
      alert("Nenhuma recorrencia nova para gerar neste mes.");
      return;
    }

    persistir(resultadoRecorrencias.lancamentos);
    alert(`${novas.length} lancamentos recorrentes gerados.`);
  }

  function salvarMetaCategoria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const categoria = metaForm.categoria.trim();
    const limite = metaForm.limite.replace(",", ".");

    if (!categoria || lerValor(limite) <= 0) {
      alert("Informe categoria e limite da meta.");
      return;
    }

    const existente = metas.find((meta) => meta.categoria === categoria);
    const next = existente
      ? metas.map((meta) =>
          meta.id === existente.id ? { ...meta, limite } : meta,
        )
      : [{ id: criarId(), categoria, limite }, ...metas];

    persistirMetas(next);
    setMetaForm(criarMetaInicial());
  }

  function removerMeta(id: string) {
    persistirMetas(metas.filter((meta) => meta.id !== id));
  }

  function alterarFechamento(status: StatusFechamentoMes) {
    persistirFechamentos({
      ...fechamentos,
      [mesAtual]: {
        mes: mesAtual,
        status,
        atualizadoEm: new Date().toISOString(),
      },
    });
  }

  function adicionarLancamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.descricao.trim() && !form.valor.trim()) {
      alert("Informe pelo menos a descricao ou o valor do lancamento.");
      return;
    }

    if (
      form.tipo === "receita" &&
      (!form.conta.trim() || !form.titularConta.trim())
    ) {
      alert("Informe a conta e de quem e a conta da receita.");
      return;
    }

    const novoLancamento: LancamentoPlanilha = {
      id: criarId(),
      data: form.data || formatDateInput(new Date()),
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      categoria: form.categoria.trim(),
      conta: form.tipo === "receita" ? form.conta.trim() : "",
      titularConta:
        form.tipo === "receita" ? form.titularConta.trim() : "",
      formaPagamento: form.formaPagamento,
      valor: form.valor.replace(",", "."),
      status: form.tipo === "receita" ? "pago" : form.status,
      observacao: form.observacao.trim(),
    };

    persistir([novoLancamento, ...lancamentos]);
    setForm((atual) => ({
      ...criarFormularioInicial(),
      data: atual.data,
      tipo: atual.tipo,
      status: atual.tipo === "receita" ? "pago" : "pendente",
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

  const mostrarReceitas = filtroResumo === "todos" || filtroResumo === "receitas";
  const mostrarPendentes = filtroResumo === "todos" || filtroResumo === "pendentes";
  const mostrarPagas = filtroResumo === "todos" || filtroResumo === "pagas";

  return (
    <AppShell
      title="Resumo do mes"
      subtitle={`${formatDate(rangeInicial.start)} - ${formatDate(
        rangeInicial.end,
      )} com receitas, contas a pagar, pagas e comprovantes`}
      action={
        <BackupLancamentos
          lancamentos={lancamentos}
          onImportar={(lancamentosImportados) => {
            persistir(lancamentosImportados);
            setCarregado(true);
          }}
        />
      }
    >
      <div className="space-y-5">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ResumoCard titulo="Receitas" valor={totais.receitas} tom="receita" />
          <ResumoCard titulo="A pagar" valor={totais.pendente} tom="pendente" />
          <ResumoCard titulo="Ja pagas" valor={totais.pago} tom="pago" />
          <ResumoCard titulo="Gastos do mes" valor={totais.gastos} tom="despesa" />
          <ResumoCard
            titulo="Saldo"
            valor={totais.receitas - totais.gastos}
            tom="saldo"
          />
        </section>

        <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold">Direcionamento do resumo</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                {carregado
                  ? `${lancamentosMes.length} lancamentos encontrados no periodo`
                  : "Carregando lancamentos salvos..."}
              </p>
            </div>

            <div className="inline-flex w-full rounded-md border border-[#cbd5e1] bg-[#f8fafc] p-1 sm:w-auto">
              {[
                { value: "todos", label: "Todos" },
                { value: "receitas", label: "Receitas" },
                { value: "pendentes", label: "A pagar" },
                { value: "pagas", label: "Pagas" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFiltroResumo(item.value as FiltroResumo)}
                  className={`h-9 flex-1 rounded-md px-3 text-sm font-semibold transition sm:flex-none ${
                    filtroResumo === item.value
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
            <h2 className="text-base font-semibold">Adicionar lancamento do mes</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Cadastre entradas e saidas direto neste resumo.
            </p>
          </div>

          <form
            onSubmit={adicionarLancamento}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end"
          >
            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Tipo
              <select
                value={form.tipo}
                onChange={(event) =>
                  atualizarCampo("tipo", event.target.value as TipoLancamento)
                }
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Data
              <input
                type="date"
                value={form.data}
                onChange={(event) => atualizarCampo("data", event.target.value)}
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Lancamento
              <input
                value={form.descricao}
                onChange={(event) => atualizarCampo("descricao", event.target.value)}
                placeholder={
                  form.tipo === "receita" ? "Ex.: salario" : "Ex.: compra do mercado"
                }
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Categoria
              <input
                list={
                  form.tipo === "despesa"
                    ? "categorias-despesa-resumo"
                    : "categorias-receita-resumo"
                }
                value={form.categoria}
                onChange={(event) => atualizarCampo("categoria", event.target.value)}
                placeholder={form.tipo === "receita" ? "Ex.: Salario" : "Ex.: Mercado"}
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            {form.tipo === "receita" ? (
              <>
                <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
                  Conta
                  <input
                    list="contas-sugeridas-resumo"
                    value={form.conta}
                    onChange={(event) => atualizarCampo("conta", event.target.value)}
                    placeholder="Ex.: Conta corrente"
                    className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                  />
                </label>

                <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
                  De quem e a conta
                  <input
                    value={form.titularConta}
                    onChange={(event) =>
                      atualizarCampo("titularConta", event.target.value)
                    }
                    placeholder="Ex.: Paulo"
                    className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                  />
                </label>
              </>
            ) : null}

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Forma
              <select
                value={form.formaPagamento}
                onChange={(event) => atualizarCampo("formaPagamento", event.target.value)}
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="">Selecione</option>
                {formasPagamento.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Valor
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={(event) => atualizarCampo("valor", event.target.value)}
                placeholder="0,00"
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            {form.tipo === "despesa" ? (
              <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    atualizarCampo("status", event.target.value as StatusLancamento)
                  }
                  className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </label>
            ) : null}

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155] xl:col-span-3">
              Observacao
              <input
                value={form.observacao}
                onChange={(event) => atualizarCampo("observacao", event.target.value)}
                placeholder="Opcional"
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
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

        <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold">Recorrencias do mes</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Cadastre contas fixas e entradas recorrentes para gerar no mes atual.
              </p>
            </div>

            <button
              type="button"
              onClick={gerarRecorrenciasDoMes}
              className="h-10 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              Gerar mes
            </button>
          </div>

          <form
            onSubmit={adicionarRecorrencia}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[8rem_7.5rem_minmax(13rem,1.8fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(7.5rem,0.8fr)] xl:items-end"
          >
            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Tipo
              <select
                value={recorrenciaForm.tipo}
                onChange={(event) =>
                  atualizarRecorrenciaCampo(
                    "tipo",
                    event.target.value as TipoLancamento,
                  )
                }
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Dia
              <input
                type="number"
                min="1"
                max="31"
                value={recorrenciaForm.dia}
                onChange={(event) =>
                  atualizarRecorrenciaCampo("dia", event.target.value)
                }
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Descricao
              <input
                value={recorrenciaForm.descricao}
                onChange={(event) =>
                  atualizarRecorrenciaCampo("descricao", event.target.value)
                }
                placeholder={
                  recorrenciaForm.tipo === "receita"
                    ? "Ex.: salario"
                    : "Ex.: internet"
                }
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Categoria
              <input
                list={
                  recorrenciaForm.tipo === "despesa"
                    ? "categorias-despesa-resumo"
                    : "categorias-receita-resumo"
                }
                value={recorrenciaForm.categoria}
                onChange={(event) =>
                  atualizarRecorrenciaCampo("categoria", event.target.value)
                }
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Forma
              <select
                value={recorrenciaForm.formaPagamento}
                onChange={(event) =>
                  atualizarRecorrenciaCampo("formaPagamento", event.target.value)
                }
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              >
                <option value="">Selecione</option>
                {formasPagamento.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
              Valor
              <input
                type="number"
                min="0"
                step="0.01"
                value={recorrenciaForm.valor}
                onChange={(event) =>
                  atualizarRecorrenciaCampo("valor", event.target.value)
                }
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            {recorrenciaForm.tipo === "despesa" ? (
              <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155]">
                Status
                <select
                  value={recorrenciaForm.status}
                  onChange={(event) =>
                    atualizarRecorrenciaCampo(
                      "status",
                      event.target.value as StatusLancamento,
                    )
                  }
                  className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </label>
            ) : null}

            <label className="grid min-w-0 gap-1 text-sm font-medium text-[#334155] xl:col-span-4">
              Observacao
              <input
                value={recorrenciaForm.observacao}
                onChange={(event) =>
                  atualizarRecorrenciaCampo("observacao", event.target.value)
                }
                placeholder="Opcional"
                className="h-10 w-full min-w-0 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
              />
            </label>

            <button
              type="submit"
              className="h-10 rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d]"
            >
              Salvar
            </button>
          </form>

          <div className="mt-4 divide-y divide-[#eef2f7] rounded-md border border-[#e2e8f0]">
            {recorrencias.length === 0 ? (
              <p className="px-4 py-5 text-sm text-[#64748b]">
                Nenhuma recorrencia cadastrada.
              </p>
            ) : (
              recorrencias.map((recorrencia) => (
                <div
                  key={recorrencia.id}
                  className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {recorrencia.descricao || "(sem descricao)"}
                      </p>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${
                          recorrencia.ativo
                            ? "bg-[#dcfce7] text-[#166534]"
                            : "bg-[#e2e8f0] text-[#475569]"
                        }`}
                      >
                        {recorrencia.ativo ? "Ativa" : "Pausada"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Dia {recorrencia.dia} - {recorrencia.categoria || "Sem categoria"} -{" "}
                      {formatCurrency(lerValor(recorrencia.valor))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => alternarRecorrencia(recorrencia.id)}
                      className="h-9 rounded-md border border-[#cbd5e1] px-3 text-xs font-semibold text-[#334155] transition hover:border-[#64748b]"
                    >
                      {recorrencia.ativo ? "Pausar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removerRecorrencia(recorrencia.id)}
                      className="h-9 rounded-md border border-[#fecaca] px-3 text-xs font-semibold text-[#b91c1c] transition hover:border-[#ef4444]"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-5">
            {mostrarReceitas ? <ListaReceitas receitas={receitasMes} /> : null}

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
              <h2 className="text-base font-semibold">Fechamento do mes</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Status atual: {fechamentoAtual.status}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-[#cbd5e1] bg-[#f8fafc] p-1">
                {[
                  { value: "aberto", label: "Aberto" },
                  { value: "revisado", label: "Revisado" },
                  { value: "fechado", label: "Fechado" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      alterarFechamento(item.value as StatusFechamentoMes)
                    }
                    className={`h-9 rounded-md px-2 text-xs font-semibold transition ${
                      fechamentoAtual.status === item.value
                        ? "bg-white text-[#111827] shadow-sm"
                        : "text-[#64748b] hover:text-[#111827]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {fechamentoAtual.atualizadoEm ? (
                <p className="mt-3 text-xs text-[#64748b]">
                  Atualizado em {formatDate(fechamentoAtual.atualizadoEm)}
                </p>
              ) : null}
            </section>

            <section className="rounded-lg border border-[#d8dee8] bg-white p-4">
              <h2 className="text-base font-semibold">Metas por categoria</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Acompanhe limites mensais para as despesas.
              </p>

              <form onSubmit={salvarMetaCategoria} className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-[#334155]">
                  Categoria
                  <input
                    list="categorias-despesa-resumo"
                    value={metaForm.categoria}
                    onChange={(event) =>
                      setMetaForm((atual) => ({
                        ...atual,
                        categoria: event.target.value,
                      }))
                    }
                    className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium text-[#334155]">
                  Limite
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={metaForm.limite}
                    onChange={(event) =>
                      setMetaForm((atual) => ({
                        ...atual,
                        limite: event.target.value,
                      }))
                    }
                    className="h-10 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#2563eb]"
                  />
                </label>

                <button
                  type="submit"
                  className="h-10 rounded-md bg-[#16a34a] px-4 text-sm font-semibold text-white transition hover:bg-[#15803d]"
                >
                  Salvar meta
                </button>
              </form>

              <div className="mt-4 space-y-4">
                {metasComUso.length === 0 ? (
                  <p className="text-sm text-[#64748b]">Nenhuma meta cadastrada.</p>
                ) : (
                  metasComUso.map((meta) => (
                    <div key={meta.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold">{meta.categoria}</p>
                        <button
                          type="button"
                          onClick={() => removerMeta(meta.id)}
                          className="shrink-0 text-xs font-semibold text-[#b91c1c]"
                        >
                          Remover
                        </button>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                        <span className={meta.excedeu ? "text-[#b91c1c]" : "text-[#64748b]"}>
                          {formatCurrency(meta.gasto)} de {formatCurrency(meta.limite)}
                        </span>
                        <span className={meta.excedeu ? "font-semibold text-[#b91c1c]" : "text-[#64748b]"}>
                          {Math.round(meta.percentual)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[#e2e8f0]">
                        <div
                          className={`h-2 rounded-full ${
                            meta.excedeu ? "bg-[#ef4444]" : "bg-[#16a34a]"
                          }`}
                          style={{ width: `${meta.percentual}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

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
                  <dt className="text-[#64748b]">Receitas</dt>
                  <dd className="font-semibold text-[#15803d]">{receitasMes.length}</dd>
                </div>
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
                  <dt className="text-[#64748b]">Com comprovante</dt>
                  <dd className="font-semibold">
                    {totais.comprovantes}/{contasMes.length}
                  </dd>
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
      <datalist id="categorias-receita-resumo">
        {categoriasReceita.map((categoria) => (
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
