"use client";

import Link from "next/link";
import { Lock, PlusCircle, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";

interface ThreeVaultHeroProps {
  totalAssets: number;
  activeEscrowCount: number;
  totalEscrowLocked: number;
  firstEscrowId: string | null;
}

export function ThreeVaultHero({
  totalAssets,
  activeEscrowCount,
  totalEscrowLocked,
  firstEscrowId,
}: ThreeVaultHeroProps) {
  return (
    <section className="rounded-xl bg-[#121215] border border-[#27272A] p-6 sm:p-8 lg:p-10 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-50 leading-[1.15]">
            Buy, Sell &amp; Swap Rare Domains and Handles — Protected by Automated Escrow
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Every domain (<span className="font-mono text-zinc-200">.ai, .xyz, .io, .com</span>) and handle (<span className="font-mono text-zinc-200">@X, Telegram, ENS, .sol</span>) is ownership-verified before listing. Payment locks safely in escrow until transfer keys are verified.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a href="#marketplace">
            <Button variant="emerald" size="lg">
              Browse {totalAssets} Verified Assets
              <ArrowDown className="w-4 h-4" />
            </Button>
          </a>
          <Link href="/list">
            <Button variant="primary" size="lg">
              <PlusCircle className="w-4 h-4" />
              Sell or Verify an Asset
            </Button>
          </Link>
          {firstEscrowId && (
            <Link href={`/escrow/${firstEscrowId}`}>
              <Button variant="secondary" size="lg">
                <Lock className="w-4 h-4 text-[#F59E0B]" />
                Escrow Room ({activeEscrowCount} • {formatCurrency(totalEscrowLocked)})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Friendly 3-Step Escrow Trust Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-[#27272A]">
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-mono text-xs font-bold flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100">Funds Lock Safely</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Pay via Card or USDC. Zero off-platform risk.</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] font-mono text-xs font-bold flex items-center justify-center shrink-0">
            2
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100">Encrypted Handover</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">EPP codes &amp; 2FA vaults encrypted with AES-256.</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#60A5FA] font-mono text-xs font-bold flex items-center justify-center shrink-0">
            3
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100">24h Auto-Refund Guard</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Seller misses SLA? Automatic 100% refund.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
