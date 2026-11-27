import { VerificationWizard } from "@/components/VerificationWizard";

export const dynamic = "force-dynamic";

export default function ListAssetPage() {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Sell a Verified Domain or Handle
        </h1>
        <p className="text-sm text-slate-500">
          Confirm you own it in seconds, set your price, and get paid automatically once the transfer completes.
        </p>
      </div>
      <VerificationWizard />
    </div>
  );
}
