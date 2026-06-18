import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TicketState {
  selectedId: string | undefined;
  limit: number;
}

interface TicketActions {
  select(id: string | undefined): void;
  loadMore(): void;
  resetSelection(): void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTicketStore = create<TicketState & TicketActions>()(
  devtools(
    (set, get) => ({
      selectedId: undefined,
      limit: 50,

      select: (id) => set({ selectedId: id }, false, "tickets/selected"),

      loadMore: () => set({ limit: get().limit + 50 }, false, "tickets/loadMore"),

      resetSelection: () => set({ selectedId: undefined }, false, "tickets/resetSelection"),
    }),
    { name: "StillDesk/tickets" },
  ),
);
