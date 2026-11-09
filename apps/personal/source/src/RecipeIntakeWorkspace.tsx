import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {BowlFood,CalendarDots,CaretRight,ChatCircle,Check,NotePencil,WarningCircle} from '@phosphor-icons/react';
import {MobileScroll,useKeyboard} from './mobile';
import {VoiceInput,VoiceTextarea} from './VoiceInput';
import type {ActionContext,ActionResult,ProductWorld} from './productModel';
import {Nutrients} from './NutritionWorkspace';
import {newRecipeIntake,ownRecipeDiary,recipeIntakeDraftFrom,recipeIntakeReview,type RecipeIntakeDraft} from './recipeIntakeJourney';
import {availableRecipe,ownRecipeCooking} from './recipeWorkspaceJourney';
import './nutrition-workspace.css';
import './recipe-workspace.css';

type Props={world:ProductWorld;run:(op:string,data:Record<string,string>,ctx:ActionContext)=>ActionResult;recipeId?:string;cookingId?:string;initialId?:string;onBack:()=>void;onDiary:(date:string)=>void;onRecipe:(id:string)=>void;onChuck:(id:string)=>void};
export function RecipeIntakeWorkspace({world,run,recipeId='',cookingId='',initialId='',onBack,onDiary,onRecipe,onChuck}:Props){
 const keyboard=useKeyboard(),body=useRef<HTMLElement>(null);
 const initialEntry=ownRecipeDiary(world).find(e=>e.id===initialId);
 const [sourceCacheKey]=useState(()=>`crays-recipe-intake-draft-v1:${world.owner}:${initialId||`${recipeId}:v${availableRecipe(world,recipeId)?.version||''}:${cookingId}:v${ownRecipeCooking(world).find(c=>c.id===cookingId)?.version||''}`}`);
 const [initial]=useState(()=>{const base=initialEntry?recipeIntakeDraftFrom(initialEntry):newRecipeIntake(world,recipeId,cookingId),version=initialEntry?String(initialEntry.version):'0';try{const cached=JSON.parse(sessionStorage.getItem(sourceCacheKey)||'null');if(cached?.draft&&Object.keys(base).every(k=>typeof cached.draft[k]==='string')&&cached.draft.recipeId===base.recipeId&&cached.draft.cookingId===base.cookingId&&typeof cached.version==='string')return {draft:cached.draft as RecipeIntakeDraft,version:cached.version,resumed:!!initialEntry};}catch{}return {draft:base,version,resumed:false};});
 const [draft,setDraft]=useState(initial.draft),[entryId,setEntryId]=useState(initialId),[version,setVersion]=useState(initial.version);
 const cacheKey=entryId?`crays-recipe-intake-draft-v1:${world.owner}:${entryId}`:sourceCacheKey;
 const [view,setView]=useState<'edit'|'review'|'saved'>(initial.resumed?'edit':initialId?'saved':'edit'),[approval,setApproval]=useState(''),[historyApproval,setHistoryApproval]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(false);
 const entry=ownRecipeDiary(world).find(e=>e.id===entryId);
 let review:ReturnType<typeof recipeIntakeReview>|undefined,validation='';try{review=recipeIntakeReview(world,draft,entryId);if(entry&&view!=='saved'&&version!==String(entry.version)){review=undefined;validation='This meal changed. Reopen its saved original before correcting it.';}}catch(e){validation=e instanceof Error?e.message:'Review this recipe meal.';}
 const reviewToken=review?`${entryId}:${version}:${review.snapshot}`:'',historyToken=entry?JSON.stringify({id:entry.id,version:entry.version,source:entry.recipeSource,draft:entry.draft,analysis:entry.analysis}):'';
 useEffect(()=>{if(!world.identity.signedIn||view==='saved')return;try{sessionStorage.setItem(cacheKey,JSON.stringify({draft,version}));}catch{setMessage('This tab could not retain the draft. Keep it open until you save.');setError(true);}},[cacheKey,draft,version,view,world.identity.signedIn]);
 useLayoutEffect(()=>{keyboard.hide();body.current?.closest('[data-testid="mobile-scroll"]')?.scrollTo({top:0,behavior:'auto'});},[view]);
 const patch=(change:Partial<RecipeIntakeDraft>)=>{setDraft(d=>({...d,...change}));setApproval('');setMessage('');};
 const go=(next:typeof view)=>{keyboard.hide();setView(next);setMessage('');setError(false);setHistoryApproval('');};
 const resultMessage=(result:ActionResult)=>{setMessage(result.message);setError(!result.ok);return result;};
 const edit=()=>{if(!entry)return;setDraft(recipeIntakeDraftFrom(entry));setVersion(String(entry.version));setApproval('');go('edit');};
 const discard=()=>{if(!entry)return;try{sessionStorage.removeItem(cacheKey);}catch{}setDraft(recipeIntakeDraftFrom(entry));setVersion(String(entry.version));setApproval('');go('saved');};
 const save=()=>{keyboard.hide();if(!review)return;const result=resultMessage(run('recipe-intake.preview.save',{draft:JSON.stringify(draft),version,snapshot:review.snapshot,approved:approval===reviewToken?'Yes':'No'},{featureId:'AL-248',capabilityId:'B2C-CAP-043',...(entryId?{objectId:entryId}:{})}));if(result.ok){const saved=ownRecipeDiary(result.world).find(e=>e.id===result.objectId);if(saved){setEntryId(saved.id);setVersion(String(saved.version));setDraft(recipeIntakeDraftFrom(saved));setApproval('');setView('saved');try{sessionStorage.removeItem(cacheKey);}catch{}}}};
 const field=(label:string,value:string,onChange:(v:string)=>void,type='text')=><label className="nutrition-field"><span>{label}</span><VoiceInput aria-label={label} type={type} step={type==='time'?'1':type==='number'?'0.001':undefined} value={value} onChange={e=>onChange(e.target.value)} onBlur={()=>keyboard.hide()}/></label>;
 if(!world.identity.signedIn)return <MobileScroll><article className="nutrition-page"><h1>Your food diary is private.</h1><p>Sign in to open your own reported meals.</p></article></MobileScroll>;
 if(entryId&&!entry)return <MobileScroll><article className="nutrition-page"><h1>This recipe meal is unavailable.</h1><p>No other meal or source has been substituted.</p><button className="nutrition-link" onClick={onBack}>Back to where I was</button></article></MobileScroll>;
 const displayed=view==='saved'&&entry?entry.draft:draft,source=view==='saved'&&entry?entry.recipeSource:review?.source;
 return <MobileScroll><article className="nutrition-page recipe-intake-page" ref={body} data-testid="recipe-intake-workspace">
 <p className="nutrition-eyebrow">{view==='saved'?'YOUR REPORTED MEAL':'FROM RECIPE TO YOUR DIARY'}</p><h1>{view==='saved'?entry?.draft.name||source?.recipe.name||'Your recipe meal':view==='edit'?'What did you actually eat?':'Your portion. Your review.'}</h1>
 {view==='edit'?<>
  <p>Cooking is separate from eating. Choose the amount and time you want to record.</p>
  {entry&&<div className="nutrition-clarification" role="status"><NotePencil size={23}/><p>This correction stays a draft. The saved meal and its totals change only after your separate review and save.</p></div>}
  <section className="recipe-intake-source"><BowlFood size={27}/><div><h2>{availableTitle(world,draft,entry?.recipeSource?.recipe.name)}</h2><p>{draft.cookingId?'From your selected completed cooking cycle':'From the selected fictional recipe example'}</p></div></section>
  {field('Original servings I ate',draft.portion,v=>patch({portion:v}),'number')}
  <p className="nutrition-caption">0.5 means half of one original recipe serving, not half of the amount cooked. Nothing is filled in as eaten for you.</p>
  {field('Date eaten',draft.date,v=>patch({date:v}),'date')}{field('Time eaten',draft.time,v=>patch({time:v}),'time')}{field('Meal time zone',draft.timezone,v=>patch({timezone:v}))}
  <label className="nutrition-field"><span>Meal</span><select aria-label="Recipe meal type" value={draft.meal} onChange={e=>{keyboard.hide();patch({meal:e.target.value as RecipeIntakeDraft['meal']});}}><option value="">Choose a meal</option>{(['BREAKFAST','LUNCH','DINNER','SNACK'] as const).map(m=><option key={m} value={m}>{m[0]+m.slice(1).toLowerCase()}</option>)}</select></label>
  <label className="nutrition-field"><span>Private recipe meal note</span><VoiceTextarea aria-label="Private recipe meal note" value={draft.note} maxLength={500} onChange={e=>patch({note:e.target.value})} onBlur={()=>keyboard.hide()}/></label>
  <button className="nutrition-primary" onClick={()=>{keyboard.hide();if(!review){setMessage(validation);setError(true);return;}go('review');}}>Review portion & 16 nutrients <CaretRight size={21}/></button>
  {entry&&<button className="nutrition-link" onClick={discard}>Discard edits & open saved meal</button>}
  <button className="nutrition-link" onClick={()=>{keyboard.hide();onBack();}}>Back without logging</button>
 </>:<>
  {source&&<section className="recipe-intake-summary"><BowlFood size={25}/><h2>{displayed.portion} original servings</h2><p>{displayed.date} · {displayed.time} · {displayed.timezone}</p><p>{displayed.meal.toLowerCase()} · {source.recipe.name} · recipe v{source.recipeVersion}</p>{source.cookedServings&&<p>Cooked: {source.cookedServings} servings. Reported eaten: {displayed.portion}.</p>}</section>}
  {view==='saved'&&entry?.status==='removed'&&<div className="nutrition-clarification" role="status"><WarningCircle size={25}/><p>Removed from intake totals. The earlier recipe values and corrections remain in this original’s history.</p></div>}
  {view==='review'&&!review?<div role="alert" className="nutrition-clarification"><WarningCircle size={24}/><p>{validation}</p></div>:<Nutrients rows={view==='saved'&&entry?entry.analysis:review!.analysis} basis="For the original recipe servings you report eating; missing values remain unknown"/>}
  {source&&<details><summary>Original recipe & portion basis</summary><h2>{source.recipe.name}</h2><p>One original serving: {source.recipe.servingGrams} g. Your reported amount: {displayed.portion} original servings.</p><ul>{source.recipe.ingredients.map(i=><li key={i}>{i}</li>)}</ul><p>This frozen example source stays with the diary version. It is not replaced by a later catalogue recipe or photo estimate.</p></details>}
  {displayed.note&&<blockquote>{displayed.note}</blockquote>}
  <p className="nutrition-caption">Fictional recipe values, not a measured meal or verified allergy assessment. This does not change your meal plan or publish health data.</p>
  {view==='review'?<>
   <button className="nutrition-approval" role="checkbox" aria-checked={!!reviewToken&&approval===reviewToken} onClick={()=>{keyboard.hide();setApproval(approval===reviewToken?'':reviewToken);}}><span>{!!reviewToken&&approval===reviewToken&&<Check size={17}/>}</span>I reviewed this eaten portion, time, recipe source and all 16 values, including missing ones.</button>
   <button className="nutrition-primary" disabled={!reviewToken||approval!==reviewToken} onClick={save}>{entry?'Save correction to this meal':'Log this recipe portion as eaten'} <Check size={20}/></button><button className="nutrition-link" onClick={()=>go('edit')}><NotePencil size={20}/> Correct portion or time</button>
  </>:entry&&<>
   <button className="nutrition-primary" disabled={entry.status==='removed'} onClick={edit}><NotePencil size={20}/> Correct this recipe meal</button>
   <button className="nutrition-link" onClick={()=>{keyboard.hide();onDiary(entry.draft.date);}}><CalendarDots size={23}/> See my day & totals <CaretRight size={19}/></button>
   <button className="nutrition-link" onClick={()=>{keyboard.hide();onRecipe(entry.recipeSource!.recipeId);}}><BowlFood size={23}/> Open the original recipe <CaretRight size={19}/></button>
   <button className="nutrition-link" onClick={()=>{keyboard.hide();onChuck(entry.id);}}><ChatCircle size={23}/> Review this reported meal with Chuck</button>
   <details><summary>Versions & intake correction</summary>{entry.history.map(h=><p key={h.version}>Version {h.version} · {h.draft.portion} servings · {h.draft.date} · {h.analysis.length} nutrient fields · {h.status}</p>)}
    <button className="nutrition-approval" role="checkbox" aria-checked={historyApproval===historyToken} onClick={()=>{keyboard.hide();setHistoryApproval(historyApproval===historyToken?'':historyToken);}}><span>{historyApproval===historyToken&&<Check size={17}/>}</span>{entry.status==='removed'?'Restore this same reported meal with its retained portion and values.':'Remove this meal from intake totals while keeping its correction history.'}</button>
    <button className="nutrition-link" disabled={historyApproval!==historyToken} onClick={()=>{keyboard.hide();const restore=entry.status==='removed';const r=resultMessage(run(restore?'recipe-intake.preview.restore':'meal-photo.preview.remove',{version:String(entry.version),approved:historyApproval===historyToken?'Yes':'No',snapshot:historyToken},{featureId:'AL-248',objectId:entry.id}));if(r.ok){setHistoryApproval('');const saved=ownRecipeDiary(r.world).find(e=>e.id===entry.id);if(saved){setVersion(String(saved.version));setDraft(recipeIntakeDraftFrom(saved));}}}}>{entry.status==='removed'?'Restore same recipe meal':'Remove recipe meal from totals'}</button>
   </details><button className="nutrition-link" onClick={()=>{keyboard.hide();onBack();}}>Back to where I was</button>
  </>}
 </>}
 {message&&<p className={`nutrition-notice ${error?'error':''}`} role={error?'alert':'status'}>{message}</p>}
 </article></MobileScroll>;
}
function availableTitle(w:ProductWorld,d:RecipeIntakeDraft,fallback?:string){try{const r=JSON.parse(d.authority)?.recipe;return w.identity.signedIn&&r?.id===d.recipeId&&typeof r.name==='string'?r.name:fallback||'Selected recipe';}catch{return fallback||'Selected recipe';}}
