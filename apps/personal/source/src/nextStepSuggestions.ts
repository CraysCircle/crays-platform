import type { ProductWorld, Entity, ActionContext } from "./productModel.ts";
import { appActionAvailability, appActionFor } from "./appActionRequests.ts";
import { spaceCommunityAllowed } from "./spaceExperience.ts";
import { reminderTime } from "./reminders.ts";
import { planContractActive, planUsage } from "./craysPlans.ts";
export type NextStep = {
  id: string;
  originalId: string;
  title: string;
  reason: string;
  cta?: string;
  action: "meal-shopping" | "meal-ingredients" | "booking-arrival" | "booking-reminder" | "app-review" | "app-permissions" | "quota-review";
  icon: "shopping" | "ingredients" | "arrival" | "reminder" | "review" | "permission" | "usage";
  venueId?: string;
  providerId?: string;
  actionId?: string;
  image?: string;
};
const list = (input: unknown): Record<string, unknown>[] => {
  try {const value=typeof input==='string'?JSON.parse(input):input;return Array.isArray(value)?value:[];} catch{return [];}
};
export const nextStepDismissalKey = (suggestion: Pick<NextStep, "id">) => `next-step:hidden:${suggestion.id}`;
// Suggestions read only the currently opened own original. They are navigation
// aids, not delegation, charge, provider access or a personal-matching opt-in.
export function nextStepSuggestions(w: ProductWorld, context: Partial<ActionContext>, now=Date.now()): NextStep[] {
  if(!w.identity.signedIn || w.settings.nextStepSuggestionsEnabled===false)return [];
  const original=w.objects.find(o=>o.owner===w.owner && o.id===(context.objectId || context.contractId));
  if(!original)return [];
  const results:NextStep[]=[];
  const add=(action:NextStep['action'],title:string,reason:string,icon:NextStep['icon'],extra:Partial<NextStep>={},token='')=>results.push({id:`${original.id}:${action}:${String(original.version||1)}:${String(original.status)}${token}`,originalId:original.id,title,reason,action,icon,...extra});
  if(original.kind==='personal-plan' && original.planType==='meals' && original.status==='saved' && list(original.items).length){
    const shopping=list(original.shopping),remaining=shopping.filter(i=>i.checked!==true);
    if(!shopping.length)add('meal-ingredients','Make this week easier','Your meals are saved. Add the ingredients you want on your shopping list.','ingredients');
    else if(remaining.length)add('meal-shopping','Take your shopping list',`${remaining.length} ${remaining.length===1?'item is':'items are'} still unchecked in this plan’s own list.`,'shopping');
  }
  if(original.kind==='booking' && original.status==='confirmed'){
    let future=false;
    try{future=reminderTime(String(original.date),String(original.time),String(original.timezone))>now;}catch{}
    if(future){
      const venue=w.venues.find(v=>v.id===original.venueId);
      if(venue && spaceCommunityAllowed(w,venue.id))add('booking-arrival','Plan your arrival',`Your booking is confirmed for ${venue.name}. Open its visit details without checking in.`, 'arrival',{venueId:venue.id,image:venue.image});
      const reminder=w.objects.some(o=>o.owner===w.owner && o.kind==='reminder' && o.sourceId===original.id && !['cancelled','completed'].includes(String(o.status)));
      if(!reminder)add('booking-reminder','A nudge before you go','Choose when to remind yourself about this confirmed booking. Nothing is scheduled until you review and save it.','reminder');
    }
  }
  if(original.kind==='app-action' && appActionFor(String(original.providerId),String(original.actionId)) && ['prepared','paused-permission-revoked','paused-connection-revoked'].includes(String(original.status))){
    const state=appActionAvailability(w,original),extra={providerId:String(original.providerId),actionId:String(original.actionId),cta:state==='ready'?'Edit this request':'Review this original again'};
    if(state==='ready' || state==='review-required')add('app-review',state==='ready'?'Give it one last look':'Review with your current account',state==='ready'?'Your wording is prepared. Review the exact destination and content; nothing has been sent.':'Your connection changed. Check this original against the current account and permissions before continuing.','review',extra,`:${state}`);
    else add('app-permissions','Choose how to continue',state==='connection-required'?'This original needs its own account reconnected. No old permission is restored automatically.':'A permission for this original was removed. You can review its account settings without granting access automatically.','permission',extra,`:${state}`);
  }
  if(original.kind==='crays-plan-contract' && planContractActive(original,now)){
    const allowance=Number((original.allowances as {aiUnits?:number}|undefined)?.aiUnits);
    if(Number.isFinite(allowance) && allowance>=0){
      const usage=planUsage(w,original.id);
      if(usage?.active && ['70','90','100'].includes(usage.warning))add('quota-review',usage.warning==='100'?'Review your allowance':'A quick allowance check',usage.warning==='100'?'There are no available credits left in this membership’s current period. Review its usage and options; no paid change happens here.':`You have reached the ${usage.warning}% warning for this membership’s current credit period. Check the original usage and available options.`,'usage',{},`:${usage.periodStart}:${usage.warning}`);
    }
  }
  return results.filter(s=>w.settings[nextStepDismissalKey(s)]!==true).slice(0,2);
}
