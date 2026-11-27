"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  generateBioVerificationCode,
  generateDnsVerificationCode,
} from "@/lib/crypto";
import { slugifyAsset } from "@/lib/utils";

export async function generateChallengeAction(type: "DOMAIN" | "HANDLE") {
  const code =
    type === "DOMAIN"
      ? generateDnsVerificationCode()
      : generateBioVerificationCode();
  return { ok: true as const, code };
}

const PublishAssetSchema = z.object({
  type: z.enum(["DOMAIN", "HANDLE"]),
  name: z.string().min(2).max(64),
  subCategory: z.string().min(1).max(20),
  registrarOrPlatform: z.string().min(2).max(40),
  description: z.string().min(10).max(500),
  verificationCode: z.string().min(4),
  askPrice: z.number().positive().max(10_000_000),
  swapEnabled: z.boolean().default(true),
});

export async function publishVerifiedAssetAction(
  input: z.infer<typeof PublishAssetSchema>
) {
  const parsed = PublishAssetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "Please fill all required listing fields with valid values.",
    };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in to list an asset." };

  const cleanName =
    parsed.data.type === "HANDLE" && !parsed.data.name.startsWith("@") && !parsed.data.name.includes(".")
      ? `@${parsed.data.name.trim()}`
      : parsed.data.name.trim().toLowerCase();

  const existing = await prisma.asset.findUnique({ where: { name: cleanName } });
  if (existing) {
    return {
      ok: false as const,
      error: `${cleanName} is already listed in the Cust0dy registry.`,
    };
  }

  let category = "TECH_DOMAIN";
  if (parsed.data.type === "DOMAIN") {
    category = parsed.data.subCategory === ".ai" ? "AI_DOMAIN" : "TECH_DOMAIN";
  } else {
    category = ["ENS", ".sol", "Farcaster"].includes(parsed.data.subCategory)
      ? "WEB3_NAME"
      : "SOCIAL_HANDLE";
  }

  const slug = slugifyAsset(cleanName);
  const basePrice = parsed.data.askPrice;
  const sparkline = JSON.stringify([
    { t: "D-6", p: Math.round(basePrice * 0.91) },
    { t: "D-5", p: Math.round(basePrice * 0.93) },
    { t: "D-4", p: Math.round(basePrice * 0.92) },
    { t: "D-3", p: Math.round(basePrice * 0.95) },
    { t: "D-2", p: Math.round(basePrice * 0.97) },
    { t: "D-1", p: Math.round(basePrice * 0.99) },
    { t: "NOW", p: Math.round(basePrice) },
  ]);

  const asset = await prisma.asset.create({
    data: {
      slug,
      name: cleanName,
      category,
      subCategory: parsed.data.subCategory,
      description: parsed.data.description,
      ownerId: user.id,
      verificationMethod: parsed.data.type === "DOMAIN" ? "DNS_TXT" : "BIO_HASH",
      verificationCode: parsed.data.verificationCode,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      registrarOrPlatform: parsed.data.registrarOrPlatform,
      swapEnabled: parsed.data.swapEnabled,
      lowestAsk: basePrice,
      highestBid: Math.round(basePrice * 0.85),
      lastSalePrice: null,
      floorDelta24h: 0,
      sparklineData: sparkline,
      status: "ACTIVE",
    },
  });

  await prisma.order.create({
    data: {
      assetId: asset.id,
      userId: user.id,
      side: "ASK",
      price: basePrice,
      currency: "USD",
      status: "OPEN",
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");

  return { ok: true as const, slug: asset.slug, assetId: asset.id };
}
