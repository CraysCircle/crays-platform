"use client";
import {memberInterpretedStayPeriodAt} from "./member-stay-period";
import Image from "../../../integration/browser-image";
import {useEffect,useState} from "react";
import {ArrowRight,CalendarDays,FileText,MapPin,MessageCircle,UsersRound} from "lucide-react";
import type {OwnTestStays,OwnTestStay} from "../../../lib/clubs/member-test-stays-contract";
import {memberDate,memberProperty,type MemberFeed} from "./clubs-member-home-model";
import styles from "./member-stays-workspace.module.css";
type Period="upcoming"|"current"|"past";
const periods=["upcoming","current","past"] as const;
export function testStayPeriod(stay:OwnTestStay,asOf:string):Period|null{
 return memberInterpretedStayPeriodAt(stay,new Date(asOf),stay.dateSemanticsTimezone);
}
function testAmount(stay:OwnTestStay,locale:string){
 return stay.currency!==null&&stay.totalMinor!==null?new Intl.NumberFormat(locale,{style:"currency",currency:stay.currency}).format(stay.totalMinor/100):"Amount not available";
}
/** Read-only display of original TEST source records, never native booking command context. */
export function MemberTestStaysWorkspace({feed,locale,asOf,selectedSourceRecordId=null,onSelect,onPeriodChange}:{feed:MemberFeed<OwnTestStays>;locale:string;asOf:string|null;selectedSourceRecordId?:string|null;onSelect?:(sourceRecordId:string|null)=>void;onPeriodChange?:(period:Period)=>void}){
 const [period,setPeriod]=useState<Period>("upcoming");
 const selected=feed.kind==="ready"&&selectedSourceRecordId?feed.data.stays.find(stay=>stay.sourceRecordId===selectedSourceRecordId):null;
 useEffect(()=>{if(selected&&asOf){const next=testStayPeriod(selected,asOf);if(next){setPeriod(next);onPeriodChange?.(next);}}},[selected?.sourceRecordId,asOf,onPeriodChange]);
 function changePeriod(next:Period){setPeriod(next);onPeriodChange?.(next);if(selectedSourceRecordId)onSelect?.(null);}

 if(feed.kind!=="ready")return null;
 const groups=(key:Period)=>asOf?feed.data.stays.filter(stay=>testStayPeriod(stay,asOf)===key).sort((a,b)=>a.arrivalDate.localeCompare(b.arrivalDate)||a.sourceRecordId.localeCompare(b.sourceRecordId)):[];
 const records=groups(period);
 return <section aria-label="Your test stays" className={styles.workspace}>
  <p role="status">Your test stays · Saved sample data. These are not confirmed hotel bookings.</p>
  <div className={styles.toolbar}><div className={styles.tabs} role="tablist" aria-label="Test stay periods">{periods.map(key=><button key={key} id={`test-stay-tab-${key}`} type="button" role="tab" aria-selected={period===key} aria-controls="member-test-stays-list" tabIndex={period===key?0:-1} onClick={()=>changePeriod(key)} onKeyDown={event=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();const index=periods.indexOf(period);const next=event.key==="Home"?periods[0]:event.key==="End"?periods[periods.length-1]:periods[(index+(event.key==="ArrowRight"?1:periods.length-1))%periods.length];changePeriod(next);document.getElementById(`test-stay-tab-${next}`)?.focus();}}>{key[0].toUpperCase()+key.slice(1)} ({asOf?groups(key).length:"—"})</button>)}</div></div>
  <div id="member-test-stays-list" role="tabpanel" aria-labelledby={`test-stay-tab-${period}`} tabIndex={0} className={styles.list}>
   {!asOf?<p role="status">Getting your stay dates together…</p>:!records.length?<p>No test stays in this chapter. Try another tab.</p>:records.map(stay=><article key={stay.sourceRecordId} className={styles.card}>
    <div className={styles.photo}><Image src="/assets/crays/member-marina-original.webp" alt="Forest City vision from the CRAYS image collection" fill quality={95} sizes="(max-width:760px) 100vw, 40vw"/></div>
    <div className={styles.cardBody}><span className={styles.status}>Test stay · {period}</span><h2>{stay.propertyDisplayName}</h2><p className={styles.dates}>{memberDate(stay.arrivalDate,locale)} – {memberDate(stay.departureDate,locale)}</p><dl className={styles.facts}><div><FileText size={21} aria-hidden/><dt>Test reference</dt><dd>{stay.publicReference}</dd></div><div><UsersRound size={21} aria-hidden/><dt>Guests</dt><dd>{stay.guestCount}</dd></div></dl>
     <details open={selectedSourceRecordId===stay.sourceRecordId}><summary onClick={event=>{if(onSelect){event.preventDefault();onSelect(selectedSourceRecordId===stay.sourceRecordId?null:stay.sourceRecordId);}}}>View test stay details</summary><dl><dt>Sample stay amount</dt><dd>{testAmount(stay,locale)}</dd><dt>Booking confirmation</dt><dd>No hotel booking confirmed</dd><dt>Payment confirmation</dt><dd>No payment confirmed</dd></dl></details>
    </div>
   </article>)}
  </div>
 </section>;
}

export function MemberTestStayGlance({stay,selectionUnavailable,locale,onMessages,onDocuments}:{stay:OwnTestStay|null;selectionUnavailable:boolean;locale:string;onMessages:()=>void;onDocuments:()=>void}){
 return <section className={styles.glance}><h2>Your stay at a glance</h2>{selectionUnavailable?<p role="status">That saved test stay isn’t available. Choose one from your list.</p>:stay?<><p>Saved TEST stay · Not a confirmed booking.</p><p>{stay.propertyDisplayName} · {stay.publicReference}</p><dl>{[{icon:CalendarDays,label:"Arrival",value:memberDate(stay.arrivalDate,locale)},{icon:CalendarDays,label:"Departure",value:memberDate(stay.departureDate,locale)},{icon:UsersRound,label:"Guests",value:stay.guestCount},{icon:MapPin,label:"Location",value:memberProperty(stay.propertyId)?"Forest City, Malaysia":"Location not available"}].map(row=><div key={row.label}><row.icon size={24} aria-hidden/><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></>:<p>Choose a saved test stay in this period to see its details.</p>}<div className={styles.glanceSupport}><h2>A little help for your stay.</h2><button type="button" onClick={onMessages}><MessageCircle size={24} aria-hidden/><span><strong>Let’s chat</strong><small>Got a stay question? We’re here.</small></span><ArrowRight size={18} aria-hidden/></button><button type="button" onClick={onDocuments}><FileText size={24} aria-hidden/><span><strong>Your documents</strong><small>Browse your account documents.</small></span><ArrowRight size={18} aria-hidden/></button></div></section>;
}
