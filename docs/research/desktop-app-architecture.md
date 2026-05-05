# Desktop App Architecture Research - BottingOS

**Date**: 2026-03-07
**Focus**: Tauri v2 + Next.js desktop app, distribution, local database, auth, mobile

---

## 1. Tauri v2 - Current State

Tauri v2 reached **stable release on October 2, 2024**. It is actively maintained with regular updates (bundler v2.8.1, wry v0.54.2 as of early 2026). The framework is production-ready for desktop (macOS, Windows, Linux) and has official mobile support (iOS, Android).

**How it works**: Tauri uses the system's native WebView (WebKit on macOS, WebView2 on Windows) instead of bundling Chromium. The backend is Rust. Your Next.js frontend renders in the WebView, and you communicate with Rust via Tauri's `invoke()` IPC.

**Key advantage**: ~3MB app bundle vs ~100MB+ Electron. RAM usage ~30-40MB vs ~200-300MB Electron. Startup under 500ms vs 1-2s Electron.

Sources:

- https://v2.tauri.app/blog/tauri-20/
- https://www.gethopp.app/blog/tauri-vs-electron

---

## 2. Tauri v2 + Next.js Integration

### The Critical Constraint: Static Export Only

Tauri has **no Node.js runtime**. Next.js must be built as a static export (`output: 'export'` in next.config.ts). This means:

**What works:**

- App Router (fully supported)
- Client Components (`'use client'`)
- Static Route Handlers
- Client-side data fetching (fetch, SWR, React Query)
- Tailwind CSS, shadcn/ui - all fine
- `next/link`, client-side navigation

**What does NOT work:**

- Server Components that use dynamic functions (`cookies()`, `headers()`)
- API Routes (no server to run them)
- Server Actions
- SSR / `getServerSideProps`
- `next/image` optimization (must set `unoptimized: true`)
- `useParams()` has known issues with static export
- Middleware (runs on server)

### Configuration Required

```ts
// next.config.ts
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};
```

### Tauri API Import Gotcha

Next.js dev server runs Node.js for HMR. Importing Tauri's `invoke()` at the top level causes errors because `window.__TAURI__` doesn't exist in Node. **Solution**: Import Tauri APIs lazily inside client components or use dynamic imports.

```ts
// WRONG - breaks in dev
import { invoke } from "@tauri-apps/api/core";

// RIGHT - lazy import in useEffect or event handler
const { invoke } = await import("@tauri-apps/api/core");
```

### Alternative: Sidecar Approach (NOT recommended for BottingOS)

You can bundle Node.js as a Tauri sidecar (~84MB Node runtime) and run Next.js standalone server. This gives you full SSR but:

- Bundle balloons to ~160MB (defeats Tauri's size advantage)
- Complex setup with dynamic port management
- `NEXT_PUBLIC_` env vars baked at build time cause WebSocket issues
- Essentially rebuilding Electron with extra steps

**Recommendation for BottingOS**: Use static export. The app is a local tool - all data lives on disk. No need for SSR. Use Tauri's Rust backend for anything that would have been an API route.

### Setup Steps

1. Existing Next.js project + `output: 'export'`
2. `npm create tauri-app` or manually add Tauri to existing project
3. Configure `tauri.conf.json` to point at Next.js build output (`out/` directory)
4. For dev: Tauri points at `http://localhost:3000` (Next.js dev server)
5. For build: `next build` produces `out/`, then `tauri build` wraps it

Templates/references:

- https://github.com/kvnxiao/tauri-nextjs-template (Next.js + Tauri v2 + Tailwind + App Router)
- https://github.com/Arbarwings/tauri-v2-nextjs-monorepo (monorepo with web + desktop + mobile)
- https://v2.tauri.app/start/frontend/nextjs/ (official docs)

Sources:

- https://v2.tauri.app/start/frontend/nextjs/
- https://nextjs.org/docs/app/guides/static-exports
- https://github.com/vercel/next.js/discussions/90982
- https://srsholmes.com/posts/next-js-api-routes-with-tauri

---

## 3. Local Database Strategy

### Recommended: tauri-plugin-sql (SQLite) + Drizzle ORM

**Why SQLite**: File-based, zero-config, no server needed, perfect for desktop apps. The database is a single file in the user's app data directory.

**Architecture**:

```
[Next.js Frontend (Client Components)]
        |
   invoke() IPC
        |
[Tauri Rust Backend]
        |
   tauri-plugin-sql (sqlx)
        |
   [SQLite file on disk]
```

### Option A: tauri-plugin-sql (official)

The official Tauri SQL plugin provides SQLite/MySQL/PostgreSQL drivers through sqlx. You can execute queries from both Rust and JavaScript/TypeScript.

```bash
# Rust
cargo add tauri-plugin-sql --features sqlite
# JS
npm add @tauri-apps/plugin-sql
```

### Option B: Drizzle ORM via Proxy (recommended)

Drizzle ORM has a `sqlite-proxy` driver designed exactly for this pattern. Drizzle generates SQL in the frontend, sends it to Tauri's Rust backend via `invoke()`, and the backend executes with sqlx.

Benefits:

- Type-safe schema definitions in TypeScript
- Migrations managed by Drizzle Kit
- Runs entirely client-side (schema + query building)
- Backend is just a thin SQL executor

Setup reference: https://dev.to/meddjelaili/building-a-tauri-v2-drizzle-sqlite-app-starter-template-15bm

### Prisma - NOT Recommended for Tauri

Prisma requires a query engine binary and Node.js runtime. It has known issues in Tauri production builds (binary not found, path resolution breaks). **Skip Prisma for the desktop app.** Use Drizzle or raw tauri-plugin-sql.

### Data Location

SQLite file stored in Tauri's app data directory:

- macOS: `~/Library/Application Support/com.bottingos.app/`
- Windows: `%APPDATA%/com.bottingos.app/`
- Linux: `~/.local/share/com.bottingos.app/`

### Migration from localStorage

The existing MVP uses localStorage. Migration path:

1. On first launch of Tauri version, read localStorage data
2. Insert into SQLite tables
3. Delete localStorage entries
4. All future reads/writes go through SQLite

### Future Cloud Sync

If you add cloud sync later (Supabase/Postgres), the pattern is:

- SQLite is the local source of truth
- Background sync pushes/pulls changes to remote Postgres
- Turso (libSQL) is an option - SQLite-compatible with built-in sync
- Reference: https://dev.to/huakun/building-a-local-first-tauri-app-with-drizzle-orm-encryption-and-turso-sync-31pn

Sources:

- https://v2.tauri.app/plugin/sql/
- https://dev.to/meddjelaili/building-a-tauri-v2-drizzle-sqlite-app-starter-template-15bm
- https://dev.to/huakun/drizzle-sqlite-in-tauri-app-kif
- https://github.com/prisma/prisma/discussions/20103

---

## 4. Desktop-Specific Features (Tauri Plugins)

All official plugins: https://v2.tauri.app/plugin/

### System Tray

- **Plugin**: Built-in (feature flag `tray-icon`)
- **What**: App icon in macOS menu bar / Windows system tray with context menu
- **Use for BottingOS**: Quick access, background monitoring, notification badges

### Autostart

- **Plugin**: `tauri-plugin-autostart`
- **What**: Launch app at system startup
- **Platforms**: macOS (Launch Agent), Windows, Linux
- **Use for BottingOS**: Optional user preference for always-on monitoring

### Notifications

- **Plugin**: `tauri-plugin-notification`
- **What**: Native OS notifications (also works via Web Notification API)
- **Use for BottingOS**: Drop alerts, order status updates, webhook events

### File System

- **Plugin**: `tauri-plugin-fs`
- **What**: Read/write files with configurable scope
- **Use for BottingOS**: CSV import/export, backup files

### Secure Storage / Encryption

- **Plugin**: `tauri-plugin-secure-storage` or `tauri-plugin-keyring`
- **What**: Store secrets in OS keychain (macOS Keychain, Windows Credential Manager)
- **Use for BottingOS**: Password vault master key, API tokens, OAuth tokens
- **Note**: `tauri-plugin-stronghold` exists but is deprecated (will be removed in v3). Use keyring-based solutions instead.

### Store (Key-Value)

- **Plugin**: `tauri-plugin-store`
- **What**: Persistent JSON key-value storage (like a better localStorage)
- **Use for BottingOS**: User preferences, UI state, non-sensitive settings

### Deep Linking

- **Plugin**: `tauri-plugin-deep-link`
- **What**: Register custom URL scheme (e.g., `bottingos://callback`)
- **Use for BottingOS**: OAuth callback handling, opening app from browser

### HTTP Client

- **Plugin**: `tauri-plugin-http`
- **What**: Make HTTP requests from the Rust backend (bypasses CORS)
- **Use for BottingOS**: Marketplace API calls, webhook sending, price fetching

### Updater

- **Plugin**: `tauri-plugin-updater`
- **What**: Auto-update mechanism for desktop apps
- **Use for BottingOS**: Push updates to users without manual re-download

Sources:

- https://v2.tauri.app/plugin/
- https://v2.tauri.app/learn/system-tray/
- https://v2.tauri.app/plugin/autostart/
- https://v2.tauri.app/plugin/file-system/
- https://crates.io/crates/tauri-plugin-secure-storage

---

## 5. Distribution - Sharing Builds

### macOS Distribution

**Build output**: `tauri build` produces both `.app` bundle and `.dmg` installer.

**Unsigned builds (for testing with friends)**:

- macOS Gatekeeper blocks unsigned apps downloaded from the internet
- The downloaded file gets a `com.apple.quarantine` extended attribute
- **Bypass for testers**: Run `xattr -dr com.apple.quarantine /path/to/BottingOS.app` in Terminal
- Alternative: Right-click > Open (works for first launch only)
- macOS Sequoia (15+) has stricter controls - xattr method still works but requires Terminal
- **Practical approach**: Zip the .app, send via AirDrop/Google Drive/Discord, tell friend to run the xattr command

**Code signing (for real distribution)**:

- Requires Apple Developer Program: **$99/year**
- Includes code signing certificate + notarization
- Notarized apps pass Gatekeeper without user intervention
- Tauri has built-in support: `tauri build` handles signing if certs are configured
- Guide: https://v2.tauri.app/distribute/sign/macos/

### Windows Distribution

**Build output**: `.exe` installer (NSIS) or `.msi` (WiX).

**Unsigned builds**:

- Windows SmartScreen shows "Windows protected your PC" warning
- User clicks "More info" > "Run anyway" - easier than macOS
- If shared via download (not browser), SmartScreen may not trigger at all

**Code signing**:

- EV code signing certificates: ~$200-400/year from third-party CAs
- Standard OV certificates: ~$70-200/year
- Removes SmartScreen warnings
- Guide: https://v2.tauri.app/distribute/sign/windows/

### Practical Testing Distribution Plan

1. **Phase 1 (now)**: Zip .app/.exe, send to friend, provide xattr instructions for Mac
2. **Phase 2 (beta)**: Set up GitHub Actions with `tauri-action` to auto-build on push
3. **Phase 3 (launch)**: Apple Developer ($99/yr) + Windows code signing for clean installs
4. **Phase 4 (scale)**: Tauri updater plugin for auto-updates

### GitHub Actions CI/CD

The `tauri-apps/tauri-action` GitHub Action builds for macOS, Windows, and Linux automatically. It can:

- Build on every push/PR
- Create GitHub Releases with downloadable binaries
- Handle code signing in CI

Source: https://github.com/tauri-apps/tauri-action

Sources:

- https://v2.tauri.app/distribute/dmg/
- https://v2.tauri.app/distribute/sign/macos/
- https://v2.tauri.app/distribute/sign/windows/
- https://www.techbloat.com/macos-sequoia-bypassing-gatekeeper-to-install-unsigned-apps.html
- https://developer.apple.com/programs/

---

## 6. Tauri vs Electron Comparison

| Aspect                        | Tauri v2                        | Electron                   |
| ----------------------------- | ------------------------------- | -------------------------- |
| Bundle size                   | ~2.5-3 MB                       | ~85-100 MB                 |
| RAM usage                     | ~30-40 MB                       | ~200-300 MB                |
| Startup time                  | <500ms                          | 1-2 seconds                |
| Rendering                     | System WebView                  | Bundled Chromium           |
| Backend                       | Rust                            | Node.js                    |
| Mobile support                | Yes (iOS/Android)               | No (Electron only desktop) |
| Ecosystem maturity            | Growing (stable since Oct 2024) | Very mature (10+ years)    |
| Learning curve                | Higher (Rust if needed)         | Lower (all JS)             |
| Cross-platform UI consistency | Varies by OS WebView            | Identical everywhere       |

**Why Tauri for BottingOS**:

1. Tiny bundle - easy to zip and send to friends
2. Low resource usage - botters run many apps simultaneously
3. Mobile support path - same codebase for future iOS app
4. Security - Rust backend, no Node.js attack surface
5. Modern - aligned with where desktop dev is heading

**Trade-off to know**: WebView rendering can differ slightly between macOS and Windows. Test on both. In practice, with Tailwind/shadcn, differences are minimal.

Sources:

- https://www.gethopp.app/blog/tauri-vs-electron
- https://www.levminer.com/blog/tauri-vs-electron
- https://www.dolthub.com/blog/2025-11-13-electron-vs-tauri/

---

## 7. Auth on Desktop

### Clerk on Desktop

A community-maintained `tauri-plugin-clerk` exists (https://github.com/Nipsuli/tauri-plugin-clerk), but **OAuth flows do not work** with it currently. This is a significant limitation.

### Recommended OAuth Flow for Tauri

The standard pattern for desktop OAuth:

1. App opens system browser to auth provider's login page
2. User authenticates in browser
3. Auth provider redirects to custom URL scheme (`bottingos://auth/callback?code=...`)
4. Tauri's deep-link plugin catches the redirect
5. App exchanges auth code for tokens
6. Tokens stored in OS keychain via secure-storage plugin

**Alternative**: Spawn a temporary localhost HTTP server to catch the OAuth redirect (tauri-plugin-oauth pattern). Simpler but less clean.

### Auth Strategy Options for BottingOS

**Option A: Clerk with browser-based flow**

- Use Clerk's hosted pages for sign-in
- Deep link back to app after auth
- Clerk's JS SDK manages tokens client-side
- Pro: Familiar, feature-rich (email, social login, MFA)
- Con: Requires internet, dependency on Clerk servers

**Option B: Supabase Auth**

- Similar OAuth flow via browser
- Deep link callback
- Pro: Self-hostable, pairs with Supabase if using it for cloud sync
- Con: More setup than Clerk

**Option C: Local-only auth (simplest for MVP)**

- Master password stored in OS keychain
- No account creation, no cloud dependency
- App is local-first, auth is just for encryption
- Pro: Works offline, no auth service costs
- Con: No cloud sync, no password recovery

**Option D: Better Auth (emerging option)**

- `better-auth-tauri` plugin exists for Tauri integration
- Handles OAuth + magic link flows
- Open source, self-hosted

**Recommendation**: For MVP / testing with friends, use local-only auth (Option C). When you add cloud sync and subscriptions, switch to Clerk or Supabase Auth with deep-link OAuth flow.

Sources:

- https://github.com/Nipsuli/tauri-plugin-clerk
- https://v2.tauri.app/plugin/deep-linking/
- https://github.com/FabianLars/tauri-plugin-oauth
- https://github.com/daveyplate/better-auth-tauri
- https://medium.com/@nathancovey23/supabase-google-oauth-in-a-tauri-2-0-macos-app-with-deep-links-f8876375cb0a

---

## 8. Tauri v2 Mobile (iOS/Android)

### Current Status

Mobile support shipped with Tauri v2 stable (Oct 2024). It uses:

- **iOS**: WKWebView + Swift for native plugins
- **Android**: Android WebView + Kotlin for native plugins

### Maturity

A developer who built **4 production mobile apps** with Tauri in 2025 reported being "very happy with the experience" and plans to use it for future projects.

**Known limitations**:

- Rust compilation is slow (the main pain point)
- Disk space: Rust build artifacts are large, regular cleanup needed
- UI testing on mobile is manual/painful
- Not as mature as Flutter or React Native for mobile-specific UIs
- Some plugins are desktop-only (check plugin docs for platform support)

### Mobile Build Requirements

- **iOS**: macOS + Xcode + iOS Simulator or physical device
- **Android**: Android Studio + NDK + emulator or physical device
- Both require Rust cross-compilation toolchains

### Practical Assessment for BottingOS

Mobile via Tauri is viable but secondary. The botting use case is desktop-first (managing accounts, tracking inventory). The mobile use case (quick profit check at store) could be:

1. **Tauri mobile** - same codebase, but you'd need to optimize UI for touch/small screens
2. **Separate native iOS app** - better UX but separate codebase
3. **PWA** - PRD says no, but simplest for "check price at store" use case

**Recommendation**: Build desktop first. When mobile demand is proven, evaluate whether Tauri mobile or a dedicated mobile app makes more sense. The shared codebase advantage of Tauri mobile is real but the mobile UI will need significant adaptation regardless.

Sources:

- https://blog.erikhorton.com/2025/10/05/4-mobile-apps-with-tauri-a-retrospective.html
- https://v2.tauri.app/develop/plugins/develop-mobile/
- https://tasukehub.com/articles/tauri-v2-mobile-guide-2025

---

## 9. Gotchas and Dealbreakers

### No Dealbreakers Found

Tauri v2 + Next.js static export is a well-trodden path. No fundamental blockers.

### Gotchas to Watch

1. **Static export means no API routes** - All backend logic goes through Tauri's Rust IPC. This is actually fine for a desktop app - think of Rust as your "server."

2. **next/image must be unoptimized** - Use `<img>` tags or set `unoptimized: true`. Not a real problem.

3. **Tauri API imports break SSR/HMR** - Always lazy-import `@tauri-apps/api` inside client components.

4. **Dev experience requires two processes** - Next.js dev server + Tauri dev. The `tauri dev` command handles this automatically.

5. **Rust compilation is slow on first build** - First `tauri build` takes 5-10 minutes. Subsequent builds are much faster (incremental).

6. **WebView differences** - Safari WebKit on macOS vs Chromium-based WebView2 on Windows. Test on both. Tailwind + shadcn reduces issues.

7. **macOS Gatekeeper** - Unsigned apps need xattr workaround. Acceptable for friend testing, need $99/yr Apple Dev for real distribution.

8. **No hot reload for Rust code** - Frontend hot reloads via Next.js. Rust backend changes require restart. Keep Rust layer thin.

---

## 10. Recommended Architecture for BottingOS

```
bottingos/
  src/                    # Next.js frontend (App Router, static export)
    app/
      layout.tsx
      page.tsx
      (feature)/          # Feature routes
    components/           # UI components (shadcn)
    lib/
      db/                 # Drizzle schema + queries
      tauri/              # Tauri IPC wrappers
  src-tauri/              # Tauri / Rust backend
    src/
      main.rs             # App setup, plugin registration
      commands/           # IPC command handlers
      db.rs               # SQLite setup via tauri-plugin-sql
    tauri.conf.json       # Tauri config
    Cargo.toml
  drizzle/                # Drizzle migrations
  next.config.ts          # output: 'export'
  package.json
```

### Data Flow

```
UI Component
  -> Drizzle query builder (generates SQL string)
  -> invoke('run_sql', { query, params })
  -> Rust command handler
  -> sqlx executes against SQLite
  -> Returns JSON to frontend
```

### Key Decisions

| Decision     | Choice                           | Reason                                         |
| ------------ | -------------------------------- | ---------------------------------------------- |
| Framework    | Tauri v2                         | Small bundle, native feel, mobile path         |
| Frontend     | Next.js 16 static export         | Already built, App Router works                |
| Database     | SQLite via tauri-plugin-sql      | Local-first, zero config, fast                 |
| ORM          | Drizzle (sqlite-proxy)           | Type-safe, works in browser, no Node needed    |
| Auth (MVP)   | Local master password            | Simplest, works offline                        |
| Auth (later) | Clerk/Supabase + deep link OAuth | When cloud sync ships                          |
| Encryption   | Web Crypto + OS keychain         | AES-256-GCM for vault, keychain for master key |
| Distribution | Zip .app/exe for testing         | xattr workaround for Mac testers               |

### Implementation Priority

1. Add Tauri to existing Next.js project
2. Configure static export
3. Set up tauri-plugin-sql with SQLite
4. Set up Drizzle ORM with sqlite-proxy
5. Migrate localStorage data to SQLite
6. Add system tray + notifications
7. Build and test on macOS
8. Cross-compile and test on Windows
9. Set up GitHub Actions for automated builds

---

## 11. Quick Reference - Commands

```bash
# Add Tauri to existing project
npm install @tauri-apps/cli@latest
npx tauri init

# Dev mode (runs Next.js + Tauri together)
npx tauri dev

# Build for current platform
npx tauri build

# Build outputs
# macOS: src-tauri/target/release/bundle/dmg/BottingOS.dmg
# macOS: src-tauri/target/release/bundle/macos/BottingOS.app
# Windows: src-tauri/target/release/bundle/nsis/BottingOS_setup.exe

# Share unsigned macOS build
zip -r BottingOS.zip src-tauri/target/release/bundle/macos/BottingOS.app
# Recipient runs:
xattr -dr com.apple.quarantine /path/to/BottingOS.app
```
