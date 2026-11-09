import type {ActionContext,ProductWorld} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
import {nutritionAnalysis,type NutrientResult} from './nutritionJourney.ts';
import {newPhotoDraft,ownDiaryEntries,saveDiaryHistory,type MealDiaryEntry,type MealPhotoDraft,type RecipeDiarySource} from './mealPhotoJourney.ts';
import {availableRecipe,ownRecipeCooking,recipeAuthority,type RecipeCooking} from './recipeWorkspaceJourney.ts';
import {reminderTime} from './reminders.ts';

export type RecipeIntakeDraft={intentId:string;recipeId:string;recipeVersion:string;authority:string;cookingId:string;cookingVersion:string;date:string;time:string;timezone:string;meal:'BREAKFAST'|'LUNCH'|'DINNER'|'SNACK'|'';portion:string;note:string};
export type CookingConsumptionDecision={cookingVersion:number;decision:'logged'|'skipped';entryId:string;requestKey:string;requestSnapshot:string;at:number};
export const ownRecipeDiary=(w:ProductWorld)=>ownDiaryEntries(w).filter(e=>e.recipeSource&&e.recipeSource.recipe&&Array.isArray(e.recipeSource.recipe.steps)&&Array.isArray(e.recipeSource.recipe.ingredients)&&e.recipeSource.authority===recipeAuthority(e.recipeSource.recipe));
export function cookingConsumptionDecision(w:ProductWorld,id:string,version:number):CookingConsumptionDecision|undefined{
 const c=ownRecipeCooking(w).find(c=>c.id===id);return c&&Array.isArray(c.consumptionDecisions)?(c.consumptionDecisions as CookingConsumptionDecision[]).find(d=>d.cookingVersion===version):undefined;
}
function decisions(c:RecipeCooking):CookingConsumptionDecision[]{if(c.consumptionDecisions!==undefined&&!Array.isArray(c.consumptionDecisions))throw Error('Review this original cooking decision history.');const rows=(c.consumptionDecisions||[]) as CookingConsumptionDecision[];if(rows.some(d=>!d||!Number.isSafeInteger(d.cookingVersion)||!['logged','skipped'].includes(d.decision)||typeof d.entryId!=='string'||typeof d.requestKey!=='string'||typeof d.requestSnapshot!=='string')||new Set(rows.map(d=>d.cookingVersion)).size!==rows.length)throw Error('Resolve conflicting original cooking decisions first.');return rows;}
export function newRecipeIntake(w:ProductWorld,recipeId:string,cookingId='',now=Date.now()):RecipeIntakeDraft {
 const recipe=availableRecipe(w,recipeId),c=ownRecipeCooking(w).find(c=>c.id===cookingId),base=newPhotoDraft(now);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:base.timezone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(now);
 return {intentId:localPreviewId(),recipeId,recipeVersion:recipe?String(recipe.version):'',authority:recipe?recipeAuthority(recipe):'',cookingId,cookingVersion:c?String(c.version):'',date:base.date,time,timezone:base.timezone,meal:'',portion:'',note:''};
}
export function recipeIntakeDraftFrom(entry:MealDiaryEntry):RecipeIntakeDraft {
 const source=entry.recipeSource;if(!source)throw Error('Open this meal through its original ingredient workflow.');
 return {intentId:entry.creationKey,recipeId:source.recipeId,recipeVersion:String(source.recipeVersion),authority:source.authority,cookingId:source.cookingSessionId,cookingVersion:source.cookingVersion===null?'':String(source.cookingVersion),date:entry.draft.date,time:entry.draft.time,timezone:entry.draft.timezone,meal:entry.draft.meal==='OTHER'?'':entry.draft.meal,portion:entry.draft.portion,note:entry.draft.note};
}
export function reviewedRecipeIntake(input:RecipeIntakeDraft):RecipeIntakeDraft {
 const keys=['intentId','recipeId','recipeVersion','authority','cookingId','cookingVersion','date','time','timezone','meal','portion','note'] as const;
 if(!input||!keys.every(k=>typeof input[k]==='string')||input.intentId.length<8||input.intentId.length>160||input.note.length>500||input.authority.length>20000||input.recipeId.length>200||input.cookingId.length>200||input.timezone.length>100)throw Error('Review this complete recipe meal and keep your note within 500 characters.');
 if(!/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(input.portion)||Number(input.portion)<=0||Number(input.portion)>8)throw Error('Enter the original servings you actually ate: more than zero, at most eight.');
 if(!['BREAKFAST','LUNCH','DINNER','SNACK'].includes(input.meal))throw Error('Choose which meal you are reporting.');
 if(!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.time))throw Error('Choose a valid meal time.');
 // Reuse the app's exact timezone/DST rule. Missing or ambiguous local minutes are rejected.
 reminderTime(input.date,input.time.slice(0,5),input.timezone);
 if(Boolean(input.cookingId)!==Boolean(input.cookingVersion))throw Error('Keep the exact cooking cycle reference together.');
 return {...input,note:input.note.trim()};
}
export const recipeIntakeSnapshot=(draft:RecipeIntakeDraft)=>JSON.stringify(reviewedRecipeIntake(draft));
export function recipeIntakeReview(w:ProductWorld,input:RecipeIntakeDraft,entryId='',now=Date.now()):{draft:RecipeIntakeDraft;snapshot:string;source:RecipeDiarySource;analysis:NutrientResult[];cooking?:RecipeCooking}{
 if(!w.identity.signedIn)throw Error('Sign in to your own recipe diary.');
 const draft=reviewedRecipeIntake(input),recipe=availableRecipe(w,draft.recipeId),entry=entryId?ownRecipeDiary(w).find(e=>e.id===entryId):undefined;
 if(entryId&&!entry)throw Error('This original recipe meal is unavailable to your account.');
 if(!recipe||draft.recipeVersion!==String(recipe.version)||draft.authority!==recipeAuthority(recipe))throw Error('The reviewed recipe source changed or is unavailable. Your earlier diary original is retained.');
 if(entry){const original=entry.recipeSource!;if(draft.intentId!==entry.creationKey||draft.recipeId!==original.recipeId||draft.authority!==original.authority||draft.cookingId!==original.cookingSessionId||draft.cookingVersion!==(original.cookingVersion===null?'':String(original.cookingVersion)))throw Error('Keep this same diary meal, recipe and cooking source.');}
 const consumed=reminderTime(draft.date,draft.time.slice(0,5),draft.timezone)+Number(draft.time.split(':')[2]||0)*1000;
 if(consumed>now)throw Error('A future meal may be planned, but cannot be reported as eaten yet.');
 let cooking:RecipeCooking|undefined,cookedServings:string|null=null;
 if(draft.cookingId){
  cooking=ownRecipeCooking(w).find(c=>c.id===draft.cookingId);
  if(cooking)decisions(cooking);
  if(cooking?.history.some(h=>h.at>now))throw Error('Check the current clock before recording this cooking cycle.');
  const completed=cooking?.history.find(h=>h.version===Number(draft.cookingVersion)&&h.action==='complete'),started=cooking?.history.filter(h=>h.version<=Number(draft.cookingVersion)&&['started','restart'].includes(h.action)).at(-1);
  if(!cooking||!completed||!started||cooking.recipeId!==recipe.id||cooking.authority!==draft.authority)throw Error('This exact completed cooking cycle is unavailable.');
  if(!entry&&(cooking.status!=='completed'||draft.cookingVersion!==String(cooking.version)))throw Error('The cooking cycle changed. Reopen its current completed original.');
  cookedServings=completed.servings;
  if(Number(draft.portion)>Number(cookedServings))throw Error('The servings you report cannot exceed the amount cooked in this cycle.');
  if(consumed<started.at)throw Error('Choose the time you ate after this cooking cycle began.');
  const decision=cookingConsumptionDecision(w,cooking.id,Number(draft.cookingVersion));
  if(decision&&(!entry||decision.decision!=='logged'||decision.entryId!==entry.id))throw Error('This completed cooking cycle was already decided. Open its original diary entry instead of logging again.');
 }
 const source:RecipeDiarySource={recipeId:recipe.id,recipeVersion:recipe.version,authority:draft.authority,recipe:structuredClone(recipe),cookingSessionId:draft.cookingId,cookingVersion:draft.cookingId?Number(draft.cookingVersion):null,cookedServings,consumedAt:new Date(consumed).toISOString()};
 return {draft,snapshot:recipeIntakeSnapshot(draft),source,analysis:nutritionAnalysis([{recipeId:recipe.id,servings:draft.portion}]),...(cooking?{cooking}:{})};
}
export const cookingSkipSnapshot=(c:RecipeCooking)=>JSON.stringify({cookingId:c.id,version:c.version,recipeId:c.recipeId,authority:c.authority,decision:'skipped'});
export function applyRecipeIntake(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null {
 if(!op.startsWith('recipe-intake.preview.'))return null;
 if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Sign in to your own food diary.');
 if(data.approved!=='Yes')throw Error('Review this exact portion, time, source and diary action.');
 if(op==='recipe-intake.preview.skip'){
  const c=ownRecipeCooking(w).find(c=>c.id===ctx.objectId);if(!c)throw Error('Open your own completed cooking cycle.');
  const prior=decisions(c).find(d=>d.cookingVersion===Number(data.version));
  if(prior){if(prior.decision==='skipped'&&prior.requestKey===data.requestKey&&prior.requestSnapshot===data.snapshot)return {objectId:c.id,message:'This original cycle was already left out of your diary. No meal was logged.'};throw Error('This cooking cycle was already decided. Its original outcome is retained.');}
  if(!data.requestKey||data.requestKey.length<8||data.requestKey.length>200||c.status!=='completed'||data.version!==String(c.version)||data.snapshot!==cookingSkipSnapshot(c))throw Error('Review the current completed cooking cycle before leaving it unlogged.');
  if(c.history.some(h=>h.at>now))throw Error('Check the current clock before deciding this cooking cycle.');
  c.consumptionDecisions=[...decisions(c),{cookingVersion:c.version,decision:'skipped',entryId:'',requestKey:data.requestKey,requestSnapshot:data.snapshot,at:now}];
  return {objectId:c.id,message:'Cooking stays completed. This cycle was not logged as eaten.'};
 }
 const entry=ctx.objectId?ownRecipeDiary(w).find(e=>e.id===ctx.objectId):undefined;
 if(ctx.objectId&&!entry)throw Error('This recipe diary original is unavailable to your account.');
 if(op==='recipe-intake.preview.restore'){
  if(!entry||entry.status!=='removed'||data.version!==String(entry.version))throw Error('Review this exact removed meal before restoring its original values.');
  recipeIntakeReview(w,recipeIntakeDraftFrom(entry),entry.id,now);
  if(data.snapshot!==JSON.stringify({id:entry.id,version:entry.version,source:entry.recipeSource,draft:entry.draft,analysis:entry.analysis}))throw Error('Review the exact removed meal and retained source before restoring it.');
  entry.status='eaten';entry.version++;saveDiaryHistory(entry,now);return {objectId:entry.id,message:'The same reported meal is restored to totals with its retained recipe values. No second meal was created.'};
 }
 if(op!=='recipe-intake.preview.save')throw Error('Open the supported original recipe-intake action.');
 let draft:RecipeIntakeDraft;try{draft=reviewedRecipeIntake(JSON.parse(data.draft));}catch(e){throw Error(e instanceof Error?e.message:'Review this complete recipe meal.');}
 const snapshot=recipeIntakeSnapshot(draft);
 if(data.snapshot!==snapshot)throw Error('Your portion, source or time changed. Review all 16 values again before saving.');
 if(!entry){
  const raw=w.objects.filter(o=>o.owner===w.owner&&o.kind==='meal-diary-preview'&&o.creationKey===draft.intentId),prior=ownRecipeDiary(w).filter(e=>e.creationKey===draft.intentId);
  if(raw.length!==prior.length||prior.length>1)throw Error('Resolve conflicting original diary records before trying again.');
  if(prior.length){if(prior[0].creationSnapshot!==snapshot)throw Error('This original save has different details. Reopen the existing diary meal.');return {objectId:prior[0].id,message:'This same recipe meal was already recorded. No second entry was added.'};}
 }else if(data.version!==String(entry.version)||entry.status!=='eaten')throw Error('Reopen this current reported meal before correcting it. Removed meals need a separate restore.');
 const review=recipeIntakeReview(w,draft,entry?.id,now);
 const retained:MealPhotoDraft={draftId:draft.intentId,name:review.source.recipe.name,date:draft.date,time:draft.time,timezone:draft.timezone,meal:draft.meal as MealPhotoDraft['meal'],portion:draft.portion,note:draft.note,photo:{kind:'none',name:''},ingredients:[]};
 if(entry){if(recipeIntakeSnapshot(recipeIntakeDraftFrom(entry))===snapshot)return {objectId:entry.id,message:'These exact recipe meal details are already saved.'};entry.version++;entry.draft=retained;entry.analysis=review.analysis;entry.recipeSource=review.source;saveDiaryHistory(entry,now);return {objectId:entry.id,message:'Your same diary meal is corrected. Earlier recipe, portion and nutrient snapshots remain in its history.'};}
 const saved:MealDiaryEntry={id:localPreviewId(),owner:w.owner,kind:'meal-diary-preview',version:1,draft:retained,analysis:review.analysis,recipeSource:review.source,status:'eaten',exampleOnly:true,creationKey:draft.intentId,creationSnapshot:snapshot,history:[]};
 saveDiaryHistory(saved,now);w.objects.push(saved);
 if(review.cooking)review.cooking.consumptionDecisions=[...decisions(review.cooking),{cookingVersion:Number(draft.cookingVersion),decision:'logged',entryId:saved.id,requestKey:draft.intentId,requestSnapshot:snapshot,at:now}];
 return {objectId:saved.id,message:'Your reported portion is saved in the same private food diary. These are fictional recipe values, not a verified measurement.'};
}
