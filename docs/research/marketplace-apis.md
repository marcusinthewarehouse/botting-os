# Marketplace APIs Research - BottingOS

**Researched**: 2026-03-07
**Status**: Complete
**Relevant PRD sections**: 2.1 (Flip Calculator), 3.6 (Advanced Profit Tracker), 3.7 (Inventory Manager), 3.12 (Marketplace Sync)

---

## 1. eBay API

### Overview

eBay has the most mature and developer-friendly API ecosystem of the three marketplaces. Free to use, well-documented, supports both read and write operations.

### Available APIs (relevant to BottingOS)

| API              | Purpose                                      | Auth Required                   | Cost |
| ---------------- | -------------------------------------------- | ------------------------------- | ---- |
| Browse API       | Search items, get pricing, product details   | Client Credentials (app token)  | FREE |
| Fulfillment API  | Order management, shipment tracking, refunds | Authorization Code (user token) | FREE |
| Inventory API    | Create/manage listings, inventory tracking   | Authorization Code (user token) | FREE |
| Notification API | Webhooks for sale events, item updates       | Authorization Code (user token) | FREE |
| Analytics API    | Rate limit monitoring, usage tracking        | Either                          | FREE |

### OAuth Flow

eBay supports two OAuth 2.0 flows:

1. **Client Credentials Grant** - For public data (Browse API searches). No user login needed. Mints an application-level token. Good for flip calculator pricing lookups.
2. **Authorization Code Grant** - For user-specific data (orders, inventory, listings). Requires user to authorize via eBay login popup. Returns access token (2-hour TTL) + refresh token. Needed for order tracking and inventory sync.

Scopes control what each token can access. Seller operations require the user to opt into eBay business policies first.

### Rate Limits

- **Browse API**: 5,000 requests/day default per application
- **OAuth token minting**: Separate daily limit per application
- **Can request increases** via Application Growth Check (free, manual review)
- 5,000/day = ~3.5 requests/minute. Sufficient for a desktop app with caching, but tight if polling frequently for many users.

### Pricing Data Capabilities

- **Active listings**: Full search by keyword, category, GTIN/UPC, ePID. Filter by condition, price range, format, location.
- **Sold/completed listings**: NOT available via Browse API. eBay restricts completed sales data to the Marketplace Insights API, which is only available to approved high-end developers (Terapeak-level). Regular developers cannot access historical sold prices via API.
- **Workaround for sold data**: Use active "Buy It Now" listings as price proxy, or scrape eBay sold listings (against TOS but commonly done).

### Webhook/Notification Support

eBay has real webhook support:

- Subscribe to events: `ITEM_SOLD`, `ITEM_CREATED`, `FixedPriceTransaction`, `AuctionCheckoutComplete`, `ItemMarkedPaid`
- Setup: Register endpoint, respond to challenge code verification, receive POST notifications
- Retries on failure, stops after too many unacknowledged notifications
- Requires HTTPS endpoint

### Seller Fee Structure (2026)

- **Final Value Fee**: 13.6% for most categories + $0.40 per order
- **Sneakers specifically**: eBay dropped sneaker selling fees to compete with StockX/GOAT (category-specific promotions)
- **Books/media**: 15.3%
- **Insertion fees**: First 250 listings/month free, then $0.35 each
- **Payment processing**: Included in final value fee (eBay Managed Payments)

### Recommendation for BottingOS

eBay is the strongest API story. Use Browse API (client credentials) for flip calculator pricing. Use Authorization Code flow for order/inventory sync. Webhooks for real-time sale notifications. All free.

**Limitation**: No sold price history via API. For the flip calculator, active listing prices are the best we can get officially. Consider caching aggressively (prices don't change that fast for most items).

---

## 2. StockX API

### Overview

StockX has an official public API, but it is limited, buggy, and requires manual approval. The unofficial/private GraphQL API has much more data but is against TOS. Third-party scraping services exist as a middle ground.

### Official API (developer.stockx.com)

| Feature                  | Status                       |
| ------------------------ | ---------------------------- |
| Product search           | Available                    |
| Product details by slug  | Available                    |
| Product variants (sizes) | Available                    |
| Market data (prices)     | Available but reported buggy |
| Order management         | Available (seller API)       |
| Catalog browsing         | Available                    |

### Authentication

- **OAuth 2.0 Authorization Code Flow**
- Must register application at developer.stockx.com
- Manual review and approval required - StockX reviews each application individually
- Approval tip: Provide comprehensive app description, have a publicly accessible website/app

### Rate Limits

- **25,000 requests/day**
- **1 request/second**
- These are generous for a desktop app. 1 req/sec is the real bottleneck for bulk operations.

### Pricing Data

- Official API: Market data endpoint exists but has been reported as buggy/unreliable
- Private GraphQL API: Much richer data (last sale, bid/ask spreads, price history, sales volume) but using it is against TOS
- Every StockX product page shows: last sale price, ask prices by size, bid prices by size, price history chart

### Anti-Scraping Measures

- **HUMAN Security (formerly PerimeterX)**: Advanced bot detection
- **Cloudflare CDN**: Cache/CDN layer, occasional bot challenges
- **JavaScript-heavy pages**: Dynamic content loading
- **IP monitoring**: Blocks datacenter IPs, requires residential proxies for scraping
- **TOS explicitly forbids**: "Use any bot, spider, crawler, scraper or other automated means"

### Webhook Support

- **No webhooks** in the official API
- Sale notifications only via StockX app/email
- Can set up IFTTT integrations for custom price alerts using the public API
- No real-time push notifications for sales

### Third-Party API Services

| Service          | What it does                                        | Cost                        |
| ---------------- | --------------------------------------------------- | --------------------------- |
| Piloterr         | Search + Product scraping APIs                      | Paid (free trial)           |
| Retailed.io      | Product + Prices + Search APIs                      | 50 free requests, then paid |
| Apify            | Full product/price scrapers                         | Pay per compute             |
| ScrapingBee      | General StockX scraper                              | Paid                        |
| Sneaks-API (npm) | Multi-platform pricing (StockX + GOAT + FlightClub) | FREE (open source)          |

### Seller Fee Structure (2026)

- **Transaction fee**: 7-10% based on seller level (new sellers start at 10%)
  - Level 1: ~9%
  - Level 5: ~8%
  - Bonuses: -1% for 95% on-time shipping, -1% for 80% quick ship (within 36 hours)
- **Payment processing**: 3% (currently waived as a promotion)
- **Shipping**: Calculated by StockX, seller has no control
- **Total effective fees**: ~10-13% for new sellers, ~7-8% for high-volume sellers with bonuses

### Recommendation for BottingOS

Use the **official API** for order management if approval is granted. For pricing data, the official market data endpoint is unreliable. Best approach: use the **Sneaks-API npm package** (free, open source, actively maintained as of Jan 2025) for pricing lookups. It scrapes StockX, GOAT, and FlightClub in one call. Cache results aggressively.

**Risk**: Sneaks-API could break if platforms change their internal APIs. Have a fallback plan (Retailed.io or direct scraping with residential proxies).

---

## 3. GOAT API

### Overview

GOAT has **no official public API** for third-party developers. No developer portal, no documentation, no OAuth integration. All programmatic access to GOAT data is unofficial.

### Available Access Methods

| Method                     | Type                          | Cost               | Reliability                                    |
| -------------------------- | ----------------------------- | ------------------ | ---------------------------------------------- |
| Sneaks-API (npm)           | Open source scraper           | FREE               | Medium - updated Jan 2025 for GOAT API changes |
| GOAT mobile API            | Unofficial reverse-engineered | FREE               | Low - can break anytime                        |
| Retailed.io                | Third-party scraper API       | 50 free, then paid | High                                           |
| Apify scrapers             | Cloud scraper actors          | Pay per compute    | High                                           |
| CommercialGoatAPI (GitHub) | Commercial wrapper            | Unclear            | Medium                                         |

### Pricing Data Available (via unofficial methods)

- Product search by keyword
- Product details (name, brand, images, colorway)
- Price by size (ask prices)
- Market trends (limited)
- No historical sold price data easily accessible

### Authentication

- No official OAuth or API key system
- Sneaks-API and similar tools work by reverse-engineering GOAT's internal mobile/web APIs
- GOAT's internal API endpoints change periodically (Sneaks-API had to update for this in v1.2.3)

### Anti-Scraping Measures

- Less aggressive than StockX
- Mobile API endpoints are the primary target for scrapers
- No PerimeterX-level bot protection reported
- Rate limiting on internal endpoints exists but is less strict

### Webhook Support

- **No webhooks whatsoever**
- No official notification system for developers
- Sale notifications only via GOAT app push notifications and email

### Seller Fee Structure (2026)

- **Commission**: 9.5% for sellers in good standing (rating >= 90)
  - 70-89 rating: 15%
  - 50-69 rating: 20%
  - Below 50: 25%
  - Canadian sellers: +2.9% on top of above rates
- **Seller fee**: $5-$30 flat fee per sale (varies by location)
- **Cash-out fee**: 2.9% on ACH/PayPal withdrawal (sometimes waived during promotions)
- **Total effective fees for good sellers**: ~12.4% (9.5% commission + 2.9% cash-out) + $5-30 flat
- **GOAT Clean consignment**: 25-30% commission (includes everything)

### Recommendation for BottingOS

Use **Sneaks-API** as the primary data source for GOAT pricing (same package handles StockX too). For any GOAT-specific needs beyond pricing, Retailed.io offers the most reliable paid option with a free trial.

**No order management integration possible** - there is no API to track GOAT sales programmatically. Users will need to manually mark items as sold on GOAT, or we parse GOAT notification emails via IMAP as a workaround.

---

## 4. Comparative Summary

### API Maturity

| Feature            | eBay                 | StockX                          | GOAT            |
| ------------------ | -------------------- | ------------------------------- | --------------- |
| Official API       | Yes (excellent)      | Yes (limited)                   | No              |
| Free to use        | Yes                  | Yes                             | N/A             |
| OAuth integration  | Yes (standard)       | Yes (manual approval)           | No              |
| Pricing data       | Active listings only | Buggy official, good unofficial | Unofficial only |
| Order management   | Yes (full CRUD)      | Yes (basic)                     | No              |
| Inventory sync     | Yes                  | Limited                         | No              |
| Webhooks           | Yes (real-time)      | No                              | No              |
| Sold price history | No (restricted API)  | Via unofficial/scraping         | No              |
| Developer docs     | Excellent            | Basic                           | None            |

### Fee Comparison (for flip calculator defaults)

| Platform | Total Seller Fees (typical) | Notes                                                |
| -------- | --------------------------- | ---------------------------------------------------- |
| eBay     | ~14% (13.6% + $0.40)        | Lower for some categories (sneakers)                 |
| StockX   | ~10-13%                     | 7-10% transaction + 3% processing (sometimes waived) |
| GOAT     | ~12.4% + $5-30              | 9.5% commission + 2.9% cash-out + flat seller fee    |

### Rate Limits (impact on desktop app)

| Platform        | Limit             | Impact                                                  |
| --------------- | ----------------- | ------------------------------------------------------- |
| eBay            | 5,000/day         | OK with caching. ~3.5/min. Request increase if needed.  |
| StockX Official | 25,000/day, 1/sec | Generous. 1/sec is fine for user-initiated lookups.     |
| Sneaks-API      | No formal limit   | Self-hosted, but underlying platform APIs may throttle. |

---

## 5. Recommended Architecture for BottingOS

### Flip Calculator (real-time pricing)

```
User searches item -> Sneaks-API (local, free)
                   -> Returns StockX + GOAT + FlightClub prices
                   -> eBay Browse API (client credentials, free)
                   -> Returns active eBay listing prices
                   -> Cache results for 15-30 min (prices don't change fast)
                   -> Display comparison with fee calculations
```

- **Cost**: $0
- **Dependencies**: Sneaks-API npm package, eBay developer account
- **Risk**: Sneaks-API breakage. Mitigation: monitor for errors, fallback to Retailed.io

### Order/Sale Tracking

```
eBay:    OAuth flow -> Fulfillment API (getOrders) + Webhooks (ITEM_SOLD)
StockX:  OAuth flow -> Seller API (if approved) + periodic polling
GOAT:    Manual entry OR IMAP email parsing (sale confirmation emails)
```

- **Cost**: $0
- **Limitation**: GOAT has no automated tracking path

### Inventory Sync

```
eBay:    Inventory API (create/update/delete listings)
StockX:  Seller API (if approved, limited)
GOAT:    Not possible programmatically
```

### Caching Strategy

For a desktop app serving one user:

- Cache pricing lookups for 15-30 minutes (sneaker prices don't change by the minute)
- Store recent lookups in local SQLite
- eBay's 5,000/day limit means ~200 unique product lookups/day (assuming each lookup = ~25 API calls for different sizes/conditions). More than enough for a single user.

---

## 6. TOS and Legal Considerations

| Platform | Official API                          | Scraping                                                                                                                                                                  |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| eBay     | Fully permitted via developer program | Against TOS                                                                                                                                                               |
| StockX   | Permitted with approval               | Explicitly forbidden in TOS. HUMAN Security bot protection. Legal risk exists but enforcement is typically against large-scale commercial scrapers, not individual tools. |
| GOAT     | N/A                                   | Likely against TOS. Less aggressive enforcement than StockX.                                                                                                              |

**Sneaks-API legal stance**: It's an open-source npm package with 1.2M+ downloads. It scrapes public-facing data. The legal precedent (Bright Data v. Meta/LinkedIn) suggests scraping publicly available data is generally legal for personal/research use. However, StockX and GOAT TOS explicitly prohibit it. For a commercial product ($5/mo), this is a gray area.

**Recommendation**: Use official APIs where available (eBay, StockX). For GOAT pricing, Sneaks-API is the pragmatic choice. If BottingOS grows significantly, consider negotiating official API access with GOAT/StockX or switching to paid third-party providers (Retailed.io) that assume the scraping risk.

---

## 7. Implementation Priority

1. **eBay Browse API** - Set up developer account, implement client credentials flow, build pricing lookup. Lowest risk, best documentation.
2. **Sneaks-API integration** - npm install, wrap in a service. Gets StockX + GOAT + FlightClub prices in one shot. Fastest path to multi-marketplace pricing.
3. **eBay OAuth + Fulfillment API** - Implement authorization code flow for seller operations. Enables order tracking and webhooks.
4. **StockX official API** - Apply for access (may take days/weeks for approval). Implement if approved.
5. **GOAT order tracking** - Defer. Manual entry or IMAP parsing as stretch goal.

---

## 8. Key Risks

| Risk                             | Severity            | Mitigation                                                   |
| -------------------------------- | ------------------- | ------------------------------------------------------------ |
| Sneaks-API breaks                | Medium              | Monitor errors, have Retailed.io as paid fallback            |
| StockX API approval denied       | Low                 | Use Sneaks-API for pricing, manual order entry               |
| eBay rate limit hit              | Low                 | Cache aggressively, request limit increase                   |
| GOAT adds bot protection         | Low                 | Switch to Retailed.io or Apify                               |
| TOS enforcement on scraping      | Low (for small app) | Use official APIs where possible, keep scraping minimal      |
| eBay sold price data unavailable | Medium              | Use active listing prices as proxy, note limitation to users |

---

## Sources

- [eBay Developer Program](https://developer.ebay.com/)
- [eBay Browse API Overview](https://developer.ebay.com/api-docs/buy/browse/overview.html)
- [eBay API Call Limits](https://developer.ebay.com/develop/get-started/api-call-limits)
- [eBay OAuth Authorization Code Flow](https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html)
- [eBay Client Credentials Flow](https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html)
- [eBay Notification API](https://developer.ebay.com/api-docs/buy/notification/overview.html)
- [eBay Fulfillment API](https://developer.ebay.com/api-docs/sell/fulfillment/overview.html)
- [eBay Inventory API](https://developer.ebay.com/api-docs/sell/inventory/overview.html)
- [eBay Seller Fees 2026 - Taxomate](https://taxomate.com/blog/ebay-seller-fees)
- [eBay Fees Complete Guide 2026 - Underpriced](https://www.underpriced.app/blog/ebay-fees-complete-guide-2026)
- [StockX Developer Portal](https://developer.stockx.com/)
- [StockX Public API Reference](https://developer.stockx.com/openapi/reference/overview/)
- [About the StockX Developers Portal - Kicks.dev](https://kicks.dev/blog/2024-10-about-stockx-developers)
- [Scraping StockX in 2025 - Kicks.dev](https://kicks.dev/blog/scraping-stockx-in-2025-full-guide/)
- [StockX Fee Calculator - Investomatica](https://investomatica.com/stockx-calculator)
- [StockX Seller Program Updates](https://stockx.com/news/updates-to-the-stockx-seller-program/)
- [StockX Seller Fees Explained - TopBubbleIndex](https://www.topbubbleindex.com/blog/stockx-seller-fees/)
- [GOAT Fee Policy](https://www.goat.com/fees)
- [GOAT Commission Info](https://support.goat.com/hc/en-us/articles/115004770888)
- [GOAT Seller Fee Info](https://support.goat.com/hc/en-us/articles/360003037832)
- [Sneaks-API - GitHub](https://github.com/druv5319/Sneaks-API)
- [Sneaks-API - npm](https://www.npmjs.com/package/sneaks-api)
- [Retailed.io GOAT APIs](https://www.retailed.io/datasources/api/goat-product)
- [StockX Unofficial API - Medium](https://medium.com/@zaly2803/using-the-unofficial-stockx-api-1775628c4605)
- [How to Get StockX API Access - RestocksAIO](https://docs.restock.gg/problem-solving/tutorials/how-i-can-get-access-to-the-public-stockx-api)
