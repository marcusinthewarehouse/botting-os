import type { EmbedField, ParsedFields } from './types';

const FIELD_ALIASES: Record<string, string[]> = {
  product: ['product', 'item', 'product name', 'item name', 'name', 'shoe'],
  size: ['size', 'shoe size', 'sz', 'sizing'],
  price: ['price', 'cost', 'total', 'amount', 'retail'],
  store: ['store', 'site', 'retailer', 'website', 'shop'],
  sku: ['sku', 'pid', 'product id', 'style', 'style code', 'style-color'],
  profile: ['profile', 'billing', 'billing profile', 'payment'],
  proxy: ['proxy', 'proxy group', 'proxies', 'proxy list'],
  orderNumber: ['order #', 'order number', 'order', 'confirmation', 'conf #', 'order id'],
  mode: ['mode', 'task mode', 'method'],
  checkoutTime: ['checkout time', 'time', 'speed', 'checkout speed', 'duration'],
  email: ['email', 'account', 'account email'],
  quantity: ['quantity', 'qty'],
};

export function normalizeFieldName(rawName: string): string | null {
  const lower = rawName.toLowerCase().trim();

  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(lower)) return canonical;
  }

  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => lower.includes(a) || a.includes(lower))) return canonical;
  }

  return null;
}

export function normalizeFields(fields: EmbedField[]): ParsedFields {
  const normalized: Record<string, string> = {};
  const extras: Record<string, string> = {};

  for (const field of fields) {
    const canonical = normalizeFieldName(field.name);
    if (canonical) {
      normalized[canonical] = field.value;
    } else {
      extras[field.name] = field.value;
    }
  }

  return { normalized, extras };
}
