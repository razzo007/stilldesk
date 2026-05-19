interface EmptyStateProps {
  title: string;
  body?: string;
}

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="grid min-h-60 place-items-center rounded-xl border border-dashed border-desk-border bg-desk-surface/55 p-8 text-center">
      <div>
        <p className="text-base font-medium text-desk-text">{title}</p>
        {body ? <p className="mt-2 max-w-sm text-sm leading-6 text-desk-muted">{body}</p> : null}
      </div>
    </div>
  );
}
