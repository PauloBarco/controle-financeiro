"use client";

import type { FC } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import type {
  DadosMesEvoluacao,
  DadosReceitaVsDespesa,
  ResumoDespesasPorCategoria,
} from "@/lib/dashboard-stats";
import type { TooltipContentProps } from "recharts";

const CORES_GRAFICOS = [
  "#15803d",
  "#b91c1c",
  "#2563eb",
  "#ea580c",
  "#7c3aed",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
];

// Custom Tooltip para mostrar valores formatados
const CustomTooltip: FC<Partial<TooltipContentProps>> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border border-[#d8dee8] bg-white p-3 shadow-lg">
        <p className="text-sm font-semibold text-[#111827]">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(Number(entry.value) || 0)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Gráfico de Receitas vs Despesas (Bar Chart)
export const GraficoReceitaVsDespesa: FC<{
  dados: DadosReceitaVsDespesa[];
}> = ({ dados }) => {
  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-6">
      <h3 className="mb-4 text-base font-semibold text-[#111827]">
        Receitas vs Despesas por Categoria
      </h3>

      {dados.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-sm text-[#64748b]">
          Nenhum dado disponível
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={dados} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="nome"
              tick={{ fill: "#64748b", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="square"
            />
            <Bar dataKey="receitas" fill="#15803d" name="Receitas" radius={[8, 8, 0, 0]} />
            <Bar dataKey="despesas" fill="#b91c1c" name="Despesas" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// Gráfico de Evolução Mensal (Line Chart)
export const GraficoEvolucaoMensal: FC<{
  dados: DadosMesEvoluacao[];
}> = ({ dados }) => {
  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-6">
      <h3 className="mb-4 text-base font-semibold text-[#111827]">
        Evolução Mensal
      </h3>

      {dados.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-sm text-[#64748b]">
          Nenhum dado disponível
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={dados} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Line
              type="monotone"
              dataKey="receitas"
              stroke="#15803d"
              strokeWidth={2}
              name="Receitas"
              dot={{ fill: "#15803d", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="despesas"
              stroke="#b91c1c"
              strokeWidth={2}
              name="Despesas"
              dot={{ fill: "#b91c1c", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              stroke="#2563eb"
              strokeWidth={2}
              name="Saldo"
              dot={{ fill: "#2563eb", r: 4 }}
              activeDot={{ r: 6 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// Gráfico de Despesas por Categoria (Pie Chart)
export const GraficoDespesasPorCategoria: FC<{
  dados: ResumoDespesasPorCategoria[];
}> = ({ dados }) => {
  const dadosPie = dados.map((item) => ({
    ...item,
    value: Math.round(item.valor * 100) / 100,
  }));

  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-6">
      <h3 className="mb-4 text-base font-semibold text-[#111827]">
        Distribuição de Despesas por Categoria
      </h3>

      {dadosPie.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-sm text-[#64748b]">
          Nenhuma despesa registrada
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={dadosPie}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ index }) => {
                  const item = dadosPie[index || 0];
                  return `${item?.nome} (${item?.percentual.toFixed(1)}%)`;
                }}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {dadosPie.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CORES_GRAFICOS[index % CORES_GRAFICOS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value) || 0)}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2">
            {dadosPie.map((item, index) => (
              <div
                key={item.nome}
                className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded"
                      style={{
                        backgroundColor:
                          CORES_GRAFICOS[index % CORES_GRAFICOS.length],
                      }}
                    />
                    <span className="text-sm font-medium text-[#334155]">
                      {item.nome}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-[#111827]">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.percentual}%`,
                      backgroundColor:
                        CORES_GRAFICOS[index % CORES_GRAFICOS.length],
                    }}
                  />
                </div>
                <div className="mt-1 text-xs text-[#64748b]">
                  {item.percentual.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
