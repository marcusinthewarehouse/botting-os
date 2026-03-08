# Claude Code Architecture Research - BottingOS

**Domain:** Claude Code configuration, plugins, hooks, skills, and testing strategy
**Project:** BottingOS - Sneaker/retail botter operations management app
**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Tauri v2
**Date:** 2026-03-07

---

## 1. Phase Mapping - Plugins/Skills per m2c1 Execution Phase

### Phase 5: Tool Setup

| Action                  | Tool/Plugin                                                |
| ----------------------- | ---------------------------------------------------------- |
| Create PostToolUse hook | Prettier for TS/TSX/CSS (see Section 5)                    |
| Create slash commands   | `/test`, `/commit-push-pr`, `/dev` (project-specific)      |
| Create subagents        | `verify-app`, `code-simplifier`                            |
| Hook audit              | Run `/hookify:hookify` - may identify Tauri-specific hooks |
| CLAUDE.md baseline      | Add stack rules, shadcn conventions, Tauri patterns        |

### Phase 7: Skill Creation

| Skill                              | Purpose                                                             |
| ---------------------------------- | ------------------------------------------------------------------- |
| `shadcn-patterns`                  | shadcn/ui v4 component usage, dark theme tokens, Base UI primitives |
| `tauri-commands`                   | Tauri v2 command patterns, IPC bridge, window management            |
| `webhook-receiver`                 | Generic webhook endpoint patterns for bot integrations              |
| `marketplace-apis`                 | eBay/StockX/GOAT API contracts and auth flows                       |
| `encryption-vault`                 | Web Crypto AES-256-GCM patterns for password vault                  |
| Use `/skill-creator:skill-creator` | Guided creation for each skill                                      |
| Use `/firecrawl:skill-gen`         | Generate skills from Tauri v2 docs, shadcn v4 docs                  |

### Phase 9: PHASES.md Creation

| Action          | Tool/Plugin                                                     |
| --------------- | --------------------------------------------------------------- |
| Plan complement | Run `/superpowers:writing-plans` alongside main planning        |
| Context7        | Auto-fetches current Next.js 16 / Tauri v2 docs during planning |

### Execution (per task)

| Task Type            | Plugin/Tool                                                       |
| -------------------- | ----------------------------------------------------------------- |
| UI feature tasks     | `/frontend-design:frontend-design` (primary)                      |
| Autonomous iteration | `/ralph-loop:ralph-loop` for build-test-iterate cycles            |
| All tasks            | `typescript-lsp` auto-triggers for type checking                  |
| All tasks            | `serena` auto-triggers for AST analysis                           |
| All tasks            | `security-guidance` auto-triggers (critical for vault/encryption) |

### Task Verification (after each task)

| Action              | Tool/Plugin                                   |
| ------------------- | --------------------------------------------- |
| Code simplification | `/simplify`                                   |
| Final verification  | `/superpowers:verification-before-completion` |

### Phase Regression (last task per phase)

| Action             | Tool/Plugin                            |
| ------------------ | -------------------------------------- |
| Code review        | `/code-review:code-review` on phase PR |
| Playwright testing | Playwright MCP for UI regression       |

### Phase 12: Final Artifacts

| Action                 | Tool/Plugin                                |
| ---------------------- | ------------------------------------------ |
| CLAUDE.md optimization | `/claude-md-management:claude-md-improver` |

---

## 2. UI Task Mapping (User's #1 Priority)

The PRD emphasizes "Apple-level clean UI" as the top priority. Every UI task should use the following plugin stack:

### Primary UI Workflow

1. **`/frontend-design:frontend-design`** - Use for EVERY UI feature task. This produces production-grade shadcn/ui components with proper dark theme, responsive layout, and accessibility.
2. **`/ralph-loop:ralph-loop`** - Use when a UI task needs iterative refinement. The loop runs: build -> screenshot/Playwright check -> identify issues -> fix -> repeat. Ideal for pixel-perfect work.
3. **Playwright MCP** - Take screenshots after every UI change. Compare against design intent. This is the verification method for UI quality.

### UI Feature-to-Plugin Mapping

| Feature                     | Plugin                             | Notes                                                          |
| --------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| Dashboard layout + sidebar  | `/frontend-design`                 | Already has `app-sidebar.tsx` - redesign with Apple aesthetics |
| Flip Calculator             | `/frontend-design` + `/ralph-loop` | Mobile-first, needs responsive polish                          |
| Profit Tracker tables       | `/frontend-design`                 | Heavy use of shadcn Table, sortable columns                    |
| Email Manager (bulk import) | `/frontend-design`                 | Drag-drop zone, tag system, two-view toggle                    |
| Password Vault              | `/frontend-design`                 | Minimal, secure-feeling UI. Lock animation                     |
| VCC Tracker                 | `/frontend-design`                 | Card grid layout, linking UI                                   |
| Order Tracker               | `/frontend-design` + `/ralph-loop` | Real-time webhook updates, status badges                       |
| Analytics Dashboard         | `/frontend-design` + `/ralph-loop` | Charts (Recharts or similar), dark theme                       |
| Drop Calendar               | `/frontend-design`                 | Calendar component, event cards                                |

### Design System Setup (do early, Phase 1 of execution)

- Run `/figma:create-design-system-rules` if Figma mockups exist
- Create `shadcn-patterns` skill with: color tokens, spacing scale, component conventions
- Set dark theme as default (botters prefer dark UI)
- Define the "Apple-level" aesthetic: generous whitespace, subtle animations, SF Pro-like typography, muted colors with accent highlights

---

## 3. Quality Gates

### Per-Edit (PostToolUse Hook)

- Prettier formats every `.ts`, `.tsx`, `.css`, `.json` file on save
- ESLint auto-fix on `.ts`/`.tsx` files (catches unused imports, type issues)

### Per-Task Completion

1. `/simplify` - reviews changed code for duplication, dead code, complexity
2. `/superpowers:verification-before-completion` - comprehensive final check
3. `typescript-lsp` - type errors caught automatically during implementation
4. Playwright screenshot comparison - for any UI task

### Per-Phase Regression

1. `/code-review:code-review` on the phase PR
2. Full Playwright test suite for all features in the phase
3. `next build` must succeed (catches SSR issues, type errors, missing imports)
4. Manual spot-check by user (present screenshots)

### Pre-Deploy

1. `verify_identity()` safety gate (CogniLayer)
2. Full e2e Playwright suite on deployed version
3. Lighthouse audit for performance (optional but recommended)

---

## 4. Testing Strategy - Tauri Desktop App via Playwright

### The Core Question

Can we test the web version via Playwright and trust it translates to desktop?

### Answer: Yes, with caveats

**What Playwright CAN test (web layer - 90% of the app):**

- All UI rendering, layout, responsiveness
- Component interactions (clicks, forms, modals, sidebars)
- Client-side routing and navigation
- localStorage/IndexedDB persistence
- API calls to backend endpoints
- Webhook receiver endpoints
- Dark theme rendering
- Mobile viewport simulation

**What Playwright CANNOT test (Tauri-specific - 10%):**

- Tauri IPC commands (`invoke()` calls to Rust backend)
- Native file system access (encrypted vault file storage)
- Native window management (minimize to tray, auto-lock)
- Desktop notifications
- `.dmg`/`.exe` packaging and installation
- OS-level keyboard shortcuts
- Auto-updater

### Recommended Testing Architecture

```
Layer 1: Playwright on `next dev` (primary, automated)
  - All UI features, flows, edge cases
  - Run against http://localhost:3000
  - This is 90% of testing

Layer 2: Tauri command unit tests (Rust)
  - Test Tauri IPC commands in isolation
  - File system operations, encryption, window management
  - Use Tauri's built-in test utilities

Layer 3: Manual Tauri smoke test (human)
  - Build .app, install, verify native features work
  - Do this once per phase, not per task
  - Checklist: tray icon, auto-lock, file persistence, notifications
```

### Playwright Test Patterns for BottingOS

```typescript
// Example: Test flip calculator
await page.goto("/calculator");
await page.fill('[data-testid="item-name"]', "Nike Dunk Low");
await page.fill('[data-testid="purchase-price"]', "110");
await page.click('[data-testid="calculate-btn"]');
await expect(page.locator('[data-testid="ebay-profit"]')).toBeVisible();
await expect(page.locator('[data-testid="stockx-profit"]')).toBeVisible();

// Example: Test webhook receiver
const response = await page.request.post("/api/webhooks/cybersole", {
  data: { item: "Yeezy 350", price: 230, orderNumber: "CS-12345" },
});
expect(response.status()).toBe(200);
await page.goto("/orders");
await expect(page.locator("text=Yeezy 350")).toBeVisible();
```

### Test Data / Fixtures Needed

- Sample webhook payloads from Cybersole, Valor, NSB
- Sample CSV credit card statements (Chase, Capital One formats)
- Sample HideMyEmail address lists (750+ entries)
- Mock marketplace API responses (eBay, StockX, GOAT)
- Sample encrypted vault data

---

## 5. Hooks Configuration

### PostToolUse Hook (formatting after every edit)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### Additional Hooks to Consider

**ESLint PostToolUse (optional - may be noisy):**

```json
{
  "matcher": "Edit|Write",
  "hooks": [
    {
      "type": "command",
      "command": "npx eslint --fix \"$CLAUDE_FILE_PATH\" 2>/dev/null || true"
    }
  ]
}
```

Recommendation: Add this only if ESLint is configured with auto-fixable rules. Otherwise it produces warnings that clutter output.

**Stop Hook (end-of-task verification):**

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd /Users/marcushooshmand/Documents/Claude/bottingos && npx tsc --noEmit 2>&1 | tail -20"
          }
        ]
      }
    ]
  }
}
```

This runs TypeScript type checking before Claude considers a task "done." If there are type errors, they appear in context and Claude can fix them.

**Recommendation:** Start with Prettier PostToolUse only. Add ESLint and Stop hooks after Phase 1 of execution once the codebase conventions are established.

---

## 6. Skills to Create for BottingOS

### Skill 1: `shadcn-patterns`

**Priority:** HIGH (needed from task 1)
**Content:**

- shadcn/ui v4 component import patterns (Base UI primitives)
- Dark theme color tokens and CSS variable conventions
- Component composition patterns (Card + Table, Dialog + Form)
- The "Apple-level" design system rules: whitespace, typography, animations
- When to use shadcn vs custom components
- Responsive patterns for mobile-first (flip calculator in-store use case)

### Skill 2: `tauri-commands`

**Priority:** MEDIUM (needed when Tauri wrapper is added)
**Content:**

- Tauri v2 IPC command patterns (`#[tauri::command]`, `invoke()`)
- Window management (tray, auto-lock, minimize)
- File system access for encrypted vault
- Build configuration for `.dmg` and `.exe`
- How to structure code so it works in both web and desktop modes
- Feature detection: `window.__TAURI__` check for conditional Tauri features

### Skill 3: `webhook-testing`

**Priority:** MEDIUM (needed for order tracker / bot integration tasks)
**Content:**

- Generic webhook receiver endpoint pattern (`/api/webhooks/[bot]`)
- Sample payloads for Cybersole, Valor, NSB
- How to test webhooks locally (curl commands, Playwright request API)
- Webhook validation and security (HMAC signatures if bots support them)
- Error handling for malformed payloads

### Skill 4: `marketplace-apis`

**Priority:** LOW (needed for marketplace sync feature)
**Content:**

- eBay API: OAuth flow, Browse API for pricing, Fulfillment API for orders
- StockX API: authentication, product search, sales data
- GOAT API: authentication, pricing endpoints
- Rate limits and caching strategy
- Mock responses for development/testing

### Skill 5: `encryption-patterns`

**Priority:** LOW (vault already built, just needs migration from localStorage)
**Content:**

- Web Crypto API: AES-256-GCM encrypt/decrypt
- PBKDF2 key derivation from master password
- Secure storage patterns (Tauri secure store vs file system)
- Auto-lock implementation
- Zero-knowledge architecture (server never sees plaintext)

### Skill 6: `bottingos-data-model`

**Priority:** HIGH (needed for database migration from localStorage)
**Content:**

- Prisma schema for all entities: User, Account, Email, VCC, Order, InventoryItem, Transaction
- Relationships: Email -> Account -> Retailer, VCC -> Account, Order -> InventoryItem -> Transaction
- Migration strategy from localStorage to Prisma/PostgreSQL
- SQLite for local-first desktop mode vs PostgreSQL for cloud

---

## 7. Slash Commands to Create

### `/dev` - Start dev server and open browser

```yaml
name: dev
description: Start Next.js dev server
context: fork
allowed-tools: Bash(npm *), Bash(npx *)
---
Start the dev server and report the URL.
!`cd /Users/marcushooshmand/Documents/Claude/bottingos && npm run dev &`
Dev server running at http://localhost:3000
```

### `/ui-check` - Screenshot current state of a page

```yaml
name: ui-check
description: Take Playwright screenshot of a page for visual review
context: fork
allowed-tools: Bash(*), mcp__playwright__*
---
Navigate to the specified page, take a full-page screenshot, and describe the visual state.
Arg: $ARGUMENTS (the page path, e.g., /calculator or /emails)
```

### `/test` - Run test suite

```yaml
name: test
description: Run all tests
context: fork
allowed-tools: Bash(npm *), Bash(npx *)
---
Run the full test suite:
1. TypeScript type check: `npx tsc --noEmit`
2. ESLint: `npm run lint`
3. Build check: `npm run build`
4. Unit tests: `npx jest` (if configured)
Report pass/fail summary.
```

---

## 8. CLAUDE.md Rules to Add

These should be added to the project CLAUDE.md during Phase 5/12:

```markdown
## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui v4
- Desktop: Tauri v2 (future - web-first for now)
- DB: Prisma + SQLite (local-first) / PostgreSQL (cloud)
- Auth: Clerk

## Conventions

- Dark theme by default. All UI must look correct in dark mode.
- Use shadcn/ui components before building custom ones.
- Mobile-first responsive design (flip calculator used in-store on phone).
- All pages go in `src/app/(dashboard)/[feature]/page.tsx`.
- Shared components in `src/components/`. Feature-specific components colocated.
- No localStorage for data persistence - use Prisma.

## Build Commands

- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`

## Testing

- Primary: Playwright on http://localhost:3000
- Type check must pass before task completion
- Build must succeed before task completion
```

---

## 9. MCP Server Recommendations

### Already Available (from environment)

| MCP Server | Use For                                                                  |
| ---------- | ------------------------------------------------------------------------ |
| Playwright | UI testing, screenshots, user flow simulation                            |
| Supabase   | Database operations if using Supabase (alternative to Prisma/PostgreSQL) |
| CogniLayer | Memory, code search, impact analysis                                     |

### Recommended Additions

| MCP Server     | Use For                                     | When                  |
| -------------- | ------------------------------------------- | --------------------- |
| Context7       | Current library docs (Next.js 16, Tauri v2) | Always (auto-trigger) |
| TypeScript LSP | Real-time type checking                     | Always (auto-trigger) |

### Not Needed

- Stripe MCP (no payment processing in MVP - flat $5/mo via simple checkout)
- Slack MCP (no team collaboration features)

---

## 10. Risk Areas and Mitigations

### Risk 1: shadcn/ui v4 is new

shadcn recently moved to Base UI primitives. Docs may be sparse.

- **Mitigation:** Use `/firecrawl:skill-gen` to scrape latest shadcn docs into a skill. Context7 will also auto-fetch current docs.

### Risk 2: Tauri v2 + Next.js integration

Tauri v2 with Next.js App Router is a relatively new combination.

- **Mitigation:** Defer Tauri wrapping to a later phase. Build web-first, add Tauri after core features work. Create `tauri-commands` skill with tested patterns.

### Risk 3: "Apple-level UI" is subjective

The user's top priority is hard to verify programmatically.

- **Mitigation:** Use `/ralph-loop` for iterative UI refinement. Take Playwright screenshots at each iteration. Present to user for feedback at phase boundaries.

### Risk 4: localStorage to database migration

5 features currently use localStorage. Migration must not lose data.

- **Mitigation:** Build migration utility that reads localStorage and writes to Prisma. Test with fixture data. Keep localStorage as fallback during transition.

### Risk 5: Webhook receiver security

Bots send webhooks with order data. Must not be spoofable.

- **Mitigation:** Research which bots support HMAC signatures. At minimum, use unique per-user webhook URLs with random tokens.

---

## Summary: Plugin Usage Cheat Sheet

```
EVERY UI TASK:        /frontend-design:frontend-design
ITERATIVE POLISH:     /ralph-loop:ralph-loop
AFTER EACH TASK:      /simplify + /superpowers:verification-before-completion
PHASE PR REVIEW:      /code-review:code-review
CLAUDE.MD FINAL:      /claude-md-management:claude-md-improver
SKILL CREATION:       /skill-creator:skill-creator + /firecrawl:skill-gen
HOOK CREATION:        /hookify:hookify
PLANNING HELP:        /superpowers:writing-plans
AUTO (always on):     context7, typescript-lsp, serena, security-guidance, playwright
```
