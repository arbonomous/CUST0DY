import { prisma } from "@/lib/prisma";
import { OrderBookFeed, type FeedAsset } from "@/components/OrderBookFeed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const assets = await prisma.asset.findMany({
    where: { verificationStatus: "VERIFIED" },
    orderBy: { lowestAsk: "desc" },
    include: {
      _count: { select: { orders: { where: { status: "OPEN" } } } },
    },
  });

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

  return <OrderBookFeed assets={feedAssets} />;
}
