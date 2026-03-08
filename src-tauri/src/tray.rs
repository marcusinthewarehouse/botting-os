use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

pub struct TrayState {
    pub show_hide_item: Mutex<Option<MenuItem<tauri::Wry>>>,
    pub discord_item: Mutex<Option<MenuItem<tauri::Wry>>>,
}

impl TrayState {
    pub fn new() -> Self {
        Self {
            show_hide_item: Mutex::new(None),
            discord_item: Mutex::new(None),
        }
    }
}

pub fn setup(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show_hide = MenuItem::with_id(app, "show_hide", "Hide BottingOS", true, None::<&str>)?;
    let discord_status =
        MenuItem::with_id(app, "discord_status", "Discord: Disconnected", false, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit BottingOS", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_hide, &discord_status, &separator, &quit])?;

    // Store references for later updates
    let state = app.state::<TrayState>();
    *state.show_hide_item.lock().unwrap() = Some(show_hide.clone());
    *state.discord_item.lock().unwrap() = Some(discord_status.clone());

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("BottingOS")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                        set_show_hide_label(app, false);
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                        set_show_hide_label(app, true);
                    }
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
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
                    let _ = window.show();
                    let _ = window.set_focus();
                    set_show_hide_label(app, true);
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn set_show_hide_label(app: &tauri::AppHandle, visible: bool) {
    let label = if visible {
        "Hide BottingOS"
    } else {
        "Show BottingOS"
    };
    let state = app.state::<TrayState>();
    let guard = state.show_hide_item.lock().unwrap();
    if let Some(item) = guard.as_ref() {
        let _ = item.set_text(label);
    }
}

#[tauri::command]
pub async fn update_tray_discord_status(
    app: tauri::AppHandle,
    connected: bool,
) -> Result<(), String> {
    let state = app.state::<TrayState>();
    if let Some(item) = state.discord_item.lock().unwrap().as_ref() {
        let label = if connected {
            "Discord: Connected"
        } else {
            "Discord: Disconnected"
        };
        item.set_text(label).map_err(|e| e.to_string())?;
    }
    Ok(())
}
