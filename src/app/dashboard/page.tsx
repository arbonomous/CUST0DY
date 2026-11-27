import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parseStringArray } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        Please select or authenticate a trading desk in the header.
      </div>
    );
  }

  const [escrows, inventory, bids, rawSwaps, allAssets] = await Promise.all([
    prisma.escrowTransaction.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      include: { asset: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.asset.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { userId: user.id, side: "BID" },
      include: { asset: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.swapOffer.findMany({
      where: { OR: [{ proposerId: user.id }, { receiverId: user.id }] },
      include: {
        targetAsset: { select: { name: true } },
        proposer: { select: { alias: true } },
        receiver: { select: { alias: true } },
        escrow: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.asset.findMany({ select: { id: true, name: true } }),
  ]);

  const assetNameMap = new Map(allAssets.map((a) => [a.id, a.name]));

  const swaps = rawSwaps.map((s) => {
    const offeredIds = parseStringArray(s.offeredAssetIds);
    const direction: "INCOMING" | "OUTGOING" =
      s.receiverId === user.id ? "INCOMING" : "OUTGOING";
    return {
      id: s.id,
      direction,
      targetAssetName: s.targetAsset.name,
      offeredAssetNames: offeredIds.map((id) => assetNameMap.get(id) || "Verified Asset"),
      cashTopUp: s.cashTopUp,
      currency: s.currency,
      status: s.status,
      counterpartyAlias: direction === "INCOMING" ? s.proposer.alias : s.receiver.alias,
      note: s.note,
      escrowId: s.escrow?.id ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#27272A] pb-4">
        <div>
          <div className="font-mono text-[11px] uppercase text-[#10B981]">
            ACTIVE DESK • {user.alias}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 mt-0.5">
            Portfolio, Escrow Deals & Swap Inventory
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage verified inventory ready for one-click barter swaps, active custody deal rooms, and Stripe/USDC payout rails.
          </p>
        </div>

        <Link href="/list">
          <Button variant="primary">
            <PlusCircle className="w-3.5 h-3.5" />
            Verify New Asset
          </Button>
        </Link>
      </div>

      <DashboardClient
        user={{
          id: user.id,
          alias: user.alias,
          name: user.name,
          email: user.email,
          stripeConnectId: user.stripeConnectId,
          stripeOnboarded: user.stripeOnboarded,
          usdcPayoutAddress: user.usdcPayoutAddress,
        }}
        escrows={escrows.map((e) => ({
          id: e.id,
          tradeCode: e.tradeCode,
          type: e.type,
          state: e.state,
          assetName: e.asset.name,
          assetPrice: e.assetPrice,
          currency: e.currency,
          roleInTrade: e.buyerId === user.id ? "BUYER" : "SELLER",
          createdAtIso: e.createdAt.toISOString(),
        }))}
        inventory={inventory.map((a) => ({
          id: a.id,
          slug: a.slug,
          name: a.name,
          subCategory: a.subCategory,
          lowestAsk: a.lowestAsk,
          highestBid: a.highestBid,
          status: a.status,
          swapEnabled: a.swapEnabled,
        }))}
        bids={bids.map((b) => ({
          id: b.id,
          assetSlug: b.asset.slug,
          assetName: b.asset.name,
          price: b.price,
          currency: b.currency,
          status: b.status,
        }))}
        swaps={swaps}
      />
    </div>
  );
}
