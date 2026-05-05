# Task 4.3: Supabase Schema for Webhooks

## Objective

Create Supabase tables for webhook tokens and checkout events with Row-Level Security (RLS), indexes, and Realtime enabled on checkout_events. This is the cloud data layer that bridges the webhook Worker and the desktop app.

## Context

The Cloudflare Worker (Task 4.1) needs to INSERT checkout events and validate webhook tokens. The desktop app (Task 4.4) needs to subscribe to new events via Supabase Realtime. RLS ensures users can only see their own data. The Worker uses the `service_role` key to bypass RLS for INSERTs.

This task is standalone SQL - no application code, just migration files. Can be developed and deployed before or in parallel with the Worker.

## Dependencies

- Supabase project must exist (create via dashboard or CLI)
- Supabase Auth must be enabled (for `auth.users` reference)

## Blocked By

- Nothing - this is foundational and can be built first

## Research Findings

From `webhook-supabase-implementation.md` Section 7 (Supabase Schema):

**Tables needed:**

1. `webhook_tokens` - maps user tokens to user IDs, stores Discord forward URL
2. `checkout_events` - normalized checkout data from all bots

**RLS Strategy:**

- `webhook_tokens`: users can CRUD their own tokens
- `checkout_events`: users can SELECT their own events. Worker INSERTs via service_role (bypasses RLS).

**Realtime:**

- Enable Realtime on `checkout_events` table so desktop app gets instant push on INSERT

**Free tier limits:**

- 500 MB database
- 200 concurrent Realtime connections
- Sufficient for development and early users

## Implementation Plan

### Step 1: Create migration file

```sql
-- supabase/migrations/001_webhook_tables.sql
```

### Step 2: Create webhook_tokens table

```sql
CREATE TABLE webhook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  label TEXT,                              -- "My Cybersole", "Valor Bot"
  discord_forward_url TEXT,                -- optional: forward to user's Discord
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
```

### Step 3: Create checkout_events table

```sql
CREATE TABLE checkout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL,
  product TEXT NOT NULL,
  sku TEXT,
  size TEXT,
  price INTEGER,                           -- cents
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
  synced BOOLEAN DEFAULT false,            -- true once desktop app has pulled
  received_at TIMESTAMPTZ DEFAULT now()
);
```

### Step 4: Create indexes

```sql
CREATE INDEX idx_webhook_tokens_token ON webhook_tokens(token);
CREATE INDEX idx_webhook_tokens_user ON webhook_tokens(user_id);
CREATE INDEX idx_checkout_events_user ON checkout_events(user_id, received_at DESC);
CREATE INDEX idx_checkout_events_unsynced ON checkout_events(user_id) WHERE synced = false;
CREATE INDEX idx_checkout_events_bot ON checkout_events(user_id, bot_name);
CREATE INDEX idx_checkout_events_received ON checkout_events(received_at DESC);
```

### Step 5: Enable Row-Level Security

```sql
-- webhook_tokens: users manage their own tokens
ALTER TABLE webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON webhook_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tokens"
  ON webhook_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON webhook_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON webhook_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- checkout_events: users can read own, Worker inserts via service_role
ALTER TABLE checkout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON checkout_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON checkout_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON checkout_events FOR DELETE
  USING (auth.uid() = user_id);

-- No INSERT policy for checkout_events - Worker uses service_role key which bypasses RLS
```

### Step 6: Enable Realtime on checkout_events

Via Supabase Dashboard: Database > Replication > Enable Realtime on `checkout_events` table.

Or via SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE checkout_events;
```

### Step 7: Create token generation function (optional convenience)

```sql
CREATE OR REPLACE FUNCTION generate_webhook_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql;
```

### Step 8: Deploy migration

```bash
supabase db push
# or
supabase migration up
```

### Step 9: Verify in Supabase dashboard

- Tables visible in Table Editor
- RLS policies active (shield icon)
- Realtime enabled on checkout_events
- Indexes visible in SQL editor

## Files to Create

- `supabase/migrations/001_webhook_tables.sql` - complete migration

## Files to Modify

- None

## Contracts

### Provides

**Tables:**

```
webhook_tokens
  - id: UUID (PK)
  - user_id: UUID (FK auth.users)
  - token: TEXT (UNIQUE, used in webhook URL)
  - label: TEXT (user-friendly name)
  - discord_forward_url: TEXT (optional Discord webhook URL)
  - is_active: BOOLEAN
  - created_at: TIMESTAMPTZ
  - last_used_at: TIMESTAMPTZ

checkout_events
  - id: UUID (PK)
  - user_id: UUID (FK auth.users)
  - bot_name: TEXT
  - product: TEXT
  - sku: TEXT
  - size: TEXT
  - price: INTEGER (cents)
  - store: TEXT
  - profile: TEXT
  - proxy: TEXT
  - order_number: TEXT
  - mode: TEXT
  - checkout_time: TEXT
  - image_url: TEXT
  - email: TEXT
  - quantity: INTEGER
  - success: BOOLEAN
  - extras: JSONB
  - raw_payload: JSONB
  - synced: BOOLEAN
  - received_at: TIMESTAMPTZ
```

**RLS Policies:**

- webhook_tokens: authenticated users CRUD own rows
- checkout_events: authenticated users SELECT/UPDATE/DELETE own rows; INSERT via service_role only

**Realtime:**

- checkout_events: INSERT events broadcast to subscribers filtered by user_id

### Consumes

- Supabase Auth (`auth.users` table for FK reference)
- Supabase service_role key (used by Worker for RLS bypass)

## Acceptance Criteria

1. `webhook_tokens` table created with all columns and constraints
2. `checkout_events` table created with all columns and constraints
3. UNIQUE constraint on `webhook_tokens.token` prevents duplicates
4. FK constraints cascade on user deletion
5. RLS enabled on both tables
6. Authenticated user can SELECT only their own rows
7. Authenticated user cannot SELECT another user's rows
8. Service role can INSERT into checkout_events regardless of user_id
9. Anon key cannot INSERT into checkout_events
10. Realtime subscription fires on checkout_events INSERT
11. Indexes exist and are used by common queries (EXPLAIN ANALYZE)

## Testing Protocol

### Unit Tests

N/A (SQL migration, no application code)

### Integration Tests (Supabase)

```sql
-- Test RLS: as user A, try to select user B's data
-- Should return empty
SELECT * FROM checkout_events WHERE user_id = 'user-b-uuid';

-- Test INSERT via service_role
-- Should succeed
INSERT INTO checkout_events (user_id, bot_name, product, store, raw_payload)
VALUES ('user-a-uuid', 'cybersole', 'Nike Dunk Low', 'Nike US', '{}');

-- Test Realtime: subscribe and INSERT, verify event received
```

### Supabase Dashboard Verification

- [ ] Tables visible in Table Editor
- [ ] RLS enabled (shield icon on both tables)
- [ ] Realtime enabled on checkout_events (Database > Replication)
- [ ] Indexes visible (SQL: `\di` or Table Editor > Indexes)
- [ ] auth.users FK works (try inserting with non-existent user_id - should fail)

### Build Checks

```bash
supabase db push --dry-run  # verify migration syntax
supabase db push            # apply migration
```

## Skills to Read

- None required (pure SQL)

## Research Files to Read

- `.claude/orchestration-bottingos/research/webhook-supabase-implementation.md` - Section 7 (Supabase Schema) for exact table definitions, Section 3.6 (RLS policies)

## Git

- **Branch**: `feat/4.3-supabase-webhook-schema`
- **Commit prefix**: `[schema]`
