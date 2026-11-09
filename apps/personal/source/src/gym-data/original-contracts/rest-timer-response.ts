import { z } from "zod";

const version = z.union([
  z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  z.string().regex(/^[1-9][0-9]*$/).transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
]);
const timerState = z.enum(["RUNNING", "PAUSED", "COMPLETED", "CANCELLED"]);
const timer = z.object({
  timerId: z.string().uuid(), state: timerState,
  durationSeconds: z.number().int().min(1).max(3600),
  endsAt: z.string().datetime({ offset: true }),
  remainingSeconds: z.number().int().min(0).max(3600).nullable(),
  notificationRequested: z.boolean(),
  timerVersion: version,
}).passthrough();
export const restTimerListResponse = z.discriminatedUnion("state", [
  z.object({ contract: z.literal("crays.train-rest-timers.v1"), state: z.literal("EMPTY"), notificationPreferenceEnabled: z.boolean(), timers: z.array(timer).length(0) }),
  z.object({ contract: z.literal("crays.train-rest-timers.v1"), state: z.literal("READY"), notificationPreferenceEnabled: z.boolean(), timers: z.array(timer).min(1).max(20) }),
]);
const receipt = z.object({
  contract: z.literal("crays.train-rest-timer.v1"), state: z.literal("READY"),
  timer: timer.extend({ remainingSeconds: timer.shape.remainingSeconds.optional() }),
});
export type TimerMutationExpectation = { timerId?: string; state: z.infer<typeof timerState>; version: number };
export function readRestTimerReceipt(value: unknown, expected: TimerMutationExpectation) {
  const parsed = receipt.safeParse(value);
  if (!parsed.success || parsed.data.timer.state !== expected.state || parsed.data.timer.timerVersion !== expected.version
    || (expected.timerId !== undefined && parsed.data.timer.timerId !== expected.timerId)) return null;
  return parsed.data;
}
