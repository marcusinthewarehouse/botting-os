# BottingOS

Cross-platform desktop operations dashboard for sneaker / retail / TCG botters. Manages accounts, proxies, orders, profit tracking, virtual cards, and Discord cook group messages in one app.

> **Status:** v2 in active development. Tauri shell, Next.js 16 UI, Drizzle + SQLite local store, Supabase cloud sync, Discord CDP capture in progress. The previous `main` (v1 web mockup) is preserved on the `legacy/v1-mockup` branch.

## Read this before building

The full design - PRD, phased plan, deep technical research on every hard subsystem (Discord local capture, Tauri/Next/Drizzle, marketplace and pricing APIs, AYCD ecosystem, Supabase sync, UI/UX), and 42 sharded task files - lives in [`docs/`](./docs/README.md).

If you are an AI coding assistant (Codex, Claude, Cursor): start with [`docs/README.md`](./docs/README.md), then [`docs/PRD.md`](./docs/PRD.md), then dive into [`docs/research/`](./docs/research/) for whichever subsystem you are touching.

## Stack

- **Desktop shell:** Tauri 2 (Rust). See `src-tauri/`.
- **UI:** Next.js 16 (static export), React 19, TypeScript, Tailwind. See `src/`.
- **Local store:** Drizzle ORM + SQLite. Repositories in `src/lib/db/repositories/`.
- **Cloud sync:** Supabase (Postgres + Realtime + Edge Functions). Migrations in `supabase/`.
- **Webhook ingestion:** Cloudflare Worker proxy. See `workers/webhook-proxy/`.
- **Tests:** Vitest.

## Getting started

```bash
# install
npm install

# web-only dev (Next.js on http://localhost:3000)
npm run dev

# full desktop dev (Next.js + Rust)
npx tauri dev

# type check
npx tsc --noEmit

# unit tests
npx vitest run

# production build
npm run build && npx tauri build
```

Workers (webhook proxy) live in `workers/webhook-proxy/` with their own `package.json`.

## Repo layout

```
src/                  Next.js app (React + Tailwind)
  app/                routes (App Router, static export)
  components/         UI primitives
  lib/db/             Drizzle schema + repositories
  services/           cross-cutting domain services (Discord, vault, pricing)
src-tauri/            Rust desktop shell
  src/                Tauri commands, CDP client, system integration
supabase/migrations/  cloud schema + RLS policies
workers/webhook-proxy/  Cloudflare Worker that ingests Discord/marketplace webhooks
public/               static assets
docs/                 PRD, phased plan, research, sharded tasks (READ FIRST)
```

## Project rules (non-negotiable)

- **No em dashes** anywhere - use hyphens or " - ".
- **Dark theme only.** Background `#09090B` (zinc-950), surfaces zinc-900/800, accent amber-500.
- **Numbers/prices** always `font-mono tabular-nums`.
- **Loading states** - skeleton components, never spinners.
- **DB access** always through repositories in `src/lib/db/repositories/` - never query Drizzle directly from a page component.
- **Vault data** - always encrypt before write, decrypt on read via `cryptoService`.
- **Tauri invoke** - always lazy import: `const { invoke } = await import('@tauri-apps/api/core')`.
- **No Prisma. No Server Components. No API Routes.** Static export only.

## License

Private project. Contact the author before redistributing.
