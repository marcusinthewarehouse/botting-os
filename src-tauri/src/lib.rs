mod commands;
mod discord;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::new().build())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
    .manage(commands::pricing::PricingState::new())
    .manage(commands::discord::CdpState::new())
    .manage(tray::TrayState::new())
    .invoke_handler(tauri::generate_handler![
      commands::pricing::search_products,
      commands::pricing::get_product_prices,
      commands::pricing::search_ebay,
      commands::discord::check_discord_status,
      commands::discord::start_discord_cdp,
      commands::discord::stop_discord_cdp,
      commands::discord::start_cdp_capture,
      commands::discord::stop_cdp_capture,
      commands::discord::update_monitored_channels,
      commands::discord::get_discord_channels,
      tray::update_tray_discord_status,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

      // System tray
      #[cfg(desktop)]
      tray::setup(app)?;

      // Close-to-tray: hide window instead of quitting
      #[cfg(desktop)]
      {
        let app_handle = app.handle().clone();
        if let Some(window) = app.get_webview_window("main") {
          window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
              api.prevent_close();
              if let Some(w) = app_handle.get_webview_window("main") {
                let _ = w.hide();
              }
              tray::set_show_hide_label(&app_handle, false);
            }
          });
        }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
