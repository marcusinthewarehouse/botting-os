# AYCD Inbox API Research

**Date:** 2026-03-07
**Product Version:** AYCD Inbox 2026.1.3
**Conclusion:** No public REST API documentation exists. The "Inbox API" is a local inter-process communication protocol for AYCD's own ecosystem tools, not a general-purpose REST API.

---

## What the "Inbox API" Actually Is

The AYCD Inbox API is **not a traditional REST/HTTP API** with documented endpoints. It is a **local task-based API** designed for communication between AYCD desktop applications (Inbox, OneClick, Profile Builder, TabSentry). The API runs locally on the user's machine and is primarily used for:

1. **Mail OTP retrieval** - Other AYCD tools send a task requesting an OTP code from a specific email account
2. **SMS OTP retrieval** - Unified interface to 10+ third-party SMS providers
3. **Webhook notifications** - Discord webhook notifications for new mail events

### How It Works (Task Flow)

1. User enables Tasks in Inbox Settings > Tasks
2. Inbox generates an API key
3. User inputs that API key into another AYCD tool (e.g., OneClick)
4. The consuming tool sends task requests to Inbox (likely via local WebSocket or HTTP)
5. Inbox monitors configured email accounts (via IMAP) and returns OTP codes/links
6. Results sent back to the requesting tool

### Key Architecture Details

- **Desktop Electron app** - Inbox runs as a local desktop application, not a cloud service
- **AMQP/RabbitMQ** - AYCD's AutoSolve API uses RabbitMQ; Inbox likely uses a similar messaging pattern
- **Local communication** - The API key identifies the Inbox instance; communication happens locally or through AYCD's infrastructure
- **No public endpoints** - There are no documented REST endpoints like `GET /emails` or `GET /inventory`

---

## API Key

- Found in: **Settings > Tasks** (after enabling Tasks and restarting Inbox)
- Used by: OneClick, Profile Builder, TabSentry, and other AYCD Toolbox apps
- Format: Unknown (likely UUID or similar token)
- Authentication method: Unknown (the key is entered into AYCD tools; likely used as a header or connection parameter)

---

## Task Templates

### Mail Task Templates

- Navigate to Mail > Task Templates
- Each template can contain **up to 20 mail credentials**
- Templates define which email accounts to monitor for OTP codes
- Fields: Template Name, Category, Mail Credentials (selected from added accounts)
- Used when bots need automatic OTP/verification code retrieval

### SMS Task Templates

- Similar to mail templates but for SMS providers
- Supports requesting from multiple SMS providers simultaneously
- Supported providers: GetSMSCode, JuicySMS, OnlineSim, PVACodes, SMSPool, SecureIO, Textverified, sms-activate, sms-gen, smsPVA

### Local Tasks (SMS)

- For manual phone number generation when the bot doesn't support the API
- Created directly in Inbox UI, not via API

---

## Webhook Capabilities

### What Exists

- **Discord/AYCD Webhook** - Configurable in Settings
- Can override the default webhook URL per feature
- Webhook triggers: New mail received, scraper data exports
- Format: Likely Discord webhook format (JSON with embeds)

### What We Know About Webhooks Tab in UI

- The user sees a "Webhooks" tab in the Inbox UI
- Can configure webhook URLs for notifications
- Can enable/disable webhooks for new mail
- Can receive exports for scraped mail data

### What We Don't Know

- Exact webhook payload format/schema
- Whether custom (non-Discord) webhook endpoints are fully supported
- Whether webhook data includes full email content or just notifications
- Whether the "receive webhook messages" capability mentioned in the API key description means Inbox can act as a webhook receiver (inbound webhooks)

---

## Inventory & Sales

### Inventory Features (UI-based, no known API)

- Create, import, export inventory items
- Fields: item name, URL, notes, cost, sale price, profit/loss, ROI, tracking info
- Import/Export via CSV
- Master Inventory CSV Path - configurable for auto-export
- Scraper Data can be sent directly to Inventory
- Tracking URL conversion tools (UPS, USPS, FedEx)

### Sales Features

- Inventory | Sales view in UI
- Sales data auto-populates matching column headers in master CSV
- No known API endpoints for sales data

---

## Developer Documentation

### Official Docs Portal

- **docs.aycd.io** - AYCD Developer Docs (currently returning ECONNREFUSED - possibly deprecated or down)
- **aycd.dev/autosolve-api/** - Alternative docs URL (also down)
- The blog post at aycd.io/blog/best-sms-api-solution references a docs path: `../account/developer/public/docs#/inbox/introduction`
  - This suggests documentation exists (or existed) at: **https://aycd.io/account/developer/public/docs#/inbox/introduction**
  - This URL pattern suggests a Swagger/OpenAPI-style docs page
  - Requires authentication (account login) to access

### Zendesk Help Center

- **aycd.zendesk.com** - Support articles (returns 403 to bots but searchable)
- Key articles:
  - [Inbox Settings](https://aycd.zendesk.com/hc/en-us/articles/14745730512791-Inbox-Settings)
  - [Mail Task Templates](https://aycd.zendesk.com/hc/en-us/articles/14821162472855-Inbox-Mail-Task-Templates-Create-Mail-Task-Template)
  - [SMS Task Templates](https://aycd.zendesk.com/hc/en-us/articles/14795585246231-Inbox-SMS-Task-Templates-Creating-Task-Templates)
  - [SMS Local Tasks](https://aycd.zendesk.com/hc/en-us/articles/14819146413975-Inbox-SMS-Local-Tasks-Create)
  - [Inventory Create/Import/Export](https://aycd.zendesk.com/hc/en-us/articles/14762796842519-Inbox-Inventory-Create-Import-Export)
  - [ChatGPT Service Settings](https://aycd.zendesk.com/hc/en-us/articles/34001946981783-Inbox-Settings-ChatGPT-Service)

### GitHub

- **github.com/aycdinc** - 3 public repos (autosolve-client-swift, autosolve-client-swift-staging, dart_amqp)
- No Inbox API SDK or client library
- Third-party: github.com/gtsigner/autosolve (Go client for AutoSolve, not Inbox)

---

## What We Can and Cannot Do

### CAN Do (via UI/CSV export)

- Export email data to CSV
- Export inventory to CSV
- Export scraper data to CSV
- Receive Discord webhook notifications for new mail
- Use the task API for OTP retrieval (if building an AYCD-compatible tool)

### CANNOT Do (no known API)

- Pull email lists programmatically via REST API
- Query account data via API
- Read inventory/sales data via API
- Configure webhooks via API
- Access email content via API (outside of task-based OTP retrieval)

### MIGHT Be Possible (needs verification)

- The referenced docs URL (`aycd.io/account/developer/public/docs#/inbox/introduction`) suggests there may be a Swagger-style API docs page behind authentication
- The "receive webhook messages" phrasing in the API key description could mean Inbox can receive inbound webhooks (acting as an endpoint), not just send them
- The Inbox API might expose more endpoints than documented publicly

---

## Recommendations

### Immediate Actions

1. **Check the developer docs URL** - Log into aycd.io and navigate to: `https://aycd.io/account/developer/public/docs#/inbox/introduction` - This is the most promising lead for actual API documentation
2. **Ask AYCD directly** - Since you have a personal relationship, ask specifically for:
   - REST API endpoint documentation (OpenAPI/Swagger spec if available)
   - Authentication method (API key header format)
   - Webhook payload schema (inbound and outbound)
   - Rate limits
   - Whether the API supports reading emails/inventory/sales (not just OTP tasks)
3. **Inspect network traffic** - Run Inbox with developer tools or a proxy (mitmproxy/Charles) to see what API calls the desktop app makes when tasks are created
4. **Check AYCD Discord** - Join at aycd.io/discord and ask in their developer/support channels

### What to Ask AYCD

- "Does the Inbox API support reading emails and inventory data, or is it only for OTP task creation?"
- "Is there a REST API with documented endpoints, or is it purely a local inter-process API?"
- "Can I set up custom webhook endpoints (not just Discord) to receive real-time email/inventory data?"
- "Is the API documentation at aycd.io/account/developer/public/docs still available?"
- "What's the webhook payload format for new mail notifications?"
- "Are there rate limits on the task API?"

---

## Sources

- [AYCD Inbox Product Page](https://aycd.io/inbox)
- [AYCD Inbox Settings (Zendesk)](https://aycd.zendesk.com/hc/en-us/articles/14745730512791-Inbox-Settings)
- [AYCD Best SMS API Solution (Blog)](https://aycd.io/blog/best-sms-api-solution)
- [AYCD Manage Inventory Blog](https://aycd.io/blog/manage-inventory-scrape-data-inbox-aycd-most-powerful-mail-sms-client)
- [AYCD Mail Task Templates (Zendesk)](https://aycd.zendesk.com/hc/en-us/articles/14821162472855-Inbox-Mail-Task-Templates-Create-Mail-Task-Template)
- [AYCD SMS Task Templates (Zendesk)](https://aycd.zendesk.com/hc/en-us/articles/14795585246231-Inbox-SMS-Task-Templates-Creating-Task-Templates)
- [AYCD GitHub (aycdinc)](https://github.com/aycdinc)
- [AYCD Developer Docs (down)](https://docs.aycd.io/)
- [AYCD Twitter/X](https://x.com/aycdio)
