# Task 3.4: Price Alerts (Basic)

## Objective

Users set price thresholds on products and get OS notifications when prices cross them. Alerts are stored in local SQLite and checked by a Tauri background task that polls prices every 30 minutes.

## Context

After using the flip calculator (Task 3.3), users may want to watch a product and be notified when the price drops below (or rises above) a target. This is a lightweight alerting system:

- Set alert from calculator results or standalone
- Stored in local SQLite `price_alerts` table
- Tauri spawns a background task that polls pricing APIs (Task 3.1) every 30 min
- When threshold crossed, fire OS notification via tauri-plugin-notification
- Mark alert as triggered (one-shot or recurring option)

## Dependencies

- Task 3.1 (Rust Pricing Backend) - `get_product_prices` command for polling
- tauri-plugin-notification (already in Cargo.toml per skills)

## Blocked By

- Task 3.1 must be complete (need pricing commands to poll)

## Research Findings

From `tauri-commands` skill:

```typescript
// Notification pattern
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

async function notify(title: string, body: string) {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }
  if (granted) {
    sendNotification({ title, body });
  }
}
```

From `pricing-apis-implementation.md` Section 3 (Caching Strategy):

- Background refresh for watchlist items: every 1 hour recommended
- Respect rate limits: batch requests, add jitter to prevent thundering herd
- eBay: 5000 req/day budget; StockX scraping should be conservative

## Implementation Plan

### Step 1: Add price_alerts table to schema

```typescript
// src/lib/db/schema.ts - add to existing schema
export const priceAlerts = sqliteTable("price_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name").notNull(),
  styleId: text("style_id").notNull(),
  marketplace: text("marketplace").notNull(), // 'stockx' | 'goat' | 'flightclub' | 'ebay'
  size: text("size"), // null = any size
  targetPrice: real("target_price").notNull(),
  direction: text("direction").notNull(), // 'below' | 'above'
  currentPrice: real("current_price"),
  recurring: integer("recurring", { mode: "boolean" }).default(false),
  triggered: integer("triggered", { mode: "boolean" }).default(false),
  triggeredAt: integer("triggered_at", { mode: "timestamp" }),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### Step 2: Create price-alerts repository

```typescript
// src/lib/db/repositories/price-alerts.ts
export const priceAlertRepo = {
  async getAll(): Promise<PriceAlert[]>,
  async getActive(): Promise<PriceAlert[]>,     // not triggered or recurring
  async create(alert: NewPriceAlert): Promise<PriceAlert>,
  async markTriggered(id: number): Promise<void>,
  async delete(id: number): Promise<void>,
  async updateCurrentPrice(id: number, price: number): Promise<void>,
}
```

### Step 3: Build Rust background polling command

```rust
// In src-tauri/src/commands/pricing.rs (or new file)
#[tauri::command]
pub async fn start_price_alert_polling(app: tauri::AppHandle) -> Result<(), String> {
    // Spawn a tokio task that runs every 30 min
    // 1. Read active alerts from SQLite (via JS callback or direct rusqlite)
    // 2. For each unique style_id + marketplace, fetch current prices
    // 3. Compare against thresholds
    // 4. If crossed, emit event to frontend
    // 5. Frontend handles notification + DB update
}
```

Alternative (simpler): Do polling from the frontend using setInterval. Call `get_product_prices` from JS every 30 min. Avoids needing Rust to read SQLite directly.

**Recommended approach**: Frontend-driven polling with setInterval. Simpler, fewer moving parts. The frontend reads alerts from SQLite, calls pricing commands, and fires notifications.

### Step 4: Build price alert polling hook

```typescript
// src/hooks/use-price-alerts.ts
export function usePriceAlertPolling() {
  // On mount: read active alerts from DB
  // Set interval (30 min)
  // Each tick: batch fetch prices, compare thresholds, notify if crossed
  // Cleanup interval on unmount
}
```

### Step 5: Build PriceAlertDialog component

```
src/components/calculator/price-alert-dialog.tsx
```

- Triggered from calculator results (button on each marketplace card)
- Pre-fills: product name, style ID, marketplace, current price, size
- User sets: target price, direction (below/above), recurring toggle
- Save button creates alert via repository
- List of active alerts with delete option

### Step 6: Build alert management section

Either in Settings or as part of the calculator page:

- Table of all alerts: product, marketplace, target, current price, status
- Status badges: active (green), triggered (blue), expired (gray)
- Delete / edit actions
- "Check now" button to force immediate poll

### Step 7: Generate migration

Run `npm run db:generate` and add migration to `migrate.ts`.

## Files to Create

- `src/components/calculator/price-alert-dialog.tsx`
- `src/lib/db/repositories/price-alerts.ts`
- `src/hooks/use-price-alerts.ts`

## Files to Modify

- `src/lib/db/schema.ts` - add `priceAlerts` table
- `src/lib/db/migrate.ts` - add migration SQL
- `src/app/(dashboard)/calculator/page.tsx` - add "Set Alert" button on price cards
- `src/app/layout.tsx` or dashboard layout - mount `usePriceAlertPolling` hook

## Contracts

### Provides

```typescript
// Repository
priceAlertRepo.create(alert): Promise<PriceAlert>
priceAlertRepo.getActive(): Promise<PriceAlert[]>
priceAlertRepo.markTriggered(id): Promise<void>
priceAlertRepo.delete(id): Promise<void>

// Hook
usePriceAlertPolling() // mounts polling loop, fires OS notifications

// Component
<PriceAlertDialog product={...} marketplace={...} currentPrice={...} onSave={...} />
```

### Consumes

- Task 3.1: `get_product_prices` Tauri command (for polling)
- Task 3.3: Product context from calculator (pre-fill alert dialog)
- tauri-plugin-notification: `sendNotification`, `isPermissionGranted`, `requestPermission`
- SQLite via Drizzle ORM (local storage)

## Acceptance Criteria

1. User can set a "notify when below $150" alert from the calculator
2. Alert is persisted in SQLite and survives app restart
3. Background polling checks prices every 30 minutes
4. OS notification fires when price crosses threshold
5. One-shot alerts are marked as triggered and stop polling
6. Recurring alerts reset and continue polling after trigger
7. Alert list shows current price, target, and status
8. User can delete alerts
9. Polling respects API rate limits (batch requests, don't poll more than needed)
10. Notification permission requested on first alert creation

## Testing Protocol

### Unit Tests

- Repository CRUD operations
- Threshold comparison logic (below/above, edge cases at exact price)
- Polling interval fires correctly (mock timers)

### Browser/Playwright

- Create alert from calculator - verify it appears in alert list
- Mock price change - verify notification fires (may need to mock invoke)
- Delete alert - verify it's removed
- App restart - verify alerts persist

### Build Checks

- `npm run build` succeeds
- `npx tsc --noEmit` passes
- Migration applies cleanly on fresh DB

## Skills to Read

- `.claude/skills/tauri-commands/SKILL.md` - notification plugin usage, invoke patterns
- `.claude/skills/shadcn-patterns/SKILL.md` - dialog patterns, status badges, table layout
- `.claude/skills/bottingos-data-model/SKILL.md` - schema patterns, migration workflow

## Research Files to Read

- `.claude/orchestration-bottingos/research/pricing-apis-implementation.md` - Section 3 (Caching Strategy) for background refresh patterns and rate limit considerations

## Git

- **Branch**: `feat/3.4-price-alerts`
- **Commit prefix**: `[alerts]`
