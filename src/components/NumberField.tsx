import { inputClass, labelClass } from "./fieldStyles";

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
}

export function NumberField({ label, value, onChange, min }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        className={inputClass}
        value={value ?? ""}
        min={min}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
}
