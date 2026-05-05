# Task 3.1: Rust Pricing Backend

## Objective

Build Tauri Rust commands that fetch sneaker/product prices from StockX, GOAT, FlightClub, and eBay. All HTTP requests go through Rust to bypass CORS. Results cached in-memory with 15-minute TTL.

## Context

BottingOS needs real-time pricing from multiple marketplaces for the flip calculator and price comparison features. Sneaks-API's approach (HTTP requests to internal marketplace APIs) is ported to Rust using reqwest. eBay uses the official Browse API with Client Credentials OAuth. No Node.js sidecar - pure Rust HTTP.

Anti-bot protection is a concern for StockX (HUMAN Security/PerimeterX). GOAT and FlightClub are less aggressive. Use browser-like User-Agent headers and respect rate limits. If scraping breaks, KicksDB (kicks.dev) is the paid fallback.

## Dependencies

- reqwest crate (HTTP client)
- serde/serde_json (serialization)
- tokio (async runtime - already in Cargo.toml)
- urlencoding crate
- base64 crate (for eBay OAuth)

## Blocked By

- Task 1.2 (Tauri Rust command registration pattern must exist)
- NOTE: This task is pure Rust with no frontend dependencies. It can start as soon as Task 1.2 establishes the Tauri command pattern, even while Phase 2 UI work continues in parallel.

## Research Findings

From `pricing-apis-implementation.md`:

- StockX search endpoint: `https://stockx.com/api/browse?&_search={query}&page=1&resultsPerPage={limit}` - uses Algolia-powered search
- GOAT: mobile API endpoints, less documented, reverse-engineer from Sneaks-API source
- FlightClub: owned by GOAT, shares infrastructure
- eBay Browse API: `GET https://api.ebay.com/buy/browse/v1/item_summary/search` with `Bearer` token
- eBay OAuth: POST to `https://api.ebay.com/identity/v1/oauth2/token` with base64-encoded client_id:client_secret, scope `https://api.ebay.com/oauth/api_scope`
- eBay token TTL: 7200 seconds (2 hours), cache and refresh 5 min early
- eBay rate limit: 5000 requests/day per application
- No sold/completed listing data from eBay Browse API - active listings only

From `marketplace-apis.md`:

- StockX official API exists but market data is buggy; scraping is more reliable
- GOAT has NO official API - all access is unofficial
- Sneaks-API npm package last updated 4+ years ago - fragile

## Implementation Plan

### Step 1: Create pricing module structure

```
src-tauri/src/commands/pricing.rs  (main module)
```

Or split into submodules if complexity warrants:

```
src-tauri/src/commands/pricing/
  mod.rs
  stockx.rs
  goat.rs
  flightclub.rs
  ebay.rs
  cache.rs
  types.rs
```

### Step 2: Define shared types

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductResult {
    pub id: String,
    pub name: String,
    pub style_id: String,
    pub brand: String,
    pub colorway: String,
    pub thumbnail: String,
    pub retail_price: f64,
    pub source: String, // "stockx", "goat", "flightclub", "ebay"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PriceData {
    pub lowest_ask: f64,
    pub highest_bid: f64,
    pub last_sale: f64,
    pub sizes: Vec<SizePrice>,
    pub source: String,
    pub fetched_at: String, // ISO timestamp
    pub stale: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SizePrice {
    pub size: String,
    pub lowest_ask: f64,
    pub highest_bid: f64,
}
```

### Step 3: Build PricingState with shared HTTP client and cache

```rust
pub struct PricingState {
    pub http_client: Client,
    pub ebay_token: Arc<Mutex<Option<EbayTokenCache>>>,
    pub search_cache: Arc<Mutex<HashMap<String, CacheEntry<Vec<ProductResult>>>>>,
    pub price_cache: Arc<Mutex<HashMap<String, CacheEntry<PriceData>>>>,
}
```

- Cache entries include `fetched_at` timestamp and 15-min TTL
- Return stale cache on API failure with `stale: true` flag

### Step 4: Implement StockX search and price fetch

- Reverse-engineer endpoints from Sneaks-API source code
- Use reqwest with browser-like headers
- Parse JSON response into ProductResult/PriceData

### Step 5: Implement GOAT search and price fetch

- Reverse-engineer GOAT mobile API endpoints
- Less aggressive anti-bot, simpler implementation

### Step 6: Implement FlightClub price fetch

- Shares GOAT infrastructure
- Supplementary pricing data

### Step 7: Implement eBay Browse API

- Client Credentials OAuth flow (no user login needed)
- Token caching with 2-hour TTL (refresh 5 min early)
- Search endpoint with category filters
- eBay credentials stored via tauri-plugin-store

### Step 8: Register commands in lib.rs

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::pricing::search_products,
    commands::pricing::get_product_prices,
    commands::pricing::search_ebay,
])
```

### Step 9: Manage PricingState

```rust
.manage(PricingState::new())
```

## Files to Create

- `src-tauri/src/commands/pricing.rs` (or `pricing/` module directory)

## Files to Modify

- `src-tauri/src/commands/mod.rs` - add `pub mod pricing;`
- `src-tauri/src/lib.rs` - register new commands in invoke_handler, manage PricingState
- `src-tauri/Cargo.toml` - ensure reqwest, urlencoding, base64 crates are present (likely already there)

## Contracts

### Provides

**Tauri Commands:**

```
search_products(query: String, limit: usize) -> Result<Vec<ProductResult>, String>
get_product_prices(style_id: String, source: String) -> Result<PriceData, String>
search_ebay(query: String, limit: u32) -> Result<Vec<EbayItemSummary>, String>
```

**TypeScript invoke signatures:**

```typescript
invoke<ProductResult[]>("search_products", { query: string, limit: number });
invoke<PriceData>("get_product_prices", { styleId: string, source: string });
invoke<EbayItemSummary[]>("search_ebay", { query: string, limit: number });
```

### Consumes

- tauri-plugin-store for eBay API credentials (client_id, client_secret)
- Tauri managed state for PricingState

## Acceptance Criteria

1. `search_products("Jordan 1", 10)` returns results from StockX with name, style_id, thumbnail, retail_price
2. `get_product_prices("554724-134", "stockx")` returns size-by-size ask/bid prices
3. `search_ebay("Nike Dunk Low", 20)` returns active eBay listings with prices
4. Cache hit returns instantly without HTTP request
5. API failure returns stale cache with `stale: true` if available, error string if not
6. eBay OAuth token auto-refreshes before expiry
7. No CORS errors (all requests from Rust backend)
8. Response times < 3s for uncached requests

## Testing Protocol

### Unit Tests (Rust)

- Test cache TTL logic (insert, hit, miss after expiry)
- Test response parsing for each marketplace (use recorded JSON fixtures)
- Test eBay OAuth token refresh logic
- Test error handling when API returns non-200

### Browser/Playwright

- Search a product in the calculator, verify results populate
- Verify cached results load instantly on second search
- Verify graceful degradation when one marketplace is down

### Build Checks

- `cargo build` succeeds with no warnings
- `cargo clippy` passes
- `npx tauri build` produces working binary

## Skills to Read

- `.claude/skills/tauri-commands/SKILL.md` - IPC patterns, command registration, invoke usage

## Research Files to Read

- `.claude/orchestration-bottingos/research/pricing-apis-implementation.md` - full API details, endpoints, code samples
- `.claude/orchestration-bottingos/research/marketplace-apis.md` - API comparison, rate limits, TOS notes

## Git

- **Branch**: `feat/3.1-rust-pricing`
- **Commit prefix**: `[pricing]`
