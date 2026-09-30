//! Thin wrapper around `discord-rich-presence`'s IPC client.
//!
//! Handshake capture is done manually (instead of via `DiscordIpc::connect`)
//! because the crate's own handshake helper reads and discards the READY
//! response, which is the only place Discord returns the connected username.
//!
//! Every SET_ACTIVITY-shaped send (`set_activity`, `clear_activity`) goes
//! through one path that builds its own envelope with a nonce we generate
//! and control, then reads frames until one with that nonce comes back.
//! Two real bugs made that necessary:
//!
//! - The crate's own `DiscordIpc::set_activity`/`clear_activity` only send
//!   (they never read Discord's reply), so a payload Discord silently
//!   rejected (`"evt": "ERROR"`) looked identical to success.
//! - `clear_activity` used to go through the crate's method with no read at
//!   all, leaving its response frame permanently unread on the socket. The
//!   next call's naive "next frame must be mine" read then consumed *that*
//!   stale frame instead of its own, permanently shifting every reply one
//!   send out of phase with its request for the rest of the session.

use discord_rich_presence::{activity::Activity, DiscordIpc, DiscordIpcClient};
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::atomic::{AtomicU64, Ordering};

/// Seconds elapsed since this process started, to one decimal place. Lets
/// debug log lines be correlated by spacing (e.g. "were these really 20s
/// apart?") without pulling in a timezone-aware clock crate for what's a
/// dev-only diagnostic.
#[cfg(debug_assertions)]
pub(crate) fn log_ts() -> String {
    use std::sync::OnceLock;
    use std::time::Instant;
    static START: OnceLock<Instant> = OnceLock::new();
    let start = *START.get_or_init(Instant::now);
    format!("t+{:.1}s", start.elapsed().as_secs_f64())
}

#[derive(Debug, thiserror::Error)]
pub enum IpcError {
    #[error("Discord is not running, or Rich Presence is disabled")]
    NotRunning,
    #[error("Discord rejected the handshake: {0}")]
    Handshake(String),
    #[error("failed to send activity to Discord: {0}")]
    Send(String),
    #[error("Discord rejected the activity: {0}")]
    Rejected(String),
}

impl Serialize for IpcError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

/// A live handshake result: who we're connected as, if Discord told us.
pub struct Handshake {
    pub username: Option<String>,
}

pub struct DiscordConnection {
    client: DiscordIpcClient,
    app_id: String,
}

/// How many unrelated frames we'll skip past while looking for our nonce
/// before giving up. Generous, since in practice the very next frame is
/// almost always ours, but bounded so a truly missing reply can't hang
/// forever.
const MAX_ACK_ATTEMPTS: u32 = 8;

fn next_nonce() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("glint-{}-{n}", std::process::id())
}

impl DiscordConnection {
    pub fn new(app_id: impl Into<String>) -> Self {
        let app_id = app_id.into();
        Self {
            client: DiscordIpcClient::new(&app_id),
            app_id,
        }
    }

    pub fn connect(&mut self) -> Result<Handshake, IpcError> {
        self.client
            .connect_ipc()
            .map_err(|_| IpcError::NotRunning)?;

        self.client
            .send(json!({ "v": 1, "client_id": self.app_id }), 0)
            .map_err(|e| IpcError::Handshake(e.to_string()))?;

        let (_, response) = self
            .client
            .recv()
            .map_err(|e| IpcError::Handshake(e.to_string()))?;

        let username = response
            .get("data")
            .and_then(|data| data.get("user"))
            .and_then(|user| user.get("username"))
            .and_then(|v| v.as_str())
            .map(str::to_owned);

        Ok(Handshake { username })
    }

    pub fn set_activity(&mut self, activity: Activity) -> Result<(), IpcError> {
        let value = serde_json::to_value(&activity).unwrap_or(Value::Null);
        self.send_set_activity(value)
    }

    pub fn clear_activity(&mut self) -> Result<(), IpcError> {
        self.send_set_activity(Value::Null)
    }

    pub fn close(&mut self) {
        let _ = self.client.close();
    }

    /// Builds and sends one SET_ACTIVITY envelope with a nonce we generate
    /// ourselves, then waits for the matching reply. `activity` is
    /// `Value::Null` to clear the presence, same as Discord's own protocol.
    fn send_set_activity(&mut self, activity: Value) -> Result<(), IpcError> {
        let nonce = next_nonce();

        #[cfg(debug_assertions)]
        eprintln!(
            "[glint {}] SET_ACTIVITY payload (nonce {nonce}):\n{}",
            log_ts(),
            serde_json::to_string_pretty(&activity).unwrap_or_default()
        );

        self.client
            .send(
                json!({
                    "cmd": "SET_ACTIVITY",
                    "args": { "pid": std::process::id(), "activity": activity },
                    "nonce": nonce,
                }),
                1,
            )
            .map_err(|e| IpcError::Send(e.to_string()))?;

        self.read_ack(&nonce)
    }

    /// Reads frames until one carries `expected_nonce`, logs it in debug
    /// builds, and turns an `"evt": "ERROR"` reply into an `Err` instead of
    /// silently treating it as success. Frames that don't match are
    /// skipped rather than assumed to be ours; see the module docs for why
    /// that assumption broke things.
    fn read_ack(&mut self, expected_nonce: &str) -> Result<(), IpcError> {
        for _ in 0..MAX_ACK_ATTEMPTS {
            let (_, response) = self
                .client
                .recv()
                .map_err(|e| IpcError::Send(e.to_string()))?;

            if response.get("nonce").and_then(Value::as_str) != Some(expected_nonce) {
                #[cfg(debug_assertions)]
                eprintln!(
                    "[glint {}] skipping frame with unexpected nonce:\n{response:#}",
                    log_ts()
                );
                continue;
            }

            #[cfg(debug_assertions)]
            eprintln!(
                "[glint {}] Discord response (nonce {expected_nonce}):\n{}",
                log_ts(),
                serde_json::to_string_pretty(&response).unwrap_or_default()
            );

            if response.get("evt").and_then(Value::as_str) == Some("ERROR") {
                let message = response
                    .get("data")
                    .and_then(|d| d.get("message"))
                    .and_then(Value::as_str)
                    .unwrap_or("unknown error")
                    .to_string();
                return Err(IpcError::Rejected(message));
            }

            return Ok(());
        }

        Err(IpcError::Send(format!(
            "no reply with nonce {expected_nonce} after {MAX_ACK_ATTEMPTS} frames"
        )))
    }
}
