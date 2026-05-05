# BottingOS - Discovery Document

**Created**: 2026-03-07
**Status**: Complete
**Rounds of Q&A**: 4

---

## 1. Architecture & Platform

**D1: Desktop app or web app?**
A: Desktop app via Tauri v2 wrapping Next.js (static export). Not a website. Users open an app on their computer like any other botting tool.

**D2: Build order - Tauri from day 1 or web first?**
A: Tauri from day 1. No throwaway work. Static export + SQLite/Drizzle from the start.

**D3: Database - Prisma or Drizzle?**
A: Drizzle ORM + SQLite. Prisma doesn't work in Tauri builds. Drizzle's sqlite-proxy driver is designed for the Tauri IPC pattern (generate SQL in frontend, execute via Tauri Rust backend).

**D4: Auth and security - how to handle sensitive data?**
A: Master password on app launch (like Bitwarden). All data encrypted locally with AES-256-GCM derived from master password. Cloud sync via Supabase for cross-device access (desktop + mobile). Data encrypted client-side before it leaves the device. Supabase stores encrypted blobs.

**D5: How should updates work?**
A: Tauri built-in auto-update. App checks on launch, downloads and installs automatically.

**D6: How to distribute builds for testing?**
A: Zip the .app file, send to friend. Tell them to run `xattr -dr com.apple.quarantine /path/to/app` on Mac. Later: proper code signing.

---

## 2. Feature Scope

**D7: Which features beyond MVP 5 should be in the next release?**
A: ALL free-to-run medium features: Discord CDP monitoring, order tracker (webhooks), inventory manager, analytics dashboard, bot webhook integration, drop calendar. Everything that costs $0 to run.

**D8: Features CUT from scope?**
A: 2FA manager (useless per user), jig tool (AYCD does it), auto email cleanup (AI email filters exist), VCC generator (AYCD does it), cloud sync as separate feature (baked into auth instead), cook group partnerships, group buy hub.

**D9: First testable build for friend?**
A: Core 5 MVP features (calculator, tracker, emails, vault, VCC) polished in Tauri/Drizzle stack PLUS Discord CDP monitoring. Enough to wow the friend.

**D10: Resource hub approach?**
A: Link directory - curated links to best guides from AYCD, Cybersole, cook groups, organized by topic. Legal, no content scraping. Add user tips later.

**D11: AYCD integration?**
A: Two paths:

1. File import for Profile Builder exports (CSV/JSON) - works for all users
2. Optional AYCD Inbox API integration for users who have AYCD ($20-30/mo tool). API key in settings connects to `inbox-api.aycd.io`. Enables auto-capture of order confirmations, shipping notifications, and OTP codes from email. Uses `@aycd-inc/inbox-api-client` npm package. Auth: `Authorization: Token <key>`. Rate limit: 5000 req/min. Inbox desktop app must be running.
   This is a premium integration, not a requirement. Everything works without AYCD.

---

## 3. Discord Integration

**D12: Technical approach for Discord monitoring?**
A: Chrome DevTools Protocol (CDP). BottingOS kills Discord and relaunches with `--remote-debugging-port=9223`. Connects locally, hooks into Discord's Flux dispatcher to capture MESSAGE_CREATE events. Zero ban risk - purely local, no traffic to Discord servers.

**D13: Auto-connect or user-triggered?**
A: Auto-connect on startup. BottingOS checks if Discord is running, restarts it with debug flag automatically. Fully transparent to user.

**D14: What to monitor - all channels or user-selected?**
A: User picks specific channels. For security/privacy reasons, don't read all their messages. Settings page where user selects which servers and channels to monitor.

**D15: How to organize Discord feeds in the UI?**
A: Unified feed with filters. One feed showing all messages from monitored channels. Filter by: server, channel, keyword, category (sneakers/pokemon/etc). Replicate Discord's channel layout on the left side, unified filtered feed on the right.

**D16: Reconnection handling?**
A: BottingOS auto-relaunches Discord with debug flag if connection drops. Health check monitors the connection. No manual restart needed.

**D17: Fallback if CDP fails?**
A: User token Gateway (read-only WebSocket). Auto-extract token from Discord's LevelDB cache. Small TOS risk but proven safe for read-only. Last resort only.

---

## 4. Webhook & Bot Integration

**D18: How should users set up bot webhooks?**
A: Built-in unique webhook URL per user (e.g., hooks.bottingos.app/abc123). User pastes into their bot config (Cybersole, Valor, NSB). Requires a small cloud endpoint.

**D19: How to handle different bot webhook formats?**
A: Discord-compatible webhook proxy. Accept Discord embed format (what all bots send), parse with bot-specific + fuzzy field matching, normalize into standard CheckoutEvent schema. Optionally forward to user's real Discord too.

---

## 5. Marketplace & Pricing

**D20: How to get real-time pricing?**
A: Sneaks-API (free npm package) for StockX/GOAT/FlightClub prices. eBay Browse API (free, 5k req/day) for eBay prices. Total cost: $0.

**D21: Flip calculator - real-time or manual entry?**
A: Real-time prices with manual fallback. Search by product name/SKU, auto-pull current prices. Users can override if needed.

**D22: Fee structures to calculate?**
A: eBay ~14%, StockX ~10-13%, GOAT ~12.4% + flat fee. Detailed breakdowns by seller level/rating.

**D23: Marketplace API integration for auto-tracking sales?**
A: eBay has good API (webhooks for ITEM_SOLD events). StockX has limited official API (25k req/day). GOAT has no official API. Use eBay API for auto-tracking, manual entry for StockX/GOAT sales initially.

---

## 6. Inventory & Tracking

**D24: How should inventory be organized?**
A: Category-based. Organize by type: Sneakers, Pokemon, Funko Pops, Supreme, etc. Filter by category, see totals per category.

**D25: Credit card CSV import approach?**
A: Auto-detect bank format (Chase, Capital One, Citi, Amex) from CSV headers. Fall back to manual column mapping if unknown format. Users manually tag which transactions are botting-related.

---

## 7. Analytics

**D26: Primary analytics metric?**
A: Bot/proxy performance. Success rates per bot (Cybersole vs Valor), per proxy provider, per site. Data without recommendations - let users draw conclusions.

**D27: What else to track?**
A: Profit/ROI over time (secondary). Monthly/weekly charts, ROI per category, running totals.

---

## 8. Drop Calendar

**D28: Where should drop data come from?**
A: All sources - manual entry + community submissions, scrape sneaker sites (Nike SNKRS, Supreme), and parse Discord announcements. Rely less on Discord scraping due to TOS concerns. Multiple data sources for completeness.

---

## 9. Notifications

**D29: What notification systems?**
A: Native OS notifications (via Tauri) plus in-app notification center. Mobile push notifications when mobile app exists. User configures what triggers alerts (restock alerts from Discord, price drops, order updates).

---

## 10. UI & Design

**D30: Brand color and theme?**
A: Amber (#F59E0B) accent on dark theme. Background: #09090B, surfaces: #000000 (0% brightness), text: #FAFAFA, border opacity: 23%. "Linear of botting tools" aesthetic - clean, professional, not gamer/neon.

**D31: Design philosophy?**
A: Apple-level clean. Low friction, beautiful, easy to use. #1 priority per user. Use shadcn/ui with Motion Primitives, Animate UI for polish. Functional animations only (150-200ms transitions). TanStack Table for data-heavy views.

**D32: Onboarding?**
A: 3-step wizard: what do you bot, what tools do you use, import data. Under 5 minutes to productive.

---

## 11. Monetization

**D33: Pricing model?**
A: $1-2/mo flat for everything. Impulse-buy pricing to maximize user acquisition. Target: 10k users. All features free to run (zero per-user cost). Infrastructure costs near $0 through free tiers. Only costs kick in at scale (~$25/mo at 200+ sync users for Supabase pro).

---

## 12. Claude Code Setup

**D34: Formatter?**
A: Prettier (TypeScript/Next.js stack). PostToolUse hook.

**D35: Testing strategy?**
A: Playwright on `next dev` for UI testing (covers ~90% of app). Tauri-specific features need manual smoke tests. Unit tests for data logic (Drizzle queries, fee calculations, encryption).

**D36: Key skills to create?**
A: shadcn-patterns (HIGH), bottingos-data-model (HIGH), tauri-commands (MEDIUM), webhook-testing (MEDIUM).

**D37: Plugins to use during build?**
A: /frontend-design for every UI task. /ralph-loop for iterative polish. /simplify after every task. /superpowers:verification at phase boundaries. /playground for prototyping.
