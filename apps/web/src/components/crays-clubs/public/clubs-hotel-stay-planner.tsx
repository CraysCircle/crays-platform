"use client";
import {TodayLocalizedContent,useTodayText} from "./today-localized-content";
import {hospitalityDate,hospitalityMonthLabel} from "./hospitality-locale-format";
import { CraysPackageNote } from "./crays-club-experience";
import { HospitalityImage as Image } from "./hospitality-image";
import { ClubsMembershipProcessNotice } from "./clubs-membership-process-notice";
import { buildHotelMemberPreviewUrl } from "@/lib/member-commerce/hotel-member-preference-link";
import { buildClubsLoginHref } from "@/lib/clubs/member-auth-contract";
import { hotelDirectApplicationHref } from "@/lib/member-commerce/hotel-direct-application-link";
import { HOTEL_MEMBER_PREFERENCE_SCHEMA } from "@/lib/member-commerce/hotel-member-preferences";
import { MARINA_EARLIEST_ARRIVAL } from "@/lib/member-commerce/hotel-stay-policy";
import {singaporePaymentDeadline} from "./clubs-hotel-singapore-payment-calendar";
import {CRAYS_TEAM_AMBASSADOR_SELECTION,HotelAmbassadorPicker,type HotelAmbassadorChoice} from "./clubs-hotel-ambassador-picker";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {HOTEL_STAY_DRAFT_SCHEMA} from "@/lib/member-commerce/hotel-stay-draft";
import {parsePublicHotelDraft,publicHotelDraftUrl,readPublicHotelBootstrap,writePublicHotelHistory,type PublicHotelDraft} from "@/lib/member-commerce/hotel-public-stay-history";
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, CreditCard, FileText, Info, Landmark, MapPin, ShieldCheck, ChevronDown, Users, Waves, Dumbbell, Wine, Umbrella } from "lucide-react";
import { addStayCalendarMonths, parseStayDay } from "@/lib/member-commerce/clubs-calendar-month-stay";
import type { HospitalityPublicPricingPolicy } from "@/lib/member-commerce/hospitality-public-pricing-policy";
import type { BookingIntent } from "./clubs-property-detail-contract";
import { readRecommendation, type RecommendationView } from "./clubs-hotel-recommendation-client";
import styles from "./clubs-hotel-stay-planner.module.css";

type Photo = { publicPath: string; alt: string };
type Room = { id: string; label: string; details: string[] };
type Props = { ambassadors:readonly HotelAmbassadorChoice[]; propertyId:string; title:string; variant:"marina"|"golf"; intent:BookingIntent; summary:string; baseDescription?:string; fromLabel:string; facilities:{id:string;label:string;details:string[]}[]; rooms:Room[]; photos:Photo[]; policy:HospitalityPublicPricingPolicy|null; onStepChange:(step:number)=>void;onIntentChange:(patch:Partial<BookingIntent>)=>void; editRequest:number };
function departure(arrival:string,duration:number,monthly:boolean) { try { if (!arrival) return ""; if(monthly) return addStayCalendarMonths(arrival,duration); const day=parseStayDay(arrival);day.setUTCDate(day.getUTCDate()+duration);return day.toISOString().slice(0,10); } catch {return "";} }

export function ClubsHotelStayPlanner({ambassadors,propertyId,title,variant,intent,summary,baseDescription,fromLabel,facilities,rooms,photos,policy,onStepChange,onIntentChange,editRequest}:Props) {
 const {locale,text}=useTodayText();
 const money=(minor:number)=>new Intl.NumberFormat(locale==="en"?"en-US":locale,{style:"currency",currency:"USD",maximumFractionDigits:2}).format(minor/100);
 const dateLabel=(value:string)=>hospitalityDate(value,locale,text("Select your dates"));
 const monthly=variant==="marina";
 const durationLabel=(value:number)=>`${value} ${text(monthly?(value===1?"calendar month":"calendar months"):(value===1?"night":"nights"))}`;
 const [flexibleSearchMonth,setFlexibleSearchMonth]=useState(!monthly&&intent.dateMode==="flexible"?(intent.flexibleMonth||"Any month"):null);
 const [step,setStep]=useState(1);
 const [error,setError]=useState<string|null>(null);
 const plannerRoot=useRef<HTMLElement>(null);const previousStep=useRef(1);
 const [furthestStep,setFurthestStep]=useState(1);

 useEffect(()=>{if(previousStep.current!==step){previousStep.current=step;plannerRoot.current?.scrollIntoView({block:"start",behavior:"auto"});const heading=plannerRoot.current?.querySelector<HTMLElement>("h2");heading?.focus({preventScroll:true});}},[step]);
 const [arrival,setArrival]=useState(monthly ? (intent.checkIn >= MARINA_EARLIEST_ARRIVAL ? `${intent.checkIn.slice(0,7)}-01` : MARINA_EARLIEST_ARRIVAL) : intent.checkIn);
 const [duration,setDuration]=useState(monthly?Math.min(12,Math.max(1,intent.calendarMonths??1)):Math.min(366,Math.max(1,Math.trunc(intent.nights)||1)));
 const [adults,setAdults]=useState(intent.guestsExplicit?Math.min(monthly?2:6,Math.max(1,intent.guests)):1);
 const [children,setChildren]=useState(intent.children);
 const [ages,setAges]=useState<(number|null)[]>([null,null]);
 const [selectedAmbassador,setSelectedAmbassador]=useState<string|null>(null);
 const [selectedRoom,setSelectedRoom]=useState<string|null>(null);
 const applicationReturnParams=new URLSearchParams({date_mode:monthly?"months":arrival?"exact":"flexible",guests:String(adults),guest_selection:"explicit",children:String(children)});
 if(arrival)applicationReturnParams.set("date_from",arrival);
 const applicationCheckout=departure(arrival,duration,monthly);if(applicationCheckout)applicationReturnParams.set("date_to",applicationCheckout);
 if(monthly)applicationReturnParams.set("calendar_months",String(duration));else applicationReturnParams.set("nights",String(duration));
 if(!monthly&&!arrival&&flexibleSearchMonth&&flexibleSearchMonth!=="Any month")applicationReturnParams.set("flexible_month",flexibleSearchMonth);
 const legacyApplicationReturnTo=`/${locale}/hospitality/${monthly?"marina-hotel":"golf-hotel"}?${applicationReturnParams.toString()}`;



 const [paymentPlan,setPaymentPlan]=useState<"full"|"monthly"|null>(null);
 const [historyReady,setHistoryReady]=useState(false);
 const [dateMode,setDateMode]=useState<"exact"|"flexible">(intent.dateMode);
 const [dateToleranceDays,setDateToleranceDays]=useState(monthly?0:intent.range);
 const [petRequests,setPetRequests]=useState(intent.pets);
 const applyPublicDraft=useCallback((saved:PublicHotelDraft)=>{
  setArrival(saved.arrivalDate??"");setDuration((saved.calendarMonths??saved.nights)??1);
  setAdults(saved.adults);setChildren(saved.childAges.length);setAges([...saved.childAges,...Array(2-saved.childAges.length).fill(null)]);
  setSelectedRoom(saved.publicRoomTypeId);setSelectedAmbassador(saved.ambassadorSlug);setFlexibleSearchMonth(saved.flexibleMonth);setDateMode(saved.dateMode==="flexible"?"flexible":"exact");
  setDateToleranceDays(saved.dateToleranceDays);setPetRequests(saved.petRequests);setPaymentPlan(saved.paymentSchedulePreference==="MONTHLY"?"monthly":saved.paymentSchedulePreference==="FULL_UPFRONT"?"full":null);
  setStep(saved.bookingStep);setFurthestStep(saved.bookingStep);setError(null);onStepChange(saved.bookingStep);
 },[onStepChange]);
 useEffect(()=>{
  let alive=true;let frame=0;
  const bootstrap=(state:unknown)=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    if(!alive)return;
    const saved=readPublicHotelBootstrap(state,window.location.href,propertyId);
    if(saved)applyPublicDraft(saved);
    setHistoryReady(true);
   });
  };
  bootstrap(window.history.state);
  const restore=(event:PopStateEvent)=>{setHistoryReady(false);bootstrap(event.state);};
  window.addEventListener("popstate",restore);
  return()=>{alive=false;cancelAnimationFrame(frame);window.removeEventListener("popstate",restore);};
 },[propertyId,applyPublicDraft]);
 const [recommendation,setRecommendation]=useState<RecommendationView>({status:"checking",ambassadorName:null});
 const approvedRecommendation=recommendation.status==="approved"&&selectedAmbassador!==null&&selectedAmbassador!==CRAYS_TEAM_AMBASSADOR_SELECTION&&recommendation.ambassadorSlug===selectedAmbassador;
 const [refresh,setRefresh]=useState(0);
 const checkout=departure(arrival,duration,monthly);
 const publicDraft=useMemo(()=>({schema:HOTEL_STAY_DRAFT_SCHEMA,propertyId,bookingStep:step,publicRoomTypeId:selectedRoom,dateMode:monthly?"months":dateMode,arrivalDate:arrival||null,departureDateExclusive:checkout||null,calendarMonths:monthly?duration:null,nights:monthly?null:duration,flexibleMonth:monthly||dateMode==="exact"||flexibleSearchMonth==="Any month"?null:flexibleSearchMonth,dateToleranceDays,adults,childAges:ages.slice(0,children),petRequests,ambassadorSlug:selectedAmbassador,paymentSchedulePreference:paymentPlan==="monthly"?"MONTHLY":paymentPlan==="full"?"FULL_UPFRONT":null}),[propertyId,step,selectedRoom,monthly,dateMode,arrival,checkout,duration,flexibleSearchMonth,dateToleranceDays,adults,ages,children,petRequests,selectedAmbassador,paymentPlan]);
 const validatedReturnDraft=parsePublicHotelDraft(publicDraft);
 const currentPlanReturnTo=validatedReturnDraft?publicHotelDraftUrl(`https://www.craysclub.com/${locale}/hospitality/${monthly?"marina-hotel":"golf-hotel"}`,validatedReturnDraft)??legacyApplicationReturnTo:legacyApplicationReturnTo;
 const directApplicationHref=hotelDirectApplicationHref(currentPlanReturnTo);
 const signInHref=buildClubsLoginHref(currentPlanReturnTo);
 useEffect(()=>{
  if(!historyReady)return;
  writePublicHotelHistory(window.history,window.location.href,publicDraft,"replace");
  const nights=arrival&&checkout?Math.round((Date.parse(checkout+"T00:00:00Z")-Date.parse(arrival+"T00:00:00Z"))/86400000):duration;
  onIntentChange({dateMode,checkIn:arrival,checkOut:checkout,flexibleMonth:publicDraft.flexibleMonth??"",range:dateToleranceDays,pets:petRequests,calendarMonths:monthly?duration:undefined,guests:adults,guestsExplicit:true,children,nights});
 },[historyReady,publicDraft,arrival,checkout,duration,onIntentChange,dateMode,dateToleranceDays,petRequests,monthly,adults,children]);
 const lastEditRequest=useRef(0);
 const editSnapshot=useRef(publicDraft);
 useEffect(()=>{editSnapshot.current=publicDraft;},[publicDraft]);
 useEffect(()=>{
  if(!historyReady||editRequest===0||editRequest===lastEditRequest.current)return;
  const frame=requestAnimationFrame(()=>{
   lastEditRequest.current=editRequest;
   const current=editSnapshot.current;
   if(current.bookingStep!==1)writePublicHotelHistory(window.history,window.location.href,{...current,bookingStep:1},"push");
   setStep(1);onStepChange(1);setError(null);
   plannerRoot.current?.scrollIntoView({behavior:"auto",block:"start"});
   plannerRoot.current?.querySelector<HTMLInputElement>('input[type="month"],input[type="date"]')?.focus({preventScroll:true});
  });
  return()=>cancelAnimationFrame(frame);
 },[historyReady,editRequest,onStepChange]);
 const stayThrough=monthly&&checkout ? (()=>{const end=parseStayDay(checkout);end.setUTCDate(end.getUTCDate()-1);return end.toISOString().slice(0,10);})() : checkout;
 const cheapest=policy?.categories.reduce((a,b)=>Number(a.baseUnitMinor)<Number(b.baseUnitMinor)?a:b);
 const category=policy?.categories.find(room=>room.publicRoomTypeId===(selectedRoom??cheapest?.publicRoomTypeId));
 const room=rooms.find(room=>room.id===category?.publicRoomTypeId)??rooms[0];
 const roomPhoto=photos.find(photo=>/guest room interior/i.test(photo.alt))??photos.find(photo=>/room|bed|suite/i.test(photo.alt));
 const ageReady=children===0||ages.slice(0,children).every(age=>age!==null&&age>=0&&age<=(monthly?14:17));
 const occupancy=policy?.occupancy;
 const base=category?Number(category.baseUnitMinor)*duration:null;
 const secondAdult=monthly&&adults===2&&occupancy?Number(occupancy.secondAdultUnitMinor)*duration:0;
 const childrenRoom=monthly&&children===2&&occupancy?Number(occupancy.additionalChildrenRoomUnitMinor)*duration:0;
 const estimate=base!==null&&(monthly?adults>=1&&adults<=2&&children<=2&&ageReady:adults===1&&children===0)?base+secondAdult+childrenRoom:null;
 const memberPreview = process.env.NODE_ENV === "development" ? buildHotelMemberPreviewUrl({
  schema: HOTEL_MEMBER_PREFERENCE_SCHEMA, propertyId, publicRoomTypeId: selectedRoom,
  arrivalDate: arrival, departureDateExclusive: checkout, calendarMonths: monthly ? duration : null,
  adults, childAges: ages.slice(0, children), ambassadorSlug: selectedAmbassador,
  paymentSchedulePreference: monthly && duration > 1 && paymentPlan ? (paymentPlan === "monthly" ? "MONTHLY" : "FULL_UPFRONT") : null,
 }) : null;
 const monthlyAmount=estimate===null?null:estimate/duration;
 const monthlySchedule=monthly&&arrival&&duration>1?Array.from({length:duration},(_,index)=>({month:index===0?arrival:addStayCalendarMonths(arrival,index),amountMinor:monthlyAmount,deadline:index===0?null:singaporePaymentDeadline(addStayCalendarMonths(arrival,index))})):[];
 const [baseAmount,baseUnit] = fromLabel.replace(/^From /, "").split(" / ");
 const summaryLead=summary.split(/(?<=[.!?])\s+/).slice(0,2).join(" ");
 const staySummary=`${dateLabel(arrival)}${stayThrough?" – "+dateLabel(stayThrough):""} · ${durationLabel(duration)}`;
 const next=(value:number)=>{
 if(!historyReady)return;
 if(value>step&&monthly&&arrival&&arrival<MARINA_EARLIEST_ARRIVAL){setError("Crays Club Marina stays start from 1 February 2027. Choose February 2027 or a later month.");return;}
 if(value>step&&(!arrival||!checkout)){setError(monthly?"Choose your start month to continue.":"Choose your arrival date to continue.");return;}
 if(value>step&&!ageReady){setError(monthly&&ages.slice(0,children).some(age=>age!==null&&age>=15)?"Children aged 15 or over need a separate stay review for Crays Club Marina.":"Select the age of each child at arrival to continue.");return;}
 if(value>step&&monthly&&!arrival.endsWith("-01")){setError("Marina stays start on the 1st and run through the last day of the final month.");return;}
 if(value===3&&!selectedRoom){setError("Choose a room category before reviewing your stay.");return;}
 if(value===4){setError("Payment requires an approved application and a verified dated offer.");return;}
 setError(null);
 if(value!==step)writePublicHotelHistory(window.history,window.location.href,{...publicDraft,bookingStep:value},"push");
 setStep(value);setFurthestStep(previous=>Math.max(previous,value));onStepChange(value);
 };
 useEffect(()=>{const controller=new AbortController();void readRecommendation(controller.signal).then(value=>{if(!controller.signal.aborted)setRecommendation(value);});return()=>controller.abort();},[propertyId,refresh]);
 const invitationMessage=approvedRecommendation?`${text("Recommendation approved")} · ${recommendation.ambassadorName}. ${text("Membership and property admission are checked separately.")}`
 :recommendation.status==="checking"?"Checking your application approval…"
 :recommendation.status==="signed_out"?"Sign in to check your application status. Choosing an Ambassador alone does not approve your access."
 :recommendation.status==="identity_binding_required"?"Your signed-in account still needs to be linked to your Crays membership record before your application approval can be checked."
 :recommendation.status==="unavailable"?"Your application approval cannot be checked right now. You can keep planning; booking remains unavailable until it is verified."
 :recommendation.lifecycleState==="team_review"?"Your Ambassador’s recommendation is with the Crays team for approval."
 :recommendation.lifecycleState==="ambassador_review"?"Your application is being reviewed by your Ambassador."
 :recommendation.lifecycleState==="more_information_required"?"More information is needed for your application. Check your Crays account before booking."
 :recommendation.lifecycleState==="not_recommended"?"Your Ambassador has not recommended your application. The Crays team makes the final admission decision. Check your member account for the next steps."
 :recommendation.lifecycleState==="declined"?"Your application has not been approved. Contact Crays before requesting a stay."
 :recommendation.lifecycleState==="withdrawn"?"Your application has been withdrawn. A current approved recommendation is required before booking."
 :recommendation.status==="approved"?"Select the Ambassador named in your approved recommendation. A different selection does not transfer that approval."
 :"Before booking, your application through an Ambassador or directly through the Crays team must be approved in the Crays system.";
 const invitation=<section className={styles.invitation} aria-live="polite"><ShieldCheck aria-hidden="true" size={22}/><div><strong>Your invitation to Crays</strong><p>{invitationMessage}</p><ClubsMembershipProcessNotice/>{recommendation.status==="signed_out"||recommendation.status==="identity_binding_required"?<Link href={recommendation.status==="signed_out"?signInHref:"/en/account"}>{recommendation.status==="signed_out"?"Sign in to Crays":"Open your Crays account"} <ArrowRight size={14}/></Link>:!approvedRecommendation?<Link href="/en/ambassadors">Find your Ambassador <ArrowRight size={14}/></Link>:null}<Link href={directApplicationHref}>Apply through the Crays team <ArrowRight size={14}/></Link><button type="button" disabled={recommendation.status==="checking"} onClick={()=>{setRecommendation({status:"checking",ambassadorName:null});setRefresh(value=>value+1);}}>Check again</button></div></section>;
 const paymentPlanChoice=monthly&&duration>1?<section className={styles.paymentPlan}><h3>Choose when to pay</h3><p>Your plan covers the full {duration}-month stay. Choose one payment or monthly payments.</p><fieldset><legend>Payment schedule</legend><label data-selected={paymentPlan==="full"}><input type="radio" name="marina-payment-plan" checked={paymentPlan==="full"} onChange={()=>setPaymentPlan("full")}/><div><strong>Pay in full</strong><span>{estimate===null?"Final total pending":money(estimate)} at booking confirmation</span></div></label><label data-selected={paymentPlan==="monthly"}><input type="radio" name="marina-payment-plan" checked={paymentPlan==="monthly"} onChange={()=>setPaymentPlan("monthly")}/><div><strong>Pay monthly</strong><span>{duration} payments of {monthlyAmount===null?"an amount confirmed in your offer":money(monthlyAmount)}</span><span>First month at confirmation. Following months: debit or confirmed payment receipt three working days before the month begins.</span></div></label></fieldset>{paymentPlan==="monthly"?<ol className={styles.paymentSchedule}>{monthlySchedule.map((item,index)=><li key={item.month}><div><strong>{new Intl.DateTimeFormat(locale,{month:"long",year:"numeric"}).format(new Date(item.month+"T12:00:00"))}</strong><span>{index===0?"At booking confirmation":item.deadline?`${text("Debit / payment received by")} ${dateLabel(item.deadline)} (${text("Singapore")})`:text("Deadline pending the published Singapore holiday calendar")}</span></div><strong>{item.amountMinor===null?"To be confirmed":money(item.amountMinor)}</strong></li>)}</ol>:null}<p className={styles.fine}>All dates use Singapore time. Your plan ends with the selected stay.</p><details className={styles.paymentHelp}><summary>Payment deadlines and conditions</summary><p>These are estimated room and service amounts. Taxes and any permitted payment processing charges must be included in the final offer. Card or authorized automatic debit: collection three working days before the next month. Bank transfer or crypto: payment must have been received by that deadline, not only sent. Working days are Monday to Friday, excluding Singapore public holidays. Dates use Singapore time. The verified deadline and any bank or provider cutoff are included in your final offer. The payment plan ends with your booked stay; it does not renew automatically.</p></details></section>:null;
 const estimatedBreakdown=<><div className={styles.amountRow}><span>{selectedRoom?"Room + Crays services · first adult":"From-rate · room not selected"}</span><strong>{base===null?"Not available":money(base)}</strong></div>{secondAdult>0?<div className={styles.amountRow}><span>Second adult services</span><strong>{money(secondAdult)}</strong></div>:null}{childrenRoom>0?<div className={styles.amountRow}><span>Additional children’s room · room only</span><strong>{money(childrenRoom)}</strong></div>:null}<div className={styles.subtotal}><strong>Estimated room & services subtotal</strong><strong>{estimate===null?"Stay review required":money(estimate)}</strong></div><p className={styles.fine}>Planning estimate from the stored Crays pricing policy. Availability, taxes and the complete dated offer have not been confirmed.</p></>;
 return <TodayLocalizedContent><section ref={plannerRoot} className={styles.planner} aria-busy={!historyReady} aria-label="Plan your Crays stay">
  {step>1?<nav className={styles.steps} aria-label="Booking steps">{["Stay details","Rooms & services","Your offer","Payment"].map((label,index)=><button type="button" key={label} aria-current={step===index+1?"step":undefined} disabled={index+1>furthestStep||index===3} onClick={()=>next(index+1)}><span>{index+1}</span>{label}</button>)}</nav>:null}
  <div className={styles.layout}>
   <div className={styles.content}>
    {step===1?<><h2>{monthly?"Your monthly club stay":"Your Crays short stay"}</h2><p className={styles.lead}>{summaryLead}</p><details className={styles.fullDescription}><summary>Read the full stay description</summary><p>{summary}</p></details><a className={styles.location} href="#location"><MapPin size={18}/>Forest City, Johor <ArrowRight size={16}/></a><section className={styles.facilities}><h3>Hotel facilities</h3><div>{facilities.slice(0,4).map(item=>{ const Icon=/pool|swim/i.test(item.label)?Waves:/gym|fitness/i.test(item.label)?Dumbbell:/bar|dining|restaurant/i.test(item.label)?Wine:/beach|sea/i.test(item.label)?Umbrella:ShieldCheck; return <article key={item.id}><Icon size={34} aria-hidden="true"/><span>{item.label}</span></article>; })}</div></section><a className={styles.included} href="#overview"><FileText size={36}/><div><strong>Your Crays Club experience</strong><span>Community, work, wellbeing and events — explore the full Crays programme.</span></div><ArrowRight size={20}/></a>{invitation}</>:null}
    {step===2?<><h2 tabIndex={-1}>Choose your room category</h2><p className={styles.lead}>{staySummary}<br/>{adults} {adults===1?"adult":"adults"} · {children} {children===1?"child":"children"}{children>0?` (${text("ages")} ${ages.slice(0,children).join(" "+text("and")+" ")})`:""}</p><div className={styles.roomChoice}>{roomPhoto?<div className={styles.roomPhoto}><Image src={roomPhoto.publicPath} alt={roomPhoto.alt} fill unoptimized sizes="(max-width:820px) 100vw, 320px"/></div>:null}<div><h3>{selectedRoom?room?.label:"Explore your room options"}</h3><p>{room?.details.join(" ")??"Room details are loading."}</p><p className={styles.fine}>Room photographs illustrate the hotel. Exact room, bedding and layout are confirmed in your dated offer.</p></div></div><fieldset className={styles.roomOptions}><legend>Room categories · choose one</legend><p className={styles.fine}>Prices below are planning base rates for one adult. Your selection is a preference until availability is confirmed.</p>{policy?.categories.slice().sort((a,b)=>Number(a.baseUnitMinor)-Number(b.baseUnitMinor)).map(choice=>{const details=rooms.find(item=>item.id===choice.publicRoomTypeId);return <label key={choice.publicRoomTypeId} data-selected={selectedRoom===choice.publicRoomTypeId}><input type="radio" name={`${variant}-room-category`} value={choice.publicRoomTypeId} checked={selectedRoom===choice.publicRoomTypeId} onChange={()=>{setSelectedRoom(choice.publicRoomTypeId);setError(null);}}/><div><strong>{choice.name}</strong><p>{details?.details.join(" ")}</p><span>From {money(Number(choice.baseUnitMinor))} / {monthly?"calendar month":"night"}</span></div></label>;})}</fieldset>{monthly&&children===2?<div className={styles.childrenRoom}><BedDouble size={36}/><div><h3>Additional room for your children</h3><p>Room only · required for two children aged 14 or under. Both rooms must be available for your dates.</p></div></div>:null}{monthly&&occupancy?<div className={styles.info}><Users size={24}/><p>One child aged {occupancy.childFreeThroughAge} or under can share your room without an additional charge. Two children require an additional room. Additional services are priced separately.</p></div>:null}<a className={styles.included} href="#overview"><FileText size={36}/><div><strong>Your Crays Club experience</strong><span>Review the services described for this property.</span></div><ArrowRight size={20}/></a>{invitation}</>:null}
    {step===3?<><h2 tabIndex={-1}>Review your stay plan</h2><p className={styles.lead}>Check your stay details and what is included. A booking offer requires verified access and dated availability.</p><section className={styles.review}><h3>Your stay</h3><div className={styles.stayFacts}><span><CalendarDays size={22}/>{staySummary}</span><span><Users size={22}/>{adults} {adults===1?"adult":"adults"} · {children} {children===1?"child":"children"}</span><span><MapPin size={22}/>Forest City, Johor</span></div><h3>Your rooms & services</h3><div className={styles.roomChoice}>{roomPhoto?<div className={styles.roomPhoto}><Image src={roomPhoto.publicPath} alt={roomPhoto.alt} fill unoptimized sizes="320px"/></div>:null}<div><h4>{room?.label??"Room preference"}</h4><p>{room?.details.join(" ")}</p><p className={styles.fine}>Illustrative hotel room photograph. Your confirmed offer specifies the exact bedding and room layout.</p></div></div>{estimatedBreakdown}{paymentPlanChoice}<details><summary>Included services</summary><p>{baseDescription??summary}</p></details><details><summary>Cancellation & no-show terms</summary><p>The applicable terms must be included in the verified offer before you confirm.</p></details><details><summary>Check-in & house rules</summary><p>Review the hotel information below. Confirmed check-in details accompany your booking.</p></details></section>{invitation}</>:null}
    {step===4?<><h2>Choose how to pay</h2><p className={styles.lead}>Payment becomes available after your invitation, stay offer and room availability have been verified.</p>{[{name:"Bank transfer",Icon:Landmark,copy:"No Crays payment fee. Bank charges may apply."},{name:"USDT (Tether)",Icon:Landmark,copy:"No Crays payment fee. Network fees may apply."},{name:"Credit or debit card",Icon:CreditCard,copy:"Any permitted processing fee is calculated and shown before confirmation."}].map(({name,Icon,copy})=><div className={styles.paymentMethod} key={name}><Icon size={34}/><div><h3>{name}</h3><p>{copy}</p></div><span>Not available yet</span></div>)}{invitation}<div className={styles.info}><Info size={24}/><p>No payable offer has been issued. Payment details and confirmation remain unavailable.</p></div></>:null}
   </div>
   <aside className={styles.card} aria-label="Stay planning summary">
    {step===1?<><div className={styles.cardHead}><h2>Plan your stay</h2><div className={styles.from}><span>From</span><strong>{baseAmount}</strong>{baseUnit?<span>/ {baseUnit}</span>:null}</div></div><p className={styles.fine}>{baseDescription}</p><CraysPackageNote/>{!monthly&&flexibleSearchMonth&&!arrival?<p className={styles.fine}><strong>Your flexible search: {duration} {duration===1?"night":"nights"} · {flexibleSearchMonth==="Any month"?text("Any month"):hospitalityMonthLabel(flexibleSearchMonth,locale)}.</strong><br/>Choose your exact arrival date below to continue your stay plan.</p>:null}{monthly?<p className={styles.fine}>Stays start from 1 February 2027.<br/>Always from day 01 through the last calendar day.<br/><strong>{dateLabel(arrival)} – {dateLabel(stayThrough)}</strong></p>:null}<div className={styles.fields}><label>{monthly?"START MONTH":"ARRIVAL DATE"}<input type={monthly?"month":"date"} min={monthly?MARINA_EARLIEST_ARRIVAL.slice(0,7):undefined} value={monthly?arrival.slice(0,7):arrival} onChange={event=>{setError(null);setDateMode("exact");setFlexibleSearchMonth(null);setArrival(monthly&&event.target.value?`${event.target.value}-01`:event.target.value);}}/></label><label>DURATION<select value={duration} onChange={event=>{const value=Number(event.target.value);setDuration(value);if(monthly&&value===1)setPaymentPlan(null);}}>{Array.from({length:monthly?12:366},(_,index)=>index+1).map(value=><option key={value} value={value}>{durationLabel(value)}</option>)}</select></label>{monthly?<HotelAmbassadorPicker key={`${propertyId}-ambassador`} applicationHref={directApplicationHref} options={ambassadors} value={selectedAmbassador} onChange={setSelectedAmbassador}/>:<label>DEPARTURE DATE<input type="date" value={checkout} readOnly/></label>}<div className={styles.guestField}><span>{monthly?children===2?"GUESTS · 2 ROOMS":"GUESTS · 1 ROOM":"GUESTS"}</span><details className={styles.guestDetails}><summary>{adults} {adults===1?"adult":"adults"} · {children} {children===1?"child":"children"}<ChevronDown aria-hidden="true" size={16}/></summary><div className={styles.guestPopup}><label>ADULTS<select value={adults} onChange={event=>setAdults(Number(event.target.value))}>{(monthly?[1,2]:[1,2,3,4,5,6]).map(value=><option key={value} value={value}>{value} {value===1?"adult":"adults"}</option>)}</select></label><label>CHILDREN<select value={children} onChange={event=>setChildren(Number(event.target.value))}>{[0,1,2].map(value=><option key={value} value={value}>{value} {value===1?"child":"children"}</option>)}</select></label>{Array.from({length:children},(_,index)=><label key={index}>CHILD {index+1} AGE<select value={ages[index]??""} onChange={event=>setAges(values=>values.map((value,item)=>item===index?(event.target.value===""?null:Number(event.target.value)):value))}><option value="">Select age</option>{Array.from({length:18},(_,age)=><option key={age} value={age}>{age}</option>)}</select></label>)}</div></details></div>{!monthly?<HotelAmbassadorPicker key={`${propertyId}-ambassador`} applicationHref={directApplicationHref} options={ambassadors} value={selectedAmbassador} onChange={setSelectedAmbassador}/>:null}</div>{monthly&&children===2?<div className={styles.info}><Users size={24}/><p>For two children aged 14 or under, an additional room is included in your room plan and priced separately.</p></div>:null}{error?<p role="alert" className={styles.error}>{error}</p>:null}{monthly&&occupancy?<div className={styles.info}><Users aria-hidden="true" size={20}/><div><strong>{adults===2?"Second adult services":"Adding a second adult"}</strong><p>{money(Number(occupancy.secondAdultUnitMinor))} / calendar month, for their Crays services, alongside your shared room.</p>{adults===2?<p>Estimated room & services subtotal: {estimate===null?"Stay review required":money(estimate)} for {durationLabel(duration)}. Availability and the final offer are confirmed separately.</p>:null}</div></div>:null}
      <button className={styles.primary} type="button" onClick={()=>next(2)}>Continue to rooms & services <ArrowRight size={18}/></button>{monthly&&duration>1?<p className={styles.fine}>In your offer, choose to pay the full stay at confirmation or pay monthly.</p>:null}<p className={styles.center}>No payment at this step.<br/>Your application and member eligibility are checked before booking.</p></>:<><h2>{step===2?"Your stay summary":step===3?"Your stay plan":"Your booking summary"}</h2><p>{title}</p><p className={styles.fine}>{staySummary}<br/>{adults} {adults===1?"adult":"adults"} · {children} {children===1?"child":"children"}</p><div className={styles.summaryEdits}><button type="button" onClick={()=>next(1)}>Edit dates, guests & Ambassador</button>{selectedRoom?<button type="button" onClick={()=>next(2)}>Change room category</button>:null}</div>{error?<p role="alert" className={styles.error}>{error}</p>:null}{estimatedBreakdown}{monthly&&duration>1&&step===3?<div className={styles.paymentPlanSummary}><strong>Payment schedule</strong><p>{paymentPlan==="monthly"?`${duration} ${text("monthly payments")} · ${monthlyAmount===null?text("amount pending"):money(monthlyAmount)} ${text("each")}`:paymentPlan==="full"?"Full amount at booking confirmation":"Choose full or monthly payment in your stay plan."}</p>{paymentPlan==="monthly"?<p>First month at confirmation. Following months: debit or confirmed receipt three working days before the month begins.</p>:null}</div>:null}<div className={styles.info}><CalendarDays size={24}/><div><strong>{approvedRecommendation?"Dated availability still requires confirmation":"Your invitation needs verification"}</strong><p>Both room availability and your final offer must be confirmed by the Crays system before payment.</p></div></div>{step===2?<button type="button" className={styles.primary} onClick={()=>next(3)} disabled={!selectedRoom}>Continue to review <ArrowRight size={18}/></button>:step===3?<><button className={styles.primary} disabled type="button">Verified offer required to continue</button>{memberPreview?.status==="ready_preferences_only"?<><a className={styles.memberReview} href={memberPreview.href} target="_blank" rel="noopener noreferrer">Review in your member area <ArrowRight aria-hidden="true" size={18}/></a><p className={styles.fine}>The Member preview opens in a new tab. Your stay plan remains open here. This does not submit a booking or take payment.</p></>:null}<details className={styles.paymentHelp}><summary>Payment options after approval</summary><p>Bank transfer and USDT: no Crays payment fee where offered. Any lawful card processing charge and the full payable total must be shown before confirmation.</p></details></>:<button className={styles.primary} disabled type="button">Payment unavailable · no verified offer</button>}<button className={styles.back} type="button" onClick={()=>next(step-1)}><ArrowLeft size={16}/>Back to {step===2?"Stay details":step===3?"Rooms & services":"Your offer"}</button><p className={styles.fine}>No room is reserved, booking submitted or payment taken by this planning view.</p></>}
   </aside>
  </div>
 </section></TodayLocalizedContent>;
}
