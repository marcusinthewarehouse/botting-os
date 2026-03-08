# Task 6.2: Drop Calendar

## Objective

Build a calendar view for tracking upcoming product drops with month and list view toggles, manual drop entry with full details, category color coding, and native OS reminder notifications via tauri-plugin-notification.

## Context

Botters need to track product release dates across multiple brands and retailers. This calendar provides a visual overview of upcoming drops with the ability to set reminders. Each drop has a name, date, time, retailer, category, notes, and optional URL. Reminders fire via the OS notification system so users don't miss drops even when the app is minimized.

## Dependencies

- Phase 1: Drizzle ORM, db instance, migration runner
- tauri-plugin-notification (registered in lib.rs)

## Blocked By

- Nothing (standalone feature using existing infrastructure)

## Research Findings

### Schema: drops table

The `drop_calendar` table from the data model skill:

```typescript
export const dropCalendar = sqliteTable("drop_calendar", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name").notNull(),
  brand: text("brand"),
  dropDate: integer("drop_date", { mode: "timestamp" }).notNull(),
  source: text("source"), // manual, discord, scrape
  url: text("url"),
  category: text("category"), // sneakers, pokemon, funko, supreme, electronics
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

If this table doesn't exist yet in schema.ts, add it with a new migration.

### Additional fields needed beyond base schema

- `retailer` (text) - nike, footlocker, shopify, etc.
- `dropTime` (text) - time string "10:00 AM EST" (separate from date for display)
- `reminderMinutes` (integer) - minutes before drop to notify (null = no reminder)
- `reminded` (integer, boolean mode) - whether reminder has fired

### Category Color Coding

```typescript
const categoryColors: Record<string, string> = {
  sneakers: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  pokemon: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  funko: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  supreme: "bg-red-500/15 text-red-400 border-red-500/25",
  electronics: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "trading cards": "bg-orange-500/15 text-orange-400 border-orange-500/25",
  other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};
```

### Notification Pattern (tauri-plugin-notification)

```typescript
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

async function notify(title: string, body: string) {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }
  if (granted) {
    sendNotification({ title, body });
  }
}
```

### Reminder Timer

- On app launch and every minute, check for drops where:
  - `dropDate - reminderMinutes <= now`
  - `reminded = false`
- Fire notification and set `reminded = true`
- Use `setInterval(checkReminders, 60000)` in a layout-level effect

## Implementation Plan

### Step 1: Update Schema if Needed

If `drop_calendar` table doesn't exist in `src/lib/db/schema.ts`, add it:

```typescript
export const drops = sqliteTable("drops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productName: text("product_name").notNull(),
  brand: text("brand"),
  retailer: text("retailer"),
  category: text("category"),
  dropDate: integer("drop_date", { mode: "timestamp" }).notNull(),
  dropTime: text("drop_time"),
  url: text("url"),
  notes: text("notes"),
  reminderMinutes: integer("reminder_minutes"),
  reminded: integer("reminded", { mode: "boolean" }).default(false),
  source: text("source").default("manual"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

Add migration for new table if needed.

### Step 2: Create Calendar Month View

`src/components/calendar/month-view.tsx`:

Standard month grid:

```
+------------------------------------------------------------------+
| < December 2025 >                                                |
+------------------------------------------------------------------+
| Sun  | Mon  | Tue  | Wed  | Thu  | Fri  | Sat  |
+------+------+------+------+------+------+------+
|      |   1  |   2  |   3  |   4  |   5  |   6  |
|      |      | [dot]|      | [dot]|      |      |
+------+------+------+------+------+------+------+
```

- Navigate months with arrows
- Days with drops show colored dots (by category)
- Click a day to see drops in that day
- Today highlighted with amber border
- Past days dimmed
- Click drop dot to open detail/edit modal

### Step 3: Create List View

`src/components/calendar/list-view.tsx`:

```
+------------------------------------------------------------------+
| Upcoming Drops                                                   |
+------------------------------------------------------------------+
| TODAY                                                            |
| [Sneakers] Nike Dunk Low Panda  | Footlocker | 10:00 AM EST     |
|            [Reminder: 15 min before]                             |
+------------------------------------------------------------------+
| TOMORROW                                                        |
| [Pokemon]  Pokemon 151 Restock  | Pokemon Center | 12:00 PM EST |
+------------------------------------------------------------------+
| Dec 15                                                          |
| [Supreme]  Week 12 Drop         | Supreme    | 11:00 AM EST     |
+------------------------------------------------------------------+
```

- Grouped by date
- Category badge (color coded)
- Product name, retailer, time
- Reminder indicator
- Past drops in muted style

### Step 4: Create Drop Form Modal

`src/components/calendar/drop-form.tsx`:

Dialog/Sheet with fields:

- Product Name (required)
- Brand (optional)
- Retailer (optional)
- Category (select: sneakers, pokemon, funko, supreme, electronics, trading cards, other)
- Date (date picker)
- Time (time input, text)
- URL (optional)
- Notes (optional textarea)
- Reminder (select: None, 5 min, 15 min, 30 min, 1 hour, 1 day)
- Save/Cancel buttons

### Step 5: Create Calendar Page

`src/app/(dashboard)/calendar/page.tsx`:

```
+------------------------------------------------------------------+
| Drop Calendar          [Month | List] [+ Add Drop]              |
+------------------------------------------------------------------+
| [Month View or List View based on toggle]                        |
+------------------------------------------------------------------+
```

- Toggle between month and list view
- "Add Drop" button opens form modal
- Click existing drop to edit/delete
- Load drops from database on mount
- Empty state when no drops exist

### Step 6: Reminder System

`src/lib/reminders.ts`:

```typescript
async function checkReminders() {
  const now = new Date();
  const pendingDrops = await db
    .select()
    .from(drops)
    .where(
      and(
        eq(drops.reminded, false),
        isNotNull(drops.reminderMinutes),
        lte(drops.dropDate, new Date(now.getTime() + MAX_REMINDER_WINDOW)),
      ),
    );

  for (const drop of pendingDrops) {
    const reminderTime = new Date(
      drop.dropDate.getTime() - drop.reminderMinutes! * 60000,
    );
    if (now >= reminderTime) {
      await notify(
        `Drop Reminder: ${drop.productName}`,
        `${drop.productName} drops ${drop.dropTime ? "at " + drop.dropTime : "soon"}${drop.retailer ? " on " + drop.retailer : ""}`,
      );
      await db
        .update(drops)
        .set({ reminded: true })
        .where(eq(drops.id, drop.id));
    }
  }
}
```

Start the interval in the dashboard layout or app root:

```typescript
useEffect(() => {
  checkReminders();
  const interval = setInterval(checkReminders, 60000);
  return () => clearInterval(interval);
}, []);
```

## Files to Create

- `src/app/(dashboard)/calendar/page.tsx` - Drop calendar page
- `src/components/calendar/month-view.tsx` - Month grid calendar
- `src/components/calendar/list-view.tsx` - Chronological list view
- `src/components/calendar/drop-form.tsx` - Add/edit drop modal
- `src/lib/reminders.ts` - Reminder checking and notification logic

## Files to Modify

- `src/lib/db/schema.ts` - Add `drops` table if not present
- `src/lib/db/migrate.ts` - Add migration for drops table if needed
- Dashboard layout - Add reminder interval check

## Contracts

### Provides

- Drop calendar page at `/calendar`
- Month view with category-colored drop indicators
- List view with chronological drop listing
- Drop CRUD (create, read, update, delete)
- Reminder notifications via tauri-plugin-notification
- `drops` table in schema
- `checkReminders()` function for periodic reminder checks

### Consumes

- Phase 1: `db`, Drizzle ORM, migration runner
- `tauri-plugin-notification` for OS notifications
- `date-fns` for date formatting and math

## Acceptance Criteria

- [ ] Calendar page renders at `/calendar`
- [ ] Month view displays current month with navigation
- [ ] Days with drops show category-colored dots
- [ ] Clicking a day shows drops for that day
- [ ] Today highlighted with amber border
- [ ] List view shows upcoming drops grouped by date
- [ ] Toggle between month and list view works
- [ ] "Add Drop" opens form modal
- [ ] Form validates required fields (product name, date)
- [ ] Category select with color preview
- [ ] Reminder select (None, 5/15/30 min, 1 hour, 1 day)
- [ ] Drops save to database correctly
- [ ] Edit existing drop by clicking it
- [ ] Delete drop with confirmation
- [ ] Reminder notifications fire at correct time
- [ ] Reminder only fires once per drop (reminded flag)
- [ ] OS notification permission requested on first reminder
- [ ] Past drops shown in muted style
- [ ] Empty state when no drops
- [ ] Design matches zinc dark theme with amber accents

## Testing Protocol

### Unit Tests

- Test reminder timing calculation
- Test date grouping for list view
- Test category color mapping

### Browser/Playwright Tests

- Create a drop, verify it appears on calendar
- Edit a drop, verify changes persist
- Delete a drop, verify it's removed
- Switch between month and list views
- Navigate months in month view

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`
- `.claude/skills/tauri-commands/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/ui-ux-design.md`

## Git

- Branch: `feat/6.2-drop-calendar`
- Commit prefix: `Task 6.2:`
