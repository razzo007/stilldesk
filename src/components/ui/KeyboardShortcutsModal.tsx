import { Modal } from "./Modal";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts: { keys: string[]; label: string }[] = [
  { keys: ["?"], label: "Show keyboard shortcuts" },
  { keys: ["⌘", "K"], label: "Search tickets" },
  { keys: ["N"], label: "New issue" },
  { keys: ["J"], label: "Next ticket" },
  { keys: ["K"], label: "Previous ticket" },
  { keys: ["Esc"], label: "Close panel or dialog" },
];

export function KeyboardShortcutsModal({ onClose, open }: KeyboardShortcutsModalProps) {
  return (
    <Modal
      description="These work anywhere outside a text input."
      onClose={onClose}
      open={open}
      title="Keyboard shortcuts"
    >
      <div className="grid gap-2">
        {shortcuts.map(({ keys, label }) => (
          <div
            className="flex items-center justify-between gap-4 rounded-xl border border-desk-border/60 bg-desk-soft/30 px-4 py-2.5"
            key={label}
          >
            <span className="text-sm text-desk-text">{label}</span>
            <span className="inline-flex shrink-0 items-center gap-1">
              {keys.map((key) => (
                <kbd
                  className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-desk-border bg-desk-surface px-1.5 py-0.5 text-xs font-medium text-desk-muted shadow-sm"
                  key={key}
                >
                  {key}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
