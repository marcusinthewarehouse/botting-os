# Tauri v2 + Next.js + Drizzle Implementation Guide

**Date**: 2026-03-07
**Purpose**: Exact implementation details for execution agents

---

## 1. Tauri v2 + Next.js Static Export Setup

### 1.1 Adding Tauri to Existing Next.js Project

```bash
# Install Tauri CLI
npm install -D @tauri-apps/cli@latest

# Initialize Tauri in the project (creates src-tauri/ directory)
npx tauri init
```

During `tauri init`, answer the prompts:

- App name: `BottingOS`
- Window title: `BottingOS`
- Frontend dev URL: `http://localhost:3000`
- Frontend build output: `../out`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

### 1.2 NPM Packages Required

```bash
# Core Tauri packages
npm install @tauri-apps/api@latest          # Frontend API (invoke, window, etc.)
npm install -D @tauri-apps/cli@latest       # CLI tooling

# Tauri plugins (JS bindings)
npm install @tauri-apps/plugin-sql           # SQLite access
npm install @tauri-apps/plugin-updater       # Auto-update
npm install @tauri-apps/plugin-dialog        # Native dialogs
npm install @tauri-apps/plugin-process       # Process control (relaunch)
npm install @tauri-apps/plugin-store         # Key-value storage
npm install @tauri-apps/plugin-fs            # File system access
npm install @tauri-apps/plugin-notification  # OS notifications
npm install @tauri-apps/plugin-http          # HTTP client (bypasses CORS)

# Drizzle
npm install drizzle-orm
npm install -D drizzle-kit
```

### 1.3 next.config.ts (or next.config.mjs)

```typescript
const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Required for Tauri dev mode HMR to work correctly
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
};

export default nextConfig;
```

**Key constraints with static export:**

- No Server Components with dynamic functions (cookies(), headers())
- No API Routes (use Tauri IPC instead)
- No Server Actions
- No Middleware
- No `next/image` optimization (set `unoptimized: true`)
- `useParams()` has known issues - use alternative routing patterns

### 1.4 tauri.conf.json

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "BottingOS",
  "version": "0.1.0",
  "identifier": "com.bottingos.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [
      {
        "title": "BottingOS",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "decorations": false,
        "transparent": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "createUpdaterArtifacts": true,
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "updater": {
      "pubkey": "",
      "endpoints": [
        "https://github.com/OWNER/REPO/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### 1.5 Handling `next/image`

Static export does not support Next.js image optimization. Two options:

**Option A**: Global config (recommended)

```typescript
// next.config.ts
images: {
  unoptimized: true;
}
```

**Option B**: Per-image

```tsx
import Image from "next/image";
<Image src="/logo.png" alt="logo" width={100} height={100} unoptimized />;
```

### 1.6 Client-Side Routing with App Router

Static export works with App Router. All pages must be client components or statically renderable.

```tsx
// src/app/layout.tsx
"use client";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

For dynamic routes, use `generateStaticParams()`:

```tsx
// src/app/inventory/[id]/page.tsx
export function generateStaticParams() {
  // Return all possible IDs at build time
  // For a desktop app, this is usually not needed - use client-side routing instead
  return [];
}
```

**Better approach for desktop**: Use client-side state management (Zustand, React context) for "routing" between views instead of file-based dynamic routes. Static export works best with flat route structures.

### 1.7 Tauri API Import Pattern

Tauri APIs reference `window.__TAURI__` which doesn't exist during Next.js SSR/HMR. Always lazy-import:

```typescript
// WRONG - breaks in dev
import { invoke } from "@tauri-apps/api/core";

// RIGHT - lazy import inside client component
async function callBackend() {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke("my_command", { arg: "value" });
}

// RIGHT - check for Tauri environment
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
```

### 1.8 Dev Workflow

```bash
# Single command runs both Next.js dev server AND Tauri window
npx tauri dev

# What happens internally:
# 1. Runs `npm run dev` (Next.js dev server on localhost:3000)
# 2. Compiles Rust backend
# 3. Opens Tauri window pointing at localhost:3000
# 4. Frontend hot-reloads via Next.js HMR
# 5. Rust changes require restart (keep Rust layer thin)
```

First build takes 5-10 minutes (Rust compilation). Subsequent builds are incremental and much faster.

### 1.9 Production Build

```bash
# Build for current platform
npx tauri build

# Output locations:
# macOS: src-tauri/target/release/bundle/dmg/BottingOS.dmg
# macOS: src-tauri/target/release/bundle/macos/BottingOS.app
# Windows: src-tauri/target/release/bundle/nsis/BottingOS_setup.exe
```

---

## 2. Drizzle ORM + SQLite in Tauri

### 2.1 Architecture Overview

```
[Next.js Client Component]
  -> Drizzle sqlite-proxy (generates SQL string + params)
  -> @tauri-apps/plugin-sql (JS bindings)
  -> Tauri IPC (invoke)
  -> tauri-plugin-sql (Rust, uses sqlx)
  -> SQLite file on disk
  -> Returns rows as JSON
  -> Drizzle maps to typed objects
```

### 2.2 Rust Side Setup

**src-tauri/Cargo.toml:**

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-updater = "2"
tauri-plugin-dialog = "2"
tauri-plugin-process = "2"
tauri-plugin-store = "2"
tauri-plugin-fs = "2"
tauri-plugin-notification = "2"
tauri-plugin-http = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

**src-tauri/src/lib.rs:**

```rust
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**src-tauri/capabilities/default.json:**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close",
    "store:default",
    "fs:default",
    "notification:default",
    "http:default",
    "dialog:default",
    "process:default",
    "updater:default"
  ]
}
```

### 2.3 Drizzle sqlite-proxy Setup

**src/lib/db/index.ts:**

```typescript
import { drizzle } from "drizzle-orm/sqlite-proxy";
import Database from "@tauri-apps/plugin-sql";
import * as schema from "./schema";

let dbInstance: Awaited<ReturnType<typeof Database.load>> | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:bottingos.db");
  }
  return dbInstance;
}

function isSelectQuery(sql: string): boolean {
  const trimmed = sql.trimStart().toLowerCase();
  return trimmed.startsWith("select") || trimmed.startsWith("pragma");
}

export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    const sqlite = await getDb();
    let rows: any = [];

    if (isSelectQuery(sql)) {
      rows = await sqlite.select(sql, params).catch((e: any) => {
        console.error("SQL Select Error:", e);
        return [];
      });
    } else {
      await sqlite.execute(sql, params).catch((e: any) => {
        console.error("SQL Execute Error:", e);
      });
      return { rows: [] };
    }

    // Drizzle expects arrays of values, not objects
    rows = rows.map((row: any) => Object.values(row));

    const results = method === "all" ? rows : rows[0];
    return { rows: results };
  },
  { schema, logger: false },
);
```

### 2.4 Schema Definitions

**src/lib/db/schema.ts:**

```typescript
import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Users table (master password auth)
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Email accounts for botting
export const emails = sqliteTable("emails", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  password: blob("password").notNull(), // AES-256-GCM encrypted
  iv: text("iv").notNull(),
  provider: text("provider"), // gmail, outlook, yahoo
  status: text("status").default("active"), // active, banned, suspended
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Bot accounts (Nike, Shopify, etc.)
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  site: text("site").notNull(), // nike, shopify, footlocker
  username: text("username").notNull(),
  password: blob("password").notNull(), // encrypted
  iv: text("iv").notNull(),
  emailId: integer("email_id").references(() => emails.id),
  proxy: text("proxy"),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Virtual credit cards
export const vccs = sqliteTable("vccs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lastFour: text("last_four").notNull(),
  cardData: blob("card_data").notNull(), // encrypted JSON with full card info
  iv: text("iv").notNull(),
  provider: text("provider"), // privacy, capital one
  accountId: integer("account_id").references(() => accounts.id),
  status: text("status").default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Orders / checkouts
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  size: text("size"),
  site: text("site").notNull(),
  retailPrice: real("retail_price"),
  purchasePrice: real("purchase_price").notNull(),
  marketPrice: real("market_price"),
  bot: text("bot"), // cybersole, valor, nsb
  proxy: text("proxy"),
  status: text("status").default("purchased"), // purchased, shipped, delivered, sold, returned
  soldPrice: real("sold_price"),
  soldPlatform: text("sold_platform"), // stockx, goat, ebay
  category: text("category"), // sneakers, pokemon, funko
  notes: text("notes"),
  orderDate: integer("order_date", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Inventory items
export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").references(() => orders.id),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  size: text("size"),
  condition: text("condition").default("new"), // new, used, damaged
  location: text("location"), // closet, warehouse, shipped
  category: text("category").notNull(),
  purchasePrice: real("purchase_price").notNull(),
  currentMarketPrice: real("current_market_price"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// App settings
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Relations
export const emailsRelations = relations(emails, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  email: one(emails, { fields: [accounts.emailId], references: [emails.id] }),
  vccs: many(vccs),
}));

export const vccsRelations = relations(vccs, ({ one }) => ({
  account: one(accounts, {
    fields: [vccs.accountId],
    references: [accounts.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  inventoryItem: one(inventory),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  order: one(orders, { fields: [inventory.orderId], references: [orders.id] }),
}));
```

### 2.5 drizzle.config.ts

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "sqlite",
} satisfies Config;
```

**package.json scripts:**

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "tauri": "tauri"
  }
}
```

### 2.6 Migration Strategy for Desktop App

Drizzle's built-in `migrate()` calls `readMigrationFiles()` which uses Node's `fs` module - unavailable in a WebView. The solution is to inline SQL migration files at build time.

**For Next.js (no Vite `import.meta.glob`)**, use a different approach - read migration files via Tauri's filesystem or embed them.

**Recommended approach - custom migration runner using tauri-plugin-sql:**

**src/lib/db/migrate.ts:**

```typescript
import Database from "@tauri-apps/plugin-sql";

// Migration SQL strings - imported at build time or hardcoded
// For Next.js without Vite, define migrations as an ordered array
const migrations: { name: string; sql: string }[] = [
  {
    name: "0000_init",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      -- Add more CREATE TABLE statements
    `,
  },
  // Future migrations added here as new entries
];

export async function runMigrations() {
  const sqlite = await Database.load("sqlite:bottingos.db");

  // Create migrations tracking table
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `);

  // Get already-applied migrations
  const applied = await sqlite
    .select<
      { name: string }[]
    >("SELECT name FROM __drizzle_migrations ORDER BY id")
    .catch(() => []);
  const appliedNames = new Set(applied.map((r) => r.name));

  // Run pending migrations
  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;

    console.log(`Running migration: ${migration.name}`);
    const statements = migration.sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await sqlite.execute(statement);
    }

    await sqlite.execute(
      "INSERT INTO __drizzle_migrations (name, created_at) VALUES (?, ?)",
      [migration.name, Date.now()],
    );
  }

  await sqlite.close();
  console.log("Migrations complete");
}
```

**Alternative for projects using Vite (not Next.js):**

```typescript
// Vite can inline SQL files at build time
const migrationFiles = import.meta.glob<string>("./migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});
```

**Migration workflow:**

1. Edit `schema.ts`
2. Run `npm run db:generate` to create SQL migration files
3. Copy the generated SQL into the migrations array in `migrate.ts`
4. On app startup, `runMigrations()` runs before any DB queries
5. Migrations are idempotent - already-applied ones are skipped

### 2.7 SQLite Crate on Rust Side

**tauri-plugin-sql** (official) uses **sqlx** internally. This is the recommended approach.

Alternatives:

- `rusqlite` via `tauri-plugin-rusqlite2` (community) - SQLite-only, supports transactions
- Direct `sqlx` integration without plugin - more control, more boilerplate

For BottingOS, use the official `tauri-plugin-sql` with sqlx. It handles connection pooling, WAL mode, and async execution.

### 2.8 Complete IPC Flow Example

```typescript
// Frontend: src/lib/db/queries/orders.ts
import { db } from '../index';
import { orders } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getRecentOrders(limit = 50) {
  return db.select().from(orders).orderBy(desc(orders.orderDate)).limit(limit);
}

export async function addOrder(order: typeof orders.$inferInsert) {
  return db.insert(orders).values(order);
}

export async function updateOrderStatus(id: number, status: string) {
  return db.update(orders).set({ status }).where(eq(orders.id, id));
}

// Frontend: src/components/OrderList.tsx
'use client';
import { useEffect, useState } from 'react';
import { getRecentOrders } from '@/lib/db/queries/orders';
import type { InferSelectModel } from 'drizzle-orm';
import type { orders } from '@/lib/db/schema';

type Order = InferSelectModel<typeof orders>;

export function OrderList() {
  const [orderList, setOrderList] = useState<Order[]>([]);

  useEffect(() => {
    getRecentOrders().then(setOrderList);
  }, []);

  return (
    <div>
      {orderList.map((order) => (
        <div key={order.id}>{order.productName}</div>
      ))}
    </div>
  );
}
```

---

## 3. Tauri Auto-Update

### 3.1 Generate Signing Keys

```bash
# Generate key pair for update signing
npx tauri signer generate -w ~/.tauri/bottingos.key

# This outputs:
# - Private key saved to ~/.tauri/bottingos.key (keep secret)
# - Public key printed to stdout (put in tauri.conf.json)
# - You'll be prompted for a password (save it securely)
```

### 3.2 tauri.conf.json Updater Config

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "endpoints": [
        "https://github.com/OWNER/bottingos/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### 3.3 latest.json Format (auto-generated by tauri-action)

```json
{
  "version": "0.2.0",
  "notes": "Bug fixes and performance improvements",
  "pub_date": "2026-03-07T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "Content of .app.tar.gz.sig file",
      "url": "https://github.com/OWNER/bottingos/releases/download/v0.2.0/BottingOS_0.2.0_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "Content of .app.tar.gz.sig file",
      "url": "https://github.com/OWNER/bottingos/releases/download/v0.2.0/BottingOS_0.2.0_x64.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "Content of .nsis.zip.sig file",
      "url": "https://github.com/OWNER/bottingos/releases/download/v0.2.0/BottingOS_0.2.0_x64-setup.nsis.zip"
    }
  }
}
```

### 3.4 Build with Signing

```bash
# Set env vars before building
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/bottingos.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your-password-here"

# Build (creates signed artifacts + .sig files)
npx tauri build
```

### 3.5 GitHub Actions Workflow

```yaml
name: "Release"
on:
  workflow_dispatch:
  push:
    branches:
      - release

jobs:
  publish-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: "macos-latest"
            args: "--target aarch64-apple-darwin"
          - platform: "macos-latest"
            args: "--target x86_64-apple-darwin"
          - platform: "windows-latest"
            args: ""
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: "npm"

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: "./src-tauri -> target"

      - name: Install frontend dependencies
        run: npm install

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: "BottingOS v__VERSION__"
          releaseBody: "See the assets to download and install."
          releaseDraft: true
          prerelease: false
          includeUpdaterJson: true
          args: ${{ matrix.args }}
```

**GitHub Secrets to set:**

- `TAURI_SIGNING_PRIVATE_KEY` - contents of `~/.tauri/bottingos.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - the password used during key generation

### 3.6 Frontend Update Check

```typescript
// src/lib/updater.ts
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask, message } from "@tauri-apps/plugin-dialog";

export async function checkForUpdates(silent = true) {
  try {
    const update = await check();

    if (!update) {
      if (!silent) {
        await message("You are on the latest version.", {
          title: "No Update Available",
          kind: "info",
        });
      }
      return;
    }

    if (update.available) {
      const yes = await ask(
        `Version ${update.version} is available.\n\n${update.body || "Bug fixes and improvements."}`,
        {
          title: "Update Available",
          kind: "info",
          okLabel: "Update Now",
          cancelLabel: "Later",
        },
      );

      if (yes) {
        let downloaded = 0;
        let total = 0;

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case "Started":
              total = event.data.contentLength ?? 0;
              break;
            case "Progress":
              downloaded += event.data.chunkLength;
              // Could update a progress bar here
              break;
            case "Finished":
              break;
          }
        });

        await relaunch();
      }
    }
  } catch (error) {
    console.error("Update check failed:", error);
  }
}
```

**Call on app startup:**

```tsx
// src/app/layout.tsx or a top-level provider
"use client";
import { useEffect } from "react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check for updates silently on launch
    import("@/lib/updater").then(({ checkForUpdates }) => {
      checkForUpdates(true);
    });
  }, []);

  return <>{children}</>;
}
```

---

## 4. Window Customization

### 4.1 Custom Titlebar with Drag Region

**tauri.conf.json** - disable native decorations:

```json
{
  "app": {
    "windows": [
      {
        "decorations": false,
        "transparent": false
      }
    ]
  }
}
```

**React Titlebar Component:**

```tsx
// src/components/Titlebar.tsx
"use client";
import { useEffect } from "react";

export function Titlebar() {
  const handleMinimize = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().toggleMaximize();
  };

  const handleClose = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().close();
  };

  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between bg-[#09090B] border-b border-white/[0.08] select-none"
    >
      {/* App title */}
      <div
        data-tauri-drag-region
        className="pl-3 text-xs font-medium text-[#FAFAFA]/60"
      >
        BottingOS
      </div>

      {/* Window controls (Windows style) */}
      <div className="flex h-full">
        <button
          onClick={handleMinimize}
          className="h-full px-3 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <MinimizeIcon />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-3 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <MaximizeIcon />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-3 hover:bg-red-500 text-white/60 hover:text-white transition-colors"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
```

**Important**: `data-tauri-drag-region` only applies to the element it's on, not children. Add it to each child that should be draggable, or use manual drag:

```typescript
// Manual drag alternative
element.addEventListener("mousedown", async (e) => {
  if (e.buttons === 1) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    if (e.detail === 2) {
      getCurrentWindow().toggleMaximize();
    } else {
      getCurrentWindow().startDragging();
    }
  }
});
```

### 4.2 macOS Traffic Lights with tauri-plugin-decorum

For macOS, use the `tauri-plugin-decorum` plugin to position native traffic lights on a custom titlebar:

**Cargo.toml:**

```toml
[dependencies]
tauri-plugin-decorum = "1"
```

**lib.rs:**

```rust
use tauri::Manager;
use tauri_plugin_decorum::WebviewWindowExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_decorum::init())
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();

            // Create overlay titlebar (transparent native titlebar)
            main_window.create_overlay_titlebar().unwrap();

            #[cfg(target_os = "macos")]
            {
                // Position traffic lights (x_offset, y_offset from top-left)
                main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

With decorum, on macOS the native traffic lights (close/minimize/maximize) render over your custom titlebar at the specified position. On Windows, you render your own controls.

### 4.3 System Tray

**Cargo.toml features:**

```toml
tauri = { version = "2", features = ["tray-icon", "image-png"] }
```

**lib.rs tray setup:**

```rust
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager,
};

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Create menu items
            let show = MenuItemBuilder::with_id("show", "Show BottingOS").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&show)
                .separator()
                .item(&quit)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .icon(app.default_window_icon().unwrap().clone())
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 4.4 Disable Right-Click and Text Selection

```css
/* Global CSS - prevent web-like behavior on chrome elements */
.no-select {
  -webkit-user-select: none;
  user-select: none;
}

/* Disable context menu on non-input elements */
```

```typescript
// src/app/layout.tsx - disable right-click globally
'use client';
import { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow context menu on inputs and textareas
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  return (
    <html lang="en">
      <body className="select-none">{children}</body>
    </html>
  );
}
```

---

## 5. Code Signing for Distribution

### 5.1 Unsigned Builds (Testing)

**macOS:**

```bash
# Build the app
npx tauri build

# Zip the .app
cd src-tauri/target/release/bundle/macos
zip -r BottingOS.zip BottingOS.app

# Send zip to tester. They run:
xattr -dr com.apple.quarantine /path/to/BottingOS.app
# Then double-click to open
```

macOS Sequoia (15+) still supports the xattr method but requires Terminal access. Right-click > Open also works for first launch.

**Windows:**

- SmartScreen shows "Windows protected your PC" warning
- User clicks "More info" then "Run anyway"
- Easier than macOS - no Terminal commands needed

### 5.2 Apple Developer Program

- **Cost**: $99/year
- **What you get**: Developer ID certificate + notarization
- **Process**:
  1. Enroll at developer.apple.com/programs
  2. Generate Developer ID certificate in Xcode or web portal
  3. Configure Tauri to sign with your certificate
  4. Notarization is free (automated scan by Apple)
  5. Notarized apps pass Gatekeeper without user intervention

**Tauri macOS signing** (env vars for CI):

```bash
APPLE_CERTIFICATE="base64 encoded .p12"
APPLE_CERTIFICATE_PASSWORD="cert password"
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
APPLE_ID="your@apple.id"
APPLE_PASSWORD="app-specific-password"
APPLE_TEAM_ID="TEAMID"
```

Guide: https://v2.tauri.app/distribute/sign/macos/

### 5.3 Windows Code Signing

**Options (2025-2026 pricing):**

- EV Code Signing: $250-500/year (SSL.com from ~$249/yr, Sectigo, DigiCert)
- OV Code Signing: $70-200/year
- Microsoft Trusted Signing: $9.99/month (cloud-based, newest option)

**Important change (March 2024)**: EV certificates no longer instantly remove SmartScreen warnings. Both OV and EV now require reputation building through download volume.

**Requirement**: All code signing keys must be stored on FIPS 140-2 Level 2 hardware (USB token or cloud HSM). No more software-only keys.

**Recommendation for BottingOS**: Skip Windows code signing initially. The "Run anyway" click is easy enough for testers. Add when real distribution starts.

Guide: https://v2.tauri.app/distribute/sign/windows/

---

## 6. Quick Reference - File Structure

```
bottingos/
  src/
    app/
      layout.tsx              # Root layout, context menu disable, update check
      page.tsx                 # Home/dashboard
      calculator/page.tsx
      tracker/page.tsx
      emails/page.tsx
      vault/page.tsx
      vccs/page.tsx
      inventory/page.tsx
      analytics/page.tsx
      settings/page.tsx
    components/
      Titlebar.tsx             # Custom titlebar with drag region
      ui/                      # shadcn components
    lib/
      db/
        index.ts               # Drizzle sqlite-proxy setup
        schema.ts              # All table definitions
        migrate.ts             # Custom migration runner
        migrations/            # Generated SQL files
        queries/
          orders.ts
          emails.ts
          accounts.ts
          vccs.ts
          inventory.ts
      updater.ts               # Update check logic
      crypto.ts                # AES-256-GCM encryption helpers
  src-tauri/
    src/
      lib.rs                   # Plugin registration, tray, window setup
    capabilities/
      default.json             # Permissions
    tauri.conf.json            # App config
    Cargo.toml                 # Rust dependencies
    icons/                     # App icons
  drizzle.config.ts            # Drizzle Kit config
  next.config.ts               # Static export config
  package.json
```

---

## Sources

- [Next.js | Tauri Official Docs](https://v2.tauri.app/start/frontend/nextjs/)
- [Tauri Configuration Reference](https://v2.tauri.app/reference/config/)
- [Drizzle + SQLite in Tauri App - HuaKun](https://dev.to/huakun/drizzle-sqlite-in-tauri-app-kif)
- [Drizzle SQLite Migrations in Tauri 2.0 - KeyPears](https://keypears.com/blog/2025-10-04-drizzle-sqlite-tauri)
- [Building a Tauri v2 + Drizzle + SQLite Starter](https://dev.to/meddjelaili/building-a-tauri-v2-drizzle-sqlite-app-starter-template-15bm)
- [Tauri + Drizzle Proxy - Kunkun Docs](https://docs.kunkun.sh/blog/tauri--drizzle-proxy/)
- [tauri-drizzle-sqlite-proxy-demo](https://github.com/tdwesten/tauri-drizzle-sqlite-proxy-demo)
- [Tauri Updater Plugin Docs](https://v2.tauri.app/plugin/updater/)
- [Tauri Auto-Updater Guide - Gurjot](https://thatgurjot.com/til/tauri-auto-updater/)
- [Tauri GitHub Actions Pipeline](https://v2.tauri.app/distribute/pipelines/github/)
- [Window Customization | Tauri](https://v2.tauri.app/learn/window-customization/)
- [tauri-plugin-decorum](https://github.com/clearlysid/tauri-plugin-decorum)
- [System Tray | Tauri](https://v2.tauri.app/learn/system-tray/)
- [Tauri SQL Plugin Docs](https://v2.tauri.app/plugin/sql/)
- [macOS Code Signing | Tauri](https://v2.tauri.app/distribute/sign/macos/)
- [Windows Code Signing | Tauri](https://v2.tauri.app/distribute/sign/windows/)
- [Drizzle ORM Migrations Docs](https://orm.drizzle.team/docs/migrations)
- [tauri-nextjs-template](https://github.com/kvnxiao/tauri-nextjs-template)
- [Apple Developer Program](https://developer.apple.com/programs/)
