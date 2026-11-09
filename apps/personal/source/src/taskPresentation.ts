import {privateTaskSourceCurrent} from './privateSourceBinding';
import type { ProductWorld } from "./productModel.ts";
export type TaskGroup =
  "decision" | "working" | "result" | "paused" | "history" | "attention";
export function taskGroup(status: string): TaskGroup {
  if (
    [
      "review",
      "ready-for-review",
      "awaiting-approval",
      "waiting-for-approval",
      "prepared-not-executed",
      "prepared",
    ].includes(status)
  )
    return "decision";
  if (["running", "in-progress", "queued"].includes(status)) return "working";
  if (["saved", "completed", "succeeded"].includes(status)) return "result";
  if (status === "paused") return "paused";
  if (["cancelled", "stopped"].includes(status)) return "history";
  return "attention";
}
export function taskStatusLabel(status: string) {
  return (
    {
      review: "Ready for your review",
      "ready-for-review": "Ready for your review",
      "awaiting-approval": "Your approval is needed",
      "waiting-for-approval": "Your approval is needed",
      "prepared-not-executed": "Ready to continue",
      prepared: "Ready to continue",
      running: "Chuck is working on it",
      "in-progress": "Chuck is working on it",
      queued: "Up next",
      saved: "Draft saved",
      completed: "Result ready",
      succeeded: "Result ready",
      paused: "Paused by you",
      cancelled: "Stopped by you",
      stopped: "Stopped by you",
      failed: "Something needs attention",
      unknown: "Checking what happened",
      blocked: "A permission or connection is needed",
    }[status] || "Check the latest progress"
  );
}
export type PersonalTask = {
  id: string;
  name: string;
  request: string;
  status: string;
  statusLabel?: string;
  group: TaskGroup;
  origin: "travel" | "agent";
  resultId?: string;
  sourceFunction?: string;
  context?: Record<string, string>;
};
export function personalTasks(
  w: ProductWorld,
  travel: {
    id: string;
    title: string;
    request: string;
    status: string;
    resultId: string;
  }[],
): PersonalTask[] {
  return [
    ...travel.map((t) => ({
      id: t.id,
      name: t.title,
      request: t.request,
      status: t.status,
      group: taskGroup(t.status),
      origin: "travel" as const,
      resultId: t.resultId,
    })),
    ...w.objects
      .filter((o) => o.owner === w.owner && o.kind === "agent-task")
      .map((o) => ({
        id: o.id,
        name: privateTaskSourceCurrent(w,o)?String(o.name):"Private source needs review",
        request: privateTaskSourceCurrent(w,o)?String(o.request || ""):"The exact original source changed or its access was revoked.",
        status: String(o.status),
        ...(o.fixtureOnly===true?{statusLabel:({"in-progress":"In progress · prepared example",completed:"Result ready to review",stopped:"Archived example"} as Record<string,string>)[String(o.status)]||taskStatusLabel(String(o.status))}:{}),
        group: taskGroup(String(o.status)),
        origin: "agent" as const,
        resultId:
          o.lastObjectId || o.resultId
            ? String(o.lastObjectId || o.resultId)
            : undefined,
        sourceFunction: String(o.sourceFunction || ""),
        context: o.sourceContext as Record<string, string> | undefined,
      })),
  ];
}
