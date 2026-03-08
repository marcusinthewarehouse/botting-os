-- Migration: webhook_tables
-- Creates webhook_tokens and checkout_events tables with RLS and Realtime

CREATE TABLE IF NOT EXISTS webhook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  label TEXT,
  discord_forward_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS checkout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_name TEXT NOT NULL,
  product TEXT NOT NULL,
  sku TEXT,
  size TEXT,
  price INTEGER,
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
  synced BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_tokens_token ON webhook_tokens(token);
CREATE INDEX IF NOT EXISTS idx_webhook_tokens_user ON webhook_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_events_user ON checkout_events(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_events_unsynced ON checkout_events(user_id) WHERE synced = false;
CREATE INDEX IF NOT EXISTS idx_checkout_events_bot ON checkout_events(user_id, bot_name);
CREATE INDEX IF NOT EXISTS idx_checkout_events_received ON checkout_events(received_at DESC);

-- RLS: webhook_tokens
ALTER TABLE webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON webhook_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tokens"
  ON webhook_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON webhook_tokens FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON webhook_tokens FOR DELETE USING (auth.uid() = user_id);

-- RLS: checkout_events
ALTER TABLE checkout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON checkout_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON checkout_events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON checkout_events FOR DELETE USING (auth.uid() = user_id);

-- No INSERT policy - Cloudflare Worker uses service_role key which bypasses RLS

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE checkout_events;

-- Token generation helper
CREATE OR REPLACE FUNCTION generate_webhook_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql;
