import type { DiscordEmbed } from './types';

export function parsePrice(raw: string): number | null {
  const match = raw.match(/[\d,]+\.?\d{0,2}/);
  if (!match) return null;
  return Math.round(parseFloat(match[0].replace(',', '')) * 100);
}

const FAIL_TERMS = ['decline', 'failed', 'error', 'oos', 'out of stock', 'card declined'];
const SUCCESS_TERMS = ['success', 'checkout', 'copped', 'purchased', 'confirmed'];

export function isSuccessfulCheckout(embed: DiscordEmbed): boolean {
  const title = (embed.title ?? '').toLowerCase();

  if (FAIL_TERMS.some((t) => title.includes(t))) return false;
  if (SUCCESS_TERMS.some((t) => title.includes(t))) return true;

  if (embed.color === 65280 || embed.color === 0x00ff00) return true;
  if (embed.color === 16711680 || embed.color === 0xff0000) return false;

  return true;
}
