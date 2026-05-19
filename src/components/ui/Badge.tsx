import { clsx } from "clsx";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "accent" | "green" | "amber" | "red";
  className?: string;
}

const tones = {
  neutral: "bg-desk-soft/70 text-desk-muted",
  accent: "bg-desk-accentSoft/75 text-desk-accent",
  green: "bg-desk-green/80 text-desk-greenText",
  amber: "bg-desk-amber/80 text-desk-amberText",
  red: "bg-desk-red/80 text-desk-redText",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
