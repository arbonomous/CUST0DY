"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, AtSign, CheckCircle2, Copy, Check, ArrowRight } from "lucide-react";
import { Button, Input, TerminalCard } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import {
  generateChallengeAction,
  publishVerifiedAssetAction,
} from "@/app/actions/listing";

interface VerifyResponse {
  verified: boolean;
  message: string;
}

export function VerificationWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [assetType, setAssetType] = useState<"DOMAIN" | "HANDLE">("DOMAIN");
  const [name, setName] = useState("neural.ai");
  const [subCategory, setSubCategory] = useState(".ai");
  const [registrarOrPlatform, setRegistrarOrPlatform] = useState("Cloudflare");
  const [challengeCode, setChallengeCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [simulateDev, setSimulateDev] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);

  const [askPrice, setAskPrice] = useState("7500");
  const [description, setDescription] = useState(
    "Clean, memorable digital asset ready for fast, safe transfer via Cust0dy."
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
      setRegistrarOrPlatform("Cloudflare");
    } else {
      setName("@pulse");
      setSubCategory("X");
      setRegistrarOrPlatform("X (Twitter)");
    }
  }

  function handleGenerateChallenge() {
    setVerifyResult(null);
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
      setVerifyResult({ verified: false, message: "Verification check failed." });
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
    <div className="max-w-2xl mx-auto space-y-6">
      <TerminalCard className="p-6 sm:p-8 space-y-6">
        {/* Choose what you're selling */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">What are you listing?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeSwitch("DOMAIN")}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer",
                assetType === "DOMAIN"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-zinc-200 hover:border-zinc-300"
              )}
            >
              <Globe className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-sm font-semibold">Domain Name</div>
                <div className={cn("text-xs", assetType === "DOMAIN" ? "text-zinc-300" : "text-slate-400")}>
                  .ai, .xyz, .io, .com
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch("HANDLE")}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer",
                assetType === "HANDLE"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-zinc-200 hover:border-zinc-300"
              )}
            >
              <AtSign className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-sm font-semibold">Social / Web3 Handle</div>
                <div className={cn("text-xs", assetType === "HANDLE" ? "text-zinc-300" : "text-slate-400")}>
                  X, Telegram, ENS, .sol
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 1: Enter Name & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              {assetType === "DOMAIN" ? "Domain Name" : "Handle"}
            </label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setVerifyResult(null); }}
              placeholder={assetType === "DOMAIN" ? "neural.ai" : "@pulse"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Asking Price (USD)</label>
            <Input
              type="number"
              min={100}
              step={50}
              value={askPrice}
              onChange={(e) => setAskPrice(e.target.value)}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={handleGenerateChallenge}
          disabled={isPending || !name.trim()}
        >
          {challengeCode ? "Generate New Verification Code" : "Step 1: Get Ownership Verification Code"}
        </Button>

        {/* Step 2: Verify Ownership */}
        {challengeCode && (
          <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-semibold text-slate-800">
                {assetType === "DOMAIN"
                  ? "Add this verification code to your domain DNS settings:"
                  : "Temporarily add this code to your profile bio:"}
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulateDev}
                  onChange={(e) => setSimulateDev(e.target.checked)}
                  className="accent-emerald-600"
                />
                Quick test mode
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 bg-white border border-zinc-200 rounded-xl px-4 py-3">
              <code className="font-mono text-sm font-semibold text-emerald-700 select-all">
                {challengeCode}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <Button
              type="button"
              variant="emerald"
              className="w-full"
              onClick={handleRunVerification}
              disabled={verifying}
            >
              {verifying ? "Checking..." : "Step 2: Verify Ownership Now"}
            </Button>

            {verifyResult && (
              <div
                className={cn(
                  "rounded-xl p-3.5 text-xs font-medium flex items-center gap-2 border",
                  verifyResult.verified
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                )}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{verifyResult.verified ? "Ownership verified! You're ready to list." : verifyResult.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Publish */}
        {verifyResult?.verified && (
          <form onSubmit={handlePublish} className="space-y-4 pt-4 border-t border-zinc-100">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Short Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl bg-white border border-zinc-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
              <div>
                <div className="text-xs font-semibold text-slate-900">Allow Trade Offers</div>
                <div className="text-xs text-slate-500">Let buyers offer their verified domains/handles + cash</div>
              </div>
              <input
                type="checkbox"
                checked={swapEnabled}
                onChange={(e) => setSwapEnabled(e.target.checked)}
                className="w-4 h-4 accent-slate-900"
              />
            </label>

            {publishError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {publishError}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Publishing Listing..." : "Publish Verified Listing"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}
      </TerminalCard>
    </div>
  );
}
