// Mirrors src-tauri/src/state/mod.rs::ConnectionStatus
export type ConnectionStatus =
  | { state: "disconnected" }
  | { state: "connecting" }
  | { state: "connected"; username: string | null };

// Mirrors src-tauri/src/state/mod.rs::ClientStatus. `id` is the
// discord-ipc-N slot the client was found on, one entry per locally
// running Discord client (Stable, PTB, Canary, and so on).
export type ClientStatus = ConnectionStatus & { id: number };
