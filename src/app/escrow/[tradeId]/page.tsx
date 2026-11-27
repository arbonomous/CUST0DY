import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";
import { parseStringArray } from "@/lib/utils";
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
    eppCipherPreview: escrow.encryptedEppCode ? escrow.encryptedEppCode.slice(0, 14).toUpperCase() : null,
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to My Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Safe Transfer: {escrow.asset.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Protected by Cust0dy Escrow • {escrow.asset.registrarOrPlatform}
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
