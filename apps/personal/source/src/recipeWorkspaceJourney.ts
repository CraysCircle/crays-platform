import type {ActionContext, Entity, ProductWorld} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
import {applyRecipePlanning} from './recipePlanning.ts';
import {recipeExamples, type RecipeExample} from './nutritionJourney.ts';

// The three existing fictional recipes are design fixtures, not catalogue authority.
export const recipeImage = (id:string) => id==='example-oat-bowl'?'/assets/crays/gym-nutrition-berry-oats.webp':null;
export function availableRecipe(world:ProductWorld,id:string):RecipeExample|undefined {
 return world.identity.signedIn&&world.settings[`recipe-preview:${id}:unavailable`]!==true?recipeExamples.find(r=>r.id===id):undefined;
}
export const recipeAuthority=(r:RecipeExample)=>JSON.stringify({recipe:r,image:recipeImage(r.id),fixture:true});
type RecipePin={itemId:string;recipeId:string;recipeVersion:number;authority:string;addedAt:number};
export type RecipeCollection=Entity&{kind:'recipe-collection-preview';version:number;state:'active'|'archived';name:string;description:string;items:RecipePin[];exampleOnly:true;history:{version:number;action:string;at:number}[]};
type CookingEvent={version:number;action:string;step:number;at:number;servings:string};
export type RecipeCooking=Entity&{kind:'recipe-cooking-preview';version:number;recipeId:string;recipeVersion:number;authority:string;recipe:RecipeExample;servings:string;completedSteps:number;status:'in-progress'|'completed';exampleOnly:true;history:CookingEvent[]};
const unique=(w:ProductWorld,o:Entity)=>w.objects.filter(other=>other.id===o.id).length===1;
export const ownRecipeCollections=(w:ProductWorld):RecipeCollection[]=>w.identity.signedIn?w.objects.filter((o):o is RecipeCollection=>o.owner===w.owner&&o.kind==='recipe-collection-preview'&&o.exampleOnly===true&&Number.isInteger(o.version)&&Array.isArray(o.items)&&Array.isArray(o.history)&&unique(w,o)):[];
export const ownRecipeCooking=(w:ProductWorld):RecipeCooking[]=>w.identity.signedIn?w.objects.filter((o):o is RecipeCooking=>o.owner===w.owner&&o.kind==='recipe-cooking-preview'&&o.exampleOnly===true&&Number.isInteger(o.version)&&Array.isArray(o.history)&&!!o.recipe&&unique(w,o)):[];
function reviewed(data:Record<string,string>){if(data.approved!=='Yes')throw Error('Review this exact recipe action first.');}
function portion(value:string){if(!/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value)||Number(value)<=0||Number(value)>8)throw Error('Choose more than zero and at most eight servings.');return value;}
function name(value:string){if(typeof value!=='string'||!value.trim()||value.trim().length>80)throw Error('Use a collection name between 1 and 80 characters.');return value.trim();}
function description(value:string){if(typeof value!=='string'||value.length>500)throw Error('Keep the collection description within 500 characters.');return value.trim();}
function currentRecipe(w:ProductWorld,data:Record<string,string>){const r=availableRecipe(w,data.recipeId);if(!r||data.recipeVersion!==String(r.version)||data.authority!==recipeAuthority(r))throw Error('This recipe source changed or is unavailable. Reopen the current recipe before continuing.');return r;}
export function applyRecipeWorkspace(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null {
 const planning=applyRecipePlanning(w,op,data,ctx,now);if(planning)return planning;
 if(!op.startsWith('recipe.preview.'))return null;
 if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Sign in to your own recipe workspace.');
 if(!data.idempotencyKey||data.idempotencyKey.length<8||data.idempotencyKey.length>250)throw Error('Reopen this recipe action to prepare its original request.');
 const request=JSON.stringify({op,data,objectId:ctx.objectId||''});
 const originals=[...ownRecipeCollections(w),...ownRecipeCooking(w)];
 const receipts=originals.flatMap(o=>Array.isArray(o.commands)?o.commands.map((c: {key:string;request:string;message:string})=>({...c,objectId:o.id})):[]);
 const receipt=receipts.find(c=>c.key===data.idempotencyKey);
 if(receipt){if(receipt.request!==request)throw Error('This original request was already used for different recipe details. Review a new action.');return {objectId:receipt.objectId,message:receipt.message};}
 const result=applyRecipeCommand(w,op,data,ctx,now);
 const original=w.objects.find(o=>o.owner===w.owner&&o.id===result.objectId);
 if(!original)throw Error('The recipe original could not be retained.');
 original.commands=[...(Array.isArray(original.commands)?original.commands:[]),{key:data.idempotencyKey,request,message:result.message}];
 return result;
}
function applyRecipeCommand(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,now:number):{objectId:string;message:string} {
 reviewed(data);
 if(op==='recipe.preview.collection.create'){
  if(ctx.objectId)throw Error('Create a new collection without replacing an original.');
  const item:RecipeCollection={id:localPreviewId(),owner:w.owner,kind:'recipe-collection-preview',name:name(data.name),description:description(data.description||''),version:1,state:'active',items:[],exampleOnly:true,history:[{version:1,action:'created',at:now}]};
  w.objects.push(item);return {objectId:item.id,message:'Your private collection is saved. No recipe or meal has been published.'};
 }
 if(op.startsWith('recipe.preview.collection.')){
  const c=ownRecipeCollections(w).find(c=>c.id===ctx.objectId);if(!c||c.state!=='active')throw Error('This own collection is unavailable or archived.');
  if(data.version!==String(c.version))throw Error('Your collection changed. Reopen it before applying another change.');
  if(op==='recipe.preview.collection.rename'){c.name=name(data.name);c.description=description(data.description||'');}
  else if(op==='recipe.preview.collection.archive')c.state='archived';
  else if(op==='recipe.preview.collection.add'){
   const r=currentRecipe(w,data);if(c.items.some(i=>i.recipeId===r.id&&i.recipeVersion===r.version))return {objectId:c.id,message:'This exact recipe version is already in your collection.'};
   if(c.items.length>=500)throw Error('This collection has reached its example limit.');
   c.items.push({itemId:localPreviewId(),recipeId:r.id,recipeVersion:r.version,authority:recipeAuthority(r),addedAt:now});
  }else if(op==='recipe.preview.collection.remove'||op==='recipe.preview.collection.move'){
   const index=c.items.findIndex(i=>i.itemId===data.itemId);if(index<0||c.items.filter(i=>i.itemId===data.itemId).length!==1)throw Error('Choose the exact original collection item.');
   if(op.endsWith('.remove'))c.items.splice(index,1);
   else {if(!['up','down'].includes(data.direction))throw Error('Choose the new item position.');const target=index+(data.direction==='up'?-1:1);if(target<0||target>=c.items.length)throw Error('This recipe is already at that end of the collection.');[c.items[index],c.items[target]]=[c.items[target],c.items[index]];}
  }else throw Error('Use the supported original collection action.');
  c.version++;c.history.push({version:c.version,action:op.split('.').at(-1)!,at:now});return {objectId:c.id,message:c.state==='archived'?'Collection archived. Cooking and nutrition originals are retained.':'Your same original collection is updated.'};
 }
 if(op==='recipe.preview.cooking.start'){
  const r=currentRecipe(w,data),servings=portion(data.servings);
  const previous=ownRecipeCooking(w).find(c=>c.recipeId===r.id);
  if(previous)throw Error('Open your existing cooking original to resume or explicitly restart.');
  const c:RecipeCooking={id:localPreviewId(),owner:w.owner,kind:'recipe-cooking-preview',version:1,recipeId:r.id,recipeVersion:r.version,authority:recipeAuthority(r),recipe:structuredClone(r),servings,completedSteps:0,status:'in-progress',exampleOnly:true,history:[{version:1,action:'started',step:0,at:now,servings}]};
  w.objects.push(c);return {objectId:c.id,message:'Cooking progress started privately. Nothing was logged as eaten.'};
 }
 if(op.startsWith('recipe.preview.cooking.')){
  const c=ownRecipeCooking(w).find(c=>c.id===ctx.objectId);if(!c)throw Error('This cooking original is unavailable to your account.');
  if(data.version!==String(c.version))throw Error('Cooking progress changed. Reopen the current step.');
  const r=availableRecipe(w,c.recipeId);if(!r||recipeAuthority(r)!==c.authority)throw Error('The pinned recipe source is unavailable or changed. Progress is retained; it cannot continue against another recipe.');
  if(c.history.some(h=>h.at>now))throw Error('Check the current clock before changing cooking progress.');
  if(op==='recipe.preview.cooking.advance'){
   if(c.status!=='in-progress'||c.completedSteps>=c.recipe.steps.length||data.step!==String(c.completedSteps))throw Error('Review this exact current cooking step.');c.completedSteps++;
  }else if(op==='recipe.preview.cooking.complete'){
   if(c.status!=='in-progress'||c.completedSteps!==c.recipe.steps.length)throw Error('Complete each cooking step before finishing.');c.status='completed';
  }else if(op==='recipe.preview.cooking.restart'){
   if(c.status!=='completed')throw Error('Resume the current cooking session instead of restarting it.');c.servings=portion(data.servings);c.completedSteps=0;c.status='in-progress';
  }else throw Error('Use the supported cooking action.');
  c.version++;c.history.push({version:c.version,action:op.split('.').at(-1)!,step:c.completedSteps,at:now,servings:c.servings});return {objectId:c.id,message:c.status==='completed'?'Cooking finished. This is not reported intake or a diary entry.':'Your same cooking original is saved.'};
 }
 throw Error('Open a supported recipe workflow.');
}
