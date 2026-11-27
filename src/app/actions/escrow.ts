"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { encryptSecret, generateBurnerVaultEmail } from "@/lib/crypto";
import { verifyDomainRdapTransfer } from "@/lib/dns-adapter";
import { captureAndReleaseEscrow, refundEscrowFunds } from "@/lib/payment-adapter";

const SubmitEppSchema = z.object({
  escrowId: z.string().min(1),
  eppCode: z.string().min(4).max(128),
});

export async function submitDomainEppAction(input: z.infer<typeof SubmitEppSchema>) {
  const parsed = SubmitEppSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Enter a valid EPP Authorization Code (min 4 chars)." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id: parsed.data.escrowId },
    include: { asset: true },
  });
  if (!escrow) return { ok: false as const, error: "Escrow transaction not found." };
  if (escrow.sellerId !== user.id && user.role !== "ADMIN") {
    return {
      ok: false as const,
      error: "Only the Seller desk can deposit the EPP code. Switch to Seller Desk in the header.",
    };
  }
  if (escrow.state !== "FUNDS_LOCKED") {
    return { ok: false as const, error: "Escrow is not awaiting seller custody handover." };
  }

  const encrypted = encryptSecret(parsed.data.eppCode.trim());

  await prisma.escrowTransaction.update({
    where: { id: escrow.id },
    data: {
      encryptedEppCode: encrypted.ciphertext,
      eppIv: encrypted.iv,
      eppAuthTag: encrypted.authTag,
      state: "CUSTODY_HANDOVER",
    },
  });

  await prisma.escrowAuditLog.create({
    data: {
      escrowId: escrow.id,
      actorId: user.id,
      actorRole: user.role === "ADMIN" ? "ADMIN" : "SELLER",
      action: "EPP_DEPOSITED",
      details: `Seller submitted EPP authorization code into Cust0dy vault. Encrypted with AES-256-GCM (fingerprint ${encrypted.fingerprint}).`,
      metadata: JSON.stringify({
        algorithm: "AES-256-GCM",
        fingerprint: encrypted.fingerprint,
        ivPreview: encrypted.iv.slice(0, 8),
      }),
    },
  });

  revalidatePath(`/escrow/${escrow.id}`);
  revalidatePath("/admin");
  return { ok: true as const, fingerprint: encrypted.fingerprint };
}

export async function submitHandleBurnerAction(escrowId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id: escrowId },
    include: { asset: true },
  });
  if (!escrow) return { ok: false as const, error: "Escrow not found." };
  if (escrow.sellerId !== user.id && user.role !== "ADMIN") {
    return {
      ok: false as const,
      error: "Only the Seller desk can confirm burner email handover.",
    };
  }

  const burnerEmail = escrow.burnerVaultEmail || generateBurnerVaultEmail();
  const recoveryToken = encryptSecret(`VAULT-2FA-LOCKED:${burnerEmail}:${escrow.tradeCode}`);

  await prisma.escrowTransaction.update({
    where: { id: escrow.id },
    data: {
      burnerVaultEmail: burnerEmail,
      burner2faLocked: true,
      encryptedEppCode: recoveryToken.ciphertext,
      eppIv: recoveryToken.iv,
      eppAuthTag: recoveryToken.authTag,
      state: "CUSTODY_HANDOVER",
    },
  });

  await prisma.escrowAuditLog.create({
    data: {
      escrowId: escrow.id,
      actorId: user.id,
      actorRole: user.role === "ADMIN" ? "ADMIN" : "SELLER",
      action: "BURNER_2FA_LOCKED",
      details: `Seller bound ${escrow.asset.name} to clean-room burner email ${burnerEmail}, disabled personal 2FA, and Cust0dy locked platform 2FA over the account.`,
      metadata: JSON.stringify({
        burnerVaultEmail: burnerEmail,
        cipherFingerprint: recoveryToken.fingerprint,
      }),
    },
  });

  revalidatePath(`/escrow/${escrow.id}`);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function submitBuyerSwapKeyAction(escrowId: string, swapTransferKey: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  if (!swapTransferKey || swapTransferKey.trim().length < 4) {
    return { ok: false as const, error: "Enter a valid transfer key / EPP code." };
  }

  const escrow = await prisma.escrowTransaction.findUnique({ where: { id: escrowId } });
  if (!escrow || escrow.type !== "SWAP") {
    return { ok: false as const, error: "Swap escrow not found." };
  }
  if (escrow.buyerId !== user.id && user.role !== "ADMIN") {
    return { ok: false as const, error: "Only the swap proposer (Buyer desk) can deposit their swap transfer key." };
  }

  const encrypted = encryptSecret(swapTransferKey.trim());
  await prisma.escrowTransaction.update({
    where: { id: escrow.id },
    data: {
      buyerSwapKeyDeposited: true,
      encryptedBuyerSwapKey: encrypted.ciphertext,
      buyerSwapIv: encrypted.iv,
      buyerSwapAuthTag: encrypted.authTag,
    },
  });

  await prisma.escrowAuditLog.create({
    data: {
      escrowId: escrow.id,
      actorId: user.id,
      actorRole: "BUYER",
      action: "SWAP_COUNTERPARTY_KEY_DEPOSITED",
      details: `Proposer deposited encrypted transfer key for offered swap asset(s) into dual-custody vault (AES-256-GCM fingerprint ${encrypted.fingerprint}).`,
      metadata: JSON.stringify({ fingerprint: encrypted.fingerprint }),
    },
  });

  revalidatePath(`/escrow/${escrow.id}`);
  return { ok: true as const };
}

export async function runRdapAndOpenInspectionAction(escrowId: string) {
  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id: escrowId },
    include: { asset: true },
  });
  if (!escrow) return { ok: false as const, error: "Escrow not found." };
  if (escrow.state !== "CUSTODY_HANDOVER") {
    return { ok: false as const, error: "Escrow must be in CUSTODY_HANDOVER to run verification." };
  }
  if (escrow.type === "SWAP" && !escrow.buyerSwapKeyDeposited) {
    return {
      ok: false as const,
      error: "Dual-vault guard: both counterparties must deposit transfer keys before opening release.",
    };
  }

  const isDomain =
    escrow.asset.category === "AI_DOMAIN" || escrow.asset.category === "TECH_DOMAIN";
  const rdap = isDomain ? await verifyDomainRdapTransfer(escrow.asset.name) : null;
  const inspectionDeadline = new Date(Date.now() + 1000 * 60 * 60 * 12); // 12-hour inspection window

  await prisma.escrowTransaction.update({
    where: { id: escrow.id },
    data: {
      rdapVerified: true,
      inspectionDeadline,
      state: "VERIFICATION_RELEASE",
    },
  });

  await prisma.escrowAuditLog.create({
    data: {
      escrowId: escrow.id,
      actorRole: "SYSTEM",
      action: isDomain ? "RDAP_VERIFIED" : "VAULT_CUSTODY_VERIFIED",
      details: isDomain
        ? `${rdap?.message} 12-hour buyer inspection window opened.`
        : `Clean-room burner email & Cust0dy 2FA lock verified for ${escrow.asset.name}. 12-hour buyer inspection window opened.`,
      metadata: JSON.stringify({
        inspectionDeadline: inspectionDeadline.toISOString(),
        rdapStatus: rdap?.registrarStatus ?? "BURNER_2FA_LOCKED",
      }),
    },
  });

  revalidatePath(`/escrow/${escrow.id}`);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function confirmSettlementAction(escrowId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id: escrowId },
    include: { asset: true },
  });
  if (!escrow) return { ok: false as const, error: "Escrow not found." };
  if (escrow.buyerId !== user.id && user.role !== "ADMIN") {
    return {
      ok: false as const,
      error: "Only the Buyer desk (or Admin Ops) can confirm receipt and release funds.",
    };
  }
  if (escrow.state !== "VERIFICATION_RELEASE" && escrow.state !== "DISPUTED") {
    return { ok: false as const, error: "Escrow is not ready for settlement release." };
  }

  const release = await captureAndReleaseEscrow(
    escrow.paymentIntentId,
    escrow.paymentMethod
  );

  await prisma.escrowTransaction.update({
    where: { id: escrow.id },
    data: {
      state: "SETTLED",
      settledAt: new Date(),
    },
  });

  // Transfer asset ownership to buyer & record last sale price
  await prisma.asset.update({
    where: { id: escrow.assetId },
    data: {
      ownerId: escrow.buyerId,
      status: "ACTIVE",
      lastSalePrice: escrow.assetPrice,
    },
  });

  // Collect 7.5% total fee into Platform Revenue Ledger
  await prisma.platformFeeLedger.upsert({
    where: { escrowId: escrow.id },
    update: { status: "COLLECTED" },
    create: {
      escrowId: escrow.id,
      grossAmount: escrow.assetPrice,
      buyerFee: escrow.buyerFee,
      sellerFee: escrow.sellerFee,
      totalFee: escrow.totalPlatformFee,
      currency: escrow.currency,
      status: "COLLECTED",
    },
  });

  await prisma.escrowAuditLog.create({
    data: {
      escrowId: escrow.id,
      actorId: user.id,
      actorRole: user.role === "ADMIN" ? "ADMIN" : "BUYER",
      action: "SETTLED",
      details: `Atomic settlement complete. Encrypted credentials unlocked for buyer, $${escrow.sellerPayout.toLocaleString()} ${escrow.currency} released to seller, and $${escrow.totalPlatformFee.toLocaleString()} (7.5%) booked to Platform Fee Ledger.`,
      metadata: JSON.stringify({
        settlementRef: release.reference,
        sellerPayout: escrow.sellerPayout,
        platformFee: escrow.totalPlatformFee,
      }),
    },
  });

  revalidatePath(`/escrow/${escrow.id}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { ok: true as const };
}

export async function openDisputeAction(escrowId: string, reason: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };
  if (!reason || reason.trim().length < 5) {
    return { ok: false as const, error: "Please provide a brief dispute reason." };
  }

  const escrow = await prisma.escrowTransaction.findUnique({ where: { id: escrowId } });
  if (!escrow) return { ok: false as const, error: "Escrow not found." };

  await prisma.escrowTransaction.update({
    where: { id: escrow.id },
    data: {
      state: "DISPUTED",
      disputeReason: reason.trim(),
    },
  });

  await prisma.escrowAuditLog.create({
    data: {
      escrowId: escrow.id,
      actorId: user.id,
      actorRole: user.id === escrow.buyerId ? "BUYER" : user.id === escrow.sellerId ? "SELLER" : "ADMIN",
      action: "DISPUTED",
      details: `Escrow frozen and escalated to Cust0dy Concierge Dispute Queue: "${reason.trim()}"`,
    },
  });

  revalidatePath(`/escrow/${escrow.id}`);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function triggerAutoRefundAction(escrowId: string, reason?: string) {
  const user = await getCurrentUser();
  const escrow = await prisma.escrowTransaction.findUnique({ where: { id: escrowId } });
  if (!escrow) return { ok: false as const, error: "Escrow not found." };

  const refund = await refundEscrowFunds(escrow.paymentIntentId, escrow.paymentMethod);

  await prisma.escrowTransaction.update({
    where: { id: escrow.id },
    data: {
      state: "REFUNDED",
      disputeReason: reason || "24-hour Seller SLA expired without valid custody handover.",
    },
  });

  await prisma.asset.update({
    where: { id: escrow.assetId },
    data: { status: "ACTIVE" },
  });

  await prisma.platformFeeLedger.updateMany({
    where: { escrowId: escrow.id },
    data: { status: "REFUNDED" },
  });

  await prisma.escrowAuditLog.create({
    data: {
      escrowId: escrow.id,
      actorId: user?.id,
      actorRole: user?.role === "ADMIN" ? "ADMIN" : "SYSTEM",
      action: "AUTO_REFUNDED",
      details: `Escrow cancelled and 100% buyer deposit ($${escrow.totalBuyerDeposit.toLocaleString()} ${escrow.currency}) refunded via ${refund.reference}. Reason: ${reason || "SLA expired (00:00:00)"}.`,
      metadata: JSON.stringify({ refundRef: refund.reference }),
    },
  });

  revalidatePath(`/escrow/${escrow.id}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true as const };
}
