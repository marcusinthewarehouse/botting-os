# Task 1.R: Phase 1 Regression

## Objective

Full regression test of the entire data layer built in Phase 1. Verify that SQLite database creation, migration runner, encryption, all repository CRUD operations, and the end-to-end flow from frontend Drizzle queries through Tauri IPC to SQLite all work correctly. This is the quality gate before Phase 2 UI work begins.

## Context

Phase 1 built 4 components: Drizzle schema + sqlite-proxy client (1.1), Tauri Rust plugin registration (1.2), AES-256-GCM encryption module (1.3), and data access repositories (1.4). This regression task validates everything works together. It must pass before any Phase 2 task begins.

## Dependencies

- Task 1.1 - Schema, client, migrations
- Task 1.2 - Tauri plugin-sql backend
- Task 1.3 - Encryption module
- Task 1.4 - All repositories

## Blocked By

- All Phase 1 tasks must be complete

## Research Findings

No additional research needed. This task validates existing work.

## Implementation Plan

### Step 1: Verify Build

```bash
npx tsc --noEmit          # TypeScript compiles
npm run build             # Next.js static export builds
cd src-tauri && cargo check  # Rust compiles
```

### Step 2: Verify Tauri Dev Launch

```bash
npx tauri dev
```

- Tauri window opens
- No console errors on startup
- `window.__TAURI__` is available

### Step 3: Test Migration Runner

Open browser console in Tauri dev window:

```javascript
// Import and run migrations
const { runMigrations } = await import("/src/lib/db/migrations");
await runMigrations();

// Verify tables exist
const Database = (await import("@tauri-apps/plugin-sql")).default;
const db = await Database.load("sqlite:bottingos.db");
const tables = await db.select(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
);
console.log("Tables:", tables);
// Expected: __drizzle_migrations, calculator_history, emails, inventory_items, orders, price_alerts, settings, tracker_entries, vault_entries, vccs
```

### Step 4: Test Migration Idempotency

Run migrations again - should skip all (no errors, no duplicate inserts):

```javascript
await runMigrations(); // Should log nothing new
```

### Step 5: Test Encryption Module

```javascript
const { cryptoService } = await import("/src/lib/crypto");

// Generate salt
const salt = cryptoService.generateSalt();
const saltB64 = cryptoService.saltToBase64(salt);
console.log("Salt:", saltB64);

// Derive key
await cryptoService.deriveKey("test-master-password", salt);
console.assert(cryptoService.isUnlocked(), "Should be unlocked");

// Encrypt/decrypt round-trip
const { data, iv } = await cryptoService.encrypt("hello world");
const decrypted = await cryptoService.decrypt(data, iv);
console.assert(decrypted === "hello world", "Decrypt should match");

// Different IVs each time
const { iv: iv2 } = await cryptoService.encrypt("hello world");
console.assert(iv !== iv2, "IVs should differ");

// Lock and verify
cryptoService.lock();
console.assert(!cryptoService.isUnlocked(), "Should be locked");

// Encrypt when locked should throw
try {
  await cryptoService.encrypt("test");
  console.error("FAIL: Should have thrown");
} catch (e) {
  console.log("PASS: Encrypt when locked throws");
}
```

### Step 6: Test Settings Repository

```javascript
const { settingsRepo } = await import("/src/lib/db/repositories");

await settingsRepo.set("test_key", "test_value");
const val = await settingsRepo.get("test_key");
console.assert(val === "test_value", "Settings get/set");

await settingsRepo.set("test_key", "updated_value");
const val2 = await settingsRepo.get("test_key");
console.assert(val2 === "updated_value", "Settings upsert");

await settingsRepo.remove("test_key");
const val3 = await settingsRepo.get("test_key");
console.assert(val3 === undefined || val3 === null, "Settings remove");
```

### Step 7: Test Emails Repository

```javascript
const { emailsRepo } = await import("/src/lib/db/repositories");

// Create
await emailsRepo.create({
  address: "test@example.com",
  provider: "gmail",
  retailers: ["nike", "footlocker"],
});

// Read
const all = await emailsRepo.getAll();
console.assert(all.length >= 1, "Should have at least 1 email");
const email = all[0];
console.assert(email.address === "test@example.com", "Address matches");

// Bulk create
const bulk = Array.from({ length: 100 }, (_, i) => ({
  address: `bulk${i}@test.com`,
  provider: "icloud",
}));
await emailsRepo.bulkCreate(bulk);
const allAfterBulk = await emailsRepo.getAll();
console.assert(allAfterBulk.length >= 101, "Bulk insert worked");

// Search
const found = await emailsRepo.search("bulk50");
console.assert(found.length >= 1, "Search found result");

// Cleanup
for (const e of allAfterBulk) {
  await emailsRepo.remove(e.id);
}
```

### Step 8: Test Vault Repository (with encryption)

```javascript
const { vaultRepo } = await import("/src/lib/db/repositories");
const { cryptoService } = await import("/src/lib/crypto");

// Must be unlocked
const salt = cryptoService.generateSalt();
await cryptoService.deriveKey("test-password", salt);

// Create entry
await vaultRepo.create({
  site: "nike.com",
  username: "testuser",
  password: "secret123",
  notes: "My Nike account",
});

// Read back - should be decrypted
const entries = await vaultRepo.getAll();
console.assert(entries.length >= 1, "Should have vault entry");
const entry = entries[0];
console.assert(entry.password === "secret123", "Password decrypted correctly"); // Note: the repo should return decrypted plaintext
console.assert(entry.notes === "My Nike account", "Notes decrypted correctly");

// Verify raw DB has encrypted data (not plaintext)
const Database = (await import("@tauri-apps/plugin-sql")).default;
const db = await Database.load("sqlite:bottingos.db");
const raw = await db.select("SELECT * FROM vault_entries LIMIT 1");
console.assert(
  raw[0].password_ciphertext !== "secret123",
  "Raw DB should be encrypted",
);

// Cleanup
await vaultRepo.remove(entry.id);
cryptoService.lock();
```

### Step 9: Test Remaining Repositories

For each of: vccs, orders, inventory, calculator, tracker, price-alerts:

1. Create a test record
2. Read it back
3. Update a field
4. Read and verify update
5. Delete it
6. Verify deletion

### Step 10: Test Inventory Aggregates

```javascript
const { inventoryRepo, ordersRepo } = await import("/src/lib/db/repositories");

// Create test order + inventory items
await inventoryRepo.create({
  name: "Nike Dunk Low",
  category: "sneakers",
  purchasePrice: 110,
  status: "in_stock",
});
await inventoryRepo.create({
  name: "Nike Air Max",
  category: "sneakers",
  purchasePrice: 160,
  status: "sold",
  soldPrice: 250,
});

const totalValue = await inventoryRepo.getTotalValue();
console.assert(totalValue === 110, "Total value of in-stock items");

const profit = await inventoryRepo.getProfit();
console.assert(profit === 90, "Profit from sold items");

// Cleanup
const items = await inventoryRepo.getAll();
for (const item of items) await inventoryRepo.remove(item.id);
```

### Step 11: Test Master Password Dialog

Manually test in the Tauri window:

1. Clear all settings (remove password hash)
2. Reload - first-time password setup should appear
3. Set a password
4. Reload - unlock dialog should appear
5. Enter wrong password - error state
6. Enter correct password - app unlocks

### Step 12: Verify Database File Location

Check that `bottingos.db` exists in the correct app data directory:

- macOS: `~/Library/Application Support/com.bottingos.app/`

## Files to Create

- None (this is a testing task)

## Files to Modify

- Fix any bugs found during regression

## Contracts

### Provides (for downstream)

- Confidence that Phase 1 data layer is solid
- All repositories tested with real SQLite
- Green light for Phase 2 to begin

### Consumes (from upstream)

- Everything from Tasks 1.1, 1.2, 1.3, 1.4

## Acceptance Criteria

- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] Next.js builds successfully (`npm run build`)
- [ ] Rust compiles (`cargo check`)
- [ ] `npx tauri dev` launches without errors
- [ ] Migration runner creates all 9 tables on fresh database
- [ ] Migration runner is idempotent (run twice, no errors)
- [ ] AES-256-GCM encrypt/decrypt round-trip works
- [ ] Wrong key fails decryption
- [ ] Locked CryptoService rejects encrypt/decrypt calls
- [ ] All 9 repositories: create, read, update, delete work
- [ ] Vault repo transparently encrypts on write and decrypts on read
- [ ] Raw vault data in SQLite is encrypted (not plaintext)
- [ ] Bulk email insert handles 100+ records
- [ ] Settings upsert works (set same key twice)
- [ ] Inventory aggregate functions return correct sums
- [ ] Master password dialog blocks app until unlocked
- [ ] Database file created in correct app data directory
- [ ] No console errors during normal operation

## Testing Protocol

### Unit/Integration Tests

All tests in the implementation plan above.

### Browser Testing (Playwright MCP)

- Navigate to app in Tauri dev mode
- Take screenshots of master password dialog (first time and unlock)
- Verify no error toasts or console errors

### Build/Lint/Type Checks

- `npx tsc --noEmit`
- `npm run build`
- `cd src-tauri && cargo check`

## Skills to Read

- None

## Research Files to Read

- None

## Git

- Branch: test/1.R-phase1-regression
- Commit message prefix: Task 1.R:
