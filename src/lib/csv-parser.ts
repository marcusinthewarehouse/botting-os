export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  category?: string;
  raw: Record<string, string>;
}

export type BankFormat = "chase" | "capital_one" | "citi" | "amex" | "unknown";

export interface ColumnMapping {
  date: string;
  description: string;
  amount?: string;
  debitColumn?: string;
  creditColumn?: string;
}

export function parseCSV(csvText: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = csvText
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return { headers, rows };
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function detectFormat(headers: string[]): BankFormat {
  const h = headers.map((s) => s.trim().toLowerCase());
  if (
    h.includes("transaction date") &&
    h.includes("type") &&
    h.includes("amount") &&
    h.includes("memo")
  ) {
    return "chase";
  }
  if (h.includes("card no.") && h.includes("debit") && h.includes("credit")) {
    return "capital_one";
  }
  if (h.includes("status") && h.includes("debit") && h.includes("credit")) {
    return "citi";
  }
  if (
    h.length <= 4 &&
    h.includes("date") &&
    h.includes("description") &&
    h.includes("amount")
  ) {
    return "amex";
  }
  return "unknown";
}

function findHeader(headers: string[], target: string): string | undefined {
  return headers.find((h) => h.trim().toLowerCase() === target.toLowerCase());
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseDate(value: string): Date {
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  // Try MM/DD/YYYY
  const parts = value.split("/");
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
  }
  return new Date();
}

export function parseTransactions(
  csvText: string,
  format?: BankFormat,
  columnMapping?: ColumnMapping,
): ParsedTransaction[] {
  const { headers, rows } = parseCSV(csvText);
  if (rows.length === 0) return [];

  const detectedFormat = format ?? detectFormat(headers);

  if (detectedFormat === "chase") {
    const dateCol =
      findHeader(headers, "Transaction Date") ?? "Transaction Date";
    const descCol = findHeader(headers, "Description") ?? "Description";
    const amountCol = findHeader(headers, "Amount") ?? "Amount";
    const categoryCol = findHeader(headers, "Category");

    return rows.map((row) => ({
      date: parseDate(row[dateCol] ?? ""),
      description: row[descCol] ?? "",
      amount: -parseAmount(row[amountCol] ?? "0"), // Chase: negative = charge
      category: categoryCol ? row[categoryCol] : undefined,
      raw: row,
    }));
  }

  if (detectedFormat === "capital_one") {
    const dateCol =
      findHeader(headers, "Transaction Date") ?? "Transaction Date";
    const descCol = findHeader(headers, "Description") ?? "Description";
    const debitCol = findHeader(headers, "Debit") ?? "Debit";
    const creditCol = findHeader(headers, "Credit") ?? "Credit";
    const categoryCol = findHeader(headers, "Category");

    return rows.map((row) => {
      const debit = parseAmount(row[debitCol] ?? "0");
      const credit = parseAmount(row[creditCol] ?? "0");
      return {
        date: parseDate(row[dateCol] ?? ""),
        description: row[descCol] ?? "",
        amount: debit > 0 ? debit : -credit,
        category: categoryCol ? row[categoryCol] : undefined,
        raw: row,
      };
    });
  }

  if (detectedFormat === "citi") {
    const dateCol = findHeader(headers, "Date") ?? "Date";
    const descCol = findHeader(headers, "Description") ?? "Description";
    const debitCol = findHeader(headers, "Debit") ?? "Debit";
    const creditCol = findHeader(headers, "Credit") ?? "Credit";

    return rows.map((row) => {
      const debit = parseAmount(row[debitCol] ?? "0");
      const credit = parseAmount(row[creditCol] ?? "0");
      return {
        date: parseDate(row[dateCol] ?? ""),
        description: row[descCol] ?? "",
        amount: debit > 0 ? debit : -credit,
        raw: row,
      };
    });
  }

  if (detectedFormat === "amex") {
    const dateCol = findHeader(headers, "Date") ?? "Date";
    const descCol = findHeader(headers, "Description") ?? "Description";
    const amountCol = findHeader(headers, "Amount") ?? "Amount";

    return rows.map((row) => ({
      date: parseDate(row[dateCol] ?? ""),
      description: row[descCol] ?? "",
      amount: parseAmount(row[amountCol] ?? "0"), // Amex: positive = charge
      raw: row,
    }));
  }

  // Unknown format - use column mapping
  if (columnMapping) {
    return rows.map((row) => {
      let amount = 0;
      if (columnMapping.amount) {
        amount = parseAmount(row[columnMapping.amount] ?? "0");
      } else if (columnMapping.debitColumn && columnMapping.creditColumn) {
        const debit = parseAmount(row[columnMapping.debitColumn] ?? "0");
        const credit = parseAmount(row[columnMapping.creditColumn] ?? "0");
        amount = debit > 0 ? debit : -credit;
      }
      return {
        date: parseDate(row[columnMapping.date] ?? ""),
        description: row[columnMapping.description] ?? "",
        amount,
        raw: row,
      };
    });
  }

  return [];
}

export function formatBankName(format: BankFormat): string {
  const names: Record<BankFormat, string> = {
    chase: "Chase",
    capital_one: "Capital One",
    citi: "Citi",
    amex: "American Express",
    unknown: "Unknown",
  };
  return names[format];
}
