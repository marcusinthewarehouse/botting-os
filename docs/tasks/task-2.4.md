# Task 2.4: Email & Account Manager (Rebuild)

## Objective

Migrate the email manager from localStorage to Drizzle/SQLite, support bulk import of 750+ HideMyEmail addresses, add retailer tagging, and provide two views: by iCloud source account and by retailer. Support AYCD CSV/JSON import for users with AYCD Toolbox.

## Context

The existing email manager at `src/app/(dashboard)/emails/page.tsx` uses localStorage. Many botters use Apple's HideMyEmail feature to generate hundreds of unique email aliases from a few iCloud accounts. They need to organize these by source iCloud account and by which retailer each email is registered with. The key challenge is handling 750+ emails performantly - this requires virtual scrolling.

## Dependencies

- Task 1.4 - `emailsRepo` for CRUD, bulk import, search, retailer tagging
- Task 2.1 - App shell, PageHeader, PageTransition, design tokens, EmptyState

## Blocked By

- Task 1.4 (needs emails repository with bulkCreate)
- Task 2.1 (needs app shell)

## Research Findings

### HideMyEmail Pattern

Users have 2-5 iCloud accounts, each generating 100-200+ HideMyEmail aliases. The aliases look like: `random_string@privaterelay.appleid.com`. Users paste them in bulk from iCloud settings.

### Import Methods

1. **Paste textarea**: One email per line. Simple, works for HideMyEmail bulk paste.
2. **AYCD CSV/JSON**: AYCD Toolbox exports email lists as CSV or JSON. Detect format and parse.
3. **Manual add**: Single email entry form.

### Two View Modes

1. **By Source**: Group emails by `icloudAccount` field. Each iCloud account is a collapsible section showing its aliases.
2. **By Retailer**: Group emails by retailer tags. Each retailer is a section showing tagged emails.

### Retailer Tagging

Users tag which retailers each email is registered with (Nike, Footlocker, Shopify, etc.). Tags stored as JSON array in the `retailers` column. Used for:

- Seeing which emails are used for which stores
- Avoiding using the same email on the same store twice
- Quick filtering

### Virtual Scrolling

TanStack Virtual for 750+ row lists. Only render visible rows + buffer. Critical for performance.

### Emails Schema

```typescript
emails: {
  id, address, icloudAccount, provider, retailers (json string[]), status, notes, createdAt, updatedAt
}
```

## Implementation Plan

### Step 1: Create Bulk Import Component (src/components/emails/bulk-import.tsx)

Multi-step import dialog:

**Step 1: Input Method**
Tab selector: "Paste Emails" | "Import File (AYCD)"

**Paste Emails tab:**

- Large textarea (min 10 rows)
- Placeholder: "Paste email addresses, one per line..."
- iCloud Account field (text input) - which iCloud account these aliases belong to
- Parse on submit: split by newline, trim whitespace, validate email format, deduplicate

**Import File tab:**

- File picker (accept .csv, .json)
- Auto-detect AYCD format
- Preview parsed emails in a list

**Step 2: Review**

- Show count of emails to import
- Show duplicates that will be skipped (already in DB)
- Confirm button

**Step 3: Result**

- Show count imported / skipped
- Toast notification

### Step 2: Create Retailer Tagger Component (src/components/emails/retailer-tagger.tsx)

A component for adding/removing retailer tags from emails:

```tsx
interface RetailerTaggerProps {
  emailId: number;
  currentRetailers: string[];
  onUpdate: (retailers: string[]) => void;
}
```

Display:

- Existing tags as removable badges
- Combobox input to add new tags
- Predefined suggestions: Nike, Footlocker, Shopify, Supreme, Adidas, New Balance, Finish Line, Eastbay, JD Sports, SSENSE, etc.
- Custom tag support (user types anything)

### Step 3: Create View Toggle Component (src/components/emails/view-toggle.tsx)

Toggle between "By Source" and "By Retailer" views:

```tsx
interface ViewToggleProps {
  view: "source" | "retailer";
  onViewChange: (view: "source" | "retailer") => void;
}
```

Use shadcn Tabs or ToggleGroup component. Sticky position below header.

### Step 4: Create Email List Components

**By Source View (src/components/emails/source-view.tsx):**

- Group emails by `icloudAccount`
- Each group: collapsible section with iCloud account as header, count badge
- Within group: virtual-scrolled list of email addresses
- Each email row: address, status badge, retailer tags, actions (edit, delete)

**By Retailer View (src/components/emails/retailer-view.tsx):**

- Group emails by retailer tags (one email can appear in multiple groups)
- Each group: collapsible section with retailer name as header, count badge
- "Untagged" section for emails with no retailers

### Step 5: Rebuild Emails Page (src/app/(dashboard)/emails/page.tsx)

Layout:

```
<PageHeader title="Email Manager" actions={[
  { label: "Bulk Import", onClick: openBulkImport },
  { label: "Add Email", onClick: openAddForm },
]} />

<div className="flex items-center justify-between mb-4">
  <SearchInput placeholder="Search emails..." />
  <ViewToggle view={view} onViewChange={setView} />
</div>

{view === 'source' ? <SourceView /> : <RetailerView />}

<BulkImportDialog />
<AddEmailSheet />
```

### Step 6: Add Email Form

Simple sheet form for adding a single email:

- Email address (text input)
- iCloud Account (text input, optional)
- Provider (select: iCloud, Gmail, Outlook, Yahoo)
- Status (select: Active, Banned, Suspended)
- Notes (textarea)

### Step 7: Virtual Scrolling Setup

Install and configure TanStack Virtual:

```bash
npm install @tanstack/react-virtual
```

Use `useVirtualizer` for email lists with 750+ items. Set `estimateSize` to row height (~44px). Render only visible items + 20-item buffer above/below.

### Step 8: Remove localStorage Usage

Delete all localStorage references. All data through `emailsRepo`.

## Files to Create

- `src/components/emails/bulk-import.tsx` - Bulk paste/file import dialog
- `src/components/emails/retailer-tagger.tsx` - Tag emails with retailers
- `src/components/emails/view-toggle.tsx` - Switch between source/retailer view
- `src/components/emails/source-view.tsx` - Emails grouped by iCloud account
- `src/components/emails/retailer-view.tsx` - Emails grouped by retailer tag

## Files to Modify

- `src/app/(dashboard)/emails/page.tsx` - Full rebuild
- `package.json` - Add @tanstack/react-virtual

## Contracts

### Provides (for downstream)

- Email manager page at `/emails` route
- Bulk import capability for 750+ emails
- Retailer tagging system

### Consumes (from upstream)

- `emailsRepo` from Task 1.4 (getAll, create, bulkCreate, search, addRetailerTag, removeRetailerTag, getByIcloudAccount, getByRetailer, update, remove)
- `<PageHeader>`, `<PageTransition>`, `<StatusBadge>`, `<EmptyState>` from Task 2.1
- shadcn: Card, Input, Button, Dialog, Sheet, Badge, Tabs, Combobox/Select
- `@tanstack/react-virtual` for virtual scrolling

## Acceptance Criteria

- [ ] Bulk paste import handles 750+ emails (one per line) without freezing
- [ ] Bulk import assigns iCloud account to all imported emails
- [ ] Bulk import detects and skips duplicates
- [ ] AYCD CSV/JSON import works
- [ ] Source view groups emails by iCloud account in collapsible sections
- [ ] Retailer view groups emails by retailer tag
- [ ] Retailer tagger adds/removes tags with combobox
- [ ] View toggle switches between source and retailer views
- [ ] Search filters emails across both views
- [ ] Virtual scrolling keeps UI responsive with 750+ emails
- [ ] Single email add form works
- [ ] Edit and delete work for individual emails
- [ ] Status badges show correct colors (active=green, banned=red, suspended=amber)
- [ ] No localStorage usage remains
- [ ] Empty state shown when no emails
- [ ] Page wraps in PageTransition

## Testing Protocol

### Unit/Integration Tests

- Test bulk import parsing with 100+ emails
- Test duplicate detection
- Test retailer tag add/remove
- Test AYCD format detection
- Test search filtering
- Test grouping by source and retailer

### Browser Testing (Playwright MCP)

- Navigate to emails page - verify empty state
- Bulk import 50 test emails with iCloud account
- Verify source view shows grouped emails
- Tag some emails with retailers
- Switch to retailer view - verify grouping
- Search for a specific email
- Delete an email
- Take screenshots of: empty state, source view, retailer view, bulk import dialog
- Performance check: import 750 emails and scroll through list

### Build/Lint/Type Checks

- `npx tsc --noEmit`
- `npm run build`

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`
- `.claude/skills/bottingos-data-model/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/DISCOVERY.md` (D11 - AYCD integration)
- `.claude/orchestration-bottingos/research/aycd-bot-ecosystem.md` (import formats)

## Git

- Branch: feat/2.4-email-rebuild
- Commit message prefix: Task 2.4:
