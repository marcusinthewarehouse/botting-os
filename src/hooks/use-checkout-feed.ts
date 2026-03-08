"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface CheckoutEvent {
  id: string;
  user_id: string;
  bot_name: string;
  product: string;
  sku: string | null;
  size: string | null;
  price: number | null;
  store: string;
  profile: string | null;
  proxy: string | null;
  order_number: string | null;
  mode: string | null;
  checkout_time: string | null;
  image_url: string | null;
  email: string | null;
  quantity: number;
  success: boolean;
  extras: Record<string, string>;
  raw_payload: unknown;
  received_at: string;
}

interface UseCheckoutFeedOptions {
  onNewEvent?: (event: CheckoutEvent) => void;
}

export function useCheckoutFeed(
  userId: string | null,
  options?: UseCheckoutFeedOptions,
) {
  const [events, setEvents] = useState<CheckoutEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const onNewEventRef = useRef(options?.onNewEvent);
  onNewEventRef.current = options?.onNewEvent;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchExisting() {
      const { data, error } = await supabase
        .from("checkout_events")
        .select("*")
        .eq("user_id", userId)
        .order("received_at", { ascending: false })
        .limit(500);

      if (!cancelled) {
        if (!error && data) {
          setEvents(data as CheckoutEvent[]);
        }
        setLoading(false);
      }
    }

    fetchExisting();

    const channel = supabase
      .channel(`checkouts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "checkout_events",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newEvent = payload.new as CheckoutEvent;
          setEvents((prev) => [newEvent, ...prev]);
          onNewEventRef.current?.(newEvent);

          syncToLocalDb(newEvent);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { events, loading };
}

async function syncToLocalDb(event: CheckoutEvent) {
  try {
    const { ordersRepo } = await import("@/lib/db/repositories");
    await ordersRepo.create({
      botName: event.bot_name,
      product: event.product,
      size: event.size,
      price: (event.price ?? 0) / 100,
      store: event.store ?? "Unknown",
      profile: event.profile,
      orderNumber: event.order_number,
      success: event.success,
      rawData: JSON.stringify(event.raw_payload),
    });
  } catch {
    // Local DB sync is best-effort - may fail in browser dev mode
  }
}

export function formatPrice(cents: number | null): string {
  if (cents === null) return "-";
  return `$${(cents / 100).toFixed(2)}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
