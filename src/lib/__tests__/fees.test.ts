import { describe, it, expect } from 'vitest';
import {
  calculateEbayFees,
  calculateStockXFees,
  calculateGoatFees,
  calculateFees,
  calculateFlip,
  formatCurrency,
  formatPercent,
  getDefaultFeeOptions,
} from '@/lib/fees';

describe('calculateEbayFees', () => {
  it('sneakers >= $100 no store: 8% + $0.40', () => {
    const result = calculateEbayFees(200, { category: 'sneakers', hasStore: false });
    expect(result.totalFees).toBe(16.40);
    expect(result.fees[0].rate).toBe(0.08);
    expect(result.fees[0].amount).toBe(16);
    expect(result.fees[1].amount).toBe(0.40);
    expect(result.netPayout).toBe(183.60);
  });

  it('sneakers < $100 no store: 12.55% + $0.40', () => {
    const result = calculateEbayFees(80, { category: 'sneakers', hasStore: false });
    expect(result.fees[0].rate).toBe(0.1255);
    expect(result.fees[0].amount).toBe(10.04);
    expect(result.fees[1].amount).toBe(0.40);
    expect(result.totalFees).toBe(10.44);
  });

  it('sneakers < $10 no store: per-order fee is $0.30', () => {
    const result = calculateEbayFees(8, { category: 'sneakers', hasStore: false });
    expect(result.fees[1].amount).toBe(0.30);
  });

  it('sneakers >= $100 with store: 7% + $0.40', () => {
    const result = calculateEbayFees(200, { category: 'sneakers', hasStore: true });
    expect(result.fees[0].rate).toBe(0.07);
    expect(result.fees[0].amount).toBe(14);
    expect(result.totalFees).toBe(14.40);
  });

  it('sneakers < $100 with store: 11.7%', () => {
    const result = calculateEbayFees(80, { category: 'sneakers', hasStore: true });
    expect(result.fees[0].rate).toBe(0.117);
    expect(result.fees[0].amount).toBe(9.36);
  });

  it('general category <= $7500: 13.25% + $0.40', () => {
    const result = calculateEbayFees(500, { category: 'general', hasStore: false });
    expect(result.fees[0].rate).toBe(0.1325);
    expect(result.fees[0].amount).toBe(66.25);
    expect(result.totalFees).toBe(66.65);
  });

  it('general category > $7500: tiered rate', () => {
    const result = calculateEbayFees(10000, { category: 'general', hasStore: false });
    const feeBelow = 7500 * 0.1325; // 993.75
    const feeAbove = 2500 * 0.0235; // 58.75
    expect(result.fees[0].amount).toBe(993.75);
    expect(result.fees[1].amount).toBe(58.75);
    expect(result.fees[2].amount).toBe(0.40);
    expect(result.totalFees).toBe(1052.90);
  });

  it('books_media category: 15.3%', () => {
    const result = calculateEbayFees(100, { category: 'books_media', hasStore: false });
    expect(result.fees[0].rate).toBe(0.153);
    expect(result.fees[0].amount).toBe(15.30);
    expect(result.totalFees).toBe(15.70);
  });

  it('$0 sale price returns $0 fees', () => {
    const result = calculateEbayFees(0, { category: 'sneakers', hasStore: false });
    expect(result.totalFees).toBe(0);
    expect(result.netPayout).toBe(0);
    expect(result.fees).toHaveLength(0);
  });

  it('negative sale price returns $0 fees', () => {
    const result = calculateEbayFees(-50, { category: 'sneakers', hasStore: false });
    expect(result.totalFees).toBe(0);
  });

  it('marketplace is ebay', () => {
    const result = calculateEbayFees(200, { category: 'sneakers', hasStore: false });
    expect(result.marketplace).toBe('ebay');
    expect(result.salePrice).toBe(200);
  });

  it('very high price ($50,000) sneakers calculates correctly', () => {
    const result = calculateEbayFees(50000, { category: 'sneakers', hasStore: false });
    expect(result.fees[0].amount).toBe(4000);
    expect(result.totalFees).toBe(4000.40);
  });
});

describe('calculateStockXFees', () => {
  const baseOpts = {
    sellerLevel: 1 as const,
    hasQuickShip: false,
    hasSuccessfulShip: false,
    paymentProcessingWaived: false,
  };

  it('level 1: 9% + 3% processing + $13.95 shipping', () => {
    const result = calculateStockXFees(200, baseOpts);
    expect(result.fees[0].amount).toBe(18); // 9%
    expect(result.fees[0].rate).toBe(0.09);
    expect(result.fees[1].amount).toBe(6); // 3%
    expect(result.fees[2].amount).toBe(13.95);
    expect(result.totalFees).toBe(37.95);
    expect(result.netPayout).toBe(162.05);
  });

  it('level 2: 8.5%', () => {
    const result = calculateStockXFees(200, { ...baseOpts, sellerLevel: 2 });
    expect(result.fees[0].rate).toBe(0.085);
    expect(result.fees[0].amount).toBe(17);
  });

  it('level 3: 8%', () => {
    const result = calculateStockXFees(200, { ...baseOpts, sellerLevel: 3 });
    expect(result.fees[0].rate).toBe(0.08);
    expect(result.fees[0].amount).toBe(16);
  });

  it('level 4: 7.5%', () => {
    const result = calculateStockXFees(200, { ...baseOpts, sellerLevel: 4 });
    expect(result.fees[0].rate).toBe(0.075);
  });

  it('level 5: 7%', () => {
    const result = calculateStockXFees(200, { ...baseOpts, sellerLevel: 5 });
    expect(result.fees[0].rate).toBe(0.07);
    expect(result.fees[0].amount).toBe(14);
  });

  it('level 3 with quick ship: -1%', () => {
    const result = calculateStockXFees(200, { ...baseOpts, sellerLevel: 3, hasQuickShip: true });
    expect(result.fees[0].rate).toBe(0.07);
  });

  it('level 3 with both discounts: 6% (floor does not apply)', () => {
    const result = calculateStockXFees(200, {
      ...baseOpts,
      sellerLevel: 3,
      hasQuickShip: true,
      hasSuccessfulShip: true,
    });
    expect(result.fees[0].rate).toBeCloseTo(0.06, 10);
  });

  it('level 5 with both discounts: floor at 5%', () => {
    const result = calculateStockXFees(200, {
      ...baseOpts,
      sellerLevel: 5,
      hasQuickShip: true,
      hasSuccessfulShip: true,
    });
    expect(result.fees[0].rate).toBe(0.05);
    expect(result.fees[0].amount).toBe(10);
  });

  it('level 1 ignores discounts (below level 3)', () => {
    const result = calculateStockXFees(200, {
      ...baseOpts,
      sellerLevel: 1,
      hasQuickShip: true,
      hasSuccessfulShip: true,
    });
    expect(result.fees[0].rate).toBe(0.09);
  });

  it('payment processing waived: no processing fee', () => {
    const result = calculateStockXFees(200, { ...baseOpts, paymentProcessingWaived: true });
    expect(result.fees).toHaveLength(2); // tx + shipping only
    expect(result.totalFees).toBe(31.95);
  });

  it('custom shipping cost', () => {
    const result = calculateStockXFees(200, { ...baseOpts, shippingCost: 20 });
    expect(result.fees[2].amount).toBe(20);
  });

  it('$0 sale price returns $0 fees', () => {
    const result = calculateStockXFees(0, baseOpts);
    expect(result.totalFees).toBe(0);
    expect(result.fees).toHaveLength(0);
  });
});

describe('calculateGoatFees', () => {
  const baseOpts = { sellerRating: 95, isCanadian: false };

  it('rating >= 90: 9.5% + $5 seller fee + 2.9% cashout', () => {
    const result = calculateGoatFees(200, baseOpts);
    expect(result.fees[0].rate).toBe(0.095);
    expect(result.fees[0].amount).toBe(19); // 9.5% of 200
    expect(result.fees[1].amount).toBe(5); // seller fee
    // cashout on (200 - 19 - 5) = 176 * 0.029 = 5.10
    expect(result.fees[2].amount).toBe(5.10);
    expect(result.totalFees).toBe(29.10);
    expect(result.netPayout).toBe(170.90);
  });

  it('rating 75: 15% commission', () => {
    const result = calculateGoatFees(200, { sellerRating: 75, isCanadian: false });
    expect(result.fees[0].rate).toBe(0.15);
    expect(result.fees[0].amount).toBe(30);
  });

  it('rating 60: 20% commission', () => {
    const result = calculateGoatFees(200, { sellerRating: 60, isCanadian: false });
    expect(result.fees[0].rate).toBe(0.20);
    expect(result.fees[0].amount).toBe(40);
  });

  it('rating 40: 25% commission', () => {
    const result = calculateGoatFees(200, { sellerRating: 40, isCanadian: false });
    expect(result.fees[0].rate).toBe(0.25);
    expect(result.fees[0].amount).toBe(50);
  });

  it('canadian seller: +2.9% surcharge on commission', () => {
    const result = calculateGoatFees(200, { sellerRating: 95, isCanadian: true });
    expect(result.fees[0].rate).toBe(0.095 + 0.029);
    expect(result.fees[0].amount).toBe(24.80); // 12.4% of 200
  });

  it('custom seller fee', () => {
    const result = calculateGoatFees(200, { sellerRating: 95, isCanadian: false, sellerFee: 30 });
    expect(result.fees[1].amount).toBe(30);
  });

  it('custom cashout rate', () => {
    const result = calculateGoatFees(200, { sellerRating: 95, isCanadian: false, cashOutRate: 0.031 });
    // (200 - 19 - 5) * 0.031 = 176 * 0.031 = 5.46
    expect(result.fees[2].amount).toBe(5.46);
  });

  it('$0 sale price returns $0 fees', () => {
    const result = calculateGoatFees(0, baseOpts);
    expect(result.totalFees).toBe(0);
    expect(result.fees).toHaveLength(0);
  });

  it('effectiveRate is calculated correctly', () => {
    const result = calculateGoatFees(200, baseOpts);
    expect(result.effectiveRate).toBeCloseTo(29.10 / 200, 4);
  });

  it('boundary: exactly rating 90', () => {
    const result = calculateGoatFees(200, { sellerRating: 90, isCanadian: false });
    expect(result.fees[0].rate).toBe(0.095);
  });

  it('boundary: exactly rating 70', () => {
    const result = calculateGoatFees(200, { sellerRating: 70, isCanadian: false });
    expect(result.fees[0].rate).toBe(0.15);
  });

  it('boundary: exactly rating 50', () => {
    const result = calculateGoatFees(200, { sellerRating: 50, isCanadian: false });
    expect(result.fees[0].rate).toBe(0.20);
  });
});

describe('calculateFees', () => {
  it('routes to ebay calculator', () => {
    const result = calculateFees(200, 'ebay', { ebay: { category: 'sneakers', hasStore: false } });
    expect(result.marketplace).toBe('ebay');
    expect(result.totalFees).toBe(16.40);
  });

  it('routes to stockx calculator', () => {
    const result = calculateFees(200, 'stockx', {
      stockx: { sellerLevel: 1, hasQuickShip: false, hasSuccessfulShip: false, paymentProcessingWaived: false },
    });
    expect(result.marketplace).toBe('stockx');
    expect(result.totalFees).toBe(37.95);
  });

  it('routes to goat calculator', () => {
    const result = calculateFees(200, 'goat', { goat: { sellerRating: 95, isCanadian: false } });
    expect(result.marketplace).toBe('goat');
    expect(result.totalFees).toBe(29.10);
  });

  it('uses default options when marketplace options missing', () => {
    const result = calculateFees(200, 'ebay', {});
    expect(result.marketplace).toBe('ebay');
    expect(result.totalFees).toBe(16.40);
  });
});

describe('calculateFlip', () => {
  const options = getDefaultFeeOptions();

  it('returns results sorted by profit descending', () => {
    const results = calculateFlip(100, { ebay: 200, stockx: 195, goat: 190 }, options);
    expect(results).toHaveLength(3);
    expect(results[0].profit).toBeGreaterThanOrEqual(results[1].profit);
    expect(results[1].profit).toBeGreaterThanOrEqual(results[2].profit);
  });

  it('calculates ROI correctly', () => {
    const results = calculateFlip(100, { ebay: 200 }, options);
    const r = results[0];
    expect(r.roi).toBeCloseTo(r.profit / 100, 4);
  });

  it('handles missing marketplace prices', () => {
    const results = calculateFlip(100, { ebay: 200 }, options);
    expect(results).toHaveLength(1);
    expect(results[0].marketplace).toBe('ebay');
  });

  it('handles empty prices', () => {
    const results = calculateFlip(100, {}, options);
    expect(results).toHaveLength(0);
  });

  it('negative profit when fees exceed margin', () => {
    const results = calculateFlip(190, { stockx: 200 }, options);
    expect(results[0].profit).toBeLessThan(0);
  });

  it('profit = netPayout - purchasePrice', () => {
    const results = calculateFlip(100, { ebay: 200 }, options);
    const r = results[0];
    expect(r.profit).toBe(r.netPayout - r.purchasePrice);
  });

  it('skips zero and negative prices', () => {
    const results = calculateFlip(100, { ebay: 0, stockx: -10, goat: 200 }, options);
    expect(results).toHaveLength(1);
    expect(results[0].marketplace).toBe('goat');
  });

  it('purchasePrice 0 gives roi 0', () => {
    const results = calculateFlip(0, { ebay: 200 }, options);
    expect(results[0].roi).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats positive amount', () => {
    expect(formatCurrency(123.45)).toBe('$123.45');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amount', () => {
    expect(formatCurrency(-50.10)).toBe('-$50.10');
  });

  it('rounds to 2 decimals', () => {
    expect(formatCurrency(99.999)).toBe('$100.00');
  });
});

describe('formatPercent', () => {
  it('formats decimal to percentage', () => {
    expect(formatPercent(0.0825)).toBe('8.25%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('formats 100%', () => {
    expect(formatPercent(1)).toBe('100.00%');
  });
});

describe('getDefaultFeeOptions', () => {
  it('returns complete default options', () => {
    const opts = getDefaultFeeOptions();
    expect(opts.ebay).toBeDefined();
    expect(opts.stockx).toBeDefined();
    expect(opts.goat).toBeDefined();
    expect(opts.ebay!.category).toBe('sneakers');
    expect(opts.stockx!.sellerLevel).toBe(1);
    expect(opts.goat!.sellerRating).toBe(90);
  });
});
