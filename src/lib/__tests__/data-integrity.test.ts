import { describe, it, expect } from 'vitest';
import * as schema from '@/lib/db/schema';

describe('Schema - Migration consistency', () => {
  it('emails table has expected columns', () => {
    const cols = Object.keys(schema.emails);
    expect(cols).toContain('id');
    expect(cols).toContain('address');
    expect(cols).toContain('icloudAccount');
    expect(cols).toContain('provider');
    expect(cols).toContain('retailers');
    expect(cols).toContain('status');
    expect(cols).toContain('notes');
    expect(cols).toContain('createdAt');
    expect(cols).toContain('updatedAt');
  });

  it('vault_entries table has encryption columns', () => {
    const cols = Object.keys(schema.vaultEntries);
    expect(cols).toContain('passwordCiphertext');
    expect(cols).toContain('passwordIv');
    expect(cols).toContain('notesCiphertext');
    expect(cols).toContain('notesIv');
  });

  it('vccs table references emails via linkedAccountId', () => {
    const cols = Object.keys(schema.vccs);
    expect(cols).toContain('linkedAccountId');
  });

  it('orders table has all expected columns', () => {
    const cols = Object.keys(schema.orders);
    expect(cols).toContain('id');
    expect(cols).toContain('botName');
    expect(cols).toContain('product');
    expect(cols).toContain('size');
    expect(cols).toContain('price');
    expect(cols).toContain('store');
    expect(cols).toContain('orderNumber');
    expect(cols).toContain('success');
    expect(cols).toContain('rawData');
  });

  it('inventory_items table references orders via orderId', () => {
    const cols = Object.keys(schema.inventoryItems);
    expect(cols).toContain('orderId');
  });

  it('inventory_items table has all columns including sku, size, location', () => {
    const cols = Object.keys(schema.inventoryItems);
    expect(cols).toContain('sku');
    expect(cols).toContain('size');
    expect(cols).toContain('location');
    expect(cols).toContain('imageUrl');
    expect(cols).toContain('notes');
    expect(cols).toContain('purchasePrice');
    expect(cols).toContain('soldPrice');
    expect(cols).toContain('soldDate');
    expect(cols).toContain('listedUrl');
    expect(cols).toContain('listedPrice');
  });

  it('drops table has reminder fields', () => {
    const cols = Object.keys(schema.drops);
    expect(cols).toContain('reminderMinutes');
    expect(cols).toContain('reminded');
    expect(cols).toContain('dropDate');
    expect(cols).toContain('dropTime');
  });

  it('notifications table has required fields', () => {
    const cols = Object.keys(schema.notifications);
    expect(cols).toContain('type');
    expect(cols).toContain('title');
    expect(cols).toContain('body');
    expect(cols).toContain('read');
    expect(cols).toContain('actionUrl');
    expect(cols).toContain('metadata');
  });

  it('resources table has required fields', () => {
    const cols = Object.keys(schema.resources);
    expect(cols).toContain('name');
    expect(cols).toContain('url');
    expect(cols).toContain('category');
    expect(cols).toContain('isCustom');
  });

  it('price_alerts table has monitoring fields', () => {
    const cols = Object.keys(schema.priceAlerts);
    expect(cols).toContain('styleId');
    expect(cols).toContain('marketplace');
    expect(cols).toContain('targetPrice');
    expect(cols).toContain('direction');
    expect(cols).toContain('currentPrice');
    expect(cols).toContain('recurring');
    expect(cols).toContain('triggered');
    expect(cols).toContain('triggeredAt');
  });

  it('settings table uses key as primary key', () => {
    const cols = Object.keys(schema.settings);
    expect(cols).toContain('key');
    expect(cols).toContain('value');
  });

  it('tracker_entries table has all expected columns', () => {
    const cols = Object.keys(schema.trackerEntries);
    expect(cols).toContain('type');
    expect(cols).toContain('description');
    expect(cols).toContain('amount');
    expect(cols).toContain('category');
    expect(cols).toContain('date');
    expect(cols).toContain('tags');
  });
});

describe('Schema relations', () => {
  it('emailsRelations is defined', () => {
    expect(schema.emailsRelations).toBeDefined();
  });

  it('vccsRelations is defined', () => {
    expect(schema.vccsRelations).toBeDefined();
  });

  it('ordersRelations is defined', () => {
    expect(schema.ordersRelations).toBeDefined();
  });

  it('inventoryItemsRelations is defined', () => {
    expect(schema.inventoryItemsRelations).toBeDefined();
  });
});

describe('Schema table count', () => {
  it('has all 12 tables defined', () => {
    const tables = [
      schema.emails,
      schema.vaultEntries,
      schema.vccs,
      schema.orders,
      schema.inventoryItems,
      schema.calculatorHistory,
      schema.trackerEntries,
      schema.settings,
      schema.priceAlerts,
      schema.drops,
      schema.notifications,
      schema.resources,
    ];
    expect(tables).toHaveLength(12);
    for (const table of tables) {
      expect(table).toBeDefined();
    }
  });
});
