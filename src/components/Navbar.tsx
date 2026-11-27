"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  ShieldCheck,
  ChevronDown,
  X,
  Mail,
  Wallet,
  Settings,
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

const DEMO_ROLES = [
  { id: "user_buyer_1", label: "Buyer", desc: "Shop, make offers & propose trades" },
  { id: "user_seller_1", label: "Seller", desc: "List assets & complete transfers" },
  { id: "user_admin_1", label: "Admin", desc: "Manage disputes & platform revenue" },
];

export function Navbar({
  currentUser,
  activeEscrowCount,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const [walletChain, setWalletChain] = useState<"ETH" | "SOL">("ETH");
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const currentRoleLabel =
    currentUser?.role === "ADMIN"
      ? "Admin"
      : currentUser?.id === "user_seller_1"
      ? "Seller"
      : "Buyer";

  async function handleSwitchRole(userId: string) {
    setSwitching(true);
    try {
      await fetch("/api/session/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setMenuOpen(false);
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setAuthMsg("Signing you in...");
    const res = await signIn("email-desk", {
      email: emailInput.trim(),
      redirect: false,
    });
    if (res?.ok) {
      setAuthModalOpen(false);
      setAuthMsg(null);
      router.refresh();
    } else {
      setAuthMsg("Could not sign in. Please check your email.");
    }
  }

  async function handleWalletSignIn(e: React.FormEvent) {
    e.preventDefault();
    const addr =
      walletInput.trim() ||
      (walletChain === "ETH"
        ? "0x91aF42cB80eD1120c4fE9011a442B7cE88A1f309"
        : "7kM2pQ9vX4nR8tW1yB5hJ3fL6dS9aU2cV4mN8pQ1xZ3");
    setAuthMsg("Connecting wallet...");
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
      setAuthMsg("Wallet connection failed.");
    }
  }

  const navItems = [
    { href: "/", label: "Explore" },
    { href: "/list", label: "Sell" },
    {
      href: "/dashboard",
      label: activeEscrowCount > 0 ? `My Orders (${activeEscrowCount})` : "My Orders",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-mono text-lg font-bold tracking-tight text-slate-900">
              Cust<span className="text-emerald-600">0</span>dy
            </span>
          </Link>

          {/* Clean 3-Link Center Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/asset/")
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3.5 py-2 rounded-full text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-zinc-100"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Subtle Profile Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              disabled={switching}
              className="flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-full bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 transition-colors text-xs font-medium text-slate-800 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{currentRoleLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-zinc-200 shadow-lg p-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400">
                  Switch view for testing
                </div>
                {DEMO_ROLES.map((r) => {
                  const isCurrent = currentUser?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSwitchRole(r.id)}
                      className={cn(
                        "w-full flex flex-col px-3 py-2 rounded-xl text-left transition-colors cursor-pointer",
                        isCurrent ? "bg-zinc-100 text-slate-900" : "hover:bg-zinc-50 text-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{r.label}</span>
                        {isCurrent && (
                          <span className="text-[11px] font-medium text-emerald-600">Active</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{r.desc}</span>
                    </button>
                  );
                })}

                <div className="border-t border-zinc-100 my-1.5 pt-1.5 space-y-1">
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-zinc-50 hover:text-slate-900"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Admin Console
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-zinc-50 hover:text-slate-900 cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Sign in with Email or Wallet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Friendly Sign-In Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Sign in to Cust0dy</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use your email or connect a wallet to buy, sell, or trade safely.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                Email Address
              </label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Button type="submit" variant="primary" className="w-full">
                Continue with Email
              </Button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-200" />
              <span className="px-3 text-xs text-slate-400">or</span>
              <div className="flex-grow border-t border-zinc-200" />
            </div>

            <form onSubmit={handleWalletSignIn} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-blue-600" />
                  Connect Wallet
                </label>
                <div className="flex gap-1">
                  {(["ETH", "SOL"] as const).map((chain) => (
                    <button
                      key={chain}
                      type="button"
                      onClick={() => setWalletChain(chain)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer",
                        walletChain === chain
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-zinc-200"
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
                placeholder="Paste wallet address or leave blank for quick demo"
              />
              <Button type="submit" variant="secondary" className="w-full">
                Connect {walletChain} Wallet
              </Button>
            </form>

            {authMsg && <p className="text-xs text-emerald-600 text-center">{authMsg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
