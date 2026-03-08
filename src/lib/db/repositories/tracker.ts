import { db } from "../client";
import { trackerEntries } from "../schema";
import { eq, desc, and, gte, lte, sum, sql } from "drizzle-orm";
import type { TrackerEntry, NewTrackerEntry } from "../types";

export async function getAll(): Promise<TrackerEntry[]> {
  return db
    .select()
    .from(trackerEntries)
    .orderBy(desc(trackerEntries.createdAt));
}

export async function getById(id: number): Promise<TrackerEntry | undefined> {
  const rows = await db
    .select()
    .from(trackerEntries)
    .where(eq(trackerEntries.id, id));
  return rows[0];
}

export async function create(
  data: Omit<NewTrackerEntry, "id" | "createdAt">,
): Promise<void> {
  const now = new Date();
  await db.insert(trackerEntries).values({ ...data, createdAt: now });
}

export async function update(
  id: number,
  data: Partial<Omit<NewTrackerEntry, "id" | "createdAt">>,
): Promise<void> {
  await db.update(trackerEntries).set(data).where(eq(trackerEntries.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(trackerEntries).where(eq(trackerEntries.id, id));
}

export async function getByType(type: string): Promise<TrackerEntry[]> {
  return db
    .select()
    .from(trackerEntries)
    .where(eq(trackerEntries.type, type))
    .orderBy(desc(trackerEntries.createdAt));
}

export async function getByDateRange(
  start: Date,
  end: Date,
): Promise<TrackerEntry[]> {
  return db
    .select()
    .from(trackerEntries)
    .where(and(gte(trackerEntries.date, start), lte(trackerEntries.date, end)))
    .orderBy(desc(trackerEntries.date));
}

export async function getByCategory(category: string): Promise<TrackerEntry[]> {
  return db
    .select()
    .from(trackerEntries)
    .where(eq(trackerEntries.category, category))
    .orderBy(desc(trackerEntries.createdAt));
}

export async function getRunningTotal(): Promise<number> {
  const result = await db
    .select({ total: sum(trackerEntries.amount) })
    .from(trackerEntries);
  return Number(result[0]?.total ?? 0);
}

export async function getMonthlyTotals(): Promise<
  { month: string; total: number }[]
> {
  const rows = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${trackerEntries.date} / 1000, 'unixepoch')`,
      total: sum(trackerEntries.amount),
    })
    .from(trackerEntries)
    .groupBy(sql`strftime('%Y-%m', ${trackerEntries.date} / 1000, 'unixepoch')`)
    .orderBy(
      sql`strftime('%Y-%m', ${trackerEntries.date} / 1000, 'unixepoch')`,
    );
  return rows.map((r) => ({ month: r.month, total: Number(r.total ?? 0) }));
}
