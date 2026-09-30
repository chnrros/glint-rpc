import type { PresencePayload } from "../../types/presence";

export function MemberListLine({ draft, appName }: { draft: PresencePayload; appName: string }) {
  const title = draft.name?.trim() || appName;
  const statusText =
    draft.status_display === "state"
      ? draft.state
      : draft.status_display === "details"
        ? draft.details
        : title;

  return (
    <div className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900/80 px-3 py-2 light:bg-white/80">
      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      <span className="truncate text-sm text-neutral-200 light:text-neutral-800">
        <span className="font-medium">You</span>
        {statusText && <span className="text-neutral-400 light:text-neutral-500"> — {statusText}</span>}
      </span>
    </div>
  );
}
