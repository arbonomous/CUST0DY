"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DepthPoint {
  price: number;
  bidDepth: number | null;
  askDepth: number | null;
}

export function DepthChart({
  bids,
  asks,
}: {
  bids: Array<{ price: number }>;
  asks: Array<{ price: number }>;
}) {
  const sortedBids = [...bids].sort((a, b) => a.price - b.price);
  const sortedAsks = [...asks].sort((a, b) => a.price - b.price);

  const data: DepthPoint[] = [];

  // Cumulative bids from highest down to lowest
  const descBids = [...sortedBids].reverse();
  const bidCumulativeMap = new Map<number, number>();
  let runningBid = 0;
  for (const b of descBids) {
    runningBid += b.price;
    bidCumulativeMap.set(b.price, runningBid);
  }
  for (const b of sortedBids) {
    data.push({
      price: b.price,
      bidDepth: bidCumulativeMap.get(b.price) ?? b.price,
      askDepth: null,
    });
  }

  // Cumulative asks from lowest up to highest
  let runningAsk = 0;
  for (const a of sortedAsks) {
    runningAsk += a.price;
    data.push({
      price: a.price,
      bidDepth: null,
      askDepth: runningAsk,
    });
  }

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-zinc-500 font-mono">
        No active order book depth yet.
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bidFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="askFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#27272A" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="price"
            tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`}
            tick={{ fill: "#71717A", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "#27272A" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
            tick={{ fill: "#71717A", fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#121215",
              borderColor: "#27272A",
              borderRadius: "6px",
              fontSize: "11px",
              fontFamily: "monospace",
            }}
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(label) => `Price Level: ${formatCurrency(Number(label))}`}
          />
          <Area
            type="stepAfter"
            dataKey="bidDepth"
            name="Bid Liquidity"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#bidFill)"
            connectNulls={false}
          />
          <Area
            type="stepAfter"
            dataKey="askDepth"
            name="Ask Liquidity"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#askFill)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
