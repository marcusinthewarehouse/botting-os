import { createClient } from '@supabase/supabase-js';
import type { Env, DiscordWebhookPayload, WebhookTokenRow } from './types';
import { parseWebhook } from './parsers';

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(token: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(token);

  if (!entry || now >= entry.resetAt) {
    rateLimits.set(token, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const handler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (request.method === 'GET' && url.pathname === '/') {
      return jsonResponse({ status: 'ok', version: '1.0.0' }, 200);
    }

    // Only POST for webhooks
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Extract token from path
    const pathMatch = url.pathname.match(/^\/v1\/webhooks\/([a-zA-Z0-9_-]+)$/);
    if (!pathMatch) {
      return new Response('Not found', { status: 404 });
    }

    const token = pathMatch[1];

    // Rate limiting
    if (isRateLimited(token)) {
      return new Response('Rate limit exceeded', { status: 429 });
    }

    // Validate token against Supabase
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: tokenRow } = await supabase
      .from('webhook_tokens')
      .select('user_id, discord_forward_url, is_active')
      .eq('token', token)
      .single<WebhookTokenRow>();

    if (!tokenRow || !tokenRow.is_active) {
      return new Response('Invalid webhook token', { status: 401 });
    }

    // Parse payload
    let payload: DiscordWebhookPayload;
    try {
      payload = await request.json() as DiscordWebhookPayload;
    } catch {
      return new Response('Bad request: invalid JSON', { status: 400 });
    }

    if (!payload.embeds?.length) {
      return new Response('Bad request: no embeds found', { status: 400 });
    }

    // Parse checkout event
    const checkoutEvent = parseWebhook(payload, tokenRow.user_id);

    // Insert into Supabase
    const { error } = await supabase.from('checkout_events').insert(checkoutEvent);
    if (error) {
      console.error('Supabase insert error:', error);
      return new Response('Internal error', { status: 500 });
    }

    // Update last_used_at (fire and forget)
    supabase
      .from('webhook_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token', token)
      .then(() => {});

    // Forward to Discord (fire and forget)
    if (tokenRow.discord_forward_url) {
      fetch(tokenRow.discord_forward_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    return new Response(null, { status: 204 });
  },
};

export default handler;
