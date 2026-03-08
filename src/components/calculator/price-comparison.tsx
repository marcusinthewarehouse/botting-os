"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PricingService,
  type PriceData,
  type ProductResult,
  type SizePrice,
} from "@/services/pricing";
import { cn } from "@/lib/utils";

interface PriceComparisonProps {
  product: ProductResult | null;
  onPricesLoaded: (prices: MarketplacePrices) => void;
  selectedSize: string;
  onSizeChange: (size: string) => void;
}

export interface MarketplacePrices {
  stockx: number;
  goat: number;
  ebay: number;
}

interface MarketplaceData {
  priceData: PriceData | null;
  loading: boolean;
  override: string;
}

function formatTimestamp(ts: string): string {
  const secs = parseInt(ts.replace("Z", ""), 10);
  if (isNaN(secs)) return "";
  const date = new Date(secs * 1000);
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

function getSizePrice(
  sizes: SizePrice[],
  selectedSize: string,
): { ask: number; bid: number } {
  if (!selectedSize || sizes.length === 0) return { ask: 0, bid: 0 };
  const match = sizes.find((s) => s.size === selectedSize);
  return match
    ? { ask: match.lowest_ask, bid: match.highest_bid }
    : { ask: 0, bid: 0 };
}

export function PriceComparison({
  product,
  onPricesLoaded,
  selectedSize,
  onSizeChange,
}: PriceComparisonProps) {
  const [stockx, setStockx] = useState<MarketplaceData>({
    priceData: null,
    loading: false,
    override: "",
  });
  const [goat, setGoat] = useState<MarketplaceData>({
    priceData: null,
    loading: false,
    override: "",
  });
  const [ebayPrice, setEbayPrice] = useState<{
    median: number;
    loading: boolean;
    override: string;
  }>({
    median: 0,
    loading: false,
    override: "",
  });

  const fetchPrices = useCallback(async (prod: ProductResult) => {
    setStockx((s) => ({ ...s, loading: true }));
    setGoat((s) => ({ ...s, loading: true }));
    setEbayPrice((s) => ({ ...s, loading: true }));

    const [stockxData, goatData, ebayResults] = await Promise.all([
      PricingService.getProductPrices(prod.style_id, "stockx"),
      PricingService.getProductPrices(prod.style_id, "goat"),
      PricingService.searchEbay(prod.name, 10),
    ]);

    setStockx({ priceData: stockxData, loading: false, override: "" });
    setGoat({ priceData: goatData, loading: false, override: "" });

    let median = 0;
    if (ebayResults.length > 0) {
      const prices = ebayResults
        .map((item) => parseFloat(item.price.value))
        .filter((p) => !isNaN(p) && p > 0)
        .sort((a, b) => a - b);
      if (prices.length > 0) {
        const mid = Math.floor(prices.length / 2);
        median =
          prices.length % 2 === 0
            ? (prices[mid - 1] + prices[mid]) / 2
            : prices[mid];
      }
    }
    setEbayPrice({ median, loading: false, override: "" });
  }, []);

  useEffect(() => {
    if (product) {
      fetchPrices(product);
    }
  }, [product, fetchPrices]);

  // Compute effective prices and notify parent
  useEffect(() => {
    const stockxAsk =
      parseFloat(stockx.override) ||
      (selectedSize
        ? getSizePrice(stockx.priceData?.sizes ?? [], selectedSize).ask
        : (stockx.priceData?.lowest_ask ?? 0));
    const goatAsk =
      parseFloat(goat.override) || (goat.priceData?.lowest_ask ?? 0);
    const ebay = parseFloat(ebayPrice.override) || ebayPrice.median;

    onPricesLoaded({ stockx: stockxAsk, goat: goatAsk, ebay });
  }, [
    stockx.priceData,
    stockx.override,
    goat.priceData,
    goat.override,
    ebayPrice.median,
    ebayPrice.override,
    selectedSize,
    onPricesLoaded,
  ]);

  // Collect all sizes from StockX data
  const sizes = stockx.priceData?.sizes ?? [];

  if (!product) return null;

  return (
    <div className="space-y-4">
      {/* Size selector */}
      {sizes.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Size</Label>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((s) => (
              <button
                key={s.size}
                onClick={() =>
                  onSizeChange(s.size === selectedSize ? "" : s.size)
                }
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border font-mono tabular-nums transition-colors duration-100",
                  s.size === selectedSize
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-border",
                )}
              >
                {s.size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Marketplace price cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MarketplaceCard
          name="StockX"
          loading={stockx.loading}
          priceData={stockx.priceData}
          selectedSize={selectedSize}
          override={stockx.override}
          onOverride={(v) => setStockx((s) => ({ ...s, override: v }))}
          onRefresh={() => product && fetchPrices(product)}
        />
        <MarketplaceCard
          name="GOAT"
          loading={goat.loading}
          priceData={goat.priceData}
          selectedSize=""
          override={goat.override}
          onOverride={(v) => setGoat((s) => ({ ...s, override: v }))}
          onRefresh={() => product && fetchPrices(product)}
        />
        <EbayCard
          loading={ebayPrice.loading}
          median={ebayPrice.median}
          override={ebayPrice.override}
          onOverride={(v) => setEbayPrice((s) => ({ ...s, override: v }))}
          onRefresh={() => product && fetchPrices(product)}
        />
      </div>
    </div>
  );
}

function MarketplaceCard({
  name,
  loading,
  priceData,
  selectedSize,
  override,
  onOverride,
  onRefresh,
}: {
  name: string;
  loading: boolean;
  priceData: PriceData | null;
  selectedSize: string;
  override: string;
  onOverride: (v: string) => void;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <Card className="p-4 bg-black border-border space-y-3">
        <Skeleton className="h-4 w-16 bg-muted" />
        <Skeleton className="h-8 w-24 bg-muted" />
        <Skeleton className="h-3 w-20 bg-muted" />
      </Card>
    );
  }

  const sizeData = selectedSize
    ? getSizePrice(priceData?.sizes ?? [], selectedSize)
    : null;
  const ask = sizeData ? sizeData.ask : (priceData?.lowest_ask ?? 0);
  const bid = sizeData ? sizeData.bid : (priceData?.highest_bid ?? 0);
  const lastSale = priceData?.last_sale ?? 0;

  return (
    <Card className="p-4 bg-black border-border space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <div className="flex items-center gap-1.5">
          {priceData?.stale && (
            <AlertTriangle className="size-3.5 text-primary" />
          )}
          <button onClick={onRefresh} className="p-1 rounded hover:bg-muted">
            <RefreshCw className="size-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {priceData ? (
        <>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Lowest Ask</span>
              <span className="font-mono tabular-nums text-foreground/80">
                {ask > 0 ? `$${ask.toFixed(2)}` : "-"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Highest Bid</span>
              <span className="font-mono tabular-nums text-foreground/80">
                {bid > 0 ? `$${bid.toFixed(2)}` : "-"}
              </span>
            </div>
            {lastSale > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Last Sale</span>
                <span className="font-mono tabular-nums text-foreground/80">
                  ${lastSale.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border">
            <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">
              Override
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={ask > 0 ? ask.toFixed(2) : "0.00"}
                value={override}
                onChange={(e) => onOverride(e.target.value)}
                className="h-7 bg-card border-border pl-5 text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          {priceData.fetched_at && (
            <p className="text-[10px] text-muted-foreground">
              {priceData.stale ? "Stale - " : ""}
              Fetched {formatTimestamp(priceData.fetched_at)}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No data available</p>
      )}
    </Card>
  );
}

function EbayCard({
  loading,
  median,
  override,
  onOverride,
  onRefresh,
}: {
  loading: boolean;
  median: number;
  override: string;
  onOverride: (v: string) => void;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <Card className="p-4 bg-black border-border space-y-3">
        <Skeleton className="h-4 w-16 bg-muted" />
        <Skeleton className="h-8 w-24 bg-muted" />
        <Skeleton className="h-3 w-20 bg-muted" />
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-black border-border space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">eBay</p>
        <button onClick={onRefresh} className="p-1 rounded hover:bg-muted">
          <RefreshCw className="size-3 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Median Price</span>
          <span className="font-mono tabular-nums text-foreground/80">
            {median > 0 ? `$${median.toFixed(2)}` : "-"}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">
          Override
        </Label>
        <div className="relative mt-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder={median > 0 ? median.toFixed(2) : "0.00"}
            value={override}
            onChange={(e) => onOverride(e.target.value)}
            className="h-7 bg-card border-border pl-5 text-xs font-mono tabular-nums"
          />
        </div>
      </div>
    </Card>
  );
}
