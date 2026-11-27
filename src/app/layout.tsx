import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Navbar } from "@/components/Navbar";

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
  title: "Cust0dy — Buy, Sell & Trade Verified Domains and Handles Safely",
  description:
    "The safe, simple marketplace for rare domains (.ai, .xyz, .io, .com) and social handles — with automated escrow protection on every deal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, activeEscrows] = await Promise.all([
    getCurrentUser(),
    prisma.escrowTransaction.findMany({
      where: {
        state: { in: ["FUNDS_LOCKED", "CUSTODY_HANDOVER", "VERIFICATION_RELEASE"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
  ]);

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#FAFAFA] text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-950">
        <Navbar
          currentUser={currentUser}
          activeEscrowCount={activeEscrows.length}
          firstActiveEscrowId={activeEscrows[0]?.id ?? null}
        />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
