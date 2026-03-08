# Webhook Testing Skill

Reference for testing the BottingOS webhook proxy - mock payloads, parsing logic, curl commands, and Supabase Realtime verification.

---

## 1. Mock Webhook Payloads

All sneaker bots POST Discord-format JSON to webhook URLs. The endpoint is `hooks.bottingos.app/v1/webhooks/{user_token}`.

### 1.1 Cybersole Checkout

```json
{
  "username": "Cybersole",
  "avatar_url": "https://cybersole.io/logo.png",
  "embeds": [
    {
      "title": "Successful Checkout",
      "color": 65280,
      "thumbnail": {
        "url": "https://static.nike.com/a/images/t_PDP_864_v1/f_auto,b_rgb:f5f5f5/dd2a7b52-a9d3-4a87-88c8-bf7306e79c67/dunk-low-retro-shoes.png"
      },
      "fields": [
        {
          "name": "Product",
          "value": "Nike Dunk Low Retro White Black",
          "inline": true
        },
        { "name": "Size", "value": "10", "inline": true },
        { "name": "Price", "value": "$110.00", "inline": true },
        { "name": "Store", "value": "Nike US", "inline": true },
        { "name": "SKU", "value": "DD1391-100", "inline": true },
        { "name": "Profile", "value": "Profile #3", "inline": true },
        { "name": "Proxy", "value": "ISP DC 1", "inline": true },
        { "name": "Mode", "value": "Safe", "inline": true },
        { "name": "Order #", "value": "C10298374651", "inline": false },
        { "name": "Checkout Time", "value": "2.3s", "inline": true }
      ],
      "footer": {
        "text": "Cybersole | 2026-03-07 10:15:32",
        "icon_url": "https://cybersole.io/footer-icon.png"
      },
      "timestamp": "2026-03-07T10:15:32.000Z"
    }
  ]
}
```

### 1.2 Valor (ValorAIO) Checkout

Valor uses slightly different field names - "Item" instead of "Product", "Site" instead of "Store".

```json
{
  "username": "Valor",
  "avatar_url": "https://valoraio.com/logo.png",
  "embeds": [
    {
      "title": "Checkout Success",
      "color": 3066993,
      "thumbnail": {
        "url": "https://images.stockx.com/images/adidas-Yeezy-Boost-350-V2-Onyx.jpg"
      },
      "fields": [
        {
          "name": "Item",
          "value": "adidas Yeezy Boost 350 V2 Onyx",
          "inline": true
        },
        { "name": "Size", "value": "11", "inline": true },
        { "name": "Price", "value": "$230.00", "inline": true },
        { "name": "Site", "value": "Adidas US", "inline": true },
        { "name": "Style", "value": "HQ4540", "inline": true },
        { "name": "Billing Profile", "value": "Main Card", "inline": true },
        { "name": "Proxy Group", "value": "Residential US", "inline": true },
        { "name": "Task Mode", "value": "Fast", "inline": true },
        { "name": "Speed", "value": "1.8s", "inline": true }
      ],
      "footer": {
        "text": "ValorAIO v4.2",
        "icon_url": "https://valoraio.com/footer.png"
      },
      "timestamp": "2026-03-07T11:30:45.000Z"
    }
  ]
}
```

### 1.3 NSB (Nike Shoe Bot) Checkout

NSB uses "Product Name", "Shoe Size", "Retailer", and omits some fields.

```json
{
  "username": "NSB - Nike Shoe Bot",
  "avatar_url": "https://nikeshoebot.com/logo.png",
  "embeds": [
    {
      "title": "Successfully Checked Out!",
      "color": 65280,
      "thumbnail": {
        "url": "https://static.nike.com/a/images/t_PDP_864_v1/air-jordan-1-retro.png"
      },
      "fields": [
        {
          "name": "Product Name",
          "value": "Air Jordan 1 Retro High OG Chicago",
          "inline": true
        },
        { "name": "Shoe Size", "value": "9.5", "inline": true },
        { "name": "Price", "value": "$180.00", "inline": true },
        { "name": "Retailer", "value": "Footlocker US", "inline": true },
        { "name": "Style Code", "value": "DZ5485-612", "inline": true },
        { "name": "Profile", "value": "Amex 1", "inline": true },
        { "name": "Proxy", "value": "DC East", "inline": true },
        { "name": "Order Number", "value": "FL-7829104", "inline": false },
        { "name": "Account", "value": "john***@gmail.com", "inline": true }
      ],
      "footer": {
        "text": "NSB v4.0.1",
        "icon_url": "https://nikeshoebot.com/footer.png"
      },
      "timestamp": "2026-03-07T09:00:12.000Z"
    }
  ]
}
```

### 1.4 Generic / Unknown Bot Checkout

Covers bots like Wrath, Kodai, Balko, Prism, AIO Bot, or any unrecognized bot. The parser must handle this gracefully via fuzzy field matching.

```json
{
  "username": "MyCustomBot",
  "avatar_url": "https://example.com/bot.png",
  "embeds": [
    {
      "title": "Copped!",
      "color": 3394611,
      "thumbnail": {
        "url": "https://example.com/product.jpg"
      },
      "fields": [
        {
          "name": "Name",
          "value": "New Balance 550 White Green",
          "inline": true
        },
        { "name": "Sz", "value": "10.5", "inline": true },
        { "name": "Cost", "value": "$109.99", "inline": true },
        { "name": "Website", "value": "New Balance US", "inline": true },
        { "name": "PID", "value": "BB550WT1", "inline": true },
        { "name": "Payment", "value": "Profile A", "inline": true },
        { "name": "Proxies", "value": "ISP Group 2", "inline": true },
        { "name": "Conf #", "value": "NB-998877", "inline": false }
      ],
      "footer": {
        "text": "MyCustomBot v1.0"
      },
      "timestamp": "2026-03-07T14:22:08.000Z"
    }
  ]
}
```

### 1.5 Decline / Failed Checkout

Use this to test that `success: false` is properly detected from title keywords and red color.

```json
{
  "username": "Cybersole",
  "avatar_url": "https://cybersole.io/logo.png",
  "embeds": [
    {
      "title": "Card Declined",
      "color": 16711680,
      "fields": [
        { "name": "Product", "value": "Nike Air Max 90", "inline": true },
        { "name": "Size", "value": "12", "inline": true },
        { "name": "Price", "value": "$130.00", "inline": true },
        { "name": "Store", "value": "Nike US", "inline": true },
        { "name": "Profile", "value": "Profile #1", "inline": true },
        { "name": "Proxy", "value": "ISP DC 2", "inline": true }
      ],
      "footer": {
        "text": "Cybersole | 2026-03-07 10:20:00"
      },
      "timestamp": "2026-03-07T10:20:00.000Z"
    }
  ]
}
```

---

## 2. CheckoutEvent Schema

The normalized format all webhook payloads are parsed into.

```typescript
interface CheckoutEvent {
  id: string; // UUID, generated server-side
  userId: string; // Resolved from webhook token
  botName: string; // Detected from footer/username
  product: string; // Product name
  sku: string | null; // SKU, PID, style code, style-color
  size: string | null; // Size string (e.g. "10", "9.5")
  price: number | null; // Price in cents (11000 = $110.00)
  store: string; // Retailer name
  profile: string | null; // Billing profile used
  proxy: string | null; // Proxy group
  orderNumber: string | null; // Order/confirmation number
  mode: string | null; // Task mode (Safe, Fast, etc.)
  checkoutTime: string | null; // Checkout speed (e.g. "2.3s")
  imageUrl: string | null; // Product thumbnail URL
  email: string | null; // Account email (if included)
  quantity: number; // Default 1
  success: boolean; // true = checkout, false = decline
  extras: Record<string, string>; // Unrecognized fields preserved here
  rawPayload: object; // Full original payload for debugging
  receivedAt: string; // ISO timestamp when proxy received it
}
```

### Field mapping from each bot

| Canonical Field | Cybersole     | Valor           | NSB          | Generic Aliases                       |
| --------------- | ------------- | --------------- | ------------ | ------------------------------------- |
| product         | Product       | Item            | Product Name | name, item name, shoe                 |
| size            | Size          | Size            | Shoe Size    | sz, sizing                            |
| price           | Price         | Price           | Price        | cost, total, amount, retail           |
| store           | Store         | Site            | Retailer     | website, shop                         |
| sku             | SKU           | Style           | Style Code   | pid, product id, style-color          |
| profile         | Profile       | Billing Profile | Profile      | billing, payment                      |
| proxy           | Proxy         | Proxy Group     | Proxy        | proxies, proxy list                   |
| orderNumber     | Order #       | (omitted)       | Order Number | order, confirmation, conf #, order id |
| mode            | Mode          | Task Mode       | (omitted)    | speed, method                         |
| checkoutTime    | Checkout Time | Speed           | (omitted)    | time, checkout speed, duration        |
| email           | (omitted)     | (omitted)       | Account      | account email                         |

---

## 3. Webhook Proxy Testing with curl

### 3.1 Test against local dev server

Replace `http://localhost:3000` with your dev URL and `TEST_TOKEN_123` with a valid webhook token.

**Cybersole success:**

```bash
curl -X POST http://localhost:3000/v1/webhooks/TEST_TOKEN_123 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Cybersole",
    "embeds": [{
      "title": "Successful Checkout",
      "color": 65280,
      "fields": [
        {"name": "Product", "value": "Nike Dunk Low Retro White Black", "inline": true},
        {"name": "Size", "value": "10", "inline": true},
        {"name": "Price", "value": "$110.00", "inline": true},
        {"name": "Store", "value": "Nike US", "inline": true},
        {"name": "SKU", "value": "DD1391-100", "inline": true},
        {"name": "Order #", "value": "C10298374651", "inline": false}
      ],
      "footer": {"text": "Cybersole | 2026-03-07 10:15:32"},
      "timestamp": "2026-03-07T10:15:32.000Z"
    }]
  }'
```

**Valor success:**

```bash
curl -X POST http://localhost:3000/v1/webhooks/TEST_TOKEN_123 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Valor",
    "embeds": [{
      "title": "Checkout Success",
      "color": 3066993,
      "fields": [
        {"name": "Item", "value": "adidas Yeezy Boost 350 V2 Onyx", "inline": true},
        {"name": "Size", "value": "11", "inline": true},
        {"name": "Price", "value": "$230.00", "inline": true},
        {"name": "Site", "value": "Adidas US", "inline": true},
        {"name": "Style", "value": "HQ4540", "inline": true}
      ],
      "footer": {"text": "ValorAIO v4.2"},
      "timestamp": "2026-03-07T11:30:45.000Z"
    }]
  }'
```

**Decline (expect success: false):**

```bash
curl -X POST http://localhost:3000/v1/webhooks/TEST_TOKEN_123 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Cybersole",
    "embeds": [{
      "title": "Card Declined",
      "color": 16711680,
      "fields": [
        {"name": "Product", "value": "Nike Air Max 90", "inline": true},
        {"name": "Size", "value": "12", "inline": true},
        {"name": "Price", "value": "$130.00", "inline": true},
        {"name": "Store", "value": "Nike US", "inline": true}
      ],
      "footer": {"text": "Cybersole | 2026-03-07 10:20:00"},
      "timestamp": "2026-03-07T10:20:00.000Z"
    }]
  }'
```

**Invalid token (expect 401):**

```bash
curl -X POST http://localhost:3000/v1/webhooks/INVALID_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"username":"test","embeds":[{"title":"test","fields":[]}]}'
```

**Empty payload (expect 400):**

```bash
curl -X POST http://localhost:3000/v1/webhooks/TEST_TOKEN_123 \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3.2 Test against Cloudflare Worker (production)

Same commands but replace `http://localhost:3000` with `https://hooks.bottingos.app`.

### 3.3 Expected responses

| Scenario          | Status Code | Body                           |
| ----------------- | ----------- | ------------------------------ |
| Valid checkout    | 204         | (empty)                        |
| Invalid token     | 401         | `Invalid webhook token`        |
| Missing embeds    | 400         | `Bad request: no embeds found` |
| Wrong HTTP method | 405         | `Method not allowed`           |
| Rate limited      | 429         | `Rate limit exceeded`          |

---

## 4. Parsing Strategy

### 4.1 Bot Detection

Priority order for detecting which bot sent the webhook:

1. **Footer text** (most reliable) - bots stamp their name in `embeds[0].footer.text`
2. **Username** - `payload.username` usually contains the bot name
3. **Avatar URL** - last resort, match known bot avatar domains

```typescript
const BOT_PATTERNS: Record<string, string[]> = {
  cybersole: ["cybersole", "cyber"],
  valor: ["valor", "valoraio"],
  nsb: ["nsb", "nike shoe bot", "nikeshoebot"],
  wrath: ["wrath", "wrathio"],
  kodai: ["kodai", "kodaiaio"],
  balkobot: ["balko", "balkobot"],
  prism: ["prism", "prismaio"],
  aiobot: ["aio bot", "aiobot"],
};
```

Check footer first, then username. Both lowercased. If no match, return `"unknown"`.

### 4.2 Field Normalization

All field matching is case-insensitive. Two passes:

1. **Exact alias match** - lowercase field name checked against alias list
2. **Substring fallback** - if no exact match, check if any alias is a substring

```typescript
const FIELD_ALIASES: Record<string, string[]> = {
  product: ["product", "item", "product name", "item name", "name", "shoe"],
  size: ["size", "shoe size", "sz", "sizing"],
  price: ["price", "cost", "total", "amount", "retail"],
  store: ["store", "site", "retailer", "website", "shop"],
  sku: ["sku", "pid", "product id", "style", "style code", "style-color"],
  profile: ["profile", "billing", "billing profile", "payment"],
  proxy: ["proxy", "proxy group", "proxies", "proxy list"],
  orderNumber: [
    "order #",
    "order number",
    "order",
    "confirmation",
    "conf #",
    "order id",
  ],
  mode: ["mode", "task mode", "method"],
  checkoutTime: [
    "checkout time",
    "time",
    "speed",
    "checkout speed",
    "duration",
  ],
  email: ["email", "account", "account email"],
  quantity: ["quantity", "qty"],
};
```

Fields that don't match any alias go into `extras: Record<string, string>`.

### 4.3 Success Detection

Check embed title keywords first, fall back to color:

- **Fail keywords** (title): `decline`, `failed`, `error`, `oos`, `out of stock`, `card declined`
- **Success keywords** (title): `success`, `checkout`, `copped`, `purchased`, `confirmed`
- **Color fallback**: green (65280 / 0x00FF00) = success, red (16711680 / 0xFF0000) = fail
- **Default**: true (assume success if ambiguous)

### 4.4 Price Parsing

Extract numeric value from strings like `"$110.00"`, `"USD 230"`, `"GBP 89.99"`:

```typescript
function parsePrice(raw: string): number | null {
  const match = raw.match(/[\d,]+\.?\d{0,2}/);
  if (!match) return null;
  return Math.round(parseFloat(match[0].replace(",", "")) * 100); // cents
}
```

Store all prices in **cents** (integer). `$110.00` becomes `11000`.

---

## 5. Supabase Realtime Testing

### 5.1 Verify INSERT triggers Realtime

After sending a curl webhook, confirm the desktop app receives the event via Supabase Realtime.

**Quick test with Supabase JS client (browser console or Node script):**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Sign in as test user first
await supabase.auth.signInWithPassword({
  email: "test@bottingos.app",
  password: "testpassword123",
});

// Subscribe to checkout events
const channel = supabase
  .channel("test-checkouts")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "checkout_events",
      filter: `user_id=eq.${(await supabase.auth.getUser()).data.user?.id}`,
    },
    (payload) => {
      console.log("Received checkout event:", payload.new);
      console.log("Bot:", payload.new.bot_name);
      console.log("Product:", payload.new.product);
      console.log("Price:", payload.new.price);
      console.log("Success:", payload.new.success);
    },
  )
  .subscribe((status) => {
    console.log("Subscription status:", status);
  });
```

### 5.2 Verification checklist

After sending a test webhook via curl:

1. Check Supabase dashboard - Table Editor - `checkout_events` for the new row
2. Confirm `bot_name` was correctly detected (e.g. "cybersole", not "unknown")
3. Confirm `price` is in cents (11000, not 110)
4. Confirm `success` is boolean (true for green/success titles, false for declines)
5. Confirm `raw_payload` contains the full original JSON
6. Confirm Realtime subscription fires in the desktop app (check console logs)
7. Confirm `extras` contains any unrecognized fields (not dropped)

### 5.3 Common Realtime issues

- **RLS blocking**: Realtime respects Row Level Security. The user must be authenticated and the `checkout_events` SELECT policy must match.
- **Realtime not enabled**: Enable Realtime on the `checkout_events` table via Supabase dashboard (Database > Replication > add table).
- **Filter syntax**: The `filter` string uses PostgREST syntax. `user_id=eq.UUID_HERE` with no spaces.

---

## 6. Test Fixtures

Ready-to-use JSON objects for unit tests. Import these as constants.

```typescript
// test/fixtures/webhooks.ts

export const CYBERSOLE_SUCCESS = {
  username: "Cybersole",
  avatar_url: "https://cybersole.io/logo.png",
  embeds: [
    {
      title: "Successful Checkout",
      color: 65280,
      thumbnail: { url: "https://static.nike.com/dunk-low.png" },
      fields: [
        {
          name: "Product",
          value: "Nike Dunk Low Retro White Black",
          inline: true,
        },
        { name: "Size", value: "10", inline: true },
        { name: "Price", value: "$110.00", inline: true },
        { name: "Store", value: "Nike US", inline: true },
        { name: "SKU", value: "DD1391-100", inline: true },
        { name: "Profile", value: "Profile #3", inline: true },
        { name: "Proxy", value: "ISP DC 1", inline: true },
        { name: "Mode", value: "Safe", inline: true },
        { name: "Order #", value: "C10298374651", inline: false },
        { name: "Checkout Time", value: "2.3s", inline: true },
      ],
      footer: { text: "Cybersole | 2026-03-07 10:15:32" },
      timestamp: "2026-03-07T10:15:32.000Z",
    },
  ],
} as const;

export const VALOR_SUCCESS = {
  username: "Valor",
  avatar_url: "https://valoraio.com/logo.png",
  embeds: [
    {
      title: "Checkout Success",
      color: 3066993,
      thumbnail: { url: "https://images.stockx.com/yeezy-onyx.jpg" },
      fields: [
        { name: "Item", value: "adidas Yeezy Boost 350 V2 Onyx", inline: true },
        { name: "Size", value: "11", inline: true },
        { name: "Price", value: "$230.00", inline: true },
        { name: "Site", value: "Adidas US", inline: true },
        { name: "Style", value: "HQ4540", inline: true },
        { name: "Billing Profile", value: "Main Card", inline: true },
        { name: "Proxy Group", value: "Residential US", inline: true },
        { name: "Task Mode", value: "Fast", inline: true },
        { name: "Speed", value: "1.8s", inline: true },
      ],
      footer: { text: "ValorAIO v4.2" },
      timestamp: "2026-03-07T11:30:45.000Z",
    },
  ],
} as const;

export const NSB_SUCCESS = {
  username: "NSB - Nike Shoe Bot",
  avatar_url: "https://nikeshoebot.com/logo.png",
  embeds: [
    {
      title: "Successfully Checked Out!",
      color: 65280,
      thumbnail: { url: "https://static.nike.com/air-jordan-1.png" },
      fields: [
        {
          name: "Product Name",
          value: "Air Jordan 1 Retro High OG Chicago",
          inline: true,
        },
        { name: "Shoe Size", value: "9.5", inline: true },
        { name: "Price", value: "$180.00", inline: true },
        { name: "Retailer", value: "Footlocker US", inline: true },
        { name: "Style Code", value: "DZ5485-612", inline: true },
        { name: "Profile", value: "Amex 1", inline: true },
        { name: "Proxy", value: "DC East", inline: true },
        { name: "Order Number", value: "FL-7829104", inline: false },
        { name: "Account", value: "john***@gmail.com", inline: true },
      ],
      footer: { text: "NSB v4.0.1" },
      timestamp: "2026-03-07T09:00:12.000Z",
    },
  ],
} as const;

export const GENERIC_SUCCESS = {
  username: "MyCustomBot",
  avatar_url: "https://example.com/bot.png",
  embeds: [
    {
      title: "Copped!",
      color: 3394611,
      thumbnail: { url: "https://example.com/product.jpg" },
      fields: [
        { name: "Name", value: "New Balance 550 White Green", inline: true },
        { name: "Sz", value: "10.5", inline: true },
        { name: "Cost", value: "$109.99", inline: true },
        { name: "Website", value: "New Balance US", inline: true },
        { name: "PID", value: "BB550WT1", inline: true },
        { name: "Payment", value: "Profile A", inline: true },
        { name: "Proxies", value: "ISP Group 2", inline: true },
        { name: "Conf #", value: "NB-998877", inline: false },
      ],
      footer: { text: "MyCustomBot v1.0" },
      timestamp: "2026-03-07T14:22:08.000Z",
    },
  ],
} as const;

export const CYBERSOLE_DECLINE = {
  username: "Cybersole",
  avatar_url: "https://cybersole.io/logo.png",
  embeds: [
    {
      title: "Card Declined",
      color: 16711680,
      fields: [
        { name: "Product", value: "Nike Air Max 90", inline: true },
        { name: "Size", value: "12", inline: true },
        { name: "Price", value: "$130.00", inline: true },
        { name: "Store", value: "Nike US", inline: true },
        { name: "Profile", value: "Profile #1", inline: true },
        { name: "Proxy", value: "ISP DC 2", inline: true },
      ],
      footer: { text: "Cybersole | 2026-03-07 10:20:00" },
      timestamp: "2026-03-07T10:20:00.000Z",
    },
  ],
} as const;

export const EMPTY_EMBEDS = {
  username: "SomeBot",
  embeds: [],
} as const;

export const NO_EMBEDS = {
  username: "SomeBot",
} as const;

export const MINIMAL_PAYLOAD = {
  username: "UnknownBot",
  embeds: [
    {
      title: "Checkout",
      color: 65280,
      fields: [
        { name: "Product", value: "Mystery Item", inline: true },
        { name: "Store", value: "Unknown Store", inline: true },
      ],
      footer: { text: "UnknownBot" },
    },
  ],
} as const;

// Expected parsed results for assertion
export const EXPECTED_CYBERSOLE = {
  botName: "cybersole",
  product: "Nike Dunk Low Retro White Black",
  sku: "DD1391-100",
  size: "10",
  price: 11000,
  store: "Nike US",
  profile: "Profile #3",
  proxy: "ISP DC 1",
  orderNumber: "C10298374651",
  mode: "Safe",
  checkoutTime: "2.3s",
  success: true,
  quantity: 1,
};

export const EXPECTED_VALOR = {
  botName: "valor",
  product: "adidas Yeezy Boost 350 V2 Onyx",
  sku: "HQ4540",
  size: "11",
  price: 23000,
  store: "Adidas US",
  profile: "Main Card",
  proxy: "Residential US",
  orderNumber: null,
  mode: "Fast",
  checkoutTime: "1.8s",
  success: true,
  quantity: 1,
};

export const EXPECTED_NSB = {
  botName: "nsb",
  product: "Air Jordan 1 Retro High OG Chicago",
  sku: "DZ5485-612",
  size: "9.5",
  price: 18000,
  store: "Footlocker US",
  profile: "Amex 1",
  proxy: "DC East",
  orderNumber: "FL-7829104",
  mode: null,
  checkoutTime: null,
  email: "john***@gmail.com",
  success: true,
  quantity: 1,
};

export const EXPECTED_DECLINE = {
  botName: "cybersole",
  product: "Nike Air Max 90",
  size: "12",
  price: 13000,
  store: "Nike US",
  success: false,
  orderNumber: null,
};
```

### Unit test outline

```typescript
// test/webhook-parser.test.ts
import { describe, it, expect } from "vitest";
import {
  parseCheckoutEvent,
  detectBot,
  normalizeFieldName,
  parsePrice,
} from "../src/webhook/parser";
import * as fixtures from "./fixtures/webhooks";

describe("detectBot", () => {
  it("detects Cybersole from footer", () => {
    expect(detectBot(fixtures.CYBERSOLE_SUCCESS)).toBe("cybersole");
  });
  it("detects Valor from footer", () => {
    expect(detectBot(fixtures.VALOR_SUCCESS)).toBe("valor");
  });
  it("detects NSB from username", () => {
    expect(detectBot(fixtures.NSB_SUCCESS)).toBe("nsb");
  });
  it("returns unknown for unrecognized bot", () => {
    expect(detectBot(fixtures.GENERIC_SUCCESS)).toBe("unknown");
  });
});

describe("normalizeFieldName", () => {
  it('maps "Item" to "product"', () => {
    expect(normalizeFieldName("Item")).toBe("product");
  });
  it('maps "Shoe Size" to "size"', () => {
    expect(normalizeFieldName("Shoe Size")).toBe("size");
  });
  it('maps "Conf #" to "orderNumber"', () => {
    expect(normalizeFieldName("Conf #")).toBe("orderNumber");
  });
  it("returns null for unknown field", () => {
    expect(normalizeFieldName("Random Thing")).toBeNull();
  });
});

describe("parsePrice", () => {
  it("parses $110.00", () => expect(parsePrice("$110.00")).toBe(11000));
  it("parses $1,299.99", () => expect(parsePrice("$1,299.99")).toBe(129999));
  it("parses GBP 89.99", () => expect(parsePrice("GBP 89.99")).toBe(8999));
  it("returns null for empty", () => expect(parsePrice("")).toBeNull());
});

describe("parseCheckoutEvent", () => {
  it("parses Cybersole payload correctly", () => {
    const event = parseCheckoutEvent(
      fixtures.CYBERSOLE_SUCCESS,
      "test-user-id",
    );
    expect(event).toMatchObject(fixtures.EXPECTED_CYBERSOLE);
  });
  it("parses Valor payload with different field names", () => {
    const event = parseCheckoutEvent(fixtures.VALOR_SUCCESS, "test-user-id");
    expect(event).toMatchObject(fixtures.EXPECTED_VALOR);
  });
  it("parses NSB payload with different field names", () => {
    const event = parseCheckoutEvent(fixtures.NSB_SUCCESS, "test-user-id");
    expect(event).toMatchObject(fixtures.EXPECTED_NSB);
  });
  it("detects decline from title and color", () => {
    const event = parseCheckoutEvent(
      fixtures.CYBERSOLE_DECLINE,
      "test-user-id",
    );
    expect(event).toMatchObject(fixtures.EXPECTED_DECLINE);
  });
  it("stores unrecognized fields in extras", () => {
    const event = parseCheckoutEvent(fixtures.GENERIC_SUCCESS, "test-user-id");
    expect(event.extras).toBeDefined();
  });
});
```
