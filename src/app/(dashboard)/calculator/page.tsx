"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Calculator, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { ProductSearch } from "@/components/calculator/product-search";
import {
  PriceComparison,
  type MarketplacePrices,
} from "@/components/calculator/price-comparison";
import { FeeDetails } from "@/components/calculator/fee-details";
import { HistoryList } from "@/components/calculator/history-list";
import { PriceAlertDialog } from "@/components/calculator/price-alert-dialog";
import { calculatorRepo } from "@/lib/db/repositories";
import {
  getDefaultFeeOptions,
  calculateFlip,
  type FeeOptions,
  type Marketplace,
} from "@/lib/fees";
import type { CalculatorHistory } from "@/lib/db/types";
import type { ProductResult } from "@/services/pricing";
import { IS_TAURI } from "@/lib/db/client";
import { cn } from "@/lib/utils";

export default function CalculatorPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(
    null,
  );
  const [purchasePrice, setPurchasePrice] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [marketplacePrices, setMarketplacePrices] = useState<MarketplacePrices>(
    {
      stockx: 0,
      goat: 0,
      ebay: 0,
    },
  );
  const [feeOptions, setFeeOptions] =
    useState<FeeOptions>(getDefaultFeeOptions);
  const [showSettings, setShowSettings] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [history, setHistory] = useState<CalculatorHistory[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const purchase = parseFloat(purchasePrice) || 0;

  const salePrices = useMemo<Partial<Record<Marketplace, number>>>(() => {
    const prices: Partial<Record<Marketplace, number>> = {};
    if (marketplacePrices.stockx > 0) prices.stockx = marketplacePrices.stockx;
    if (marketplacePrices.goat > 0) prices.goat = marketplacePrices.goat;
    if (marketplacePrices.ebay > 0) prices.ebay = marketplacePrices.ebay;
    return prices;
  }, [marketplacePrices]);

  const hasAnyPrice = Object.keys(salePrices).length > 0;

  const loadHistory = useCallback(async () => {
    if (!IS_TAURI) {
      setHistoryLoaded(true);
      return;
    }
    try {
      const all = await calculatorRepo.getAll();
      setHistory(all.slice(0, 20));
    } catch {
      // DB not available yet
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleProductSelect = useCallback((product: ProductResult) => {
    setSelectedProduct(product);
    setSelectedSize("");
  }, []);

  const handlePricesLoaded = useCallback((prices: MarketplacePrices) => {
    setMarketplacePrices(prices);
  }, []);

  const handleSave = useCallback(async () => {
    if (!purchase || !hasAnyPrice) return;
    const results = calculateFlip(purchase, salePrices, feeOptions);
    const resultsJson = JSON.stringify({
      ebay: results.find((r) => r.marketplace === "ebay") ?? null,
      stockx: results.find((r) => r.marketplace === "stockx") ?? null,
      goat: results.find((r) => r.marketplace === "goat") ?? null,
    });
    try {
      await calculatorRepo.create({
        productName: selectedProduct?.name || "Manual Calculation",
        sku: selectedProduct?.style_id || null,
        purchasePrice: purchase,
        resultsJson,
      });
      await loadHistory();
    } catch {
      // DB not available
    }
  }, [
    selectedProduct,
    purchase,
    salePrices,
    feeOptions,
    hasAnyPrice,
    loadHistory,
  ]);

  const handleClear = useCallback(() => {
    setSelectedProduct(null);
    setPurchasePrice("");
    setSelectedSize("");
    setMarketplacePrices({ stockx: 0, goat: 0, ebay: 0 });
  }, []);

  const handleSelectHistory = useCallback((entry: CalculatorHistory) => {
    setPurchasePrice(String(entry.purchasePrice));
    try {
      const results = JSON.parse(entry.resultsJson) as Record<
        string,
        { salePrice?: number } | null
      >;
      setMarketplacePrices({
        stockx: results.stockx?.salePrice ?? 0,
        goat: results.goat?.salePrice ?? 0,
        ebay: results.ebay?.salePrice ?? 0,
      });
    } catch {
      // Invalid JSON
    }
  }, []);

  const handleDeleteHistory = useCallback(
    async (id: number) => {
      try {
        await calculatorRepo.remove(id);
        await loadHistory();
      } catch {
        // DB not available
      }
    },
    [loadHistory],
  );

  return (
    <PageTransition>
      <PageHeader
        title="Flip Calculator"
        description="Search products, compare marketplace prices, and calculate profit."
        actions={[
          {
            label: "Alerts",
            onClick: () => setShowAlertDialog(true),
            variant: "outline",
          },
          { label: "Clear", onClick: handleClear, variant: "outline" },
          { label: "Save", onClick: handleSave },
        ]}
      />

      <div className="space-y-6">
        {/* Product Search */}
        <ProductSearch onSelect={handleProductSelect} />

        {/* Selected Product Info */}
        {selectedProduct && (
          <Card className="p-4 bg-black border-border">
            <div className="flex items-center gap-4">
              {selectedProduct.thumbnail ? (
                <img
                  src={selectedProduct.thumbnail}
                  alt=""
                  className="size-16 rounded-lg object-cover bg-muted shrink-0"
                />
              ) : (
                <div className="size-16 rounded-lg bg-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedProduct.name}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {selectedProduct.style_id && (
                    <span className="font-mono">
                      {selectedProduct.style_id}
                    </span>
                  )}
                  {selectedProduct.brand && (
                    <span>{selectedProduct.brand}</span>
                  )}
                  {selectedProduct.retail_price > 0 && (
                    <span className="font-mono tabular-nums">
                      ${selectedProduct.retail_price.toFixed(0)} retail
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Purchase Price + Settings Toggle */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <Label
              htmlFor="purchase-price"
              className="text-muted-foreground text-xs"
            >
              Purchase Price (Cost Basis)
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="purchase-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="bg-card border-border pl-7 font-mono tabular-nums"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="w-full"
            >
              <Settings2 className="size-4 mr-2" />
              Fee Settings
            </Button>
          </div>
        </div>

        {/* Fee Settings Panel */}
        {showSettings && (
          <FeeSettingsPanel feeOptions={feeOptions} onChange={setFeeOptions} />
        )}

        {/* Price Comparison */}
        <PriceComparison
          product={selectedProduct}
          onPricesLoaded={handlePricesLoaded}
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
        />

        {/* Fee Details */}
        {purchase > 0 && hasAnyPrice ? (
          <FeeDetails
            purchasePrice={purchase}
            salePrices={salePrices}
            feeOptions={feeOptions}
          />
        ) : (
          !selectedProduct && (
            <EmptyState
              icon={Calculator}
              title="No product selected"
              description="Search for a product above or enter prices manually to calculate profit."
            />
          )
        )}

        <Separator className="bg-white/[0.06]" />

        {/* History */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Recent Calculations
          </h2>
          {!historyLoaded ? (
            <TableSkeleton rows={3} columns={3} />
          ) : (
            <HistoryList
              history={history}
              onSelect={handleSelectHistory}
              onDelete={handleDeleteHistory}
            />
          )}
        </div>
      </div>

      <PriceAlertDialog
        open={showAlertDialog}
        onOpenChange={setShowAlertDialog}
        productName={selectedProduct?.name}
        styleId={selectedProduct?.style_id}
        marketplace="stockx"
        currentPrice={
          marketplacePrices.stockx ||
          marketplacePrices.goat ||
          marketplacePrices.ebay
        }
        size={selectedSize || undefined}
        imageUrl={selectedProduct?.thumbnail}
      />
    </PageTransition>
  );
}

// Fee settings inline panel
function FeeSettingsPanel({
  feeOptions,
  onChange,
}: {
  feeOptions: FeeOptions;
  onChange: (opts: FeeOptions) => void;
}) {
  const selectClass =
    "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground/80 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50";

  return (
    <Card className="p-5 bg-black border-border">
      <p className="text-sm font-medium text-foreground mb-4">
        Fee Configuration
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* eBay */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            eBay
          </p>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Category</Label>
            <select
              value={feeOptions.ebay?.category ?? "sneakers"}
              onChange={(e) =>
                onChange({
                  ...feeOptions,
                  ebay: {
                    ...feeOptions.ebay!,
                    category: e.target.value as
                      | "sneakers"
                      | "general"
                      | "books_media",
                  },
                })
              }
              className={selectClass}
            >
              <option value="sneakers">Sneakers</option>
              <option value="general">General</option>
              <option value="books_media">Books/Media</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ebay-store"
              checked={feeOptions.ebay?.hasStore ?? false}
              onChange={(e) =>
                onChange({
                  ...feeOptions,
                  ebay: { ...feeOptions.ebay!, hasStore: e.target.checked },
                })
              }
              className="rounded border-border bg-card text-primary focus:ring-primary/50"
            />
            <Label
              htmlFor="ebay-store"
              className="text-muted-foreground text-xs"
            >
              eBay Store
            </Label>
          </div>
        </div>

        {/* StockX */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            StockX
          </p>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              Seller Level
            </Label>
            <select
              value={feeOptions.stockx?.sellerLevel ?? 1}
              onChange={(e) =>
                onChange({
                  ...feeOptions,
                  stockx: {
                    ...feeOptions.stockx!,
                    sellerLevel: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5,
                  },
                })
              }
              className={selectClass}
            >
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {[
              {
                id: "stockx-qs",
                label: "Quick Ship",
                key: "hasQuickShip" as const,
              },
              {
                id: "stockx-ss",
                label: "Successful Ship",
                key: "hasSuccessfulShip" as const,
              },
              {
                id: "stockx-pp",
                label: "Processing Waived",
                key: "paymentProcessingWaived" as const,
              },
            ].map(({ id, label, key }) => (
              <div key={id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={id}
                  checked={(feeOptions.stockx?.[key] as boolean) ?? false}
                  onChange={(e) =>
                    onChange({
                      ...feeOptions,
                      stockx: {
                        ...feeOptions.stockx!,
                        [key]: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-border bg-card text-primary focus:ring-primary/50"
                />
                <Label htmlFor={id} className="text-muted-foreground text-xs">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* GOAT */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            GOAT
          </p>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              Seller Rating
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={feeOptions.goat?.sellerRating ?? 90}
              onChange={(e) =>
                onChange({
                  ...feeOptions,
                  goat: {
                    ...feeOptions.goat!,
                    sellerRating: parseInt(e.target.value) || 90,
                  },
                })
              }
              className="bg-card border-border font-mono tabular-nums"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="goat-ca"
              checked={feeOptions.goat?.isCanadian ?? false}
              onChange={(e) =>
                onChange({
                  ...feeOptions,
                  goat: { ...feeOptions.goat!, isCanadian: e.target.checked },
                })
              }
              className="rounded border-border bg-card text-primary focus:ring-primary/50"
            />
            <Label htmlFor="goat-ca" className="text-muted-foreground text-xs">
              Canadian Seller
            </Label>
          </div>
        </div>
      </div>
    </Card>
  );
}
