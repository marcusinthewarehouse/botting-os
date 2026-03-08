import type { CheckoutEvent, DiscordWebhookPayload, DiscordEmbed, EmbedField } from './types';

const BOT_PATTERNS: Record<string, string[]> = {
  cybersole: ['cybersole', 'cyber'],
  valor: ['valor', 'valoraio'],
  nsb: ['nsb', 'nike shoe bot', 'nikeshoebot'],
  wrath: ['wrath', 'wrathio'],
  kodai: ['kodai', 'kodaiaio'],
  balkobot: ['balko', 'balkobot'],
  prism: ['prism', 'prismaio'],
  aiobot: ['aio bot', 'aiobot'],
};

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

function detectBot(payload: DiscordWebhookPayload): string {
  const username = (payload.username ?? '').toLowerCase();
  const footerText = (payload.embeds?.[0]?.footer?.text ?? '').toLowerCase();

  for (const [bot, patterns] of Object.entries(BOT_PATTERNS)) {
    if (patterns.some((p) => footerText.includes(p) || username.includes(p))) {
      return bot;
    }
  }
  return 'unknown';
}

function normalizeFieldName(rawName: string): string | null {
  const lower = rawName.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(lower)) return canonical;
  }
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => lower.includes(a) || a.includes(lower))) return canonical;
  }
  return null;
}

function parsePrice(raw: string): number | null {
  const match = raw.match(/[\d,]+\.?\d{0,2}/);
  if (!match) return null;
  return Math.round(parseFloat(match[0].replace(',', '')) * 100);
}

function isSuccessful(embed: DiscordEmbed): boolean {
  const title = (embed.title ?? '').toLowerCase();
  const failTerms = ['decline', 'failed', 'error', 'oos', 'out of stock', 'card declined'];
  const successTerms = ['success', 'checkout', 'copped', 'purchased', 'confirmed'];

  if (failTerms.some((t) => title.includes(t))) return false;
  if (successTerms.some((t) => title.includes(t))) return true;

  if (embed.color === 65280 || embed.color === 0x00ff00) return true;
  if (embed.color === 16711680 || embed.color === 0xff0000) return false;

  return true;
}

export function parseWebhook(payload: DiscordWebhookPayload, userId: string): CheckoutEvent {
  const embed = payload.embeds?.[0];
  const fields = embed?.fields ?? [];

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

  const priceRaw = normalized['price'];
  const quantityRaw = normalized['quantity'];

  return {
    user_id: userId,
    bot_name: detectBot(payload),
    product: normalized['product'] ?? 'Unknown Product',
    sku: normalized['sku'] ?? null,
    size: normalized['size'] ?? null,
    price: priceRaw ? parsePrice(priceRaw) : null,
    store: normalized['store'] ?? 'Unknown Store',
    profile: normalized['profile'] ?? null,
    proxy: normalized['proxy'] ?? null,
    order_number: normalized['orderNumber'] ?? null,
    mode: normalized['mode'] ?? null,
    checkout_time: normalized['checkoutTime'] ?? null,
    image_url: embed?.thumbnail?.url ?? null,
    email: normalized['email'] ?? null,
    quantity: quantityRaw ? parseInt(quantityRaw, 10) || 1 : 1,
    success: embed ? isSuccessful(embed) : true,
    extras,
    raw_payload: payload,
    received_at: new Date().toISOString(),
  };
}
