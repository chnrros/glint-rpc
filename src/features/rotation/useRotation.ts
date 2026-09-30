import { useEffect, useMemo, useRef, useState } from "react";
import { usePersistedState } from "../../hooks/usePersistedState";
import { DEFAULT_ROTATION, MIN_ROTATION_INTERVAL_SECONDS, type RotationSettings } from "../../types/preset";
import type { Preset } from "../../types/preset";

/**
 * Owns the rotation timer. `applyPreset` is expected to switch the active
 * profile if needed and push the preset's activity to Discord: rotation
 * itself only decides *when* and *which preset is next*. `applyPreset`
 * must be a stable reference (wrap it in `useCallback` in the caller), or
 * every render would tear down and restart the timer.
 */
export function useRotation(presets: Preset[], applyPreset: (preset: Preset) => Promise<void>) {
  const [settings, setSettings, loaded] = usePersistedState<RotationSettings>("rotation", DEFAULT_ROTATION);
  const [running, setRunning] = useState(false);
  const indexRef = useRef(0);

  const activePresets = useMemo(
    () => settings.presetIds.map((id) => presets.find((p) => p.id === id)).filter((p): p is Preset => p !== undefined),
    [presets, settings.presetIds],
  );

  useEffect(() => {
    if (!running || activePresets.length === 0) return;

    indexRef.current = 0;
    void applyPreset(activePresets[0]);

    const id = setInterval(
      () => {
        indexRef.current = (indexRef.current + 1) % activePresets.length;
        void applyPreset(activePresets[indexRef.current]);
      },
      Math.max(settings.intervalSeconds, MIN_ROTATION_INTERVAL_SECONDS) * 1000,
    );

    return () => clearInterval(id);
  }, [running, settings.intervalSeconds, activePresets, applyPreset]);

  return { settings, setSettings, loaded, running, setRunning, activePresets };
}
