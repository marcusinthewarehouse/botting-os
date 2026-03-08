"use client";

import { useCallback, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
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
import { generatePassword } from "@/lib/password-generator";

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    site: string;
    username: string;
    password: string;
    notes?: string;
  }) => void;
  initialValues?: {
    site?: string;
    username?: string;
    password?: string;
    notes?: string;
  };
  isEditing?: boolean;
}

export function EntryForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  isEditing,
}: EntryFormProps) {
  const [site, setSite] = useState(initialValues?.site ?? "");
  const [username, setUsername] = useState(initialValues?.username ?? "");
  const [password, setPassword] = useState(initialValues?.password ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!site.trim() || !username.trim() || !password.trim()) return;
      onSubmit({
        site: site.trim(),
        username: username.trim(),
        password,
        notes: notes.trim() || undefined,
      });
      if (!isEditing) {
        setSite("");
        setUsername("");
        setPassword("");
        setNotes("");
      }
      onOpenChange(false);
    },
    [site, username, password, notes, onSubmit, onOpenChange, isEditing],
  );

  const handleGenerate = useCallback(() => {
    setPassword(generatePassword(16));
    setShowPassword(true);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Entry" : "Add Entry"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this vault entry."
              : "Save a new credential to the vault."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Site</Label>
            <Input
              placeholder="nike.com"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="bg-card border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Username</Label>
            <Input
              placeholder="user@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-card border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-card border-border pr-9 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerate}
                title="Generate password"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Notes (optional)
            </Label>
            <textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-card p-3 text-sm text-foreground/80 placeholder:text-muted-foreground resize-y outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            />
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
              {isEditing ? "Save Changes" : "Add Entry"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
