import { PrismaClient } from "@prisma/client";
import { encryptSecret } from "../src/lib/crypto";
import { calculateEscrowFees } from "../src/lib/fees";

const prisma = new PrismaClient();

function makeSparkline(base: number, trend: number): string {
  const days = ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "NOW"];
  const points = days.map((t, i) => {
    const progress = i / (days.length - 1);
    const wave = Math.sin(i * 1.4) * (base * 0.025);
    const val = Math.round(base * (1 - trend / 100) + base * (trend / 100) * progress + wave);
    return { t, p: Math.max(100, val) };
  });
  return JSON.stringify(points);
}

async function main() {
  console.log("Seeding Cust0dy database...");

  // Clear existing data in dependency order
  await prisma.platformFeeLedger.deleteMany();
  await prisma.escrowAuditLog.deleteMany();
  await prisma.escrowTransaction.deleteMany();
  await prisma.swapOffer.deleteMany();
  await prisma.order.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users (Buyer, Seller, Admin, Market Maker)
  const buyer = await prisma.user.create({
    data: {
      id: "user_buyer_1",
      email: "buyer@cust0dy.io",
      name: "Alex Vance (Buyer Desk)",
      alias: "DESK_7F2A",
      role: "USER",
      walletAddress: "0x7F2A91bC40dE8831a5fE0219c881A4eB39C0d412",
      walletChain: "ETH",
      stripeConnectId: "acct_1Cust0dyBuyer01",
      stripeOnboarded: true,
      usdcPayoutAddress: "0x7F2A91bC40dE8831a5fE0219c881A4eB39C0d412",
    },
  });

  const seller = await prisma.user.create({
    data: {
      id: "user_seller_1",
      email: "seller@cust0dy.io",
      name: "Maren K. (Vault Holder)",
      alias: "VAULT_9C1E",
      role: "USER",
      walletAddress: "9c1eX8kP2vM4nQ7rT5wZ3yB6hJ1fL8dS4aU2cV7mN9pQ",
      walletChain: "SOL",
      stripeConnectId: "acct_1Cust0dySeller01",
      stripeOnboarded: true,
      usdcPayoutAddress: "9c1eX8kP2vM4nQ7rT5wZ3yB6hJ1fL8dS4aU2cV7mN9pQ",
    },
  });

  const admin = await prisma.user.create({
    data: {
      id: "user_admin_1",
      email: "ops@cust0dy.io",
      name: "Cust0dy Escrow Ops",
      alias: "OPS_0001",
      role: "ADMIN",
      walletAddress: "0x0001Cust0dyOpsVault0000000000000000000001",
      walletChain: "ETH",
      stripeConnectId: "acct_1Cust0dyOps01",
      stripeOnboarded: true,
      usdcPayoutAddress: "0x0001Cust0dyOpsVault0000000000000000000001",
    },
  });

  const trader = await prisma.user.create({
    data: {
      id: "user_trader_2",
      email: "alpha@cust0dy.io",
      name: "Soren T. (Alpha Desk)",
      alias: "ALPHA_4B8D",
      role: "USER",
      walletAddress: "0x4B8D22fE19aC7742b9dE1038f221C9aA18B4e901",
      walletChain: "ETH",
      stripeOnboarded: false,
      usdcPayoutAddress: "0x4B8D22fE19aC7742b9dE1038f221C9aA18B4e901",
    },
  });

  // 2. Seed 12 Realistic Hype Digital Real Estate Assets
  const assetDefinitions = [
    {
      slug: "agent-ai",
      name: "agent.ai",
      category: "AI_DOMAIN",
      subCategory: ".ai",
      description: "Category-defining 5-letter .ai domain for autonomous AI systems. Clean registrar history, zero trademark conflicts, instant EPP transfer ready.",
      ownerId: seller.id,
      verificationMethod: "DNS_TXT",
      verificationCode: "cust0dy-verify=c0_98f2a1c4",
      registrarOrPlatform: "Cloudflare Registrar",
      swapEnabled: true,
      lowestAsk: 18500,
      highestBid: 16200,
      lastSalePrice: 17400,
      floorDelta24h: 12.4,
      status: "ACTIVE",
    },
    {
      slug: "quant-ai",
      name: "quant.ai",
      category: "AI_DOMAIN",
      subCategory: ".ai",
      description: "Institutional-grade 5-letter .ai domain tailored for algorithmic trading, quant research, and AI finance desks.",
      ownerId: seller.id,
      verificationMethod: "DNS_TXT",
      verificationCode: "cust0dy-verify=c0_41e8b9d2",
      registrarOrPlatform: "Namecheap",
      swapEnabled: true,
      lowestAsk: 9400,
      highestBid: 8600,
      lastSalePrice: 8900,
      floorDelta24h: 8.7,
      status: "IN_ESCROW",
    },
    {
      slug: "synth-ai",
      name: "synth.ai",
      category: "AI_DOMAIN",
      subCategory: ".ai",
      description: "Ultra-clean synthetic data & generative media .ai domain. High inbound institutional demand.",
      ownerId: trader.id,
      verificationMethod: "DNS_TXT",
      verificationCode: "cust0dy-verify=c0_73c1f0a8",
      registrarOrPlatform: "Porkbun",
      swapEnabled: true,
      lowestAsk: 12800,
      highestBid: 11500,
      lastSalePrice: 12000,
      floorDelta24h: 6.2,
      status: "ACTIVE",
    },
    {
      slug: "k0re-xyz",
      name: "k0re.xyz",
      category: "TECH_DOMAIN",
      subCategory: ".xyz",
      description: "Stylized 4-character cypherpunk .xyz domain with iconic zero-glyph branding. Ideal for Web3 protocols and security labs.",
      ownerId: buyer.id,
      verificationMethod: "DNS_TXT",
      verificationCode: "cust0dy-verify=c0_19a4d6e1",
      registrarOrPlatform: "Cloudflare Registrar",
      swapEnabled: true,
      lowestAsk: 2950,
      highestBid: 2400,
      lastSalePrice: 2600,
      floorDelta24h: 4.1,
      status: "ACTIVE",
    },
    {
      slug: "tensor-io",
      name: "tensor.io",
      category: "TECH_DOMAIN",
      subCategory: ".io",
      description: "Premier ML infrastructure .io domain. Recently cleared Cust0dy atomic escrow with verified RDAP handover.",
      ownerId: buyer.id,
      verificationMethod: "DNS_TXT",
      verificationCode: "cust0dy-verify=c0_55b7c2f9",
      registrarOrPlatform: "GoDaddy",
      swapEnabled: true,
      lowestAsk: 6750,
      highestBid: 5900,
      lastSalePrice: 6400,
      floorDelta24h: 9.5,
      status: "ACTIVE",
    },
    {
      slug: "vaulted-com",
      name: "vaulted.com",
      category: "TECH_DOMAIN",
      subCategory: ".com",
      description: "Single dictionary-word .com asset suited for custody, fintech, or luxury collectibles marketplaces.",
      ownerId: seller.id,
      verificationMethod: "DNS_TXT",
      verificationCode: "cust0dy-verify=c0_82d0e3b7",
      registrarOrPlatform: "Cloudflare Registrar",
      swapEnabled: false,
      lowestAsk: 24000,
      highestBid: 21500,
      lastSalePrice: 22800,
      floorDelta24h: 3.2,
      status: "ACTIVE",
    },
    {
      slug: "at-nexus",
      name: "@nexus",
      category: "SOCIAL_HANDLE",
      subCategory: "X",
      description: "Original 5-letter single-word X (Twitter) handle. Clean OGE history, zero shadowbans, ready for clean-room burner email handover.",
      ownerId: seller.id,
      verificationMethod: "BIO_HASH",
      verificationCode: "C0-8841",
      registrarOrPlatform: "X (Twitter)",
      swapEnabled: true,
      lowestAsk: 5200,
      highestBid: 4600,
      lastSalePrice: 4900,
      floorDelta24h: 11.2,
      status: "ACTIVE",
    },
    {
      slug: "at-zero",
      name: "@zero",
      category: "SOCIAL_HANDLE",
      subCategory: "X",
      description: "Tier-1 4-letter OG X handle. Extremely rare single-word handle with verified bio proof and concierge 2FA custody lock.",
      ownerId: trader.id,
      verificationMethod: "BIO_HASH",
      verificationCode: "C0-3092",
      registrarOrPlatform: "X (Twitter)",
      swapEnabled: true,
      lowestAsk: 14500,
      highestBid: 12800,
      lastSalePrice: 13200,
      floorDelta24h: 14.8,
      status: "ACTIVE",
    },
    {
      slug: "at-cipher",
      name: "@cipher",
      category: "SOCIAL_HANDLE",
      subCategory: "Telegram",
      description: "Fragment-compatible OG Telegram username. Currently locked in Cust0dy burner-vault inspection window.",
      ownerId: seller.id,
      verificationMethod: "BIO_HASH",
      verificationCode: "C0-9104",
      registrarOrPlatform: "Telegram",
      swapEnabled: true,
      lowestAsk: 3800,
      highestBid: 3500,
      lastSalePrice: 3500,
      floorDelta24h: 5.6,
      status: "IN_ESCROW",
    },
    {
      slug: "apex-eth",
      name: "apex.eth",
      category: "WEB3_NAME",
      subCategory: "ENS",
      description: "4-letter blue-chip ENS name registered through 2032. Clean on-chain provenance, swap-ready for domains or X handles.",
      ownerId: trader.id,
      verificationMethod: "BIO_HASH",
      verificationCode: "C0-5518",
      registrarOrPlatform: "ENS Registry",
      swapEnabled: true,
      lowestAsk: 7900,
      highestBid: 7100,
      lastSalePrice: 7450,
      floorDelta24h: 7.3,
      status: "ACTIVE",
    },
    {
      slug: "drift-sol",
      name: "drift.sol",
      category: "WEB3_NAME",
      subCategory: ".sol",
      description: "5-letter Solana Name Service (.sol) identity. Popular across Solana DeFi terminals and wallets.",
      ownerId: buyer.id,
      verificationMethod: "BIO_HASH",
      verificationCode: "C0-6729",
      registrarOrPlatform: "Bonfida SNS",
      swapEnabled: true,
      lowestAsk: 3400,
      highestBid: 2950,
      lastSalePrice: 3150,
      floorDelta24h: -2.1,
      status: "ACTIVE",
    },
    {
      slug: "at-vortex",
      name: "@vortex",
      category: "WEB3_NAME",
      subCategory: "Farcaster",
      description: "Early FID Farcaster handle with clean social graph. Swap-enabled for .ai or .xyz domains.",
      ownerId: seller.id,
      verificationMethod: "BIO_HASH",
      verificationCode: "C0-2190",
      registrarOrPlatform: "Farcaster",
      swapEnabled: true,
      lowestAsk: 2150,
      highestBid: 1850,
      lastSalePrice: 1950,
      floorDelta24h: 6.4,
      status: "ACTIVE",
    },
  ];

  const createdAssets: Record<string, { id: string; name: string; ownerId: string; lowestAsk: number | null }> = {};

  for (const def of assetDefinitions) {
    const asset = await prisma.asset.create({
      data: {
        ...def,
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        sparklineData: makeSparkline(def.lastSalePrice || def.lowestAsk || 2000, def.floorDelta24h),
      },
    });
    createdAssets[def.slug] = {
      id: asset.id,
      name: asset.name,
      ownerId: asset.ownerId,
      lowestAsk: asset.lowestAsk,
    };

    // Seed order-book depth (3 bids, 3 asks) per asset
    const askBase = def.lowestAsk || 5000;
    const bidBase = def.highestBid || 4200;

    await prisma.order.createMany({
      data: [
        // Asks
        { assetId: asset.id, userId: def.ownerId, side: "ASK", price: askBase, currency: "USD", status: "OPEN" },
        { assetId: asset.id, userId: def.ownerId, side: "ASK", price: Math.round(askBase * 1.06), currency: "USDC", status: "OPEN" },
        { assetId: asset.id, userId: def.ownerId, side: "ASK", price: Math.round(askBase * 1.14), currency: "USD", status: "OPEN" },
        // Bids
        { assetId: asset.id, userId: def.ownerId === buyer.id ? trader.id : buyer.id, side: "BID", price: bidBase, currency: "USDC", status: "OPEN" },
        { assetId: asset.id, userId: trader.id, side: "BID", price: Math.round(bidBase * 0.94), currency: "USD", status: "OPEN" },
        { assetId: asset.id, userId: buyer.id, side: "BID", price: Math.round(bidBase * 0.87), currency: "USDC", status: "OPEN" },
        // Recent filled trade for history
        { assetId: asset.id, userId: trader.id, side: "BID", price: def.lastSalePrice || bidBase, currency: "USD", status: "FILLED" },
      ],
    });
  }

  // 3. Seed 1 Pending Multi-Asset Swap Offer: [k0re.xyz + $1,800 USDC] for [@nexus]
  await prisma.swapOffer.create({
    data: {
      targetAssetId: createdAssets["at-nexus"].id,
      proposerId: buyer.id,
      receiverId: seller.id,
      offeredAssetIds: JSON.stringify([createdAssets["k0re-xyz"].id]),
      cashTopUp: 1800,
      currency: "USDC",
      status: "PENDING",
      note: "Offering verified k0re.xyz + $1,800 USDC top-up via Cust0dy atomic dual-vault escrow.",
    },
  });

  // 4. Seed Active Escrow #1: quant.ai in FUNDS_LOCKED (Domain Escrow awaiting Seller EPP Code)
  const fees1 = calculateEscrowFees(9400);
  const escrow1 = await prisma.escrowTransaction.create({
    data: {
      tradeCode: "C0-ESC-8841",
      type: "BUY_NOW",
      assetId: createdAssets["quant-ai"].id,
      buyerId: buyer.id,
      sellerId: seller.id,
      ...fees1,
      currency: "USD",
      paymentMethod: "STRIPE",
      paymentIntentId: "pi_c0_98f2a1c4e81240ab",
      state: "FUNDS_LOCKED",
      slaDeadline: new Date(Date.now() + 1000 * 60 * 60 * 21 + 1000 * 60 * 14), // 21h 14m left
    },
  });

  await prisma.escrowAuditLog.createMany({
    data: [
      {
        escrowId: escrow1.id,
        actorId: buyer.id,
        actorRole: "BUYER",
        action: "FUNDS_LOCKED",
        details: `Buyer desk ${buyer.alias} locked $${fees1.totalBuyerDeposit.toLocaleString()} USD (incl. 2.5% buyer protection) via Stripe manual-capture PaymentIntent.`,
        metadata: JSON.stringify({ paymentIntentId: escrow1.paymentIntentId, assetPrice: 9400 }),
      },
      {
        escrowId: escrow1.id,
        actorRole: "SYSTEM",
        action: "SLA_STARTED",
        details: "24-hour seller handover SLA countdown initiated. Counterparty identities masked.",
        metadata: JSON.stringify({ slaDeadline: escrow1.slaDeadline.toISOString() }),
      },
    ],
  });

  await prisma.platformFeeLedger.create({
    data: {
      escrowId: escrow1.id,
      grossAmount: fees1.assetPrice,
      buyerFee: fees1.buyerFee,
      sellerFee: fees1.sellerFee,
      totalFee: fees1.totalPlatformFee,
      currency: "USD",
      status: "PENDING",
    },
  });

  // 5. Seed Active Escrow #2: @cipher in VERIFICATION_RELEASE (Telegram handle with clean-room burner email bound & 2FA locked)
  const fees2 = calculateEscrowFees(3800);
  const encryptedBurnerNote = encryptSecret("TG-RECOVERY-2FA-LOCKED-C0-9104");
  const escrow2 = await prisma.escrowTransaction.create({
    data: {
      tradeCode: "C0-ESC-9104",
      type: "BUY_NOW",
      assetId: createdAssets["at-cipher"].id,
      buyerId: buyer.id,
      sellerId: seller.id,
      ...fees2,
      currency: "USDC",
      paymentMethod: "USDC_ESCROW",
      paymentIntentId: "0x8b4c9104e2f7a012d9c3b8e144a702f9",
      state: "VERIFICATION_RELEASE",
      slaDeadline: new Date(Date.now() + 1000 * 60 * 60 * 18),
      inspectionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 10 + 1000 * 60 * 42), // 10h 42m left
      burnerVaultEmail: "escrow-9104@vault.cust0dy.io",
      burner2faLocked: true,
      encryptedEppCode: encryptedBurnerNote.ciphertext,
      eppIv: encryptedBurnerNote.iv,
      eppAuthTag: encryptedBurnerNote.authTag,
      rdapVerified: true,
    },
  });

  await prisma.escrowAuditLog.createMany({
    data: [
      {
        escrowId: escrow2.id,
        actorId: buyer.id,
        actorRole: "BUYER",
        action: "FUNDS_LOCKED",
        details: `Buyer desk ${buyer.alias} locked $${fees2.totalBuyerDeposit.toLocaleString()} USDC into Cust0dy non-custodial vault.`,
        metadata: JSON.stringify({ txHash: escrow2.paymentIntentId }),
      },
      {
        escrowId: escrow2.id,
        actorId: seller.id,
        actorRole: "SELLER",
        action: "BURNER_2FA_LOCKED",
        details: "Seller bound @cipher to clean-room vault email escrow-9104@vault.cust0dy.io and disabled personal 2FA. Cust0dy platform 2FA engaged.",
        metadata: JSON.stringify({ burnerVaultEmail: escrow2.burnerVaultEmail, cipherFingerprint: encryptedBurnerNote.fingerprint }),
      },
      {
        escrowId: escrow2.id,
        actorRole: "SYSTEM",
        action: "INSPECTION_WINDOW_OPEN",
        details: "12-hour buyer inspection window opened. Awaiting buyer confirmation for atomic credential release & payout.",
        metadata: JSON.stringify({ inspectionDeadline: escrow2.inspectionDeadline?.toISOString() }),
      },
    ],
  });

  await prisma.platformFeeLedger.create({
    data: {
      escrowId: escrow2.id,
      grossAmount: fees2.assetPrice,
      buyerFee: fees2.buyerFee,
      sellerFee: fees2.sellerFee,
      totalFee: fees2.totalPlatformFee,
      currency: "USDC",
      status: "PENDING",
    },
  });

  // 6. Seed Completed Escrow #3: tensor.io SETTLED (populates GMV & Revenue Ledger)
  const fees3 = calculateEscrowFees(6400);
  const encryptedEpp3 = encryptSecret("EPP-TNSR-9941-X8Q2-K0");
  const escrow3 = await prisma.escrowTransaction.create({
    data: {
      tradeCode: "C0-ESC-7712",
      type: "BUY_NOW",
      assetId: createdAssets["tensor-io"].id,
      buyerId: buyer.id,
      sellerId: seller.id,
      ...fees3,
      currency: "USD",
      paymentMethod: "STRIPE",
      paymentIntentId: "pi_c0_7712a9b4c10e3f21",
      state: "SETTLED",
      slaDeadline: new Date(Date.now() - 1000 * 60 * 60 * 12),
      inspectionDeadline: new Date(Date.now() - 1000 * 60 * 60 * 2),
      encryptedEppCode: encryptedEpp3.ciphertext,
      eppIv: encryptedEpp3.iv,
      eppAuthTag: encryptedEpp3.authTag,
      rdapVerified: true,
      settledAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    },
  });

  await prisma.escrowAuditLog.createMany({
    data: [
      {
        escrowId: escrow3.id,
        actorId: buyer.id,
        actorRole: "BUYER",
        action: "FUNDS_LOCKED",
        details: `Buyer locked $${fees3.totalBuyerDeposit.toLocaleString()} USD via Stripe manual capture.`,
      },
      {
        escrowId: escrow3.id,
        actorId: seller.id,
        actorRole: "SELLER",
        action: "EPP_DEPOSITED",
        details: `Seller submitted EPP authorization code encrypted via AES-256-GCM (fingerprint ${encryptedEpp3.fingerprint}).`,
      },
      {
        escrowId: escrow3.id,
        actorRole: "SYSTEM",
        action: "RDAP_VERIFIED",
        details: "Automated RDAP/WHOIS transfer lock verification passed for tensor.io.",
      },
      {
        escrowId: escrow3.id,
        actorId: buyer.id,
        actorRole: "BUYER",
        action: "SETTLED",
        details: `Atomic settlement complete. EPP released to buyer, $${fees3.sellerPayout.toLocaleString()} released to seller, $${fees3.totalPlatformFee.toLocaleString()} (7.5%) logged to Platform Fee Ledger.`,
      },
    ],
  });

  await prisma.platformFeeLedger.create({
    data: {
      escrowId: escrow3.id,
      grossAmount: fees3.assetPrice,
      buyerFee: fees3.buyerFee,
      sellerFee: fees3.sellerFee,
      totalFee: fees3.totalPlatformFee,
      currency: "USD",
      status: "COLLECTED",
    },
  });

  console.log("Cust0dy seed complete: 4 users, 12 verified assets, 84 orders, 1 swap offer, 3 escrows.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
