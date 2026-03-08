import { describe, it, expect } from 'vitest';
import {
  parseWebhook,
  detectBot,
  normalizeFieldName,
  normalizeFields,
  parsePrice,
  isSuccessfulCheckout,
} from '../src/parsers/index';
import type { DiscordWebhookPayload, DiscordEmbed } from '../src/parsers/types';

describe('parsePrice edge cases', () => {
  it('handles price with multiple commas - only first comma removed', () => {
    // BUG: parsePrice only replaces first comma via .replace(',', '')
    // '$1,000,000.00' -> match '1,000,000.00' -> replace first comma -> '1000,000.00' -> parseFloat -> 1000
    // Documenting actual behavior; a fix would use .replaceAll(',', '')
    expect(parsePrice('$1,000,000.00')).toBe(100000);
  });

  it('handles price with no decimal', () => {
    expect(parsePrice('$100')).toBe(10000);
  });

  it('handles price with one decimal place', () => {
    expect(parsePrice('$99.9')).toBe(9990);
  });

  it('handles price with currency symbol after number', () => {
    expect(parsePrice('100.00 USD')).toBe(10000);
  });

  it('handles price with spaces around it', () => {
    expect(parsePrice('  $50.00  ')).toBe(5000);
  });

  it('returns null for just a dollar sign', () => {
    expect(parsePrice('$')).toBeNull();
  });

  it('returns null for undefined-like strings', () => {
    expect(parsePrice('undefined')).toBeNull();
    expect(parsePrice('null')).toBeNull();
    expect(parsePrice('N/A')).toBeNull();
    expect(parsePrice('TBD')).toBeNull();
  });

  it('handles very small price', () => {
    expect(parsePrice('$0.01')).toBe(1);
  });

  it('handles very large price', () => {
    expect(parsePrice('$99,999.99')).toBe(9999999);
  });

  it('handles price embedded in text', () => {
    expect(parsePrice('Price: $42.50 (retail)')).toBe(4250);
  });
});

describe('isSuccessfulCheckout edge cases', () => {
  it('handles undefined title', () => {
    expect(isSuccessfulCheckout({ title: undefined })).toBe(true);
  });

  it('handles mixed case keywords', () => {
    expect(isSuccessfulCheckout({ title: 'SUCCESSFUL CHECKOUT' })).toBe(true);
    expect(isSuccessfulCheckout({ title: 'CARD DECLINED' })).toBe(false);
  });

  it('prioritizes fail terms over success terms', () => {
    // "checkout" is success, but "declined" is fail - fail checked first
    expect(isSuccessfulCheckout({ title: 'Checkout Declined' })).toBe(false);
  });

  it('handles empty string title', () => {
    expect(isSuccessfulCheckout({ title: '' })).toBe(true);
  });

  it('handles title with only whitespace', () => {
    expect(isSuccessfulCheckout({ title: '   ' })).toBe(true);
  });

  it('handles color value 0 (black)', () => {
    expect(isSuccessfulCheckout({ color: 0 })).toBe(true);
  });

  it('handles embed with no properties', () => {
    expect(isSuccessfulCheckout({})).toBe(true);
  });
});

describe('detectBot edge cases', () => {
  it('handles empty payload', () => {
    expect(detectBot({})).toBe('unknown');
  });

  it('handles payload with no embeds', () => {
    expect(detectBot({ username: 'SomeBot' })).toBe('unknown');
  });

  it('handles payload with empty embeds array', () => {
    expect(detectBot({ username: 'SomeBot', embeds: [] })).toBe('unknown');
  });

  it('handles embed with no footer', () => {
    expect(detectBot({ username: 'RandomUser', embeds: [{ title: 'Test' }] })).toBe('unknown');
  });

  it('handles embed with empty footer text', () => {
    expect(detectBot({ username: 'RandomUser', embeds: [{ footer: { text: '' } }] })).toBe('unknown');
  });

  it('detects bot from username when footer has no match', () => {
    expect(detectBot({ username: 'Cybersole', embeds: [{ footer: { text: 'unrelated' } }] })).toBe('cybersole');
  });

  it('detects bot case-insensitively', () => {
    expect(detectBot({ username: 'CYBERSOLE', embeds: [] })).toBe('cybersole');
    expect(detectBot({ username: 'cybersole', embeds: [] })).toBe('cybersole');
  });

  it('handles undefined username', () => {
    expect(detectBot({ embeds: [{ footer: { text: 'Cybersole | v1.0' } }] })).toBe('cybersole');
  });
});

describe('normalizeFieldName edge cases', () => {
  it('handles empty string - matches via fuzzy includes', () => {
    // BUG: empty string '' is included in every string via .includes('')
    // So the fuzzy fallback matches the first alias entry ('product')
    // Documenting actual behavior; a fix would check for empty input early
    expect(normalizeFieldName('')).toBe('product');
  });

  it('handles whitespace-only string - matches via fuzzy includes', () => {
    // Same bug: after trim, '' matches everything via .includes('')
    expect(normalizeFieldName('   ')).toBe('product');
  });

  it('handles field name with extra whitespace', () => {
    expect(normalizeFieldName('  Product  ')).toBe('product');
  });

  it('handles case insensitivity', () => {
    expect(normalizeFieldName('PRODUCT')).toBe('product');
    expect(normalizeFieldName('pRoDuCt')).toBe('product');
  });

  it('handles partial match via fuzzy fallback', () => {
    // "product name" contains "product" so it should match
    expect(normalizeFieldName('Product Name')).toBe('product');
  });
});

describe('normalizeFields edge cases', () => {
  it('handles empty fields array', () => {
    const result = normalizeFields([]);
    expect(result.normalized).toEqual({});
    expect(result.extras).toEqual({});
  });

  it('puts all unrecognized fields in extras', () => {
    const result = normalizeFields([
      { name: 'Weird Field', value: 'val1', inline: true },
      { name: 'Another One', value: 'val2', inline: true },
    ]);
    expect(Object.keys(result.normalized)).toHaveLength(0);
    expect(result.extras['Weird Field']).toBe('val1');
    expect(result.extras['Another One']).toBe('val2');
  });

  it('handles fields with empty values', () => {
    const result = normalizeFields([
      { name: 'Product', value: '', inline: true },
    ]);
    expect(result.normalized['product']).toBe('');
  });

  it('handles fields with special characters in values', () => {
    const result = normalizeFields([
      { name: 'Product', value: "Nike <script>alert('xss')</script>", inline: true },
      { name: 'Size', value: "10'; DROP TABLE orders;--", inline: true },
    ]);
    expect(result.normalized['product']).toBe("Nike <script>alert('xss')</script>");
    expect(result.normalized['size']).toBe("10'; DROP TABLE orders;--");
  });
});

describe('parseWebhook edge cases', () => {
  const userId = 'edge-test-user';

  it('handles payload with no embeds', () => {
    const payload: DiscordWebhookPayload = { username: 'TestBot' };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe('Unknown Product');
    expect(event.store).toBe('Unknown Store');
    expect(event.user_id).toBe(userId);
    expect(event.bot_name).toBe('unknown');
    expect(event.quantity).toBe(1);
    expect(event.success).toBe(true);
  });

  it('handles payload with empty embeds array', () => {
    const payload: DiscordWebhookPayload = { username: 'TestBot', embeds: [] };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe('Unknown Product');
    expect(event.store).toBe('Unknown Store');
  });

  it('handles payload with embed that has no fields', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{ title: 'Checkout' }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe('Unknown Product');
    expect(event.store).toBe('Unknown Store');
    expect(event.success).toBe(true);
  });

  it('handles embed with empty fields array', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{ title: 'Checkout', fields: [] }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe('Unknown Product');
  });

  it('handles completely empty payload', () => {
    const payload: DiscordWebhookPayload = {};
    const event = parseWebhook(payload, userId);
    expect(event.user_id).toBe(userId);
    expect(event.product).toBe('Unknown Product');
    expect(event.store).toBe('Unknown Store');
    expect(event.bot_name).toBe('unknown');
    expect(event.extras).toEqual({});
    expect(event.raw_payload).toBe(payload);
  });

  it('handles XSS content in fields - stored as plain text', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{
        title: '<script>alert("xss")</script>',
        fields: [
          { name: 'Product', value: '<img onerror="alert(1)" src="x">', inline: true },
          { name: 'Store', value: '<a href="javascript:void(0)">Click</a>', inline: true },
        ],
      }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe('<img onerror="alert(1)" src="x">');
    expect(event.store).toBe('<a href="javascript:void(0)">Click</a>');
    // XSS content is stored as-is (rendered as text by React, not executed)
  });

  it('handles SQL injection strings in fields - stored as plain text', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{
        title: 'Checkout',
        fields: [
          { name: 'Product', value: "'; DROP TABLE orders; --", inline: true },
          { name: 'Store', value: "1 OR 1=1", inline: true },
          { name: 'Order #', value: "'; DELETE FROM users; --", inline: true },
        ],
      }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe("'; DROP TABLE orders; --");
    expect(event.store).toBe("1 OR 1=1");
    expect(event.order_number).toBe("'; DELETE FROM users; --");
  });

  it('handles unicode and emoji in fields', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{
        title: 'Checkout',
        fields: [
          { name: 'Product', value: 'Nike Dunk Low "Panda" Edition', inline: true },
          { name: 'Store', value: 'Store (Special Edition)', inline: true },
        ],
      }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe('Nike Dunk Low "Panda" Edition');
    expect(event.store).toBe('Store (Special Edition)');
  });

  it('handles very long field values', () => {
    const longProduct = 'A'.repeat(5000);
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{
        title: 'Checkout',
        fields: [
          { name: 'Product', value: longProduct, inline: true },
        ],
      }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe(longProduct);
    expect(event.product.length).toBe(5000);
  });

  it('handles duplicate field names - last wins', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{
        title: 'Checkout',
        fields: [
          { name: 'Product', value: 'First Product', inline: true },
          { name: 'Product', value: 'Second Product', inline: true },
        ],
      }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe('Second Product');
  });

  it('handles embed with only a title and color', () => {
    const payload: DiscordWebhookPayload = {
      username: 'Cybersole',
      embeds: [{
        title: 'Card Declined',
        color: 16711680,
      }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.bot_name).toBe('cybersole');
    expect(event.success).toBe(false);
    expect(event.product).toBe('Unknown Product');
  });

  it('preserves raw payload reference', () => {
    const payload: DiscordWebhookPayload = {
      username: 'Bot',
      embeds: [{ title: 'Test' }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.raw_payload).toBe(payload);
  });

  it('sets received_at to valid ISO string', () => {
    const event = parseWebhook({}, userId);
    expect(() => new Date(event.received_at)).not.toThrow();
    expect(new Date(event.received_at).toISOString()).toBe(event.received_at);
  });

  it('handles payload with multiple embeds - only first is parsed', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [
        {
          title: 'Checkout 1',
          fields: [{ name: 'Product', value: 'First Item', inline: true }],
        },
        {
          title: 'Checkout 2',
          fields: [{ name: 'Product', value: 'Second Item', inline: true }],
        },
      ],
    };
    const event = parseWebhook(payload, userId);
    expect(event.product).toBe('First Item');
  });

  it('handles quantity parsing with non-numeric string', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{
        title: 'Checkout',
        fields: [
          { name: 'Product', value: 'Test', inline: true },
          { name: 'Quantity', value: 'abc', inline: true },
        ],
      }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.quantity).toBe(1); // falls back to 1
  });

  it('handles quantity with valid number', () => {
    const payload: DiscordWebhookPayload = {
      username: 'TestBot',
      embeds: [{
        title: 'Checkout',
        fields: [
          { name: 'Product', value: 'Test', inline: true },
          { name: 'Qty', value: '3', inline: true },
        ],
      }],
    };
    const event = parseWebhook(payload, userId);
    expect(event.quantity).toBe(3);
  });
});
