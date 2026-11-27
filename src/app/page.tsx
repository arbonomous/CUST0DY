import { prisma } from "@/lib/prisma";
import { OrderBookFeed, type FeedAsset } from "@/components/OrderBookFeed";
import { ThreeVaultHero } from "@/components/ThreeVaultHero";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [assets, escrows] = await Promise.all([
    prisma.asset.findMany({
      where: { verificationStatus: "VERIFIED" },
      orderBy: { lowestAsk: "desc" },
      include: {
        _count: { select: { orders: { where: { status: "OPEN" } } } },
      },
    }),
    prisma.escrowTransaction.findMany({
      where: {
        state: { in: ["FUNDS_LOCKED", "CUSTODY_HANDOVER", "VERIFICATION_RELEASE"] },
      },
      include: { asset: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const feedAssets: FeedAsset[] = assets.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    category: a.category,
    subCategory: a.subCategory,
    verificationMethod: a.verificationMethod,
    verificationStatus: a.verificationStatus,
    registrarOrPlatform: a.registrarOrPlatform,
    swapEnabled: a.swapEnabled,
    lowestAsk: a.lowestAsk,
    highestBid: a.highestBid,
    lastSalePrice: a.lastSalePrice,
    floorDelta24h: a.floorDelta24h,
    sparklineData: a.sparklineData,
    status: a.status,
    openOrdersCount: a._count.orders,
  }));

  const totalEscrowLocked = escrows.reduce((sum, e) => sum + e.totalBuyerDeposit, 0);

  return (
    <div className="space-y-8">
      {/* Interactive Three.js 3D Custody Vault Hero */}
      <ThreeVaultHero
        totalAssets={assets.length}
        activeEscrowCount={escrows.length}
        totalEscrowLocked={totalEscrowLocked}
        firstEscrowId={escrows[0]?.id ?? null}
      />

      {/* Marketplace Discovery Section */}
      <section id="marketplace" className="space-y-4 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">
              Verified Marketplace
            </h2>
            <p className="text-xs text-zinc-400">
              Click any domain or handle to buy instantly, make a blind offer, or propose a multi-asset swap.
            </p>
          </div>
          <span className="font-mono text-xs text-zinc-500">
            Showing {assets.length} verified listings
          </span>
        </div>

        <OrderBookFeed assets={feedAssets} />
      </section>
    </div>
  );
}
