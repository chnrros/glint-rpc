import { applyActivity, getClients, setApplicationId } from "./commands";
import type { ApplicationProfile } from "../types/profile";
import type { Preset } from "../types/preset";

const PROFILE_SWITCH_TIMEOUT_MS = 8000;

/** Switches `clientId` to `preset`'s Application Profile if needed, waits
 * for it to reconnect, then applies the preset. Each client tracks its own
 * Application ID independently, so this doesn't touch any other client. */
export async function applyPresetToClient(clientId: number, preset: Preset, profiles: ApplicationProfile[]) {
  const profile = profiles.find((p) => p.id === preset.profileId);
  if (profile) {
    await setApplicationId(clientId, profile.appId);

    const deadline = Date.now() + PROFILE_SWITCH_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const clients = await getClients();
      const client = clients.find((c) => c.id === clientId);
      if (client?.state === "connected") break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  await applyActivity(clientId, preset.payload);
}
