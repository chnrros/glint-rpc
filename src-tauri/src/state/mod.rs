//! Owns the Discord connection on a dedicated background thread.
//!
//! `discord-rich-presence`'s client is blocking and not `Sync`, so it can't
//! sit behind a plain `Mutex` shared with async command handlers without
//! risking a command blocking the whole app on a stalled socket read. Instead
//! the connection lives entirely on one thread; commands talk to it over a
//! channel and read status from a `Mutex<ConnectionStatus>` the thread keeps
//! updated.
//!
//! Each command carries a one-shot reply channel so the calling Tauri
//! command can return Discord's actual `Result` to the frontend, instead of
//! firing into the channel and assuming success: errors surfaced only in
//! the dev-mode log were easy to miss, including the party-size rejection
//! this was built to catch.
//!
//! `SetActivity` is also rate-limited here (see `MIN_SEND_INTERVAL`):
//! Discord allows roughly 5 presence updates per 20 seconds, and a burst of
//! several updates in quick succession (several concurrent frontend calls
//! in flight at once, with nothing serializing them) silently gets
//! throttled by Discord, leaving the profile showing stale data with no
//! error surfaced anywhere. Rather than trust every caller to self-limit,
//! the worker coalesces: at most one send per `MIN_SEND_INTERVAL`, and if
//! more `SetActivity` commands arrive before the cooldown clears, only the
//! latest one is actually sent: earlier superseded ones resolve `Ok(())`
//! immediately rather than blocking their caller.

use std::sync::mpsc::{Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::ipc::{DiscordConnection, IpcError};
use crate::presence::PresencePayload;

/// How long to block waiting for a command when idle and connected.
/// Unrelated to reconnect timing, just how often the loop wakes up.
const RETRY_INTERVAL: Duration = Duration::from_secs(5);
/// Discord's own limit is ~5 updates per 20s (one per 4s); this adds a
/// safety margin rather than riding the exact edge.
const MIN_SEND_INTERVAL: Duration = Duration::from_millis(4_500);
/// Reconnect backoff: starts here after a failed attempt...
const RECONNECT_BACKOFF_BASE: Duration = Duration::from_secs(5);
/// ...doubles on each further failure, capped here, and resets to base as
/// soon as a connection succeeds. Keeps retries from hammering a Discord
/// that's genuinely not running, without ever giving up.
const RECONNECT_BACKOFF_MAX: Duration = Duration::from_secs(30);

pub type Reply = Sender<Result<(), String>>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected { username: Option<String> },
}

pub enum ConnectionCommand {
    SetActivity(Box<PresencePayload>, Reply),
    ClearActivity(Reply),
    /// Switches to a different Discord Application ID (an Application
    /// Profile) by dropping the current connection and reconnecting with
    /// the new one. Fire-and-forget: the resulting Connecting/Connected
    /// transition surfaces through the usual `connection-status` event.
    SetApplicationId(String),
    Shutdown,
}

pub struct AppState {
    pub status: Arc<Mutex<ConnectionStatus>>,
    pub commands: Sender<ConnectionCommand>,
    /// Presets the frontend has synced for the tray menu. Rust has no
    /// other knowledge of them. See `tray::rebuild_menu`.
    pub tray_presets: Arc<Mutex<Vec<crate::tray::TrayPreset>>>,
    /// Whether closing the main window should hide it to the tray instead
    /// of quitting. Defaults to true, matching "closing the window hides
    /// it to the tray"; the Settings toggle can turn it off.
    pub minimize_to_tray: Arc<Mutex<bool>>,
}

impl AppState {
    pub fn spawn(app_handle: AppHandle, app_id: String) -> Self {
        let status = Arc::new(Mutex::new(ConnectionStatus::Disconnected));
        let (tx, rx) = std::sync::mpsc::channel();

        let worker_status = status.clone();
        std::thread::spawn(move || run_worker(app_handle, app_id, worker_status, rx));

        Self {
            status,
            commands: tx,
            tray_presets: Arc::new(Mutex::new(Vec::new())),
            minimize_to_tray: Arc::new(Mutex::new(true)),
        }
    }

    pub fn snapshot(&self) -> ConnectionStatus {
        self.status
            .lock()
            .expect("connection status mutex poisoned")
            .clone()
    }
}

/// A `Send`/`Rejected` error means Discord (or the socket) rejected this
/// specific call; the connection itself is still alive. Any other error
/// means the socket is presumed dead and we should reconnect.
fn is_connection_fatal(err: &IpcError) -> bool {
    !matches!(err, IpcError::Rejected(_))
}

/// A `SetActivity` waiting out the rate-limit cooldown before it's sent.
type Pending = (Box<PresencePayload>, Reply);

fn run_worker(
    app_handle: AppHandle,
    mut app_id: String,
    status: Arc<Mutex<ConnectionStatus>>,
    commands: Receiver<ConnectionCommand>,
) {
    let mut connection: Option<DiscordConnection> = None;
    let mut last_sent_at: Option<Instant> = None;
    let mut pending: Option<Pending> = None;
    let mut last_activity: Option<PresencePayload> = None;
    let mut reconnect_backoff = RECONNECT_BACKOFF_BASE;

    loop {
        if connection.is_none() {
            set_status(&app_handle, &status, ConnectionStatus::Connecting);

            let mut candidate = DiscordConnection::new(&app_id);
            match candidate.connect() {
                Ok(handshake) => {
                    set_status(
                        &app_handle,
                        &status,
                        ConnectionStatus::Connected {
                            username: handshake.username,
                        },
                    );
                    connection = Some(candidate);
                    reconnect_backoff = RECONNECT_BACKOFF_BASE;
                }
                Err(_) => {
                    set_status(&app_handle, &status, ConnectionStatus::Disconnected);
                    if let Ok(ConnectionCommand::Shutdown) =
                        commands.recv_timeout(reconnect_backoff)
                    {
                        return;
                    }
                    reconnect_backoff = (reconnect_backoff * 2).min(RECONNECT_BACKOFF_MAX);
                    continue;
                }
            }
        }

        let wait = next_wait(&pending, last_sent_at);

        match commands.recv_timeout(wait) {
            Ok(ConnectionCommand::SetActivity(payload, reply)) => {
                if let Some((_, superseded_reply)) = pending.replace((payload, reply)) {
                    let _ = superseded_reply.send(Ok(()));
                }
                flush_if_due(
                    &app_handle,
                    &status,
                    &mut connection,
                    &mut pending,
                    &mut last_sent_at,
                    &mut last_activity,
                );
            }
            Ok(ConnectionCommand::ClearActivity(reply)) => {
                if let Some((_, superseded_reply)) = pending.take() {
                    let _ = superseded_reply.send(Ok(()));
                }
                let result = match connection.as_mut() {
                    Some(conn) => conn.clear_activity(),
                    None => Err(IpcError::NotRunning),
                };
                last_sent_at = Some(Instant::now());
                last_activity = None;
                handle_result(&app_handle, &status, &mut connection, result, reply);
            }
            Ok(ConnectionCommand::SetApplicationId(new_id)) => {
                if new_id != app_id {
                    if let Some((_, superseded_reply)) = pending.take() {
                        let _ = superseded_reply.send(Ok(()));
                    }
                    app_id = new_id;
                    if let Some(mut conn) = connection.take() {
                        conn.close();
                    }
                    set_status(&app_handle, &status, ConnectionStatus::Connecting);
                }
            }
            Ok(ConnectionCommand::Shutdown) => {
                if let Some(mut conn) = connection.take() {
                    let _ = conn.clear_activity();
                    conn.close();
                }
                return;
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                flush_if_due(
                    &app_handle,
                    &status,
                    &mut connection,
                    &mut pending,
                    &mut last_sent_at,
                    &mut last_activity,
                );
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => return,
        }
    }
}

/// How long to block on the next `recv_timeout`: however long remains on
/// the rate-limit cooldown if something's pending, or the usual reconnect
/// poll interval if nothing is.
fn next_wait(pending: &Option<Pending>, last_sent_at: Option<Instant>) -> Duration {
    if pending.is_none() {
        return RETRY_INTERVAL;
    }
    match last_sent_at {
        Some(last) => MIN_SEND_INTERVAL.saturating_sub(last.elapsed()),
        None => Duration::ZERO,
    }
}

fn flush_if_due(
    app_handle: &AppHandle,
    status: &Arc<Mutex<ConnectionStatus>>,
    connection: &mut Option<DiscordConnection>,
    pending: &mut Option<Pending>,
    last_sent_at: &mut Option<Instant>,
    last_activity: &mut Option<PresencePayload>,
) {
    let cooldown_elapsed = last_sent_at.is_none_or(|last| last.elapsed() >= MIN_SEND_INTERVAL);
    if !cooldown_elapsed || connection.is_none() {
        return;
    }
    let Some((payload, reply)) = pending.take() else {
        return;
    };

    // Nothing changed since the last successful send, e.g. a few extra
    // Update clicks with no edits in between. Skipping saves rate-limit
    // budget for updates that actually differ, and keeps the debug log
    // from filling with identical payloads.
    if last_activity.as_ref() == Some(payload.as_ref()) {
        #[cfg(debug_assertions)]
        eprintln!(
            "[glint {}] skipping SetActivity: identical to last send",
            crate::ipc::log_ts()
        );
        let _ = reply.send(Ok(()));
        return;
    }

    let result = match connection.as_mut() {
        Some(conn) => conn.set_activity(payload.to_activity()),
        None => Err(IpcError::NotRunning),
    };
    *last_sent_at = Some(Instant::now());
    if result.is_ok() {
        *last_activity = Some(*payload.clone());
    }
    handle_result(app_handle, status, connection, result, reply);
}

fn handle_result(
    app_handle: &AppHandle,
    status: &Arc<Mutex<ConnectionStatus>>,
    connection: &mut Option<DiscordConnection>,
    result: Result<(), IpcError>,
    reply: Reply,
) {
    if let Err(err) = &result {
        if is_connection_fatal(err) {
            *connection = None;
            set_status(app_handle, status, ConnectionStatus::Disconnected);
        }
    }
    let _ = reply.send(result.map_err(|e| e.to_string()));
}

fn set_status(
    app_handle: &AppHandle,
    status: &Arc<Mutex<ConnectionStatus>>,
    new_status: ConnectionStatus,
) {
    *status.lock().expect("connection status mutex poisoned") = new_status.clone();
    let _ = app_handle.emit("connection-status", new_status);
}
