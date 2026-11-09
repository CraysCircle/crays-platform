"use client";
import {createPortal} from "react-dom";
import {useMemberRoute} from "../../../integration/member-route";
import {useMemberPurchaseFulfilmentProgress} from "./member-purchase-fulfilment-progress";
import memberOperationRegistry from "../../../graphql/member-self/MEMBER_SELF_OPERATION_REGISTRY.json";
import type {MemberOperationRegistry} from "../../../lib/clubs/member-graphql-transport";
const purchaseFulfilmentRegistry=memberOperationRegistry as MemberOperationRegistry;



import {MemberInteractionTools} from "./member-interaction-tools";
import interactionStyles from "./member-interactions.module.css";

import type {MemberAmbassadorConnection} from "./member-ambassador-connected";
import {parseAmbassadorRoute} from "./member-ambassador-route";
import {ambassadorViewHeadings} from "./member-ambassador-workspace";
import type {AmbassadorRecruitmentPort} from "./member-ambassador-recruitment";
import {testStayPeriod} from "./member-test-stays-workspace";
import {MemberTestStaysWorkspace,MemberTestStayGlance} from "./member-test-stays-workspace";
import {selectSavedTestStay,type TestStayPeriod} from "./member-test-stay-selection";
import {memberDocumentFeed} from "./member-document-feed";
import {memberConversationFeed} from "./member-conversation-feed";
import {parseMemberRouteTarget} from "./member-route-target";
import commerceStyles from "./member-commerce-offer.module.css";
import completeStyles from "./member-complete-workspaces.module.css";
import Image from '../../../integration/browser-image';
import Link from '../../../integration/browser-link';
import {ArrowRight,Bookmark,CalendarDays,ChevronDown,Compass,ConciergeBell,FileText,HelpCircle,Home,LoaderCircle,MessageCircle,RefreshCw,Search,ShoppingBag,UsersRound,UserRound,WalletCards,type LucideIcon} from 'lucide-react';
import {Children,Component,Suspense,isValidElement,lazy,useEffect,useRef,useState,useSyncExternalStore,type FunctionComponent,type ReactNode} from 'react';
import {memberDate,memberMoney,memberProperty,memberStatus,memberUpcoming,type MemberView,type MemberWorkspace} from './clubs-member-home-model';
import styles from './clubs-member-home.module.css';





import type {MemberMessageComposerContext} from './member-messages-workspace';
import {MemberStaysWorkspace,MemberStayGlance} from './member-stays-workspace';
import tokens from '../public/clubs-public-design-tokens.module.css';
import {ClubsPublicFooter} from '../public/clubs-public-shell';
function MemberSectionLoading(){return <div className={styles.sectionLoading} role="status" aria-live="polite" aria-busy="true"><LoaderCircle size={20} aria-hidden/><span>Loading this section…</span></div>;}
type SectionBoundaryProps={children:ReactNode;onRetry:()=>void};
class MemberSectionBoundary extends Component<SectionBoundaryProps,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className={`${styles.sectionLoading} ${styles.sectionError}`} role="alert"><p>We couldn’t open this section. Please try loading it again.</p><button type="button" className={styles.smallAction} onClick={this.props.onRetry}>Try loading this section again <RefreshCw size={16} aria-hidden/></button></div>:this.props.children;}
}
/** Cache public component code only. Failed code loads never replay a command. */
function deferredMemberSection<P extends object>(loader:()=>Promise<FunctionComponent<P>>){
 let loaded:FunctionComponent<P>|null=null;
 const createSection=()=>lazy(()=>new Promise<{default:FunctionComponent<P>}>((resolve,reject)=>{
  let settled=false;
  const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error("MEMBER_SECTION_CODE_TIMEOUT"));}},8_000);
  Promise.resolve().then(loader).then(section=>{if(!settled){settled=true;clearTimeout(timer);loaded=section;resolve({default:section});}},()=>{if(!settled){settled=true;clearTimeout(timer);reject(new Error("MEMBER_SECTION_CODE_UNAVAILABLE"));}});
 }));
 return function DeferredMemberSection(props:P){
  const [Section,setSection]=useState<FunctionComponent<P>|ReturnType<typeof createSection>>(()=>loaded??createSection()),[attempt,setAttempt]=useState(0);
  const retry=()=>{setSection(()=>createSection());setAttempt(value=>value+1);};
  return <MemberSectionBoundary key={attempt} onRetry={retry}><Suspense fallback={<MemberSectionLoading/>}><Section {...props}/></Suspense></MemberSectionBoundary>;
 };
}
const MemberNativeProfileWorkspace=deferredMemberSection(()=>import('./member-native-profile-workspace').then(module=>module.MemberNativeProfileWorkspace));
const MemberNativeCommerceCartWorkspace=deferredMemberSection(()=>import('./member-native-commerce-workspace').then(module=>module.MemberNativeCommerceCartWorkspace));
const MemberServiceOfferCatalogue=deferredMemberSection(()=>import('./member-service-offer-catalogue').then(module=>module.MemberServiceOfferCatalogue));
const MemberAmbassadorConnected=deferredMemberSection(()=>import('./member-ambassador-connected').then(module=>module.MemberAmbassadorConnected));
const MemberAmbassadorRecruitment=deferredMemberSection(()=>import('./member-ambassador-recruitment').then(module=>module.MemberAmbassadorRecruitment));
const MemberServicesWorkspace=deferredMemberSection(()=>import('./member-complete-workspaces').then(module=>module.MemberServicesWorkspace));
const MemberDocumentsWorkspace=deferredMemberSection(()=>import('./member-complete-workspaces').then(module=>module.MemberDocumentsWorkspace));
const MemberMembershipWorkspace=deferredMemberSection(()=>import('./member-complete-workspaces').then(module=>module.MemberMembershipWorkspace));
const MemberPaymentsWorkspace=deferredMemberSection(()=>import('./member-complete-workspaces').then(module=>module.MemberPaymentsWorkspace));
const MemberProfileWorkspace=deferredMemberSection(()=>import('./member-complete-workspaces').then(module=>module.MemberProfileWorkspace));
const MemberNativeApplicationWorkspace=deferredMemberSection(()=>import('./member-native-application-workspace').then(module=>module.MemberNativeApplicationWorkspace));
const MemberExperiencesWorkspace=deferredMemberSection(()=>import('./member-experiences-workspace').then(module=>module.MemberExperiencesWorkspace));
const MemberExperienceCartWorkspace=deferredMemberSection(()=>import('./member-experiences-workspace').then(module=>module.MemberExperienceCartWorkspace));
const MemberSearchWorkspace=deferredMemberSection(()=>import('./member-search-workspace').then(module=>module.MemberSearchWorkspace));
const MemberRequestsWorkspace=deferredMemberSection(()=>import('./member-requests-workspace').then(module=>module.MemberRequestsWorkspace));
const MemberMessagesWorkspace=deferredMemberSection(()=>import('./member-messages-workspace').then(module=>module.MemberMessagesWorkspace));
type Props={embedded?:boolean;toolbarTarget?:HTMLElement|null;accountId?:string|null;displayName:string;email?:string|null;emailVerified?:boolean;locale:string;workspace:MemberWorkspace;onRefresh:()=>void;onSupportContext:(bookingId:string,category:'booking'|'arrival')=>void;children:ReactNode;renderMessageComposer?:(context:MemberMessageComposerContext)=>ReactNode;messageFeedback?:ReactNode;stayPreferenceSlot?:ReactNode;ambassadorConnection?:MemberAmbassadorConnection|null;recruitmentPort?:AmbassadorRecruitmentPort;onAmbassadorMessages?:(originalId:string)=>void};
const navigation:Array<{id:MemberView;label:string;icon:LucideIcon}>=[
 {id:'home',label:'Home',icon:Home},{id:'membership',label:'Membership',icon:UsersRound},{id:'bookings',label:'My stays',icon:CalendarDays},{id:'support',label:'Messages',icon:MessageCircle},{id:'experiences',label:'Experiences',icon:Compass},{id:'services',label:'Services',icon:ConciergeBell},{id:'requests',label:'Requests',icon:FileText},{id:'documents',label:'Documents',icon:FileText},{id:'payments',label:'Payments',icon:WalletCards},{id:'ambassador',label:'Ambassador',icon:UsersRound},
];
const validViews=new Set<string>([...navigation.map(x=>x.id),'saved','cart','profile','search']);
function subscribeMemberRoute(listener:()=>void){window.addEventListener('hashchange',listener);return()=>window.removeEventListener('hashchange',listener);}
function memberRouteSnapshot(){return window.location.hash;}
function emptySnapshot(){return '';}
function todaySnapshot(){return new Date().toISOString().slice(0,10);}
function minuteSnapshot(){return new Date(Math.floor(Date.now()/60_000)*60_000).toISOString();}
function subscribeToday(listener:()=>void){const timer=window.setInterval(listener,60_000);window.addEventListener('focus',listener);return()=>{window.clearInterval(timer);window.removeEventListener('focus',listener);};}

export function ClubsMemberHome({embedded=false,toolbarTarget,accountId,displayName,email,emailVerified,locale,workspace,onRefresh,onSupportContext,children,renderMessageComposer,messageFeedback,stayPreferenceSlot,ambassadorConnection,recruitmentPort,onAmbassadorMessages}:Props){
 useEffect(()=>{const refresh=()=>onRefresh();const events=['crays-member-plans-updated','crays-member-documents-updated',"crays-member-commerce-updated"];events.forEach(event=>window.addEventListener(event,refresh));return()=>events.forEach(event=>window.removeEventListener(event,refresh));},[onRefresh]);
 const memberRoute=useMemberRoute();
 const route=memberRoute.hash.slice(1);
 const routeView=route.split('/')[0];
 const view:MemberView=validViews.has(routeView)?routeView as MemberView:route===''&&stayPreferenceSlot?'bookings':'home';
 const fulfilmentLineCount=workspace.finance?.kind==="ready"?workspace.finance.data.orders.reduce((count,order)=>count+order.lines.length,0):0;
 const purchaseFulfilment=useMemberPurchaseFulfilmentProgress(purchaseFulfilmentRegistry,view==="services"||view==="experiences"||view==="requests",fulfilmentLineCount);
 useEffect(()=>{const refresh=()=>purchaseFulfilment.reload();window.addEventListener("crays-member-commerce-updated",refresh);return()=>window.removeEventListener("crays-member-commerce-updated",refresh);},[purchaseFulfilment.reload]);
 const targetState=parseMemberRouteTarget(view==='ambassador'?'ambassador':route);
 const target=targetState.kind==='target'?targetState.id:null;
 const ambassadorTarget=parseAmbassadorRoute(route);
 const isPublicAmbassadorProgramme=view==='ambassador'&&(ambassadorTarget.kind==='programme'||!ambassadorConnection&&ambassadorTarget.kind==='personal'&&ambassadorTarget.view==='overview'&&ambassadorTarget.originalId===null);
 const ambassadorHeading=ambassadorConnection&&ambassadorTarget.kind==='personal'?ambassadorViewHeadings[ambassadorTarget.view]:null;
 const [ambassadorMessageNotice,setAmbassadorMessageNotice]=useState('');
 const [privacyTopic,setPrivacyTopic]=useState<"profile"|"data_export"|"account_closure"|null>(null);
 const [profileMenuOpen,setProfileMenuOpen]=useState(false);
 const profileMenuRef=useRef<HTMLDivElement>(null);
 const memberNavigationRef=useRef<HTMLElement>(null);
 const profileButtonRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!profileMenuOpen)return;const outside=(event:MouseEvent)=>{if(!profileMenuRef.current?.contains(event.target as Node))setProfileMenuOpen(false);};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setProfileMenuOpen(false);profileButtonRef.current?.focus();}};document.addEventListener('mousedown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape);};},[profileMenuOpen]);
 const selectedBooking=view==='bookings'?target:null;
 const [testPeriod,setTestPeriod]=useState<TestStayPeriod>('upcoming');
 const selectedDocument=view==='documents'?target:null;
 const selectedServiceSelection=view==='services'?target:null;
 const [experienceSelection,setExperienceSelection]=useState<{title:string;description:string}|null>(null);
 const [cartStage,setCartStage]=useState<{title:string;description:string}|null>(null);
 const selectedCase=view==='support'?target:null;
 const selectedRequest=view==='requests'?target:null;
 const today=useSyncExternalStore(subscribeToday,todaySnapshot,emptySnapshot);
 const asOf=useSyncExternalStore(subscribeToday,minuteSnapshot,emptySnapshot);
 useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'instant'});document.getElementById('member-content')?.focus({preventScroll:true});},[view,experienceSelection?.title,cartStage?.title]);
 useEffect(()=>{if(view==='support'&&selectedCase&&workspace.support.kind==='ready'&&workspace.support.data.supportCases.some(item=>item.caseId===selectedCase))document.getElementById(`member-case-${selectedCase}`)?.scrollIntoView({block:'center'});},[view,selectedCase,workspace.support]);
 useEffect(()=>{const reveal=()=>{const nav=memberNavigationRef.current;if(!nav||!window.matchMedia('(max-width:760px)').matches)return;const target=nav.querySelector<HTMLElement>('[aria-current="page"]');if(!target)return;const item=target.getBoundingClientRect();const bounds=nav.getBoundingClientRect();if(item.left<bounds.left||item.right>bounds.right)nav.scrollTo({left:nav.scrollLeft+item.left-bounds.left-16,behavior:'auto'});};reveal();window.addEventListener('resize',reveal);return()=>window.removeEventListener('resize',reveal);},[view]);
 function open(next:MemberView,bookingId?:string){setProfileMenuOpen(false);memberRoute.navigate(`#${next}${bookingId?'/'+encodeURIComponent(bookingId):''}`);}
 const href=(path:string)=>`/${locale}/${path}`;
 const bookings=workspace.bookings.kind==='ready'?workspace.bookings.data.bookings:[];
 const upcoming=today?memberUpcoming(bookings,today):null;
 const property=upcoming?memberProperty(upcoming.propertyId):null;
 const testStayFeed=workspace.testStays;
 const testUpcoming=!upcoming&&asOf&&testStayFeed?.kind==='ready'?testStayFeed.data.stays.filter(stay=>testStayPeriod(stay,asOf)==='upcoming').sort((a,b)=>a.arrivalDate.localeCompare(b.arrivalDate))[0]??null:null;
 const useStoredTestStays=workspace.bookings.kind==='unavailable'&&testStayFeed?.kind==='ready';
 const explicitTestTarget=Boolean(selectedBooking?.startsWith('map_member_test_stay_'));
 const savedTestSelection=selectSavedTestStay(testStayFeed?.kind==='ready'?testStayFeed.data.stays:[],selectedBooking,asOf||null,testPeriod);
 const showTestStayGlance=Boolean(view==='bookings'&&(useStoredTestStays||explicitTestTarget));

 const documentFeed=memberDocumentFeed(workspace);
 const documents=documentFeed.kind==='ready'?documentFeed.data.documents:null;
 const stayPending=!testUpcoming&&(workspace.bookings.kind==='loading'||workspace.bookings.kind==='ready'&&!today);
 const arrivalConversation=upcoming&&workspace.conversations?.kind==='ready'
  ?workspace.conversations.data.cases.find(item=>item.bookingId===upcoming.bookingId&&item.category==='arrival'):null;
 const stayDocuments=upcoming&&documents?documents.filter(item=>item.bookingUrn===`urn:crays:clubs:booking:${upcoming.bookingId}`):[];
 const nextStayDocument=stayDocuments[0]??null;
 const documentsPending=stayPending||documentFeed.kind==='loading';
 const arrivalNote=testUpcoming?'Coming our way? Share your travel plans.':stayPending?'Finding your stay…':workspace.bookings.kind==='unavailable'?'Your stay details aren’t available just yet.':upcoming?'Coming our way? Share your travel plans.':'Choose a stay to plan your arrival.';
 const documentNote=testUpcoming&&documentFeed.kind==='ready'?(documents?.length?`${documents.length} shared documents in your account.`:'No documents shared with you yet.'):documentsPending?'Loading your stay documents…':workspace.bookings.kind==='unavailable'||documentFeed.kind==='unavailable'?'We can’t pull up your stay documents just yet.':!upcoming?'Choose a stay to see its shared documents.':stayDocuments.length?`${stayDocuments.length} shared ${stayDocuments.length===1?'document':'documents'} listed for this stay.`:'No linked documents are listed here yet.';
 function openArrivalContext(){
  if(testUpcoming){open('support');return;}
  if(stayPending)return;
  if(workspace.bookings.kind==='unavailable'){onRefresh();return;}
  if(!upcoming){open('bookings');return;}
  onSupportContext(upcoming.bookingId,'arrival');
  open('support',arrivalConversation?.caseId);
 }
 function openStayDocument(){
  if(testUpcoming&&documentFeed.kind==='ready'){open('documents');return;}
  if(documentsPending)return;
  if(workspace.bookings.kind==='unavailable'||documentFeed.kind==='unavailable'){onRefresh();return;}
  if(!upcoming){open('bookings');return;}
  if(nextStayDocument){open('documents',nextStayDocument.documentId);return;}
  open('bookings',upcoming.bookingId);
 }

 const conversationFeed=memberConversationFeed(workspace);
 const conversationCases=conversationFeed.kind==='ready'?conversationFeed.data.supportCases:[];
 const membership=workspace.membership.kind==='ready'?workspace.membership.data:null;
 const services=workspace.services.kind==='ready'?workspace.services.data.services:[];
 // The original service repository distinguishes requested/confirmed from fulfilled/cancelled.
 const plannedStayServices=upcoming?services.filter(item=>item.bookingId===upcoming.bookingId&&(item.status==='requested'||item.status==='confirmed')):[];
 // Saved Core plans are account-wide; never infer a booking link or confirmation.
 const experienceData=workspace.experiences?.kind==='ready'?workspace.experiences.data:null;
 const savedExperiencePlans=experienceData?experienceData.plans.flatMap(plan=>{
  const offer=experienceData.catalog.find(item=>item.offerId===plan.offerId&&item.offerVersion===plan.offerVersion&&item.coreCatalogueReceiptSha256===plan.offerSourceSha256);
  if(!offer||plan.state!=='saved')return [];
  const slot=plan.selectedSlotId?offer.slots.find(item=>item.slotId===plan.selectedSlotId):null;
  if(plan.selectedSlotId&&!slot)return [];
  return [{plan,offer,slot}];
 }):[];
 const booking=selectedBooking?bookings.find(x=>x.bookingId===selectedBooking):null;
 const isExtra=['documents','experiences','payments'].includes(view);
 const nativeSlot=(id:string)=>Children.toArray(children).filter(child=>isValidElement<{id?:string}>(child)&&child.props.id===id);
 const supportSlot=Children.toArray(children).filter(child=>isValidElement<{id?:string}>(child)&&child.props.id==='support');
 const dateLabel=today?new Intl.DateTimeFormat(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${today}T12:00:00Z`)):'';
 return <div className={`${tokens.theme} ${styles.root} ${interactionStyles.root} ${embedded?styles.embedded:""}`} data-member-view={view}>
  <a className={styles.skip} href="#member-content">Skip to member content</a>
  {!embedded?<header className={styles.header}>
   <Link href={`/${locale}`} aria-label="CRAYS home"><Image src="/brand/crays-logo-dark.svg" alt="CRAYS" width={132} height={36} priority /></Link>
   <div className={styles.headerActions}><MemberInteractionTools accountId={accountId??null} view={view} locale={locale}/><button type="button" className={commerceStyles.headerCart} onClick={()=>open("cart")} aria-current={view==="cart"?"page":undefined}><ShoppingBag size={18} aria-hidden/>Cart</button><Link className={styles.association} href="https://www.crays.org/" rel="noreferrer noopener" target="_blank">A MEMBER OF THE CRAYS ASSOCIATION</Link><div className={styles.profileContainer} ref={profileMenuRef}><button ref={profileButtonRef} className={styles.profileButton} onClick={()=>setProfileMenuOpen(value=>!value)} type="button" aria-expanded={profileMenuOpen} aria-controls="member-profile-navigation"><UserRound size={30} aria-hidden/><span>{displayName}</span><ChevronDown size={15} aria-hidden/></button>{profileMenuOpen?<nav id="member-profile-navigation" className={styles.profileMenu} aria-label="Your account"><button type="button" onClick={()=>open('search')}><Search size={18} aria-hidden/>Search your account</button><button type="button" onClick={()=>open('profile')}><UserRound size={18} aria-hidden/>Profile & privacy</button><button type="button" onClick={()=>open('saved')}><Bookmark size={18} aria-hidden/>Saved stays</button><button type="button" onClick={()=>open('cart')}><ShoppingBag size={18} aria-hidden/>Cart</button></nav>:null}</div></div>
  </header>:null}
  {embedded?(toolbarTarget?createPortal(<span className="crays-club-member-global" style={{display:"contents"}}><MemberInteractionTools accountId={accountId??null} view={view} locale={locale}/><button type="button" className={commerceStyles.headerCart} onClick={()=>open("cart")} aria-current={view==="cart"?"page":undefined}><ShoppingBag size={18} aria-hidden/>Cart</button></span>,toolbarTarget):<nav className={styles.embeddedTools} aria-label="Club account tools"><MemberInteractionTools accountId={accountId??null} view={view} locale={locale}/><button type="button" className={styles.smallAction} onClick={()=>open("cart")}>Cart</button><button type="button" className={styles.smallAction} onClick={()=>open("saved")}>Saved stays</button><button type="button" className={styles.smallAction} onClick={()=>open("search")}>Search your account</button></nav>):null}
  <div className={styles.layout}>
   {!embedded?<aside className={styles.sidebar}><nav ref={memberNavigationRef} aria-label="Member workspace">{navigation.map(({id,label,icon:Icon})=><button key={id} data-member-nav={id} type="button" onClick={()=>open(id)} aria-current={view===id?'page':undefined} className={styles.navItem}><Icon size={21} strokeWidth={1.6} aria-hidden/><span>{label}</span>{id==='requests'&&workspace.requests.kind==='ready'&&workspace.requests.data.requests.length>0?<span className={styles.badge} aria-label={`${workspace.requests.data.requests.length} booking requests`}>{workspace.requests.data.requests.length}</span>:null}</button>)}<div className={styles.secondaryNav} /><button className={styles.navItem} data-member-nav="profile" type="button" onClick={()=>open('profile')} aria-current={view==='profile'?'page':undefined}><UserRound size={21} aria-hidden/>Profile & privacy</button></nav></aside>:null}
   <div className={styles.content} id="member-content" role="main" tabIndex={-1}>
    <div className={styles.greeting}><div>{view!=='home'&&!isPublicAmbassadorProgramme?<p className={styles.eyebrow}>MEMBER WORKSPACE</p>:null}<h1>{view==='home'?`Hellooo, ${displayName.trim().split(/\s+/)[0] || "friend"}.`:(isPublicAmbassadorProgramme?'Bring your people to CRAYS.':view==='ambassador'&&ambassadorHeading?ambassadorHeading[0]:view==='membership'?'Your next chapter.':view==='experiences'&&experienceSelection?experienceSelection.title:navigation.find(x=>x.id===view)?.label)??(view==='search'?'Find your CRAYS details':view==='profile'?'Profile & privacy':view==='saved'?'Saved stays':cartStage?.title??'Your cart')}</h1>{isPublicAmbassadorProgramme?<p className={styles.subtitle}>For creators, community builders and affiliate partners who share our vision.</p>:view==='ambassador'&&ambassadorHeading?<p className={styles.subtitle}>{ambassadorHeading[1]}</p>:view==='search'?<p className={styles.subtitle}>Your stays, questions and documents. Easy to find.</p>:view==='bookings'?<p className={styles.subtitle}>Your stays, from first plans to your next arrival.</p>:view==='support'?<p className={styles.subtitle}>Your chats, your questions, your plans. Let’s talk.</p>:view==='requests'?<p className={styles.subtitle}>Every question, little change and next step. All together.</p>:view==='services'?<p className={styles.subtitle}>The little details that make your stay yours.</p>:view==='documents'?<p className={styles.subtitle}>Everything you need. Safely shared, easy to find.</p>:view==='membership'?<p className={styles.subtitle}>A global community. A more meaningful way to stay.</p>:view==='payments'?<p className={styles.subtitle}>Your amounts, receipts and next steps. All together.</p>:view==='profile'?<p className={styles.subtitle}>Your details. Your preferences. Your control.</p>:view==='experiences'?<p className={styles.subtitle}>{experienceSelection?.description??'Make a little more of your time in Forest City.'}</p>:view==='cart'?<p className={styles.subtitle}>{cartStage?.description??'Your experiences and services, ready to review.'}</p>:null}</div><span className={styles.today}>{dateLabel}</span></div>
    {targetState.kind==='invalid'?<section className={completeStyles.panel} role="status"><h2>This link needs a little refresh.</h2><p>We can’t open that item from this link. Choose a fresh one from your account.</p><button type="button" className={styles.primaryAction} onClick={()=>open(view)}>Back to {navigation.find(item=>item.id===view)?.label??'your account'} <ArrowRight size={17} aria-hidden/></button></section>:<div className={`${styles.columns} ${view==='ambassador'?styles.ambassadorColumns:''}`}>
     <div className={styles.primaryColumn}>
      {view==='ambassador'?<><MemberAmbassadorConnected connection={ambassadorConnection} route={route||'ambassador'} programme={<MemberAmbassadorRecruitment locale={locale} port={recruitmentPort}/>} onRoute={hash=>{setAmbassadorMessageNotice('');memberRoute.navigate(hash);}} onMessages={originalId=>{if(onAmbassadorMessages)onAmbassadorMessages(originalId);else setAmbassadorMessageNotice('Sending questions about this Ambassador record is not connected yet.');}}/>{ambassadorMessageNotice?<p role="status">{ambassadorMessageNotice}</p>:null}</>:null}
      {view==='home'?<>
       <section className={styles.hero} aria-label="Your next stay">
        {property?<Image src={property.image} alt={property.title} fill priority decoding="sync" sizes="(max-width: 760px) 100vw, (max-width: 1199px) 75vw, 60vw"/>:!upcoming?<Image src="/member-development/forest-city-original.png" alt="Forest City vision from the CRAYS image collection" fill priority decoding="sync" quality={95} sizes="(max-width: 760px) 100vw, 70vw"/>:null}
        <div className={styles.heroContent}><p className={styles.heroEyebrow}>{upcoming?'UPCOMING STAY':testUpcoming?'UPCOMING TEST STAY':'YOUR NEXT CHAPTER'}</p><h2>{upcoming?property?.title??'Your CRAYS stay':'Your next chapter'}{!upcoming?<><br/>in Forest City</>:null}</h2><p>{upcoming?`${memberDate(upcoming.arrivalDate,locale)} – ${memberDate(upcoming.departureDate,locale)}`:testUpcoming?`${testUpcoming.propertyDisplayName} · ${memberDate(testUpcoming.arrivalDate,locale)} – ${memberDate(testUpcoming.departureDate,locale)}`:workspace.bookings.kind==='loading'?'Loading your stays…':workspace.bookings.kind==='unavailable'?'We can’t pull up your stays just yet.':bookings.length?'Explore a new stay with CRAYS.':'Find a stay that feels like you.'}</p>{upcoming?<button className={styles.primaryAction} onClick={()=>open('bookings',upcoming.bookingId)} type="button">Open your stay <ArrowRight size={17} aria-hidden/></button>:testUpcoming?<button className={styles.primaryAction} onClick={()=>open('bookings',testUpcoming.sourceRecordId)} type="button">Open your stay <ArrowRight size={17} aria-hidden/></button>:workspace.bookings.kind==='unavailable'?<button className={styles.primaryAction} onClick={onRefresh} type="button">Give it another go <RefreshCw size={17} aria-hidden/></button>:<Link className={styles.primaryAction} href={href('search')}>Explore stays <ArrowRight size={17} aria-hidden/></Link>}</div>
       </section>
       <div className={styles.nextSteps}><div><HelpCircle className={styles.stepIcon} size={28} aria-hidden/><div><h3>Let’s plan your arrival</h3><p role={stayPending||workspace.bookings.kind==='unavailable'?'status':undefined}>{arrivalNote}</p></div><button className={styles.smallAction} type="button" disabled={stayPending} aria-busy={stayPending||undefined} onClick={openArrivalContext}>{testUpcoming?'Chat with the team':stayPending?'Loading your stay…':workspace.bookings.kind==='unavailable'?'Try again':!upcoming?'Choose a stay':arrivalConversation?'Open arrival chat':'Chat with the team'}</button></div><div><FileText className={styles.stepIcon} size={27} aria-hidden/><div><h3>Your documents</h3><p role={documentsPending||documentFeed.kind==='unavailable'?'status':undefined}>{documentNote}</p></div><button className={styles.smallAction} type="button" disabled={documentsPending} aria-busy={documentsPending||undefined} onClick={openStayDocument}>{testUpcoming&&documentFeed.kind==='ready'?'Review documents':documentsPending?'Loading documents…':workspace.bookings.kind==='unavailable'||documentFeed.kind==='unavailable'?'Try again':!upcoming?'Choose a stay':nextStayDocument?'Review documents':'Open your stay'}</button></div></div>
       <section className={styles.plans}><p className={styles.eyebrow}>YOUR PLANS</p><h2>What’s next</h2>{workspace.bookings.kind==='loading'?<p role="status"><LoaderCircle size={18} aria-hidden/> Loading your plans…</p>:null}{testUpcoming?<div className={styles.planRow}><CalendarDays aria-hidden size={21}/><div><h3>Your stay</h3><p>{testUpcoming.propertyDisplayName} · {testUpcoming.publicReference}</p></div><div><span>{memberDate(testUpcoming.arrivalDate,locale)} – {memberDate(testUpcoming.departureDate,locale)}</span><p>Saved TEST stay</p></div><button type="button" onClick={()=>open('bookings',testUpcoming.sourceRecordId)}>View stay details <ArrowRight size={15} aria-hidden/></button></div>:null}{upcoming?<div className={styles.planRow}><CalendarDays aria-hidden size={21}/><div><h3>Your stay</h3><p>{property?.title??'CRAYS stay'} · {upcoming.publicReference}</p></div><div><span>{memberDate(upcoming.arrivalDate,locale)}</span><p>{memberStatus(upcoming.status)}</p></div><button type="button" onClick={()=>open('bookings',upcoming.bookingId)}>View stay details <ArrowRight size={15} aria-hidden/></button></div>:null}{plannedStayServices.slice(0,2).map(item=><div className={styles.planRow} key={item.selectionId}><ConciergeBell size={21} aria-hidden/><div><h3>{item.displayName}</h3><p>{property?.title??upcoming?.publicReference??'Your stay service'}</p></div><div><span>{item.requestedFor?memberDate(item.requestedFor,locale):'Date to be arranged'}</span><p>{memberStatus(item.status)}</p></div><button type="button" onClick={()=>open('services',item.selectionId)}>View request <ArrowRight size={15} aria-hidden/></button></div>)}{savedExperiencePlans.slice(0,2).map(({plan,offer,slot})=><div className={styles.planRow} key={plan.planId}><Compass size={21} aria-hidden/><div><h3>{offer.title}</h3><p>Your saved experience plan</p></div><div><span>{slot?memberDate(slot.date,locale):'Date to choose'}</span><p>Saved · TEST plan</p></div><button type="button" onClick={()=>open('experiences',offer.offerId)}>View experience <ArrowRight size={15} aria-hidden/></button></div>)}<div className={styles.planRow}><Compass size={21} aria-hidden/><div><h3>Find your next adventure</h3><p>Great food, fresh air and good company.</p></div><span>Make a little room for something new.</span><button type="button" onClick={()=>open('experiences')}>Browse experiences <ArrowRight size={15} aria-hidden/></button></div></section>
      </>:null}
      {view==='bookings'?stayPreferenceSlot:null}
      {view==='bookings'&&!booking&&!showTestStayGlance?<MemberStaysWorkspace feed={workspace.bookings} savedCart={workspace.savedCart} savedProperties={workspace.savedProperties} locale={locale} today={today} onRefresh={onRefresh} onSelect={id=>open('bookings',id)} onView={next=>open(next)}/>:null}
      {view==='bookings'&&(!selectedBooking||showTestStayGlance)&&workspace.testStays?.kind==='ready'?<MemberTestStaysWorkspace feed={workspace.testStays} locale={locale} asOf={asOf||null} selectedSourceRecordId={selectedBooking} onSelect={id=>open('bookings',id??undefined)} onPeriodChange={setTestPeriod}/>:null}
      {view==='search'?<MemberSearchWorkspace workspace={workspace} onView={open} onRefresh={onRefresh}/>:null}
      {view==='requests'?<MemberRequestsWorkspace key={selectedRequest??'requests'} initialRequestKey={selectedRequest} workspace={workspace} fulfilmentFeed={purchaseFulfilment.feed} locale={locale} onRefresh={onRefresh} onView={(next,id)=>open(next,id)}/>:null}
      {view==='support'?<MemberMessagesWorkspace key={selectedCase??'support'} initialCaseId={selectedCase} conversations={workspace.conversations} support={workspace.support} bookings={workspace.bookings} locale={locale} onRefresh={onRefresh} onStay={id=>open('bookings',id)} documents={documentFeed} onDocuments={id=>open('documents',id)} onOverview={()=>open('support')} onCaseSelected={id=>open('support',id)} composeSlot={renderMessageComposer??supportSlot} messageFeedback={<>{messageFeedback}{privacyTopic?<div className={completeStyles.notice} role="status"><strong>{privacyTopic==="data_export"?"Privacy · data export":privacyTopic==="account_closure"?"Privacy · account closure":"A question about your profile"}</strong><p>Start a new conversation with “Start with a hello” and share what you need. No export or account change has been performed.</p><button type="button" className={styles.textAction} onClick={()=>setPrivacyTopic(null)}>Dismiss topic</button></div>:null}</>}/>:null}
      {booking&&view==='bookings'?<section className={styles.detail} aria-label="Selected stay"><p className={styles.eyebrow}>YOUR STAY · {booking.publicReference}</p><h2>{memberProperty(booking.propertyId)?.title??'Your CRAYS stay'}</h2><dl><div><dt>Arrival</dt><dd>{memberDate(booking.arrivalDate,locale)}</dd></div><div><dt>Departure</dt><dd>{memberDate(booking.departureDate,locale)}</dd></div><div><dt>Status</dt><dd>{memberStatus(booking.status)}</dd></div><div><dt>Guests</dt><dd>{booking.guestCount??'To be confirmed'}</dd></div><div><dt>Booking amount</dt><dd>{memberMoney(booking,locale)}</dd></div></dl><button className={styles.primaryAction} onClick={()=>{onSupportContext(booking.bookingId,'booking');open('support');}} type="button">Ask about your stay <ArrowRight size={17} aria-hidden/></button></section>:null}
      {view==='services'?<MemberServiceOfferCatalogue key={selectedServiceSelection??'service-catalogue'} initialRequestSelected={Boolean(selectedServiceSelection)} feed={workspace.serviceOffers} financeFeed={workspace.finance} fulfilmentFeed={purchaseFulfilment.feed} locale={locale} onMessages={()=>open('support')} requestSlot={<MemberServicesWorkspace key={selectedServiceSelection??'services'} initialServiceSelectionId={selectedServiceSelection} workspace={workspace} locale={locale} onRefresh={onRefresh} onView={open} composerSlot={nativeSlot('services')} onSupportContext={onSupportContext}/>}/>:null}
      {view==='documents'?<MemberDocumentsWorkspace key={selectedDocument??'documents'} initialDocumentId={selectedDocument} workspace={workspace} locale={locale} onRefresh={onRefresh} onView={open}/>:null}
      {view==='membership'?<MemberMembershipWorkspace workspace={workspace} locale={locale} onRefresh={onRefresh} onView={open} membershipSlot={<MemberNativeApplicationWorkspace key={accountId??"unbound"} accountId={accountId} locale={locale} onRefresh={onRefresh} onView={open} membershipFeed={workspace.membership}/>}/>:null}
      {view==='payments'?<MemberPaymentsWorkspace onSupportContext={onSupportContext} workspace={workspace} locale={locale} onRefresh={onRefresh} onView={open}/>:null}
      {view==='profile'?<MemberNativeProfileWorkspace key={accountId??'signed-out'} registry={purchaseFulfilmentRegistry} signInSlot={nativeSlot("profile")} email={email} emailVerified={emailVerified} locale={locale} onSaved={onRefresh} onPrivacyRequest={topic=>{setPrivacyTopic(topic);open('support');}}/>:null}
      {view==='experiences'?<MemberExperiencesWorkspace financeFeed={workspace.finance} fulfilmentFeed={purchaseFulfilment.feed} readFeed={workspace.experiences} locale={locale} onSelectionChange={setExperienceSelection} onMessages={()=>open('support')} onCart={()=>open('cart')}/>:null}
      {view==='cart'?<MemberNativeCommerceCartWorkspace locale={locale} accountId={accountId} financeFeed={workspace.finance} onExperiences={()=>open('experiences')} onPayments={orderId=>open('payments',orderId)}/>:null}
      <div className={styles.legacyPanels} hidden={view==='bookings'&&showTestStayGlance||view==='ambassador'||view==='home'||view==='support'||isExtra||['services','membership','profile','cart','search'].includes(view)} data-panel={view}>{children}</div>
      {view==='saved'?<section id="member-stay-plans" className={styles.stayPlans}><h2>Your stay plans</h2>{nativeSlot('cart')}</section>:null}
     </div>
     <aside className={styles.rail} aria-label="Your CRAYS desk" hidden={view==='ambassador'}>
      {showTestStayGlance?<MemberTestStayGlance stay={savedTestSelection.stay} selectionUnavailable={savedTestSelection.unavailable} locale={locale} onMessages={()=>open('support')} onDocuments={()=>open('documents')}/>:view==='bookings'?<MemberStayGlance booking={selectedBooking?booking??null:upcoming} selectionUnavailable={Boolean(selectedBooking&&workspace.bookings.kind==='ready'&&!booking)} locale={locale} onView={next=>open(next)}/>:<>
      <section className={styles.desk}><h2>Your CRAYS desk</h2><div className={styles.deskIdentity}><ConciergeBell size={42} strokeWidth={1.3} aria-hidden/><div><h3>CRAYS member services</h3><p>Your stay and member support</p></div></div><p className={styles.deskIntro}>Need a hand? Drop us a message. We’ll find the right team for you.</p><button className={styles.primaryAction} type="button" onClick={()=>open('support')}>Chat with CRAYS <ArrowRight size={17} aria-hidden/></button><div className={styles.conversations}><h3>Your conversations</h3>{conversationFeed.kind==='loading'?<p role="status">Loading conversations…</p>:conversationFeed.kind==='unavailable'?<div role="status"><p>Your chats aren’t connected just yet.</p><button className={styles.textAction} type="button" onClick={onRefresh}>Give it another go</button></div>:conversationCases.length?conversationCases.slice(0,2).map(item=><button type="button" className={styles.caseRow} key={item.caseId} onClick={()=>open('support',item.caseId)}><MessageCircle size={21} aria-hidden/><span><strong>{item.subject}</strong><small>{item.publicReference}</small><span>{memberStatus(item.status)}{'messageCount' in item?` · ${item.messageCount} ${item.messageCount===1?'message':'messages'}`:''}</span></span><ArrowRight size={15} aria-hidden/></button>):<p>Your conversations with CRAYS will appear here.</p>}<button className={styles.textAction} type="button" onClick={()=>open('support')}>View all messages <ArrowRight size={15} aria-hidden/></button></div></section>
      <section className={styles.membership}><h2>Your membership</h2>{membership?<><p>Member status: {memberStatus(membership.membership?.status??'not confirmed')}</p><p>{membership.membership?.status==='confirmed'&&membership.authorities.membershipConfirmed?'Your CRAYS membership is confirmed.':(!membership.application||membership.application.status==='none')?'Explore membership and start your application.':`Application: ${memberStatus(membership.application?.status)}.`}</p></>:<p role="status">{workspace.membership.kind==='loading'?'Loading membership…':'Your membership details aren’t connected just yet.'}</p>}<button className={styles.textAction} type="button" onClick={()=>open('membership')}>View membership <ArrowRight size={15} aria-hidden/></button></section>
      </>}
     </aside>
    </div>}
    
   </div>
  </div>
  {!embedded?<ClubsPublicFooter locale="en"/>:null}
 </div>;
}
