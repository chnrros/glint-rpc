// Mirrors src-tauri/src/presence/mod.rs. Keep these in sync by hand.

export type ActivityKind = "playing" | "listening" | "watching" | "competing";

export type StatusDisplay = "name" | "state" | "details";

export type Timing =
  | { mode: "off" }
  | { mode: "elapsed_since_start"; start_ms: number }
  | { mode: "countdown"; end_ms: number };

export interface PresenceButton {
  label: string;
  url: string;
}

export interface PresencePayload {
  name: string | null;
  activity_type: ActivityKind | null;
  status_display: StatusDisplay | null;

  details: string | null;
  details_url: string | null;
  state: string | null;
  state_url: string | null;

  large_image: string | null;
  large_text: string | null;
  large_url: string | null;
  small_image: string | null;
  small_text: string | null;
  small_url: string | null;

  timing: Timing | null;

  party_size: number | null;
  party_max: number | null;

  buttons: PresenceButton[];
}

export const EMPTY_PRESENCE: PresencePayload = {
  name: null,
  activity_type: "playing",
  status_display: "details",
  details: null,
  details_url: null,
  state: null,
  state_url: null,
  large_image: null,
  large_text: null,
  large_url: null,
  small_image: null,
  small_text: null,
  small_url: null,
  timing: { mode: "off" },
  party_size: null,
  party_max: null,
  buttons: [],
};
