"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  CheckCircle2,
  RefreshCcw,
  FileCode2,
  X,
  ExternalLink,
} from "lucide-react";
import { Badge, Button, TerminalCard } from "@/components/ui/primitives";
import { formatCurrency } from "@/lib/utils";
import {
  confirmSettlementAction,
  triggerAutoRefundAction,
} from "@/app/actions/escrow";

export interface AdminEscrowRow {
  id: string;
  tradeCode: string;
  assetName: string;
  type: string;
  state: string;
  buyerAlias: string;
  sellerAlias: string;
  assetPrice: number;
  totalPlatformFee: number;
  currency: string;
  eppCipherPreview: string | null;
  burnerVaultEmail: string | null;
  disputeReason: string | null;
  auditLogs: Array<{
    id: string;
    actorRole: string;
    action: string;
    details: string;
    metadata: string | null;
    createdAtIso: string;
  }>;
}

export interface FeeLedgerRow {
  id: string;
  tradeCode: string;
  assetName: string;
  grossAmount: number;
  buyerFee: number;
  sellerFee: number;
  totalFee: number;
  currency: string;
  status: string;
  createdAtIso: string;
}

export function AdminOpsClient({
  escrows,
  feeLedger,
}: {
  escrows: AdminEscrowRow[];
  feeLedger: FeeLedgerRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inspectedEscrow, setInspectedEscrow] = useState<AdminEscrowRow | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function handleApproveTransfer(escrowId: string, tradeCode: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await confirmSettlementAction(escrowId);
      if (!res.ok) {
        setMsg(`Override blocked: ${res.error}`);
        return;
      }
      setMsg(`Concierge override settled ${tradeCode}. Payout released & 7.5% fee collected.`);
      router.refresh();
    });
  }

  function handleForceRefund(escrowId: string, tradeCode: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await triggerAutoRefundAction(
        escrowId,
        "Admin Ops manual concierge refund override."
      );
      if (!res.ok) {
        setMsg(`Refund failed: ${res.error}`);
        return;
      }
      setMsg(`Concierge refund executed for ${tradeCode}. Buyer refunded 100%.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/30 p-3 text-xs text-[#60A5FA] font-mono">
          {msg}
        </div>
      )}

      {/* Escrow Operations & Dispute Resolution Table */}
      <TerminalCard className="overflow-hidden">
        <div className="px-4 py-3 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-zinc-200">
            <Shield className="w-4 h-4 text-[#F59E0B]" />
            ESCROW CUSTODY & CONCIERGE OVERRIDE QUEUE
          </div>
          <span className="font-mono text-[10px] text-zinc-500">
            SWITCH TO OPS_0001 [ADMIN] FOR FULL OVERRIDE AUTHORITY
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#0D0D10] font-mono text-[10px] uppercase text-zinc-500">
                <th className="py-2.5 px-4">Trade / Asset</th>
                <th className="py-2.5 px-3">Counterparties</th>
                <th className="py-2.5 px-3 text-right">GMV</th>
                <th className="py-2.5 px-3 text-right">7.5% Fee</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-4 text-right">Concierge Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/70">
              {escrows.map((e) => (
                <tr key={e.id} className="hover:bg-[#18181C]/60">
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-zinc-100">
                      {e.tradeCode} • {e.assetName}
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                      {e.eppCipherPreview
                        ? `AES-256 SEAL: ${e.eppCipherPreview}••`
                        : "NO VAULT KEY YET"}
                      {e.burnerVaultEmail ? ` • ${e.burnerVaultEmail}` : ""}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-zinc-400">
                    <div>B: {e.buyerAlias}</div>
                    <div>S: {e.sellerAlias}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-100">
                    {formatCurrency(e.assetPrice, e.currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-[#10B981]">
                    {formatCurrency(e.totalPlatformFee, e.currency)}
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
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setInspectedEscrow(e)}
                      >
                        <FileCode2 className="w-3 h-3" />
                        Audit Logs
                      </Button>
                      {["VERIFICATION_RELEASE", "DISPUTED"].includes(e.state) && (
                        <Button
                          size="sm"
                          variant="emerald"
                          disabled={isPending}
                          onClick={() => handleApproveTransfer(e.id, e.tradeCode)}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Approve
                        </Button>
                      )}
                      {!["SETTLED", "REFUNDED"].includes(e.state) && (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={isPending}
                          onClick={() => handleForceRefund(e.id, e.tradeCode)}
                        >
                          <RefreshCcw className="w-3 h-3" />
                          Refund
                        </Button>
                      )}
                      <Link href={`/escrow/${e.id}`}>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TerminalCard>

      {/* Platform Revenue Ledger */}
      <TerminalCard className="overflow-hidden">
        <div className="px-4 py-3 border-b border-[#27272A] flex items-center justify-between">
          <div className="font-mono text-xs font-semibold text-zinc-200">
            PLATFORM REVENUE LEDGER (5.0% SELLER + 2.5% BUYER = 7.5% TAKE RATE)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#0D0D10] font-mono text-[10px] uppercase text-zinc-500">
                <th className="py-2.5 px-4">Trade / Asset</th>
                <th className="py-2.5 px-3 text-right">Gross Volume</th>
                <th className="py-2.5 px-3 text-right">Buyer Fee (2.5%)</th>
                <th className="py-2.5 px-3 text-right">Seller Fee (5.0%)</th>
                <th className="py-2.5 px-3 text-right">Net Platform Fee</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/70 font-mono">
              {feeLedger.map((f) => (
                <tr key={f.id} className="hover:bg-[#18181C]/60">
                  <td className="py-2.5 px-4 text-zinc-100">
                    {f.tradeCode} • {f.assetName}
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-200">
                    {formatCurrency(f.grossAmount, f.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-400">
                    {formatCurrency(f.buyerFee, f.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-400">
                    {formatCurrency(f.sellerFee, f.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#10B981]">
                    {formatCurrency(f.totalFee, f.currency)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Badge
                      variant={
                        f.status === "COLLECTED"
                          ? "emerald"
                          : f.status === "REFUNDED"
                          ? "danger"
                          : "amber"
                      }
                      className="text-[10px]"
                    >
                      {f.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TerminalCard>

      {/* Encrypted Audit Log Inspector Modal */}
      {inspectedEscrow && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg bg-[#121215] border border-[#27272A] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-zinc-100">
                  ENCRYPTED AUDIT TRAIL — {inspectedEscrow.tradeCode} ({inspectedEscrow.assetName})
                </h3>
                <p className="text-xs text-zinc-500">
                  AES-256-GCM Ciphertext Prefix: {inspectedEscrow.eppCipherPreview || "N/A"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedEscrow(null)}
                className="text-zinc-500 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {inspectedEscrow.auditLogs.map((l) => (
                <div
                  key={l.id}
                  className="rounded bg-[#09090B] border border-[#27272A] p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-[#60A5FA] font-semibold">
                      [{l.actorRole}] {l.action}
                    </span>
                    <span className="text-zinc-500">
                      {new Date(l.createdAtIso).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-zinc-300">{l.details}</p>
                  {l.metadata && (
                    <pre className="text-[10px] font-mono text-zinc-500 bg-[#121215] p-2 rounded overflow-x-auto">
                      {l.metadata}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
