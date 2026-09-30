import { inputClass, labelClass } from "./fieldStyles";

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  hint?: string;
  /** Shown as a hoverable "?" next to the label, for a short how-to, not an error. */
  labelHelp?: string;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  error,
  hint,
  labelHelp,
}: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`flex items-baseline justify-between ${labelClass}`}>
        <span className="inline-flex items-center gap-1">
          {label}
          {labelHelp && (
            <span
              title={labelHelp}
              className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-neutral-600 text-[9px] leading-none text-neutral-500 light:border-neutral-400"
            >
              ?
            </span>
          )}
        </span>
        {maxLength && (
          <span className="tabular-nums text-neutral-500">
            {value.length}/{maxLength}
          </span>
        )}
      </span>
      <input
        type="text"
        className={inputClass}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <span className="text-xs text-red-400">{error}</span>
      ) : (
        hint && <span className="text-xs text-neutral-500">{hint}</span>
      )}
    </label>
  );
}
