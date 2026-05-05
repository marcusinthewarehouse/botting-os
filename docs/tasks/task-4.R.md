# Task 4.R: Phase 4 Regression

## Objective

Full end-to-end regression of the entire webhook-to-inventory pipeline plus verification that all Phase 1, 2, and 3 features still work. This validates the complete data flow: bot webhook -> Cloudflare Worker -> Supabase -> Realtime -> Desktop app -> Order table -> Inventory.

## Context

Phase 4 introduces cloud infrastructure (Cloudflare Worker, Supabase) alongside local features (order tracker UI, inventory manager). The regression must verify:

1. The full webhook pipeline works end-to-end
2. All bot parsers produce correct data
3. Supabase RLS prevents cross-user access
4. Realtime delivers events to the correct user
5. Inventory auto-populates from successful orders
6. Sold items create proper tracker/sales entries
7. All Phase 1-3 features remain functional

## Dependencies

- All Phase 4 tasks complete (4.1, 4.2, 4.3, 4.4, 4.5)
- All Phase 1-3 features stable

## Blocked By

- All Phase 4 tasks must be complete

## Research Findings

N/A - this is a testing task.

## Implementation Plan

### Step 1: Phase 1 Regression (Data Layer)

- [ ] SQLite database initializes on fresh app start
- [ ] All migrations run (including price_alerts from Phase 3)
- [ ] Drizzle ORM queries work on all tables
- [ ] Encryption/decryption of sensitive fields works
- [ ] Master password flow works

### Step 2: Phase 2 Regression (UI Framework)

- [ ] All pages load without errors
- [ ] Sidebar navigation works (all links, including newly enabled Orders and Inventory)
- [ ] Theme correct: zinc dark bg, amber accent
- [ ] Responsive layout at all breakpoints
- [ ] Command palette works

### Step 3: Phase 3 Regression (Pricing & Calculator)

- [ ] Rust pricing commands return data
- [ ] Fee calculations accurate (run unit tests)
- [ ] Enhanced calculator search, comparison, and save-to-history work
- [ ] Price alerts persist and poll correctly
- [ ] All Phase 3 unit tests pass

### Step 4: Phase 4 - Webhook Worker (Task 4.1)

- [ ] Health check: `GET https://hooks.bottingos.app/` returns 200
- [ ] Valid Cybersole payload returns 204
- [ ] Valid Valor payload returns 204
- [ ] Valid NSB payload returns 204
- [ ] Generic/unknown bot payload returns 204
- [ ] Invalid token returns 401
- [ ] Empty payload returns 400
- [ ] Wrong HTTP method returns 405
- [ ] Rate limiting works (> 60/min returns 429)
- [ ] Discord forward sends payload to configured URL
- [ ] `last_used_at` updates on token row

### Step 5: Phase 4 - Bot Parsers (Task 4.2)

- [ ] Cybersole: bot_name="cybersole", all fields extracted correctly
- [ ] Valor: "Item" maps to product, "Site" maps to store
- [ ] NSB: "Product Name" maps to product, "Shoe Size" maps to size, "Retailer" maps to store
- [ ] Wrath: parser handles available fields
- [ ] Kodai: parser handles available fields
- [ ] Fuzzy fallback: extracts product, size, price from unknown bot format
- [ ] Decline: success=false from "Card Declined" title + red color
- [ ] Price in cents: "$110.00" -> 11000
- [ ] Unrecognized fields stored in extras
- [ ] raw_payload preserved
- [ ] All parser unit tests pass: `npx vitest run workers/webhook-proxy/test/`

### Step 6: Phase 4 - Supabase Schema (Task 4.3)

- [ ] webhook_tokens table exists with correct columns
- [ ] checkout_events table exists with correct columns
- [ ] RLS enabled on both tables
- [ ] Authenticated user can only see own data
- [ ] Service role can INSERT regardless of user_id
- [ ] Anon key cannot INSERT into checkout_events
- [ ] Indexes exist and are used
- [ ] Realtime enabled on checkout_events

### Step 7: Phase 4 - Order Tracker UI (Task 4.4)

- [ ] /orders page loads
- [ ] Existing orders fetched from Supabase
- [ ] New webhook event appears in real-time (< 2s)
- [ ] Toast notification on new event
- [ ] Table sorts by all columns
- [ ] Filter by bot works
- [ ] Filter by store works
- [ ] Date range filter works
- [ ] Search across product/store/SKU works
- [ ] Webhook URL displayed and copyable
- [ ] Token CRUD (create, label, deactivate, delete)
- [ ] Discord forward URL saves
- [ ] Column visibility toggle works
- [ ] Empty state when no orders

### Step 8: Phase 4 - Inventory Manager (Task 4.5)

- [ ] /inventory page loads
- [ ] All inventory items display correctly
- [ ] Add manual item works
- [ ] Category filter cards show counts
- [ ] Category click filters table
- [ ] Status badges correct
- [ ] Days held calculated
- [ ] Aging colors: normal/amber/red at correct thresholds
- [ ] Mark as Sold creates sale record
- [ ] Mark as Sold updates inventory status to "sold"
- [ ] Profit calculated correctly (sale - fees - purchase)
- [ ] Auto-populate from successful checkout works
- [ ] Search and filter work
- [ ] Sort by all columns

### Step 9: End-to-End Pipeline Test

The critical path that validates all phases work together:

1. **Create webhook token** via /orders page
2. **Send Cybersole webhook** via curl to `hooks.bottingos.app/v1/webhooks/{token}`
3. **Verify Worker processes** - returns 204
4. **Verify Supabase INSERT** - row appears in checkout_events table
5. **Verify Realtime push** - order appears in /orders table within 2 seconds
6. **Verify toast** - notification fires
7. **Add to inventory** - click "Add to Inventory" on the order
8. **Verify inventory item** - appears in /inventory table
9. **Mark as sold** - fill in sale price, marketplace, fees
10. **Verify sale record** - sales table has entry
11. **Verify profit** - profit = sale price - fees - purchase price
12. **Check calculator** - search for the same product, verify prices load
13. **Repeat with Valor** - different bot, different field names, same pipeline

### Step 10: Cross-cutting Concerns

- [ ] `npx tsc --noEmit` - no TypeScript errors
- [ ] `npm run build` - static export succeeds
- [ ] `cargo build` - Rust compiles
- [ ] `cargo clippy` - no warnings
- [ ] `npx tauri build` - produces working binary
- [ ] No console errors during normal usage
- [ ] App starts cleanly from cold launch
- [ ] Memory stable (Realtime subscription, polling, caching)
- [ ] Worker cold start < 50ms
- [ ] Webhook end-to-end latency < 2s

### Step 11: Security Verification

- [ ] Supabase anon key cannot read other users' data
- [ ] Invalid webhook token returns 401 (not 500)
- [ ] Malformed JSON returns 400 (not crash)
- [ ] Service role key is stored as Cloudflare secret (not in code)
- [ ] Supabase URL and anon key are environment variables
- [ ] No secrets in git

### Step 12: Document Issues

- Bug list with severity
- Flaky tests documented
- Performance observations
- Known limitations

## Files to Create

- None (testing only)

## Files to Modify

- None (unless bugs are found)

## Contracts

### Provides

- Verified Phase 4 release readiness
- Verified end-to-end pipeline
- Bug list

### Consumes

- All features from Phases 1-4

## Acceptance Criteria

1. All checklist items pass
2. End-to-end pipeline test (Step 9) completes successfully
3. No P0/P1 bugs remaining
4. All builds succeed
5. Performance acceptable (< 2s webhook-to-UI, < 3s search, < 100ms fee calc)
6. Security checks pass

## Testing Protocol

### Unit Tests

```bash
npx vitest run                                           # All frontend tests
npx vitest run src/lib/__tests__/fees.test.ts            # Fee engine
npx vitest run workers/webhook-proxy/test/               # Parser tests
```

### Integration Tests (curl)

Use full curl test suite from webhook-testing skill:

```bash
# Cybersole success
curl -X POST https://hooks.bottingos.app/v1/webhooks/{TOKEN} \
  -H "Content-Type: application/json" \
  -d '...'  # (see webhook-testing skill for full payloads)

# Valor success
# NSB success
# Generic bot
# Decline
# Invalid token
# Empty payload
```

### Browser/Playwright

```bash
npx playwright test                          # Full E2E suite
npx playwright test --grep "orders"          # Order tracker tests
npx playwright test --grep "inventory"       # Inventory tests
npx playwright test --grep "calculator"      # Calculator tests
```

### Build Checks

```bash
npx tsc --noEmit
npm run build
cargo build --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml
npx tauri build
cd workers/webhook-proxy && npx wrangler deploy --dry-run
```

## Skills to Read

- `.claude/skills/webhook-testing/SKILL.md` - full curl test suite and expected responses

## Research Files to Read

- None (testing task)

## Git

- **Branch**: `test/4.R-phase4-regression`
- **Commit prefix**: `[test]`
