use std::process::Command;
use std::time::Duration;

use reqwest::Client;
use serde::{Deserialize, Serialize};

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
    // Linux: check common paths
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
    let path = find_discord_path()
        .ok_or("Discord not found. Is it installed?")?;

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
    let path = find_discord_path()
        .ok_or("Discord not found. Is it installed?")?;

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
    let path = find_discord_path()
        .ok_or("Discord not found. Is it installed?")?;

    Command::new(&path)
        .args(["--processStart", "Discord.exe"])
        .spawn()
        .map_err(|e| format!("Failed to launch Discord: {}", e))?;
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn launch_discord_normal() -> Result<(), String> {
    let path = find_discord_path()
        .ok_or("Discord not found. Is it installed?")?;

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
// Tauri Commands
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

    // Check if CDP port is responsive
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

    // Try to find Discord page target
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
pub async fn start_discord_cdp() -> Result<DiscordStatus, String> {
    // Check if Discord is installed
    if find_discord_path().is_none() {
        return Err("Discord is not installed. Please install Discord and try again.".to_string());
    }

    // Check current status - if already connected, return early
    let current = check_discord_status().await?;
    if current.cdp_connected && current.ws_url.is_some() {
        return Ok(current);
    }

    // Kill existing Discord process
    if current.running {
        kill_discord()?;
        tokio::time::sleep(Duration::from_secs(2)).await;
    }

    // Launch with CDP flag
    launch_discord_with_cdp()?;

    // Wait for CDP to become responsive (up to 30 seconds)
    wait_for_cdp(30).await?;

    // Give Discord a moment to fully load the app page
    tokio::time::sleep(Duration::from_secs(3)).await;

    // Find Discord target
    let target = find_discord_target().await?;

    Ok(DiscordStatus {
        running: true,
        debug_mode: true,
        cdp_connected: true,
        ws_url: Some(target.ws_url),
    })
}

#[tauri::command]
pub async fn stop_discord_cdp(relaunch_normal: bool) -> Result<(), String> {
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
