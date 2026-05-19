import { clsx } from "clsx";
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm text-desk-text" htmlFor={selectId}>
      {label ? <span className="font-medium">{label}</span> : null}
      <select
        id={selectId}
        className={clsx(
          "h-10 rounded-xl border border-desk-border/80 bg-desk-surface px-3 text-sm text-desk-text shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition focus:border-desk-accent",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
