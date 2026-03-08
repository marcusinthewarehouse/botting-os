"use client";

import { useCallback, useState } from "react";
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
import type { Email } from "@/lib/db/types";

const PROVIDERS = [
  "Privacy.com",
  "Capital One",
  "Citi",
  "Apple Pay",
  "Other",
] as const;
const STATUSES = ["active", "used", "closed", "flagged"] as const;

interface VccFormData {
  provider: string;
  lastFour: string;
  label: string;
  linkedAccountId: number | null;
  status: string;
}

interface VccFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VccFormData) => void;
  emails: Email[];
  initialValues?: Partial<VccFormData>;
  isEditing?: boolean;
}

export function VccForm({
  open,
  onOpenChange,
  onSubmit,
  emails,
  initialValues,
  isEditing,
}: VccFormProps) {
  const [provider, setProvider] = useState(
    initialValues?.provider ?? "Privacy.com",
  );
  const [lastFour, setLastFour] = useState(initialValues?.lastFour ?? "");
  const [label, setLabel] = useState(initialValues?.label ?? "");
  const [linkedAccountId, setLinkedAccountId] = useState<number | null>(
    initialValues?.linkedAccountId ?? null,
  );
  const [status, setStatus] = useState(initialValues?.status ?? "active");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!lastFour.trim() || lastFour.length !== 4) return;
      onSubmit({
        provider,
        lastFour: lastFour.trim(),
        label: label.trim(),
        linkedAccountId,
        status,
      });
      if (!isEditing) {
        setProvider("Privacy.com");
        setLastFour("");
        setLabel("");
        setLinkedAccountId(null);
        setStatus("active");
      }
      onOpenChange(false);
    },
    [
      provider,
      lastFour,
      label,
      linkedAccountId,
      status,
      onSubmit,
      onOpenChange,
      isEditing,
    ],
  );

  const handleLastFourChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
      setLastFour(val);
    },
    [],
  );

  const selectClass =
    "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit VCC" : "Add VCC"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this virtual credit card."
              : "Track a new virtual credit card."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Provider</Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className={selectClass}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Last 4 Digits
            </Label>
            <Input
              placeholder="1234"
              value={lastFour}
              onChange={handleLastFourChange}
              className="bg-card border-border font-mono"
              maxLength={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Label</Label>
            <Input
              placeholder="Nike card #2"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-card border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Linked Account
            </Label>
            <select
              value={linkedAccountId ?? ""}
              onChange={(e) =>
                setLinkedAccountId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className={selectClass}
            >
              <option value="">None</option>
              {emails.map((email) => (
                <option key={email.id} value={email.id}>
                  {email.address}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
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
            <Button
              type="submit"
              className="flex-1"
              disabled={lastFour.length !== 4}
            >
              {isEditing ? "Save Changes" : "Add VCC"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
