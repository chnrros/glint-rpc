import { useRef, useState } from "react";
import { SectionCard } from "../../components/SectionCard";
import type { Preset } from "../../types/preset";
import type { ApplicationProfile } from "../../types/profile";
import { exportPresets, parseImportedPresets } from "./presetIO";

interface PresetListProps {
  presets: Preset[];
  loaded: boolean;
  profiles: ApplicationProfile[];
  activeProfileId: string;
  onCreateFromDraft: (name: string, profileId: string) => void;
  onRename: (id: string, name: string) => void;
  onSetProfile: (id: string, profileId: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onLoad: (preset: Preset) => void;
  onReplaceAll: (presets: Preset[]) => void;
}

export function PresetList({
  presets,
  loaded,
  profiles,
  activeProfileId,
  onCreateFromDraft,
  onRename,
  onSetProfile,
  onDuplicate,
  onRemove,
  onMove,
  onLoad,
  onReplaceAll,
}: PresetListProps) {
  const [newName, setNewName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    onCreateFromDraft(newName.trim(), activeProfileId);
    setNewName("");
  }

  async function handleImportFile(file: File) {
    setImportError(null);
    try {
      const text = await file.text();
      const imported = parseImportedPresets(
        text,
        new Set(profiles.map((p) => p.id)),
      );
      onReplaceAll([...presets, ...imported]);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <SectionCard title="Presets">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100 light:bg-white light:text-neutral-900"
          placeholder="Save current editor state as…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 light:text-neutral-700 light:hover:bg-neutral-100"
          onClick={handleCreate}
        >
          Save preset
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {!loaded && <p className="text-xs text-neutral-500">Loading presets…</p>}
        {loaded && presets.length === 0 && <p className="text-xs text-neutral-500">No presets yet.</p>}
        {presets.map((preset, i) => (
          <div
            key={preset.id}
            className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-2"
          >
            <div className="flex flex-col">
              <button
                className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-30 light:hover:text-neutral-700"
                disabled={i === 0}
                onClick={() => onMove(preset.id, -1)}
              >
                ▲
              </button>
              <button
                className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-30 light:hover:text-neutral-700"
                disabled={i === presets.length - 1}
                onClick={() => onMove(preset.id, 1)}
              >
                ▼
              </button>
            </div>
            <input
              className="flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900 px-2 py-1 text-sm text-neutral-100 light:bg-white light:text-neutral-900"
              value={preset.name}
              onChange={(e) => onRename(preset.id, e.target.value)}
            />
            <select
              className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900 px-2 py-1 text-xs text-neutral-300 light:bg-white light:text-neutral-700"
              value={preset.profileId}
              onChange={(e) => onSetProfile(preset.id, e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              className="text-xs text-indigo-400 hover:text-indigo-300"
              onClick={() => onLoad(preset)}
            >
              Load
            </button>
            <button
              className="text-xs text-neutral-400 hover:text-neutral-200 light:hover:text-neutral-700"
              onClick={() => onDuplicate(preset.id)}
            >
              Duplicate
            </button>
            <button className="text-xs text-red-400 hover:text-red-300" onClick={() => onRemove(preset.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-800 pt-3 light:border-neutral-200">
        <button
          className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 light:text-neutral-700 light:hover:bg-neutral-100"
          onClick={() => exportPresets(presets)}
          disabled={presets.length === 0}
        >
          Export JSON
        </button>
        <button
          className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 light:text-neutral-700 light:hover:bg-neutral-100"
          onClick={() => fileInputRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {importError && <p className="text-xs text-red-400">Import failed: {importError}</p>}
    </SectionCard>
  );
}
