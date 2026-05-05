# Task 5.2: CDP Message Capture (Rust)

## Objective

Connect to Discord's Chrome DevTools Protocol endpoint, hook the Flux dispatcher via JavaScript injection, and capture MESSAGE_CREATE events in real-time. Forward captured messages to the frontend via Tauri event emitter.

## Context

Task 5.1 provides the ability to launch Discord with CDP enabled and discover the WebSocket debugger URL. This task connects to that WebSocket, injects JavaScript into Discord's renderer to hook its internal Flux dispatcher, and captures all incoming messages. Messages are emitted as Tauri events that the frontend can listen to.

Architecture: Tauri Rust backend connects to Discord's CDP WebSocket -> sends `Runtime.evaluate` to inject JS -> JS hooks FluxDispatcher and logs messages with a prefix -> Rust listens for `Runtime.consoleAPICalled` events -> parses message payload -> emits `discord-message` Tauri event to frontend.

## Dependencies

- Task 5.1: Discord process management (start_discord_cdp, DiscordStatus with ws_url)
- Cargo.toml: tokio-tungstenite, futures-util, serde_json

## Blocked By

- Task 5.1 (needs `ws_url` from `start_discord_cdp()`)

## Research Findings

### CDP WebSocket Protocol

- GET `http://127.0.0.1:9223/json/list` returns array of targets with `webSocketDebuggerUrl`
- Connect via WebSocket to that URL
- Send JSON-RPC messages: `{ "id": N, "method": "...", "params": {...} }`
- Enable console capture: `Runtime.enable`
- Execute JS: `Runtime.evaluate` with `expression` param
- Listen for `Runtime.consoleAPICalled` events for message data

### FluxDispatcher Hook (JS Injection)

```javascript
(function () {
  if (window.__bottingos_hooked) return "already_hooked";
  window.__bottingos_hooked = true;

  let wpRequire;
  webpackChunkdiscord_app.push([
    [Symbol()],
    {},
    (r) => {
      wpRequire = r;
    },
  ]);
  webpackChunkdiscord_app.pop();

  const dispatcher = Object.values(wpRequire.c)
    .map((m) => m?.exports)
    .filter(Boolean)
    .flatMap((e) => [e, e.default, e.Z, e.ZP].filter(Boolean))
    .find((m) => m?.dispatch && m?.subscribe && m?.unsubscribe);

  if (!dispatcher) return "dispatcher_not_found";

  window.__bottingos_channels = new Set();

  dispatcher.subscribe("MESSAGE_CREATE", (event) => {
    if (
      window.__bottingos_channels.size > 0 &&
      !window.__bottingos_channels.has(event.channelId)
    )
      return;

    const msg = {
      id: event.message.id,
      channel_id: event.channelId,
      guild_id: event.guildId || null,
      content: event.message.content,
      author_name: event.message.author?.username || "Unknown",
      author_bot: event.message.author?.bot || false,
      timestamp: event.message.timestamp,
      embeds: event.message.embeds || [],
      attachments: event.message.attachments || [],
    };
    console.log("__BOTTINGOS_MSG__" + JSON.stringify(msg));
  });

  return "hooked_successfully";
})();
```

### Message Data Shape

Captured from FluxDispatcher `MESSAGE_CREATE` event:

- `id` - Discord message snowflake ID
- `channel_id` - Channel snowflake
- `guild_id` - Server snowflake (null for DMs)
- `content` - Text content
- `author_name` - Username
- `author_bot` - Whether author is a bot
- `timestamp` - ISO 8601 timestamp
- `embeds` - Array of embed objects
- `attachments` - Array of attachment objects

### Auto-Reconnect Strategy

- On WebSocket disconnect, wait 2 seconds, then retry
- Exponential backoff: 2s, 4s, 8s, 16s, max 60s
- Re-inject hook after reconnect (Discord page may have reloaded)
- Emit `discord-status` event on connect/disconnect for UI updates

### Crate Usage

- `tokio-tungstenite` for WebSocket client
- `futures-util` for stream handling (StreamExt, SinkExt)
- `serde_json` for CDP JSON-RPC messages
- `tauri::Emitter` for sending events to frontend

## Implementation Plan

### Step 1: Create Discord Module Structure

Create `src-tauri/src/discord/mod.rs`:

```rust
pub mod cdp;
pub mod types;
```

### Step 2: Define Types (src-tauri/src/discord/types.rs)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscordMessage {
    pub id: String,
    pub channel_id: String,
    pub guild_id: Option<String>,
    pub content: String,
    pub author_name: String,
    pub author_bot: bool,
    pub timestamp: String,
    pub embeds: Vec<serde_json::Value>,
    pub attachments: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CdpCommand {
    pub id: u64,
    pub method: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct CdpResponse {
    pub id: Option<u64>,
    pub method: Option<String>,
    pub params: Option<serde_json::Value>,
    pub result: Option<serde_json::Value>,
}
```

### Step 3: Implement CDP Client (src-tauri/src/discord/cdp.rs)

Core functionality:

1. `connect(ws_url: &str)` - Connect to CDP WebSocket
2. `enable_runtime()` - Send `Runtime.enable` to start receiving console events
3. `inject_hook()` - Send `Runtime.evaluate` with the FluxDispatcher hook script
4. `update_channels(channel_ids: Vec<String>)` - Update monitored channels via `Runtime.evaluate`
5. `listen_loop(app: AppHandle)` - Read WebSocket messages in a loop:
   - Filter for `Runtime.consoleAPICalled` events
   - Check if log message starts with `__BOTTINGOS_MSG__`
   - Parse JSON payload after prefix
   - Emit `discord-message` Tauri event with parsed DiscordMessage
6. Auto-reconnect on disconnect with exponential backoff

### Step 4: Create Tauri Commands

Add to `src-tauri/src/commands/discord.rs` (extending from Task 5.1):

```rust
#[tauri::command]
pub async fn start_cdp_capture(
    channel_ids: Vec<String>,
    app: tauri::AppHandle,
    state: State<'_, CdpState>,
) -> Result<(), String>
```

- Get `ws_url` from CdpState (set by start_discord_cdp in Task 5.1)
- Spawn tokio task that runs the CDP client listen loop
- Store task handle in state for cleanup

```rust
#[tauri::command]
pub async fn stop_cdp_capture(state: State<'_, CdpState>) -> Result<(), String>
```

- Abort the spawned capture task
- Close WebSocket connection

```rust
#[tauri::command]
pub async fn update_monitored_channels(
    channel_ids: Vec<String>,
    state: State<'_, CdpState>,
) -> Result<(), String>
```

- Send `Runtime.evaluate` to update `window.__bottingos_channels`

### Step 5: Update CdpState

Extend CdpState from Task 5.1:

```rust
pub struct CdpState {
    pub connected: Mutex<bool>,
    pub ws_url: Mutex<Option<String>>,
    pub capture_handle: Mutex<Option<tokio::task::JoinHandle<()>>>,
}
```

### Step 6: Register New Commands

Add to mod.rs and lib.rs invoke_handler:

- `commands::start_cdp_capture`
- `commands::stop_cdp_capture`
- `commands::update_monitored_channels`

## Files to Create

- `src-tauri/src/discord/mod.rs` - Module declaration
- `src-tauri/src/discord/cdp.rs` - CDP WebSocket client, hook injection, message parsing
- `src-tauri/src/discord/types.rs` - DiscordMessage, CdpCommand, CdpResponse types

## Files to Modify

- `src-tauri/src/commands/discord.rs` - Add start_cdp_capture, stop_cdp_capture, update_monitored_channels
- `src-tauri/src/commands/mod.rs` - Export new commands
- `src-tauri/src/lib.rs` - Register new commands, add `mod discord;`
- `src-tauri/Cargo.toml` - Ensure tokio-tungstenite and futures-util are in dependencies

## Contracts

### Provides

- `start_cdp_capture(channel_ids: Vec<String>)` -> `Result<(), String>` - Starts capture loop
- `stop_cdp_capture()` -> `Result<(), String>` - Stops capture
- `update_monitored_channels(channel_ids: Vec<String>)` -> `Result<(), String>` - Updates filter
- Tauri event `discord-message` with `DiscordMessage` payload
- Tauri event `discord-status` with connection status updates
- `DiscordMessage` type: `{ id, channel_id, guild_id, content, author_name, author_bot, timestamp, embeds, attachments }`

### Consumes

- Task 5.1: `CdpState.ws_url` from `start_discord_cdp()`
- `tokio-tungstenite` for WebSocket
- `futures-util` for stream handling

## Acceptance Criteria

- [ ] Connects to CDP WebSocket using ws_url from Task 5.1
- [ ] Sends `Runtime.enable` to enable console event capture
- [ ] Injects FluxDispatcher hook via `Runtime.evaluate`
- [ ] Hook returns 'hooked_successfully' on first inject, 'already_hooked' on repeat
- [ ] Captures MESSAGE_CREATE events from FluxDispatcher
- [ ] Parses `__BOTTINGOS_MSG__` prefixed console logs into DiscordMessage
- [ ] Emits `discord-message` Tauri event with correct payload
- [ ] Filters messages by channel_ids when set
- [ ] Auto-reconnects with exponential backoff on disconnect
- [ ] Re-injects hook after reconnect
- [ ] `stop_cdp_capture` cleanly aborts the capture task
- [ ] `update_monitored_channels` updates the channel filter without restart
- [ ] Emits `discord-status` events on connect/disconnect
- [ ] Rust compiles without errors

## Testing Protocol

### Unit Tests

- Test DiscordMessage deserialization from sample JSON
- Test CdpCommand serialization
- Test `__BOTTINGOS_MSG__` prefix parsing logic
- Test exponential backoff timing calculation

### Build Checks

- `cargo build` succeeds
- `cargo clippy` passes

### Manual Integration Test

1. Complete Task 5.1 setup (Discord with CDP running)
2. `await invoke('start_cdp_capture', { channelIds: [] })` - capture all channels
3. Send a message in any Discord channel
4. Verify `discord-message` event fires in frontend with correct data
5. `await invoke('update_monitored_channels', { channelIds: ['123'] })` - filter to one channel
6. Verify only messages from that channel are captured
7. Kill Discord manually - verify auto-reconnect and re-hook
8. `await invoke('stop_cdp_capture')` - verify clean stop

## Skills to Read

- `.claude/skills/tauri-commands/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/discord-cdp-implementation.md`
- `.claude/orchestration-bottingos/research/discord-realtime-capture.md`

## Git

- Branch: `feat/5.2-cdp-capture`
- Commit prefix: `Task 5.2:`
