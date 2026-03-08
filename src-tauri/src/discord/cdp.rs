use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use tauri::Emitter;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

use super::types::{
    CdpCommand, CdpResponse, DiscordMessage, DiscordStatusEvent, FLUX_HOOK_SCRIPT, MSG_PREFIX,
};

static CMD_ID: AtomicU64 = AtomicU64::new(1);

fn next_id() -> u64 {
    CMD_ID.fetch_add(1, Ordering::Relaxed)
}

fn make_cmd(method: &str, params: serde_json::Value) -> String {
    let cmd = CdpCommand {
        id: next_id(),
        method: method.to_string(),
        params,
    };
    serde_json::to_string(&cmd).unwrap_or_default()
}

fn emit_status(app: &tauri::AppHandle, connected: bool, message: &str) {
    let _ = app.emit(
        "discord-status",
        DiscordStatusEvent {
            connected,
            message: message.to_string(),
        },
    );
}

async fn run_capture_session(
    ws_url: &str,
    app: &tauri::AppHandle,
) -> Result<(), String> {
    let (ws_stream, _) = connect_async(ws_url)
        .await
        .map_err(|e| format!("WebSocket connect failed: {}", e))?;

    let (mut writer, mut reader) = ws_stream.split();

    emit_status(app, true, "Connected to Discord CDP");

    // Enable Runtime events to capture console output
    writer
        .send(Message::Text(make_cmd(
            "Runtime.enable",
            serde_json::json!({}),
        )))
        .await
        .map_err(|e| format!("Failed to send Runtime.enable: {}", e))?;

    // Wait briefly for Runtime.enable to be acknowledged
    tokio::time::sleep(Duration::from_millis(500)).await;

    // Inject the FluxDispatcher hook
    writer
        .send(Message::Text(make_cmd(
            "Runtime.evaluate",
            serde_json::json!({
                "expression": FLUX_HOOK_SCRIPT,
                "returnByValue": true,
            }),
        )))
        .await
        .map_err(|e| format!("Failed to inject hook: {}", e))?;

    log::info!("CDP hook injected, listening for messages");

    // Read loop - process incoming CDP events
    while let Some(msg_result) = reader.next().await {
        let msg = match msg_result {
            Ok(m) => m,
            Err(e) => {
                log::warn!("WebSocket read error: {}", e);
                break;
            }
        };

        let text = match msg {
            Message::Text(t) => t,
            Message::Close(_) => {
                log::info!("WebSocket closed by server");
                break;
            }
            _ => continue,
        };

        let response: CdpResponse = match serde_json::from_str(&text) {
            Ok(r) => r,
            Err(_) => continue,
        };

        // We only care about Runtime.consoleAPICalled events
        if response.method.as_deref() != Some("Runtime.consoleAPICalled") {
            continue;
        }

        let params = match response.params {
            Some(p) => p,
            None => continue,
        };

        // Extract console log arguments
        let args = match params.get("args").and_then(|a| a.as_array()) {
            Some(a) => a,
            None => continue,
        };

        // Look for our prefixed message in the first argument
        let value_str = match args.first().and_then(|a| a.get("value")).and_then(|v| v.as_str()) {
            Some(s) => s,
            None => continue,
        };

        if !value_str.starts_with(MSG_PREFIX) {
            continue;
        }

        let json_part = &value_str[MSG_PREFIX.len()..];

        match serde_json::from_str::<DiscordMessage>(json_part) {
            Ok(discord_msg) => {
                let _ = app.emit("discord-message", &discord_msg);
            }
            Err(e) => {
                log::warn!("Failed to parse Discord message: {}", e);
            }
        }
    }

    emit_status(app, false, "Disconnected from Discord CDP");
    Err("WebSocket disconnected".to_string())
}

pub async fn capture_loop(ws_url: String, app: tauri::AppHandle) {
    let mut backoff_secs: u64 = 2;
    let max_backoff: u64 = 60;

    loop {
        log::info!("Starting CDP capture session");

        match run_capture_session(&ws_url, &app).await {
            Ok(()) => {
                // Clean exit - stop the loop
                break;
            }
            Err(e) => {
                log::warn!("CDP session ended: {}. Reconnecting in {}s", e, backoff_secs);
                emit_status(
                    &app,
                    false,
                    &format!("Reconnecting in {}s", backoff_secs),
                );

                tokio::time::sleep(Duration::from_secs(backoff_secs)).await;

                if !crate::commands::discord::is_discord_running_pub() {
                    emit_status(&app, false, "Discord is no longer running");
                    break;
                }

                backoff_secs = (backoff_secs * 2).min(max_backoff);
            }
        }
    }
}

pub async fn get_channels_cdp(ws_url: &str) -> Result<serde_json::Value, String> {
    let (ws_stream, _) = connect_async(ws_url)
        .await
        .map_err(|e| format!("WebSocket connect failed: {}", e))?;

    let (mut writer, mut reader) = ws_stream.split();

    let script = r#"(function() {
        let wpRequire;
        webpackChunkdiscord_app.push([[Symbol()], {}, (r) => { wpRequire = r; }]);
        webpackChunkdiscord_app.pop();

        const stores = Object.values(wpRequire.c)
            .map(m => m?.exports).filter(Boolean)
            .flatMap(e => [e, e.default, e.Z, e.ZP].filter(Boolean));

        const GuildStore = stores.find(m => m?.getGuilds && m?.getGuild);
        const ChannelStore = stores.find(m => m?.getChannel && m?.getMutableGuildChannelsForGuild);

        if (!GuildStore || !ChannelStore) return JSON.stringify([]);

        const guilds = Object.values(GuildStore.getGuilds());
        const channels = guilds.flatMap(g => {
            const guildChannels = ChannelStore.getMutableGuildChannelsForGuild(g.id);
            return Object.values(guildChannels)
                .filter(c => c.type === 0)
                .map(c => ({ id: c.id, name: c.name, guild_id: g.id, guild_name: g.name }));
        });
        return JSON.stringify(channels);
    })()"#;

    let cmd_id = next_id();
    let cmd = CdpCommand {
        id: cmd_id,
        method: "Runtime.evaluate".to_string(),
        params: serde_json::json!({
            "expression": script,
            "returnByValue": true,
        }),
    };

    writer
        .send(Message::Text(serde_json::to_string(&cmd).unwrap_or_default()))
        .await
        .map_err(|e| format!("Failed to send channel query: {}", e))?;

    let timeout = tokio::time::timeout(Duration::from_secs(10), async {
        while let Some(msg_result) = reader.next().await {
            let msg = msg_result.map_err(|e| format!("WS read error: {}", e))?;
            let text = match msg {
                Message::Text(t) => t,
                _ => continue,
            };

            let response: CdpResponse = match serde_json::from_str(&text) {
                Ok(r) => r,
                Err(_) => continue,
            };

            if response.id == Some(cmd_id) {
                let value_str = response
                    .result
                    .as_ref()
                    .and_then(|r| r.get("result"))
                    .and_then(|r| r.get("value"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("[]");

                let parsed: serde_json::Value =
                    serde_json::from_str(value_str).unwrap_or(serde_json::json!([]));
                return Ok(parsed);
            }
        }
        Err("WebSocket closed before response".to_string())
    });

    timeout
        .await
        .map_err(|_| "Channel query timed out after 10s".to_string())?
}

pub async fn update_channels_cdp(ws_url: &str, channel_ids: &[String]) -> Result<(), String> {
    let (ws_stream, _) = connect_async(ws_url)
        .await
        .map_err(|e| format!("WebSocket connect failed: {}", e))?;

    let (mut writer, _reader) = ws_stream.split();

    let channels_json = serde_json::to_string(channel_ids).unwrap_or_else(|_| "[]".to_string());
    let script = format!(
        "window.__bottingos_channels = new Set({}); 'channels_updated'",
        channels_json
    );

    writer
        .send(Message::Text(make_cmd(
            "Runtime.evaluate",
            serde_json::json!({
                "expression": script,
                "returnByValue": true,
            }),
        )))
        .await
        .map_err(|e| format!("Failed to update channels: {}", e))?;

    Ok(())
}
