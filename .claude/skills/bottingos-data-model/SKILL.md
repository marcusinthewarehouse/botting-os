# BottingOS Data Model

## Drizzle ORM + SQLite Setup

BottingOS uses Drizzle ORM with `sqlite-proxy` driver. SQL is generated in the Next.js frontend, sent over Tauri IPC to `tauri-plugin-sql` (Rust/sqlx), executed against a local SQLite file, and results mapped back to typed objects.

### Connection (src/lib/db/index.ts)

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

export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    const sqlite = await getDb();
    if (
      sql.trimStart().toLowerCase().startsWith("select") ||
      sql.trimStart().toLowerCase().startsWith("pragma")
    ) {
      const rows = await sqlite.select(sql, params).catch(() => []);
      const mapped = rows.map((row: any) => Object.values(row));
      return { rows: method === "all" ? mapped : mapped[0] };
    }
    await sqlite.execute(sql, params).catch(console.error);
    return { rows: [] };
  },
  { schema, logger: false },
);
```

Lazy-import Tauri APIs to avoid SSR crashes:

```typescript
async function callBackend() {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke("my_command", { arg: "value" });
}
```

---

## Core Tables (src/lib/db/schema.ts)

All tables use `sqliteTable` from `drizzle-orm/sqlite-core`. Timestamps are stored as integers (unix ms).

```typescript
import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
```

### emails

```typescript
export const emails = sqliteTable("emails", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  address: text("address").notNull(),
  password: blob("password").notNull(), // AES-256-GCM encrypted
  iv: text("iv").notNull(),
  icloudAccount: text("icloud_account"), // parent iCloud if using aliases
  provider: text("provider"), // gmail, outlook, yahoo, icloud
  retailers: text("retailers", { mode: "json" }).$type<string[]>().default([]),
  status: text("status").default("active"), // active, banned, suspended
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

### accounts

```typescript
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  emailId: integer("email_id").references(() => emails.id),
  retailer: text("retailer").notNull(), // nike, shopify, footlocker
  username: text("username").notNull(),
  passwordEncrypted: blob("password_encrypted").notNull(),
  iv: text("iv").notNull(),
  proxy: text("proxy"),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

### vccs

```typescript
export const vccs = sqliteTable("vccs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider"), // privacy, capital one
  lastFour: text("last_four").notNull(),
  label: text("label"),
  cardDataEncrypted: blob("card_data_encrypted").notNull(), // encrypted JSON blob
  iv: text("iv").notNull(),
  linkedAccounts: text("linked_accounts", { mode: "json" })
    .$type<number[]>()
    .default([]),
  status: text("status").default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### orders

```typescript
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemName: text("item_name").notNull(),
  sku: text("sku"),
  size: text("size"),
  price: real("price").notNull(),
  store: text("store").notNull(), // nike, shopify, footlocker
  bot: text("bot"), // cybersole, valor, nsb
  orderNumber: text("order_number"),
  status: text("status").default("purchased"), // purchased, shipped, delivered, returned
  proxy: text("proxy"),
  category: text("category"), // sneakers, pokemon, funko
  notes: text("notes"),
  orderDate: integer("order_date", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

### inventory

```typescript
export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").references(() => orders.id),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(), // sneakers, pokemon, funko
  purchasePrice: real("purchase_price").notNull(),
  currentValue: real("current_value"),
  status: text("status").default("in_stock"), // in_stock, listed, sold, returned
  listedMarketplace: text("listed_marketplace"), // stockx, goat, ebay
  condition: text("condition").default("new"),
  location: text("location"), // closet, warehouse, shipped
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

### sales

```typescript
export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inventoryId: integer("inventory_id")
    .references(() => inventory.id)
    .notNull(),
  salePrice: real("sale_price").notNull(),
  marketplace: text("marketplace").notNull(), // stockx, goat, ebay
  fees: real("fees").default(0),
  profit: real("profit").notNull(), // computed: salePrice - fees - purchasePrice
  soldAt: integer("sold_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### settings

```typescript
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  valueEncrypted: text("value_encrypted"), // encrypted for sensitive values
  valuePlain: text("value_plain"), // plaintext for non-sensitive values
  iv: text("iv"), // null when using valuePlain
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

### discord_channels

```typescript
export const discordChannels = sqliteTable("discord_channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  guildName: text("guild_name").notNull(),
  channelId: text("channel_id").notNull().unique(),
  channelName: text("channel_name").notNull(),
  monitored: integer("monitored", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### discord_messages

```typescript
export const discordMessages = sqliteTable("discord_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channelId: text("channel_id")
    .references(() => discordChannels.channelId)
    .notNull(),
  author: text("author").notNull(),
  content: text("content"),
  embedsJson: text("embeds_json", { mode: "json" }),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### drop_calendar

```typescript
export const dropCalendar = sqliteTable("drop_calendar", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name").notNull(),
  brand: text("brand"),
  dropDate: integer("drop_date", { mode: "timestamp" }).notNull(),
  source: text("source"), // manual, discord, scrape
  url: text("url"),
  category: text("category"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

---

## Relationships

```typescript
export const emailsRelations = relations(emails, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  email: one(emails, { fields: [accounts.emailId], references: [emails.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  inventoryItem: one(inventory),
}));

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  order: one(orders, { fields: [inventory.orderId], references: [orders.id] }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  inventoryItem: one(inventory, {
    fields: [sales.inventoryId],
    references: [inventory.id],
  }),
}));

export const discordChannelsRelations = relations(
  discordChannels,
  ({ many }) => ({
    messages: many(discordMessages),
  }),
);

export const discordMessagesRelations = relations(
  discordMessages,
  ({ one }) => ({
    channel: one(discordChannels, {
      fields: [discordMessages.channelId],
      references: [discordChannels.channelId],
    }),
  }),
);
```

**Key relationships:**

- `emails` 1:N `accounts` - one email can have many retailer accounts
- `orders` 1:1 `inventory` - an order becomes an inventory item
- `inventory` 1:N `sales` - an inventory item can have sale records
- `discordChannels` 1:N `discordMessages` - messages belong to channels
- `vccs.linkedAccounts` is a JSON array of account IDs (lightweight, no join table needed)
- `emails.retailers` is a JSON array of retailer names (denormalized for quick filtering)

---

## Encryption Pattern

**What is encrypted:**

- `emails.password` - email passwords
- `accounts.passwordEncrypted` - retailer account passwords
- `vccs.cardDataEncrypted` - full card details (number, exp, CVV, billing)
- `settings.valueEncrypted` - API keys, tokens, sensitive config

**What is NOT encrypted:**

- Usernames, email addresses, item names, prices, SKUs, Discord content
- Non-sensitive settings use `settings.valuePlain`

**Algorithm:** AES-256-GCM

**Key derivation:**

1. User enters master password on app launch
2. Derive encryption key: `PBKDF2(password, salt, 600000 iterations)` -> 256-bit key
3. Salt stored in `users` table (one row, created on first launch)
4. Key held in memory only - never persisted to disk

**Per-field encryption:**

- Each encrypted field has a companion `iv` column (unique per row)
- IV is 12 bytes, randomly generated on each write
- GCM auth tag is appended to ciphertext in the blob

```typescript
// src/lib/crypto.ts pattern
async function encrypt(
  plaintext: string,
  key: CryptoKey,
): Promise<{ data: Uint8Array; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  return {
    data: new Uint8Array(encrypted),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decrypt(
  data: Uint8Array,
  ivB64: string,
  key: CryptoKey,
): Promise<string> {
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return new TextDecoder().decode(decrypted);
}
```

The master password hash is stored in the `users` table to verify on login (bcrypt or PBKDF2 with separate salt). The encryption key is derived separately.

---

## Migration Strategy

Drizzle's built-in `migrate()` uses Node's `fs` module which is unavailable in a WebView. Use a custom migration runner.

### Workflow

1. Edit `schema.ts`
2. Run `npm run db:generate` (drizzle-kit generates SQL files in `src/lib/db/migrations/`)
3. Copy generated SQL into the migrations array in `migrate.ts`
4. On app startup, `runMigrations()` runs before any DB queries
5. Already-applied migrations are skipped (tracked in `__drizzle_migrations` table)

### Migration runner (src/lib/db/migrate.ts)

```typescript
import Database from "@tauri-apps/plugin-sql";

const migrations: { name: string; sql: string }[] = [
  {
    name: "0000_init",
    sql: `
      CREATE TABLE IF NOT EXISTS emails (...);
      CREATE TABLE IF NOT EXISTS accounts (...);
      -- all initial tables
    `,
  },
  // new migrations appended here with each schema change
];

export async function runMigrations() {
  const sqlite = await Database.load("sqlite:bottingos.db");

  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `);

  const applied = await sqlite
    .select<
      { name: string }[]
    >("SELECT name FROM __drizzle_migrations ORDER BY id")
    .catch(() => []);
  const appliedNames = new Set(applied.map((r) => r.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;
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

### App startup order

1. `runMigrations()` - ensure schema is up to date
2. Master password prompt - derive encryption key
3. Initialize `db` instance - ready for queries

### Desktop update considerations

- Migrations are forward-only. No rollbacks in production.
- Each app version bundles all migrations up to that point.
- SQLite WAL mode is enabled by default via `tauri-plugin-sql` for concurrent reads during writes.
- Back up the DB file before running migrations (copy `bottingos.db` to `bottingos.db.bak`).

### drizzle.config.ts

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "sqlite",
} satisfies Config;
```
