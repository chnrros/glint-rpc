export interface Settings {
  /** Apply the first saved preset automatically once Discord connects on launch. */
  startPresenceAutomatically: boolean;
  /** Closing the window hides it to the tray instead of quitting. */
  minimizeToTrayOnClose: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  startPresenceAutomatically: false,
  minimizeToTrayOnClose: true,
};
