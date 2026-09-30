interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className={`flex items-start justify-between gap-4 ${disabled ? "opacity-50" : ""}`}>
      <span className="flex flex-col">
        <span className="text-sm text-neutral-200 light:text-neutral-800">{label}</span>
        {description && <span className="text-xs text-neutral-500 light:text-neutral-500">{description}</span>}
      </span>
      <span className="mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`block h-5 w-9 cursor-pointer rounded-full transition-colors ${
            checked ? "bg-indigo-500" : "bg-neutral-700 light:bg-neutral-300"
          }`}
        >
          <span
            className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform ${
              checked ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </span>
      </span>
    </label>
  );
}
