import {localPreviewId} from "./localPreviewId.ts";
import type { ProductWorld, ActionContext } from "./productModel.ts";
import { reminderTime } from "./reminders.ts";
export const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const planCalendarChoices = ["Plan only", "Google Calendar", "Microsoft 365", "Nextcloud", "CalDAV calendar", "iCloud Calendar"];
export const ingredientUnits = ["g", "kg", "ml", "l", "pcs", "tbsp", "tsp"];
export type PersonalPlanItem = { id: string; day: string; name: string; note: string; time: string; duration?: string; done: boolean; date?: string };
export type PlanIngredient = { id: string; name: string; quantity: string; unit: string; recipeDay: string; checked: boolean };
export function planItemDate(start: string, day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !weekDays.includes(day)) throw Error("Choose a valid Monday for your week.");
  const at = Date.parse(`${start}T12:00:00Z`);
  if (!Number.isFinite(at) || new Date(at).toISOString().slice(0, 10) !== start || new Date(at).getUTCDay() !== 1) throw Error("Choose a valid Monday for your week.");
  return new Date(at + weekDays.indexOf(day) * 86400000).toISOString().slice(0, 10);
}
const parse = (value: unknown): any[] => Array.isArray(value) ? value : typeof value === "string" ? JSON.parse(value) : [];
// Native planning only. Calendar preference is never account access or an event creation.
export function applyPersonalPlan(w: ProductWorld, op: string, data: Record<string, string>, ctx: ActionContext) {
  if (!["complete.personalplan.save", "complete.personalplan.shopping.check"].includes(op)) return;
  const need = (ok: unknown, message: string) => { if (!ok) throw Error(message); };
  need(w.identity.signedIn, "Sign in before saving your plan.");
  const existing = ctx.objectId ? w.objects.find((o) => o.id === ctx.objectId && o.owner === w.owner && o.kind === "personal-plan") : undefined;
  if (ctx.objectId) {
    need(existing, "Choose your own plan.");
    need(String(existing?.version || 1) === data.expectedVersion, "This plan changed. Reopen its latest version before saving.");
  }
  if (op === "complete.personalplan.shopping.check") {
    need(existing?.planType === "meals", "Choose your own meal plan.");
    const shopping = parse(existing!.shopping);
    need(shopping.some((i) => i.id === data.ingredientId), "This ingredient is not in your original list.");
    need(["Yes", "No"].includes(data.checked), "Choose the ingredient’s checked state.");
    existing!.shopping = shopping.map((i) => i.id === data.ingredientId ? { ...i, checked: data.checked === "Yes" } : i);
    existing!.version = Number(existing!.version || 1) + 1;
    return { objectId: existing!.id, message: "Your original shopping list is updated. Nothing was ordered." };
  }
  need(data.approved === "Yes", "Review this exact plan before saving.");
  need(["movement", "meals"].includes(data.planType), "Choose a movement or meal plan.");
  need(data.name?.trim() && data.goal?.trim(), "Give your plan a name and a goal.");
  need(data.name.length <= 160 && data.goal.length <= 3000, "Shorten the plan name or goal.");
  if (existing) need(existing.planType === data.planType, "Keep the original plan type.");
  const items = JSON.parse(data.items || "[]") as PersonalPlanItem[];
  need(Array.isArray(items) && items.length > 0 && items.length <= 7, "Choose one to seven days.");
  const seen = new Set<string>();
  for (const i of items) {
    need(weekDays.includes(i.day) && !seen.has(i.day), "Each chosen day must appear once."); seen.add(i.day);
    need(typeof i.name === "string" && i.name.trim() && i.name.length <= 200, "Give every day an activity or a meal.");
    need(typeof i.note === "string" && i.note.length <= 3000 && typeof i.time === "string", "Review the day details.");
    if (data.planType === "movement") {
      need(/^([01]\d|2[0-3]):[0-5]\d$/.test(i.time), "Choose an exact time for each session.");
      reminderTime(planItemDate(data.weekStart, i.day), i.time, data.timezone);
    }
  }
  if (data.planType === "meals") need(/^([1-9]|1\d|20)$/.test(data.servings || ""), "Choose between one and twenty people.");
  else {
    need(planCalendarChoices.includes(data.calendarTarget), "Choose your calendar preference.");
    need(data.calendarTarget === "Plan only" || (data.calendarName?.trim() && data.calendarName.length <= 120), "Name the calendar you would like to use later.");
  }
  const source = ctx.sourceId ? w.objects.find((o) => o.id === ctx.sourceId && o.owner === w.owner) : undefined;
  if (ctx.sourceId) need(source, "The original task or plan is unavailable to this account.");
  const previousItems: PersonalPlanItem[] = parse(existing?.items);
  const oldShopping = parse(existing?.shopping);
  const shopping = data.shopping === undefined ? oldShopping : JSON.parse(data.shopping);
  need(Array.isArray(shopping) && shopping.length <= 150, "Use up to 150 ingredients in this week’s list.");
  const ingredientIds = new Set<string>();
  const checkedShopping = shopping.map((i: any) => {
    need(i && typeof i.id === "string" && i.id.trim() && i.id.length <= 100 && !ingredientIds.has(i.id), "Each ingredient needs a unique identity."); ingredientIds.add(i.id);
    need(typeof i.name === "string" && i.name.trim() && i.name.length <= 160, "Name every ingredient.");
    const prior = oldShopping.find((p) => p.id === i.id);
    // Legacy fixture lines may have unknown quantities; keep them unknown until edited.
    const unchangedLegacy = prior && i.quantity === undefined && prior.quantity === undefined;
    if (!unchangedLegacy) {
      need(typeof i.quantity === "string" && /^\d{1,6}(\.\d{1,3})?$/.test(i.quantity) && Number(i.quantity) > 0 && Number(i.quantity) <= 100000, "Enter a positive ingredient quantity with up to three decimal places.");
      need(ingredientUnits.includes(i.unit), "Choose a supported ingredient unit.");
    }
    need(!i.recipeDay || i.recipeDay === "Whole week" || items.some((day) => day.day === i.recipeDay), "Link the ingredient to a day in this plan or the whole week.");
    const same = prior && prior.name === i.name.trim() && prior.quantity === i.quantity && prior.unit === i.unit;
    return { id: i.id, name: i.name.trim(), ...(unchangedLegacy ? {} : { quantity: i.quantity, unit: i.unit }), recipeDay: i.recipeDay || "Whole week", checked: Boolean(same && prior.checked) };
  });
  const fields = {
    name: data.name.trim(), goal: data.goal.trim(), planType: data.planType, servings: data.servings || "",
    origin: 'manual-plan', lastSaveOrigin: 'manual-save', aiExecutionPerformed: false,
    items: items.map((i) => ({ ...i, id: `day-${i.day.toLowerCase()}`, name: i.name.trim(), ...(data.planType === "movement" ? { date: planItemDate(data.weekStart, i.day) } : {}), done: existing ? Boolean(previousItems.find((x) => x.day === i.day && (data.planType !== "movement" || !x.date || x.date === planItemDate(data.weekStart, i.day)))?.done) : false })),
    ...(data.planType === "movement" ? { weekStart: data.weekStart, timezone: data.timezone, calendarTarget: data.calendarTarget, calendarName: data.calendarTarget === "Plan only" ? "" : data.calendarName.trim(), calendarState: "preference-only-no-events" } : {}),
    shopping: checkedShopping, source: existing?.source || "Your reviewed clickdummy plan", synthetic: true,
  };
  const fingerprintFields:Record<string,unknown>={...fields};
  delete fingerprintFields.origin;delete fingerprintFields.lastSaveOrigin;delete fingerprintFields.aiExecutionPerformed;
  const fingerprint = JSON.stringify({ ...fingerprintFields, sourceId: ctx.sourceId || "" });
  if (!existing) {
    const duplicate = w.objects.find((o) => o.owner === w.owner && o.kind === "personal-plan" && o.creationFingerprint === fingerprint);
    if (duplicate) return { objectId: duplicate.id, message: "Your original plan is already saved. No duplicate was created." };
  }
  const id = existing?.id || localPreviewId();
  const taskId = String(existing?.sourceTaskId || localPreviewId());
  const capabilityId = String(existing?.capabilityId || (data.planType === "movement" ? "B2C-CAP-052" : "B2C-CAP-043"));
  if (existing) {
    Object.assign(existing, fields, { version: Number(existing.version || 1) + 1, updatedAt: Date.now() });
    const task=w.objects.find(o=>o.owner===w.owner&&o.kind==='agent-task'&&o.id===taskId);
    if(task&&!task.aiExecutionRequested)Object.assign(task,{origin:'manual-plan',aiExecutionRequested:false,aiExecutionApproved:false});
  }
  else {
    w.objects.unshift({ id, owner: w.owner, kind: "personal-plan", ...fields, status: "saved", capabilityId, sourceTaskId: taskId, sourceId: ctx.sourceId || "", version: 1, creationFingerprint: fingerprint });
    w.objects.unshift({ id: taskId, owner: w.owner, kind: "agent-task", name: fields.name, request: fields.goal, status: "saved", capabilityId, sourceFunction: "AL-293", sourceChatId: "chuck", sourceContext: { objectId: id }, resultId: id, synthetic: true, origin:'manual-plan', aiExecutionRequested:false, aiExecutionApproved:false });
  }
  return { objectId: id, message: existing ? "Changes saved to this same plan. Bookings, calendar events and reminders keep their own settings." : "Your reviewed plan is saved. Nothing was booked, ordered or scheduled." };
}
