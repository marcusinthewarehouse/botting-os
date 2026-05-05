# Task 8.3: Edge Case & Error Testing

## Objective

Test edge cases and error handling: offline mode behavior, Discord not installed, invalid webhook payloads, empty states on every page, concurrent imports, long text handling, and special characters throughout the app.

## Context

Real users encounter unexpected conditions. This task deliberately breaks things to verify the app handles errors gracefully - no crashes, clear error messages, and no data loss. Every error state should be recoverable without restarting the app.

## Dependencies

- All Phases 1-7 complete

## Blocked By

- Task 7.R (all features must pass regression first)

## Research Findings

No additional research needed - error condition testing task.

## Implementation Plan

### Test 1: Offline Mode

BottingOS is a local-first desktop app, but some features depend on network (price lookup, webhook listener).

Steps:

1. Disconnect from internet (turn off Wi-Fi)
2. Launch BottingOS
3. Verify:
   - [ ] App launches successfully
   - [ ] All local features work (orders, emails, vault, VCCs, inventory)
   - [ ] Database reads and writes work
   - [ ] Navigation works
4. Try price lookup:
   - [ ] Clear error message (not a crash)
   - [ ] "Unable to fetch prices. Check your internet connection."
5. Try Discord CDP connect:
   - [ ] Handles gracefully if Discord can't connect
   - [ ] Error message displayed
6. Try webhook listener:
   - [ ] Webhook endpoint may not start, but app doesn't crash
7. Check analytics:
   - [ ] Local data still displays
   - [ ] No errors from failed network calls
8. Reconnect internet:
   - [ ] Price lookup works again without restart
   - [ ] Discord can connect
   - [ ] No stale error states

### Test 2: Discord Not Installed

1. Rename Discord.app temporarily (or test on a machine without Discord)
2. Navigate to Discord Settings
3. Click "Connect Discord"
4. Verify:
   - [ ] Clear error: "Discord is not installed" or "Discord not found"
   - [ ] No crash
   - [ ] Discord feed page shows appropriate state
   - [ ] Rest of app unaffected
5. Restore Discord
6. Verify connect works normally

### Test 3: Invalid Webhook Payloads

1. Start webhook listener
2. Send various malformed payloads:
   - Empty body: `curl -X POST http://localhost:PORT`
   - Invalid JSON: `curl -X POST -d "not json" http://localhost:PORT`
   - Wrong content type: `curl -X POST -H "Content-Type: text/plain" -d "hello" http://localhost:PORT`
   - Missing required fields: `curl -X POST -H "Content-Type: application/json" -d '{"foo": "bar"}' http://localhost:PORT`
   - Extremely large payload: 1MB+ JSON
   - SQL injection attempt: `{"item": "'; DROP TABLE orders; --"}`
   - XSS attempt: `{"item": "<script>alert('xss')</script>"}`
3. Verify for each:
   - [ ] No crash
   - [ ] Invalid payloads rejected with appropriate error response
   - [ ] Valid data not corrupted
   - [ ] Webhook listener continues working after bad payload
   - [ ] SQL injection has no effect (parameterized queries)
   - [ ] XSS content stored as plain text (not executed)

### Test 4: Empty States - Every Page

Navigate to every page with a completely empty database:

1. Dashboard:
   - [ ] Shows welcome message or empty KPIs ($0.00, not errors)
2. Profit Calculator:
   - [ ] Renders with empty fields, no errors
3. Orders:
   - [ ] "No orders yet" empty state with CTA
4. Inventory:
   - [ ] "No inventory items yet" empty state with CTA
5. Emails:
   - [ ] "No emails yet" empty state with CTA
6. Vault:
   - [ ] "No credentials saved" empty state with CTA
7. VCCs:
   - [ ] "No virtual cards yet" empty state with CTA
8. Discord Feed:
   - [ ] "Not connected" state with connect button
9. Discord Settings:
   - [ ] "Not connected" state, channel selector disabled
10. Analytics:
    - [ ] "No analytics data yet" with link to orders
11. Calendar:
    - [ ] Empty calendar, no drops
12. Notifications:
    - [ ] "No notifications yet" in dropdown
13. Resources:
    - [ ] Seeded links visible (not empty)

### Test 5: Concurrent Operations

1. Start a CSV import of 500 orders
2. While importing, navigate to other pages
3. Verify:
   - [ ] Import continues in background
   - [ ] Other pages load correctly
   - [ ] No database locking errors
   - [ ] Import completes successfully
4. Start two imports simultaneously (if possible):
   - [ ] Either queued or handled gracefully
   - [ ] No duplicate records
   - [ ] No database corruption

### Test 6: Long Text Handling

1. Create an order with:
   - Item name: 200 characters
   - Notes: 5000 characters
   - Order number: 100 characters
2. Verify:
   - [ ] Data saves without truncation
   - [ ] Displays correctly with text truncation in tables
   - [ ] Full text visible in detail view
   - [ ] No layout breaking
3. Create a vault entry with:
   - Password: 500 characters
   - Notes: 10000 characters
4. Verify:
   - [ ] Encrypts and decrypts correctly
   - [ ] No truncation of encrypted data
5. Discord message with 4000+ characters:
   - [ ] Displays without breaking layout
   - [ ] Virtualization still works

### Test 7: Special Characters

Test these strings across all text input fields:

```
' " ` \ / < > & | ; $ { } [ ] ( ) ! @ # % ^ * + = ~ , .
emoji: emojiface rocket fire
unicode: umlaut enye accent chinese japanese
newlines: "line1\nline2\nline3"
tabs: "col1\tcol2\tcol3"
null bytes: should be stripped or rejected
very long URL: https://example.com/path?param=value&foo=bar... (500+ chars)
```

For each input:

- [ ] Data saves correctly
- [ ] Data displays correctly
- [ ] No XSS (HTML tags rendered as text)
- [ ] No SQL injection
- [ ] CSV export/import preserves special characters

### Test 8: Rapid Actions

1. Click "Add Order" and submit 10 times rapidly
2. Verify:
   - [ ] 10 orders created (not more, not less)
   - [ ] No duplicate submissions
   - [ ] No database errors
3. Rapidly switch between pages (10 quick clicks)
4. Verify:
   - [ ] No errors
   - [ ] Each page loads correctly
   - [ ] No stale data from previous page
5. Rapidly open and close modals
6. Verify:
   - [ ] No animation glitches
   - [ ] No orphaned overlays

### Test 9: Recovery from Errors

1. Force an error (e.g., try to access a deleted record)
2. Verify:
   - [ ] Error shown to user, not a white screen
   - [ ] User can navigate away
   - [ ] App recovers without restart
3. If any test above causes an error:
   - [ ] App remains functional after the error
   - [ ] No need to restart

## Files to Create

- None (testing only)

## Files to Modify

- None (fix bugs if found during testing)

## Contracts

### Provides

- Edge case coverage for all error conditions
- Graceful error handling verification
- Security testing (SQL injection, XSS)
- Robustness under concurrent and rapid use

### Consumes

- All features from Phases 1-7

## Acceptance Criteria

- [ ] App works offline for all local features
- [ ] Network errors show clear messages, not crashes
- [ ] "Discord not installed" handled gracefully
- [ ] Invalid webhook payloads rejected without crash
- [ ] SQL injection attempts have no effect
- [ ] XSS content rendered as plain text
- [ ] Every page has a proper empty state
- [ ] Concurrent imports don't corrupt data
- [ ] Long text (5000+ chars) saves and displays correctly
- [ ] Special characters preserved in all fields
- [ ] Rapid actions don't cause duplicates or errors
- [ ] App recovers from errors without restart
- [ ] No white screen / unhandled errors in any scenario

## Testing Protocol

### Manual Tests

- Execute each test (1-9) as described above
- Document failures with reproduction steps
- Test in both dev mode and production build

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- None (testing task)

## Research Files to Read

- None (testing task)

## Git

- Branch: `test/8.3-edge-cases`
- Commit prefix: `Task 8.3:`
