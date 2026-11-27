import Link from "next/link";
import { ShieldCheck, Lock, ArrowLeftRight, PlusCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { OrderBookFeed, type FeedAsset } from "@/components/OrderBookFeed";
import { Button, TerminalCard } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";

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
  const swapEnabledCount = assets.filter((a) => a.swapEnabled).length;
  const totalBookLiquidity = assets.reduce((sum, a) => sum + (a.lowestAsk ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Compact Terminal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#27272A] pb-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-50">
            Live Order-Book & Automated Custody
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Blind order-book matching and AES-256-GCM programmatic escrow for hype{" "}
            <span className="font-mono text-zinc-200">.ai / .xyz / .io / .com</span> domains and OG{" "}
            <span className="font-mono text-zinc-200">X / Telegram / ENS / .sol</span> handles. Zero direct contact before funds lock.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/list">
            <Button variant="primary" size="md">
              <PlusCircle className="w-3.5 h-3.5" />
              Verify & List Asset
            </Button>
          </Link>
          {escrows[0] && (
            <Link href={`/escrow/${escrows[0].id}`}>
              <Button variant="secondary" size="md">
                <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
                Inspect Live Escrow
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Market KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TerminalCard className="p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-zinc-500">
            <span>Listed Book Value</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
          <div className="font-mono text-xl font-bold text-zinc-50 mt-1.5">
            {formatCurrency(totalBookLiquidity)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {assets.length} DNS & Bio verified assets
          </div>
        </TerminalCard>

        <TerminalCard className="p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-zinc-500">
            <span>Active Custody Vault</span>
            <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
          <div className="font-mono text-xl font-bold text-[#F59E0B] mt-1.5">
            {formatCurrency(totalEscrowLocked)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {escrows.length} live deal room{escrows.length === 1 ? "" : "s"} in progress
          </div>
        </TerminalCard>

        <TerminalCard className="p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-zinc-500">
            <span>Swap-Enabled Pool</span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#3B82F6]" />
          </div>
          <div className="font-mono text-xl font-bold text-zinc-50 mt-1.5">
            {swapEnabledCount} / {assets.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Atomic multi-asset + USDC barter ready
          </div>
        </TerminalCard>

        <TerminalCard className="p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-zinc-500">
            <span>Settlement SLA</span>
            <span className="font-mono text-[10px] text-[#10B981]">7.5% TAKE</span>
          </div>
          <div className="font-mono text-xl font-bold text-[#10B981] mt-1.5">
            24h / 12h
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Seller handover SLA • Auto-refund guard
          </div>
        </TerminalCard>
      </div>

      {/* Main Filterable Order Book */}
      <OrderBookFeed assets={feedAssets} />
    </div>
  );
}
