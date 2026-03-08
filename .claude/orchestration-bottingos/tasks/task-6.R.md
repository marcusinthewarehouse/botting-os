# Task 6.R: Phase 6 Regression

## Objective

Verify all Phase 6 features (Analytics, Calendar, Notifications, Resources) work correctly and confirm no regressions in Phase 1-5 functionality.

## Context

Phase 6 added four new sections: analytics dashboard with charts (6.1), drop calendar with reminders (6.2), notification center with OS notifications (6.3), and resource hub with curated links (6.4). This regression validates each new feature end-to-end and confirms existing features still work.

## Dependencies

- Task 6.1: Analytics dashboard
- Task 6.2: Drop calendar
- Task 6.3: Notification center
- Task 6.4: Resource hub
- All Phase 1-5 tasks

## Blocked By

- Tasks 6.1, 6.2, 6.3, 6.4 (all must be complete)

## Research Findings

No additional research needed - testing/validation task.

## Implementation Plan

### Step 1: Analytics Dashboard (6.1)

1. Navigate to `/analytics`
2. With no data: verify empty state with "No analytics data yet" message
3. Add several test orders and sales via the tracker
4. Return to analytics - verify KPI cards populate:
   - Total Profit shows correct sum
   - Total Spend shows correct sum
   - Items Sold shows correct count
   - Average ROI calculates correctly
5. Verify profit/spend line chart renders with data points
6. Verify bot performance bar chart groups by bot name
7. Verify category ROI bar chart groups by category
8. Switch time ranges (7d, 30d, 90d, 1y, All) - verify data updates
9. Verify tooltips show exact values on hover
10. Verify loading skeletons appear during data fetch

### Step 2: Drop Calendar (6.2)

1. Navigate to `/calendar`
2. Verify empty state when no drops
3. Click "Add Drop" - verify form modal opens
4. Create a drop with all fields: name, brand, retailer, category, date, time, URL, notes, reminder
5. Verify drop appears on calendar month view (correct date, category dot color)
6. Switch to list view - verify drop appears in chronological list
7. Click the drop - verify edit form loads with correct data
8. Edit the drop, save - verify changes persist
9. Delete the drop - verify it's removed
10. Create a drop with a reminder set to "5 minutes before"
11. Verify reminder notification fires (or manually test with past date)
12. Navigate between months - verify navigation works
13. Verify today is highlighted with amber border

### Step 3: Notification Center (6.3)

1. Verify bell icon visible in app header
2. With no notifications: click bell, verify empty state
3. Create test notifications via `createNotification()` or by triggering events
4. Verify unread count badge appears on bell
5. Click bell - verify dropdown shows notifications
6. Verify each notification shows type icon, title, body, relative time
7. Verify unread notifications have amber dot
8. Click a notification - verify it marks as read and navigates to actionUrl
9. Click "Mark all as read" - verify all unread indicators clear
10. Verify badge count updates
11. Test OS notification by creating one with `sendOs: true`
12. Verify notification permission prompt appears on first OS notification

### Step 4: Resource Hub (6.4)

1. Navigate to `/resources`
2. Verify 20-30 seeded links appear on first load
3. Verify grid layout with cards showing name, description, category badge
4. Click category tabs - verify filtering works
5. Search for a resource by name - verify search filter
6. Click a resource card - verify URL opens in default browser
7. Click "Add Link" - verify form modal
8. Add a custom link with name, URL, description, category
9. Verify custom link appears in grid with edit/delete actions
10. Edit custom link - verify changes persist
11. Delete custom link - verify removal
12. Verify seeded links don't have edit/delete actions
13. Verify card hover effect (amber border glow)

### Step 5: Cross-Feature Integration

1. Create a drop with a reminder - verify notification appears in notification center
2. If webhook integration exists: trigger a webhook, verify notification appears
3. Navigate between all new pages - verify no errors
4. Check sidebar/navigation includes all new sections

### Step 6: Phase 1-5 Regression

Run through each existing feature:

**Phase 1 - Data Layer:**

- [ ] App launches with SQLite database
- [ ] Settings persist across restarts
- [ ] New tables (drops, notifications, resources) created correctly

**Phase 2 - Core Features:**

- [ ] Profit calculator works
- [ ] Order tracker CRUD works
- [ ] Email manager works
- [ ] Vault encrypts/decrypts
- [ ] VCC manager works

**Phase 3 - Marketplace:**

- [ ] Price lookup returns results
- [ ] Price comparison displays correctly

**Phase 4 - Webhooks & Inventory:**

- [ ] Webhook listener receives payloads
- [ ] Inventory management works
- [ ] CSV import/export functions

**Phase 5 - Discord:**

- [ ] Discord CDP launches and connects
- [ ] Messages captured and displayed
- [ ] Channel selection persists
- [ ] Keyword highlighting works

## Files to Create

- None (testing only)

## Files to Modify

- None (testing only; fix bugs if found)

## Contracts

### Provides

- Validation that Phase 6 features work correctly
- Confirmation of no regressions in Phases 1-5
- Bug reports for any issues found

### Consumes

- All Phase 1-6 features

## Acceptance Criteria

- [ ] Analytics dashboard renders with correct data
- [ ] All 4 KPI cards display correct values
- [ ] All 3 charts render with data
- [ ] Time range selector works for all ranges
- [ ] Drop calendar month view displays drops correctly
- [ ] Drop calendar list view shows chronological drops
- [ ] Drop CRUD operations work
- [ ] Reminder notifications fire at correct time
- [ ] Notification center bell icon shows unread count
- [ ] Notification dropdown lists recent notifications
- [ ] Click notification navigates to correct page
- [ ] OS notifications fire correctly
- [ ] Resource hub shows seeded links
- [ ] Resource category filtering and search work
- [ ] Custom link CRUD works
- [ ] All Phase 1-5 features pass regression
- [ ] No TypeScript compilation errors
- [ ] No Rust compilation errors
- [ ] No console errors during normal operation

## Testing Protocol

### Smoke Test

- App launches without errors
- All navigation links work (including new pages)
- No console errors on any page

### E2E Tests

- Full walkthrough of each Phase 6 feature as described above
- Each Phase 1-5 feature touched at least once

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

- Branch: `test/6.R-phase6-regression`
- Commit prefix: `Task 6.R:`
