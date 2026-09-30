export type Tab = "editor" | "presets" | "settings" | "about";

const TABS: { id: Tab; label: string; enabled: boolean }[] = [
  { id: "editor", label: "Editor", enabled: true },
  { id: "presets", label: "Presets", enabled: true },
  { id: "settings", label: "Settings", enabled: true },
  { id: "about", label: "About", enabled: true },
];

export function Sidebar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="flex w-40 shrink-0 flex-col gap-1 p-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          disabled={!tab.enabled}
          title={tab.enabled ? undefined : "Coming in a later phase"}
          onClick={() => onChange(tab.id)}
          className={`rounded-md px-3 py-1.5 text-left text-sm ${
            active === tab.id
              ? "bg-indigo-500/15 text-indigo-300"
              : tab.enabled
                ? "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 light:text-neutral-500 light:hover:bg-neutral-100 light:hover:text-neutral-800"
                : "cursor-not-allowed text-neutral-700 light:text-neutral-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
