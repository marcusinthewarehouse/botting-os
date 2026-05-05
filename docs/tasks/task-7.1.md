# Task 7.1: Onboarding Wizard

## Objective

Build a 3-step onboarding wizard for first-time users that collects category preferences, tool usage, and offers data import. Gets users productive in under 5 minutes with zero friction.

## Context

First-time users need guidance. The onboarding wizard runs on first launch (checked via `onboarding_complete` in settings table), collects basic preferences to customize the app experience, and optionally imports existing data. After completion, users land on the dashboard with the app configured for their workflow. Design: clean, minimal, full-screen layout with no sidebar. All steps are optional and skippable.

## Dependencies

- Phase 1: Settings table, Drizzle ORM
- Phase 2/4: CSV import utilities (for import step)

## Blocked By

- Phase 1 data layer must be functional

## Research Findings

### Onboarding Best Practices (from ui-ux-design.md)

- Progress bar at top showing current step
- Back/Next/Skip buttons on each step
- No required steps - everything skippable
- Save selections immediately (don't lose progress on crash)
- Redirect to dashboard on completion
- Never show again after completion

### Step 1: "What do you bot?"

Multi-select chips for categories:

- Sneakers, Pokemon, Funko Pops, Supreme, Trading Cards, Electronics, Other
- Sets default category filters throughout the app
- Stored as JSON array in settings: `user_categories`

### Step 2: "What tools do you use?"

Multi-select for bot software:

- Cybersole, Valor, NSB, Wrath, Kodai, AYCD, Other
- Pre-configures webhook template knowledge
- Stored as JSON array in settings: `user_bots`

### Step 3: "Import your data"

Three import options (all optional):

- CSV import (orders/inventory/emails)
- AYCD profile import (JSON format)
- Skip for now
- Uses existing import infrastructure from Phase 2/4

### Settings Keys

- `onboarding_complete`: "true" / "false"
- `user_categories`: JSON array of selected categories
- `user_bots`: JSON array of selected bot names

## Implementation Plan

### Step 1: Create Onboarding Layout

`src/app/onboarding/page.tsx`:

Full-screen layout (no sidebar):

```
+----------------------------------------------------------+
| [Progress Bar: Step 1 of 3]                               |
+----------------------------------------------------------+
|                                                            |
|                    [Step Content]                           |
|                                                            |
+----------------------------------------------------------+
| [Back]                              [Skip] [Next ->]       |
+----------------------------------------------------------+
```

- Check `onboarding_complete` on mount - if true, redirect to dashboard
- Full-screen, centered content area
- BottingOS logo at top
- Progress bar with step indicators
- Footer with navigation buttons

### Step 2: Create Progress Bar Component

`src/components/onboarding/progress-bar.tsx`:

```tsx
interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}
```

- Three circles connected by lines
- Completed steps: filled amber
- Current step: amber border with amber fill
- Future steps: zinc-700 border
- Step labels below circles

### Step 3: Create Category Selection Step

`src/components/onboarding/step-categories.tsx`:

```tsx
interface StepCategoriesProps {
  selected: string[];
  onChange: (categories: string[]) => void;
}
```

- Heading: "What do you bot?"
- Subtitle: "Select your product categories. This helps us customize your experience."
- Grid of selectable chips/cards with icons:
  - Sneakers (shoe icon), Pokemon (star), Funko Pops (gift), Supreme (crown), Trading Cards (layers), Electronics (monitor), Other (plus)
- Click to toggle, amber border when selected
- Multiple selection allowed

### Step 4: Create Tools Selection Step

`src/components/onboarding/step-tools.tsx`:

```tsx
interface StepToolsProps {
  selected: string[];
  onChange: (tools: string[]) => void;
}
```

- Heading: "What tools do you use?"
- Subtitle: "Select your bots and tools. We'll set up webhook templates for them."
- Grid of selectable chips: Cybersole, Valor, NSB, Wrath, Kodai, AYCD, Other
- Same toggle pattern as categories

### Step 5: Create Import Step

`src/components/onboarding/step-import.tsx`:

```tsx
interface StepImportProps {
  onImportComplete: () => void;
}
```

- Heading: "Import your data"
- Subtitle: "Bring in your existing data or start fresh."
- Three cards:
  1. **CSV Import**: file picker button
  2. **AYCD Import**: file picker button
  3. **Start Fresh**: skip and start clean
- File picker uses `tauri-plugin-dialog`
- Show import progress after file selected
- "Skip" is prominent and guilt-free

### Step 6: Save Preferences and Complete

On final step completion or skip:

```typescript
await db
  .insert(settings)
  .values([
    {
      key: "user_categories",
      valuePlain: JSON.stringify(selectedCategories),
      updatedAt: new Date(),
    },
    {
      key: "user_bots",
      valuePlain: JSON.stringify(selectedBots),
      updatedAt: new Date(),
    },
    { key: "onboarding_complete", valuePlain: "true", updatedAt: new Date() },
  ])
  .onConflictDoUpdate({
    target: settings.key,
    set: { valuePlain: sql`excluded.value_plain`, updatedAt: new Date() },
  });
```

Redirect to `/` (dashboard).

### Step 7: Route Guard

In the dashboard layout, check onboarding status:

```typescript
const onboardingComplete = await db
  .select()
  .from(settings)
  .where(eq(settings.key, "onboarding_complete"));
if (!onboardingComplete.length || onboardingComplete[0].valuePlain !== "true") {
  redirect("/onboarding");
}
```

## Files to Create

- `src/app/onboarding/page.tsx` - Onboarding wizard page (full-screen, no sidebar)
- `src/components/onboarding/progress-bar.tsx` - Step progress indicator
- `src/components/onboarding/step-categories.tsx` - Category multi-select step
- `src/components/onboarding/step-tools.tsx` - Bot/tools multi-select step
- `src/components/onboarding/step-import.tsx` - Data import step with file pickers

## Files to Modify

- Dashboard layout - Add onboarding redirect check

## Contracts

### Provides

- Onboarding wizard at `/onboarding`
- Settings keys: `onboarding_complete`, `user_categories`, `user_bots`
- Route guard: redirect to onboarding if not completed
- User preference data for category defaults and webhook templates

### Consumes

- Phase 1: `db`, `settings` table from schema
- Phase 2/4: CSV import utilities (if available)
- `tauri-plugin-dialog` for file picker

## Acceptance Criteria

- [ ] Onboarding page renders at `/onboarding` on first launch
- [ ] Progress bar shows 3 steps with correct states
- [ ] Step 1: Category selection with multi-select chips
- [ ] Step 2: Tool selection with multi-select chips
- [ ] Step 3: Import options with file pickers
- [ ] Back button goes to previous step (disabled on step 1)
- [ ] Next button advances to next step
- [ ] Skip button skips current step
- [ ] All steps are optional - can skip everything
- [ ] Selections saved to settings table on completion
- [ ] `onboarding_complete` set to "true" on finish
- [ ] Redirect to dashboard after completion
- [ ] Subsequent launches skip onboarding (go directly to dashboard)
- [ ] Clean, minimal design with amber accents on zinc-950 background
- [ ] No sidebar shown during onboarding (full-screen)
- [ ] Responsive layout works on smaller screens

## Testing Protocol

### Unit Tests

- Test settings persistence (categories, bots, onboarding_complete)
- Test route guard logic (redirect when not complete, pass when complete)

### Browser/Playwright Tests

- Fresh state: navigate to `/` - verify redirect to `/onboarding`
- Step through all 3 steps: select categories, select tools, skip import
- Verify settings saved after completion
- Verify redirect to dashboard
- Navigate to `/` again - verify no redirect (onboarding complete)
- Test back/skip navigation between steps
- Test with no selections (all skipped) - should still complete

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/ui-ux-design.md`

## Git

- Branch: `feat/7.1-onboarding`
- Commit prefix: `Task 7.1:`
