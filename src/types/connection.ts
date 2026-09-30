// Mirrors src-tauri/src/state/mod.rs::ConnectionStatus
export type ConnectionStatus =
  | { state: "disconnected" }
  | { state: "connecting" }
  | { state: "connected"; username: string | null };
