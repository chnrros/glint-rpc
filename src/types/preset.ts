import type { PresencePayload } from "./presence";

export interface Preset {
  id: string;
  name: string;
  profileId: string;
  payload: PresencePayload;
}

export interface RotationSettings {
  enabled: boolean;
  intervalSeconds: number;
  presetIds: string[];
}

export const MIN_ROTATION_INTERVAL_SECONDS = 15;

export const DEFAULT_ROTATION: RotationSettings = {
  enabled: false,
  intervalSeconds: MIN_ROTATION_INTERVAL_SECONDS,
  presetIds: [],
};
