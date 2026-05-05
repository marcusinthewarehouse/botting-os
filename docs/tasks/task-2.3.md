# Task 2.3: Profit & Expense Tracker (Rebuild)

## Objective

Migrate the profit/expense tracker from localStorage to Drizzle/SQLite, add CSV import for bank statements (auto-detect Chase, Capital One, Citi, Amex formats), and build a clean transaction management UI with running totals and P&L summaries.

## Context

The existing tracker at `src/app/(dashboard)/tracker/page.tsx` uses localStorage. This task rebuilds it using `trackerRepo` from Task 1.4. The tracker is a manual bookkeeping tool - users log purchases, sales, cancels, and refunds to track their botting P&L. The CSV import feature is critical because most botters track expenses via credit card statements.

## Dependencies

- Task 1.4 - `trackerRepo` for all CRUD operations and aggregates
- Task 2.1 - App shell, PageHeader, PageTransition, design tokens

## Blocked By

- Task 1.4 (needs tracker repository)
- Task 2.1 (needs app shell)

## Research Findings

### CSV Bank Formats (from DISCOVERY.md)

Auto-detect by examining CSV headers:

**Chase:**

```csv
Transaction Date,Post Date,Description,Category,Type,Amount,Memo
```

- Amount is negative for charges, positive for payments/credits

**Capital One:**

```csv
Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
```

- Debit column for charges, Credit column for payments

**Citi:**

```csv
Status,Date,Description,Debit,Credit
```

**Amex:**

```csv
Date,Description,Amount
```

- Amount is positive for charges (opposite of Chase)

**Fallback:** If headers don't match any known format, show manual column mapping UI - let user assign which column is date, description, amount.

### Tracker Entry Schema

```typescript
tracker_entries: {
  (id, type, description, amount, category, date, tags, createdAt);
}
```

- `type`: purchase, sale, cancel, refund
- `amount`: always positive. Type determines direction (purchase = expense, sale = income)
- `tags`: JSON array of strings for user categorization
- `category`: sneakers, pokemon, funko, electronics, shipping, fees, other

### P&L Display

- Running total: sum of sales + refunds - purchases - cancels
- Monthly breakdown: group by month, show income/expense/net
- Category breakdown: sum by category

## Implementation Plan

### Step 1: Create CSV Parser Module (src/lib/csv-parser.ts)

```typescript
interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // positive = expense, negative = income (normalized)
  category?: string;
  raw: Record<string, string>; // original CSV row
}

type BankFormat = 'chase' | 'capital_one' | 'citi' | 'amex' | 'unknown';

function detectFormat(headers: string[]): BankFormat {
  const h = headers.map(s => s.trim().toLowerCase());
  if (h.includes('transaction date') && h.includes('type') && h.includes('amount') && h.includes('memo')) return 'chase';
  if (h.includes('card no.') && h.includes('debit') && h.includes('credit')) return 'capital_one';
  if (h.includes('status') && h.includes('debit') && h.includes('credit')) return 'citi';
  if (h.length <= 4 && h.includes('date') && h.includes('description') && h.includes('amount')) return 'amex';
  return 'unknown';
}

function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } { ... }
function parseTransactions(csvText: string, format?: BankFormat, columnMapping?: ColumnMapping): ParsedTransaction[] { ... }

interface ColumnMapping {
  date: string;
  description: string;
  amount: string; // or debit+credit columns
  debitColumn?: string;
  creditColumn?: string;
}
```

### Step 2: Create Entry Form Component (src/components/tracker/entry-form.tsx)

Manual transaction entry form:

```tsx
interface EntryFormProps {
  onSubmit: (entry: NewTrackerEntry) => void;
  initialValues?: Partial<TrackerEntry>; // for editing
}
```

Fields:

- Type: select (purchase, sale, cancel, refund)
- Description: text input
- Amount: number input with $ prefix
- Category: select (sneakers, pokemon, funko, electronics, shipping, fees, other)
- Date: date picker (default today)
- Tags: tag input (comma-separated, renders as badges)

Use shadcn Sheet (slide from right) for the form. "Add Transaction" button in page header opens it.

### Step 3: Create CSV Import Component (src/components/tracker/csv-import.tsx)

Multi-step import flow:

**Step 1: Upload**

- Drag-and-drop zone or file picker button
- Read file as text, parse CSV headers
- Detect bank format

**Step 2: Preview & Mapping**

- If format detected: show preview table of first 5 rows with detected columns highlighted
- If format unknown: show manual column mapping dropdowns (date, description, amount)
- User confirms mapping

**Step 3: Tag & Filter**

- Show all parsed transactions in a table
- Checkbox column for selecting which to import
- "Tag as botting" bulk action - user selects relevant transactions
- Category dropdown per row (or bulk assign)
- "Import Selected" button

**Step 4: Result**

- Show count imported
- Toast notification

### Step 4: Create Summary Cards (src/components/tracker/summary-cards.tsx)

KPI cards row at top of page:

- Total Income (sum of sales + refunds) - green
- Total Expenses (sum of purchases) - red
- Net P&L (income - expenses) - green or red
- Transactions count

### Step 5: Rebuild Tracker Page (src/app/(dashboard)/tracker/page.tsx)

Layout:

```
<PageHeader title="Profit & Expense Tracker" actions={[
  { label: "Add Transaction", onClick: openEntryForm },
  { label: "Import CSV", onClick: openCsvImport },
  { label: "Export CSV", onClick: exportCsv },
]} />

<SummaryCards />

<div className="mt-6">
  {/* Filter bar */}
  <div className="flex gap-2 mb-4">
    <SearchInput placeholder="Search transactions..." />
    <Select label="Type" options={['All', 'Purchase', 'Sale', 'Cancel', 'Refund']} />
    <Select label="Category" options={['All', ...categories]} />
    <DateRangePicker />
    <Button variant="ghost">Clear filters</Button>
  </div>

  {/* Transaction table */}
  <DataTable columns={[
    { header: "Date", key: "date" },
    { header: "Type", key: "type" },  // StatusBadge
    { header: "Description", key: "description" },
    { header: "Amount", key: "amount" },  // ProfitDisplay
    { header: "Category", key: "category" },  // Badge
    { header: "Tags", key: "tags" },  // Tag badges
    { header: "", key: "actions" },  // Edit/Delete
  ]} />
</div>

<EntryForm />  {/* Sheet, opens on Add Transaction */}
<CsvImport />  {/* Dialog, opens on Import CSV */}
```

### Step 6: Implement CSV Export

Export all transactions (or filtered set) as CSV with columns: Date, Type, Description, Amount, Category, Tags.

### Step 7: Remove localStorage Usage

Delete any localStorage reads/writes from the tracker. All persistence through `trackerRepo`.

## Files to Create

- `src/lib/csv-parser.ts` - CSV parsing, bank format detection, column mapping
- `src/components/tracker/entry-form.tsx` - Manual transaction entry (Sheet)
- `src/components/tracker/csv-import.tsx` - CSV import wizard (Dialog)
- `src/components/tracker/summary-cards.tsx` - P&L summary KPI cards

## Files to Modify

- `src/app/(dashboard)/tracker/page.tsx` - Full rebuild

## Contracts

### Provides (for downstream)

- `parseCSV()` and `detectFormat()` from csv-parser (reusable for other imports)
- Tracker page accessible at `/tracker` route
- CSV export functionality

### Consumes (from upstream)

- `trackerRepo` from Task 1.4 (create, getAll, getByType, getByDateRange, getRunningTotal, getMonthlyTotals, update, remove)
- `<PageHeader>`, `<PageTransition>`, `<StatusBadge>`, `<ProfitDisplay>`, `<KpiCard>`, `<EmptyState>` from Task 2.1
- shadcn: Card, Input, Button, Select, Sheet, Dialog, Badge, Separator

## Acceptance Criteria

- [ ] Manual entry form creates tracker entries in SQLite
- [ ] Entry types: purchase, sale, cancel, refund - each renders with correct StatusBadge color
- [ ] Amount displays as green for income (sale, refund), red for expense (purchase)
- [ ] Summary cards show correct totals (income, expenses, net P&L)
- [ ] CSV import auto-detects Chase, Capital One, Citi, Amex formats
- [ ] CSV import falls back to manual column mapping for unknown formats
- [ ] CSV import shows preview before committing
- [ ] CSV import allows selecting which transactions to import
- [ ] CSV export generates valid CSV of all transactions
- [ ] Filter bar filters by type, category, date range, search text
- [ ] Transaction table shows all entries with correct formatting
- [ ] Edit and delete work for individual entries
- [ ] No localStorage usage remains
- [ ] Empty state shown when no transactions exist
- [ ] Page wraps in PageTransition

## Testing Protocol

### Unit/Integration Tests

- Test CSV parser with sample data for each bank format (Chase, Capital One, Citi, Amex)
- Test format auto-detection with known headers
- Test manual column mapping
- Test transaction CRUD through trackerRepo
- Test summary calculations (total income, expenses, net)
- Test date range filtering

### Browser Testing (Playwright MCP)

- Navigate to tracker page
- Verify empty state shows
- Add a manual transaction (purchase $110)
- Add another (sale $250)
- Verify summary cards update (income $250, expense $110, net $140)
- Import a test CSV file
- Verify imported transactions appear
- Filter by type "sale"
- Export CSV and verify contents
- Take screenshots of empty state, populated state, CSV import wizard

### Build/Lint/Type Checks

- `npx tsc --noEmit`
- `npm run build`

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md`
- `.claude/skills/bottingos-data-model/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/DISCOVERY.md` (D25 - CSV import approach)

## Git

- Branch: feat/2.3-tracker-rebuild
- Commit message prefix: Task 2.3:
