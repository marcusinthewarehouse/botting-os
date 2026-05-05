# AYCD & Bot Ecosystem Research

**Date**: 2026-03-07
**Researcher**: Claude (subagent)
**Purpose**: Inform BottingOS webhook integration, AYCD integration, and competitive positioning

---

## 1. AYCD (All You Can Do) - Product Suite

### 1.1 Products & Apps

AYCD is the dominant toolbox in the sneaker botting ecosystem. Their product suite includes:

**OneClick** - Browser-based tool for managing Google accounts to pass captchas. Integrates with AutoSolve to serve as a captcha solving hub. Can route to built-in solver, 2Captcha, AntiCaptcha, or CapMonster.

**Inbox** - Email and SMS management client. Supports bulk account operations, OAuth2 login, OTP handling, template-based email processing, and email scraping/parsing. Has a Mail Tasks API for programmatic access.

**TabSentry** - Anti-detect browser automation with autofill templates, macro recording/replay, OTP integration. Supports Chrome, Brave, Edge, and "Camo Chrome."

**Profile Builder** - The most relevant product for BottingOS:

- Virtual card generation/import from Capital One, Amex, Citi, Stripe, Privacy, Slash, and more
- Address jigging with ChatGPT AI integration for generating unique addresses
- Billing profile mass generation with customizable jig templates
- Multi-format import/export compatible with 500+ programs
- Order tracking from retailers
- Capital One cards are merchant-locked to specified websites
- Amex cards support custom spending limits and reset frequencies

**AutoSolve / AutoSolve AI** - Captcha solving service using RabbitMQ messaging. Central hub that routes captcha requests between bots and solvers.

**Traffic & SEO** - Search activity generation, geo-location targeting, local SEO optimization (Location Spoof).

### 1.2 Pricing

| Plan          | Price  | Notes                  |
| ------------- | ------ | ---------------------- |
| Resell Pass   | $30/mo | Core reselling tools   |
| Queue Pass    | $35/mo | Queue/checkout focused |
| Traffic Pass  | $49/mo | SEO/traffic tools      |
| Ultimate Pass | $65/mo | Everything             |

### 1.3 API & Developer Access

**AutoSolve API** (documented):

- Official developer docs at `https://docs.aycd.io/docs/autosolve-api.html` (site currently down) and `https://aycd.dev/autosolve-api/`
- Uses RabbitMQ for real-time captcha token delivery between solvers and bots
- Authentication: Access Token + Bot API Key (obtained from AutoSolve Dashboard)
- Each bot instance needs a unique API key
- Client libraries exist in Go, Swift, and Dart (GitHub: `aycdinc/autosolve-client-swift`, `owenkealey/autosolve-client`, `gtsigner/autosolve`)
- The API is specifically for captcha solving, NOT for accessing AYCD's other tools (profiles, emails, VCCs)

**Inbox Mail Tasks API** (limited documentation):

- Allows programmatic access to OTP codes, links, and email data
- Used by supported programs to receive IMAP/TOTP OTP codes
- Task templates can be created for specific sites (Outlook, Nike, etc.)
- Less documented than AutoSolve; appears to be an internal integration API

**No public REST API for core features**: There is NO documented public API for:

- Exporting/importing profiles
- Managing VCCs programmatically (beyond their own UI)
- Exporting email accounts
- Accessing jig data
- Order tracking data

**Key finding**: AYCD's API strategy is narrow - they expose AutoSolve (captcha solving) to bot developers because it benefits both sides. But core toolbox data (profiles, emails, VCCs) is locked in their app with no external API. Integration would require either:

1. Negotiating a private/partner API with AYCD (PRD mentions user knows the team)
2. Import/export via file formats (AYCD supports 500+ program formats for profile export)
3. Scraping their desktop app (not recommended)

### 1.4 AYCD Integration Opportunities for BottingOS

**Realistic integrations (no API needed):**

- Import AYCD-exported profiles (CSV/JSON) into BottingOS
- Import AYCD-generated email lists
- Import VCC data from AYCD Profile Builder exports
- AYCD supports multi-format export, so parsing their export format is feasible

**Requires partnership/negotiation:**

- Real-time sync of generated emails/VCCs
- Webhook from AYCD when new accounts are created
- Direct API access to profile/email/VCC data

**AutoSolve integration (available now):**

- Not directly useful for BottingOS (captcha solving isn't our domain)
- But demonstrates AYCD is willing to have an API ecosystem

---

## 2. Bot Webhook Formats

### 2.1 How Bots Send Webhooks

All major sneaker bots use **Discord webhook URLs** as their notification system. The workflow:

1. User creates a Discord webhook in their server (Settings > Integrations > Webhooks)
2. User gets a URL like: `https://discord.com/api/webhooks/{id}/{token}`
3. User pastes this URL into the bot's settings page
4. On checkout (success or decline), the bot POSTs a Discord embed message to that URL

**Critical insight for BottingOS**: Bots ONLY support Discord webhook URLs. They don't support custom HTTP endpoints. This means BottingOS has two options:

**Option A - Webhook Proxy (recommended)**:

- BottingOS provides a URL that mimics the Discord webhook endpoint format
- User pastes the BottingOS URL into their bot instead of a Discord URL
- BottingOS receives the Discord-formatted payload, parses it, stores the data
- BottingOS can optionally forward to the user's actual Discord webhook too
- URL format: `https://hooks.bottingos.app/api/webhooks/{user_id}/{token}`
- This works because bots just POST JSON to a URL - they don't verify it's actually Discord

**Option B - Discord Bot listener**:

- User keeps their Discord webhook as-is
- User adds a BottingOS Discord bot to their server
- Bot listens for webhook embeds in designated channels and parses them
- More complex, requires Discord bot infrastructure, but doesn't change user workflow

### 2.2 Discord Webhook Payload Format

All bots send payloads in Discord's webhook format:

```json
{
  "username": "Bot Name",
  "avatar_url": "https://...",
  "embeds": [
    {
      "title": "Successful Checkout" or "Checkout Success",
      "color": 65280,
      "thumbnail": {
        "url": "product_image_url"
      },
      "fields": [
        { "name": "Product", "value": "Nike Dunk Low Panda", "inline": true },
        { "name": "Size", "value": "10", "inline": true },
        { "name": "Price", "value": "$110.00", "inline": true },
        { "name": "Store", "value": "Nike US", "inline": true },
        { "name": "Profile", "value": "Profile #3", "inline": true },
        { "name": "Proxy", "value": "ISP DC 1", "inline": true },
        { "name": "Order #", "value": "NK-123456789", "inline": false },
        { "name": "Mode", "value": "Fast", "inline": true },
        { "name": "Checkout Time", "value": "2.3s", "inline": true }
      ],
      "footer": {
        "text": "Cybersole | 2026-03-07 10:15:32",
        "icon_url": "https://..."
      },
      "timestamp": "2026-03-07T10:15:32.000Z"
    }
  ]
}
```

### 2.3 Common Fields Across Bots

Based on research across multiple bots and community knowledge, checkout webhooks typically include:

**Consistently present (high confidence):**
| Field | Description | Notes |
|-------|-------------|-------|
| Product/Item | Product name | Always present |
| Size | Shoe/item size | Always present for sneakers |
| Price | Purchase price | Usually present |
| Store/Site | Retailer name | Always present |
| Profile | Billing profile used | Present in most bots |
| Proxy | Proxy group used | Present in most bots |
| Mode | Task mode/speed | Bot-specific |
| Checkout Time | Time to complete | Some bots include |

**Sometimes present:**
| Field | Description | Notes |
|-------|-------------|-------|
| Order Number | Order/confirmation # | Not always available at checkout time |
| SKU/PID | Product identifier | Some bots include |
| Email | Account email used | Some bots include |
| Payment | Last 4 of card | Rare, security concern |
| Region/Country | Store region | Multi-region bots |
| Task ID | Internal task reference | Bot-specific |
| Quantity | Items purchased | Usually 1 |

**Key challenge**: There is NO standard schema. Each bot names fields differently:

- "Product" vs "Item" vs "Product Name"
- "Store" vs "Site" vs "Retailer"
- "Size" vs "Shoe Size"
- "Order #" vs "Order Number" vs "Confirmation"

BottingOS will need fuzzy field matching or bot-specific parsers.

### 2.4 Bot-Specific Details

**Cybersole**

- Has official API documentation at `https://docs.cybersole.io/`
- API allows viewing/interacting with licenses, tasks, and captchas
- Uses API keys for authentication
- Supports 250+ retailer modules
- Has mobile app with expanded webhook capability
- Webhook URL entered in settings tab
- Price: ~$400+ (very exclusive, high demand)

**Valor (ValorAIO)**

- Documentation at `https://docs.valoraio.com/`
- Webhook section in Settings: paste Discord webhook URL, press save
- Blue test button to verify webhook is working
- "Success Only" toggle - can filter to only post successful checkouts (not declines)
- Supports Shopify, Footsites, and more

**NSB (Nike Shoe Bot)**

- Integrated Discord support
- Users receive Discord invite with token/key
- Can hook up cook group monitors
- Supports Nike, Shopify, Supreme, Footsites, and 100+ retailers
- Pricing: $349/6mo or $79.99/mo

**Wrath AIO**

- Known for speed (millisecond checkout times)
- Discord webhook support confirmed
- Very high demand, rarely available at retail
- Supports Nike, Shopify, Footsites

**Kodai AIO**

- Popular for Shopify and Yeezy Supply
- Strong anti-bot bypass
- Built-in CAPTCHA solver
- Discord webhook support confirmed

**Balkobot**

- High demand, rarely at retail price
- Discord server with documentation
- Webhook support confirmed

**Prism**

- Excels on Shopify, Footsites, Supreme
- Discord webhook support confirmed

**AIO Bot**

- More accessible/affordable entry point
- Discord webhook support

### 2.5 Webhook Interception Strategy

Since bots only support Discord webhook URLs, the best approach for BottingOS:

1. **Build a Discord-compatible webhook receiver** - an endpoint that accepts POST requests in Discord webhook format (JSON with embeds array)
2. **Provide users a BottingOS webhook URL** that looks like: `https://hooks.bottingos.app/v1/webhooks/{user_token}`
3. **Parse the embed fields** from the incoming payload to extract structured checkout data
4. **Optionally forward** the original payload to the user's real Discord webhook (so they still get Discord notifications)
5. **Normalize the data** into a standard BottingOS schema regardless of which bot sent it

The parsing logic needs to handle:

- Different field names per bot (fuzzy matching on field names)
- Missing fields (not all bots send all data)
- Different embed structures (title, description, or fields-based)
- Color codes that indicate success vs decline

---

## 3. Competitive Landscape

### 3.1 Direct Competitors (Organization/Tracking Tools)

**AYCD Toolbox** ($30-65/mo)

- The incumbent. Cluttered UI but feature-rich.
- Covers: emails, VCCs, profiles, jigging, captcha solving, email management
- Does NOT do: profit tracking, inventory management, analytics, marketplace integration
- BottingOS differentiator: cleaner UI, profit tracking, inventory, analytics, webhook capture

**Scout App** ($0-16/mo)

- Inventory management for resellers
- AI-powered email detection for purchase/sale tracking
- Box scanning to add sneakers to inventory
- Live StockX price integration
- Marketplace listing from within the app
- Most direct competitor to BottingOS's inventory/profit features
- Pricing: Free, $12/mo Beginner, $16/mo Professional

**CopDeck** (pricing unknown)

- Price comparison across StockX, GOAT, Klekt, Restocks
- Inventory management with live value tracking
- Fee calculator (buyer/seller)
- Spreadsheet import
- Inventory sharing/feed
- Focused on price comparison, less on bot integration

**Retailed.io** (starts at $99/mo for solutions; inventory tool has free tier)

- Comprehensive reselling dashboard with analytics
- Real-time metrics, sales tracking, profit margins
- Also has a pricing/data API product
- Dynamic pricing tools
- More enterprise-focused, higher price point
- Users have requested more webhook integrations

**The Cookout** (by Majestyk) (~$100/mo)

- Centralized bot management dashboard
- Access to multiple bots through one interface
- Mobile-responsive design
- Simplifies the botting process for beginners
- Different angle: bot access, not tracking/organization

### 3.2 Gap Analysis - Where BottingOS Fits

| Feature                | AYCD      | Scout        | CopDeck | Retailed   | BottingOS (planned) |
| ---------------------- | --------- | ------------ | ------- | ---------- | ------------------- |
| Email management       | Yes       | No           | No      | No         | Yes                 |
| VCC tracking           | Yes       | No           | No      | No         | Yes                 |
| Profile/jig            | Yes       | No           | No      | No         | Yes (basic)         |
| Captcha solving        | Yes       | No           | No      | No         | No (use AYCD)       |
| Inventory tracking     | No        | Yes          | Yes     | Yes        | Yes                 |
| Profit tracking        | No        | Yes          | Partial | Yes        | Yes                 |
| Bot webhook capture    | No        | No           | No      | No         | Yes                 |
| Price comparison       | No        | No           | Yes     | Yes (API)  | Yes (planned)       |
| Marketplace sync       | No        | Yes (StockX) | Yes     | Yes        | Yes (planned)       |
| Analytics/trends       | No        | Basic        | No      | Yes        | Yes                 |
| Drop calendar          | No        | No           | No      | No         | Yes                 |
| Cook group aggregation | No        | No           | No      | No         | Yes (planned)       |
| Apple-level UI         | No        | Decent       | Decent  | Business-y | Goal                |
| Price                  | $30-65/mo | $0-16/mo     | Unknown | $99+/mo    | $5/mo               |

**Key differentiator**: BottingOS is the only tool attempting to bridge bot automation (via webhook capture) with organization and financial tracking. Nobody else captures checkout data from bots and feeds it into inventory/profit tracking automatically. This is the killer feature.

### 3.3 Pricing Context

- AYCD: $30-65/mo
- Scout: $12-16/mo
- Retailed: $99+/mo
- BottingOS target: $5/mo

At $5/mo, BottingOS would be dramatically cheaper than all competitors. The question is whether the feature set justifies even that price at launch, or whether it needs to be more complete first. The PRD's $3-5/mo target is very aggressive and could drive adoption purely on price.

---

## 4. Recommendations for BottingOS

### 4.1 Webhook Integration (Priority: HIGH)

1. **Build a Discord-compatible webhook proxy** as the primary bot integration method
2. **Create bot-specific parsers** for at least: Cybersole, Valor, NSB, Wrath, Kodai (the top 5)
3. **Fall back to generic field matching** for unknown bots
4. **Forward to Discord** after capture so users don't lose their existing notifications
5. **Consider exploring Cybersole's API** (docs.cybersole.io) for richer data access

### 4.2 AYCD Integration (Priority: MEDIUM)

1. **Start with file import** - parse AYCD Profile Builder export formats for emails, VCCs, and profiles
2. **Don't build what AYCD already does well** - jigging, captcha solving, email generation. Complement, don't compete.
3. **Explore partnership** - the PRD mentions the user knows AYCD's team. A partner API for syncing emails/VCCs would be valuable but isn't available publicly today.
4. **AutoSolve API is not useful** for BottingOS's core features (it's captcha-specific)

### 4.3 Competitive Positioning

1. **Lead with the webhook-to-tracking pipeline** - this is unique in the market
2. **Price at $5/mo** to undercut everyone and drive adoption
3. **Don't try to replace AYCD** - position as complementary ("Use AYCD for automation, BottingOS for organization")
4. **Focus on UI/UX** as the primary differentiator vs. existing tools
5. **Scout App is the closest competitor** - their AI email detection and inventory features overlap significantly

### 4.4 Technical Architecture Notes

- Webhook receiver should be a simple Express/Next.js API route that accepts Discord webhook format
- Parse embeds array, extract field name/value pairs
- Normalize into a BottingOS checkout schema:
  ```typescript
  interface CheckoutEvent {
    id: string;
    botName: string; // detected from embed footer/username
    product: string;
    size: string | null;
    price: number | null;
    store: string;
    profile: string | null;
    proxy: string | null;
    orderNumber: string | null;
    mode: string | null;
    checkoutTime: string | null;
    imageUrl: string | null;
    success: boolean; // derived from embed color/title
    rawPayload: object; // store original for debugging
    receivedAt: Date;
  }
  ```
- Field name normalization map per bot (or fuzzy matching)
- Store raw payload alongside normalized data for debugging/reprocessing

---

## 5. Sources

- [AYCD Official Site](https://aycd.io/)
- [AYCD Toolbox Support](https://aycd.zendesk.com/hc/en-us/categories/360002579813-AYCD-Toolbox)
- [AYCD Developer Docs](https://docs.aycd.io/) / [AYCD Dev](https://aycd.dev/)
- [AYCD Profile Builder - AI Address Jig](https://aycd.zendesk.com/hc/en-us/articles/16039185026583-Profile-Builder-Profiles-Tools-AI-Address-Jig)
- [AYCD Profile Builder - Virtual Cards](https://aycd.zendesk.com/hc/en-us/articles/13271791496087-Profile-Builder-Virtual-Cards-Generating-Virtual-Cards)
- [AYCD Inbox - iCloud](https://aycd.zendesk.com/hc/en-us/articles/35504921495703-Inbox-Mail-Accounts-Tools-iCloud-Create-Generate-Import-Delete)
- [AYCD AutoSolve Getting Started](https://aycd.zendesk.com/hc/en-us/articles/360043228094-AutoSolve-Getting-Started-Guide)
- [AYCD GitHub (aycdinc)](https://github.com/aycdinc)
- [gtsigner/autosolve (Go client)](https://github.com/gtsigner/autosolve)
- [Cybersole API Docs](https://docs.cybersole.io/)
- [Cybersole Site](https://cybersole.io/)
- [Valor Docs - Settings](https://docs.valoraio.com/setting-up-valor/settings)
- [NSB Official](https://www.nikeshoebot.com/)
- [Cop Supply - Bot Directory](https://cop.supply/)
- [Scout App](https://scoutapp.ai/)
- [CopDeck](https://www.copdeck.com/)
- [Retailed.io](https://www.retailed.io/)
- [The Cookout (Majestyk)](https://www.majestyk.com/work/the-cookout)
- [Discord Webhook Documentation](https://discord.com/developers/docs/resources/webhook)
- [Discord Webhooks Guide](https://birdie0.github.io/discord-webhooks-guide/)
- [Proxyway - Best Sneaker Bots 2026](https://proxyway.com/best/sneaker-bots)
- [BotsThatWork - AYCD Review](https://botsthatwork.com/review/acyd-bot-toolbox/)
- [Cybersole + AYCD AutoSolve Setup](https://support.cybersole.io/hc/en-us/articles/15652659094557-How-do-I-set-up-AYCD-AutoSolve-with-Cybersole)
- [BlockApps - Sneaker Inventory Apps](https://blockapps.net/blog/best-tools-and-apps-for-sneaker-reselling-and-inventory-management/)
- [Webhook Proxy (hyra-io)](https://github.com/hyra-io/Discord-Webhook-Proxy)
