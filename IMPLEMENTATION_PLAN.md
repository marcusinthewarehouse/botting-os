# Botting OS - MVP Implementation Plan

**Status:** Ready for Development | **Duration:** 3 weeks | **Team:** 3 agents (Developer, Reviewer, Deployer)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React + Tailwind) @ localhost:3000                │
│ - Dashboard (orders, proxies, accounts, profit)             │
│ - Real-time updates via WebSocket                           │
│ - Charts (Recharts)                                         │
│ - GitHub Pages static build                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP + WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│ Backend (Node.js + Express) @ localhost:3001                │
│ - API routes (CRUD for orders, proxies, accounts, expenses) │
│ - Discord webhook listener                                  │
│ - SQLite database (Prisma ORM)                              │
│ - WebSocket server for real-time updates                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ Data Layer (SQLite)                                         │
│ - Orders, Proxies, Accounts, Expenses, Settings            │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase Breakdown

### Phase 1: Backend Setup (Developer)
**Duration:** 4 days | **Deliverable:** Backend API running locally

**Tasks:**
1. Initialize Node.js + Express + TypeScript project structure
2. Set up Prisma + SQLite database
3. Create database schema (Orders, Proxies, Accounts, Expenses, Settings)
4. Implement API routes:
   - `GET /api/dashboard` - Summary stats
   - `GET /api/orders` - List orders
   - `POST /api/orders` - Create order (from Discord)
   - `GET /api/proxies` - List proxies
   - `POST /api/proxies` - Add proxy
   - `PUT /api/proxies/:id` - Update proxy health
   - `DELETE /api/proxies/:id` - Delete proxy
   - `GET /api/accounts` - List accounts
   - `POST /api/accounts` - Add account
   - `GET /api/expenses` - List expenses
   - `POST /api/expenses` - Log expense
   - `GET /api/settings` - Get settings
   - `PUT /api/settings` - Update settings
5. Set up WebSocket server for real-time order updates
6. Implement Discord webhook listener (POST /api/discord/webhook)
7. Create seed data (mock orders, proxies, accounts for testing)

**Success Criteria:**
- ✅ All API routes respond correctly
- ✅ Database persists data
- ✅ Can POST order from Discord and see it in DB
- ✅ WebSocket broadcasts order updates
- ✅ Runs with `npm run dev`

---

### Phase 2: Frontend Setup (Developer)
**Duration:** 4 days | **Deliverable:** Frontend dashboard UI with all screens

**Tasks:**
1. Initialize React + TypeScript + Tailwind project
2. Set up Zustand state management
3. Create page structure:
   - Dashboard (summary, active orders, alerts)
   - Orders page (list, filters, details)
   - Proxies page (list, health, test, delete)
   - Accounts page (list, health score, restrictions)
   - Profit & ROI page (charts, trends)
   - Settings page (Discord, proxy config, store aliases)
4. Create reusable components:
   - Summary card (title, number, color indicator)
   - Status badge (green/yellow/red)
   - Table (sortable, searchable)
   - Chart (Recharts line, bar)
   - Modal (for forms)
5. Connect to backend API (fetch on mount)
6. Implement WebSocket listener for real-time orders
7. Create responsive layout (mobile-friendly Tailwind)

**Success Criteria:**
- ✅ Dashboard loads without errors
- ✅ All pages render
- ✅ API calls fetch data correctly
- ✅ Real-time updates via WebSocket
- ✅ Runs with `npm run dev`

---

### Phase 3: Integration & Testing (Reviewer + Developer)
**Duration:** 3 days | **Deliverable:** All features tested, bugs fixed, PRs approved

**Tasks:**
1. Manual testing of all features:
   - Create order via Discord webhook → appears in dashboard
   - Add proxy → appears in list → health updates
   - Add account → health score calculates
   - Log expense → profit updates
   - Update settings → persists
2. Load testing (simulate 100+ orders, 50+ proxies)
3. WebSocket stress test (rapid order updates)
4. Bug fixes (Reviewer identifies, Developer fixes)
5. Code review (Reviewer checks code quality, security)
6. Unit tests for critical functions

**Success Criteria:**
- ✅ All CRUD operations work
- ✅ No crashes on edge cases
- ✅ Real-time updates reliable
- ✅ All PRs reviewed and approved

---

### Phase 4: Deployment (Deployer)
**Duration:** 2 days | **Deliverable:** Live demo on GitHub Pages

**Tasks:**
1. Set up GitHub Actions CI/CD pipeline
   - Run tests on every push
   - Build frontend on merge to main
   - Deploy to GitHub Pages
2. Configure GitHub Pages in repo settings
3. Create deploy branch (gh-pages)
4. Build frontend production bundle
5. Deploy to GitHub Pages
6. Create README with setup instructions
7. Test live demo at https://marcusinthewarehouse.github.io/botting-os

**Success Criteria:**
- ✅ Demo site live and accessible
- ✅ All frontend features work on demo
- ✅ CI/CD pipeline working
- ✅ README clear and complete

---

## Task Breakdown by Agent

### Developer Tasks (Coding)
- [ ] Backend project setup
- [ ] Database schema & migrations
- [ ] API routes (all 13 endpoints)
- [ ] Discord webhook listener
- [ ] WebSocket server
- [ ] Seed data
- [ ] Frontend project setup
- [ ] State management (Zustand)
- [ ] All React components
- [ ] API integration
- [ ] WebSocket listener (frontend)
- [ ] Responsive design

**Commits:** Feature branches → PRs for review

---

### Reviewer Tasks (QA & Code Review)
- [ ] Pull all PRs, review code quality
- [ ] Test all features manually
- [ ] Identify bugs, create issues
- [ ] Approve PRs (or request changes)
- [ ] Performance testing
- [ ] Security review
- [ ] Test on multiple browsers

**Output:** Approved PRs, bug reports, performance notes

---

### Deployer Tasks (DevOps & Release)
- [ ] Set up GitHub Actions
- [ ] Configure GitHub Pages
- [ ] Create deployment pipeline
- [ ] Build & deploy frontend
- [ ] Create release notes
- [ ] Update README
- [ ] Test live demo

**Output:** Live GitHub Pages demo, CI/CD pipeline working

---

## File Structure

```
botting-os/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express app
│   │   ├── db.ts              # Prisma setup
│   │   ├── routes/
│   │   │   ├── orders.ts
│   │   │   ├── proxies.ts
│   │   │   ├── accounts.ts
│   │   │   ├── expenses.ts
│   │   │   └── settings.ts
│   │   ├── services/
│   │   │   ├── orderService.ts
│   │   │   ├── proxyHealthCheck.ts
│   │   │   └── discordListener.ts
│   │   └── websocket.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── OrdersList.tsx
│   │   │   ├── ProxyDashboard.tsx
│   │   │   ├── AccountsList.tsx
│   │   │   ├── ProfitChart.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── pages/
│   │   ├── store/
│   │   │   └── appStore.ts     # Zustand
│   │   ├── services/
│   │   │   └── api.ts          # Fetch calls
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── docs/
│   ├── BOTTING_OS_MVP_PRD.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── API.md
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD
│
└── README.md
```

---

## API Routes (13 Total)

### Dashboard
```
GET /api/dashboard
Response: {
  activeOrders: 12,
  deadProxies: 3,
  flaggedAccounts: 2,
  profitThisWeek: 450.50,
  successRate: 87.3
}
```

### Orders
```
GET /api/orders?store=Nike&status=success
POST /api/orders
PUT /api/orders/:id
GET /api/orders/:id
```

### Proxies
```
GET /api/proxies
POST /api/proxies
PUT /api/proxies/:id (update health)
DELETE /api/proxies/:id
POST /api/proxies/:id/test
```

### Accounts
```
GET /api/accounts
POST /api/accounts
PUT /api/accounts/:id
DELETE /api/accounts/:id
```

### Expenses
```
GET /api/expenses
POST /api/expenses
```

### Settings
```
GET /api/settings
PUT /api/settings
```

### Discord Webhook
```
POST /api/discord/webhook
```

---

## WebSocket Events

```typescript
// Server → Client
event "order:new" → { id, store, product, price, timestamp }
event "proxy:update" → { id, health, responseTime }
event "account:update" → { id, healthScore, restrictions }

// Client → Server
event "proxy:test" → { id }
event "account:check" → { id }
```

---

## Database Schema (Prisma)

```prisma
model Order {
  id String @id @default(cuid())
  discordMessageId String?
  store String
  product String
  size String?
  price Float
  profit Float
  status String // pending | success | failed
  failureReason String?
  timestamp DateTime @default(now())
  checkoutTime Int? // milliseconds
}

model Proxy {
  id String @id @default(cuid())
  ip String @unique
  port Int
  location String?
  lastTestedAt DateTime?
  health String // green | yellow | red
  responseTime Int? // milliseconds
  errorCount Int @default(0)
  rotationCount Int @default(0)
  uptime7d Float @default(100)
  createdAt DateTime @default(now())
}

model Account {
  id String @id @default(cuid())
  store String
  email String @unique
  passwordHash String
  accountAge Int // days
  healthScore Int // 0-100
  lastOrderAt DateTime?
  restrictions String? // none | flagged | captcha | verification
  status String // active | dead | archived
  createdAt DateTime @default(now())
}

model Expense {
  id String @id @default(cuid())
  category String // proxies | bots | accounts
  amount Float
  date DateTime @default(now())
  description String?
}

model Settings {
  id String @id @default(cuid())
  key String @unique
  value String
  updatedAt DateTime @updatedAt
}
```

---

## Success Criteria (All Phases)

**Phase 1 Complete When:**
- ✅ Backend runs locally
- ✅ All API routes tested
- ✅ Database schema working
- ✅ Discord webhook receives orders
- ✅ WebSocket broadcasts updates

**Phase 2 Complete When:**
- ✅ Frontend runs locally
- ✅ Dashboard loads with real data
- ✅ All pages render without errors
- ✅ Real-time updates from WebSocket
- ✅ Responsive on mobile

**Phase 3 Complete When:**
- ✅ All features end-to-end tested
- ✅ No major bugs
- ✅ All PRs reviewed & approved
- ✅ Load testing passed

**Phase 4 Complete When:**
- ✅ Live demo on GitHub Pages
- ✅ CI/CD pipeline working
- ✅ README complete
- ✅ All features accessible in live demo

---

## Communication

**Agents communicate via:**
- GitHub PRs (code review comments)
- Git commits (clear messages)
- Issues (bug reports, blockers)
- This document (source of truth)

**Felix (me) coordinates:**
- Monitor PR activity
- Escalate blockers to Marcus
- Report daily progress
- Ensure phases stay on track

---

## Next Steps

1. Developer: Clone repo, start Phase 1 backend setup
2. Reviewer: Prepare testing checklist
3. Deployer: Start GitHub Actions setup in parallel
4. Felix: Monitor progress, report to Marcus daily
