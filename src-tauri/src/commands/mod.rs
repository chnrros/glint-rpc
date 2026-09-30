use tauri::{AppHandle, State};

use crate::presence::PresencePayload;
use crate::state::{AppState, ConnectionCommand, ConnectionStatus};
use crate::tray::{self, TrayPreset};

#[tauri::command]
pub fn get_connection_status(state: State<AppState>) -> ConnectionStatus {
    state.snapshot()
}

#[tauri::command]
pub fn apply_activity(state: State<AppState>, payload: PresencePayload) -> Result<(), String> {
    send_and_wait(&state, |reply| {
        ConnectionCommand::SetActivity(Box::new(payload), reply)
    })
}

#[tauri::command]
pub fn clear_activity(state: State<AppState>) -> Result<(), String> {
    send_and_wait(&state, ConnectionCommand::ClearActivity)
}

/// Switches which Discord Application ID the connection uses (an
/// Application Profile). Fire-and-forget: the resulting reconnect surfaces
/// through the usual `connection-status` event, same as the initial connect.
#[tauri::command]
pub fn set_application_id(state: State<AppState>, app_id: String) -> Result<(), String> {
    state
        .commands
        .send(ConnectionCommand::SetApplicationId(app_id))
        .map_err(|_| "connection worker is not running".to_string())
}

/// Replaces the tray's preset list and rebuilds its menu to match. Called
/// by the frontend whenever presets or profiles change: Rust has no other
/// way to know what presets exist.
#[tauri::command]
pub fn sync_tray_presets(app: AppHandle, state: State<AppState>, presets: Vec<TrayPreset>) {
    *state
        .tray_presets
        .lock()
        .expect("tray presets mutex poisoned") = presets.clone();
    tray::rebuild_menu(&app, &presets);
}

/// Sets whether closing the main window hides it to the tray instead of
/// quitting; read by the window's `CloseRequested` handler in `lib.rs`.
#[tauri::command]
pub fn set_minimize_to_tray_on_close(state: State<AppState>, enabled: bool) {
    *state
        .minimize_to_tray
        .lock()
        .expect("minimize_to_tray mutex poisoned") = enabled;
}

/// Sends a `ConnectionCommand` that carries a one-shot reply channel and
/// blocks for the worker thread's actual result, instead of firing into the
/// channel and assuming success.
fn send_and_wait(
    state: &State<AppState>,
    build: impl FnOnce(std::sync::mpsc::Sender<Result<(), String>>) -> ConnectionCommand,
) -> Result<(), String> {
    let (reply_tx, reply_rx) = std::sync::mpsc::channel();
    state
        .commands
        .send(build(reply_tx))
        .map_err(|_| "connection worker is not running".to_string())?;
    reply_rx
        .recv()
        .map_err(|_| "connection worker did not respond".to_string())?
}
