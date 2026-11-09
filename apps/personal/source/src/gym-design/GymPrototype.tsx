import {useEffect, useRef, useId, useState, type ComponentType, type ReactNode} from 'react';
import {ArrowRight, Barbell, CalendarBlank, Heart, House, ForkKnife, ShoppingBag, UsersThree, DotsThree, ShieldCheck, CreditCard, User, Question, Play, Plus, MagnifyingGlass, Check, Clock, CaretLeft,Bell} from '@phosphor-icons/react';
import navigation from './original-navigation.json';
import {TrainingHistoryMockup,TrainingSettingsMockup} from './TrainingDetailMockups';
import {DocumentMockup} from './DocumentMockup';
import {ShopMockup} from './ShopMockup';
import {MealPrepMockup,type DesignPreparedBatch} from './MealPrepMockup';
import {PantryMockup,type DesignPantryLot} from './PantryMockup';
import {NutritionMainPage,initialNutritionMeals,initialNutritionLots} from './NutritionMainPage';
import {nutritionRecipes,type DesignRecipeFixture,type DesignRecipeRequest} from './nutrition-examples';
import {ConnectionsMockup} from './ConnectionsMockup';
import {TrainingMainPage} from './TrainingMainPage';
import {TodayMockup} from './TodayMockup';
import {BookMainPage} from './BookMainPage';
import {HealthMainPage} from './HealthMainPage';
import {CoachingMainPage} from './CoachingMainPage';
import {AccessMainPage} from './AccessMainPage';
import {MembershipMainPage} from './MembershipMainPage';
import {AccountMainPage} from './AccountMainPage';
import {NotificationsMainPage} from './NotificationsMainPage';
import {HelpMainPage} from './HelpMainPage';
import helpHero from './source-media/help-original-training-support-hero.jpg';
import notificationsHero from './source-media/notifications-original-dumbbell-moment-hero.jpg';
import {ReferralsMainPage} from './ReferralsMainPage';
import referralsHero from './source-media/referrals-original-highfive-hero.webp';
import referralsIntroduction from './source-media/referrals-original-friends-context.avif';
import referralsTrainingSupport from './source-media/referrals-original-joint-training-context.webp';
import {RecipeMockup,type DesignMeal} from './RecipeMockup';
import {MemberProgressPage} from '../gym-data/MemberProgressPage';
import './gym-prototype.css';

export type GymHistoryContext={sessionId?:string;state?:'ACTIVE'|'PAUSED'|'ABORTED'|'COMPLETED';from?:string;to?:string};
export type GymRoute = {surface:string; tab?:string;history?:GymHistoryContext};
type Navigate = (route:GymRoute)=>void;
type RegionProps = {id:string; labels:readonly string[]; children:ReactNode; className?:string; minWidth?:number; itemIds?:readonly string[]; retainedItemIds?:readonly string[]; basis?:readonly string[]};
type SortProps = {id:string; label:string; compact?:boolean; className?:string; blocks:{id:string; label:string; content:ReactNode}[]};
export type GymDesignPorts = {AdjustableRegion:ComponentType<RegionProps>; SortableRegion:ComponentType<SortProps>; media:(name:string)=>string};
const destinations:Record<string,string>={today:'today',book:'book',performance:'health',progress:'training',nutrition:'nutrition',shop:'shop',coaching:'coaching',help:'more'};
const icons = {today:House,book:CalendarBlank,performance:Heart,progress:Barbell,nutrition:ForkKnife,shop:ShoppingBag,coaching:UsersThree,help:DotsThree};

/** Render in the existing Gym context column. Global rail, login and header stay with the host. */
export function GymPrototypeNavigation({route,onNavigate,ports}:{route:GymRoute;onNavigate:Navigate;ports:GymDesignPorts}) {
 const Sortable=ports.SortableRegion;
 const active=['training','progress'].includes(route.surface)?'progress':['health','connections'].includes(route.surface)?'performance':route.surface==='recipes'?'nutrition':route.surface;
 const utility=[
  {id:'access',label:'Access',surface:'access',Icon:ShieldCheck},
  {id:'membership',label:'Memberships',surface:'membership',Icon:CreditCard},
  {id:'profile',label:'Account & Privacy',surface:'profile',tab:'Privacy',Icon:User},
  {id:'referrals',label:'Invite friends',surface:'referrals',Icon:UsersThree},
  {id:'notifications',label:'Notifications',surface:'profile',tab:'Notifications',Icon:Bell},
  {id:'help',label:'Help',surface:'support',Icon:Question},
 ];
 return <nav className="gym-prototype-navigation" aria-label="Gym member navigation">
  <Sortable id="personal-web:navigation:gym" label="Gym navigation" compact className="web-context-items" blocks={navigation.primary.filter(entry=>entry.key!=='help').map(entry=>{
   const Icon=icons[entry.key as keyof typeof icons],surface=destinations[entry.key],label=entry.label.charAt(0)+entry.label.slice(1).toLowerCase(),selected=active===entry.key;
   return {id:entry.key,label,content:<button type="button" className={selected?'selected':''} aria-current={selected?'page':undefined} onClick={()=>onNavigate({surface})}><Icon size={22}/>{label}</button>};
  })}/>
  <div className="gym-utility-navigation"><Sortable id="personal-web:navigation:gym:utility" label="Gym account navigation" compact className="web-context-items" blocks={utility.map(({id,label,surface,tab,Icon})=>{
   const selected=route.surface===surface&&(id==='notifications'?route.tab==='Notifications':id==='profile'?route.tab!=='Notifications':true);
   return {id,label,content:<button type="button" className={selected?'selected':''} aria-current={selected?'page':undefined} onClick={()=>onNavigate({surface,tab})}><Icon size={22}/>{label}</button>};
  })}/></div>
 </nav>;
}

function Tabs({items,value,onChange,label}:{items:readonly string[];value:string;onChange:(value:string)=>void;label:string}) {
 const id=useId();
 // These select views. Buttons with aria-pressed retain ordinary Tab-key access for every view.
 return <div className="gym-design-tabs" role="group" aria-label={label} id={id}>{items.map(item=><button key={item} type="button" aria-pressed={item===value} onClick={()=>onChange(item)}>{item}</button>)}</div>;
}
function Action({children,onClick,primary=false}:{children:ReactNode;onClick:()=>void;primary?:boolean}){return <button type="button" className={'gym-design-action'+(primary?' primary':'')} onClick={onClick}>{children}<ArrowRight size={18}/></button>}
function Row({title,detail,onClick}:{title:string;detail:string;onClick:()=>void}){return <button type="button" className="gym-design-row" onClick={onClick}><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={19}/></button>}
function MediaCard({image,title,detail,onClick,ports}:{image:string;title:string;detail:string;onClick:()=>void;ports:GymDesignPorts}){return <button type="button" className="gym-design-media" onClick={onClick}><img src={ports.media(image)} alt=""/><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={20}/></button>}

/** Frontend-only design stage. All example edits stay in this mounted prototype's memory. */
export function GymPrototypeContent({route,onNavigate,ports,globalAccountId,onSessionInvalidated}:{route:GymRoute;onNavigate:Navigate;ports:GymDesignPorts;globalAccountId?:string;onSessionInvalidated?:()=>void}) {
 const pageRef=useRef<HTMLElement>(null);
 useEffect(()=>{const article=pageRef.current;const heading=[...article?.querySelectorAll<HTMLElement>('h1')??[]].find(node=>node.getClientRects().length>0);if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}article?.scrollTo({top:0,left:0,behavior:'instant'});article?.closest('main')?.scrollTo({top:0,left:0,behavior:'instant'});},[route.surface,route.tab]);
 const A=ports.AdjustableRegion;
 const tab=route.tab;
 const [notice,setNotice]=useState('');
 const [sets,setSets]=useState<{id:number;kg:string;reps:string;rpe:string}[]>([]);
 const [workout,setWorkout]=useState<'Ready'|'In progress'|'Paused'|'Finished'>('Ready');
 const [exampleWorkoutTitle,setExampleWorkoutTitle]=useState('Full body');
 const hasLocalWorkout=workout==='In progress'||workout==='Paused'||(workout==='Ready'&&sets.length>0);
 const [query,setQuery]=useState('');
 const [logged,setLogged]=useState(false);
 const [preparedBatches,setPreparedBatches]=useState<DesignPreparedBatch[]>([]);
 const [designMeals,setDesignMeals]=useState<DesignMeal[]>(initialNutritionMeals);
 const [nutritionLots,setNutritionLots]=useState<DesignPantryLot[]>(initialNutritionLots);
 const [recipeVersion,setRecipeVersion]=useState(nutritionRecipes[0].version);
 const [recipeRequest,setRecipeRequest]=useState<DesignRecipeRequest>();
 const recipeRequestSequence=useRef(0);
 const [recipeFavorites,setRecipeFavorites]=useState<Record<string,boolean>>({});
 function openNutritionRecipe(recipe:DesignRecipeFixture,view:DesignRecipeRequest['view'],date:string,meal:string){setRecipeVersion(recipe.version);setRecipeRequest({id:++recipeRequestSequence.current,view,date,meal:meal==='Snacks'?'Snack':meal});setNotice('');onNavigate({surface:'recipes',tab:'Catalogue'});}
 const titles:Record<string,string>={today:'Your day at CRAYS',book:'Make time for yourself.',health:'Your health, together.',training:'Your training.',progress:'My progress',nutrition:'Eat well. Feel good.',recipes:'Find recipes',shop:'Your Gym essentials.',coaching:'A little guidance.',more:'More from your Gym.',access:'Gym access',membership:'Your membership',profile:'Account & Privacy',support:'How can we help?',connections:'Connections & data'};
 function go(surface:string,nextTab?:string){setNotice('');if(surface==='recipes')setRecipeRequest({id:++recipeRequestSequence.current,view:'catalogue',date:'2026-10-28',meal:'Breakfast'});onNavigate({surface,tab:nextTab});}
 const trainingHome=route.surface==='training'&&tab!=='Workout';
 const healthOverview=route.surface==='health';
 const nutritionHome=route.surface==='nutrition'&&(!tab||tab==='Food diary');
 const shoppingHome=route.surface==='shop'&&(!tab||tab==='Discover');
 const notificationsHome=route.surface==='profile'&&tab==='Notifications';
 const accountHome=route.surface==='profile'&&(!tab||tab==='Privacy'||tab==='Profile');
 const hasImageHeading=route.surface==='progress'||route.surface==='support'||notificationsHome||route.surface==='referrals'||accountHome||route.surface==='membership'||route.surface==='access'||route.surface==='coaching'||route.surface==='today'||route.surface==='book'||healthOverview||trainingHome||nutritionHome||shoppingHome;
 const focusedWorkspace=route.surface==='progress'||route.surface==='support'||notificationsHome||route.surface==='referrals'||accountHome||route.surface==='membership'||route.surface==='access'||route.surface==='coaching'||route.surface==='today'||route.surface==='book'||healthOverview||trainingHome||nutritionHome||shoppingHome||route.surface==='connections'||(route.surface==='training'&&tab==='Workout')||(route.surface==='profile'&&tab==='Documents')||route.surface==='recipes'||(route.surface==='shop'&&Boolean(tab)&&tab!=='Discover');
 const aside=<aside className="gym-design-aside"><A id={'personal-web:gym:'+route.surface+':aside'} labels={['Your Gym','Quick access']} itemIds={['gym-summary','quick-access']} className="gym-aside-panels" minWidth={220}><section><h2>Your Gym</h2><p>Training, nutrition and recovery in one place.</p><Row title="My training" detail="Plan, workout and progress" onClick={()=>go('training')}/><Row title="My nutrition" detail="Food diary, recipes and meal prep" onClick={()=>go('nutrition')}/><Row title="Connections & data" detail="Devices, consent and imports" onClick={()=>go('connections')}/></section><section><h2>Quick access</h2><Row title="Access" detail="Your Gym entry" onClick={()=>go('access')}/><Row title="Membership" detail="Your plan and documents" onClick={()=>go('membership')}/><Row title="Help" detail="Support for your Gym" onClick={()=>go('support')}/></section></A></aside>;
 const screen=<>
  <div hidden={route.surface!=='today'}><TodayMockup onNavigate={onNavigate} ports={ports} active={route.surface==='today'} context={route.surface==='today'?aside:<aside hidden/>}/></div>
  {route.surface==='training'&&!trainingHome&&<><Tabs label="Training and progress" items={['My training','My progress']} value="My training" onChange={t=>t==='My progress'&&go('progress')}/><Tabs label="Training tasks" items={navigation.subtabs.training} value={tab||'Training home'} onChange={t=>go('training',t)}/>{(!tab||tab==='Training home')&&<><h2>Your training, your way.</h2>{[['Training plan','Your plans, templates and calendar'],['Exercise library','Movement guides and alternatives'],['History','Sessions, sets and corrections'],['Strength trends','Your recorded progression'],['Settings','Goals, units, equipment and preferences']].map(([title,detail])=><Row key={title} title={title} detail={detail} onClick={()=>go('training',title)}/>)}<Row title="Wearables" detail="Your connected training sources" onClick={()=>go('connections')}/></>}{(tab==='Plan'||tab==='Training plan')&&<><div className="gym-design-section-heading"><h2>Your week</h2><Action onClick={()=>setNotice('Plan editor is part of the next mockup pass.')}>Edit plan</Action></div><p className="gym-design-muted">Example schedule · Wednesday, 28 October</p><Row title="Today · Full body" detail="Strength · 45 min · Design example" onClick={()=>go('training','Workout')}/><Row title="Friday · Strength & mobility" detail="Your next planned session · Design example" onClick={()=>go('training','Workout')}/><Action primary onClick={()=>go('training','Workout')}>Open workout</Action></>}
  {tab==='Workout'&&<><div className="gym-design-section-heading"><div><h2>{exampleWorkoutTitle}</h2><p className="gym-design-muted">Example workout · {workout}</p></div><Action primary onClick={()=>{setWorkout(workout==='In progress'?'Paused':'In progress');setNotice('Workout state changed in this prototype only.')}}>{workout==='In progress'?'Pause workout':workout==='Paused'?'Resume workout':'Start workout'}</Action></div><section className="gym-design-panel"><h3>Squat · Design example</h3><p>Sets, weight, repetitions and perceived effort stay together.</p><div className="gym-design-table-wrap"><table><caption>Example workout sets</caption><thead><tr><th scope="col">Set</th><th scope="col">Weight · kg</th><th scope="col">Repetitions</th><th scope="col">RPE</th></tr></thead><tbody>{sets.map((set,i)=><tr key={set.id}><th scope="row">{i+1}</th>{(['kg','reps','rpe'] as const).map(field=><td key={field}><input aria-label={`${field} for set ${i+1}`} inputMode="decimal" value={set[field]} onChange={e=>setSets(values=>values.map(v=>v.id===set.id?{...v,[field]:e.target.value}:v))}/></td>)}</tr>)}</tbody></table></div><button type="button" className="gym-design-add" onClick={()=>setSets(values=>[...values,{id:Date.now(),kg:'',reps:'',rpe:''}])}><Plus size={19}/>Add set</button></section><div className="gym-design-inline"><Action onClick={()=>setNotice('Rest timer interaction is planned; no real workout timer was changed.')}><Clock size={18}/>Rest timer</Action><Action onClick={()=>{setWorkout('Finished');setNotice('Example workout finished locally. Your original workout is unchanged.')}}><Check size={18}/>Finish example</Action></div></>}
  {(tab==='Exercises'||tab==='Exercise library')&&<><label className="gym-design-search"><MagnifyingGlass size={22}/><input aria-label="Find an exercise" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find an exercise"/></label>{['Squat','Deadlift','Bench press'].filter(s=>s.toLowerCase().includes(query.toLowerCase())).map(name=><Row key={name} title={name} detail="Movement detail · Design example" onClick={()=>setNotice(`${name}: exercise detail and original movement media will be added in the detailed mockup.`)}/>)}</>}
  {tab==='Progress'&&<><h2>My training · My progress</h2><p>Goals, measurements and weekly review keep their original place.</p><Action onClick={()=>go('progress')}>Open My progress</Action></>}
  {tab==='History'&&<TrainingHistoryMockup/>}{tab==='Settings'&&<TrainingSettingsMockup onConnections={()=>go('connections')}/>} {tab==='Strength trends'&&<><h2>Strength trends</h2><p className="gym-design-muted">Your recorded progression remains separate from example workouts. This detailed view is still being mapped.</p></>}{tab==='Challenges'&&<><h2>Your challenges</h2><p>Participation, evidence and review will use the original challenge relationships.</p><Action onClick={()=>go('progress','Challenges')}>View challenges</Action></>}</>}
  {route.surface==='progress'&&<MemberProgressPage tab={tab} ports={ports} onNavigate={onNavigate} globalAccountId={globalAccountId} onSessionInvalidated={onSessionInvalidated}/>}
  {route.surface==='nutrition'&&!nutritionHome&&<><Tabs label="Nutrition and recipes" items={['My nutrition','Find recipes']} value="My nutrition" onChange={t=>t==='Find recipes'&&go('recipes')}/><Tabs label="Nutrition tasks" items={navigation.subtabs.nutrition} value={tab||'Food diary'} onChange={t=>go('nutrition',t)}/>{(!tab||tab==='Food diary')&&<><div className="gym-design-section-heading"><h2>Your food diary</h2><div className="gym-design-inline">{['Day','Week','Month'].map(period=><button type="button" key={period} onClick={()=>setNotice(`${period} view is reserved in the next mockup pass.`)}>{period}</button>)}</div></div><p className="gym-design-muted">Example day · no original diary records are displayed.</p><Row title="Breakfast" detail={logged?'One example meal added locally':'Add a meal to your day'} onClick={()=>{setLogged(!logged);setNotice(logged?'Example meal removed.':'Example meal added locally; no original food record created.')}}/><Row title="Lunch" detail="Find a recipe for your day" onClick={()=>go('recipes')}/>{designMeals.map(entry=><div className="gym-design-diary-example" key={entry.id}><span><strong>{entry.name}</strong><small>{entry.date} · {entry.meal} · {entry.servings} servings · frozen example recipe version · {entry.adaptation?.description||'Original example ingredients'}</small></span><button type="button" className="gym-design-action" disabled={Boolean(entry.sourceBatchId)} onClick={()=>setDesignMeals(values=>values.filter(value=>value.id!==entry.id))}>{entry.sourceBatchId?"Meal Prep consumption snapshot":"Undo example meal"}</button></div>)}<Nutrients/></>}{tab==='Food log & goals'&&<><h2>Food log & goals</h2><p>Your targets, history and planning constraints will stay together.</p><Action onClick={()=>setNotice('Target form is planned in the detailed mockup pass.')}>Review goals</Action></>}</>}
  {route.surface==='recipes'&&<><Tabs label="Nutrition and recipes" items={['My nutrition','Find recipes']} value="Find recipes" onChange={t=>t==='My nutrition'&&go('nutrition')}/><Tabs label="Recipe tasks" items={navigation.subtabs.recipes} value={tab||'Catalogue'} onChange={t=>go('recipes',t)}/></>}


  <TrainingMainPage historyContext={route.surface==='training'?route.history:undefined} globalAccountId={globalAccountId} onSessionInvalidated={onSessionInvalidated} ports={ports} onNavigate={onNavigate} active={trainingHome} tab={route.surface==='training'?tab:undefined} hasLocalWorkout={hasLocalWorkout} hasFinishedWorkout={workout==='Finished'} onWorkout={title=>{if(!hasLocalWorkout&&workout!=='Finished')setExampleWorkoutTitle(title);go('training','Workout')}}/>
  <NutritionMainPage ports={ports} active={nutritionHome} onNavigate={onNavigate} meals={designMeals} onMeals={setDesignMeals} lots={nutritionLots} onLots={setNutritionLots} batches={preparedBatches} onRecipe={openNutritionRecipe} favorites={recipeFavorites} onFavorite={(version,value)=>setRecipeFavorites(previous=>({...previous,[version]:value}))}/>
  <HealthMainPage globalAccountId={globalAccountId} onSessionInvalidated={onSessionInvalidated} ports={ports} onNavigate={onNavigate} active={healthOverview} tab={route.surface==='health'?tab:undefined}/>
  <BookMainPage ports={ports} onNavigate={onNavigate} active={route.surface==='book'} tab={route.surface==='book'?tab:undefined}/>
  {route.surface==='shop'&&!shoppingHome&&<><Tabs label="Gym shop" items={navigation.subtabs.shop} value={tab||'Discover'} onChange={t=>go('shop',t)}/></>}
  <CoachingMainPage ports={ports} onNavigate={onNavigate} active={route.surface==='coaching'} section={route.surface==='coaching'?tab:undefined}/>
  {route.surface==='more'&&<>{[['access','Access','Your Gym entry'],['membership','Membership','Plan, billing and documents'],['profile','Account & Privacy','Your profile and data controls'],['support','Help','Support and recovery'],['referrals','Invite friends','Original invitations and referrals']].map(([surface,title,detail])=><Row key={surface} title={title} detail={detail} onClick={()=>go(surface)}/>)}</>}
  {route.surface==='profile'&&!accountHome&&!notificationsHome&&<><Tabs label="Account sections" items={navigation.subtabs.profile} value={tab||'Profile'} onChange={t=>go('profile',t)}/>{tab==='Documents'?<DocumentMockup/>:<><h2>{tab||'Profile'}</h2><p>Gym-specific information stays with your original Gym account inside the shared member area.</p><Action onClick={()=>setNotice('This prototype does not change your account or permissions.')}>Review {tab||'profile'}</Action></>}</>}
  <AccessMainPage ports={ports} onNavigate={onNavigate} active={route.surface==='access'}/>
  <ReferralsMainPage ports={ports} onNavigate={onNavigate} active={route.surface==='referrals'} hero={referralsHero} introductionPhoto={referralsIntroduction} trainerPhoto={referralsTrainingSupport}/>
  <HelpMainPage ports={ports} onNavigate={onNavigate} active={route.surface==='support'} hero={helpHero}/>
  <NotificationsMainPage ports={ports} onNavigate={onNavigate} active={notificationsHome} hero={notificationsHero}/>
  <AccountMainPage ports={ports} onNavigate={onNavigate} active={accountHome} tab={accountHome?tab:undefined}/>
  <MembershipMainPage ports={ports} onNavigate={onNavigate} active={route.surface==='membership'} tab={route.surface==='membership'?tab:undefined}/>
 </>;
 return <article ref={pageRef} className={'web-desktop-page gym-design-page'+(hasImageHeading?' gym-design-today':'')} aria-label="Gym design prototype">{!hasImageHeading&&<><div className="gym-design-prototype-note">Gym design preview · sample data</div><header className="gym-design-heading"><h1>{titles[route.surface]||'Your Gym'}</h1><p>{route.surface==='today'?'Your training, nutrition and recovery. Together.':'Your familiar Gym, inside your CRAYS world.'}</p></header></>}<A id={'personal-web:gym:'+route.surface+(focusedWorkspace?':workspace':':columns')} labels={focusedWorkspace?['Gym content']:['Gym content','Your Gym and quick access']} itemIds={focusedWorkspace?['content']:['content','aside']} className={'gym-design-columns'+(focusedWorkspace?' gym-design-focused-workspace':'')} minWidth={260} basis={focusedWorkspace?['100%']:['70%','30%']}><div className="gym-design-primary">{notice&&<p role="status" className="gym-design-notice">{notice}</p>}{screen}<div hidden={route.surface!=='connections'}><ConnectionsMockup requestedTab={route.surface==='connections'?tab:undefined}/></div><div hidden={route.surface!=='nutrition'||tab!=='Meal prep'}><MealPrepMockup batches={preparedBatches} onChange={setPreparedBatches} onAddMeal={entry=>setDesignMeals(values=>[...values,entry])} onRecipes={()=>go('recipes')}/></div><div hidden={route.surface!=='shop'}><ShopMockup ports={ports} active={route.surface==='shop'} onNavigate={onNavigate} tab={route.surface==='shop'?(tab||'Discover'):'Discover'} onTab={t=>go('shop',t)}/></div><div hidden={route.surface!=='nutrition'||tab!=='Pantry'}><PantryMockup lots={nutritionLots} onChange={setNutritionLots} onRecipes={()=>go('recipes')}/></div><div hidden={route.surface!=='recipes'}>{nutritionRecipes.map(recipe=><div key={recipe.version} hidden={recipeVersion!==recipe.version}><RecipeMockup active={route.surface==='recipes'&&recipeVersion===recipe.version} recipe={recipe} request={recipeVersion===recipe.version?recipeRequest:undefined} favoriteValue={Boolean(recipeFavorites[recipe.version])} onFavorite={value=>setRecipeFavorites(previous=>({...previous,[recipe.version]:value}))} tab={route.surface==='recipes'?(tab||'Catalogue'):'Catalogue'} onTab={t=>go('recipes',t)} image={recipe.image} onAddMeal={entry=>setDesignMeals(values=>[...values,entry])} onPreparedBatch={batch=>setPreparedBatches(values=>[...values,batch])} onMealPrep={()=>go('nutrition','Meal prep')} nutrients={<Nutrients/>}/></div>)}</div></div>{!focusedWorkspace&&aside}</A></article>;
}

function Nutrients(){return <section><h2>Your 16 nutrients</h2><p className="gym-design-muted">Per selected serving · values arrive with data integration. Missing values stay k. A.</p><dl className="gym-design-nutrients">{['Energy','Protein','Carbohydrates','Sugar','Fat','Saturated fat','Fibre','Sodium','Potassium','Magnesium','Calcium','Iron','Vitamin D','Vitamin B12','Omega-3','Caffeine'].map(label=><div key={label}><dt>{label}</dt><dd>k. A.</dd></div>)}</dl></section>}
