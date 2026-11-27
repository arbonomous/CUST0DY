"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  AtSign,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Terminal,
  ArrowRight,
} from "lucide-react";
import { Badge, Button, Input, TerminalCard } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import {
  generateChallengeAction,
  publishVerifiedAssetAction,
} from "@/app/actions/listing";

interface VerifyResponse {
  verified: boolean;
  simulated?: boolean;
  checkedTarget?: string;
  observedRecords?: string[];
  message: string;
}

export function VerificationWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [assetType, setAssetType] = useState<"DOMAIN" | "HANDLE">("DOMAIN");
  const [name, setName] = useState("neural.ai");
  const [subCategory, setSubCategory] = useState(".ai");
  const [registrarOrPlatform, setRegistrarOrPlatform] = useState("Cloudflare Registrar");
  const [challengeCode, setChallengeCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [simulateDev, setSimulateDev] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  // Step 3: Listing details once verified
  const [askPrice, setAskPrice] = useState("7500");
  const [description, setDescription] = useState(
    "Clean, high-demand digital asset with verified ownership proof and instant Cust0dy escrow handover readiness."
  );
  const [swapEnabled, setSwapEnabled] = useState(true);
  const [publishError, setPublishError] = useState<string | null>(null);

  function handleTypeSwitch(next: "DOMAIN" | "HANDLE") {
    setAssetType(next);
    setChallengeCode(null);
    setVerifyResult(null);
    setPublishError(null);
    if (next === "DOMAIN") {
      setName("neural.ai");
      setSubCategory(".ai");
      setRegistrarOrPlatform("Cloudflare Registrar");
      setSimulateDev(false);
    } else {
      setName("@pulse");
      setSubCategory("X");
      setRegistrarOrPlatform("X (Twitter)");
      setSimulateDev(true);
    }
  }

  function handleGenerateChallenge() {
    setVerifyResult(null);
    setPublishError(null);
    startTransition(async () => {
      const res = await generateChallengeAction(assetType);
      if (res.ok) setChallengeCode(res.code);
    });
  }

  async function handleCopy() {
    if (!challengeCode) return;
    await navigator.clipboard.writeText(challengeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleRunVerification() {
    if (!challengeCode || !name.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: assetType,
          target: name.trim(),
          platform: subCategory,
          expectedToken: challengeCode,
          simulate: simulateDev,
        }),
      });
      const data = (await res.json()) as VerifyResponse;
      setVerifyResult(data);
    } catch {
      setVerifyResult({
        verified: false,
        message: "Verification request failed. Check network or enable Dev Simulation.",
      });
    } finally {
      setVerifying(false);
    }
  }

  function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeCode || !verifyResult?.verified) return;
    setPublishError(null);

    startTransition(async () => {
      const res = await publishVerifiedAssetAction({
        type: assetType,
        name: name.trim(),
        subCategory,
        registrarOrPlatform,
        description: description.trim(),
        verificationCode: challengeCode,
        askPrice: Number(askPrice),
        swapEnabled,
      });

      if (!res.ok) {
        setPublishError(res.error);
        return;
      }
      router.push(`/asset/${res.slug}`);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left 7 Cols: Verification Flow */}
      <div className="lg:col-span-7 space-y-4">
        <TerminalCard className="p-5 space-y-5">
          {/* Asset Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeSwitch("DOMAIN")}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-md border text-left transition-colors cursor-pointer",
                assetType === "DOMAIN"
                  ? "bg-[#3B82F6]/12 border-[#3B82F6] text-zinc-100"
                  : "bg-[#09090B] border-[#27272A] text-zinc-400 hover:border-zinc-600"
              )}
            >
              <Globe className="w-4 h-4 text-[#3B82F6] shrink-0" />
              <div>
                <div className="text-xs font-semibold">Domain Name</div>
                <div className="font-mono text-[10px] text-zinc-500">
                  Live DNS TXT Verification
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeSwitch("HANDLE")}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-md border text-left transition-colors cursor-pointer",
                assetType === "HANDLE"
                  ? "bg-[#3B82F6]/12 border-[#3B82F6] text-zinc-100"
                  : "bg-[#09090B] border-[#27272A] text-zinc-400 hover:border-zinc-600"
              )}
            >
              <AtSign className="w-4 h-4 text-[#10B981] shrink-0" />
              <div>
                <div className="text-xs font-semibold">Social / Web3 Handle</div>
                <div className="font-mono text-[10px] text-zinc-500">
                  Bio Hash Code Verification
                </div>
              </div>
            </button>
          </div>

          {/* Step 1: Asset Identification */}
          <div className="space-y-3">
            <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              Step 1 — Identify Asset & Custodian
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] text-zinc-400">
                  {assetType === "DOMAIN" ? "Domain Name" : "Handle / Web3 Name"}
                </label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setVerifyResult(null);
                  }}
                  placeholder={assetType === "DOMAIN" ? "quant.ai" : "@nexus or vault.sol"}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">
                  {assetType === "DOMAIN" ? "TLD" : "Platform"}
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => {
                    setSubCategory(e.target.value);
                    if (assetType === "HANDLE") setRegistrarOrPlatform(e.target.value);
                  }}
                  className="h-9 w-full rounded-md bg-[#09090B] border border-[#27272A] px-2.5 font-mono text-xs text-zinc-200"
                >
                  {assetType === "DOMAIN" ? (
                    <>
                      <option value=".ai">.ai</option>
                      <option value=".xyz">.xyz</option>
                      <option value=".io">.io</option>
                      <option value=".com">.com</option>
                    </>
                  ) : (
                    <>
                      <option value="X">X (Twitter)</option>
                      <option value="Telegram">Telegram</option>
                      <option value="ENS">ENS (.eth)</option>
                      <option value=".sol">Solana (.sol)</option>
                      <option value="Farcaster">Farcaster</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">
                {assetType === "DOMAIN" ? "Current Registrar" : "Platform / Registry"}
              </label>
              <Input
                value={registrarOrPlatform}
                onChange={(e) => setRegistrarOrPlatform(e.target.value)}
                placeholder="Cloudflare Registrar, Namecheap, X..."
                className="text-xs"
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateChallenge}
              disabled={isPending || !name.trim()}
            >
              <Terminal className="w-3.5 h-3.5 text-[#10B981]" />
              {challengeCode ? "Regenerate Cryptographic Token" : "Generate Ownership Challenge"}
            </Button>
          </div>

          {/* Step 2: Verification Challenge */}
          {challengeCode && (
            <div className="space-y-3 pt-4 border-t border-[#27272A]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  Step 2 — Publish Proof & Verify
                </span>
                <label className="inline-flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={simulateDev}
                    onChange={(e) => setSimulateDev(e.target.checked)}
                    className="rounded border-[#27272A] bg-[#09090B] accent-[#10B981]"
                  />
                  <span className="font-mono text-[11px]">Simulate Verification (Dev Mode)</span>
                </label>
              </div>

              <div className="rounded-md bg-[#09090B] border border-[#27272A] p-3.5 space-y-2">
                <div className="text-xs text-zinc-400">
                  {assetType === "DOMAIN" ? (
                    <>
                      Add a <span className="font-mono text-zinc-200">TXT</span> record on{" "}
                      <span className="font-mono text-zinc-100">{name}</span> with value:
                    </>
                  ) : (
                    <>
                      Temporarily place this code in the bio of{" "}
                      <span className="font-mono text-zinc-100">{name}</span> ({subCategory}):
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 bg-[#121215] border border-[#27272A] rounded px-3 py-2">
                  <code className="font-mono text-sm font-semibold text-[#10B981] select-all">
                    {challengeCode}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <Button
                type="button"
                variant="emerald"
                onClick={handleRunVerification}
                disabled={verifying}
                className="w-full"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", verifying && "animate-spin")} />
                {verifying
                  ? assetType === "DOMAIN"
                    ? "Resolving Live DNS TXT Records..."
                    : "Inspecting Profile Bio Hash..."
                  : assetType === "DOMAIN"
                  ? "Verify Live DNS TXT Record"
                  : "Verify Bio Hash Code"}
              </Button>

              {verifyResult && (
                <div
                  className={cn(
                    "rounded-md p-3 border text-xs space-y-1.5",
                    verifyResult.verified
                      ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                      : "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      {verifyResult.verified ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {verifyResult.verified ? "VERIFIED OWNER BADGE AWARDED" : "VERIFICATION PENDING"}
                    </span>
                    {verifyResult.simulated && (
                      <Badge variant="amber" className="font-mono text-[10px]">
                        DEV SIMULATED
                      </Badge>
                    )}
                  </div>
                  <p className="text-zinc-300">{verifyResult.message}</p>
                  {verifyResult.observedRecords && verifyResult.observedRecords.length > 0 && (
                    <div className="font-mono text-[11px] text-zinc-400 pt-1">
                      Observed: {verifyResult.observedRecords.join(" | ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TerminalCard>
      </div>

      {/* Right 5 Cols: Step 3 Order-Book Listing Parameters */}
      <div className="lg:col-span-5">
        <TerminalCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Step 3 — Order-Book Parameters
              </h2>
              <p className="text-xs text-zinc-500">
                Unlocks automatically after cryptographic ownership proof passes.
              </p>
            </div>
            {verifyResult?.verified && (
              <Badge variant="emerald">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>

          <form onSubmit={handlePublish} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-500">
                Initial Ask Price (USD)
              </label>
              <Input
                type="number"
                min={100}
                step={50}
                value={askPrice}
                onChange={(e) => setAskPrice(e.target.value)}
                disabled={!verifyResult?.verified}
                className="font-mono text-sm"
                required
              />
              <p className="text-[11px] text-zinc-500">
                You receive 95% upon atomic settlement (5% seller fee).
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-500">
                Asset Brief (No External Links / Contact Info)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!verifyResult?.verified}
                className="w-full rounded-md bg-[#09090B] border border-[#27272A] px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] disabled:opacity-45"
                required
              />
            </div>

            <label className="flex items-center justify-between p-3 rounded-md bg-[#09090B] border border-[#27272A] cursor-pointer">
              <div>
                <div className="text-xs font-medium text-zinc-200">
                  Enable Multi-Asset Barter Swaps
                </div>
                <div className="text-[11px] text-zinc-500">
                  Allow verified buyers to offer 1–3 assets + USDC top-up
                </div>
              </div>
              <input
                type="checkbox"
                checked={swapEnabled}
                onChange={(e) => setSwapEnabled(e.target.checked)}
                disabled={!verifyResult?.verified}
                className="w-4 h-4 accent-[#3B82F6]"
              />
            </label>

            {publishError && (
              <div className="rounded-md bg-[#EF4444]/10 border border-[#EF4444]/30 p-2.5 text-xs text-[#F87171]">
                {publishError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!verifyResult?.verified || isPending}
            >
              {isPending ? "Publishing to Live Order Book..." : "Publish Verified Listing"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </TerminalCard>
      </div>
    </div>
  );
}
