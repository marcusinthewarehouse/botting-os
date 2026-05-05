# Task 2.2: Flip Calculator (Rebuild)

## Objective

Migrate the flip calculator from localStorage to Drizzle/SQLite, rebuild the UI with proper shadcn components, and add per-marketplace fee breakdowns and calculation history. The calculator lets users enter an item name + purchase price and see profit projections across eBay, StockX, and GOAT.

## Context

The existing calculator lives at `src/app/(dashboard)/calculator/page.tsx` and uses localStorage. This task rebuilds it to use the `calculatorRepo` from the data access layer (Task 1.4) and wraps it in the new app shell (Task 2.1). The calculator is one of the most-used features - it answers "how much will I make if I flip this?"

## Dependencies

- Task 1.4 - `calculatorRepo` for saving/loading calculation history
- Task 2.1 - App shell, page header, design tokens, PageTransition wrapper

## Blocked By

- Task 1.4 (needs calculator repository)
- Task 2.1 (needs app shell and shared components)

## Research Findings

### Fee Structures (from DISCOVERY.md)

- **eBay**: ~13.25% total (12.35% final value fee for sneakers/apparel + ~$0.30 payment processing)
  - Category matters: Electronics 6.35%, Clothing/Shoes 12.35%, Trading Cards 12.35%
  - Seller rating can reduce fees slightly
- **StockX**: ~9% seller fee + ~3% payment processing = ~12% total
  - Level 1 seller: 9%, Level 2: 8.5%, Level 3: 8%, Level 4: 7.5%
  - $5 shipping fee on orders under $150
- **GOAT**: ~9.5% commission + $5 seller fee (or free for GOAT members)
  - Cash out fee: 2.9% if cashing out to PayPal (waived for GOAT credit)

### Calculator History Schema

```typescript
calculator_history: {
  (id, productName, sku, purchasePrice, resultsJson, createdAt);
}
```

`resultsJson` stores the full breakdown:

```json
{
  "ebay": { "salePrice": 250, "fees": 33.13, "shipping": 0, "profit": 106.87 },
  "stockx": { "salePrice": 240, "fees": 28.8, "shipping": 0, "profit": 101.2 },
  "goat": { "salePrice": 235, "fees": 27.33, "shipping": 0, "profit": 97.67 }
}
```

### UI Pattern

Two-panel layout:

- Left: Input form (product name, SKU, purchase price, sale prices per marketplace)
- Right: Fee breakdown cards per marketplace showing fees, shipping, net profit, ROI%

History list below the calculator showing recent calculations.

## Implementation Plan

### Step 1: Use Simple Inline Fee Estimates (Placeholder)

**IMPORTANT**: Do NOT create a separate fee calculation module here. Task 3.2 builds the comprehensive fee engine (`src/lib/fees.ts`) with accurate tiered rates. This task uses simple inline estimates just to show the UI pattern. Task 3.3 will replace this calculator page with the real fee engine.

Use hardcoded approximate rates inline in the page component:

```typescript
// Simple placeholder rates - Task 3.2 builds the real fee engine
const APPROX_FEES = { ebay: 0.1325, stockx: 0.12, goat: 0.125 };

function quickEstimate(
  salePrice: number,
  purchasePrice: number,
  feeRate: number,
) {
  const fees = salePrice * feeRate;
  const profit = salePrice - fees - purchasePrice;
  return {
    salePrice,
    fees: Math.round(fees * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    roi: Math.round((profit / purchasePrice) * 100),
  };
}
```

This is intentionally simple. The real fee engine (Task 3.2) handles seller levels, categories, flat fees, and tiered rates.

### Step 2: Create Fee Breakdown Component (src/components/calculator/fee-breakdown.tsx)

Card component showing a single marketplace's breakdown:

```tsx
interface FeeBreakdownProps {
  marketplace: "eBay" | "StockX" | "GOAT";
  breakdown: FeeBreakdown;
  icon: React.ReactNode;
}
```

Display:

- Marketplace name + icon at top
- Sale Price (text-lg, font-mono)
- Fees line (text-sm, text-red-400)
- Shipping line (text-sm)
- Net Profit (text-xl, green-400 or red-400)
- ROI% badge
- All currency values use `font-mono tabular-nums`

### Step 3: Create History List Component (src/components/calculator/history-list.tsx)

Shows recent calculations from calculator_history table:

```tsx
interface HistoryListProps {
  history: CalculatorHistory[];
  onSelect: (entry: CalculatorHistory) => void;
  onDelete: (id: number) => void;
}
```

Display:

- Each entry: product name, purchase price, date, best profit marketplace
- Click to reload into calculator
- Delete button (trash icon) on hover
- Empty state when no history
- Sorted by createdAt desc, limit 20

### Step 4: Rebuild Calculator Page (src/app/(dashboard)/calculator/page.tsx)

Layout:

```
<PageHeader title="Flip Calculator" />
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Input Form */}
  <div className="lg:col-span-1">
    <Card>
      <Input label="Product Name" />
      <Input label="SKU" />
      <Input label="Purchase Price" type="number" prefix="$" />
      <Separator />
      <Input label="eBay Sale Price" type="number" prefix="$" />
      <Input label="StockX Sale Price" type="number" prefix="$" />
      <Input label="GOAT Sale Price" type="number" prefix="$" />
      <Button>Calculate</Button>
    </Card>
  </div>
  {/* Results */}
  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
    <FeeBreakdown marketplace="eBay" />
    <FeeBreakdown marketplace="StockX" />
    <FeeBreakdown marketplace="GOAT" />
  </div>
</div>
<HistoryList />
```

Behaviors:

- Results update live as user types (debounced 200ms)
- Save to history on explicit "Save" button click
- Load from history fills all inputs
- Clear button resets all fields
- Tab between inputs with proper focus management
- Wrap in `<PageTransition>`

### Step 5: Remove localStorage Usage

Delete any localStorage reads/writes from the calculator. All persistence goes through `calculatorRepo`.

## Files to Create

- `src/lib/calculator/fees.ts` - Pure fee calculation functions
- `src/components/calculator/fee-breakdown.tsx` - Marketplace fee breakdown card
- `src/components/calculator/history-list.tsx` - Calculation history list

## Files to Modify

- `src/app/(dashboard)/calculator/page.tsx` - Full rebuild

## Contracts

### Provides (for downstream)

- `calculateAll()` function for fee calculations (reusable in analytics, inventory)
- Calculator page accessible at `/calculator` route

### Consumes (from upstream)

- `calculatorRepo` from Task 1.4 (create, getAll, remove)
- `<PageHeader>`, `<PageTransition>` from Task 2.1
- shadcn: Card, Input, Button, Separator
- Design tokens from globals.css

## Acceptance Criteria

- [ ] Calculator form has fields: product name, SKU, purchase price, 3 sale prices
- [ ] Fee calculations are correct for eBay (~13.25%), StockX (~12%), GOAT (~14.5%)
- [ ] Results show per-marketplace breakdown: sale price, fees, shipping, net profit, ROI%
- [ ] Results update live as user types (debounced)
- [ ] Profit values are green for positive, red for negative
- [ ] All currency values use `font-mono tabular-nums` formatting
- [ ] Calculations save to SQLite via calculatorRepo
- [ ] History list shows recent calculations
- [ ] Clicking history entry loads it into the calculator
- [ ] History entries can be deleted
- [ ] No localStorage usage remains
- [ ] Page wraps in PageTransition
- [ ] Design matches zinc dark theme with amber accent

## Testing Protocol

### Unit/Integration Tests

- Test fee calculations with known values:
  - $250 eBay sale, $110 purchase = ~$108.88 profit
  - $240 StockX sale, $110 purchase = ~$101.20 profit
  - $235 GOAT sale, $110 purchase = ~$102.68 profit
- Test edge cases: $0 sale price, negative profit, very large numbers

### Browser Testing (Playwright MCP)

- Navigate to calculator page
- Enter purchase price and sale prices
- Verify breakdown cards appear with correct values
- Save a calculation
- Verify it appears in history
- Click history entry, verify inputs populate
- Delete history entry, verify removal
- Take screenshot of full calculator view

### Build/Lint/Type Checks

- `npx tsc --noEmit`
- `npm run build`

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`
- `.claude/skills/bottingos-data-model/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/pricing-apis-implementation.md` (fee structures reference)

## Git

- Branch: feat/2.2-calculator-rebuild
- Commit message prefix: Task 2.2:
