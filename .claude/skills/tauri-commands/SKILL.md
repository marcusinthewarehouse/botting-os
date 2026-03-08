# Skill: Tauri Commands

Defines the IPC pattern for BottingOS - how Rust commands are defined and called from the Next.js frontend via `invoke()`. Use this when implementing any Tauri command or plugin integration.

---

## 1. Tauri IPC Pattern

### Rust Side - Defining Commands

Commands are async functions annotated with `#[tauri::command]`. They receive typed params and return `Result<T, String>` (or a custom error type).

```rust
// src-tauri/src/commands/mod.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DbRow {
    pub columns: Vec<String>,
    pub values: Vec<Vec<serde_json::Value>>,
}

#[tauri::command]
async fn db_query(sql: String, params: Vec<serde_json::Value>) -> Result<DbRow, String> {
    // implementation
    Ok(DbRow { columns: vec![], values: vec![] })
}
```

Register commands in `lib.rs`:

```rust
// src-tauri/src/lib.rs
mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::db_execute,
            commands::db_query,
            commands::discord_connect,
            commands::discord_disconnect,
            commands::discord_get_channels,
            commands::discord_monitor,
            commands::fetch_prices,
            commands::ebay_search,
            commands::encrypt,
            commands::decrypt,
            commands::get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Frontend Side - Calling Commands

Always lazy-import `invoke` to avoid SSR issues with Next.js:

```typescript
// WRONG - breaks during SSR/HMR
import { invoke } from "@tauri-apps/api/core";

// RIGHT - lazy import inside client components
async function callCommand() {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke("my_command", { arg: "value" });
}

// RIGHT - environment check
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
```

TypeScript invoke pattern with types:

```typescript
// src/lib/tauri.ts
export async function tauriInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}
```

---

## 2. Key Commands to Implement

### 2.1 Database Commands

The primary DB access uses `@tauri-apps/plugin-sql` (no custom commands needed for basic queries). But for raw SQL or advanced operations:

```rust
// src-tauri/src/commands/db.rs
use serde_json::Value;

#[derive(Debug, serde::Serialize)]
pub struct ExecResult {
    pub rows_affected: u64,
    pub last_insert_id: i64,
}

#[tauri::command]
pub async fn db_execute(sql: String, params: Vec<Value>) -> Result<ExecResult, String> {
    // Use tauri-plugin-sql internally or direct sqlx
    // Plugin handles connection pooling and WAL mode
    Err("use @tauri-apps/plugin-sql JS bindings instead".into())
}

#[tauri::command]
pub async fn db_query(sql: String, params: Vec<Value>) -> Result<Vec<Value>, String> {
    Err("use @tauri-apps/plugin-sql JS bindings instead".into())
}
```

**Preferred approach** - use the plugin's JS bindings directly (no custom Rust command needed):

```typescript
// src/lib/db/index.ts
import Database from "@tauri-apps/plugin-sql";

let dbInstance: Awaited<ReturnType<typeof Database.load>> | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:bottingos.db");
  }
  return dbInstance;
}

// SELECT
const rows = await (
  await getDb()
).select("SELECT * FROM orders WHERE id = ?", [42]);

// INSERT/UPDATE/DELETE
const result = await (
  await getDb()
).execute("INSERT INTO orders (product_name, site) VALUES (?, ?)", [
  "Nike Dunk Low",
  "nike",
]);
```

With Drizzle sqlite-proxy (recommended - gives type safety):

```typescript
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    const sqlite = await getDb();
    const isSelect =
      sql.trimStart().toLowerCase().startsWith("select") ||
      sql.trimStart().toLowerCase().startsWith("pragma");

    if (isSelect) {
      const rows = await sqlite.select(sql, params).catch(() => []);
      const mapped = rows.map((row: any) => Object.values(row));
      return { rows: method === "all" ? mapped : mapped[0] };
    }

    await sqlite.execute(sql, params);
    return { rows: [] };
  },
  { schema },
);
```

### 2.2 Discord CDP Commands

Uses `tokio-tungstenite` + `serde_json` for lightweight CDP over WebSocket.

```rust
// src-tauri/src/commands/discord.rs
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscordChannel {
    pub id: String,
    pub name: String,
    pub guild_id: Option<String>,
    pub guild_name: Option<String>,
}

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

pub struct CdpState {
    pub connected: Mutex<bool>,
    pub ws_url: Mutex<Option<String>>,
}

#[tauri::command]
pub async fn discord_connect(state: State<'_, CdpState>) -> Result<String, String> {
    // 1. Kill existing Discord
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("pkill").args(["-x", "Discord"]).status();
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill").args(["/F", "/IM", "Discord.exe"]).status();
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }

    // 2. Relaunch with CDP flag
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(["-a", "Discord", "--args", "--remote-debugging-port=9223"])
            .spawn()
            .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let discord_path = format!("{}\\Discord\\Update.exe", appdata);
        Command::new(&discord_path)
            .args(["--processStart", "Discord.exe", "--process-start-args", "--remote-debugging-port=9223"])
            .spawn()
            .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    }

    // 3. Wait for Discord to be ready, then discover CDP target
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;

    let client = reqwest::Client::new();
    let targets: Vec<CdpTarget> = client
        .get("http://127.0.0.1:9223/json/list")
        .send().await.map_err(|e| format!("CDP not available: {}", e))?
        .json().await.map_err(|e| format!("Bad CDP response: {}", e))?;

    let main_page = targets.iter()
        .find(|t| t.target_type == "page" && (t.url.contains("discord.com/app") || t.title.contains("Discord")))
        .ok_or("Discord main page not found in CDP targets")?;

    *state.ws_url.lock().unwrap() = Some(main_page.ws_url.clone());
    *state.connected.lock().unwrap() = true;

    Ok(main_page.ws_url.clone())
}

#[derive(Debug, Deserialize)]
struct CdpTarget {
    title: String,
    #[serde(rename = "type")]
    target_type: String,
    url: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    ws_url: String,
}

#[tauri::command]
pub async fn discord_disconnect(state: State<'_, CdpState>) -> Result<(), String> {
    *state.connected.lock().unwrap() = false;
    *state.ws_url.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn discord_get_channels(state: State<'_, CdpState>) -> Result<Vec<DiscordChannel>, String> {
    let ws_url = state.ws_url.lock().unwrap().clone()
        .ok_or("Not connected to Discord CDP")?;

    // Connect to CDP WebSocket and inject JS to enumerate channels
    // JS injection uses webpack chunk to access GuildStore and ChannelStore:
    //
    // const stores = Object.values(wpRequire.c)
    //   .map(m => m?.exports).filter(Boolean)
    //   .flatMap(e => [e, e.default, e.Z, e.ZP].filter(Boolean));
    // const GuildStore = stores.find(m => m?.getGuilds && m?.getGuild);
    // const ChannelStore = stores.find(m => m?.getChannel && m?.getMutableGuildChannelsForGuild);
    // const guilds = Object.values(GuildStore.getGuilds());
    // const channels = guilds.flatMap(g => {
    //   const guildChannels = ChannelStore.getMutableGuildChannelsForGuild(g.id);
    //   return Object.values(guildChannels)
    //     .filter(c => c.type === 0) // text channels only
    //     .map(c => ({ id: c.id, name: c.name, guild_id: g.id, guild_name: g.name }));
    // });

    // Execute via Runtime.evaluate, parse result
    todo!("Implement CDP WebSocket connection and JS evaluation")
}

#[tauri::command]
pub async fn discord_monitor(
    channel_ids: Vec<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // 1. Connect to CDP WebSocket
    // 2. Inject Flux dispatcher hook (see injection script below)
    // 3. Set window.__bottingos_channels = new Set([...channel_ids])
    // 4. Spawn background task that listens for Runtime.consoleAPICalled events
    // 5. Parse messages prefixed with __BOTTINGOS_MSG__
    // 6. Emit to frontend via app.emit("discord-message", parsed_msg)
    todo!("Implement monitoring loop")
}
```

**JS injection script for message monitoring** (injected via `Runtime.evaluate`):

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

**Frontend - listening for Discord events:**

```typescript
// src/lib/discord.ts
import { listen } from "@tauri-apps/api/event";

export async function onDiscordMessage(
  callback: (msg: DiscordMessage) => void,
) {
  const { listen } = await import("@tauri-apps/api/event");
  return listen<DiscordMessage>("discord-message", (event) => {
    callback(event.payload);
  });
}

// In a React component:
useEffect(() => {
  let unlisten: (() => void) | undefined;
  onDiscordMessage((msg) => {
    setMessages((prev) => [msg, ...prev]);
  }).then((fn) => {
    unlisten = fn;
  });
  return () => unlisten?.();
}, []);
```

### 2.3 Price Fetching (CORS bypass)

Tauri's Rust backend bypasses browser CORS restrictions. Use `tauri-plugin-http` or custom commands.

```rust
// src-tauri/src/commands/prices.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PriceResult {
    pub name: String,
    pub sku: String,
    pub stockx_price: Option<f64>,
    pub goat_price: Option<f64>,
    pub flight_club_price: Option<f64>,
    pub image_url: Option<String>,
}

#[tauri::command]
pub async fn fetch_prices(query: String) -> Result<Vec<PriceResult>, String> {
    let client = reqwest::Client::new();

    // Sneaks-API endpoints (self-hosted or public)
    // StockX search
    let url = format!("http://localhost:4000/search/{}", urlencoding::encode(&query));
    let resp = client.get(&url)
        .send().await
        .map_err(|e| format!("Price fetch failed: {}", e))?
        .json::<Vec<serde_json::Value>>().await
        .map_err(|e| format!("Parse error: {}", e))?;

    let results = resp.iter().map(|item| PriceResult {
        name: item["shoeName"].as_str().unwrap_or("").to_string(),
        sku: item["styleID"].as_str().unwrap_or("").to_string(),
        stockx_price: item["lowestResellPrice"]["stockX"].as_f64(),
        goat_price: item["lowestResellPrice"]["goat"].as_f64(),
        flight_club_price: item["lowestResellPrice"]["flightClub"].as_f64(),
        image_url: item["thumbnail"].as_str().map(String::from),
    }).collect();

    Ok(results)
}

#[tauri::command]
pub async fn ebay_search(query: String) -> Result<Vec<serde_json::Value>, String> {
    let client = reqwest::Client::new();

    // eBay Browse API (OAuth token required, stored in tauri-plugin-store)
    let token = ""; // Retrieved from secure store
    let resp = client
        .get("https://api.ebay.com/buy/browse/v1/item_summary/search")
        .query(&[("q", &query), ("limit", &"10".to_string())])
        .header("Authorization", format!("Bearer {}", token))
        .header("X-EBAY-C-MARKETPLACE-ID", "EBAY_US")
        .send().await
        .map_err(|e| format!("eBay search failed: {}", e))?
        .json::<serde_json::Value>().await
        .map_err(|e| format!("Parse error: {}", e))?;

    let items = resp["itemSummaries"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    Ok(items)
}
```

**Frontend usage:**

```typescript
const prices = await tauriInvoke<PriceResult[]>("fetch_prices", {
  query: "Nike Dunk Low Panda",
});
const ebayItems = await tauriInvoke<any[]>("ebay_search", {
  query: "Nike Dunk Low 10.5",
});
```

### 2.4 Encryption Commands

```rust
// src-tauri/src/commands/crypto.rs
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::aead::generic_array::GenericArray;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};

#[derive(serde::Serialize)]
pub struct EncryptResult {
    pub ciphertext: String,  // base64
    pub iv: String,          // base64
}

#[tauri::command]
pub fn encrypt(plaintext: String, key: String) -> Result<EncryptResult, String> {
    let key_bytes = hex::decode(&key).map_err(|e| format!("Bad key: {}", e))?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, &mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encrypt failed: {}", e))?;

    Ok(EncryptResult {
        ciphertext: BASE64.encode(&ciphertext),
        iv: BASE64.encode(&nonce_bytes),
    })
}

#[tauri::command]
pub fn decrypt(ciphertext: String, iv: String, key: String) -> Result<String, String> {
    let key_bytes = hex::decode(&key).map_err(|e| format!("Bad key: {}", e))?;
    let ct_bytes = BASE64.decode(&ciphertext).map_err(|e| format!("Bad ciphertext: {}", e))?;
    let iv_bytes = BASE64.decode(&iv).map_err(|e| format!("Bad IV: {}", e))?;

    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&iv_bytes);

    let plaintext = cipher.decrypt(nonce, ct_bytes.as_ref())
        .map_err(|e| format!("Decrypt failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 error: {}", e))
}
```

**Frontend usage:**

```typescript
const { ciphertext, iv } = await tauriInvoke<{
  ciphertext: string;
  iv: string;
}>("encrypt", { plaintext: "secret_password", key: derivedKeyHex });

const decrypted = await tauriInvoke<string>("decrypt", {
  ciphertext,
  iv,
  key: derivedKeyHex,
});
```

### 2.5 System Info Command

```rust
// src-tauri/src/commands/system.rs

#[derive(serde::Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub discord_path: Option<String>,
    pub data_dir: String,
}

#[tauri::command]
pub fn get_system_info(app: tauri::AppHandle) -> Result<SystemInfo, String> {
    let discord_path = {
        #[cfg(target_os = "macos")]
        { Some("/Applications/Discord.app".to_string()) }
        #[cfg(target_os = "windows")]
        {
            std::env::var("LOCALAPPDATA")
                .ok()
                .map(|appdata| format!("{}\\Discord", appdata))
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        { None }
    };

    let data_dir = app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        discord_path,
        data_dir,
    })
}
```

---

## 3. Plugin Usage

### tauri-plugin-sql (SQLite)

**Rust** - register in `lib.rs`:

```rust
.plugin(tauri_plugin_sql::Builder::new().build())
```

**Capabilities** (`src-tauri/capabilities/default.json`):

```json
[
  "sql:default",
  "sql:allow-load",
  "sql:allow-execute",
  "sql:allow-select",
  "sql:allow-close"
]
```

**Frontend:**

```typescript
import Database from "@tauri-apps/plugin-sql";
const db = await Database.load("sqlite:bottingos.db");
await db.execute("INSERT INTO settings (key, value) VALUES (?, ?)", [
  "theme",
  "dark",
]);
const rows = await db.select<{ key: string; value: string }[]>(
  "SELECT * FROM settings",
);
```

### tauri-plugin-store (Key-Value)

Persistent key-value storage for app settings, API tokens, etc.

**Rust:**

```rust
.plugin(tauri_plugin_store::Builder::new().build())
```

**Frontend:**

```typescript
import { Store } from "@tauri-apps/plugin-store";
const store = await Store.load("settings.json");
await store.set("ebay_token", "abc123");
const token = await store.get<string>("ebay_token");
await store.save(); // persist to disk
```

### tauri-plugin-http (CORS bypass)

For HTTP requests that need to bypass browser CORS.

**Rust:**

```rust
.plugin(tauri_plugin_http::init())
```

**Frontend:**

```typescript
import { fetch } from "@tauri-apps/plugin-http";
const resp = await fetch("https://api.stockx.com/v2/search", {
  method: "GET",
  headers: { "x-api-key": "your-key" },
});
const data = await resp.json();
```

### tauri-plugin-notification

**Rust:**

```rust
.plugin(tauri_plugin_notification::init())
```

**Frontend:**

```typescript
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

async function notify(title: string, body: string) {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }
  if (granted) {
    sendNotification({ title, body });
  }
}

notify("Restock Alert", "Nike Dunk Low Panda is back in stock!");
```

---

## 4. Error Handling

Rust `Result<T, String>` maps to frontend try/catch. For better errors, define a custom error type:

```rust
// src-tauri/src/error.rs
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl From<reqwest::Error> for CommandError {
    fn from(e: reqwest::Error) -> Self {
        CommandError {
            code: "NETWORK_ERROR".into(),
            message: e.to_string(),
        }
    }
}

// Use in commands:
#[tauri::command]
async fn fetch_prices(query: String) -> Result<Vec<PriceResult>, CommandError> {
    // reqwest errors auto-convert via From impl
    let resp = reqwest::get(&url).await?;
    // ...
}
```

**Frontend error handling:**

```typescript
try {
  const prices = await tauriInvoke<PriceResult[]>("fetch_prices", { query });
} catch (err) {
  // err is the serialized CommandError or a string
  const error = typeof err === "string" ? err : (err as any).message;
  console.error("Command failed:", error);
}
```

---

## 5. Dev Workflow

```bash
# Start both Next.js dev server + Tauri window
npx tauri dev

# What happens:
# 1. Runs `npm run dev` (Next.js on localhost:3000)
# 2. Compiles Rust backend (slow first time - 5-10 min)
# 3. Opens Tauri window pointing at localhost:3000
# 4. Frontend hot-reloads via Next.js HMR
# 5. Rust changes require restart (keep Rust layer thin)

# Production build
npx tauri build
# Output: src-tauri/target/release/bundle/
```

**Cargo.toml dependencies for all commands above:**

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-png"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-store = "2"
tauri-plugin-http = "2"
tauri-plugin-notification = "2"
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-process = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = { version = "0.21", features = ["native-tls"] }
futures-util = "0.3"
reqwest = { version = "0.12", features = ["json"] }
aes-gcm = "0.10"
hex = "0.4"
base64 = "0.22"
urlencoding = "2"
```

**NPM packages:**

```bash
npm install @tauri-apps/api @tauri-apps/plugin-sql @tauri-apps/plugin-store \
  @tauri-apps/plugin-http @tauri-apps/plugin-notification @tauri-apps/plugin-dialog \
  @tauri-apps/plugin-process @tauri-apps/plugin-updater @tauri-apps/plugin-fs
npm install -D @tauri-apps/cli
```

---

## 6. Capabilities (Permissions)

All plugins need explicit permissions in `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
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
    "http:default",
    "notification:default",
    "dialog:default",
    "process:default",
    "updater:default"
  ]
}
```

---

## 7. Tauri State Management

Share state across commands using `tauri::State`:

```rust
// Define state struct
pub struct AppState {
    pub cdp_connected: Mutex<bool>,
    pub cdp_ws_url: Mutex<Option<String>>,
}

// Register in lib.rs
tauri::Builder::default()
    .manage(AppState {
        cdp_connected: Mutex::new(false),
        cdp_ws_url: Mutex::new(None),
    })
    // ...

// Access in commands
#[tauri::command]
async fn my_command(state: State<'_, AppState>) -> Result<bool, String> {
    let connected = state.cdp_connected.lock().unwrap();
    Ok(*connected)
}
```

---

## 8. Emitting Events to Frontend

For real-time data (Discord messages, price updates), emit events from Rust:

```rust
use tauri::Emitter;

#[tauri::command]
async fn start_monitoring(app: tauri::AppHandle) -> Result<(), String> {
    // In a spawned task:
    tokio::spawn(async move {
        // When a message arrives:
        let _ = app.emit("discord-message", &discord_msg);
    });
    Ok(())
}
```

```typescript
// Frontend listener
import { listen } from "@tauri-apps/api/event";

const unlisten = await listen<DiscordMessage>("discord-message", (event) => {
  console.log("New message:", event.payload);
});

// Cleanup
unlisten();
```
