export const ticketKeys = {
  all: ["tickets"] as const,
  list: (limit: number) => ["tickets", "list", limit] as const,
} as const;

export const authKeys = {
  currentProfile: () => ["auth", "currentProfile"] as const,
  profiles: () => ["auth", "profiles"] as const,
  platformAuthSettings: () => ["auth", "platformAuthSettings"] as const,
} as const;
