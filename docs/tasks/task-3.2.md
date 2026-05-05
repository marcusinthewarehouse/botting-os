# Task 3.2: Fee Calculation Engine

## Objective

Build a comprehensive, testable fee calculation module for eBay, StockX, and GOAT. Pure TypeScript - no API calls, no side effects. This is the profit math that powers the flip calculator.

## Context

The flip calculator needs accurate fee breakdowns per marketplace so users can compare net profit across eBay, StockX, and GOAT before deciding where to sell. Fee structures differ significantly:

- eBay: category-based final value fee (8-13.25%) + per-order fee ($0.30-$0.40)
- StockX: seller-level-based transaction fee (7-10%) + 3% payment processing + shipping
- GOAT: rating-based commission (9.5-25%) + flat seller fee ($5-30) + 2.9% cash-out fee

All fee specs come from 2026 research. Fee structures change quarterly at most, so results can be cached for 7 days.

## Dependencies

- None (standalone pure TypeScript module)

## Blocked By

- Nothing - can be built in parallel with any other task

## Research Findings

From `pricing-apis-implementation.md` (Section 4: Fee Calculation Engine):

**eBay (2026):**

- Sneakers >= $100: 8% (no store) / 7% (basic store)
- Sneakers < $100: 12.55% (no store) / 11.7% (basic store)
- Most categories: 13.25% on first $7,500, 2.35% on remainder
- Per-order fee: $0.30 (sale < $10) / $0.40 (sale >= $10)
- Payment processing included in final value fee (Managed Payments)
- First 250 listings/month free, then $0.35 insertion fee

**StockX (2026):**

- Level 1: 9%, Level 2: 8.5%, Level 3: 8%, Level 4: 7.5%, Level 5: 7%
- Quick ship discount: -1% for shipping within 36 hours (Level 3+)
- Successful ship discount: -1% for 95%+ on-time (Level 3+)
- Floor: 5% minimum transaction fee
- Payment processing: 3% (sometimes waived as promotion)
- Shipping: ~$13.95 US standard (deducted from payout)

**GOAT (2026):**

- Rating >= 90: 9.5% commission
- Rating 70-89: 15%
- Rating 50-69: 20%
- Rating < 50: 25%
- Canadian sellers: +2.9% surcharge
- Flat seller fee: $5-$30 (varies by location, default $5 US)
- Cash-out fee: 2.9% on withdrawal

**Shipping defaults:**

- eBay: $0 (most sneaker sellers do free shipping, baked into price)
- StockX: $13.95 (deducted from payout)
- GOAT: $0 (covered by seller fee)

## Implementation Plan

### Step 1: Define types

```typescript
type Marketplace = "ebay" | "stockx" | "goat";

interface FeeBreakdown {
  marketplace: Marketplace;
  salePrice: number;
  fees: {
    label: string; // "Final Value Fee", "Transaction Fee", etc.
    amount: number;
    rate?: number; // percentage as decimal (0.08 = 8%)
  }[];
  totalFees: number;
  netPayout: number;
  effectiveRate: number; // totalFees / salePrice
}

interface FlipResult {
  marketplace: Marketplace;
  salePrice: number;
  purchasePrice: number;
  totalFees: number;
  netPayout: number;
  profit: number;
  roi: number; // percentage
  effectiveRate: number;
  feeBreakdown: FeeBreakdown["fees"];
}

interface EbayFeeOptions {
  category: "sneakers" | "general" | "books_media";
  hasStore: boolean;
}

interface StockXFeeOptions {
  sellerLevel: 1 | 2 | 3 | 4 | 5;
  hasQuickShip: boolean;
  hasSuccessfulShip: boolean;
  paymentProcessingWaived: boolean;
  shippingCost?: number; // default 13.95
}

interface GoatFeeOptions {
  sellerRating: number; // 0-100
  isCanadian: boolean;
  sellerFee?: number; // default 5
  cashOutRate?: number; // default 0.029
}

interface FeeOptions {
  ebay?: EbayFeeOptions;
  stockx?: StockXFeeOptions;
  goat?: GoatFeeOptions;
}
```

### Step 2: Implement per-marketplace calculators

```typescript
export function calculateEbayFees(
  salePrice: number,
  options: EbayFeeOptions,
): FeeBreakdown;
export function calculateStockXFees(
  salePrice: number,
  options: StockXFeeOptions,
): FeeBreakdown;
export function calculateGoatFees(
  salePrice: number,
  options: GoatFeeOptions,
): FeeBreakdown;
```

### Step 3: Implement unified calculator

```typescript
export function calculateFees(
  salePrice: number,
  marketplace: Marketplace,
  options: FeeOptions,
): FeeBreakdown;

export function calculateFlip(
  purchasePrice: number,
  salePrices: Partial<Record<Marketplace, number>>,
  options: FeeOptions,
): FlipResult[];
```

Returns results sorted by profit descending (best deal first).

### Step 4: Add helper utilities

```typescript
export function formatCurrency(cents: number): string; // 11000 -> "$110.00"
export function formatPercent(decimal: number): string; // 0.0825 -> "8.25%"
export function getDefaultFeeOptions(): FeeOptions;
```

### Step 5: Write comprehensive tests

Cover edge cases: $0 sale, negative profit, exactly-at-threshold prices, all seller levels, all categories.

## Files to Create

- `src/lib/fees.ts` - all fee calculation logic and types
- `src/lib/__tests__/fees.test.ts` - unit tests

## Files to Modify

- None

## Contracts

### Provides

```typescript
// Primary exports from src/lib/fees.ts
calculateEbayFees(salePrice: number, options: EbayFeeOptions): FeeBreakdown
calculateStockXFees(salePrice: number, options: StockXFeeOptions): FeeBreakdown
calculateGoatFees(salePrice: number, options: GoatFeeOptions): FeeBreakdown
calculateFees(salePrice: number, marketplace: Marketplace, options: FeeOptions): FeeBreakdown
calculateFlip(purchasePrice: number, salePrices: Partial<Record<Marketplace, number>>, options: FeeOptions): FlipResult[]

// Types
Marketplace, FeeBreakdown, FlipResult, EbayFeeOptions, StockXFeeOptions, GoatFeeOptions, FeeOptions
```

### Consumes

- Nothing - pure functions, no external dependencies

## Acceptance Criteria

1. `calculateEbayFees(200, { category: 'sneakers', hasStore: false })` returns totalFees of $16.40 (8% of $200 + $0.40)
2. `calculateStockXFees(200, { sellerLevel: 1, ... })` returns transaction fee of $18 (9%) + processing + shipping
3. `calculateGoatFees(200, { sellerRating: 95, ... })` returns commission of $19 (9.5%) + $5 seller fee + cash-out
4. `calculateFlip(100, { ebay: 200, stockx: 195, goat: 190 }, options)` returns 3 FlipResults sorted by profit
5. Edge cases handled: $0 price returns $0 fees, very high prices ($50,000+) calculate correctly
6. StockX floor rate of 5% enforced (Level 5 with both discounts)
7. All fee breakdown items have human-readable labels
8. 100% test coverage on all calculator functions

## Testing Protocol

### Unit Tests (Vitest)

```typescript
describe("calculateEbayFees", () => {
  it("sneakers >= $100 no store: 8% + $0.40");
  it("sneakers < $100 no store: 12.55% + $0.30");
  it("sneakers >= $100 with store: 7% + $0.40");
  it("general category: 13.25% + $0.40");
  it("general category > $7500: tiered rate");
  it("$0 sale price returns $0 fees");
});

describe("calculateStockXFees", () => {
  it("level 1: 9% + 3% processing + $13.95 shipping");
  it("level 5: 7% + 3% processing + $13.95 shipping");
  it("level 3 with both discounts: max discount applied, floor 5%");
  it("payment processing waived: 0% processing");
  it("custom shipping cost");
});

describe("calculateGoatFees", () => {
  it("rating 95: 9.5% + $5 + 2.9% cashout");
  it("rating 75: 15% + $5 + 2.9% cashout");
  it("rating 40: 25% + $5 + 2.9% cashout");
  it("canadian seller: +2.9% on commission");
  it("custom seller fee and cashout rate");
});

describe("calculateFlip", () => {
  it("sorts results by profit descending");
  it("calculates ROI correctly");
  it("handles missing marketplace prices");
  it("negative profit when fees exceed margin");
});
```

### Build Checks

- `npx vitest run src/lib/__tests__/fees.test.ts` - all tests pass
- `npx tsc --noEmit` - no type errors
- `npm run build` - no build errors

## Skills to Read

- None required (pure TypeScript logic)

## Research Files to Read

- `.claude/orchestration-bottingos/research/pricing-apis-implementation.md` - Section 4 (Fee Calculation Engine) has exact fee rates and code samples
- `.claude/orchestration-bottingos/research/marketplace-apis.md` - Section 4 (Comparative Summary) fee comparison table

## Git

- **Branch**: `feat/3.2-fee-engine`
- **Commit prefix**: `[fees]`
