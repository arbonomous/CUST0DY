import { VerificationWizard } from "@/components/VerificationWizard";

export const dynamic = "force-dynamic";

export default function ListAssetPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-[#27272A] pb-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Automated Ownership Verification Engine
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl">
          Every listing on Cust0dy must prove cryptographic control via live{" "}
          <span className="font-mono text-zinc-200">DNS TXT</span> resolution or{" "}
          <span className="font-mono text-zinc-200">Bio Hash</span> verification before entering the blind order book.
        </p>
      </div>

      <VerificationWizard />
    </div>
  );
}
