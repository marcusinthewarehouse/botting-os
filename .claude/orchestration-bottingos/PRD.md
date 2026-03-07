# BottingOS - Product Requirements Document

**Created**: 2026-03-07
**Status**: Draft (MVP - Easy Features Only)
**Source**: 23k-word ChatGPT planning conversation

---

## 1. Vision

BottingOS is a cross-platform operations management app for sneaker/retail botters. It replaces the patchwork of spreadsheets, Discord channels, and manual tracking that botters currently use to manage their accounts, orders, profits, and virtual credit cards.

While tools like AYCD, Cybersole, Valor, and NSB are powerful for automation, they lack strong organization and financial tracking. BottingOS fills that gap as a "command center" - not competing with bots or cook groups, but complementing them with features Discord and existing tools cannot do well.

Target market: ~50k-100k serious botters worldwide, addressable base of 5k-20k paying users.

## 2. Core Features (MVP Scope - Green/Easy Only)

### 2.1 Flip Profit Calculator
- Enter item name/SKU, purchase price, target marketplace(s)
- Calculate true profit after marketplace fees (eBay, StockX, GOAT), shipping, taxes
- Show ROI instantly, compare across marketplaces side-by-side
- Mobile-optimized for quick checks
- Easiest feature, most viral potential

### 2.2 Basic Profit & Expense Tracker
- Manual entry of purchases (item, price, date, source site)
- Manual entry of sales (item, sale price, marketplace, fees)
- Track cancellations and refunds
- P&L per item and running totals
- CSV export, quick-add sale button

### 2.3 Email & Account Manager
- Bulk import of Hide My Email addresses (paste 750+ at once)
- Organize by iCloud source account
- Tag by website (Target, Walmart, Nike)
- Reverse filtering: all accounts for a given website across all sources
- Two views: by email source and by retailer
- Search and filter, CSV import

### 2.4 Password Manager (Encrypted Vault)
- Secure vault for botting credentials
- Store website, username/email, password per entry
- Copy-paste buttons, client-side AES-GCM encryption
- Biometric/passcode gate, panic hide for screenshots
- Cloud sync with encrypted backup

### 2.5 VCC Tracker
- Create VCC records: provider, last 4 digits, label
- Track which VCCs used on which accounts/orders
- Distinguish providers even when both Mastercard
- Usage history per card, manual entry
- Link VCCs to orders and accounts

## 3. Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Prisma + PostgreSQL (SQLite for dev)
- **Auth**: Clerk
- **Encryption**: Web Crypto API (AES-GCM) for vault
- **Deployment**: Vercel (later)

## 4. Constraints

- MVP only - no proxy tools, monitors, bot integrations, marketplace APIs, bank APIs, Discord integration, team features
- Web-first, mobile/desktop later
- Security critical - botters must trust it
- User has no code experience, building with AI

## 5. Future Phases (after MVP)

Order Tracker, Discord Alerts, Inventory Manager, Analytics Dashboard, Drop Calendar, Marketplace APIs, Bot webhooks, Team support, Proxy management, Account health checker
