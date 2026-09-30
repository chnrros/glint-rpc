import { useEffect, useState } from "react";
import { disable as disableAutostart, enable as enableAutostart, isEnabled as autostartEnabled } from "@tauri-apps/plugin-autostart";
import { SectionCard } from "../../components/SectionCard";
import { Toggle } from "../../components/Toggle";
import { ProfileManager } from "../profiles/ProfileManager";
import type { useProfiles } from "../profiles/useProfiles";
import type { Settings } from "../../types/settings";
import type { Theme } from "../../hooks/useTheme";
import { resetAllData } from "../../lib/store";

interface SettingsViewProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  profilesApi: ReturnType<typeof useProfiles>;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function SettingsView({ settings, onChange, profilesApi, theme, onThemeChange }: SettingsViewProps) {
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [launchOnStartupLoaded, setLaunchOnStartupLoaded] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    autostartEnabled()
      .then(setLaunchOnStartup)
      .catch(() => undefined)
      .finally(() => setLaunchOnStartupLoaded(true));
  }, []);

  async function toggleLaunchOnStartup(checked: boolean) {
    setLaunchOnStartup(checked);
    try {
      if (checked) {
        await enableAutostart();
      } else {
        await disableAutostart();
      }
    } catch {
      setLaunchOnStartup(!checked);
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        "Reset all data? This deletes every application profile, preset, and setting. This can't be undone.",
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await resetAllData();
      window.location.reload();
    } catch {
      setResetting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SectionCard title="Appearance">
        <Toggle
          label="Light theme"
          description="Glint is dark by default — switch to a light interface instead."
          checked={theme === "light"}
          onChange={(checked) => onThemeChange(checked ? "light" : "dark")}
        />
      </SectionCard>

      <SectionCard title="Startup and background">
        <Toggle
          label="Launch on startup"
          description="Open Glint automatically when you log in."
          checked={launchOnStartup}
          disabled={!launchOnStartupLoaded}
          onChange={toggleLaunchOnStartup}
        />
        <Toggle
          label="Start presence automatically"
          description="Apply your first saved preset as soon as Discord connects."
          checked={settings.startPresenceAutomatically}
          onChange={(checked) => onChange({ ...settings, startPresenceAutomatically: checked })}
        />
        <Toggle
          label="Minimize to tray on close"
          description="Closing the window keeps Glint running in the tray instead of quitting."
          checked={settings.minimizeToTrayOnClose}
          onChange={(checked) => onChange({ ...settings, minimizeToTrayOnClose: checked })}
        />
      </SectionCard>

      <details className="group rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900/60 light:bg-white/70">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-neutral-200 marker:content-none light:text-neutral-800">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90">▶</span>
          Advanced
        </summary>
        <div className="border-t border-neutral-800 p-4 light:border-neutral-200">
          <p className="mb-3 text-xs text-neutral-500">
            The "Playing ___" name override already works for most people — only change this if you want presets to
            run under your own Discord application instead of Glint's.
          </p>
          <ProfileManager
            profiles={profilesApi.profiles}
            onAdd={profilesApi.addProfile}
            onUpdate={profilesApi.updateProfile}
            onRemove={profilesApi.removeProfile}
          />
        </div>
      </details>

      <SectionCard title="Reset">
        <p className="text-xs text-neutral-500">
          Permanently deletes every application profile, preset, and setting stored locally.
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-fit rounded-md border border-red-900/60 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Reset all data"}
        </button>
      </SectionCard>
    </div>
  );
}
