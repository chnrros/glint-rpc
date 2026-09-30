import { SectionCard } from "../../components/SectionCard";
import { MIN_ROTATION_INTERVAL_SECONDS, type Preset, type RotationSettings } from "../../types/preset";

interface RotationPanelProps {
  presets: Preset[];
  settings: RotationSettings;
  onChange: (settings: RotationSettings) => void;
  running: boolean;
  onToggle: (running: boolean) => void;
}

export function RotationPanel({ presets, settings, onChange, running, onToggle }: RotationPanelProps) {
  function toggleSelected(id: string) {
    const presetIds = settings.presetIds.includes(id)
      ? settings.presetIds.filter((p) => p !== id)
      : [...settings.presetIds, id];
    onChange({ ...settings, presetIds });
  }

  const canRun = settings.presetIds.length >= 1;

  return (
    <SectionCard title="Rotation">
      <p className="text-xs text-neutral-500">
        Cycles through the selected presets automatically. Discord allows roughly 5 presence updates per 20
        seconds, so the interval can't go below {MIN_ROTATION_INTERVAL_SECONDS}s.
      </p>

      <div className="flex flex-col gap-1">
        {presets.length === 0 && <p className="text-xs text-neutral-500">Save a preset first.</p>}
        {presets.map((preset) => (
          <label key={preset.id} className="flex items-center gap-2 text-sm text-neutral-300 light:text-neutral-700">
            <input
              type="checkbox"
              checked={settings.presetIds.includes(preset.id)}
              onChange={() => toggleSelected(preset.id)}
            />
            {preset.name}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-neutral-400 light:text-neutral-500">
          Interval (seconds)
          <input
            type="number"
            min={MIN_ROTATION_INTERVAL_SECONDS}
            className="w-20 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900 px-2 py-1 text-sm text-neutral-100 light:bg-white light:text-neutral-900"
            value={settings.intervalSeconds}
            onChange={(e) =>
              onChange({
                ...settings,
                intervalSeconds: Math.max(MIN_ROTATION_INTERVAL_SECONDS, Number(e.target.value) || MIN_ROTATION_INTERVAL_SECONDS),
              })
            }
          />
        </label>
        <button
          className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 light:disabled:bg-neutral-200 light:disabled:text-neutral-400"
          disabled={!canRun}
          onClick={() => onToggle(!running)}
        >
          {running ? "Stop rotation" : "Start rotation"}
        </button>
      </div>
    </SectionCard>
  );
}
