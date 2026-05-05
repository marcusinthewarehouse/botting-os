# Task 6.4: Resource Hub (Link Directory)

## Objective

Build a curated link directory organized by category with a grid of link cards, search/filter, custom link addition, and 20-30 seeded curated links for common botting resources.

## Context

New botters need guidance on tools, proxies, cook groups, and educational resources. The resource hub provides a curated directory of useful links organized by category. Users can also add their own custom links. This is a lightweight feature - no external API calls, just a local database of links with a clean grid UI.

## Dependencies

- Phase 1: Drizzle ORM, db instance, migration runner

## Blocked By

- Nothing (standalone feature)

## Research Findings

### Schema: resources table

```typescript
export const resources = sqliteTable("resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  isCustom: integer("is_custom", { mode: "boolean" }).default(false),
  icon: text("icon"), // optional favicon URL or Lucide icon name
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

### Categories

- Getting Started - Beginner guides, tutorials
- Bots - Bot software links and docs
- Proxies - Proxy providers
- Cook Groups - Discord-based cook groups
- Marketplaces - StockX, GOAT, eBay
- Tools - Utilities, AYCD, extensions
- Education - YouTube channels, blog posts
- Other - User-added custom category

### Seed Data (20-30 links)

Example curated links:

**Getting Started:**

- BotBroker Blog - botbroker.io/blog
- Sneaker Bot Guide - general overview

**Bots:**

- Cybersole - cybersole.io
- Valor - valoraio.com
- NSB - nsbsupreme.com
- Wrath - wrathbots.com
- Kodai - kodai.io

**Proxies:**

- Leaf Proxies - leafproxies.com
- Oculus Proxies - oculusproxies.com
- Scarlet Proxies - scarletproxies.com

**Cook Groups:**

- Notify - notify.org
- GFNF - gofornofees.com

**Marketplaces:**

- StockX - stockx.com
- GOAT - goat.com
- eBay - ebay.com
- Mercari - mercari.com

**Tools:**

- AYCD Toolbox - aycd.io
- Auto Fill extension guides
- Address jigging tools

## Implementation Plan

### Step 1: Add Resources Table to Schema

If not present in `src/lib/db/schema.ts`, add the `resources` table and migration.

### Step 2: Create Seed Data

`src/lib/db/seed-resources.ts`:

```typescript
const seedResources = [
  {
    name: "Cybersole",
    url: "https://cybersole.io",
    description: "Premium sneaker bot for Nike, Shopify, Supreme, and more.",
    category: "Bots",
  },
  {
    name: "Valor",
    url: "https://valoraio.com",
    description: "All-in-one bot supporting 100+ sites.",
    category: "Bots",
  },
  // ... 20-30 total entries
];

async function seedResourcesIfEmpty() {
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(resources);
  if (count[0].count === 0) {
    await db.insert(resources).values(
      seedResources.map((r) => ({
        ...r,
        isCustom: false,
        createdAt: new Date(),
      })),
    );
  }
}
```

Run on first app load or during migration.

### Step 3: Create Resource Card Component

`src/components/resources/resource-card.tsx`:

```
+----------------------------------+
| [Icon/Favicon]                   |
| Resource Name                    |
| Short description text here...  |
| [Category Badge]      [-> Open] |
+----------------------------------+
```

- Card with hover border glow (amber-500/30)
- Favicon or Lucide icon
- Name, description (2-line clamp)
- Category badge (colored)
- Click card or "Open" button to open URL in default browser
- Custom links show edit/delete actions

### Step 4: Create Resource Form

`src/components/resources/resource-form.tsx`:

Dialog with fields:

- Name (required)
- URL (required, validate URL format)
- Description (optional)
- Category (select from predefined + "Other")
- Save/Cancel

### Step 5: Create Resources Page

`src/app/(dashboard)/resources/page.tsx`:

```
+------------------------------------------------------------------+
| Resources                                    [+ Add Link]        |
+------------------------------------------------------------------+
| [Search links...]                                                |
+------------------------------------------------------------------+
| [All] [Bots] [Proxies] [Cook Groups] [Marketplaces] [Tools] ... |
+------------------------------------------------------------------+
| [Card] [Card] [Card] [Card]                                     |
| [Card] [Card] [Card] [Card]                                     |
| [Card] [Card] [Card] [Card]                                     |
+------------------------------------------------------------------+
```

- Category tabs/pills for filtering
- Search input filters by name and description
- Grid of resource cards (3-4 columns responsive)
- "Add Link" button opens form modal
- Empty state per category when filtered
- Separate "My Links" section or filter for custom links

### Step 6: Open Links in Default Browser

Use Tauri's shell plugin or `window.open()`:

```typescript
async function openLink(url: string) {
  const { open } = await import("@tauri-apps/plugin-shell");
  await open(url);
}
```

If `@tauri-apps/plugin-shell` is not available, fall back to `window.open(url, '_blank')`.

### Step 7: Category Color Coding

```typescript
const categoryColors: Record<string, string> = {
  "Getting Started": "bg-green-500/15 text-green-400 border-green-500/25",
  Bots: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  Proxies: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  "Cook Groups": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Marketplaces: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  Tools: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Education: "bg-pink-500/15 text-pink-400 border-pink-500/25",
  Other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};
```

## Files to Create

- `src/app/(dashboard)/resources/page.tsx` - Resource hub page
- `src/components/resources/resource-card.tsx` - Individual resource link card
- `src/components/resources/resource-form.tsx` - Add/edit resource modal
- `src/lib/db/seed-resources.ts` - Seed data for curated links

## Files to Modify

- `src/lib/db/schema.ts` - Add `resources` table if not present
- `src/lib/db/migrate.ts` - Add migration for resources table

## Contracts

### Provides

- Resource hub page at `/resources`
- Grid of categorized link cards
- Category filtering and search
- Add custom links
- Seed data with 20-30 curated links
- `resources` table in schema

### Consumes

- Phase 1: `db`, Drizzle ORM, migration runner
- `@tauri-apps/plugin-shell` for opening links (or fallback to window.open)

## Acceptance Criteria

- [ ] Resources page renders at `/resources`
- [ ] 20-30 curated links seeded on first load
- [ ] Grid of resource cards (responsive 3-4 columns)
- [ ] Category tabs filter resources
- [ ] Search filters by name and description
- [ ] Cards show name, description, category badge
- [ ] Clicking card opens URL in default browser
- [ ] "Add Link" opens form modal
- [ ] Form validates name and URL
- [ ] Custom links saved to database with `isCustom: true`
- [ ] Custom links show edit/delete actions
- [ ] Edit custom link updates correctly
- [ ] Delete custom link with confirmation
- [ ] Cannot edit/delete seeded links
- [ ] Category color coding matches design system
- [ ] Card hover effect (amber border glow)
- [ ] Empty state when category has no links
- [ ] Design matches zinc dark theme with amber accents

## Testing Protocol

### Unit Tests

- Test seed data insertion (only when empty)
- Test URL validation
- Test search filtering logic

### Browser/Playwright Tests

- Verify seeded links appear on first load
- Click category tab, verify filter
- Search for a resource, verify results
- Add custom link, verify it appears
- Edit custom link, verify changes
- Delete custom link, verify removal
- Click resource card, verify URL opens

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/ui-ux-design.md`

## Git

- Branch: `feat/6.4-resource-hub`
- Commit prefix: `Task 6.4:`
