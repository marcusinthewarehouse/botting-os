# Task 8.4: Performance & Polish Verification

## Objective

Verify performance benchmarks (launch < 3s, navigation < 200ms, 750 emails < 2s, 1000+ Discord messages smooth), memory usage (< 200MB), design spec compliance, no em dashes anywhere, and all animations within 150-200ms range.

## Context

Final quality gate before distribution. This task measures concrete performance numbers and does a pixel-level audit of the design spec. Every metric has a pass/fail threshold. If any metric fails, the specific component causing the issue must be identified and documented for fixing.

## Dependencies

- All Phases 1-7 complete
- Tasks 8.1-8.3 complete (functional correctness verified)

## Blocked By

- Tasks 8.1, 8.2, 8.3 (functional tests must pass first)

## Research Findings

### Performance Targets

| Metric                 | Target              | Method                                    |
| ---------------------- | ------------------- | ----------------------------------------- |
| App launch (cold)      | < 3 seconds         | Stopwatch from click to dashboard visible |
| App launch (warm)      | < 2 seconds         | Subsequent launches                       |
| Page navigation        | < 200ms             | Devtools Performance tab                  |
| 750 emails render      | < 2 seconds         | Time from page load to all rows visible   |
| 500 orders render      | < 2 seconds         | Time from page load to all rows visible   |
| 1000 Discord messages  | Smooth 60fps scroll | Performance monitor during scroll         |
| Analytics chart render | < 1 second          | Time from data fetch to chart painted     |
| Search/filter response | < 300ms             | Time from keystroke to filtered results   |

### Memory Targets

| State                        | Max Memory |
| ---------------------------- | ---------- |
| Idle (dashboard)             | < 100MB    |
| Large dataset (1000 emails)  | < 200MB    |
| Discord feed (1000 messages) | < 200MB    |
| Peak during import           | < 300MB    |

### Design Spec Compliance Checklist

From shadcn-patterns skill:

- Background: #09090B (zinc-950)
- Surface/cards: #000000
- Border: rgba(255,255,255,0.23) or zinc-800
- Accent: #F59E0B (amber-500)
- Text primary: #FAFAFA (zinc-50)
- Text secondary: #A1A1AA (zinc-400)
- Border radius: 0.5rem (8px)
- Font: system stack for UI, monospace for data
- Profit: #4ADE80 (green-400)
- Loss: #F87171 (red-400)

### Animation Spec

All animations 150-200ms, no bounce, no decorative animations:

- Page transitions: 150ms fade+slide
- Modal open: 150ms scale+fade
- Modal close: 100ms
- Card hover: 150ms border transition
- Button press: 100ms scale
- Tab switch: 150ms crossfade

### No Em Dashes Rule

Search entire codebase for em dashes (Unicode U+2014: -) and en dashes (U+2013: -).
Replace with hyphens or " - " (space-hyphen-space).

## Implementation Plan

### Test 1: Launch Performance

**Cold Launch (first time after reboot):**

1. Force quit BottingOS if running
2. Clear any disk caches if applicable
3. Start a timer
4. Double-click BottingOS.app
5. Stop timer when dashboard is fully rendered and interactive
6. Record time: **\_\_** seconds
7. Target: < 3 seconds

- [ ] PASS / FAIL

**Warm Launch (subsequent):**

1. Quit BottingOS
2. Immediately relaunch
3. Time to dashboard
4. Record time: **\_\_** seconds
5. Target: < 2 seconds

- [ ] PASS / FAIL

### Test 2: Navigation Performance

Use browser devtools (Cmd+Shift+I in Tauri dev window) Performance tab:

1. Start recording
2. Click each sidebar link:
   - Dashboard -> Calculator: **\_\_** ms
   - Calculator -> Orders: **\_\_** ms
   - Orders -> Inventory: **\_\_** ms
   - Inventory -> Emails: **\_\_** ms
   - Emails -> Vault: **\_\_** ms
   - Vault -> Discord: **\_\_** ms
   - Discord -> Analytics: **\_\_** ms
   - Analytics -> Calendar: **\_\_** ms
   - Calendar -> Resources: **\_\_** ms
3. All must be < 200ms

- [ ] PASS / FAIL (list any failures)

### Test 3: Large Data Rendering

**750 Emails:**

1. Insert 750 emails into database
2. Navigate to Emails page
3. Time from click to all content visible
4. Record time: **\_\_** seconds
5. Target: < 2 seconds
6. Scroll through the list - verify smooth rendering

- [ ] PASS / FAIL

**500 Orders:**

1. Insert 500 orders into database
2. Navigate to Orders page
3. Time from click to all content visible
4. Record time: **\_\_** seconds
5. Target: < 2 seconds

- [ ] PASS / FAIL

### Test 4: Discord Message Performance

1. Connect Discord CDP
2. Accumulate 1000+ messages in feed (or simulate by rapidly inserting)
3. Open Performance monitor in devtools
4. Scroll through the message feed rapidly
5. Check:
   - [ ] FPS stays above 30 (ideally 60)
   - [ ] No visible jank or stutter
   - [ ] Virtualization working (only visible rows in DOM)
   - [ ] Auto-scroll smooth when at bottom
   - [ ] "Jump to latest" works without lag

### Test 5: Memory Usage

Use Activity Monitor (macOS) or Task Manager (Windows):

1. Launch app, navigate to dashboard:
   - Memory: **\_\_** MB (target: < 100MB)
2. Load 1000 emails page:
   - Memory: **\_\_** MB (target: < 200MB)
3. Discord feed with 1000 messages:
   - Memory: **\_\_** MB (target: < 200MB)
4. During CSV import of 500 records:
   - Peak memory: **\_\_** MB (target: < 300MB)
5. After import completes and navigating away:
   - Memory settles to: **\_\_** MB (should decrease)

All measurements:

- [ ] PASS / FAIL (list any failures)

### Test 6: Design Spec Compliance Audit

Walk through every page and verify with devtools color picker:

**Colors:**

- [ ] All page backgrounds are #09090B (zinc-950)
- [ ] All card backgrounds are #000000 or zinc-900
- [ ] Primary text is #FAFAFA (zinc-50) - not pure white
- [ ] Secondary text is #A1A1AA (zinc-400)
- [ ] Muted text is #71717A (zinc-500)
- [ ] Amber accent #F59E0B used only for primary actions and active states
- [ ] No stray colors (no leftover Tailwind defaults)
- [ ] Profit values use #4ADE80 (green-400)
- [ ] Loss values use #F87171 (red-400)

**Typography:**

- [ ] Data values (prices, SKUs, counts) use font-mono tabular-nums
- [ ] Prices always show 2 decimal places with $ prefix
- [ ] KPI numbers use text-3xl font-semibold
- [ ] Table cells use text-sm (14px)

**Components:**

- [ ] All borders use rgba(255,255,255,0.23) or zinc-800
- [ ] All border-radius is 0.5rem (8px) - not too rounded, not too sharp
- [ ] Status badges use correct color mapping (green/amber/blue/red/gray)
- [ ] Focus rings use amber-500/50 on all interactive elements
- [ ] Custom scrollbar styles applied
- [ ] Empty states have icon + heading + description + CTA

**Layout:**

- [ ] Sidebar width 240px on desktop
- [ ] Card padding p-6 consistent
- [ ] Spacing consistent (gap-4/6)

### Test 7: No Em Dashes

Search the entire codebase:

```bash
grep -rn $'\xe2\x80\x94' src/ src-tauri/
grep -rn $'\xe2\x80\x93' src/ src-tauri/
```

- [ ] Zero em dashes found in source code
- [ ] Zero en dashes found in source code
- [ ] Check rendered UI text for em dashes (walk through every page)
- [ ] All uses of dashes are hyphens (-) or spaced hyphens ( - )

### Test 8: Animation Audit

Verify every animation with devtools (enable "Animations" panel in Chrome devtools):

- [ ] Page transitions: 150ms (200ms max)
- [ ] Modal open: 150ms
- [ ] Modal close: 100ms
- [ ] Card hover: 150ms border transition
- [ ] Button press: 100ms scale
- [ ] Tab switch: 150ms
- [ ] No animation exceeds 300ms
- [ ] No bounce easing anywhere
- [ ] No decorative animations (animated backgrounds, parallax, etc.)
- [ ] No loading spinners (all use skeleton screens)
- [ ] `prefers-reduced-motion: reduce` disables all animations

### Test 9: Search/Filter Response Times

1. With 500+ records in a table, type in search:
   - Time from keystroke to filtered results: **\_\_** ms
   - Target: < 300ms
   - [ ] PASS / FAIL
2. Apply dropdown filter (status, category):
   - Response time: **\_\_** ms
   - Target: < 200ms
   - [ ] PASS / FAIL
3. Sort by column click:
   - Response time: **\_\_** ms
   - Target: < 200ms
   - [ ] PASS / FAIL

## Files to Create

- None (testing only)

## Files to Modify

- Fix any em dashes found
- Fix any design spec violations
- Fix any performance bottlenecks identified

## Contracts

### Provides

- Performance benchmark results for all critical metrics
- Design spec compliance verification
- Em dash elimination verification
- Animation timing verification
- Memory usage profile

### Consumes

- All features from Phases 1-7
- Browser devtools for measurements

## Acceptance Criteria

- [ ] App launch < 3 seconds (cold), < 2 seconds (warm)
- [ ] All page navigations < 200ms
- [ ] 750 emails render < 2 seconds
- [ ] 500 orders render < 2 seconds
- [ ] 1000 Discord messages scroll smoothly at 30+ FPS
- [ ] Memory < 200MB during normal use
- [ ] Memory < 300MB peak during imports
- [ ] All colors match design spec exactly
- [ ] All typography follows spec (mono for data, system for UI)
- [ ] All animations 150-200ms range
- [ ] No bounce effects or decorative animations
- [ ] Skeleton loading on every data page (no spinners)
- [ ] Zero em dashes in codebase and rendered UI
- [ ] Zero en dashes in codebase and rendered UI
- [ ] Search/filter response < 300ms
- [ ] prefers-reduced-motion support works
- [ ] All status badges use correct color mapping
- [ ] All focus rings use amber-500

## Testing Protocol

### Performance Measurements

- Use devtools Performance tab for timing
- Use Activity Monitor for memory
- Record all measurements in a spreadsheet
- Retest after any fixes

### Visual Audit

- Screenshot every page
- Compare against design spec colors with color picker
- Check responsive behavior at different window sizes

### Automated Checks

```bash
# Em dash search
grep -rn $'\xe2\x80\x94' src/ src-tauri/ || echo "No em dashes found"
grep -rn $'\xe2\x80\x93' src/ src-tauri/ || echo "No en dashes found"
```

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds
- `npx tauri build` succeeds
- `cargo clippy` passes

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/ui-ux-design.md`

## Git

- Branch: `test/8.4-performance`
- Commit prefix: `Task 8.4:`
