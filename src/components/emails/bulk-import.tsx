"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Step = "input" | "review" | "done";
type InputMethod = "paste" | "file";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface BulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingAddresses: Set<string>;
  onImport: (
    emails: { address: string; icloudAccount: string | null }[],
  ) => void;
}

export function BulkImport({
  open,
  onOpenChange,
  existingAddresses,
  onImport,
}: BulkImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("input");
  const [method, setMethod] = useState<InputMethod>("paste");
  const [pasteText, setPasteText] = useState("");
  const [icloudAccount, setIcloudAccount] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  const reset = useCallback(() => {
    setStep("input");
    setPasteText("");
    setIcloudAccount("");
    setParsed([]);
    setDuplicates([]);
    setImportedCount(0);
  }, []);

  const handleClose = useCallback(
    (val: boolean) => {
      if (!val) reset();
      onOpenChange(val);
    },
    [onOpenChange, reset],
  );

  const parseEmails = useCallback(
    (text: string) => {
      const lines = text
        .split(/[\n,;]+/)
        .map((l) => l.trim().toLowerCase())
        .filter((l) => EMAIL_REGEX.test(l));

      const unique = [...new Set(lines)];
      const dupes = unique.filter((e) => existingAddresses.has(e));
      const fresh = unique.filter((e) => !existingAddresses.has(e));

      setParsed(fresh);
      setDuplicates(dupes);
      setStep("review");
    },
    [existingAddresses],
  );

  const handlePasteSubmit = useCallback(() => {
    parseEmails(pasteText);
  }, [pasteText, parseEmails]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      file.text().then((text) => {
        // Try JSON first (AYCD format)
        try {
          const json = JSON.parse(text);
          const emails: string[] = [];
          if (Array.isArray(json)) {
            for (const item of json) {
              if (typeof item === "string") emails.push(item);
              else if (item.email) emails.push(item.email);
              else if (item.address) emails.push(item.address);
            }
          }
          if (emails.length > 0) {
            parseEmails(emails.join("\n"));
            return;
          }
        } catch {
          // Not JSON, try CSV
        }
        // CSV/text fallback - extract emails from any column
        parseEmails(text);
      });
    },
    [parseEmails],
  );

  const handleConfirmImport = useCallback(() => {
    const icloud = icloudAccount.trim() || null;
    onImport(parsed.map((address) => ({ address, icloudAccount: icloud })));
    setImportedCount(parsed.length);
    setStep("done");
  }, [parsed, icloudAccount, onImport]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Emails</DialogTitle>
          <DialogDescription>
            {step === "input" &&
              "Paste email addresses or upload an AYCD export file."}
            {step === "review" && `${parsed.length} emails ready to import.`}
            {step === "done" && `${importedCount} emails imported.`}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div className="flex rounded-md border border-border bg-card p-0.5 mb-4">
              <button
                onClick={() => setMethod("paste")}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150",
                  method === "paste"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                Paste Emails
              </button>
              <button
                onClick={() => setMethod("file")}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150",
                  method === "file"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                Import File (AYCD)
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                iCloud Account (optional)
              </Label>
              <Input
                placeholder="user@icloud.com"
                value={icloudAccount}
                onChange={(e) => setIcloudAccount(e.target.value)}
                className="bg-card border-border"
              />
            </div>

            {method === "paste" && (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    Email Addresses
                  </Label>
                  <textarea
                    placeholder="Paste email addresses, one per line..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={10}
                    className="w-full rounded-md border border-border bg-card p-3 text-sm text-foreground/80 placeholder:text-muted-foreground resize-y outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <Button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                >
                  Parse Emails
                </Button>
              </>
            )}

            {method === "file" && (
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-10 px-4 hover:border-primary/30 transition-colors duration-150 cursor-pointer"
              >
                <Upload className="size-6 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to select CSV or JSON file
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports AYCD Toolbox exports
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-card p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valid emails</span>
                <span className="text-foreground/80 font-mono">
                  {parsed.length}
                </span>
              </div>
              {duplicates.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Duplicates (skipped)
                  </span>
                  <span className="text-primary font-mono">
                    {duplicates.length}
                  </span>
                </div>
              )}
              {icloudAccount.trim() && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">iCloud Account</span>
                  <span className="text-foreground/80">
                    {icloudAccount.trim()}
                  </span>
                </div>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-card">
              {parsed.slice(0, 50).map((email, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border/50 last:border-0"
                >
                  {email}
                </div>
              ))}
              {parsed.length > 50 && (
                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                  ...and {parsed.length - 50} more
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("input")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={parsed.length === 0}
                className="flex-1"
              >
                Import {parsed.length} Emails
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-8">
            <div className="flex items-center justify-center size-12 rounded-full bg-green-500/15 mb-4">
              <Check className="size-6 text-green-400" />
            </div>
            <p className="text-sm text-foreground/80 mb-1">
              {importedCount} emails imported
            </p>
            {duplicates.length > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                {duplicates.length} duplicates skipped
              </p>
            )}
            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
