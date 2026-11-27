"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Shield,
  PlusCircle,
  LayoutDashboard,
  Terminal,
  Lock,
  Wallet,
  ChevronDown,
  X,
  Mail,
} from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface DeskUser {
  id: string;
  alias: string;
  name: string | null;
  email: string;
  role: string;
  walletAddress: string | null;
}

interface NavbarProps {
  currentUser: DeskUser | null;
  activeEscrowCount: number;
  firstActiveEscrowId: string | null;
}

const DEMO_DESKS = [
  { id: "user_buyer_1", label: "DESK_7F2A", roleTag: "BUYER", desc: "Alex Vance • ETH Wallet" },
  { id: "user_seller_1", label: "VAULT_9C1E", roleTag: "SELLER", desc: "Maren K. • SOL Wallet" },
  { id: "user_admin_1", label: "OPS_0001", roleTag: "ADMIN", desc: "Cust0dy Escrow Ops" },
];

export function Navbar({
  currentUser,
  activeEscrowCount,
  firstActiveEscrowId,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [deskMenuOpen, setDeskMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const [walletChain, setWalletChain] = useState<"ETH" | "SOL">("ETH");
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  async function handleSwitchDesk(userId: string) {
    setSwitching(true);
    try {
      await fetch("/api/session/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setDeskMenuOpen(false);
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setAuthMsg("Authenticating desk...");
    const res = await signIn("email-desk", {
      email: emailInput.trim(),
      redirect: false,
    });
    if (res?.ok) {
      // Clear demo override cookie by switching to authenticated session on next reload
      setAuthModalOpen(false);
      setAuthMsg(null);
      router.refresh();
    } else {
      setAuthMsg("Sign-in failed. Check email format.");
    }
  }

  async function handleWalletSignIn(e: React.FormEvent) {
    e.preventDefault();
    const addr =
      walletInput.trim() ||
      (walletChain === "ETH"
        ? "0x91aF42cB80eD1120c4fE9011a442B7cE88A1f309"
        : "7kM2pQ9vX4nR8tW1yB5hJ3fL6dS9aU2cV4mN8pQ1xZ3");
    setAuthMsg(`Verifying ${walletChain} signature...`);
    const res = await signIn("wallet-siwe", {
      address: addr,
      chain: walletChain,
      signature: `sig_cust0dy_${Date.now()}`,
      redirect: false,
    });
    if (res?.ok) {
      setAuthModalOpen(false);
      setAuthMsg(null);
      router.refresh();
    } else {
      setAuthMsg("Wallet verification failed.");
    }
  }

  const navItems = [
    { href: "/", label: "Order Book", icon: Terminal },
    { href: "/list", label: "Verify & List", icon: PlusCircle },
    { href: "/dashboard", label: "Portfolio", icon: LayoutDashboard },
    { href: "/admin", label: "Admin Ops", icon: Shield },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#09090B]/95 backdrop-blur border-b border-[#27272A]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded bg-[#121215] border border-[#27272A] flex items-center justify-center group-hover:border-[#3B82F6] transition-colors">
                <Lock className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-base font-bold tracking-tight text-zinc-50 leading-none">
                  CUST<span className="text-[#10B981]">0</span>DY
                </span>
                <span className="font-mono text-[9px] tracking-widest text-zinc-500 uppercase mt-0.5">
                  ESCROW TERMINAL
                </span>
              </div>
            </Link>

            {/* Primary Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/" || pathname.startsWith("/asset/")
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      active
                        ? "bg-[#121215] text-zinc-100 border border-[#27272A]"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-[#121215]/60"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Active Escrow Shortcut + Desk Persona Switcher */}
          <div className="flex items-center gap-2.5">
            {firstActiveEscrowId && (
              <Link
                href={`/escrow/${firstActiveEscrowId}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/15 transition-colors font-mono text-[11px] font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                {activeEscrowCount} IN CUSTODY
              </Link>
            )}

            {/* Desk Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDeskMenuOpen((o) => !o)}
                disabled={switching}
                className="flex items-center gap-2 h-8 px-2.5 rounded-md bg-[#121215] border border-[#27272A] hover:border-zinc-600 transition-colors text-xs cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span className="font-mono font-semibold text-zinc-100">
                  {currentUser?.alias ?? "DESK_7F2A"}
                </span>
                <span className="hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#18181C] text-zinc-400 border border-[#27272A]">
                  {currentUser?.role === "ADMIN"
                    ? "ADMIN"
                    : currentUser?.id === "user_seller_1"
                    ? "SELLER"
                    : "BUYER"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {deskMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg bg-[#121215] border border-[#27272A] shadow-2xl p-1.5 z-50">
                  <div className="px-2.5 py-1.5 border-b border-[#27272A] mb-1">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      Switch Active Trading Desk
                    </p>
                  </div>
                  {DEMO_DESKS.map((desk) => {
                    const isCurrent = currentUser?.id === desk.id;
                    return (
                      <button
                        key={desk.id}
                        type="button"
                        onClick={() => handleSwitchDesk(desk.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer",
                          isCurrent ? "bg-[#18181C] text-zinc-100" : "hover:bg-[#18181C]/70 text-zinc-300"
                        )}
                      >
                        <div>
                          <div className="font-mono text-xs font-semibold">{desk.label}</div>
                          <div className="text-[11px] text-zinc-500">{desk.desc}</div>
                        </div>
                        <span
                          className={cn(
                            "font-mono text-[10px] px-1.5 py-0.5 rounded border",
                            desk.roleTag === "ADMIN"
                              ? "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10"
                              : desk.roleTag === "SELLER"
                              ? "text-[#60A5FA] border-[#3B82F6]/30 bg-[#3B82F6]/10"
                              : "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10"
                          )}
                        >
                          {desk.roleTag}
                        </span>
                      </button>
                    );
                  })}
                  <div className="border-t border-[#27272A] mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDeskMenuOpen(false);
                        setAuthModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-300 hover:bg-[#18181C] cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5 text-[#3B82F6]" />
                      Connect Wallet (SIWE/SOL) / Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium shrink-0",
                  active ? "bg-[#121215] text-zinc-100 border border-[#27272A]" : "text-zinc-400"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Auth.js Email + Wallet Connect Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-[#121215] border border-[#27272A] p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  Authenticate Trading Desk
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Blind order-book identity via Email Magic Link or SIWE / Solana Wallet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWalletSignIn} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[#3B82F6]" />
                  Wallet Connect (SIWE / Solana)
                </label>
                <div className="flex gap-1">
                  {(["ETH", "SOL"] as const).map((chain) => (
                    <button
                      key={chain}
                      type="button"
                      onClick={() => setWalletChain(chain)}
                      className={cn(
                        "px-2 py-0.5 rounded font-mono text-[10px] border cursor-pointer",
                        walletChain === chain
                          ? "bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/40"
                          : "bg-[#09090B] text-zinc-500 border-[#27272A]"
                      )}
                    >
                      {chain}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder={
                  walletChain === "ETH"
                    ? "0x... (leave blank for instant SIWE demo wallet)"
                    : "Solana pubkey... (leave blank for demo wallet)"
                }
                className="font-mono text-xs"
              />
              <Button type="submit" variant="primary" className="w-full">
                Sign Message & Connect {walletChain} Wallet
              </Button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[#27272A]" />
              <span className="px-3 font-mono text-[10px] text-zinc-500 uppercase">OR</span>
              <div className="flex-grow border-t border-[#27272A]" />
            </div>

            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#10B981]" />
                Email / Magic Link Desk
              </label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="desk@fund.ai"
                required
              />
              <Button type="submit" variant="secondary" className="w-full">
                Continue with Email
              </Button>
            </form>

            {authMsg && (
              <p className="font-mono text-[11px] text-[#10B981] text-center">{authMsg}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
