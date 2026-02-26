# Botting OS Backend

Express + Prisma + SQLite backend for Botting OS.

## Setup

```bash
cd backend
npm install
npx prisma db push
npm run db:seed    # Load mock data
npm run dev        # Start dev server on :3001
```

## API Routes (13 total)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard` | Aggregated stats (orders, profit, accounts, proxies) |
| GET | `/api/orders` | List orders (filter: `?status=`, `?site=`) |
| POST | `/api/orders` | Create order |
| GET | `/api/proxies` | List proxies (filter: `?status=`, `?type=`, `?provider=`) |
| POST | `/api/proxies` | Create proxy |
| PUT | `/api/proxies/:id` | Update proxy |
| DELETE | `/api/proxies/:id` | Delete proxy |
| GET | `/api/accounts` | List accounts (filter: `?status=`, `?site=`) |
| POST | `/api/accounts` | Create account |
| GET | `/api/expenses` | List expenses (filter: `?category=`) |
| POST | `/api/expenses` | Create expense |
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update settings (key-value pairs) |
| POST | `/api/discord/webhook` | Discord webhook listener (auto-creates orders from checkout embeds) |

## WebSocket

Connect to `ws://localhost:3001` for real-time events:
- `order:created`, `proxy:created`, `proxy:updated`, `proxy:deleted`
- `account:created`, `expense:created`
- `discord:checkout`, `discord:message`

## Tech Stack

- **Runtime:** Node.js + TypeScript (tsx)
- **Framework:** Express
- **ORM:** Prisma
- **Database:** SQLite
- **Real-time:** WebSocket (ws)
