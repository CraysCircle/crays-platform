import type {ProductWorld} from './productModel.ts';
import {pantryProduct,pantryRecipeSnapshot} from './personalPantry.ts';
import type {RecipePlanningDraft} from './recipePlanning.ts';
export type PantryPlanningSource={owner:string;products:ReturnType<typeof pantryRecipeSnapshot>;scope:'own-recorded-stock-to-private-planning';stockMutation:false};
export type PantryPlanningIntent={name:string;request:string;preferences:string};
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
/** Snapshot is private, versioned and independent of any cooking/stock-consumption authority. */
export function capturePantryPlanningSource(w:ProductWorld,productIds:string[]):PantryPlanningSource{
 need(w.identity.signedIn&&productIds.length>0&&productIds.length<=80&&new Set(productIds).size===productIds.length,'Select one to eighty exact own pantry products.');
 for(const id of productIds){const p=pantryProduct(w,id);need(p?.state==='active','Choose only your own active pantry product originals.');}
 return structuredClone({owner:w.owner,products:pantryRecipeSnapshot(w,productIds),scope:'own-recorded-stock-to-private-planning',stockMutation:false});
}
export function currentPantryPlanningSource(w:ProductWorld,source:PantryPlanningSource){
 need(source&&source.owner===w.owner&&w.identity.signedIn&&source.scope==='own-recorded-stock-to-private-planning'&&source.stockMutation===false&&Array.isArray(source.products),'Use your own original private pantry selection.');
 const current=capturePantryPlanningSource(w,source.products.map(p=>p.productId));
 need(JSON.stringify(source)===JSON.stringify(current),'The selected pantry product, batch, quantity or expiry changed. Return to the pantry and review its current records again.');return current;
}
export function pantryPlanningReview(w:ProductWorld,source:PantryPlanningSource,intent:PantryPlanningIntent){
 const current=currentPantryPlanningSource(w,source);need(intent&&Object.keys(intent).sort().join(',')==='name,preferences,request'&&typeof intent.name==='string'&&intent.name.trim()&&intent.name.length<=160&&typeof intent.request==='string'&&intent.request.trim()&&intent.request.length<=4000&&typeof intent.preferences==='string'&&intent.preferences.length<=2000,'Name this private planning draft and enter your own meal-planning request.');
 for(const p of current.products){need(p.name.length<=120,'This product name is longer than the recipe planning limit. Shorten it in your pantry and review the source again.');need(['g','ml','piece'].includes(p.unit),'Use a supported exact pantry base unit.');if(p.quantity!=='')need(/^\d+(?:\.\d{1,3})?$/.test(p.quantity)&&Number(p.quantity)<=1000000,'This recorded amount exceeds the recipe planning limit. Review the product instead of silently rounding or truncating it.');}
 return JSON.stringify({source:current,intent,action:'copy-private-planning-assumptions',stockMutation:false,payment:false,cooking:false,nutritionIntake:false});
}
/** Rechecks current getWorld output at confirmation time. Copies only assumptions; never writes any ProductWorld field. */
export function reviewedPantryPlanningDraft(w:ProductWorld,source:PantryPlanningSource,intent:PantryPlanningIntent,approval:string):RecipePlanningDraft{
 need(approval===pantryPlanningReview(w,source,intent),'Personally approve this exact current pantry-to-planning copy.');
 return {name:intent.name.trim(),request:intent.request.trim(),preferences:intent.preferences.trim(),excludeIngredients:[],recipes:[],pantry:source.products.map(p=>({id:`recorded-pantry:${p.productId}:v${p.version}`,name:p.name,unit:p.unit==='piece'?'pcs':p.unit,quantity:p.quantity}))};
}
