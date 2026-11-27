import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TickerBar, type TickerItem } from "@/components/TickerBar";
import { Navbar } from "@/components/Navbar";
import { formatCurrency } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cust0dy — Live Order-Book & Automated Escrow for Digital Real Estate",
  description:
    "High-velocity blind order-book marketplace and AES-256 automated custody escrow for .ai/.xyz/.io/.com domains and OG social & Web3 handles.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, activeEscrows, recentAssets] = await Promise.all([
    getCurrentUser(),
    prisma.escrowTransaction.findMany({
      where: {
        state: { in: ["FUNDS_LOCKED", "CUSTODY_HANDOVER", "VERIFICATION_RELEASE"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, assetPrice: true },
    }),
    prisma.asset.findMany({
      where: { verificationStatus: "VERIFIED" },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { name: true, lastSalePrice: true, lowestAsk: true, floorDelta24h: true },
    }),
  ]);

  const activeVolume = activeEscrows.reduce((sum, e) => sum + e.assetPrice, 0) + 148_200;

  const tickerItems: TickerItem[] = [
    { label: "3L .AI FLOOR", value: "$4,250", delta: "+12.4%", positive: true, type: "FLOOR" },
    { label: "OG X HANDLES FLOOR", value: "$1,800", delta: "+8.2%", positive: true, type: "FLOOR" },
    { label: "24H ESCROW VOL", value: formatCurrency(activeVolume), delta: "+19.1%", positive: true, type: "VOLUME" },
    { label: "WEB3 .SOL / ENS FLOOR", value: "$2,950", delta: "+4.6%", positive: true, type: "FLOOR" },
    ...recentAssets
      .filter((a) => a.lastSalePrice)
      .slice(0, 4)
      .map((a) => ({
        label: `SOLD ${a.name}`,
        value: formatCurrency(a.lastSalePrice),
        delta: `${a.floorDelta24h >= 0 ? "+" : ""}${a.floorDelta24h.toFixed(1)}%`,
        positive: a.floorDelta24h >= 0,
        type: "SALE" as const,
      })),
  ];

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-[#09090B] text-zinc-100 antialiased selection:bg-[#3B82F6]/30 selection:text-white">
        <TickerBar items={tickerItems} />
        <Navbar
          currentUser={currentUser}
          activeEscrowCount={activeEscrows.length}
          firstActiveEscrowId={activeEscrows[0]?.id ?? null}
        />
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
