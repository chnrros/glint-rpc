use tauri::{AppHandle, State};

use crate::ipc::ClientId;
use crate::presence::PresencePayload;
use crate::state::{AppState, ClientStatus, ConnectionCommand};
use crate::tray::{self, TrayPreset};

#[tauri::command]
pub fn get_clients(state: State<AppState>) -> Vec<ClientStatus> {
    state.snapshot()
}

#[tauri::command]
pub fn apply_activity(
    state: State<AppState>,
    client_id: ClientId,
    payload: PresencePayload,
) -> Result<(), String> {
    send_and_wait(&state, client_id, |reply| {
        ConnectionCommand::SetActivity(Box::new(payload), reply)
    })
}

#[tauri::command]
pub fn clear_activity(state: State<AppState>, client_id: ClientId) -> Result<(), String> {
    send_and_wait(&state, client_id, ConnectionCommand::ClearActivity)
}

/// Switches which Discord Application ID one client's connection uses (an
/// Application Profile). Fire-and-forget: the resulting reconnect surfaces
/// through the usual `connection-status` event, same as the initial connect.
#[tauri::command]
pub fn set_application_id(
    state: State<AppState>,
    client_id: ClientId,
    app_id: String,
) -> Result<(), String> {
    state
        .command_sender(client_id)
        .ok_or_else(|| "client is not connected".to_string())?
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

/// Sends a `ConnectionCommand` to one client's worker, carrying a one-shot
/// reply channel, and blocks for its actual result, instead of firing into
/// the channel and assuming success.
fn send_and_wait(
    state: &State<AppState>,
    client_id: ClientId,
    build: impl FnOnce(std::sync::mpsc::Sender<Result<(), String>>) -> ConnectionCommand,
) -> Result<(), String> {
    let commands = state
        .command_sender(client_id)
        .ok_or_else(|| "client is not connected".to_string())?;
    let (reply_tx, reply_rx) = std::sync::mpsc::channel();
    commands
        .send(build(reply_tx))
        .map_err(|_| "connection worker is not running".to_string())?;
    reply_rx
        .recv()
        .map_err(|_| "connection worker did not respond".to_string())?
}
