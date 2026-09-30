import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { clearActivity } from "../../lib/commands";
import { STATUS_DOT } from "../../lib/connectionStatus";
import { applyPresetToClient } from "../../lib/applyPresetToClient";
import { NONE_ASSIGNMENT, type useClientAssignments } from "./useClientAssignments";
import type { ClientStatus } from "../../types/connection";
import type { ApplicationProfile } from "../../types/profile";
import type { Preset } from "../../types/preset";

const selectClass =
  "rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900 px-2 py-1 text-xs text-neutral-300 light:bg-white light:text-neutral-700";
const buttonClass =
  "rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 light:text-neutral-700 light:hover:bg-neutral-100";

function usernameOf(client: ClientStatus): string | null {
  return client.state === "connected" ? client.username : null;
}

function clientLabel(client: ClientStatus): string {
  // Shown as Client 1, Client 2, ... The internal slot number (client.id)
  // stays zero based; only the display adds one.
  const label = `Client ${client.id + 1}`;
  const username = usernameOf(client);
  if (client.state === "connected") return username ? `${label}: ${username}` : label;
  if (client.state === "connecting") return `${label} (reconnecting)`;
  return `${label} (not connected)`;
}

interface ClientsPanelProps {
  clients: ClientStatus[];
  presets: Preset[];
  profiles: ApplicationProfile[];
  // Passed down from App rather than created here with its own
  // useClientAssignments() call, so this panel and the editor's
  // Start/Update read and write the exact same in-memory state. Two
  // separate hook instances would each keep their own copy, so a change
  // made here would never be seen by the other until a full reload, which
  // was the root cause of a None client still receiving Start/Update.
  assignmentsApi: ReturnType<typeof useClientAssignments>;
}

/** Lists every locally detected Discord client and lets a preset be applied
 * to one of them, or to all of them at once. Only rendered when more than
 * one client is running; with a single client, the editor's own
 * Start/Update button already covers it.
 *
 * Each connected client's choice (a preset, or "None" to keep it cleared)
 * is remembered by its username and applies from then on: Apply to all and
 * rotation both skip a client set to None. */
export function ClientsPanel({ clients, presets, profiles, assignmentsApi }: ClientsPanelProps) {
  const [allPresetId, setAllPresetId] = useState(presets[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  if (clients.length <= 1) return null;

  async function handleAssignmentChange(client: ClientStatus, value: string) {
    const username = usernameOf(client);
    if (username) assignmentsApi.setAssignment(username, value);
    if (value !== NONE_ASSIGNMENT) return;
    setError(null);
    try {
      await clearActivity(client.id);
    } catch (err) {
      setError(`Failed to clear client ${client.id + 1}: ${String(err)}`);
    }
  }

  async function handleApply(client: ClientStatus) {
    const presetId = assignmentsApi.assignmentFor(usernameOf(client));
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setError(null);
    try {
      await applyPresetToClient(client.id, preset, profiles);
    } catch (err) {
      setError(`Failed to apply to client ${client.id + 1}: ${String(err)}`);
    }
  }

  async function handleStop(client: ClientStatus) {
    setError(null);
    try {
      await clearActivity(client.id);
    } catch (err) {
      setError(`Failed to stop client ${client.id + 1}: ${String(err)}`);
    }
  }

  async function handleApplyToAll() {
    const preset = presets.find((p) => p.id === allPresetId);
    if (!preset) return;
    setError(null);
    const targets = clients.filter(
      (client) => client.state === "connected" && assignmentsApi.assignmentFor(usernameOf(client)) !== NONE_ASSIGNMENT,
    );
    if (import.meta.env.DEV) {
      console.debug(
        "[glint] Apply to all targets:",
        targets.map((c) => c.id),
      );
    }
    try {
      await Promise.all(targets.map((client) => applyPresetToClient(client.id, preset, profiles)));
    } catch (err) {
      setError(`Failed to apply to all clients: ${String(err)}`);
    }
  }

  return (
    <SectionCard id="clients-section" title="Clients">
      <p className="text-xs text-neutral-500">
        Every Discord client running locally, detected over local IPC. Pick what runs on each account below,
        or apply the same preset to all of them at once. Set an account to None to keep it cleared.
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
        {clients.map((client) => {
          const assignment = assignmentsApi.assignmentFor(usernameOf(client)) ?? "";
          const canConfigure = client.state === "connected";

          return (
            <div
              key={client.id}
              className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-2"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[client.state]}`} />
              <span className="flex-1 truncate text-sm text-neutral-200 light:text-neutral-800">
                {clientLabel(client)}
              </span>
              {canConfigure && presets.length > 0 && (
                <>
                  <select
                    className={selectClass}
                    value={assignment}
                    onChange={(e) => void handleAssignmentChange(client, e.target.value)}
                  >
                    <option value="" disabled>
                      Choose a preset
                    </option>
                    <option value={NONE_ASSIGNMENT}>None</option>
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className={buttonClass}
                    disabled={!assignment || assignment === NONE_ASSIGNMENT}
                    onClick={() => void handleApply(client)}
                  >
                    Apply
                  </button>
                </>
              )}
              {canConfigure && (
                <button className={buttonClass} onClick={() => void handleStop(client)}>
                  Stop
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </SectionCard>
  );
}
