"use client";

import { cn } from "@/lib/utils";

const TOOLS = ["Cybersole", "Valor", "NSB", "Wrath", "Kodai", "AYCD", "Other"];

interface StepToolsProps {
  selected: string[];
  onChange: (tools: string[]) => void;
}

export function StepTools({ selected, onChange }: StepToolsProps) {
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
        What tools do you use?
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-md text-center">
        Select your bots and tools. We will set up webhook templates for them.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-lg">
        {TOOLS.map((tool) => {
          const isSelected = selected.includes(tool);
          return (
            <button
              key={tool}
              onClick={() => toggle(tool)}
              className={cn(
                "rounded-lg border px-4 py-3 text-sm font-medium transition-colors duration-150",
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card/50 text-muted-foreground hover:border-border hover:text-foreground/80",
              )}
            >
              {tool}
            </button>
          );
        })}
      </div>
    </div>
  );
}
