# Task 2.6: VCC Tracker (Rebuild)

## Objective

Migrate the VCC (Virtual Credit Card) tracker from localStorage to Drizzle/SQLite. Build a clean management UI for tracking virtual credit cards, linking them to email accounts, filtering by provider, and seeing which stores each VCC is used on.

## Context

The existing VCC tracker at `src/app/(dashboard)/vcc/page.tsx` uses localStorage. This task rebuilds it using `vccsRepo` from Task 1.4. Botters use VCCs (from Privacy.com, Capital One virtual numbers, etc.) to make purchases. They need to track which card is linked to which email/account and which stores they've used each card on to avoid getting flagged for multiple purchases on the same card.

## Dependencies

- Task 1.4 - `vccsRepo` for CRUD and linking operations
- Task 1.4 - `emailsRepo` for linking VCCs to email accounts
- Task 2.1 - App shell, PageHeader, PageTransition, design tokens

## Blocked By

- Task 1.4 (needs VCC and email repositories)
- Task 2.1 (needs app shell)

## Research Findings

### VCC Schema

```typescript
vccs: {
  id, provider, lastFour, label, linkedAccountId (FK to emails), status, createdAt, updatedAt
}
```

### Linking to Email Accounts

Each VCC can be linked to one email account via `linkedAccountId`. This lets users see which email/account a card is associated with. The UI shows the linked email address alongside the VCC.

### Provider Options

Common VCC providers:

- Privacy.com (most popular for botting)
- Capital One Eno (virtual card numbers)
- Citi (virtual account numbers)
- Apple Pay / Apple Card
- Other (custom entry)

### Status Values

- Active: card is usable
- Used: card has been used (one-time cards)
- Closed: card has been closed/deactivated
- Flagged: card was flagged by a retailer

## Implementation Plan

### Step 1: Create VCC Form Component (src/components/vcc/vcc-form.tsx)

Sheet form for adding/editing VCC entries:

```tsx
interface VccFormProps {
  entry?: Vcc; // for editing
  emails: Email[]; // for linking dropdown
  onSubmit: (data: NewVcc) => void;
  onClose: () => void;
}
```

Fields:

- Provider (select: Privacy.com, Capital One, Citi, Apple Pay, Other)
- Last 4 digits (text input, maxlength 4, numeric only)
- Label (text input) - user-friendly name like "Nike card #2"
- Linked Account (select dropdown of email addresses from emailsRepo)
- Status (select: Active, Used, Closed, Flagged)

### Step 2: Create VCC Table Component (src/components/vcc/vcc-table.tsx)

Data table showing all VCCs:

```tsx
interface VccTableProps {
  vccs: VccWithEmail[]; // VCC + linked email data
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}

type VccWithEmail = Vcc & { linkedEmail?: Email };
```

Columns:

- Label (text-sm font-medium)
- Last 4 (font-mono, formatted as dots + last 4: \*\*\*\*1234)
- Provider (Badge)
- Linked Email (truncated, with tooltip for full address)
- Status (StatusBadge)
- Actions (edit, delete dropdown)

Features:

- Sortable by label, provider, status
- Filter bar: search, provider dropdown, status dropdown
- Bulk select with floating action bar (delete selected, change status)
- Empty state when no VCCs

### Step 3: Rebuild VCC Page (src/app/(dashboard)/vcc/page.tsx)

Layout:

```
<PageHeader title="VCC Tracker" actions={[
  { label: "Add VCC", onClick: openForm },
]} />

{/* Summary row */}
<div className="grid grid-cols-4 gap-4 mb-6">
  <KpiCard title="Total VCCs" value={total} />
  <KpiCard title="Active" value={active} />
  <KpiCard title="Used" value={used} />
  <KpiCard title="Flagged" value={flagged} />
</div>

{/* Filter bar */}
<div className="flex gap-2 mb-4">
  <SearchInput placeholder="Search VCCs..." />
  <Select label="Provider" options={['All', ...providers]} />
  <Select label="Status" options={['All', 'Active', 'Used', 'Closed', 'Flagged']} />
</div>

<VccTable vccs={filteredVccs} ... />

<VccForm />  {/* Sheet */}
```

### Step 4: Link VCC to Email Account

When creating/editing a VCC, the "Linked Account" dropdown fetches all emails from `emailsRepo.getAll()`. Selected email's ID is stored as `linkedAccountId`. The table joins this data to display the linked email address.

### Step 5: Quick Status Change

Clicking the status badge on a row opens a small popover/dropdown to quickly change status without opening the full edit form. Status changes are saved immediately.

### Step 6: Remove localStorage Usage

Delete all localStorage references. All data through `vccsRepo`.

## Files to Create

- `src/components/vcc/vcc-form.tsx` - Add/edit VCC entry sheet
- `src/components/vcc/vcc-table.tsx` - VCC data table with filters

## Files to Modify

- `src/app/(dashboard)/vcc/page.tsx` - Full rebuild

## Contracts

### Provides (for downstream)

- VCC tracker page at `/vcc` route
- VCC-to-email linking

### Consumes (from upstream)

- `vccsRepo` from Task 1.4 (getAll, getByProvider, create, update, remove, linkToAccount)
- `emailsRepo` from Task 1.4 (getAll - for linking dropdown)
- `<PageHeader>`, `<PageTransition>`, `<StatusBadge>`, `<KpiCard>`, `<EmptyState>` from Task 2.1
- shadcn: Card, Input, Button, Sheet, Select, Badge, DropdownMenu, Table

## Acceptance Criteria

- [ ] VCC entries stored in SQLite via vccsRepo
- [ ] Add form creates VCC with provider, last 4, label, linked account, status
- [ ] Edit form updates existing VCC
- [ ] Delete removes VCC from database
- [ ] Last 4 displays as \*\*\*\*1234 (font-mono)
- [ ] Provider shows as colored badge
- [ ] Status badge shows correct color (active=green, used=blue, closed=gray, flagged=red)
- [ ] Quick status change via badge popover
- [ ] VCC links to email account via dropdown
- [ ] Linked email displays in table row
- [ ] Search filters by label and last 4
- [ ] Provider filter works
- [ ] Status filter works
- [ ] Summary KPI cards show correct counts
- [ ] No localStorage usage remains
- [ ] Empty state shown when no VCCs
- [ ] Page wraps in PageTransition

## Testing Protocol

### Unit/Integration Tests

- Test VCC CRUD through vccsRepo
- Test linking VCC to email account
- Test filtering by provider and status
- Test search filtering

### Browser Testing (Playwright MCP)

- Navigate to VCC page - verify empty state
- Add a VCC entry (Privacy.com, last4: 1234, label: "Nike card")
- Verify it appears in table with correct formatting
- Add an email first, then add a VCC linked to it
- Verify linked email shows in table
- Change status via quick change
- Edit the VCC
- Delete the VCC
- Filter by provider
- Take screenshots of: empty state, populated table, add form, quick status change

### Build/Lint/Type Checks

- `npx tsc --noEmit`
- `npm run build`

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`
- `.claude/skills/bottingos-data-model/SKILL.md`

## Research Files to Read

- None specific

## Git

- Branch: feat/2.6-vcc-rebuild
- Commit message prefix: Task 2.6:
