//! Raw Discord IPC transport, one connection per local Discord client.
//!
//! Discord Stable, PTB, and Canary each claim their own
//! `discord-ipc-0` through `discord-ipc-9` socket (Unix) or named pipe
//! (Windows) when they start, picking the first free slot. The
//! `discord-rich-presence` crate's own client always connects to whichever
//! slot it finds first, with no way to target a specific one, so it can
//! only ever reach a single running client. This module reimplements the
//! same small protocol (the crate's own send/recv framing, an 8 byte
//! header of little endian opcode and length, then the JSON body) against
//! a socket we open ourselves at a chosen slot, so Glint can hold one
//! connection per detected client at once. `discord_rich_presence` is
//! still used for the `Activity` payload type (see `presence/mod.rs`).
//!
//! Every SET_ACTIVITY-shaped send (`set_activity`, `clear_activity`) goes
//! through one path that builds its own envelope with a nonce we generate
//! and control, then reads frames until one with that nonce comes back.
//! Reading blindly (assuming the very next frame is always the reply) once
//! caused a real bug: `clear_activity` used to leave its response frame
//! unread on the socket, so every read after that was one frame behind for
//! the rest of the session.

use discord_rich_presence::activity::Activity;
use serde::Serialize;
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU64, Ordering};

/// Which local Discord client a connection targets: the slot number from
/// its `discord-ipc-N` socket or pipe, 0 through 9.
pub type ClientId = u8;

/// How many slots Discord will use. Matches the crate's own search range.
const MAX_CLIENTS: ClientId = 10;

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

#[cfg(unix)]
type PlatformSocket = std::os::unix::net::UnixStream;
#[cfg(windows)]
type PlatformSocket = std::fs::File;

/// Opens a connection to the `discord-ipc-{id}` slot, or `None` if nothing
/// is listening there.
#[cfg(unix)]
fn connect_socket(id: ClientId) -> Option<PlatformSocket> {
    // Discord (and Vesktop, Flatpak and Snap builds of it) creates its
    // socket under one of these base directories, sometimes nested in a
    // build specific subfolder. Ported from `discord-rich-presence`'s own
    // `find_pipe`, minus its Snap specific `SNAP` env var rewrite, which
    // isn't needed to find the socket, only to match Snap's own reported
    // path exactly.
    const ENV_KEYS: [&str; 4] = ["XDG_RUNTIME_DIR", "TMPDIR", "TMP", "TEMP"];
    const APP_SUBPATHS: [&str; 7] = [
        "",
        "app/com.discordapp.Discord/",
        "app/dev.vencord.Vesktop/",
        ".flatpak/com.discordapp.Discord/xdg-run/",
        ".flatpak/dev.vencord.Vesktop/xdg-run/",
        "snap.discord-canary/",
        "snap.discord/",
    ];

    let pipe_name = format!("discord-ipc-{id}");
    for key in ENV_KEYS {
        let Ok(base) = std::env::var(key) else {
            continue;
        };
        let base = std::path::PathBuf::from(base);
        if !base.is_dir() {
            continue;
        }
        for subpath in APP_SUBPATHS {
            let path = base.join(subpath).join(&pipe_name);
            if let Ok(socket) = PlatformSocket::connect(&path) {
                return Some(socket);
            }
        }
    }
    None
}

#[cfg(windows)]
fn connect_socket(id: ClientId) -> Option<PlatformSocket> {
    use std::fs::OpenOptions;
    use std::os::windows::fs::OpenOptionsExt;

    let path = format!(r"\\?\pipe\discord-ipc-{id}");
    // access_mode(0x3) is GENERIC_READ | GENERIC_WRITE, matching how
    // `discord-rich-presence` opens the same named pipe.
    OpenOptions::new().access_mode(0x3).open(path).ok()
}

/// Detects every locally running Discord client by probing each
/// `discord-ipc-N` slot for a live socket or pipe, then immediately
/// closing the probe connection. Connecting and disconnecting like this is
/// harmless: it's the same thing any IPC client does before a real
/// handshake, and Discord doesn't treat it as an error.
pub fn discover_clients() -> Vec<ClientId> {
    (0..MAX_CLIENTS)
        .filter(|&id| connect_socket(id).is_some())
        .collect()
}

fn next_nonce() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let n = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("glint-{}-{n}", std::process::id())
}

/// How many unrelated frames we'll skip past while looking for our nonce
/// before giving up. Generous, since in practice the very next frame is
/// almost always ours, but bounded so a truly missing reply can't hang
/// forever.
const MAX_ACK_ATTEMPTS: u32 = 8;

pub struct DiscordConnection {
    client_id: ClientId,
    app_id: String,
    socket: Option<PlatformSocket>,
}

impl DiscordConnection {
    pub fn new(client_id: ClientId, app_id: impl Into<String>) -> Self {
        Self {
            client_id,
            app_id: app_id.into(),
            socket: None,
        }
    }

    pub fn connect(&mut self) -> Result<Handshake, IpcError> {
        let socket = connect_socket(self.client_id).ok_or(IpcError::NotRunning)?;
        self.socket = Some(socket);

        self.send(json!({ "v": 1, "client_id": self.app_id }), 0)
            .map_err(IpcError::Handshake)?;

        let (_, response) = self.recv().map_err(IpcError::Handshake)?;

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
        let _ = self.send(json!({}), 2);
        #[cfg(unix)]
        if let Some(socket) = self.socket.as_ref() {
            let _ = socket.shutdown(std::net::Shutdown::Both);
        }
        self.socket = None;
    }

    /// Builds and sends one SET_ACTIVITY envelope with a nonce we generate
    /// ourselves, then waits for the matching reply. `activity` is
    /// `Value::Null` to clear the presence, same as Discord's own protocol.
    fn send_set_activity(&mut self, activity: Value) -> Result<(), IpcError> {
        let nonce = next_nonce();

        #[cfg(debug_assertions)]
        eprintln!(
            "[glint {} client {}] SET_ACTIVITY payload (nonce {nonce}):\n{}",
            log_ts(),
            self.client_id,
            serde_json::to_string_pretty(&activity).unwrap_or_default()
        );

        self.send(
            json!({
                "cmd": "SET_ACTIVITY",
                "args": { "pid": std::process::id(), "activity": activity },
                "nonce": nonce,
            }),
            1,
        )
        .map_err(IpcError::Send)?;

        self.read_ack(&nonce)
    }

    /// Reads frames until one carries `expected_nonce`, logs it in debug
    /// builds, and turns an `"evt": "ERROR"` reply into an `Err` instead of
    /// silently treating it as success. Frames that don't match are
    /// skipped rather than assumed to be ours; see the module docs for why
    /// that assumption broke things.
    fn read_ack(&mut self, expected_nonce: &str) -> Result<(), IpcError> {
        for _ in 0..MAX_ACK_ATTEMPTS {
            let (_, response) = self.recv().map_err(IpcError::Send)?;

            if response.get("nonce").and_then(Value::as_str) != Some(expected_nonce) {
                #[cfg(debug_assertions)]
                eprintln!(
                    "[glint {} client {}] skipping frame with unexpected nonce:\n{response:#}",
                    log_ts(),
                    self.client_id
                );
                continue;
            }

            #[cfg(debug_assertions)]
            eprintln!(
                "[glint {} client {}] Discord response (nonce {expected_nonce}):\n{}",
                log_ts(),
                self.client_id,
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

    fn send(&mut self, data: Value, opcode: u32) -> Result<(), String> {
        let socket = self.socket.as_mut().ok_or("not connected")?;
        let body = data.to_string();
        let mut header = [0u8; 8];
        header[0..4].copy_from_slice(&opcode.to_le_bytes());
        header[4..8].copy_from_slice(&(body.len() as u32).to_le_bytes());
        socket.write_all(&header).map_err(|e| e.to_string())?;
        socket
            .write_all(body.as_bytes())
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn recv(&mut self) -> Result<(u32, Value), String> {
        let socket = self.socket.as_mut().ok_or("not connected")?;

        let mut header = [0u8; 8];
        socket.read_exact(&mut header).map_err(|e| e.to_string())?;
        let opcode = u32::from_le_bytes([header[0], header[1], header[2], header[3]]);
        let length = u32::from_le_bytes([header[4], header[5], header[6], header[7]]);

        let mut body = vec![0u8; length as usize];
        socket.read_exact(&mut body).map_err(|e| e.to_string())?;

        let text = String::from_utf8(body).map_err(|_| "Discord sent non-UTF8 data".to_string())?;
        let value: Value =
            serde_json::from_str(&text).map_err(|_| "Discord sent invalid JSON".to_string())?;

        Ok((opcode, value))
    }
}
