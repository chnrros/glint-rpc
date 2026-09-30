import { invoke } from "@tauri-apps/api/core";
import type { ConnectionStatus } from "../types/connection";
import type { PresencePayload } from "../types/presence";

// Mirrors src-tauri/src/tray/mod.rs::TrayPreset
export interface TrayPreset {
  id: string;
  name: string;
  app_id: string;
  payload: PresencePayload;
}

export function getConnectionStatus(): Promise<ConnectionStatus> {
  return invoke("get_connection_status");
}

export function applyActivity(payload: PresencePayload): Promise<void> {
  return invoke("apply_activity", { payload });
}

export function clearActivity(): Promise<void> {
  return invoke("clear_activity");
}

export function setApplicationId(appId: string): Promise<void> {
  return invoke("set_application_id", { appId });
}

export function syncTrayPresets(presets: TrayPreset[]): Promise<void> {
  return invoke("sync_tray_presets", { presets });
}

export function setMinimizeToTrayOnClose(enabled: boolean): Promise<void> {
  return invoke("set_minimize_to_tray_on_close", { enabled });
}
