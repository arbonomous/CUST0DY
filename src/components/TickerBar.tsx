"use client";

import { ArrowUpRight, ArrowDownRight, ShieldCheck, Activity } from "lucide-react";

export interface TickerItem {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  type: "FLOOR" | "SALE" | "VOLUME";
}

export function TickerBar({ items }: { items: TickerItem[] }) {
  const doubled = [...items, ...items];

  return (
    <div className="w-full bg-[#09090B] border-b border-[#27272A] overflow-hidden select-none">
      <div className="flex items-center h-8">
        <div className="shrink-0 flex items-center gap-1.5 px-3 h-full bg-[#121215] border-r border-[#27272A] z-10">
          <Activity className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-300 uppercase">
            LIVE TAPE
          </span>
        </div>

        <div className="overflow-hidden flex-1">
          <div className="animate-ticker flex items-center gap-8 px-6">
            {doubled.map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                className="flex items-center gap-2 shrink-0 font-mono text-[11px]"
              >
                {item.type === "SALE" && (
                  <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                )}
                <span className="text-zinc-400 uppercase tracking-tight">
                  {item.label}:
                </span>
                <span className="text-zinc-100 font-semibold">{item.value}</span>
                {item.delta && (
                  <span
                    className={`inline-flex items-center gap-0.5 font-medium ${
                      item.positive ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {item.positive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {item.delta}
                  </span>
                )}
                <span className="text-[#27272A] ml-4">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
