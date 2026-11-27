"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Point {
  t: string;
  p: number;
}

export function LightPriceChart({
  data,
  positive = true,
}: {
  data: Point[];
  positive?: boolean;
}) {
  if (!data || data.length === 0) return null;
  const stroke = positive ? "#059669" : "#dc2626";

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lightPriceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              borderColor: "#e4e4e7",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
              fontSize: "12px",
            }}
            formatter={(value) => [formatCurrency(Number(value)), "Value"]}
          />
          <Area
            type="monotone"
            dataKey="p"
            stroke={stroke}
            strokeWidth={2.2}
            fill="url(#lightPriceGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
