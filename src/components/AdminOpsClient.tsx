"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCcw, FileText, X } from "lucide-react";
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
  const [inspected, setInspected] = useState<AdminEscrowRow | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function handleApprove(escrowId: string, code: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await confirmSettlementAction(escrowId);
      setMsg(res.ok ? `Approved & settled ${code}.` : `Error: ${res.error}`);
      router.refresh();
    });
  }

  function handleRefund(escrowId: string, code: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await triggerAutoRefundAction(escrowId, "Admin concierge refund.");
      setMsg(res.ok ? `Refunded ${code} 100% to buyer.` : `Error: ${res.error}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs font-medium text-blue-800">
          {msg}
        </div>
      )}

      <TerminalCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 font-semibold text-sm text-slate-900">
          Active Transfers &amp; Support Overrides
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-slate-500">
                <th className="py-3 px-5 font-medium">Item</th>
                <th className="py-3 px-4 font-medium text-right">Sale Value</th>
                <th className="py-3 px-4 font-medium text-right">Fee (7.5%)</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {escrows.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50/70">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900">{e.assetName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{e.tradeCode}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                    {formatCurrency(e.assetPrice, e.currency)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                    {formatCurrency(e.totalPlatformFee, e.currency)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={e.state === "SETTLED" ? "emerald" : e.state === "REFUNDED" ? "danger" : "amber"}>
                      {e.state}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setInspected(e)}>
                        <FileText className="w-3.5 h-3.5" />
                        Logs
                      </Button>
                      {["VERIFICATION_RELEASE", "DISPUTED"].includes(e.state) && (
                        <Button size="sm" variant="emerald" disabled={isPending} onClick={() => handleApprove(e.id, e.tradeCode)}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                      )}
                      {!["SETTLED", "REFUNDED"].includes(e.state) && (
                        <Button size="sm" variant="danger" disabled={isPending} onClick={() => handleRefund(e.id, e.tradeCode)}>
                          <RefreshCcw className="w-3.5 h-3.5" />
                          Refund
                        </Button>
                      )}
                      <Link href={`/escrow/${e.id}`}>
                        <Button size="sm" variant="ghost">View</Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TerminalCard>

      <TerminalCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 font-semibold text-sm text-slate-900">
          Platform Revenue Ledger (7.5% Take Rate)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-slate-500">
                <th className="py-3 px-5 font-medium">Order</th>
                <th className="py-3 px-4 font-medium text-right">Gross</th>
                <th className="py-3 px-4 font-medium text-right">Net Fee</th>
                <th className="py-3 px-5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {feeLedger.map((f) => (
                <tr key={f.id}>
                  <td className="py-3 px-5 font-medium text-slate-900">
                    {f.assetName} <span className="text-slate-400 font-mono ml-1">{f.tradeCode}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(f.grossAmount, f.currency)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-700">{formatCurrency(f.totalFee, f.currency)}</td>
                  <td className="py-3 px-5 text-right">
                    <Badge variant={f.status === "COLLECTED" ? "emerald" : f.status === "REFUNDED" ? "danger" : "amber"}>
                      {f.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TerminalCard>

      {inspected && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white border border-zinc-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Audit Log — {inspected.assetName} ({inspected.tradeCode})
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  AES-256 Seal: {inspected.eppCipherPreview || "Pending"}
                </p>
              </div>
              <button type="button" onClick={() => setInspected(null)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {inspected.auditLogs.map((l) => (
                <div key={l.id} className="rounded-xl bg-zinc-50 border border-zinc-200/70 p-3.5 text-xs space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="font-mono font-semibold text-slate-700">[{l.actorRole}] {l.action}</span>
                    <span>{new Date(l.createdAtIso).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600">{l.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
