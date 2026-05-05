# Task 5.R: Phase 5 Regression

## Objective

Verify the entire Discord CDP pipeline works end-to-end (launch, capture, display) and confirm all Phase 1-4 features still function correctly after Phase 5 changes.

## Context

Phase 5 added Discord process management (5.1), CDP message capture (5.2), channel selection settings (5.3), and the Discord feed UI (5.4). This regression validates the full flow from launching Discord with CDP to seeing messages in the feed, plus confirms no regressions in existing features (data layer, calculator, tracker, emails, vault, VCCs, marketplace pricing, webhook tracking, inventory management).

## Dependencies

- Task 5.1: Discord process management
- Task 5.2: CDP message capture
- Task 5.3: Channel selection settings
- Task 5.4: Discord feed UI
- All Phase 1-4 tasks

## Blocked By

- Tasks 5.1, 5.2, 5.3, 5.4 (all must be complete)

## Research Findings

No additional research needed - this is a testing/validation task.

## Implementation Plan

### Step 1: Discord CDP Pipeline E2E

1. Start app with `npx tauri dev`
2. Navigate to `/discord/settings`
3. Click "Connect Discord" - verify Discord kills and relaunches with CDP
4. Verify connection status shows "Connected"
5. Verify channel list loads with server/channel tree
6. Select specific channels, save settings
7. Navigate to `/discord` feed page
8. Send a test message in a monitored Discord channel
9. Verify message appears in the feed in real-time
10. Verify channel tree shows the channel with unread count

### Step 2: Channel Selection

1. Go to `/discord/settings`
2. Select only 2 channels from different servers
3. Save settings
4. Go to `/discord` feed
5. Send messages in monitored and non-monitored channels
6. Verify only monitored channel messages appear
7. Toggle "Monitor All" - verify all messages now appear
8. Save with "Monitor All" enabled
9. Reload page - verify setting persisted

### Step 3: Feed Filtering & Search

1. With messages flowing, type a search term in the filter bar
2. Verify messages filtered by content (300ms debounce)
3. Toggle "Bot only" - verify only bot messages shown
4. Click a channel in the tree - verify feed filters to that channel
5. Click "All Channels" - verify all messages shown
6. Clear all filters - verify full feed restored

### Step 4: Keyword Highlighting

1. Go to `/discord/settings`
2. Add keywords: "restock", "drop", "release"
3. Save settings
4. Go to `/discord` feed
5. Verify messages containing those keywords have amber highlighting
6. Verify highlighting is case-insensitive

### Step 5: Reconnection

1. While connected and capturing, manually kill Discord
2. Verify connection status changes to "Reconnecting..."
3. Wait for auto-reconnect (Discord relaunches)
4. Verify messages resume flowing
5. Verify hook re-injects successfully

### Step 6: Performance

1. Let messages accumulate to 1000+
2. Verify virtualized scrolling is smooth
3. Verify auto-scroll works at bottom
4. Scroll up - verify "Jump to latest" button appears
5. Verify messages cap at 2000 (oldest dropped)
6. Check memory usage stays reasonable (<200MB)

### Step 7: Phase 1-4 Regression

Run through each existing feature:

**Phase 1 - Data Layer:**

- [ ] App launches with SQLite database
- [ ] Settings persist across restarts

**Phase 2 - Core Features:**

- [ ] Profit calculator works (quick calc + detailed)
- [ ] Order tracker lists orders, CRUD works
- [ ] Email manager lists, adds, edits emails
- [ ] Vault encrypts/decrypts credentials
- [ ] VCC manager stores encrypted card data

**Phase 3 - Marketplace:**

- [ ] Price lookup returns StockX/GOAT/eBay data
- [ ] Profit calculator integrates marketplace prices
- [ ] Price comparison displays correctly

**Phase 4 - Webhooks & Inventory:**

- [ ] Webhook listener receives test payloads
- [ ] Orders auto-create from webhook data
- [ ] Inventory management lists items
- [ ] Inventory CRUD operations work
- [ ] CSV import/export functions

## Files to Create

- None (testing only)

## Files to Modify

- None (testing only; fix bugs if found)

## Contracts

### Provides

- Validation that Phase 5 works end-to-end
- Confirmation of no regressions in Phases 1-4
- Bug reports for any issues found

### Consumes

- All Phase 1-5 features

## Acceptance Criteria

- [ ] Discord CDP launches and connects successfully
- [ ] Messages captured in real-time from FluxDispatcher hook
- [ ] Channel selection persists and filters correctly
- [ ] Feed displays messages with proper formatting
- [ ] Keyword highlighting works correctly
- [ ] Virtualized scrolling handles 1000+ messages
- [ ] Auto-reconnect works after Discord crash
- [ ] All filter types work (search, bot-only, channel)
- [ ] All Phase 1 features pass regression
- [ ] All Phase 2 features pass regression
- [ ] All Phase 3 features pass regression
- [ ] All Phase 4 features pass regression
- [ ] No TypeScript compilation errors
- [ ] No Rust compilation errors
- [ ] No console errors during normal operation

## Testing Protocol

### Smoke Test

- App launches without errors
- All navigation links work
- Discord page loads

### E2E Tests

- Full Discord pipeline as described above
- Each Phase 1-4 feature touched at least once

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds
- `cargo build` succeeds
- `cargo clippy` passes

## Skills to Read

- None (testing task)

## Research Files to Read

- None (testing task)

## Git

- Branch: `test/5.R-phase5-regression`
- Commit prefix: `Task 5.R:`
