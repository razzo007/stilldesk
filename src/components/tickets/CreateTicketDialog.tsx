import { ChevronDown, ChevronUp, ImagePlus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categories, categoryLabels, modules, priorities, priorityLabels } from "../../lib/constants";
import { validateAttachment } from "../../lib/storage";
import type { CreateTicketInput, TicketCategory, TicketPriority } from "../../types/ticket";
import type { Profile } from "../../types/user";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fileLabel = useMemo(() => {
    if (!files.length) return null;
    return files.map((f) => f.name).join(", ");
  }, [files]);

  const addFiles = useCallback(
    function addFiles(nextFiles: File[]) {
      setError("");
      const selected = [...files, ...nextFiles].slice(0, 3);
      const validation = selected.map(validateAttachment).find(Boolean);
      if (validation) {
        setError(validation);
        return;
      }
      setFiles(selected);
    },
    [files],
  );

  useEffect(() => {
    if (!open) return;

    function onPaste(event: ClipboardEvent) {
      const pasted = Array.from(event.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (pasted.length) {
        event.preventDefault();
        addFiles(pasted);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [addFiles, onClose, open]);

  function reset() {
    setTitle("");
    setDescription("");
    setCategory("frontend");
    setPriority("medium");
    setModule("");
    setAssignedTo("");
    setFiles([]);
    setError("");
    setDetailOpen(false);
  }

  async function submit() {
    if (!title.trim()) {
      setError("Add a title first.");
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
      reset();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create issue.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-0 pt-6 backdrop-blur-sm sm:items-center sm:py-6"
      onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose(); } }}
    >
      <section className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-desk-bg shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-desk-border/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-desk-text">New issue</h2>
            <p className="text-xs text-desk-muted">Title and screenshot are enough to start.</p>
          </div>
          <button
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-desk-muted transition hover:bg-desk-soft hover:text-desk-text"
            onClick={() => { reset(); onClose(); }}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 scrollbar-soft">
          {/* Title */}
          <Input
            autoFocus
            label="What broke?"
            name="title"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Pricing page CTA overlaps on mobile"
            required
            value={title}
          />

          {/* Screenshot zone — prominent */}
          <div className="mt-4">
            <label
              className={`relative flex min-h-[9rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition ${
                dragging
                  ? "border-desk-accent bg-desk-accentSoft/30"
                  : files.length
                    ? "border-desk-border bg-desk-soft/40"
                    : "border-desk-border/70 bg-desk-soft/20 hover:border-desk-muted hover:bg-desk-soft/40"
              }`}
              onDragEnter={() => setDragging(true)}
              onDragLeave={() => setDragging(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(Array.from(e.dataTransfer.files));
              }}
            >
              {files.length ? (
                <div className="w-full px-4 py-3">
                  <div className="grid gap-1.5">
                    {files.map((file, index) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-lg bg-desk-surface/70 px-3 py-2 text-sm"
                        key={`${file.name}-${index}`}
                      >
                        <span className="min-w-0 truncate text-xs text-desk-text">{file.name}</span>
                        <button
                          aria-label={`Remove ${file.name}`}
                          className="shrink-0 rounded p-0.5 text-desk-muted hover:text-desk-redText"
                          onClick={(e) => {
                            e.preventDefault();
                            setFiles((curr) => curr.filter((_, i) => i !== index));
                          }}
                          type="button"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {files.length < 3 && (
                      <p className="mt-1 text-center text-[11px] text-desk-muted">
                        + drop another (max 3)
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <ImagePlus className="h-7 w-7 text-desk-muted/60" aria-hidden="true" />
                  <span className="text-sm font-medium text-desk-muted">
                    Drop or paste a screenshot
                  </span>
                  <span className="text-[11px] text-desk-muted/60">PNG, JPG, WebP — max 3</span>
                </>
              )}
              <input
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="sr-only"
                multiple
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                type="file"
              />
            </label>
          </div>

          {/* Optional detail toggle */}
          <button
            className="mt-4 flex w-full items-center gap-2 rounded-lg px-1 py-2 text-xs text-desk-muted transition hover:text-desk-text"
            onClick={() => setDetailOpen((v) => !v)}
            type="button"
          >
            {detailOpen ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {detailOpen ? "Hide detail" : "Add context, owner, or priority"}
          </button>

          {detailOpen ? (
            <div className="mt-1 grid gap-4">
              <Textarea
                hint="Short is fine."
                label="Context"
                name="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Where did it happen? What did you expect?"
                value={description}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Category"
                  name="category"
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  options={categories.map((item) => ({ value: item, label: categoryLabels[item] }))}
                  value={category}
                />
                <Select
                  label="Priority"
                  name="priority"
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  options={priorities.map((item) => ({ value: item, label: priorityLabels[item] }))}
                  value={priority}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Owner"
                  name="assigned_to"
                  onChange={(e) => setAssignedTo(e.target.value)}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...profiles.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  value={assignedTo}
                />
                <Select
                  label="Module"
                  name="module"
                  onChange={(e) => setModule(e.target.value)}
                  options={[
                    { value: "", label: "Not sure" },
                    ...modules.map((item) => ({ value: item, label: item })),
                  ]}
                  value={module}
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-lg bg-desk-red px-3 py-2 text-sm text-desk-redText">{error}</p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-desk-border/70 px-5 py-4">
          <button
            className="text-xs text-desk-muted transition hover:text-desk-text"
            onClick={() => { reset(); onClose(); }}
            type="button"
          >
            Cancel
          </button>
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
      </section>
    </div>
  );
}
