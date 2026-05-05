# Task 4.1: Cloudflare Worker Webhook Endpoint

## Objective

Deploy a Cloudflare Worker at `hooks.bottingos.app` that receives Discord-format webhook POSTs from sneaker bots, validates the user token, parses the payload using bot-specific parsers (Task 4.2), inserts a normalized CheckoutEvent into Supabase, and optionally forwards to the user's Discord webhook.

## Context

All sneaker bots (Cybersole, Valor, NSB, Wrath, Kodai, etc.) send checkout notifications as Discord webhook POSTs. They don't verify the URL is actually Discord - they just POST JSON to whatever URL the user configures. BottingOS exploits this by providing a webhook URL that looks like `hooks.bottingos.app/v1/webhooks/{user_token}`.

The Worker is the cloud-side entry point. It:

1. Validates the token against Supabase `webhook_tokens` table
2. Delegates parsing to bot-specific parsers (Task 4.2)
3. Inserts the normalized event into Supabase `checkout_events` table
4. Optionally forwards the original payload to the user's real Discord webhook
5. Returns 204 (what Discord expects)

Desktop app picks up new events via Supabase Realtime subscription.

**Cost**: Free tier covers 100K req/day. Paid tier ($5/mo) covers 10M req/mo.

## Dependencies

- Task 4.2 (Bot Webhook Parsers) - parsing logic imported by this Worker
- Task 4.3 (Supabase Schema) - tables must exist before Worker can INSERT

## Blocked By

- Task 4.3 schema must be deployed (tables need to exist)
- Task 4.2 can be developed in parallel (same `workers/` directory), just needs to be importable

## Research Findings

From `webhook-supabase-implementation.md`:

- Worker validates token against `webhook_tokens` table using Supabase service_role key
- Service role key bypasses RLS for INSERTs (Worker is trusted server)
- Returns 204 No Content on success (Discord expects this)
- Rate limiting: 60 webhooks/min per token recommended
- Discord forward is fire-and-forget (don't block on it)
- Update `last_used_at` on the token row

From `aycd-bot-ecosystem.md`:

- All bots POST Discord webhook format (JSON with embeds array)
- URL format: `hooks.bottingos.app/v1/webhooks/{user_token}`
- Bots don't verify the URL is actually Discord

## Implementation Plan

### Step 1: Scaffold Cloudflare Worker project

```bash
mkdir -p workers/webhook-proxy
cd workers/webhook-proxy
npm init -y
npm install wrangler @supabase/supabase-js
npm install -D typescript @cloudflare/workers-types
```

### Step 2: Configure wrangler.toml

```toml
name = "bottingos-webhook-proxy"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[vars]
SUPABASE_URL = "https://your-project.supabase.co"

# Secrets (set via wrangler secret put):
# SUPABASE_SERVICE_ROLE_KEY
```

### Step 3: Define environment types

```typescript
// src/types.ts
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

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
```

### Step 4: Implement main request handler

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Only accept POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // 2. Extract token from path
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/v1\/webhooks\/([a-zA-Z0-9_-]+)$/);
    if (!pathMatch) {
      return new Response("Not found", { status: 404 });
    }
    const token = pathMatch[1];

    // 3. Validate token against Supabase
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const { data: tokenRow } = await supabase
      .from("webhook_tokens")
      .select("user_id, discord_forward_url, is_active")
      .eq("token", token)
      .single();

    if (!tokenRow || !tokenRow.is_active) {
      return new Response("Invalid webhook token", { status: 401 });
    }

    // 4. Parse payload
    let payload: DiscordWebhookPayload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Bad request: invalid JSON", { status: 400 });
    }

    if (!payload.embeds?.length) {
      return new Response("Bad request: no embeds found", { status: 400 });
    }

    // 5. Parse checkout event (from Task 4.2 parsers)
    const checkoutEvent = parseWebhook(payload, tokenRow.user_id);

    // 6. Insert into Supabase
    const { error } = await supabase
      .from("checkout_events")
      .insert(checkoutEvent);
    if (error) {
      return new Response("Internal error", { status: 500 });
    }

    // 7. Update last_used_at
    await supabase
      .from("webhook_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token);

    // 8. Forward to Discord (fire and forget)
    if (tokenRow.discord_forward_url) {
      fetch(tokenRow.discord_forward_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    // 9. Return 204
    return new Response(null, { status: 204 });
  },
};
```

### Step 5: Add rate limiting (per-token)

Simple in-memory rate limiter (resets on Worker cold start, which is fine):

```typescript
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // per minute per token
```

### Step 6: Add CORS headers for health check

```typescript
// GET / returns health status
if (request.method === "GET" && url.pathname === "/") {
  return new Response(JSON.stringify({ status: "ok", version: "1.0.0" }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

### Step 7: Deploy

```bash
cd workers/webhook-proxy
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy
```

Configure custom domain `hooks.bottingos.app` in Cloudflare dashboard.

## Files to Create

- `workers/webhook-proxy/src/index.ts` - main Worker entry point
- `workers/webhook-proxy/src/types.ts` - shared types
- `workers/webhook-proxy/wrangler.toml` - Wrangler config
- `workers/webhook-proxy/package.json` - dependencies
- `workers/webhook-proxy/tsconfig.json` - TypeScript config

## Files to Modify

- None in the main app (this is a separate deployable)

## Contracts

### Provides

**HTTP Endpoint:**

```
POST https://hooks.bottingos.app/v1/webhooks/{token}
  Body: Discord webhook JSON (embeds array)
  Returns: 204 (success), 401 (invalid token), 400 (bad payload), 405 (wrong method), 429 (rate limited)

GET https://hooks.bottingos.app/
  Returns: 200 { status: "ok", version: "1.0.0" }
```

**Side Effects:**

- INSERT into Supabase `checkout_events` table (triggers Realtime for desktop app)
- UPDATE `webhook_tokens.last_used_at`
- Optional: Forward original payload to user's Discord webhook URL

### Consumes

- Task 4.2: `parseWebhook(payload, userId)` function
- Task 4.3: Supabase tables `webhook_tokens`, `checkout_events`
- Supabase service_role key (secret)

## Acceptance Criteria

1. `POST /v1/webhooks/{valid_token}` with Cybersole payload returns 204
2. `POST /v1/webhooks/{invalid_token}` returns 401
3. `POST /v1/webhooks/{valid_token}` with empty body returns 400
4. `GET /` returns 200 health check
5. `PUT /v1/webhooks/{token}` returns 405
6. CheckoutEvent appears in Supabase `checkout_events` table after POST
7. `webhook_tokens.last_used_at` updates after successful POST
8. Discord forward sends original payload to configured URL
9. Rate limiting blocks > 60 requests/min per token (429)
10. Worker cold start < 50ms
11. End-to-end latency < 500ms (POST to Supabase INSERT)

## Testing Protocol

### Unit Tests

- Token validation logic
- Rate limiter logic
- Path parsing (valid/invalid tokens)
- Error responses for each status code

### Browser/Playwright

- N/A (this is a server-side Worker, not a UI)

### Integration Tests (curl)

```bash
# Success
curl -X POST https://hooks.bottingos.app/v1/webhooks/TEST_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"username":"Cybersole","embeds":[{"title":"Successful Checkout","color":65280,"fields":[{"name":"Product","value":"Nike Dunk Low","inline":true},{"name":"Size","value":"10","inline":true},{"name":"Price","value":"$110.00","inline":true},{"name":"Store","value":"Nike US","inline":true}],"footer":{"text":"Cybersole"}}]}'

# Invalid token
curl -X POST https://hooks.bottingos.app/v1/webhooks/INVALID -d '{}'

# Health check
curl https://hooks.bottingos.app/
```

See `.claude/skills/webhook-testing/SKILL.md` for full curl test suite.

### Build Checks

```bash
cd workers/webhook-proxy
npx tsc --noEmit
npx wrangler deploy --dry-run
```

## Skills to Read

- `.claude/skills/webhook-testing/SKILL.md` - mock payloads, curl commands, expected responses

## Research Files to Read

- `.claude/orchestration-bottingos/research/webhook-supabase-implementation.md` - full Worker implementation, Supabase RLS, Realtime flow
- `.claude/orchestration-bottingos/research/aycd-bot-ecosystem.md` - Section 2 (Bot Webhook Formats) for payload structure

## Git

- **Branch**: `feat/4.1-webhook-worker`
- **Commit prefix**: `[webhook]`
