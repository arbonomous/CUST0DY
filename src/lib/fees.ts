export const BUYER_FEE_RATE = 0.025; // 2.5% buyer protection fee
export const SELLER_FEE_RATE = 0.05; // 5.0% seller fee
export const TOTAL_TAKE_RATE = 0.075; // 7.5% combined platform take rate

export interface EscrowFeeBreakdown {
  assetPrice: number;
  buyerFee: number;
  sellerFee: number;
  totalPlatformFee: number;
  totalBuyerDeposit: number;
  sellerPayout: number;
}

export function calculateEscrowFees(assetPrice: number): EscrowFeeBreakdown {
  const cleanPrice = Math.max(0, Number(assetPrice.toFixed(2)));
  const buyerFee = Number((cleanPrice * BUYER_FEE_RATE).toFixed(2));
  const sellerFee = Number((cleanPrice * SELLER_FEE_RATE).toFixed(2));
  const totalPlatformFee = Number((buyerFee + sellerFee).toFixed(2));
  const totalBuyerDeposit = Number((cleanPrice + buyerFee).toFixed(2));
  const sellerPayout = Number((cleanPrice - sellerFee).toFixed(2));

  return {
    assetPrice: cleanPrice,
    buyerFee,
    sellerFee,
    totalPlatformFee,
    totalBuyerDeposit,
    sellerPayout,
  };
}
