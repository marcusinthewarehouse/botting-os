# Task 5.1: Discord Process Management (Rust)

## Objective

Detect, kill, and relaunch Discord with `--remote-debugging-port=9223` from the Tauri backend. This enables Chrome DevTools Protocol access for real-time message capture with zero ban risk.

## Context

Discord desktop is an Electron app (Chromium-based). All Electron apps support the `--remote-debugging-port` flag, which exposes CDP over a local WebSocket. BottingOS uses this to hook Discord's internal Flux dispatcher and capture messages in real-time - purely local, no Discord server interaction. This task builds the process management layer: finding Discord, killing it, relaunching with the CDP flag, and verifying the debug port is responsive.

By Phase 5, the app has: full SQLite/Drizzle data layer, 5 MVP features rebuilt (calculator, tracker, emails, vault, VCCs), marketplace pricing, webhook order tracking, and inventory management.

## Dependencies

- Phase 1: Tauri command infrastructure (src-tauri/src/commands/mod.rs, lib.rs)
- Cargo.toml with tokio, serde, serde_json, reqwest

## Blocked By

- Nothing (first task in Phase 5)

## Research Findings

### Process Discovery (macOS)

- `pgrep -x Discord` returns PID if running
- Discord binary at `/Applications/Discord.app/Contents/MacOS/Discord`
- Kill: `kill -9 PID` or `pkill -x Discord`
- Relaunch: `open -a Discord --args --remote-debugging-port=9223`
- Must wait ~3-5 seconds after relaunch for Discord to initialize

### Process Discovery (Windows)

- `tasklist /FI "IMAGENAME eq Discord.exe"` to find process
- Kill: `taskkill /F /IM Discord.exe`
- Relaunch: `%LOCALAPPDATA%\Discord\Update.exe --processStart Discord.exe --process-start-args --remote-debugging-port=9223`

### CDP Verification

- HTTP GET `http://127.0.0.1:9223/json/version` returns `{ Browser, Protocol-Version, ... }` when CDP is active
- HTTP GET `http://127.0.0.1:9223/json/list` returns array of debuggable targets
- Must find target with `type: "page"` and URL containing `discord.com/app` or title containing `Discord`
- The `webSocketDebuggerUrl` field on the target is used by Task 5.2 to connect

### Detection Analysis

Discord cannot detect CDP because:

- `--remote-debugging-port` is a Chromium feature, not a Discord feature
- No additional network traffic to Discord servers
- CDP connection is purely local (localhost)
- BetterDiscord/Vencord users do similar things without detection

### Crate Recommendations

- `reqwest` for HTTP health checks (already in Cargo.toml)
- `tokio` for async process management (already in Cargo.toml)
- Standard library `std::process::Command` for process launch/kill
- No need for `sysinfo` crate - platform-specific commands are simpler

## Implementation Plan

### Step 1: Create Discord Command Module

Create `src-tauri/src/commands/discord.rs` with types:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscordStatus {
    pub running: bool,
    pub debug_mode: bool,
    pub cdp_connected: bool,
    pub ws_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CdpTarget {
    pub title: String,
    #[serde(rename = "type")]
    pub target_type: String,
    pub url: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    pub ws_url: String,
}

#[derive(Debug, Deserialize)]
pub struct CdpVersion {
    #[serde(rename = "Browser")]
    pub browser: String,
    #[serde(rename = "Protocol-Version")]
    pub protocol_version: String,
}
```

### Step 2: Implement check_discord_status Command

```rust
#[tauri::command]
pub async fn check_discord_status() -> Result<DiscordStatus, String>
```

- Check if Discord process exists via platform-specific command
- If running, try HTTP GET to `http://127.0.0.1:9223/json/version`
- If CDP responds, fetch `/json/list` to find Discord page target
- Return DiscordStatus with all fields populated

### Step 3: Implement start_discord_cdp Command

```rust
#[tauri::command]
pub async fn start_discord_cdp() -> Result<DiscordStatus, String>
```

Flow:

1. Check if Discord is already running with CDP (`check_discord_status`)
2. If already connected, return current status
3. Kill existing Discord process (platform-specific)
4. Wait 2 seconds for clean shutdown
5. Relaunch with CDP flag (platform-specific)
6. Poll `http://127.0.0.1:9223/json/version` every 1 second, up to 30 seconds timeout
7. Once CDP responds, fetch `/json/list` and find Discord page target
8. Return DiscordStatus with `ws_url` set to the target's `webSocketDebuggerUrl`

### Step 4: Implement stop_discord_cdp Command

```rust
#[tauri::command]
pub async fn stop_discord_cdp() -> Result<(), String>
```

- Kill Discord process
- Optionally relaunch without CDP flag (normal mode)

### Step 5: Platform-Specific Helpers

Create private helper functions:

- `fn is_discord_running() -> bool`
- `fn kill_discord() -> Result<(), String>`
- `fn launch_discord_with_cdp() -> Result<(), String>`
- `fn find_discord_path() -> Option<String>`
- `async fn wait_for_cdp(timeout_secs: u64) -> Result<CdpVersion, String>`
- `async fn find_discord_target() -> Result<CdpTarget, String>`

### Step 6: Register Commands

Add to `src-tauri/src/commands/mod.rs`:

```rust
pub mod discord;
pub use discord::{start_discord_cdp, check_discord_status, stop_discord_cdp};
```

Add to `src-tauri/src/lib.rs` invoke_handler:

```rust
commands::start_discord_cdp,
commands::check_discord_status,
commands::stop_discord_cdp,
```

## Files to Create

- `src-tauri/src/commands/discord.rs` - Discord process management commands, types, platform helpers

## Files to Modify

- `src-tauri/src/commands/mod.rs` - Add `pub mod discord;` and re-exports
- `src-tauri/src/lib.rs` - Register three new commands in `invoke_handler`

## Contracts

### Provides

- `start_discord_cdp()` -> `Result<DiscordStatus, String>` - Kills Discord, relaunches with CDP, returns status with `ws_url`
- `check_discord_status()` -> `Result<DiscordStatus, String>` - Non-destructive status check
- `stop_discord_cdp()` -> `Result<(), String>` - Kills Discord CDP session
- `DiscordStatus` type: `{ running: bool, debug_mode: bool, cdp_connected: bool, ws_url: Option<String> }`
- `CdpTarget` type: `{ title, target_type, url, ws_url }`

### Consumes

- `reqwest::Client` for HTTP health checks
- `tokio` for async sleep/polling
- `std::process::Command` for process management

## Acceptance Criteria

- [ ] `check_discord_status` correctly detects Discord running/not running on macOS
- [ ] `check_discord_status` detects whether CDP port 9223 is responsive
- [ ] `start_discord_cdp` kills existing Discord process cleanly
- [ ] `start_discord_cdp` relaunches Discord with `--remote-debugging-port=9223`
- [ ] `start_discord_cdp` polls until CDP is responsive (max 30s timeout)
- [ ] `start_discord_cdp` finds the Discord page target and returns its `webSocketDebuggerUrl`
- [ ] `stop_discord_cdp` kills the Discord process
- [ ] All commands handle "Discord not installed" gracefully with clear error message
- [ ] Platform-specific code is behind `#[cfg(target_os = "...")]` attributes
- [ ] Commands are registered in lib.rs invoke_handler
- [ ] Rust compiles without errors

## Testing Protocol

### Unit Tests

- Test `CdpTarget` and `CdpVersion` deserialization from sample JSON
- Test `DiscordStatus` serialization
- Test `find_discord_path()` returns correct path for current platform

### Build Checks

- `cargo build` succeeds with no errors
- `cargo clippy` passes with no warnings
- All commands callable via `invoke()` from frontend (manual test in dev)

### Manual Integration Test

1. Run `npx tauri dev`
2. Open devtools console
3. `await invoke('check_discord_status')` - verify correct status
4. `await invoke('start_discord_cdp')` - Discord restarts, verify CDP port
5. `await invoke('check_discord_status')` - verify `debug_mode: true`, `ws_url` populated
6. `await invoke('stop_discord_cdp')` - Discord stops
7. Test with Discord not installed - verify clean error

## Skills to Read

- `.claude/skills/tauri-commands/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/discord-cdp-implementation.md`
- `.claude/orchestration-bottingos/research/discord-realtime-capture.md`

## Git

- Branch: `feat/5.1-discord-process`
- Commit prefix: `Task 5.1:`
