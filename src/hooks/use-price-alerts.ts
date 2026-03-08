"use client";

import { useCallback, useEffect, useRef } from "react";
import { priceAlertsRepo } from "@/lib/db/repositories";
import { PricingService } from "@/services/pricing";
import { IS_TAURI } from "@/lib/db/client";

const POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function sendNotification(title: string, body: string) {
  if (!IS_TAURI) return;
  try {
    const {
      isPermissionGranted,
      requestPermission,
      sendNotification: notify,
    } = await import("@tauri-apps/plugin-notification");

    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    if (granted) {
      notify({ title, body });
    }
  } catch {
    // Notification plugin not available
  }
}

async function checkAlerts() {
  if (!IS_TAURI) return;

  try {
    const activeAlerts = await priceAlertsRepo.getActive();
    if (activeAlerts.length === 0) return;

    // Group alerts by styleId + marketplace to batch requests
    const groups = new Map<string, typeof activeAlerts>();
    for (const alert of activeAlerts) {
      // Skip already-triggered non-recurring alerts
      if (alert.triggered && !alert.recurring) continue;

      const key = `${alert.styleId}:${alert.marketplace}`;
      const group = groups.get(key) ?? [];
      group.push(alert);
      groups.set(key, group);
    }

    for (const [key, alerts] of groups) {
      const [styleId, source] = key.split(":");

      let currentPrice = 0;

      if (source === "ebay") {
        // For eBay, search and use median
        const results = await PricingService.searchEbay(
          alerts[0].productName,
          10,
        );
        const prices = results
          .map((item) => parseFloat(item.price.value))
          .filter((p) => !isNaN(p) && p > 0)
          .sort((a, b) => a - b);
        if (prices.length > 0) {
          const mid = Math.floor(prices.length / 2);
          currentPrice =
            prices.length % 2 === 0
              ? (prices[mid - 1] + prices[mid]) / 2
              : prices[mid];
        }
      } else {
        const priceData = await PricingService.getProductPrices(
          styleId,
          source,
        );
        if (priceData) {
          currentPrice = priceData.lowest_ask;
        }
      }

      if (currentPrice <= 0) continue;

      for (const alert of alerts) {
        // If alert has a specific size and source supports sizes, use size price
        // For now, use the overall lowest ask

        await priceAlertsRepo.updateCurrentPrice(alert.id, currentPrice);

        const crossed =
          (alert.direction === "below" && currentPrice <= alert.targetPrice) ||
          (alert.direction === "above" && currentPrice >= alert.targetPrice);

        if (crossed) {
          const dir =
            alert.direction === "below" ? "dropped below" : "rose above";
          await sendNotification(
            "Price Alert",
            `${alert.productName} ${dir} $${alert.targetPrice.toFixed(2)} - now $${currentPrice.toFixed(2)}`,
          );
          await priceAlertsRepo.markTriggered(alert.id);

          // If recurring, reset triggered so it polls again next cycle
          if (alert.recurring) {
            await priceAlertsRepo.resetTriggered(alert.id);
          }
        }
      }

      // Small delay between groups to avoid hammering APIs
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (e) {
    console.error("Price alert check failed:", e);
  }
}

export function usePriceAlertPolling() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runCheck = useCallback(() => {
    checkAlerts();
  }, []);

  useEffect(() => {
    if (!IS_TAURI) return;

    // Initial check after a short delay (let app settle)
    const timeout = setTimeout(runCheck, 5000);

    // Set up polling interval
    intervalRef.current = setInterval(runCheck, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runCheck]);
}
