"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import { Building2, CreditCard, Wallet } from "lucide-react";
import React from "react";

interface ContaDestaque {
  nome: string;
  saldo: number;
  tipo: "bancaria" | "cartao" | "outros";
  ultimoMovimento?: string;
}

interface ContasDestaqueProps {
  contas: ContaDestaque[];
}

export function ContasDestaque({ contas }: ContasDestaqueProps) {
  const icons = {
    bancaria: <Building2 className="w-6 h-6" />,
    cartao: <CreditCard className="w-6 h-6" />,
    outros: <Wallet className="w-6 h-6" />,
  };

  const cores = {
    bancaria: {
      bg: "from-blue-600 to-blue-700",
      text: "text-blue-100",
      accent: "bg-blue-500/20",
    },
    cartao: {
      bg: "from-purple-600 to-purple-700",
      text: "text-purple-100",
      accent: "bg-purple-500/20",
    },
    outros: {
      bg: "from-slate-600 to-slate-700",
      text: "text-slate-100",
      accent: "bg-slate-500/20",
    },
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Contas em Destaque
      </h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contas.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nenhuma conta configurada
            </p>
          </div>
        ) : (
          contas.map((conta) => {
            const cor = cores[conta.tipo];

            return (
              <div
                key={conta.nome}
                className={`group relative overflow-hidden rounded-lg bg-gradient-to-br ${cor.bg} p-5 text-white shadow-lg transition-all hover:shadow-xl dark:shadow-2xl`}
              >
                {/* Efeito background */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-all group-hover:blur-3xl" />
                </div>

                {/* Conteúdo */}
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`rounded-lg p-2 ${cor.accent}`}>
                        {icons[conta.tipo]}
                      </div>
                      <h4 className="font-semibold text-sm">{conta.nome}</h4>
                    </div>

                    <p className="text-xs opacity-75 mb-2">Saldo</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(conta.saldo)}
                    </p>

                    {conta.ultimoMovimento && (
                      <p className="mt-3 text-xs opacity-60">
                        Ult. mov: {conta.ultimoMovimento}
                      </p>
                    )}
                  </div>
                </div>

                {/* Chip de cartão (visual) */}
                <div className="absolute bottom-3 right-3 rounded opacity-30">
                  <div className="text-xs font-mono">••••</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
