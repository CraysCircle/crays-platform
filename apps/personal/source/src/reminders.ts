import {ownPrivateAccount} from './ownPrivateAccount';
import {learningUnitReminderSource,learningUnitReminderCurrent,type LearningUnitReminder} from './learningJourney.ts';
import {deadlineReminderSource,deadlineSourceCurrent} from './personalDeadlines.ts';
import {habitDateSource,habitDateSourceCurrent,habitScheduleSource,habitScheduleSourceCurrent,habitToday,type HabitDateSource,type HabitScheduleSource} from './personalHabits.ts';
import {occasionReminderSource,occasionSourceCurrent,type OccasionReminderSource} from './personalOccasions.ts';
import {checklistItemSource,checklistSourceCurrent,type ChecklistItemSource} from './personalChecklists.ts';
import {localPreviewId} from "./localPreviewId.ts";
import type { ProductWorld, Entity, ActionContext } from "./productModel.ts";
import { planSessionReminderSource } from './planSessionReminders.ts';
const requireThat = (v: unknown, m: string) => {
  if (!v) throw Error(m);
};
function parts(timestamp: number, timezone: string) {
  const out = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(timestamp)
      .map((p) => [p.type, p.value]),
  );
  return `${out.year}-${out.month}-${out.day}T${out.hour}:${out.minute}`;
}
// Reject nonexistent AND ambiguous wall-clock minutes rather than silently moving the user's reminder.
export function reminderTime(date: string, time: string, timezone: string) {
  requireThat(
    /^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time),
    "Choose a valid date and time.",
  );
  const wall = Date.parse(`${date}T${time}:00Z`);
  requireThat(
    Number.isFinite(wall) && new Date(wall).toISOString().slice(0, 10) === date,
    "Choose a valid calendar date.",
  );
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(wall);
  } catch {
    throw Error("Choose a valid time zone.");
  }
  const offsets = new Set<number>();
  for (const delta of [-36, -12, 0, 12, 36]) {
    const t = wall + delta * 3600000;
    offsets.add(
      Date.parse(parts(t, timezone) + ":00Z") - Math.floor(t / 60000) * 60000,
    );
  }
  const candidates = [...offsets]
    .map((offset) => wall - offset)
    .filter((t) => parts(t, timezone) === `${date}T${time}`);
  requireThat(
    candidates.length === 1,
    candidates.length
      ? "This time happens twice when the clocks change. Choose an unambiguous time."
      : "This local time does not exist when the clocks change. Choose another time.",
  );
  return candidates[0];
}
export function applyReminder(
  w: ProductWorld,
  op: string,
  d: Record<string, string>,
  ctx: ActionContext,
): { objectId: string; message: string } | undefined {
  if (!op.startsWith("complete.reminder.")) return;
  requireThat(ownPrivateAccount(w)&&(!ctx.personId||ctx.personId===w.owner), "Sign in to manage your own reminders.");
  const own = (id: string) => {const found=w.objects.filter(o=>o.id===id);return found.length===1&&found[0].owner===w.owner?found[0]:undefined;};
  if (op === "complete.reminder.save") {
    requireThat(
      d.approved === "Yes",
      "Review the exact reminder before scheduling.",
    );
    requireThat(d.name?.trim(), "What should Chuck remind you about?");
    requireThat(
      ["Once", "Daily", "Weekly", "Habit schedule"].includes(d.repeat),
      "Choose when this should repeat.",
    );
    requireThat(
      d.channel === "In-app",
      "Choose the supported in-app channel. Other channels need their own permission.",
    );
    const dueAt = reminderTime(d.date, d.time, d.timezone);
    requireThat(dueAt > Date.now(), "Choose a time in the future.");
    const source = d.sourceId ? own(d.sourceId) : undefined;
    requireThat(
      !d.sourceId || source,
      "This source is not available in your account.",
    );
    const existing = ctx.objectId ? own(ctx.objectId) : undefined;
    requireThat(
      !ctx.objectId || existing?.kind === "reminder",
      "Choose your own reminder to update.",
    );
    requireThat(
      !existing || String(existing.version || 0) === d.expectedVersion,
      "This reminder changed. Reopen its latest version before saving.",
    );
    requireThat(!existing?.sourceSessionId || (d.sourceSessionId===existing.sourceSessionId && d.sourceId===existing.sourceId), 'Keep this reminder linked to its original training session.');
    requireThat(!existing?.sourceChecklistItemId || (d.sourceChecklistItemId===existing.sourceChecklistItemId && d.sourceId===existing.sourceId), 'Keep this reminder linked to its exact original checklist item.');
    requireThat(!(d.sourceSessionId && d.sourceChecklistItemId), 'Choose one original reminder source.');
    requireThat(source?.kind!=='personal-checklist' || !!d.sourceChecklistItemId, 'Choose the exact checklist item for this reminder.');
    requireThat(!d.sourceChecklistItemId || source?.kind==='personal-checklist', 'Open the original checklist for this item.');
    requireThat(!existing?.sourceOccasionId||d.sourceId===existing.sourceOccasionId,'Keep this reminder linked to its original occasion.');
    requireThat(!existing?.sourceLearningUnitId||(d.sourceId===existing.sourceId&&d.sourceLearningUnitId===existing.sourceLearningUnitId),'Keep this reminder with its exact original study unit.');
    requireThat(!(d.sourceLearningUnitId||d.sourceLearningFingerprint)||source?.kind==='learning-preview','Open your own original learning plan for this reminder.');
    requireThat(source?.kind!=='learning-preview'||!!d.sourceLearningUnitId,'Choose the exact study unit, not an unqualified learning-plan link.');
    const learningSource=source?.kind==='learning-preview'?learningUnitReminderSource(w,source.id,d.sourceLearningUnitId):undefined;
    if(learningSource){requireThat(d.repeat==='Once'&&!d.sourceSessionId&&!d.sourceChecklistItemId&&!d.sourceOccasionFingerprint&&!d.sourceHabitFingerprint&&!d.sourceDeadlineFingerprint,'Review one separately chosen study reminder; no other source or recurring schedule is implied.');requireThat(d.sourceLearningFingerprint===learningSource.fingerprint,'This study unit, material or task request changed. Review it again.');}
    const occasionSource=source?.kind==='personal-occasion'?occasionReminderSource(w,source.id):undefined;
    requireThat(!d.sourceOccasionFingerprint||!!occasionSource,'Open the original occasion before using this reminder reference.');
    if(occasionSource){const current=occasionSourceCurrent(w,occasionSource);requireThat(current.ready,current.message);requireThat(!d.sourceChecklistItemId&&!d.sourceSessionId&&d.repeat==='Once','Prepare one separately reviewed occurrence reminder; annual occasions do not imply yearly background dispatch.');requireThat(d.sourceOccasionFingerprint===occasionSource.fingerprint,'This occasion or its next occurrence changed. Review its current details.');requireThat(!existing?.sourceOccasionOccurrenceKey||existing.sourceOccasionOccurrenceKey===occasionSource.occurrenceKey,'Keep this historical reminder with its original occurrence. Prepare a separate reminder for the new occurrence.');}
    requireThat(!existing?.sourceDeadlineId||(source?.kind==='personal-deadline'&&d.sourceId===existing.sourceDeadlineId),'Keep this reminder linked to its original deadline.');
    requireThat(!(d.sourceDeadlineId||d.sourceDeadlineFingerprint)||source?.kind==='personal-deadline','Open your own original deadline before reviewing this reminder.');
    const deadlineSource=source?.kind==='personal-deadline'?deadlineReminderSource(w,source.id):undefined;
    if(deadlineSource){const current=deadlineSourceCurrent(w,deadlineSource);requireThat(current.ready,current.message);requireThat(d.repeat==='Once'&&!d.sourceSessionId&&!d.sourceChecklistItemId&&!d.sourceOccasionFingerprint&&!d.sourceHabitFingerprint,'Review one reminder for this exact deadline. Other source permissions remain separate.');requireThat(d.sourceDeadlineFingerprint===deadlineSource.fingerprint,'The deadline or chosen document changed. Review its current details first.');}
    requireThat(d.repeat!=='Habit schedule'||source?.kind==='personal-habit','Only an exact self-selected habit can provide a reviewed habit schedule.');
    requireThat(!existing?.sourceHabitId||(source?.kind==='personal-habit'&&d.sourceId===existing.sourceHabitId&&d.sourceHabitDate===existing.sourceHabitDate&&d.sourceHabitMode===existing.sourceHabitMode),'Keep this reminder with its same original habit, selected date and reminder mode.');
    requireThat(!(d.sourceHabitId||d.sourceHabitDate||d.sourceHabitFingerprint||d.sourceHabitMode)||source?.kind==='personal-habit','Open your own original habit before choosing this reminder source.');
    let habitSource:Readonly<HabitDateSource>|Readonly<HabitScheduleSource>|undefined;
    let habitMode:''|'date'|'schedule'='';
    if(source?.kind==='personal-habit'){
      requireThat(!d.sourceSessionId&&!d.sourceChecklistItemId&&!d.sourceOccasionFingerprint,'Choose only this original habit as the reminder source.');
      requireThat(['Once','Habit schedule'].includes(d.repeat),'Review one selected habit date or its exact habit schedule. Daily and Weekly are not substitutes for its cadence.');
      habitMode=d.repeat==='Habit schedule'?'schedule':'date';
      requireThat(d.sourceHabitMode===habitMode&&(!d.sourceHabitId||d.sourceHabitId===source.id),'Review the exact habit reminder mode and original identity.');
      const selected=habitDateSource(w,source.id,d.sourceHabitDate);
      if(habitMode==='date'){
        const current=habitDateSourceCurrent(w,selected);requireThat(current.ready,current.message);habitSource=selected;
      }else{
        habitSource=existing?.sourceHabitMode==='schedule'&&d.sourceHabitFingerprint===existing.sourceHabitFingerprint?existing.sourceHabitSnapshot as HabitScheduleSource:habitScheduleSource(w,source.id);const current=habitScheduleSourceCurrent(w,habitSource as HabitScheduleSource);requireThat(current.ready,current.message);
        requireThat(selected.scheduled,'Choose an original date that belongs to this habit schedule.');
        const delivery=habitDateSource(w,source.id,d.date);
        requireThat(delivery.scheduled&&d.date>=habitToday(delivery.timezone)&&d.timezone===delivery.timezone,'Choose a future delivery on a scheduled habit date in that exact rule time zone.');
      }
      requireThat(d.sourceHabitFingerprint===habitSource.fingerprint,'This exact habit date or cadence changed. Review it again before saving.');
    }
    const checklistSource=d.sourceChecklistItemId?checklistItemSource(w,d.sourceId,d.sourceChecklistItemId):undefined;
    if(checklistSource){const current=checklistSourceCurrent(w,checklistSource);requireThat(current.ready,current.message);requireThat(checklistSource.fingerprint===d.sourceChecklistFingerprint,'This item changed. Review its current details before saving the reminder.');}
    const session=d.sourceSessionId?planSessionReminderSource(w,d.sourceId,d.sourceSessionId):undefined;
    requireThat(!session || session.fingerprint===d.sourceSessionFingerprint, 'This session changed. Review its current date and details before saving the reminder.');
    if(session)reminderTime(session.date,session.time,session.timezone);
    const fingerprint = JSON.stringify([
      d.name.trim(),
      dueAt,
      d.repeat,
      d.sourceId || "",
      d.channel,
      ...(d.sourceSessionId ? [d.sourceSessionId] : []),
      ...(d.sourceChecklistItemId ? ["checklist-item",d.sourceChecklistItemId] : []),
      ...(occasionSource?["occasion",occasionSource.occurrenceKey]:[]),
      ...(habitSource?["habit",habitMode,d.sourceHabitDate]:[]),
      ...(learningSource?["learning-unit",learningSource.unitId]:[]),
    ]);
    const duplicate = w.objects.find(
      (o) =>
        o.owner === w.owner &&
        o.kind === "reminder" &&
        o.id !== existing?.id &&
        o.fingerprint === fingerprint &&
        o.status !== "cancelled",
    );
    if(duplicate&&deadlineSource)requireThat(duplicate.sourceDeadlineFingerprint===deadlineSource.fingerprint,'Open your existing reminder and review the changed deadline before saving.');
    if(duplicate&&learningSource)requireThat(duplicate.sourceLearningFingerprint===learningSource.fingerprint,'Open your existing study reminder and review its changed original source first.');
    if (duplicate)
      return {
        objectId: duplicate.id,
        message:
          "This exact reminder is already saved. No duplicate was scheduled.",
      };
    const o: Entity = existing || {
      id: localPreviewId(),
      owner: w.owner,
      kind: "reminder",
    };
    Object.assign(o, {
      name: d.name.trim(),
      date: d.date,
      time: d.time,
      timezone: d.timezone,
      dueAt,
      repeat: d.repeat,
      channel: d.channel,
      sourceId: d.sourceId || "",
      sourceTaskId: source?.sourceTaskId || "",
      ...(learningSource?{sourceLearningUnitId:learningSource.unitId,sourceLearningFingerprint:learningSource.fingerprint,sourceLearningSnapshot:structuredClone(learningSource)}:{}),
      ...(deadlineSource?{sourceDeadlineId:source!.id,sourceDeadlineFingerprint:deadlineSource.fingerprint,sourceDeadlineSnapshot:structuredClone(deadlineSource)}:{}),
      ...(session?{sourceSessionId:session.sessionId,sourceSessionFingerprint:session.fingerprint,sourcePlanVersion:session.planVersion,sourceSessionName:session.name,sourceSessionDate:session.date,sourceSessionTime:session.time,sourceSessionTimezone:session.timezone}:{}),
      ...(occasionSource?{sourceOccasionId:occasionSource.occasionId,sourceOccasionFingerprint:occasionSource.fingerprint,sourceOccasionOccurrenceKey:occasionSource.occurrenceKey,sourceOccasionSnapshot:structuredClone(occasionSource)}:{}),
      ...(habitSource?{sourceHabitId:source!.id,sourceHabitDate:d.sourceHabitDate,sourceHabitFingerprint:habitSource.fingerprint,sourceHabitSnapshot:structuredClone(habitSource),sourceHabitMode:habitMode,sourceHabitHistory:[...((o.sourceHabitHistory as unknown[])||[]),...(o.sourceHabitSnapshot&&o.sourceHabitFingerprint!==habitSource.fingerprint?[{at:Date.now(),snapshot:structuredClone(o.sourceHabitSnapshot)}]:[])]}:{}),
      ...(checklistSource?{sourceChecklistItemId:checklistSource.itemId,sourceChecklistFingerprint:checklistSource.fingerprint,sourceChecklistSnapshot:structuredClone(checklistSource)}:{}),
      fingerprint,
      status: "scheduled-demo",
      version: Number(o.version || 0) + 1,
      updatedAt: Date.now(),
      liveDelivery: false,
    });
    if (!existing) w.objects.unshift(o);
    return {
      objectId: o.id,
      message:
        "Reminder saved in the clickdummy. No real notification or background job was started.",
    };
  }
  const o = own(ctx.objectId || "");
  requireThat(o?.kind === "reminder", "Choose your own reminder.");
  if (op === "complete.reminder.control") {
    requireThat(
      ["Pause", "Resume", "Cancel"].includes(d.action),
      "Choose a reminder action.",
    );
    requireThat(
      o!.status !== "cancelled",
      "This reminder was cancelled. Review a new reminder instead.",
    );
    if(o!.sourceHabitId||o!.sourceDeadlineId||o!.sourceLearningUnitId)requireThat(d.approved==='Yes'&&String(o!.version)===d.expectedVersion,'Review this exact reminder version before changing its controls.');
    if (d.action === "Resume") {
      requireThat(o!.status === "paused", "This reminder is not paused.");
      if(o!.sourceLearningUnitId){const current=learningUnitReminderCurrent(w,o!.sourceLearningSnapshot as LearningUnitReminder);requireThat(current.ready,current.message);}
      if(o!.sourceHabitId){const current=o!.sourceHabitMode==='schedule'?habitScheduleSourceCurrent(w,o!.sourceHabitSnapshot as HabitScheduleSource):o!.sourceHabitMode==='date'?habitDateSourceCurrent(w,o!.sourceHabitSnapshot as HabitDateSource):{ready:false,message:'Review this original habit reminder mode.'};requireThat(current.ready,current.message);}
      if(o!.sourceDeadlineId){const current=deadlineSourceCurrent(w,o!.sourceDeadlineSnapshot as ReturnType<typeof deadlineReminderSource>);requireThat(current.ready,current.message);}
      if(o!.sourceOccasionId){const current=occasionSourceCurrent(w,o!.sourceOccasionSnapshot as OccasionReminderSource);requireThat(current.ready,current.message);}
      if(o!.sourceChecklistItemId){const current=checklistSourceCurrent(w,o!.sourceChecklistSnapshot as ChecklistItemSource);requireThat(current.ready,current.message);}
      requireThat(
        Number(o!.dueAt) > Date.now(),
        "Review a new future time before resuming this reminder.",
      );
    }
    if (d.action === "Cancel")
      requireThat(d.approved === "Yes", "Confirm cancelling this reminder.");
    o!.status =
      d.action === "Pause"
        ? "paused"
        : d.action === "Resume"
          ? "scheduled-demo"
          : "cancelled";
    if(o!.sourceHabitId||o!.sourceDeadlineId||o!.sourceLearningUnitId)o!.version=Number(o!.version)+1;
    o!.updatedAt = Date.now();
    return {
      objectId: o!.id,
      message:
        d.action === "Cancel"
          ? "Reminder cancelled. Its plan and other reminders stay unchanged."
          : d.action === "Pause"
            ? "Reminder paused."
            : "Reminder resumed in the clickdummy.",
    };
  }
  throw Error("This reminder action is not available.");
}
