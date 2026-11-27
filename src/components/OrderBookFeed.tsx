"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowLeftRight,
  Search,
  Lock,
  Sparkles,
  Heart,
  TrendingUp,
  HelpCircle,
  X,
} from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { ThreeHeroCanvas } from "@/components/ThreeHeroCanvas";
import { cn, formatCurrency } from "@/lib/utils";

export interface FeedAsset {
  id: string;
  slug: string;
  name: string;
  category: string;
  subCategory: string;
  verificationMethod: string;
  verificationStatus: string;
  registrarOrPlatform: string;
  swapEnabled: boolean;
  lowestAsk: number | null;
  highestBid: number | null;
  lastSalePrice: number | null;
  floorDelta24h: number;
  sparklineData: string;
  status: string;
  openOrdersCount: number;
}

type TabKey = "ALL" | "AI" | "TECH" | "HANDLES" | "WEB3" | "SWAP" | "SAVED";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "AI", label: ".AI Domains" },
  { key: "TECH", label: "Tech Domains" },
  { key: "HANDLES", label: "Social Handles" },
  { key: "WEB3", label: "Web3 Names" },
  { key: "SWAP", label: "Open to Trades" },
];

export function OrderBookFeed({ assets }: { assets: FeedAsset[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"FEATURED" | "PRICE_ASC" | "PRICE_DESC">("FEATURED");
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cust0dy_saved_assets");
      if (raw) setSavedSlugs(JSON.parse(raw));
    } catch {
      // ignore storage errors
    }
  }, []);

  function toggleSave(e: React.MouseEvent, slug: string) {
    e.preventDefault();
    e.stopPropagation();
    setSavedSlugs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem("cust0dy_saved_assets", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = assets.filter((a) => {
      if (activeTab === "SAVED" && !savedSlugs.includes(a.slug)) return false;
      if (activeTab === "AI" && a.category !== "AI_DOMAIN") return false;
      if (activeTab === "TECH" && a.category !== "TECH_DOMAIN") return false;
      if (activeTab === "HANDLES" && a.category !== "SOCIAL_HANDLE") return false;
      if (activeTab === "WEB3" && !(a.category === "WEB3_NAME" || a.subCategory === "Telegram")) return false;
      if (activeTab === "SWAP" && !a.swapEnabled) return false;
      if (
        q &&
        !a.name.toLowerCase().includes(q) &&
        !a.subCategory.toLowerCase().includes(q) &&
        !a.registrarOrPlatform.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "PRICE_ASC") return (a.lowestAsk ?? 0) - (b.lowestAsk ?? 0);
      if (sortBy === "PRICE_DESC") return (b.lowestAsk ?? 0) - (a.lowestAsk ?? 0);
      return b.floorDelta24h - a.floorDelta24h;
    });
  }, [assets, activeTab, query, sortBy, savedSlugs]);

  return (
    <div className="space-y-8">
      {/* Search-First Consumer Hero with Seamless Three.js Ambient 3D Glass Sculptures */}
      <section className="relative rounded-3xl bg-gradient-to-b from-white via-[#FAFAFA] to-zinc-50/80 border border-zinc-200/70 px-4 py-12 sm:py-16 overflow-hidden">
        <ThreeHeroCanvas />
        <div className="relative z-10 text-center max-w-2xl mx-auto space-y-5">
          <div className="space-y-2.5">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Find your next iconic domain or handle.
            </h1>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
              Every listing is ownership-verified. Your payment stays protected with Cust0dy until the transfer is safely in your hands.
            </p>
          </div>

          {/* Big Inviting Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search domains or handles like agent.ai, @nexus, apex.eth..."
              className="w-full h-12 pl-11 pr-4 rounded-full bg-white/95 backdrop-blur border border-zinc-200 shadow-sm text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
            />
          </div>

          {/* Simple Trust Reassurance Row + Interactive How It Works Button */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              100% Verified Owners
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Protected Escrow Transfer
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              Buy, Offer, or Trade
            </span>
            <button
              type="button"
              onClick={() => setHowItWorksOpen(true)}
              className="inline-flex items-center gap-1 text-slate-900 font-medium underline underline-offset-4 hover:text-blue-600 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How it works
            </button>
          </div>
        </div>
      </section>

      {/* Clean Category Pills + Saved Filter + Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border cursor-pointer",
                  active
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-zinc-200 hover:border-zinc-300 hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveTab("SAVED")}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border cursor-pointer",
              activeTab === "SAVED"
                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                : "bg-white text-slate-600 border-zinc-200 hover:border-zinc-300 hover:text-slate-900"
            )}
          >
            <Heart className={cn("w-3 h-3", activeTab === "SAVED" ? "fill-white" : "text-rose-500")} />
            Saved ({savedSlugs.length})
          </button>
        </div>

        <select
          aria-label="Sort listings"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-9 rounded-full bg-white border border-zinc-200 px-3.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-900 cursor-pointer self-start sm:self-auto"
        >
          <option value="FEATURED">Sort: Popular</option>
          <option value="PRICE_ASC">Price: Low to High</option>
          <option value="PRICE_DESC">Price: High to Low</option>
        </select>
      </div>

      {/* Big Breathable Consumer Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((asset) => {
          const isSaved = savedSlugs.includes(asset.slug);
          return (
            <Link
              key={asset.id}
              href={`/asset/${asset.slug}`}
              className="group rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-xs hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between gap-5"
            >
              {/* Top Row: Category + Status + Save Heart */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge>{asset.subCategory}</Badge>
                  {asset.status === "IN_ESCROW" ? (
                    <Badge variant="amber">Transfer in Progress</Badge>
                  ) : asset.swapEnabled ? (
                    <Badge variant="blue">Open to Trades</Badge>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleSave(e, asset.slug)}
                  aria-label={isSaved ? "Remove from saved" : "Save listing"}
                  className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Heart
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isSaved ? "fill-rose-500 text-rose-500" : "text-slate-400 hover:text-rose-500"
                    )}
                  />
                </button>
              </div>

              {/* Centerpiece: Asset Name & Verified Owner */}
              <div className="space-y-1.5 py-1">
                <div className="text-2xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  {asset.name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium text-emerald-700">Verified Owner</span>
                  <span>•</span>
                  <span>{asset.registrarOrPlatform}</span>
                  {asset.floorDelta24h >= 5 && (
                    <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium ml-1">
                      <TrendingUp className="w-3 h-3" />+{asset.floorDelta24h.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Row: Price & Action */}
              <div className="pt-4 border-t border-zinc-100 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Buy Now</div>
                  <div className="text-lg font-bold text-slate-900">
                    {formatCurrency(asset.lowestAsk)}
                  </div>
                  {asset.highestBid && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Top offer:{" "}
                      <span className="font-medium text-emerald-700">
                        {formatCurrency(asset.highestBid)}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant={asset.status === "IN_ESCROW" ? "secondary" : "primary"}
                  size="sm"
                  className="pointer-events-none"
                >
                  {asset.status === "IN_ESCROW" ? "View Status" : "View & Buy"}
                </Button>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl bg-white border border-zinc-200 p-12 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-900">
              {activeTab === "SAVED" ? "No saved listings yet" : "No matching listings found"}
            </div>
            <p className="text-xs text-slate-500">
              {activeTab === "SAVED"
                ? "Tap the heart icon on any domain or handle to build your shortlist."
                : "Try clearing your search or switching to another category."}
            </p>
          </div>
        )}
      </div>

      {/* Interactive "How Cust0dy Works" Modal */}
      {howItWorksOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-zinc-200 shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">How Cust0dy Protects Every Deal</h2>
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Your payment stays safe</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When you click Buy Now or agree on a trade, Cust0dy holds your payment safely so the seller never gets paid early.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <div className="font-semibold text-slate-900">We verify the transfer automatically</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    The seller has 24 hours to hand over transfer access. Cust0dy encrypts and verifies it before releasing anything.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Confirm &amp; complete — or 100% refund</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Once you confirm you received the domain or handle, the seller gets paid. If they miss the 24h window, you get a 100% automatic refund.
                  </p>
                </div>
              </div>
            </div>
            <Button variant="primary" className="w-full" onClick={() => setHowItWorksOpen(false)}>
              Got it, start browsing
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
