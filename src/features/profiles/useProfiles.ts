import { usePersistedState } from "../../hooks/usePersistedState";
import { DEFAULT_PROFILE, type ApplicationProfile } from "../../types/profile";

export function useProfiles() {
  const [profiles, setProfiles, loaded] = usePersistedState<ApplicationProfile[]>("profiles", [DEFAULT_PROFILE]);

  function addProfile(label: string, appId: string) {
    setProfiles([...profiles, { id: crypto.randomUUID(), label, appId }]);
  }

  function updateProfile(id: string, patch: Partial<Pick<ApplicationProfile, "label" | "appId">>) {
    setProfiles(profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removeProfile(id: string) {
    if (id === DEFAULT_PROFILE.id) return;
    setProfiles(profiles.filter((p) => p.id !== id));
  }

  return { profiles, loaded, addProfile, updateProfile, removeProfile };
}
