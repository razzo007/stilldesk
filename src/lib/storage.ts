import { ATTACHMENT_BUCKET } from "./constants";
import { isSupabaseConfigured, supabase } from "./supabase";

const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;

export function validateAttachment(file: File) {
  if (!allowedTypes.includes(file.type)) {
    return "Use PNG, JPG, JPEG, or WebP screenshots.";
  }

  if (file.size > maxFileSize) {
    return "Screenshots must be 5MB or smaller.";
  }

  return null;
}

export async function uploadTicketAttachment(ticketId: string, file: File, userId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      file_path: URL.createObjectURL(file),
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${ticketId}/${userId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) throw error;

  return {
    file_path: filePath,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  };
}

export async function createSignedAttachmentUrl(path: string) {
  if (!isSupabaseConfigured || !supabase) return path;

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error) throw error;
  return data.signedUrl;
}

export async function uploadProfileAvatar(userId: string, file: File) {
  const validation = validateAttachment(file);
  if (validation) throw new Error(validation);

  if (!isSupabaseConfigured || !supabase) return URL.createObjectURL(file);

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("stilldesk-avatars").upload(filePath, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("stilldesk-avatars").getPublicUrl(filePath);
  return data.publicUrl;
}
