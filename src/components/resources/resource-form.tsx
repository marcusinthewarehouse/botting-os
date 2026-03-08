"use client";

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const CATEGORIES = [
  "Getting Started",
  "Bots",
  "Proxies",
  "Cook Groups",
  "Marketplaces",
  "Tools",
  "Education",
  "Other",
] as const;

interface ResourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    url: string;
    description?: string;
    category: string;
  }) => void;
  initialValues?: {
    name?: string;
    url?: string;
    description?: string;
    category?: string;
  };
  isEditing?: boolean;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function ResourceForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  isEditing,
}: ResourceFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [category, setCategory] = useState(
    initialValues?.category ?? CATEGORIES[0],
  );
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setUrl(initialValues?.url ?? "");
      setDescription(initialValues?.description ?? "");
      setCategory(initialValues?.category ?? CATEGORIES[0]);
      setUrlError("");
    }
  }, [open, initialValues]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !url.trim()) return;

      const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
      if (!isValidUrl(normalizedUrl)) {
        setUrlError("Please enter a valid URL");
        return;
      }

      onSubmit({
        name: name.trim(),
        url: normalizedUrl.trim(),
        description: description.trim() || undefined,
        category,
      });
      onOpenChange(false);
    },
    [name, url, description, category, onSubmit, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Link" : "Add Link"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this resource link."
              : "Add a custom link to your resource hub."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Name</Label>
            <Input
              placeholder="Resource name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">URL</Label>
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError("");
              }}
              className="bg-card border-border"
              required
            />
            {urlError && <p className="text-xs text-red-400">{urlError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Description (optional)
            </Label>
            <textarea
              placeholder="Brief description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-card p-3 text-sm text-foreground/80 placeholder:text-muted-foreground resize-y outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground/80 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {isEditing ? "Save Changes" : "Add Link"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
