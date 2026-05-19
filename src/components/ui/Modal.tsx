import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, description, open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
      <section className="glass-panel max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-desk-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-desk-text">{title}</h2>
            {description ? <p className="mt-1 text-sm text-desk-muted">{description}</p> : null}
          </div>
          <Button
            aria-label="Close"
            className="h-9 min-h-9 w-9 px-0"
            icon={<X className="h-4 w-4" aria-hidden="true" />}
            onClick={onClose}
            variant="ghost"
          />
        </header>
        <div className="max-h-[calc(92vh-5rem)] overflow-y-auto px-6 py-5 scrollbar-soft">
          {children}
        </div>
      </section>
    </div>
  );
}
