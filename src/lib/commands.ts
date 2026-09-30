import { invoke } from "@tauri-apps/api/core";
import type { ClientStatus } from "../types/connection";
import type { PresencePayload } from "../types/presence";

// Mirrors src-tauri/src/tray/mod.rs::TrayPreset
export interface TrayPreset {
  id: string;
  name: string;
  app_id: string;
  payload: PresencePayload;
}

export function getClients(): Promise<ClientStatus[]> {
  return invoke("get_clients");
}

export function applyActivity(clientId: number, payload: PresencePayload): Promise<void> {
  return invoke("apply_activity", { clientId, payload });
}

export function clearActivity(clientId: number): Promise<void> {
  return invoke("clear_activity", { clientId });
}

export function setApplicationId(clientId: number, appId: string): Promise<void> {
  return invoke("set_application_id", { clientId, appId });
}

export function syncTrayPresets(presets: TrayPreset[]): Promise<void> {
  return invoke("sync_tray_presets", { presets });
}

export function syncExcludedClients(clientIds: number[]): Promise<void> {
  return invoke("sync_excluded_clients", { clientIds });
}

export function setMinimizeToTrayOnClose(enabled: boolean): Promise<void> {
  return invoke("set_minimize_to_tray_on_close", { enabled });
}
