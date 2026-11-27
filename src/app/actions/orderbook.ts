"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { calculateEscrowFees } from "@/lib/fees";
import { generateBurnerVaultEmail, generateTradeCode } from "@/lib/crypto";
import { lockEscrowFunds } from "@/lib/payment-adapter";

const PlaceBidSchema = z.object({
  assetId: z.string().min(1),
  price: z.number().positive().max(10_000_000),
  currency: z.enum(["USD", "USDC", "SOL"]).default("USD"),
});

export async function placeBidAction(input: z.infer<typeof PlaceBidSchema>) {
  const parsed = PlaceBidSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid bid parameters." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in to place a bid." };

  const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
  if (!asset) return { ok: false as const, error: "Asset not found." };
  if (asset.ownerId === user.id) {
    return { ok: false as const, error: "You cannot bid on your own listed asset." };
  }

  await prisma.order.create({
    data: {
      assetId: asset.id,
      userId: user.id,
      side: "BID",
      price: parsed.data.price,
      currency: parsed.data.currency,
      status: "OPEN",
    },
  });

  if (!asset.highestBid || parsed.data.price > asset.highestBid) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { highestBid: parsed.data.price },
    });
  }

  revalidatePath("/");
  revalidatePath(`/asset/${asset.slug}`);
  revalidatePath("/dashboard");

  return { ok: true as const };
}

const InstantBuySchema = z.object({
  assetId: z.string().min(1),
  paymentMethod: z.enum(["STRIPE", "USDC_ESCROW", "SOL_ESCROW"]).default("STRIPE"),
  currency: z.enum(["USD", "USDC", "SOL"]).default("USD"),
});

export async function instantBuyAction(input: z.infer<typeof InstantBuySchema>) {
  const parsed = InstantBuySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid instant buy request." };
  }

  const buyer = await getCurrentUser();
  if (!buyer) return { ok: false as const, error: "Please sign in to buy." };

  const asset = await prisma.asset.findUnique({
    where: { id: parsed.data.assetId },
    include: { owner: true },
  });

  if (!asset) return { ok: false as const, error: "Asset not found." };
  if (asset.status === "IN_ESCROW") {
    return { ok: false as const, error: "Asset is currently locked in active escrow." };
  }
  if (asset.ownerId === buyer.id) {
    return {
      ok: false as const,
      error: "You already own this asset. Switch to Buyer Desk in the header to test purchasing.",
    };
  }
  if (!asset.lowestAsk) {
    return { ok: false as const, error: "No active Ask price available for Instant Buy." };
  }

  const fees = calculateEscrowFees(asset.lowestAsk);
  const tradeCode = generateTradeCode();
  const paymentHold = await lockEscrowFunds({
    amount: fees.totalBuyerDeposit,
    currency: parsed.data.currency,
    paymentMethod: parsed.data.paymentMethod,
    tradeCode,
    buyerEmail: buyer.email,
  });

  const slaDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24-hour seller handover SLA
  const isHandle = asset.category === "SOCIAL_HANDLE" || asset.category === "WEB3_NAME";

  const escrow = await prisma.escrowTransaction.create({
    data: {
      tradeCode,
      type: "BUY_NOW",
      assetId: asset.id,
      buyerId: buyer.id,
      sellerId: asset.ownerId,
      ...fees,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod,
      paymentIntentId: paymentHold.paymentIntentId,
      state: "FUNDS_LOCKED",
      slaDeadline,
      burnerVaultEmail: isHandle ? generateBurnerVaultEmail() : null,
    },
  });

  await prisma.asset.update({
    where: { id: asset.id },
    data: { status: "IN_ESCROW" },
  });

  await prisma.escrowAuditLog.createMany({
    data: [
      {
        escrowId: escrow.id,
        actorId: buyer.id,
        actorRole: "BUYER",
        action: "FUNDS_LOCKED",
        details: `Buyer desk ${buyer.alias} locked $${fees.totalBuyerDeposit.toLocaleString()} ${parsed.data.currency} (incl. 2.5% buyer protection fee) via ${paymentHold.provider}.`,
        metadata: JSON.stringify({
          paymentIntentId: paymentHold.paymentIntentId,
          assetPrice: fees.assetPrice,
          buyerFee: fees.buyerFee,
        }),
      },
      {
        escrowId: escrow.id,
        actorRole: "SYSTEM",
        action: "SLA_STARTED",
        details: "24-hour seller custody handover countdown started. Counterparty personal identities remain masked.",
        metadata: JSON.stringify({ slaDeadline: slaDeadline.toISOString() }),
      },
    ],
  });

  await prisma.platformFeeLedger.create({
    data: {
      escrowId: escrow.id,
      grossAmount: fees.assetPrice,
      buyerFee: fees.buyerFee,
      sellerFee: fees.sellerFee,
      totalFee: fees.totalPlatformFee,
      currency: parsed.data.currency,
      status: "PENDING",
    },
  });

  revalidatePath("/");
  revalidatePath(`/asset/${asset.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { ok: true as const, tradeId: escrow.id, tradeCode: escrow.tradeCode };
}

const ProposeSwapSchema = z.object({
  targetAssetId: z.string().min(1),
  offeredAssetIds: z.array(z.string().min(1)).min(1).max(3),
  cashTopUp: z.number().min(0).max(5_000_000).default(0),
  currency: z.enum(["USD", "USDC", "SOL"]).default("USDC"),
  note: z.string().max(280).optional(),
});

export async function proposeSwapAction(input: z.infer<typeof ProposeSwapSchema>) {
  const parsed = ProposeSwapSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Select 1–3 verified assets to propose a swap." };
  }

  const proposer = await getCurrentUser();
  if (!proposer) return { ok: false as const, error: "Please sign in to propose a swap." };

  const targetAsset = await prisma.asset.findUnique({
    where: { id: parsed.data.targetAssetId },
  });
  if (!targetAsset) return { ok: false as const, error: "Target asset not found." };
  if (!targetAsset.swapEnabled) {
    return { ok: false as const, error: "This asset does not accept barter swaps." };
  }
  if (targetAsset.ownerId === proposer.id) {
    return { ok: false as const, error: "You cannot propose a swap on your own asset." };
  }

  const ownedAssets = await prisma.asset.findMany({
    where: {
      id: { in: parsed.data.offeredAssetIds },
      ownerId: proposer.id,
      verificationStatus: "VERIFIED",
    },
  });

  if (ownedAssets.length !== parsed.data.offeredAssetIds.length) {
    return { ok: false as const, error: "All offered assets must be verified assets in your inventory." };
  }

  await prisma.swapOffer.create({
    data: {
      targetAssetId: targetAsset.id,
      proposerId: proposer.id,
      receiverId: targetAsset.ownerId,
      offeredAssetIds: JSON.stringify(parsed.data.offeredAssetIds),
      cashTopUp: parsed.data.cashTopUp,
      currency: parsed.data.currency,
      note: parsed.data.note || null,
      status: "PENDING",
    },
  });

  revalidatePath(`/asset/${targetAsset.slug}`);
  revalidatePath("/dashboard");

  return { ok: true as const };
}

const RespondSwapSchema = z.object({
  swapOfferId: z.string().min(1),
  decision: z.enum(["ACCEPT", "REJECT"]),
});

export async function respondSwapAction(input: z.infer<typeof RespondSwapSchema>) {
  const parsed = RespondSwapSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid swap response." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const offer = await prisma.swapOffer.findUnique({
    where: { id: parsed.data.swapOfferId },
    include: { targetAsset: true, proposer: true },
  });

  if (!offer) return { ok: false as const, error: "Swap offer not found." };
  if (offer.receiverId !== user.id && user.role !== "ADMIN") {
    return { ok: false as const, error: "Only the asset owner can respond to this swap offer." };
  }
  if (offer.status !== "PENDING") {
    return { ok: false as const, error: "Swap offer is no longer pending." };
  }

  if (parsed.data.decision === "REJECT") {
    await prisma.swapOffer.update({
      where: { id: offer.id },
      data: { status: "REJECTED" },
    });
    revalidatePath("/dashboard");
    return { ok: true as const };
  }

  // ACCEPT -> Launch Atomic Dual-Custody Swap Escrow Deal Room
  const baseValuation = Math.max(offer.cashTopUp, offer.targetAsset.lowestAsk ?? 2500);
  const fees = calculateEscrowFees(baseValuation);
  const tradeCode = generateTradeCode();
  const slaDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24);
  const isHandle =
    offer.targetAsset.category === "SOCIAL_HANDLE" ||
    offer.targetAsset.category === "WEB3_NAME";

  const paymentHold = await lockEscrowFunds({
    amount: offer.cashTopUp > 0 ? offer.cashTopUp + fees.buyerFee : fees.buyerFee,
    currency: (offer.currency as "USD" | "USDC" | "SOL") || "USDC",
    paymentMethod: offer.currency === "USD" ? "STRIPE" : "USDC_ESCROW",
    tradeCode,
    buyerEmail: offer.proposer.email,
  });

  const escrow = await prisma.escrowTransaction.create({
    data: {
      tradeCode,
      type: "SWAP",
      assetId: offer.targetAssetId,
      swapOfferId: offer.id,
      buyerId: offer.proposerId,
      sellerId: offer.receiverId,
      ...fees,
      currency: offer.currency,
      paymentMethod: offer.currency === "USD" ? "STRIPE" : "USDC_ESCROW",
      paymentIntentId: paymentHold.paymentIntentId,
      state: "FUNDS_LOCKED",
      slaDeadline,
      burnerVaultEmail: isHandle ? generateBurnerVaultEmail() : null,
    },
  });

  await prisma.swapOffer.update({
    where: { id: offer.id },
    data: { status: "ACCEPTED" },
  });

  await prisma.asset.update({
    where: { id: offer.targetAssetId },
    data: { status: "IN_ESCROW" },
  });

  await prisma.escrowAuditLog.create({
    data: {
      escrowId: escrow.id,
      actorId: user.id,
      actorRole: "SELLER",
      action: "SWAP_ACCEPTED",
      details: `Multi-Asset Swap accepted. Dual-vault custody initiated: both counterparties must deposit encrypted transfer keys before atomic cross-release.`,
      metadata: JSON.stringify({
        swapOfferId: offer.id,
        cashTopUp: offer.cashTopUp,
        offeredAssetIds: offer.offeredAssetIds,
      }),
    },
  });

  await prisma.platformFeeLedger.create({
    data: {
      escrowId: escrow.id,
      grossAmount: fees.assetPrice,
      buyerFee: fees.buyerFee,
      sellerFee: fees.sellerFee,
      totalFee: fees.totalPlatformFee,
      currency: offer.currency,
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/admin");

  return { ok: true as const, tradeId: escrow.id };
}
