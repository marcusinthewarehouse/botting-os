# BottingOS - Product Requirements Document

**Created**: 2026-03-07
**Updated**: 2026-03-07 (expanded from brain dump)
**Status**: Draft
**Source**: 23k-word ChatGPT planning conversation + voice brain dump

---

## 1. Vision

BottingOS is a cross-platform operations management app for sneaker/retail botters. It replaces the patchwork of spreadsheets, Discord channels, and manual tracking that botters use to manage accounts, orders, profits, and virtual credit cards.

While tools like AYCD, Cybersole, Valor, and NSB handle automation, they lack strong organization and financial tracking. BottingOS fills that gap as a "command center" - complementing bots and cook groups, not competing with them. Think of it as the organizational layer that ties everything together.

Target market: ~50k-100k serious botters worldwide, addressable base of 5k-20k paying users. Pricing: $3-5/mo (low friction entry). The key differentiator is an Apple-level UI - easy, clean, low friction compared to AYCD's cluttered interface.

## 2. Existing MVP (Already Built)

The following 5 features have been built with localStorage persistence (no backend yet):

### 2.1 Flip Profit Calculator (built)

- Enter item name/SKU, purchase price, target marketplace(s)
- Calculate profit after fees: eBay (13.25%), StockX (9%+3%), GOAT (9.5%+5%)
- Show ROI, compare across marketplaces side-by-side
- **Brain dump additions**: Need real-time pricing APIs to show current resale prices. Mobile-first for quick in-store checks ("you're at the store and see Pokemon cards - quickly check if profitable")

### 2.2 Basic Profit & Expense Tracker (built)

- Manual entry of purchases and sales
- Track cancellations and refunds
- P&L per item and running totals, CSV export
- **Brain dump additions**: CSV import from credit card statements. Hard to differentiate botting purchases from personal ones on same card. May need manual categorization. API integration with credit card companies unlikely for MVP.

### 2.3 Email & Account Manager (built)

- Bulk import HideMyEmail addresses (paste 750+ at once)
- Organize by iCloud source account
- Tag by website (Target, Walmart, Nike)
- Two views: by email source and by retailer
- **Brain dump additions**: AYCD integration if API available. Auto-import when AYCD generates new emails. Track which emails are used on which retailers across multiple iCloud accounts.

### 2.4 Password Vault (built)

- AES-256-GCM encrypted vault, PBKDF2 key derivation
- Copy-paste buttons, auto-lock 5min, panic hide
- **Brain dump notes**: User considers this "nice extra" - most people won't switch from Bitwarden/iCloud. Lower priority.

### 2.5 VCC Tracker (built)

- Track VCC provider, last 4 digits, label
- Link VCCs to accounts and orders
- **Brain dump additions**: Similar to email tracker - track which VCCs go to which stores. API from card company (Capital One, Citi) if possible to auto-import.

## 3. New Features (Not Yet Built)

### Tier 1 - Easy

**3.1 Automation Jig Tool**

- Address/identity jigging for account generation
- "Nice extra" - AYCD already does this well
- Lower priority, add if time permits

**3.2 Drop Calendar**

- Yearly calendar of product drops (sneakers, collectibles, etc.)
- Source data from cook group Discords or build own scraping
- Many cook groups already provide this

**3.3 Auto Email Cleanup**

- Basic email filtering for botting-related emails
- "Kind of whatever" - AI email filtering (Gemini/Gmail) makes this redundant
- AYCD already does it well

**3.4 Cloud Sync & Encrypted Backup**

- User doesn't fully understand the value proposition
- Needs clarification in Discovery

### Tier 2 - Medium

**3.5 Order Tracker**

- Receive webhooks from bots (Cybersole, Valor, NSB)
- Bot checkout -> webhook -> BottingOS captures order data
- Webhook setup: paste URL into bot config, receives order number, item, price
- Alternative: IMAP email parsing (less preferred)

**3.6 Advanced Profit Tracker**

- Builds on basic tracker + order tracker + marketplace APIs
- Bank/credit card APIs unlikely (Chase, Capital One probably don't offer them)
- Auto-log sales from StockX/GOAT/eBay via their APIs
- Expenses: CSV import or manual input

**3.7 Inventory Manager**

- Track all incoming inventory via webhooks from order tracker
- Flag items sitting too long or dropped below profit threshold
- Auto-remove items when sold on marketplace (via API)
- Critical for high-volume resellers (100+ Funko pops, 200+ sneakers, 300+ Pokemon)
- Manual removal option for in-person/Facebook Marketplace sales

**3.8 Discord Alerts Integration**

- Consolidate multiple cook groups (user might have 5+ paid Discords)
- Filter by category: Pokemon, sneakers, Target, Walmart
- Get best info from each cook group in one place
- Technical challenge: Can't add bots to paid cook group channels
- Possible approach: Use user's Discord token to scrape messages via API/gateway
- Needs deep research on Discord scraping feasibility

**3.9 Analytics Dashboard**

- Chart profit vs spend over time
- Track trends: most profitable months, best sizes, best products
- Success rate by bot (Valor vs Cybersole), proxy provider, site
- ROI trends over time
- Connect to drop calendar for correlation

**3.10 VCC Generator**

- Auto-generate VCCs via bank websites (Capital One, Citi, Amazon)
- AYCD does this with a scripted browser (Chromium, clicks around the bank site)
- User says "kind of whatever" - AYCD already does it
- Consider AYCD API integration instead of building from scratch

**3.11 2FA Manager**

- TOTP authenticator app functionality
- Store 2FA secrets in encrypted cloud storage
- "Pretty straightforward" per user

**3.12 Marketplace Sync (OAuth/API)**

- OAuth integration with eBay, StockX, GOAT
- Pull real-time pricing data (needed for flip calculator)
- Auto-track sales and remove from inventory
- Critical enabler for: flip calculator, profit tracker, inventory manager

**3.13 Bot Integration via Webhooks**

- Generic webhook receiver for any bot
- Paste webhook URL into bot (Cybersole, Valor, NSB) config
- Captures checkout data: item, price, order number, timestamp

### Tier 3 - Hard

**3.14 AYCD Integration**

- User knows AYCD team personally
- Check if AYCD offers API keys to users
- If not, negotiate API access
- Could pull: generated emails, VCCs, jig data, account info

**3.15 Cook Group Aggregation**

- Pull info from cook group Discords, don't partner with cook groups directly
- "Just easier this way - better per user, don't have to negotiate deals"

**3.16 Resource Hub**

- Searchable database of guides, tutorials from cook groups, AYCD, Cybersole websites
- Scrape existing educational content and make it searchable
- RAG/semantic search for specific botting questions
- Potential premium feature (extra paid tier)
- "Super good helper for newer botters trying to learn"

**3.17 Group Buy & Discount Hub**

- Negotiate cross-promotions with bot companies
- Offer discounts on BottingOS if they promote, and vice versa

## 4. User Flows

### Flow 1: Quick Profit Check (in-store)

1. User sees item at retail store
2. Opens BottingOS on phone
3. Searches item by name/SKU
4. Sees current resale prices on StockX/GOAT/eBay
5. Sees profit after fees instantly
6. Decides whether to buy

### Flow 2: Post-Checkout Tracking

1. Bot (Cybersole) checks out item
2. Webhook fires to BottingOS
3. Order appears in Order Tracker
4. Item added to Inventory
5. User lists on StockX
6. Sale detected via API, item removed from inventory, profit logged

### Flow 3: Cook Group Consolidation

1. User subscribes to 5 cook groups on Discord
2. BottingOS pulls messages from all 5
3. User filters: "show me only Target deals"
4. Gets consolidated view across all groups

### Flow 4: Account Management

1. User generates 750 HideMyEmail addresses via iCloud
2. Bulk imports into BottingOS
3. Uses AYCD to create accounts on Target, Walmart
4. Logs which emails used on which retailers
5. Before a drop, filters "all Target accounts" across all iCloud sources

## 5. Technical Signals

- **Framework**: Next.js 16 (App Router, TypeScript) - already set up
- **Desktop**: Tauri v2 wrapping the Next.js app (native .app/.dmg/.exe)
- **Styling**: Tailwind CSS + shadcn/ui (dark theme) - already set up
- **Database**: Prisma + PostgreSQL (or SQLite for local-first desktop)
- **Auth**: Clerk (or local auth for desktop-first approach)
- **Encryption**: Web Crypto API (AES-256-GCM) for vault
- **Marketplace APIs**: eBay, StockX, GOAT OAuth/REST (needs research)
- **Webhook receiver**: Generic endpoint for bot integrations
- **Discord scraping**: User token API or gateway (needs research)
- **AYCD**: Check for official API (user has personal relationship)
- **Distribution**: Tauri builds (.dmg for Mac, .exe for Windows). Zip and share for testing.
- **Mobile (future)**: Tauri v2 mobile or native iOS via Xcode
- **UI priority**: "Apple-level clean" - the #1 priority per user
- **Pricing**: Flat $5/mo, maybe $10 for premium features with running costs

## 6. Answered Questions

- Q1: Next release = all easy + medium features that are FREE to run. No per-user costs.
- Q2: Real-time pricing - defer to research. Prefer low/no-cost approaches (caching, on-demand).
- Q3: Discord scraping - NEEDS RESEARCH. User unsure what's feasible.
- Q4: AYCD API - NEEDS RESEARCH. User will also check with AYCD owners personally.
- Q5: Marketplace APIs - NEEDS RESEARCH. Check free tiers for eBay, StockX, GOAT.
- Q6: **Desktop app via Tauri v2** wrapping Next.js. Not a website. User wants a real app like botting tools.
- Q7: Cloud sync = cross-device (desktop + mobile). That's it.
- Q8: Mobile = native iOS later via Tauri v2 mobile or Xcode + Claude Code. Not PWA.
- Q9: Credit card CSV - parse multiple bank formats, but users manually tag which transactions are botting-related (no auto-categorization for MVP).
- Q10: Resource Hub - scrape guides from AYCD/Cybersole/cook groups. Check TOS first. Potential premium feature.
- Q11: Monetization - flat $5/mo for everything. Maybe $10 for premium features that cost money to run. Keep friction super low.
- Q12: Priority = all free-to-run easy + medium features first. Hard features later.

## 7. Open Questions (Remaining)

- Can we share Tauri desktop builds easily? (zip .app/.dmg to send to friend for testing)
- What are the actual costs of marketplace API calls at scale?
- Is Discord user-token scraping legal / against TOS?
- Does AYCD have a public or partner API?

## 7. Explicit Constraints

- MVP-first approach - ship easy features, iterate
- Web-first, mobile/desktop later
- No proxy management tools
- No bot automation (that's what Cybersole/Valor/NSB do)
- Security critical - botters must trust the platform
- User has no code experience, building with AI
- UI must be "Apple-level" - low friction, clean, beautiful
- Several features deprioritized: jig tool, auto cleanup, VCC generator (AYCD already handles these well)
- User explicitly skipped some hard features from original brainstorm: "too difficult, no point building them"

## 8. Success Criteria

- All 5 MVP features working with real database (not localStorage)
- User auth via Clerk
- Deployed on Vercel
- At least 2-3 medium features (order tracker, marketplace sync, analytics) functional
- UI that users describe as "clean" and "easy"
- Sub-$5/mo operating cost per user
- Can onboard a new botter in under 5 minutes
