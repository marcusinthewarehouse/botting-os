# Task 7.2: UI Polish & Animations

## Objective

Add page transitions, card hover effects, modal animations, and loading skeletons across all pages. Audit every page for design token consistency - ensuring zinc dark theme, amber accents, correct typography, and border styles are uniform throughout.

## Context

By Phase 7, all features are built. This task is a polish pass - adding subtle, purposeful animations and ensuring visual consistency. No decorative animations. Every animation must serve a purpose: orientation (page transitions), feedback (hover/press), or perceived performance (skeletons). Target: 150-200ms for UI animations, no bounce effects.

## Dependencies

- All Phase 1-6 pages built
- shadcn/ui components installed

## Blocked By

- Nothing (polish pass, works on existing pages)

## Research Findings

### Animation Catalog (from shadcn-patterns skill)

| Element           | Animation             | Duration |
| ----------------- | --------------------- | -------- |
| Page transition   | Fade + slide up 8px   | 150ms    |
| Modal/Sheet open  | Scale 0.95 + fade     | 150ms    |
| Modal/Sheet close | Scale to 0.95 + fade  | 100ms    |
| Table row add     | Fade in + slide down  | 150ms    |
| Table row delete  | Fade out + slide left | 150ms    |
| Tab switch        | Content crossfade     | 150ms    |
| Button press      | `active:scale-[0.97]` | 100ms    |
| Card hover        | Border glow + shadow  | 150ms    |
| Dropdown open     | Scale Y from top      | 100ms    |
| Status change     | Color transition      | 300ms    |

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

### Animation Rules

- Only animate `transform` and `opacity` (GPU-accelerated)
- Use `AnimatePresence` for mount/unmount
- Respect `prefers-reduced-motion: reduce`
- No bounce effects, no animations > 300ms for UI elements
- No parallax, no animated backgrounds

### Loading Skeletons

- Use `animate-pulse` with zinc-800 background
- Match the layout structure of the actual content
- Never use spinners
- Show skeleton for 0-300ms data loads

### Design Token Checklist

- Background: #09090B (zinc-950)
- Surface: #000000 (cards, panels)
- Border: rgba(255,255,255,0.23)
- Accent: #F59E0B (amber-500) for primary actions only
- Text primary: #FAFAFA (zinc-50)
- Text secondary: #A1A1AA (zinc-400)
- Border radius: 0.5rem (8px)
- Font: system font stack, monospace for data values
- Profit: green-400, Loss: red-400

## Implementation Plan

### Step 1: Create Animation Utilities

`src/lib/animations.ts`:

```typescript
export const transitions = {
  spring: { type: "spring" as const, stiffness: 500, damping: 30 },
  ease: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
  snappy: { duration: 0.15, ease: "easeOut" as const },
};

export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.ease },
  exit: { opacity: 0, y: -8, transition: transitions.snappy },
};

export const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: transitions.snappy },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
};

export const cardHover =
  "transition-colors duration-150 hover:border-amber-500/30";
```

### Step 2: Add Page Transitions

Wrap each page's content in a motion wrapper:

```tsx
import { motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";

export default function PageName() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* page content */}
    </motion.div>
  );
}
```

Apply to all pages:

- `/` (dashboard)
- `/analytics`
- `/calendar`
- `/discord`
- `/discord/settings`
- `/resources`
- All Phase 2 pages (calculator, tracker, emails, vault, VCCs)
- All Phase 3-4 pages (marketplace, webhooks, inventory)

### Step 3: Add Card Hover Effects

Audit all Card components across the app. Add:

```tsx
className = "transition-colors duration-150 hover:border-amber-500/30";
```

Pages to audit:

- Dashboard KPI cards
- Analytics KPI cards
- Resource hub cards
- Inventory cards
- Any card-based layouts

### Step 4: Add Button Press Feedback

Audit all interactive buttons. Add:

```tsx
className = "active:scale-[0.97] transition-transform";
```

For primary action buttons and icon buttons.

### Step 5: Add Loading Skeletons

Create skeleton components for each data page:

`src/components/skeletons/`:

- `table-skeleton.tsx` - For tables (orders, emails, inventory, etc.)
- `card-skeleton.tsx` - For card grids (resources, analytics KPIs)
- `chart-skeleton.tsx` - For chart areas (analytics)
- `feed-skeleton.tsx` - For Discord message feed
- `calendar-skeleton.tsx` - For drop calendar

Pattern:

```tsx
function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-8 bg-zinc-800 rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

Add skeletons to every page that loads data:

- Show skeleton immediately
- Replace with real content once data loads
- Use `Suspense` boundaries where appropriate

### Step 6: Design Token Audit

Walk through every page and verify:

1. **Backgrounds**: No stray background colors. Cards use black, page uses zinc-950
2. **Borders**: All using `border-white/[0.23]` or `border-zinc-800`
3. **Text hierarchy**: Primary zinc-50, secondary zinc-400, muted zinc-500
4. **Accent usage**: Amber-500 only for primary actions, active states, and accents
5. **Border radius**: All rounded-lg (0.5rem)
6. **Typography**: Data values use `font-mono tabular-nums`, prices show 2 decimals
7. **Status badges**: Consistent color mapping (green=active, amber=pending, blue=completed, red=error)
8. **Spacing**: Consistent padding (p-6 for cards, gap-4/6 for layouts)
9. **Focus rings**: All interactive elements have `focus-visible:ring-2 focus-visible:ring-amber-500/50`
10. **Scrollbars**: Custom scrollbar styles applied globally

### Step 7: Reduced Motion Support

Add to the root layout:

```tsx
useEffect(() => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mq.matches) {
    document.documentElement.classList.add("reduce-motion");
  }
}, []);
```

In CSS:

```css
.reduce-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

## Files to Create

- `src/lib/animations.ts` - Animation variants and transition presets
- `src/components/skeletons/table-skeleton.tsx` - Table loading skeleton
- `src/components/skeletons/card-skeleton.tsx` - Card grid loading skeleton
- `src/components/skeletons/chart-skeleton.tsx` - Chart area loading skeleton
- `src/components/skeletons/feed-skeleton.tsx` - Message feed loading skeleton
- `src/components/skeletons/calendar-skeleton.tsx` - Calendar loading skeleton

## Files to Modify

- Every page file in `src/app/(dashboard)/` - Add page transition wrappers
- Every Card usage across components - Add hover effects
- Every data-loading page - Add skeleton loading states
- Global CSS - Add reduced motion support, custom scrollbars
- Root layout - Add reduced motion detection

## Contracts

### Provides

- `pageVariants`, `modalVariants`, `cardHover` animation exports
- Skeleton components for all data-loading patterns
- Consistent design tokens across all pages
- Reduced motion support
- 150ms page transitions on all routes

### Consumes

- `framer-motion` for animations (install if not present)
- All existing page components

## Acceptance Criteria

- [ ] Page transitions (150ms fade+slide) on all route changes
- [ ] Card hover effect (amber border glow) on all cards
- [ ] Button press feedback (scale 0.97) on primary buttons
- [ ] Modal open/close animations (scale+fade)
- [ ] Loading skeletons on every data-loading page
- [ ] No loading spinners anywhere in the app
- [ ] All backgrounds use zinc-950 or black (no stray colors)
- [ ] All borders consistent (white/0.23 or zinc-800)
- [ ] All text follows hierarchy (zinc-50, zinc-400, zinc-500)
- [ ] Amber-500 used only for accents and primary actions
- [ ] All data values use font-mono tabular-nums
- [ ] All prices show 2 decimal places with $ prefix
- [ ] Status badges use consistent color mapping
- [ ] Focus rings on all interactive elements
- [ ] Custom scrollbar styles applied
- [ ] Reduced motion support works
- [ ] No animations exceed 300ms
- [ ] No bounce effects anywhere
- [ ] No decorative animations

## Testing Protocol

### Visual Audit

- Walk through every page, screenshot, compare against design tokens
- Check hover states on all cards and buttons
- Verify page transitions between routes
- Test modal open/close on all dialogs

### Reduced Motion Test

- Enable reduced motion in OS settings
- Verify all animations are suppressed
- Verify app is still fully functional

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds
- No console warnings about animation performance

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/ui-ux-design.md`

## Git

- Branch: `feat/7.2-polish-animations`
- Commit prefix: `Task 7.2:`
