# BottingOS - Implementation Phases

**Target**: First testable build for friend (Core 5 MVP on Tauri/Drizzle + Discord CDP)
**Execution**: Sequential phases, autonomous subagent execution
**Authority**: DISCOVERY.md overrides everything

---

## Scope Constraints (from DISCOVERY.md)

These are OUT of scope. Do NOT implement:

- 2FA manager (D8 - useless per user)
- Jig tool (D8 - AYCD does it)
- Auto email cleanup (D8 - AI email filters exist)
- VCC generator (D8 - AYCD does it)
- Cloud sync as separate feature (D8 - baked into auth later)
- Cook group partnerships (D8)
- Group buy hub (D8)
- Mobile app (future phase, not this build)
- Light mode (dark theme only - D30)
- AYCD API integration (D11 - needs AYCD team conversation first, file import only for now)
- eBay OAuth order tracking (future - manual entry for now)
- Resource hub with RAG/scraping (future - link directory only)

---

## Tech Stack

| Layer        | Technology                                                            |
| ------------ | --------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, static export)                                |
| Desktop      | Tauri v2                                                              |
| Language     | TypeScript (frontend) + Rust (backend)                                |
| Database     | SQLite + Drizzle ORM (sqlite-proxy)                                   |
| UI           | shadcn/ui + Tailwind CSS (Zinc palette, amber accent)                 |
| Animations   | Motion Primitives, Animate UI (functional only, 150-200ms)            |
| Data Tables  | TanStack Table + shadcn                                               |
| Encryption   | AES-256-GCM, PBKDF2 key derivation                                    |
| Pricing APIs | Rust HTTP (reverse-engineered Sneaks-API endpoints) + eBay Browse API |
| Webhook Host | Cloudflare Workers                                                    |
| Cloud Sync   | Supabase (future phase)                                               |
| Testing      | Vitest (unit) + Playwright (E2E against next dev)                     |

---

## Skills Reference

All skills at `.claude/skills/`. Agents MUST read relevant skills before starting a task.

| Skill                  | Use When                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| `shadcn-patterns`      | Any UI component work - theme tokens, component patterns, layout |
| `bottingos-data-model` | Database schema, Drizzle queries, data shapes                    |
| `tauri-commands`       | Tauri IPC, Rust commands, file system, window management         |
| `webhook-testing`      | Webhook payload parsing, bot format normalization                |

---

## Tools Reference

| Server/Tool        | Use For                                   | Key Operations                              |
| ------------------ | ----------------------------------------- | ------------------------------------------- |
| **Playwright MCP** | Browser testing against localhost:3000    | navigate, click, fill, screenshot, evaluate |
| **Supabase MCP**   | Cloud database, webhook storage, realtime | execute_sql, apply_migration, list_tables   |
| **Chrome MCP**     | Visual testing, UI review                 | read_page, screenshot, javascript_tool      |

---

## Testing Methods

| Method           | Tool           | Description                                                    |
| ---------------- | -------------- | -------------------------------------------------------------- |
| Unit tests       | Vitest         | Fee calculations, encryption, data transforms, Drizzle queries |
| E2E tests        | Playwright MCP | Full UI flows against `next dev` on localhost:3000             |
| Visual review    | Chrome MCP     | Screenshot key screens, verify design tokens                   |
| Tauri smoke test | Manual         | Build with `npx tauri build`, verify IPC and SQLite work       |
| API testing      | curl/Bash      | Webhook endpoint, marketplace API responses                    |

---

## Phase Overview

| Phase                        | Goal                                                  | Tasks  |
| ---------------------------- | ----------------------------------------------------- | ------ |
| 1: Data Layer                | SQLite + Drizzle + Tauri IPC + encryption             | 5      |
| 2: Core UI Rebuild           | Migrate 5 MVP features from localStorage to Drizzle   | 7      |
| 3: Marketplace & Pricing     | Real-time pricing APIs + enhanced flip calculator     | 5      |
| 4: Webhooks & Order Tracking | Bot webhook capture + order/inventory management      | 6      |
| 5: Discord CDP               | Local Discord monitoring via Chrome DevTools Protocol | 5      |
| 6: Analytics & Extras        | Analytics dashboard, drop calendar, notifications     | 5      |
| 7: Polish & Distribution     | Onboarding, animations, system tray, Tauri build      | 5      |
| 8: E2E Testing               | Comprehensive multi-angle testing on built app        | 4      |
| **Total**                    |                                                       | **42** |

---

## Phase 1: Data Layer

**Goal**: Replace localStorage with SQLite/Drizzle through Tauri IPC. Set up encryption.

### Task 1.1: SQLite + Drizzle Schema

- **Objective**: Define all database tables in Drizzle schema, set up sqlite-proxy driver
- **Dependencies**: None
- **Blocked by**: None
- **Files**: `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `src/lib/db/migrations.ts`
- **Contracts**:
  ```typescript
  // Core tables: accounts, emails, vccs, orders, inventory_items,
  // vault_entries, calculator_history, settings
  // All tables have: id (text UUID), created_at, updated_at
  // Encrypted tables store ciphertext + iv columns
  ```
- **Acceptance Criteria**:
  - [ ] All tables defined with Drizzle schema syntax
  - [ ] sqlite-proxy driver configured for Tauri IPC
  - [ ] Migration runner executes SQL on app startup
  - [ ] TypeScript types exported from schema
- **Testing**:
  - [ ] Unit: Schema generates valid SQL (drizzle-kit generate)
  - [ ] Unit: Migration runner applies migrations in order
- **Skills**: `bottingos-data-model`, `tauri-commands`

### Task 1.2: Tauri Rust Database Commands

- **Objective**: Rust backend commands for SQL execution via tauri-plugin-sql
- **Dependencies**: Task 1.1 (schema)
- **Blocked by**: 1.1
- **Files**: `src-tauri/src/commands/db.rs`, `src-tauri/src/lib.rs`
- **Contracts**:
  ```rust
  #[tauri::command]
  async fn execute_query(sql: String, params: Vec<serde_json::Value>) -> Result<Vec<serde_json::Value>>
  #[tauri::command]
  async fn execute_batch(queries: Vec<(String, Vec<serde_json::Value>)>) -> Result<()>
  ```
- **Acceptance Criteria**:
  - [ ] execute_query returns JSON rows
  - [ ] execute_batch runs multiple statements in transaction
  - [ ] Database file created at app data dir
  - [ ] Error handling returns meaningful messages to frontend
- **Testing**:
  - [ ] Unit: Rust command executes SELECT/INSERT/UPDATE/DELETE
  - [ ] Smoke: Tauri dev mode connects to SQLite successfully
- **Skills**: `tauri-commands`

### Task 1.3: Encryption Module

- **Objective**: Master password flow with AES-256-GCM encryption for sensitive data
- **Dependencies**: None
- **Blocked by**: None
- **Files**: `src/lib/crypto.ts`, `src/components/master-password-dialog.tsx`
- **Contracts**:
  ```typescript
  interface CryptoService {
    deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey>;
    encrypt(
      plaintext: string,
      key: CryptoKey,
    ): Promise<{ ciphertext: string; iv: string }>;
    decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string>;
  }
  // Salt stored in settings table, key held in memory only
  ```
- **Acceptance Criteria**:
  - [ ] PBKDF2 key derivation with 100K iterations
  - [ ] AES-256-GCM encrypt/decrypt round-trips correctly
  - [ ] Master password dialog on app launch
  - [ ] Key cleared from memory on lock/timeout (5 min idle)
  - [ ] Salt persisted to settings table
- **Testing**:
  - [ ] Unit: Encrypt then decrypt returns original plaintext
  - [ ] Unit: Wrong password fails to decrypt
  - [ ] Unit: Key derivation is deterministic with same salt
- **Skills**: None

### Task 1.4: Data Access Layer

- **Objective**: TypeScript repository functions wrapping Drizzle queries for all tables
- **Dependencies**: Task 1.1, Task 1.2
- **Blocked by**: 1.1, 1.2
- **Files**: `src/lib/db/repositories/*.ts` (emails.ts, vccs.ts, vault.ts, orders.ts, calculator.ts, inventory.ts, settings.ts)
- **Contracts**:
  ```typescript
  // Each repository exports CRUD functions:
  // getAll(), getById(id), create(data), update(id, data), remove(id)
  // Vault repository uses CryptoService for encrypt/decrypt
  ```
- **Acceptance Criteria**:
  - [ ] All CRUD operations work for every table
  - [ ] Vault entries encrypted before write, decrypted on read
  - [ ] Proper error handling for constraint violations
  - [ ] Bulk operations for email import (750+ rows)
- **Testing**:
  - [ ] Unit: CRUD operations with in-memory SQLite (better-sqlite3)
  - [ ] Unit: Bulk insert handles 1000 rows
- **Skills**: `bottingos-data-model`

### Task 1.R: Phase 1 Regression

- **Objective**: Full regression test of data layer
- **Dependencies**: All Phase 1 tasks complete
- **Testing**:
  - [ ] Tauri dev mode: app starts, creates SQLite database
  - [ ] Master password dialog appears on launch
  - [ ] All repository functions execute against real SQLite
  - [ ] Encryption round-trip works end-to-end
  - [ ] Migration runner handles fresh install + upgrade scenarios

---

## Phase 2: Core UI Rebuild

**Goal**: Rebuild all 5 MVP features with proper UI components backed by SQLite.

### Task 2.1: App Shell & Navigation

- **Objective**: Dashboard layout with collapsible sidebar, command palette (Cmd+K)
- **Dependencies**: None
- **Blocked by**: Phase 1
- **Files**: `src/app/(dashboard)/layout.tsx`, `src/components/app-sidebar.tsx`, `src/components/command-palette.tsx`
- **Contracts**:
  ```typescript
  // Sidebar items: Dashboard, Calculator, Tracker, Emails, Vault, VCC
  // Future items grayed out: Orders, Inventory, Discord, Analytics, Calendar
  // Command palette: Cmd+K opens search across all sections
  ```
- **Acceptance Criteria**:
  - [ ] Sidebar collapses to icons on small screens
  - [ ] Active route highlighted in sidebar
  - [ ] Cmd+K opens command palette with section navigation
  - [ ] Amber accent (#F59E0B) on dark zinc background (#09090B)
  - [ ] Responsive layout (sidebar collapses below 768px)
- **Testing**:
  - [ ] Playwright: Navigate between all sections via sidebar
  - [ ] Playwright: Cmd+K opens palette, type section name, navigate
  - [ ] Visual: Screenshot all sections, verify design tokens
- **Skills**: `shadcn-patterns`

### Task 2.2: Flip Calculator (Rebuild)

- **Objective**: Migrate calculator from localStorage to Drizzle, improve UI
- **Dependencies**: Task 1.4 (repositories)
- **Blocked by**: Phase 1, Task 2.1
- **Files**: `src/app/(dashboard)/calculator/page.tsx`, `src/components/calculator/*.tsx`
- **Contracts**:
  ```typescript
  // Input: item name/SKU, purchase price, marketplace selection
  // Output: profit after fees per marketplace, ROI %, side-by-side comparison
  // Fee engine: eBay (~13.25%), StockX (~10%), GOAT (~12.4%)
  // History saved to calculator_history table
  ```
- **Acceptance Criteria**:
  - [ ] Enter item + purchase price, see profit breakdown per marketplace
  - [ ] Fee calculations match research specs (eBay/StockX/GOAT tiers)
  - [ ] Calculation history persisted to SQLite
  - [ ] Clear, scannable results layout
- **Testing**:
  - [ ] Unit: Fee calculations for all marketplaces (edge cases: $0, $10000)
  - [ ] Playwright: Enter item, verify profit numbers displayed
  - [ ] Unit: History saves and loads from database
- **Skills**: `shadcn-patterns`, `bottingos-data-model`

### Task 2.3: Profit & Expense Tracker (Rebuild)

- **Objective**: Migrate tracker to Drizzle, add CSV import for bank statements
- **Dependencies**: Task 1.4
- **Blocked by**: Phase 1, Task 2.1
- **Files**: `src/app/(dashboard)/tracker/page.tsx`, `src/components/tracker/*.tsx`, `src/lib/csv-parser.ts`
- **Contracts**:
  ```typescript
  // Entry types: purchase, sale, cancellation, refund
  // CSV import: auto-detect Chase/CapitalOne/Citi/Amex formats
  // Manual tagging of botting-related transactions
  // Running totals, P&L per item, CSV export
  ```
- **Acceptance Criteria**:
  - [ ] Manual entry of purchases/sales with date, amount, category
  - [ ] CSV import detects bank format from headers
  - [ ] Users can tag which transactions are botting-related
  - [ ] Running totals and P&L displayed
  - [ ] CSV export of filtered data
- **Testing**:
  - [ ] Unit: CSV parser handles Chase, Capital One, Citi, Amex formats
  - [ ] Unit: P&L calculation with mixed entries
  - [ ] Playwright: Add entry, verify totals update
- **Skills**: `shadcn-patterns`, `bottingos-data-model`

### Task 2.4: Email & Account Manager (Rebuild)

- **Objective**: Migrate email manager to Drizzle, support bulk import of 750+ emails
- **Dependencies**: Task 1.4
- **Blocked by**: Phase 1, Task 2.1
- **Files**: `src/app/(dashboard)/emails/page.tsx`, `src/components/emails/*.tsx`
- **Contracts**:
  ```typescript
  // Bulk paste import (HideMyEmail addresses)
  // Organize by iCloud source account
  // Tag by retailer (Target, Walmart, Nike, etc.)
  // Two views: by email source, by retailer
  // AYCD CSV import for Profile Builder exports
  ```
- **Acceptance Criteria**:
  - [ ] Paste 750+ emails, all imported in < 2 seconds
  - [ ] Group by iCloud source account
  - [ ] Tag emails with retailer assignments
  - [ ] Toggle between source view and retailer view
  - [ ] AYCD CSV/JSON file import
- **Testing**:
  - [ ] Unit: Bulk insert of 1000 emails
  - [ ] Playwright: Paste emails, verify count, switch views
  - [ ] Unit: AYCD CSV/JSON parser
- **Skills**: `shadcn-patterns`, `bottingos-data-model`

### Task 2.5: Password Vault (Rebuild)

- **Objective**: Migrate vault to Drizzle with real encryption (AES-256-GCM)
- **Dependencies**: Task 1.3 (encryption), Task 1.4
- **Blocked by**: Phase 1, Task 2.1
- **Files**: `src/app/(dashboard)/vault/page.tsx`, `src/components/vault/*.tsx`
- **Contracts**:
  ```typescript
  // Each entry: site, username, password (encrypted), notes (encrypted)
  // Copy-to-clipboard buttons
  // Auto-lock after 5 min idle
  // Panic hide (keyboard shortcut to instantly hide all)
  ```
- **Acceptance Criteria**:
  - [ ] Add/edit/delete vault entries
  - [ ] Passwords encrypted at rest in SQLite
  - [ ] Copy button copies password without showing it
  - [ ] Auto-lock after 5 min, requires master password to unlock
  - [ ] Panic hide shortcut (Cmd+Shift+H)
- **Testing**:
  - [ ] Unit: Entries encrypted in database, decrypted on read
  - [ ] Playwright: Add entry, copy password, verify clipboard
  - [ ] Unit: Auto-lock timer triggers after idle
- **Skills**: `shadcn-patterns`, `bottingos-data-model`

### Task 2.6: VCC Tracker (Rebuild)

- **Objective**: Migrate VCC tracker to Drizzle
- **Dependencies**: Task 1.4
- **Blocked by**: Phase 1, Task 2.1
- **Files**: `src/app/(dashboard)/vcc/page.tsx`, `src/components/vcc/*.tsx`
- **Contracts**:
  ```typescript
  // Fields: provider, last4, label, linked_account_id, linked_order_id
  // Link VCCs to accounts (emails) and orders
  // Filter by provider, status
  ```
- **Acceptance Criteria**:
  - [ ] Add/edit/delete VCC entries
  - [ ] Link VCCs to email accounts
  - [ ] Filter by provider
  - [ ] Show which stores each VCC is used on
- **Testing**:
  - [ ] Playwright: Add VCC, link to account, verify display
  - [ ] Unit: CRUD operations with linked records
- **Skills**: `shadcn-patterns`, `bottingos-data-model`

### Task 2.R: Phase 2 Regression

- **Objective**: Full regression test of all rebuilt MVP features
- **Dependencies**: All Phase 2 tasks complete
- **Testing**:
  - [ ] Playwright: Full flow through each of 5 MVP features
  - [ ] Visual: Screenshot every page, verify design consistency
  - [ ] Data: Create entries in all sections, verify persistence after app restart
  - [ ] Encryption: Vault entries survive app restart with correct master password
  - [ ] Performance: 750+ email import completes in < 2 seconds
  - [ ] Tauri smoke: Build and verify all features work in desktop app

---

## Phase 3: Marketplace & Pricing

**Goal**: Real-time pricing from StockX/GOAT/eBay, enhanced calculator with live data.

### Task 3.1: Rust Pricing Backend

- **Objective**: Tauri Rust commands that fetch prices from StockX, GOAT, FlightClub, eBay
- **Dependencies**: Task 1.2 (Tauri command pattern)
- **Blocked by**: Task 1.2 (pure Rust, no frontend dependency - can run in parallel with Phase 2)
- **Files**: `src-tauri/src/commands/pricing.rs`, `src-tauri/src/commands/mod.rs`
- **Contracts**:
  ```rust
  #[tauri::command]
  async fn search_products(query: String) -> Result<Vec<ProductResult>>
  #[tauri::command]
  async fn get_product_prices(product_id: String, source: String) -> Result<PriceData>
  // ProductResult: { id, name, image_url, retail_price, source }
  // PriceData: { lowest_ask, highest_bid, last_sale, sizes: Vec<SizePrice> }
  ```
- **Acceptance Criteria**:
  - [ ] Search returns results from StockX + GOAT + FlightClub
  - [ ] Price data includes size-level pricing where available
  - [ ] Results cached in memory for 15 minutes
  - [ ] eBay Browse API integration with Client Credentials auth
  - [ ] Graceful fallback if any source is down
- **Testing**:
  - [ ] Unit: Mock HTTP responses, verify parsing
  - [ ] Integration: Live API calls return valid data (manual, not CI)
  - [ ] Unit: Cache expires after 15 minutes
- **Skills**: `tauri-commands`

### Task 3.2: Fee Calculation Engine

- **Objective**: Comprehensive fee calculation for all marketplaces
- **Dependencies**: None
- **Blocked by**: None
- **Files**: `src/lib/fees.ts`
- **Contracts**:
  ```typescript
  interface FeeBreakdown {
    salePrice: number;
    fees: { name: string; amount: number; rate: number }[];
    totalFees: number;
    profit: number;
    roi: number;
  }
  function calculateFees(
    salePrice: number,
    purchasePrice: number,
    marketplace: Marketplace,
    options?: FeeOptions,
  ): FeeBreakdown;
  // Marketplaces: ebay, stockx, goat
  // Options: seller_level, category (affects eBay rates)
  ```
- **Acceptance Criteria**:
  - [ ] eBay: Tiered fees by category (sneakers 8-13%, others ~13%)
  - [ ] StockX: 7-10% transaction + 3% processing by seller level
  - [ ] GOAT: 9.5% commission + $5-30 flat + 2.9% cash-out
  - [ ] All calculations accurate to the penny
- **Testing**:
  - [ ] Unit: 20+ test cases covering all marketplaces, levels, categories
  - [ ] Unit: Edge cases ($0 sale, negative profit, very high prices)
- **Skills**: None

### Task 3.3: Enhanced Flip Calculator UI

- **Objective**: Upgrade calculator with real-time pricing, search, side-by-side comparison
- **Dependencies**: Task 3.1, Task 3.2
- **Blocked by**: 3.1, 3.2
- **Files**: `src/app/(dashboard)/calculator/page.tsx`, `src/components/calculator/*.tsx`
- **Contracts**:
  ```typescript
  // Flow: Search product -> select result -> see live prices across all marketplaces
  // Side-by-side comparison: eBay vs StockX vs GOAT with fee breakdown
  // Manual override: user can adjust sale price
  // Save to history with snapshot of prices at time of calculation
  ```
- **Acceptance Criteria**:
  - [ ] Search bar with autocomplete from live API
  - [ ] Product card shows image, name, retail price
  - [ ] Side-by-side fee breakdown for all marketplaces
  - [ ] Manual price override option
  - [ ] History saves product + prices + fees snapshot
- **Testing**:
  - [ ] Playwright: Search product, select, verify price cards
  - [ ] Playwright: Override price, verify recalculation
  - [ ] Unit: History snapshot includes all price data
- **Skills**: `shadcn-patterns`

### Task 3.4: Price Alerts (Basic)

- **Objective**: Users can set price thresholds and get notified when prices cross them
- **Dependencies**: Task 3.1
- **Blocked by**: 3.1
- **Files**: `src/lib/db/repositories/price-alerts.ts`, `src/components/calculator/price-alert-dialog.tsx`
- **Contracts**:
  ```typescript
  // Alert: product_id, target_price, direction (above/below), marketplace
  // Background check: poll every 30 min via Tauri scheduled task
  // Notification via tauri-plugin-notification
  ```
- **Acceptance Criteria**:
  - [ ] Set alert from calculator results page
  - [ ] Background polling checks prices periodically
  - [ ] OS notification when threshold crossed
  - [ ] Alert management page (view/delete active alerts)
- **Testing**:
  - [ ] Unit: Alert trigger logic with mock prices
  - [ ] Smoke: Notification fires in Tauri dev mode
- **Skills**: `tauri-commands`

### Task 3.R: Phase 3 Regression

- **Objective**: Full regression of pricing features
- **Dependencies**: All Phase 3 tasks complete
- **Testing**:
  - [ ] Playwright: Full calculator flow with live API
  - [ ] Unit: All fee calculation test cases pass
  - [ ] Visual: Screenshot calculator with results, verify layout
  - [ ] API: Verify each pricing source returns data
  - [ ] Phase 1-2 regression: All previous features still work

---

## Phase 4: Webhooks & Order Tracking

**Goal**: Receive bot webhooks, track orders and inventory automatically.

### Task 4.1: Cloudflare Worker Webhook Endpoint

- **Objective**: Deploy webhook receiver at hooks.bottingos.app
- **Dependencies**: None
- **Blocked by**: Phase 2
- **Files**: `workers/webhook-proxy/src/index.ts`, `workers/webhook-proxy/wrangler.toml`
- **Contracts**:
  ```typescript
  // POST /v1/webhooks/{user_token}
  // Accepts Discord embed format (what all bots send)
  // Validates token against Supabase webhook_tokens table
  // Normalizes to CheckoutEvent schema
  // Stores in Supabase checkout_events table
  // Optional: forwards to user's Discord webhook
  ```
- **Acceptance Criteria**:
  - [ ] Worker deployed to Cloudflare
  - [ ] Accepts POST with Discord embed body
  - [ ] Validates user token
  - [ ] Stores normalized event in Supabase
  - [ ] Returns 200 OK on success, 401/400 on failure
- **Testing**:
  - [ ] curl: Send sample Cybersole/Valor/NSB payloads
  - [ ] Unit: Parser handles all 5 major bot formats
  - [ ] Unit: Invalid token returns 401
- **Skills**: `webhook-testing`

### Task 4.2: Bot Webhook Parsers

- **Objective**: Parse Discord embed format from top 5 bots into CheckoutEvent
- **Dependencies**: None
- **Blocked by**: None
- **Files**: `workers/webhook-proxy/src/parsers/*.ts`
- **Contracts**:
  ```typescript
  interface CheckoutEvent {
    botName: string;
    product: string;
    size: string | null;
    price: number | null;
    store: string;
    profile: string | null;
    orderNumber: string | null;
    success: boolean;
    rawEmbed: object;
    timestamp: string;
  }
  // Bot-specific parsers + fuzzy fallback parser
  ```
- **Acceptance Criteria**:
  - [ ] Cybersole parser extracts all fields
  - [ ] Valor parser extracts all fields
  - [ ] NSB parser extracts all fields
  - [ ] Wrath parser extracts all fields
  - [ ] Kodai parser extracts all fields
  - [ ] Fuzzy fallback handles unknown bot formats
- **Testing**:
  - [ ] Unit: Each parser tested with real sample payloads
  - [ ] Unit: Fuzzy parser extracts at least product + price from unknown formats
- **Skills**: `webhook-testing`

### Task 4.3: Supabase Schema for Webhooks

- **Objective**: Set up Supabase tables for webhook tokens and checkout events
- **Dependencies**: None
- **Blocked by**: None
- **Files**: `supabase/migrations/001_webhook_tables.sql`
- **Contracts**:
  ```sql
  -- webhook_tokens: user_id, token (unique), discord_forward_url, created_at
  -- checkout_events: id, user_id, bot_name, product, size, price, store,
  --   profile, order_number, success, raw_embed, created_at
  -- RLS: users can only read their own events
  ```
- **Acceptance Criteria**:
  - [ ] Tables created with proper indexes
  - [ ] RLS policies restrict access to own data
  - [ ] Realtime enabled on checkout_events table
- **Testing**:
  - [ ] SQL: Insert and query test data
  - [ ] Supabase MCP: Verify RLS prevents cross-user access
- **Skills**: None

### Task 4.4: Order Tracker UI

- **Objective**: Display incoming webhook orders with real-time updates
- **Dependencies**: Task 4.1, Task 4.3
- **Blocked by**: 4.1, 4.3
- **Files**: `src/app/(dashboard)/orders/page.tsx`, `src/components/orders/*.tsx`
- **Contracts**:
  ```typescript
  // Real-time feed of checkout events via Supabase Realtime
  // Table view with columns: time, bot, product, size, price, store, status
  // Filter by bot, store, date range
  // Settings: webhook URL display + copy button, Discord forward toggle
  ```
- **Acceptance Criteria**:
  - [ ] Orders appear in real-time (< 2 second delay)
  - [ ] TanStack Table with sorting, filtering
  - [ ] Webhook URL shown in settings with copy button
  - [ ] Discord forwarding toggle
- **Testing**:
  - [ ] Playwright: Verify order table renders with mock data
  - [ ] Integration: Send webhook, verify it appears in UI
- **Skills**: `shadcn-patterns`

### Task 4.5: Inventory Manager

- **Objective**: Track inventory items, link to orders, flag aging stock
- **Dependencies**: Task 4.4
- **Blocked by**: 4.4
- **Files**: `src/app/(dashboard)/inventory/page.tsx`, `src/components/inventory/*.tsx`, `src/lib/db/repositories/inventory.ts`
- **Contracts**:
  ```typescript
  // Auto-add from webhook orders (success=true)
  // Manual add for non-bot purchases
  // Categories: Sneakers, Pokemon, Funko Pops, Supreme, Other
  // Status: In Stock, Listed, Sold, Returned
  // Aging flag: highlight items > 30 days unsold
  // Link to marketplace listing (manual URL)
  ```
- **Acceptance Criteria**:
  - [ ] Webhook orders auto-populate inventory
  - [ ] Manual add with category selection
  - [ ] Filter by category, status
  - [ ] Aging indicator on items > 30 days
  - [ ] Mark as sold (manual) updates profit tracker
  - [ ] Category totals displayed
- **Testing**:
  - [ ] Playwright: Add item, change status, verify aging indicator
  - [ ] Unit: Auto-populate from CheckoutEvent
  - [ ] Unit: Sold items create profit tracker entries
- **Skills**: `shadcn-patterns`, `bottingos-data-model`

### Task 4.R: Phase 4 Regression

- **Objective**: Full regression of webhook + order + inventory pipeline
- **Dependencies**: All Phase 4 tasks complete
- **Testing**:
  - [ ] End-to-end: Bot webhook -> Worker -> Supabase -> Desktop app (real-time)
  - [ ] All 5 bot parsers produce correct CheckoutEvent
  - [ ] Inventory auto-populates from orders
  - [ ] Sold inventory creates tracker entries
  - [ ] Phase 1-3 regression: All previous features still work

---

## Phase 5: Discord CDP

**Goal**: Monitor Discord locally via Chrome DevTools Protocol, display filtered feed.

### Task 5.1: Discord Process Management (Rust)

- **Objective**: Detect, kill, relaunch Discord with --remote-debugging-port=9223
- **Dependencies**: None
- **Blocked by**: Phase 2
- **Files**: `src-tauri/src/commands/discord.rs`
- **Contracts**:
  ```rust
  #[tauri::command]
  async fn start_discord_cdp() -> Result<bool> // kill + relaunch with debug flag
  #[tauri::command]
  async fn check_discord_status() -> Result<DiscordStatus> // running, debug_mode, connected
  #[tauri::command]
  async fn stop_discord_cdp() -> Result<()> // restore normal Discord
  ```
- **Acceptance Criteria**:
  - [ ] Detects running Discord process
  - [ ] Kills and relaunches with --remote-debugging-port=9223
  - [ ] Verifies debug port is accessible
  - [ ] Cross-platform: macOS (launch) + Windows (future)
  - [ ] Health check monitors connection
- **Testing**:
  - [ ] Smoke: Discord relaunches with debug port on macOS
  - [ ] Unit: Process detection logic with mock
- **Skills**: `tauri-commands`

### Task 5.2: CDP Message Capture (Rust)

- **Objective**: Connect to Discord's CDP endpoint, capture MESSAGE_CREATE events
- **Dependencies**: Task 5.1
- **Blocked by**: 5.1
- **Files**: `src-tauri/src/commands/cdp.rs`, `src-tauri/src/discord/mod.rs`
- **Contracts**:
  ```rust
  // Connect to http://localhost:9223/json/list
  // Find Discord's main page target
  // Inject JS to hook Flux dispatcher
  // Capture MESSAGE_CREATE events
  // Forward to frontend via Tauri events
  ```
- **Acceptance Criteria**:
  - [ ] Successfully connects to Discord's CDP
  - [ ] Hooks into Flux dispatcher via JS injection
  - [ ] Captures MESSAGE_CREATE with: content, author, channel, server, timestamp
  - [ ] Emits events to frontend in real-time
  - [ ] Auto-reconnects if connection drops
- **Testing**:
  - [ ] Smoke: Receive a message in Discord, verify event captured
  - [ ] Unit: JS injection script parses dispatcher output correctly
- **Skills**: `tauri-commands`

### Task 5.3: Channel Selection Settings

- **Objective**: UI for users to select which servers/channels to monitor
- **Dependencies**: Task 5.2
- **Blocked by**: 5.2
- **Files**: `src/app/(dashboard)/discord/settings/page.tsx`, `src/components/discord/channel-selector.tsx`
- **Contracts**:
  ```typescript
  // List available servers + channels from CDP connection
  // Checkbox selection per channel
  // Persist selections to settings table
  // Only forward messages from selected channels
  ```
- **Acceptance Criteria**:
  - [ ] Shows server list with expandable channel trees
  - [ ] Checkbox to enable/disable monitoring per channel
  - [ ] Selections persist across app restarts
  - [ ] Only selected channels' messages forwarded to feed
- **Testing**:
  - [ ] Playwright: Toggle channels, verify persistence
  - [ ] Unit: Filter logic only passes selected channel messages
- **Skills**: `shadcn-patterns`

### Task 5.4: Discord Feed UI

- **Objective**: Unified message feed with filters, Discord-style layout
- **Dependencies**: Task 5.2, Task 5.3
- **Blocked by**: 5.2, 5.3
- **Files**: `src/app/(dashboard)/discord/page.tsx`, `src/components/discord/*.tsx`
- **Contracts**:
  ```typescript
  // Left: Channel list (Discord-style server > channel tree)
  // Right: Unified feed of messages from all monitored channels
  // Filters: by server, channel, keyword, category (sneakers/pokemon/etc)
  // Message card: author, content, channel badge, timestamp
  // Keyword highlighting in messages
  ```
- **Acceptance Criteria**:
  - [ ] Real-time message feed updates as messages arrive
  - [ ] Channel tree on left side mirrors Discord layout
  - [ ] Keyword filter highlights matches
  - [ ] Category tags (user-defined per channel)
  - [ ] Scrollable feed with virtualization for performance
- **Testing**:
  - [ ] Playwright: Verify feed renders messages with mock data
  - [ ] Playwright: Filter by keyword, verify results narrow
  - [ ] Performance: 1000+ messages render without lag (virtualized)
- **Skills**: `shadcn-patterns`

### Task 5.R: Phase 5 Regression

- **Objective**: Full regression of Discord CDP integration
- **Dependencies**: All Phase 5 tasks complete
- **Testing**:
  - [ ] End-to-end: Launch Discord CDP -> receive message -> see in feed
  - [ ] Channel selection persists and filters correctly
  - [ ] Reconnection after Discord restart
  - [ ] Phase 1-4 regression: All previous features still work

---

## Phase 6: Analytics & Extras

**Goal**: Analytics dashboard, drop calendar, notifications, resource hub.

### Task 6.1: Analytics Dashboard

- **Objective**: Charts for profit trends, bot performance, ROI by category
- **Dependencies**: Task 2.3 (tracker), Task 4.4 (orders)
- **Blocked by**: Phase 4
- **Files**: `src/app/(dashboard)/analytics/page.tsx`, `src/components/analytics/*.tsx`
- **Contracts**:
  ```typescript
  // Charts: profit/spend over time (line), ROI by category (bar),
  //   success rate by bot (bar), monthly summary (cards)
  // Time range selector: 7d, 30d, 90d, 1y, all
  // Data sources: tracker entries + order events
  // Chart library: recharts (shadcn-compatible)
  ```
- **Acceptance Criteria**:
  - [ ] Profit/spend line chart with time range toggle
  - [ ] Bot success rate bar chart
  - [ ] ROI by category breakdown
  - [ ] Monthly summary cards (total profit, total orders, avg ROI)
  - [ ] Empty state when no data
- **Testing**:
  - [ ] Playwright: Verify charts render with seed data
  - [ ] Unit: Data aggregation functions produce correct totals
  - [ ] Visual: Screenshot dashboard with sample data
- **Skills**: `shadcn-patterns`

### Task 6.2: Drop Calendar

- **Objective**: Calendar view of upcoming product drops
- **Dependencies**: None
- **Blocked by**: Phase 2
- **Files**: `src/app/(dashboard)/calendar/page.tsx`, `src/components/calendar/*.tsx`
- **Contracts**:
  ```typescript
  // Manual entry: drop name, date, time, retailer, category, notes, URL
  // Calendar view (month) + list view toggle
  // Category color coding: sneakers, pokemon, funko, supreme
  // Notification reminder before drop (configurable: 1h, 30m, 15m)
  ```
- **Acceptance Criteria**:
  - [ ] Month calendar view with drop indicators
  - [ ] List view sorted by date
  - [ ] Add/edit/delete drops
  - [ ] Category-based color coding
  - [ ] Reminder notifications via Tauri
- **Testing**:
  - [ ] Playwright: Add drop, verify it shows on calendar
  - [ ] Playwright: Toggle calendar/list view
  - [ ] Unit: Reminder scheduling logic
- **Skills**: `shadcn-patterns`

### Task 6.3: Notification Center

- **Objective**: In-app notification center + OS notifications via Tauri
- **Dependencies**: None
- **Blocked by**: Phase 2
- **Files**: `src/components/notification-center.tsx`, `src/lib/notifications.ts`
- **Contracts**:
  ```typescript
  // Notification types: webhook_received, price_alert, drop_reminder, discord_keyword
  // Bell icon in header with unread count badge
  // Dropdown list of recent notifications
  // Click notification to navigate to relevant section
  // OS notification via tauri-plugin-notification for critical alerts
  ```
- **Acceptance Criteria**:
  - [ ] Bell icon shows unread count
  - [ ] Dropdown shows recent notifications with timestamps
  - [ ] Click navigates to relevant page
  - [ ] OS notifications for price alerts and drop reminders
  - [ ] Mark as read / clear all
- **Testing**:
  - [ ] Playwright: Trigger notification, verify badge + dropdown
  - [ ] Smoke: OS notification fires in Tauri dev
- **Skills**: `shadcn-patterns`, `tauri-commands`

### Task 6.4: Resource Hub (Link Directory)

- **Objective**: Curated links to guides organized by topic
- **Dependencies**: None
- **Blocked by**: Phase 2
- **Files**: `src/app/(dashboard)/resources/page.tsx`, `src/components/resources/*.tsx`
- **Contracts**:
  ```typescript
  // Categories: Getting Started, Proxies, Bots, Cook Groups, Retail Sites
  // Each link: title, URL, source (AYCD/Cybersole/etc), description
  // Search/filter by category + keyword
  // User can add custom links
  // Seed data: 20-30 curated links
  ```
- **Acceptance Criteria**:
  - [ ] Grid of link cards organized by category
  - [ ] Search filters links by title/description
  - [ ] Add custom link button
  - [ ] Links open in default browser
- **Testing**:
  - [ ] Playwright: Search for link, click, verify external open
  - [ ] Unit: Search filter logic
- **Skills**: `shadcn-patterns`

### Task 6.R: Phase 6 Regression

- **Objective**: Full regression of analytics, calendar, notifications, resources
- **Dependencies**: All Phase 6 tasks complete
- **Testing**:
  - [ ] Playwright: Full flow through each new section
  - [ ] Analytics charts render with real data from previous phases
  - [ ] Notifications fire from webhooks, price alerts, calendar
  - [ ] Phase 1-5 regression: All previous features still work

---

## Phase 7: Polish & Distribution

**Goal**: Onboarding wizard, animations, system tray, Tauri build for distribution.

### Task 7.1: Onboarding Wizard

- **Objective**: 3-step wizard for new users
- **Dependencies**: All data layer complete
- **Blocked by**: Phase 2
- **Files**: `src/app/onboarding/page.tsx`, `src/components/onboarding/*.tsx`
- **Contracts**:
  ```typescript
  // Step 1: "What do you bot?" - select categories (sneakers, pokemon, funko, etc.)
  // Step 2: "What tools do you use?" - select bots (Cybersole, Valor, NSB, etc.)
  // Step 3: "Import your data" - CSV import, AYCD import, manual skip
  // Saves preferences to settings table
  // Under 5 minutes to productive
  ```
- **Acceptance Criteria**:
  - [ ] 3-step flow with progress indicator
  - [ ] Category + bot selections saved to settings
  - [ ] Data import works from step 3
  - [ ] Skip option for each step
  - [ ] Redirects to dashboard after completion
- **Testing**:
  - [ ] Playwright: Complete onboarding flow, verify settings saved
  - [ ] Playwright: Skip all steps, verify dashboard loads
- **Skills**: `shadcn-patterns`

### Task 7.2: UI Polish & Animations

- **Objective**: Add functional animations, verify all design tokens, polish interactions
- **Dependencies**: All UI complete
- **Blocked by**: Phase 6
- **Files**: Various component files
- **Contracts**:
  ```typescript
  // Page transitions: 150ms fade
  // Card hover: subtle lift (2px translate, shadow increase)
  // Modal open/close: 200ms scale + fade
  // Sidebar collapse: 200ms width transition
  // Loading states: skeleton components
  // No decorative animations - functional only
  ```
- **Acceptance Criteria**:
  - [ ] All transitions are 150-200ms
  - [ ] Loading states use skeleton components
  - [ ] No janky or missing animations
  - [ ] Design tokens consistent across all pages (amber accent, zinc backgrounds)
  - [ ] Dark theme looks polished on every screen
- **Testing**:
  - [ ] Visual: Screenshot every page, compare to design spec
  - [ ] Performance: No animation jank (60fps)
- **Skills**: `shadcn-patterns`

### Task 7.3: System Tray & Background

- **Objective**: System tray icon, minimize to tray, background notifications
- **Dependencies**: Task 6.3 (notifications)
- **Blocked by**: 6.3
- **Files**: `src-tauri/src/tray.rs`, `src-tauri/capabilities/default.json`
- **Contracts**:
  ```typescript
  // Tray icon with menu: Show/Hide, Discord Status, Quit
  // Close button minimizes to tray (not quit)
  // Background webhook listener continues in tray
  // Tray icon badge for unread notifications
  ```
- **Acceptance Criteria**:
  - [ ] Tray icon appears in system tray
  - [ ] Click shows/hides main window
  - [ ] Right-click shows context menu
  - [ ] Close minimizes to tray
  - [ ] Background processing continues
- **Testing**:
  - [ ] Smoke: Tray icon works in Tauri build
  - [ ] Smoke: Close minimizes, notifications still fire
- **Skills**: `tauri-commands`

### Task 7.4: Tauri Build & Distribution

- **Objective**: Build .app/.dmg for macOS, prepare distribution
- **Dependencies**: All features complete
- **Blocked by**: Phase 6
- **Files**: `src-tauri/tauri.conf.json`, `.github/workflows/release.yml`
- **Contracts**:
  ```typescript
  // Build targets: macOS ARM (.app in .dmg), macOS Intel (.app in .dmg)
  // App identifier: com.bottingos.app
  // Auto-updater: check https://releases.bottingos.app/latest.json
  // GitHub Actions: build on tag push, create GitHub Release
  ```
- **Acceptance Criteria**:
  - [ ] `npx tauri build` produces working .dmg
  - [ ] App launches, creates database, all features work
  - [ ] Auto-updater configured (endpoint can be placeholder)
  - [ ] GitHub Actions workflow builds on release tag
  - [ ] Unsigned build instructions: xattr command documented
- **Testing**:
  - [ ] Full app smoke test on built .dmg
  - [ ] Install on clean Mac, complete onboarding, use each feature
  - [ ] GitHub Actions: dry-run build succeeds
- **Skills**: `tauri-commands`

### Task 7.R: Phase 7 Regression

- **Objective**: Full regression on built Tauri app
- **Dependencies**: All Phase 7 tasks complete
- **Testing**:
  - [ ] Install from .dmg on clean system
  - [ ] Complete onboarding wizard
  - [ ] Use every feature (calculator, tracker, emails, vault, VCC, orders, inventory, Discord, analytics, calendar, resources)
  - [ ] Verify encryption, persistence, notifications
  - [ ] System tray: minimize, background notifications
  - [ ] All Phase 1-6 regression tests pass

---

## Phase 8: Comprehensive E2E Testing

**Goal**: Multi-angle end-to-end testing on the fully built application.

### Task 8.1: User Flow Testing

- **Objective**: Test every user path end-to-end
- **Testing**:
  - [ ] Flow 1 (Quick Profit Check): Search product -> see prices -> calculate profit
  - [ ] Flow 2 (Post-Checkout): Send webhook -> order appears -> add to inventory -> mark sold -> profit tracked
  - [ ] Flow 3 (Account Management): Import 750 emails -> organize by source -> tag retailers -> filter
  - [ ] Flow 4 (Discord Monitor): Connect CDP -> select channels -> receive messages -> filter feed
  - [ ] New user onboarding: Install -> master password -> onboarding wizard -> first calculation

### Task 8.2: Data Integrity Testing

- **Objective**: Verify data persistence, encryption, and consistency
- **Testing**:
  - [ ] App restart: All data persists correctly
  - [ ] Master password: Wrong password fails, correct password decrypts vault
  - [ ] Bulk operations: 1000+ emails, 500+ orders - no data loss
  - [ ] Cross-feature links: VCC -> account -> order -> inventory chain intact
  - [ ] CSV import/export round-trip: Export then re-import produces same data

### Task 8.3: Edge Case & Error Testing

- **Objective**: Verify graceful handling of edge cases
- **Testing**:
  - [ ] No internet: App works offline (local features)
  - [ ] Discord not installed: Graceful error message
  - [ ] Invalid webhook payload: Worker returns 400, no crash
  - [ ] Empty states: Every page shows helpful empty state
  - [ ] Concurrent operations: Multiple rapid imports don't corrupt data
  - [ ] Very long text: Product names, notes, URLs truncate properly

### Task 8.4: Performance & Polish Verification

- **Objective**: Verify app meets performance and design standards
- **Testing**:
  - [ ] App launch: Under 3 seconds to dashboard
  - [ ] Page navigation: Under 200ms
  - [ ] 750 email import: Under 2 seconds
  - [ ] Discord feed: 1000+ messages render smoothly (virtualized)
  - [ ] Memory: App stays under 200MB RAM after 1 hour use
  - [ ] Visual: Every page matches design spec (amber accent, zinc dark, consistent spacing)
  - [ ] No em dashes anywhere in the UI

---

## Dependency Graph

```
Phase 1 (Data Layer)
  1.1 Schema ──> 1.2 Rust DB ──> 1.4 Repositories
  1.3 Encryption ────────────┘
                              │
Phase 2 (Core UI) ───────────┘
  2.1 App Shell
  2.2-2.6 Feature rebuilds (parallel, depend on 2.1)
                              │
Phase 3 (Pricing) ───────────┘
  3.1 Rust Backend ──> 3.3 Calculator UI
  3.2 Fee Engine  ────┘      │
                   3.4 Alerts─┘
                              │
Phase 4 (Webhooks) ──────────┘
  4.1 Worker ──> 4.4 Order UI ──> 4.5 Inventory
  4.2 Parsers─┘
  4.3 Supabase─┘
                              │
Phase 5 (Discord) ───────────┘
  5.1 Process Mgmt ──> 5.2 CDP Capture ──> 5.3 Settings
                                            5.4 Feed UI
                              │
Phase 6 (Analytics) ─────────┘
  6.1-6.4 (parallel)
                              │
Phase 7 (Polish) ────────────┘
  7.1-7.3 (parallel) ──> 7.4 Build
                              │
Phase 8 (E2E Testing) ───────┘
  8.1-8.4 (parallel)
```

---

## Task Execution Protocol

### For each task:

1. **Orient**: Read task file, skills, PROGRESS.md
2. **Plan**: Explore codebase, plan approach
3. **Implement**: Feature branch, write code, write tests
4. **Test**: Run all applicable testing methods locally
5. **Complete**: Update PROGRESS.md, commit, merge to target branch

### For regression tasks:

1. Run ALL task tests from the phase
2. Full e2e testing from every angle
3. Fix any failures, retest
4. Merge phase branch to main

### For final phase:

1. All tasks are e2e testing on fully built app
2. Every user path and edge case covered
3. Every testing method applied
4. Iterate until all green
