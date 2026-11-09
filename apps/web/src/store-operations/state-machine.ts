export const preparationTicketStates = [
  "queued",
  "accepted",
  "preparing",
  "ready",
  "collected",
  "rejected",
  "cancelled",
  "remake_required",
] as const;

export type PreparationTicketState = (typeof preparationTicketStates)[number];

const allowedTransitions: Readonly<Record<PreparationTicketState, readonly PreparationTicketState[]>> = {
  queued: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "rejected", "cancelled"],
  preparing: ["ready", "remake_required", "cancelled"],
  ready: ["collected", "remake_required"],
  collected: [],
  rejected: [],
  cancelled: [],
  remake_required: ["queued", "cancelled"],
};

export function canTransitionPreparationTicket(
  from: PreparationTicketState,
  to: PreparationTicketState,
) {
  return allowedTransitions[from].includes(to);
}

export function assertPreparationTicketTransition(
  from: PreparationTicketState,
  to: PreparationTicketState,
) {
  if (!canTransitionPreparationTicket(from, to)) {
    throw new Error(`Invalid preparation-ticket transition: ${from} -> ${to}`);
  }
}

export function requiresTerminalReason(state: PreparationTicketState) {
  return state === "rejected" || state === "cancelled" || state === "remake_required";
}
