"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface SparklinePoint {
  t: string;
  p: number;
}

export function SparklineChart({
  data,
  positive = true,
  height = 34,
}: {
  data: SparklinePoint[];
  positive?: boolean;
  height?: number;
}) {
  if (!data || data.length === 0) {
    return <div className="h-[34px] w-24 bg-[#18181C] rounded" />;
  }

  const stroke = positive ? "#10B981" : "#EF4444";
  const gradId = `spark-${positive ? "up" : "down"}-${data[0]?.p ?? 1}`;

  return (
    <div style={{ width: "100%", height }} className="min-w-[84px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="p"
            stroke={stroke}
            strokeWidth={1.6}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
