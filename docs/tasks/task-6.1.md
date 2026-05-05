# Task 6.1: Analytics Dashboard

## Objective

Build an analytics dashboard with line charts for profit/spend over time, bar charts for bot performance and ROI by category, summary KPI cards, and a time range selector. Data is aggregated from orders, sales, and inventory tables.

## Context

BottingOS tracks orders, inventory, and sales. Users need a bird's-eye view of their business performance: how much profit they've made, which bots perform best, which product categories yield the highest ROI. This dashboard aggregates existing data into visual charts and KPI cards. When no data exists, show a clean empty state encouraging users to add orders.

## Dependencies

- Phase 1: Drizzle ORM, schema (orders, inventory_items, tracker_entries tables)
- Phase 2: Tracker entries (tracker_entries populated via manual entry)
- Phase 4: Order + inventory data (orders synced from Supabase, inventory_items with sold status)

## Blocked By

- Phase 4 (needs order and inventory data to aggregate)

## Research Findings

### Chart Library

- Use `recharts` - lightweight, React-native, good dark theme support
- Install: `npm install recharts`
- Responsive containers: `<ResponsiveContainer width="100%" height={300}>`
- Dark theme: set axis/grid stroke colors to zinc-700, text to zinc-400

### KPI Cards (from shadcn-patterns)

```tsx
<Card className="p-6">
  <p className="text-sm text-muted-foreground">Total Profit</p>
  <p className="text-3xl font-semibold font-mono tabular-nums text-green-400 mt-1">
    +$12,847.50
  </p>
  <p className="text-xs text-muted-foreground mt-2">
    <span className="text-green-400">+12.3%</span> vs last period
  </p>
</Card>
```

### Time Range Selector

Options: 7d, 30d, 90d, 1y, All

- Filter all queries and charts by selected range
- Default to 30d
- Use `date-fns` for date math

### Data Aggregation Queries

All queries run client-side via Drizzle ORM against local SQLite.
**NOTE: There is no `sales` table.** Use these actual tables instead:

- Total profit: `SUM(tracker_entries.amount) WHERE type = 'sale'` minus `SUM(tracker_entries.amount) WHERE type = 'purchase'` in range
- Total spend: `SUM(tracker_entries.amount) WHERE type = 'purchase'` in range
- Total revenue: `SUM(inventory_items.sold_price) WHERE status = 'sold'` in range
- Items sold: `COUNT(inventory_items.id) WHERE status = 'sold'` in range
- Profit by date: group tracker_entries by day/week/month depending on range
- Bot performance: group orders by `bot_name` field, count successful checkouts, join to inventory_items for profit (sold_price - purchase_price)
- Category ROI: group inventory_items by `category` WHERE status = 'sold', compute avg `(sold_price - purchase_price) / purchase_price * 100`

## Implementation Plan

### Step 1: Install recharts

```bash
npm install recharts
```

### Step 2: Create Analytics Data Aggregation

`src/lib/analytics.ts`:

```typescript
interface AnalyticsData {
  totalProfit: number;
  totalSpend: number;
  totalRevenue: number;
  itemsSold: number;
  profitTrend: number; // percentage vs previous period
  profitOverTime: { date: string; profit: number; spend: number }[];
  botPerformance: { bot: string; checkouts: number; profit: number }[];
  categoryROI: { category: string; roi: number; profit: number }[];
}

async function getAnalytics(
  range: "7d" | "30d" | "90d" | "1y" | "all",
): Promise<AnalyticsData>;
```

Queries:

1. **Profit over time**: Query tracker_entries grouped by date, sum amounts by type (sale vs purchase)
2. **Bot performance**: Group orders by `bot_name`, count successful checkouts, join to inventory_items WHERE status='sold' for profit calculation
3. **Category ROI**: Group inventory_items by `category` WHERE status='sold', compute `(sold_price - purchase_price) / purchase_price * 100`
4. **Trend**: Compare current period profit to previous period of same length

### Step 3: Create KPI Summary Cards

`src/components/analytics/kpi-cards.tsx`:

Four cards in a grid:

1. **Total Profit** - green if positive, red if negative, with trend arrow
2. **Total Spend** - total money spent on purchases
3. **Items Sold** - count with trend
4. **Average ROI** - percentage with trend

Use `font-mono tabular-nums` for all numbers. Show `$0.00` not blank when no data.

### Step 4: Create Profit/Spend Line Chart

`src/components/analytics/profit-chart.tsx`:

- X axis: dates (formatted based on range - daily for 7d/30d, weekly for 90d, monthly for 1y)
- Y axis: dollar amounts
- Two lines: Profit (green-400) and Spend (red-400)
- Area fill with low opacity
- Tooltip showing exact values
- Grid lines in zinc-700

### Step 5: Create Bot Performance Bar Chart

`src/components/analytics/bot-chart.tsx`:

- Horizontal bar chart
- Each bar = one bot (Cybersole, Valor, etc.)
- Bar length = total checkouts or profit
- Toggle between "Checkouts" and "Profit" view
- Sort by value descending
- Amber bars

### Step 6: Create Category ROI Bar Chart

`src/components/analytics/category-chart.tsx`:

- Vertical bar chart
- Each bar = one category (Sneakers, Pokemon, etc.)
- Bar height = ROI percentage
- Color: green for positive ROI, red for negative
- Show profit amount as secondary label

### Step 7: Create Analytics Page

`src/app/(dashboard)/analytics/page.tsx`:

```
+------------------------------------------------------------------+
| Analytics                    [7d] [30d] [90d] [1y] [All]         |
+------------------------------------------------------------------+
| [Profit] [Spend] [Items Sold] [Avg ROI]    <- KPI Cards          |
+------------------------------------------------------------------+
| Profit & Spend Over Time                                         |
| [Line Chart]                                                     |
+------------------------------------------------------------------+
| Bot Performance          | ROI by Category                       |
| [Bar Chart]              | [Bar Chart]                           |
+------------------------------------------------------------------+
```

- Time range selector as segmented control at top right
- All charts and KPIs update when range changes
- Loading skeletons while data fetches
- Empty state when no orders/sales exist

### Step 8: Empty State

When no data:

```
[BarChart3 icon]
No analytics data yet
Start tracking orders and sales to see your performance here.
[Go to Orders ->]
```

## Files to Create

- `src/app/(dashboard)/analytics/page.tsx` - Analytics dashboard page
- `src/components/analytics/kpi-cards.tsx` - Summary KPI card row
- `src/components/analytics/profit-chart.tsx` - Profit/spend line chart
- `src/components/analytics/bot-chart.tsx` - Bot performance bar chart
- `src/components/analytics/category-chart.tsx` - Category ROI bar chart
- `src/lib/analytics.ts` - Data aggregation queries

## Files to Modify

- `package.json` - Add `recharts` dependency

## Contracts

### Provides

- Analytics page at `/analytics`
- `getAnalytics(range)` function for data aggregation
- KPI cards, profit chart, bot chart, category chart components
- Time range filtering across all visualizations

### Consumes

- Phase 1: `db`, `orders`, `inventory`, `sales` tables from schema
- `recharts` for chart rendering
- `date-fns` for date math (already in project or install)

## Acceptance Criteria

- [ ] Analytics page renders at `/analytics`
- [ ] Four KPI cards show: Total Profit, Total Spend, Items Sold, Avg ROI
- [ ] KPI cards use font-mono tabular-nums for numbers
- [ ] Profit/spend line chart renders with correct data
- [ ] Bot performance bar chart shows checkouts/profit per bot
- [ ] Category ROI bar chart shows ROI percentage per category
- [ ] Time range selector filters all charts (7d, 30d, 90d, 1y, All)
- [ ] Default range is 30d
- [ ] Trend percentages compare to previous period
- [ ] Charts use dark theme (zinc-700 grid, zinc-400 labels)
- [ ] Tooltips show exact values on hover
- [ ] Loading skeletons display while data loads
- [ ] Empty state shown when no data exists
- [ ] Responsive layout - charts stack on narrow screens
- [ ] Numbers show $0.00 not blank when no data
- [ ] Profit green, loss red color coding throughout
- [ ] Install recharts if not present

## Testing Protocol

### Unit Tests

- Test `getAnalytics()` with mock data for each range
- Test profit calculation accuracy
- Test trend percentage calculation
- Test empty data handling

### Browser/Playwright Tests

- Load analytics with no data - verify empty state
- Add test orders and sales - verify charts populate
- Switch between time ranges - verify data updates
- Verify KPI card values match chart data

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/ui-ux-design.md`

## Git

- Branch: `feat/6.1-analytics`
- Commit prefix: `Task 6.1:`
