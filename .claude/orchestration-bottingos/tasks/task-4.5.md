# Task 4.5: Inventory Manager

## Objective

Build the Inventory page with auto-populate from successful orders, manual item entry, category management, aging flags, status tracking, and "mark as sold" flow that creates profit entries. This is the central hub for tracking what the user owns and its current value.

## Context

The inventory system bridges orders (Phase 4) and profit tracking. When a successful checkout comes through webhooks, it can auto-populate into inventory. Users can also manually add items (for non-bot purchases). Items flow through statuses: In Stock -> Listed -> Sold -> (Returned).

Categories matter because BottingOS isn't just sneakers - it covers Pokemon cards, Funko Pops, Supreme, and more (from the PRD). The aging system highlights items sitting too long (amber > 30 days, red > 60 days) to encourage selling before value drops.

The existing `inventory` and `sales` tables from Phase 1 schema are used. The existing `orders` table from webhook data feeds in.

## Dependencies

- Task 4.4 (Order Tracker) - orders data that feeds into inventory
- Phase 1 data layer (schema.ts with inventory, sales, orders tables)
- Phase 2 UI framework (shadcn components, sidebar)

## Blocked By

- Task 4.4 must be substantially complete (need order data to auto-populate)

## Research Findings

From `bottingos-data-model` skill:

**inventory table:**

```typescript
export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").references(() => orders.id),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(), // sneakers, pokemon, funko
  purchasePrice: real("purchase_price").notNull(),
  currentValue: real("current_value"),
  status: text("status").default("in_stock"), // in_stock, listed, sold, returned
  listedMarketplace: text("listed_marketplace"),
  condition: text("condition").default("new"),
  location: text("location"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

**sales table:**

```typescript
export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inventoryId: integer("inventory_id")
    .references(() => inventory.id)
    .notNull(),
  salePrice: real("sale_price").notNull(),
  marketplace: text("marketplace").notNull(),
  fees: real("fees").default(0),
  profit: real("profit").notNull(),
  soldAt: integer("sold_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

From `shadcn-patterns` skill:

- TanStack Table with columns: Name, SKU, Purchase Price, Current Value, Profit, Status, Days Held
- Filter bar: search, status dropdown, category dropdown, clear all
- Status badges: In Stock=green, Listed=amber, Sold=blue, Returned=red
- Aging: amber highlight > 30 days, red > 60 days
- Empty state pattern

## Implementation Plan

### Step 1: Create inventory repository

```typescript
// src/lib/db/repositories/inventory.ts
export const inventoryRepo = {
  async getAll(): Promise<InventoryItem[]>,
  async getByStatus(status: string): Promise<InventoryItem[]>,
  async getByCategory(category: string): Promise<InventoryItem[]>,
  async create(item: NewInventoryItem): Promise<InventoryItem>,
  async update(id: number, data: Partial<InventoryItem>): Promise<void>,
  async markAsSold(id: number, saleData: SaleData): Promise<void>,
  async delete(id: number): Promise<void>,
  async getCategoryCounts(): Promise<Record<string, number>>,
  async getAgingItems(daysThreshold: number): Promise<InventoryItem[]>,
  async createFromOrder(orderId: number): Promise<InventoryItem>,
}
```

### Step 2: Create sales repository

```typescript
// src/lib/db/repositories/sales.ts (if not already existing)
export const salesRepo = {
  async create(sale: NewSale): Promise<Sale>,
  async getByInventoryId(inventoryId: number): Promise<Sale[]>,
  async getAll(): Promise<Sale[]>,
  async getTotalProfit(): Promise<number>,
}
```

### Step 3: Build auto-populate hook

```typescript
// src/hooks/use-auto-inventory.ts
export function useAutoInventory() {
  // Listen for new successful checkout events (from useCheckoutFeed)
  // When success=true, prompt user: "Add to inventory?"
  // Or auto-add with a setting toggle
  // Creates inventory item linked to the order
}
```

### Step 4: Build InventoryTable component

```typescript
// src/components/inventory/inventory-table.tsx
```

TanStack Table columns:
| Column | Type | Notes |
|--------|------|-------|
| Name | text | item_name, with thumbnail if available |
| Category | badge | sneakers, pokemon, funko, supreme, other |
| Purchase Price | currency | font-mono, formatted |
| Current Value | currency | from pricing API or manual, font-mono |
| Profit/Loss | currency | currentValue - purchasePrice, colored |
| Status | badge | in_stock, listed, sold, returned |
| Days Held | number | calculated from createdAt, colored by age |
| Actions | dropdown | Edit, Mark as Sold, Mark as Listed, Delete |

Features:

- Sort by all columns
- Row aging colors: normal < 30d, amber 30-60d, red > 60d
- Bulk select + bulk actions (export, delete, mark as listed)
- Row click opens detail panel / edit dialog
- Virtual scrolling for large inventories

### Step 5: Build AddItemForm component

```typescript
// src/components/inventory/add-item-form.tsx
```

Sheet/Dialog for manual item entry:

- Product name (required)
- Category dropdown: Sneakers, Pokemon, Funko Pops, Supreme, Other
- Purchase price (required)
- SKU / Style code
- Size
- Condition: New, Used, Open Box
- Location: Closet, Warehouse, Shipped
- Image URL
- Notes
- Save button

### Step 6: Build CategoryFilter component

```typescript
// src/components/inventory/category-filter.tsx
```

Category summary cards at top of page:

- One card per category with count and total value
- Click to filter table by category
- "All" option to clear filter
- Categories: Sneakers, Pokemon, Funko Pops, Supreme, Other

### Step 7: Build MarkAsSold dialog

When user clicks "Mark as Sold" on an inventory item:

- Pre-fill item name and purchase price
- Sale price input (required)
- Marketplace dropdown (eBay, StockX, GOAT, Other)
- Fees input (can auto-calculate using Task 3.2 fee engine if available)
- Profit auto-calculated: sale price - fees - purchase price
- Date sold
- Creates a `sales` record and updates inventory status to "sold"

### Step 8: Build the Inventory page

```typescript
// src/app/(dashboard)/inventory/page.tsx
```

Layout:

```
[Page title: Inventory]
[Category summary cards row]
---
[Filter bar: search | category dropdown | status dropdown | condition | clear all]
[Add Item button]
---
[InventoryTable]
[Empty state: "No items in inventory. Add items manually or checkouts will auto-populate."]
```

### Step 9: Enable Inventory sidebar item

Update sidebar to un-gray the Inventory link.

### Step 10: Wire auto-populate from orders

When a new successful checkout event arrives (from Task 4.4 Realtime subscription):

- Option A: Toast with "Add to Inventory?" action button
- Option B: Setting to auto-add all successful checkouts
- Either way, creates inventory item with orderId link

## Files to Create

- `src/app/(dashboard)/inventory/page.tsx` - Inventory page
- `src/components/inventory/inventory-table.tsx` - TanStack Table
- `src/components/inventory/add-item-form.tsx` - Manual add form
- `src/components/inventory/category-filter.tsx` - Category summary cards
- `src/lib/db/repositories/inventory.ts` - inventory CRUD
- `src/lib/db/repositories/sales.ts` - sales CRUD (if not existing)
- `src/hooks/use-auto-inventory.ts` - auto-populate from orders

## Files to Modify

- Sidebar component - enable Inventory link
- `src/app/(dashboard)/orders/page.tsx` or order hook - add "Add to Inventory" action on order rows
- Dashboard page - potentially show inventory KPI (total items, total value)

## Contracts

### Provides

```typescript
// Repositories
inventoryRepo.getAll(): Promise<InventoryItem[]>
inventoryRepo.create(item): Promise<InventoryItem>
inventoryRepo.markAsSold(id, saleData): Promise<void>
inventoryRepo.createFromOrder(orderId): Promise<InventoryItem>
salesRepo.create(sale): Promise<Sale>

// Components
<InventoryTable items={InventoryItem[]} />
<AddItemForm onSave={...} />
<CategoryFilter categories={...} onFilter={...} />

// Hooks
useAutoInventory(): manages auto-add from checkout events

// Page
/inventory route - fully functional inventory manager
```

### Consumes

- Task 4.4: CheckoutEvent data and useCheckoutFeed hook
- Task 3.2: calculateFees (optional, for auto-calculating fees in Mark as Sold)
- Phase 1: inventory and sales tables from schema.ts
- Phase 1: Drizzle ORM db instance
- shadcn components: Table, Card, Input, Button, Badge, Sheet, Dialog, Select, Skeleton, DropdownMenu
- TanStack Table
- Sonner (toast for auto-populate prompt)

## Acceptance Criteria

1. Inventory page loads at `/inventory` route
2. All inventory items display in table with correct columns
3. Add item form creates new inventory entry in SQLite
4. Category filter shows counts per category
5. Clicking category filters table
6. Status badges display correctly (green/amber/blue/red)
7. Days held calculated correctly from createdAt
8. Aging colors: normal < 30d, amber highlight 30-60d, red > 60d
9. "Mark as Sold" creates sales record and updates inventory status
10. Profit calculated correctly in Mark as Sold dialog
11. Auto-populate from successful checkout events works (toast or auto)
12. Manual item entry works for non-bot purchases
13. Bulk select and delete works
14. Search filters across item name, category, SKU
15. Sort by all columns
16. Empty state shown when no items
17. Inventory sidebar link is active
18. Responsive layout stacks on mobile

## Testing Protocol

### Unit Tests

- inventoryRepo CRUD: create, read, update, delete, markAsSold
- salesRepo: create sale, verify profit calculation
- Aging calculation: items at 0, 29, 30, 31, 59, 60, 61 days

### Browser/Playwright

- Navigate to /inventory - page loads
- Add manual item - verify it appears in table
- Filter by category - verify table updates
- Mark item as sold - verify status changes, sale record created
- Send webhook checkout - verify auto-populate prompt/action
- Verify aging colors on old items
- Sort by purchase price - verify order

### Build Checks

- `npm run build` succeeds
- `npx tsc --noEmit` passes
- No console errors

## Skills to Read

- `.claude/skills/shadcn-patterns/SKILL.md` - TanStack Table config, filter bar, status badges, empty states
- `.claude/skills/bottingos-data-model/SKILL.md` - inventory and sales table schema, relationships

## Research Files to Read

- `.claude/orchestration-bottingos/research/marketplace-apis.md` - category context (sneakers, pokemon, funko)

## Git

- **Branch**: `feat/4.5-inventory-manager`
- **Commit prefix**: `[inventory]`
