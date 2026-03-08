"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  parseCSV,
  detectFormat,
  parseTransactions,
  formatBankName,
  type ParsedTransaction,
  type BankFormat,
  type ColumnMapping,
} from "@/lib/csv-parser";

type Step = "upload" | "preview" | "select" | "done";

const CATEGORIES = [
  "sneakers",
  "pokemon",
  "funko",
  "electronics",
  "shipping",
  "fees",
  "other",
] as const;

interface CsvImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    transactions: {
      description: string;
      amount: number;
      date: Date;
      category: string;
    }[],
  ) => void;
}

export function CsvImport({ open, onOpenChange, onImport }: CsvImportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [format, setFormat] = useState<BankFormat>("unknown");
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<Record<number, string>>({});
  const [importCount, setImportCount] = useState(0);

  // Manual mapping state
  const [dateCol, setDateCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [amountCol, setAmountCol] = useState("");

  const reset = useCallback(() => {
    setStep("upload");
    setCsvText("");
    setHeaders([]);
    setFormat("unknown");
    setTransactions([]);
    setSelected(new Set());
    setCategories({});
    setImportCount(0);
    setDateCol("");
    setDescCol("");
    setAmountCol("");
  }, []);

  const handleClose = useCallback(
    (val: boolean) => {
      if (!val) reset();
      onOpenChange(val);
    },
    [onOpenChange, reset],
  );

  const handleFile = useCallback((text: string) => {
    setCsvText(text);
    const { headers: h } = parseCSV(text);
    setHeaders(h);
    const detected = detectFormat(h);
    setFormat(detected);

    if (detected !== "unknown") {
      const parsed = parseTransactions(text, detected);
      setTransactions(parsed);
      const all = new Set(parsed.map((_, i) => i));
      setSelected(all);
      setStep("select");
    } else {
      if (h.length > 0) {
        setDateCol(h[0]);
        setDescCol(h.length > 1 ? h[1] : h[0]);
        setAmountCol(h.length > 2 ? h[2] : h[0]);
      }
      setStep("preview");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        file.text().then(handleFile);
      }
    },
    [handleFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        file.text().then(handleFile);
      }
    },
    [handleFile],
  );

  const handleApplyMapping = useCallback(() => {
    const mapping: ColumnMapping = {
      date: dateCol,
      description: descCol,
      amount: amountCol,
    };
    const parsed = parseTransactions(csvText, "unknown", mapping);
    setTransactions(parsed);
    const all = new Set(parsed.map((_, i) => i));
    setSelected(all);
    setStep("select");
  }, [csvText, dateCol, descCol, amountCol]);

  const toggleSelect = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((_, i) => i)));
    }
  }, [selected.size, transactions.length]);

  const handleImport = useCallback(() => {
    const toImport = transactions
      .filter((_, i) => selected.has(i))
      .map((t, i) => ({
        description: t.description,
        amount: Math.abs(t.amount),
        date: t.date,
        category: categories[i] ?? "other",
      }));
    onImport(toImport);
    setImportCount(toImport.length);
    setStep("done");
  }, [transactions, selected, categories, onImport]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a bank statement CSV file."}
            {step === "preview" && "Map columns from your CSV file."}
            {step === "select" &&
              `${formatBankName(format)} format detected. Select transactions to import.`}
            {step === "done" && `${importCount} transactions imported.`}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-12 px-4 hover:border-primary/30 transition-colors duration-150 cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Drag and drop a CSV file, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports Chase, Capital One, Citi, Amex formats
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Unknown CSV format. Map your columns:
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Date Column
                </Label>
                <select
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Description Column
                </Label>
                <select
                  value={descCol}
                  onChange={(e) => setDescCol(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Amount Column
                </Label>
                <select
                  value={amountCol}
                  onChange={(e) => setAmountCol(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleApplyMapping}>Apply Mapping</Button>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selected.size} of {transactions.length} selected
              </span>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selected.size === transactions.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t, i) => (
                    <TableRow
                      key={i}
                      className={selected.has(i) ? "" : "opacity-40"}
                      onClick={() => toggleSelect(i)}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(i)}
                          onChange={() => toggleSelect(i)}
                          className="accent-primary"
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {t.date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/80 max-w-48 truncate">
                        {t.description}
                      </TableCell>
                      <TableCell className="text-sm font-mono tabular-nums">
                        <span
                          className={
                            t.amount >= 0 ? "text-red-400" : "text-green-400"
                          }
                        >
                          {t.amount >= 0 ? "-" : "+"}$
                          {Math.abs(t.amount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <select
                          value={categories[i] ?? "other"}
                          onChange={(e) => {
                            e.stopPropagation();
                            setCategories((prev) => ({
                              ...prev,
                              [i]: e.target.value,
                            }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 rounded border border-border bg-card px-2 text-xs text-muted-foreground"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleImport} disabled={selected.size === 0}>
              Import {selected.size} Transactions
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-8">
            <div className="flex items-center justify-center size-12 rounded-full bg-green-500/15 mb-4">
              <Check className="size-6 text-green-400" />
            </div>
            <p className="text-sm text-foreground/80 mb-1">
              {importCount} transactions imported
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              They have been added to your tracker.
            </p>
            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
