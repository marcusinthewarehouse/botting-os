# Botting OS - Unified Operations Dashboard

A modern dashboard for managing bots, proxies, accounts, and orders in one place.

## Features (MVP)

- **Order Tracking** - Real-time order status from Discord
- **Proxy Health Dashboard** - Monitor proxy uptime, response times, detect dead proxies
- **Account Health Scoring** - Track account age, restrictions, success rate
- **Profit & ROI Dashboard** - Earnings, expenses, net profit, trends
- **Discord Bot Integration** - Automatic order capture from Discord webhooks
- **Real-time Updates** - WebSocket-powered live dashboard

## Quick Start

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

Backend runs at `http://localhost:3001`
Frontend runs at `http://localhost:3000`

## Documentation

- [MVP PRD](./BOTTING_OS_MVP_PRD.md) - Features and requirements
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Architecture, phases, tasks

## Team

- **Developer** - Builds code
- **Reviewer** - Tests and reviews PRs
- **Deployer** - Deploys to GitHub Pages and manages CI/CD

## Status

🚀 **In Development** - Phase 1 (Backend) starting now
