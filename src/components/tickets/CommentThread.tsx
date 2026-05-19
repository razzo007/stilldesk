import { Send } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { formatDate } from "./time";
import type { TicketComment } from "../../types/ticket";
import type { Profile } from "../../types/user";

interface CommentThreadProps {
  comments: TicketComment[];
  profiles: Profile[];
  onSubmit: (comment: string, taggedUserId?: string) => Promise<void>;
}

export function CommentThread({ comments, onSubmit, profiles }: CommentThreadProps) {
  const [value, setValue] = useState("");
  const [taggedUserId, setTaggedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value.trim()) return;
    setSaving(true);
    await onSubmit(value.trim(), taggedUserId || undefined);
    setValue("");
    setTaggedUserId("");
    setSaving(false);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        {comments.length ? (
          comments.map((comment) => (
            <article className="flex gap-3" key={comment.id}>
              <Avatar name={comment.user?.name ?? "User"} />
              <div className="min-w-0 flex-1 rounded-xl border border-desk-border bg-desk-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium text-desk-text">{comment.user?.name ?? "Someone"}</span>
                  <span className="text-xs text-desk-muted">{formatDate(comment.created_at)}</span>
                </div>
                {comment.tagged_user ? (
                  <p className="mt-2 text-xs text-desk-muted">Mentioned {comment.tagged_user.name}</p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-desk-text">{comment.comment}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-desk-border bg-desk-surface p-4 text-sm text-desk-muted">
            No comments yet. Leave the next useful clue.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-desk-border bg-desk-surface p-4">
        <Textarea
          label="Discuss"
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add context, blockers, or verification notes."
          value={value}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Select
            className="min-w-48"
            label="Mention"
            name="tagged_user_id"
            onChange={(event) => setTaggedUserId(event.target.value)}
            options={[
              { value: "", label: "No mention" },
              ...profiles.map((profile) => ({ value: profile.id, label: profile.name })),
            ]}
            value={taggedUserId}
          />
          <Button
            icon={<Send className="h-4 w-4" aria-hidden="true" />}
            isLoading={saving}
            onClick={submit}
            variant="primary"
          >
            Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
