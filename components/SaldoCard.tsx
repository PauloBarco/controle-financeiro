"use client";

import { formatCurrency } from "@/lib/format";
import { ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";
import React from "react";

interface SaldoCardProps {
  titulo: string;
  valor: number;
  tipo: "receita" | "despesa" | "saldo" | "pendente";
  icon?: React.ReactNode;
  tendencia?: number;
  comparacao?: string;
}

export function SaldoCard({
  titulo,
  valor,
  tipo,
  icon,
  tendencia,
  comparacao,
}: SaldoCardProps) {
  const cores = {
    receita: {
      bg: "from-green-500/10 to-green-600/10",
      border: "border-green-200 dark:border-green-900",
      text: "text-green-700 dark:text-green-400",
      icon: "text-green-600 dark:text-green-400",
      badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    },
    despesa: {
      bg: "from-red-500/10 to-red-600/10",
      border: "border-red-200 dark:border-red-900",
      text: "text-red-700 dark:text-red-400",
      icon: "text-red-600 dark:text-red-400",
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    },
    saldo: {
      bg: "from-blue-500/10 to-blue-600/10",
      border: "border-blue-200 dark:border-blue-900",
      text: "text-blue-700 dark:text-blue-400",
      icon: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    },
    pendente: {
      bg: "from-amber-500/10 to-amber-600/10",
      border: "border-amber-200 dark:border-amber-900",
      text: "text-amber-700 dark:text-amber-400",
      icon: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    },
  };

  const cor = cores[tipo];

  const iconePadrao = {
    receita: <ArrowDownLeft className="w-5 h-5" />,
    despesa: <ArrowUpRight className="w-5 h-5" />,
    saldo: <TrendingUp className="w-5 h-5" />,
    pendente: <TrendingUp className="w-5 h-5" />,
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${cor.border} bg-gradient-to-br ${cor.bg} p-6 backdrop-blur-sm transition-all hover:shadow-lg dark:bg-gradient-to-br dark:from-gray-800/50 dark:to-gray-900/50`}
    >
      {/* Efeito de background animado */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 blur-3xl dark:bg-white/10" />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            {titulo}
          </p>

          <h3 className={`text-3xl font-bold ${cor.text}`}>
            {formatCurrency(valor)}
          </h3>

          {comparacao && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {comparacao}
            </p>
          )}

          {tendencia !== undefined && (
            <div className="mt-3 flex items-center gap-1">
              <div
                className={`rounded-full px-2 py-1 text-xs font-semibold ${cor.badge} flex items-center gap-1`}
              >
                <TrendingUp className="w-3 h-3" />
                {tendencia > 0 ? "+" : ""}
                {tendencia}%
              </div>
            </div>
          )}
        </div>

        {/* Ícone */}
        <div
          className={`rounded-lg bg-white/10 p-3 ${cor.icon} dark:bg-white/5`}
        >
          {icon || iconePadrao[tipo]}
        </div>
      </div>
    </div>
  );
}
