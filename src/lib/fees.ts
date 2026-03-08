export type Marketplace = "ebay" | "stockx" | "goat";

export interface FeeLineItem {
  label: string;
  amount: number;
  rate?: number;
}

export interface FeeBreakdown {
  marketplace: Marketplace;
  salePrice: number;
  fees: FeeLineItem[];
  totalFees: number;
  netPayout: number;
  effectiveRate: number;
}

export interface FlipResult {
  marketplace: Marketplace;
  salePrice: number;
  purchasePrice: number;
  totalFees: number;
  netPayout: number;
  profit: number;
  roi: number;
  effectiveRate: number;
  feeBreakdown: FeeLineItem[];
}

export interface EbayFeeOptions {
  category: "sneakers" | "general" | "books_media";
  hasStore: boolean;
}

export interface StockXFeeOptions {
  sellerLevel: 1 | 2 | 3 | 4 | 5;
  hasQuickShip: boolean;
  hasSuccessfulShip: boolean;
  paymentProcessingWaived: boolean;
  shippingCost?: number;
}

export interface GoatFeeOptions {
  sellerRating: number;
  isCanadian: boolean;
  sellerFee?: number;
  cashOutRate?: number;
}

export interface FeeOptions {
  ebay?: EbayFeeOptions;
  stockx?: StockXFeeOptions;
  goat?: GoatFeeOptions;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateEbayFees(
  salePrice: number,
  options: EbayFeeOptions,
): FeeBreakdown {
  if (salePrice <= 0) {
    return {
      marketplace: "ebay",
      salePrice,
      fees: [],
      totalFees: 0,
      netPayout: 0,
      effectiveRate: 0,
    };
  }

  const fees: FeeLineItem[] = [];
  let fvfAmount: number;

  if (options.category === "sneakers") {
    let rate: number;
    if (salePrice >= 100) {
      rate = options.hasStore ? 0.07 : 0.08;
    } else {
      rate = options.hasStore ? 0.117 : 0.1255;
    }
    fvfAmount = round2(salePrice * rate);
    fees.push({ label: "Final Value Fee", amount: fvfAmount, rate });
  } else if (options.category === "books_media") {
    const rate = 0.153;
    fvfAmount = round2(salePrice * rate);
    fees.push({ label: "Final Value Fee", amount: fvfAmount, rate });
  } else {
    // general category - tiered
    if (salePrice <= 7500) {
      const rate = 0.1325;
      fvfAmount = round2(salePrice * rate);
      fees.push({ label: "Final Value Fee", amount: fvfAmount, rate });
    } else {
      const feeBelow = round2(7500 * 0.1325);
      const feeAbove = round2((salePrice - 7500) * 0.0235);
      fvfAmount = round2(feeBelow + feeAbove);
      fees.push({
        label: "Final Value Fee (first $7,500 at 13.25%)",
        amount: feeBelow,
        rate: 0.1325,
      });
      fees.push({
        label: "Final Value Fee (remainder at 2.35%)",
        amount: feeAbove,
        rate: 0.0235,
      });
    }
  }

  const perOrder = salePrice >= 10 ? 0.4 : 0.3;
  fees.push({ label: "Per-Order Fee", amount: perOrder });

  const totalFees = round2(fees.reduce((sum, f) => sum + f.amount, 0));
  const netPayout = round2(salePrice - totalFees);

  return {
    marketplace: "ebay",
    salePrice,
    fees,
    totalFees,
    netPayout,
    effectiveRate: round2((totalFees / salePrice) * 10000) / 10000,
  };
}

export function calculateStockXFees(
  salePrice: number,
  options: StockXFeeOptions,
): FeeBreakdown {
  if (salePrice <= 0) {
    return {
      marketplace: "stockx",
      salePrice,
      fees: [],
      totalFees: 0,
      netPayout: 0,
      effectiveRate: 0,
    };
  }

  const fees: FeeLineItem[] = [];
  const baseRates: Record<number, number> = {
    1: 0.09,
    2: 0.085,
    3: 0.08,
    4: 0.075,
    5: 0.07,
  };

  let txRate = baseRates[options.sellerLevel];

  if (options.sellerLevel >= 3) {
    if (options.hasQuickShip) txRate -= 0.01;
    if (options.hasSuccessfulShip) txRate -= 0.01;
  }

  txRate = Math.max(txRate, 0.05);

  const txFee = round2(salePrice * txRate);
  fees.push({ label: "Transaction Fee", amount: txFee, rate: txRate });

  if (!options.paymentProcessingWaived) {
    const ppFee = round2(salePrice * 0.03);
    fees.push({ label: "Payment Processing", amount: ppFee, rate: 0.03 });
  }

  const shipping = options.shippingCost ?? 13.95;
  fees.push({ label: "Shipping", amount: shipping });

  const totalFees = round2(fees.reduce((sum, f) => sum + f.amount, 0));
  const netPayout = round2(salePrice - totalFees);

  return {
    marketplace: "stockx",
    salePrice,
    fees,
    totalFees,
    netPayout,
    effectiveRate: round2((totalFees / salePrice) * 10000) / 10000,
  };
}

export function calculateGoatFees(
  salePrice: number,
  options: GoatFeeOptions,
): FeeBreakdown {
  if (salePrice <= 0) {
    return {
      marketplace: "goat",
      salePrice,
      fees: [],
      totalFees: 0,
      netPayout: 0,
      effectiveRate: 0,
    };
  }

  const fees: FeeLineItem[] = [];

  let commissionRate: number;
  if (options.sellerRating >= 90) commissionRate = 0.095;
  else if (options.sellerRating >= 70) commissionRate = 0.15;
  else if (options.sellerRating >= 50) commissionRate = 0.2;
  else commissionRate = 0.25;

  if (options.isCanadian) commissionRate += 0.029;

  const commissionFee = round2(salePrice * commissionRate);
  fees.push({
    label: "Commission",
    amount: commissionFee,
    rate: commissionRate,
  });

  const sellerFee = options.sellerFee ?? 5;
  fees.push({ label: "Seller Fee", amount: sellerFee });

  const cashOutRate = options.cashOutRate ?? 0.029;
  const afterDeductions = salePrice - commissionFee - sellerFee;
  const cashOutFee = round2(Math.max(0, afterDeductions) * cashOutRate);
  fees.push({ label: "Cash-Out Fee", amount: cashOutFee, rate: cashOutRate });

  const totalFees = round2(fees.reduce((sum, f) => sum + f.amount, 0));
  const netPayout = round2(salePrice - totalFees);

  return {
    marketplace: "goat",
    salePrice,
    fees,
    totalFees,
    netPayout,
    effectiveRate: round2((totalFees / salePrice) * 10000) / 10000,
  };
}

export function calculateFees(
  salePrice: number,
  marketplace: Marketplace,
  options: FeeOptions,
): FeeBreakdown {
  switch (marketplace) {
    case "ebay":
      return calculateEbayFees(
        salePrice,
        options.ebay ?? { category: "sneakers", hasStore: false },
      );
    case "stockx":
      return calculateStockXFees(
        salePrice,
        options.stockx ?? {
          sellerLevel: 1,
          hasQuickShip: false,
          hasSuccessfulShip: false,
          paymentProcessingWaived: false,
        },
      );
    case "goat":
      return calculateGoatFees(
        salePrice,
        options.goat ?? {
          sellerRating: 90,
          isCanadian: false,
        },
      );
  }
}

export function calculateFlip(
  purchasePrice: number,
  salePrices: Partial<Record<Marketplace, number>>,
  options: FeeOptions,
): FlipResult[] {
  const results: FlipResult[] = [];

  for (const [mp, price] of Object.entries(salePrices)) {
    if (price === undefined || price <= 0) continue;
    const marketplace = mp as Marketplace;
    const breakdown = calculateFees(price, marketplace, options);
    const profit = round2(breakdown.netPayout - purchasePrice);
    const roi =
      purchasePrice > 0 ? round2((profit / purchasePrice) * 10000) / 10000 : 0;

    results.push({
      marketplace,
      salePrice: price,
      purchasePrice,
      totalFees: breakdown.totalFees,
      netPayout: breakdown.netPayout,
      profit,
      roi,
      effectiveRate: breakdown.effectiveRate,
      feeBreakdown: breakdown.fees,
    });
  }

  return results.sort((a, b) => b.profit - a.profit);
}

export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toFixed(2);
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(2)}%`;
}

export function getDefaultFeeOptions(): FeeOptions {
  return {
    ebay: { category: "sneakers", hasStore: false },
    stockx: {
      sellerLevel: 1,
      hasQuickShip: false,
      hasSuccessfulShip: false,
      paymentProcessingWaived: false,
      shippingCost: 13.95,
    },
    goat: {
      sellerRating: 90,
      isCanadian: false,
      sellerFee: 5,
      cashOutRate: 0.029,
    },
  };
}
