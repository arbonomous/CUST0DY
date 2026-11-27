"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const PayoutSchema = z.object({
  usdcPayoutAddress: z.string().max(120).optional(),
  stripeOnboarded: z.boolean().optional(),
});

export async function updatePayoutSettingsAction(input: z.infer<typeof PayoutSchema>) {
  const parsed = PayoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid payout settings." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not authenticated." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      usdcPayoutAddress: parsed.data.usdcPayoutAddress ?? user.usdcPayoutAddress,
      stripeOnboarded: parsed.data.stripeOnboarded ?? user.stripeOnboarded,
      stripeConnectId:
        parsed.data.stripeOnboarded && !user.stripeConnectId
          ? `acct_1Cust0dy${user.alias.replace(/[^A-Z0-9]/g, "")}`
          : user.stripeConnectId,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true as const };
}
