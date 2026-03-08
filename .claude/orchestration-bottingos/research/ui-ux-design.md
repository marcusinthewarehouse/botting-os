# BottingOS UI/UX Design Research

**Date**: 2026-03-07
**Goal**: Define the design language, patterns, and implementation strategy for an "Apple-level clean UI" botting operations tool.

---

## 1. Competitor UI Analysis

### Cybersole 5.0

- **Color scheme**: Green accent on black background. High contrast, gamer-esque aesthetic.
- **Layout**: Task groups with detail columns (product, profile, proxy, size, status). Analytics dashboard with checkout/spending diagrams and proxy usage monitor.
- **What works**: Clear task status visibility, analytics integration, Smart Actions (automated triggers).
- **What doesn't**: Green-on-black feels dated and aggressive. Information density is high without clear visual hierarchy. The "gamer" aesthetic alienates casual users.
- **Mobile**: Redesigned companion app for 5.0, but it's a separate app, not responsive web.

### Valor AIO

- **Considered one of the best-looking bot UIs** in the community.
- **Dashboard**: Shows total checkouts, declines, spend totals, per-site breakdowns.
- **What works**: Clean stats presentation, restocking automation built into the UI.
- **What doesn't**: Still follows the "dark sidebar + content area" pattern every bot uses. No visual differentiation.

### NSB (Nike Shoe Bot)

- **Designed for beginners** - simple and approachable.
- **What works**: In-bot monitors, keyword-based task hooking. Easy onboarding.
- **What doesn't**: Basic visual design. Functional but not aspirational.

### AYCD Toolbox

- **Rating**: 8/10 for UI/UX from reviewers. "Simplistic and beginner-friendly."
- **Tools**: OneClick, Spoof, Billing Converter, ServerGen, BotManager, CookieGen.
- **What works**: Each tool has a focused, single-purpose interface.
- **What doesn't**: Scaling issues reported (too large/zoomed, taking up screen). Multiple separate tools instead of unified experience. The "toolbox" metaphor means context-switching between mini-apps.

### Key Takeaway - What Makes Competitor UIs Feel "Clunky"

1. **Gamer aesthetic** - Neon accents, aggressive colors, dark backgrounds that prioritize looking "cool" over usability.
2. **Information overload** - Every column visible, no progressive disclosure. All data shown at once.
3. **Fragmented tools** - AYCD has separate apps for each function. No unified navigation.
4. **No visual hierarchy** - Everything is the same size and weight. Nothing guides the eye.
5. **Desktop-only thinking** - Interfaces built for 1920x1080 monitors, no consideration for smaller screens.
6. **Generic dark themes** - Using pure black (#000) with harsh white text instead of nuanced dark palettes.

**BottingOS opportunity**: Be the Linear/Raycast of botting tools. Clean, quiet, focused. Let the data speak, not the chrome.

---

## 2. Premium Dark Mode Design Patterns

### Reference Apps and What Makes Them Premium

**Linear**

- Uses LCH color space (not HSL) for perceptually uniform colors across themes.
- Only 3 theme variables: base color, accent color, contrast. Everything else derived.
- Inter Display for headings, Inter for body text. Typography creates hierarchy, not color.
- Neutral palette with limited chrome. Increased contrast in dark mode by making text lighter and reducing color saturation.
- Keyboard-first: Cmd+K command palette, extensive shortcuts.

**Raycast**

- Floating panel UI (not full window). Feels lightweight and non-intrusive.
- Subtle blur/transparency effects on macOS.
- Command palette IS the interface - everything accessible via search.
- Smooth spring animations on transitions.

**Arc Browser**

- Vertical tab sidebar that collapses. Space-efficient.
- Color-coded spaces for context switching.
- Minimal chrome - content takes center stage.

**Spotify**

- Card-based layout with generous spacing.
- Dark gray backgrounds (#121212), not pure black.
- Green accent used sparingly for primary actions only.
- Album art provides the color; the UI stays neutral.

**Notion**

- Gray-scale hierarchy: lighter grays for less important elements.
- Hover states reveal actions (progressive disclosure).
- Inline editing - no separate "edit mode."
- Breadcrumb navigation keeps context clear.

### Dark Mode Best Practices

1. **Never use pure black (#000)** - Use deep grays (#0A0A0A to #18181B). Pure black creates harsh contrast and makes text feel like it floats.
2. **Layer surfaces with subtle elevation** - Background < Surface < Card < Popover, each 2-4% lighter.
3. **Limit accent color usage** - One accent color (e.g., blue or purple) used only for interactive elements and primary CTAs.
4. **Text hierarchy via opacity, not color** - Primary text at 90-95% opacity, secondary at 60-70%, disabled at 40%.
5. **Borders: use opacity, not fixed colors** - `border-white/10` adapts better than hard-coded border colors.
6. **Increase letter-spacing slightly** in dark mode - Text on dark backgrounds benefits from slightly looser tracking.

---

## 3. Recommended Color Palette

### Base Palette (Zinc-based, recommended for BottingOS)

```css
/* Background layers */
--background: #09090b; /* zinc-950 - deepest background */
--surface: #18181b; /* zinc-900 - cards, panels */
--surface-raised: #27272a; /* zinc-800 - hover states, elevated cards */
--surface-overlay: #3f3f46; /* zinc-700 - popovers, dropdowns */

/* Text */
--text-primary: #fafafa; /* zinc-50 - headings, primary content */
--text-secondary: #a1a1aa; /* zinc-400 - labels, descriptions */
--text-muted: #71717a; /* zinc-500 - timestamps, placeholders */

/* Borders */
--border: #27272a; /* zinc-800 - default borders */
--border-subtle: rgba(255, 255, 255, 0.06); /* very subtle separators */

/* Accent - Electric blue (professional, not gamer) */
--accent: #3b82f6; /* blue-500 - primary actions */
--accent-hover: #60a5fa; /* blue-400 - hover states */
--accent-muted: rgba(59, 130, 246, 0.15); /* blue tint for selected states */

/* Semantic colors */
--success: #22c55e; /* green-500 - checkouts, profits */
--warning: #f59e0b; /* amber-500 - pending, alerts */
--destructive: #ef4444; /* red-500 - errors, losses */

/* Profit/Loss specific */
--profit: #4ade80; /* green-400 - profit amounts */
--loss: #f87171; /* red-400 - loss amounts */
```

### Why Zinc over Slate/Neutral

- Zinc has a very slight warm undertone that feels less clinical than Slate (which leans blue).
- Neutral is too flat. Zinc adds just enough personality.
- Matches Linear and Raycast's palette choices.

### Alternative Accent Colors to Consider

- **Purple (#8B5CF6)** - Stands out from typical blue SaaS tools. Unique in botting space.
- **Cyan (#06B6D4)** - Tech-forward, but can read as "gamer" if overused.
- **Blue (#3B82F6)** - Safe, professional, trustworthy. Recommended default.

---

## 4. shadcn/ui Implementation Strategy

### Base Setup

- Use `zinc` as the base color in `components.json`.
- Dark mode only (no theme toggle needed - botting tools are always dark).
- Install via shadcn CLI, components live in `src/components/ui/`.

### Must-Have Components

| Component             | Use Case                                                     |
| --------------------- | ------------------------------------------------------------ |
| `Command` (cmdk)      | Global command palette (Cmd+K) - navigation, search, actions |
| `Data Table`          | Inventory, orders, accounts, emails - the core of the app    |
| `Dialog` / `Sheet`    | Create/edit forms, detail views                              |
| `Tabs`                | Section navigation within pages                              |
| `Badge`               | Status indicators (active, pending, sold)                    |
| `Toast` / `Sonner`    | Notifications for webhook events, sync status                |
| `Dropdown Menu`       | Context menus, bulk actions                                  |
| `Select` / `Combobox` | Filtering by retailer, status, category                      |
| `Card`                | Dashboard KPI cards, summary stats                           |
| `Tooltip`             | Explain icons and abbreviated data                           |
| `Skeleton`            | Loading states for every data-fetching component             |

### Making shadcn Look Premium (Not Generic)

1. **Custom border radius** - Use `radius: 0.5rem` (8px) globally. Not too rounded (childish), not too sharp (cold).

2. **Custom focus rings** - Replace default ring with a subtle glow:

   ```css
   .focus-visible: ring-2 .ring-accent/50 .ring-offset-0;
   ```

3. **Subtle glass effect on popovers/dropdowns**:

   ```css
   .popover-content {
     backdrop-filter: blur(12px);
     background: rgba(24, 24, 27, 0.8);
     border: 1px solid rgba(255, 255, 255, 0.06);
   }
   ```

4. **Custom scrollbars** (WebKit + Firefox):

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

5. **Gradient text for headings** (used sparingly):

   ```css
   .gradient-text {
     background: linear-gradient(to right, #fafafa, #a1a1aa);
     -webkit-background-clip: text;
     -webkit-text-fill-color: transparent;
   }
   ```

6. **Card hover effects** - Subtle border glow on hover:
   ```css
   .card:hover {
     border-color: rgba(59, 130, 246, 0.3);
   }
   ```

### Extension Libraries (Beyond Base shadcn)

| Library               | What It Adds                                                               | Install                 |
| --------------------- | -------------------------------------------------------------------------- | ----------------------- |
| **Motion Primitives** | Pre-built animated components (text reveals, magnetic effects, spotlights) | Copy-paste, MIT license |
| **Animate UI**        | Full animated component set built on shadcn + Framer Motion                | shadcn CLI compatible   |
| **Aceternity UI**     | Micro-interaction collection with source code                              | Copy-paste              |
| **Magic UI**          | Landing page components (for marketing site)                               | Copy-paste              |
| **TweakCN**           | Visual theme editor for customizing shadcn                                 | Free, open-source       |

### Theme Customization with TweakCN

Use tweakcn.com/editor/theme to visually customize the dark theme, then export CSS variables. This replaces hand-tuning HSL values and provides real-time component preview.

---

## 5. Tauri Desktop Native Feel

### Window Controls

- **Use `tauri-controls`** (github.com/agmmnn/tauri-controls) for native-looking window controls.
- Auto-detects OS and renders matching controls (macOS traffic lights, Windows buttons).
- Works with React + Tailwind out of the box.

### Custom Titlebar

```rust
// tauri.conf.json
{
  "windows": [{
    "decorations": false,  // Remove native titlebar
    "transparent": true     // Enable transparency
  }]
}
```

Then render a custom titlebar in React:

- Draggable region using `data-tauri-drag-region`
- App logo + title on left
- Window controls on right (via tauri-controls)
- Navigation tabs in the titlebar (like Arc Browser) to save vertical space

### Tauri UI Template

- **agmmnn/tauri-ui** provides a complete starter with shadcn/ui + Tauri v2.
- Includes: dark/light mode, Radix primitives, TypeScript, Tailwind.
- Use as reference architecture, not as a dependency.

### System Tray

- Tauri v2 supports system tray natively.
- Use for: background webhook listening, quick-access menu, notification badge.
- Keep tray menu minimal: Open App, Pause Webhooks, Recent Orders, Quit.

### Making Web Feel Native

1. **Disable text selection** on UI chrome (keep it on data/content).
2. **Disable right-click context menu** except on data tables.
3. **Use system font stack** for UI elements: `-apple-system, BlinkMacSystemFont, "Segoe UI"`.
4. **Add window vibrancy** (macOS) via Tauri's NSVisualEffectView for sidebar blur.
5. **Keyboard shortcuts everywhere** - Cmd+1-9 for tab switching, Cmd+N for new item, etc.

---

## 6. Data-Heavy Dashboard Patterns

### Core Principle: Progressive Disclosure

Show summary first, details on demand. Never show all columns by default.

### Data Table Architecture (TanStack Table + shadcn)

**Default visible columns** (per table):

- Inventory: Name, SKU, Purchase Price, Current Value, Profit, Status, Days Held
- Orders: Date, Item, Retailer, Price, Status, Bot
- Accounts: Email, Retailer, Status, Last Used
- VCCs: Label, Last 4, Provider, Linked Account

**Hidden by default** (toggle via column visibility):

- Proxy used, checkout time, order number, notes, tags

**Filtering pattern**:

```
[Search box] [Status dropdown] [Retailer dropdown] [Date range] [Clear all]
```

- Faceted filters for categorical data (retailer, status, bot).
- Debounced search input (300ms delay) for smooth typing.
- Filter chips below the search bar showing active filters.
- "Clear all" button when any filter is active.

**Sorting**:

- Click column header to sort. Show sort icon only on hover or when active.
- Multi-column sort via Shift+click.
- Persist sort preference in localStorage.

**Bulk actions**:

- Checkbox column on left.
- Floating action bar at bottom when items selected: "3 selected - [Export] [Delete] [Tag] [Move]"
- Inspired by Linear's bulk selection pattern.

### Dashboard Layout (KPIs + Data)

```
+-----------------------------------------+
| [Total Profit]  [Items In Stock]  [ROI] |  <- KPI Cards row
| [Pending Orders] [Active Accounts]      |
+-----------------------------------------+
| [Profit Chart - 30 day trend]           |  <- Primary chart
+-----------------------------------------+
| [Recent Orders table - 5 rows]          |  <- Quick-glance table
| [View All ->]                           |
+-----------------------------------------+
```

- KPI cards: Large number, small label, trend arrow (up/down with %).
- Charts: Use Recharts (already common in Next.js ecosystem) with custom dark theme.
- Tables: Show 5-10 recent items with a "View All" link.

### Virtual Scrolling

For tables with 500+ rows (email lists, large inventories):

- Use TanStack Virtual for row virtualization.
- Renders only visible rows + buffer.
- Critical for the email manager (750+ HideMyEmail addresses).

### Empty States

Every table/section needs an empty state:

- Icon (subtle, line-style)
- Heading: "No orders yet"
- Description: "Orders will appear here when your bots check out items."
- CTA button: "Set up webhook" or "Import data"

---

## 7. Mobile-First Design Decisions (Build Now for Later)

### Decisions That Pay Off Later

1. **Use Tailwind responsive prefixes from day one**
   - Design mobile layout first, then add `md:` and `lg:` prefixes.
   - Data tables become card lists on mobile: each row becomes a stacked card.

2. **Navigation: Use a sidebar that collapses**
   - Desktop: Fixed sidebar (240px) with icon + label.
   - Tablet: Icon-only sidebar (64px).
   - Mobile: Bottom tab bar (5 core sections) + hamburger for secondary nav.
   - Use shadcn's `Sheet` component for mobile sidebar.

3. **Touch targets: Minimum 44px**
   - All clickable elements should be at least 44x44px.
   - Use `p-3` minimum on interactive elements.

4. **Card-based layouts over tables on mobile**

   ```tsx
   // Desktop: table row
   <tr className="hidden md:table-row">...</tr>
   // Mobile: card
   <div className="md:hidden">
     <Card>...</Card>
   </div>
   ```

5. **Bottom sheets instead of modals on mobile**
   - Use `Sheet` with `side="bottom"` on mobile for create/edit forms.
   - Full-screen on mobile, dialog on desktop.

6. **Swipe gestures** (plan for later)
   - Design data so items can be swiped: left to delete, right to mark as sold.
   - Don't implement now, but don't create UI patterns that conflict with this.

7. **Component sizing with CSS variables**
   ```css
   :root {
     --content-width: 100%;
     --sidebar-width: 0px;
   }
   @media (min-width: 768px) {
     :root {
       --sidebar-width: 240px;
     }
   }
   ```

---

## 8. Onboarding / First-Run Experience

### Goal: Productive in Under 5 Minutes

### Step 1: Welcome (30 seconds)

- Full-screen welcome with BottingOS logo.
- "Your botting command center" - one sentence.
- [Get Started] button.

### Step 2: Quick Setup Wizard (2 minutes)

A 3-step wizard (progress bar at top):

**Step 1/3 - "What do you bot?"**

- Multi-select chips: Sneakers, Pokemon, Funko, Electronics, Other
- Sets default categories for filtering throughout the app.

**Step 2/3 - "What tools do you use?"**

- Multi-select: Cybersole, Valor, NSB, AYCD, Other
- Pre-configures webhook templates for selected bots.

**Step 3/3 - "Import your data"**

- Three import options (all optional, can skip):
  - Paste HideMyEmail addresses
  - Upload CSV (orders/inventory)
  - Connect marketplace (OAuth for StockX/eBay/GOAT)
- [Skip for now] link clearly visible.

### Step 3: Interactive Tour (2 minutes)

- Spotlight/tooltip tour of the main sections.
- Use a library like `driver.js` or `react-joyride`.
- Highlight: Dashboard, Profit Calculator, Account Manager.
- Each tooltip: 1 sentence + [Next] / [Skip tour].

### Step 4: Empty State CTAs

- After the tour, every section shows its empty state with a clear CTA.
- The app doesn't feel empty - it feels ready.

### Anti-Patterns to Avoid

- No video tutorials blocking the UI.
- No "read our docs" links in the onboarding flow.
- No email verification step before seeing the app.
- No feature gates during onboarding - show everything, let users explore.

---

## 9. Animation and Micro-Interactions

### Philosophy

Animations should be **functional** (communicating state changes) not **decorative** (looking cool). Every animation must answer: "What information does this convey?"

### Must-Have Animations

| Interaction             | Animation              | Duration   | Library                         |
| ----------------------- | ---------------------- | ---------- | ------------------------------- |
| Page transitions        | Fade + slight slide up | 200ms      | Framer Motion                   |
| Sidebar collapse/expand | Width + opacity        | 200ms      | CSS transition                  |
| Modal/Sheet open        | Scale from 0.95 + fade | 150ms      | Framer Motion                   |
| Modal/Sheet close       | Scale to 0.95 + fade   | 100ms      | Framer Motion                   |
| Toast notification      | Slide in from right    | 200ms      | Sonner (built-in)               |
| Table row add           | Fade in + slide down   | 150ms      | Framer Motion `AnimatePresence` |
| Table row delete        | Fade out + slide left  | 150ms      | Framer Motion `AnimatePresence` |
| Tab switch              | Content crossfade      | 150ms      | Framer Motion `layout`          |
| KPI number change       | Count-up animation     | 500ms      | Custom or Motion Primitives     |
| Button click            | Scale to 0.97 + back   | 100ms      | CSS `active:scale-[0.97]`       |
| Hover card elevation    | Border glow + shadow   | 150ms      | CSS transition                  |
| Skeleton loading        | Shimmer pulse          | Continuous | Tailwind `animate-pulse`        |
| Dropdown open           | Scale Y from top       | 100ms      | CSS or Framer Motion            |
| Status change           | Color transition       | 300ms      | CSS transition                  |

### Framer Motion Config

```tsx
// Shared transition presets
export const transitions = {
  spring: { type: "spring", stiffness: 500, damping: 30 },
  ease: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  snappy: { duration: 0.15, ease: "easeOut" },
} as const;

// Page wrapper
export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.ease },
  exit: { opacity: 0, y: -8, transition: transitions.snappy },
};
```

### What to Avoid

- **Bounce effects** - Feel unprofessional. Use spring with high damping instead.
- **Animations longer than 300ms** for UI elements - Feels sluggish.
- **Parallax scrolling** - Distracting in a data tool.
- **Loading spinners** - Use skeleton screens instead. Spinners feel like waiting; skeletons feel like loading.
- **Entrance animations on every page load** - Only animate on first visit or meaningful state changes.
- **Animated backgrounds/gradients** - Distracting, battery-draining, gamer aesthetic.

### Performance Rules

- Use `transform` and `opacity` only (GPU-accelerated). Never animate `width`, `height`, `top`, `left`.
- Use `will-change: transform` sparingly and only on elements that actually animate.
- Use `AnimatePresence` for mount/unmount animations.
- Disable animations if user has `prefers-reduced-motion: reduce` set.

---

## 10. Navigation and Layout Architecture

### Recommended Layout

```
+--+------------------------------------------+
|  |  [Breadcrumb: Dashboard > Inventory]     |
|  |  [Page Title]          [Search] [+ New]  |
|S |  +--------------------------------------+|
|I |  |                                      ||
|D |  |           CONTENT AREA               ||
|E |  |                                      ||
|B |  |                                      ||
|A |  +--------------------------------------+|
|R |                                          |
+--+------------------------------------------+
```

### Sidebar Navigation Structure

```
[Logo]

Dashboard          (home icon)
---
Profit Calculator  (calculator icon)
Orders             (package icon)
Inventory          (boxes icon)
---
Accounts           (users icon)
Emails             (mail icon)
VCCs               (credit-card icon)
---
Analytics          (chart icon)
Settings           (gear icon)
```

- Use Lucide icons (already included with shadcn).
- Active state: accent background tint + bold label.
- Hover state: subtle background highlight.
- Collapsed state: icons only with tooltips.

### Command Palette (Cmd+K)

The single most impactful UX feature for power users. Implement early.

Groups:

- **Navigation**: Go to Dashboard, Go to Inventory, Go to Orders...
- **Actions**: New Order, Add Account, Quick Profit Check...
- **Search**: Search inventory, Search accounts, Search orders...
- **Recent**: Last 5 viewed items.

---

## 11. Typography

### Font Stack

- **Headings**: Inter Display (or Geist if going for a more modern look)
- **Body**: Inter
- **Monospace** (for numbers, SKUs, prices): JetBrains Mono or Geist Mono

### Scale

```css
--text-xs: 0.75rem; /* 12px - timestamps, badges */
--text-sm: 0.875rem; /* 14px - table cells, secondary text */
--text-base: 1rem; /* 16px - body text, form labels */
--text-lg: 1.125rem; /* 18px - section headers */
--text-xl: 1.25rem; /* 20px - page titles */
--text-2xl: 1.5rem; /* 24px - dashboard KPIs */
--text-3xl: 1.875rem; /* 30px - large KPI numbers */
```

### Rules

- Table data: `text-sm` (14px). Tables must be dense but readable.
- Use tabular numbers (`font-variant-numeric: tabular-nums`) for all price/number columns so digits align vertically.
- Price formatting: Always show 2 decimal places, use $ prefix, color green for profit and red for loss.

---

## 12. Specific Component Patterns

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

### Status Badges

Use consistent color coding across the entire app:

- **Active / In Stock / Connected**: Green badge
- **Pending / Processing / Syncing**: Amber badge
- **Sold / Completed / Delivered**: Blue badge
- **Error / Cancelled / Expired**: Red badge
- **Inactive / Unused / Draft**: Gray badge

```tsx
const statusColors = {
  active: "bg-green-500/15 text-green-400 border-green-500/25",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  sold: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  error: "bg-red-500/15 text-red-400 border-red-500/25",
  inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};
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

### Search Input

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search inventory..."
    className="pl-9 bg-zinc-900 border-zinc-800"
  />
  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-zinc-800 px-1.5 py-0.5 rounded">
    /
  </kbd>
</div>
```

---

## 13. Implementation Priority

### Phase 1 - Foundation (Week 1)

1. Set up color palette and CSS variables in `globals.css`.
2. Configure shadcn with zinc base, custom radius.
3. Build sidebar layout with collapsible behavior.
4. Implement Cmd+K command palette.
5. Add page transition animations with Framer Motion.
6. Create reusable components: StatusBadge, ProfitDisplay, KPICard, SearchInput.
7. Custom scrollbar styling.
8. Typography setup (Inter + mono font for numbers).

### Phase 2 - Data Layer (Week 2)

1. Build reusable DataTable component with TanStack Table.
2. Add faceted filters, column visibility toggle, sort persistence.
3. Create empty state component.
4. Add skeleton loading states.
5. Build Sheet/Dialog pattern for create/edit forms.

### Phase 3 - Polish (Week 3)

1. Add row-level animations (add/delete/reorder).
2. Implement toast notifications via Sonner.
3. Build onboarding wizard.
4. Add keyboard shortcuts for all major actions.
5. Glass effect on popovers and dropdowns.
6. KPI count-up animations.

### Phase 4 - Tauri Native (Week 4)

1. Custom titlebar with tauri-controls.
2. System tray integration.
3. Window vibrancy (macOS sidebar blur).
4. Disable web-specific behaviors (text selection on chrome, right-click).

---

## 14. Sources

### Competitor Analysis

- [Cybersole 5.0](https://cybersole.io/five)
- [AYCD Toolbox Review](https://botsthatwork.com/review/acyd-bot-toolbox/)
- [Valor AIO](https://valoraio.com/)
- [AYCD Toolbox](https://18pairsonkith.com/resources/tools/aycd-toolbox/)

### Design Patterns

- [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Design Trend](https://blog.logrocket.com/ux-design/linear-design/)
- [Dark Mode Dashboard Principles](https://www.qodequay.com/dark-mode-dashboards)
- [Dark Dashboard UI Inspiration](https://www.wendyzhou.se/blog/dark-dashboard-ui-design-inspiration/)
- [Data-Heavy Application Design](https://www.eleken.co/blog-posts/how-to-design-data-intensive-applications-cases-and-practices)
- [Filter UI Patterns](https://bricxlabs.com/blogs/universal-search-and-filters-ui)
- [Data Table Best Practices](https://www.justinmind.com/ui-design/data-table)
- [Dashboard UX Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)

### Color & Theming

- [Dark Mode Color Palettes](https://colorhero.io/blog/dark-mode-color-palettes-2025)
- [Dark Mode Palettes Guide](https://mypalettetool.com/blog/dark-mode-color-palettes)
- [Tailwind Colors](https://tailwindcss.com/docs/colors)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [TweakCN Theme Editor](https://tweakcn.com/)

### Animation Libraries

- [Motion Primitives](https://allshadcn.com/tools/motion-primitives/)
- [Animate UI](https://animate-ui.com/docs)
- [Aceternity UI](https://ui.aceternity.com)
- [shadcn Ecosystem 2025](https://www.devkit.best/blog/mdx/shadcn-ui-ecosystem-complete-guide-2025)

### Tauri

- [tauri-controls](https://github.com/agmmnn/tauri-controls)
- [Tauri Window Customization](https://v2.tauri.app/learn/window-customization/)
- [tauri-ui Template](https://github.com/agmmnn/tauri-ui)

### Data Tables

- [shadcn Data Table](https://ui.shadcn.com/docs/components/radix/data-table)
- [Advanced shadcn Table](https://next.jqueryscript.net/shadcn-ui/advanced-shadcn-table/)
- [TanStack + shadcn Guide](https://www.sadmn.com/blog/shadcn-table)

### Onboarding

- [Onboarding Wizard Patterns](https://userguiding.com/blog/what-is-an-onboarding-wizard-with-examples)
- [UX Onboarding Best Practices 2025](https://www.uxdesigninstitute.com/blog/ux-onboarding-best-practices-guide/)
- [200 Onboarding Flows Study](https://designerup.co/blog/i-studied-the-ux-ui-of-over-200-onboarding-flows-heres-everything-i-learned/)

### Command Palette

- [shadcn Command](https://ui.shadcn.com/docs/components/radix/command)
- [cmdk](https://react-cmdk.com/)
