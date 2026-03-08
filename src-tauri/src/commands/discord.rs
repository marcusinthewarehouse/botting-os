use std::process::Command;
use std::sync::Arc;
use std::time::Duration;

use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;

use crate::discord::cdp;

const CDP_PORT: u16 = 9223;
const CDP_BASE: &str = "http://127.0.0.1:9223";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
#[allow(dead_code)]
pub struct CdpVersion {
    #[serde(rename = "Browser")]
    pub browser: String,
    #[serde(rename = "Protocol-Version")]
    pub protocol_version: String,
}

// ---------------------------------------------------------------------------
// Managed State
// ---------------------------------------------------------------------------

pub struct CdpState {
    pub ws_url: Arc<Mutex<Option<String>>>,
    pub capture_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl CdpState {
    pub fn new() -> Self {
        Self {
            ws_url: Arc::new(Mutex::new(None)),
            capture_handle: Arc::new(Mutex::new(None)),
        }
    }
}

// ---------------------------------------------------------------------------
// Platform helpers
// ---------------------------------------------------------------------------

#[cfg(target_os = "macos")]
fn is_discord_running() -> bool {
    Command::new("pgrep")
        .args(["-x", "Discord"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn is_discord_running() -> bool {
    Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq Discord.exe", "/NH"])
        .output()
        .map(|o| {
            let stdout = String::from_utf8_lossy(&o.stdout);
            stdout.contains("Discord.exe")
        })
        .unwrap_or(false)
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn is_discord_running() -> bool {
    Command::new("pgrep")
        .args(["-x", "Discord"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn is_discord_running_pub() -> bool {
    is_discord_running()
}

#[cfg(target_os = "macos")]
fn kill_discord() -> Result<(), String> {
    let _ = Command::new("pkill")
        .args(["-x", "Discord"])
        .status()
        .map_err(|e| format!("Failed to kill Discord: {}", e))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn kill_discord() -> Result<(), String> {
    let _ = Command::new("taskkill")
        .args(["/F", "/IM", "Discord.exe"])
        .status()
        .map_err(|e| format!("Failed to kill Discord: {}", e))?;
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn kill_discord() -> Result<(), String> {
    let _ = Command::new("pkill")
        .args(["-x", "Discord"])
        .status()
        .map_err(|e| format!("Failed to kill Discord: {}", e))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn find_discord_path() -> Option<String> {
    let path = "/Applications/Discord.app";
    if std::path::Path::new(path).exists() {
        Some(path.to_string())
    } else {
        None
    }
}

#[cfg(target_os = "windows")]
fn find_discord_path() -> Option<String> {
    let appdata = std::env::var("LOCALAPPDATA").ok()?;
    let path = format!("{}\\Discord\\Update.exe", appdata);
    if std::path::Path::new(&path).exists() {
        Some(path)
    } else {
        None
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn find_discord_path() -> Option<String> {
    let paths = ["/usr/bin/discord", "/usr/bin/Discord"];
    for p in paths {
        if std::path::Path::new(p).exists() {
            return Some(p.to_string());
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn launch_discord_with_cdp() -> Result<(), String> {
    Command::new("open")
        .args([
            "-a",
            "Discord",
            "--args",
            &format!("--remote-debugging-port={}", CDP_PORT),
        ])
        .spawn()
        .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn launch_discord_with_cdp() -> Result<(), String> {
    let path = find_discord_path().ok_or("Discord not found. Is it installed?")?;
    Command::new(&path)
        .args([
            "--processStart",
            "Discord.exe",
            "--process-start-args",
            &format!("--remote-debugging-port={}", CDP_PORT),
        ])
        .spawn()
        .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn launch_discord_with_cdp() -> Result<(), String> {
    let path = find_discord_path().ok_or("Discord not found. Is it installed?")?;
    Command::new(&path)
        .arg(format!("--remote-debugging-port={}", CDP_PORT))
        .spawn()
        .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn launch_discord_normal() -> Result<(), String> {
    Command::new("open")
        .args(["-a", "Discord"])
        .spawn()
        .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn launch_discord_normal() -> Result<(), String> {
    let path = find_discord_path().ok_or("Discord not found. Is it installed?")?;
    Command::new(&path)
        .args(["--processStart", "Discord.exe"])
        .spawn()
        .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn launch_discord_normal() -> Result<(), String> {
    let path = find_discord_path().ok_or("Discord not found. Is it installed?")?;
    Command::new(&path)
        .spawn()
        .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// CDP helpers
// ---------------------------------------------------------------------------

fn cdp_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap_or_default()
}

async fn check_cdp_version() -> Option<CdpVersion> {
    let url = format!("{}/json/version", CDP_BASE);
    cdp_client()
        .get(&url)
        .send()
        .await
        .ok()?
        .json::<CdpVersion>()
        .await
        .ok()
}

async fn find_discord_target() -> Result<CdpTarget, String> {
    let url = format!("{}/json/list", CDP_BASE);
    let targets: Vec<CdpTarget> = cdp_client()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("CDP not available: {}", e))?
        .json()
        .await
        .map_err(|e| format!("Bad CDP response: {}", e))?;

    targets
        .into_iter()
        .find(|t| {
            t.target_type == "page"
                && (t.url.contains("discord.com/app")
                    || t.url.contains("discord.com/channels")
                    || t.title.contains("Discord"))
        })
        .ok_or_else(|| "Discord main page not found in CDP targets".to_string())
}

async fn wait_for_cdp(timeout_secs: u64) -> Result<CdpVersion, String> {
    let max_attempts = timeout_secs;
    for _ in 0..max_attempts {
        if let Some(version) = check_cdp_version().await {
            return Ok(version);
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
    }
    Err(format!(
        "CDP did not respond within {} seconds",
        timeout_secs
    ))
}

// ---------------------------------------------------------------------------
// Tauri Commands - Process Management (Task 5.1)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn check_discord_status() -> Result<DiscordStatus, String> {
    let running = is_discord_running();

    if !running {
        return Ok(DiscordStatus {
            running: false,
            debug_mode: false,
            cdp_connected: false,
            ws_url: None,
        });
    }

    let version = check_cdp_version().await;
    let debug_mode = version.is_some();

    if !debug_mode {
        return Ok(DiscordStatus {
            running: true,
            debug_mode: false,
            cdp_connected: false,
            ws_url: None,
        });
    }

    match find_discord_target().await {
        Ok(target) => Ok(DiscordStatus {
            running: true,
            debug_mode: true,
            cdp_connected: true,
            ws_url: Some(target.ws_url),
        }),
        Err(_) => Ok(DiscordStatus {
            running: true,
            debug_mode: true,
            cdp_connected: false,
            ws_url: None,
        }),
    }
}

#[tauri::command]
pub async fn start_discord_cdp(
    state: State<'_, CdpState>,
) -> Result<DiscordStatus, String> {
    if find_discord_path().is_none() {
        return Err("Discord is not installed. Please install Discord and try again.".to_string());
    }

    let current = check_discord_status().await?;
    if current.cdp_connected && current.ws_url.is_some() {
        // Store the ws_url in state for capture commands
        let mut url_guard = state.ws_url.lock().await;
        *url_guard = current.ws_url.clone();
        return Ok(current);
    }

    if current.running {
        kill_discord()?;
        tokio::time::sleep(Duration::from_secs(2)).await;
    }

    launch_discord_with_cdp()?;
    wait_for_cdp(30).await?;
    tokio::time::sleep(Duration::from_secs(3)).await;

    let target = find_discord_target().await?;

    // Store ws_url in state
    let mut url_guard = state.ws_url.lock().await;
    *url_guard = Some(target.ws_url.clone());

    Ok(DiscordStatus {
        running: true,
        debug_mode: true,
        cdp_connected: true,
        ws_url: Some(target.ws_url),
    })
}

#[tauri::command]
pub async fn stop_discord_cdp(
    relaunch_normal: bool,
    state: State<'_, CdpState>,
) -> Result<(), String> {
    // Stop any active capture first
    let mut handle_guard = state.capture_handle.lock().await;
    if let Some(handle) = handle_guard.take() {
        handle.abort();
    }
    drop(handle_guard);

    // Clear ws_url
    let mut url_guard = state.ws_url.lock().await;
    *url_guard = None;
    drop(url_guard);

    if !is_discord_running() {
        return Ok(());
    }

    kill_discord()?;
    tokio::time::sleep(Duration::from_secs(2)).await;

    if relaunch_normal {
        launch_discord_normal()?;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Tauri Commands - CDP Capture (Task 5.2)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn start_cdp_capture(
    channel_ids: Vec<String>,
    app: tauri::AppHandle,
    state: State<'_, CdpState>,
) -> Result<(), String> {
    // Check if capture is already running
    let mut handle_guard = state.capture_handle.lock().await;
    if handle_guard.is_some() {
        return Err("Capture is already running. Stop it first.".to_string());
    }

    // Get ws_url
    let url_guard = state.ws_url.lock().await;
    let ws_url = url_guard
        .clone()
        .ok_or("No CDP WebSocket URL. Run start_discord_cdp first.")?;
    drop(url_guard);

    // If channel_ids were specified, update the filter before starting capture
    // The capture loop will inject the hook which initializes __bottingos_channels as empty Set
    // We need to update channels after hook injection, so we pass them via a side channel
    let ws_url_for_channels = ws_url.clone();
    let channel_ids_clone = channel_ids.clone();

    // Spawn capture loop
    let handle = tokio::spawn(async move {
        // Run the main capture loop (with auto-reconnect)
        cdp::capture_loop(ws_url, app).await;
    });

    *handle_guard = Some(handle);
    drop(handle_guard);

    // If channels were specified, update them after a brief delay for hook injection
    if !channel_ids_clone.is_empty() {
        let ws_url_ch = ws_url_for_channels;
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_secs(2)).await;
            let _ = cdp::update_channels_cdp(&ws_url_ch, &channel_ids_clone).await;
        });
    }

    Ok(())
}

#[tauri::command]
pub async fn stop_cdp_capture(
    state: State<'_, CdpState>,
) -> Result<(), String> {
    let mut handle_guard = state.capture_handle.lock().await;
    if let Some(handle) = handle_guard.take() {
        handle.abort();
        log::info!("CDP capture stopped");
    }
    Ok(())
}

#[tauri::command]
pub async fn update_monitored_channels(
    channel_ids: Vec<String>,
    state: State<'_, CdpState>,
) -> Result<(), String> {
    let url_guard = state.ws_url.lock().await;
    let ws_url = url_guard
        .clone()
        .ok_or("No CDP WebSocket URL available.")?;
    drop(url_guard);

    cdp::update_channels_cdp(&ws_url, &channel_ids).await
}
