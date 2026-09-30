import { usePersistedState } from "../../hooks/usePersistedState";
import { DEFAULT_SETTINGS, type Settings } from "../../types/settings";

export function useSettings() {
  const [settings, setSettings, loaded] = usePersistedState<Settings>("settings", DEFAULT_SETTINGS);
  return { settings, setSettings, loaded };
}
