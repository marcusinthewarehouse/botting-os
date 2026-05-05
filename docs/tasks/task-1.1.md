# Task 1.1: SQLite + Drizzle Schema

## Objective

Define all database tables in Drizzle ORM schema, set up the sqlite-proxy driver connecting to Tauri's tauri-plugin-sql, and create a custom migration runner that works in the WebView environment. This is the foundation every other task depends on.

## Context

BottingOS is a Tauri v2 desktop app wrapping a Next.js 16 static export. The current MVP uses localStorage for all 5 features (calculator, tracker, emails, vault, VCC). This task creates the real data layer using SQLite via Drizzle ORM's `sqlite-proxy` driver. The architecture is: Drizzle generates SQL in the frontend, sends it over Tauri IPC to `tauri-plugin-sql` (which uses sqlx internally), executes against a local SQLite file, and maps results back to typed objects.

## Dependencies

- None - this is the first task

## Blocked By

- Nothing

## Research Findings

### Drizzle sqlite-proxy Pattern

Drizzle's `sqlite-proxy` driver accepts an async callback. The callback receives `(sql, params, method)` and must return `{ rows }`. For SELECT queries, use `sqlite.select()`. For mutations, use `sqlite.execute()`. Rows from tauri-plugin-sql come as objects - must be converted to arrays of values via `Object.values(row)`. The `method` param determines if `rows` should be the full array (`'all'`) or just the first element (`'get'`).

### Migration Strategy

Drizzle's built-in `migrate()` calls `readMigrationFiles()` which uses Node's `fs` module - unavailable in a WebView. Solution: define migrations as an ordered array of `{ name, sql }` objects in TypeScript. On app startup, check `__drizzle_migrations` tracking table, run pending migrations. Migrations are forward-only, no rollbacks.

### Database Location

SQLite file stored at Tauri's app data directory:

- macOS: `~/Library/Application Support/com.bottingos.app/bottingos.db`
- Windows: `%APPDATA%/com.bottingos.app/bottingos.db`

### Tauri API Import Gotcha

Next.js dev server runs Node.js for HMR. `window.__TAURI__` doesn't exist during SSR. Always lazy-import Tauri APIs:

```typescript
// WRONG
import Database from "@tauri-apps/plugin-sql";
// RIGHT
const Database = (await import("@tauri-apps/plugin-sql")).default;
```

## Implementation Plan

### Step 1: Install Dependencies

```bash
npm install drizzle-orm @tauri-apps/plugin-sql
npm install -D drizzle-kit
```

Add to `package.json` scripts:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push"
}
```

### Step 2: Create Schema (src/lib/db/schema.ts)

Define all tables using `sqliteTable` from `drizzle-orm/sqlite-core`. Use `integer` with `{ mode: 'timestamp' }` for dates. Use `text` with `{ mode: 'json' }` for JSON arrays. Use `blob` for encrypted data. Use `real` for prices/amounts.

**Tables to define:**

1. **emails** - HideMyEmail addresses and email accounts
   - id (integer PK autoincrement)
   - address (text, not null) - the email address
   - icloudAccount (text) - parent iCloud if HideMyEmail alias
   - provider (text) - gmail, outlook, yahoo, icloud
   - retailers (text, json mode, `string[]`) - tagged retailers
   - status (text, default 'active') - active, banned, suspended
   - notes (text)
   - createdAt, updatedAt (integer, timestamp mode)

2. **vault_entries** - encrypted credentials store
   - id (integer PK autoincrement)
   - site (text, not null)
   - username (text, not null)
   - passwordCiphertext (blob, not null) - AES-256-GCM encrypted
   - passwordIv (text, not null)
   - notesCiphertext (blob) - encrypted notes
   - notesIv (text)
   - createdAt, updatedAt (integer, timestamp mode)

3. **vccs** - virtual credit cards
   - id (integer PK autoincrement)
   - provider (text) - privacy, capital one
   - lastFour (text, not null)
   - label (text)
   - linkedAccountId (integer, FK to emails)
   - status (text, default 'active')
   - createdAt, updatedAt (integer, timestamp mode)

4. **orders** - bot checkout records
   - id (integer PK autoincrement)
   - botName (text)
   - product (text, not null)
   - size (text)
   - price (real, not null)
   - store (text)
   - profile (text)
   - orderNumber (text)
   - success (integer, boolean mode)
   - rawData (text) - raw webhook JSON
   - createdAt (integer, timestamp mode)

5. **inventory_items** - items in stock
   - id (integer PK autoincrement)
   - orderId (integer, FK to orders)
   - name (text, not null)
   - category (text) - sneakers, pokemon, funko
   - purchasePrice (real, not null)
   - status (text, default 'in_stock') - in_stock, listed, sold, returned
   - listedUrl (text)
   - listedPrice (real)
   - soldPrice (real)
   - soldDate (integer, timestamp mode)
   - createdAt, updatedAt (integer, timestamp mode)

6. **calculator_history** - saved calculations
   - id (integer PK autoincrement)
   - productName (text)
   - sku (text)
   - purchasePrice (real, not null)
   - resultsJson (text, not null) - JSON with per-marketplace breakdown
   - createdAt (integer, timestamp mode)

7. **tracker_entries** - profit/expense tracking
   - id (integer PK autoincrement)
   - type (text, not null) - purchase, sale, cancel, refund
   - description (text, not null)
   - amount (real, not null)
   - category (text)
   - date (integer, timestamp mode, not null)
   - tags (text, json mode, `string[]`)
   - createdAt (integer, timestamp mode)

8. **settings** - key-value app config
   - key (text PK)
   - value (text, not null)

9. **price_alerts** - price monitoring
   - id (integer PK autoincrement)
   - productId (text)
   - productName (text, not null)
   - targetPrice (real, not null)
   - direction (text, not null) - above, below
   - marketplace (text) - stockx, goat, ebay
   - active (integer, boolean mode, default true)
   - createdAt (integer, timestamp mode)

**Relations to define:**

- emails 1:N vccs (via linkedAccountId)
- orders 1:1 inventory_items (via orderId)

### Step 3: Create Types (src/lib/db/types.ts)

Export inferred types for each table:

```typescript
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import * as schema from "./schema";

export type Email = InferSelectModel<typeof schema.emails>;
export type NewEmail = InferInsertModel<typeof schema.emails>;
// ... for all tables
```

### Step 4: Create Database Client (src/lib/db/client.ts)

Set up the Drizzle sqlite-proxy instance:

```typescript
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

// Helper to detect Tauri environment
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// Lazy singleton for tauri-plugin-sql Database
let dbInstance: any = null;

async function getDb() {
  if (!dbInstance) {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
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
    if (isSelectQuery(sql)) {
      const rows = await sqlite.select(sql, params).catch((e: any) => {
        console.error("SQL Select Error:", e, sql);
        return [];
      });
      const mapped = rows.map((row: any) => Object.values(row));
      return { rows: method === "all" ? mapped : mapped[0] };
    }
    await sqlite.execute(sql, params).catch((e: any) => {
      console.error("SQL Execute Error:", e, sql);
    });
    return { rows: [] };
  },
  { schema, logger: false },
);
```

### Step 5: Create Migration Runner (src/lib/db/migrations.ts)

Define initial migration with CREATE TABLE statements for all tables. Track applied migrations in `__drizzle_migrations` table.

```typescript
const migrations: { name: string; sql: string }[] = [
  {
    name: "0001_initial",
    sql: `
      CREATE TABLE IF NOT EXISTS emails (...);
      CREATE TABLE IF NOT EXISTS vault_entries (...);
      -- all tables
    `,
  },
];

export async function runMigrations() {
  const Database = (await import("@tauri-apps/plugin-sql")).default;
  const sqlite = await Database.load("sqlite:bottingos.db");

  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `);

  const applied = await sqlite
    .select("SELECT name FROM __drizzle_migrations ORDER BY id")
    .catch(() => []);
  const appliedNames = new Set(applied.map((r: any) => r.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;
    console.log(`Running migration: ${migration.name}`);
    const statements = migration.sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await sqlite.execute(stmt);
    }
    await sqlite.execute(
      "INSERT INTO __drizzle_migrations (name, created_at) VALUES (?, ?)",
      [migration.name, Date.now()],
    );
  }
}
```

### Step 6: Create Drizzle Config (drizzle.config.ts)

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "sqlite",
} satisfies Config;
```

### Step 7: Verify Generated SQL

Run `npm run db:generate` to produce migration SQL. Cross-reference with the migration runner's hardcoded SQL to ensure they match. The generated SQL is reference - the migration runner uses its own copy since Drizzle's file-based runner can't access the filesystem in a WebView.

## Files to Create

- `src/lib/db/schema.ts` - All Drizzle table definitions and relations
- `src/lib/db/client.ts` - Drizzle sqlite-proxy instance with tauri-plugin-sql callback
- `src/lib/db/migrations.ts` - Custom migration runner with initial migration SQL
- `src/lib/db/types.ts` - Exported TypeScript types for all tables (InferSelectModel/InferInsertModel)
- `drizzle.config.ts` - Drizzle Kit configuration

## Files to Modify

- `package.json` - Add drizzle-orm, @tauri-apps/plugin-sql deps, db:generate script

## Contracts

### Provides (for downstream)

- `db` - Drizzle ORM instance (from `src/lib/db/client.ts`)
- `schema.*` - All table definitions (from `src/lib/db/schema.ts`)
- `runMigrations()` - Call on app startup before any queries (from `src/lib/db/migrations.ts`)
- Type exports: `Email`, `NewEmail`, `VaultEntry`, `NewVaultEntry`, `Vcc`, `NewVcc`, `Order`, `NewOrder`, `InventoryItem`, `NewInventoryItem`, `CalculatorHistory`, `NewCalculatorHistory`, `TrackerEntry`, `NewTrackerEntry`, `PriceAlert`, `NewPriceAlert`

### Consumes (from upstream)

- Nothing

## Acceptance Criteria

- [ ] All 9 tables defined in schema.ts with correct column types
- [ ] Relations defined between emails-vccs and orders-inventory
- [ ] Types exported for all tables (select and insert variants)
- [ ] Drizzle sqlite-proxy client correctly lazy-imports @tauri-apps/plugin-sql
- [ ] isSelectQuery helper handles SELECT and PRAGMA statements
- [ ] Migration runner creates \_\_drizzle_migrations tracking table
- [ ] Migration runner skips already-applied migrations
- [ ] Migration runner splits SQL on semicolons and executes each statement
- [ ] Initial migration SQL creates all 9 tables with correct schema
- [ ] drizzle.config.ts points at correct schema path and uses sqlite dialect
- [ ] `npm run db:generate` produces valid SQL matching the schema
- [ ] No top-level Tauri API imports (all lazy-imported)
- [ ] TypeScript compiles with no errors

## Testing Protocol

### Unit/Integration Tests

- Import schema.ts and verify all table names and column definitions
- Import types.ts and verify type inference works
- Verify migration SQL is valid SQLite syntax (parse check)

### Browser Testing (Playwright MCP)

- Not applicable for this task (no UI)

### Build/Lint/Type Checks

- `npx tsc --noEmit` passes
- `npm run db:generate` completes without error
- Verify generated migration SQL matches hardcoded migration SQL

## Skills to Read

- `.claude/skills/bottingos-data-model/SKILL.md`
- `.claude/skills/tauri-commands/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/tauri-nextjs-drizzle-implementation.md` (sections 2.1-2.6)

## Git

- Branch: feat/1.1-drizzle-schema
- Commit message prefix: Task 1.1:
