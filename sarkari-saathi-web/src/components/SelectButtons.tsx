"use client";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string | undefined;
  onChange: (value: string) => void;
  /** Accessible name for the group. */
  label: string;
  /** Tapping the selected option again clears it (for optional fields). */
  allowClear?: boolean;
}

// Pill buttons used in place of dropdowns.
export default function SelectButtons({ options, value, onChange, label, allowClear }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(allowClear && selected ? "" : o.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              selected
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink hover:border-primary/50 hover:bg-primary-light"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
