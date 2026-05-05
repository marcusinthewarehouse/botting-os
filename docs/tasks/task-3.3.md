# Task 3.3: Enhanced Flip Calculator UI

## Objective

Upgrade the existing calculator page with real-time product search (autocomplete from pricing backend), side-by-side marketplace comparison, detailed fee breakdowns per marketplace, and save-to-history functionality.

## Context

The calculator page exists at `src/app/(dashboard)/calculator/page.tsx` from Phase 2. Currently it's a basic calculator. This task adds:

1. Product search bar with autocomplete (hits Task 3.1 pricing backend)
2. Live prices fetched from StockX, GOAT, FlightClub, eBay
3. Fee breakdown per marketplace (uses Task 3.2 fee engine)
4. Side-by-side comparison showing net profit on each platform
5. Manual price override for when API prices are stale/wrong
6. Save calculation to history (local SQLite)

This is the core "flip calculator" feature - the primary value prop of BottingOS for resellers.

## Dependencies

- Task 3.1 (Rust Pricing Backend) - provides `search_products`, `get_product_prices`, `search_ebay` commands
- Task 3.2 (Fee Calculation Engine) - provides `calculateFees()` function and `FeeBreakdown` type from `src/lib/fees.ts`

## Blocked By

- Task 3.1 must be complete (pricing data source)
- Task 3.2 must be complete (fee math)

## Research Findings

From `pricing-apis-implementation.md` Section 5 (Frontend Service Layer):

```typescript
// Pattern for calling pricing commands
const prices = await tauriInvoke<PriceResult[]>("search_products", {
  query,
  limit: 10,
});
const ebayItems = await tauriInvoke<EbayItemSummary[]>("search_ebay", {
  query,
  limit: 20,
});
```

From `shadcn-patterns` skill:

- Search with kbd shortcut hint
- Debounced input (300ms)
- Skeleton loading (never spinners)
- Profit/loss color: green-400 for profit, red-400 for loss
- Font-mono tabular-nums for all price values
- KPI cards for summary stats
- Empty states with icon + description + CTA

## Implementation Plan

### Step 1: Create frontend pricing service

```typescript
// src/services/pricing.ts
export const PricingService = {
  async searchProducts(query: string, limit = 10): Promise<ProductResult[]>,
  async getProductPrices(styleId: string): Promise<PriceData>,
  async searchEbay(query: string, limit = 20): Promise<EbayItemSummary[]>,
}
```

Uses lazy `invoke` imports per tauri-commands skill.

### Step 2: Build ProductSearch component

```
src/components/calculator/product-search.tsx
```

- Combobox/Command pattern from shadcn (uses cmdk)
- Debounced input (300ms)
- Shows product thumbnail, name, style ID, retail price in dropdown
- Loading skeleton while fetching
- On select: populate calculator with product data and trigger price fetch

### Step 3: Build PriceComparison component

```
src/components/calculator/price-comparison.tsx
```

- Side-by-side cards for each marketplace (StockX, GOAT, FlightClub, eBay)
- Each card shows: lowest ask, highest bid, last sale (where available)
- Size selector dropdown (populated from price data)
- "Source: live" or "Source: cached (2h ago)" indicator
- Stale data warning with refresh button
- Manual price override input per marketplace

### Step 4: Build FeeDetails component

```
src/components/calculator/fee-details.tsx
```

- Expandable fee breakdown per marketplace
- Shows each fee line item (label, rate, amount)
- Net payout after fees
- Profit = net payout - purchase price
- ROI percentage
- Color-coded: green for profit, red for loss
- "Best deal" badge on the marketplace with highest profit

### Step 5: Build CalculatorSettings panel

User-configurable fee parameters (persisted to localStorage or SQLite settings):

- eBay: store status, seller level
- StockX: seller level, quick ship, successful ship, processing waived
- GOAT: seller rating, location (US/Canada), seller fee
- Purchase price input (cost basis)
- Tax rate (optional, applied to purchase price)

### Step 6: Wire up the calculator page

Update `src/app/(dashboard)/calculator/page.tsx`:

```
[Product Search Bar]
[Selected Product Info: thumbnail, name, SKU, retail]
[Size Selector]
[Purchase Price Input] [Tax toggle]
---
[Price Comparison Grid - 3-4 marketplace cards side by side]
---
[Fee Details - expandable per marketplace]
---
[Summary: Best marketplace, profit, ROI]
[Save to History button]
```

### Step 7: Add calculation history

- Store in local SQLite `calculator_history` table or use existing `settings` table
- Show recent calculations below the calculator
- Click to reload a past calculation

## Files to Create

- `src/components/calculator/product-search.tsx`
- `src/components/calculator/price-comparison.tsx`
- `src/components/calculator/fee-details.tsx`
- `src/services/pricing.ts`

## Files to Modify

- `src/app/(dashboard)/calculator/page.tsx` - major rewrite with new components

## Contracts

### Provides

- Enhanced calculator page at `/calculator` route
- `PricingService` for reuse by other features (price alerts, inventory valuation)

### Consumes

- Task 3.1: `search_products`, `get_product_prices`, `search_ebay` Tauri commands
- Task 3.2: `calculateFlip`, `calculateFees`, `FeeBreakdown`, `FlipResult` types
- shadcn components: `Command`, `Card`, `Input`, `Button`, `Badge`, `Collapsible`, `Select`, `Skeleton`

## Acceptance Criteria

1. Typing "Jordan 1" in search bar shows autocomplete results within 3 seconds
2. Selecting a product populates prices from all available marketplaces
3. Fee breakdown is accurate (matches Task 3.2 unit test values)
4. Side-by-side comparison clearly shows which marketplace yields highest profit
5. Manual price override works and recalculates instantly
6. Size selector updates prices per size
7. Stale data shows warning with last-fetched timestamp
8. Save to history persists and can be reloaded
9. Empty state shown when no product selected
10. Loading skeletons during API calls (no spinners)
11. Responsive layout - stacks vertically on smaller screens

## Testing Protocol

### Unit Tests

- PricingService mock tests (invoke returns expected data)
- Fee calculation integration (pass real-ish prices through calculateFlip)

### Browser/Playwright

- Search for "Nike Dunk Low" - verify autocomplete populates
- Select product - verify price cards appear with data
- Change size - verify prices update
- Override a price manually - verify recalculation
- Save to history - verify persistence across page refresh
- Test with pricing API down - verify stale cache / error state

### Build Checks

- `npm run build` - static export succeeds
- `npx tsc --noEmit` - no type errors
- No console errors in browser during normal flow

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md` - design system, component patterns, search input, KPI cards, empty states
- `.claude/skills/tauri-commands/SKILL.md` - invoke patterns, lazy import

## Research Files to Read

- `.claude/orchestration-bottingos/research/pricing-apis-implementation.md` - Section 5 (Frontend Service Layer) for TypeScript invoke patterns
- `.claude/orchestration-bottingos/research/ui-ux-design.md` - if it exists, for calculator layout guidance

## Git

- **Branch**: `feat/3.3-enhanced-calculator`
- **Commit prefix**: `[calculator]`
