# Webhook Proxy & Cloud Sync - Implementation Research

**Date**: 2026-03-07
**Researcher**: Claude (subagent)
**Purpose**: Implementation details for webhook proxy, Supabase cloud sync, and desktop-to-cloud data flow

---

## 1. Webhook Proxy Architecture

### 1.1 Hosting Options Comparison

| Platform                    | Free Tier                            | Paid Tier                            | Best For                       |
| --------------------------- | ------------------------------------ | ------------------------------------ | ------------------------------ |
| **Cloudflare Workers**      | 100K req/day, 10ms CPU/req           | $5/mo for 10M req/mo + $0.30/M extra | Webhook receiver (recommended) |
| **Supabase Edge Functions** | 500K invocations/mo                  | Pro $25/mo (2M invocations)          | Already in stack, simpler      |
| **Vercel Serverless**       | 100K invocations/mo, 100GB bandwidth | $20/mo Pro                           | Already hosting frontend       |

### 1.2 Cost Analysis at Scale (1000 users, ~100 webhooks/day each)

**Traffic**: 1000 users x 100 webhooks/day = 100K webhooks/day = ~3M/month

| Platform                    | Monthly Cost                                         | Notes                                                                         |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Cloudflare Workers**      | $0 (free tier covers 100K/day exactly) or $5/mo paid | Free tier is tight at exactly 100K/day. Paid at $5/mo covers 10M comfortably. |
| **Supabase Edge Functions** | $25/mo (Pro plan for 2M, need overage for 3M)        | Already paying for Pro if using Realtime. ~$25-30/mo total.                   |
| **Vercel Serverless**       | $20/mo + overage (~$5-10 extra)                      | 100K free invocations exhausted day 1. Pro needed.                            |

**Recommendation**: Cloudflare Workers at $5/mo paid tier. Cheapest, fastest cold start (~0ms), 10M req/mo is 3x headroom. Supabase Edge Functions are viable if you want to keep everything in one platform.

### 1.3 Architecture Diagram

```
                         WEBHOOK FLOW
                         ============

  Bot (Cybersole/Valor/NSB)
          |
          | POST Discord-format JSON
          v
  +---------------------------+
  | hooks.bottingos.app       |
  | /v1/webhooks/{user_token} |
  | (Cloudflare Worker)       |
  +---------------------------+
          |
          | 1. Validate user_token
          | 2. Parse Discord embed
          | 3. Detect bot (footer/username)
          | 4. Normalize to CheckoutEvent
          |
          v
  +---------------------------+
  | Supabase                  |
  |  - INSERT checkout_events |
  |  - Encrypted blob storage |
  +---------------------------+
          |
          | Supabase Realtime (WebSocket)
          v
  +---------------------------+
  | Desktop App (Tauri)       |
  |  - Receives via Realtime  |
  |  - Decrypts & stores      |
  |    in local SQLite        |
  +---------------------------+
          |
          | (Optional) Forward
          v
  +---------------------------+
  | User's Discord Webhook    |
  | (original notifications)  |
  +---------------------------+
```

### 1.4 Unique Webhook URL Generation

Each user gets a unique, unguessable webhook token:

```typescript
import { randomBytes } from "crypto";

function generateWebhookToken(): string {
  // 24 bytes = 32 chars base64url, unguessable
  return randomBytes(24).toString("base64url");
}

// Result: hooks.bottingos.app/v1/webhooks/aBcDeFgHiJkLmNoPqRsTuVwXyZaB
// Store mapping: user_id <-> webhook_token in Supabase
```

Tokens stored in `webhook_tokens` table:

```sql
CREATE TABLE webhook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  discord_forward_url TEXT, -- optional: forward to user's Discord
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
```

### 1.5 Webhook-to-Desktop Push Strategy

**Supabase Realtime (recommended)** - desktop app subscribes to user's checkout events:

```typescript
// In Tauri/Next.js app
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

supabase
  .channel("checkouts")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "checkout_events",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Decrypt and store locally
      const decrypted = decrypt(payload.new.encrypted_data, masterKey);
      insertLocalCheckout(decrypted);
    },
  )
  .subscribe();
```

**Why not WebSocket push from Worker?** Cloudflare Workers can't maintain persistent WebSocket connections to desktop apps. Supabase Realtime handles this natively with PostgreSQL's replication protocol.

**Why not polling?** Adds latency (minimum 5-10s delay), wastes bandwidth, and doesn't scale as cleanly. Realtime gives sub-second delivery.

---

## 2. Bot-Specific Payload Parsing

### 2.1 Discord Webhook Payload Structure

All sneaker bots POST this format:

```json
{
  "username": "Bot Name",
  "avatar_url": "https://...",
  "embeds": [
    {
      "title": "Successful Checkout",
      "color": 65280,
      "thumbnail": { "url": "product_image_url" },
      "fields": [
        { "name": "Product", "value": "Nike Dunk Low Panda", "inline": true },
        { "name": "Size", "value": "10", "inline": true },
        { "name": "Price", "value": "$110.00", "inline": true },
        { "name": "Store", "value": "Nike US", "inline": true }
      ],
      "footer": { "text": "Cybersole | 2026-03-07 10:15:32" },
      "timestamp": "2026-03-07T10:15:32.000Z"
    }
  ]
}
```

### 2.2 Bot Detection Strategy

Detect which bot sent the webhook from multiple signals:

```typescript
function detectBot(payload: DiscordWebhookPayload): string {
  const username = payload.username?.toLowerCase() ?? "";
  const footerText = payload.embeds?.[0]?.footer?.text?.toLowerCase() ?? "";
  const avatarUrl = payload.avatar_url ?? "";

  // Footer is most reliable - bots stamp their name
  const botPatterns: Record<string, string[]> = {
    cybersole: ["cybersole", "cyber"],
    valor: ["valor", "valoraio"],
    nsb: ["nsb", "nike shoe bot", "nikeshoebot"],
    wrath: ["wrath", "wrathio"],
    kodai: ["kodai", "kodaiaio"],
    balkobot: ["balko", "balkobot"],
    prism: ["prism", "prismaio"],
    aiobot: ["aio bot", "aiobot"],
  };

  for (const [bot, patterns] of Object.entries(botPatterns)) {
    if (patterns.some((p) => footerText.includes(p) || username.includes(p))) {
      return bot;
    }
  }

  return "unknown";
}
```

### 2.3 Field Name Normalization (Fuzzy Matching)

Different bots use different names for the same data. Use a normalization map:

```typescript
const FIELD_ALIASES: Record<string, string[]> = {
  product: ["product", "item", "product name", "item name", "name", "shoe"],
  size: ["size", "shoe size", "sz", "sizing"],
  price: ["price", "cost", "total", "amount", "retail"],
  store: ["store", "site", "retailer", "website", "shop"],
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
  mode: ["mode", "task mode", "speed", "method"],
  checkoutTime: [
    "checkout time",
    "time",
    "speed",
    "checkout speed",
    "duration",
  ],
  sku: ["sku", "pid", "product id", "style", "style code", "style-color"],
  email: ["email", "account", "account email"],
  quantity: ["quantity", "qty", "amount"],
  region: ["region", "country", "locale"],
};

function normalizeFieldName(rawName: string): string | null {
  const lower = rawName.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(lower)) return canonical;
  }
  // Fuzzy fallback: check if any alias is a substring
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => lower.includes(a) || a.includes(lower)))
      return canonical;
  }
  return null; // Unknown field - store in extras
}
```

### 2.4 Standard CheckoutEvent Schema

```typescript
interface CheckoutEvent {
  id: string; // UUID
  userId: string; // Owner
  botName: string; // Detected bot name
  product: string; // Product name
  sku: string | null; // SKU/PID/style code
  size: string | null; // Size
  price: number | null; // Price in cents (parsed from "$110.00")
  store: string; // Retailer
  profile: string | null; // Billing profile used
  proxy: string | null; // Proxy group
  orderNumber: string | null; // Order/confirmation number
  mode: string | null; // Task mode
  checkoutTime: string | null; // Checkout speed
  imageUrl: string | null; // Product thumbnail
  email: string | null; // Account email
  quantity: number; // Default 1
  success: boolean; // Derived from title/color
  extras: Record<string, string>; // Unrecognized fields
  rawPayload: object; // Full original payload for debugging
  receivedAt: string; // ISO timestamp
}
```

### 2.5 Success Detection

```typescript
function isSuccessfulCheckout(embed: DiscordEmbed): boolean {
  const title = (embed.title ?? "").toLowerCase();
  const successTerms = [
    "success",
    "checkout",
    "copped",
    "purchased",
    "confirmed",
  ];
  const failTerms = [
    "decline",
    "failed",
    "error",
    "oos",
    "out of stock",
    "card declined",
  ];

  if (failTerms.some((t) => title.includes(t))) return false;
  if (successTerms.some((t) => title.includes(t))) return true;

  // Color-based fallback: green = success, red = fail
  if (embed.color === 65280 || embed.color === 0x00ff00) return true; // green
  if (embed.color === 16711680 || embed.color === 0xff0000) return false; // red

  return true; // Default to success if ambiguous
}
```

### 2.6 Price Parsing

```typescript
function parsePrice(raw: string): number | null {
  // Handle "$110.00", "110.00", "USD 110", "GBP 89.99", etc.
  const match = raw.match(/[\d,]+\.?\d{0,2}/);
  if (!match) return null;
  return Math.round(parseFloat(match[0].replace(",", "")) * 100); // Store in cents
}
```

---

## 3. Supabase Cloud Sync

### 3.1 Free Tier Limits

| Resource                  | Free Tier                        | Pro ($25/mo)           |
| ------------------------- | -------------------------------- | ---------------------- |
| Database size             | 500 MB                           | 8 GB (expandable)      |
| Realtime connections      | 200 concurrent                   | 500 concurrent         |
| Edge Function invocations | 500K/mo                          | 2M/mo                  |
| Auth users                | 50K MAU                          | 100K MAU               |
| File storage              | 1 GB                             | 100 GB                 |
| Bandwidth                 | 2 GB                             | 250 GB                 |
| Projects                  | 2 (pauses after 1 week inactive) | Unlimited (no pausing) |

**For BottingOS**: Free tier is sufficient for development and early users (<200 concurrent). Move to Pro ($25/mo) when hitting 200+ simultaneous desktop app connections or 500K webhook events/month.

### 3.2 Client-Side Encryption Pattern

All sensitive data encrypted before leaving the device. Supabase only stores encrypted blobs.

```typescript
// crypto.ts - runs in browser/Tauri WebView
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

async function deriveKey(
  masterPassword: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt(data: string, masterPassword: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(masterPassword, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(data),
  );

  // Pack: salt (16) + iv (12) + ciphertext
  const packed = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...packed));
}

async function decrypt(
  packed64: string,
  masterPassword: string,
): Promise<string> {
  const packed = Uint8Array.from(atob(packed64), (c) => c.charCodeAt(0));
  const salt = packed.slice(0, SALT_BYTES);
  const iv = packed.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = packed.slice(SALT_BYTES + IV_BYTES);

  const key = await deriveKey(masterPassword, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}
```

**Key derivation notes**:

- 100K PBKDF2 iterations is the current minimum recommendation
- Salt is unique per encrypted blob (stored alongside ciphertext)
- IV must be unique per encryption with same key - random 12 bytes ensures this
- Master password never leaves the device, never stored anywhere
- If user forgets master password, data is unrecoverable (by design, like Bitwarden)

### 3.3 Sync Strategy: Timestamp-Based Incremental Sync

**Why NOT CRDTs**: CRDTs add significant complexity (conflict-free merge logic, CRDT library dependency, larger payloads). For BottingOS, data conflicts are rare - most data is append-only (checkouts, transactions) or single-device edits (profile settings).

**Why NOT full sync**: Re-uploading everything on every change wastes bandwidth and hits Supabase limits fast.

**Recommended: Timestamp-based incremental sync with last-write-wins (LWW)**:

```
SYNC FLOW
=========

  Local SQLite                          Supabase
  ============                          ========

  1. PUSH (local -> cloud)
     - SELECT * FROM items WHERE updated_at > last_sync_at
     - Encrypt each row
     - UPSERT encrypted blobs to Supabase
     - Update last_sync_at

  2. PULL (cloud -> local)
     - SELECT * FROM sync_items WHERE user_id = X AND updated_at > last_sync_at
     - Decrypt each blob
     - UPSERT into local SQLite
     - Update last_sync_at

  3. CONFLICT RESOLUTION
     - Last-write-wins by updated_at timestamp
     - If cloud.updated_at > local.updated_at, cloud wins
     - If local.updated_at > cloud.updated_at, local wins
     - Deleted items: soft-delete with deleted_at timestamp
```

```typescript
// sync.ts
interface SyncItem {
  id: string;
  table_name: string;
  encrypted_data: string; // AES-256-GCM encrypted JSON
  updated_at: string; // ISO timestamp
  deleted_at: string | null;
}

async function pushChanges(supabase: SupabaseClient, lastSyncAt: string) {
  const localChanges = await db
    .select()
    .from(syncQueue)
    .where(gt(syncQueue.updatedAt, lastSyncAt));

  for (const item of localChanges) {
    const encrypted = await encrypt(JSON.stringify(item.data), masterPassword);
    await supabase.from("sync_items").upsert({
      id: item.id,
      user_id: userId,
      table_name: item.tableName,
      encrypted_data: encrypted,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt,
    });
  }
}

async function pullChanges(supabase: SupabaseClient, lastSyncAt: string) {
  const { data } = await supabase
    .from("sync_items")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", lastSyncAt);

  for (const item of data ?? []) {
    const decrypted = JSON.parse(
      await decrypt(item.encrypted_data, masterPassword),
    );
    if (item.deleted_at) {
      await db.delete(getTable(item.table_name)).where(eq("id", item.id));
    } else {
      await db
        .insert(getTable(item.table_name))
        .values(decrypted)
        .onConflictDoUpdate({ target: "id", set: decrypted });
    }
  }
}
```

### 3.4 Supabase Realtime for Live Webhook Push

When a webhook arrives at the cloud endpoint:

```
WEBHOOK REALTIME FLOW
=====================

  Bot POST -> Cloudflare Worker -> Supabase INSERT -> Realtime -> Desktop App

  1. Worker receives webhook
  2. Worker validates token, parses payload
  3. Worker encrypts CheckoutEvent with user's public sync key
  4. Worker INSERTs into checkout_events table
  5. Supabase Realtime detects INSERT
  6. Desktop app receives via WebSocket subscription
  7. Desktop app decrypts and stores locally
```

**Encryption challenge for webhooks**: The Worker needs to encrypt data for the user, but doesn't have their master password. Solutions:

**Option A - Asymmetric encryption for webhooks (recommended)**:

- User generates an RSA/X25519 keypair locally
- Public key stored in Supabase (plaintext)
- Worker encrypts webhook data with user's public key
- Desktop app decrypts with private key (stored locally, encrypted with master password)
- Adds ~1KB overhead per webhook

**Option B - Store webhooks unencrypted, encrypt on pull**:

- Webhook data stored in plain text in Supabase temporarily
- Desktop app pulls, encrypts, and re-uploads as encrypted blob
- Simpler but data is briefly unencrypted in Supabase
- Acceptable if webhook data isn't super sensitive (product names, sizes aren't secrets)

**Option C - Derived sync key stored in Supabase**:

- User derives a separate "sync key" from master password
- Sync key stored encrypted in Supabase (encrypted with Supabase Auth token)
- Worker retrieves sync key to encrypt webhook data
- More complex key management

**Recommendation**: Option B for MVP. Webhook data (product, size, price) isn't sensitive enough to warrant asymmetric crypto complexity. Encrypt during sync for at-rest protection. Upgrade to Option A later if users demand it.

### 3.5 Supabase Auth vs Master Password

**Hybrid approach (recommended)**:

| Concern              | Solution                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Cloud authentication | Supabase Auth (email + password or OAuth)                                                                                       |
| Data encryption      | Master password (separate from auth password)                                                                                   |
| Why separate?        | Supabase Auth manages sessions/tokens. Master password never leaves device. Even if Supabase is breached, data stays encrypted. |

```
AUTH FLOW
=========

  1. User signs up with email + password (Supabase Auth)
  2. User sets a master password (local only)
  3. Master password derives AES-256-GCM key via PBKDF2
  4. All local data encrypted with derived key before cloud sync
  5. On new device: sign in with Supabase Auth, enter master password
  6. App pulls encrypted blobs from Supabase, decrypts locally
```

### 3.6 Row-Level Security with Encrypted Data

```sql
-- Users can only read/write their own sync items
ALTER TABLE sync_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their data" ON sync_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Webhook tokens: users manage their own
ALTER TABLE webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their tokens" ON webhook_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Checkout events: inserted by service role (Worker), read by user
ALTER TABLE checkout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own checkouts" ON checkout_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Worker uses service_role key to INSERT (bypasses RLS)
```

### 3.7 Supabase JS SDK in Tauri/Static Next.js

Since Tauri uses `output: 'export'` (static), all Supabase calls happen client-side:

```typescript
// lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

No server-side Supabase client needed. The anon key + RLS policies handle security. Auth tokens managed by `@supabase/auth-js` in the browser context.

---

## 4. Desktop-to-Cloud Data Flow

### 4.1 Complete Architecture

```
FULL DATA FLOW
==============

                    +-------------------+
                    |   Cloudflare      |
                    |   Worker          |
                    |   (webhook proxy) |
                    +--------+----------+
                             |
                             | INSERT (service_role)
                             v
+-------------+    +-------------------+    +-------------+
| Desktop App | <->|    Supabase       |<-> | Mobile App  |
| (Tauri)     |    |                   |    | (future)    |
|             |    | - Auth            |    |             |
| SQLite      |    | - checkout_events |    | SQLite      |
| (source of  |    | - sync_items      |    | (read-only  |
|  truth)     |    | - webhook_tokens  |    |  mirror)    |
|             |    | - Realtime        |    |             |
+------+------+    +-------------------+    +------+------+
       |                                           |
       | Local encryption                          | Local decryption
       | PBKDF2 + AES-256-GCM                     | Same master password
       v                                           v
  User's data                                 User's data
  (profiles,                                  (read-only
   inventory,                                  view)
   transactions)
```

### 4.2 Data Flow Scenarios

**Scenario 1: User creates data locally**

```
1. User adds inventory item in desktop app
2. Item saved to local SQLite (plaintext, fast)
3. Background sync: encrypt item -> UPSERT to Supabase sync_items
4. Mobile app (future) picks up via Realtime or next pull
```

**Scenario 2: Webhook hits cloud endpoint**

```
1. Bot POSTs checkout to hooks.bottingos.app/v1/webhooks/{token}
2. Cloudflare Worker validates, parses, normalizes
3. Worker INSERTs into checkout_events (plaintext for now, Option B)
4. Supabase Realtime pushes to desktop app
5. Desktop app receives, stores in local SQLite
6. Desktop app encrypts and syncs back to sync_items (encrypted)
7. OS notification fires: "New checkout: Nike Dunk Low - Size 10"
```

**Scenario 3: Conflict resolution**

```
1. Desktop edits item offline at 10:00 AM
2. Mobile edits same item at 10:05 AM, syncs to cloud
3. Desktop comes online at 10:10 AM
4. Pull: cloud version has updated_at=10:05 > local updated_at=10:00
5. Cloud wins (LWW). Local version overwritten.
6. Push: no local changes newer than cloud, nothing to push.
```

### 4.3 Offline-First Behavior

```
OFFLINE-FIRST DESIGN
====================

  ONLINE:
    - App works normally
    - Background sync every 30s (push + pull)
    - Realtime subscription active for webhooks
    - Status indicator: green dot

  OFFLINE:
    - App works identically (all data in SQLite)
    - Changes queued in sync_queue table
    - Webhooks buffered in Supabase (pulled on reconnect)
    - Status indicator: yellow dot "Offline - changes will sync"

  RECONNECT:
    - Flush sync_queue (push all pending changes)
    - Pull all changes since last_sync_at
    - Resubscribe to Realtime
    - Status indicator: green dot

  NEVER ONLINE:
    - App works 100% without cloud features
    - No sync, no webhook reception
    - All data local-only
    - Master password still protects local SQLite
```

---

## 5. Cloudflare Worker Implementation

### 5.1 Worker Code (webhook receiver)

```typescript
// workers/webhook-receiver/src/index.ts
import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/v1\/webhooks\/([a-zA-Z0-9_-]+)$/);
    if (!pathMatch) {
      return new Response("Not found", { status: 404 });
    }

    const token = pathMatch[1];
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Validate token
    const { data: tokenRow } = await supabase
      .from("webhook_tokens")
      .select("user_id, discord_forward_url")
      .eq("token", token)
      .single();

    if (!tokenRow) {
      return new Response("Invalid webhook token", { status: 401 });
    }

    // Parse Discord embed payload
    const payload = (await request.json()) as DiscordWebhookPayload;
    const checkoutEvent = parseCheckoutEvent(payload, tokenRow.user_id);

    // Store in Supabase
    await supabase.from("checkout_events").insert(checkoutEvent);

    // Update last_used_at
    await supabase
      .from("webhook_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token);

    // Forward to Discord if configured
    if (tokenRow.discord_forward_url) {
      await fetch(tokenRow.discord_forward_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {}); // Fire and forget
    }

    // Return 204 (Discord expects this)
    return new Response(null, { status: 204 });
  },
};
```

### 5.2 Rate Limiting

Add per-token rate limiting to prevent abuse:

```typescript
// In Worker, use Cloudflare's built-in rate limiting
// Or simple in-memory counter per token (resets on Worker restart)
const RATE_LIMIT = 60; // max 60 webhooks per minute per token
```

---

## 6. Push Notifications (Future Mobile)

### 6.1 Architecture

```
PUSH NOTIFICATION FLOW
======================

  Webhook arrives
       |
       v
  Cloudflare Worker
       |
       | INSERT checkout_events
       v
  Supabase Database Webhook (on INSERT)
       |
       | Triggers Edge Function
       v
  Supabase Edge Function
       |
       | Send FCM message
       v
  Firebase Cloud Messaging (free)
       |
       v
  Mobile App (iOS/Android)
       |
       v
  Push Notification:
  "New checkout: Nike Dunk Low - Size 10 - $110"
```

### 6.2 Cost

| Service                    | Cost                      |
| -------------------------- | ------------------------- |
| Firebase Cloud Messaging   | Free (unlimited messages) |
| Supabase Database Webhooks | Included in plan          |
| Supabase Edge Functions    | 500K free/mo              |

**Total push notification cost: $0** for reasonable scale.

### 6.3 Implementation Sketch

```typescript
// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const { record } = await req.json(); // Database webhook payload

  // Get user's FCM token from profiles table
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("fcm_token, push_enabled")
    .eq("user_id", record.user_id)
    .single();

  if (!profile?.push_enabled || !profile?.fcm_token) {
    return new Response("Push disabled", { status: 200 });
  }

  // Send via FCM
  await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${Deno.env.get("FCM_SERVER_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: profile.fcm_token,
      notification: {
        title: `New Checkout - ${record.bot_name}`,
        body: `${record.product} - Size ${record.size} - $${(record.price / 100).toFixed(2)}`,
      },
    }),
  });

  return new Response("Sent", { status: 200 });
});
```

---

## 7. Supabase Schema

### 7.1 Tables

```sql
-- User webhook tokens
CREATE TABLE webhook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  label TEXT, -- "My Cybersole", "Valor Bot"
  discord_forward_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Checkout events (from webhooks, stored temporarily unencrypted)
CREATE TABLE checkout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL,
  product TEXT NOT NULL,
  sku TEXT,
  size TEXT,
  price INTEGER, -- cents
  store TEXT NOT NULL,
  profile TEXT,
  proxy TEXT,
  order_number TEXT,
  mode TEXT,
  checkout_time TEXT,
  image_url TEXT,
  email TEXT,
  quantity INTEGER DEFAULT 1,
  success BOOLEAN DEFAULT true,
  extras JSONB DEFAULT '{}',
  raw_payload JSONB NOT NULL,
  synced BOOLEAN DEFAULT false, -- true once desktop app has pulled & encrypted
  received_at TIMESTAMPTZ DEFAULT now()
);

-- Encrypted sync items (all user data)
CREATE TABLE sync_items (
  id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL, -- 'inventory', 'transactions', 'profiles', etc.
  encrypted_data TEXT NOT NULL, -- AES-256-GCM encrypted JSON blob
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (id, user_id)
);

-- User profile/settings (non-sensitive, unencrypted)
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  public_key TEXT, -- For future asymmetric webhook encryption
  fcm_token TEXT, -- For push notifications
  push_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_checkout_events_user ON checkout_events(user_id, received_at DESC);
CREATE INDEX idx_checkout_events_unsynced ON checkout_events(user_id) WHERE synced = false;
CREATE INDEX idx_sync_items_user ON sync_items(user_id, updated_at DESC);
CREATE INDEX idx_webhook_tokens_token ON webhook_tokens(token);
```

---

## 8. Cost Summary

### Monthly costs at different scales

| Scale                        | CF Worker | Supabase                | FCM | Total         |
| ---------------------------- | --------- | ----------------------- | --- | ------------- |
| **Dev/testing** (10 users)   | $0        | $0 (free)               | $0  | **$0**        |
| **Early launch** (100 users) | $0        | $0 (free)               | $0  | **$0**        |
| **Growth** (500 users)       | $0        | $25 (Pro, for Realtime) | $0  | **$25/mo**    |
| **Scale** (1000 users)       | $5        | $25                     | $0  | **$30/mo**    |
| **Big scale** (5000 users)   | $5        | $25+ overage            | $0  | **$35-50/mo** |

At $5/user/month revenue:

- 100 users = $500/mo revenue, $0 infra cost
- 1000 users = $5000/mo revenue, $30 infra cost (99.4% margin)

---

## 9. Implementation Priority

1. **Phase 1 - Webhook Proxy** (Week 1)
   - Cloudflare Worker with token validation
   - Discord payload parsing + normalization
   - Supabase table setup + RLS
   - Desktop app UI to generate/manage webhook URLs

2. **Phase 2 - Realtime Push** (Week 1-2)
   - Supabase Realtime subscription in desktop app
   - OS notifications via Tauri on new checkouts
   - Checkout feed UI

3. **Phase 3 - Cloud Sync** (Week 2-3)
   - Master password + PBKDF2 key derivation
   - Encrypt/decrypt utilities
   - Incremental sync (push + pull)
   - Offline queue

4. **Phase 4 - Polish** (Week 3-4)
   - Discord forwarding
   - Sync status indicators
   - Conflict resolution edge cases
   - Rate limiting

5. **Phase 5 - Push Notifications** (Future)
   - FCM setup
   - Edge Function trigger
   - Mobile app integration

---

## Sources

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase + Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Discord Webhook Documentation](https://discord.com/developers/docs/resources/webhook)
- [Discord Webhooks Guide](https://birdie0.github.io/discord-webhooks-guide/)
- [Tauri + Next.js Setup](https://v2.tauri.app/start/frontend/nextjs/)
- [AES-GCM PBKDF2 TypeScript Implementation](https://gist.github.com/mrdarrengriffin/7e0046031e46adbe9a1b40566534c300)
- [Supabase Push Notifications with FCM](https://supabase.com/docs/guides/functions/examples/push-notifications)
- [Firebase Cloud Messaging Pricing](https://firebase.google.com/pricing)
- [PowerSync + Supabase Offline-First](https://www.powersync.com/blog/offline-first-apps-made-simple-supabase-powersync)
- [SQLiteSync CRDT](https://github.com/sqliteai/sqlite-sync)
- [Supabase CDC Options Comparison](https://www.stacksync.com/blog/supabase-cdc-options-triggers-webhooks-realtime-compared)
- [Supabase Pricing Breakdown (metacto)](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)
- [hyra-io Discord Webhook Proxy](https://github.com/hyra-io/Discord-Webhook-Proxy)
