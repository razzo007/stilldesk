import { Paperclip, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categories, categoryLabels, modules, priorities, priorityLabels } from "../../lib/constants";
import { validateAttachment } from "../../lib/storage";
import type { CreateTicketInput, TicketCategory, TicketPriority } from "../../types/ticket";
import type { Profile } from "../../types/user";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface CreateTicketDialogProps {
  open: boolean;
  profiles: Profile[];
  onClose: () => void;
  onCreate: (input: CreateTicketInput) => Promise<void>;
}

export function CreateTicketDialog({ open, profiles, onClose, onCreate }: CreateTicketDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("frontend");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [module, setModule] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fileLabel = useMemo(() => {
    if (!files.length) return "PNG, JPG, JPEG, WebP. Max 3 screenshots.";
    return files.map((file) => file.name).join(", ");
  }, [files]);

  const addFiles = useCallback(function addFiles(nextFiles: File[]) {
    setError("");
    const selected = [...files, ...nextFiles].slice(0, 3);
    const validation = selected.map(validateAttachment).find(Boolean);

    if (validation) {
      setError(validation);
      return;
    }

    setFiles(selected);
  }, [files]);

  function setSelectedFiles(fileList: FileList | null) {
    addFiles(Array.from(fileList ?? []));
  }

  useEffect(() => {
    if (!open) return;

    function onPaste(event: ClipboardEvent) {
      const pasted = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (pasted.length) {
        event.preventDefault();
        addFiles(pasted);
      }
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles, open]);

  async function submit() {
    if (!title.trim()) {
      setError("What broke?");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        module: module || undefined,
        assigned_to: assignedTo || undefined,
        attachments: files,
      });
      setTitle("");
      setDescription("");
      setCategory("frontend");
      setPriority("medium");
      setModule("");
      setAssignedTo("");
      setFiles([]);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create issue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      description="Capture the issue, attach the clue, tag the owner if you know them."
      onClose={onClose}
      open={open}
      title="New issue"
    >
      <div className="grid gap-5">
        <Input
          label="What broke?"
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Pricing page CTA overlaps on mobile"
          required
          value={title}
        />

        <Textarea
          hint="Short is fine. The goal is clarity, not ceremony."
          label="Description"
          name="description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Where did it happen? What did you expect?"
          value={description}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            name="category"
            onChange={(event) => setCategory(event.target.value as TicketCategory)}
            options={categories.map((item) => ({ value: item, label: categoryLabels[item] }))}
            value={category}
          />
          <Select
            label="Priority"
            name="priority"
            onChange={(event) => setPriority(event.target.value as TicketPriority)}
            options={priorities.map((item) => ({ value: item, label: priorityLabels[item] }))}
            value={priority}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Module/page"
            name="module"
            onChange={(event) => setModule(event.target.value)}
            options={[
              { value: "", label: "Not sure" },
              ...modules.map((item) => ({ value: item, label: item })),
            ]}
            value={module}
          />
          <Select
            label="Tag owner"
            name="assigned_to"
            onChange={(event) => setAssignedTo(event.target.value)}
            options={[
              { value: "", label: "Unassigned" },
              ...profiles.map((profile) => ({ value: profile.id, label: profile.name })),
            ]}
            value={assignedTo}
          />
        </div>

        <label
          className="grid cursor-pointer gap-2 rounded-xl border border-dashed border-desk-border bg-desk-soft/45 p-5 text-sm text-desk-text transition hover:border-desk-muted"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <span className="flex items-center gap-2 font-medium">
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            Add screenshot
          </span>
          <span className="text-desk-muted">{fileLabel} Paste or drag screenshots here.</span>
          <input
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="sr-only"
            multiple
            onChange={(event) => setSelectedFiles(event.target.files)}
            type="file"
          />
        </label>

        {files.length ? (
          <div className="grid gap-2">
            {files.map((file, index) => (
              <div
                className="flex items-center justify-between gap-3 rounded-xl border border-desk-border bg-desk-surface px-3 py-2 text-sm"
                key={`${file.name}-${file.size}-${index}`}
              >
                <span className="min-w-0 truncate text-desk-text">{file.name}</span>
                <button
                  aria-label={`Remove ${file.name}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-desk-muted transition hover:bg-desk-soft hover:text-desk-text"
                  onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  type="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="rounded-lg bg-desk-red px-3 py-2 text-sm text-desk-redText">{error}</p> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-desk-border pt-5 sm:flex-row sm:justify-end">
          <Button onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            icon={<Plus className="h-4 w-4" aria-hidden="true" />}
            isLoading={saving}
            onClick={submit}
            type="button"
            variant="primary"
          >
            Create issue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
