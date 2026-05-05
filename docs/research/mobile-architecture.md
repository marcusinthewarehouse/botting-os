# Mobile Architecture - Desktop to Phone Pipeline

**Date:** 2026-05-04
**Purpose:** How the BottingOS mobile app receives Discord messages (and other deal alerts) captured locally on the user's desktop, and how push notifications are delivered when the phone is locked.
**Scope:** Architecture decision, transport choices, encryption strategy, latency budget, cost model, mobile stack pick. Implementation details for individual subsystems live in their own research docs.

---

## 1. The problem

The desktop app (Tauri) captures Discord messages locally via Chrome DevTools Protocol attached to the user's own Discord client. Messages never touch a server in that flow - it is purely localhost.

For the mobile app to be useful, those messages have to reach the phone in real time, *and* the phone has to receive a push notification when the app is not in the foreground. That requires a server in between. The architecture question is: what server, what transport, how much trust does it hold, and how do we keep ban risk and privacy intact.

The constraint that drives every other decision: **cook group messages are paid content the user does not own redistribution rights to**. The architecture must minimize who and what can read the message body in transit and at rest.

---

## 2. Recommended architecture

```
Desktop (Tauri, CDP capture)
    │
    │  encrypted message blob + plaintext metadata (channel, timestamp, hash)
    ▼
Supabase Postgres (messages table)
    │  insert trigger
    ├──► Supabase Realtime  ──► Mobile (foregrounded, sub-second)
    └──► Edge Function ──► Expo Push ──► APNs / FCM ──► Mobile (backgrounded, 1-3s)
```

The user is in the loop on both ends. The middle is dumb relay.

### Why Supabase and not a custom server

Supabase is already in the v2 stack. It already gives you:

- Postgres for message history and per-user state.
- Realtime: a managed Phoenix-Channels WebSocket fan-out keyed off `INSERT` and `UPDATE` on a table. The mobile app subscribes to the user's row stream and gets pushes in <100ms.
- Edge Functions: Deno runtime that fires on Postgres webhooks. We use one to call the push provider whenever a new message lands.
- Row-Level Security: each user can only read their own rows. Cook groups are isolated per-account by default.

Spinning up Express + Socket.io + Redis to do the same thing buys nothing and adds an ops surface. Skip it.

### Why not just Cloudflare Workers + Durable Objects

The existing `workers/webhook-proxy/` Worker is great as an ingress hop (rate limiting, IP gating, batching writes into Supabase). But Workers + Durable Objects as the *primary* fan-out means writing your own connection management, your own ack/replay protocol, and your own cross-region routing. Supabase Realtime already does that. Use the Worker as ingress only.

### Why not run a VPS

Cost, ops, and zero added capability. The 77.42.83.74 box already exists for the WAOS deal engine - co-locating BottingOS message routing on it would couple two unrelated products. Don't.

---

## 3. Privacy and the encryption decision

There are two paths. **Pick the second one.**

### Option A: plaintext in Supabase

Desktop POSTs the raw message body. Supabase encrypts at rest, TLS in transit, RLS keeps users in their own lane. Easy. Fast.

What this costs you:

- BottingOS the company can technically read every cook group message. So can Supabase staff, in principle, and so can anyone with leaked DB credentials.
- Cook group operators have a real lever if they ever notice: "you are storing our paid content on your servers." Not a TOS violation against the user (Discord), but a civil-claim risk against the operator (you).
- If the DB ever leaks, every cook group's monitor output for every user is in the dump.
- You become a "trust me with your paid content" SaaS, which is a hard sell and a soft target.

### Option B: client-side encrypted blobs (recommended)

Desktop encrypts the message body with a user-held key before upload. Server stores ciphertext + plaintext metadata (channel id, timestamp, content hash for dedup, length, tags). Mobile holds the same key (synced via the existing `cryptoService` vault flow) and decrypts locally.

What this gives you:

- Server cannot read message bodies. Period.
- A breach exposes ciphertext, channel ids, and timestamps - bad but not catastrophic.
- You can truthfully say "we never see your cook group content."
- It is a feature, not a tax. Other cook-group monitor tools don't do this.

What it costs you:

- Push notification bodies cannot include the message text - the push provider would see plaintext. So push is `"New deal in <Channel name>"` and a tap-to-decrypt on the device. This is acceptable; arguably better, because lock-screen previews of cook-group alerts are a leak vector anyway (someone glances at your phone, sees the SKU).
- Mobile and desktop need the same key. The vault flow already exists in v2 (`cryptoService`) - reuse it. Pair-and-sync via QR code on first mobile install, key stored in Keychain (iOS) / Keystore (Android).
- Server-side filtering (e.g. "only push for messages mentioning Pokemon") has to happen client-side on the desktop *before* upload, or via plaintext metadata tags the desktop attaches. Tag generation happens during capture, before encryption.

### Schema sketch

```sql
create table messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  source          text not null,                -- 'discord' | 'whatsapp' | 'webhook'
  channel_id      text not null,                -- plaintext, used for routing/UI
  channel_name    text not null,                -- plaintext, used in push body
  content_hash    text not null,                -- sha256 of plaintext, for dedup
  content_cipher  bytea not null,               -- encrypted message body
  content_iv      bytea not null,               -- per-message IV
  tags            text[] default '{}',          -- plaintext, e.g. ['pokemon','target']
  priority        smallint default 0,           -- plaintext, drives push behavior
  captured_at     timestamptz not null,
  created_at      timestamptz default now()
);
create unique index on messages (user_id, content_hash);  -- dedup
create index on messages (user_id, created_at desc);
alter table messages enable row level security;
create policy own_rows on messages for all using (user_id = auth.uid());
```

`tags` and `priority` are computed by the desktop during capture so the server can route push notifications without seeing message content.

---

## 4. Transport: Realtime + Push (and only those two)

The mobile app uses two transports, picked automatically by app state:

| App state | Transport | What you get |
|---|---|---|
| Foregrounded | Supabase Realtime WebSocket | Sub-second message delivery, full message stream, decrypted in-app instantly |
| Backgrounded / locked | Expo Push -> APNs (iOS) / FCM (Android) | Tap-to-open notification with channel name. App fetches new rows on foreground via REST. |
| Cold-launched after offline period | REST `GET /messages?since=<ts>` | Catch up on missed messages. |

**Anti-pattern to avoid:** running both a Realtime WebSocket *and* polling *and* a separate WebSocket to the Cloudflare Worker simultaneously "as backup." Pick one realtime transport (Realtime), trust it, use REST polling only for offline catchup. More transports = more bugs, more battery drain, more places where dedup goes wrong.

### Push delivery

Edge Function fires on insert into `messages`:

```ts
// supabase/functions/notify/index.ts
import { serve } from 'std/http/server.ts'
serve(async (req) => {
  const { record } = await req.json()
  const { user_id, channel_name, priority, tags } = record

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_token, mute_tags, min_priority')
    .eq('user_id', user_id)

  for (const tok of tokens) {
    if (tok.min_priority > priority) continue
    if (tok.mute_tags?.some(t => tags.includes(t))) continue
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: tok.expo_token,
        title: `${channel_name}`,
        body: 'New deal alert',           // no message body, by design
        data: { messageId: record.id },   // app fetches and decrypts on tap
        priority: priority >= 2 ? 'high' : 'default',
        sound: priority >= 2 ? 'default' : null,
      }),
    })
  }
  return new Response('ok')
})
```

Per-token mute and priority filters live on the server because they have to act when the device is asleep. Content filtering ("does this message contain a Pokemon SKU") happens on the desktop pre-upload; only the resulting `tags` and `priority` cross the wire in plaintext.

---

## 5. Mobile stack pick

**Expo + React Native + TypeScript.**

- Reuses the TypeScript / React skill set already in v2.
- Expo Push is the least-bad cross-platform push abstraction available. Direct APNs+FCM is a real time sink and nobody on a one-person team should write that twice.
- Expo Application Services (EAS) handles iOS/Android builds without a Mac in the loop for Android, and without Xcode for OTA JS updates.
- OTA updates ship fixes without app store roundtrips - critical when Discord ships a desktop update that breaks CDP capture and you need to push a fix the same day.
- Expo SecureStore wraps Keychain/Keystore for the encryption key.

Skip:

- **Bare React Native.** No reason to give up Expo.
- **Flutter / Kotlin Multiplatform / Swift+Kotlin native.** Different language, no skill reuse, no offsetting benefit.
- **Capacitor / PWA wrapping the existing Next.js app.** Push notifications on iOS PWAs are still half-broken in 2026 and background processing is worse. Not worth the maintenance saving.

### Mobile app responsibilities

- Maintain a single Realtime subscription while foregrounded.
- Cache the last 30 days of decrypted messages in SQLite (Expo SQLite or `op-sqlite`) so the app is useful offline.
- Decrypt with the synced vault key on display.
- Honor per-channel mute / priority settings (also stored server-side so push respects them).
- One-shot pairing flow: scan QR code on the desktop app, exchange the encryption key over an ephemeral channel, store in SecureStore.

---

## 6. Latency budget

End-to-end from "Discord receives message" to "phone alerts user":

| Hop | Time |
|---|---|
| Discord Gateway -> Discord renderer -> Tauri via CDP | ~10ms |
| Tauri encrypts, POSTs to Supabase via Cloudflare Worker | ~80-150ms |
| Postgres insert + Realtime broadcast -> mobile (foregrounded) | ~50-100ms |
| Insert -> Edge Function -> Expo Push -> APNs/FCM -> device (backgrounded) | ~500ms - 2s |

**Foregrounded total: <300ms.** Competitive with native cook-group monitor apps.
**Backgrounded total: 1-3s.** Bottlenecked by APNs/FCM, not by your code. There is no faster path; even native push providers feed through the same OS push pipes.

If you ever need <500ms backgrounded, you have to keep a persistent connection alive on the device. iOS makes that essentially impossible without VoIP push abuse, which is a separate fight. Don't go there for a v1.

---

## 7. Cost model

Single user, ~5 paid cook groups, conservative estimate:

| Item | Volume | Tier needed |
|---|---|---|
| Postgres rows / month | ~1.5M (50k msgs/day x 30) | Free (500MB DB, ~3M rows) |
| Realtime messages / month | ~3M | Pro ($25/mo, 5M included) |
| Edge Function invocations / month | ~1.5M | Pro (2M included) |
| Storage | ~500MB / year | Free tier covers year one |
| Expo Push notifications | ~50k / month | Free (Expo doesn't bill for push) |

So: **free for the author's personal use, ~$25/mo per power user past free tier.** This sets a floor on the BottingOS subscription price - bake it into pricing.

Cloudflare Worker ingress is essentially free at this volume (10M requests/day on free tier).

---

## 8. Pairing flow (desktop <-> mobile key handoff)

This is the only friction point in onboarding. Get it right.

```
Desktop (already vaulted, has key K)
    │
    │  generates 6-digit code + ephemeral pubkey
    │  shows QR encoding {code, pubkey, supabase project}
    ▼
Mobile app on first install
    │  scans QR
    │  derives shared secret via ECDH with the pubkey
    │  authenticates to Supabase using the 6-digit code (one-time)
    │  receives K encrypted under shared secret
    │  stores K in Expo SecureStore
    ▼
Both sides now hold K. No future server roundtrip needed for the key.
```

Falls back to typing the 6-digit code if QR scanning fails. Code expires in 5 minutes. Single-use.

---

## 9. Where this slots into the build plan

- **Phase 4-5:** Desktop captures messages and writes to local Drizzle. (existing tasks)
- **Phase 6 (new):** Desktop encrypts + uploads to Supabase. Schema and Edge Function deployed.
- **Phase 7 (new):** Mobile app shell, Realtime subscription, decrypt + display.
- **Phase 8 (new):** Pairing flow, push tokens, per-channel mute/priority settings.
- **Phase 9:** OTA pipeline via EAS, App Store + Play Store submission.

Estimated mobile build: ~3-4 weeks for a single developer who already knows React. Most of that is the pairing flow, push notification edge cases, and store submission, not the core sync.

---

## 10. What this does *not* do

- **No multi-device same-user sync beyond two devices** (desktop + one phone) for v1. Adding tablets / second phones means key rotation on every device add and a more complex pairing tree. Defer.
- **No web mobile.** Push notifications on iOS web are a swamp. The native app is the mobile story.
- **No browser-extension capture path** - we already picked CDP capture in `discord-realtime-capture.md`. The mobile architecture is identical regardless of which capture method desktop uses.
- **No collaboration / shared channels between users.** That changes the encryption model entirely (shared keys per channel) and is a separate v2.

---

## 11. Sources and prior art

- Supabase Realtime docs: <https://supabase.com/docs/guides/realtime>
- Supabase Edge Functions Postgres webhooks: <https://supabase.com/docs/guides/database/webhooks>
- Expo Push Notifications: <https://docs.expo.dev/push-notifications/overview/>
- Expo SecureStore: <https://docs.expo.dev/versions/latest/sdk/securestore/>
- Cross-device key pairing via QR: Signal's "Linked Devices" flow is the reference design.
- Threat model parallels: client-side-encrypted messengers (Signal, Wire) for the "server is dumb relay" pattern; Standard Notes for end-to-end-encrypted notes sync.
