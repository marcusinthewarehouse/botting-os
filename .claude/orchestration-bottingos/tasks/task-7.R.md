# Task 7.R: Phase 7 Regression

## Objective

Install BottingOS from the .dmg build, complete the onboarding wizard, exercise every feature end-to-end, verify system tray and background processing, and confirm no regressions across all phases.

## Context

Phase 7 added onboarding wizard (7.1), UI polish and animations (7.2), system tray with background processing (7.3), and production build/distribution (7.4). This is the most comprehensive regression - it tests the entire app as a user would experience it, starting from a fresh .dmg install.

## Dependencies

- Task 7.1: Onboarding wizard
- Task 7.2: UI polish & animations
- Task 7.3: System tray & background
- Task 7.4: Tauri build & distribution
- All Phase 1-6 tasks

## Blocked By

- Tasks 7.1, 7.2, 7.3, 7.4 (all must be complete)

## Research Findings

No additional research needed - comprehensive testing/validation task.

## Implementation Plan

### Step 1: Fresh Install Test

1. Build production .dmg: `npx tauri build`
2. Mount the .dmg
3. Drag BottingOS.app to Applications
4. Right-click > Open to bypass Gatekeeper
5. Verify app launches without errors
6. Verify system tray icon appears

### Step 2: Onboarding Flow (7.1)

1. On first launch, verify redirect to `/onboarding`
2. Verify progress bar shows "Step 1 of 3"
3. Step 1: Select "Sneakers" and "Pokemon" categories
4. Click Next
5. Step 2: Select "Cybersole" and "Valor"
6. Click Next
7. Step 3: Click "Start Fresh" (skip import)
8. Verify redirect to dashboard
9. Close and reopen app - verify onboarding does NOT show again
10. Test: fresh install with all steps skipped - verify still works

### Step 3: UI Polish Verification (7.2)

1. Navigate between pages - verify 150ms fade+slide transitions
2. Hover over cards - verify amber border glow
3. Click buttons - verify scale feedback
4. Open modals/dialogs - verify scale+fade animation
5. Load data pages - verify skeleton loading states
6. Verify no loading spinners anywhere
7. Check reduced motion: enable in OS settings, verify animations disabled
8. Design token audit:
   - [ ] Backgrounds: zinc-950 and black only
   - [ ] Borders: consistent opacity/color
   - [ ] Text: zinc-50 primary, zinc-400 secondary
   - [ ] Accent: amber-500 for actions only
   - [ ] Data values: font-mono tabular-nums
   - [ ] Prices: $X.XX format with green/red coloring
   - [ ] Focus rings: amber-500 on all interactive elements

### Step 4: System Tray (7.3)

1. Verify tray icon visible in menu bar
2. Right-click tray - verify menu items
3. Click "Hide BottingOS" - verify window hides
4. Click "Show BottingOS" - verify window shows
5. Left-click tray icon - verify shows window
6. Click window close button (X) - verify minimizes to tray, not quit
7. Click "Quit" in tray - verify app fully exits and tray icon disappears
8. Relaunch - verify no duplicate tray icons

### Step 5: Background Processing (7.3)

1. Connect Discord CDP
2. Hide window to tray
3. Send a Discord message in a monitored channel
4. Show window - verify message captured in feed
5. Create a drop with 1-minute reminder
6. Hide window
7. Wait for reminder - verify OS notification fires
8. Show window - verify notification in notification center

### Step 6: Feature Regression - All Phases

**Phase 1 - Data Layer:**

- [ ] Database created at correct path
- [ ] Settings persist across app restarts
- [ ] All tables exist (emails, accounts, vccs, orders, inventory, sales, settings, drops, notifications, resources, discord_channels)

**Phase 2 - Core Features:**

- [ ] Profit calculator: quick calc with marketplace prices
- [ ] Profit calculator: detailed calc with fees
- [ ] Order tracker: create order with all fields
- [ ] Order tracker: edit and delete orders
- [ ] Order tracker: filter and sort
- [ ] Email manager: add, edit, delete emails
- [ ] Email manager: CSV import/export
- [ ] Vault: encrypt credentials with master password
- [ ] Vault: decrypt and view
- [ ] VCC manager: add encrypted card data
- [ ] VCC manager: view decrypted data

**Phase 3 - Marketplace:**

- [ ] Price lookup by product name or SKU
- [ ] StockX/GOAT/eBay prices display
- [ ] Price comparison across marketplaces
- [ ] Prices integrate with profit calculator

**Phase 4 - Webhooks & Inventory:**

- [ ] Webhook listener receives test payload
- [ ] Order auto-created from webhook
- [ ] Inventory list, add, edit, delete
- [ ] Inventory status tracking (in_stock, listed, sold)
- [ ] CSV import and export

**Phase 5 - Discord:**

- [ ] Discord CDP connect from settings
- [ ] Messages captured in real-time
- [ ] Channel selection persists
- [ ] Feed displays with filters
- [ ] Keyword highlighting works
- [ ] Virtualized scroll handles many messages

**Phase 6 - Analytics & Extras:**

- [ ] Analytics KPI cards with correct data
- [ ] Analytics charts render (profit, bot, category)
- [ ] Time range selector works
- [ ] Drop calendar month/list views
- [ ] Drop CRUD operations
- [ ] Reminder notifications fire
- [ ] Notification center bell + dropdown
- [ ] Notification click navigates correctly
- [ ] Resource hub seeded links display
- [ ] Resource filtering and custom link CRUD

### Step 7: Production-Specific Checks

- [ ] No dev-only console logs
- [ ] No "localhost" URLs in production (except for CDP/webhook localhost)
- [ ] App window title is "BottingOS"
- [ ] App icon correct in dock and app switcher
- [ ] Database path correct (`~/Library/Application Support/com.bottingos.app/`)
- [ ] App size reasonable (< 100MB .dmg)
- [ ] Memory usage reasonable (< 200MB during normal use)

## Files to Create

- None (testing only)

## Files to Modify

- None (testing only; fix bugs if found)

## Contracts

### Provides

- Full validation of BottingOS from fresh install to full usage
- Confirmation of no regressions across all phases
- Production readiness assessment

### Consumes

- .dmg build from Task 7.4
- All features from Phases 1-7

## Acceptance Criteria

- [ ] Fresh .dmg install works on macOS
- [ ] Onboarding wizard completes successfully
- [ ] All page transitions and animations work
- [ ] System tray works correctly
- [ ] Close-to-tray behavior works
- [ ] Background processing continues when hidden
- [ ] All Phase 1 features pass
- [ ] All Phase 2 features pass
- [ ] All Phase 3 features pass
- [ ] All Phase 4 features pass
- [ ] All Phase 5 features pass
- [ ] All Phase 6 features pass
- [ ] Design token consistency across all pages
- [ ] No console errors during normal operation
- [ ] Production build has no dev artifacts

## Testing Protocol

### Full E2E

- Complete walkthrough as described above
- Every feature touched at least once
- Run from production .dmg build, not dev mode

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds
- `npx tauri build` succeeds
- `cargo clippy` passes

## Skills to Read

- None (testing task)

## Research Files to Read

- None (testing task)

## Git

- Branch: `test/7.R-phase7-regression`
- Commit prefix: `Task 7.R:`
