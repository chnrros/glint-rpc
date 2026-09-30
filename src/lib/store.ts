import { LazyStore } from "@tauri-apps/plugin-store";

// One store file for all of Glint's local settings: profiles, presets,
// rotation config. Lazy: the underlying file isn't touched until the first
// get/set, so app startup doesn't pay for it up front.
const store = new LazyStore("glint-data.json");

export async function loadValue<T>(key: string, fallback: T): Promise<T> {
  const value = await store.get<T>(key);
  return value ?? fallback;
}

export async function saveValue<T>(key: string, value: T): Promise<void> {
  await store.set(key, value);
  await store.save();
}

/** Wipes every stored key (profiles, presets, rotation, settings, theme). */
export async function resetAllData(): Promise<void> {
  await store.clear();
  await store.save();
}
