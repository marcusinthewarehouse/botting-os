'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import { PageTransition } from '@/components/page-transition';
import { FeeBreakdown, type FeeBreakdownData } from '@/components/calculator/fee-breakdown';
import { HistoryList } from '@/components/calculator/history-list';
import { calculatorRepo } from '@/lib/db/repositories';
import type { CalculatorHistory } from '@/lib/db/types';
import { IS_TAURI } from '@/lib/db/client';

// Simple placeholder rates - Task 3.2 builds the real fee engine
const APPROX_FEES = { ebay: 0.1325, stockx: 0.12, goat: 0.125 };

type Marketplace = 'ebay' | 'stockx' | 'goat';

const MARKETPLACE_LABELS: Record<Marketplace, { name: string; feeLabel: string }> = {
  ebay: { name: 'eBay', feeLabel: '~13.25% total fees' },
  stockx: { name: 'StockX', feeLabel: '~12% total fees' },
  goat: { name: 'GOAT', feeLabel: '~12.5% total fees' },
};

function quickEstimate(
  salePrice: number,
  purchasePrice: number,
  feeRate: number
): FeeBreakdownData | null {
  if (salePrice <= 0 || purchasePrice <= 0) return null;
  const fees = salePrice * feeRate;
  const profit = salePrice - fees - purchasePrice;
  return {
    salePrice,
    fees: Math.round(fees * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    roi: Math.round((profit / purchasePrice) * 100),
  };
}

export default function CalculatorPage() {
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [ebaySalePrice, setEbaySalePrice] = useState('');
  const [stockxSalePrice, setStockxSalePrice] = useState('');
  const [goatSalePrice, setGoatSalePrice] = useState('');
  const [history, setHistory] = useState<CalculatorHistory[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const purchase = parseFloat(purchasePrice) || 0;
  const ebayBreakdown = quickEstimate(parseFloat(ebaySalePrice) || 0, purchase, APPROX_FEES.ebay);
  const stockxBreakdown = quickEstimate(parseFloat(stockxSalePrice) || 0, purchase, APPROX_FEES.stockx);
  const goatBreakdown = quickEstimate(parseFloat(goatSalePrice) || 0, purchase, APPROX_FEES.goat);

  const loadHistory = useCallback(async () => {
    if (!IS_TAURI) return;
    try {
      const all = await calculatorRepo.getAll();
      setHistory(all.slice(0, 20));
    } catch {
      // DB not available yet
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSave = useCallback(async () => {
    if (!purchase) return;
    const resultsJson = JSON.stringify({
      ebay: ebayBreakdown,
      stockx: stockxBreakdown,
      goat: goatBreakdown,
    });
    try {
      await calculatorRepo.create({
        productName: productName || 'Untitled',
        sku: sku || null,
        purchasePrice: purchase,
        resultsJson,
      });
      await loadHistory();
    } catch {
      // DB not available
    }
  }, [productName, sku, purchase, ebayBreakdown, stockxBreakdown, goatBreakdown, loadHistory]);

  const handleClear = useCallback(() => {
    setProductName('');
    setSku('');
    setPurchasePrice('');
    setEbaySalePrice('');
    setStockxSalePrice('');
    setGoatSalePrice('');
  }, []);

  const handleSelectHistory = useCallback((entry: CalculatorHistory) => {
    setProductName(entry.productName || '');
    setSku(entry.sku || '');
    setPurchasePrice(String(entry.purchasePrice));
    try {
      const results = JSON.parse(entry.resultsJson) as Record<string, FeeBreakdownData | null>;
      if (results.ebay?.salePrice) setEbaySalePrice(String(results.ebay.salePrice));
      if (results.stockx?.salePrice) setStockxSalePrice(String(results.stockx.salePrice));
      if (results.goat?.salePrice) setGoatSalePrice(String(results.goat.salePrice));
    } catch {
      // Invalid JSON
    }
  }, []);

  const handleDeleteHistory = useCallback(async (id: number) => {
    try {
      await calculatorRepo.remove(id);
      await loadHistory();
    } catch {
      // DB not available
    }
  }, [loadHistory]);

  // Debounced input helper
  function handlePriceInput(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setter(val), 200);
      setter(val);
    };
  }

  return (
    <PageTransition>
      <PageHeader
        title="Flip Calculator"
        description="Calculate profit projections across marketplaces."
        actions={[
          { label: 'Clear', onClick: handleClear, variant: 'outline' },
          { label: 'Save', onClick: handleSave },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1">
          <Card className="p-5 bg-black border-white/[0.06] space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name" className="text-zinc-400 text-xs">Product Name</Label>
              <Input
                id="product-name"
                placeholder="Jordan 1 Retro High"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku" className="text-zinc-400 text-xs">SKU</Label>
              <Input
                id="sku"
                placeholder="555088-134"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-price" className="text-zinc-400 text-xs">Purchase Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                <Input
                  id="purchase-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={handlePriceInput(setPurchasePrice)}
                  className="bg-zinc-900 border-zinc-800 pl-7 font-mono tabular-nums"
                />
              </div>
            </div>

            <Separator className="bg-white/[0.06]" />

            <div className="space-y-2">
              <Label htmlFor="ebay-price" className="text-zinc-400 text-xs">eBay Sale Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                <Input
                  id="ebay-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={ebaySalePrice}
                  onChange={handlePriceInput(setEbaySalePrice)}
                  className="bg-zinc-900 border-zinc-800 pl-7 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockx-price" className="text-zinc-400 text-xs">StockX Sale Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                <Input
                  id="stockx-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={stockxSalePrice}
                  onChange={handlePriceInput(setStockxSalePrice)}
                  className="bg-zinc-900 border-zinc-800 pl-7 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goat-price" className="text-zinc-400 text-xs">GOAT Sale Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                <Input
                  id="goat-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={goatSalePrice}
                  onChange={handlePriceInput(setGoatSalePrice)}
                  className="bg-zinc-900 border-zinc-800 pl-7 font-mono tabular-nums"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeeBreakdown
            marketplace={MARKETPLACE_LABELS.ebay.name}
            feeLabel={MARKETPLACE_LABELS.ebay.feeLabel}
            breakdown={ebayBreakdown}
          />
          <FeeBreakdown
            marketplace={MARKETPLACE_LABELS.stockx.name}
            feeLabel={MARKETPLACE_LABELS.stockx.feeLabel}
            breakdown={stockxBreakdown}
          />
          <FeeBreakdown
            marketplace={MARKETPLACE_LABELS.goat.name}
            feeLabel={MARKETPLACE_LABELS.goat.feeLabel}
            breakdown={goatBreakdown}
          />
        </div>
      </div>

      {/* History */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Recent Calculations</h2>
        <HistoryList
          history={history}
          onSelect={handleSelectHistory}
          onDelete={handleDeleteHistory}
        />
      </div>
    </PageTransition>
  );
}
