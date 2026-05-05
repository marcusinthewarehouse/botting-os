# Discord Real-Time Message Capture - Deep Research

**Date:** 2026-03-07
**Priority:** #1 feature for BottingOS
**Goal:** Capture Discord messages in real-time from desktop app with zero friction, cross-platform, no bans

---

## Table of Contents

1. [Approach 1: Electron CDP (Chrome DevTools Protocol)](#1-electron-cdp) - RECOMMENDED PRIMARY
2. [Approach 2: User Token Gateway (Selfbot)](#2-user-token-gateway) - RECOMMENDED FALLBACK
3. [Approach 3: Local Proxy Interception](#3-local-proxy-interception)
4. [Approach 4: Vencord-Style Injection](#4-vencord-style-injection)
5. [Approach 5: Accessibility API](#5-accessibility-api)
6. [Approach 6: LevelDB Cache Reading](#6-leveldb-cache-reading)
7. [Approach 7: Discord Local RPC](#7-discord-local-rpc)
8. [Approach 8: Process Memory Reading](#8-process-memory-reading)
9. [Approach 9: OS Notification Capture](#9-os-notification-capture)
10. [Comparison Matrix](#comparison-matrix)
11. [Recommended Architecture](#recommended-architecture)
12. [Existing Tools and Prior Art](#existing-tools)
13. [Rust Ecosystem](#rust-ecosystem)

---

## 1. Electron CDP (Chrome DevTools Protocol) {#1-electron-cdp}

### How It Works

Discord desktop is an Electron app (Chromium-based). All Electron apps support the `--remote-debugging-port` flag, which exposes the Chrome DevTools Protocol over a local WebSocket. Once connected via CDP, you get FULL access to:

- **Network events** - every HTTP request/response and WebSocket frame
- **DOM mutations** - real-time observation of new message elements
- **JavaScript execution** - run arbitrary JS in Discord's renderer context
- **Console output** - capture all console.log calls

### Implementation

1. BottingOS kills any running Discord process
2. Relaunches Discord with: `Discord --remote-debugging-port=9223`
   - macOS: `/Applications/Discord.app/Contents/MacOS/Discord --remote-debugging-port=9223`
   - Windows: `%LOCALAPPDATA%\Discord\app-*\Discord.exe --remote-debugging-port=9223`
3. Polls `http://localhost:9223/json/list` until Discord is ready
4. Connects to the WebSocket URL from the target list
5. Subscribes to network events OR executes JS to hook Discord's internal Flux dispatcher

### CDP Network Approach (listen to Gateway WebSocket)

```
// Enable network monitoring
{"method": "Network.enable"}

// Listen for WebSocket frames - these contain Gateway events
// MESSAGE_CREATE events come through as WebSocket frames
{"method": "Network.webSocketFrameReceived", ...}
```

The Gateway WebSocket frames contain JSON with all message data: content, author, channel, embeds, attachments.

### CDP JavaScript Injection Approach (more reliable)

Execute JS in Discord's context to hook the Flux dispatcher:

```javascript
// Discord uses Flux architecture internally
// We can find the dispatcher and subscribe to all events
const dispatcher = Object.values(
  webpackChunkdiscord_app.push([[Symbol()], {}, (e) => e]),
).find((m) => m?.dispatch && m?.subscribe);

dispatcher.subscribe("MESSAGE_CREATE", (event) => {
  // Send to BottingOS via window.postMessage or fetch to localhost
  fetch("http://localhost:BOTTINGOS_PORT/discord-event", {
    method: "POST",
    body: JSON.stringify(event),
  });
});
```

### Scorecard

| Factor                    | Score  | Notes                                                                                     |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Technical Feasibility     | 9/10   | Proven, well-documented CDP protocol                                                      |
| Setup Friction            | 3/10   | BottingOS must relaunch Discord with flag. User sees Discord restart once.                |
| Real-time Latency         | <100ms | Direct access to renderer process                                                         |
| Cross-platform            | Both   | Works identically on Mac and Windows                                                      |
| TOS/Ban Risk              | 2/10   | No network traffic to Discord servers. Purely local. Discord cannot detect this remotely. |
| Implementation Complexity | 5/10   | CDP is well-documented. Many Rust CDP libraries exist.                                    |
| Tauri/Rust Native         | Yes    | `chromiumoxide` or `fantoccini` crate, or raw WebSocket to CDP                            |

### Key Risks

- Discord COULD check its own launch arguments (they don't currently, but could in future)
- Discord updates might change internal webpack module structure (but CDP network monitoring is stable)
- User must allow BottingOS to restart Discord (one-time, explain why)

### Detection Analysis

Discord cannot detect this because:

- The `--remote-debugging-port` is a Chromium feature, not a Discord feature
- No additional network traffic goes to Discord servers
- The CDP connection is purely local (localhost)
- Discord's integrity checks (if any) happen at the app level, not the Chromium level
- BetterDiscord/Vencord users have been doing similar things for years without detection

---

## 2. User Token Gateway Connection (Selfbot) {#2-user-token-gateway}

### How It Works

The user provides their Discord token (obtained from browser DevTools or Discord app). BottingOS opens a second WebSocket connection to Discord's Gateway (`wss://gateway.discord.gg/?v=10&encoding=json`) using this token, receiving all real-time events the user would see.

### Getting the User Token

The token is stored in Discord's LevelDB at:

- macOS: `~/Library/Application Support/discord/Local Storage/leveldb/`
- Windows: `%AppData%/discord/Local Storage/leveldb/`

BottingOS can extract it automatically by reading the LevelDB files - no user input needed.

### Gateway Connection Flow

1. GET `https://discord.gg/api/v10/gateway` to get WSS URL
2. Connect to `wss://gateway.discord.gg/?v=10&encoding=json`
3. Receive `Hello` event with heartbeat_interval
4. Send `Identify` payload:

```json
{
  "op": 2,
  "d": {
    "token": "USER_TOKEN_HERE",
    "intents": 33281,
    "properties": {
      "os": "Windows 10",
      "browser": "Discord Client",
      "device": ""
    },
    "compress": true
  }
}
```

5. Receive `Ready` event
6. Listen for `MESSAGE_CREATE` dispatches

### Key Technical Details

- **Intents needed:** GUILDS (1<<0), GUILD_MESSAGES (1<<9), MESSAGE_CONTENT (1<<15), DIRECT_MESSAGES (1<<12)
- User tokens get MESSAGE_CONTENT by default (unlike bot tokens which need privileged intent approval)
- The connection receives ALL messages from ALL servers the user is in
- Must send heartbeat every `heartbeat_interval` ms (typically ~41250ms)
- Must handle reconnects (opcode 7), invalid session (opcode 9)

### Detection and Ban Risk - DETAILED ANALYSIS

**How Discord detects selfbots:**

1. **API abuse patterns** - rapid-fire API calls, mass actions
2. **Behavioral analysis** - responding to commands automatically, unnatural timing
3. **Rate limit violations** - hitting rate limits repeatedly
4. **User-Agent mismatch** - sending incorrect client properties
5. **Concurrent sessions** - Discord allows multiple sessions but flags anomalies
6. **Reported by users** - other users report automated behavior

**Why READ-ONLY is lower risk:**

- No messages sent, no API calls made, no actions taken
- Just receiving Gateway events (same as having Discord open)
- Identical to having Discord open on a second device
- The connection looks like "Discord desktop on another machine"
- Many selfbot users report years of use without issues when only reading

**Actual ban reports (from community research):**

- Users running selfbots for YEARS without bans when not sending messages
- Bans primarily triggered by: mass DMing, auto-responding, spamming API endpoints
- One user reported a warning after logging 30,000 messages via API calls (not Gateway listening)
- Read-only Gateway connections are functionally identical to having Discord open

**Mitigation strategies:**

- Mimic official client's identify payload exactly (os, browser, device fields)
- Don't make any REST API calls, only listen on Gateway
- Respect heartbeat timing precisely
- Don't connect from unusual IPs (use user's own network)
- Rate limit any potential API calls aggressively

### Scorecard

| Factor                    | Score  | Notes                                                           |
| ------------------------- | ------ | --------------------------------------------------------------- |
| Technical Feasibility     | 10/10  | Well-understood protocol, multiple libraries exist              |
| Setup Friction            | 2/10   | Can auto-extract token from LevelDB. Zero user input possible.  |
| Real-time Latency         | <500ms | Direct Gateway connection, same as official client              |
| Cross-platform            | Both   | Pure WebSocket, works everywhere                                |
| TOS/Ban Risk              | 4/10   | Against TOS but read-only is rarely detected. Risk is non-zero. |
| Implementation Complexity | 4/10   | Rust crates exist. Well-documented protocol.                    |
| Tauri/Rust Native         | Yes    | `discord-selfbot` crate, or custom with `tokio-tungstenite`     |

### Key Risks

- Technically violates Discord TOS (account termination possible)
- If Discord changes token format or storage location, extraction breaks
- Token can expire/change when user changes password
- Two simultaneous Gateway connections from same token is detectable (though Discord allows multi-device)

---

## 3. Local Proxy Interception {#3-local-proxy-interception}

### How It Works

Launch Discord with `--proxy-server=127.0.0.1:8080` flag, routing all its traffic through a local proxy that BottingOS controls. The proxy decrypts HTTPS and captures WebSocket frames containing Gateway events.

### Implementation

1. BottingOS starts a local MITM proxy on port 8080
2. Generates a local CA certificate and installs it in the system trust store
3. Kills and relaunches Discord with: `Discord --proxy-server=127.0.0.1:8080`
4. Proxy intercepts all traffic, filters for Discord Gateway WebSocket frames
5. Parses MESSAGE_CREATE events from the WebSocket stream

### Proven: Discordless / Wumpus In The Middle

The `discordless` project proves this approach works:

- Uses mitmproxy as the MITM proxy
- `wumpus_in_the_middle.py` addon intercepts Discord traffic
- Captures both REST API responses and WebSocket (Gateway) frames
- Gateway traffic is zlib-compressed, stored in paired `_data` and `_timeline` files
- Launch Discord with: `discord --proxy-server=localhost:8080`
- Filter to Discord domains only: `--allow-hosts '^(((.+\.)?discord\.com)|((.+\.)?discordapp\.com)...)'`

### Technical Challenges

**Certificate installation (the big friction point):**

- macOS: Can add to Keychain via `security add-trusted-cert` (requires admin password)
- Windows: Can add via `certutil -addstore Root cert.pem` (requires admin elevation)
- User sees a "trust this certificate" prompt - could look suspicious
- Without the cert, HTTPS interception fails completely

**Discord-specific notes:**

- Adding `--ignore-certificate-errors` to Discord launch skips cert validation (but is a red flag)
- Discord's Electron uses Chromium's cert store, not the OS cert store on some platforms
- WebSocket Gateway frames are zlib-compressed, need decompression

### Scorecard

| Factor                    | Score   | Notes                                                                |
| ------------------------- | ------- | -------------------------------------------------------------------- |
| Technical Feasibility     | 8/10    | Proven by discordless project                                        |
| Setup Friction            | 6/10    | Requires CA cert installation + Discord relaunch                     |
| Real-time Latency         | <200ms  | Proxy adds minimal overhead                                          |
| Cross-platform            | Both    | mitmproxy-style approach works on both                               |
| TOS/Ban Risk              | 2/10    | Purely local, Discord can't detect the proxy                         |
| Implementation Complexity | 7/10    | Building a MITM proxy in Rust is complex. Cert management is fiddly. |
| Tauri/Rust Native         | Partial | Would need `rustls` + custom proxy. Significant Rust work.           |

### Key Risks

- CA cert installation is high friction and may alarm users
- Some corporate/antivirus software flags MITM proxy behavior
- More complex than CDP approach for same result
- Certificate management across OS versions is painful

---

## 4. Vencord-Style Injection {#4-vencord-style-injection}

### How It Works

Modify Discord's Electron app at the file level to inject custom code. Vencord does this by:

1. Locating Discord's `app.asar` or `app` directory
2. Creating a `patcher.js` that overrides Electron's `BrowserWindow`
3. Injecting a preload script that runs before Discord's renderer
4. The preload script patches webpack modules to intercept internal events

### Technical Details (from Vencord source analysis)

**Build artifacts:**

- `patcher.js` - main process patcher (from `src/main/index.ts`)
- `renderer.js` - renderer process bundle (from `src/Vencord.ts`)
- `preload.js` - preload script (from `src/preload.ts`)

**Webpack interception:**

- Sets a setter on `Function.prototype.m` to intercept webpack module factories
- When Discord assigns webpack modules, the setter fires
- Patches are applied via RegExp replacements on module source code
- Can intercept ANY internal Discord module: message stores, user stores, channel stores

**What this means for BottingOS:**

- Could inject a tiny script that hooks the message dispatcher
- Forward MESSAGE_CREATE events to BottingOS via IPC or localhost HTTP
- Full access to Discord's internal state (channels, servers, users, messages)

### Scorecard

| Factor                    | Score   | Notes                                                                                  |
| ------------------------- | ------- | -------------------------------------------------------------------------------------- |
| Technical Feasibility     | 9/10    | Proven by Vencord/BetterDiscord with millions of users                                 |
| Setup Friction            | 5/10    | Requires modifying Discord's installation files. Must re-inject after Discord updates. |
| Real-time Latency         | <50ms   | Direct in-process access                                                               |
| Cross-platform            | Both    | Same Electron app structure on both platforms                                          |
| TOS/Ban Risk              | 3/10    | Client modification is against TOS but Vencord has millions of users without mass bans |
| Implementation Complexity | 8/10    | Reverse engineering webpack modules, maintaining patches across updates                |
| Tauri/Rust Native         | Partial | File modification is easy. The injected code must be JS.                               |

### Key Risks

- Discord updates break patches frequently (Vencord team pushes fixes within 12 hours)
- Modifying Discord's files feels invasive to users
- Must re-inject after every Discord update (auto-updates happen frequently)
- Discord has discussed integrity checks for modified clients (not implemented yet)
- More complex than CDP for the same end result

---

## 5. Accessibility API {#5-accessibility-api}

### How It Works

Use the OS accessibility API to read Discord's UI tree and detect new messages.

### macOS Implementation

- Use `AXUIElement` API to query Discord's window
- Register `AXObserver` for `kAXValueChangedNotification` or `kAXUIElementCreatedNotification`
- Walk the accessibility tree to find message list elements
- Read text content from each message element
- Requires user to grant Accessibility permission in System Preferences

**macOS gotchas:**

- Requires explicit user permission grant (System Preferences > Privacy > Accessibility)
- Electron apps expose accessibility trees but they can be sparse
- `app.setAccessibilitySupportEnabled(true)` must be called in Electron for full tree
- Discord may not expose detailed accessibility labels on all elements
- Tree walking is slow for large message histories

### Windows Implementation

- Use UI Automation (UIA) API
- `IUIAutomation` interface provides `AddAutomationEventHandler` for real-time notifications
- Can subscribe to `UIA_StructureChangedEventId` for new elements
- Windows UIA is more mature than macOS accessibility for this use case

**Windows gotchas:**

- Discord's Chromium renderer may or may not expose detailed UIA elements
- Performance of tree queries can be poor with complex UIs
- Chromium's UIA support is inconsistent across versions

### Scorecard

| Factor                    | Score    | Notes                                                                    |
| ------------------------- | -------- | ------------------------------------------------------------------------ |
| Technical Feasibility     | 4/10     | Possible but unreliable. Electron accessibility support is inconsistent. |
| Setup Friction            | 5/10     | macOS requires accessibility permission. Windows is automatic.           |
| Real-time Latency         | 500ms-2s | Depends on polling frequency and tree query speed                        |
| Cross-platform            | Both     | Different APIs per platform but both supported                           |
| TOS/Ban Risk              | 1/10     | Purely reads the UI. Zero network interaction. Completely undetectable.  |
| Implementation Complexity | 8/10     | Two completely different APIs. Fragile selectors. Parsing UI text.       |
| Tauri/Rust Native         | Yes      | `accessibility` crate on macOS, `windows` crate UIA bindings             |

### Key Risks

- Extremely fragile - any Discord UI change breaks selectors
- Performance is poor for real-time monitoring
- Parsing structured data from UI text is unreliable
- Accessibility trees in Electron are often incomplete
- Two completely different implementations needed (Mac vs Windows)
- Cannot reliably get message metadata (channel ID, user ID, timestamps)

---

## 6. LevelDB Cache Reading {#6-leveldb-cache-reading}

### How It Works

Discord stores data in LevelDB at:

- macOS: `~/Library/Application Support/discord/Local Storage/leveldb/`
- Windows: `%AppData%/discord/Local Storage/leveldb/`

### What's Actually in the Cache

Based on forensic analysis tools (LevelDBDumper, DiscordExplorer):

- User email and token
- Recent games played
- Search history
- Draft messages
- Collapsed categories/channels
- User settings and GIF favorites
- **Some** cached message snippets

### Why This Doesn't Work for Real-Time

- Messages are NOT reliably stored in LevelDB
- LevelDB is primarily for client state, not message history
- Message content is fetched via API and held in memory (V8 heap), not persisted to disk
- Write frequency to LevelDB is unpredictable - not real-time
- The LevelDB files are locked by the Discord process (can't read while Discord is running without copying)
- Data format is Electron's localStorage serialization, not structured message data

### What IS Useful

- **Token extraction** - the user token IS stored in LevelDB and can be extracted automatically
- Useful as a helper for Approach 2 (auto-extract token for Gateway connection)

### Scorecard

| Factor                    | Score  | Notes                                        |
| ------------------------- | ------ | -------------------------------------------- |
| Technical Feasibility     | 3/10   | Messages aren't reliably cached here         |
| Setup Friction            | 1/10   | Just read files, no user interaction needed  |
| Real-time Latency         | 5-30s+ | Writes are infrequent and unpredictable      |
| Cross-platform            | Both   | Same LevelDB structure                       |
| TOS/Ban Risk              | 1/10   | Reading local files, completely undetectable |
| Implementation Complexity | 4/10   | LevelDB parsing is straightforward           |
| Tauri/Rust Native         | Yes    | `rusty-leveldb` crate                        |

### Key Risks

- Not viable for real-time message capture
- Only useful for token extraction (supporting role)
- LevelDB file locking issues while Discord is running

---

## 7. Discord Local RPC {#7-discord-local-rpc}

### How It Works

Discord runs a local RPC server on `127.0.0.1:6463-6472` accepting WebSocket connections. This is primarily for Rich Presence and game integration.

### API Capabilities

- **WebSocket URL:** `ws://127.0.0.1:PORT/?v=VERSION&client_id=CLIENT_ID&encoding=json`
- Requires OAuth2 authentication with a registered Discord application
- Proxies some API requests using the user's bearer token
- Can modify some user state (presence, activity)

### What's Available via RPC

- Set/get user activity (Rich Presence)
- Get guilds list
- Get channels list
- Select voice channel
- Subscribe to some events

### What's NOT Available

- **Message content** - RPC does not expose message events
- **MESSAGE_CREATE events** - not available through RPC
- Real-time message monitoring is not supported
- RPC is designed for game integration, not message reading

### Scorecard

| Factor                    | Score | Notes                                       |
| ------------------------- | ----- | ------------------------------------------- |
| Technical Feasibility     | 1/10  | Messages are not available through RPC      |
| Setup Friction            | 3/10  | Need a registered Discord app for client_id |
| Real-time Latency         | N/A   | Messages not available                      |
| Cross-platform            | Both  | Same localhost server                       |
| TOS/Ban Risk              | 1/10  | Official API, completely legitimate         |
| Implementation Complexity | 3/10  | Simple WebSocket connection                 |
| Tauri/Rust Native         | Yes   | Standard WebSocket                          |

### Verdict: NOT VIABLE for message capture. RPC does not expose message data.

---

## 8. Process Memory Reading {#8-process-memory-reading}

### How It Works

Read Discord's process memory (V8 heap) to extract message data.

### Technical Details

- Discord/Electron runs V8 JavaScript engine
- Messages exist as JS objects in V8's heap
- Research paper "Juicing V8" describes extracting objects using MetaMap scanning
- V8MapScan plugin scans for MetaMap data structures within the V8 isolate
- Could find message objects, user objects, channel data in memory

### Why This Is Impractical

- V8 heap is complex, with garbage collection constantly moving objects
- Finding message objects requires understanding V8's internal object layout
- Object layout changes with every V8/Chromium update
- No stable pointers - GC compaction moves everything
- Must handle multiple V8 isolates (main process + renderer)
- Extremely fragile, breaks with every Discord/Electron update
- Requires elevated privileges on both platforms
- macOS SIP (System Integrity Protection) restricts process memory access
- Windows requires debug privileges

### Scorecard

| Factor                    | Score   | Notes                                                         |
| ------------------------- | ------- | ------------------------------------------------------------- |
| Technical Feasibility     | 2/10    | Theoretically possible but extremely impractical              |
| Setup Friction            | 7/10    | Requires elevated privileges, SIP concerns on Mac             |
| Real-time Latency         | 1-5s    | Scanning memory is slow                                       |
| Cross-platform            | Both    | Different APIs per platform                                   |
| TOS/Ban Risk              | 1/10    | Local only, undetectable                                      |
| Implementation Complexity | 10/10   | V8 heap parsing is research-level complexity                  |
| Tauri/Rust Native         | Partial | `process_memory` crate exists but V8 parsing is the hard part |

### Verdict: NOT VIABLE. Complexity is astronomical for marginal benefit.

---

## 9. OS Notification Capture {#9-os-notification-capture}

### How It Works

Capture Discord's desktop notifications to extract message content.

### macOS

- `NSDistributedNotificationCenter` can observe cross-process notifications
- BUT: Discord uses Electron's notification system, which may not post to the distributed notification center
- Could potentially use `NSUserNotificationCenter` observation
- Requires Discord to have notifications enabled for the channels we care about
- Notification content is often truncated

### Windows

- Can listen for Windows toast notifications via `Windows.UI.Notifications` API
- Discord posts toast notifications for new messages
- Content may be truncated or missing for some message types
- Requires Discord notification settings to be enabled

### Fundamental Limitations

- Only captures messages where notifications are enabled (user must configure Discord)
- Notification content is often truncated (long messages cut off)
- No channel ID, message ID, or structured metadata
- Doesn't work for muted channels/servers (which are often the ones we want to monitor)
- Notifications are suppressed when Discord is focused
- No way to get message embeds, attachments, or reactions
- If user has DND/Focus mode on, no notifications fire

### Scorecard

| Factor                    | Score | Notes                                                 |
| ------------------------- | ----- | ----------------------------------------------------- |
| Technical Feasibility     | 3/10  | Notifications are unreliable and truncated            |
| Setup Friction            | 6/10  | User must configure Discord notifications per channel |
| Real-time Latency         | 1-3s  | Notifications have inherent delay                     |
| Cross-platform            | Both  | Different APIs but both possible                      |
| TOS/Ban Risk              | 1/10  | Just reading OS notifications                         |
| Implementation Complexity | 5/10  | Platform-specific notification APIs                   |
| Tauri/Rust Native         | Yes   | `objc` crate on macOS, `windows` crate on Windows     |

### Verdict: NOT VIABLE as primary approach. Too unreliable and incomplete.

---

## Comparison Matrix {#comparison-matrix}

| Approach               | Feasibility | Friction | Latency  | Platform | Ban Risk | Complexity | Viable?                         |
| ---------------------- | ----------- | -------- | -------- | -------- | -------- | ---------- | ------------------------------- |
| **CDP (DevTools)**     | 9           | 3        | <100ms   | Both     | 2        | 5          | YES - PRIMARY                   |
| **User Token Gateway** | 10          | 2        | <500ms   | Both     | 4        | 4          | YES - FALLBACK                  |
| **Local Proxy**        | 8           | 6        | <200ms   | Both     | 2        | 7          | Possible but high friction      |
| **Vencord-Style**      | 9           | 5        | <50ms    | Both     | 3        | 8          | Possible but maintenance burden |
| **Accessibility API**  | 4           | 5        | 500ms-2s | Both     | 1        | 8          | NOT recommended                 |
| **LevelDB Cache**      | 3           | 1        | 5-30s+   | Both     | 1        | 4          | Only for token extraction       |
| **Local RPC**          | 1           | 3        | N/A      | Both     | 1        | 3          | NOT VIABLE                      |
| **Process Memory**     | 2           | 7        | 1-5s     | Both     | 1        | 10         | NOT VIABLE                      |
| **OS Notifications**   | 3           | 6        | 1-3s     | Both     | 1        | 5          | NOT VIABLE                      |

---

## Recommended Architecture {#recommended-architecture}

### Tiered Approach: CDP Primary, Gateway Fallback

#### Tier 1: CDP (Chrome DevTools Protocol) - Primary Method

**Why CDP wins:**

- Zero ban risk (purely local, no Discord server interaction)
- Sub-100ms latency
- Full access to all message data including embeds and attachments
- Works on both platforms identically
- No token management needed
- Survives token changes/password resets
- Well-documented protocol with mature Rust libraries

**User experience:**

1. User installs BottingOS
2. First launch: "BottingOS needs to restart Discord to enable monitoring. This is a one-time setup."
3. BottingOS kills Discord, relaunches with `--remote-debugging-port=9223`
4. BottingOS connects via CDP, injects message listener
5. Messages flow in real-time
6. After Discord auto-updates, BottingOS detects disconnection and re-launches

**Implementation plan:**

```
Tauri (Rust) backend:
  1. discord_launcher.rs - Find Discord executable, kill existing, relaunch with CDP flag
  2. cdp_client.rs - Connect to CDP WebSocket, subscribe to events
  3. message_parser.rs - Parse MESSAGE_CREATE events from CDP data
  4. Two sub-approaches:
     a. Network monitoring: Listen to WebSocket frames on the Gateway connection
     b. JS injection: Execute JS to hook Flux dispatcher (more reliable)
```

**Rust crates needed:**

- `chromiumoxide` - full CDP client in Rust
- `tokio-tungstenite` - WebSocket for CDP connection
- `serde_json` - parse message data
- `sysinfo` - find/kill Discord process

#### Tier 2: User Token Gateway - Fallback Method

**When to use:**

- If CDP connection fails (Discord blocking the flag in future)
- If user prefers not to restart Discord
- As a supplement to get messages from channels not currently visible

**User experience:**

1. BottingOS automatically extracts token from Discord's LevelDB (no user input)
2. Opens read-only Gateway connection
3. Listens for MESSAGE_CREATE events
4. Filters to user's configured channels

**Mitigation for ban risk:**

- READ-ONLY: never send messages, never call REST API
- Mimic official client identify payload exactly
- Use proper heartbeat timing with jitter
- Don't reconnect aggressively on failures
- Consider using this only when CDP is unavailable

**Implementation plan:**

```
Tauri (Rust) backend:
  1. token_extractor.rs - Read LevelDB, extract user token
  2. gateway_client.rs - WebSocket connection to wss://gateway.discord.gg
  3. gateway_events.rs - Parse Gateway events (MESSAGE_CREATE, etc.)
  4. heartbeat.rs - Maintain heartbeat loop
```

**Rust crates needed:**

- `rusty-leveldb` - read Discord's LevelDB for token
- `tokio-tungstenite` - WebSocket client
- `flate2` - zlib decompression for Gateway frames
- `serde` / `serde_json` - serialization

### Architecture Diagram

```
User's Machine
+--------------------------------------------------+
|                                                  |
|  Discord Desktop App                             |
|  (Electron/Chromium)                             |
|    |                                             |
|    | --remote-debugging-port=9223                |
|    |                                             |
|    v                                             |
|  localhost:9223 (CDP WebSocket)                   |
|    |                                             |
|    v                                             |
|  BottingOS (Tauri v2 App)                        |
|  +----------------------------------------------+|
|  |  CDP Client (Rust)                           ||
|  |    - Connects to Discord's CDP port          ||
|  |    - Injects JS to hook Flux dispatcher      ||
|  |    - Receives MESSAGE_CREATE events          ||
|  |                                              ||
|  |  Gateway Client (Rust) [FALLBACK]            ||
|  |    - Reads token from LevelDB               ||
|  |    - Connects to wss://gateway.discord.gg   ||
|  |    - Listens for MESSAGE_CREATE              ||
|  |                                              ||
|  |  Message Router                              ||
|  |    - Filters by channel/server              ||
|  |    - Applies user's monitoring rules        ||
|  |    - Triggers alerts for matching messages  ||
|  +----------------------------------------------+|
|                                                  |
+--------------------------------------------------+
```

### Handling Discord Updates

Discord auto-updates frequently. The CDP approach handles this gracefully:

1. BottingOS detects CDP connection dropped (Discord restarted itself for update)
2. Waits for Discord to finish updating (poll for process)
3. Kills the new Discord process
4. Relaunches with `--remote-debugging-port=9223`
5. Reconnects CDP
6. Re-injects message listener
7. Total downtime: ~5-10 seconds during Discord update

### Handling First-Time Setup

```
First Launch Flow:
1. BottingOS detects Discord is installed
2. Shows: "To monitor Discord messages, BottingOS needs to manage how Discord launches.
   This is safe and doesn't modify Discord. You can disable this anytime."
3. User clicks "Enable Discord Monitoring"
4. BottingOS:
   a. Finds Discord executable path
   b. Kills running Discord (if any)
   c. Relaunches with CDP flag
   d. Connects and verifies
5. Shows: "Discord monitoring active. You'll see messages in real-time."
6. Optionally: offer to set BottingOS as Discord's launcher (so it always starts with CDP)
```

---

## Existing Tools and Prior Art {#existing-tools}

### BetterDiscord / Vencord

**Technical approach:** File-level injection into Discord's Electron app

- Modify `app.asar` or create custom `app` directory
- Inject patcher.js into main process
- Override BrowserWindow to add preload scripts
- Preload scripts patch webpack modules via `Function.prototype.m` setter
- Full access to Discord internals via webpack module interception
- Millions of users, Discord has not mass-banned (but it IS against TOS)

**Relevance:** Proves that deep Discord client modification is tolerated by Discord. However, their approach (file modification) is more invasive than our CDP approach.

### Discordless (mitmproxy approach)

**Technical approach:** MITM proxy

- Launch Discord with `--proxy-server=localhost:8080`
- mitmproxy intercepts HTTPS and WebSocket traffic
- `wumpus_in_the_middle.py` saves all Discord data
- Requires mitmproxy CA cert installation

**Relevance:** Proves proxy interception works but has high friction (cert install).

### Discord Message Forwarder projects

**Technical approach:** Most use discord.py-self (Python selfbot library) or bot tokens

- Connect to Gateway with user token
- Listen for MESSAGE_CREATE
- Forward to another channel/server
- Many are actively maintained and used

**Relevance:** Proves Gateway approach works reliably for message monitoring.

### Professional Discord Monitoring (MEE6, Statbot, etc.)

**Technical approach:** Official Bot API with OAuth2

- These are official Discord bots added to servers
- Use Bot tokens (not user tokens)
- Require MESSAGE_CONTENT privileged intent
- Must be added to each server by an admin

**Relevance:** NOT applicable to our use case. We need to monitor servers where the user is a member but not an admin. Bot approach requires server admin permission.

---

## Rust Ecosystem {#rust-ecosystem}

### CDP/DevTools Protocol

| Crate             | Description                         | Status         |
| ----------------- | ----------------------------------- | -------------- |
| `chromiumoxide`   | Full CDP client, browser automation | Active, mature |
| `fantoccini`      | WebDriver client (can use CDP)      | Active         |
| `headless_chrome` | Chrome control via CDP              | Active         |

### Discord Gateway

| Crate             | Description                           | Status            |
| ----------------- | ------------------------------------- | ----------------- |
| `discord-selfbot` | User token Gateway + REST             | v0.1.0 (Oct 2025) |
| `serenity_self`   | Serenity fork with user token support | Active            |
| `twilight`        | Modular Discord library (bot-focused) | Mature, active    |

### Supporting

| Crate                  | Description        | Use                         |
| ---------------------- | ------------------ | --------------------------- |
| `tokio-tungstenite`    | Async WebSocket    | Gateway/CDP connections     |
| `rusty-leveldb`        | LevelDB reader     | Token extraction            |
| `flate2`               | zlib compression   | Gateway frame decompression |
| `sysinfo`              | Process management | Find/kill Discord           |
| `serde` / `serde_json` | Serialization      | Everything                  |

---

## Open Questions for Implementation

1. **Does Discord check launch arguments?** - No evidence of this currently. Vencord/BetterDiscord users launch with various flags. But Discord COULD add this check.

2. **Can we make Discord auto-launch with CDP flag?** - Yes, by modifying the desktop shortcut or creating a wrapper. On macOS, modify the .app launch script. On Windows, modify the shortcut target.

3. **How do we handle the "Discord is already running" case?** - Kill existing process first. User will see Discord restart. This is the main UX friction point.

4. **What if the user has Vencord/BetterDiscord installed?** - CDP approach should still work alongside client mods. The `--remote-debugging-port` flag is orthogonal to file-level modifications.

5. **WebSocket frame format from CDP Network monitoring vs JS injection?** - Network monitoring gives raw zlib-compressed Gateway frames. JS injection gives parsed JS objects. JS injection is cleaner but more fragile (depends on Discord's internal API structure).

6. **Should we offer both approaches to the user?** - Yes. Default to CDP. If user is uncomfortable with Discord restart, offer Gateway token approach as alternative. Let them choose in settings.

---

## Summary and Recommendation

**Primary: CDP (Chrome DevTools Protocol)**

- Best balance of low friction, zero ban risk, and real-time performance
- Restart Discord once with `--remote-debugging-port` flag
- Connect locally, inject message listener
- No Discord server interaction = no detection possible

**Fallback: User Token Gateway**

- Auto-extract token from LevelDB (zero user input)
- Read-only Gateway connection
- Small but real TOS violation risk
- Use only when CDP is unavailable

**Do NOT pursue:** RPC, memory reading, OS notifications, or accessibility API. These are either non-viable or too fragile.

**Consider for token extraction only:** LevelDB cache reading (supports the Gateway fallback).

**Consider as future enhancement:** Vencord-style injection if CDP is ever blocked by Discord. But the maintenance burden of patching webpack modules is high.
