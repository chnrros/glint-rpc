export interface ApplicationProfile {
  id: string;
  label: string;
  /** A Discord Application ID from https://discord.com/developers/applications */
  appId: string;
}

// Glint's own application, kept in sync with DEFAULT_APPLICATION_ID in src-tauri/src/lib.rs
export const DEFAULT_PROFILE: ApplicationProfile = {
  id: "default",
  label: "Glint",
  appId: "1554406598556917832",
};
