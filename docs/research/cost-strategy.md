# Infrastructure Cost Strategy

**Date:** 2026-05-04
**Purpose:** How to keep BottingOS infra cost low enough to support a $3-5/mo subscription price across the entire user-count range from 1 to 50k. Defines when to stay on managed services and when to migrate, with concrete trigger criteria.

---

## 1. Why this matters

Pricing target is $3-5/mo, which is intentionally low. At those prices, every dollar of infra cost compresses margin fast. The architectural call we already made - desktop-heavy app with the cloud as a thin relay between desktop and mobile - is the single biggest cost win available. This doc covers the optimization levers on top of that and the migration trigger points.

## 2. Per-user volume estimate

Conservative estimate for a power user (5 paid cook groups, full Discord capture, mobile push enabled):

| Item | Volume per user per month |
|---|---|
| Encrypted message uploads | ~1.5M (50k/day × 30) |
| Realtime broadcasts | ~1.5M |
| Edge Function invocations | ~1.5M |
| Stored ciphertext | ~500MB - 1GB / year |
| Egress (mobile pulls + push) | ~200MB / month |

Most users will be lighter than this. Assume the heavy-user numbers when budgeting.

## 3. Supabase cost reality at each scale

| Users | Monthly Supabase cost | Per-user cost | Tier |
|---|---|---|---|
| 1 | $0 | $0 | Free |
| 10 | ~$25 | $2.50 | Pro |
| 100 | ~$75-100 | $0.75-1.00 | Pro + overages |
| 1,000 | ~$300-500 | $0.30-0.50 | Pro + heavy overages |
| 10,000 | ~$1.5k-3k | $0.15-0.30 | Team ($599) + overages |
| 50,000 | ~$3k-8k | $0.06-0.16 | Self-host or Enterprise |

At $3/mo subscription pricing, infra is **1-15% of revenue across the entire range**. Healthy. The infra problem is not real until past 10k users.

## 4. The break-even rule for self-hosting

> Don't self-host until your monthly Supabase bill exceeds (your hourly rate × 5) + a comfort margin.

Self-hosting takes ~5 hours/month of real ops work: patches, backup verification, monitoring, the occasional 3am Postgres OOM. If your time is $50/hr, that's $250/mo of *your* time. Paying Supabase $25-500/mo to make this disappear is a bargain below ~2k-5k paying users.

## 5. Migration path (when the time comes)

Ranked by best fit for BottingOS. **AWS is not on this list** - RDS minimum spend is $13/mo for the smallest box and climbs fast, Aurora Serverless v2 floor is ~$45/mo just to keep a DB alive, Lambda cold-starts hurt push latency. AWS makes sense when you have a procurement department, not when you're trying to keep prices low.

### Tier 1: Self-hosted Supabase on Hetzner

Same Docker stack Supabase publishes (`supabase/supabase` repo). You get Postgres + GoTrue + Realtime + PostgREST + Edge Runtime on dedicated hardware.

- **Hetzner CCX23**: 4 dedicated vCPU, 16GB RAM, 160GB NVMe = $32/mo. Serves 5k-15k users.
- **Two CCX23 + load balancer (HA)**: ~$80/mo. Serves 10k-50k users.
- **Backups**: Backblaze B2 at $0.005/GB. Even 100GB of backups = $0.50/mo.
- **Total for 10k users**: ~$100-150/mo. Versus $1.5k+ on Supabase Pro at the same scale.

Trigger to migrate: Supabase bill exceeds $400/mo for 3 consecutive months AND you have at least 5h/mo of ops bandwidth.

### Tier 2: Cloudflare D1 + Workers + Durable Objects + Queues

Stupid cheap at scale. The CF Worker is already in your stack.

- D1 (SQLite-based): $5/mo flat for first 25 billion reads, $0.001/million writes. Up to 10GB DB free.
- Workers: $5/mo + $0.30 per million requests after 10M.
- Durable Objects: ~$0.15 per million requests, plus minor compute.
- Queues: $0.40 per million operations.

Catch: D1 is SQLite. No Postgres extensions, no `pgvector`, no `pg_cron`. RLS doesn't exist (you enforce in Worker code). Migrating off Supabase = re-write of schema and access layer. Not free.

Trigger to consider: you're already paying for CF Workers heavily and Supabase is hurting on egress.

### Tier 3: Fly.io / Railway / Render with managed Postgres

- $20-50/mo for compute + managed Postgres. Serves 3k-10k users.
- Less ops than Hetzner, more cost. Middle ground.
- Useful if you want managed Postgres without Supabase's pricing curve.

Trigger to consider: you want to stop using Supabase but don't want to manage Postgres yourself.

## 6. The six optimization levers (do these first, before any migration)

These keep you on Supabase Pro ($25/mo) until ~1k users.

### 6.1 Batch message uploads

Desktop captures in real time. Uploads in batches every 2-5 seconds. Cuts insert + Realtime broadcast count by ~10x with negligible UX impact (push latency is ~1-3s anyway, this lives inside that envelope).

Implementation: queue captured messages in a Drizzle write-buffer table on desktop. Tauri command flushes the buffer every N seconds via a single bulk insert.

### 6.2 Egress is the killer, not storage

Mobile pulls **deltas only** (`GET /messages?since=<ts>` on foreground). Never full lists. Already in the architecture - enforce it.

Cloudflare Worker can cache identical query responses for 60 seconds before hitting Supabase. At scale this halves DB read volume.

### 6.3 Aggressive retention

30-90 day rolling window in Supabase. Older messages either:
- Deleted (cook group alerts have a half-life of hours; nobody needs day-90 alerts)
- Archived to user's local SQLite only (free, infinite retention)
- Pushed to user-paid cold storage (S3 / B2 from their own account, costs you nothing)

Implement as a `pg_cron` job that runs nightly and deletes `WHERE created_at < now() - interval '30 days'`.

### 6.4 Compress before encrypt

Discord messages are short text + repetitive JSON structure. Run zstd before AES.

- Typical compression ratio: 3-5x
- Cuts storage 3-5x, cuts egress 3-5x, doesn't affect encryption strength
- Cost: ~10ms CPU on desktop per message. Negligible.

Implementation: `zstd.compress(plaintext) -> aes_gcm.encrypt(compressed) -> upload`.

### 6.5 Cloudflare Worker as ingress hop

Already in stack. Use it as the only path from desktop into Supabase. The Worker:

- Rate limits per user (10 batches/sec ceiling)
- Dedupes by `content_hash` against a 60-second sliding window in KV
- Rejects malformed payloads before they hit Supabase ingress
- Can transparently buffer during Supabase outages and replay

Worker requests are 10x cheaper than Supabase ingress and 100x cheaper than Edge Function invocations.

### 6.6 Don't broadcast Realtime when nobody's listening

Mobile reports its foreground state to Supabase via a `presence` table. Edge Function checks: if no device is foregrounded for this user, skip the Realtime publish entirely and go straight to push. Saves Realtime message count, which is the most expensive metered unit.

Implementation: add `last_foregrounded_at` column on `push_tokens`. Insert trigger checks it, branches.

## 7. Pricing implications

At $3/mo (App Store-eligible):
- Apple IAP path nets ~$2.10-2.55 per user
- Direct Stripe / Paddle on web nets ~$2.60-2.85
- See `monetization-app-store.md` for the path that nets you the most

At 1k users with all 6 optimization levers in play:
- Revenue: $2,600-3,000/mo
- Infra: ~$25-75/mo
- Margin: ~95%

At 10k users on self-hosted Hetzner:
- Revenue: $26k-30k/mo
- Infra: ~$100-200/mo
- Margin: ~99%

The margin is fine. **Stop optimizing infra; spend the energy on support, acquisition, and the desktop app's quality.** Infra is not the constraint.

## 8. The "don't migrate yet" red flags

If you find yourself doing any of these, you're optimizing prematurely:

- Migrating off Supabase before you have 500+ paying users
- Building your own Realtime / WebSocket fan-out instead of using a managed one
- Self-hosting Postgres "for control" without a specific feature you need that managed Postgres doesn't have
- Switching to AWS because "AWS is enterprise-grade"
- Setting up Kubernetes for any reason at any scale below 50k users

Each of these costs more in your time than it saves in cloud bills. Resist.

## 9. Sources and reference

- Supabase pricing: <https://supabase.com/pricing>
- Hetzner Cloud pricing: <https://www.hetzner.com/cloud>
- Cloudflare Workers + D1 pricing: <https://developers.cloudflare.com/workers/platform/pricing/>
- Self-host Supabase: <https://supabase.com/docs/guides/self-hosting>
- Backblaze B2 vs S3 pricing: <https://www.backblaze.com/cloud-storage/pricing>
- Fly.io pricing: <https://fly.io/docs/about/pricing/>
- Companion: `mobile-architecture.md` for transport choice and encryption strategy that drives these volume numbers.
