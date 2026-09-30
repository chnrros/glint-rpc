import { ClientsPanel } from "../clients/ClientsPanel";
import { PresetList } from "./PresetList";
import { RotationPanel } from "../rotation/RotationPanel";
import type { useProfiles } from "../profiles/useProfiles";
import type { usePresets } from "./usePresets";
import type { useRotation } from "../rotation/useRotation";
import type { ClientStatus } from "../../types/connection";
import type { Preset } from "../../types/preset";
import type { PresencePayload } from "../../types/presence";

interface PresetsViewProps {
  profilesApi: ReturnType<typeof useProfiles>;
  presetsApi: ReturnType<typeof usePresets>;
  rotationApi: ReturnType<typeof useRotation>;
  clients: ClientStatus[];
  draft: PresencePayload;
  activeProfileId: string;
  onLoadPreset: (preset: Preset) => void;
}

export function PresetsView({
  profilesApi,
  presetsApi,
  rotationApi,
  clients,
  draft,
  activeProfileId,
  onLoadPreset,
}: PresetsViewProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <ClientsPanel clients={clients} presets={presetsApi.presets} profiles={profilesApi.profiles} />
      <PresetList
        presets={presetsApi.presets}
        loaded={presetsApi.loaded}
        profiles={profilesApi.profiles}
        activeProfileId={activeProfileId}
        onCreateFromDraft={(name, profileId) => presetsApi.createFromDraft(name, profileId, draft)}
        onRename={presetsApi.rename}
        onSetProfile={presetsApi.setProfile}
        onDuplicate={presetsApi.duplicate}
        onRemove={presetsApi.remove}
        onMove={presetsApi.move}
        onLoad={onLoadPreset}
        onReplaceAll={presetsApi.replaceAll}
      />
      <RotationPanel
        presets={presetsApi.presets}
        settings={rotationApi.settings}
        onChange={rotationApi.setSettings}
        running={rotationApi.running}
        onToggle={rotationApi.setRunning}
      />
    </div>
  );
}
