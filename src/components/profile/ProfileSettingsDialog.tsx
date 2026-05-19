import { useState } from "react";
import { updateProfile } from "../../lib/auth";
import { uploadProfileAvatar } from "../../lib/storage";
import type { Profile } from "../../types/user";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";

interface ProfileSettingsDialogProps {
  open: boolean;
  profile: Profile;
  onClose: () => void;
  onProfileChange: (profile: Profile) => void;
}

export function ProfileSettingsDialog({
  onClose,
  onProfileChange,
  open,
  profile,
}: ProfileSettingsDialogProps) {
  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const updated = await updateProfile({
        id: profile.id,
        name: name.trim() || profile.name,
        avatar_url: avatarUrl || null,
      });
      onProfileChange({ ...profile, ...updated });
      setMessage("Profile saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setSaving(true);
    setError("");

    try {
      const url = await uploadProfileAvatar(profile.id, file);
      setAvatarUrl(url);
      const updated = await updateProfile({ id: profile.id, name, avatar_url: url });
      onProfileChange({ ...profile, ...updated, avatar_url: url });
      setMessage("Profile image updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload image.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} open={open} title="Profile settings">
      <div className="grid gap-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 text-base" name={name} src={avatarUrl} />
          <label className="cursor-pointer rounded-lg border border-desk-border bg-desk-bg px-3 py-2 text-sm text-desk-text">
            Upload image
            <input
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="sr-only"
              onChange={(event) => upload(event.target.files?.[0])}
              type="file"
            />
          </label>
        </div>

        <Input label="Name" onChange={(event) => setName(event.target.value)} value={name} />
        <Input label="Email" readOnly value={profile.email} />

        {message ? <p className="rounded-lg bg-desk-green px-3 py-2 text-sm text-desk-greenText">{message}</p> : null}
        {error ? <p className="rounded-lg bg-desk-red px-3 py-2 text-sm text-desk-redText">{error}</p> : null}

        <div className="flex justify-end gap-3 border-t border-desk-border pt-5">
          <Button onClick={onClose} variant="ghost">Close</Button>
          <Button isLoading={saving} onClick={save}>Save profile</Button>
        </div>
      </div>
    </Modal>
  );
}
