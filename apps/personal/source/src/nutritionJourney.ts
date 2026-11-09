import type {ActionContext, Entity, ProductWorld} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';

export const nutrientFields = [
 ['energyKcal','Energy','kcal'],['proteinGrams','Protein','g'],['carbohydrateGrams','Carbohydrates','g'],['sugarGrams','Sugar','g'],['fatGrams','Fat','g'],['saturatedFatGrams','Saturated fat','g'],['fibreGrams','Fibre','g'],['sodiumMilligrams','Sodium','mg'],['potassiumMilligrams','Potassium','mg'],['magnesiumMilligrams','Magnesium','mg'],['calciumMilligrams','Calcium','mg'],['ironMilligrams','Iron','mg'],['vitaminDMicrograms','Vitamin D','µg'],['vitaminB12Micrograms','Vitamin B12','µg'],['omega3Grams','Omega-3','g'],['caffeineMilligrams','Caffeine','mg'],
] as const;
export type NutrientCode = typeof nutrientFields[number][0];
type Values = Record<NutrientCode, number|null>;
export type RecipeExample = {id:string;version:number;name:string;minutes:number;servingGrams:number;ingredients:string[];steps:string[];allergens:string[];values:Values;provenance:Record<NutrientCode,string>;fictional:true};
const values=(list:(number|null)[]):Values=>Object.fromEntries(nutrientFields.map(([key],index)=>[key,list[index]??null])) as Values;
const provenance=():Record<NutrientCode,string>=>Object.fromEntries(nutrientFields.map(([key],index)=>[key,index<8?'Wger-only fictional recipe example · not a verified Wger record · original serving basis':'No verified source · not supplied by the current Wger-only contract'])) as Record<NutrientCode,string>;
// Deliberately fictional design data, revision 2: eight illustrative base values and eight unavailable positions.
// These are NOT fetched foods, signed source records, verified analyses or dietary recommendations.
// Existing saved analyses retain their historical snapshots; no migration is performed here.
export const recipeExamples:RecipeExample[]=[
 {id:'example-oat-bowl',version:2,name:'Oat & berry bowl',minutes:10,servingGrams:320,ingredients:['50 g oats','200 g plain yoghurt','70 g berries'],steps:['Combine the oats and yoghurt.','Add berries and rest until the oats soften.'],allergens:['Milk','Oats: check certified gluten-free status if needed'],values:values([360,23,46,15,10,4,7,95]),provenance:provenance(),fictional:true},
 {id:'example-lentil-bowl',version:2,name:'Lentil & garden bowl',minutes:25,servingGrams:430,ingredients:['180 g cooked lentils','200 g mixed vegetables','50 g dressing'],steps:['Rinse and prepare the vegetables.','Combine with cooked lentils and dressing.'],allergens:['Dressing varies: check the actual ingredients'],values:values([520,27,68,12,15,2,18,420]),provenance:provenance(),fictional:true},
 {id:'example-tofu-rice',version:2,name:'Tofu, greens & rice',minutes:30,servingGrams:460,ingredients:['160 g tofu','150 g cooked rice','150 g greens'],steps:['Cook the rice using its package instructions.','Cook the tofu and greens, then serve together.'],allergens:['Soy'],values:values([610,34,70,7,21,3,9,510]),provenance:provenance(),fictional:true},
];
export type MealChoice={recipeId:string;servings:string};
export type NutritionBrief={request:string;date:string;targetBasis:''|'day'|'meal';energy:string;protein:string;carbohydrate:string;fat:string;preferences:string;meals:MealChoice[]};
export type NutrientResult={code:NutrientCode;label:string;unit:string;value:number|null;knownSubtotal:number;missingRecipeIds:string[];sources:{recipeId:string;version:number;source:string;servings:number;label?:string;amountLabel?:string}[]};
const finiteQuantity=(value:string)=>/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value)&&Number.isFinite(Number(value));
export function reviewedBrief(input:NutritionBrief):NutritionBrief {
 if(!input||typeof input.request!=='string'||typeof input.preferences!=='string'||input.request.length>4000||input.preferences.length>2000)throw Error('Review your meal request and preferences.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||new Date(`${input.date}T12:00:00Z`).toISOString().slice(0,10)!==input.date)throw Error('Choose a valid meal date.');
 if(!['day','meal'].includes(input.targetBasis))throw Error('Confirm whether your targets apply to the whole day or to each meal.');
 for(const key of ['energy','protein','carbohydrate','fat'] as const)if(input[key]!==''&&(!finiteQuantity(input[key])||Number(input[key])>100000))throw Error('Targets must be non-negative numbers with their shown units. Leave unknown targets blank.');
 if(!Array.isArray(input.meals)||input.meals.length<1||input.meals.length>6)throw Error('Choose between one and six meals.');
 const meals=input.meals.map(meal=>{if(!recipeExamples.some(r=>r.id===meal.recipeId)||!finiteQuantity(meal.servings)||Number(meal.servings)<=0||Number(meal.servings)>8)throw Error('Choose an available recipe and between 0 and 8 servings, excluding zero.');return {recipeId:meal.recipeId,servings:meal.servings};});
 return {request:input.request.trim(),date:input.date,targetBasis:input.targetBasis,energy:input.energy,protein:input.protein,carbohydrate:input.carbohydrate,fat:input.fat,preferences:input.preferences.trim(),meals};
}
export function nutritionAnalysis(meals:MealChoice[],basis:'portion'|'100g'='portion'):NutrientResult[]{
 let totalWeight=0;const selected=meals.map(meal=>{const r=recipeExamples.find(r=>r.id===meal.recipeId);if(!r||!finiteQuantity(meal.servings)||Number(meal.servings)<=0||Number(meal.servings)>8)throw Error('Review the original recipe and serving amount.');totalWeight+=r.servingGrams*Number(meal.servings);return {r,servings:Number(meal.servings)};});
 return nutrientFields.map(([code,label,unit])=>{let knownSubtotal=0;const missingRecipeIds:string[]=[];const sources=selected.map(({r,servings})=>{if(r.values[code]===null)missingRecipeIds.push(r.id);else knownSubtotal+=r.values[code]!*servings;return {recipeId:r.id,version:r.version,source:r.provenance[code],servings};});const subtotal=basis==='100g'?totalWeight>0?knownSubtotal*100/totalWeight:0:knownSubtotal;return {code,label,unit,value:selected.length>0&&missingRecipeIds.length===0?subtotal:null,knownSubtotal:subtotal,missingRecipeIds,sources};});
}
export function dailyTarget(brief:NutritionBrief,key:'energy'|'protein'|'carbohydrate'|'fat'):number|null {return brief[key]===''?null:Number(brief[key])*(brief.targetBasis==='meal'?brief.meals.length:1);}
export const nutritionSnapshot=(brief:NutritionBrief)=>JSON.stringify(reviewedBrief(brief));
export type NutritionPlan=Entity&{kind:'nutrition-day-preview';version:number;brief:NutritionBrief;analysis:NutrientResult[];status:'planned'|'withdrawn';exampleOnly:true;history:{version:number;brief:NutritionBrief;analysis:NutrientResult[];at:number}[]};
export function ownNutritionPlans(world:ProductWorld):NutritionPlan[]{return world.identity.signedIn?world.objects.filter((o):o is NutritionPlan=>o.owner===world.owner&&o.kind==='nutrition-day-preview'&&o.exampleOnly===true&&Number.isInteger(o.version)&&Array.isArray(o.analysis)&&Array.isArray(o.history)&&world.objects.filter(other=>other.id===o.id).length===1):[];}
export function applyNutritionJourney(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null{
 if(!op.startsWith('nutrition.preview.'))return null;
 if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Sign in to your own nutrition workspace.');
 const current=ctx.objectId?ownNutritionPlans(w).find(o=>o.id===ctx.objectId):undefined;
 if(ctx.objectId&&!current)throw Error('This original plan is unavailable to your account.');
 if(current&&data.version!==String(current.version))throw Error('This plan changed. Review the current version before saving.');
 if(op==='nutrition.preview.save'){
  let input:NutritionBrief;try{input=JSON.parse(data.brief);}catch{throw Error('Review the complete meal brief.');}const brief=reviewedBrief(input);
  if(data.approved!=='Yes'||data.snapshot!==nutritionSnapshot(brief))throw Error('Review this exact target, date, recipes and portions before saving.');
  if(current?.status==='withdrawn')throw Error('This plan was withdrawn. Its original history is retained.');
  if(current&&nutritionSnapshot(current.brief)===nutritionSnapshot(brief))return {objectId:current.id,message:'The same reviewed plan is already saved.'};
  if(current){current.version++;current.brief=brief;current.analysis=nutritionAnalysis(brief.meals);current.history.push({version:current.version,brief:structuredClone(brief),analysis:structuredClone(current.analysis),at:now});return {objectId:current.id,message:'Your same original plan is updated. Earlier versions remain in its history.'};}
  const plan:NutritionPlan={id:localPreviewId(),owner:w.owner,kind:'nutrition-day-preview',version:1,brief,analysis:nutritionAnalysis(brief.meals),status:'planned',exampleOnly:true,history:[]};plan.history.push({version:1,brief:structuredClone(brief),analysis:structuredClone(plan.analysis),at:now});w.objects.push(plan);return {objectId:plan.id,message:'Your sample day is saved privately. Planned meals are not recorded as eaten.'};
 }
 if(op==='nutrition.preview.withdraw'&&current){if(data.approved!=='Yes')throw Error('Confirm withdrawal of this original plan.');current.status='withdrawn';current.version++;return {objectId:current.id,message:'Plan withdrawn. Its earlier versions remain available.'};}
 throw Error('Open the supported original nutrition action.');
}
export function periodNutrition(world:ProductWorld,date:string,period:'week'|'month'){
 const pivot=new Date(`${date}T12:00:00Z`);if(!Number.isFinite(pivot.getTime()))throw Error('Choose a valid overview date.');
 const start=new Date(pivot);if(period==='week')start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);else start.setUTCDate(1);
 const end=new Date(start);if(period==='week')end.setUTCDate(end.getUTCDate()+7);else end.setUTCMonth(end.getUTCMonth()+1);
 const first=start.toISOString().slice(0,10),last=end.toISOString().slice(0,10),plans=ownNutritionPlans(world).filter(p=>p.status==='planned'&&p.brief.date>=first&&p.brief.date<last),days=new Set(plans.map(p=>p.brief.date));
 const conflicts=plans.filter(p=>plans.some(other=>other.id!==p.id&&other.brief.date===p.brief.date)).map(p=>p.brief.date);
 // Sum the retained original values, not today's version of a recipe catalogue.
 const analysis=nutrientFields.map(([code,label,unit])=>{const originals=plans.map(p=>p.analysis.find(r=>r.code===code));const missing=originals.some(r=>!r||r.value===null);const knownSubtotal=originals.reduce((total,r)=>total+(r?.knownSubtotal??0),0);return {code,label,unit,value:!plans.length||missing?null:originals.reduce((total,r)=>total+r!.value!,0),knownSubtotal,missingRecipeIds:originals.flatMap(r=>r?.missingRecipeIds??['original-value-unavailable']),sources:originals.flatMap(r=>r?.sources??[])};});
 return {first,last,plans,days:days.size,totalDays:Math.round((+end-+start)/86400000),conflicts:[...new Set(conflicts)],analysis:conflicts.length?null:analysis};
}
