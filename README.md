# Botting OS - Unified Operations Dashboard

A modern dashboard for managing bots, proxies, accounts, and orders in one place.

## Features (MVP)

- **Order Tracking** - Real-time order status from Discord
- **Proxy Health Dashboard** - Monitor proxy uptime, response times, detect dead proxies
- **Account Health Scoring** - Track account age, restrictions, success rate
- **Profit & ROI Dashboard** - Earnings, expenses, net profit, trends
- **Discord Bot Integration** - Automatic order capture from Discord webhooks
- **Real-time Updates** - WebSocket-powered live dashboard

## 🚀 Live Demo

**Frontend Demo:** https://marcusinthewarehouse.github.io/botting-os/

Deployed automatically on every merge to `main` via GitHub Pages.

## Quick Start

### Local Development

#### Backend Setup
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```
Backend runs at `http://localhost:3001`

#### Frontend Setup (Phase 2+)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`

### Development Workflow

1. **Clone the repo**
   ```bash
   git clone https://github.com/marcusinthewarehouse/botting-os.git
   cd botting-os
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```

4. **Push and open a PR**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **PR Checks**
   - GitHub Actions runs CI pipeline automatically
   - Tests must pass before merge
   - Changes are reviewed

6. **Merge to main**
   - After approval, merge your PR to `main`
   - CI pipeline runs
   - If successful, frontend automatically deploys to GitHub Pages

## Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Frontend Tests (Phase 2+)
```bash
cd frontend
npm test
```

### CI/CD Pipeline

Tests run automatically on:
- Every push to any branch
- Every pull request
- Every merge to `main`

Status is reported in PR checks.

## Deployment

### Automatic Deployment
- Merged code to `main` → automatically built and deployed to GitHub Pages
- No manual deployment steps needed
- Takes ~2-3 minutes

### Manual Deployment (if needed)
```bash
# Trigger deployment manually
# Go to Actions tab → "Deploy to GitHub Pages" → "Run workflow"
```

## Documentation

- [MVP PRD](./BOTTING_OS_MVP_PRD.md) - Features and requirements
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Architecture, phases, tasks

## Team

- **Developer** - Builds code
- **Reviewer** - Tests and reviews PRs
- **Deployer** - Manages CI/CD and GitHub Pages deployment

## Status

- **Phase 1 (Backend):** 🚀 In Progress
- **Phase 2 (Frontend):** ⏳ Upcoming
- **Phase 3 (Polish):** ⏳ Upcoming
- **Phase 4 (Deploy):** ⏳ Upcoming

Last deployment: Check [Actions](https://github.com/marcusinthewarehouse/botting-os/actions) for latest status
