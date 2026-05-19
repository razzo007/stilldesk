import { ExternalLink, ImageIcon } from "lucide-react";
import type { TicketAttachment } from "../../types/ticket";

export function AttachmentPreview({ attachments }: { attachments: TicketAttachment[] }) {
  if (!attachments.length) {
    return (
      <p className="text-sm text-desk-muted">
        No screenshot attached.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {attachments.map((attachment) => (
        <a
          className="group overflow-hidden rounded-xl border border-desk-border bg-desk-surface"
          href={attachment.signed_url ?? attachment.file_path}
          key={attachment.id}
          rel="noreferrer"
          target="_blank"
        >
          {attachment.file_type.startsWith("image/") ? (
            <img
              alt={attachment.file_name}
              className="max-h-64 w-full object-cover"
              loading="lazy"
              src={attachment.signed_url ?? attachment.file_path}
            />
          ) : (
            <div className="grid h-36 place-items-center bg-desk-soft">
              <ImageIcon className="h-8 w-8 text-desk-muted" aria-hidden="true" />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-desk-muted">
            <span className="truncate">{attachment.file_name}</span>
            <ExternalLink className="h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
          </div>
        </a>
      ))}
    </div>
  );
}
