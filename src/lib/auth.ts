import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "cust0dy-dev-secret-replace-in-production-32bytes",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    // Email / Magic Link style desk sign-in
    Credentials({
      id: "email-desk",
      name: "Email Desk",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        if (!email || !email.includes("@")) return null;

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          const suffix = Math.random().toString(16).slice(2, 6).toUpperCase();
          user = await prisma.user.create({
            data: {
              email,
              name: email.split("@")[0],
              alias: `DESK_${suffix}`,
              role: "USER",
            },
          });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.alias,
        };
      },
    }),
    // Wallet Connect (SIWE / Solana signed message verification)
    Credentials({
      id: "wallet-siwe",
      name: "Wallet Connect (SIWE / Solana)",
      credentials: {
        address: { label: "Wallet Address", type: "text" },
        chain: { label: "Chain", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        const address = typeof credentials?.address === "string" ? credentials.address.trim() : "";
        const chain = credentials?.chain === "SOL" ? "SOL" : "ETH";
        if (!address || address.length < 16) return null;

        let user = await prisma.user.findFirst({ where: { walletAddress: address } });
        if (!user) {
          const short = address.slice(-4).toUpperCase();
          user = await prisma.user.create({
            data: {
              email: `${address.slice(0, 10).toLowerCase()}@wallet.cust0dy.io`,
              name: `${chain} Wallet ${short}`,
              alias: `${chain}_${short}`,
              role: "USER",
              walletAddress: address,
              walletChain: chain,
              usdcPayoutAddress: address,
            },
          });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.alias,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
});
