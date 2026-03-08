# Skill: BottingOS shadcn/ui Patterns

Read this before building any UI component. Follow these patterns exactly.

---

## Design System

### Philosophy

"Linear of botting tools." Clean, quiet, professional. Data speaks, chrome doesn't. No gamer/neon aesthetics. No bounce effects. No animated backgrounds.

### Colors

```
Background:      #09090B   (zinc-950)
Surface:         #000000   (0% brightness - cards, panels)
Surface raised:  #27272A   (zinc-800 - hover, elevated)
Surface overlay: #3F3F46   (zinc-700 - popovers, dropdowns)

Accent:          #F59E0B   (amber-500 - primary actions ONLY)
Accent hover:    #FBBF24   (amber-400)
Accent muted:    rgba(245,158,11,0.15)  (selected states)

Text primary:    #FAFAFA   (zinc-50)
Text secondary:  #A1A1AA   (zinc-400)
Text muted:      #71717A   (zinc-500)

Border:          rgba(255,255,255,0.23)  (23% white opacity)
Border subtle:   rgba(255,255,255,0.06)

Success/profit:  #4ADE80   (green-400)
Warning:         #F59E0B   (amber-500)
Error/loss:      #F87171   (red-400)
Info/completed:  #60A5FA   (blue-400)
Inactive:        #71717A   (zinc-500)
```

### Typography

- **UI text**: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI"`)
- **Data/values/prices/SKUs**: Monospace (`font-mono tabular-nums`)
- **Prices**: Always 2 decimals, `$` prefix, green for profit, red for loss
- **Table cells**: `text-sm` (14px)
- **KPI numbers**: `text-3xl font-semibold font-mono tabular-nums`
- **Scale**: xs=12px, sm=14px, base=16px, lg=18px, xl=20px, 2xl=24px, 3xl=30px

### Border Radius

Global: `0.5rem` (8px). Not too rounded, not too sharp.

---

## Component Patterns

### Status Badges

Consistent across entire app. Use `Badge` with these variants:

```tsx
const statusColors = {
  active: "bg-green-500/15 text-green-400 border-green-500/25",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  sold: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  error: "bg-red-500/15 text-red-400 border-red-500/25",
  inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};
```

Mapping: Active/InStock/Connected = green. Pending/Processing/Syncing = amber. Sold/Completed/Delivered = blue. Error/Cancelled/Expired = red. Inactive/Unused/Draft = gray.

### Profit/Loss Display

```tsx
<span
  className={cn(
    "font-mono tabular-nums",
    value >= 0 ? "text-green-400" : "text-red-400",
  )}
>
  {value >= 0 ? "+" : ""}
  {formatCurrency(value)}
</span>
```

### KPI Cards

```tsx
<Card className="p-6">
  <p className="text-sm text-muted-foreground">Total Profit</p>
  <p className="text-3xl font-semibold font-mono tabular-nums text-green-400 mt-1">
    +$12,847.50
  </p>
  <p className="text-xs text-muted-foreground mt-2">
    <span className="text-green-400">+12.3%</span> vs last month
  </p>
</Card>
```

Use count-up animation (500ms) for KPI number changes via Motion Primitives.

### Card Hover

Subtle border glow, not background change:

```tsx
className = "transition-colors duration-150 hover:border-amber-500/30";
```

### Search Input

Include keyboard shortcut hint:

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input placeholder="Search..." className="pl-9 bg-zinc-900 border-zinc-800" />
  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-zinc-800 px-1.5 py-0.5 rounded">
    /
  </kbd>
</div>
```

### Empty States

Every table/list needs one:

- Subtle line icon (Lucide)
- Heading: "No [items] yet"
- Description: One sentence explaining when data appears
- CTA button: Primary action to populate the section

---

## TanStack Table Configuration

Used for: Inventory, Orders, Accounts, Emails, VCCs.

### Default Visible Columns

| Table     | Columns                                                             |
| --------- | ------------------------------------------------------------------- |
| Inventory | Name, SKU, Purchase Price, Current Value, Profit, Status, Days Held |
| Orders    | Date, Item, Retailer, Price, Status, Bot                            |
| Accounts  | Email, Retailer, Status, Last Used                                  |
| VCCs      | Label, Last 4, Provider, Linked Account                             |

Hidden by default (column visibility toggle): proxy, checkout time, order number, notes, tags.

### Filter Bar Pattern

```
[Search (debounced 300ms)] [Status dropdown] [Retailer dropdown] [Date range] [Clear all]
```

- Faceted filters for categorical data
- Filter chips below search bar for active filters
- "Clear all" visible when any filter active

### Sorting

- Click header to sort. Sort icon only on hover or when active.
- Shift+click for multi-column sort.
- Persist sort preference in localStorage.

### Bulk Actions

- Checkbox column on left
- Floating action bar at bottom when items selected: "3 selected - [Export] [Delete] [Tag]"
- Linear-style selection pattern

### Virtual Scrolling

For 500+ row tables (emails, large inventory): use TanStack Virtual. Render only visible rows + buffer.

### Skeleton Loading

Use `animate-pulse` skeletons matching the table layout. Never use spinners.

---

## Sidebar Navigation

### Structure

```
[Logo]

Dashboard          (LayoutDashboard)
---
Profit Calculator  (Calculator)
Orders             (Package)
Inventory          (Boxes)
---
Accounts           (Users)
Emails             (Mail)
VCCs               (CreditCard)
---
Analytics          (BarChart3)
Settings           (Settings)
```

Icons: Lucide (included with shadcn).

### Responsive Behavior

- Desktop: Fixed 240px, icon + label
- Tablet: Icon-only 64px with tooltips
- Mobile: Bottom tab bar (5 core sections) + hamburger for rest. Use shadcn `Sheet` for full mobile sidebar.

### States

- Active: Accent background tint (`bg-amber-500/15`) + bold label
- Hover: `bg-zinc-800`
- Collapsed: Icons only, tooltips on hover
- Collapse/expand: Width + opacity transition, 200ms CSS

---

## Animation Patterns (Framer Motion)

### Transition Presets

```tsx
export const transitions = {
  spring: { type: "spring", stiffness: 500, damping: 30 },
  ease: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  snappy: { duration: 0.15, ease: "easeOut" },
} as const;

export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.ease },
  exit: { opacity: 0, y: -8, transition: transitions.snappy },
};
```

### Animation Catalog

| Element           | Animation             | Duration |
| ----------------- | --------------------- | -------- |
| Page transition   | Fade + slide up 8px   | 200ms    |
| Modal/Sheet open  | Scale 0.95 + fade     | 150ms    |
| Modal/Sheet close | Scale to 0.95 + fade  | 100ms    |
| Table row add     | Fade in + slide down  | 150ms    |
| Table row delete  | Fade out + slide left | 150ms    |
| Tab switch        | Content crossfade     | 150ms    |
| Button press      | `active:scale-[0.97]` | 100ms    |
| Card hover        | Border glow + shadow  | 150ms    |
| Dropdown open     | Scale Y from top      | 100ms    |
| Status change     | Color transition      | 300ms    |

### Rules

- Only animate `transform` and `opacity` (GPU-accelerated)
- Use `AnimatePresence` for mount/unmount
- Respect `prefers-reduced-motion: reduce`
- No bounce effects, no animations > 300ms for UI elements
- No parallax, no animated backgrounds

---

## Toast Notifications (Sonner)

Slide in from right, 200ms. Use for:

- Webhook events ("New checkout from Cybersole")
- Sync status ("Data synced")
- Errors ("Failed to connect to Discord")
- Success ("Order saved")

Keep messages short. One line. Include action button when relevant ("View order").

---

## Popover/Dropdown Glass Effect

```tsx
className = "backdrop-blur-xl bg-zinc-900/80 border border-white/[0.06]";
```

---

## Custom Scrollbars

```css
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

---

## Focus Rings

Replace default with subtle glow:

```tsx
className =
  "focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-0";
```

---

## Mobile-Prep Patterns

Build these responsive patterns now even though mobile comes later:

1. **Sidebar**: Collapses to icons at `md:`, becomes bottom tab bar at `sm:`
2. **Tables become card lists**: `<tr className="hidden md:table-row">` / `<Card className="md:hidden">`
3. **Modals become bottom sheets**: `Sheet` with `side="bottom"` on mobile
4. **Touch targets**: Minimum 44x44px on interactive elements (`p-3` minimum)
5. **CSS variables for layout**:
   ```css
   :root {
     --sidebar-width: 0px;
   }
   @media (min-width: 768px) {
     :root {
       --sidebar-width: 240px;
     }
   }
   ```
6. Use Tailwind responsive prefixes from day one - design mobile-first, add `md:` / `lg:` for desktop

---

## Command Palette (Cmd+K)

Use shadcn `Command` (cmdk). Groups:

- **Navigation**: Go to Dashboard, Inventory, Orders...
- **Actions**: New Order, Add Account, Quick Profit Check...
- **Search**: Search inventory, accounts, orders...
- **Recent**: Last 5 viewed items

Implement early. Single most impactful power-user feature.

---

## Don'ts

- No pure black (#000) for backgrounds (use zinc-950 #09090B)
- No neon/gamer accent colors
- No loading spinners (use skeleton screens)
- No entrance animations on every page load
- No gradient text (except sparingly on hero headings)
- No animated gradients or backgrounds
- No `width`/`height`/`top`/`left` animations
- No bounce easing
- No color-based text hierarchy (use opacity: primary 90-95%, secondary 60-70%, disabled 40%)
