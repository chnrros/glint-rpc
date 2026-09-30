import { useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import { TextField } from "../../components/TextField";
import { DEFAULT_PROFILE, type ApplicationProfile } from "../../types/profile";

interface ProfileManagerProps {
  profiles: ApplicationProfile[];
  onAdd: (label: string, appId: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<ApplicationProfile, "label" | "appId">>) => void;
  onRemove: (id: string) => void;
}

export function ProfileManager({ profiles, onAdd, onUpdate, onRemove }: ProfileManagerProps) {
  const [newLabel, setNewLabel] = useState("");
  const [newAppId, setNewAppId] = useState("");

  function handleAdd() {
    if (!newLabel.trim() || !/^\d+$/.test(newAppId.trim())) return;
    onAdd(newLabel.trim(), newAppId.trim());
    setNewLabel("");
    setNewAppId("");
  }

  return (
    <SectionCard title="Application profiles">
      <p className="text-xs text-neutral-500">
        Each profile is a Discord Application ID. The "Playing ___" name only reliably shows your own
        application's name — create one at{" "}
        <a
          href="https://discord.com/developers/applications"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 hover:text-indigo-300"
        >
          discord.com/developers/applications
        </a>{" "}
        (New Application → copy the Application ID from General Information), then add it below.
      </p>

      <div className="flex flex-col gap-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-2"
          >
            <input
              className="w-28 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900 px-2 py-1 text-sm text-neutral-100 light:bg-white light:text-neutral-900"
              value={profile.label}
              disabled={profile.id === DEFAULT_PROFILE.id}
              onChange={(e) => onUpdate(profile.id, { label: e.target.value })}
            />
            <input
              className="flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900 px-2 py-1 text-sm text-neutral-100 disabled:text-neutral-500 light:bg-white light:text-neutral-900 light:disabled:text-neutral-400"
              value={profile.appId}
              disabled={profile.id === DEFAULT_PROFILE.id}
              onChange={(e) => onUpdate(profile.id, { appId: e.target.value })}
            />
            {profile.id !== DEFAULT_PROFILE.id && (
              <button
                className="text-xs text-red-400 hover:text-red-300"
                onClick={() => onRemove(profile.id)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div className="w-28">
          <TextField label="Label" value={newLabel} onChange={setNewLabel} placeholder="My Game" />
        </div>
        <div className="flex-1">
          <TextField label="Application ID" value={newAppId} onChange={setNewAppId} placeholder="123456789012345678" />
        </div>
        <button
          className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 light:text-neutral-700 light:hover:bg-neutral-100"
          onClick={handleAdd}
        >
          Add profile
        </button>
      </div>
    </SectionCard>
  );
}
