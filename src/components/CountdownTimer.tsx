"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function CountdownTimer({
  deadlineIso,
  label,
  tone = "amber",
}: {
  deadlineIso: string;
  label: string;
  tone?: "amber" | "emerald" | "danger";
}) {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Math.max(0, new Date(deadlineIso).getTime() - Date.now())
  );

  useEffect(() => {
    const target = new Date(deadlineIso).getTime();
    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  const totalSec = Math.floor(remainingMs / 1000);
  const hrs = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSec % 60).padStart(2, "0");

  const expired = totalSec === 0;

  return (
    <div
      className={cn(
        "rounded-md border px-3.5 py-2.5 flex items-center justify-between gap-3",
        expired || tone === "danger"
          ? "bg-[#EF4444]/10 border-[#EF4444]/30"
          : tone === "emerald"
          ? "bg-[#10B981]/10 border-[#10B981]/30"
          : "bg-[#F59E0B]/10 border-[#F59E0B]/30"
      )}
    >
      <div className="flex items-center gap-2">
        <Clock
          className={cn(
            "w-4 h-4",
            expired || tone === "danger"
              ? "text-[#F87171]"
              : tone === "emerald"
              ? "text-[#10B981]"
              : "text-[#F59E0B]"
          )}
        />
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-300">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "font-mono text-lg font-bold tracking-wider",
          expired || tone === "danger"
            ? "text-[#F87171]"
            : tone === "emerald"
            ? "text-[#10B981]"
            : "text-[#F59E0B]"
        )}
      >
        {hrs}:{mins}:{secs}
      </span>
    </div>
  );
}
