"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  ShieldCheck,
  ArrowLeftRight,
  Wallet,
  CheckCircle2,
  XCircle,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { Badge, Button, Input, TerminalCard } from "@/components/ui/primitives";
import { cn, formatCurrency } from "@/lib/utils";
import { respondSwapAction } from "@/app/actions/orderbook";
import { updatePayoutSettingsAction } from "@/app/actions/profile";

interface DashboardProps {
  user: {
    id: string;
    alias: string;
    name: string | null;
    email: string;
    stripeConnectId: string | null;
    stripeOnboarded: boolean;
    usdcPayoutAddress: string | null;
  };
  escrows: Array<{
    id: string;
    tradeCode: string;
    type: string;
    state: string;
    assetName: string;
    assetPrice: number;
    currency: string;
    roleInTrade: "BUYER" | "SELLER";
    createdAtIso: string;
  }>;
  inventory: Array<{
    id: string;
    slug: string;
    name: string;
    subCategory: string;
    lowestAsk: number | null;
    highestBid: number | null;
    status: string;
    swapEnabled: boolean;
  }>;
  bids: Array<{
    id: string;
    assetSlug: string;
    assetName: string;
    price: number;
    currency: string;
    status: string;
  }>;
  swaps: Array<{
    id: string;
    direction: "INCOMING" | "OUTGOING";
    targetAssetName: string;
    offeredAssetNames: string[];
    cashTopUp: number;
    currency: string;
    status: string;
    counterpartyAlias: string;
    note: string | null;
    escrowId: string | null;
  }>;
}

export function DashboardClient({
  user,
  escrows,
  inventory,
  bids,
  swaps,
}: DashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"ESCROWS" | "INVENTORY" | "BIDS" | "SWAPS" | "PAYOUTS">("ESCROWS");
  const [walletAddr, setWalletAddr] = useState(user.usdcPayoutAddress || "");
  const [stripeOnboarded, setStripeOnboarded] = useState(user.stripeOnboarded);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  function handleSwapResponse(swapOfferId: string, decision: "ACCEPT" | "REJECT") {
    setStatusMsg(null);
    startTransition(async () => {
      const res = await respondSwapAction({ swapOfferId, decision });
      if (!res.ok) {
        setStatusMsg(res.error);
        return;
      }
      if (decision === "ACCEPT" && res.tradeId) {
        router.push(`/escrow/${res.tradeId}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleSavePayouts(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);
    startTransition(async () => {
      const res = await updatePayoutSettingsAction({
        usdcPayoutAddress: walletAddr.trim(),
        stripeOnboarded,
      });
      if (res.ok) {
        setStatusMsg("Payout rails updated and saved to your desk profile.");
        router.refresh();
      }
    });
  }

  const tabs = [
    { key: "ESCROWS", label: `Active Escrows (${escrows.length})` },
    { key: "INVENTORY", label: `Verified Inventory (${inventory.length})` },
    { key: "SWAPS", label: `Swap Offers (${swaps.length})` },
    { key: "BIDS", label: `Live Bids (${bids.length})` },
    { key: "PAYOUTS", label: "Payout Settings" },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setStatusMsg(null);
            }}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors cursor-pointer",
              tab === t.key
                ? "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/40"
                : "bg-[#121215] text-zinc-400 border-[#27272A] hover:text-zinc-100"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {statusMsg && (
        <div className="rounded-md bg-[#10B981]/10 border border-[#10B981]/30 p-3 text-xs text-[#10B981]">
          {statusMsg}
        </div>
      )}

      {/* ESCROWS */}
      {tab === "ESCROWS" && (
        <TerminalCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#0D0D10] font-mono text-[10px] uppercase text-zinc-500">
                  <th className="py-2.5 px-4">Trade Code</th>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Desk Role</th>
                  <th className="py-2.5 px-3 text-right">Agreed Value</th>
                  <th className="py-2.5 px-3">Escrow State</th>
                  <th className="py-2.5 px-4 text-right">Deal Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/70">
                {escrows.map((e) => (
                  <tr key={e.id} className="hover:bg-[#18181C]/60">
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-100">
                      {e.tradeCode}
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-200">{e.assetName}</td>
                    <td className="py-3 px-3">
                      <Badge variant={e.roleInTrade === "BUYER" ? "emerald" : "blue"} className="font-mono text-[10px]">
                        {e.roleInTrade}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-100">
                      {formatCurrency(e.assetPrice, e.currency)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          e.state === "SETTLED"
                            ? "emerald"
                            : e.state === "DISPUTED" || e.state === "REFUNDED"
                            ? "danger"
                            : "amber"
                        }
                        className="font-mono text-[10px]"
                      >
                        {e.state}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/escrow/${e.id}`}>
                        <Button size="sm" variant="primary">
                          <Lock className="w-3 h-3" />
                          Open Deal Room
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {escrows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-500">
                      No escrow transactions on this desk yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TerminalCard>
      )}

      {/* INVENTORY */}
      {tab === "INVENTORY" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {inventory.map((asset) => (
            <TerminalCard key={asset.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/asset/${asset.slug}`}
                    className="font-mono text-base font-bold text-zinc-50 hover:text-[#60A5FA]"
                  >
                    {asset.name}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#10B981]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified • Swap Ready
                  </div>
                </div>
                <Badge className="font-mono">{asset.subCategory}</Badge>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#27272A] text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px]">ASK</span>
                  <span className="text-zinc-100 font-semibold">
                    {formatCurrency(asset.lowestAsk)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block text-[10px]">TOP BID</span>
                  <span className="text-[#10B981] font-semibold">
                    {formatCurrency(asset.highestBid)}
                  </span>
                </div>
              </div>
              <Link href={`/asset/${asset.slug}`} className="block">
                <Button variant="secondary" size="sm" className="w-full">
                  View Order Book <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </TerminalCard>
          ))}
          {inventory.length === 0 && (
            <TerminalCard className="p-8 col-span-full text-center text-xs text-zinc-500">
              No verified assets held on this desk.{" "}
              <Link href="/list" className="text-[#60A5FA] hover:underline">
                Verify & list an asset →
              </Link>
            </TerminalCard>
          )}
        </div>
      )}

      {/* MULTI-ASSET SWAPS */}
      {tab === "SWAPS" && (
        <div className="space-y-3">
          {swaps.map((s) => (
            <TerminalCard key={s.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={s.direction === "INCOMING" ? "amber" : "blue"} className="font-mono text-[10px]">
                    {s.direction} SWAP
                  </Badge>
                  <Badge
                    variant={
                      s.status === "ACCEPTED"
                        ? "emerald"
                        : s.status === "REJECTED"
                        ? "danger"
                        : "default"
                    }
                    className="font-mono text-[10px]"
                  >
                    {s.status}
                  </Badge>
                  <span className="font-mono text-[11px] text-zinc-500">
                    COUNTERPARTY: {s.counterpartyAlias}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap font-mono text-sm">
                  <span className="text-zinc-100 font-semibold">
                    [{s.offeredAssetNames.join(" + ")}
                    {s.cashTopUp > 0 ? ` + ${formatCurrency(s.cashTopUp, s.currency)}` : ""}]
                  </span>
                  <ArrowLeftRight className="w-4 h-4 text-[#3B82F6]" />
                  <span className="text-[#10B981] font-semibold">[{s.targetAssetName}]</span>
                </div>

                {s.note && <p className="text-xs text-zinc-400">{s.note}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {s.direction === "INCOMING" && s.status === "PENDING" && (
                  <>
                    <Button
                      variant="emerald"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSwapResponse(s.id, "ACCEPT")}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accept & Lock Dual-Vault
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSwapResponse(s.id, "REJECT")}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                  </>
                )}
                {s.escrowId && (
                  <Link href={`/escrow/${s.escrowId}`}>
                    <Button variant="primary" size="sm">
                      Open Swap Escrow
                    </Button>
                  </Link>
                )}
              </div>
            </TerminalCard>
          ))}
          {swaps.length === 0 && (
            <TerminalCard className="p-8 text-center text-xs text-zinc-500">
              No incoming or outgoing barter swap offers on this desk.
            </TerminalCard>
          )}
        </div>
      )}

      {/* BIDS */}
      {tab === "BIDS" && (
        <TerminalCard className="overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#0D0D10] font-mono text-[10px] uppercase text-zinc-500">
                <th className="py-2.5 px-4">Asset</th>
                <th className="py-2.5 px-3 text-right">Bid Price</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Book</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/70">
              {bids.map((b) => (
                <tr key={b.id} className="hover:bg-[#18181C]/60">
                  <td className="py-3 px-4 font-mono font-semibold text-zinc-100">
                    {b.assetName}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#10B981]">
                    {formatCurrency(b.price, b.currency)}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={b.status === "OPEN" ? "emerald" : "default"} className="font-mono text-[10px]">
                      {b.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/asset/${b.assetSlug}`} className="text-[#60A5FA] hover:underline font-mono">
                      Inspect →
                    </Link>
                  </td>
                </tr>
              ))}
              {bids.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-zinc-500">
                    No active bids posted from this desk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TerminalCard>
      )}

      {/* PAYOUT SETTINGS */}
      {tab === "PAYOUTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TerminalCard className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <CreditCard className="w-4 h-4 text-[#3B82F6]" />
                Stripe Connect Express (Fiat Payouts)
              </div>
              <Badge variant={stripeOnboarded ? "emerald" : "amber"} className="font-mono text-[10px]">
                {stripeOnboarded ? "ONBOARDED" : "NOT CONNECTED"}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Receive instant USD settlement payouts (95% net proceeds) automatically upon atomic escrow release.
            </p>
            {user.stripeConnectId && (
              <div className="rounded bg-[#09090B] border border-[#27272A] px-3 py-2 font-mono text-xs text-zinc-300">
                EXPRESS ID: {user.stripeConnectId}
              </div>
            )}
            <Button
              type="button"
              variant={stripeOnboarded ? "secondary" : "primary"}
              onClick={() => setStripeOnboarded((s) => !s)}
            >
              {stripeOnboarded ? "Connected (Toggle to Simulate Reset)" : "Complete Stripe Express Onboarding"}
            </Button>
          </TerminalCard>

          <TerminalCard className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Wallet className="w-4 h-4 text-[#10B981]" />
              USDC / SOL Non-Custodial Payout Wallet
            </div>
            <form onSubmit={handleSavePayouts} className="space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-[11px] uppercase text-zinc-500">
                  EVM (0x...) or Solana Payout Address
                </label>
                <Input
                  value={walletAddr}
                  onChange={(e) => setWalletAddr(e.target.value)}
                  placeholder="0x... or Solana pubkey"
                  className="font-mono text-xs"
                />
              </div>
              <Button type="submit" variant="emerald" disabled={isPending}>
                Save Payout Configuration
              </Button>
            </form>
          </TerminalCard>
        </div>
      )}
    </div>
  );
}
