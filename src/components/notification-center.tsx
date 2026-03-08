'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Package,
  TrendingDown,
  Calendar,
  MessageSquare,
  Check,
  BellOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { IS_TAURI } from '@/lib/db/client';
import type { Notification } from '@/lib/db/types';
import type { LucideIcon } from 'lucide-react';

const notificationIcons: Record<string, LucideIcon> = {
  webhook_received: Package,
  price_alert: TrendingDown,
  drop_reminder: Calendar,
  discord_keyword: MessageSquare,
};

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: number, actionUrl: string | null) => void;
}) {
  const Icon = notificationIcons[notification.type] ?? Bell;
  const isUnread = !notification.read;

  return (
    <button
      onClick={() => onRead(notification.id, notification.actionUrl)}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150',
        'hover:bg-zinc-800/50',
        isUnread && 'bg-amber-500/[0.04]'
      )}
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
          <Icon className="h-4 w-4 text-zinc-400" />
        </div>
        {isUnread && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', isUnread ? 'font-medium text-zinc-50' : 'text-zinc-300')}>
          {notification.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{notification.body}</p>
        <p className="mt-1 text-xs text-zinc-600">
          {formatRelativeTime(new Date(notification.createdAt))}
        </p>
      </div>
    </button>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!IS_TAURI) {
      setLoading(false);
      return;
    }
    try {
      const { getNotifications, getUnreadCount } = await import('@/lib/notifications');
      const [items, count] = await Promise.all([
        getNotifications(20),
        getUnreadCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch {
      // DB not ready yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNotificationClick = useCallback(
    async (id: number, actionUrl: string | null) => {
      try {
        const { markAsRead } = await import('@/lib/notifications');
        await markAsRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
      if (actionUrl) {
        setOpen(false);
        window.location.href = actionUrl;
      }
    },
    []
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const { markAllAsRead } = await import('@/lib/notifications');
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-7 w-7"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-lg border border-white/[0.06] bg-zinc-900/80 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <h3 className="text-sm font-medium text-zinc-50">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-xs text-zinc-400 hover:text-zinc-200"
                onClick={handleMarkAllAsRead}
              >
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <>
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <BellOff className="h-8 w-8 text-zinc-600" />
                <p className="text-sm text-zinc-500">No notifications yet</p>
                <p className="text-xs text-zinc-600">
                  Alerts from webhooks, price drops, and Discord will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onRead={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
