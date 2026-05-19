import type { ReactNode } from "react";

type MetricTone = "neutral" | "amber" | "green" | "blue";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  note?: string;
  tone?: MetricTone;
}

const toneClass: Record<MetricTone, string> = {
  neutral: "glass-panel",
  amber: "glass-panel metric-tone-amber",
  green: "glass-panel metric-tone-green",
  blue: "glass-panel metric-tone-blue",
};

const toneValueClass: Record<MetricTone, string> = {
  neutral: "text-desk-text",
  amber: "text-desk-amberText",
  green: "text-desk-greenText",
  blue: "text-desk-blueText",
};

export function MetricCard({ label, note, tone = "neutral", value }: MetricCardProps) {
  return (
    <section className={`${toneClass[tone]} rounded-2xl p-5`}>
      <p className="text-sm text-desk-muted">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${toneValueClass[tone]}`}>{value}</p>
      {note ? <p className="mt-2 text-sm text-desk-muted">{note}</p> : null}
    </section>
  );
}
