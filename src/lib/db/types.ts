import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';

export type Email = InferSelectModel<typeof schema.emails>;
export type NewEmail = InferInsertModel<typeof schema.emails>;

export type VaultEntry = InferSelectModel<typeof schema.vaultEntries>;
export type NewVaultEntry = InferInsertModel<typeof schema.vaultEntries>;

export type Vcc = InferSelectModel<typeof schema.vccs>;
export type NewVcc = InferInsertModel<typeof schema.vccs>;

export type Order = InferSelectModel<typeof schema.orders>;
export type NewOrder = InferInsertModel<typeof schema.orders>;

export type InventoryItem = InferSelectModel<typeof schema.inventoryItems>;
export type NewInventoryItem = InferInsertModel<typeof schema.inventoryItems>;

export type CalculatorHistory = InferSelectModel<typeof schema.calculatorHistory>;
export type NewCalculatorHistory = InferInsertModel<typeof schema.calculatorHistory>;

export type TrackerEntry = InferSelectModel<typeof schema.trackerEntries>;
export type NewTrackerEntry = InferInsertModel<typeof schema.trackerEntries>;

export type Settings = InferSelectModel<typeof schema.settings>;
export type NewSettings = InferInsertModel<typeof schema.settings>;

export type PriceAlert = InferSelectModel<typeof schema.priceAlerts>;
export type NewPriceAlert = InferInsertModel<typeof schema.priceAlerts>;
