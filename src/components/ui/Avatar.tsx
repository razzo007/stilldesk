import { clsx } from "clsx";

interface AvatarProps {
  name?: string;
  src?: string | null;
  className?: string;
}

export function Avatar({ name = "User", src, className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={clsx("h-8 w-8 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-desk-border bg-desk-soft text-xs font-semibold text-desk-muted",
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
