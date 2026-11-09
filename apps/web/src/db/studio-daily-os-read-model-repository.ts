import { getStudioOperationsWorkbenchReadModel } from "./studio-operations-workbench-read-model-repository";
import type { RoleKey } from "@/lib/roles";

export async function getStudioDailyOsReadModel(role: RoleKey) {
  const workbench = await getStudioOperationsWorkbenchReadModel(role);
  return {
    access: workbench.access,
    status: workbench.sourceHealth.status === "ready" ? "ready" : workbench.sourceHealth.status,
    summary: {
      membersActive: workbench.summary.membersActive,
      checkinsToday: workbench.summary.checkinsToday,
      classesToday: workbench.summary.classesToday,
      bookingsToday: workbench.summary.bookingsToday,
      trainersOnShift: workbench.summary.trainersOnShift,
      paymentExceptions: workbench.summary.paymentExceptions,
      openSupportRequests: workbench.summary.openSupportRequests,
      highRiskMembers: workbench.summary.highRiskMembers,
      commandDrafts: workbench.summary.commandDrafts,
    },
    dayLanes: [
      { key: "member-exceptions", label: "Member exceptions", rows: workbench.memberExceptions.length, nextAction: "Resolve member recovery or service risk through guarded drafts." },
      { key: "bookings", label: "Bookings today", rows: workbench.bookings.length, nextAction: "Review waitlist, late cancellation and booking follow-up actions." },
      { key: "trainers", label: "Trainer capacity", rows: workbench.trainerSchedules.length, nextAction: "Balance shifts and capacity without writing to source systems." },
      { key: "support", label: "Support requests", rows: workbench.supportRequests.length, nextAction: "Escalate only through CRAYS command drafts." },
    ],
    nextAction: workbench.nextAction,
    actions: workbench.actions.slice(0, 20),
    boundaries: workbench.boundaries,
    note:
      "Block 106: Studio Daily OS turns operations into member, booking, trainer and support lanes. Payment, source writes and external sends remain closed.",
  };
}
