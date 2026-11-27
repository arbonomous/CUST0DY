# CUST0DY — Live Order-Book & Automated Escrow Engine

**Cust0dy** is a high-velocity, StockX-style live order-book marketplace and automated custody escrow engine for hype digital real estate: high-demand domains (`.ai`, `.xyz`, `.io`, `.com`) and rare social / Web3 handles (`X`, `Telegram`, `ENS`, `.sol`, `Farcaster`).

## Core Architecture

- **Blind Order-Book Matching (`/`, `/asset/[slug]`):** Buyers and sellers never communicate directly before funds lock. Supports **Instant Buy**, **Blind Bids**, and **Atomic Multi-Asset Barter Swaps** (1–3 verified platform assets + optional USD/USDC top-up).
- **Automated Ownership Verification Engine (`/list`):**
  - **Domains:** Generates cryptographic `cust0dy-verify=c0_<hex>` TXT records and runs live Node.js `dns.promises.resolveTxt()` lookups (plus a Dev Simulation toggle for instant testing).
  - **Handles:** Generates unique `C0-XXXX` bio verification codes before awarding the `Verified Owner` badge.
- **Custody Hook Escrow Deal Room (`/escrow/[tradeId]`):**
  - Strict state machine: `FUNDS_LOCKED` → `CUSTODY_HANDOVER` → `VERIFICATION_RELEASE` → `SETTLED` (with `DISPUTED` & `REFUNDED` guards).
  - **AES-256-GCM Vault:** EPP authorization codes and dual-swap transfer keys are encrypted server-side with `crypto.createCipheriv("aes-256-gcm")` and only decrypted for the authorized recipient upon atomic settlement.
  - **Clean-Room Burner Email & 2FA Lock:** Generates `escrow-XXXX@vault.cust0dy.io` vaults for social handle custody handover.
  - **7.5% Take Rate:** `5.0%` seller fee + `2.5%` buyer protection fee logged to `PlatformFeeLedger`.
- **Portfolio & Swap Inventory (`/dashboard`)** and **Admin Revenue & Escrow Operations Console (`/admin`)**.

## Quick Start

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing Both Sides of Escrow & Swaps

Use the **Desk Switcher** in the top-right navbar to switch instantly between seeded personas:
- **`DESK_7F2A` (BUYER):** Place bids, execute Instant Buy, propose multi-asset swaps, confirm settlement release.
- **`VAULT_9C1E` (SELLER):** Deposit encrypted EPP codes (`C0-ESC-8841`), lock clean-room burner 2FA, accept incoming swap offers.
- **`OPS_0001` (ADMIN):** Inspect encrypted audit logs and execute concierge approve/refund overrides in `/admin`.

## Production Drop-In Adapters (`.env`)

Copy `.env.example` to `.env` and supply:
- `DATABASE_URL` (change `provider = "postgresql"` in `prisma/schema.prisma` for Postgres)
- `CUST0DY_VAULT_KEY` (32-byte / 64-hex-char AES-256-GCM key)
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` for live Stripe Connect Express + manual-capture PaymentIntents
- `SOLANA_RPC_URL` & `USDC_ESCROW_PROGRAM_ID` for live on-chain USDC/SOL escrow webhooks
