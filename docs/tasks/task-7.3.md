# Task 7.3: System Tray & Background Processing

## Objective

Add a system tray icon with a context menu (Show/Hide, Discord Status, Quit), make the close button minimize to tray instead of quitting, and ensure background processing (webhooks, CDP capture, price alerts) continues when the window is hidden.

## Context

Botters keep BottingOS running all day - it needs to sit quietly in the system tray while monitoring Discord, listening for webhooks, and checking price alerts. Closing the window should minimize to tray, not quit the app. The tray icon provides quick access to show the window or check Discord status. Background tasks must continue uninterrupted.

## Dependencies

- Tauri v2 tray icon API
- Task 5.1/5.2: Discord CDP (for tray status indicator)
- tauri-plugin-notification (for background alerts)

## Blocked By

- Nothing (can be built independently, integrates with existing features)

## Research Findings

### Tauri v2 Tray API

Tauri v2 uses the `tray-icon` feature. Enable in Cargo.toml:

```toml
tauri = { version = "2", features = ["tray-icon", "image-png"] }
```

### Tray Implementation Pattern

```rust
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    menu::{Menu, MenuItem, PredefinedMenuItem},
    Manager,
};

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show BottingOS", true, None::<&str>)?;
    let discord_status = MenuItem::with_id(app, "discord", "Discord: Disconnected", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &discord_status, &separator, &quit])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .menu_on_left_click(false)
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
        })
        .build(app)?;

    Ok(())
}
```

### Close-to-Tray Pattern

Intercept the window close event to hide instead of quit:

```rust
// In setup or lib.rs
let window = app.get_webview_window("main").unwrap();
window.on_window_event(move |event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        // Hide the window instead
        if let Some(w) = app_handle.get_webview_window("main") {
            w.hide().unwrap();
        }
    }
});
```

### Tray Icon

- Use the app icon (already at `src-tauri/icons/`)
- macOS: tray icon should be template image (monochrome) for menu bar
- Create a 22x22 or 32x32 version of the logo for tray

### Background Processing

Background tasks are already running in Rust (tokio spawned tasks):

- Discord CDP capture (Task 5.2) runs in a spawned tokio task
- Webhook listener runs independently
- These continue regardless of window visibility

Reminder checks (Task 6.2) run via `setInterval` in the frontend. When the window is hidden, the WebView may throttle timers. Two options:

1. Move reminder checking to Rust backend (preferred)
2. Accept slightly delayed reminders when window is hidden

### Dynamic Tray Menu Updates

Update Discord status in tray:

```rust
#[tauri::command]
pub async fn update_tray_discord_status(
    app: tauri::AppHandle,
    connected: bool,
) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        // Rebuild menu with updated status text
        let status_text = if connected { "Discord: Connected" } else { "Discord: Disconnected" };
        // Update menu item...
    }
    Ok(())
}
```

## Implementation Plan

### Step 1: Create Tray Module

`src-tauri/src/tray.rs`:

Functions:

- `pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>>`
- Menu items: Show/Hide BottingOS, Discord Status (dynamic text), separator, Quit
- Left-click tray icon: show window
- Right-click: show menu

### Step 2: Implement Close-to-Tray

In `src-tauri/src/lib.rs`, in the setup closure:

```rust
.setup(|app| {
    tray::setup_tray(app)?;

    let app_handle = app.handle().clone();
    let window = app.get_webview_window("main").unwrap();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            if let Some(w) = app_handle.get_webview_window("main") {
                let _ = w.hide();
            }
        }
    });

    Ok(())
})
```

### Step 3: Update Show/Hide Menu Item Dynamically

When window is shown, menu should say "Hide BottingOS". When hidden, "Show BottingOS".

### Step 4: Discord Status in Tray

When Discord CDP connects/disconnects (from Task 5.1/5.2), update the tray menu item:

- Connected: "Discord: Connected" (with green indicator if supported)
- Disconnected: "Discord: Disconnected"

### Step 5: Background Task Continuity

Verify that when the window is hidden:

- Discord CDP capture continues emitting events
- Events queue and are available when window is shown again
- Webhook listener continues operating
- Notifications still fire via tauri-plugin-notification

### Step 6: Update Capabilities

Add required permissions to `src-tauri/capabilities/default.json`:

```json
"core:window:allow-show",
"core:window:allow-hide",
"core:window:allow-set-focus",
"core:tray:default"
```

### Step 7: Tray Icon Asset

- Create a tray-specific icon (22x22 or 32x32)
- For macOS: template image (monochrome, transparent background)
- Place in `src-tauri/icons/tray-icon.png`

## Files to Create

- `src-tauri/src/tray.rs` - Tray icon setup, menu, event handlers
- `src-tauri/icons/tray-icon.png` - Tray icon asset (template image for macOS)

## Files to Modify

- `src-tauri/src/lib.rs` - Add `mod tray;`, call `tray::setup_tray(app)` in setup, add close-to-tray handler
- `src-tauri/Cargo.toml` - Ensure `tray-icon` and `image-png` features enabled
- `src-tauri/capabilities/default.json` - Add tray and window permissions

## Contracts

### Provides

- System tray icon with context menu
- Close-to-tray behavior (close button hides, doesn't quit)
- Show/Hide window from tray
- Discord status indicator in tray menu
- Quit option in tray menu
- Background task continuity when window is hidden

### Consumes

- Task 5.1/5.2: Discord connection status
- Tauri v2 tray-icon API
- App icon assets

## Acceptance Criteria

- [ ] System tray icon appears when app launches
- [ ] Left-click tray icon shows/focuses the window
- [ ] Right-click shows context menu
- [ ] Menu shows "Show/Hide BottingOS" that toggles window visibility
- [ ] Menu shows Discord connection status
- [ ] Menu has "Quit" option that fully exits the app
- [ ] Clicking window close button hides to tray (does not quit)
- [ ] App icon visible in system tray (macOS menu bar / Windows taskbar)
- [ ] Discord CDP capture continues when window is hidden
- [ ] Notifications still fire when window is hidden
- [ ] Showing window restores it to previous position
- [ ] Tray icon works on macOS (template image)
- [ ] No duplicate tray icons on app restart

## Testing Protocol

### Manual Tests

1. Launch app - verify tray icon appears
2. Right-click tray - verify menu with all items
3. Click "Hide BottingOS" - verify window hides
4. Click "Show BottingOS" - verify window shows
5. Left-click tray icon - verify window shows
6. Click window close button (X) - verify minimizes to tray, not quit
7. Click "Quit" in tray menu - verify app fully exits
8. Connect Discord, verify tray shows "Discord: Connected"
9. While hidden: send Discord message, verify it's captured when window shown
10. While hidden: trigger notification, verify OS notification fires

### Build Checks

- `cargo build` succeeds
- `cargo clippy` passes
- Tray icon renders correctly on macOS

## Skills to Read

- `.claude/skills/tauri-commands/SKILL.md`

## Research Files to Read

- `.claude/orchestration-bottingos/research/desktop-app-architecture.md`

## Git

- Branch: `feat/7.3-system-tray`
- Commit prefix: `Task 7.3:`
