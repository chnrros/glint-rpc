import type { ReactNode } from "react";

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-neutral-900/60 p-4 light:bg-white/70">
      <h2 className="mb-3 text-sm font-semibold text-neutral-200 light:text-neutral-800">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
