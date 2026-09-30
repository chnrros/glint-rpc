import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getConnectionStatus } from "../lib/commands";
import type { ConnectionStatus } from "../types/connection";

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>({ state: "disconnected" });

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getConnectionStatus().then(setStatus).catch(() => undefined);

    listen<ConnectionStatus>("connection-status", (event) => {
      setStatus(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, []);

  return status;
}
