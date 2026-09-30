import { openUrl } from "@tauri-apps/plugin-opener";
import { SectionCard } from "../../components/SectionCard";
import pkg from "../../../package.json";

const GITHUB_URL = "https://github.com/chnrros/glint-rpc";

export function AboutView() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SectionCard title="Glint">
        <p className="text-sm text-neutral-300 light:text-neutral-700">Version {pkg.version}</p>
        <button
          onClick={() => void openUrl(GITHUB_URL)}
          className="w-fit text-sm text-indigo-400 hover:text-indigo-300"
        >
          View on GitHub ↗
        </button>
        <p className="text-xs text-neutral-500">Licensed under the MIT License.</p>
      </SectionCard>

      <SectionCard title="Privacy">
        <p className="text-sm font-medium text-neutral-200 light:text-neutral-800">
          No token. No tracking. 100% local.
        </p>
        <p className="text-xs text-neutral-500">
          Glint never asks for your Discord account token, never talks to the Discord HTTP API, and sends no
          analytics or telemetry anywhere. Presence goes only through Discord's official local IPC to the Discord
          desktop app running on your machine. Everything else — profiles, presets, settings — stays in a file on
          your computer.
        </p>
      </SectionCard>
    </div>
  );
}
