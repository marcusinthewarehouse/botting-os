# BottingOS - Project Context

This folder is the full design/research/planning context for BottingOS. It was generated during deep planning sessions and is the source of truth for *what* the product is, *why* each piece exists, and *how* the hard parts (Discord capture, Tauri desktop shell, marketplace pricing, AYCD ecosystem, etc.) are intended to work.

If you are an AI coding assistant (Codex, Claude, Cursor, etc.) - read this folder before touching code. Start with `PRD.md`, then skim `PHASES.md`, then dive into `research/` for whichever subsystem you are working on.

---

## Read order

1. `PRD.md` - product requirements. What we are building, for whom, and why. Start here.
2. `DISCOVERY.md` - open questions and decisions captured during planning.
3. `PHASES.md` - phased build plan. Maps features to delivery milestones.
4. `PROGRESS.md` - current state. What is built, what is in flight, what is next.
5. `ORCHESTRATOR_PROMPT.md` - the prompt used to drive the planning agent. Useful background, not required reading.
6. `braindump-full.txt` - long unstructured brain dump. Raw source material.
7. `braindump-orchestration.txt` - condensed brain dump that fed the orchestration agent.
8. `featurelist.txt` - flat list of every feature considered.

## Subsystem deep dives - `research/`

Each file is a multi-thousand-line technical investigation with code samples and tradeoff analysis. Open the one that matches the subsystem you are touching.

- `discord-realtime-capture.md` - 9 approaches to reading Discord messages locally, scored. Recommends Electron CDP path.
- `discord-cdp-implementation.md` - Rust/Tauri implementation of the CDP approach. Connection, Flux dispatcher hooks, reconnect logic.
- `discord-integration.md` - higher-level Discord integration tradeoffs (bot API vs selfbot vs CDP).
- `discord-tos-safe-approaches.md` - ToS and ban-risk analysis for each capture method.
- `tauri-nextjs-drizzle-implementation.md` - desktop shell architecture. Tauri + Next.js + Drizzle + SQLite. Build, sign, ship.
- `desktop-app-architecture.md` - higher-level architectural choices for the desktop app.
- `claude-code-architecture.md` - how the planning/agent layer is structured.
- `webhook-supabase-implementation.md` - cloud sync via Supabase, webhook ingestion, realtime updates.
- `mobile-architecture.md` - desktop -> server -> mobile pipeline. Supabase Realtime + Expo Push, client-side encryption, pairing flow. Read before touching anything cross-device.
- `pricing-apis-implementation.md` - StockX, GOAT, eBay, Pokemon TCG pricing integrations.
- `marketplace-apis.md` - marketplace API survey and selection.
- `aycd-bot-ecosystem.md` - the AYCD ecosystem BottingOS sits next to.
- `aycd-inbox-api.md` - AYCD Inbox integration details.
- `ui-ux-design.md` - design system, color tokens, layout patterns.
- `testing-deployment-implementation.md` - test strategy, CI, release pipeline.

## Sharded tasks - `tasks/`

42 task files (`task-1.1.md` through `task-6.x.md`, plus `task-N.R.md` review files). Numbered by phase. Each is a self-contained implementation unit with acceptance criteria and references to the relevant `research/` doc. Use these as starting prompts for an AI coding agent.

---

## Repository state

`main` holds the v2 codebase: Tauri shell, Next.js 16 UI, Drizzle + SQLite local store, Supabase cloud sync wiring, Cloudflare Worker webhook proxy, Discord CDP integration scaffolding. The original v1 frontend mockup is preserved on the `legacy/v1-mockup` branch if you ever need it.

These docs describe the *intended* full product. The code on `main` is the work-in-progress toward that spec - not every feature in `PRD.md` and `PHASES.md` is implemented yet. Check `PROGRESS.md` for what is actually shipped.
