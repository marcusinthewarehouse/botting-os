import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const emails = sqliteTable("emails", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  address: text("address").notNull(),
  icloudAccount: text("icloud_account"),
  provider: text("provider"),
  retailers: text("retailers", { mode: "json" }).$type<string[]>().default([]),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const vaultEntries = sqliteTable("vault_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  site: text("site").notNull(),
  username: text("username").notNull(),
  passwordCiphertext: blob("password_ciphertext").notNull(),
  passwordIv: text("password_iv").notNull(),
  notesCiphertext: blob("notes_ciphertext"),
  notesIv: text("notes_iv"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const vccs = sqliteTable("vccs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider"),
  lastFour: text("last_four").notNull(),
  label: text("label"),
  linkedAccountId: integer("linked_account_id").references(() => emails.id),
  status: text("status").default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  botName: text("bot_name"),
  product: text("product").notNull(),
  size: text("size"),
  price: real("price").notNull(),
  store: text("store"),
  profile: text("profile"),
  orderNumber: text("order_number"),
  success: integer("success", { mode: "boolean" }),
  rawData: text("raw_data"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").references(() => orders.id),
  name: text("name").notNull(),
  sku: text("sku"),
  category: text("category"),
  size: text("size"),
  purchasePrice: real("purchase_price").notNull(),
  status: text("status").default("in_stock"),
  location: text("location"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  listedUrl: text("listed_url"),
  listedPrice: real("listed_price"),
  soldPrice: real("sold_price"),
  soldDate: integer("sold_date", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const calculatorHistory = sqliteTable("calculator_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name"),
  sku: text("sku"),
  purchasePrice: real("purchase_price").notNull(),
  resultsJson: text("results_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const trackerEntries = sqliteTable("tracker_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category: text("category"),
  date: integer("date", { mode: "timestamp" }).notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const priceAlerts = sqliteTable("price_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name").notNull(),
  styleId: text("style_id").notNull(),
  marketplace: text("marketplace").notNull(),
  size: text("size"),
  targetPrice: real("target_price").notNull(),
  direction: text("direction").notNull(),
  currentPrice: real("current_price"),
  recurring: integer("recurring", { mode: "boolean" }).default(false),
  triggered: integer("triggered", { mode: "boolean" }).default(false),
  triggeredAt: integer("triggered_at", { mode: "timestamp" }),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const drops = sqliteTable("drops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name").notNull(),
  brand: text("brand"),
  retailer: text("retailer"),
  category: text("category"),
  dropDate: integer("drop_date", { mode: "timestamp" }).notNull(),
  dropTime: text("drop_time"),
  url: text("url"),
  notes: text("notes"),
  reminderMinutes: integer("reminder_minutes"),
  reminded: integer("reminded", { mode: "boolean" }).default(false),
  source: text("source").default("manual"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: integer("read", { mode: "boolean" }).default(false),
  actionUrl: text("action_url"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const resources = sqliteTable("resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  isCustom: integer("is_custom", { mode: "boolean" }).default(false),
  icon: text("icon"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const emailsRelations = relations(emails, ({ many }) => ({
  vccs: many(vccs),
}));

export const vccsRelations = relations(vccs, ({ one }) => ({
  linkedAccount: one(emails, {
    fields: [vccs.linkedAccountId],
    references: [emails.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [orders.id],
    references: [inventoryItems.orderId],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  order: one(orders, {
    fields: [inventoryItems.orderId],
    references: [orders.id],
  }),
}));
