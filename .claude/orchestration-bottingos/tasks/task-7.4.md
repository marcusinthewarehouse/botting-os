# Task 7.4: Tauri Build & Distribution

## Objective

Configure Tauri for production builds, generate a .dmg installer for macOS, set up GitHub Actions for automated release builds, create INSTALL.md with unsigned build instructions, and configure auto-updater with a placeholder endpoint.

## Context

BottingOS is feature-complete. This task packages it for distribution. Since we don't have an Apple Developer certificate, the .dmg will be unsigned - users will need to right-click > Open to bypass Gatekeeper. The GitHub Actions workflow automates builds on release tags. Auto-updater config is set up with a placeholder URL that can be pointed at a real endpoint later.

## Dependencies

- All features complete (Phases 1-7)
- tauri.conf.json exists from Phase 1
- App icons in src-tauri/icons/

## Blocked By

- Nothing (build/distribution is independent of features)

## Research Findings

### tauri.conf.json Key Fields

```json
{
  "productName": "BottingOS",
  "identifier": "com.bottingos.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3000",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "out"
  },
  "app": {
    "withGlobalTauri": false,
    "windows": [
      {
        "title": "BottingOS",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "minimumSystemVersion": "10.15"
    }
  }
}
```

### Build Command

```bash
npx tauri build
```

Output locations:

- macOS: `src-tauri/target/release/bundle/dmg/BottingOS_X.Y.Z_aarch64.dmg`
- macOS app: `src-tauri/target/release/bundle/macos/BottingOS.app`

### Unsigned Build on macOS

Without a signing certificate:

- macOS Gatekeeper will block the app
- User must: right-click .app > Open > click Open in dialog
- Or: `xattr -cr /Applications/BottingOS.app` in terminal
- Or: System Preferences > Security & Privacy > "Open Anyway"

### GitHub Actions Workflow

Use `tauri-apps/tauri-action` for CI builds:

```yaml
- uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tagName: v__VERSION__
    releaseName: "BottingOS v__VERSION__"
    releaseBody: "See CHANGELOG for details."
    releaseDraft: true
```

### Auto-Updater Config

Tauri v2 updater plugin:

```json
"plugins": {
    "updater": {
        "endpoints": ["https://releases.bottingos.app/check/{{target}}/{{arch}}/{{current_version}}"],
        "pubkey": ""
    }
}
```

The endpoint returns JSON:

```json
{
  "version": "1.0.1",
  "url": "https://releases.bottingos.app/download/...",
  "signature": "...",
  "notes": "Bug fixes"
}
```

For now, use a placeholder URL. The app will gracefully handle the endpoint being unreachable.

### App Icons

Need these icon sizes:

- 32x32.png
- 128x128.png
- 128x128@2x.png (256x256)
- icon.icns (macOS)
- icon.ico (Windows)
- icon.png (512x512, for Linux/general)

Use `npx tauri icon src-tauri/icons/app-icon.png` to generate all sizes from a single source.

## Implementation Plan

### Step 1: Configure tauri.conf.json

Update `src-tauri/tauri.conf.json` with production settings:

- `productName`: "BottingOS"
- `identifier`: "com.bottingos.app"
- `version` from package.json or set explicitly
- Window config: 1280x800 default, 900x600 min
- Bundle config: all targets, icon paths
- macOS minimum: 10.15

### Step 2: Generate App Icons

If not already present, create icons:

```bash
# From a source 512x512+ PNG
npx tauri icon path/to/source-icon.png
```

This generates all required sizes in `src-tauri/icons/`.

### Step 3: Configure Auto-Updater

Add updater plugin to Cargo.toml:

```toml
tauri-plugin-updater = "2"
```

Register in lib.rs:

```rust
.plugin(tauri_plugin_updater::Builder::new().build())
```

Add to tauri.conf.json:

```json
"plugins": {
    "updater": {
        "endpoints": ["https://releases.bottingos.app/check/{{target}}/{{arch}}/{{current_version}}"],
        "pubkey": ""
    }
}
```

Frontend update check (non-blocking, fails silently):

```typescript
async function checkForUpdates() {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update?.available) {
      // Show update notification
    }
  } catch {
    // Silently ignore - updater endpoint not configured yet
  }
}
```

### Step 4: Test Production Build

```bash
# Build frontend first
npm run build

# Build Tauri app
npx tauri build
```

Verify:

- .dmg is generated in `src-tauri/target/release/bundle/dmg/`
- .app is functional (right-click > Open to bypass Gatekeeper)
- App launches correctly from .dmg install
- SQLite database created in correct location
- All features work in production build

### Step 5: Create GitHub Actions Workflow

`.github/workflows/release.yml`:

```yaml
name: Release Build

on:
  push:
    tags:
      - "v*"

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: "src-tauri -> target"

      - name: Install dependencies
        run: npm ci

      - name: Build and release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "BottingOS ${{ github.ref_name }}"
          releaseBody: "See the assets below to download and install."
          releaseDraft: true
          prerelease: false
```

### Step 6: Create INSTALL.md

`INSTALL.md` at project root:

Contents:

- Prerequisites (macOS 10.15+)
- Download .dmg from GitHub Releases
- Install: drag to Applications
- First launch: right-click > Open (unsigned app instructions)
- Alternative: `xattr -cr` command
- Building from source instructions
- Troubleshooting common issues

### Step 7: Version Management

Ensure version is consistent across:

- `package.json` version field
- `src-tauri/tauri.conf.json` version field
- `src-tauri/Cargo.toml` version field

## Files to Create

- `.github/workflows/release.yml` - GitHub Actions release workflow
- `INSTALL.md` - Installation instructions for unsigned builds

## Files to Modify

- `src-tauri/tauri.conf.json` - Production bundle config, updater plugin, window settings
- `src-tauri/Cargo.toml` - Add tauri-plugin-updater, verify version
- `src-tauri/src/lib.rs` - Register updater plugin
- `src-tauri/capabilities/default.json` - Add updater permissions
- `package.json` - Verify version, add build scripts if needed

## Contracts

### Provides

- Production .dmg build for macOS
- GitHub Actions automated release workflow
- Auto-updater configuration (placeholder endpoint)
- INSTALL.md with unsigned build instructions
- Consistent version management

### Consumes

- All app features (Phases 1-7)
- Tauri v2 build system
- GitHub Actions
- tauri-plugin-updater

## Acceptance Criteria

- [ ] `npx tauri build` succeeds without errors
- [ ] .dmg generated in `src-tauri/target/release/bundle/dmg/`
- [ ] .app installs from .dmg correctly
- [ ] App launches from Applications folder (after Gatekeeper bypass)
- [ ] All features work in production build
- [ ] SQLite database created in correct app data directory
- [ ] Window title shows "BottingOS"
- [ ] App icon displays correctly in dock and app switcher
- [ ] Tray icon works in production build
- [ ] GitHub Actions workflow file valid YAML
- [ ] INSTALL.md includes clear unsigned app instructions
- [ ] Version consistent across package.json, tauri.conf.json, Cargo.toml
- [ ] Auto-updater configured (gracefully handles unreachable endpoint)
- [ ] No hardcoded development URLs in production build
- [ ] Bundle size reasonable (< 100MB for .dmg)

## Testing Protocol

### Build Tests

- `npm run build` succeeds (Next.js static export)
- `npx tauri build` succeeds (full production build)
- .dmg file generated with correct name and version
- .app inside .dmg is well-formed

### Installation Tests

1. Mount .dmg
2. Drag .app to Applications
3. Right-click > Open to bypass Gatekeeper
4. Verify app launches
5. Complete onboarding wizard
6. Test each feature section loads
7. Verify database created at `~/Library/Application Support/com.bottingos.app/`
8. Close and reopen - verify data persists

### CI Validation

- Validate `.github/workflows/release.yml` with `actionlint` or similar
- Dry-run the workflow steps locally where possible

### Build Checks

- `npx tsc --noEmit` passes
- `npm run build` succeeds
- `cargo build --release` succeeds
- `cargo clippy` passes

## Skills to Read

- `.claude/skills/tauri-commands/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/testing-deployment-implementation.md`
- `.claude/orchestration-bottingos/research/desktop-app-architecture.md`

## Git

- Branch: `feat/7.4-build-distribution`
- Commit prefix: `Task 7.4:`
