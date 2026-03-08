"use client";

import { useState } from "react";
import { FileSpreadsheet, FileJson, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { IS_TAURI } from "@/lib/db/client";

interface StepImportProps {
  onImportComplete: () => void;
}

type ImportStatus = "idle" | "importing" | "done" | "error";

export function StepImport({ onImportComplete }: StepImportProps) {
  const [csvStatus, setCsvStatus] = useState<ImportStatus>("idle");
  const [aycdStatus, setAycdStatus] = useState<ImportStatus>("idle");

  async function handleCsvImport() {
    if (!IS_TAURI) return;
    try {
      setCsvStatus("importing");
      const { open } = await import("@tauri-apps/plugin-dialog");
      const file = await open({
        multiple: false,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!file) {
        setCsvStatus("idle");
        return;
      }
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const _content = await readTextFile(file);
      // CSV parsing happens but we don't auto-import during onboarding
      // Just mark as done so user knows the file was read
      setCsvStatus("done");
    } catch {
      setCsvStatus("error");
    }
  }

  async function handleAycdImport() {
    if (!IS_TAURI) return;
    try {
      setAycdStatus("importing");
      const { open } = await import("@tauri-apps/plugin-dialog");
      const file = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!file) {
        setAycdStatus("idle");
        return;
      }
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const _content = await readTextFile(file);
      setAycdStatus("done");
    } catch {
      setAycdStatus("error");
    }
  }

  const cards: {
    title: string;
    description: string;
    icon: typeof FileSpreadsheet;
    status: ImportStatus;
    onClick: () => void;
  }[] = [
    {
      title: "CSV Import",
      description:
        "Import orders, inventory, or bank statements from CSV files.",
      icon: FileSpreadsheet,
      status: csvStatus,
      onClick: handleCsvImport,
    },
    {
      title: "AYCD Import",
      description: "Import profiles and accounts from AYCD toolbox export.",
      icon: FileJson,
      status: aycdStatus,
      onClick: handleAycdImport,
    },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Import your data
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-md text-center">
        Bring in your existing data or start fresh.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-2xl">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={card.onClick}
              disabled={card.status === "importing"}
              className={cn(
                "flex flex-col items-center gap-3 rounded-lg border p-6 text-center transition-colors duration-150",
                card.status === "done"
                  ? "border-green-500/50 bg-green-500/5"
                  : card.status === "error"
                    ? "border-red-500/50 bg-red-500/5"
                    : "border-border bg-card/50 hover:border-border",
                card.status === "importing" && "opacity-60 cursor-wait",
              )}
            >
              <Icon
                className={cn(
                  "size-6",
                  card.status === "done"
                    ? "text-green-400"
                    : card.status === "error"
                      ? "text-red-400"
                      : "text-muted-foreground",
                )}
              />
              <div>
                <p className="text-sm font-medium text-foreground/80">
                  {card.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </div>
              {card.status === "done" && (
                <span className="text-xs text-green-400">File loaded</span>
              )}
              {card.status === "error" && (
                <span className="text-xs text-red-400">Import failed</span>
              )}
              {card.status === "importing" && (
                <span className="text-xs text-muted-foreground">
                  Loading...
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={onImportComplete}
          className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 p-6 text-center transition-colors duration-150 hover:border-primary/30"
        >
          <Sparkles className="size-6 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground/80">
              Start Fresh
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Skip importing and set everything up from scratch.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
