# Task 1.4: Data Access Layer

## Objective

Create TypeScript repository modules that wrap Drizzle ORM queries for all database tables. Each repository provides type-safe CRUD operations. The vault repository integrates with the CryptoService for transparent encrypt-on-write and decrypt-on-read of sensitive fields.

## Context

Tasks 1.1 (schema) and 1.2 (Rust DB commands) provide the database foundation. Task 1.3 provides encryption. This task builds the data access layer that all UI components (Phase 2) will use. Each repository is a standalone module exporting async functions. No classes, no dependency injection - just functions that import `db` from the client and `schema` from the schema module.

## Dependencies

- Task 1.1 - Schema definitions and Drizzle client (`db`, `schema.*`, types)
- Task 1.2 - Tauri plugin-sql backend (must be running for queries to execute)
- Task 1.3 - CryptoService (`cryptoService.encrypt()`, `cryptoService.decrypt()`)

## Blocked By

- Task 1.1 (needs schema and db client)
- Task 1.2 (needs working SQL backend)
- Task 1.3 (vault repo needs encryption)

## Research Findings

### Repository Pattern

Each repo exports standalone async functions. Import the shared `db` instance and table schema. Use Drizzle's query builder for type-safe operations:

```typescript
import { db } from "../client";
import { emails } from "../schema";
import { eq, desc } from "drizzle-orm";

export async function getAll() {
  return db.select().from(emails).orderBy(desc(emails.createdAt));
}
```

### Vault Encryption Integration

The vault repository must:

1. On `create()`: encrypt password and notes before inserting
2. On `update()`: encrypt changed fields before updating
3. On `getById()` / `getAll()`: decrypt password and notes after fetching
4. If CryptoService is locked, throw an error (caller handles re-auth)

### Bulk Operations

The emails repository needs bulk insert for importing 750+ HideMyEmail addresses. Drizzle supports `.values([...])` with an array. SQLite has a limit of ~500 variables per query, so batch inserts into chunks of ~50 rows.

### Timestamp Handling

All `createdAt`/`updatedAt` fields use `{ mode: 'timestamp' }` which stores as integer (Unix timestamp). Set `new Date()` on create, update `updatedAt` on every mutation.

## Implementation Plan

### Step 1: Create Base Repository Pattern

Each repo file follows this structure:

```typescript
// src/lib/db/repositories/[table].ts
import { db } from '../client';
import { tableName } from '../schema';
import { eq, desc, like, and, inArray } from 'drizzle-orm';
import type { TableSelect, TableInsert } from '../types';

export async function getAll(): Promise<TableSelect[]> { ... }
export async function getById(id: number): Promise<TableSelect | undefined> { ... }
export async function create(data: Omit<TableInsert, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> { ... }
export async function update(id: number, data: Partial<TableInsert>): Promise<void> { ... }
export async function remove(id: number): Promise<void> { ... }
```

### Step 2: Emails Repository (src/lib/db/repositories/emails.ts)

Standard CRUD plus:

- `getByIcloudAccount(account: string)` - filter by parent iCloud account
- `getByRetailer(retailer: string)` - filter by retailer tag (JSON contains)
- `bulkCreate(emails: NewEmail[])` - insert in batches of 50
- `addRetailerTag(id: number, retailer: string)` - append to retailers JSON array
- `removeRetailerTag(id: number, retailer: string)` - remove from retailers JSON array
- `search(query: string)` - LIKE search on address field

### Step 3: Vault Repository (src/lib/db/repositories/vault.ts)

Encrypted CRUD:

- `getAll()` - fetch all, decrypt password and notes for each
- `getById(id)` - fetch one, decrypt
- `create(data: { site, username, password, notes? })` - encrypt password and notes, then insert
- `update(id, data)` - encrypt changed sensitive fields, then update
- `remove(id)` - standard delete

The vault repo imports `cryptoService` from `src/lib/crypto.ts`. If `cryptoService.isUnlocked()` is false, throw `new Error('Vault is locked')`.

```typescript
import { cryptoService } from "@/lib/crypto";

export async function create(data: {
  site: string;
  username: string;
  password: string;
  notes?: string;
}) {
  const { data: passwordCiphertext, iv: passwordIv } =
    await cryptoService.encrypt(data.password);
  let notesCiphertext: Uint8Array | null = null;
  let notesIv: string | null = null;
  if (data.notes) {
    const encrypted = await cryptoService.encrypt(data.notes);
    notesCiphertext = encrypted.data;
    notesIv = encrypted.iv;
  }
  const now = new Date();
  await db.insert(vaultEntries).values({
    site: data.site,
    username: data.username,
    passwordCiphertext,
    passwordIv,
    notesCiphertext,
    notesIv,
    createdAt: now,
    updatedAt: now,
  });
}
```

### Step 4: VCCs Repository (src/lib/db/repositories/vccs.ts)

Standard CRUD plus:

- `getByProvider(provider: string)` - filter by VCC provider
- `getByLinkedAccount(accountId: number)` - filter by linked email
- `linkToAccount(vccId: number, accountId: number)` - set linkedAccountId

### Step 5: Orders Repository (src/lib/db/repositories/orders.ts)

Standard CRUD plus:

- `getRecent(limit: number)` - last N orders by createdAt
- `getByBot(botName: string)` - filter by bot
- `getByStore(store: string)` - filter by store
- `getSuccessful()` - filter where success = true

### Step 6: Inventory Repository (src/lib/db/repositories/inventory.ts)

Standard CRUD plus:

- `getByCategory(category: string)` - filter by category
- `getByStatus(status: string)` - filter by status (in_stock, listed, sold, returned)
- `getInStock()` - shortcut for status = 'in_stock'
- `markAsSold(id: number, soldPrice: number)` - update status, soldPrice, soldDate
- `getTotalValue()` - sum of purchasePrice for in_stock items
- `getProfit()` - sum of (soldPrice - purchasePrice) for sold items

### Step 7: Calculator Repository (src/lib/db/repositories/calculator.ts)

Standard CRUD (simpler):

- `getAll()` - ordered by createdAt desc
- `create(data)` - save a calculation
- `remove(id)` - delete a calculation
- `clearAll()` - delete all history

### Step 8: Tracker Repository (src/lib/db/repositories/tracker.ts)

Standard CRUD plus:

- `getByType(type: string)` - filter by transaction type
- `getByDateRange(start: Date, end: Date)` - date range filter
- `getByCategory(category: string)` - filter by category
- `getRunningTotal()` - sum of all amounts (purchases negative, sales positive)
- `getMonthlyTotals()` - aggregate by month

### Step 9: Settings Repository (src/lib/db/repositories/settings.ts)

Key-value operations:

- `get(key: string)` - get a setting value
- `set(key: string, value: string)` - upsert a setting
- `getAll()` - get all settings as Record<string, string>
- `remove(key: string)` - delete a setting

Used for: master password hash, encryption salt, app preferences, UI state.

### Step 10: Price Alerts Repository (src/lib/db/repositories/price-alerts.ts)

Standard CRUD plus:

- `getActive()` - filter where active = true
- `getByMarketplace(marketplace: string)` - filter by marketplace
- `deactivate(id: number)` - set active = false
- `checkTriggers(productId: string, currentPrice: number)` - find alerts that should fire

### Step 11: Create Index File

`src/lib/db/repositories/index.ts` - re-export all repositories:

```typescript
export * as emailsRepo from "./emails";
export * as vaultRepo from "./vault";
export * as vccsRepo from "./vccs";
export * as ordersRepo from "./orders";
export * as inventoryRepo from "./inventory";
export * as calculatorRepo from "./calculator";
export * as trackerRepo from "./tracker";
export * as settingsRepo from "./settings";
export * as priceAlertsRepo from "./price-alerts";
```

## Files to Create

- `src/lib/db/repositories/emails.ts` - Email CRUD + bulk import + search
- `src/lib/db/repositories/vault.ts` - Encrypted CRUD for vault entries
- `src/lib/db/repositories/vccs.ts` - VCC CRUD + link to accounts
- `src/lib/db/repositories/orders.ts` - Order CRUD + filters
- `src/lib/db/repositories/inventory.ts` - Inventory CRUD + sold tracking + aggregates
- `src/lib/db/repositories/calculator.ts` - Calculator history CRUD
- `src/lib/db/repositories/tracker.ts` - Tracker entry CRUD + aggregates
- `src/lib/db/repositories/settings.ts` - Key-value settings CRUD
- `src/lib/db/repositories/price-alerts.ts` - Price alert CRUD + trigger check
- `src/lib/db/repositories/index.ts` - Barrel export

## Files to Modify

- None

## Contracts

### Provides (for downstream)

All repositories export these base functions:

- `getAll()` - returns array of typed rows
- `getById(id)` - returns single row or undefined
- `create(data)` - insert new row (timestamps auto-set)
- `update(id, data)` - partial update (updatedAt auto-set)
- `remove(id)` - delete by id

Plus table-specific functions as listed in the implementation plan.

Import pattern for consumers:

```typescript
import { emailsRepo, vaultRepo } from "@/lib/db/repositories";
const emails = await emailsRepo.getAll();
```

### Consumes (from upstream)

- `db` from `src/lib/db/client.ts` (Task 1.1)
- `schema.*` from `src/lib/db/schema.ts` (Task 1.1)
- Types from `src/lib/db/types.ts` (Task 1.1)
- `cryptoService` from `src/lib/crypto.ts` (Task 1.3) - used only by vault repo

## Acceptance Criteria

- [ ] All 9 repository files created with CRUD operations
- [ ] Index file re-exports all repositories
- [ ] All functions are async and return properly typed results
- [ ] Vault repo encrypts password and notes on create/update
- [ ] Vault repo decrypts password and notes on read
- [ ] Vault repo throws if CryptoService is locked
- [ ] Emails repo supports bulk insert in batches of 50
- [ ] Settings repo supports upsert (insert or update on conflict)
- [ ] Inventory repo has getTotalValue() and getProfit() aggregates
- [ ] Tracker repo has getRunningTotal() and getMonthlyTotals() aggregates
- [ ] All create operations auto-set createdAt and updatedAt
- [ ] All update operations auto-set updatedAt
- [ ] TypeScript compiles with no errors
- [ ] No raw SQL - all queries use Drizzle query builder

## Testing Protocol

### Unit/Integration Tests

- For each repo: test create, read, update, delete cycle
- Test vault encryption round-trip (create with plaintext, read back decrypted)
- Test bulk email insert with 100+ records
- Test settings upsert (set same key twice)
- Test inventory aggregate functions
- Test tracker date range filter

### Browser Testing (Playwright MCP)

- Not directly testable via Playwright (no UI) - tested indirectly via Phase 2 UI tasks

### Build/Lint/Type Checks

- `npx tsc --noEmit` passes
- All imports resolve correctly
- No any types in public API (function signatures)

## Skills to Read

- `.claude/skills/bottingos-data-model/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/tauri-nextjs-drizzle-implementation.md` (section 2.8 - IPC flow example)

## Git

- Branch: feat/1.4-data-access-layer
- Commit message prefix: Task 1.4:
