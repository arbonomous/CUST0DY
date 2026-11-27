"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowLeftRight, CreditCard, Wallet } from "lucide-react";
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

function friendlyState(state: string) {
  switch (state) {
    case "FUNDS_LOCKED": return "Payment Protected";
    case "CUSTODY_HANDOVER": return "Transfer in Progress";
    case "VERIFICATION_RELEASE": return "Ready to Confirm";
    case "SETTLED": return "Complete";
    case "DISPUTED": return "Support Review";
    case "REFUNDED": return "Refunded";
    default: return state;
  }
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
  const [tab, setTab] = useState<"ESCROWS" | "INVENTORY" | "SWAPS" | "BIDS" | "PAYOUTS">("ESCROWS");
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
    startTransition(async () => {
      const res = await updatePayoutSettingsAction({
        usdcPayoutAddress: walletAddr.trim(),
        stripeOnboarded,
      });
      if (res.ok) {
        setStatusMsg("Payout settings saved!");
        router.refresh();
      }
    });
  }

  const tabs = [
    { key: "ESCROWS", label: `Active Transfers (${escrows.length})` },
    { key: "INVENTORY", label: `My Listings (${inventory.length})` },
    { key: "SWAPS", label: `Trade Offers (${swaps.length})` },
    { key: "BIDS", label: `My Offers (${bids.length})` },
    { key: "PAYOUTS", label: "Payouts" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setStatusMsg(null); }}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-all cursor-pointer",
              tab === t.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-zinc-200 hover:border-zinc-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {statusMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-medium text-emerald-800">
          {statusMsg}
        </div>
      )}

      {tab === "ESCROWS" && (
        <div className="space-y-3">
          {escrows.map((e) => (
            <TerminalCard key={e.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-slate-900">{e.assetName}</span>
                  <Badge variant={e.state === "SETTLED" ? "emerald" : e.state === "REFUNDED" ? "danger" : "amber"}>
                    {friendlyState(e.state)}
                  </Badge>
                  <Badge>{e.roleInTrade === "BUYER" ? "Buying" : "Selling"}</Badge>
                </div>
                <div className="text-xs text-slate-500">
                  Agreed price: <span className="font-semibold text-slate-800">{formatCurrency(e.assetPrice, e.currency)}</span>
                </div>
              </div>
              <Link href={`/escrow/${e.id}`}>
                <Button variant="primary" size="sm">Track Transfer →</Button>
              </Link>
            </TerminalCard>
          ))}
          {escrows.length === 0 && (
            <TerminalCard className="p-10 text-center text-sm text-slate-500">
              No active transfers yet.
            </TerminalCard>
          )}
        </div>
      )}

      {tab === "INVENTORY" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map((a) => (
            <TerminalCard key={a.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900">{a.name}</span>
                <Badge>{a.subCategory}</Badge>
              </div>
              <div className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified &amp; Ready to Sell or Trade
              </div>
              <div className="flex justify-between pt-3 border-t border-zinc-100 text-xs">
                <div><span className="text-slate-400 block">Price</span><span className="font-bold text-slate-900">{formatCurrency(a.lowestAsk)}</span></div>
                <div className="text-right"><span className="text-slate-400 block">Top Offer</span><span className="font-bold text-emerald-700">{formatCurrency(a.highestBid)}</span></div>
              </div>
              <Link href={`/asset/${a.slug}`} className="block">
                <Button variant="secondary" size="sm" className="w-full">View Listing</Button>
              </Link>
            </TerminalCard>
          ))}
        </div>
      )}

      {tab === "SWAPS" && (
        <div className="space-y-3">
          {swaps.map((s) => (
            <TerminalCard key={s.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant={s.direction === "INCOMING" ? "amber" : "blue"}>
                    {s.direction === "INCOMING" ? "Incoming Trade Offer" : "Sent Trade Offer"}
                  </Badge>
                  <Badge>{s.status}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-sm font-semibold text-slate-900">
                  <span>{s.offeredAssetNames.join(" + ")}{s.cashTopUp > 0 ? ` + ${formatCurrency(s.cashTopUp, s.currency)}` : ""}</span>
                  <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                  <span className="text-emerald-700">{s.targetAssetName}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {s.direction === "INCOMING" && s.status === "PENDING" && (
                  <>
                    <Button variant="emerald" size="sm" disabled={isPending} onClick={() => handleSwapResponse(s.id, "ACCEPT")}>Accept Trade</Button>
                    <Button variant="secondary" size="sm" disabled={isPending} onClick={() => handleSwapResponse(s.id, "REJECT")}>Decline</Button>
                  </>
                )}
                {s.escrowId && (
                  <Link href={`/escrow/${s.escrowId}`}>
                    <Button variant="primary" size="sm">Open Transfer</Button>
                  </Link>
                )}
              </div>
            </TerminalCard>
          ))}
          {swaps.length === 0 && (
            <TerminalCard className="p-10 text-center text-sm text-slate-500">
              No trade offers right now.
            </TerminalCard>
          )}
        </div>
      )}

      {tab === "BIDS" && (
        <div className="space-y-3">
          {bids.map((b) => (
            <TerminalCard key={b.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">{b.assetName}</div>
                <div className="text-xs text-slate-500">Your offer: <span className="font-semibold text-emerald-700">{formatCurrency(b.price, b.currency)}</span></div>
              </div>
              <Link href={`/asset/${b.assetSlug}`}>
                <Button variant="secondary" size="sm">View Listing</Button>
              </Link>
            </TerminalCard>
          ))}
          {bids.length === 0 && (
            <TerminalCard className="p-10 text-center text-sm text-slate-500">
              You haven&apos;t made any offers yet.
            </TerminalCard>
          )}
        </div>
      )}

      {tab === "PAYOUTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TerminalCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Bank Payouts (Stripe)
              </div>
              <Badge variant={stripeOnboarded ? "emerald" : "amber"}>
                {stripeOnboarded ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Automatically receive 95% of every completed sale directly to your bank account.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setStripeOnboarded((s) => !s)}>
              {stripeOnboarded ? "Manage Bank Connection" : "Connect Bank Account"}
            </Button>
          </TerminalCard>

          <TerminalCard className="p-6 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Crypto Payout Wallet (USDC / SOL)
            </div>
            <form onSubmit={handleSavePayouts} className="space-y-3">
              <Input
                value={walletAddr}
                onChange={(e) => setWalletAddr(e.target.value)}
                placeholder="Paste your wallet address"
              />
              <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                Save Payout Settings
              </Button>
            </form>
          </TerminalCard>
        </div>
      )}
    </div>
  );
}
