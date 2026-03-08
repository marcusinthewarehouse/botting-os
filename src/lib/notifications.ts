import { notificationsRepo } from '@/lib/db/repositories';
import { IS_TAURI } from '@/lib/db/client';

export type NotificationType =
  | 'webhook_received'
  | 'price_alert'
  | 'drop_reminder'
  | 'discord_keyword';

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  sendOs?: boolean;
}

async function sendOsNotification(title: string, body: string) {
  if (!IS_TAURI) return;
  try {
    const {
      isPermissionGranted,
      requestPermission,
      sendNotification: notify,
    } = await import('@tauri-apps/plugin-notification');

    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    if (granted) {
      notify({ title, body });
    }
  } catch {
    // Notification plugin not available
  }
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  await notificationsRepo.create({
    type: input.type,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl ?? null,
    metadata: input.metadata ?? null,
    createdAt: new Date(),
  });

  if (input.sendOs) {
    await sendOsNotification(input.title, input.body);
  }
}

export async function getNotifications(limit?: number) {
  return notificationsRepo.getAll(limit);
}

export async function getUnreadCount() {
  return notificationsRepo.getUnreadCount();
}

export async function markAsRead(id: number) {
  return notificationsRepo.markAsRead(id);
}

export async function markAllAsRead() {
  return notificationsRepo.markAllAsRead();
}

export async function deleteNotification(id: number) {
  return notificationsRepo.remove(id);
}
