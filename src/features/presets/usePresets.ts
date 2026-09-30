import { usePersistedState } from "../../hooks/usePersistedState";
import type { Preset } from "../../types/preset";
import type { PresencePayload } from "../../types/presence";

export function usePresets() {
  const [presets, setPresets, loaded] = usePersistedState<Preset[]>("presets", []);

  function createFromDraft(name: string, profileId: string, payload: PresencePayload) {
    const preset: Preset = { id: crypto.randomUUID(), name, profileId, payload };
    setPresets([...presets, preset]);
    return preset;
  }

  function rename(id: string, name: string) {
    setPresets(presets.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function setProfile(id: string, profileId: string) {
    setPresets(presets.map((p) => (p.id === id ? { ...p, profileId } : p)));
  }

  function duplicate(id: string) {
    const source = presets.find((p) => p.id === id);
    if (!source) return;
    const index = presets.indexOf(source);
    const copy: Preset = { ...source, id: crypto.randomUUID(), name: `${source.name} copy` };
    setPresets([...presets.slice(0, index + 1), copy, ...presets.slice(index + 1)]);
  }

  function remove(id: string) {
    setPresets(presets.filter((p) => p.id !== id));
  }

  function move(id: string, direction: -1 | 1) {
    const index = presets.findIndex((p) => p.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= presets.length) return;
    const next = [...presets];
    [next[index], next[target]] = [next[target], next[index]];
    setPresets(next);
  }

  function replaceAll(next: Preset[]) {
    setPresets(next);
  }

  return { presets, loaded, createFromDraft, rename, setProfile, duplicate, remove, move, replaceAll };
}
