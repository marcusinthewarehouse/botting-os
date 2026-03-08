import { dropsRepo } from "@/lib/db/repositories";
import { IS_TAURI } from "@/lib/db/client";

async function notify(title: string, body: string) {
  if (!IS_TAURI) return;
  const { isPermissionGranted, requestPermission, sendNotification } =
    await import("@tauri-apps/plugin-notification");

  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }
  if (granted) {
    sendNotification({ title, body });
  }
}

export async function checkReminders(): Promise<void> {
  if (!IS_TAURI) return;

  try {
    const pending = await dropsRepo.getPendingReminders();
    const now = new Date();

    for (const drop of pending) {
      if (!drop.reminderMinutes || !drop.dropDate) continue;

      const reminderTime = new Date(
        drop.dropDate.getTime() - drop.reminderMinutes * 60_000,
      );

      if (now >= reminderTime) {
        const timeStr = drop.dropTime ? `at ${drop.dropTime}` : "soon";
        const retailerStr = drop.retailer ? ` on ${drop.retailer}` : "";
        await notify(
          `Drop Reminder: ${drop.productName}`,
          `${drop.productName} drops ${timeStr}${retailerStr}`,
        );
        await dropsRepo.markReminded(drop.id);
      }
    }
  } catch {
    // DB not ready or notification unavailable
  }
}
