# Task 4.4: Order Tracker UI

## Objective

Build the Orders page that displays webhook-captured checkout events with real-time updates via Supabase Realtime. Includes a TanStack Table for order data, webhook settings panel for managing tokens, and live push via WebSocket subscription.

## Context

This is where webhook data becomes visible. When a bot checks out a product and sends a webhook to `hooks.bottingos.app`, the Cloudflare Worker (Task 4.1) parses it and inserts into Supabase. This page subscribes to Supabase Realtime and displays new orders as they arrive - essentially a live feed of bot checkouts.

The Orders page was listed in the sidebar from Phase 2 but grayed out. This task activates it.

Users also need a settings section to:

- See their webhook URL (copy to clipboard)
- Manage webhook tokens (create, label, deactivate)
- Set Discord forward URL
- Test the webhook

## Dependencies

- Task 4.1 (Cloudflare Worker) - webhook endpoint must be deployed
- Task 4.3 (Supabase Schema) - tables must exist
- Supabase JS SDK (`@supabase/supabase-js`)

## Blocked By

- Task 4.1 and Task 4.3 must be complete

## Research Findings

From `webhook-supabase-implementation.md` Section 1.5:

```typescript
// Supabase Realtime subscription pattern
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

supabase
  .channel("checkouts")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "checkout_events",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // New checkout arrived
      addToOrderList(payload.new);
    },
  )
  .subscribe();
```

From `webhook-supabase-implementation.md` Section 3.7:

```typescript
// Supabase client for static Next.js (Tauri WebView)
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

No server-side client needed. Anon key + RLS handles security.

From `shadcn-patterns` skill:

- TanStack Table for data grid
- Default columns: Date, Item, Retailer, Price, Status, Bot
- Filter bar: search (300ms debounce) + status dropdown + retailer dropdown + date range
- Skeleton loading, never spinners
- Toast for new webhook events ("New checkout from Cybersole")
- Status badges: green=success, red=declined

## Implementation Plan

### Step 1: Create Supabase client

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Add env vars to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 2: Install Supabase dependencies

```bash
npm install @supabase/supabase-js
```

### Step 3: Build Supabase auth hook

```typescript
// src/hooks/use-supabase-auth.ts
export function useSupabaseAuth() {
  // Sign in, sign out, get current user
  // Store session in state
  // Auto-refresh token
}
```

For MVP, can use email/password auth or skip auth and use a hardcoded user during development.

### Step 4: Build Realtime subscription hook

```typescript
// src/hooks/use-checkout-feed.ts
export function useCheckoutFeed(userId: string) {
  const [events, setEvents] = useState<CheckoutEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch existing events from Supabase
    // 2. Subscribe to Realtime INSERT events
    // 3. On new event: prepend to list + toast notification
    // 4. CRITICAL: Also sync to local SQLite orders table via ordersRepo.create()
    //    This ensures analytics (Task 6.1) can query local data
    // 5. Cleanup subscription on unmount
  }, [userId]);

  return { events, loading };
}
```

### Step 5: Build OrderTable component

```typescript
// src/components/orders/order-table.tsx
```

TanStack Table with columns:
| Column | Type | Notes |
|--------|------|-------|
| Time | timestamp | received_at, relative format ("2m ago") |
| Bot | text | bot_name with icon/color |
| Product | text | product name, truncated |
| Size | text | size string |
| Price | currency | price in cents -> formatted |
| Store | text | store name |
| Status | badge | success=green "Checkout", fail=red "Declined" |

Hidden by default (column visibility toggle): sku, profile, proxy, order_number, mode, checkout_time, email, raw_payload.

Features:

- Sort by any column (default: time desc)
- Filter by bot, store, status, date range
- Search (debounced 300ms)
- Virtual scrolling for 500+ rows
- Row click expands detail panel
- Bulk select + export to CSV

### Step 6: Build WebhookSettings component

```typescript
// src/components/orders/webhook-settings.tsx
```

- Card showing user's webhook URL: `hooks.bottingos.app/v1/webhooks/{token}`
- Copy button (copies URL to clipboard)
- Token management: create new, label, deactivate, delete
- Discord forward URL input (paste their real Discord webhook)
- Test button: sends a test payload to the Worker and verifies it appears
- Active/inactive toggle per token

### Step 7: Build the Orders page

```typescript
// src/app/(dashboard)/orders/page.tsx
```

Layout:

```
[Page title: Orders]
[Webhook Settings card - collapsible]
---
[Filter bar: search | bot dropdown | store dropdown | date range | clear]
[OrderTable]
[Empty state if no orders: "No orders yet. Set up your webhook URL above to start tracking checkouts."]
```

### Step 8: Add toast notifications for live events

When Realtime delivers a new checkout:

```typescript
toast.success(`New checkout: ${event.product} - ${event.store}`, {
  description: `Size ${event.size} - ${formatCurrency(event.price)}`,
  action: { label: "View", onClick: () => scrollToRow(event.id) },
});
```

### Step 9: Enable Orders sidebar item

Update sidebar component to un-gray the Orders link.

## Files to Create

- `src/lib/supabase.ts` - Supabase client initialization
- `src/app/(dashboard)/orders/page.tsx` - Orders page
- `src/components/orders/order-table.tsx` - TanStack Table for orders
- `src/components/orders/webhook-settings.tsx` - Webhook URL management
- `src/hooks/use-checkout-feed.ts` - Realtime subscription hook
- `src/hooks/use-supabase-auth.ts` - Supabase auth hook (basic)

## Files to Modify

- `package.json` - add @supabase/supabase-js dependency
- `.env.local` - add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- Sidebar component (wherever it lives) - enable Orders link
- `src/app/layout.tsx` or dashboard layout - potentially mount auth provider

## Contracts

### Provides

```typescript
// Supabase client
supabase: SupabaseClient  // from src/lib/supabase.ts

// Hooks
useCheckoutFeed(userId: string): { events: CheckoutEvent[], loading: boolean }
useSupabaseAuth(): { user, signIn, signOut, loading }

// Components
<OrderTable events={CheckoutEvent[]} />
<WebhookSettings userId={string} />

// Page
/orders route - fully functional order tracker
```

### Consumes

- Task 4.1: Webhook endpoint URL format `hooks.bottingos.app/v1/webhooks/{token}`
- Task 4.3: Supabase tables `webhook_tokens`, `checkout_events`
- Task 4.2: CheckoutEvent type (for display)
- Supabase Realtime: postgres_changes subscription on checkout_events
- shadcn components: Table, Card, Input, Button, Badge, Sheet, Dialog, DropdownMenu, Skeleton
- TanStack Table for data grid
- Sonner for toast notifications

## Acceptance Criteria

1. Orders page loads at `/orders` route
2. Existing orders fetched from Supabase on page load
3. New webhook events appear in real-time (< 2 second delay)
4. Toast notification fires on new event
5. Table sortable by all visible columns
6. Filter by bot name works
7. Filter by store works
8. Date range filter works
9. Search filters across product name, store, SKU
10. Webhook URL displayed correctly and copyable
11. New token creation works
12. Token deactivation prevents new events
13. Discord forward URL saves correctly
14. Empty state shown when no orders
15. Skeleton loading during initial fetch
16. Column visibility toggle works (show/hide hidden columns)
17. Orders sidebar item is active (not grayed out)
18. **CRITICAL**: Every Supabase checkout event is also synced to local SQLite `orders` table via `ordersRepo.create()` so that Task 6.1 analytics can aggregate order data locally

## Testing Protocol

### Unit Tests

- useCheckoutFeed hook: mock Supabase, verify events populate
- Order table: render with mock data, verify columns
- Webhook settings: token CRUD operations

### Browser/Playwright

- Navigate to /orders - page loads
- Send curl webhook (from webhook-testing skill) - verify row appears in table
- Verify toast notification fires
- Filter by bot - verify table updates
- Copy webhook URL - verify clipboard
- Create new token - verify it appears in list
- Deactivate token - verify webhook returns 401

### Build Checks

- `npm run build` succeeds (env vars may need build-time stubs)
- `npx tsc --noEmit` passes
- No console errors on page load

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md` - TanStack Table config, filter bar pattern, status badges, toast, empty states
- `.claude/skills/webhook-testing/SKILL.md` - curl commands for testing, expected responses
- `.claude/skills/bottingos-data-model/SKILL.md` - schema patterns for reference

## Research Files to Read

- `.claude/orchestration-bottingos/research/webhook-supabase-implementation.md` - Section 1.5 (Realtime subscription), Section 3.7 (Supabase JS in Tauri), Section 5.1 (Worker code)

## Git

- **Branch**: `feat/4.4-order-tracker`
- **Commit prefix**: `[orders]`
