# Task 3.R: Phase 3 Regression

## Objective

Full regression test of all Phase 3 pricing features plus verification that Phase 1 (data layer) and Phase 2 (UI rebuild) features still work correctly.

## Context

Phase 3 introduces the pricing backend, fee engine, enhanced calculator, and price alerts. These touch Rust commands, TypeScript logic, UI components, and SQLite schema. Regression ensures nothing broke during Phase 3 development and all features integrate correctly end-to-end.

## Dependencies

- Task 3.1 (Rust Pricing Backend) - complete
- Task 3.2 (Fee Calculation Engine) - complete
- Task 3.3 (Enhanced Flip Calculator UI) - complete
- Task 3.4 (Price Alerts) - complete

## Blocked By

- All Phase 3 tasks must be complete

## Research Findings

N/A - this is a testing task.

## Implementation Plan

### Step 1: Phase 1 Regression (Data Layer)

Verify all data operations still work:

- [ ] SQLite database initializes on fresh app start
- [ ] Migrations run successfully (including new price_alerts table)
- [ ] Drizzle ORM queries work: INSERT, SELECT, UPDATE, DELETE on all tables
- [ ] Encryption/decryption of sensitive fields (emails, accounts, VCCs)
- [ ] Master password flow works correctly

### Step 2: Phase 2 Regression (UI)

Verify all UI pages render and function:

- [ ] Dashboard page loads with correct layout
- [ ] Sidebar navigation works (all links route correctly)
- [ ] Calculator page loads (now enhanced with Phase 3 features)
- [ ] Emails page loads and displays data
- [ ] VCC page loads and displays data
- [ ] Tracker page loads and displays data
- [ ] Vault page loads and displays data
- [ ] Theme is correct: zinc dark (#09090B bg), amber accent (#F59E0B)
- [ ] Responsive layout works at mobile/tablet/desktop breakpoints
- [ ] Command palette (Cmd+K) opens and navigates

### Step 3: Phase 3 Feature Tests

#### 3.1 Rust Pricing Backend

- [ ] `search_products("Nike Dunk Low", 10)` returns results
- [ ] `get_product_prices(styleId, "stockx")` returns size-by-size data
- [ ] `search_ebay("Jordan 1", 20)` returns eBay listings
- [ ] Cache works: second search for same query is instant
- [ ] Cache expires: results refresh after TTL
- [ ] API failure returns stale cache with warning
- [ ] eBay OAuth token refreshes automatically
- [ ] No CORS errors in console

#### 3.2 Fee Calculation Engine

- [ ] eBay fees calculate correctly for sneakers >= $100
- [ ] eBay fees calculate correctly for sneakers < $100
- [ ] eBay fees calculate correctly for general category
- [ ] StockX fees correct at each seller level (1-5)
- [ ] StockX discounts apply correctly (quick ship, successful ship)
- [ ] StockX floor rate (5%) enforced
- [ ] GOAT fees correct at each rating tier
- [ ] GOAT Canadian surcharge applies
- [ ] Unified flip calculator sorts by profit descending
- [ ] All unit tests pass: `npx vitest run src/lib/__tests__/fees.test.ts`

#### 3.3 Enhanced Calculator UI

- [ ] Search bar shows autocomplete results
- [ ] Selecting product populates all marketplace prices
- [ ] Size selector updates prices per size
- [ ] Fee breakdown expands/collapses per marketplace
- [ ] Manual price override recalculates instantly
- [ ] "Best deal" badge highlights highest-profit marketplace
- [ ] Save to history persists calculation
- [ ] Reload from history works
- [ ] Empty state shown before product selection
- [ ] Loading skeletons during API calls
- [ ] Stale data warning with timestamp

#### 3.4 Price Alerts

- [ ] Create alert from calculator works
- [ ] Alert saved to SQLite and persists across restart
- [ ] Alert list shows all alerts with correct status
- [ ] Delete alert works
- [ ] Polling runs on schedule (verify with console logs)
- [ ] Notification fires when threshold crossed (may need mock)
- [ ] One-shot alerts mark as triggered
- [ ] Recurring alerts continue after trigger
- [ ] Notification permission requested correctly

### Step 4: Cross-cutting Concerns

- [ ] `npx tsc --noEmit` - no TypeScript errors
- [ ] `npm run build` - static export succeeds
- [ ] `cargo build` - Rust compiles without errors
- [ ] `cargo clippy` - no warnings
- [ ] `npx tauri build` - produces working binary
- [ ] No console errors during normal usage
- [ ] App starts cleanly from cold launch
- [ ] Memory usage stable (no leaks from polling/caching)

### Step 5: Document Issues

- Create issues for any bugs found
- Note any flaky tests or timing-dependent behavior
- Document any workarounds applied

## Files to Create

- None (testing only)

## Files to Modify

- None (unless bugs are found and fixed)

## Contracts

### Provides

- Verified Phase 3 release readiness
- Bug list (if any)

### Consumes

- All Phase 1, 2, and 3 features

## Acceptance Criteria

1. All checklist items above pass
2. No P0/P1 bugs remaining
3. Build succeeds on all targets
4. Performance acceptable (search < 3s, fee calc < 100ms, UI renders < 500ms)

## Testing Protocol

### Unit Tests

```bash
npx vitest run                              # All unit tests
npx vitest run src/lib/__tests__/fees.test.ts  # Fee engine specifically
```

### Browser/Playwright

```bash
npx playwright test                         # Full E2E suite
npx playwright test --grep "calculator"     # Calculator-specific tests
npx playwright test --grep "pricing"        # Pricing-specific tests
```

### Build Checks

```bash
npx tsc --noEmit
npm run build
cargo build --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml
npx tauri build
```

## Skills to Read

- All skills (verify each area still works per its patterns)

## Research Files to Read

- None (testing task)

## Git

- **Branch**: `test/3.R-phase3-regression`
- **Commit prefix**: `[test]`
