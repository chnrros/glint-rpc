import { useCallback, useEffect, useRef, useState } from "react";
import { useConnectionStatus } from "./hooks/useConnectionStatus";
import {
  applyActivity,
  clearActivity,
  getConnectionStatus,
  setApplicationId,
  setMinimizeToTrayOnClose,
  syncTrayPresets,
} from "./lib/commands";
import { EditorView } from "./features/editor/EditorView";
import { PresetsView } from "./features/presets/PresetsView";
import { SettingsView } from "./features/settings/SettingsView";
import { AboutView } from "./features/about/AboutView";
import { useProfiles } from "./features/profiles/useProfiles";
import { usePresets } from "./features/presets/usePresets";
import { useRotation } from "./features/rotation/useRotation";
import { useSettings } from "./features/settings/useSettings";
import { useTheme } from "./hooks/useTheme";
import { Sidebar, type Tab } from "./components/Sidebar";
import { EMPTY_PRESENCE, type PresencePayload } from "./types/presence";
import { DEFAULT_PROFILE } from "./types/profile";
import type { Preset } from "./types/preset";
import { hasErrors, validatePresence } from "./lib/validation";

const APP_NAME = "Glint";
const PROFILE_SWITCH_TIMEOUT_MS = 8000;

const STATUS_LABEL: Record<string, string> = {
  disconnected: "Discord not running",
  connecting: "Reconnecting…",
  connected: "Connected",
};

const STATUS_DOT: Record<string, string> = {
  disconnected: "bg-red-500",
  connecting: "bg-amber-400",
  connected: "bg-emerald-500",
};

function App() {
  const status = useConnectionStatus();
  const [tab, setTab] = useState<Tab>("editor");
  const [draft, setDraft] = useState<PresencePayload>(EMPTY_PRESENCE);
  const [applied, setApplied] = useState<PresencePayload | null>(null);
  const [activeProfileId, setActiveProfileId] = useState(DEFAULT_PROFILE.id);
  const [error, setError] = useState<string | null>(null);
  // Guards Start/Update/Stop against a double click or an overlapping call
  // firing a second, concurrent apply_activity/clear_activity. The Rust
  // side now rate-limits and coalesces these too, but one click should
  // still mean exactly one request going out from here.
  const [pending, setPending] = useState(false);

  const profilesApi = useProfiles();
  const presetsApi = usePresets();
  const settingsApi = useSettings();
  const themeApi = useTheme();

  const errors = validatePresence(draft);
  const isActive = applied !== null;
  const unsaved = isActive && JSON.stringify(draft) !== JSON.stringify(applied);
  const canApply = status.state === "connected" && !hasErrors(errors);

  /** Switches the connection to `profileId`'s Application ID and waits for
   * it to reconnect, if it isn't already the active one. */
  const switchProfile = useCallback(
    async (profileId: string) => {
      if (profileId === activeProfileId) return;
      const profile = profilesApi.profiles.find((p) => p.id === profileId);
      if (!profile) return;

      await setApplicationId(profile.appId);
      setActiveProfileId(profileId);

      const deadline = Date.now() + PROFILE_SWITCH_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const latest = await getConnectionStatus();
        if (latest.state === "connected") return;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    },
    [activeProfileId, profilesApi.profiles],
  );

  const applyPreset = useCallback(
    async (preset: Preset) => {
      await switchProfile(preset.profileId);
      await applyActivity(preset.payload);
    },
    [switchProfile],
  );

  const rotationApi = useRotation(presetsApi.presets, applyPreset);

  function handleLoadPreset(preset: Preset) {
    setDraft(preset.payload);
    void switchProfile(preset.profileId);
  }

  async function handleStart() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await applyActivity(draft);
      setApplied(draft);
    } catch (err) {
      setError(`Failed to apply: ${String(err)}`);
    } finally {
      setPending(false);
    }
  }

  async function handleStop() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await clearActivity();
      setApplied(null);
    } catch (err) {
      setError(`Failed to clear: ${String(err)}`);
    } finally {
      setPending(false);
    }
  }

  // Keep the tray menu's preset list in sync: Rust has no other way to
  // know what presets exist.
  useEffect(() => {
    const trayPresets = presetsApi.presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      app_id: profilesApi.profiles.find((p) => p.id === preset.profileId)?.appId ?? DEFAULT_PROFILE.appId,
      payload: preset.payload,
    }));
    void syncTrayPresets(trayPresets);
  }, [presetsApi.presets, profilesApi.profiles]);

  // Push the "minimize to tray on close" preference to Rust, which owns the
  // actual window close handling.
  useEffect(() => {
    void setMinimizeToTrayOnClose(settingsApi.settings.minimizeToTrayOnClose);
  }, [settingsApi.settings.minimizeToTrayOnClose]);

  // Apply the first saved preset once, as soon as Discord connects, if the
  // user opted in.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    if (!settingsApi.settings.startPresenceAutomatically) return;
    if (status.state !== "connected") return;
    const first = presetsApi.presets[0];
    if (!first) return;

    autoStarted.current = true;
    void (async () => {
      await switchProfile(first.profileId);
      try {
        await applyActivity(first.payload);
        setDraft(first.payload);
        setApplied(first.payload);
      } catch {
        // Best-effort: the user can still start manually from the editor.
      }
    })();
  }, [settingsApi.settings.startPresenceAutomatically, status.state, presetsApi.presets, switchProfile]);

  return (
    <div className="flex h-screen flex-col text-neutral-100 light:text-neutral-900">
      <header className="flex items-center justify-between px-6 py-3">
        <div className="flex gap-2">
          {/* Fixed to text-2xl's 32px line-height + text-xs's 16px line-height
              below, so it spans exactly the "Glint" + subtext block. */}
          <svg
            viewBox="0 0 128 128"
            className="h-12 w-12 shrink-0 text-indigo-400 light:text-indigo-600"
            aria-hidden="true"
          >
            <polygon
              points="64.0,10.0 78.1,49.9 118.0,64.0 78.1,78.1 64.0,118.0 49.9,78.1 10.0,64.0 49.9,49.9"
              fill="currentColor"
            />
          </svg>
          <div className="shrink-0">
            <h1 className="font-wordmark text-2xl tracking-tight">Glint</h1>
            <p className="whitespace-nowrap text-xs text-neutral-500">Custom Discord Presence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unsaved && <span className="text-xs text-amber-400">Unsaved changes</span>}
          {rotationApi.running && <span className="text-xs text-indigo-400">Rotation running</span>}
          <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 light:border-neutral-200 light:bg-white">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status.state]}`} />
            <span className="text-xs text-neutral-300 light:text-neutral-600">{STATUS_LABEL[status.state]}</span>
          </div>
          <button
            onClick={handleStart}
            disabled={!canApply || pending}
            className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 light:disabled:bg-neutral-200 light:disabled:text-neutral-400"
          >
            {isActive ? "Update" : "Start"}
          </button>
          <button
            onClick={handleStop}
            disabled={!isActive || pending}
            className="rounded-lg border border-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-600 light:border-neutral-300 light:text-neutral-700 light:hover:bg-neutral-100 light:disabled:text-neutral-400"
          >
            Stop
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-950/60 px-6 py-2 text-sm text-red-300 light:bg-red-50 light:text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={tab} onChange={setTab} />
        <div className="flex-1 overflow-y-auto">
          {tab === "editor" && (
            <EditorView draft={draft} onChange={setDraft} errors={errors} appName={APP_NAME} />
          )}
          {tab === "presets" && (
            <PresetsView
              profilesApi={profilesApi}
              presetsApi={presetsApi}
              rotationApi={rotationApi}
              draft={draft}
              activeProfileId={activeProfileId}
              onLoadPreset={handleLoadPreset}
            />
          )}
          {tab === "settings" && (
            <SettingsView
              settings={settingsApi.settings}
              onChange={settingsApi.setSettings}
              profilesApi={profilesApi}
              theme={themeApi.theme}
              onThemeChange={themeApi.setTheme}
            />
          )}
          {tab === "about" && <AboutView />}
        </div>
      </div>
    </div>
  );
}

export default App;
