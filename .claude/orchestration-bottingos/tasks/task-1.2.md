# Task 1.2: Tauri Rust Database Commands

## Objective

Configure the Tauri v2 Rust backend to register tauri-plugin-sql with SQLite support, set up capabilities/permissions, and ensure the frontend can execute SQL queries against a local SQLite database file. This provides the backend execution layer that the Drizzle sqlite-proxy (Task 1.1) sends queries to.

## Context

BottingOS uses a layered architecture: Drizzle ORM in the Next.js frontend generates SQL strings, which are sent over Tauri IPC to `tauri-plugin-sql` (an official Tauri plugin using sqlx internally), which executes against a SQLite file on disk. This task sets up the Rust side of that pipeline. The frontend DB client (Task 1.1) already calls `Database.load('sqlite:bottingos.db')` and uses `.select()` / `.execute()` - we just need the plugin registered and permissions granted.

The key insight: we do NOT need custom Rust `#[tauri::command]` functions for basic DB operations. The `tauri-plugin-sql` JS bindings handle everything directly. Custom commands are only needed later for specialized operations (Discord CDP, price fetching, etc.).

## Dependencies

- Task 1.1 - Provides the schema and client code that will call these Rust-side plugins

## Blocked By

- Nothing (can be built in parallel with Task 1.1)

## Research Findings

### tauri-plugin-sql Architecture

The official `tauri-plugin-sql` plugin wraps sqlx. It handles:

- Connection pooling
- WAL mode for SQLite (concurrent reads during writes)
- Async execution
- Automatic serialization of results as JSON

The plugin is registered in Rust via `.plugin(tauri_plugin_sql::Builder::new().build())` and accessed from JS via `@tauri-apps/plugin-sql`. No custom commands needed for CRUD.

### Existing Rust Files

Current `src-tauri/src/lib.rs` and `src-tauri/src/main.rs` exist but need to be updated to register the SQL plugin and other required plugins.

### Cargo.toml Dependencies

```toml
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-store = "2"
tauri-plugin-fs = "2"
tauri-plugin-notification = "2"
tauri-plugin-http = "2"
tauri-plugin-dialog = "2"
tauri-plugin-process = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### Capabilities (Permissions)

Tauri v2 uses a capabilities system. All plugin access must be explicitly granted in `src-tauri/capabilities/default.json`. Without the correct permissions, JS calls to the plugin will silently fail or throw permission errors.

## Implementation Plan

### Step 1: Update Cargo.toml

Add all required plugin dependencies to `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-store = "2"
tauri-plugin-fs = "2"
tauri-plugin-notification = "2"
tauri-plugin-http = "2"
tauri-plugin-dialog = "2"
tauri-plugin-process = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### Step 2: Update lib.rs

Register all plugins in the Tauri builder. Keep it minimal - no custom commands yet.

```rust
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 3: Create Commands Module Structure

Set up the commands directory for future use (Tasks 1.3+, Phase 3+):

```rust
// src-tauri/src/commands/mod.rs
// Command modules will be added as features are built
// Currently empty - all DB access goes through tauri-plugin-sql JS bindings
```

### Step 4: Create Capabilities File

Create `src-tauri/capabilities/default.json` with all required permissions:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for BottingOS",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close",
    "store:default",
    "fs:default",
    "notification:default",
    "http:default",
    "dialog:default",
    "process:default"
  ]
}
```

### Step 5: Verify tauri.conf.json

Ensure `tauri.conf.json` has correct settings:

- `build.frontendDist` points to `../out`
- `build.devUrl` points to `http://localhost:3000`
- `app.windows[0].decorations` is `false` (custom titlebar)
- `app.security.csp` is `null`

### Step 6: Install Frontend Tauri Packages

```bash
npm install @tauri-apps/api @tauri-apps/plugin-sql @tauri-apps/plugin-store \
  @tauri-apps/plugin-http @tauri-apps/plugin-notification @tauri-apps/plugin-dialog \
  @tauri-apps/plugin-process @tauri-apps/plugin-updater @tauri-apps/plugin-fs
npm install -D @tauri-apps/cli
```

### Step 7: Test Plugin Registration

Run `npx tauri dev` and verify:

1. Rust compiles without errors
2. Tauri window opens pointing at Next.js dev server
3. In the browser console, verify `window.__TAURI__` exists
4. Test basic SQL: `const Database = (await import('@tauri-apps/plugin-sql')).default; const db = await Database.load('sqlite:test.db'); await db.execute('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)');`

## Files to Create

- `src-tauri/src/commands/mod.rs` - Empty commands module (placeholder for future)
- `src-tauri/capabilities/default.json` - Plugin permissions

## Files to Modify

- `src-tauri/Cargo.toml` - Add plugin dependencies
- `src-tauri/src/lib.rs` - Register all plugins
- `package.json` - Add @tauri-apps/\* frontend packages

## Contracts

### Provides (for downstream)

- Working `tauri-plugin-sql` that responds to `Database.load('sqlite:bottingos.db')` calls
- SQLite database file created automatically at app data directory
- All plugin permissions granted for SQL operations (load, execute, select, close)
- `@tauri-apps/plugin-sql` npm package installed and accessible

### Consumes (from upstream)

- Task 1.1 provides schema.ts (to know what SQL the frontend will generate, but not directly consumed by Rust)

## Acceptance Criteria

- [ ] `tauri-plugin-sql` with sqlite feature added to Cargo.toml
- [ ] All required plugins registered in lib.rs
- [ ] Capabilities file grants SQL permissions (load, execute, select, close)
- [ ] `npx tauri dev` compiles Rust without errors
- [ ] SQLite database file is created when `Database.load('sqlite:bottingos.db')` is called
- [ ] Basic SQL operations work from the frontend console (CREATE TABLE, INSERT, SELECT)
- [ ] All @tauri-apps/\* npm packages installed
- [ ] Commands module directory exists (empty, ready for future commands)

## Testing Protocol

### Unit/Integration Tests

- Verify Cargo.toml has all required dependencies
- Verify lib.rs registers all plugins without compilation errors

### Browser Testing (Playwright MCP)

- Open Tauri dev window
- Execute test SQL in browser console to verify plugin works
- Verify database file appears in app data directory

### Build/Lint/Type Checks

- `cd src-tauri && cargo check` passes
- `cd src-tauri && cargo build` compiles
- `npx tauri dev` launches without errors

## Skills to Read

- `.claude/skills/tauri-commands/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/tauri-nextjs-drizzle-implementation.md` (sections 2.2, 2.7)
- `.claude/orchestration-bottingos/research/desktop-app-architecture.md` (section 3)

## Git

- Branch: feat/1.2-rust-db-commands
- Commit message prefix: Task 1.2:
