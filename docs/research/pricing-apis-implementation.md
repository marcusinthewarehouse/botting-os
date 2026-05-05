# Pricing APIs - Implementation Details

**Researched**: 2026-03-07
**Status**: Complete
**Depends on**: marketplace-apis.md (first-wave research), DISCOVERY.md decisions

---

## 1. Sneaks-API in Tauri

### The Problem: Sneaks-API Requires Node.js

Sneaks-API is a Node.js package built with Express, Got, and Cheerio. It makes HTTP requests to StockX, GOAT, FlightClub, and Stadium Goods internal APIs and scrapes their responses. It **cannot run in a browser/static frontend** - it needs Node.js for:

- HTTP requests with custom headers (Got library)
- HTML parsing (Cheerio)
- Express server (optional, for REST mode)

Tauri's webview is a browser context with no Node.js runtime. You cannot `require('sneaks-api')` in the frontend.

### How Sneaks-API Works Internally

The package searches StockX first (primary data source), then asynchronously hits GOAT, FlightClub, and Stadium Goods for supplementary pricing. Internally it:

1. **Search**: Sends HTTP GET to StockX's search endpoint with the keyword
2. **Product details**: Fetches product page data from StockX (style ID lookup)
3. **Price map**: Scrapes size-by-size ask prices from each platform
4. **Returns**: Unified product object with prices from all platforms

Key methods:

```javascript
const SneaksAPI = require('sneaks-api');
const sneaks = new SneaksAPI();

// Search by keyword - returns array of products
sneaks.getProducts("Jordan 1 Retro", 10, function(err, products) {
  // products[0].shoeName, .brand, .colorway, .thumbnail, .retailPrice
  // products[0].styleID - use this for price lookup
  // products[0].lowestResellPrice - { stockX, goat, flightClub, stadiumGoods }
  // products[0].resellLinks - { stockX, goat, flightClub, stadiumGoods }
});

// Get detailed prices by style ID - returns size-by-size breakdown
sneaks.getProductPrices("554724-134", function(err, product) {
  // product.resellPrices.stockX -> { "7": 250, "7.5": 260, "8": 270, ... }
  // product.resellPrices.goat -> { "7": 245, "7.5": 255, ... }
  // product.resellPrices.flightClub -> { "7": 248, ... }
  // product.resellPrices.stadiumGoods -> { "7": 252, ... }
});

// Get trending/popular products
sneaks.getMostPopular(10, function(err, products) { ... });
```

### Maintenance Concern

Sneaks-API v1.2.3 was published 4+ years ago with no updates. It could break anytime if StockX/GOAT change their internal APIs. Consider:

- **KicksDB (kicks.dev)**: Commercial alternative, actively maintained, aggregates 40+ shops including StockX and GOAT. Has real-time pricing. Paid but reliable.
- **Sneaks-API-2.0** (aryan-chakrabarti fork): Community fork, may have fixes.
- **DIY approach**: Reverse-engineer the same endpoints Sneaks-API uses and call them directly from Rust.

### Three Options for Tauri Integration

#### Option A: Rust HTTP Calls (RECOMMENDED)

Reverse-engineer Sneaks-API's approach and make the same HTTP requests directly from Tauri's Rust backend using `reqwest`. No Node.js dependency.

```rust
// src-tauri/src/pricing/stockx.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SneakerPrice {
    pub size: String,
    pub price: f64,
}

#[derive(Serialize, Deserialize)]
pub struct SneakerProduct {
    pub name: String,
    pub style_id: String,
    pub brand: String,
    pub colorway: String,
    pub thumbnail: String,
    pub retail_price: f64,
    pub stockx_prices: Vec<SneakerPrice>,
    pub goat_prices: Vec<SneakerPrice>,
    pub flight_club_prices: Vec<SneakerPrice>,
}

#[tauri::command]
async fn search_sneakers(query: String, limit: usize) -> Result<Vec<SneakerProduct>, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .build()
        .map_err(|e| e.to_string())?;

    // StockX search endpoint (same one Sneaks-API uses)
    let url = format!(
        "https://stockx.com/api/browse?&_search={}&page=1&resultsPerPage={}",
        urlencoding::encode(&query),
        limit
    );

    let resp = client
        .get(&url)
        .header("accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body = resp.text().await.map_err(|e| e.to_string())?;
    // Parse StockX response and map to SneakerProduct
    // Then async fetch GOAT + FlightClub prices for each product

    Ok(vec![]) // placeholder
}
```

Frontend invocation:

```typescript
import { invoke } from "@tauri-apps/api/core";

interface SneakerProduct {
  name: string;
  style_id: string;
  brand: string;
  colorway: string;
  thumbnail: string;
  retail_price: number;
  stockx_prices: { size: string; price: number }[];
  goat_prices: { size: string; price: number }[];
  flight_club_prices: { size: string; price: number }[];
}

async function searchSneakers(
  query: string,
  limit: number,
): Promise<SneakerProduct[]> {
  return invoke("search_sneakers", { query, limit });
}
```

**Pros**: No Node.js, no sidecar, no extra process. Fast. Full control over requests.
**Cons**: Must maintain scraper endpoints yourself when platforms change.

#### Option B: Node.js Sidecar

Bundle a compiled Node.js binary (via `pkg` or `nexe`) that runs Sneaks-API as a local HTTP server. Tauri spawns it as a sidecar process.

```rust
// src-tauri/src/main.rs
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar = app.shell()
        .sidecar("sneaks-server")
        .expect("failed to create sidecar");

    let (mut _rx, _child) = sidecar.spawn().expect("failed to spawn sidecar");
    Ok(())
}
```

The sidecar runs `sneaks-api` as an Express server on a local port (e.g., 3456). Rust backend proxies requests to it.

**Pros**: Use Sneaks-API as-is, minimal code.
**Cons**: Extra ~40-50MB for bundled Node.js binary. Extra process to manage. Must handle startup/shutdown lifecycle.

#### Option C: KicksDB API (Paid Fallback)

If DIY scraping breaks, KicksDB offers a maintained commercial API:

- Real-time pricing from StockX, GOAT, FlightClub, 40+ shops
- Historical sales data
- 150GB+ database
- Professional support

Use as fallback when Rust scrapers break, or as primary if budget allows.

### Anti-Bot Protection Considerations

- **StockX**: Uses HUMAN Security (formerly PerimeterX). Aggressive bot detection. Datacenter IPs get blocked. May need to rotate user agents, add delays. The internal API endpoints may require specific headers or tokens that change.
- **GOAT**: Less aggressive. Mobile API endpoints are the primary scraping target. Rate limiting exists but is less strict.
- **FlightClub**: Moderate protection. Owned by GOAT, shares some infrastructure.

### Recommendation

**Start with Option A** (Rust HTTP). Port Sneaks-API's logic to Rust. If it proves fragile due to anti-bot measures, fall back to KicksDB API. Skip the sidecar approach - it adds unnecessary complexity for what amounts to a few HTTP calls.

---

## 2. eBay Browse API Implementation

### OAuth Client Credentials Setup

Register at developer.ebay.com. Get Client ID (App ID) and Client Secret (Cert ID).

**Token endpoint (Production)**:

```
POST https://api.ebay.com/identity/v1/oauth2/token
```

**Token endpoint (Sandbox)**:

```
POST https://api.sandbox.ebay.com/identity/v1/oauth2/token
```

**Request** (Rust with reqwest):

```rust
use base64::Engine;
use reqwest::Client;
use serde::Deserialize;

#[derive(Deserialize)]
struct EbayToken {
    access_token: String,
    expires_in: u64, // 7200 seconds (2 hours)
    token_type: String,
}

async fn get_ebay_app_token(client_id: &str, client_secret: &str) -> Result<EbayToken, String> {
    let client = Client::new();
    let credentials = base64::engine::general_purpose::STANDARD
        .encode(format!("{}:{}", client_id, client_secret));

    let resp = client
        .post("https://api.ebay.com/identity/v1/oauth2/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("Authorization", format!("Basic {}", credentials))
        .body("grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    resp.json::<EbayToken>().await.map_err(|e| e.to_string())
}
```

**Key scope**: `https://api.ebay.com/oauth/api_scope` - grants Browse API access without user login.

Token is valid for **7,200 seconds (2 hours)**. Cache it and refresh before expiry.

### Search Endpoint

**URL**: `GET https://api.ebay.com/buy/browse/v1/item_summary/search`

**Key query parameters**:
| Parameter | Description |
|-----------|-------------|
| `q` | Search keyword (required unless using other identifiers) |
| `gtin` | Global Trade Item Number (UPC/EAN/ISBN) |
| `epid` | eBay Product ID |
| `category_ids` | Comma-separated category IDs |
| `filter` | Filters: price, condition, deliveryCountry, etc. |
| `sort` | Sort order: price, -price, newlyListed, endingSoonest |
| `limit` | Results per page (max 200, default 50) |
| `offset` | Pagination offset (max 10,000 total items) |
| `fieldgroups` | MATCHING_ITEMS (default), EXTENDED (adds shortDescription, itemLocation.city) |

**Example Rust implementation**:

```rust
#[derive(Deserialize, Serialize)]
struct EbayPrice {
    value: String,
    currency: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct EbayItemSummary {
    item_id: String,
    title: String,
    price: EbayPrice,
    condition: Option<String>,
    item_web_url: String,
    image: Option<EbayImage>,
    buying_options: Vec<String>,
    item_location: Option<EbayLocation>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct EbaySearchResponse {
    total: u64,
    item_summaries: Option<Vec<EbayItemSummary>>,
    offset: u64,
    limit: u64,
}

#[tauri::command]
async fn search_ebay(
    query: String,
    limit: u32,
    token: String,
) -> Result<EbaySearchResponse, String> {
    let client = Client::new();

    let url = format!(
        "https://api.ebay.com/buy/browse/v1/item_summary/search?q={}&limit={}&filter=buyingOptions:{{FIXED_PRICE}}",
        urlencoding::encode(&query),
        limit.min(200)
    );

    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("X-EBAY-C-MARKETPLACE-ID", "EBAY_US")
        .header("X-EBAY-C-ENDUSERCTX", "affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    resp.json::<EbaySearchResponse>().await.map_err(|e| e.to_string())
}
```

### Sold/Completed Listings - NOT Available

The Browse API **does not** return sold/completed listings. eBay restricts this data:

- **Marketplace Insights API**: Exists but requires special approval (Terapeak-level access). Not available to regular developers.
- **Legacy Finding API** (`findCompletedItems`): Deprecated, throttled, being phased out.
- **Workaround**: Use active Buy It Now listings as the price proxy. Show "market price" based on current active listings, not historical sales.

### eBay Notification API (Webhooks)

For tracking user's own sales via ITEM_SOLD events.

**Requires**: Authorization Code Grant flow (user must log in and authorize).

**Webhook setup steps**:

1. Register a public HTTPS endpoint
2. Subscribe to notification topics
3. Handle challenge verification (eBay sends a challenge code, you return it)
4. Process incoming POST payloads

**Key topics**:

- `ITEM_SOLD` - listing ends in a sale
- `ITEM_CREATED` - new listing created
- `FixedPriceTransaction` - Buy It Now sale

**Challenge**: Requires a public HTTPS endpoint. For a desktop app, options are:

- Cloud relay endpoint (e.g., bottingos.app/webhooks/ebay/{userId}) that forwards to Supabase
- Polling the Fulfillment API `getOrders` endpoint instead (simpler, no webhook infra needed)

**Recommendation**: For MVP, poll `getOrders` on a timer (every 5 minutes). Webhooks are better for scale but require cloud infrastructure.

### Rate Limits

- **5,000 requests/day** per application (across all users if shared client ID)
- For a single-user desktop app, this is plenty
- If multiple users share the same eBay app credentials, this becomes tight
- Can request limit increases via eBay's Application Growth Check (free)

---

## 3. Caching Strategy

### Architecture

All pricing data cached in local SQLite via Drizzle ORM. Each cache entry tracks:

```typescript
// Schema for price cache table
const priceCache = sqliteTable("price_cache", {
  id: text("id").primaryKey(), // composite: platform + styleId + size
  platform: text("platform").notNull(), // 'stockx' | 'goat' | 'flightclub' | 'ebay'
  styleId: text("style_id").notNull(),
  productName: text("product_name").notNull(),
  size: text("size"), // null for aggregate/lowest price
  price: real("price").notNull(),
  currency: text("currency").default("USD"),
  thumbnail: text("thumbnail"),
  fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

const searchCache = sqliteTable("search_cache", {
  query: text("query").primaryKey(),
  results: text("results", { mode: "json" }).notNull(), // serialized product array
  fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});
```

### TTL Strategy

| Data Type                                | TTL        | Rationale                                      |
| ---------------------------------------- | ---------- | ---------------------------------------------- |
| Search results                           | 30 minutes | Product catalog doesn't change frequently      |
| Size-specific prices                     | 15 minutes | Prices shift throughout the day on StockX/GOAT |
| eBay listing prices                      | 1 hour     | eBay BIN prices are more stable                |
| Product metadata (name, image, colorway) | 24 hours   | Rarely changes                                 |
| Fee calculations                         | 7 days     | Fee structures change quarterly at most        |

### Lookup Flow

```
User searches "Jordan 1 Retro"
  |
  v
Check searchCache for query (case-insensitive, trimmed)
  |
  +-- HIT (not expired) --> Return cached results immediately
  |
  +-- MISS or EXPIRED -->
        |
        v
      Fetch from APIs (StockX/GOAT via Rust HTTP, eBay via Browse API)
        |
        v
      Store in searchCache + priceCache
        |
        v
      Return fresh results
```

### API Failure Handling

```typescript
interface PricingResult {
  prices: SneakerPrice[];
  source: "live" | "cached";
  fetchedAt: Date;
  stale: boolean; // true if cache is expired but API failed
  error?: string; // if API failed, explain why
}
```

When an API call fails:

1. Check cache for any data (even expired)
2. If expired cache exists, return it with `source: 'cached'`, `stale: true`, and `fetchedAt` showing last successful fetch
3. UI shows: "Prices from 2h ago - unable to refresh" with a retry button
4. If no cache exists and API fails, show "Price unavailable" with manual entry option

### Background Refresh

For items in the user's inventory/watchlist, run background price refreshes:

- Every 15 minutes for actively viewed items
- Every 1 hour for inventory items
- Every 6 hours for watchlist items
- Respect rate limits: batch requests, add jitter to prevent thundering herd

---

## 4. Fee Calculation Engine

### eBay Fees (2026)

```typescript
interface EbayFeeConfig {
  // Final Value Fees by category (percentage of total sale including shipping)
  finalValueFee: {
    sneakersOver100: { noStore: 0.08; basicStore: 0.07 };
    sneakersUnder100: { noStore: 0.1255; basicStore: 0.117 };
    mostCategories: { belowThreshold: 0.1325; aboveThreshold: 0.0235 }; // threshold: $7,500
    booksMedia: { rate: 0.153 };
    // Add more categories as needed
  };
  // Per-order fee
  perOrderFee: {
    under10: 0.3;
    over10: 0.4;
  };
  // Insertion fees (first 250/month free)
  insertionFee: 0.35; // per listing after free allowance
  // Payment processing is INCLUDED in final value fee (eBay Managed Payments)
}

function calculateEbayFees(
  salePrice: number,
  category: string,
  hasStore: boolean,
): {
  finalValueFee: number;
  perOrderFee: number;
  totalFees: number;
  netPayout: number;
  effectiveRate: number;
} {
  let fvfRate: number;

  if (category === "sneakers") {
    if (salePrice >= 100) {
      fvfRate = hasStore ? 0.07 : 0.08;
    } else {
      fvfRate = hasStore ? 0.117 : 0.1255;
    }
  } else {
    // Most categories
    if (salePrice <= 7500) {
      fvfRate = 0.1325;
    } else {
      // 13.25% on first $7,500, 2.35% on remainder
      const feeBelow = 7500 * 0.1325;
      const feeAbove = (salePrice - 7500) * 0.0235;
      const totalFvf = feeBelow + feeAbove;
      const perOrder = salePrice > 10 ? 0.4 : 0.3;
      const totalFees = totalFvf + perOrder;
      return {
        finalValueFee: totalFvf,
        perOrderFee: perOrder,
        totalFees,
        netPayout: salePrice - totalFees,
        effectiveRate: totalFees / salePrice,
      };
    }
  }

  const finalValueFee = salePrice * fvfRate;
  const perOrderFee = salePrice > 10 ? 0.4 : 0.3;
  const totalFees = finalValueFee + perOrderFee;

  return {
    finalValueFee,
    perOrderFee,
    totalFees,
    netPayout: salePrice - totalFees,
    effectiveRate: totalFees / salePrice,
  };
}
```

### StockX Fees (2026)

```typescript
interface StockXFeeConfig {
  // Transaction fee by seller level
  transactionFee: {
    level1: 0.09; // 9%
    level2: 0.085; // 8.5% (interpolated)
    level3: 0.08; // 8%
    level4: 0.075; // 7.5% (interpolated)
    level5: 0.07; // 7%
  };
  // Performance bonuses (can stack)
  quickShipDiscount: 0.01; // -1% for shipping within 36 hours (Levels 3-5)
  successfulShipDiscount: 0.01; // -1% for 95%+ on-time shipping (Levels 3-5)
  // Payment processing
  paymentProcessing: 0.03; // 3% (sometimes waived as promotion)
  // Shipping: prepaid label cost deducted from payout (varies ~$5-15)
}

function calculateStockXFees(
  salePrice: number,
  sellerLevel: 1 | 2 | 3 | 4 | 5,
  hasQuickShip: boolean,
  hasSuccessfulShip: boolean,
  paymentProcessingWaived: boolean,
  shippingCost: number = 13.95, // default US shipping
): {
  transactionFee: number;
  paymentProcessingFee: number;
  shippingCost: number;
  totalFees: number;
  netPayout: number;
  effectiveRate: number;
} {
  const txRates: Record<number, number> = {
    1: 0.09,
    2: 0.085,
    3: 0.08,
    4: 0.075,
    5: 0.07,
  };

  let txRate = txRates[sellerLevel];

  // Performance discounts only for Level 3+
  if (sellerLevel >= 3) {
    if (hasQuickShip) txRate -= 0.01;
    if (hasSuccessfulShip) txRate -= 0.01;
  }

  txRate = Math.max(txRate, 0.05); // floor at 5%

  const transactionFee = salePrice * txRate;
  const paymentProcessingFee = paymentProcessingWaived ? 0 : salePrice * 0.03;
  const totalFees = transactionFee + paymentProcessingFee + shippingCost;

  return {
    transactionFee,
    paymentProcessingFee,
    shippingCost,
    totalFees,
    netPayout: salePrice - totalFees,
    effectiveRate: totalFees / salePrice,
  };
}
```

### GOAT Fees (2026)

```typescript
interface GoatFeeConfig {
  // Commission by seller rating
  commission: {
    rating90Plus: 0.095; // 9.5%
    rating70to89: 0.15; // 15%
    rating50to69: 0.2; // 20%
    ratingBelow50: 0.25; // 25%
  };
  // Canadian seller surcharge
  canadianSurcharge: 0.029; // +2.9%

  // Flat seller fee per sale (varies by location)
  sellerFee: { min: 5; max: 30; defaultUS: 5 };

  // Cash-out fee on withdrawal
  cashOutFee: 0.029; // 2.9% (some locations 3.1%)

  // GOAT Clean consignment
  cleanConsignment: {
    under350: 0.3; // 30%
    over350: 0.25; // 25%
  };
}

function calculateGoatFees(
  salePrice: number,
  sellerRating: number,
  isCanadian: boolean = false,
  sellerFee: number = 5, // $5-$30, varies by location
  cashOutRate: number = 0.029,
): {
  commissionFee: number;
  sellerFee: number;
  cashOutFee: number;
  totalFees: number;
  netPayout: number;
  effectiveRate: number;
} {
  let commissionRate: number;
  if (sellerRating >= 90) commissionRate = 0.095;
  else if (sellerRating >= 70) commissionRate = 0.15;
  else if (sellerRating >= 50) commissionRate = 0.2;
  else commissionRate = 0.25;

  if (isCanadian) commissionRate += 0.029;

  const commissionFee = salePrice * commissionRate;
  const afterCommission = salePrice - commissionFee - sellerFee;
  const cashOutFee = afterCommission * cashOutRate;
  const totalFees = commissionFee + sellerFee + cashOutFee;

  return {
    commissionFee,
    sellerFee,
    cashOutFee,
    totalFees,
    netPayout: salePrice - totalFees,
    effectiveRate: totalFees / salePrice,
  };
}
```

### Unified Fee Calculator

```typescript
type Platform = "ebay" | "stockx" | "goat";

interface FlipCalculation {
  platform: Platform;
  salePrice: number;
  totalFees: number;
  netPayout: number;
  effectiveRate: number;
  purchasePrice: number;
  profit: number;
  roi: number; // percentage
}

function calculateFlip(
  purchasePrice: number,
  salePrices: Record<Platform, number>,
  feeConfigs: {
    ebay: { category: string; hasStore: boolean };
    stockx: {
      level: 1 | 2 | 3 | 4 | 5;
      quickShip: boolean;
      successfulShip: boolean;
      processingWaived: boolean;
    };
    goat: { rating: number; isCanadian: boolean; sellerFee: number };
  },
): FlipCalculation[] {
  const results: FlipCalculation[] = [];

  for (const [platform, salePrice] of Object.entries(salePrices)) {
    let fees: { totalFees: number; netPayout: number; effectiveRate: number };

    switch (platform) {
      case "ebay":
        fees = calculateEbayFees(
          salePrice,
          feeConfigs.ebay.category,
          feeConfigs.ebay.hasStore,
        );
        break;
      case "stockx":
        fees = calculateStockXFees(
          salePrice,
          feeConfigs.stockx.level,
          feeConfigs.stockx.quickShip,
          feeConfigs.stockx.successfulShip,
          feeConfigs.stockx.processingWaived,
        );
        break;
      case "goat":
        fees = calculateGoatFees(
          salePrice,
          feeConfigs.goat.rating,
          feeConfigs.goat.isCanadian,
          feeConfigs.goat.sellerFee,
        );
        break;
      default:
        continue;
    }

    const profit = fees.netPayout - purchasePrice;
    results.push({
      platform: platform as Platform,
      salePrice,
      totalFees: fees.totalFees,
      netPayout: fees.netPayout,
      effectiveRate: fees.effectiveRate,
      purchasePrice,
      profit,
      roi: (profit / purchasePrice) * 100,
    });
  }

  return results.sort((a, b) => b.profit - a.profit); // Best profit first
}
```

### Shipping Cost Estimation

- **eBay**: Seller sets shipping. Common: Free shipping (baked into price) or USPS Priority ~$8-15.
- **StockX**: Prepaid label deducted from payout. ~$13.95 US standard.
- **GOAT**: Included in seller fee for most cases. Prepaid label provided.

For the calculator, use configurable defaults:

```typescript
const defaultShipping = {
  ebay: 0, // Most sneaker sellers do free shipping (included in price)
  stockx: 13.95, // Deducted from payout
  goat: 0, // Covered by seller fee
};
```

### Tax Considerations

- **Sales tax on purchase**: User's cost basis. Not a marketplace fee. User should input their actual purchase price including tax.
- **Marketplace fees are not taxed**: StockX/GOAT/eBay fees are deducted pre-payout. No tax on fees.
- **Income tax**: Profit is taxable income. BottingOS should NOT try to calculate this - just track gross profit. Users handle taxes themselves.

---

## 5. Tauri Integration Pattern

### Architecture Overview

```
Next.js Frontend (Static Export in Tauri WebView)
  |
  | invoke('search_sneakers', { query, limit })
  | invoke('search_ebay', { query, limit })
  | invoke('get_cached_prices', { styleId })
  |
  v
Tauri IPC Bridge
  |
  v
Rust Backend (src-tauri/src/)
  |
  +-- pricing/
  |     +-- mod.rs        (command registration)
  |     +-- stockx.rs     (StockX HTTP scraping)
  |     +-- goat.rs       (GOAT HTTP scraping)
  |     +-- flightclub.rs (FlightClub HTTP scraping)
  |     +-- ebay.rs       (eBay Browse API - official)
  |     +-- cache.rs      (SQLite cache layer)
  |     +-- fees.rs       (Fee calculations)
  |
  +-- db/
        +-- mod.rs        (SQLite connection via rusqlite or sqlx)
```

### Tauri Command Registration

```rust
// src-tauri/src/main.rs
mod pricing;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init()) // for reqwest re-export
        .invoke_handler(tauri::generate_handler![
            pricing::search_sneakers,
            pricing::search_ebay,
            pricing::get_product_prices,
            pricing::calculate_fees,
            pricing::get_cached_prices,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### HTTP Client Setup (Rust)

```rust
// src-tauri/src/pricing/mod.rs
use reqwest::Client;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct PricingState {
    pub http_client: Client,
    pub ebay_token: Arc<Mutex<Option<EbayTokenCache>>>,
}

struct EbayTokenCache {
    token: String,
    expires_at: std::time::Instant,
}

impl PricingState {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
            .build()
            .expect("failed to build HTTP client");

        Self {
            http_client: client,
            ebay_token: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn get_ebay_token(&self, client_id: &str, client_secret: &str) -> Result<String, String> {
        let mut cached = self.ebay_token.lock().await;
        if let Some(ref cache) = *cached {
            if cache.expires_at > std::time::Instant::now() {
                return Ok(cache.token.clone());
            }
        }

        let token = get_ebay_app_token(client_id, client_secret).await?;
        let expires_at = std::time::Instant::now()
            + std::time::Duration::from_secs(token.expires_in - 300); // refresh 5min early

        let token_str = token.access_token.clone();
        *cached = Some(EbayTokenCache {
            token: token.access_token,
            expires_at,
        });

        Ok(token_str)
    }
}
```

### Frontend Service Layer

```typescript
// src/services/pricing.ts
import { invoke } from "@tauri-apps/api/core";

export interface PriceResult {
  platform: "stockx" | "goat" | "flightclub" | "ebay";
  prices: { size: string; price: number }[];
  lowestPrice: number;
  source: "live" | "cached";
  fetchedAt: string;
  stale: boolean;
}

export interface FlipResult {
  platform: string;
  salePrice: number;
  fees: number;
  netPayout: number;
  profit: number;
  roi: number;
}

export const PricingService = {
  async searchProducts(query: string, limit = 10) {
    return invoke<SneakerProduct[]>("search_sneakers", { query, limit });
  },

  async getProductPrices(styleId: string) {
    return invoke<PriceResult[]>("get_product_prices", { styleId });
  },

  async searchEbay(query: string, limit = 20) {
    return invoke<EbaySearchResponse>("search_ebay", { query, limit });
  },

  async calculateFlip(
    purchasePrice: number,
    styleId: string,
    userConfig: FeeConfig,
  ) {
    return invoke<FlipResult[]>("calculate_fees", {
      purchasePrice,
      styleId,
      config: userConfig,
    });
  },
};
```

### No CORS Issues

A major advantage of routing all API calls through Tauri's Rust backend: **zero CORS problems**. The Rust HTTP client makes requests without browser CORS restrictions. The frontend never touches external APIs directly.

---

## 6. Implementation Priority

1. **Fee calculation engine** (pure logic, no API calls, testable immediately)
2. **eBay Browse API** (official, well-documented, reliable)
3. **StockX price scraping in Rust** (reverse-engineer Sneaks-API approach)
4. **GOAT/FlightClub price scraping in Rust** (same pattern)
5. **SQLite caching layer** (Drizzle schema + cache logic)
6. **eBay OAuth Authorization Code flow** (for order tracking, Phase 2)

---

## Sources

- [Sneaks-API - GitHub](https://github.com/druv5319/Sneaks-API)
- [Sneaks-API - npm](https://www.npmjs.com/package/sneaks-api)
- [Sneaks-API 2.0 Fork](https://github.com/aryan-chakrabarti/Sneaks-API-2.0)
- [KicksDB - Modern Sneaker Database API](https://kicks.dev/)
- [eBay Client Credentials Grant](https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html)
- [eBay Browse API - search endpoint](https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search)
- [eBay Browse API - ItemSummary type](https://developer.ebay.com/api-docs/buy/browse/types/gct:ItemSummary)
- [eBay Notification API Overview](https://developer.ebay.com/api-docs/buy/notification/overview.html)
- [eBay ItemSold notification](https://developer.ebay.com/api-docs/static/pn_item-sold.html)
- [eBay Seller Fees 2026](https://taxomate.com/blog/ebay-seller-fees)
- [eBay Sneaker Fees](https://blog.vendoo.co/ebay-sneaker-fees-explained)
- [eBay Sneakers Fee FAQs](https://pages.ebay.com/sneakersfeechart/)
- [eBay Complete Fee Guide 2026](https://www.underpriced.app/blog/ebay-fees-complete-guide-2026)
- [StockX Seller Program Updates](https://stockx.com/news/updates-to-the-stockx-seller-program/)
- [StockX Fee Calculator - Investomatica](https://investomatica.com/stockx-calculator)
- [StockX Seller Fees - TopBubbleIndex](https://www.topbubbleindex.com/blog/stockx-seller-fees/)
- [StockX Flex Payout Fees](https://stockx.com/news/understanding-flex-payouts-fees/)
- [GOAT Fee Policy](https://www.goat.com/fees)
- [GOAT Commission Info](https://support.goat.com/hc/en-us/articles/115004770888)
- [GOAT Fee Calculator](https://sellerfeescalculator.com/goat-fee-calculator)
- [Tauri v2 - Calling Rust from Frontend](https://v2.tauri.app/develop/calling-rust/)
- [Tauri v2 - HTTP Client Plugin](https://v2.tauri.app/plugin/http-client/)
- [Tauri v2 - Node.js Sidecar](https://v2.tauri.app/learn/sidecar-nodejs/)
- [Adding Node.js Sidecar to Tauri](https://dev.to/zaid_sunasra/adding-nodejs-server-to-tauri-app-as-a-sidecar-509j)
- [hendt/ebay-api - npm](https://github.com/hendt/ebay-api)
