import { clsx } from "clsx";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="grid gap-2 text-sm text-desk-text" htmlFor={textareaId}>
      {label ? <span className="font-medium">{label}</span> : null}
      <textarea
        id={textareaId}
        className={clsx(
          "min-h-24 resize-y rounded-lg border border-desk-border/80 bg-desk-surface px-3 py-3 text-sm leading-6 text-desk-text placeholder:text-desk-muted/70 transition focus:border-desk-accent",
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs text-desk-muted">{hint}</span> : null}
    </label>
  );
}
