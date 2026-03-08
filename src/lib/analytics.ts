"use client";

import { trackerRepo, inventoryRepo, ordersRepo } from "@/lib/db/repositories";
import { IS_TAURI } from "@/lib/db/client";
import type { TrackerEntry, InventoryItem, Order } from "@/lib/db/types";

export type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";

export interface AnalyticsData {
  totalProfit: number;
  totalSpend: number;
  totalRevenue: number;
  itemsSold: number;
  profitTrend: number;
  profitOverTime: { date: string; profit: number; spend: number }[];
  botPerformance: { bot: string; checkouts: number; profit: number }[];
  categoryROI: { category: string; roi: number; profit: number }[];
}

function getRangeStart(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const days =
    range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function getPreviousPeriodStart(range: TimeRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const days =
    range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  return new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);
}

function isInRange(date: Date | null, start: Date | null): boolean {
  if (!start) return true;
  if (!date) return false;
  return date >= start;
}

function formatDateKey(date: Date, range: TimeRange): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (range === "1y") return `${y}-${m}`;
  return `${y}-${m}-${d}`;
}

function formatDateLabel(key: string, range: TimeRange): string {
  if (range === "1y") {
    const [y, m] = key.split("-");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[Number(m) - 1]} ${y}`;
  }
  const parts = key.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[Number(parts[1]) - 1]} ${Number(parts[2])}`;
}

export async function getAnalytics(range: TimeRange): Promise<AnalyticsData> {
  if (!IS_TAURI) return emptyAnalytics();

  try {
    const [allTracker, allInventory, allOrders] = await Promise.all([
      trackerRepo.getAll(),
      inventoryRepo.getAll(),
      ordersRepo.getAll(),
    ]);

    const rangeStart = getRangeStart(range);
    const prevStart = getPreviousPeriodStart(range);

    const trackerInRange = allTracker.filter((e) =>
      isInRange(e.date, rangeStart),
    );
    const trackerInPrev =
      prevStart && rangeStart
        ? allTracker.filter(
            (e) => e.date && e.date >= prevStart && e.date < rangeStart,
          )
        : [];

    const inventoryInRange = allInventory.filter((e) => {
      if (e.status === "sold") return isInRange(e.soldDate, rangeStart);
      return isInRange(e.createdAt, rangeStart);
    });

    const ordersInRange = allOrders.filter((e) =>
      isInRange(e.createdAt, rangeStart),
    );

    // KPI calculations from tracker entries
    let totalSpend = 0;
    let totalSaleRevenue = 0;
    for (const entry of trackerInRange) {
      if (entry.type === "purchase") totalSpend += entry.amount;
      if (entry.type === "sale" || entry.type === "refund")
        totalSaleRevenue += entry.amount;
    }

    // Revenue from sold inventory items
    let inventoryRevenue = 0;
    let itemsSold = 0;
    const soldItems = inventoryInRange.filter((i) => i.status === "sold");
    for (const item of soldItems) {
      inventoryRevenue += item.soldPrice ?? 0;
      itemsSold++;
    }

    const totalRevenue = Math.max(totalSaleRevenue, inventoryRevenue);
    const totalProfit = totalRevenue - totalSpend;

    // Trend calculation
    let prevSpend = 0;
    let prevRevenue = 0;
    for (const entry of trackerInPrev) {
      if (entry.type === "purchase") prevSpend += entry.amount;
      if (entry.type === "sale" || entry.type === "refund")
        prevRevenue += entry.amount;
    }
    const prevProfit = prevRevenue - prevSpend;
    const profitTrend =
      prevProfit !== 0
        ? ((totalProfit - prevProfit) / Math.abs(prevProfit)) * 100
        : 0;

    // Profit over time
    const profitMap = new Map<string, { profit: number; spend: number }>();
    for (const entry of trackerInRange) {
      if (!entry.date) continue;
      const key = formatDateKey(entry.date, range);
      const existing = profitMap.get(key) ?? { profit: 0, spend: 0 };
      if (entry.type === "purchase") {
        existing.spend += entry.amount;
      } else if (entry.type === "sale" || entry.type === "refund") {
        existing.profit += entry.amount;
      }
      profitMap.set(key, existing);
    }

    const profitOverTime = Array.from(profitMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        date: formatDateLabel(key, range),
        profit: Math.round(data.profit * 100) / 100,
        spend: Math.round(data.spend * 100) / 100,
      }));

    // Bot performance from orders + inventory
    const botMap = new Map<string, { checkouts: number; profit: number }>();
    for (const order of ordersInRange) {
      const bot = order.botName ?? "Unknown";
      const existing = botMap.get(bot) ?? { checkouts: 0, profit: 0 };
      if (order.success) existing.checkouts++;
      botMap.set(bot, existing);
    }

    // Add profit from inventory items linked to orders
    for (const item of soldItems) {
      if (!item.orderId) continue;
      const order = allOrders.find((o) => o.id === item.orderId);
      if (!order) continue;
      const bot = order.botName ?? "Unknown";
      const existing = botMap.get(bot) ?? { checkouts: 0, profit: 0 };
      existing.profit += (item.soldPrice ?? 0) - item.purchasePrice;
      botMap.set(bot, existing);
    }

    const botPerformance = Array.from(botMap.entries())
      .map(([bot, data]) => ({
        bot,
        checkouts: data.checkouts,
        profit: Math.round(data.profit * 100) / 100,
      }))
      .sort((a, b) => b.checkouts - a.checkouts);

    // Category ROI from sold inventory items
    const catMap = new Map<
      string,
      { totalROI: number; totalProfit: number; count: number }
    >();
    for (const item of soldItems) {
      const cat = item.category ?? "Other";
      const existing = catMap.get(cat) ?? {
        totalROI: 0,
        totalProfit: 0,
        count: 0,
      };
      const itemProfit = (item.soldPrice ?? 0) - item.purchasePrice;
      const itemROI =
        item.purchasePrice > 0 ? (itemProfit / item.purchasePrice) * 100 : 0;
      existing.totalROI += itemROI;
      existing.totalProfit += itemProfit;
      existing.count++;
      catMap.set(cat, existing);
    }

    const categoryROI = Array.from(catMap.entries())
      .map(([category, data]) => ({
        category,
        roi:
          data.count > 0
            ? Math.round((data.totalROI / data.count) * 10) / 10
            : 0,
        profit: Math.round(data.totalProfit * 100) / 100,
      }))
      .sort((a, b) => b.roi - a.roi);

    return {
      totalProfit,
      totalSpend,
      totalRevenue,
      itemsSold,
      profitTrend,
      profitOverTime,
      botPerformance,
      categoryROI,
    };
  } catch {
    return emptyAnalytics();
  }
}

function emptyAnalytics(): AnalyticsData {
  return {
    totalProfit: 0,
    totalSpend: 0,
    totalRevenue: 0,
    itemsSold: 0,
    profitTrend: 0,
    profitOverTime: [],
    botPerformance: [],
    categoryROI: [],
  };
}
