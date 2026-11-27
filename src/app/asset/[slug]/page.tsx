import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Badge, TerminalCard } from "@/components/ui/primitives";
import { TradeActionPanel } from "@/components/TradeActionPanel";
import { ThreeAssetShowcase } from "@/components/ThreeAssetShowcase";
import { formatCurrency } from "@/lib/utils";

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

  const openBids = asset.orders
    .filter((o) => o.side === "BID" && o.status === "OPEN")
    .sort((a, b) => b.price - a.price);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Explore
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Interactive 3D Collectible Card + Listing Details */}
        <div className="lg:col-span-7 space-y-6">
          <ThreeAssetShowcase
            name={asset.name}
            subCategory={asset.subCategory}
            platform={asset.registrarOrPlatform}
            priceLabel={formatCurrency(asset.lowestAsk)}
          />

          <TerminalCard className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>{asset.subCategory}</Badge>
              <Badge variant="emerald">
                <CheckCircle2 className="w-3 h-3" />
                Verified Owner
              </Badge>
              {asset.swapEnabled && <Badge variant="blue">Open to Trades</Badge>}
              {asset.status === "IN_ESCROW" && (
                <Badge variant="amber">
                  <Lock className="w-3 h-3" />
                  Transfer in Progress
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                {asset.name}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">{asset.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-100">
              <div>
                <div className="text-xs text-slate-400">Buy Now</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">
                  {formatCurrency(asset.lowestAsk)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Top Offer</div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">
                  {formatCurrency(asset.highestBid)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Last Sale</div>
                <div className="text-xl font-semibold text-slate-600 mt-0.5">
                  {formatCurrency(asset.lastSalePrice)}
                </div>
              </div>
            </div>
          </TerminalCard>

          {/* How Safe Transfer Works for this item */}
          <TerminalCard className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              How Safe Transfer works
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div>
                <div className="font-semibold text-slate-900 mb-1">1. Payment protected</div>
                Your funds are held safely by Cust0dy — the seller never gets paid until you receive the asset.
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">2. Verified handover</div>
                We verify the transfer from {asset.registrarOrPlatform} automatically before releasing credentials.
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">3. 24h guarantee</div>
                If the seller fails to deliver within 24 hours, you receive an automatic 100% refund.
              </div>
            </div>

            {/* Optional Technical Verification Proof */}
            <details className="pt-3 border-t border-zinc-100 text-xs">
              <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-900">
                Security &amp; ownership verification details
              </summary>
              <div className="mt-3 rounded-xl bg-zinc-50 border border-zinc-200/70 p-3.5 space-y-1 font-mono text-[11px] text-slate-600">
                <div>Platform / Registrar: {asset.registrarOrPlatform}</div>
                <div>Verification Method: {asset.verificationMethod}</div>
                <div>Ownership Proof: {asset.verificationCode}</div>
                <div>Recent Active Offers: {openBids.length}</div>
              </div>
            </details>
          </TerminalCard>
        </div>

        {/* Right 5 Cols: Checkout / Offer / Trade Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
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
