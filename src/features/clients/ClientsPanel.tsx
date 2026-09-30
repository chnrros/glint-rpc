import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { applyActivity, getClients, setApplicationId } from "../../lib/commands";
import { STATUS_DOT } from "../../lib/connectionStatus";
import type { ClientStatus } from "../../types/connection";
import type { ApplicationProfile } from "../../types/profile";
import type { Preset } from "../../types/preset";

const PROFILE_SWITCH_TIMEOUT_MS = 8000;

const selectClass =
  "rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900 px-2 py-1 text-xs text-neutral-300 light:bg-white light:text-neutral-700";
const buttonClass =
  "rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 light:text-neutral-700 light:hover:bg-neutral-100";

/** Switches `clientId` to `preset`'s Application Profile if needed, waits
 * for it to reconnect, then applies the preset. Each client tracks its own
 * Application ID independently, so this doesn't touch any other client. */
async function applyPresetToClient(clientId: number, preset: Preset, profiles: ApplicationProfile[]) {
  const profile = profiles.find((p) => p.id === preset.profileId);
  if (profile) {
    await setApplicationId(clientId, profile.appId);

    const deadline = Date.now() + PROFILE_SWITCH_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const clients = await getClients();
      const client = clients.find((c) => c.id === clientId);
      if (client?.state === "connected") break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  await applyActivity(clientId, preset.payload);
}

function clientLabel(client: ClientStatus): string {
  if (client.state === "connected") {
    return client.username ? `Client ${client.id} — ${client.username}` : `Client ${client.id}`;
  }
  if (client.state === "connecting") return `Client ${client.id} — reconnecting`;
  return `Client ${client.id} — not connected`;
}

interface ClientsPanelProps {
  clients: ClientStatus[];
  presets: Preset[];
  profiles: ApplicationProfile[];
}

/** Lists every locally detected Discord client and lets a preset be applied
 * to one of them, or to all of them at once. Only rendered when more than
 * one client is running; with a single client, the editor's own
 * Start/Update button already covers it. */
export function ClientsPanel({ clients, presets, profiles }: ClientsPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<Record<number, string>>({});
  const [allPresetId, setAllPresetId] = useState(presets[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  if (clients.length <= 1) return null;

  function presetIdFor(clientId: number): string {
    return selectedPreset[clientId] ?? presets[0]?.id ?? "";
  }

  async function handleApply(clientId: number) {
    const preset = presets.find((p) => p.id === presetIdFor(clientId));
    if (!preset) return;
    setError(null);
    try {
      await applyPresetToClient(clientId, preset, profiles);
    } catch (err) {
      setError(`Failed to apply to client ${clientId}: ${String(err)}`);
    }
  }

  async function handleApplyToAll() {
    const preset = presets.find((p) => p.id === allPresetId);
    if (!preset) return;
    setError(null);
    try {
      await Promise.all(clients.map((client) => applyPresetToClient(client.id, preset, profiles)));
    } catch (err) {
      setError(`Failed to apply to all clients: ${String(err)}`);
    }
  }

  return (
    <SectionCard title="Clients">
      <p className="text-xs text-neutral-500">
        Every Discord client running locally, detected over local IPC. Pick a preset for each one below, or
        apply the same preset to all of them at once.
      </p>

      {presets.length === 0 && <p className="text-xs text-neutral-500">Save a preset first to apply it here.</p>}

      {presets.length > 0 && (
        <div className="flex items-center gap-2">
          <select className={selectClass} value={allPresetId} onChange={(e) => setAllPresetId(e.target.value)}>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <button className={buttonClass} onClick={handleApplyToAll}>
            Apply to all clients
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-2"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[client.state]}`} />
            <span className="flex-1 truncate text-sm text-neutral-200 light:text-neutral-800">
              {clientLabel(client)}
            </span>
            {presets.length > 0 && (
              <>
                <select
                  className={selectClass}
                  value={presetIdFor(client.id)}
                  onChange={(e) =>
                    setSelectedPreset((current) => ({ ...current, [client.id]: e.target.value }))
                  }
                >
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                <button className={buttonClass} onClick={() => handleApply(client.id)}>
                  Apply
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </SectionCard>
  );
}
