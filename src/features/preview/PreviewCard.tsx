import type { PresencePayload } from "../../types/presence";
import { useNow } from "../../hooks/useNow";
import { formatTiming } from "./formatTiming";

const TYPE_PREFIX: Record<NonNullable<PresencePayload["activity_type"]>, string> = {
  playing: "Playing",
  listening: "Listening to",
  watching: "Watching",
  competing: "Competing in",
};

function ImageSlot({ src, size }: { src: string | null; size: number }) {
  const isUrl = src?.startsWith("http");
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-800 text-[9px] text-neutral-500 light:bg-neutral-200"
      style={{ width: size, height: size }}
    >
      {isUrl && src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : src ? (
        <span className="truncate px-1 text-center">{src}</span>
      ) : null}
    </div>
  );
}

export function PreviewCard({ draft, appName }: { draft: PresencePayload; appName: string }) {
  const now = useNow();
  const timingLabel = formatTiming(draft.timing, now);
  const title = draft.name?.trim() || appName;
  // Discord only shows party size for the Playing activity type, confirmed
  // live: Watching/Listening/Competing accept and echo it over RPC but never
  // render it.
  const hasParty = draft.party_size !== null && draft.party_max !== null && draft.activity_type === "playing";

  return (
    <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900/80 p-4 light:bg-white/80">
      <div className="flex gap-3">
        <div className="relative">
          <ImageSlot src={draft.large_image} size={72} />
          {draft.small_image && (
            <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-neutral-900 light:border-white">
              <ImageSlot src={draft.small_image} size={24} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {TYPE_PREFIX[draft.activity_type ?? "playing"]}
          </span>
          <span className="truncate text-sm font-semibold text-neutral-100 light:text-neutral-900">{title}</span>
          {draft.details && (
            <span className="truncate text-sm text-neutral-300 light:text-neutral-700">{draft.details}</span>
          )}
          {draft.state && (
            <span className="truncate text-sm text-neutral-400 light:text-neutral-600">{draft.state}</span>
          )}
          {(timingLabel || hasParty) && (
            <span className="text-xs text-neutral-500">
              {[timingLabel, hasParty ? `${draft.party_size} of ${draft.party_max}` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </div>
      </div>

      {draft.buttons.length > 0 && (
        <div className="mt-3 flex gap-2">
          {draft.buttons.map((b, i) => (
            <div
              key={i}
              className="flex-1 truncate rounded-md border border-neutral-700 px-2 py-1 text-center text-xs text-neutral-300 light:border-neutral-300 light:text-neutral-700"
            >
              {b.label || `Button ${i + 1}`}
            </div>
          ))}
        </div>
      )}
      {draft.buttons.length > 0 && (
        <p className="mt-2 text-[11px] text-neutral-500">
          Buttons don't appear on your own profile — other people see them.
        </p>
      )}
    </div>
  );
}
