"use client";

import {
  Footprints,
  Star,
  Gift,
  Crown,
  Layers,
  Monitor,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const CATEGORIES: { label: string; value: string; icon: LucideIcon }[] = [
  { label: "Sneakers", value: "sneakers", icon: Footprints },
  { label: "Pokemon", value: "pokemon", icon: Star },
  { label: "Funko Pops", value: "funko", icon: Gift },
  { label: "Supreme", value: "supreme", icon: Crown },
  { label: "Trading Cards", value: "trading_cards", icon: Layers },
  { label: "Electronics", value: "electronics", icon: Monitor },
  { label: "Other", value: "other", icon: Plus },
];

interface StepCategoriesProps {
  selected: string[];
  onChange: (categories: string[]) => void;
}

export function StepCategories({ selected, onChange }: StepCategoriesProps) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        What do you bot?
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-md text-center">
        Select your product categories. This helps us customize your experience.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-lg">
        {CATEGORIES.map(({ label, value, icon: Icon }) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggle(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors duration-150",
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card/50 text-muted-foreground hover:border-border hover:text-foreground/80",
              )}
            >
              <Icon className={cn("size-5", isSelected && "text-primary")} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
