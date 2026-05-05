# Testing & Deployment Implementation Research - BottingOS

**Domain:** Testing strategy, CI/CD, dev workflow, mock data, Claude Code integration
**Project:** BottingOS - Tauri v2 + Next.js 16 + Drizzle + SQLite
**Date:** 2026-03-07

---

## 1. Playwright Testing for Tauri/Next.js

### Running Playwright Against `next dev`

Playwright's `webServer` config auto-starts Next.js dev server before tests run.

**playwright.config.ts:**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

For production-like testing (static export), use a static server instead:

```typescript
webServer: {
  command: process.env.CI
    ? "npm run build && npx serve out -l 3000"
    : "npm run dev",
  port: 3000,
  reuseExistingServer: !process.env.CI,
},
```

### Mocking Tauri IPC in Playwright

Tauri v2 provides `@tauri-apps/api/mocks` with a `mockIPC` function. This lets you test the web layer without the Rust backend.

**Setup: Expose mockIPC to Playwright via window global**

In your app entry (conditionally loaded in test mode):

```typescript
// src/lib/test-helpers.ts (only imported when NEXT_PUBLIC_PLAYWRIGHT=true)
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";

declare global {
  interface Window {
    mockIPC: typeof mockIPC;
    clearMocks: typeof clearMocks;
  }
}

if (process.env.NEXT_PUBLIC_PLAYWRIGHT === "true") {
  window.mockIPC = mockIPC;
  window.clearMocks = clearMocks;
}
```

**Playwright test with mocked IPC:**

```typescript
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    if (window.mockIPC) {
      window.mockIPC((cmd, args) => {
        switch (cmd) {
          case "get_vault_entries":
            return [
              { id: 1, site: "stockx.com", username: "user@test.com" },
              { id: 2, site: "goat.com", username: "user2@test.com" },
            ];
          case "execute_query":
            return { rows: [], columns: [] };
          default:
            return null;
        }
      });
    }
  });
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.clearMocks?.());
});
```

**Alternative approach (no Tauri dependency in tests):**
Since BottingOS runs Playwright against `next dev` (not inside Tauri), the app won't have `window.__TAURI__` available. Create an abstraction layer:

```typescript
// src/lib/backend.ts
export async function queryDb(sql: string, params: unknown[]) {
  if (window.__TAURI__) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("execute_query", { sql, params });
  }
  // Fallback for web/test mode - use in-memory store or API route
  return fetch("/api/db", {
    method: "POST",
    body: JSON.stringify({ sql, params }),
  });
}
```

This pattern means Playwright tests work against `next dev` without any Tauri mocking at all - the web fallback path handles it.

### Test File Structure

```
tests/
  e2e/
    calculator.spec.ts       # Flip calculator flows
    tracker.spec.ts          # Profit tracker CRUD
    emails.spec.ts           # Email manager import/filter
    vault.spec.ts            # Password vault lock/unlock
    vcc.spec.ts              # VCC tracker
    orders.spec.ts           # Order tracker + webhook
    discord-feed.spec.ts     # Discord message feed UI
    navigation.spec.ts       # Sidebar nav, routing
    onboarding.spec.ts       # First-run wizard
    settings.spec.ts         # Settings page
  unit/
    fee-calculator.test.ts   # Marketplace fee math
    encryption.test.ts       # AES-256-GCM encrypt/decrypt
    webhook-parser.test.ts   # Bot payload parsing
    csv-parser.test.ts       # Credit card CSV import
    db-queries.test.ts       # Drizzle query logic
```

### Key Test Scenarios

**Calculator:**

```typescript
test("calculates profit across all marketplaces", async ({ page }) => {
  await page.goto("/calculator");
  await page.fill('[data-testid="product-search"]', "Nike Dunk Low Panda");
  await page.click('[data-testid="search-btn"]');
  await page.click('[data-testid="product-result"]:first-child');
  await page.fill('[data-testid="purchase-price"]', "110");
  await page.fill('[data-testid="quantity"]', "2");
  await page.click('[data-testid="calculate-btn"]');

  await expect(page.locator('[data-testid="ebay-profit"]')).toBeVisible();
  await expect(page.locator('[data-testid="stockx-profit"]')).toBeVisible();
  await expect(page.locator('[data-testid="goat-profit"]')).toBeVisible();

  // Verify fee breakdown is shown
  await expect(page.locator('[data-testid="ebay-fees"]')).toContainText("%");
});

test("handles manual price entry when API unavailable", async ({ page }) => {
  await page.goto("/calculator");
  await page.click('[data-testid="manual-entry-toggle"]');
  await page.fill('[data-testid="purchase-price"]', "110");
  await page.fill('[data-testid="resell-price"]', "180");
  await page.selectOption('[data-testid="marketplace-select"]', "ebay");
  await page.click('[data-testid="calculate-btn"]');

  await expect(page.locator('[data-testid="profit-amount"]')).toBeVisible();
});
```

**Form submission + data persistence:**

```typescript
test("adds inventory item and persists across reload", async ({ page }) => {
  await page.goto("/inventory");
  await page.click('[data-testid="add-item-btn"]');
  await page.fill('[data-testid="item-name"]', "Jordan 1 Chicago");
  await page.fill('[data-testid="item-cost"]', "170");
  await page.fill('[data-testid="item-size"]', "10.5");
  await page.selectOption('[data-testid="item-category"]', "sneakers");
  await page.click('[data-testid="save-btn"]');

  await expect(page.locator("text=Jordan 1 Chicago")).toBeVisible();

  // Reload and verify persistence
  await page.reload();
  await expect(page.locator("text=Jordan 1 Chicago")).toBeVisible();
});
```

---

## 2. Unit Testing Setup

### Vitest (Recommended over Jest for this stack)

**Why Vitest:** Next.js 16 officially supports Vitest. It's 10-20x faster than Jest in watch mode, has native TypeScript/ESM support, and the Jest-compatible API means zero learning curve. For a greenfield Tauri + Next.js project, Vitest is the clear choice.

**Install:**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

**vitest.config.ts:**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/utils/**"],
    },
  },
});
```

**tests/setup.ts:**

```typescript
import "@testing-library/jest-dom/vitest";
```

**package.json scripts:**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Testing Drizzle Queries with In-Memory SQLite

Use `better-sqlite3` with `:memory:` for fast, isolated tests.

```bash
npm install -D better-sqlite3 @types/better-sqlite3
```

**tests/unit/db-queries.test.ts:**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";

// Schema (import from your actual schema in real tests)
const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  costPrice: real("cost_price").notNull(),
  size: text("size"),
  status: text("status").default("in_stock"),
});

describe("inventory queries", () => {
  let db: ReturnType<typeof drizzle>;

  beforeEach(() => {
    const sqlite = new Database(":memory:");
    db = drizzle(sqlite);
    // Push schema to in-memory db
    sqlite.exec(`
      CREATE TABLE inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        cost_price REAL NOT NULL,
        size TEXT,
        status TEXT DEFAULT 'in_stock'
      )
    `);
  });

  it("inserts and retrieves inventory item", async () => {
    await db.insert(inventoryItems).values({
      name: "Jordan 1 Chicago",
      category: "sneakers",
      costPrice: 170,
      size: "10.5",
    });

    const items = await db.select().from(inventoryItems);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Jordan 1 Chicago");
  });

  it("filters by category", async () => {
    await db.insert(inventoryItems).values([
      { name: "Jordan 1", category: "sneakers", costPrice: 170 },
      { name: "Charizard PSA 10", category: "pokemon", costPrice: 300 },
    ]);

    const sneakers = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.category, "sneakers"));

    expect(sneakers).toHaveLength(1);
    expect(sneakers[0].name).toBe("Jordan 1");
  });
});
```

### Testing Fee Calculations (Pure Logic)

```typescript
// src/lib/fees.ts
type Marketplace = "ebay" | "stockx" | "goat" | "flightclub";

interface FeeResult {
  marketplace: Marketplace;
  salePrice: number;
  fees: number;
  feePercent: number;
  shipping: number;
  payout: number;
  profit: number;
  roi: number;
}

export function calculateFees(
  costPrice: number,
  salePrice: number,
  marketplace: Marketplace,
): FeeResult {
  let feePercent: number;
  let flatFee = 0;
  let shipping = 0;

  switch (marketplace) {
    case "ebay":
      feePercent = 0.1349; // 13.49% for sneakers category
      break;
    case "stockx":
      feePercent = 0.1; // 10% (Level 1 seller)
      shipping = 4; // shipping label
      break;
    case "goat":
      feePercent = 0.124; // 12.4%
      flatFee = 5; // commission flat fee
      shipping = 7;
      break;
    case "flightclub":
      feePercent = 0.095; // 9.5%
      shipping = 0; // consignment, no shipping
      break;
  }

  const fees = salePrice * feePercent + flatFee;
  const payout = salePrice - fees - shipping;
  const profit = payout - costPrice;
  const roi = costPrice > 0 ? (profit / costPrice) * 100 : 0;

  return {
    marketplace,
    salePrice,
    fees,
    feePercent,
    shipping,
    payout,
    profit,
    roi,
  };
}
```

**tests/unit/fee-calculator.test.ts:**

```typescript
import { describe, it, expect } from "vitest";
import { calculateFees } from "@/lib/fees";

describe("fee calculator", () => {
  const costPrice = 110;
  const salePrice = 180;

  it("calculates eBay fees correctly", () => {
    const result = calculateFees(costPrice, salePrice, "ebay");
    expect(result.fees).toBeCloseTo(24.28, 1);
    expect(result.profit).toBeCloseTo(45.72, 1);
    expect(result.roi).toBeCloseTo(41.56, 0);
  });

  it("calculates StockX fees correctly", () => {
    const result = calculateFees(costPrice, salePrice, "stockx");
    expect(result.fees).toBeCloseTo(18, 1);
    expect(result.shipping).toBe(4);
    expect(result.profit).toBeCloseTo(48, 1);
  });

  it("calculates GOAT fees correctly", () => {
    const result = calculateFees(costPrice, salePrice, "goat");
    expect(result.fees).toBeCloseTo(27.32, 1);
    expect(result.flatFee || result.shipping).toBeDefined();
  });

  it("handles zero cost price without NaN", () => {
    const result = calculateFees(0, 180, "ebay");
    expect(result.roi).toBe(0);
    expect(Number.isNaN(result.profit)).toBe(false);
  });

  it("handles negative profit correctly", () => {
    const result = calculateFees(200, 180, "stockx");
    expect(result.profit).toBeLessThan(0);
  });
});
```

### Testing Encryption/Decryption

```typescript
// tests/unit/encryption.test.ts
import { describe, it, expect } from "vitest";

// Simulated Web Crypto API functions (actual impl uses window.crypto)
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt(plaintext: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return { salt, iv, ciphertext: new Uint8Array(ciphertext) };
}

async function decrypt(
  encrypted: { salt: Uint8Array; iv: Uint8Array; ciphertext: Uint8Array },
  password: string,
) {
  const key = await deriveKey(password, encrypted.salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encrypted.iv },
    key,
    encrypted.ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

describe("encryption", () => {
  it("encrypts and decrypts correctly", async () => {
    const password = "masterpass123";
    const plaintext =
      '{"site":"stockx.com","username":"user@test.com","password":"secret"}';

    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);

    expect(decrypted).toBe(plaintext);
  });

  it("fails with wrong password", async () => {
    const encrypted = await encrypt("secret data", "correctpass");
    await expect(decrypt(encrypted, "wrongpass")).rejects.toThrow();
  });

  it("produces different ciphertext for same input (random IV)", async () => {
    const encrypted1 = await encrypt("same data", "pass");
    const encrypted2 = await encrypt("same data", "pass");
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
  });
});
```

### Testing Webhook Payload Parsing

```typescript
// tests/unit/webhook-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseWebhookPayload } from "@/lib/webhook-parser";

describe("webhook parser", () => {
  it("parses Cybersole Discord embed", () => {
    const payload = MOCK_CYBERSOLE_WEBHOOK; // see Section 5
    const result = parseWebhookPayload(payload);

    expect(result.bot).toBe("cybersole");
    expect(result.productName).toBe("Nike Dunk Low Panda");
    expect(result.price).toBe(110);
    expect(result.size).toBe("10.5");
    expect(result.orderNumber).toBeDefined();
    expect(result.site).toBe("nike.com");
  });

  it("parses Valor Discord embed", () => {
    const payload = MOCK_VALOR_WEBHOOK;
    const result = parseWebhookPayload(payload);

    expect(result.bot).toBe("valor");
    expect(result.productName).toBeDefined();
    expect(result.price).toBeGreaterThan(0);
  });

  it("handles malformed payload gracefully", () => {
    const result = parseWebhookPayload({ embeds: [] });
    expect(result).toBeNull();
  });

  it("fuzzy-matches unknown bot format", () => {
    const payload = {
      embeds: [
        {
          title: "Successful Checkout!",
          fields: [
            { name: "Product", value: "Jordan 1 Chicago" },
            { name: "Price", value: "$170.00" },
          ],
        },
      ],
    };
    const result = parseWebhookPayload(payload);
    expect(result?.productName).toBe("Jordan 1 Chicago");
    expect(result?.price).toBe(170);
  });
});
```

---

## 3. CI/CD for Tauri Desktop App

### GitHub Actions Workflow

**`.github/workflows/release.yml`:**

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: --target aarch64-apple-darwin
            rust-target: aarch64-apple-darwin
          - platform: macos-latest
            args: --target x86_64-apple-darwin
            rust-target: x86_64-apple-darwin
          - platform: windows-latest
            args: ""
            rust-target: ""

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.rust-target }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri -> target

      - name: Install dependencies
        run: npm ci

      - name: Build and release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Code signing (macOS)
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        with:
          tagName: v__VERSION__
          releaseName: "BottingOS v__VERSION__"
          releaseBody: "See the assets for download links."
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

**`.github/workflows/test.yml` (runs on every PR):**

```yaml
name: Test

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:run

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Artifacts Produced

| Platform    | Artifacts                       |
| ----------- | ------------------------------- |
| macOS ARM   | `.dmg`, `.app` (aarch64)        |
| macOS Intel | `.dmg`, `.app` (x86_64)         |
| Windows     | `.msi`, `.exe` (NSIS installer) |

### Tauri Updater Integration

In `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "dialog": true,
      "endpoints": [
        "https://github.com/YOUR_USER/bottingos/releases/latest/download/latest.json"
      ]
    }
  }
}
```

The `tauri-action` automatically generates the `latest.json` manifest in the GitHub Release, which the updater checks on launch.

---

## 4. Dev Workflow

### Development Environment Setup

**tauri.conf.json (relevant section):**

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3000",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../out"
  }
}
```

**Running development:**

```bash
# Web-only development (most common during feature building)
npm run dev
# Opens at http://localhost:3000 with Fast Refresh

# Full Tauri development (when testing desktop features)
cargo tauri dev
# This automatically runs `npm run dev` via beforeDevCommand,
# then opens the Tauri window pointing at localhost:3000
# Both frontend (Fast Refresh) and Rust (recompile on save) hot reload
```

**package.json scripts for development:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "tauri:dev": "cargo tauri dev",
    "tauri:build": "cargo tauri build",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint"
  }
}
```

### Hot Reload Behavior

- **Frontend:** Next.js Fast Refresh works inside the Tauri webview. Save a `.tsx` file, see the change instantly.
- **Rust backend:** Tauri v2 recompiles Rust on save during `cargo tauri dev`. Takes 2-5 seconds for incremental builds.
- **Known issue:** Next.js `assetPrefix` can break hot reload in Tauri. Avoid setting it during development. Only set it for production builds if needed.

### Testing Tauri IPC Commands During Dev

```rust
// src-tauri/src/lib.rs
use log::info;

#[tauri::command]
fn execute_query(sql: String, params: Vec<serde_json::Value>) -> Result<serde_json::Value, String> {
    info!("Executing query: {}", sql);
    // Execute against SQLite
    // ...
    Ok(serde_json::json!({"rows": [], "columns": []}))
}
```

Test IPC from the browser devtools console:

```javascript
// In the Tauri webview devtools (Cmd+Option+I)
const { invoke } = window.__TAURI__.core;
const result = await invoke("execute_query", { sql: "SELECT 1", params: [] });
console.log(result);
```

### Debugging Rust Backend

**Logging setup (src-tauri/src/main.rs):**

```rust
use tauri_plugin_log::{Target, TargetKind};

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                    Target::new(TargetKind::LogDir { file_name: None }),
                ])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![execute_query])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Log levels: `info!()`, `warn!()`, `error!()`, `debug!()`, `trace!()` from the `log` crate. Logs appear in terminal, webview console, and app log file.

**VS Code debugging:** Install the CodeLLDB extension, create a launch configuration targeting the Tauri binary for breakpoints in Rust code.

---

## 5. Test Fixtures and Mock Data

### Mock Discord Messages (Feed UI)

```typescript
// tests/fixtures/discord-messages.ts
export const MOCK_DISCORD_MESSAGES = [
  {
    id: "1234567890",
    channel_id: "987654321",
    guild_id: "111222333",
    author: {
      username: "CybersoleBot",
      avatar: "abc123",
      bot: true,
    },
    content: "",
    embeds: [
      {
        title: "Successful Checkout",
        color: 0x00ff00,
        fields: [
          { name: "Product", value: "Nike Dunk Low Panda", inline: true },
          { name: "Size", value: "10.5", inline: true },
          { name: "Price", value: "$110.00", inline: true },
          { name: "Site", value: "nike.com", inline: true },
          { name: "Profile", value: "Main", inline: true },
          { name: "Order #", value: "CS-78901", inline: true },
        ],
        thumbnail: { url: "https://example.com/dunk.jpg" },
        timestamp: "2026-03-07T12:00:00.000Z",
      },
    ],
    timestamp: "2026-03-07T12:00:00.000Z",
  },
  {
    id: "1234567891",
    channel_id: "987654321",
    guild_id: "111222333",
    author: {
      username: "MonitorBot",
      avatar: "def456",
      bot: true,
    },
    content: "",
    embeds: [
      {
        title: "Restock Alert",
        description: "Nike Dunk Low Panda restocked on Footlocker",
        color: 0xff6600,
        fields: [
          { name: "SKU", value: "DD1391-100", inline: true },
          { name: "Sizes", value: "8, 9, 10, 10.5, 11, 12", inline: false },
          {
            name: "Link",
            value: "[Footlocker](https://footlocker.com/product/dd1391-100)",
            inline: false,
          },
        ],
        timestamp: "2026-03-07T12:05:00.000Z",
      },
    ],
    timestamp: "2026-03-07T12:05:00.000Z",
  },
];
```

### Mock Webhook Payloads (Bot-Specific)

```typescript
// tests/fixtures/webhook-payloads.ts

// Cybersole sends Discord embed format
export const MOCK_CYBERSOLE_WEBHOOK = {
  embeds: [
    {
      title: "Successful Checkout",
      color: 3066993,
      fields: [
        { name: "Product", value: "Nike Dunk Low Panda", inline: true },
        { name: "Size", value: "10.5", inline: true },
        { name: "Price", value: "$110.00", inline: true },
        { name: "Site", value: "nike.com", inline: true },
        { name: "Profile", value: "Profile 1", inline: true },
        { name: "Order Number", value: "CS-12345", inline: true },
        { name: "Proxy", value: "ISP - Residential", inline: true },
        { name: "Checkout Speed", value: "2.3s", inline: true },
      ],
      footer: { text: "Cybersole" },
      thumbnail: { url: "https://example.com/product.jpg" },
      timestamp: "2026-03-07T15:30:00.000Z",
    },
  ],
};

// Valor sends similar Discord embed format
export const MOCK_VALOR_WEBHOOK = {
  embeds: [
    {
      title: "Checkout - Success",
      color: 65280,
      fields: [
        {
          name: "Product",
          value: "Jordan 1 Retro High OG Chicago",
          inline: true,
        },
        { name: "Size", value: "11", inline: true },
        { name: "Store", value: "Footlocker US", inline: true },
        { name: "Price", value: "$180.00", inline: true },
        { name: "Profile", value: "Main Profile", inline: true },
        { name: "Mode", value: "Safe", inline: true },
        { name: "Order #", value: "FL-98765", inline: true },
      ],
      footer: { text: "Valor AIO" },
      timestamp: "2026-03-07T15:31:00.000Z",
    },
  ],
};

// NSB (Nike Shoe Bot)
export const MOCK_NSB_WEBHOOK = {
  embeds: [
    {
      title: "Successfully Checked Out!",
      color: 3447003,
      fields: [
        { name: "Item", value: "Yeezy Boost 350 V2 Onyx", inline: true },
        { name: "Size", value: "9.5", inline: true },
        { name: "Store", value: "Adidas US", inline: true },
        { name: "Total", value: "$230.00", inline: true },
        { name: "Email", value: "bot***@gmail.com", inline: true },
        { name: "Order ID", value: "AD-54321", inline: true },
      ],
      footer: { text: "NSB" },
      timestamp: "2026-03-07T15:32:00.000Z",
    },
  ],
};
```

### Mock Sneaks-API Responses

```typescript
// tests/fixtures/sneaks-api-responses.ts
export const MOCK_SNEAKS_SEARCH_RESULTS = [
  {
    shoeName: "Nike Dunk Low Retro White Black Panda",
    brand: "Nike",
    silhoutte: "Nike Dunk Low",
    styleID: "DD1391-100",
    retailPrice: 110,
    colorway: "White/Black",
    thumbnail:
      "https://images.stockx.com/images/Nike-Dunk-Low-Retro-White-Black-2021.jpg",
    releaseDate: "2021-03-10",
    description:
      "The Nike Dunk Low Retro White Black features a white leather upper...",
    urlKey: "nike-dunk-low-retro-white-black-2021",
    resellLinks: {
      stockX: "https://stockx.com/nike-dunk-low-retro-white-black-2021",
      flightClub:
        "https://www.flightclub.com/nike-dunk-low-retro-white-black-panda",
      goat: "https://www.goat.com/sneakers/dunk-low-retro-white-black-dd1391-100",
    },
    lowestResellPrice: {
      stockX: 95,
      flightClub: 99,
      goat: 92,
    },
  },
];

export const MOCK_SNEAKS_PRICE_MAP = {
  stockX: {
    "7": 120,
    "7.5": 115,
    "8": 110,
    "8.5": 105,
    "9": 100,
    "9.5": 98,
    "10": 95,
    "10.5": 93,
    "11": 92,
    "11.5": 95,
    "12": 98,
    "13": 110,
    "14": 130,
  },
  goat: {
    "7": 118,
    "8": 108,
    "9": 98,
    "10": 92,
    "11": 90,
    "12": 95,
  },
  flightClub: {
    "7": 125,
    "8": 112,
    "9": 102,
    "10": 99,
    "11": 95,
    "12": 100,
  },
};
```

### Sample CSV Files (Credit Card Import)

```typescript
// tests/fixtures/csv-samples.ts

export const MOCK_CHASE_CSV = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
03/01/2026,03/02/2026,NIKE.COM,Shopping,Sale,-110.00,
03/01/2026,03/02/2026,FOOTLOCKER #1234,Shopping,Sale,-180.00,
03/02/2026,03/03/2026,ADIDAS.COM,Shopping,Sale,-230.00,
03/03/2026,03/04/2026,STARBUCKS,Food & Drink,Sale,-5.50,
03/04/2026,03/05/2026,SUPREME NEW YORK,Shopping,Sale,-68.00,`;

export const MOCK_CAPITAL_ONE_CSV = `Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
2026-03-01,2026-03-02,1234,NIKE.COM,Merchandise,110.00,
2026-03-01,2026-03-02,1234,STOCKX INC,Merchandise,95.00,
2026-03-03,2026-03-04,1234,WALMART.COM,Merchandise,25.00,`;

export const MOCK_AMEX_CSV = `Date,Description,Amount,Extended Details,Appears On Your Statement As,Address,City/State,Zip Code,Country,Reference,Category
03/01/2026,NIKE.COM,-110.00,NIKE.COM,NIKE.COM,,,,,Merchandise & Supplies-Internet Purchase
03/02/2026,GOAT.COM,-92.00,GOAT.COM,GOAT INC,,,,,Merchandise & Supplies-Internet Purchase`;
```

### Sample AYCD Export Files

```typescript
// tests/fixtures/aycd-exports.ts

export const MOCK_AYCD_PROFILES_JSON = [
  {
    profileName: "Main Profile",
    billingAddress: {
      firstName: "John",
      lastName: "Doe",
      address1: "123 Main St",
      address2: "",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
      country: "US",
      phone: "3101234567",
    },
    shippingAddress: {
      firstName: "John",
      lastName: "Doe",
      address1: "123 Main St",
      address2: "",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
      country: "US",
      phone: "3101234567",
    },
    paymentDetails: {
      cardHolder: "John Doe",
      cardNumber: "4111111111111111",
      expMonth: "12",
      expYear: "2028",
      cvv: "123",
    },
    email: "john@example.com",
  },
  {
    profileName: "Backup Profile",
    billingAddress: {
      firstName: "Jane",
      lastName: "Doe",
      address1: "456 Oak Ave",
      address2: "Apt 2B",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US",
      phone: "2121234567",
    },
    shippingAddress: null,
    paymentDetails: {
      cardHolder: "Jane Doe",
      cardNumber: "5500000000000004",
      expMonth: "06",
      expYear: "2027",
      cvv: "456",
    },
    email: "jane@example.com",
  },
];

// AYCD CSV format (Profile Builder export)
export const MOCK_AYCD_PROFILES_CSV = `Profile Name,Email,First Name,Last Name,Address 1,Address 2,City,State,Zip,Country,Phone,Card Holder,Card Number,Exp Month,Exp Year,CVV
Main Profile,john@example.com,John,Doe,123 Main St,,Los Angeles,CA,90001,US,3101234567,John Doe,4111111111111111,12,2028,123
Backup Profile,jane@example.com,Jane,Doe,456 Oak Ave,Apt 2B,New York,NY,10001,US,2121234567,Jane Doe,5500000000000004,06,2027,456`;
```

---

## 6. Claude Code Integration

### PostToolUse Prettier Hook

**`.claude/settings.json`:**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

The hook receives tool input via stdin as JSON. `jq` extracts the `file_path` field, and `xargs` passes it to Prettier. The `|| true` prevents hook failures from blocking Claude.

**Prettier config (`.prettierrc`):**

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Stop Hook (TypeScript Check)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write 2>/dev/null || true"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd /Users/marcushooshmand/Documents/Claude/bottingos && npx tsc --noEmit 2>&1 | tail -20"
          }
        ]
      }
    ]
  }
}
```

### /test Slash Command

**`.claude/commands/test.md`:**

```markdown
---
name: test
description: Run the full test suite (types, lint, unit, e2e)
context: fork
allowed-tools: Bash(npm *), Bash(npx *)
---

Run the full test suite in order. Stop and report if any step fails.

1. TypeScript type check:
   `npx tsc --noEmit`

2. ESLint:
   `npm run lint`

3. Unit tests:
   `npx vitest run`

4. E2E tests (if dev server available):
   `npx playwright test`

Report a pass/fail summary with any error details.
```

### /dev Slash Command

**`.claude/commands/dev.md`:**

```markdown
---
name: dev
description: Start the Next.js dev server
context: fork
allowed-tools: Bash(npm *), Bash(npx *), Bash(lsof *)
---

Start the dev server:

1. Check if port 3000 is already in use: `lsof -i :3000`
2. If not in use, start: `cd /Users/marcushooshmand/Documents/Claude/bottingos && npm run dev &`
3. Wait for the server to be ready
4. Report: Dev server running at http://localhost:3000
```

### Playwright Commands for verify-app Subagent

The `verify-app` subagent should run these commands:

```bash
# Run all e2e tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/calculator.spec.ts

# Run with UI mode (interactive debugging)
npx playwright test --ui

# Run headed (see the browser)
npx playwright test --headed

# Take screenshot of a specific page
npx playwright test tests/e2e/screenshot.spec.ts

# Generate test report
npx playwright show-report
```

**Subagent prompt template:**

```
Verify the app works correctly by running Playwright tests.

1. Ensure dev server is running at http://localhost:3000
2. Run: npx playwright test
3. If any tests fail, read the test file and the error output
4. Report: which tests passed, which failed, and why
5. Take screenshots of any failing pages for visual inspection
```

---

## Summary: Files to Create During Phase 5

| File                            | Purpose                                   |
| ------------------------------- | ----------------------------------------- |
| `playwright.config.ts`          | E2E test configuration                    |
| `vitest.config.ts`              | Unit test configuration                   |
| `tests/setup.ts`                | Vitest setup (testing-library)            |
| `.prettierrc`                   | Prettier configuration                    |
| `.claude/settings.json`         | PostToolUse Prettier hook + Stop tsc hook |
| `.claude/commands/test.md`      | /test slash command                       |
| `.claude/commands/dev.md`       | /dev slash command                        |
| `.github/workflows/test.yml`    | CI: lint, typecheck, unit, e2e            |
| `.github/workflows/release.yml` | CD: build Tauri binaries, publish release |
| `tests/fixtures/`               | All mock data files from Section 5        |

### Install Commands

```bash
# Testing dependencies
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths @playwright/test

# Formatting
npm install -D prettier prettier-plugin-tailwindcss

# Database testing
npm install -D better-sqlite3 @types/better-sqlite3

# Install Playwright browsers
npx playwright install chromium
```

---

## Sources

- [Mock Tauri APIs (Tauri v2 docs)](https://v2.tauri.app/develop/tests/mocking/)
- [Tauri v2 Tests overview](https://v2.tauri.app/develop/tests/)
- [Tauri v2 GitHub Pipelines](https://v2.tauri.app/distribute/pipelines/github/)
- [tauri-apps/tauri-action](https://github.com/tauri-apps/tauri-action)
- [Next.js Playwright Testing Guide](https://nextjs.org/docs/pages/guides/testing/playwright)
- [Next.js Vitest Testing Guide](https://nextjs.org/docs/app/guides/testing/vitest)
- [Vitest Configuration](https://vitest.dev/config/)
- [Drizzle ORM SQLite Getting Started](https://orm.drizzle.team/docs/get-started/sqlite-new)
- [Tauri v2 Debug Guide](https://v2.tauri.app/develop/debug/)
- [Tauri v2 Logging Plugin](https://v2.tauri.app/plugin/logging/)
- [Tauri v2 DMG Distribution](https://v2.tauri.app/distribute/dmg/)
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [sneaks-api npm](https://www.npmjs.com/package/sneaks-api)
- [Ship Tauri v2 - GitHub Actions and Release Automation](https://dev.to/tomtomdu73/ship-your-tauri-v2-app-like-a-pro-github-actions-and-release-automation-part-22-2ef7)
- [Ship Tauri v2 - Code Signing](https://dev.to/tomtomdu73/ship-your-tauri-v2-app-like-a-pro-code-signing-for-macos-and-windows-part-12-3o9n)
- [Jest vs Vitest 2025](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9)
- [Tauri v2 + Next.js Monorepo Guide](https://melvinoostendorp.nl/blog/tauri-v2-nextjs-monorepo-guide)
- [Auto-format with Claude Code Hooks](https://martin.hjartmyr.se/articles/auto-format-with-claude-code-hooks/)
