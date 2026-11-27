"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  ArrowLeftRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button, Input, TerminalCard, Badge } from "@/components/ui/primitives";
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
  const [mode, setMode] = useState<"BUY" | "SWAP">("BUY");
  const [buySubMode, setBuySubMode] = useState<"INSTANT" | "BID">("INSTANT");
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "USDC_ESCROW" | "SOL_ESCROW">("STRIPE");
  const [bidPrice, setBidPrice] = useState<string>(
    String(Math.round((highestBid ?? lowestAsk ?? 2000) * 1.03))
  );

  // Swap state
  const [selectedSwapIds, setSelectedSwapIds] = useState<string[]>([]);
  const [cashTopUp, setCashTopUp] = useState<string>("500");
  const [swapCurrency, setSwapCurrency] = useState<"USDC" | "USD">("USDC");
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
        paymentMethod === "STRIPE"
          ? "USD"
          : paymentMethod === "SOL_ESCROW"
          ? "SOL"
          : "USDC";
      const res = await instantBuyAction({
        assetId,
        paymentMethod,
        currency,
      });
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error });
        return;
      }
      router.push(`/escrow/${res.tradeId}`);
    });
  }

  function handlePlaceBid(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const num = Number(bidPrice);
    if (!num || num <= 0) {
      setFeedback({ type: "err", msg: "Enter a valid bid amount." });
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
        msg: `Live bid of ${formatCurrency(num, currency)} posted to order book.`,
      });
      router.refresh();
    });
  }

  function handleProposeSwap(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (selectedSwapIds.length === 0) {
      setFeedback({ type: "err", msg: "Select 1–3 verified assets from your inventory." });
      return;
    }
    startTransition(async () => {
      const res = await proposeSwapAction({
        targetAssetId: assetId,
        offeredAssetIds: selectedSwapIds,
        cashTopUp: Number(cashTopUp) || 0,
        currency: swapCurrency,
        note: swapNote,
      });
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error });
        return;
      }
      setFeedback({
        type: "ok",
        msg: "Atomic swap proposal submitted! Track status in your Portfolio Dashboard.",
      });
      setSelectedSwapIds([]);
      setSwapNote("");
      router.refresh();
    });
  }

  return (
    <TerminalCard className="p-4 space-y-4">
      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#09090B] border border-[#27272A]">
        <button
          type="button"
          onClick={() => {
            setMode("BUY");
            setFeedback(null);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-colors cursor-pointer",
            mode === "BUY"
              ? "bg-[#18181C] text-zinc-100 border border-[#27272A]"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Zap className="w-3.5 h-3.5 text-[#10B981]" />
          Buy / Place Bid
        </button>
        <button
          type="button"
          disabled={!swapEnabled}
          onClick={() => {
            setMode("SWAP");
            setFeedback(null);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
            mode === "SWAP"
              ? "bg-[#18181C] text-zinc-100 border border-[#27272A]"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#3B82F6]" />
          Propose Swap
        </button>
      </div>

      {inEscrow && activeEscrowId && (
        <div className="rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
            <Lock className="w-3.5 h-3.5" />
            Asset Currently Locked in Escrow
          </div>
          <p className="text-[11px] text-zinc-400">
            Funds are locked in a Custody Hook Deal Room. Open the deal room to monitor or settle transfer keys.
          </p>
          <Link href={`/escrow/${activeEscrowId}`} className="block">
            <Button variant="amber" size="sm" className="w-full">
              Open Escrow Deal Room
            </Button>
          </Link>
        </div>
      )}

      {isOwner && (
        <div className="rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/25 p-3 text-xs text-zinc-300">
          You own <span className="font-mono font-semibold text-zinc-100">{assetName}</span> on the current desk. Switch to <span className="font-mono text-[#10B981]">DESK_7F2A (BUYER)</span> in the top-right header to test buying or swapping.
        </div>
      )}

      {/* SIDE 1: INSTANT BUY / PLACE BID */}
      {mode === "BUY" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBuySubMode("INSTANT")}
              className={cn(
                "flex-1 py-1.5 rounded text-xs font-mono border cursor-pointer",
                buySubMode === "INSTANT"
                  ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/35"
                  : "bg-[#09090B] text-zinc-500 border-[#27272A]"
              )}
            >
              INSTANT BUY
            </button>
            <button
              type="button"
              onClick={() => setBuySubMode("BID")}
              className={cn(
                "flex-1 py-1.5 rounded text-xs font-mono border cursor-pointer",
                buySubMode === "BID"
                  ? "bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/35"
                  : "bg-[#09090B] text-zinc-500 border-[#27272A]"
              )}
            >
              PLACE LIVE BID
            </button>
          </div>

          {/* Settlement Rail */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-zinc-500">
              Escrow Settlement Rail
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "STRIPE", label: "USD Card" },
                  { id: "USDC_ESCROW", label: "USDC Vault" },
                  { id: "SOL_ESCROW", label: "SOL Vault" },
                ] as const
              ).map((rail) => (
                <button
                  key={rail.id}
                  type="button"
                  onClick={() => setPaymentMethod(rail.id)}
                  className={cn(
                    "py-1.5 px-2 rounded text-[11px] font-mono border transition-colors cursor-pointer",
                    paymentMethod === rail.id
                      ? "bg-[#18181C] text-zinc-100 border-[#3B82F6]"
                      : "bg-[#09090B] text-zinc-500 border-[#27272A] hover:text-zinc-300"
                  )}
                >
                  {rail.label}
                </button>
              ))}
            </div>
          </div>

          {buySubMode === "INSTANT" ? (
            <div className="space-y-3">
              <div className="rounded-md bg-[#09090B] border border-[#27272A] p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Lowest Ask Price</span>
                  <span className="font-mono font-semibold text-zinc-100">
                    {formatCurrency(fees.assetPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Buyer Protection Fee (2.5%)</span>
                  <span className="font-mono text-zinc-300">
                    {formatCurrency(fees.buyerFee)}
                  </span>
                </div>
                <div className="border-t border-[#27272A] pt-2 flex justify-between">
                  <span className="font-medium text-zinc-200">Total Escrow Lock</span>
                  <span className="font-mono font-bold text-[#10B981]">
                    {formatCurrency(fees.totalBuyerDeposit)}
                  </span>
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
                {isPending
                  ? "Locking Escrow Vault..."
                  : `Lock ${formatCurrency(fees.totalBuyerDeposit)} in Escrow`}
              </Button>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Funds lock via manual-capture escrow. Seller has 24h to deposit verified transfer keys or you receive an automatic 100% refund.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePlaceBid} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-zinc-500">
                  Bid Price ({paymentMethod === "STRIPE" ? "USD" : "USDC"})
                </label>
                <Input
                  type="number"
                  min={50}
                  step={50}
                  value={bidPrice}
                  onChange={(e) => setBidPrice(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isPending || isOwner}
              >
                {isPending ? "Posting Bid..." : `Post Blind Bid on ${assetName}`}
              </Button>
            </form>
          )}
        </div>
      ) : (
        /* SIDE 2: PROPOSE MULTI-ASSET BARTER SWAP */
        <form onSubmit={handleProposeSwap} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono uppercase text-zinc-500">
                Select 1–3 Verified Assets ({selectedSwapIds.length}/3)
              </label>
              <Badge variant="emerald" className="text-[10px]">
                <ShieldCheck className="w-3 h-3" />
                Your Vault
              </Badge>
            </div>

            {myVerifiedAssets.length === 0 ? (
              <div className="rounded-md bg-[#09090B] border border-[#27272A] p-3 text-xs text-zinc-400 space-y-2">
                <p>No verified assets in your active desk inventory yet.</p>
                <Link href="/list" className="text-[#60A5FA] hover:underline inline-block">
                  Verify & list an asset to unlock barter swaps →
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {myVerifiedAssets.map((item) => {
                  const selected = selectedSwapIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleSwapAsset(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors cursor-pointer",
                        selected
                          ? "bg-[#3B82F6]/15 border-[#3B82F6] text-zinc-100"
                          : "bg-[#09090B] border-[#27272A] text-zinc-300 hover:border-zinc-600"
                      )}
                    >
                      <div>
                        <div className="font-mono text-xs font-semibold">{item.name}</div>
                        <div className="text-[10px] text-zinc-500">{item.subCategory}</div>
                      </div>
                      <span className="font-mono text-xs text-zinc-400">
                        {formatCurrency(item.lowestAsk)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-500">
                Cash / USDC Top-Up
              </label>
              <Input
                type="number"
                min={0}
                step={50}
                value={cashTopUp}
                onChange={(e) => setCashTopUp(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-500">Rail</label>
              <select
                value={swapCurrency}
                onChange={(e) => setSwapCurrency(e.target.value as "USDC" | "USD")}
                className="h-9 w-full rounded-md bg-[#09090B] border border-[#27272A] px-2 font-mono text-xs text-zinc-200"
              >
                <option value="USDC">USDC</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-zinc-500">
              Trade Terms Note (No Contact Info Allowed)
            </label>
            <Input
              value={swapNote}
              onChange={(e) => setSwapNote(e.target.value)}
              placeholder="e.g., Immediate EPP handover ready upon acceptance"
              className="text-xs"
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
            {isPending ? "Submitting Atomic Swap..." : "Submit Multi-Asset Swap Offer"}
          </Button>
        </form>
      )}

      {feedback && (
        <div
          className={cn(
            "rounded-md p-2.5 text-xs flex items-start gap-2 border",
            feedback.type === "ok"
              ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
              : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#F87171]"
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
