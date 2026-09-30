import type { Timing } from "../../types/presence";

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function formatTiming(timing: Timing | null, now: number): string | null {
  if (!timing || timing.mode === "off") return null;
  if (timing.mode === "elapsed_since_start") {
    return `${formatDuration(now - timing.start_ms)} elapsed`;
  }
  return `${formatDuration(timing.end_ms - now)} left`;
}
