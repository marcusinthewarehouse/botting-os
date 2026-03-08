mod commands;
mod discord;

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
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
