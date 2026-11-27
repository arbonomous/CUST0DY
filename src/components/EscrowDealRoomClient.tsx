"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Mail,
  ArrowLeftRight,
  Eye,
  EyeOff,
  FileCode2,
} from "lucide-react";
import { Badge, Button, Input, TerminalCard } from "@/components/ui/primitives";
import { CountdownTimer } from "@/components/CountdownTimer";
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

const STEPS = [
  { key: "FUNDS_LOCKED", num: "01", label: "FUNDS LOCKED", desc: "Escrow Funded & Masked" },
  { key: "CUSTODY_HANDOVER", num: "02", label: "CUSTODY HANDOVER", desc: "AES-256 Vault Deposit" },
  { key: "VERIFICATION_RELEASE", num: "03", label: "VERIFICATION & RELEASE", desc: "RDAP / 12h Inspection" },
  { key: "SETTLED", num: "04", label: "ATOMIC SETTLEMENT", desc: "Keys & Payout Released" },
];

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
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const isDomain =
    escrow.assetCategory === "AI_DOMAIN" || escrow.assetCategory === "TECH_DOMAIN";

  const stepIndex =
    escrow.state === "FUNDS_LOCKED"
      ? 0
      : escrow.state === "CUSTODY_HANDOVER"
      ? 1
      : escrow.state === "VERIFICATION_RELEASE"
      ? 2
      : escrow.state === "SETTLED"
      ? 3
      : -1;

  function runAction(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setFeedback({ type: "err", msg: res.error || "Operation failed." });
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
    <div className="space-y-6">
      {/* State Machine Stepper */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {STEPS.map((step, i) => {
          const completed = stepIndex > i || escrow.state === "SETTLED";
          const current = stepIndex === i && escrow.state !== "SETTLED";
          return (
            <div
              key={step.key}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                completed
                  ? "bg-[#10B981]/8 border-[#10B981]/35"
                  : current
                  ? "bg-[#F59E0B]/10 border-[#F59E0B]/45"
                  : "bg-[#121215] border-[#27272A]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-zinc-500">STATE {step.num}</span>
                {completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                ) : current ? (
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                ) : null}
              </div>
              <div
                className={cn(
                  "font-mono text-xs font-bold mt-1",
                  completed
                    ? "text-[#10B981]"
                    : current
                    ? "text-[#F59E0B]"
                    : "text-zinc-400"
                )}
              >
                {step.label}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">{step.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Disputed / Refunded Banner */}
      {escrow.state === "DISPUTED" && (
        <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#F87171] shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-xs font-bold text-[#F87171] uppercase">
              ESCROW FROZEN — IN CONCIERGE DISPUTE QUEUE
            </div>
            <p className="text-xs text-zinc-300 mt-1">
              Reason: {escrow.disputeReason || "Escalated by counterparty."} Funds remain safely locked until Cust0dy Ops resolves in the Admin Console.
            </p>
          </div>
        </div>
      )}

      {escrow.state === "REFUNDED" && (
        <div className="rounded-lg bg-[#18181C] border border-[#27272A] p-4 flex items-start gap-3">
          <RefreshCcw className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-xs font-bold text-zinc-200 uppercase">
              ESCROW CANCELLED — 100% BUYER REFUND EXECUTED
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {escrow.disputeReason || "24h SLA expired. Full deposit returned to buyer and asset unlocked."}
            </p>
          </div>
        </div>
      )}

      {/* Main 12-Col Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Cols: Active State Execution Vault */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active SLA / Inspection Countdown */}
          {escrow.state === "FUNDS_LOCKED" && (
            <CountdownTimer
              deadlineIso={escrow.slaDeadlineIso}
              label="24H SELLER HANDOVER SLA REMAINING"
              tone="amber"
            />
          )}
          {escrow.state === "VERIFICATION_RELEASE" && escrow.inspectionDeadlineIso && (
            <CountdownTimer
              deadlineIso={escrow.inspectionDeadlineIso}
              label="12H BUYER INSPECTION WINDOW"
              tone="emerald"
            />
          )}

          {/* Multi-Asset Swap Dual-Vault Banner */}
          {escrow.type === "SWAP" && (
            <TerminalCard className="p-4 border-[#3B82F6]/35 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#60A5FA] font-mono">
                  <ArrowLeftRight className="w-4 h-4" />
                  DUAL-CUSTODY ATOMIC SWAP GUARD
                </div>
                <Badge variant="blue">NO EARLY KEY REVEAL</Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Both counterparties must deposit their transfer keys into Cust0dy&apos;s AES-256 vault before either side sees the counterparty&apos;s credentials.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded bg-[#09090B] border border-[#27272A] p-3">
                  <div className="font-mono text-[10px] text-zinc-500">SELLER ASSET ({escrow.sellerAlias})</div>
                  <div className="font-mono font-semibold text-zinc-100 mt-0.5">{escrow.assetName}</div>
                  <div className="mt-1.5">
                    {escrow.hasEncryptedEpp ? (
                      <Badge variant="emerald">VAULT KEY DEPOSITED</Badge>
                    ) : (
                      <Badge variant="amber">AWAITING SELLER KEY</Badge>
                    )}
                  </div>
                </div>
                <div className="rounded bg-[#09090B] border border-[#27272A] p-3">
                  <div className="font-mono text-[10px] text-zinc-500">BUYER OFFERED ({escrow.buyerAlias})</div>
                  <div className="font-mono font-semibold text-zinc-100 mt-0.5">
                    {escrow.swapOfferedAssetNames.join(" + ")}{" "}
                    {escrow.swapCashTopUp ? `+ ${formatCurrency(escrow.swapCashTopUp, escrow.currency)}` : ""}
                  </div>
                  <div className="mt-1.5">
                    {escrow.buyerSwapKeyDeposited ? (
                      <Badge variant="emerald">VAULT KEY DEPOSITED</Badge>
                    ) : (
                      <Badge variant="amber">AWAITING BUYER KEY</Badge>
                    )}
                  </div>
                </div>
              </div>

              {!escrow.buyerSwapKeyDeposited &&
                (escrow.state === "FUNDS_LOCKED" || escrow.state === "CUSTODY_HANDOVER") && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      value={buyerSwapKeyInput}
                      onChange={(e) => setBuyerSwapKeyInput(e.target.value)}
                      placeholder="Buyer Desk: Enter EPP / Transfer Key for offered swap asset..."
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="primary"
                      disabled={isPending || !buyerSwapKeyInput.trim()}
                      onClick={() =>
                        runAction(
                          () => submitBuyerSwapKeyAction(escrow.id, buyerSwapKeyInput),
                          "Buyer swap transfer key encrypted (AES-256-GCM) & vaulted."
                        )
                      }
                    >
                      Deposit Swap Key
                    </Button>
                  </div>
                )}
            </TerminalCard>
          )}

          {/* STATE 1: FUNDS_LOCKED -> Seller Custody Handover */}
          {escrow.state === "FUNDS_LOCKED" && (
            <TerminalCard className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#F59E0B]" />
                    State 1 → 2: Seller Custody Handover Vault
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {isDomain
                      ? `Unlock ${escrow.assetName} at ${escrow.registrarOrPlatform} and deposit the EPP Authorization Code into Cust0dy's AES-256-GCM vault.`
                      : `Bind ${escrow.assetName} to Cust0dy's clean-room burner email and disable personal 2FA so platform 2FA locks the handle.`}
                  </p>
                </div>
                <Badge variant="amber" className="font-mono">
                  VIEWING AS {viewerRole}
                </Badge>
              </div>

              {viewerRole === "BUYER" && (
                <div className="rounded-md bg-[#09090B] border border-[#27272A] p-3 text-xs text-zinc-400">
                  Your funds (<span className="font-mono text-zinc-100">{formatCurrency(escrow.totalBuyerDeposit, escrow.currency)}</span>) are locked. Waiting for Seller Desk{" "}
                  <span className="font-mono text-zinc-200">{escrow.sellerAlias}</span> to submit transfer keys.{" "}
                  <span className="text-[#60A5FA]">
                    (Tip: Switch to VAULT_9C1E [SELLER] in the top-right header to execute the seller handover!)
                  </span>
                </div>
              )}

              {isDomain ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[11px] uppercase text-zinc-400">
                      Registrar EPP Authorization Code (Encrypted via AES-256-GCM on Submit)
                    </label>
                    <Input
                      value={eppInput}
                      onChange={(e) => setEppInput(e.target.value)}
                      placeholder="e.g., EPP-QNT-8841-X9K2-M7"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    variant="amber"
                    size="lg"
                    className="w-full"
                    disabled={isPending || !eppInput.trim()}
                    onClick={() =>
                      runAction(
                        () => submitDomainEppAction({ escrowId: escrow.id, eppCode: eppInput }),
                        "EPP Authorization Code encrypted with AES-256-GCM and sealed in Cust0dy vault."
                      )
                    }
                  >
                    <Lock className="w-4 h-4" />
                    {isPending ? "Encrypting & Vaulting EPP..." : "Encrypt & Deposit EPP Code into Vault"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md bg-[#09090B] border border-[#27272A] p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                      <Mail className="w-3.5 h-3.5 text-[#3B82F6]" />
                      CLEAN-ROOM BURNER VAULT EMAIL
                    </div>
                    <div className="font-mono text-sm font-bold text-[#10B981]">
                      {escrow.burnerVaultEmail || "escrow-vault@vault.cust0dy.io"}
                    </div>
                    <ol className="text-xs text-zinc-400 list-decimal list-inside space-y-1 pt-1">
                      <li>Change {escrow.assetName} account recovery email to the clean-room address above.</li>
                      <li>Disable personal SMS/TOTP 2FA on {escrow.registrarOrPlatform}.</li>
                      <li>Confirm below so Cust0dy locks hardware-backed platform 2FA over the handle.</li>
                    </ol>
                  </div>
                  <Button
                    variant="amber"
                    size="lg"
                    className="w-full"
                    disabled={isPending}
                    onClick={() =>
                      runAction(
                        () => submitHandleBurnerAction(escrow.id),
                        "Clean-room burner email verified and Cust0dy platform 2FA engaged."
                      )
                    }
                  >
                    <Lock className="w-4 h-4" />
                    Confirm Burner Email Handover & Lock Platform 2FA
                  </Button>
                </div>
              )}
            </TerminalCard>
          )}

          {/* STATE 2: CUSTODY_HANDOVER -> Automated RDAP / Vault Verification */}
          {escrow.state === "CUSTODY_HANDOVER" && (
            <TerminalCard className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                    State 2 → 3: Custody Vault Sealed — Ready for Verification
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Transfer credentials are encrypted inside Cust0dy&apos;s AES-256-GCM vault. Trigger automated RDAP/WHOIS verification to open the 12-hour buyer inspection window.
                  </p>
                </div>
                <Badge variant="emerald" className="font-mono">AES-256-GCM SEALED</Badge>
              </div>

              {escrow.eppCipherPreview && (
                <div className="rounded bg-[#09090B] border border-[#27272A] p-3 font-mono text-xs text-zinc-400 flex items-center justify-between">
                  <span>CIPHERTEXT SEAL: {escrow.eppCipherPreview}••••••</span>
                  <span className="text-[#10B981]">LOCKED UNTIL SETTLEMENT</span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => runRdapAndOpenInspectionAction(escrow.id),
                    "RDAP/Vault verification passed. 12-hour buyer inspection window opened!"
                  )
                }
              >
                <ShieldCheck className="w-4 h-4" />
                {isPending
                  ? "Running Automated RDAP / Custody Check..."
                  : "Run Automated RDAP Check & Open 12h Inspection Window"}
              </Button>
            </TerminalCard>
          )}

          {/* STATE 3: VERIFICATION_RELEASE -> Buyer Confirmation & Atomic Settlement */}
          {escrow.state === "VERIFICATION_RELEASE" && (
            <TerminalCard className="p-5 space-y-4 border-[#10B981]/35">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                    State 3: Atomic Verification & Settlement Release
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Cust0dy verified asset custody. Confirm access to atomically unlock credentials for the buyer, pay out the seller, and settle the 7.5% platform fee.
                  </p>
                </div>
                <Badge variant="emerald" className="font-mono">
                  {isDomain ? "RDAP PASSED" : "2FA VAULT LOCKED"}
                </Badge>
              </div>

              {escrow.burnerVaultEmail && (
                <div className="rounded bg-[#09090B] border border-[#27272A] p-3 text-xs space-y-1">
                  <div className="font-mono text-[10px] text-zinc-500">VERIFIED BURNER CUSTODY</div>
                  <div className="font-mono text-zinc-100">{escrow.burnerVaultEmail}</div>
                  <div className="text-[#10B981] text-[11px]">
                    Platform 2FA locked • Zero personal recovery emails attached
                  </div>
                </div>
              )}

              {viewerRole === "SELLER" && (
                <div className="rounded bg-[#09090B] border border-[#27272A] p-3 text-xs text-zinc-400">
                  Awaiting Buyer Desk <span className="font-mono text-zinc-200">{escrow.buyerAlias}</span> to confirm receipt.{" "}
                  <span className="text-[#60A5FA]">
                    (Switch to DESK_7F2A [BUYER] in the header to execute atomic settlement!)
                  </span>
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
                    "Atomic settlement executed! Credentials released & 7.5% fee logged to Revenue Ledger."
                  )
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                {isPending
                  ? "Executing Atomic Settlement..."
                  : `Confirm Receipt & Release ${formatCurrency(escrow.sellerPayout, escrow.currency)} Payout`}
              </Button>
            </TerminalCard>
          )}

          {/* STATE 4: SETTLED -> Decrypted Transfer Vault Release */}
          {escrow.state === "SETTLED" && (
            <TerminalCard className="p-5 space-y-4 border-[#10B981]/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#10B981] font-mono text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  ATOMIC SETTLEMENT COMPLETE
                </div>
                <Badge variant="emerald" className="font-mono">LEDGER COLLECTED</Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Ownership of <span className="font-mono text-zinc-100">{escrow.assetName}</span> has transferred to{" "}
                <span className="font-mono text-zinc-100">{escrow.buyerAlias}</span>, payout of{" "}
                <span className="font-mono text-[#10B981]">{formatCurrency(escrow.sellerPayout, escrow.currency)}</span> was released to{" "}
                <span className="font-mono text-zinc-100">{escrow.sellerAlias}</span>, and{" "}
                <span className="font-mono text-zinc-100">{formatCurrency(escrow.totalPlatformFee, escrow.currency)}</span> (7.5%) was booked to the Platform Revenue Ledger.
              </p>

              {escrow.decryptedCredential && (
                <div className="rounded-md bg-[#09090B] border border-[#10B981]/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#10B981]">
                      DECRYPTED TRANSFER CREDENTIAL (AUTHORIZED BUYER VAULT)
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealSecret((s) => !s)}
                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
                    >
                      {revealSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {revealSecret ? "Mask" : "Reveal"}
                    </button>
                  </div>
                  <div className="font-mono text-sm font-bold text-zinc-50 tracking-wide">
                    {revealSecret ? escrow.decryptedCredential : "••••••••••••••••••••••••"}
                  </div>
                </div>
              )}

              {escrow.decryptedBuyerSwapKey && (
                <div className="rounded-md bg-[#09090B] border border-[#3B82F6]/30 p-3.5 space-y-1">
                  <div className="font-mono text-[10px] uppercase text-[#60A5FA]">
                    DECRYPTED SWAP COUNTERPARTY KEY (RELEASED TO SELLER)
                  </div>
                  <div className="font-mono text-sm font-bold text-zinc-100">
                    {revealSecret ? escrow.decryptedBuyerSwapKey : "••••••••••••••••••••••••"}
                  </div>
                </div>
              )}
            </TerminalCard>
          )}

          {feedback && (
            <div
              className={cn(
                "rounded-md p-3 text-xs border",
                feedback.type === "ok"
                  ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                  : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#F87171]"
              )}
            >
              {feedback.msg}
            </div>
          )}

          {/* Immutable Escrow Audit Log */}
          <TerminalCard className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-2.5">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-zinc-200">
                <FileCode2 className="w-4 h-4 text-[#3B82F6]" />
                IMMUTABLE ESCROW AUDIT LOG ({auditLogs.length})
              </div>
              <span className="font-mono text-[10px] text-zinc-500">TAMPER-PROOF LEDGER</span>
            </div>
            <div className="space-y-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded bg-[#09090B] border border-[#27272A] p-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.action === "SETTLED" || log.action === "RDAP_VERIFIED"
                            ? "emerald"
                            : log.action === "DISPUTED" || log.action === "AUTO_REFUNDED"
                            ? "danger"
                            : "blue"
                        }
                        className="font-mono text-[10px]"
                      >
                        {log.action}
                      </Badge>
                      <span className="font-mono text-[10px] text-zinc-500">
                        ACTOR: {log.actorRole}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {new Date(log.createdAtIso).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">{log.details}</p>
                </div>
              ))}
            </div>
          </TerminalCard>
        </div>

        {/* Right 4 Cols: Blind Financial Summary + Dispute / Auto-Refund Guard */}
        <div className="lg:col-span-4 space-y-4">
          <TerminalCard className="p-4 space-y-3">
            <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 border-b border-[#27272A] pb-2">
              Escrow Ledger Breakdown
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Trade Code</span>
                <span className="font-mono font-semibold text-zinc-100">{escrow.tradeCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Buyer Desk (Masked)</span>
                <span className="font-mono text-zinc-200">{escrow.buyerAlias}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Seller Desk (Masked)</span>
                <span className="font-mono text-zinc-200">{escrow.sellerAlias}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment Rail</span>
                <span className="font-mono text-zinc-300">{escrow.paymentMethod}</span>
              </div>
              <div className="border-t border-[#27272A] pt-2 flex justify-between">
                <span className="text-zinc-400">Asset Price</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {formatCurrency(escrow.assetPrice, escrow.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Buyer Protection (2.5%)</span>
                <span className="font-mono text-zinc-300">
                  +{formatCurrency(escrow.buyerFee, escrow.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Seller Fee (5.0%)</span>
                <span className="font-mono text-zinc-300">
                  -{formatCurrency(escrow.sellerFee, escrow.currency)}
                </span>
              </div>
              <div className="border-t border-[#27272A] pt-2 flex justify-between">
                <span className="text-zinc-200 font-medium">Buyer Locked Deposit</span>
                <span className="font-mono font-bold text-[#F59E0B]">
                  {formatCurrency(escrow.totalBuyerDeposit, escrow.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-200 font-medium">Net Seller Payout</span>
                <span className="font-mono font-bold text-[#10B981]">
                  {formatCurrency(escrow.sellerPayout, escrow.currency)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500">Total Platform Take (7.5%)</span>
                <span className="font-mono text-zinc-400">
                  {formatCurrency(escrow.totalPlatformFee, escrow.currency)}
                </span>
              </div>
            </div>
          </TerminalCard>

          {/* Dispute & Auto-Refund Guard */}
          {!["SETTLED", "REFUNDED"].includes(escrow.state) && (
            <TerminalCard className="p-4 space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Dispute & Auto-Refund Guard
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                If seller fails to deposit valid transfer keys before the 24h SLA reaches <span className="font-mono text-zinc-300">00:00:00</span>, Cust0dy auto-cancels and refunds the buyer 100%.
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
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                    Open Concierge Dispute
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
                          "24h SLA expiry simulated: escrow auto-cancelled and 100% refunded to buyer."
                        )
                      }
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Simulate 24h SLA Expiry (Auto-Refund)
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={disputeInput}
                    onChange={(e) => setDisputeInput(e.target.value)}
                    placeholder="Describe transfer issue for Admin Ops..."
                    className="text-xs"
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
                          "Escrow frozen and escalated to Cust0dy Admin Ops Dispute Queue."
                        )
                      }
                    >
                      Freeze & Escalate
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
