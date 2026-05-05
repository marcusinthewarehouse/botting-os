# Task 4.2: Bot Webhook Parsers

## Objective

Build bot-specific parsers that extract structured CheckoutEvent data from Discord embed payloads. Covers Cybersole, Valor, NSB, Wrath, Kodai, plus a fuzzy fallback parser for unknown bots. Each parser detects the bot, normalizes field names, extracts price/size/product, and detects success/failure.

## Context

Every sneaker bot sends checkout notifications as Discord webhook POSTs with an embeds array. The challenge is that each bot uses different field names ("Product" vs "Item" vs "Product Name"), different footer formats, and different success indicators. This task builds the parsing layer that sits between the raw webhook payload and the normalized CheckoutEvent schema.

The parsers are used by the Cloudflare Worker (Task 4.1) but are designed as pure functions with no external dependencies (no Supabase, no network calls) so they can be unit tested independently.

## Dependencies

- None (pure parsing logic, no external dependencies)

## Blocked By

- Nothing - can be built first, before Task 4.1

## Research Findings

From `aycd-bot-ecosystem.md` Section 2.2-2.4:

**Discord Webhook Payload Structure:**

```json
{
  "username": "Bot Name",
  "avatar_url": "https://...",
  "embeds": [{
    "title": "Successful Checkout",
    "color": 65280,
    "thumbnail": { "url": "product_image_url" },
    "fields": [
      { "name": "Product", "value": "Nike Dunk Low Panda", "inline": true },
      ...
    ],
    "footer": { "text": "Cybersole | 2026-03-07 10:15:32" },
    "timestamp": "2026-03-07T10:15:32.000Z"
  }]
}
```

**Bot Detection (footer is most reliable):**

```
cybersole: ['cybersole', 'cyber']
valor:     ['valor', 'valoraio']
nsb:       ['nsb', 'nike shoe bot', 'nikeshoebot']
wrath:     ['wrath', 'wrathio']
kodai:     ['kodai', 'kodaiaio']
balkobot:  ['balko', 'balkobot']
prism:     ['prism', 'prismaio']
aiobot:    ['aio bot', 'aiobot']
```

**Field Aliases:**
| Canonical | Aliases |
|-----------|---------|
| product | product, item, product name, item name, name, shoe |
| size | size, shoe size, sz, sizing |
| price | price, cost, total, amount, retail |
| store | store, site, retailer, website, shop |
| sku | sku, pid, product id, style, style code, style-color |
| profile | profile, billing, billing profile, payment |
| proxy | proxy, proxy group, proxies, proxy list |
| orderNumber | order #, order number, order, confirmation, conf #, order id |
| mode | mode, task mode, method |
| checkoutTime | checkout time, time, speed, checkout speed, duration |
| email | email, account, account email |
| quantity | quantity, qty |

**Success Detection:**

- Fail keywords (title): decline, failed, error, oos, out of stock, card declined
- Success keywords: success, checkout, copped, purchased, confirmed
- Color fallback: green (65280) = success, red (16711680) = fail
- Default: true

**Price Parsing:**

- Extract number from strings like "$110.00", "USD 230", "GBP 89.99"
- Store in cents (integer): $110.00 -> 11000

From `webhook-testing` skill:

- Full mock payloads for Cybersole, Valor, NSB, Generic, and Decline scenarios
- Expected parsed results for each
- Test fixtures ready to import

## Implementation Plan

### Step 1: Define shared types

```typescript
// workers/webhook-proxy/src/parsers/types.ts
export interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  thumbnail?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
}

export interface CheckoutEvent {
  bot_name: string;
  product: string;
  sku: string | null;
  size: string | null;
  price: number | null; // cents
  store: string;
  profile: string | null;
  proxy: string | null;
  order_number: string | null;
  mode: string | null;
  checkout_time: string | null;
  image_url: string | null;
  email: string | null;
  quantity: number;
  success: boolean;
  extras: Record<string, string>;
  raw_payload: object;
  received_at: string; // ISO timestamp
}
```

### Step 2: Implement bot detection

```typescript
// workers/webhook-proxy/src/parsers/detect.ts
export function detectBot(payload: DiscordWebhookPayload): string;
```

Check footer first, then username. Both lowercased. Return 'unknown' if no match.

### Step 3: Implement field normalization

```typescript
// workers/webhook-proxy/src/parsers/normalize.ts
export function normalizeFieldName(rawName: string): string | null;
export function normalizeFields(
  fields: { name: string; value: string }[],
): Record<string, string>;
```

Two-pass: exact alias match, then substring fallback. Unmatched fields go to extras.

### Step 4: Implement utility functions

```typescript
// workers/webhook-proxy/src/parsers/utils.ts
export function parsePrice(raw: string): number | null;
export function isSuccessfulCheckout(embed: DiscordEmbed): boolean;
```

### Step 5: Implement bot-specific parsers

Each parser can override the generic field mapping if a specific bot has quirks:

```typescript
// workers/webhook-proxy/src/parsers/cybersole.ts
export function parseCybersole(embed: DiscordEmbed): Partial<CheckoutEvent>;

// workers/webhook-proxy/src/parsers/valor.ts
export function parseValor(embed: DiscordEmbed): Partial<CheckoutEvent>;

// workers/webhook-proxy/src/parsers/nsb.ts
export function parseNsb(embed: DiscordEmbed): Partial<CheckoutEvent>;

// workers/webhook-proxy/src/parsers/wrath.ts
export function parseWrath(embed: DiscordEmbed): Partial<CheckoutEvent>;

// workers/webhook-proxy/src/parsers/kodai.ts
export function parseKodai(embed: DiscordEmbed): Partial<CheckoutEvent>;
```

For MVP, Cybersole, Valor, and NSB have known field mappings from research. Wrath and Kodai can use the fuzzy fallback initially and be refined when real payloads are captured.

### Step 6: Implement fuzzy fallback parser

```typescript
// workers/webhook-proxy/src/parsers/fuzzy.ts
export function parseFuzzy(embed: DiscordEmbed): Partial<CheckoutEvent>;
```

Scans all embed fields for:

- Price-like patterns ($XX.XX)
- Product name (longest text value that isn't a URL or number)
- Order number patterns (alphanumeric with hyphens, 6+ chars)
- Size patterns (single number, half sizes like "10.5")

### Step 7: Implement main parseWebhook entry point

```typescript
// workers/webhook-proxy/src/parsers/index.ts
export function parseWebhook(
  payload: DiscordWebhookPayload,
  userId: string,
): CheckoutEvent;
```

1. Detect bot from payload
2. Route to bot-specific parser if known, else fuzzy
3. Merge parsed fields with defaults
4. Add metadata (userId, raw_payload, received_at)
5. Return complete CheckoutEvent

### Step 8: Write comprehensive tests

Use fixtures from `webhook-testing` skill.

## Files to Create

- `workers/webhook-proxy/src/parsers/index.ts` - main entry, parseWebhook()
- `workers/webhook-proxy/src/parsers/types.ts` - shared interfaces
- `workers/webhook-proxy/src/parsers/detect.ts` - bot detection
- `workers/webhook-proxy/src/parsers/normalize.ts` - field normalization
- `workers/webhook-proxy/src/parsers/utils.ts` - parsePrice, isSuccessfulCheckout
- `workers/webhook-proxy/src/parsers/cybersole.ts` - Cybersole parser
- `workers/webhook-proxy/src/parsers/valor.ts` - Valor parser
- `workers/webhook-proxy/src/parsers/nsb.ts` - NSB parser
- `workers/webhook-proxy/src/parsers/wrath.ts` - Wrath parser
- `workers/webhook-proxy/src/parsers/kodai.ts` - Kodai parser
- `workers/webhook-proxy/src/parsers/fuzzy.ts` - fuzzy fallback parser
- `workers/webhook-proxy/test/parsers.test.ts` - unit tests
- `workers/webhook-proxy/test/fixtures/webhooks.ts` - test fixtures (from skill)

## Files to Modify

- None

## Contracts

### Provides

```typescript
// Main export
function parseWebhook(
  payload: DiscordWebhookPayload,
  userId: string,
): CheckoutEvent;

// Utilities (also exported for direct use)
function detectBot(payload: DiscordWebhookPayload): string;
function normalizeFieldName(rawName: string): string | null;
function parsePrice(raw: string): number | null;
function isSuccessfulCheckout(embed: DiscordEmbed): boolean;

// Types
interface CheckoutEvent {
  bot_name;
  product;
  sku;
  size;
  price;
  store;
  profile;
  proxy;
  order_number;
  mode;
  checkout_time;
  image_url;
  email;
  quantity;
  success;
  extras;
  raw_payload;
  received_at;
}
interface DiscordWebhookPayload {
  username?;
  avatar_url?;
  embeds?;
}
interface DiscordEmbed {
  title?;
  color?;
  thumbnail?;
  fields?;
  footer?;
  timestamp?;
}
```

### Consumes

- Nothing (pure functions)

## Acceptance Criteria

1. Cybersole payload parsed correctly: bot_name="cybersole", product="Nike Dunk Low Retro White Black", size="10", price=11000, store="Nike US", sku="DD1391-100", orderNumber="C10298374651"
2. Valor payload parsed correctly: bot_name="valor", product extracts from "Item" field, store from "Site" field
3. NSB payload parsed correctly: bot_name="nsb", product from "Product Name", size from "Shoe Size", store from "Retailer", email from "Account"
4. Generic/unknown bot falls back to fuzzy parser and still extracts product, size, price, store
5. Decline payload: success=false detected from "Card Declined" title and red color
6. Missing fields handled gracefully (null, not error)
7. Unrecognized fields stored in `extras` object
8. Price always in cents: "$110.00" -> 11000, "$1,299.99" -> 129999
9. Empty embeds array returns 400-triggering error (handled by Worker, not parser)
10. raw_payload contains the original untouched payload
11. All test fixtures from webhook-testing skill pass

## Testing Protocol

### Unit Tests (Vitest)

```typescript
describe("detectBot", () => {
  it("detects Cybersole from footer");
  it("detects Valor from footer");
  it("detects NSB from username");
  it("returns unknown for unrecognized bot");
});

describe("normalizeFieldName", () => {
  it('maps "Item" to "product"');
  it('maps "Shoe Size" to "size"');
  it('maps "Conf #" to "orderNumber"');
  it("returns null for unknown field");
});

describe("parsePrice", () => {
  it("parses $110.00 -> 11000");
  it("parses $1,299.99 -> 129999");
  it("parses GBP 89.99 -> 8999");
  it("returns null for empty string");
  it("returns null for non-numeric");
});

describe("isSuccessfulCheckout", () => {
  it("detects success from title keyword");
  it("detects decline from title keyword");
  it("falls back to green color = success");
  it("falls back to red color = failure");
  it("defaults to true when ambiguous");
});

describe("parseWebhook", () => {
  it("parses Cybersole payload correctly");
  it("parses Valor payload with different field names");
  it("parses NSB payload with different field names");
  it("handles generic bot via fuzzy parser");
  it("detects decline correctly");
  it("stores unrecognized fields in extras");
  it("preserves raw payload");
  it("sets received_at timestamp");
});
```

### Build Checks

```bash
cd workers/webhook-proxy
npx tsc --noEmit
npx vitest run
```

## Skills to Read

- `.claude/skills/webhook-testing/SKILL.md` - mock payloads, field mapping table, test fixtures, expected results

## Research Files to Read

- `.claude/orchestration-bottingos/research/aycd-bot-ecosystem.md` - Section 2 (Bot Webhook Formats) for payload structure and bot details
- `.claude/orchestration-bottingos/research/webhook-supabase-implementation.md` - Section 2 (Bot-Specific Payload Parsing) for detection and normalization logic

## Git

- **Branch**: `feat/4.2-bot-parsers`
- **Commit prefix**: `[parsers]`
