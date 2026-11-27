"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  ChevronDown,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { Badge, Button, Input, TerminalCard } from "@/components/ui/primitives";
import { ThreeEscrowSeal } from "@/components/ThreeEscrowSeal";
import { cn, formatCurrency } from "@/lib/utils";
import {
  submitDomainEppAction,
  submitHandleBurnerAction,
  submitBuyerSwapKeyAction,
  runRdapAndOpenInspectionAction,
  confirmSettlementAction,
  openDisputeAction,
  triggerAutoRefundAction,
} from "@/app/actions/escrow";

export interface EscrowDealData {
  id: string;
  tradeCode: string;
  type: string;
  state: string;
  assetName: string;
  assetCategory: string;
  assetSubCategory: string;
  registrarOrPlatform: string;
  buyerAlias: string;
  sellerAlias: string;
  assetPrice: number;
  buyerFee: number;
  sellerFee: number;
  totalPlatformFee: number;
  totalBuyerDeposit: number;
  sellerPayout: number;
  currency: string;
  paymentMethod: string;
  paymentIntentId: string | null;
  slaDeadlineIso: string;
  inspectionDeadlineIso: string | null;
  hasEncryptedEpp: boolean;
  eppCipherPreview: string | null;
  burnerVaultEmail: string | null;
  burner2faLocked: boolean;
  rdapVerified: boolean;
  buyerSwapKeyDeposited: boolean;
  disputeReason: string | null;
  decryptedCredential: string | null;
  decryptedBuyerSwapKey: string | null;
  swapOfferedAssetNames: string[];
  swapCashTopUp: number | null;
}

interface AuditLogItem {
  id: string;
  actorRole: string;
  action: string;
  details: string;
  metadata: string | null;
  createdAtIso: string;
}

export function EscrowDealRoomClient({
  escrow,
  auditLogs,
  viewerRole,
}: {
  escrow: EscrowDealData;
  auditLogs: AuditLogItem[];
  viewerRole: "BUYER" | "SELLER" | "ADMIN" | "OBSERVER";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [eppInput, setEppInput] = useState("");
  const [buyerSwapKeyInput, setBuyerSwapKeyInput] = useState("");
  const [disputeInput, setDisputeInput] = useState("");
  const [showDisputeBox, setShowDisputeBox] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);
  const [showSecurityDrawer, setShowSecurityDrawer] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const isDomain =
    escrow.assetCategory === "AI_DOMAIN" || escrow.assetCategory === "TECH_DOMAIN";

  // Simple 3-step package tracker index
  const trackerStep =
    escrow.state === "FUNDS_LOCKED"
      ? 1
      : escrow.state === "CUSTODY_HANDOVER" || escrow.state === "VERIFICATION_RELEASE"
      ? 2
      : escrow.state === "SETTLED"
      ? 3
      : 0;

  function runAction(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error || "Something went wrong." });
        return;
      }
      setFeedback({ type: "ok", msg: okMsg });
      setEppInput("");
      setBuyerSwapKeyInput("");
      setShowDisputeBox(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Simple 3-Step Package Tracker with 3D Protection Seal */}
      <TerminalCard className="p-6 flex flex-col sm:flex-row items-center gap-6">
        <ThreeEscrowSeal state={escrow.state} />
        <div className="grid grid-cols-3 gap-4 flex-1 w-full">
          {[
            { num: 1, title: "Payment Protected", sub: "Held safely by Cust0dy" },
            { num: 2, title: "Transfer in Progress", sub: "Seller hands over access" },
            { num: 3, title: "Complete", sub: "Asset yours & seller paid" },
          ].map((step) => {
            const done = trackerStep > step.num || escrow.state === "SETTLED";
            const active = trackerStep === step.num && escrow.state !== "SETTLED";
            return (
              <div key={step.num} className="flex flex-col items-center text-center space-y-2">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border transition-colors",
                    done
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : active
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-zinc-100 text-slate-400 border-zinc-200"
                  )}
                >
                  {done ? <CheckCircle2 className="w-5 h-5" /> : step.num}
                </div>
                <div>
                  <div
                    className={cn(
                      "text-xs sm:text-sm font-semibold",
                      done || active ? "text-slate-900" : "text-slate-400"
                    )}
                  >
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-500 hidden sm:block">{step.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </TerminalCard>

      {/* Disputed / Refunded Notice */}
      {escrow.state === "DISPUTED" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-amber-900">
              Transfer paused for support review
            </div>
            <p className="text-xs text-amber-800 mt-1">
              {escrow.disputeReason || "Our team is reviewing this transfer. Your payment remains 100% protected."}
            </p>
          </div>
        </div>
      )}

      {escrow.state === "REFUNDED" && (
        <div className="rounded-2xl bg-zinc-100 border border-zinc-200 p-5 flex items-start gap-3">
          <RefreshCcw className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Order cancelled — 100% refunded
            </div>
            <p className="text-xs text-slate-600 mt-1">
              The full payment of {formatCurrency(escrow.totalBuyerDeposit, escrow.currency)} was returned to the buyer.
            </p>
          </div>
        </div>
      )}

      {/* Main Action Card + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-5">
          {/* STEP 1: Waiting for Seller Handover */}
          {escrow.state === "FUNDS_LOCKED" && (
            <TerminalCard className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-slate-900">
                  Next step: Seller starts the transfer
                </h2>
                <Badge variant="amber">
                  <Clock className="w-3 h-3" />
                  24h protection window
                </Badge>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {isDomain
                  ? `The buyer's payment is safely locked. Once the seller submits the transfer code for ${escrow.assetName}, Cust0dy will verify it automatically.`
                  : `The buyer's payment is safely locked. The seller needs to move ${escrow.assetName} to our secure holding email below so we can verify control.`}
              </p>

              {viewerRole === "BUYER" && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800">
                  You&apos;re viewing as <strong>Buyer</strong>. Want to test the seller&apos;s side? Switch to <strong>Seller</strong> using the pill in the top-right corner.
                </div>
              )}

              {isDomain ? (
                <div className="space-y-3 pt-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    Domain Transfer Code (from {escrow.registrarOrPlatform})
                  </label>
                  <Input
                    value={eppInput}
                    onChange={(e) => setEppInput(e.target.value)}
                    placeholder="Paste transfer code (e.g. EPP-QNT-8841-X9K2)"
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isPending || !eppInput.trim()}
                    onClick={() =>
                      runAction(
                        () => submitDomainEppAction({ escrowId: escrow.id, eppCode: eppInput }),
                        "Transfer code received and encrypted safely!"
                      )
                    }
                  >
                    {isPending ? "Securing Transfer Code..." : "Submit Transfer Code"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-1">
                    <div className="text-xs font-medium text-slate-500">Secure holding email</div>
                    <div className="font-mono text-sm font-semibold text-slate-900">
                      {escrow.burnerVaultEmail || "escrow-vault@vault.cust0dy.io"}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () => submitHandleBurnerAction(escrow.id),
                        "Account handover received and secured!"
                      )
                    }
                  >
                    Confirm Account Handover
                  </Button>
                </div>
              )}

              {escrow.type === "SWAP" && !escrow.buyerSwapKeyDeposited && (
                <div className="pt-4 border-t border-zinc-100 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-800">
                    Trade partner handover ({escrow.swapOfferedAssetNames.join(" + ")})
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={buyerSwapKeyInput}
                      onChange={(e) => setBuyerSwapKeyInput(e.target.value)}
                      placeholder="Paste transfer code for your traded asset..."
                    />
                    <Button
                      variant="secondary"
                      disabled={isPending || !buyerSwapKeyInput.trim()}
                      onClick={() =>
                        runAction(
                          () => submitBuyerSwapKeyAction(escrow.id, buyerSwapKeyInput),
                          "Your trade transfer code is safely stored!"
                        )
                      }
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </TerminalCard>
          )}

          {/* STEP 2A: Cust0dy Verifying Transfer */}
          {escrow.state === "CUSTODY_HANDOVER" && (
            <TerminalCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Transfer code received — ready to verify
                </h2>
                <Badge variant="emerald">Secured</Badge>
              </div>
              <p className="text-sm text-slate-600">
                The seller has uploaded the transfer credentials for <strong>{escrow.assetName}</strong>. Run our instant verification check to unlock the buyer&apos;s final confirmation step.
              </p>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => runRdapAndOpenInspectionAction(escrow.id),
                    "Verification passed! Buyer can now confirm receipt."
                  )
                }
              >
                <ShieldCheck className="w-4 h-4" />
                {isPending ? "Checking Transfer Readiness..." : "Verify Transfer & Notify Buyer"}
              </Button>
            </TerminalCard>
          )}

          {/* STEP 2B: Buyer Confirms Receipt */}
          {escrow.state === "VERIFICATION_RELEASE" && (
            <TerminalCard className="p-6 space-y-4 border-emerald-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Final step: Confirm &amp; complete transfer
                </h2>
                <Badge variant="emerald">Verified Ready</Badge>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Cust0dy verified that <strong>{escrow.assetName}</strong> is unlocked and ready for you. Click below to receive your transfer credentials and release payment to the seller.
              </p>
              {viewerRole === "SELLER" && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800">
                  Waiting for the buyer to confirm. Switch to <strong>Buyer</strong> in the top-right pill to test completing this transfer.
                </div>
              )}
              <Button
                variant="emerald"
                size="lg"
                className="w-full"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => confirmSettlementAction(escrow.id),
                    "Transfer complete! Your credentials are now unlocked below."
                  )
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                {isPending ? "Completing Transfer..." : "Confirm & Complete Transfer"}
              </Button>
            </TerminalCard>
          )}

          {/* STEP 3: Complete */}
          {escrow.state === "SETTLED" && (
            <TerminalCard className="p-6 space-y-4 border-emerald-200 bg-emerald-50/30">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-base">
                <CheckCircle2 className="w-5 h-5" />
                Transfer complete!
              </div>
              <p className="text-sm text-slate-600">
                <strong>{escrow.assetName}</strong> is now yours and the seller has been paid{" "}
                <strong>{formatCurrency(escrow.sellerPayout, escrow.currency)}</strong>.
              </p>

              {escrow.decryptedCredential && (
                <div className="rounded-xl bg-white border border-emerald-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-700">
                      Your Transfer Code / Access Key
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealSecret((s) => !s)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      {revealSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {revealSecret ? "Hide" : "Reveal"}
                    </button>
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900">
                    {revealSecret ? escrow.decryptedCredential : "••••••••••••••••••••••"}
                  </div>
                </div>
              )}
            </TerminalCard>
          )}

          {feedback && (
            <div
              className={cn(
                "rounded-xl p-3.5 text-xs font-medium border",
                feedback.type === "ok"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-700"
              )}
            >
              {feedback.msg}
            </div>
          )}

          {/* Collapsible Security & Technical Details Drawer */}
          <TerminalCard className="overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSecurityDrawer((s) => !s)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Security &amp; Audit Details ({auditLogs.length} events)
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-slate-400 transition-transform",
                  showSecurityDrawer && "rotate-180"
                )}
              />
            </button>

            {showSecurityDrawer && (
              <div className="px-5 pb-5 pt-2 border-t border-zinc-100 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 rounded-xl p-3 border border-zinc-200/70">
                  <div>
                    <span className="text-slate-400 block">Order Reference</span>
                    <span className="font-mono font-medium text-slate-800">{escrow.tradeCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Vault Encryption</span>
                    <span className="font-mono font-medium text-slate-800">
                      {escrow.eppCipherPreview ? `AES-256 (${escrow.eppCipherPreview}…)` : "AES-256-GCM Ready"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl bg-zinc-50 border border-zinc-200/70 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono font-semibold text-slate-700">
                          {log.action}
                        </span>
                        <span>{new Date(log.createdAtIso).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600">{log.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TerminalCard>
        </div>

        {/* Right Sidebar: Simple Order Summary & Help */}
        <div className="lg:col-span-4 space-y-4">
          <TerminalCard className="p-5 space-y-3 text-sm">
            <div className="font-semibold text-slate-900 border-b border-zinc-100 pb-2.5">
              Order Summary
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Item</span>
                <span className="font-semibold text-slate-900">{escrow.assetName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Item Price</span>
                <span className="font-medium text-slate-800">
                  {formatCurrency(escrow.assetPrice, escrow.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Buyer Protection (2.5%)</span>
                <span className="text-slate-700">
                  {formatCurrency(escrow.buyerFee, escrow.currency)}
                </span>
              </div>
              <div className="border-t border-zinc-100 pt-2 flex justify-between font-semibold text-slate-900">
                <span>Total Protected</span>
                <span>{formatCurrency(escrow.totalBuyerDeposit, escrow.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pt-1">
                <span>Seller Payout (after 5% fee)</span>
                <span className="font-medium text-emerald-700">
                  {formatCurrency(escrow.sellerPayout, escrow.currency)}
                </span>
              </div>
            </div>
          </TerminalCard>

          {!["SETTLED", "REFUNDED"].includes(escrow.state) && (
            <TerminalCard className="p-5 space-y-3">
              <div className="text-xs font-semibold text-slate-900">Need help?</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                If the seller doesn&apos;t complete the transfer within 24 hours, you get an automatic 100% refund.
              </p>
              {!showDisputeBox ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowDisputeBox(true)}
                  >
                    Report an Issue
                  </Button>
                  {escrow.state === "FUNDS_LOCKED" && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="w-full"
                      disabled={isPending}
                      onClick={() =>
                        runAction(
                          () => triggerAutoRefundAction(escrow.id),
                          "Order cancelled and 100% refunded to buyer."
                        )
                      }
                    >
                      Simulate 24h Auto-Refund
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={disputeInput}
                    onChange={(e) => setDisputeInput(e.target.value)}
                    placeholder="Briefly describe the issue..."
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      disabled={isPending || disputeInput.trim().length < 5}
                      onClick={() =>
                        runAction(
                          () => openDisputeAction(escrow.id, disputeInput),
                          "Transfer paused and sent to Cust0dy support."
                        )
                      }
                    >
                      Pause &amp; Notify Support
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDisputeBox(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </TerminalCard>
          )}
        </div>
      </div>
    </div>
  );
}
