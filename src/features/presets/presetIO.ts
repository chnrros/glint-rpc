import { EMPTY_PRESENCE } from "../../types/presence";
import type { Preset } from "../../types/preset";
import { DEFAULT_PROFILE } from "../../types/profile";

const EXPORT_VERSION = 1;

interface ExportFile {
  version: number;
  presets: Preset[];
}

export function exportPresets(presets: Preset[]) {
  const file: ExportFile = { version: EXPORT_VERSION, presets };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "glint-presets.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Throws with a user-facing message when the file doesn't look like a Glint preset export. */
export function parseImportedPresets(raw: string, knownProfileIds: Set<string>): Preset[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Not valid JSON");
  }

  const list = Array.isArray(data) ? data : (data as Partial<ExportFile>)?.presets;
  if (!Array.isArray(list)) {
    throw new Error('Expected a preset array, or {"presets": [...]}');
  }

  return list.map((entry, i) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`Preset ${i + 1} is not an object`);
    }
    const name = (entry as Record<string, unknown>).name;
    const payload = (entry as Record<string, unknown>).payload;
    if (typeof name !== "string" || !name.trim()) {
      throw new Error(`Preset ${i + 1} is missing a name`);
    }
    if (typeof payload !== "object" || payload === null) {
      throw new Error(`Preset ${i + 1} is missing a payload`);
    }
    const profileId = (entry as Record<string, unknown>).profileId;
    return {
      id: crypto.randomUUID(),
      name,
      profileId: typeof profileId === "string" && knownProfileIds.has(profileId) ? profileId : DEFAULT_PROFILE.id,
      payload: { ...EMPTY_PRESENCE, ...(payload as object) },
    };
  });
}
