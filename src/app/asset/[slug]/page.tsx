import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  ArrowLeftRight,
  Lock,
  Fingerprint,
  Clock,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Badge, TerminalCard } from "@/components/ui/primitives";
import { DepthChart } from "@/components/DepthChart";
import { SparklineChart } from "@/components/SparklineChart";
import { TradeActionPanel } from "@/components/TradeActionPanel";
import { formatCategoryLabel, formatCurrency, parseSparkline } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [asset, currentUser] = await Promise.all([
    prisma.asset.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, alias: true } },
        orders: {
          orderBy: { price: "desc" },
          include: { user: { select: { alias: true } } },
        },
        escrows: {
          where: {
            state: { in: ["FUNDS_LOCKED", "CUSTODY_HANDOVER", "VERIFICATION_RELEASE"] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!asset) notFound();

  const myVerifiedAssets = currentUser
    ? await prisma.asset.findMany({
        where: {
          ownerId: currentUser.id,
          verificationStatus: "VERIFIED",
          status: "ACTIVE",
          id: { not: asset.id },
        },
        select: { id: true, name: true, subCategory: true, lowestAsk: true },
      })
    : [];

  const openAsks = asset.orders
    .filter((o) => o.side === "ASK" && o.status === "OPEN")
    .sort((a, b) => a.price - b.price);
  const openBids = asset.orders
    .filter((o) => o.side === "BID" && o.status === "OPEN")
    .sort((a, b) => b.price - a.price);
  const filledTrades = asset.orders
    .filter((o) => o.status === "FILLED")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const spread =
    asset.lowestAsk && asset.highestBid
      ? asset.lowestAsk - asset.highestBid
      : null;
  const spark = parseSparkline(asset.sparklineData);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Live Order Book
        </Link>
        <div className="font-mono text-[11px] text-zinc-500">
          BLIND COUNTERPARTY • OWNER DESK: <span className="text-zinc-300">{asset.owner.alias}</span>
        </div>
      </div>

      {/* Asset Title & Verified Proof Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#27272A] pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-mono text-2xl sm:text-3xl font-bold text-zinc-50">
              {asset.name}
            </h1>
            <Badge className="font-mono">{formatCategoryLabel(asset.category)}</Badge>
            <Badge variant="emerald">
              <ShieldCheck className="w-3 h-3" />
              {asset.verificationMethod === "DNS_TXT" ? "DNS Verified" : "Bio Hash Verified"}
            </Badge>
            {asset.swapEnabled && (
              <Badge variant="blue">
                <ArrowLeftRight className="w-3 h-3" />
                Swap-Enabled
              </Badge>
            )}
            {asset.status === "IN_ESCROW" && (
              <Badge variant="amber">
                <Lock className="w-3 h-3" />
                IN ESCROW
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-400 max-w-2xl">{asset.description}</p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Fingerprint className="w-3.5 h-3.5 text-[#10B981]" />
              PROOF: <span className="text-zinc-300">{asset.verificationCode}</span>
            </span>
            <span>CUSTODIAN / PLATFORM: <span className="text-zinc-300">{asset.registrarOrPlatform}</span></span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="rounded-md bg-[#121215] border border-[#27272A] px-3.5 py-2.5">
            <div className="font-mono text-[10px] uppercase text-zinc-500">Lowest Ask</div>
            <div className="font-mono text-lg font-bold text-zinc-50 mt-0.5">
              {formatCurrency(asset.lowestAsk)}
            </div>
          </div>
          <div className="rounded-md bg-[#121215] border border-[#27272A] px-3.5 py-2.5">
            <div className="font-mono text-[10px] uppercase text-zinc-500">Highest Bid</div>
            <div className="font-mono text-lg font-bold text-[#10B981] mt-0.5">
              {formatCurrency(asset.highestBid)}
            </div>
          </div>
          <div className="rounded-md bg-[#121215] border border-[#27272A] px-3.5 py-2.5">
            <div className="font-mono text-[10px] uppercase text-zinc-500">Last Sale</div>
            <div className="font-mono text-lg font-bold text-zinc-300 mt-0.5">
              {formatCurrency(asset.lastSalePrice)}
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Col Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Columns: Depth Chart + Order Book Ladder + Trade History */}
        <div className="lg:col-span-8 space-y-5">
          {/* Bid/Ask Depth Chart */}
          <TerminalCard className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                  Live Bid / Ask Liquidity Depth
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Real-time blind order-book depth across USD & USDC rails
                </p>
              </div>
              {spread !== null && (
                <div className="font-mono text-xs text-zinc-400">
                  SPREAD: <span className="text-zinc-100 font-semibold">{formatCurrency(spread)}</span>
                </div>
              )}
            </div>
            <DepthChart bids={openBids} asks={openAsks} />
          </TerminalCard>

          {/* Two-Column Order Book Ladder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TerminalCard className="p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#10B981] font-semibold">
                  Live Bids ({openBids.length})
                </span>
                <span className="font-mono text-[10px] text-zinc-500">DESK / RAIL</span>
              </div>
              <div className="space-y-1.5">
                {openBids.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#10B981]/5 border border-[#10B981]/15 font-mono text-xs"
                  >
                    <span className="font-semibold text-[#10B981]">
                      {formatCurrency(bid.price, bid.currency)}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {bid.user.alias} • {bid.currency}
                    </span>
                  </div>
                ))}
                {openBids.length === 0 && (
                  <p className="text-xs text-zinc-500 py-4 text-center">No active bids yet.</p>
                )}
              </div>
            </TerminalCard>

            <TerminalCard className="p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#F87171] font-semibold">
                  Active Asks ({openAsks.length})
                </span>
                <span className="font-mono text-[10px] text-zinc-500">DESK / RAIL</span>
              </div>
              <div className="space-y-1.5">
                {openAsks.map((ask) => (
                  <div
                    key={ask.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#EF4444]/5 border border-[#EF4444]/15 font-mono text-xs"
                  >
                    <span className="font-semibold text-[#F87171]">
                      {formatCurrency(ask.price, ask.currency)}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {ask.user.alias} • {ask.currency}
                    </span>
                  </div>
                ))}
                {openAsks.length === 0 && (
                  <p className="text-xs text-zinc-500 py-4 text-center">No active asks listed.</p>
                )}
              </div>
            </TerminalCard>
          </div>

          {/* 7-Day Floor Trajectory + Recent Verified Trade History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TerminalCard className="p-4 space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                7-Day Floor Valuation Trend
              </div>
              <SparklineChart
                data={spark}
                positive={asset.floorDelta24h >= 0}
                height={76}
              />
            </TerminalCard>

            <TerminalCard className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  Recent Verified Executions
                </span>
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="space-y-1.5">
                {filledTrades.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-xs font-mono py-1 border-b border-[#27272A]/60 last:border-0"
                  >
                    <span className="text-zinc-100 font-semibold">
                      {formatCurrency(t.price, t.currency)}
                    </span>
                    <span className="text-zinc-500">{t.user.alias}</span>
                    <span className="text-[#10B981] text-[10px]">SETTLED</span>
                  </div>
                ))}
                {filledTrades.length === 0 && (
                  <p className="text-xs text-zinc-500 py-2">First listing — no historical fills yet.</p>
                )}
              </div>
            </TerminalCard>
          </div>
        </div>

        {/* Right 4 Columns: Two-Sided Action Panel */}
        <div className="lg:col-span-4 lg:sticky lg:top-20">
          <TradeActionPanel
            assetId={asset.id}
            assetName={asset.name}
            lowestAsk={asset.lowestAsk}
            highestBid={asset.highestBid}
            swapEnabled={asset.swapEnabled}
            isOwner={currentUser?.id === asset.ownerId}
            inEscrow={asset.status === "IN_ESCROW"}
            activeEscrowId={asset.escrows[0]?.id ?? null}
            myVerifiedAssets={myVerifiedAssets}
          />
        </div>
      </div>
    </div>
  );
}
