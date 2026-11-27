import { DollarSign, Lock, AlertTriangle, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TerminalCard } from "@/components/ui/primitives";
import { AdminOpsClient } from "@/components/AdminOpsClient";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  const [escrows, feeLedger] = await Promise.all([
    prisma.escrowTransaction.findMany({
      include: {
        asset: { select: { name: true } },
        buyer: { select: { alias: true } },
        seller: { select: { alias: true } },
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.platformFeeLedger.findMany({
      include: {
        escrow: {
          select: {
            tradeCode: true,
            asset: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const gmv = escrows
    .filter((e) => e.state !== "REFUNDED")
    .reduce((sum, e) => sum + e.assetPrice, 0);

  const collectedFees = feeLedger
    .filter((f) => f.status === "COLLECTED")
    .reduce((sum, f) => sum + f.totalFee, 0);

  const pendingFees = feeLedger
    .filter((f) => f.status === "PENDING")
    .reduce((sum, f) => sum + f.totalFee, 0);

  const activeCount = escrows.filter((e) =>
    ["FUNDS_LOCKED", "CUSTODY_HANDOVER", "VERIFICATION_RELEASE"].includes(e.state)
  ).length;

  const disputeCount = escrows.filter((e) => e.state === "DISPUTED").length;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#27272A] pb-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Admin Revenue & Escrow Operations Console
        </h1>
        <p className="text-xs text-zinc-400">
          Real-time GMV, 7.5% platform revenue ledger, active custody vaults, encrypted audit logs, and concierge dispute overrides.
        </p>
      </div>

      {/* Real-Time KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TerminalCard className="p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-zinc-500">
            <span>Gross Merchandise Vol (GMV)</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#3B82F6]" />
          </div>
          <div className="font-mono text-2xl font-bold text-zinc-50 mt-1.5">
            {formatCurrency(gmv)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Across {escrows.length} total escrow vaults
          </div>
        </TerminalCard>

        <TerminalCard className="p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-zinc-500">
            <span>Net Fees Earned (7.5%)</span>
            <DollarSign className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#10B981] mt-1.5">
            {formatCurrency(collectedFees)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            +{formatCurrency(pendingFees)} pending in active custody
          </div>
        </TerminalCard>

        <TerminalCard className="p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-zinc-500">
            <span>Active Escrows in Custody</span>
            <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F59E0B] mt-1.5">
            {activeCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Protected by 24h SLA auto-refund guard
          </div>
        </TerminalCard>

        <TerminalCard className="p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-zinc-500">
            <span>Dispute Queue</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
          </div>
          <div className="font-mono text-2xl font-bold text-zinc-50 mt-1.5">
            {disputeCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {disputeCount === 0 ? "All vaults operating normally" : "Requires concierge review"}
          </div>
        </TerminalCard>
      </div>

      <AdminOpsClient
        escrows={escrows.map((e) => ({
          id: e.id,
          tradeCode: e.tradeCode,
          assetName: e.asset.name,
          type: e.type,
          state: e.state,
          buyerAlias: e.buyer.alias,
          sellerAlias: e.seller.alias,
          assetPrice: e.assetPrice,
          totalPlatformFee: e.totalPlatformFee,
          currency: e.currency,
          eppCipherPreview: e.encryptedEppCode ? e.encryptedEppCode.slice(0, 14).toUpperCase() : null,
          burnerVaultEmail: e.burnerVaultEmail,
          disputeReason: e.disputeReason,
          auditLogs: e.auditLogs.map((l) => ({
            id: l.id,
            actorRole: l.actorRole,
            action: l.action,
            details: l.details,
            metadata: l.metadata,
            createdAtIso: l.createdAt.toISOString(),
          })),
        }))}
        feeLedger={feeLedger.map((f) => ({
          id: f.id,
          tradeCode: f.escrow.tradeCode,
          assetName: f.escrow.asset.name,
          grossAmount: f.grossAmount,
          buyerFee: f.buyerFee,
          sellerFee: f.sellerFee,
          totalFee: f.totalFee,
          currency: f.currency,
          status: f.status,
          createdAtIso: f.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
