use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use base64::Engine;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductResult {
    pub id: String,
    pub name: String,
    pub style_id: String,
    pub brand: String,
    pub colorway: String,
    pub thumbnail: String,
    pub retail_price: f64,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SizePrice {
    pub size: String,
    pub lowest_ask: f64,
    pub highest_bid: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PriceData {
    pub lowest_ask: f64,
    pub highest_bid: f64,
    pub last_sale: f64,
    pub sizes: Vec<SizePrice>,
    pub source: String,
    pub fetched_at: String,
    pub stale: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EbayPrice {
    pub value: String,
    pub currency: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EbayImage {
    pub image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EbayItemSummary {
    pub item_id: String,
    pub title: String,
    pub price: EbayPrice,
    pub condition: Option<String>,
    pub item_web_url: String,
    pub image: Option<EbayImage>,
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_TTL_SECS: u64 = 15 * 60; // 15 minutes

struct CacheEntry<T> {
    data: T,
    inserted_at: Instant,
}

impl<T: Clone> CacheEntry<T> {
    fn new(data: T) -> Self {
        Self {
            data,
            inserted_at: Instant::now(),
        }
    }

    fn is_fresh(&self) -> bool {
        self.inserted_at.elapsed() < Duration::from_secs(CACHE_TTL_SECS)
    }
}

// ---------------------------------------------------------------------------
// eBay Token
// ---------------------------------------------------------------------------

struct EbayTokenCache {
    access_token: String,
    expires_at: Instant,
}

// ---------------------------------------------------------------------------
// Managed State
// ---------------------------------------------------------------------------

pub struct PricingState {
    http_client: Client,
    ebay_token: Arc<Mutex<Option<EbayTokenCache>>>,
    search_cache: Arc<Mutex<HashMap<String, CacheEntry<Vec<ProductResult>>>>>,
    price_cache: Arc<Mutex<HashMap<String, CacheEntry<PriceData>>>>,
}

impl PricingState {
    pub fn new() -> Self {
        let http_client = Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
            .timeout(Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        Self {
            http_client,
            ebay_token: Arc::new(Mutex::new(None)),
            search_cache: Arc::new(Mutex::new(HashMap::new())),
            price_cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// ---------------------------------------------------------------------------
// StockX
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct StockXBrowseResponse {
    #[serde(rename = "Products")]
    products: Option<Vec<StockXProduct>>,
}

#[derive(Deserialize)]
struct StockXProduct {
    #[serde(rename = "objectID", default)]
    object_id: String,
    #[serde(default)]
    title: String,
    #[serde(rename = "styleId", default)]
    style_id: String,
    #[serde(default)]
    brand: String,
    #[serde(default)]
    colorway: String,
    #[serde(rename = "thumbnail_url", default)]
    thumbnail_url: String,
    #[serde(rename = "retailPrice", default)]
    retail_price: f64,
}

async fn stockx_search(client: &Client, query: &str, limit: usize) -> Result<Vec<ProductResult>, String> {
    let url = format!(
        "https://stockx.com/api/browse?&_search={}&page=1&resultsPerPage={}",
        urlencoding::encode(query),
        limit
    );

    let resp = client
        .get(&url)
        .header("accept", "application/json")
        .header("app-platform", "Iron")
        .header("app-version", "2024.12.16.1")
        .send()
        .await
        .map_err(|e| format!("StockX search failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("StockX returned status {}", resp.status()));
    }

    let body: StockXBrowseResponse = resp
        .json()
        .await
        .map_err(|e| format!("StockX parse error: {}", e))?;

    let products = body.products.unwrap_or_default();
    Ok(products
        .into_iter()
        .map(|p| ProductResult {
            id: p.object_id,
            name: p.title,
            style_id: p.style_id,
            brand: p.brand,
            colorway: p.colorway,
            thumbnail: p.thumbnail_url,
            retail_price: p.retail_price,
            source: "stockx".into(),
        })
        .collect())
}

async fn stockx_get_prices(client: &Client, style_id: &str) -> Result<PriceData, String> {
    let url = format!(
        "https://stockx.com/api/products/{}?includes=market",
        urlencoding::encode(style_id)
    );

    let resp = client
        .get(&url)
        .header("accept", "application/json")
        .header("app-platform", "Iron")
        .header("app-version", "2024.12.16.1")
        .send()
        .await
        .map_err(|e| format!("StockX price fetch failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("StockX prices returned status {}", resp.status()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("StockX price parse error: {}", e))?;

    let product = body.get("Product").unwrap_or(&body);
    let market = product.get("market").unwrap_or(&serde_json::Value::Null);

    let lowest_ask = market
        .get("lowestAsk")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let highest_bid = market
        .get("highestBid")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let last_sale = market
        .get("lastSale")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    // Extract size-level data from children if available
    let mut sizes: Vec<SizePrice> = Vec::new();
    if let Some(children) = product.get("children").and_then(|c| c.as_object()) {
        for (_key, child) in children {
            let size = child
                .get("shoeSize")
                .and_then(|s| s.as_str())
                .unwrap_or("")
                .to_string();
            let child_market = child.get("market").unwrap_or(&serde_json::Value::Null);
            let ask = child_market
                .get("lowestAsk")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let bid = child_market
                .get("highestBid")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            if !size.is_empty() {
                sizes.push(SizePrice {
                    size,
                    lowest_ask: ask,
                    highest_bid: bid,
                });
            }
        }
    }

    sizes.sort_by(|a, b| {
        a.size
            .parse::<f64>()
            .unwrap_or(0.0)
            .partial_cmp(&b.size.parse::<f64>().unwrap_or(0.0))
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(PriceData {
        lowest_ask,
        highest_bid,
        last_sale,
        sizes,
        source: "stockx".into(),
        fetched_at: chrono_now(),
        stale: false,
    })
}

// ---------------------------------------------------------------------------
// GOAT
// ---------------------------------------------------------------------------

async fn goat_search(client: &Client, query: &str, limit: usize) -> Result<Vec<ProductResult>, String> {
    let url = format!(
        "https://ac.cnstrc.com/search/{}?c=ciojs-client-2.35.2&key=key_XT7bjdbvjgECO5d8&i=2c2d2ba6-8735-4ed8-bb53-fb98e9a3d2b8&s=4&num_results_per_page={}&page=1&features[display_variants]=true",
        urlencoding::encode(query),
        limit
    );

    let resp = client
        .get(&url)
        .header("accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("GOAT search failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GOAT returned status {}", resp.status()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("GOAT parse error: {}", e))?;

    let results = body
        .get("response")
        .and_then(|r| r.get("results"))
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();

    Ok(results
        .into_iter()
        .filter_map(|item| {
            let data = item.get("data")?;
            Some(ProductResult {
                id: data
                    .get("id")
                    .and_then(|v| v.as_u64())
                    .map(|v| v.to_string())
                    .unwrap_or_default(),
                name: data
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                style_id: data
                    .get("sku")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                brand: data
                    .get("brand_name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                colorway: data
                    .get("colorway")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                thumbnail: data
                    .get("main_picture_url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                retail_price: data
                    .get("retail_price_cents")
                    .and_then(|v| v.as_u64())
                    .map(|v| v as f64 / 100.0)
                    .unwrap_or(0.0),
                source: "goat".into(),
            })
        })
        .collect())
}

async fn goat_get_prices(client: &Client, style_id: &str) -> Result<PriceData, String> {
    // GOAT uses the same Constructor.io endpoint for product detail
    let url = format!(
        "https://ac.cnstrc.com/search/{}?c=ciojs-client-2.35.2&key=key_XT7bjdbvjgECO5d8&i=2c2d2ba6-8735-4ed8-bb53-fb98e9a3d2b8&s=4&num_results_per_page=1&page=1",
        urlencoding::encode(style_id)
    );

    let resp = client
        .get(&url)
        .header("accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("GOAT price fetch failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("GOAT prices returned status {}", resp.status()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("GOAT price parse error: {}", e))?;

    let results = body
        .get("response")
        .and_then(|r| r.get("results"))
        .and_then(|r| r.as_array())
        .cloned()
        .unwrap_or_default();

    let first = results.first().and_then(|r| r.get("data"));

    let lowest_ask = first
        .and_then(|d| d.get("lowest_price_cents"))
        .and_then(|v| v.as_u64())
        .map(|v| v as f64 / 100.0)
        .unwrap_or(0.0);

    Ok(PriceData {
        lowest_ask,
        highest_bid: 0.0,
        last_sale: 0.0,
        sizes: Vec::new(),
        source: "goat".into(),
        fetched_at: chrono_now(),
        stale: false,
    })
}

// ---------------------------------------------------------------------------
// eBay
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct EbayTokenResponse {
    access_token: String,
    expires_in: u64,
}

async fn ebay_get_token(
    client: &Client,
    client_id: &str,
    client_secret: &str,
) -> Result<(String, u64), String> {
    let credentials = base64::engine::general_purpose::STANDARD
        .encode(format!("{}:{}", client_id, client_secret));

    let resp = client
        .post("https://api.ebay.com/identity/v1/oauth2/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("Authorization", format!("Basic {}", credentials))
        .body("grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope")
        .send()
        .await
        .map_err(|e| format!("eBay token request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("eBay token returned status {}", resp.status()));
    }

    let token: EbayTokenResponse = resp
        .json()
        .await
        .map_err(|e| format!("eBay token parse error: {}", e))?;

    Ok((token.access_token, token.expires_in))
}

async fn get_or_refresh_ebay_token(
    state: &PricingState,
    client_id: &str,
    client_secret: &str,
) -> Result<String, String> {
    let mut guard = state.ebay_token.lock().await;

    if let Some(ref cached) = *guard {
        // Refresh 5 minutes before expiry
        if cached.expires_at > Instant::now() + Duration::from_secs(300) {
            return Ok(cached.access_token.clone());
        }
    }

    let (access_token, expires_in) =
        ebay_get_token(&state.http_client, client_id, client_secret).await?;

    *guard = Some(EbayTokenCache {
        access_token: access_token.clone(),
        expires_at: Instant::now() + Duration::from_secs(expires_in),
    });

    Ok(access_token)
}

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn search_products(
    state: State<'_, PricingState>,
    query: String,
    limit: usize,
) -> Result<Vec<ProductResult>, String> {
    let cache_key = format!("search:{}:{}", query.to_lowercase().trim(), limit);

    // Check cache
    {
        let cache = state.search_cache.lock().await;
        if let Some(entry) = cache.get(&cache_key) {
            if entry.is_fresh() {
                return Ok(entry.data.clone());
            }
        }
    }

    // Fetch from StockX and GOAT in parallel
    let client = &state.http_client;
    let (stockx_result, goat_result) = tokio::join!(
        stockx_search(client, &query, limit),
        goat_search(client, &query, limit)
    );

    let mut results: Vec<ProductResult> = Vec::new();

    match stockx_result {
        Ok(products) => results.extend(products),
        Err(e) => log::warn!("StockX search failed: {}", e),
    }

    match goat_result {
        Ok(products) => results.extend(products),
        Err(e) => log::warn!("GOAT search failed: {}", e),
    }

    // If we got zero results and have stale cache, return stale
    if results.is_empty() {
        let cache = state.search_cache.lock().await;
        if let Some(entry) = cache.get(&cache_key) {
            return Ok(entry.data.clone());
        }
    }

    // Update cache
    {
        let mut cache = state.search_cache.lock().await;
        cache.insert(cache_key, CacheEntry::new(results.clone()));
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_product_prices(
    state: State<'_, PricingState>,
    style_id: String,
    source: String,
) -> Result<PriceData, String> {
    let cache_key = format!("price:{}:{}", source, style_id);

    // Check cache
    {
        let cache = state.price_cache.lock().await;
        if let Some(entry) = cache.get(&cache_key) {
            if entry.is_fresh() {
                return Ok(entry.data.clone());
            }
        }
    }

    let client = &state.http_client;
    let result = match source.as_str() {
        "stockx" => stockx_get_prices(client, &style_id).await,
        "goat" => goat_get_prices(client, &style_id).await,
        _ => Err(format!("Unknown source: {}", source)),
    };

    match result {
        Ok(data) => {
            let mut cache = state.price_cache.lock().await;
            cache.insert(cache_key, CacheEntry::new(data.clone()));
            Ok(data)
        }
        Err(e) => {
            // Return stale cache if available
            let cache = state.price_cache.lock().await;
            if let Some(entry) = cache.get(&cache_key) {
                let mut stale_data = entry.data.clone();
                stale_data.stale = true;
                return Ok(stale_data);
            }
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn search_ebay(
    state: State<'_, PricingState>,
    query: String,
    limit: u32,
    client_id: Option<String>,
    client_secret: Option<String>,
) -> Result<Vec<EbayItemSummary>, String> {
    let cid = client_id.unwrap_or_default();
    let csecret = client_secret.unwrap_or_default();

    if cid.is_empty() || csecret.is_empty() {
        return Err("eBay API credentials not configured. Set client_id and client_secret in Settings.".into());
    }

    let token = get_or_refresh_ebay_token(&state, &cid, &csecret).await?;

    let url = format!(
        "https://api.ebay.com/buy/browse/v1/item_summary/search?q={}&limit={}&filter=buyingOptions:{{FIXED_PRICE}}",
        urlencoding::encode(&query),
        limit.min(200)
    );

    let resp = state
        .http_client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("X-EBAY-C-MARKETPLACE-ID", "EBAY_US")
        .send()
        .await
        .map_err(|e| format!("eBay search failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("eBay search returned status {}", resp.status()));
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct EbaySearchResponse {
        item_summaries: Option<Vec<EbayItemSummary>>,
    }

    let body: EbaySearchResponse = resp
        .json()
        .await
        .map_err(|e| format!("eBay parse error: {}", e))?;

    Ok(body.item_summaries.unwrap_or_default())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn chrono_now() -> String {
    // Simple ISO-ish timestamp without chrono crate
    let dur = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}Z", dur.as_secs())
}
