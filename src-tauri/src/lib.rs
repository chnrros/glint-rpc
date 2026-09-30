mod commands;
mod ipc;
mod presence;
mod state;
mod tray;

use state::AppState;
use tauri::Manager;

/// Glint's own Discord application, used until the user sets up an
/// application profile of their own (see the in-app guide).
pub(crate) const DEFAULT_APPLICATION_ID: &str = "1554406598556917832";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let app_handle = app.handle().clone();
            let app_state = AppState::spawn(app_handle.clone(), DEFAULT_APPLICATION_ID.to_string());
            app.manage(app_state);

            tray::setup(&app_handle)?;

            // Closing the window hides it to the tray instead of quitting,
            // unless the user turned that off in Settings (AppState::minimize_to_tray).
            if let Some(window) = app.get_webview_window("main") {
                let handle_for_event = app_handle.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let should_hide = handle_for_event
                            .try_state::<AppState>()
                            .map(|state| {
                                *state
                                    .minimize_to_tray
                                    .lock()
                                    .expect("minimize_to_tray mutex poisoned")
                            })
                            .unwrap_or(true);
                        if should_hide {
                            api.prevent_close();
                            if let Some(window) = handle_for_event.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_clients,
            commands::apply_activity,
            commands::clear_activity,
            commands::set_application_id,
            commands::sync_tray_presets,
            commands::set_minimize_to_tray_on_close,
            commands::sync_excluded_clients,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Clear the presence and stop every client's worker thread on
            // quit, so we never leave a stale activity showing after the
            // app exits.
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    state.shutdown_all();
                }
            }
        });
}
