# Discord CDP Implementation - Deep Technical Research

**Date:** 2026-03-07
**Purpose:** Exact implementation details for Discord monitoring via CDP, with Rust code snippets and JS injection patterns.

---

## Table of Contents

1. [CDP Connection from Tauri (Rust)](#1-cdp-connection)
2. [Discord Flux Dispatcher Hooking](#2-flux-dispatcher)
3. [Process Management](#3-process-management)
4. [Health Monitoring and Reconnection](#4-health-monitoring)
5. [Channel Discovery](#5-channel-discovery)
6. [Message Parsing](#6-message-parsing)
7. [Fallback: User Token Extraction](#7-token-extraction)

---

## 1. CDP Connection from Tauri (Rust) {#1-cdp-connection}

### Crate Options

| Crate               | Pros                                       | Cons                                                            | Recommendation                                      |
| ------------------- | ------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------- |
| `chromiumoxide`     | Full CDP protocol types, async, mature     | Designed for browser automation (launching Chrome), heavyweight | Use for reference, but too heavy for our use case   |
| `tokio-tungstenite` | Lightweight, async WebSocket, full control | Must implement CDP message framing yourself                     | **RECOMMENDED** - we only need WebSocket + JSON-RPC |
| `chromey`           | Fork of chromiumoxide, more recent updates | Same heavyweight issue                                          | Skip                                                |

**Decision: Use `tokio-tungstenite` + `serde_json` directly.** We don't need a full browser automation framework. We need to:

1. Discover the WebSocket URL
2. Connect
3. Send a few CDP commands (Runtime.evaluate, Network.enable)
4. Receive events

### Step 1: Discover the CDP WebSocket URL

When Discord launches with `--remote-debugging-port=9223`, it exposes an HTTP endpoint that lists debuggable targets.

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct CdpTarget {
    id: String,
    title: String,
    #[serde(rename = "type")]
    target_type: String,
    url: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    ws_url: String,
}

async fn discover_cdp_targets() -> Result<Vec<CdpTarget>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    // /json/list returns all debuggable pages/tabs
    let targets: Vec<CdpTarget> = client
        .get("http://127.0.0.1:9223/json/list")
        .send()
        .await?
        .json()
        .await?;
    Ok(targets)
}

fn find_discord_main_page(targets: &[CdpTarget]) -> Option<&CdpTarget> {
    // Discord's main renderer page typically has a URL starting with
    // https://discord.com/app or https://canary.discord.com/app
    // The target type should be "page"
    targets.iter().find(|t| {
        t.target_type == "page"
            && (t.url.contains("discord.com/app")
                || t.url.contains("discord.com/channels")
                || t.title.contains("Discord"))
    })
}
```

**HTTP endpoints available:**

- `http://127.0.0.1:9223/json/list` - list all targets (pages, workers, etc.)
- `http://127.0.0.1:9223/json/version` - browser version info + browser-level WebSocket URL
- `http://127.0.0.1:9223/json/new?url=` - open new tab (not needed)

Each target returns a `webSocketDebuggerUrl` like:

```
ws://127.0.0.1:9223/devtools/page/ABC123DEF456
```

### Step 2: Connect to the CDP WebSocket

```rust
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};

static MSG_ID: AtomicU64 = AtomicU64::new(1);

fn next_id() -> u64 {
    MSG_ID.fetch_add(1, Ordering::SeqCst)
}

async fn connect_to_cdp(ws_url: &str) -> Result<
    (
        futures_util::stream::SplitSink<
            tokio_tungstenite::WebSocketStream<
                tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>
            >,
            Message,
        >,
        futures_util::stream::SplitStream<
            tokio_tungstenite::WebSocketStream<
                tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>
            >,
        >,
    ),
    Box<dyn std::error::Error>,
> {
    let (ws_stream, _) = connect_async(ws_url).await?;
    let (write, read) = ws_stream.split();
    Ok((write, read))
}
```

### Step 3: Send CDP Commands

CDP uses JSON-RPC 2.0 over WebSocket. Each message has an `id`, `method`, and optional `params`.

```rust
use futures_util::SinkExt;

async fn send_cdp_command(
    sink: &mut impl SinkExt<Message, Error = tokio_tungstenite::tungstenite::Error>,
    method: &str,
    params: Option<Value>,
) -> Result<u64, Box<dyn std::error::Error>> {
    let id = next_id();
    let msg = json!({
        "id": id,
        "method": method,
        "params": params.unwrap_or(json!({})),
    });
    sink.send(Message::Text(msg.to_string())).await?;
    Ok(id)
}

// Enable Runtime domain (needed for evaluate)
// send_cdp_command(&mut sink, "Runtime.enable", None).await?;

// Evaluate JavaScript in Discord's context
// send_cdp_command(&mut sink, "Runtime.evaluate", Some(json!({
//     "expression": "document.title",
//     "returnByValue": true,
// }))).await?;
```

### Key CDP Methods We Need

| Method                                  | Purpose                                                  |
| --------------------------------------- | -------------------------------------------------------- |
| `Runtime.enable`                        | Enable Runtime domain events                             |
| `Runtime.evaluate`                      | Execute JS in Discord's renderer context                 |
| `Page.addScriptToEvaluateOnNewDocument` | Inject JS that persists across page navigations          |
| `Network.enable`                        | Enable network event monitoring (alternative approach)   |
| `Network.webSocketFrameReceived`        | Event fired when WS frame arrives (for Gateway sniffing) |
| `Runtime.consoleAPICalled`              | Receive console.log output from injected scripts         |

### Step 4: Inject the Message Listener

```rust
async fn inject_message_listener(
    sink: &mut impl SinkExt<Message, Error = tokio_tungstenite::tungstenite::Error>,
) -> Result<u64, Box<dyn std::error::Error>> {
    let js_code = r#"
        (function() {
            // Avoid double-injection
            if (window.__bottingos_hooked) return 'already_hooked';
            window.__bottingos_hooked = true;

            // Find the Flux Dispatcher via webpack
            let wpRequire;
            webpackChunkdiscord_app.push([
                [Symbol()],
                {},
                (r) => { wpRequire = r; }
            ]);
            webpackChunkdiscord_app.pop();

            const dispatcher = Object.values(wpRequire.c)
                .map(m => m?.exports)
                .filter(Boolean)
                .flatMap(e => [e, e.default, e.Z, e.ZP].filter(Boolean))
                .find(m => m?.dispatch && m?.subscribe && m?.unsubscribe);

            if (!dispatcher) return 'dispatcher_not_found';

            dispatcher.subscribe('MESSAGE_CREATE', (event) => {
                // Use console.log to send data back through CDP
                // CDP Runtime.consoleAPICalled event will capture this
                console.log('__BOTTINGOS_MSG__' + JSON.stringify(event));
            });

            return 'hooked_successfully';
        })()
    "#;

    let id = send_cdp_command(sink, "Runtime.evaluate", Some(json!({
        "expression": js_code,
        "returnByValue": true,
        "awaitPromise": false,
    }))).await?;

    Ok(id)
}
```

### Step 5: Listen for Messages via Console Events

```rust
use futures_util::StreamExt;

async fn listen_for_messages(
    mut read: impl StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin,
    tx: tokio::sync::mpsc::Sender<DiscordMessage>,
) {
    while let Some(Ok(msg)) = read.next().await {
        if let Message::Text(text) = msg {
            let parsed: Value = match serde_json::from_str(&text) {
                Ok(v) => v,
                Err(_) => continue,
            };

            // Handle CDP events
            if let Some(method) = parsed.get("method").and_then(|m| m.as_str()) {
                match method {
                    "Runtime.consoleAPICalled" => {
                        if let Some(args) = parsed["params"]["args"].as_array() {
                            for arg in args {
                                if let Some(value) = arg["value"].as_str() {
                                    if let Some(json_str) = value.strip_prefix("__BOTTINGOS_MSG__") {
                                        if let Ok(discord_msg) = serde_json::from_str::<DiscordMessage>(json_str) {
                                            let _ = tx.send(discord_msg).await;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "Inspector.detached" => {
                        // Discord was closed or navigated away
                        // Trigger reconnection logic
                        break;
                    }
                    _ => {}
                }
            }
        }
    }
}
```

### Alternative: Network.webSocketFrameReceived Approach

Instead of JS injection, you can listen to the raw Gateway WebSocket frames:

```rust
// Enable network monitoring
send_cdp_command(&mut sink, "Network.enable", None).await?;

// Then in the event loop, listen for:
// "Network.webSocketFrameReceived" events
// The payload contains the raw Gateway frame data

// In the event handler:
if method == "Network.webSocketFrameReceived" {
    let payload = &parsed["params"]["response"]["payloadData"];
    if let Some(data) = payload.as_str() {
        // This is a raw Gateway event (JSON string)
        // Parse it for MESSAGE_CREATE events
        if let Ok(gateway_event) = serde_json::from_str::<Value>(data) {
            if gateway_event["t"].as_str() == Some("MESSAGE_CREATE") {
                // Process the message
            }
        }
    }
}
```

**Trade-offs:**

- Network approach: More stable (no webpack dependency), but captures ALL Gateway traffic (noisy)
- JS injection approach: Cleaner data, filtered at source, but depends on Discord's webpack internals

**Recommendation: Use JS injection as primary, Network monitoring as fallback within the CDP connection.**

---

## 2. Discord Flux Dispatcher Hooking {#2-flux-dispatcher}

### What is the Flux Dispatcher?

Discord uses Facebook's Flux architecture internally. The Flux Dispatcher is a central hub that broadcasts actions (events) to all registered stores. Every Discord event - message created, channel switched, user updated - flows through this single dispatcher.

### Accessing the Dispatcher

Discord bundles its code with webpack. The modules are accessible via `webpackChunkdiscord_app` (the global webpack chunk array).

```javascript
// Method 1: Push a fake module to get the require function
let wpRequire;
webpackChunkdiscord_app.push([
  [Symbol()], // chunk ID (Symbol avoids collisions)
  {}, // no modules to define
  (r) => {
    wpRequire = r;
  }, // callback receives the require function
]);
webpackChunkdiscord_app.pop(); // clean up

// Method 2: Find dispatcher from module cache
const dispatcher = Object.values(wpRequire.c)
  .map((m) => m?.exports)
  .filter(Boolean)
  .flatMap((e) => [e, e.default, e.Z, e.ZP].filter(Boolean))
  .find((m) => m?.dispatch && m?.subscribe && m?.unsubscribe);
```

**Why `.Z` and `.ZP`?** Discord uses webpack 5, which minifies export names. `default` export becomes `.Z` or `.ZP` depending on the module type.

### Subscribing to MESSAGE_CREATE

```javascript
dispatcher.subscribe("MESSAGE_CREATE", (event) => {
  // event structure:
  // {
  //   type: "MESSAGE_CREATE",
  //   channelId: "123456789",
  //   guildId: "987654321",        // null for DMs
  //   message: {
  //     id: "111222333",
  //     content: "Check this drop!",
  //     author: {
  //       id: "444555666",
  //       username: "cookgroup_bot",
  //       discriminator: "0000",
  //       avatar: "abc123",
  //       bot: true
  //     },
  //     channel_id: "123456789",
  //     guild_id: "987654321",
  //     timestamp: "2026-03-07T12:00:00.000000+00:00",
  //     edited_timestamp: null,
  //     tts: false,
  //     mention_everyone: false,
  //     mentions: [],
  //     mention_roles: [],
  //     attachments: [
  //       {
  //         id: "777888999",
  //         filename: "product.png",
  //         size: 102400,
  //         url: "https://cdn.discordapp.com/attachments/...",
  //         proxy_url: "https://media.discordapp.net/attachments/...",
  //         width: 800,
  //         height: 600,
  //         content_type: "image/png"
  //       }
  //     ],
  //     embeds: [
  //       {
  //         title: "Nike Dunk Low - Restock",
  //         description: "GO GO GO - Limited sizes available",
  //         url: "https://www.nike.com/...",
  //         color: 5814783,
  //         fields: [
  //           { name: "Price", value: "$110", inline: true },
  //           { name: "Sizes", value: "8, 9, 10, 11", inline: true }
  //         ],
  //         thumbnail: { url: "https://..." },
  //         footer: { text: "CookGroup Bot" },
  //         timestamp: "2026-03-07T12:00:00.000000+00:00"
  //       }
  //     ],
  //     components: [],
  //     flags: 0,
  //     pinned: false,
  //     type: 0
  //   },
  //   optimistic: false,
  //   isPushNotification: false
  // }
});
```

### Full Injection Script (Production-Ready)

```javascript
(function () {
  if (window.__bottingos_hooked) return "already_hooked";
  window.__bottingos_hooked = true;

  // Get webpack require
  let wpRequire;
  webpackChunkdiscord_app.push([
    [Symbol()],
    {},
    (r) => {
      wpRequire = r;
    },
  ]);
  webpackChunkdiscord_app.pop();

  // Find Flux Dispatcher
  const dispatcher = Object.values(wpRequire.c)
    .map((m) => m?.exports)
    .filter(Boolean)
    .flatMap((e) => [e, e.default, e.Z, e.ZP].filter(Boolean))
    .find((m) => m?.dispatch && m?.subscribe && m?.unsubscribe);

  if (!dispatcher) {
    console.log("__BOTTINGOS_ERR__dispatcher_not_found");
    return "error";
  }

  // Channels we're monitoring (set via CDP before injection or updated dynamically)
  window.__bottingos_channels = new Set();

  // Subscribe to MESSAGE_CREATE
  dispatcher.subscribe("MESSAGE_CREATE", (event) => {
    // If channel filter is set, only forward matching messages
    if (
      window.__bottingos_channels.size > 0 &&
      !window.__bottingos_channels.has(event.channelId)
    ) {
      return;
    }

    try {
      const payload = {
        type: "message",
        channelId: event.channelId,
        guildId: event.guildId || null,
        message: {
          id: event.message.id,
          content: event.message.content,
          author: {
            id: event.message.author.id,
            username: event.message.author.username,
            avatar: event.message.author.avatar,
            bot: event.message.author.bot || false,
          },
          timestamp: event.message.timestamp,
          embeds: event.message.embeds || [],
          attachments: (event.message.attachments || []).map((a) => ({
            id: a.id,
            filename: a.filename,
            url: a.url,
            size: a.size,
            content_type: a.content_type,
          })),
          mentions: (event.message.mentions || []).map((m) => ({
            id: m.id,
            username: m.username,
          })),
          pinned: event.message.pinned,
          type: event.message.type,
        },
      };
      console.log("__BOTTINGOS_MSG__" + JSON.stringify(payload));
    } catch (e) {
      console.log("__BOTTINGOS_ERR__" + e.message);
    }
  });

  console.log("__BOTTINGOS_STATUS__hooked");
  return "hooked";
})();
```

### Updating Monitored Channels at Runtime

After injection, update the channel filter set via `Runtime.evaluate`:

```javascript
// Add a channel to monitoring
window.__bottingos_channels.add("CHANNEL_ID_HERE");

// Remove a channel
window.__bottingos_channels.delete("CHANNEL_ID_HERE");

// Clear all (monitor everything)
window.__bottingos_channels.clear();
```

From Rust:

```rust
async fn set_monitored_channels(
    sink: &mut impl SinkExt<Message>,
    channel_ids: &[&str],
) -> Result<(), Box<dyn std::error::Error>> {
    let ids_js = channel_ids
        .iter()
        .map(|id| format!("'{}'", id))
        .collect::<Vec<_>>()
        .join(",");
    let js = format!(
        "window.__bottingos_channels = new Set([{}]); 'channels_updated'",
        ids_js
    );
    send_cdp_command(sink, "Runtime.evaluate", Some(json!({
        "expression": js,
        "returnByValue": true,
    }))).await?;
    Ok(())
}
```

---

## 3. Process Management {#3-process-management}

### Discord Executable Paths

**macOS:**

```
/Applications/Discord.app/Contents/MacOS/Discord
```

Variants:

```
/Applications/Discord Canary.app/Contents/MacOS/Discord Canary
/Applications/Discord PTB.app/Contents/MacOS/Discord PTB
```

**Windows:**

```
%LOCALAPPDATA%\Discord\Update.exe --processStart Discord.exe
```

The actual executable is at:

```
%LOCALAPPDATA%\Discord\app-X.Y.Z\Discord.exe
```

Where `X.Y.Z` is the version number (e.g., `app-0.0.305`). The version changes with updates, so use `Update.exe --processStart` or glob for `app-*`.

### Rust Process Management

```rust
use sysinfo::{System, Signal};
use std::process::Command;

#[cfg(target_os = "macos")]
const DISCORD_PROCESS_NAME: &str = "Discord";
#[cfg(target_os = "macos")]
const DISCORD_EXEC_PATH: &str = "/Applications/Discord.app/Contents/MacOS/Discord";

#[cfg(target_os = "windows")]
const DISCORD_PROCESS_NAME: &str = "Discord.exe";

fn is_discord_running() -> bool {
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    sys.processes().values().any(|p| {
        p.name().to_string_lossy().contains(DISCORD_PROCESS_NAME)
    })
}

fn kill_discord() -> bool {
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let mut killed = false;
    for (pid, process) in sys.processes() {
        if process.name().to_string_lossy().contains(DISCORD_PROCESS_NAME) {
            process.kill();
            killed = true;
        }
    }
    killed
}

#[cfg(target_os = "macos")]
fn launch_discord_with_cdp() -> Result<std::process::Child, std::io::Error> {
    // On macOS, we can either:
    // 1. Direct: run the binary with args
    // 2. Via `open`: open -a Discord --args --remote-debugging-port=9223
    Command::new(DISCORD_EXEC_PATH)
        .arg("--remote-debugging-port=9223")
        .spawn()
}

#[cfg(target_os = "windows")]
fn launch_discord_with_cdp() -> Result<std::process::Child, std::io::Error> {
    let local_app_data = std::env::var("LOCALAPPDATA")
        .unwrap_or_else(|_| String::new());
    let update_exe = format!("{}\\Discord\\Update.exe", local_app_data);

    Command::new(update_exe)
        .args(["--processStart", "Discord.exe", "--process-start-args", "--remote-debugging-port=9223"])
        .spawn()
}

#[cfg(target_os = "windows")]
fn find_discord_exe() -> Option<String> {
    let local_app_data = std::env::var("LOCALAPPDATA").ok()?;
    let discord_dir = format!("{}\\Discord", local_app_data);

    // Find the latest app-* directory
    let entries = std::fs::read_dir(&discord_dir).ok()?;
    let mut app_dirs: Vec<_> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name().to_string_lossy().starts_with("app-")
        })
        .collect();
    app_dirs.sort_by(|a, b| b.file_name().cmp(&a.file_name()));

    app_dirs.first().map(|d| {
        format!("{}\\Discord.exe", d.path().display())
    })
}
```

### Full Startup Sequence

```rust
async fn start_discord_monitoring() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Kill existing Discord
    if is_discord_running() {
        kill_discord();
        // Wait for process to fully exit
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }

    // 2. Relaunch with CDP flag
    let _child = launch_discord_with_cdp()?;

    // 3. Poll for CDP availability (Discord takes a few seconds to start)
    let targets = loop {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        match discover_cdp_targets().await {
            Ok(targets) if !targets.is_empty() => break targets,
            _ => continue,
        }
    };

    // 4. Find the main Discord page
    let target = find_discord_main_page(&targets)
        .ok_or("Discord main page not found in CDP targets")?;

    // 5. Connect to CDP WebSocket
    let (mut sink, read) = connect_to_cdp(&target.ws_url).await?;

    // 6. Enable Runtime events (needed for console.log capture)
    send_cdp_command(&mut sink, "Runtime.enable", None).await?;

    // 7. Inject message listener
    inject_message_listener(&mut sink).await?;

    // 8. Start listening for messages
    let (tx, rx) = tokio::sync::mpsc::channel(100);
    tokio::spawn(listen_for_messages(read, tx));

    // 9. Process messages from rx channel...
    Ok(())
}
```

### Handling Discord Auto-Updates

Discord auto-updates by downloading a new version, then restarting itself. This kills the CDP connection.

```rust
async fn monitor_connection_health(
    ws_url: String,
    reconnect_tx: tokio::sync::mpsc::Sender<()>,
) {
    loop {
        // Try to hit the CDP HTTP endpoint
        let ok = reqwest::get("http://127.0.0.1:9223/json/version")
            .await
            .is_ok();

        if !ok {
            // CDP is down - Discord either crashed or updated
            // Wait for Discord to come back
            loop {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                if is_discord_running() {
                    // Discord is back but without CDP flag
                    // Need to kill and relaunch
                    let _ = reconnect_tx.send(()).await;
                    break;
                }
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    }
}
```

### Electron Fuses Consideration

Electron has fuses that can disable `--remote-debugging-port`. As of 2026, Discord has NOT flipped the `EnableNodeCliInspectArguments` fuse to disabled. However, this is a risk:

- If Discord disables this fuse, the `--remote-debugging-port` flag will be silently ignored
- Detection: check if `http://127.0.0.1:9223/json/version` responds after launch. If not, the fuse may be disabled.
- Fallback: switch to User Token Gateway approach

---

## 4. Health Monitoring and Reconnection {#4-health-monitoring}

### Detecting CDP Disconnection

The WebSocket connection itself provides disconnect signals:

```rust
async fn listen_with_reconnect(
    mut read: impl StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin,
    tx: tokio::sync::mpsc::Sender<DiscordMessage>,
    reconnect_signal: tokio::sync::mpsc::Sender<()>,
) {
    loop {
        match read.next().await {
            Some(Ok(Message::Text(text))) => {
                // Process CDP event...
                let parsed: Value = match serde_json::from_str(&text) {
                    Ok(v) => v,
                    Err(_) => continue,
                };

                // CDP sends "Inspector.detached" when target navigates away or closes
                if parsed.get("method").and_then(|m| m.as_str()) == Some("Inspector.detached") {
                    let _ = reconnect_signal.send(()).await;
                    break;
                }

                // Process message events...
            }
            Some(Ok(Message::Close(_))) => {
                // WebSocket closed - Discord process died
                let _ = reconnect_signal.send(()).await;
                break;
            }
            Some(Ok(Message::Ping(data))) => {
                // Auto-handled by tungstenite (sends Pong)
            }
            Some(Err(_)) => {
                // WebSocket error - connection lost
                let _ = reconnect_signal.send(()).await;
                break;
            }
            None => {
                // Stream ended
                let _ = reconnect_signal.send(()).await;
                break;
            }
            _ => {}
        }
    }
}
```

### Reconnection Strategy

```rust
async fn reconnection_loop(mut reconnect_rx: tokio::sync::mpsc::Receiver<()>) {
    while reconnect_rx.recv().await.is_some() {
        // Exponential backoff
        let mut delay = 1;
        loop {
            // Wait for Discord to be gone (it might be updating)
            tokio::time::sleep(std::time::Duration::from_secs(delay)).await;

            if is_discord_running() {
                // Discord is running but without CDP - kill and relaunch
                kill_discord();
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }

            // Relaunch with CDP
            match launch_discord_with_cdp() {
                Ok(_) => {
                    // Poll for CDP availability
                    let mut attempts = 0;
                    loop {
                        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                        if let Ok(targets) = discover_cdp_targets().await {
                            if let Some(target) = find_discord_main_page(&targets) {
                                // Reconnect!
                                // ... reconnect logic here ...
                                break;
                            }
                        }
                        attempts += 1;
                        if attempts > 30 { break; } // 15 second timeout
                    }
                    break;
                }
                Err(_) => {
                    delay = (delay * 2).min(30);
                    continue;
                }
            }
        }
    }
}
```

### Heartbeat / Health Check

CDP doesn't have a built-in heartbeat. Use WebSocket pings or periodic CDP commands:

```rust
async fn cdp_heartbeat(
    sink: &mut impl SinkExt<Message>,
) -> bool {
    // Send a lightweight CDP command
    let result = send_cdp_command(sink, "Runtime.evaluate", Some(json!({
        "expression": "typeof window.__bottingos_hooked",
        "returnByValue": true,
    }))).await;

    result.is_ok()
}
```

---

## 5. Channel Discovery {#5-channel-discovery}

### Getting Servers and Channels via JS Injection

Inject this script to enumerate all guilds and channels the user has access to:

```javascript
(function () {
  let wpRequire;
  webpackChunkdiscord_app.push([
    [Symbol()],
    {},
    (r) => {
      wpRequire = r;
    },
  ]);
  webpackChunkdiscord_app.pop();

  // Helper to find a module by exported property names
  function findByProps(...props) {
    return Object.values(wpRequire.c)
      .map((m) => m?.exports)
      .filter(Boolean)
      .flatMap((e) => [e, e.default, e.Z, e.ZP].filter(Boolean))
      .find((m) => props.every((p) => m[p] !== undefined));
  }

  // Find the stores
  const GuildStore = findByProps("getGuild", "getGuilds");
  const ChannelStore = findByProps("getChannel", "getDMFromUserId");
  const GuildChannelsStore = findByProps("getChannels", "getDefaultChannel");
  const ReadStateStore = findByProps("getUnreadCount", "hasUnread");

  if (!GuildStore || !ChannelStore) {
    return JSON.stringify({ error: "stores_not_found" });
  }

  // Get all guilds (servers)
  const guilds = Object.values(GuildStore.getGuilds()).map((guild) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    ownerId: guild.ownerId,
    memberCount: guild.memberCount,
  }));

  // Get channels for each guild
  const result = guilds.map((guild) => {
    const channelData = GuildChannelsStore
      ? GuildChannelsStore.getChannels(guild.id)
      : null;

    // Text channels are in the SELECTABLE category
    let textChannels = [];
    if (channelData && channelData.SELECTABLE) {
      textChannels = channelData.SELECTABLE.map((entry) => {
        const ch = entry.channel;
        return {
          id: ch.id,
          name: ch.name,
          type: ch.type, // 0 = text, 2 = voice, 5 = announcement, etc.
          parentId: ch.parent_id, // category ID
          position: ch.position,
        };
      });
    }

    return {
      guild: guild,
      channels: textChannels,
    };
  });

  return JSON.stringify(result);
})();
```

### Channel Type Reference

| Type | Name                | Description                    |
| ---- | ------------------- | ------------------------------ |
| 0    | GUILD_TEXT          | Standard text channel          |
| 2    | GUILD_VOICE         | Voice channel                  |
| 4    | GUILD_CATEGORY      | Category container             |
| 5    | GUILD_ANNOUNCEMENT  | Announcement/news channel      |
| 10   | ANNOUNCEMENT_THREAD | Thread in announcement channel |
| 11   | PUBLIC_THREAD       | Public thread                  |
| 12   | PRIVATE_THREAD      | Private thread                 |
| 13   | GUILD_STAGE_VOICE   | Stage channel                  |
| 15   | GUILD_FORUM         | Forum channel                  |

For monitoring, we want types 0, 5, 10, 11, 12, and 15.

### Rust Side: Channel Discovery Command

```rust
#[derive(Debug, Deserialize, Clone)]
struct DiscordGuild {
    id: String,
    name: String,
    icon: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct DiscordChannel {
    id: String,
    name: String,
    #[serde(rename = "type")]
    channel_type: u8,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GuildWithChannels {
    guild: DiscordGuild,
    channels: Vec<DiscordChannel>,
}

async fn discover_channels(
    sink: &mut impl SinkExt<Message>,
    read: &mut impl StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin,
) -> Result<Vec<GuildWithChannels>, Box<dyn std::error::Error>> {
    let js_code = include_str!("../js/discover_channels.js"); // the script above
    let id = send_cdp_command(sink, "Runtime.evaluate", Some(json!({
        "expression": js_code,
        "returnByValue": true,
    }))).await?;

    // Read response
    while let Some(Ok(Message::Text(text))) = read.next().await {
        let parsed: Value = serde_json::from_str(&text)?;
        if parsed.get("id").and_then(|i| i.as_u64()) == Some(id) {
            let result_str = parsed["result"]["result"]["value"]
                .as_str()
                .ok_or("No result from channel discovery")?;
            let guilds: Vec<GuildWithChannels> = serde_json::from_str(result_str)?;
            return Ok(guilds);
        }
    }

    Err("WebSocket closed before receiving response".into())
}
```

### Getting Guild/Server Icons

Discord CDN URL for guild icons:

```
https://cdn.discordapp.com/icons/{guild_id}/{icon_hash}.png?size=64
```

For the channel picker UI, fetch these as needed.

---

## 6. Message Parsing {#6-message-parsing}

### Discord Message Object (Rust Types)

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct DiscordMessage {
    pub id: String,
    pub content: String,
    pub author: MessageAuthor,
    pub channel_id: String,
    pub guild_id: Option<String>,
    pub timestamp: String,
    pub edited_timestamp: Option<String>,
    pub embeds: Vec<Embed>,
    pub attachments: Vec<Attachment>,
    pub mentions: Vec<MentionedUser>,
    pub pinned: bool,
    #[serde(rename = "type")]
    pub message_type: u8,
}

#[derive(Debug, Deserialize, Clone)]
pub struct MessageAuthor {
    pub id: String,
    pub username: String,
    pub avatar: Option<String>,
    pub bot: Option<bool>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Embed {
    pub title: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub color: Option<u32>,
    pub fields: Option<Vec<EmbedField>>,
    pub thumbnail: Option<EmbedMedia>,
    pub image: Option<EmbedMedia>,
    pub footer: Option<EmbedFooter>,
    pub timestamp: Option<String>,
    pub author: Option<EmbedAuthor>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct EmbedField {
    pub name: String,
    pub value: String,
    pub inline: Option<bool>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct EmbedMedia {
    pub url: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct EmbedFooter {
    pub text: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct EmbedAuthor {
    pub name: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Attachment {
    pub id: String,
    pub filename: String,
    pub url: String,
    pub size: u64,
    pub content_type: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct MentionedUser {
    pub id: String,
    pub username: String,
}
```

### Extracting Cook Group Data from Messages

Cook group messages follow common patterns. Parse them for alerts:

```rust
pub struct ParsedDeal {
    pub product_name: Option<String>,
    pub price: Option<f64>,
    pub links: Vec<String>,
    pub images: Vec<String>,
    pub is_restock: bool,
    pub is_live: bool,
    pub urgency: AlertUrgency,
    pub source_channel: String,
    pub source_guild: Option<String>,
    pub raw_content: String,
    pub raw_embeds: Vec<Embed>,
}

pub enum AlertUrgency {
    Normal,
    High,    // keywords like "restock", "live now"
    Critical, // keywords like "GO GO GO", "FCFS", "limited"
}

const HIGH_URGENCY_KEYWORDS: &[&str] = &[
    "restock", "live now", "live!", "in stock", "available now",
    "just dropped", "restocked", "back in stock",
];

const CRITICAL_URGENCY_KEYWORDS: &[&str] = &[
    "go go go", "gogo", "fcfs", "limited", "hurry",
    "quick", "almost gone", "selling out", "last chance",
];

fn detect_urgency(content: &str) -> AlertUrgency {
    let lower = content.to_lowercase();
    if CRITICAL_URGENCY_KEYWORDS.iter().any(|k| lower.contains(k)) {
        AlertUrgency::Critical
    } else if HIGH_URGENCY_KEYWORDS.iter().any(|k| lower.contains(k)) {
        AlertUrgency::High
    } else {
        AlertUrgency::Normal
    }
}

fn extract_links(content: &str) -> Vec<String> {
    // Simple URL regex
    let url_re = regex::Regex::new(r"https?://[^\s<>\])+]+").unwrap();
    url_re.find_iter(content)
        .map(|m| m.as_str().to_string())
        .collect()
}

fn extract_price(content: &str) -> Option<f64> {
    // Match $XX.XX or $XXX patterns
    let price_re = regex::Regex::new(r"\$(\d+(?:\.\d{2})?)").unwrap();
    price_re.captures(content)
        .and_then(|c| c.get(1))
        .and_then(|m| m.as_str().parse::<f64>().ok())
}

pub fn parse_cook_group_message(msg: &DiscordMessage) -> ParsedDeal {
    let mut all_text = msg.content.clone();

    // Combine embed text for keyword/link extraction
    for embed in &msg.embeds {
        if let Some(t) = &embed.title { all_text.push_str(" "); all_text.push_str(t); }
        if let Some(d) = &embed.description { all_text.push_str(" "); all_text.push_str(d); }
        if let Some(fields) = &embed.fields {
            for f in fields {
                all_text.push_str(" ");
                all_text.push_str(&f.name);
                all_text.push_str(" ");
                all_text.push_str(&f.value);
            }
        }
    }

    let mut links = extract_links(&all_text);
    // Also get links from embeds
    for embed in &msg.embeds {
        if let Some(url) = &embed.url {
            if !links.contains(url) { links.push(url.clone()); }
        }
    }

    let mut images: Vec<String> = msg.attachments.iter()
        .filter(|a| a.content_type.as_deref().map_or(false, |ct| ct.starts_with("image/")))
        .map(|a| a.url.clone())
        .collect();
    // Embed images
    for embed in &msg.embeds {
        if let Some(img) = &embed.image { images.push(img.url.clone()); }
        if let Some(thumb) = &embed.thumbnail { images.push(thumb.url.clone()); }
    }

    let product_name = msg.embeds.first()
        .and_then(|e| e.title.clone())
        .or_else(|| {
            // Try first line of content as product name
            msg.content.lines().next().map(|s| s.to_string())
        });

    ParsedDeal {
        product_name,
        price: extract_price(&all_text),
        links,
        images,
        is_restock: all_text.to_lowercase().contains("restock"),
        is_live: all_text.to_lowercase().contains("live"),
        urgency: detect_urgency(&all_text),
        source_channel: msg.channel_id.clone(),
        source_guild: msg.guild_id.clone(),
        raw_content: msg.content.clone(),
        raw_embeds: msg.embeds.clone(),
    }
}
```

---

## 7. Fallback: User Token Extraction {#7-token-extraction}

### Token Storage Locations

**macOS:**

```
~/Library/Application Support/discord/Local Storage/leveldb/
```

**Windows:**

```
%AppData%\discord\Local Storage\leveldb\
```

Discord variants:

```
discord/         - Stable
discordcanary/   - Canary
discordptb/      - PTB
```

### Token Format

Discord tokens come in three formats:

1. **Unencrypted (legacy):** `[A-Za-z0-9\-_]{24}\.[A-Za-z0-9\-_]{6}\.[A-Za-z0-9\-_]{27,}`
2. **MFA token (legacy):** `mfa\.[A-Za-z0-9\-_]{84,}`
3. **Encrypted (current on Windows):** Prefixed with `dQw4w9WgXcQ:` followed by base64

### Encrypted Token Decryption (Windows only)

On Windows, Discord encrypts tokens before storing in LevelDB:

1. A master key is stored in `%AppData%\discord\Local State` (JSON file, key `os_crypt.encrypted_key`)
2. The master key is base64-encoded and DPAPI-encrypted
3. Decrypt the master key with DPAPI (`CryptUnprotectData`)
4. Token is AES-256-GCM encrypted with this key
5. Format: `dQw4w9WgXcQ:` + base64(nonce[12] + ciphertext + tag[16])

On macOS, tokens are NOT encrypted with DPAPI. They may be stored as plain text or with Keychain-based encryption.

### Rust Implementation: Token Extraction

```rust
use std::path::PathBuf;
use regex::Regex;

fn get_discord_leveldb_path() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").ok()?;
        let path = PathBuf::from(format!(
            "{}/Library/Application Support/discord/Local Storage/leveldb",
            home
        ));
        if path.exists() { Some(path) } else { None }
    }

    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").ok()?;
        let path = PathBuf::from(format!(
            "{}\\discord\\Local Storage\\leveldb",
            appdata
        ));
        if path.exists() { Some(path) } else { None }
    }
}

fn extract_tokens_from_leveldb(path: &PathBuf) -> Vec<String> {
    let mut tokens = Vec::new();

    // Regex patterns for different token formats
    let unencrypted_re = Regex::new(
        r#"["\s]([A-Za-z0-9\-_]{24,28}\.[A-Za-z0-9\-_]{6}\.[A-Za-z0-9\-_]{25,110})["\s]"#
    ).unwrap();
    let mfa_re = Regex::new(r#"(mfa\.[A-Za-z0-9\-_]{84,})"#).unwrap();
    let encrypted_re = Regex::new(r#"(dQw4w9WgXcQ:[A-Za-z0-9+/=]+)"#).unwrap();

    // Read all .ldb and .log files
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let file_path = entry.path();
            let ext = file_path.extension().and_then(|e| e.to_str());
            if !matches!(ext, Some("ldb") | Some("log")) { continue; }

            if let Ok(content) = std::fs::read_to_string(&file_path) {
                for cap in unencrypted_re.captures_iter(&content) {
                    tokens.push(cap[1].to_string());
                }
                for cap in mfa_re.captures_iter(&content) {
                    tokens.push(cap[1].to_string());
                }
                for cap in encrypted_re.captures_iter(&content) {
                    tokens.push(cap[1].to_string());
                }
            }
        }
    }

    tokens
}

#[cfg(target_os = "windows")]
fn decrypt_token(encrypted: &str) -> Option<String> {
    use aes_gcm::{Aes256Gcm, KeyInit, aead::Aead};
    use base64::Engine;

    // Strip prefix
    let b64 = encrypted.strip_prefix("dQw4w9WgXcQ:")?;
    let decoded = base64::engine::general_purpose::STANDARD.decode(b64).ok()?;

    // First 3 bytes: version tag (v10 or v11)
    // Next 12 bytes: nonce
    // Rest: ciphertext + 16-byte GCM tag
    if decoded.len() < 3 + 12 + 16 { return None; }

    let nonce = &decoded[3..15];
    let ciphertext = &decoded[15..];

    // Get the master key from Local State
    let master_key = get_discord_master_key()?;

    let cipher = Aes256Gcm::new_from_slice(&master_key).ok()?;
    let plaintext = cipher.decrypt(
        aes_gcm::Nonce::from_slice(nonce),
        ciphertext,
    ).ok()?;

    String::from_utf8(plaintext).ok()
}

#[cfg(target_os = "windows")]
fn get_discord_master_key() -> Option<Vec<u8>> {
    use base64::Engine;

    let appdata = std::env::var("APPDATA").ok()?;
    let local_state_path = format!("{}\\discord\\Local State", appdata);
    let content = std::fs::read_to_string(&local_state_path).ok()?;
    let parsed: serde_json::Value = serde_json::from_str(&content).ok()?;

    let encrypted_key_b64 = parsed["os_crypt"]["encrypted_key"].as_str()?;
    let encrypted_key = base64::engine::general_purpose::STANDARD
        .decode(encrypted_key_b64).ok()?;

    // Strip "DPAPI" prefix (5 bytes)
    if encrypted_key.len() < 5 { return None; }
    let dpapi_blob = &encrypted_key[5..];

    // Decrypt with Windows DPAPI
    dpapi_decrypt(dpapi_blob)
}

#[cfg(target_os = "windows")]
fn dpapi_decrypt(data: &[u8]) -> Option<Vec<u8>> {
    // Use windows-sys crate for CryptUnprotectData
    use windows_sys::Win32::Security::Cryptography::{
        CryptUnprotectData, CRYPT_INTEGER_BLOB,
    };
    use std::ptr;

    unsafe {
        let mut input = CRYPT_INTEGER_BLOB {
            cbData: data.len() as u32,
            pbData: data.as_ptr() as *mut u8,
        };
        let mut output = CRYPT_INTEGER_BLOB {
            cbData: 0,
            pbData: ptr::null_mut(),
        };

        let result = CryptUnprotectData(
            &mut input,
            ptr::null_mut(),
            ptr::null_mut(),
            ptr::null_mut(),
            ptr::null_mut(),
            0,
            &mut output,
        );

        if result == 0 { return None; }

        let decrypted = std::slice::from_raw_parts(output.pbData, output.cbData as usize)
            .to_vec();

        // Free the allocated memory
        windows_sys::Win32::System::Memory::LocalFree(output.pbData as _);

        Some(decrypted)
    }
}
```

### Existing Rust Crate: stealcord

The `stealcord` crate (MIT license) provides cross-platform Discord token extraction. It handles LevelDB reading and token regex matching. Available on crates.io as a library.

**Usage:**

```rust
// stealcord::get_tokens() returns Vec<(String, String)> of (user_id, token)
// stealcord::get_token() returns Option<String> for single token
```

**Consideration:** The crate name is problematic for a legitimate product. Better to implement token extraction ourselves using the patterns above, or vendor the relevant code.

### Gateway Connection with Extracted Token

```rust
use tokio_tungstenite::connect_async;
use futures_util::{SinkExt, StreamExt};

async fn connect_to_gateway(token: &str) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Get Gateway URL
    let gateway_url = "wss://gateway.discord.gg/?v=10&encoding=json";

    // 2. Connect
    let (ws_stream, _) = connect_async(gateway_url).await?;
    let (mut sink, mut read) = ws_stream.split();

    // 3. Receive Hello (opcode 10)
    let hello = read.next().await.ok_or("No hello")??;
    let hello_data: serde_json::Value = serde_json::from_str(
        &hello.to_text()?
    )?;
    let heartbeat_interval = hello_data["d"]["heartbeat_interval"]
        .as_u64()
        .ok_or("No heartbeat_interval")?;

    // 4. Send Identify (opcode 2)
    let identify = serde_json::json!({
        "op": 2,
        "d": {
            "token": token,
            "intents": 33281,  // GUILDS | GUILD_MESSAGES | MESSAGE_CONTENT | DIRECT_MESSAGES
            "properties": {
                "os": if cfg!(target_os = "macos") { "Mac OS X" } else { "Windows" },
                "browser": "Discord Client",
                "device": ""
            },
            "compress": false,  // simpler without compression
            "large_threshold": 50,
            "presence": {
                "status": "online",
                "afk": false
            }
        }
    });
    sink.send(Message::Text(identify.to_string())).await?;

    // 5. Start heartbeat loop
    let heartbeat_interval_ms = heartbeat_interval;
    let sink_clone = std::sync::Arc::new(tokio::sync::Mutex::new(sink));

    let sink_for_heartbeat = sink_clone.clone();
    tokio::spawn(async move {
        let mut sequence: Option<u64> = None;
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(heartbeat_interval_ms)).await;
            let heartbeat = serde_json::json!({
                "op": 1,
                "d": sequence
            });
            let mut sink = sink_for_heartbeat.lock().await;
            if sink.send(Message::Text(heartbeat.to_string())).await.is_err() {
                break;
            }
        }
    });

    // 6. Listen for events
    while let Some(Ok(msg)) = read.next().await {
        if let Message::Text(text) = msg {
            let event: serde_json::Value = serde_json::from_str(&text)?;
            let op = event["op"].as_u64().unwrap_or(0);
            let event_type = event["t"].as_str();

            match op {
                0 => {
                    // Dispatch event
                    if event_type == Some("MESSAGE_CREATE") {
                        let msg_data = &event["d"];
                        // Process message...
                    }
                }
                1 => {
                    // Heartbeat request - send heartbeat immediately
                }
                7 => {
                    // Reconnect requested
                    break;
                }
                9 => {
                    // Invalid session
                    break;
                }
                10 => {
                    // Hello (already handled)
                }
                11 => {
                    // Heartbeat ACK - connection is healthy
                }
                _ => {}
            }
        }
    }

    Ok(())
}
```

### Gateway Intents for User Tokens

```
GUILDS            (1 << 0)  = 1
GUILD_MESSAGES    (1 << 9)  = 512
DIRECT_MESSAGES   (1 << 12) = 4096
MESSAGE_CONTENT   (1 << 15) = 32768
Total: 1 + 512 + 4096 + 32768 = 37377
```

Note: User tokens get MESSAGE_CONTENT by default (unlike bot tokens which need privileged intent approval). The intent value 33281 from the first-wave research = GUILDS + GUILD_MESSAGES + DIRECT_MESSAGES (without MESSAGE_CONTENT). Use 37377 to be explicit.

---

## Cargo Dependencies Summary

```toml
[dependencies]
# CDP connection
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = { version = "0.24", features = ["native-tls"] }
futures-util = "0.3"

# HTTP for CDP target discovery
reqwest = { version = "0.12", features = ["json"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Process management
sysinfo = "0.32"

# Token extraction (regex for LevelDB scanning)
regex = "1"

# Windows-only: DPAPI for token decryption
[target.'cfg(windows)'.dependencies]
windows-sys = { version = "0.52", features = ["Win32_Security_Cryptography", "Win32_System_Memory"] }
aes-gcm = "0.10"
base64 = "0.22"
```

---

## Architecture: Module Structure

```
src-tauri/src/
  discord/
    mod.rs              -- Public API: start_monitoring(), stop_monitoring(), get_channels()
    cdp_client.rs       -- WebSocket connection to CDP, send/receive commands
    cdp_discovery.rs    -- HTTP discovery of CDP targets at localhost:9223
    process_manager.rs  -- Find, kill, relaunch Discord with CDP flag
    flux_injector.rs    -- JS injection scripts, channel filter management
    message_parser.rs   -- Parse DiscordMessage, extract deal data, detect urgency
    health_monitor.rs   -- Connection health checks, reconnection loop
    types.rs            -- DiscordMessage, Embed, Attachment, Guild, Channel structs
    gateway/            -- Fallback: user token Gateway
      mod.rs
      token_extractor.rs
      gateway_client.rs
```

---

## Risk Matrix

| Risk                                             | Likelihood | Impact                                | Mitigation                                       |
| ------------------------------------------------ | ---------- | ------------------------------------- | ------------------------------------------------ |
| Discord flips EnableNodeCliInspectArguments fuse | Low (2026) | High - CDP stops working              | Fall back to Gateway approach                    |
| Discord changes webpack chunk name               | Low-Medium | Medium - JS injection breaks          | Make chunk name configurable, detect dynamically |
| Discord changes Flux dispatcher API              | Low        | Medium - subscribe/unsubscribe breaks | Network monitoring fallback within CDP           |
| User has BetterDiscord/Vencord installed         | Medium     | Low - CDP works alongside mods        | Test compatibility, document                     |
| Discord auto-update during monitoring            | High       | Low - brief interruption              | Auto-reconnect with health monitoring            |
| LevelDB locked by Discord process                | Medium     | Low - affects token extraction only   | Copy files before reading, or extract via CDP JS |
| Windows DPAPI token decryption fails             | Low        | Low - fallback approach only          | Prompt user to paste token manually              |
