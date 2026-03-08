"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PricingService, type ProductResult } from "@/services/pricing";
import { cn } from "@/lib/utils";

interface ProductSearchProps {
  onSelect: (product: ProductResult) => void;
}

export function ProductSearch({ onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const products = await PricingService.searchProducts(q, 10);
    setResults(products);
    setOpen(products.length > 0);
    setLoading(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(val), 300);
    },
    [search],
  );

  const handleSelect = useCallback(
    (product: ProductResult) => {
      setQuery(product.name);
      setOpen(false);
      onSelect(product);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setOpen(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search products (e.g. Jordan 1 Retro High)"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="bg-card border-border pl-9 pr-9"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {(open || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-80 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="p-3 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4 bg-muted" />
                    <Skeleton className="h-3 w-1/2 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="py-1">
              {results.map((product, i) => (
                <li key={`${product.source}-${product.id}-${i}`}>
                  <button
                    onClick={() => handleSelect(product)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors duration-100"
                  >
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt=""
                        className="size-10 rounded object-cover bg-muted shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground/80 truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {product.style_id && (
                          <span className="font-mono">{product.style_id}</span>
                        )}
                        {product.retail_price > 0 && (
                          <span className="font-mono tabular-nums">
                            ${product.retail_price.toFixed(0)} retail
                          </span>
                        )}
                        <span
                          className={cn(
                            "uppercase text-[10px] font-medium px-1 py-0.5 rounded",
                            product.source === "stockx"
                              ? "bg-green-500/15 text-green-400"
                              : "bg-purple-500/15 text-purple-400",
                          )}
                        >
                          {product.source}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
