# Task 6.3: Notification Center

## Objective

Build an in-app notification center with a bell icon in the header, unread count badge, dropdown notification list, and OS notification integration via tauri-plugin-notification. Supports notification types: webhook_received, price_alert, drop_reminder, and discord_keyword.

## Context

BottingOS generates events from multiple sources: webhook orders, price alerts, drop reminders, Discord keyword matches. Users need a central place to see all notifications, with click-to-navigate functionality. The bell icon lives in the app header/topbar and shows an unread count. OS-level notifications fire for critical events so users get alerts even when the app is minimized.

## Dependencies

- Phase 1: Drizzle ORM, db instance, migration runner
- tauri-plugin-notification (registered in lib.rs)
- Task 6.2: Drop reminder notifications (optional - can share the notification utility)

## Blocked By

- Nothing (can be built standalone, integrations added incrementally)

## Research Findings

### Schema: notifications table

```typescript
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // webhook_received, price_alert, drop_reminder, discord_keyword
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: integer("read", { mode: "boolean" }).default(false),
  actionUrl: text("action_url"), // internal route to navigate on click
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### Notification Types & Actions

| Type             | Title Example                   | Action URL    |
| ---------------- | ------------------------------- | ------------- |
| webhook_received | "New checkout from Cybersole"   | `/orders`     |
| price_alert      | "Nike Dunk Low dropped to $120" | `/calculator` |
| drop_reminder    | "Pokemon 151 drops in 15 min"   | `/calendar`   |
| discord_keyword  | "Keyword 'restock' in #drops"   | `/discord`    |

### Bell Icon Pattern

```tsx
<Button variant="ghost" size="icon" className="relative">
  <Bell className="h-5 w-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[10px] font-bold flex items-center justify-center text-black">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  )}
</Button>
```

### OS Notification Pattern

```typescript
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

async function sendOsNotification(title: string, body: string) {
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

## Implementation Plan

### Step 1: Add Notifications Table to Schema

If not already present in `src/lib/db/schema.ts`, add the `notifications` table and a migration.

### Step 2: Create Notification Service

`src/lib/notifications.ts`:

```typescript
interface CreateNotificationInput {
  type:
    | "webhook_received"
    | "price_alert"
    | "drop_reminder"
    | "discord_keyword";
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  sendOs?: boolean; // also send OS notification
}

async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  await db.insert(notifications).values({
    type: input.type,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl,
    metadata: input.metadata,
    read: false,
    createdAt: new Date(),
  });

  if (input.sendOs) {
    await sendOsNotification(input.title, input.body);
  }
}

async function getUnreadCount(): Promise<number>;
async function getNotifications(limit?: number): Promise<Notification[]>;
async function markAsRead(id: number): Promise<void>;
async function markAllAsRead(): Promise<void>;
async function deleteNotification(id: number): Promise<void>;
```

### Step 3: Create Notification Center Component

`src/components/notification-center.tsx`:

Bell icon button that opens a Popover:

```
+------------------------------------------+
| Notifications          [Mark all as read] |
+------------------------------------------+
| [amber dot] New checkout from Cybersole   |
|             Cybersole x1 Nike Dunk Low    |
|             2 minutes ago                 |
+------------------------------------------+
| [amber dot] Keyword 'restock' in #drops   |
|             "Jordan 4 restocking at..."   |
|             15 minutes ago                |
+------------------------------------------+
|            [no dot] Drop Reminder         |
|             Pokemon 151 drops in 15 min   |
|             1 hour ago                    |
+------------------------------------------+
| [View all notifications]                  |
+------------------------------------------+
```

- Popover or Sheet dropdown from bell icon
- Unread notifications have amber dot indicator
- Each notification shows: type icon, title, body (truncated), relative time
- Click notification: mark as read + navigate to actionUrl
- "Mark all as read" button at top
- "View all" link at bottom (optional full page)
- Max 20 recent notifications in dropdown
- Empty state: "No notifications yet"

### Step 4: Type-Specific Icons

```typescript
const notificationIcons: Record<string, LucideIcon> = {
  webhook_received: Package,
  price_alert: TrendingDown,
  drop_reminder: Calendar,
  discord_keyword: MessageSquare,
};
```

### Step 5: Integrate Bell Icon into Header

Add the NotificationCenter component to the app's header/topbar layout. It should be visible on all dashboard pages.

### Step 6: Hook Into Existing Event Sources

Create integration points (these can be called from other features):

```typescript
// Called from webhook handler (Phase 4)
await createNotification({
  type: "webhook_received",
  title: `New checkout from ${botName}`,
  body: `${productName} x${quantity}`,
  actionUrl: "/orders",
  sendOs: true,
});

// Called from Discord feed (Phase 5) when keyword matches
await createNotification({
  type: "discord_keyword",
  title: `Keyword '${keyword}' in #${channelName}`,
  body: messageContent.slice(0, 100),
  actionUrl: "/discord",
  sendOs: true,
});
```

Note: Actual integration into webhook/Discord code is optional in this task. The important thing is the `createNotification()` API is available and the UI works.

### Step 7: Auto-Refresh

Poll for new notifications or use a simple state subscription:

```typescript
// In NotificationCenter component
const [notifications, setNotifications] = useState<Notification[]>([]);
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  loadNotifications();
  const interval = setInterval(loadNotifications, 10000); // check every 10s
  return () => clearInterval(interval);
}, []);
```

## Files to Create

- `src/components/notification-center.tsx` - Bell icon + notification dropdown
- `src/lib/notifications.ts` - Notification CRUD service + OS notification helper

## Files to Modify

- `src/lib/db/schema.ts` - Add `notifications` table if not present
- `src/lib/db/migrate.ts` - Add migration for notifications table
- Dashboard layout/header - Add NotificationCenter component

## Contracts

### Provides

- `NotificationCenter` component (bell icon + dropdown)
- `createNotification(input)` - Create in-app + optional OS notification
- `getNotifications(limit?)` - Fetch recent notifications
- `getUnreadCount()` - Get unread count for badge
- `markAsRead(id)` / `markAllAsRead()` - Mark notifications read
- `notifications` table in schema
- Notification types: webhook_received, price_alert, drop_reminder, discord_keyword

### Consumes

- Phase 1: `db`, Drizzle ORM
- `tauri-plugin-notification` for OS notifications
- `date-fns` for relative timestamps

## Acceptance Criteria

- [ ] Bell icon visible in app header on all pages
- [ ] Unread count badge shows correct count (0 = hidden, 99+ cap)
- [ ] Clicking bell opens notification dropdown
- [ ] Notifications show type icon, title, body, relative time
- [ ] Unread notifications have amber dot indicator
- [ ] Clicking notification marks as read and navigates to actionUrl
- [ ] "Mark all as read" clears all unread indicators
- [ ] Notifications persist to database
- [ ] `createNotification()` API works for all 4 types
- [ ] OS notification fires when `sendOs: true`
- [ ] OS notification permission requested on first use
- [ ] Empty state when no notifications
- [ ] Max 20 notifications in dropdown
- [ ] Auto-refresh every 10 seconds
- [ ] Design matches zinc dark theme with amber accents

## Testing Protocol

### Unit Tests

- Test `createNotification()` persists to database
- Test `getUnreadCount()` returns correct count
- Test `markAsRead()` updates read flag
- Test `markAllAsRead()` updates all

### Browser/Playwright Tests

- Verify bell icon renders in header
- Create test notification, verify it appears in dropdown
- Click notification, verify navigation to actionUrl
- Mark all as read, verify badge clears
- Verify empty state when no notifications

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`
- `.claude/skills/tauri-commands/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/ui-ux-design.md`

## Git

- Branch: `feat/6.3-notifications`
- Commit prefix: `Task 6.3:`
