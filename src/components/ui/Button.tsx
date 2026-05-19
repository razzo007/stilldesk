import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "border border-desk-border bg-desk-accent-soft text-desk-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-desk-soft",
  secondary: "border border-desk-border bg-desk-surface text-desk-text shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] hover:border-desk-muted",
  ghost: "text-desk-muted hover:bg-desk-soft hover:text-desk-text",
  danger: "bg-desk-red text-desk-redText hover:bg-[#efd9d6]",
};

export function Button({
  children,
  className,
  variant = "secondary",
  isLoading,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
