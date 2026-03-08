"use client";

import { IS_TAURI } from "@/lib/db/client";

export interface ProductResult {
  id: string;
  name: string;
  style_id: string;
  brand: string;
  colorway: string;
  thumbnail: string;
  retail_price: number;
  source: string;
}

export interface SizePrice {
  size: string;
  lowest_ask: number;
  highest_bid: number;
}

export interface PriceData {
  lowest_ask: number;
  highest_bid: number;
  last_sale: number;
  sizes: SizePrice[];
  source: string;
  fetched_at: string;
  stale: boolean;
}

export interface EbayItemSummary {
  item_id: string;
  title: string;
  price: { value: string; currency: string };
  condition: string | null;
  item_web_url: string;
  image: { image_url: string | null } | null;
}

async function tauriInvoke<T>(
  command: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export const PricingService = {
  async searchProducts(query: string, limit = 10): Promise<ProductResult[]> {
    if (!IS_TAURI) return [];
    try {
      return await tauriInvoke<ProductResult[]>("search_products", {
        query,
        limit,
      });
    } catch (e) {
      console.error("searchProducts failed:", e);
      return [];
    }
  },

  async getProductPrices(
    styleId: string,
    source: string,
  ): Promise<PriceData | null> {
    if (!IS_TAURI) return null;
    try {
      return await tauriInvoke<PriceData>("get_product_prices", {
        styleId,
        source,
      });
    } catch (e) {
      console.error("getProductPrices failed:", e);
      return null;
    }
  },

  async searchEbay(
    query: string,
    limit = 20,
    clientId?: string,
    clientSecret?: string,
  ): Promise<EbayItemSummary[]> {
    if (!IS_TAURI) return [];
    try {
      return await tauriInvoke<EbayItemSummary[]>("search_ebay", {
        query,
        limit,
        clientId: clientId ?? null,
        clientSecret: clientSecret ?? null,
      });
    } catch (e) {
      console.error("searchEbay failed:", e);
      return [];
    }
  },
};
