import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  note?: string;
}

export function MetricCard({ label, value, note }: MetricCardProps) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <p className="text-sm text-desk-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-desk-text">{value}</p>
      {note ? <p className="mt-2 text-sm text-desk-muted">{note}</p> : null}
    </section>
  );
}
