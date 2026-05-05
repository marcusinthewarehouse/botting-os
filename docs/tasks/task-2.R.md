# Task 2.R: Phase 2 Regression

## Objective

Full regression test of all rebuilt MVP features. Verify the app shell, navigation, all 5 feature pages (calculator, tracker, emails, vault, VCC), data persistence across restarts, encryption round-trip, 750+ email import performance, and overall visual/UX quality. This is the quality gate before the app is shared with a friend for testing.

## Context

Phase 2 rebuilt all 5 MVP features from localStorage to SQLite/Drizzle with a new design system. This regression validates everything works together as a cohesive product. After this passes, the app is ready for the first external tester.

## Dependencies

- All Phase 2 tasks (2.1 through 2.6)

## Blocked By

- All Phase 2 tasks must be complete

## Research Findings

No additional research needed. This task validates existing work.

## Implementation Plan

### Step 1: Build Verification

```bash
npx tsc --noEmit          # TypeScript compiles with no errors
npm run build             # Next.js static export succeeds
cd src-tauri && cargo check  # Rust compiles
npx tauri dev             # App launches in dev mode
```

### Step 2: App Shell & Navigation Regression

**Sidebar:**

- [ ] All 12 nav items visible (6 active, 6 coming-soon)
- [ ] Active items navigate correctly
- [ ] Coming-soon items are grayed out and non-clickable
- [ ] Active page highlighted with amber tint
- [ ] Sidebar collapses on toggle
- [ ] Collapsed state shows icons only with tooltips
- [ ] Collapse state persists across reload
- [ ] Take screenshot: sidebar expanded and collapsed

**Command Palette:**

- [ ] Cmd+K opens command palette
- [ ] Type "calc" - Calculator appears in results
- [ ] Select Calculator - navigates to /calculator
- [ ] Esc closes palette
- [ ] Take screenshot: command palette open

**Titlebar:**

- [ ] Titlebar shows "BottingOS"
- [ ] Window drag works on titlebar
- [ ] Minimize, maximize, close buttons work (in Tauri)
- [ ] No titlebar overlap with sidebar

**Design:**

- [ ] Background is #09090B (zinc-950)
- [ ] Text is #FAFAFA (zinc-50)
- [ ] Amber accent (#F59E0B) used for active states and primary buttons
- [ ] Custom scrollbars visible
- [ ] No light mode elements anywhere
- [ ] Right-click disabled on UI chrome, enabled on inputs

### Step 3: Calculator Regression

- [ ] Navigate to /calculator
- [ ] Enter product name, SKU, purchase price ($110)
- [ ] Enter eBay sale price ($250), StockX ($240), GOAT ($235)
- [ ] Verify fee breakdowns appear for all 3 marketplaces
- [ ] Verify profit values are correct (check against manual calculation)
- [ ] Verify green/red coloring for profit/loss
- [ ] Verify font-mono tabular-nums on all currency values
- [ ] Save calculation to history
- [ ] Verify history list shows the saved entry
- [ ] Click history entry - verify inputs populate
- [ ] Delete history entry - verify removal
- [ ] Test with $0 sale price - verify negative profit shows in red
- [ ] Take screenshot: calculator with results

### Step 4: Tracker Regression

- [ ] Navigate to /tracker
- [ ] Verify empty state with "Add Transaction" CTA
- [ ] Add manual purchase: "Nike Dunk Low" $110
- [ ] Add manual sale: "Nike Dunk Low" $250
- [ ] Verify summary cards update (income $250, expense $110, net $140)
- [ ] Verify purchase shows in red, sale shows in green
- [ ] Filter by type "Sale" - only sale shows
- [ ] Clear filter - both show
- [ ] Edit an entry - verify changes persist
- [ ] Delete an entry - verify removal and summary update
- [ ] Test CSV import with sample Chase format
- [ ] Test CSV import with sample Capital One format
- [ ] Test CSV export
- [ ] Take screenshot: tracker with transactions and summary

### Step 5: Email Manager Regression

- [ ] Navigate to /emails
- [ ] Verify empty state
- [ ] Add single email manually
- [ ] Bulk import 50 test emails with iCloud account
- [ ] Verify source view groups by iCloud account
- [ ] Tag some emails with retailers (Nike, Footlocker)
- [ ] Switch to retailer view - verify grouping
- [ ] Search for specific email - verify filtering
- [ ] Delete an email - verify removal
- [ ] Performance test: import 750 emails
- [ ] Scroll through 750 emails - verify smooth (virtual scrolling)
- [ ] Take screenshot: source view, retailer view

### Step 6: Vault Regression

- [ ] Navigate to /vault
- [ ] If locked, enter master password
- [ ] Verify empty state
- [ ] Add vault entry: site=nike.com, username=test, password=secret123, notes=test
- [ ] Verify entry appears in card grid
- [ ] Verify password is masked (dots)
- [ ] Click copy password - verify clipboard has "secret123"
- [ ] Click reveal - verify password shows
- [ ] Edit the entry - verify changes persist
- [ ] Delete the entry - verify removal
- [ ] Verify encryption: check raw database - password should be encrypted, not "secret123"
- [ ] Test lock button: click lock, verify master password dialog appears
- [ ] Test panic hide: Cmd+Shift+H hides vault content
- [ ] Cmd+Shift+H again (or click) unhides
- [ ] Clipboard auto-clear: copy password, wait 30s, verify clipboard is empty
- [ ] Take screenshot: vault with entries, revealed password, locked state

### Step 7: VCC Tracker Regression

- [ ] Navigate to /vcc
- [ ] Verify empty state
- [ ] Add email first (for linking)
- [ ] Add VCC: provider=Privacy.com, last4=1234, label="Nike card", linked to email
- [ ] Verify table shows \*\*\*\*1234, provider badge, linked email
- [ ] Quick status change via badge
- [ ] Filter by provider
- [ ] Filter by status
- [ ] Search by label
- [ ] Edit VCC - verify changes
- [ ] Delete VCC - verify removal
- [ ] Take screenshot: VCC table with entries

### Step 8: Data Persistence Test

- [ ] Add data to all 5 features
- [ ] Close Tauri app completely
- [ ] Reopen app
- [ ] Verify all data persists across restart
- [ ] Verify master password dialog appears on reopen
- [ ] Enter password - verify all data accessible

### Step 9: Cross-Feature Integration

- [ ] Add emails, then add VCC linked to an email
- [ ] Verify linked email shows in VCC table
- [ ] Delete the linked email - verify VCC handles gracefully (null reference or cascade)

### Step 10: Performance Check

- [ ] Import 750 emails - should complete in under 5 seconds
- [ ] Scroll through 750 emails - should be smooth (60fps)
- [ ] Navigate between pages - transitions should be smooth
- [ ] Open/close command palette - should be instant

### Step 11: Tauri Smoke Test

If running in Tauri (not just `next dev`):

- [ ] `npx tauri dev` launches without errors
- [ ] Window opens at correct size (1280x800)
- [ ] All features work through Tauri WebView
- [ ] SQLite file exists in app data directory
- [ ] System tray icon visible (if implemented)

### Step 12: Visual Consistency Audit

Take screenshots of all pages and verify:

- [ ] Consistent use of zinc-950 background
- [ ] Consistent use of amber accent for primary actions
- [ ] Consistent StatusBadge colors across all features
- [ ] Consistent font-mono for all currency/number values
- [ ] Consistent card styling (border, hover, radius)
- [ ] Consistent empty states (icon, heading, description, CTA)
- [ ] No light-mode elements or white backgrounds
- [ ] No oversized text or broken layouts

## Files to Create

- None (testing task)

## Files to Modify

- Fix any bugs discovered during regression

## Contracts

### Provides (for downstream)

- Confidence that all MVP features work correctly
- Screenshots for documentation
- Green light for sharing with first tester
- Bug list with fixes

### Consumes (from upstream)

- Everything from Phase 1 and Phase 2

## Acceptance Criteria

- [ ] All build checks pass (TypeScript, Next.js, Rust)
- [ ] All 5 feature pages load without errors
- [ ] CRUD operations work for all tables
- [ ] Vault encryption/decryption works correctly
- [ ] Data persists across app restart
- [ ] Master password flow works (set, lock, unlock)
- [ ] 750+ email import completes in under 5 seconds
- [ ] Virtual scrolling is smooth for large lists
- [ ] CSV import/export works for tracker
- [ ] All filters and search work across features
- [ ] Design is consistent with spec (colors, fonts, spacing)
- [ ] No console errors during normal operation
- [ ] No localStorage usage in any feature
- [ ] Page transitions animate correctly
- [ ] Command palette navigates to all active pages
- [ ] Sidebar navigation works for all active pages

## Testing Protocol

### Unit/Integration Tests

All tests from individual task files, run as a complete suite.

### Browser Testing (Playwright MCP)

Full visual regression:

1. Open app in Tauri dev mode
2. Complete master password setup
3. Visit each page and take screenshots
4. Perform CRUD operations on each feature
5. Test cross-feature integration
6. Test data persistence across restart
7. Compare screenshots for visual consistency

### Build/Lint/Type Checks

- `npx tsc --noEmit`
- `npm run build`
- `cd src-tauri && cargo check`
- `npx tauri build` (production build test)

## Skills to Read

- None

## Research Files to Read

- None

## Git

- Branch: test/2.R-phase2-regression
- Commit message prefix: Task 2.R:
