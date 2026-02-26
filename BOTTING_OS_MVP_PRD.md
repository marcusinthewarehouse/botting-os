# Botting OS - MVP Product Requirements Document

**Status:** Ready for Development | **Created:** 2026-02-25

---

## Executive Summary

Botting OS is a **unified operations dashboard** for botting, cooking, and automation. The MVP focuses on the most impactful features:

- **Discord Bot Integration** - Track order status, receive notifications, manage bot fleet
- **Proxy Health Dashboard** - Monitor proxy rotation, detect dead proxies, health scoring
- **Account Health Scoring** - Track account age, success rate, restrictions, flags
- **Order & Checkout Tracking** - Real-time order status, timestamps, outcomes
- **Profit & ROI Dashboard** - Earnings, expenses, net profit, ROI per store

---

## MVP Feature Set

### 1. Dashboard Overview
- **Active Orders** - Count of orders in progress
- **Dead Proxies** - Alert if >10% of proxy pool is down
- **Account Flags** - How many accounts are flagged/restricted
- **Profit This Week** - Quick earnings number
- Quick action buttons (run bot, check proxy health, view logs)

### 2. Discord Bot Integration
- **Listen to Discord:** Read messages from bot channels
- **Parse Order Data:** Extract order status, item, size, price, timestamp
- **Notification Hub:** Filter/route notifications by store or category
- **Bot Health:** Check which bots are online/offline
- **Manual Commands:** Send commands to bots from dashboard (run, pause, cancel)

### 3. Proxy Health Dashboard
- **List all proxies** - IP, port, location, response time
- **Health Status** - Green (good), yellow (slow), red (dead)
- **Rotation Stats** - How many rotations per proxy, error rate
- **Delete Dead Proxies** - Bulk remove 
- **Test Proxy** - Manual health check
- **Uptime History** - 7-day uptime per proxy

### 4. Account Health Scoring
- **Account List** - Store, email, password (encrypted), age, status
- **Health Score** - 0-100 based on: success rate, recent failures, restrictions
- **Restrictions** - Flagged? Captcha walls? Email verification needed?
- **Recent Activity** - Last order, last timestamp, last success
- **Account Age** - Days/months since creation
- **Bulk Actions** - Mark as dead, rotate, archive

### 5. Order & Checkout Tracking
- **Active Orders** - Status (pending, processing, shipped, failed), store, product, price, timestamp
- **Order History** - Search by store, date, status
- **Success Rate** - % of orders that succeeded
- **Failed Orders** - Why did it fail? (Captcha, checkout error, OOS, card declined)
- **Real-time Updates** - New orders appear instantly (Discord webhook listener)

### 6. Profit & ROI Dashboard
- **Total Earnings** - Sum of all successful order profits
- **Total Expenses** - Proxy costs, bot licenses, account costs
- **Net Profit** - Earnings - Expenses
- **ROI** - Net Profit / Expenses
- **Profit by Store** - Breakdown: Supreme, Nike, Foot Locker, etc.
- **Weekly Trend** - Earnings trend last 7 days

### 7. Settings & Configuration
- **Discord Channel Link** - Paste channel ID, app listens for orders
- **Proxy API Setup** - Connect to Oxylabs/residential proxy provider
- **Store Aliases** - Map Discord text patterns to store names
- **Profit Margins** - Set per-store profit calculations
- **Email/Password Encryption** - Master password for account vault
- **GitHub Pages Deploy** - One-click to deploy dashboard to GH Pages

---

## Non-MVP Features (Phase 2+)

These are **intentionally excluded** from MVP:
- Email automation & account farming
- Anti-detect browser management
- Captcha solving integration
- Multi-session browser control
- Advanced team/multi-user accounts
- Traffic/SEO module
- Predictive insights

---

## Technical Requirements

### Frontend
- **Framework:** React 18 + TypeScript
- **UI Library:** Tailwind CSS
- **State Management:** Zustand
- **Charts:** Recharts (for profit trends, order success rates)
- **Real-time:** WebSocket for order updates
- **Deploy:** GitHub Pages (static build)

### Backend
- **Framework:** Node.js + Express + TypeScript
- **Database:** SQLite (Prisma)
- **Real-time:** WebSocket server
- **Discord Integration:** discord.py or discord.js (listen to webhooks)
- **Proxy API:** Axios for HTTP calls

### Deployment
- **GitHub Actions:** CI/CD pipeline
- **GitHub Pages:** Host frontend demo
- **Backend:** Run locally (can be deployed to VPS later)

---

## Data Model (Core Tables)

### Orders
```
id, discordMessageId, store, product, size, price, profit, status (pending/success/failed), 
failureReason, timestamp, checkoutTime
```

### Proxies
```
id, ip, port, location, lastTestedAt, health (green/yellow/red), responseTime, 
errorCount, rotationCount, uptime7d
```

### Accounts
```
id, store, email, passwordHash, accountAge, healthScore, lastOrderAt, 
restrictions (none/flagged/captcha/verification), status (active/dead/archived)
```

### Expenses
```
id, category (proxies/bots/accounts), amount, date, description
```

### Settings
```
key, value (discordChannelId, proxyApiKey, etc.)
```

---

## Acceptance Criteria

When MVP is complete:
- ✅ Dashboard loads with real data
- ✅ Discord bot sends order → appears in dashboard in <5 seconds
- ✅ Can add/remove proxies and see health status update
- ✅ Can add accounts and track health score
- ✅ Profit dashboard shows accurate earnings & ROI
- ✅ All data persists in SQLite
- ✅ Live demo deployed to GitHub Pages
- ✅ No "Coming Soon" placeholders
- ✅ Backend runs locally with `npm run dev`
- ✅ Frontend runs locally with `npm run dev`

---

## Timeline

**Phase 1 (This Sprint):** Implement MVP
- Week 1: Backend setup (database, API routes, Discord listener)
- Week 2: Frontend dashboard (UI components, state management)
- Week 3: Integration testing, bug fixes, GitHub Pages deploy
- **Total: 3 weeks**

---

## Success Metrics

1. **Order Capture:** Can accurately parse Discord order messages
2. **Dashboard Accuracy:** All metrics (profit, health, uptime) match source data
3. **Real-time Updates:** New orders appear within 5 seconds
4. **Uptime:** Backend stays stable during testing
5. **UX:** User can navigate dashboard intuitively

---

## Out of Scope (MVP)

- Email automation
- Browser automation
- Captcha solving
- Account farming
- Multi-user authentication
- Advanced analytics
- Alert/notification system (besides Discord)
- API rate limiting (can add later)

---

## Done When

All features above work end-to-end, all acceptance criteria met, live demo running on GitHub Pages.
