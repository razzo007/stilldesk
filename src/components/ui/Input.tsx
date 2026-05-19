import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm text-desk-text" htmlFor={inputId}>
      {label ? <span className="font-medium">{label}</span> : null}
      <input
        id={inputId}
        className={clsx(
          "h-10 rounded-lg border border-desk-border/80 bg-desk-surface px-3 text-sm text-desk-text placeholder:text-desk-muted/70 transition focus:border-desk-accent",
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs text-desk-muted">{hint}</span> : null}
    </label>
  );
}
