import type { ConnectionStatus } from "../types/connection";

export const STATUS_LABEL: Record<ConnectionStatus["state"], string> = {
  disconnected: "Discord not running",
  connecting: "Reconnecting…",
  connected: "Connected",
};

export const STATUS_DOT: Record<ConnectionStatus["state"], string> = {
  disconnected: "bg-red-500",
  connecting: "bg-amber-400",
  connected: "bg-emerald-500",
};
