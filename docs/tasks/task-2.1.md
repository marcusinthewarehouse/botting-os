# Task 2.1: App Shell & Navigation

## Objective

Build the dashboard layout with a collapsible sidebar, command palette (Cmd+K), custom titlebar with window controls, and consistent design tokens. This establishes the visual foundation and navigation structure that all Phase 2 feature pages live inside.

## Context

Phase 1 established the data layer. Now we rebuild the UI. The existing MVP has a basic layout at `src/app/(dashboard)/layout.tsx` and sidebar at `src/components/app-sidebar.tsx`. This task replaces them with the production design: zinc-950 dark theme, amber accent, collapsible sidebar, Cmd+K command palette, and CryptoProvider integration.

The design philosophy is "Linear of botting tools" - clean, quiet, professional. No gamer/neon aesthetics. Data speaks, chrome doesn't.

## Dependencies

- Phase 1 complete (data layer ready)
- Task 1.3 specifically (CryptoProvider wraps the layout)

## Blocked By

- Task 1.R (Phase 1 regression must pass)

## Research Findings

### Color Palette (from DISCOVERY.md - this is authority)

```
Background:      #09090B   (zinc-950)
Surface:         #000000   (0% brightness - cards, panels)
Accent:          #F59E0B   (amber-500 - primary actions ONLY)
Accent hover:    #FBBF24   (amber-400)
Text primary:    #FAFAFA   (zinc-50)
Text secondary:  #A1A1AA   (zinc-400)
Text muted:      #71717A   (zinc-500)
Border:          rgba(255,255,255,0.23)  (23% white opacity)
```

No light mode. Dark only.

### Sidebar Behavior

- Desktop (>= 768px): Fixed 240px, icon + label
- Collapsed (manual toggle or < 768px): Icon-only 64px with tooltips
- Active state: `bg-amber-500/15` + bold label
- Hover state: `bg-zinc-800`
- Collapse/expand: Width + opacity transition, 200ms CSS

### Sidebar Items

**Active (navigable):**

- Dashboard (LayoutDashboard icon)
- Calculator (Calculator icon)
- Tracker (TrendingUp icon)
- Emails (Mail icon)
- Vault (Lock icon)
- VCC (CreditCard icon)

**Coming Soon (grayed out, not clickable):**

- Orders (Package icon)
- Inventory (Boxes icon)
- Discord (MessageSquare icon)
- Analytics (BarChart3 icon)
- Calendar (Calendar icon)
- Resources (BookOpen icon)

### Command Palette

Use shadcn `Command` component (wraps cmdk). Groups:

- Navigation: Go to Dashboard, Calculator, Tracker, Emails, Vault, VCC
- Actions: Quick Profit Check, Add Email, Lock Vault (future: New Order, etc.)
- Recent: Last 5 viewed pages

Trigger: Cmd+K (Mac) / Ctrl+K (Windows)

### Custom Titlebar

Tauri config has `decorations: false`. Render a custom titlebar div with:

- `data-tauri-drag-region` for window dragging
- App title "BottingOS" on left (subtle, zinc-400 text)
- Window controls on right (minimize, maximize, close)
- On macOS: use native traffic lights via `tauri-plugin-decorum` (or leave space for them)

### Page Transitions

Framer Motion with shared presets:

```tsx
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeOut" } },
};
```

## Implementation Plan

### Step 1: Set Up Global Styles

Update `src/app/globals.css` with design tokens:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 3.9%; /* #09090B */
    --foreground: 0 0% 98%; /* #FAFAFA */
    --card: 0 0% 0%; /* #000000 */
    --card-foreground: 0 0% 98%;
    --popover: 240 5.9% 10%; /* ~#18181B */
    --popover-foreground: 0 0% 98%;
    --primary: 37.7 92.1% 50.2%; /* #F59E0B amber-500 */
    --primary-foreground: 240 10% 3.9%;
    --secondary: 240 3.7% 15.9%; /* ~#27272A */
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%; /* ~#A1A1AA */
    --accent: 37.7 92.1% 50.2%; /* amber */
    --accent-foreground: 240 10% 3.9%;
    --destructive: 0 84.2% 60.2%; /* red */
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 37.7 92.1% 50.2%; /* amber for focus ring */
    --radius: 0.5rem;
    --sidebar-width: 240px;
    --sidebar-collapsed-width: 64px;
  }
}

/* Custom scrollbars */
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

/* Disable text selection on UI chrome */
.no-select {
  -webkit-user-select: none;
  user-select: none;
}
```

### Step 2: Install Required shadcn Components

```bash
npx shadcn@latest add command dialog button input tooltip badge
npm install framer-motion
```

### Step 3: Build Sidebar Component (src/components/app-sidebar.tsx)

Replace existing sidebar with production version:

- Logo at top (text "BottingOS" or icon)
- Navigation sections separated by subtle dividers
- Each nav item: icon + label (label hidden when collapsed)
- Active item has amber tint background
- Coming-soon items grayed out with "Coming Soon" tooltip
- Collapse toggle button at bottom
- Use `next/link` for navigation
- Track collapsed state in localStorage for persistence

### Step 4: Build Custom Titlebar (src/components/titlebar.tsx)

```tsx
"use client";
export function Titlebar() {
  const handleMinimize = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().minimize();
  };
  // ... maximize, close handlers
  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between bg-[#09090B] border-b border-white/[0.08] select-none"
    >
      <div
        data-tauri-drag-region
        className="pl-3 text-xs font-medium text-zinc-400"
      >
        BottingOS
      </div>
      <div className="flex h-full">{/* Window control buttons */}</div>
    </div>
  );
}
```

Check `isTauri()` before showing window controls (graceful degradation for Next.js dev without Tauri).

### Step 5: Build Command Palette (src/components/command-palette.tsx)

Using shadcn Command component:

- Listens for Cmd+K / Ctrl+K globally
- Search input at top
- Grouped results: Navigation, Actions
- Items navigate via `router.push()` on select
- Animated open/close (scale + fade)

### Step 6: Build Page Transition Wrapper (src/components/page-transition.tsx)

Framer Motion wrapper for page content:

```tsx
"use client";
import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### Step 7: Rebuild Dashboard Layout (src/app/(dashboard)/layout.tsx)

Compose all pieces:

```tsx
<CryptoProvider>
  <Titlebar />
  <div className="flex h-[calc(100vh-32px)]">
    <AppSidebar />
    <main className="flex-1 overflow-auto bg-[#09090B] p-6">
      <CommandPalette />
      {children}
    </main>
  </div>
</CryptoProvider>
```

### Step 8: Create Shared UI Components

Build reusable components used across all feature pages:

- `src/components/ui/status-badge.tsx` - Colored badge with consistent status mapping
- `src/components/ui/profit-display.tsx` - Green/red formatted currency
- `src/components/ui/kpi-card.tsx` - Dashboard stat card
- `src/components/ui/empty-state.tsx` - Illustrated empty state with CTA
- `src/components/ui/page-header.tsx` - Page title + actions bar

### Step 9: Disable Right-Click Context Menu

In the root layout, add event listener that prevents context menu on non-input elements. Allow context menu on INPUT and TEXTAREA elements.

### Step 10: Update Dashboard Home Page

`src/app/(dashboard)/page.tsx` - Simple welcome page with KPI card placeholders showing "Connect data to see stats" empty states. This gets real data in later phases.

## Files to Create

- `src/components/command-palette.tsx` - Cmd+K command palette
- `src/components/titlebar.tsx` - Custom window titlebar with drag region
- `src/components/page-transition.tsx` - Framer Motion page wrapper
- `src/components/ui/status-badge.tsx` - Consistent status badge component
- `src/components/ui/profit-display.tsx` - Profit/loss currency display
- `src/components/ui/kpi-card.tsx` - Dashboard KPI stat card
- `src/components/ui/empty-state.tsx` - Empty state with icon, text, CTA
- `src/components/ui/page-header.tsx` - Page title + action buttons

## Files to Modify

- `src/app/globals.css` - Design tokens, scrollbars, no-select
- `src/app/(dashboard)/layout.tsx` - Rebuild with sidebar + titlebar + crypto provider
- `src/components/app-sidebar.tsx` - Full rebuild with collapsible nav
- `src/app/(dashboard)/page.tsx` - Dashboard home with KPI placeholders

## Contracts

### Provides (for downstream)

- `<AppSidebar />` - Collapsible sidebar navigation
- `<CommandPalette />` - Cmd+K global command palette
- `<Titlebar />` - Custom titlebar with window controls
- `<PageTransition />` - Wrap page content for animated transitions
- `<StatusBadge status="active" />` - Consistent colored badges
- `<ProfitDisplay value={42.50} />` - Green/red currency display
- `<KpiCard title="Total Profit" value="$12,847" trend="+12.3%" />` - Dashboard stat card
- `<EmptyState icon={Package} title="No orders yet" description="..." action={{label, onClick}} />`
- `<PageHeader title="Calculator" actions={[...]} />`
- CSS variables for all design tokens
- CryptoProvider integration in layout

### Consumes (from upstream)

- `<CryptoProvider>` from Task 1.3
- `useCrypto()` hook from Task 1.3
- shadcn components: Command, Dialog, Button, Input, Tooltip, Badge

## Acceptance Criteria

- [ ] Sidebar renders with all 12 nav items (6 active, 6 coming-soon)
- [ ] Sidebar collapses to icon-only (64px) on toggle
- [ ] Sidebar collapse state persists across page reloads
- [ ] Active nav item has amber-tinted background
- [ ] Coming-soon items are grayed out and show tooltip
- [ ] Cmd+K opens command palette
- [ ] Command palette search filters navigation items
- [ ] Selecting a command palette item navigates to the page
- [ ] Custom titlebar is draggable (window moves when dragged)
- [ ] Window minimize/maximize/close buttons work
- [ ] Page transitions animate (fade + slide)
- [ ] Right-click context menu disabled on UI chrome, allowed on inputs
- [ ] All design tokens match spec (#09090B bg, #F59E0B accent, etc.)
- [ ] Custom scrollbars render (thin, subtle)
- [ ] CryptoProvider wraps the layout - master password shown before content
- [ ] Dashboard page shows KPI card placeholders
- [ ] No light mode toggle exists

## Testing Protocol

### Unit/Integration Tests

- Verify sidebar collapse state toggles
- Verify command palette keyboard shortcut registration

### Browser Testing (Playwright MCP)

- Take screenshot of full app with sidebar expanded
- Take screenshot with sidebar collapsed
- Open command palette, take screenshot
- Navigate to each active page via sidebar
- Navigate via command palette
- Verify coming-soon items are not clickable
- Take screenshot of dashboard page
- Test window drag on titlebar

### Build/Lint/Type Checks

- `npx tsc --noEmit`
- `npm run build`
- Visual inspection of all pages for design consistency

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/ui-ux-design.md` (sections 2, 3, 4, 5, 10)
- `.claude/orchestration-bottingos/research/tauri-nextjs-drizzle-implementation.md` (section 4 - window customization)

## Git

- Branch: feat/2.1-app-shell
- Commit message prefix: Task 2.1:
