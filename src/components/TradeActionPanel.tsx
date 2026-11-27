"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button, Input, TerminalCard } from "@/components/ui/primitives";
import { calculateEscrowFees } from "@/lib/fees";
import { cn, formatCurrency } from "@/lib/utils";
import {
  instantBuyAction,
  placeBidAction,
  proposeSwapAction,
} from "@/app/actions/orderbook";

interface InventoryAsset {
  id: string;
  name: string;
  subCategory: string;
  lowestAsk: number | null;
}

interface TradeActionPanelProps {
  assetId: string;
  assetName: string;
  lowestAsk: number | null;
  highestBid: number | null;
  swapEnabled: boolean;
  isOwner: boolean;
  inEscrow: boolean;
  activeEscrowId: string | null;
  myVerifiedAssets: InventoryAsset[];
}

export function TradeActionPanel({
  assetId,
  assetName,
  lowestAsk,
  highestBid,
  swapEnabled,
  isOwner,
  inEscrow,
  activeEscrowId,
  myVerifiedAssets,
}: TradeActionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"BUY" | "OFFER" | "SWAP">("BUY");
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "USDC_ESCROW" | "SOL_ESCROW">("STRIPE");
  const [bidPrice, setBidPrice] = useState<string>(
    String(Math.round((highestBid ?? lowestAsk ?? 2000) * 1.03))
  );
  const [selectedSwapIds, setSelectedSwapIds] = useState<string[]>([]);
  const [cashTopUp, setCashTopUp] = useState<string>("500");
  const [swapNote, setSwapNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const fees = calculateEscrowFees(lowestAsk ?? 0);

  function toggleSwapAsset(id: string) {
    setSelectedSwapIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function handleInstantBuy() {
    setFeedback(null);
    startTransition(async () => {
      const currency =
        paymentMethod === "STRIPE" ? "USD" : paymentMethod === "SOL_ESCROW" ? "SOL" : "USDC";
      const res = await instantBuyAction({ assetId, paymentMethod, currency });
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error });
        return;
      }
      router.push(`/escrow/${res.tradeId}`);
    });
  }

  function handlePlaceOffer(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const num = Number(bidPrice);
    if (!num || num <= 0) {
      setFeedback({ type: "err", msg: "Please enter a valid offer amount." });
      return;
    }
    startTransition(async () => {
      const currency = paymentMethod === "STRIPE" ? "USD" : "USDC";
      const res = await placeBidAction({ assetId, price: num, currency });
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error });
        return;
      }
      setFeedback({
        type: "ok",
        msg: `Your offer of ${formatCurrency(num, currency)} has been submitted!`,
      });
      router.refresh();
    });
  }

  function handleProposeSwap(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (selectedSwapIds.length === 0) {
      setFeedback({ type: "err", msg: "Select 1–3 of your verified items to propose a trade." });
      return;
    }
    startTransition(async () => {
      const res = await proposeSwapAction({
        targetAssetId: assetId,
        offeredAssetIds: selectedSwapIds,
        cashTopUp: Number(cashTopUp) || 0,
        currency: "USDC",
        note: swapNote,
      });
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error });
        return;
      }
      setFeedback({
        type: "ok",
        msg: "Trade proposal sent! Check My Orders to track the seller's response.",
      });
      setSelectedSwapIds([]);
      setSwapNote("");
      router.refresh();
    });
  }

  return (
    <TerminalCard className="p-5 space-y-5">
      {/* Clean 3-Tab Action Switcher */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-100">
        <button
          type="button"
          onClick={() => { setMode("BUY"); setFeedback(null); }}
          className={cn(
            "py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            mode === "BUY" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Buy Now
        </button>
        <button
          type="button"
          onClick={() => { setMode("OFFER"); setFeedback(null); }}
          className={cn(
            "py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            mode === "OFFER" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Make Offer
        </button>
        <button
          type="button"
          disabled={!swapEnabled}
          onClick={() => { setMode("SWAP"); setFeedback(null); }}
          className={cn(
            "py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40",
            mode === "SWAP" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
          )}
        >
          Trade
        </button>
      </div>

      {inEscrow && activeEscrowId && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-2.5">
          <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            Transfer Currently in Progress
          </div>
          <Link href={`/escrow/${activeEscrowId}`} className="block">
            <Button variant="amber" size="sm" className="w-full">
              View Safe Transfer Progress
            </Button>
          </Link>
        </div>
      )}

      {isOwner && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800">
          You own <strong>{assetName}</strong>. Switch to <strong>Buyer</strong> in the top-right pill to test buying it.
        </div>
      )}

      {/* BUY NOW */}
      {mode === "BUY" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Pay with</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "STRIPE", label: "Card / Bank" },
                  { id: "USDC_ESCROW", label: "USDC" },
                  { id: "SOL_ESCROW", label: "SOL" },
                ] as const
              ).map((rail) => (
                <button
                  key={rail.id}
                  type="button"
                  onClick={() => setPaymentMethod(rail.id)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                    paymentMethod === rail.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  {rail.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-zinc-50 border border-zinc-200/80 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Item price</span>
              <span className="font-semibold text-slate-900">{formatCurrency(fees.assetPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Buyer protection (2.5%)</span>
              <span className="text-slate-700">{formatCurrency(fees.buyerFee)}</span>
            </div>
            <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(fees.totalBuyerDeposit)}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="emerald"
            size="lg"
            className="w-full"
            disabled={isPending || isOwner || inEscrow || !lowestAsk}
            onClick={handleInstantBuy}
          >
            <Lock className="w-4 h-4" />
            {isPending ? "Starting Safe Transfer..." : `Buy Now for ${formatCurrency(fees.totalBuyerDeposit)}`}
          </Button>

          <p className="text-xs text-slate-500 text-center leading-relaxed flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            100% money-back guarantee if seller doesn&apos;t transfer within 24h.
          </p>
        </div>
      )}

      {/* MAKE AN OFFER */}
      {mode === "OFFER" && (
        <form onSubmit={handlePlaceOffer} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Your Offer Amount (USD)</label>
            <Input
              type="number"
              min={50}
              step={50}
              value={bidPrice}
              onChange={(e) => setBidPrice(e.target.value)}
              required
            />
            <p className="text-xs text-slate-400">
              The seller will see your offer anonymously without seeing your personal info.
            </p>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isPending || isOwner}
          >
            {isPending ? "Sending Offer..." : `Submit Offer on ${assetName}`}
          </Button>
        </form>
      )}

      {/* TRADE / SWAP */}
      {mode === "SWAP" && (
        <form onSubmit={handleProposeSwap} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">
              Choose 1–3 of your verified items to trade ({selectedSwapIds.length}/3)
            </label>
            {myVerifiedAssets.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-xs text-slate-500 space-y-2">
                <p>You don&apos;t have any verified items to trade yet.</p>
                <Link href="/list" className="text-blue-600 font-medium hover:underline inline-block">
                  Verify an item first →
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {myVerifiedAssets.map((item) => {
                  const selected = selectedSwapIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSwapAsset(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                        selected
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-800 border-zinc-200 hover:border-zinc-300"
                      )}
                    >
                      <span className="text-xs font-semibold">{item.name}</span>
                      <span className={cn("text-xs", selected ? "text-zinc-300" : "text-slate-500")}>
                        {formatCurrency(item.lowestAsk)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Optional Cash / USDC Top-Up</label>
            <Input
              type="number"
              min={0}
              step={50}
              value={cashTopUp}
              onChange={(e) => setCashTopUp(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isPending || isOwner || selectedSwapIds.length === 0}
          >
            <ArrowLeftRight className="w-4 h-4" />
            {isPending ? "Sending Trade..." : "Propose Safe Trade"}
          </Button>
        </form>
      )}

      {feedback && (
        <div
          className={cn(
            "rounded-xl p-3 text-xs font-medium flex items-start gap-2 border",
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          )}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}
    </TerminalCard>
  );
}
