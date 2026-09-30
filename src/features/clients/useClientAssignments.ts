import { usePersistedState } from "../../hooks/usePersistedState";

/** Assigned to a client to keep its presence cleared no matter what else
 * happens: another client being updated, Apply to all, or rotation. */
export const NONE_ASSIGNMENT = "none";

/** What each Discord account runs: a saved preset's id, `NONE_ASSIGNMENT`,
 * or unset (no entry) if the user hasn't chosen anything for it yet.
 * Keyed by the account's username rather than its discord-ipc slot number,
 * since the slot a client ends up on isn't stable across restarts. */
export function useClientAssignments() {
  const [assignments, setAssignments] = usePersistedState<Record<string, string>>("clientAssignments", {});

  function setAssignment(username: string, value: string) {
    setAssignments({ ...assignments, [username]: value });
  }

  function assignmentFor(username: string | null | undefined): string | undefined {
    if (!username) return undefined;
    return assignments[username];
  }

  return { assignments, setAssignment, assignmentFor };
}
