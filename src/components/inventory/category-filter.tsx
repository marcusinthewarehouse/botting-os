"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/fees";

interface CategorySummary {
  category: string;
  count: number;
  totalValue: number;
}

interface CategoryFilterProps {
  categories: CategorySummary[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  sneakers: "Sneakers",
  pokemon: "Pokemon",
  funko: "Funko Pops",
  supreme: "Supreme",
  other: "Other",
};

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  const total = categories.reduce((s, c) => s + c.count, 0);
  const totalValue = categories.reduce((s, c) => s + c.totalValue, 0);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 rounded-lg border px-4 py-2 text-left transition-colors duration-150",
          selected === null
            ? "border-primary/30 bg-primary/10"
            : "border-border hover:border-border",
        )}
      >
        <div className="text-xs text-muted-foreground">All Items</div>
        <div className="text-sm font-semibold text-foreground">{total}</div>
        <div className="text-xs font-mono tabular-nums text-muted-foreground">
          {formatCurrency(totalValue)}
        </div>
      </button>

      {categories.map((cat) => (
        <button
          key={cat.category}
          onClick={() =>
            onSelect(selected === cat.category ? null : cat.category)
          }
          className={cn(
            "shrink-0 rounded-lg border px-4 py-2 text-left transition-colors duration-150",
            selected === cat.category
              ? "border-primary/30 bg-primary/10"
              : "border-border hover:border-border",
          )}
        >
          <div className="text-xs text-muted-foreground">
            {CATEGORY_LABELS[cat.category] ?? cat.category}
          </div>
          <div className="text-sm font-semibold text-foreground">
            {cat.count}
          </div>
          <div className="text-xs font-mono tabular-nums text-muted-foreground">
            {formatCurrency(cat.totalValue)}
          </div>
        </button>
      ))}
    </div>
  );
}
