import type { PresencePayload } from "../types/presence";

export type FieldErrors = Partial<
  Record<
    | "details"
    | "state"
    | "detailsUrl"
    | "stateUrl"
    | "largeUrl"
    | "smallUrl"
    | "party"
    | `button${number}Label`
    | `button${number}Url`,
    string
  >
>;

const HTTPS_PREFIX = "https://";

function isHttpsUrl(value: string): boolean {
  return value.startsWith(HTTPS_PREFIX) && value.length > HTTPS_PREFIX.length;
}

export function validatePresence(draft: PresencePayload): FieldErrors {
  const errors: FieldErrors = {};

  if (draft.details && (draft.details.length < 2 || draft.details.length > 128)) {
    errors.details = "2–128 characters";
  }
  if (draft.state && (draft.state.length < 2 || draft.state.length > 128)) {
    errors.state = "2–128 characters";
  }
  if (draft.details_url && !isHttpsUrl(draft.details_url)) {
    errors.detailsUrl = "Must be an https:// URL";
  }
  if (draft.state_url && !isHttpsUrl(draft.state_url)) {
    errors.stateUrl = "Must be an https:// URL";
  }
  if (draft.large_url && !isHttpsUrl(draft.large_url)) {
    errors.largeUrl = "Must be an https:// URL";
  }
  if (draft.small_url && !isHttpsUrl(draft.small_url)) {
    errors.smallUrl = "Must be an https:// URL";
  }

  if ((draft.party_size !== null) !== (draft.party_max !== null)) {
    errors.party = "Set both current and max size";
  } else if (draft.party_size !== null && draft.party_max !== null) {
    if (draft.party_size < 1 || draft.party_max < 1) {
      errors.party = "Sizes must be at least 1";
    } else if (draft.party_size > draft.party_max) {
      errors.party = "Current size can't exceed max size";
    }
  }

  draft.buttons.forEach((button, i) => {
    if (button.label.length < 1 || button.label.length > 32) {
      errors[`button${i}Label`] = "1–32 characters";
    }
    if (!isHttpsUrl(button.url) || button.url.length > 512) {
      errors[`button${i}Url`] = "Must be an https:// URL, up to 512 characters";
    }
  });

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
