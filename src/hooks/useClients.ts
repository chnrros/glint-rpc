import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getClients } from "../lib/commands";
import type { ClientStatus } from "../types/connection";

/** Every locally detected Discord client, one entry per discord-ipc-N slot
 * that's currently running, kept in sync with a fresh snapshot on mount
 * and per-client updates pushed as `connection-status` events. */
export function useClients(): ClientStatus[] {
  const [clients, setClients] = useState<ClientStatus[]>([]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    getClients().then(setClients).catch(() => undefined);

    listen<ClientStatus>("connection-status", (event) => {
      setClients((current) => {
        const updated = event.payload;
        const existing = current.findIndex((c) => c.id === updated.id);
        if (existing === -1) {
          return [...current, updated].sort((a, b) => a.id - b.id);
        }
        const next = [...current];
        next[existing] = updated;
        return next;
      });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, []);

  return clients;
}
