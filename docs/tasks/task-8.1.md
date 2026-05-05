# Task 8.1: User Flow Testing

## Objective

Test 5 critical user flows end-to-end: quick profit check, post-checkout tracking, account management, Discord monitoring, and new user onboarding. Each flow exercises multiple features in the way a real user would use them.

## Context

Phase 8 is dedicated to E2E testing before distribution. This task validates the 5 most common user journeys through the entire app. Unlike regression tests that check individual features, these flows test cross-feature integration - how a user naturally moves between sections to complete a real task.

## Dependencies

- All Phases 1-7 complete and passing regression

## Blocked By

- Task 7.R (all features must pass regression first)

## Research Findings

No additional research needed - testing task based on real user workflows.

## Implementation Plan

### Flow 1: Quick Profit Check

Scenario: User wants to check if a sneaker is profitable before buying.

Steps:

1. Open BottingOS
2. Navigate to Profit Calculator
3. Enter product name: "Nike Dunk Low Panda"
4. Click search / lookup prices
5. Verify StockX, GOAT, eBay prices populate
6. Enter purchase price: $110
7. Select size
8. View profit breakdown (revenue - purchase - fees)
9. Verify profit displayed in green or loss in red
10. Change marketplace fees and verify recalculation
11. Navigate to Marketplace Pricing for more detail
12. Return to Calculator - verify state preserved

Expected: < 10 seconds from app open to seeing profit number.

### Flow 2: Post-Checkout Tracking

Scenario: User just cooked a pair, needs to log the order and track it.

Steps:

1. Navigate to Orders / Tracker
2. Click "Add Order"
3. Fill in: item name, SKU, size, price ($130), store (Nike), bot (Cybersole), order number
4. Save order
5. Verify order appears in list with "Purchased" status
6. Click order - update status to "Shipped"
7. Navigate to Inventory
8. Verify item appears in inventory (auto-created or manually add)
9. Update inventory: set current value ($200), status "In Stock"
10. Navigate to Analytics
11. Verify the order appears in spend data
12. Return to Orders - add a sale for the inventory item
13. Navigate to Analytics - verify profit data updated

Expected: Full tracking from checkout to sale reflected in analytics.

### Flow 3: Account Management

Scenario: User setting up accounts for a new retailer.

Steps:

1. Navigate to Emails
2. Add 3 test emails with provider "gmail"
3. Tag all 3 with retailer "Nike"
4. Navigate to Vault
5. Add retailer credentials: site "nike.com", username from email, password
6. Verify encryption works (decrypt and view password)
7. Navigate to VCCs
8. Add a virtual card: provider "Privacy", last four "4242"
9. Link to an account
10. Navigate back to Emails - filter by retailer "Nike"
11. Verify 3 emails show
12. Export emails to CSV
13. Import CSV back - verify no duplicates created (or handled gracefully)

Expected: Seamless flow between email, vault, and VCC management.

### Flow 4: Discord Monitoring

Scenario: User wants to monitor cook group for restock alerts.

Steps:

1. Navigate to Discord Settings (`/discord/settings`)
2. Click "Connect Discord"
3. Wait for Discord to relaunch with CDP
4. Verify channel list loads
5. Select 2-3 channels from a server
6. Add keywords: "restock", "drop", "live"
7. Save settings
8. Navigate to Discord Feed (`/discord`)
9. Verify connection status shows "Connected"
10. Wait for or trigger a message in a monitored channel
11. Verify message appears in feed
12. Verify keyword highlighting on matching text
13. Click a channel in the tree sidebar - verify filtering
14. Use search to find a specific message
15. Toggle "Bot only" filter
16. Navigate away from Discord page and back - verify messages still there
17. Check notification center - verify Discord keyword notification created (if keyword matched)

Expected: Real-time monitoring with filtering and highlighting working together.

### Flow 5: New User Onboarding

Scenario: Brand new user installs BottingOS for the first time.

Steps:

1. Start from clean state (no database)
2. Launch app
3. Verify redirect to onboarding wizard
4. Step 1: Select "Sneakers" category
5. Step 2: Select "Cybersole" bot
6. Step 3: Skip import
7. Verify redirect to dashboard
8. Explore each section from sidebar navigation:
   - Dashboard loads
   - Calculator loads
   - Orders (empty state)
   - Inventory (empty state)
   - Emails (empty state)
   - Vault (empty state)
   - VCCs (empty state)
   - Discord (not connected state)
   - Analytics (empty state with message)
   - Calendar (empty state)
   - Resources (seeded links visible)
9. Add one item in each section
10. Return to Dashboard - verify summary data
11. Close app and reopen - verify all data persists
12. Verify onboarding doesn't show again

Expected: < 5 minutes from install to productive (D32 requirement).

## Files to Create

- None (testing only)

## Files to Modify

- None (fix bugs if found during testing)

## Contracts

### Provides

- Validation of 5 critical user flows
- Cross-feature integration verification
- Real-world usage pattern testing

### Consumes

- All features from Phases 1-7

## Acceptance Criteria

- [ ] Flow 1 (Quick Profit Check): Complete in < 10 seconds
- [ ] Flow 1: Marketplace prices load and calculator works
- [ ] Flow 2 (Post-Checkout): Order -> Inventory -> Sale -> Analytics pipeline works
- [ ] Flow 2: All status transitions tracked correctly
- [ ] Flow 3 (Account Management): Email, Vault, VCC CRUD and linking works
- [ ] Flow 3: CSV export/import works
- [ ] Flow 3: Encryption/decryption works for sensitive data
- [ ] Flow 4 (Discord): CDP connect -> capture -> display pipeline works
- [ ] Flow 4: Channel filtering, keyword highlighting, search all functional
- [ ] Flow 4: Notification created on keyword match
- [ ] Flow 5 (Onboarding): < 5 minutes install to productive
- [ ] Flow 5: All empty states display correctly
- [ ] Flow 5: All sections accessible and functional
- [ ] Flow 5: Data persists after app restart
- [ ] No errors or crashes during any flow
- [ ] Navigation between sections is smooth

## Testing Protocol

### E2E Tests

- Execute each flow step by step as described above
- Document any failures with screenshots and error details
- Test in both dev mode (`npx tauri dev`) and production build

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds
- `cargo build` succeeds

## Skills to Read

- None (testing task)

## Research Files to Read

- None (testing task)

## Git

- Branch: `test/8.1-user-flows`
- Commit prefix: `Task 8.1:`
