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

  const gmv = escrows.filter((e) => e.state !== "REFUNDED").reduce((s, e) => s + e.assetPrice, 0);
  const collected = feeLedger.filter((f) => f.status === "COLLECTED").reduce((s, f) => s + f.totalFee, 0);
  const activeCount = escrows.filter((e) =>
    ["FUNDS_LOCKED", "CUSTODY_HANDOVER", "VERIFICATION_RELEASE"].includes(e.state)
  ).length;
  const disputeCount = escrows.filter((e) => e.state === "DISPUTED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Admin Console
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Platform sales volume, 7.5% fee revenue, active transfers, and support overrides.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TerminalCard className="p-5">
          <div className="text-xs text-slate-500">Total Volume (GMV)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(gmv)}</div>
        </TerminalCard>
        <TerminalCard className="p-5">
          <div className="text-xs text-slate-500">Fees Earned (7.5%)</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(collected)}</div>
        </TerminalCard>
        <TerminalCard className="p-5">
          <div className="text-xs text-slate-500">Active Transfers</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{activeCount}</div>
        </TerminalCard>
        <TerminalCard className="p-5">
          <div className="text-xs text-slate-500">Support Disputes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{disputeCount}</div>
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
