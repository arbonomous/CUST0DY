"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeftRight,
  Search,
  LayoutGrid,
  List,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
} from "lucide-react";
import { Badge, Button, Input, TerminalCard } from "@/components/ui/primitives";
import { SparklineChart } from "@/components/SparklineChart";
import { cn, formatCurrency, parseSparkline } from "@/lib/utils";

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

type TabKey = "ALL" | "DOMAINS" | "HANDLES" | "WEB3" | "SWAP";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All Assets" },
  { key: "DOMAINS", label: ".AI & Tech Domains" },
  { key: "HANDLES", label: "Social Handles" },
  { key: "WEB3", label: "Web3 Names" },
  { key: "SWAP", label: "Open to Swaps" },
];

export function OrderBookFeed({ assets }: { assets: FeedAsset[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"ASK_DESC" | "ASK_ASC" | "DELTA_DESC">("ASK_DESC");
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("GRID");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = assets.filter((a) => {
      if (activeTab === "DOMAINS" && !["AI_DOMAIN", "TECH_DOMAIN"].includes(a.category)) {
        return false;
      }
      if (activeTab === "HANDLES" && a.category !== "SOCIAL_HANDLE") {
        return false;
      }
      if (
        activeTab === "WEB3" &&
        !(a.category === "WEB3_NAME" || a.subCategory === "Telegram")
      ) {
        return false;
      }
      if (activeTab === "SWAP" && !a.swapEnabled) {
        return false;
      }
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
      if (sortBy === "ASK_ASC") return (a.lowestAsk ?? 0) - (b.lowestAsk ?? 0);
      if (sortBy === "DELTA_DESC") return b.floorDelta24h - a.floorDelta24h;
      return (b.lowestAsk ?? 0) - (a.lowestAsk ?? 0);
    });
  }, [assets, activeTab, query, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filter Tabs + Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer",
                  active
                    ? "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/40"
                    : "bg-[#121215] text-zinc-400 border-[#27272A] hover:text-zinc-100 hover:border-zinc-600"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter agent.ai, @nexus..."
              className="pl-8 h-8 text-xs font-mono"
            />
          </div>

          <select
            aria-label="Sort assets"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-8 rounded-md bg-[#121215] border border-[#27272A] px-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#3B82F6]"
          >
            <option value="ASK_DESC">Ask: High → Low</option>
            <option value="ASK_ASC">Ask: Low → High</option>
            <option value="DELTA_DESC">24h Momentum</option>
          </select>

          <div className="flex items-center rounded-md bg-[#121215] border border-[#27272A] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              aria-label="Table view"
              className={cn(
                "p-1.5 rounded cursor-pointer",
                viewMode === "TABLE" ? "bg-[#27272A] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              aria-label="Grid view"
              className={cn(
                "p-1.5 rounded cursor-pointer",
                viewMode === "GRID" ? "bg-[#27272A] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table View (Default Terminal Order Book) */}
      {viewMode === "TABLE" ? (
        <TerminalCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#0D0D10] font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="py-2.5 px-4">Asset / Proof</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Lowest Ask</th>
                  <th className="py-2.5 px-3 text-right">Highest Bid</th>
                  <th className="py-2.5 px-3 text-right">Last Sale</th>
                  <th className="py-2.5 px-3 text-right">7D Floor</th>
                  <th className="py-2.5 px-4 text-right">Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/70 text-xs">
                {filtered.map((asset) => {
                  const spark = parseSparkline(asset.sparklineData);
                  const positive = asset.floorDelta24h >= 0;
                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-[#18181C]/70 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/asset/${asset.slug}`}
                                className="font-mono text-sm font-semibold text-zinc-50 group-hover:text-[#60A5FA] transition-colors"
                              >
                                {asset.name}
                              </Link>
                              {asset.status === "IN_ESCROW" && (
                                <Badge variant="amber" className="font-mono text-[10px]">
                                  <Lock className="w-2.5 h-2.5" />
                                  IN ESCROW
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#10B981]">
                                <ShieldCheck className="w-3 h-3" />
                                {asset.verificationMethod === "DNS_TXT"
                                  ? "DNS Verified"
                                  : "Bio Hash Verified"}
                              </span>
                              <span className="text-zinc-600">•</span>
                              <span className="text-[11px] text-zinc-500">
                                {asset.registrarOrPlatform}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="font-mono">{asset.subCategory}</Badge>
                          {asset.swapEnabled && (
                            <Badge variant="blue" className="font-mono text-[10px]">
                              <ArrowLeftRight className="w-2.5 h-2.5" />
                              SWAP
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-100">
                        {formatCurrency(asset.lowestAsk)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-[#10B981]">
                        {formatCurrency(asset.highestBid)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-zinc-400">
                        {formatCurrency(asset.lastSalePrice)}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-20">
                            <SparklineChart data={spark} positive={positive} height={28} />
                          </div>
                          <span
                            className={cn(
                              "font-mono text-[11px] font-medium w-14 text-right inline-flex items-center justify-end",
                              positive ? "text-[#10B981]" : "text-[#EF4444]"
                            )}
                          >
                            {positive ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {Math.abs(asset.floorDelta24h).toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link href={`/asset/${asset.slug}`}>
                          <Button
                            size="sm"
                            variant={asset.status === "IN_ESCROW" ? "secondary" : "primary"}
                          >
                            {asset.swapEnabled ? "Trade / Swap" : "Trade"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 text-xs">
                      No verified assets match your current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TerminalCard>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((asset) => {
            const spark = parseSparkline(asset.sparklineData);
            const positive = asset.floorDelta24h >= 0;
            return (
              <TerminalCard
                key={asset.id}
                className="p-4 hover:border-zinc-600 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/asset/${asset.slug}`}
                        className="font-mono text-base font-bold text-zinc-50 hover:text-[#60A5FA]"
                      >
                        {asset.name}
                      </Link>
                      <Badge className="font-mono">{asset.subCategory}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#10B981]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {asset.verificationMethod === "DNS_TXT"
                        ? "DNS Verified"
                        : "Bio Hash Verified"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {asset.swapEnabled && (
                      <Badge variant="blue" className="font-mono text-[10px]">
                        <ArrowLeftRight className="w-2.5 h-2.5" />
                        SWAP
                      </Badge>
                    )}
                    {asset.status === "IN_ESCROW" && (
                      <Badge variant="amber" className="font-mono text-[10px]">
                        IN ESCROW
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="h-10">
                  <SparklineChart data={spark} positive={positive} height={40} />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272A]">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-zinc-500">Lowest Ask</div>
                    <div className="font-mono text-sm font-semibold text-zinc-100 mt-0.5">
                      {formatCurrency(asset.lowestAsk)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-zinc-500">High Bid</div>
                    <div className="font-mono text-sm font-semibold text-[#10B981] mt-0.5">
                      {formatCurrency(asset.highestBid)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-zinc-500">Last Sale</div>
                    <div className="font-mono text-sm text-zinc-400 mt-0.5">
                      {formatCurrency(asset.lastSalePrice)}
                    </div>
                  </div>
                </div>

                <Link href={`/asset/${asset.slug}`} className="w-full">
                  <Button variant="primary" className="w-full">
                    {asset.swapEnabled ? "Trade / Propose Swap" : "Open Order Book"}
                  </Button>
                </Link>
              </TerminalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
