import { describe, it, expect } from 'vitest';
import {
  parseWebhook,
  detectBot,
  normalizeFieldName,
  parsePrice,
  isSuccessfulCheckout,
} from '../src/parsers/index';
import {
  CYBERSOLE_SUCCESS,
  VALOR_SUCCESS,
  NSB_SUCCESS,
  GENERIC_SUCCESS,
  CYBERSOLE_DECLINE,
  MINIMAL_PAYLOAD,
} from './fixtures/webhooks';

describe('detectBot', () => {
  it('detects Cybersole from footer', () => {
    expect(detectBot(CYBERSOLE_SUCCESS)).toBe('cybersole');
  });

  it('detects Valor from footer', () => {
    expect(detectBot(VALOR_SUCCESS)).toBe('valor');
  });

  it('detects NSB from username', () => {
    expect(detectBot(NSB_SUCCESS)).toBe('nsb');
  });

  it('returns unknown for unrecognized bot', () => {
    expect(detectBot(GENERIC_SUCCESS)).toBe('unknown');
  });

  it('detects Cybersole from decline payload', () => {
    expect(detectBot(CYBERSOLE_DECLINE)).toBe('cybersole');
  });
});

describe('normalizeFieldName', () => {
  it('maps "Product" to "product"', () => {
    expect(normalizeFieldName('Product')).toBe('product');
  });

  it('maps "Item" to "product"', () => {
    expect(normalizeFieldName('Item')).toBe('product');
  });

  it('maps "Shoe Size" to "size"', () => {
    expect(normalizeFieldName('Shoe Size')).toBe('size');
  });

  it('maps "Sz" to "size"', () => {
    expect(normalizeFieldName('Sz')).toBe('size');
  });

  it('maps "Conf #" to "orderNumber"', () => {
    expect(normalizeFieldName('Conf #')).toBe('orderNumber');
  });

  it('maps "Site" to "store"', () => {
    expect(normalizeFieldName('Site')).toBe('store');
  });

  it('maps "Retailer" to "store"', () => {
    expect(normalizeFieldName('Retailer')).toBe('store');
  });

  it('maps "Style" to "sku"', () => {
    expect(normalizeFieldName('Style')).toBe('sku');
  });

  it('maps "Style Code" to "sku"', () => {
    expect(normalizeFieldName('Style Code')).toBe('sku');
  });

  it('maps "Billing Profile" to "profile"', () => {
    expect(normalizeFieldName('Billing Profile')).toBe('profile');
  });

  it('maps "Proxy Group" to "proxy"', () => {
    expect(normalizeFieldName('Proxy Group')).toBe('proxy');
  });

  it('maps "Task Mode" to "mode"', () => {
    expect(normalizeFieldName('Task Mode')).toBe('mode');
  });

  it('maps "Speed" to "checkoutTime"', () => {
    expect(normalizeFieldName('Speed')).toBe('checkoutTime');
  });

  it('maps "Account" to "email"', () => {
    expect(normalizeFieldName('Account')).toBe('email');
  });

  it('returns null for unknown field', () => {
    expect(normalizeFieldName('Random Thing')).toBeNull();
  });
});

describe('parsePrice', () => {
  it('parses $110.00 to 11000', () => {
    expect(parsePrice('$110.00')).toBe(11000);
  });

  it('parses $1,299.99 to 129999', () => {
    expect(parsePrice('$1,299.99')).toBe(129999);
  });

  it('parses GBP 89.99 to 8999', () => {
    expect(parsePrice('GBP 89.99')).toBe(8999);
  });

  it('parses $230.00 to 23000', () => {
    expect(parsePrice('$230.00')).toBe(23000);
  });

  it('parses $109.99 to 10999', () => {
    expect(parsePrice('$109.99')).toBe(10999);
  });

  it('returns null for empty string', () => {
    expect(parsePrice('')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parsePrice('free')).toBeNull();
  });
});

describe('isSuccessfulCheckout', () => {
  it('detects success from title keyword', () => {
    expect(isSuccessfulCheckout({ title: 'Successful Checkout' })).toBe(true);
  });

  it('detects "copped" as success', () => {
    expect(isSuccessfulCheckout({ title: 'Copped!' })).toBe(true);
  });

  it('detects decline from title keyword', () => {
    expect(isSuccessfulCheckout({ title: 'Card Declined' })).toBe(false);
  });

  it('detects "failed" as failure', () => {
    expect(isSuccessfulCheckout({ title: 'Failed' })).toBe(false);
  });

  it('detects "out of stock" as failure', () => {
    expect(isSuccessfulCheckout({ title: 'Out of Stock' })).toBe(false);
  });

  it('falls back to green color as success', () => {
    expect(isSuccessfulCheckout({ color: 65280 })).toBe(true);
  });

  it('falls back to red color as failure', () => {
    expect(isSuccessfulCheckout({ color: 16711680 })).toBe(false);
  });

  it('defaults to true when ambiguous', () => {
    expect(isSuccessfulCheckout({ title: 'Something happened' })).toBe(true);
  });

  it('defaults to true with no title or color', () => {
    expect(isSuccessfulCheckout({})).toBe(true);
  });
});

describe('parseWebhook', () => {
  const userId = 'test-user-id';

  it('parses Cybersole payload correctly', () => {
    const event = parseWebhook(CYBERSOLE_SUCCESS, userId);
    expect(event.bot_name).toBe('cybersole');
    expect(event.product).toBe('Nike Dunk Low Retro White Black');
    expect(event.sku).toBe('DD1391-100');
    expect(event.size).toBe('10');
    expect(event.price).toBe(11000);
    expect(event.store).toBe('Nike US');
    expect(event.profile).toBe('Profile #3');
    expect(event.proxy).toBe('ISP DC 1');
    expect(event.order_number).toBe('C10298374651');
    expect(event.mode).toBe('Safe');
    expect(event.checkout_time).toBe('2.3s');
    expect(event.success).toBe(true);
    expect(event.quantity).toBe(1);
    expect(event.image_url).toBe('https://static.nike.com/dunk-low.png');
    expect(event.user_id).toBe(userId);
  });

  it('parses Valor payload with different field names', () => {
    const event = parseWebhook(VALOR_SUCCESS, userId);
    expect(event.bot_name).toBe('valor');
    expect(event.product).toBe('adidas Yeezy Boost 350 V2 Onyx');
    expect(event.sku).toBe('HQ4540');
    expect(event.size).toBe('11');
    expect(event.price).toBe(23000);
    expect(event.store).toBe('Adidas US');
    expect(event.profile).toBe('Main Card');
    expect(event.proxy).toBe('Residential US');
    expect(event.order_number).toBeNull();
    expect(event.mode).toBe('Fast');
    expect(event.checkout_time).toBe('1.8s');
    expect(event.success).toBe(true);
    expect(event.quantity).toBe(1);
  });

  it('parses NSB payload with different field names', () => {
    const event = parseWebhook(NSB_SUCCESS, userId);
    expect(event.bot_name).toBe('nsb');
    expect(event.product).toBe('Air Jordan 1 Retro High OG Chicago');
    expect(event.sku).toBe('DZ5485-612');
    expect(event.size).toBe('9.5');
    expect(event.price).toBe(18000);
    expect(event.store).toBe('Footlocker US');
    expect(event.profile).toBe('Amex 1');
    expect(event.proxy).toBe('DC East');
    expect(event.order_number).toBe('FL-7829104');
    expect(event.mode).toBeNull();
    expect(event.checkout_time).toBeNull();
    expect(event.email).toBe('john***@gmail.com');
    expect(event.success).toBe(true);
    expect(event.quantity).toBe(1);
  });

  it('handles generic bot via fuzzy parser', () => {
    const event = parseWebhook(GENERIC_SUCCESS, userId);
    expect(event.bot_name).toBe('unknown');
    expect(event.product).toBe('New Balance 550 White Green');
    expect(event.size).toBe('10.5');
    expect(event.price).toBe(10999);
    expect(event.store).toBe('New Balance US');
    expect(event.sku).toBe('BB550WT1');
    expect(event.profile).toBe('Profile A');
    expect(event.proxy).toBe('ISP Group 2');
    expect(event.order_number).toBe('NB-998877');
    expect(event.success).toBe(true);
  });

  it('detects decline correctly', () => {
    const event = parseWebhook(CYBERSOLE_DECLINE, userId);
    expect(event.bot_name).toBe('cybersole');
    expect(event.product).toBe('Nike Air Max 90');
    expect(event.size).toBe('12');
    expect(event.price).toBe(13000);
    expect(event.store).toBe('Nike US');
    expect(event.success).toBe(false);
    expect(event.order_number).toBeNull();
  });

  it('stores unrecognized fields in extras', () => {
    const payload: typeof GENERIC_SUCCESS = {
      username: 'TestBot',
      embeds: [
        {
          title: 'Checkout',
          fields: [
            { name: 'Product', value: 'Test Item', inline: true },
            { name: 'Custom Field', value: 'custom value', inline: true },
            { name: 'Another Unknown', value: 'another value', inline: true },
          ],
          footer: { text: 'TestBot' },
        },
      ],
    };
    const event = parseWebhook(payload, userId);
    expect(event.extras['Custom Field']).toBe('custom value');
    expect(event.extras['Another Unknown']).toBe('another value');
  });

  it('preserves raw payload', () => {
    const event = parseWebhook(CYBERSOLE_SUCCESS, userId);
    expect(event.raw_payload).toBe(CYBERSOLE_SUCCESS);
  });

  it('sets received_at timestamp', () => {
    const before = new Date().toISOString();
    const event = parseWebhook(CYBERSOLE_SUCCESS, userId);
    const after = new Date().toISOString();
    expect(event.received_at >= before).toBe(true);
    expect(event.received_at <= after).toBe(true);
  });

  it('handles minimal payload gracefully', () => {
    const event = parseWebhook(MINIMAL_PAYLOAD, userId);
    expect(event.product).toBe('Mystery Item');
    expect(event.store).toBe('Unknown Store');
    expect(event.sku).toBeNull();
    expect(event.size).toBeNull();
    expect(event.price).toBeNull();
    expect(event.quantity).toBe(1);
    expect(event.success).toBe(true);
  });
});
