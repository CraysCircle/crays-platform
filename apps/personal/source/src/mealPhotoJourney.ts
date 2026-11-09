import type {ActionContext,Entity,ProductWorld} from './productModel.ts';
import {nutrientFields,type NutrientCode,type NutrientResult,type RecipeExample} from './nutritionJourney.ts';
import {localPreviewId} from './localPreviewId.ts';

type NutrientValues=Record<NutrientCode,number|null>;
const values=(numbers:(number|null)[]):NutrientValues=>Object.fromEntries(nutrientFields.map(([code],i)=>[code,numbers[i]??null])) as NutrientValues;
// Revision 2 preserves the original per-100g fixture basis, with no unsupported extended fallback.
// Saved diary analyses/history are retained, never migrated by this catalogue revision.
export const foodExamples=[
 {id:'food-example-oats',version:2,name:'Oats',values:values([380,13,62,1,7,1.2,10,5])},
 {id:'food-example-yoghurt',version:2,name:'Plain yoghurt',values:values([75,7,5,5,3,1.8,0,50])},
 {id:'food-example-berries',version:2,name:'Mixed berries',values:values([45,1,8,6,0.5,0.1,5,2])},
];
export type PhotoReference={kind:'none'|'bundled-example'|'local-tab-only';name:string};
export type PhotoIngredient={id:string;foodId:string;label:string;amount:string;unit:'g'|'ml'|'piece'};
export type MealPhotoDraft={draftId:string;name:string;date:string;time:string;timezone:string;meal:'BREAKFAST'|'LUNCH'|'DINNER'|'SNACK'|'OTHER';portion:string;note:string;photo:PhotoReference;ingredients:PhotoIngredient[]};
const quantity=(s:string,max:number)=>typeof s==='string'&&/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(s)&&Number(s)>0&&Number(s)<=max;
function validDate(date:string){const time=Date.parse(`${date}T12:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===date;}
export function localNutritionDate(now=Date.now(),zone=Intl.DateTimeFormat().resolvedOptions().timeZone){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
export function newPhotoDraft(now=Date.now()):MealPhotoDraft{const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;return {draftId:localPreviewId(),name:'',date:localNutritionDate(now,timezone),time:new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now),timezone,meal:'OTHER',portion:'1',note:'',photo:{kind:'none',name:''},ingredients:[]};}
export function samplePhotoIngredients():PhotoIngredient[]{return foodExamples.map((food,index):PhotoIngredient=>({id:localPreviewId(),foodId:food.id,label:food.name,amount:['50','200','70'][index],unit:'g'})).concat([{id:localPreviewId(),foodId:'',label:'Possible toppings · please identify',amount:'10',unit:'g'}]);}
export function reviewedPhotoDraft(input:MealPhotoDraft):MealPhotoDraft{
 if(!input||typeof input.draftId!=='string'||input.draftId.length<8||input.draftId.length>160||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>180||typeof input.note!=='string'||input.note.length>500)throw Error('Give this meal a name and keep your note under 500 characters.');
 if(!validDate(input.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))throw Error('Choose a valid meal date and time.');
 try{if(typeof input.timezone!=='string'||!input.timezone||input.timezone.length>100)throw Error();new Intl.DateTimeFormat('en-GB',{timeZone:input.timezone}).format();}catch{throw Error('Choose a valid meal time zone.');}
 if(!['BREAKFAST','LUNCH','DINNER','SNACK','OTHER'].includes(input.meal)||!quantity(input.portion,8))throw Error('Choose a meal and a consumed portion greater than 0, up to 8.');
 if(!input.photo||!['none','bundled-example','local-tab-only'].includes(input.photo.kind)||typeof input.photo.name!=='string'||input.photo.name.length>200||input.photo.kind==='none'&&input.photo.name!=='')throw Error('Review this meal’s private photo reference.');
 if(!Array.isArray(input.ingredients)||!input.ingredients.length||input.ingredients.length>100||new Set(input.ingredients.map(i=>i?.id)).size!==input.ingredients.length)throw Error('Review one to 100 distinct ingredients.');
 const ingredients=input.ingredients.map(i=>{if(!i||typeof i.id!=='string'||i.id.length<8||typeof i.foodId!=='string'||i.foodId!==''&&!foodExamples.some(f=>f.id===i.foodId)||typeof i.label!=='string'||!i.label.trim()||i.label.length>180||!quantity(i.amount,10000))throw Error('Review each ingredient, source and amount.');if(i.unit!=='g')throw Error('Use a weight in grams. No verified density or whole-item conversion is available in this example.');return {id:i.id,foodId:i.foodId,label:i.label.trim(),amount:i.amount,unit:i.unit};});
 return {draftId:input.draftId,name:input.name.trim(),date:input.date,time:input.time,timezone:input.timezone,meal:input.meal,portion:input.portion,note:input.note.trim(),photo:{kind:input.photo.kind,name:input.photo.name},ingredients};
}
export const photoReviewSnapshot=(draft:MealPhotoDraft)=>JSON.stringify(reviewedPhotoDraft(draft));
export function photoNutrition(draft:MealPhotoDraft,basis:'consumed'|'100g'='consumed'):NutrientResult[]{
 const d=reviewedPhotoDraft(draft),weight=d.ingredients.reduce((sum,i)=>sum+Number(i.amount),0);
 return nutrientFields.map(([code,label,unit],fieldIndex)=>{let knownSubtotal=0;const missingRecipeIds:string[]=[];const sources=d.ingredients.map(i=>{const food=foodExamples.find(f=>f.id===i.foodId),value=food?.values[code];if(value==null)missingRecipeIds.push(i.id);else knownSubtotal+=value*Number(i.amount)/100;return {recipeId:i.id,version:food?.version??0,source:food?(fieldIndex<8?'Wger-only fictional food example · unverified · per 100 g':'No verified source · not supplied by the current Wger-only contract'):'No identified food source',servings:Number(i.amount)/100,label:`${i.label}${food&&food.name!==i.label?` · ${food.name}`:''}`,amountLabel:`${i.amount} g in the full dish`};});const scale=basis==='100g'?100/weight:Number(d.portion),total=Number((knownSubtotal*scale).toFixed(9));return {code,label,unit,value:missingRecipeIds.length?null:total,knownSubtotal:total,missingRecipeIds,sources};});
}
export type RecipeDiarySource={recipeId:string;recipeVersion:number;authority:string;recipe:RecipeExample;cookingSessionId:string;cookingVersion:number|null;cookedServings:string|null;consumedAt:string};
export type MealDiaryEntry=Entity&{kind:'meal-diary-preview';version:number;draft:MealPhotoDraft;analysis:NutrientResult[];recipeSource?:RecipeDiarySource;status:'eaten'|'removed';exampleOnly:true;creationKey:string;creationSnapshot:string;history:{version:number;draft:MealPhotoDraft;analysis:NutrientResult[];recipeSource?:RecipeDiarySource;status:'eaten'|'removed';at:number}[]};
export function ownDiaryEntries(w:ProductWorld):MealDiaryEntry[]{return w.identity.signedIn?w.objects.filter((o):o is MealDiaryEntry=>o.owner===w.owner&&o.kind==='meal-diary-preview'&&o.exampleOnly===true&&Number.isSafeInteger(o.version)&&Number(o.version)>0&&Array.isArray(o.analysis)&&Array.isArray(o.history)&&w.objects.filter(other=>other.id===o.id).length===1):[];}
export function saveDiaryHistory(entry:MealDiaryEntry,now:number){entry.history.push({version:entry.version,draft:structuredClone(entry.draft),analysis:structuredClone(entry.analysis),...(entry.recipeSource?{recipeSource:structuredClone(entry.recipeSource)}:{}),status:entry.status,at:now});}
export function applyMealPhotoJourney(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null{
 if(!op.startsWith('meal-photo.preview.'))return null;
 if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Sign in to your own food diary.');
 const current=ctx.objectId?ownDiaryEntries(w).find(e=>e.id===ctx.objectId):undefined;
 if(ctx.objectId&&!current)throw Error('This original meal is unavailable to your account.');
 if(op==='meal-photo.preview.save'){
  if(current?.recipeSource)throw Error('Correct this recipe meal through its original recipe review, not through photo ingredients.');
  let draft:MealPhotoDraft;try{draft=reviewedPhotoDraft(JSON.parse(data.draft));}catch(e){throw Error(e instanceof Error?e.message:'Review this complete meal.');}
  const snapshot=photoReviewSnapshot(draft);
  if(data.approved!=='Yes'||data.snapshot!==snapshot)throw Error('Review these exact ingredients, amounts, portion and all 16 values before logging.');
  const today=localNutritionDate(now,draft.timezone),localTime=new Intl.DateTimeFormat('en-GB',{timeZone:draft.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
  if(draft.date>today||draft.date===today&&draft.time>localTime)throw Error('A future meal can be planned, but cannot yet be logged as eaten.');
  if(current){if(data.version!==String(current.version))throw Error('This original meal changed. Reopen its latest version.');if(current.status!=='eaten')throw Error('This meal was removed. Its original history remains available.');if(current.draft.draftId!==draft.draftId)throw Error('Keep this original meal and draft identity.');if(photoReviewSnapshot(current.draft)===snapshot)return {objectId:current.id,message:'This same meal is already saved. No duplicate diary entry was added.'};current.version++;current.draft=draft;current.analysis=photoNutrition(draft);saveDiaryHistory(current,now);return {objectId:current.id,message:'This same meal is corrected. Its previous sixteen-value analysis remains in history.'};}
  const previous=ownDiaryEntries(w).filter(e=>e.creationKey===draft.draftId),raw=w.objects.filter(e=>e.owner===w.owner&&e.kind==='meal-diary-preview'&&e.creationKey===draft.draftId);if(raw.length!==previous.length)throw Error('This original meal has conflicting records. Review it before logging again.');if(previous.length){if(previous.length!==1||previous[0].creationSnapshot!==snapshot)throw Error('This original save attempt has different details. Open the existing meal instead of logging again.');return {objectId:previous[0].id,message:'The original diary save is already recorded. No second meal was logged.'};}
  const entry:MealDiaryEntry={id:localPreviewId(),owner:w.owner,kind:'meal-diary-preview',version:1,draft,analysis:photoNutrition(draft),status:'eaten',exampleOnly:true,creationKey:draft.draftId,creationSnapshot:snapshot,history:[]};saveDiaryHistory(entry,now);w.objects.push(entry);return {objectId:entry.id,message:'Meal recorded as eaten in your private preview diary. This is an example estimate, not a verified food analysis.'};
 }
 if(op==='meal-photo.preview.remove'&&current){if(data.version!==String(current.version)||data.approved!=='Yes')throw Error('Review the latest original before removing this meal.');if(current.status==='removed')return {objectId:current.id,message:'This original meal is already removed from your totals.'};current.status='removed';current.version++;saveDiaryHistory(current,now);return {objectId:current.id,message:'Removed from intake totals. The original correction history is retained.'};}
 throw Error('Open this meal’s supported original action.');
}
export function diaryPeriod(w:ProductWorld,date:string,period:'day'|'week'|'month'){
 if(!validDate(date))throw Error('Choose a valid diary date.');const start=new Date(`${date}T12:00:00Z`);if(period==='week')start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);if(period==='month')start.setUTCDate(1);const end=new Date(start);if(period==='month')end.setUTCMonth(end.getUTCMonth()+1);else end.setUTCDate(end.getUTCDate()+(period==='week'?7:1));const first=start.toISOString().slice(0,10),last=end.toISOString().slice(0,10),entries=ownDiaryEntries(w).filter(e=>e.status==='eaten'&&e.draft.date>=first&&e.draft.date<last);
 const analysis=nutrientFields.map(([code,label,unit])=>{const fields=entries.map(e=>e.analysis.find(v=>v.code===code));return {code,label,unit,value:!entries.length||fields.some(v=>!v||v.value===null)?null:Number(fields.reduce((sum,v)=>sum+v!.value!,0).toFixed(9)),knownSubtotal:Number(fields.reduce((sum,v)=>sum+(v?.knownSubtotal??0),0).toFixed(9)),missingRecipeIds:fields.flatMap(v=>v?.missingRecipeIds??['missing-original']),sources:fields.flatMap(v=>v?.sources??[])};});
 return {first,last,entries,analysis,days:new Set(entries.map(e=>e.draft.date)).size,totalDays:Math.round((+end-+start)/86400000)};
}
