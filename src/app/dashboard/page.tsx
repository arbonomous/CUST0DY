import Link from "next/link";
import { Plus } from "lucide-react";
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
      <div className="py-16 text-center text-sm text-slate-500">
        Please sign in to view your orders.
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            My Orders &amp; Listings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track active transfers, respond to trade offers, and manage your payouts.
          </p>
        </div>

        <Link href="/list">
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            Sell an Asset
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
