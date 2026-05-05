# Task 8.2: Data Integrity Testing

## Objective

Test data persistence after app restart, encryption with wrong and correct passwords, large data sets (1000+ emails, 500+ orders), cross-feature data links, and CSV round-trip integrity.

## Context

BottingOS stores all user data locally in SQLite. Data integrity is critical - users trust the app with their account credentials, order history, and financial data. This task verifies that data survives restarts, encryption protects sensitive fields, the app handles large datasets without degradation, cross-feature references stay valid, and CSV import/export doesn't lose or corrupt data.

## Dependencies

- All Phases 1-7 complete
- Phase 1: SQLite database, Drizzle ORM, encryption system

## Blocked By

- Task 7.R (all features must pass regression first)

## Research Findings

No additional research needed - data integrity verification task.

## Implementation Plan

### Test 1: Persistence After Restart

1. Add test data across all tables:
   - 5 emails with different providers
   - 3 vault entries with encrypted passwords
   - 2 VCCs with encrypted card data
   - 10 orders with various statuses
   - 5 inventory items linked to orders
   - 2 sales linked to inventory
   - 3 drops on the calendar
   - 5 notifications
   - 2 custom resource links
   - Settings: onboarding_complete, user_categories, discord_keywords
2. Close the app completely (Quit from tray)
3. Relaunch the app
4. Verify every piece of data is intact:
   - [ ] All 5 emails present with correct fields
   - [ ] All 3 vault entries present, passwords decrypt correctly
   - [ ] All 2 VCCs present, card data decrypts correctly
   - [ ] All 10 orders present with correct statuses
   - [ ] All 5 inventory items present with correct links to orders
   - [ ] All 2 sales present with correct profit calculations
   - [ ] All 3 drops on calendar at correct dates
   - [ ] All 5 notifications present with read/unread state preserved
   - [ ] All 2 custom resource links present
   - [ ] All settings values intact

### Test 2: Encryption - Wrong Password

1. Set a master password and encrypt vault entries and VCC data
2. Close the app
3. Relaunch and enter the WRONG master password
4. Verify:
   - [ ] App does not crash
   - [ ] Encrypted data shows error state or remains encrypted
   - [ ] User is informed the password is wrong
   - [ ] No plaintext data leaked
   - [ ] Non-encrypted data (orders, emails without passwords, settings) still accessible

### Test 3: Encryption - Correct Password

1. Re-enter the correct master password
2. Verify:
   - [ ] All vault passwords decrypt correctly
   - [ ] All VCC card data decrypts correctly
   - [ ] Email passwords (if encrypted) decrypt correctly
   - [ ] No corruption in decrypted data
   - [ ] Special characters in passwords preserved: `P@$$w0rd!#%^&*()`

### Test 4: Large Dataset - 1000+ Emails

1. Generate and import 1000 emails via CSV import
2. Verify:
   - [ ] Import completes without error
   - [ ] All 1000 emails visible in email manager
   - [ ] Table scrolling/virtualization is smooth
   - [ ] Search/filter works across all 1000 emails
   - [ ] Sort by any column works correctly
   - [ ] Memory usage stays below 200MB
   - [ ] Page load time < 2 seconds
   - [ ] Export to CSV produces complete file with all 1000 rows

### Test 5: Large Dataset - 500+ Orders

1. Generate and add 500 orders (via CSV or programmatic insertion)
2. Verify:
   - [ ] All 500 orders visible in tracker
   - [ ] Table scrolling is smooth
   - [ ] Filtering by status, bot, retailer works
   - [ ] Sorting works correctly
   - [ ] Analytics page handles 500 orders without delay
   - [ ] Profit/spend charts render with correct aggregation
   - [ ] Bot performance chart shows all bots
   - [ ] Memory usage reasonable

### Test 6: Cross-Feature Data Links

1. Create an order
2. Create an inventory item linked to that order (via orderId)
3. Create a sale linked to that inventory item (via inventoryId)
4. Verify the chain:
   - [ ] Order shows in Orders page
   - [ ] Inventory item references the order
   - [ ] Sale references the inventory item
   - [ ] Analytics profit reflects: salePrice - purchasePrice - fees
5. Delete the order
6. Verify:
   - [ ] Inventory item still exists (or cascades appropriately)
   - [ ] Sale still exists (or cascades appropriately)
   - [ ] No orphaned references causing errors

### Test 7: CSV Round-Trip

1. Add 50 diverse records to orders (with special chars, long text, unicode)
2. Export to CSV
3. Delete all orders
4. Import the exported CSV
5. Verify:
   - [ ] All 50 records restored
   - [ ] All fields match original data exactly
   - [ ] Special characters preserved: commas, quotes, newlines in notes
   - [ ] Unicode characters preserved
   - [ ] Dates/timestamps correct
   - [ ] Numbers (prices) maintain precision (no floating point errors)
6. Repeat for emails and inventory

### Test 8: Database File Integrity

1. Locate the SQLite database file:
   - macOS: `~/Library/Application Support/com.bottingos.app/bottingos.db`
2. Verify file exists and is non-zero size
3. Run `sqlite3 bottingos.db "PRAGMA integrity_check"` - should return "ok"
4. Check WAL mode: `PRAGMA journal_mode` - should return "wal"

## Files to Create

- None (testing only)

## Files to Modify

- None (fix bugs if found during testing)

## Contracts

### Provides

- Data persistence verification
- Encryption integrity verification
- Large dataset performance verification
- Cross-feature link integrity
- CSV round-trip verification

### Consumes

- All data layer features from Phases 1-4
- CSV import/export
- Encryption system

## Acceptance Criteria

- [ ] All data persists correctly after app restart
- [ ] Wrong master password doesn't crash app or leak data
- [ ] Correct master password decrypts all data
- [ ] 1000 emails load, scroll, filter, and export correctly
- [ ] 500 orders load, scroll, filter, and feed analytics correctly
- [ ] Cross-feature links (order -> inventory -> sale) work correctly
- [ ] Deleted parent records don't cause orphan errors
- [ ] CSV export -> delete -> import round-trip preserves all data
- [ ] Special characters, unicode, and edge cases preserved in round-trip
- [ ] SQLite integrity check passes
- [ ] Memory usage < 200MB with large datasets
- [ ] No data corruption under any test scenario

## Testing Protocol

### Data Tests

- Execute each test (1-8) as described above
- Document failures with specific data that was lost or corrupted
- Test in both dev mode and production build

### Performance Measurements

- Time: 1000 email page load
- Time: 500 order page load
- Time: Analytics page with 500 orders
- Memory: Peak usage with large datasets

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- `.claude/skills/bottingos-data-model/SKILL.md`

## Research Files to Read

- None (testing task)

## Git

- Branch: `test/8.2-data-integrity`
- Commit prefix: `Task 8.2:`
