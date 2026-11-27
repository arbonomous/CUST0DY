import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";
import { parseStringArray } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";
import {
  EscrowDealRoomClient,
  type EscrowDealData,
} from "@/components/EscrowDealRoomClient";

export const dynamic = "force-dynamic";

export default async function EscrowDealRoomPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;

  const [escrow, currentUser] = await Promise.all([
    prisma.escrowTransaction.findFirst({
      where: { OR: [{ id: tradeId }, { tradeCode: tradeId }] },
      include: {
        asset: true,
        buyer: { select: { id: true, alias: true } },
        seller: { select: { id: true, alias: true } },
        swapOffer: true,
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
    }),
    getCurrentUser(),
  ]);

  if (!escrow) notFound();

  const viewerRole =
    currentUser?.role === "ADMIN"
      ? "ADMIN"
      : currentUser?.id === escrow.buyerId
      ? "BUYER"
      : currentUser?.id === escrow.sellerId
      ? "SELLER"
      : "OBSERVER";

  // Tamper-proof server-side decryption: ONLY decrypt credentials after atomic settlement
  // and ONLY for authorized Buyer / Seller / Admin desks.
  let decryptedCredential: string | null = null;
  if (
    escrow.state === "SETTLED" &&
    (viewerRole === "BUYER" || viewerRole === "ADMIN") &&
    escrow.encryptedEppCode &&
    escrow.eppIv &&
    escrow.eppAuthTag
  ) {
    try {
      decryptedCredential = decryptSecret(
        escrow.encryptedEppCode,
        escrow.eppIv,
        escrow.eppAuthTag
      );
    } catch {
      decryptedCredential = null;
    }
  }

  let decryptedBuyerSwapKey: string | null = null;
  if (
    escrow.state === "SETTLED" &&
    escrow.type === "SWAP" &&
    (viewerRole === "SELLER" || viewerRole === "ADMIN") &&
    escrow.encryptedBuyerSwapKey &&
    escrow.buyerSwapIv &&
    escrow.buyerSwapAuthTag
  ) {
    try {
      decryptedBuyerSwapKey = decryptSecret(
        escrow.encryptedBuyerSwapKey,
        escrow.buyerSwapIv,
        escrow.buyerSwapAuthTag
      );
    } catch {
      decryptedBuyerSwapKey = null;
    }
  }

  let swapOfferedAssetNames: string[] = [];
  if (escrow.swapOffer) {
    const offeredIds = parseStringArray(escrow.swapOffer.offeredAssetIds);
    if (offeredIds.length > 0) {
      const offered = await prisma.asset.findMany({
        where: { id: { in: offeredIds } },
        select: { name: true },
      });
      swapOfferedAssetNames = offered.map((o) => o.name);
    }
  }

  const dealData: EscrowDealData = {
    id: escrow.id,
    tradeCode: escrow.tradeCode,
    type: escrow.type,
    state: escrow.state,
    assetName: escrow.asset.name,
    assetCategory: escrow.asset.category,
    assetSubCategory: escrow.asset.subCategory,
    registrarOrPlatform: escrow.asset.registrarOrPlatform,
    buyerAlias: escrow.buyer.alias,
    sellerAlias: escrow.seller.alias,
    assetPrice: escrow.assetPrice,
    buyerFee: escrow.buyerFee,
    sellerFee: escrow.sellerFee,
    totalPlatformFee: escrow.totalPlatformFee,
    totalBuyerDeposit: escrow.totalBuyerDeposit,
    sellerPayout: escrow.sellerPayout,
    currency: escrow.currency,
    paymentMethod: escrow.paymentMethod,
    paymentIntentId: escrow.paymentIntentId,
    slaDeadlineIso: escrow.slaDeadline.toISOString(),
    inspectionDeadlineIso: escrow.inspectionDeadline?.toISOString() ?? null,
    hasEncryptedEpp: Boolean(escrow.encryptedEppCode),
    eppCipherPreview: escrow.encryptedEppCode ? escrow.encryptedEppCode.slice(0, 16).toUpperCase() : null,
    burnerVaultEmail: escrow.burnerVaultEmail,
    burner2faLocked: escrow.burner2faLocked,
    rdapVerified: escrow.rdapVerified,
    buyerSwapKeyDeposited: escrow.buyerSwapKeyDeposited,
    disputeReason: escrow.disputeReason,
    decryptedCredential,
    decryptedBuyerSwapKey,
    swapOfferedAssetNames,
    swapCashTopUp: escrow.swapOffer?.cashTopUp ?? null,
  };

  const auditLogs = escrow.auditLogs.map((l) => ({
    id: l.id,
    actorRole: l.actorRole,
    action: l.action,
    details: l.details,
    metadata: l.metadata,
    createdAtIso: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portfolio & Escrows
        </Link>
        <div className="font-mono text-[11px] text-zinc-500">
          ANTI-CIRCUMVENTION VAULT • DIRECT CHAT DISABLED
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272A] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Lock className="w-5 h-5 text-[#F59E0B]" />
            <h1 className="font-mono text-2xl font-bold text-zinc-50">
              {escrow.tradeCode} — {escrow.asset.name}
            </h1>
            <Badge
              variant={
                escrow.state === "SETTLED"
                  ? "emerald"
                  : escrow.state === "DISPUTED" || escrow.state === "REFUNDED"
                  ? "danger"
                  : "amber"
              }
              className="font-mono"
            >
              {escrow.state}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400">
            Custody Hook Atomic Deal Room • {escrow.type} • {escrow.asset.registrarOrPlatform}
          </p>
        </div>
      </div>

      <EscrowDealRoomClient
        escrow={dealData}
        auditLogs={auditLogs}
        viewerRole={viewerRole}
      />
    </div>
  );
}
