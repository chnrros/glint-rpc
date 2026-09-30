import { SectionCard } from "../../components/SectionCard";
import { TextField } from "../../components/TextField";
import { Select } from "../../components/Select";
import { NumberField } from "../../components/NumberField";
import { inputClass, labelClass } from "../../components/fieldStyles";
import type { ActivityKind, PresencePayload, StatusDisplay, Timing } from "../../types/presence";
import type { FieldErrors } from "../../lib/validation";

const ACTIVITY_TYPES: { value: ActivityKind; label: string }[] = [
  { value: "playing", label: "Playing" },
  { value: "listening", label: "Listening to" },
  { value: "watching", label: "Watching" },
  { value: "competing", label: "Competing in" },
];

const STATUS_DISPLAYS: { value: StatusDisplay; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "details", label: "Details" },
  { value: "state", label: "State" },
];

type TimingMode = Timing["mode"];

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string): number {
  return new Date(value).getTime();
}

interface EditorFormProps {
  draft: PresencePayload;
  onChange: (draft: PresencePayload) => void;
  errors: FieldErrors;
}

export function EditorForm({ draft, onChange, errors }: EditorFormProps) {
  function set<K extends keyof PresencePayload>(key: K, value: PresencePayload[K]) {
    onChange({ ...draft, [key]: value });
  }

  function setTimingMode(mode: TimingMode) {
    if (mode === "off") {
      set("timing", { mode: "off" });
    } else if (mode === "elapsed_since_start") {
      set("timing", { mode: "elapsed_since_start", start_ms: Date.now() });
    } else {
      set("timing", { mode: "countdown", end_ms: Date.now() + 30 * 60_000 });
    }
  }

  function addButton() {
    if (draft.buttons.length >= 2) return;
    set("buttons", [...draft.buttons, { label: "", url: "" }]);
  }

  function updateButton(index: number, patch: Partial<{ label: string; url: string }>) {
    set(
      "buttons",
      draft.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    );
  }

  function removeButton(index: number) {
    set(
      "buttons",
      draft.buttons.filter((_, i) => i !== index),
    );
  }

  const timingMode = draft.timing?.mode ?? "off";

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Identity">
        <TextField
          label="Activity name"
          value={draft.name ?? ""}
          onChange={(v) => set("name", v || null)}
          placeholder="Defaults to your application's name"
          hint="Local RPC honors this override, but only reliably for your own registered application — see Application Profiles."
        />
        <Select
          label="Activity type"
          value={draft.activity_type ?? "playing"}
          options={ACTIVITY_TYPES}
          onChange={(v) => set("activity_type", v)}
        />
        <Select
          label="Status display"
          value={draft.status_display ?? "details"}
          options={STATUS_DISPLAYS}
          onChange={(v) => set("status_display", v)}
        />
      </SectionCard>

      <SectionCard title="Text">
        <TextField
          label="Details"
          value={draft.details ?? ""}
          onChange={(v) => set("details", v || null)}
          maxLength={128}
          error={errors.details}
        />
        <TextField
          label="Details URL"
          value={draft.details_url ?? ""}
          onChange={(v) => set("details_url", v || null)}
          placeholder="https://"
          error={errors.detailsUrl}
        />
        <TextField
          label="State"
          value={draft.state ?? ""}
          onChange={(v) => set("state", v || null)}
          maxLength={128}
          error={errors.state}
        />
        <TextField
          label="State URL"
          value={draft.state_url ?? ""}
          onChange={(v) => set("state_url", v || null)}
          placeholder="https://"
          error={errors.stateUrl}
        />
      </SectionCard>

      <SectionCard title="Images">
        <TextField
          label="Large image"
          value={draft.large_image ?? ""}
          onChange={(v) => set("large_image", v || null)}
          placeholder="Art asset key or https:// image URL"
          labelHelp="Right-click any image online → Copy image address, then paste it here. Or use an Art Asset key uploaded in your application on the Discord Developer Portal."
        />
        <TextField
          label="Large image hover text"
          value={draft.large_text ?? ""}
          onChange={(v) => set("large_text", v || null)}
        />
        <TextField
          label="Large image URL"
          value={draft.large_url ?? ""}
          onChange={(v) => set("large_url", v || null)}
          placeholder="https://"
          error={errors.largeUrl}
        />
        <TextField
          label="Small image"
          value={draft.small_image ?? ""}
          onChange={(v) => set("small_image", v || null)}
          placeholder="Art asset key or https:// image URL"
          labelHelp="Right-click any image online → Copy image address, then paste it here. Or use an Art Asset key uploaded in your application on the Discord Developer Portal."
        />
        <TextField
          label="Small image hover text"
          value={draft.small_text ?? ""}
          onChange={(v) => set("small_text", v || null)}
        />
        <TextField
          label="Small image URL"
          value={draft.small_url ?? ""}
          onChange={(v) => set("small_url", v || null)}
          placeholder="https://"
          error={errors.smallUrl}
        />
      </SectionCard>

      <SectionCard title="Time">
        <Select
          label="Timer"
          value={timingMode}
          options={[
            { value: "off", label: "Off" },
            { value: "elapsed_since_start", label: "Elapsed (since a start time)" },
            { value: "countdown", label: "Countdown (to an end time)" },
          ]}
          onChange={(v) => setTimingMode(v)}
        />
        {draft.timing?.mode === "elapsed_since_start" && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Start time</span>
            <input
              type="datetime-local"
              className={inputClass}
              value={toDatetimeLocal(draft.timing.start_ms)}
              onChange={(e) =>
                set("timing", { mode: "elapsed_since_start", start_ms: fromDatetimeLocal(e.target.value) })
              }
            />
            <button
              type="button"
              className="w-fit text-xs text-indigo-400 hover:text-indigo-300"
              onClick={() => set("timing", { mode: "elapsed_since_start", start_ms: Date.now() })}
            >
              Reset to now
            </button>
          </label>
        )}
        {draft.timing?.mode === "countdown" && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Ends at</span>
            <input
              type="datetime-local"
              className={inputClass}
              value={toDatetimeLocal(draft.timing.end_ms)}
              onChange={(e) => set("timing", { mode: "countdown", end_ms: fromDatetimeLocal(e.target.value) })}
            />
          </label>
        )}
      </SectionCard>

      <SectionCard title="Party">
        <p className="text-xs text-neutral-500">
          Discord requires both a current and max size to show "x of y" on your profile — Glint handles the
          party ID for you automatically.
        </p>
        {draft.activity_type !== "playing" && (
          <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-2 py-1.5 text-xs text-amber-400">
            Party size only shows on Discord when Activity type is Playing.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Current size" value={draft.party_size} onChange={(v) => set("party_size", v)} min={1} />
          <NumberField label="Max size" value={draft.party_max} onChange={(v) => set("party_max", v)} min={1} />
        </div>
        {errors.party && <span className="text-xs text-red-400">{errors.party}</span>}
      </SectionCard>

      <SectionCard title="Buttons">
        <p className="text-xs text-neutral-500">
          Buttons never appear on your own profile — only other people see them.
        </p>
        {draft.buttons.map((button, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-3">
            <TextField
              label={`Button ${i + 1} label`}
              value={button.label}
              onChange={(v) => updateButton(i, { label: v })}
              maxLength={32}
              error={errors[`button${i}Label` as keyof FieldErrors]}
            />
            <TextField
              label={`Button ${i + 1} URL`}
              value={button.url}
              onChange={(v) => updateButton(i, { url: v })}
              placeholder="https://"
              error={errors[`button${i}Url` as keyof FieldErrors]}
            />
            <button
              type="button"
              className="w-fit text-xs text-red-400 hover:text-red-300"
              onClick={() => removeButton(i)}
            >
              Remove
            </button>
          </div>
        ))}
        {draft.buttons.length < 2 && (
          <button
            type="button"
            className="w-fit rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 light:text-neutral-700 light:hover:bg-neutral-100"
            onClick={addButton}
          >
            Add button
          </button>
        )}
      </SectionCard>
    </div>
  );
}
