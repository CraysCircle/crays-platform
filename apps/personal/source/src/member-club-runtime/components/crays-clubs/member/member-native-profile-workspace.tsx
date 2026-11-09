"use client";
import {useEffect,useRef,useState,type FormEvent,type ReactNode} from "react";
import Link from "../../../integration/browser-link";
import {UserRound,ShieldCheck,CheckCircle2,ArrowRight} from "lucide-react";
import type {MemberOperationRegistry} from "../../../lib/clubs/member-graphql-transport";
import {memberProfileCommand,type MemberProfileRead,type MemberProfileCommand} from "../../../lib/clubs/member-profile-contract";
import {executeMemberProfile,MemberProfileUpdateError} from "./member-profile-client";
import shared from "./clubs-member-home.module.css";
import styles from "./member-complete-workspaces.module.css";
import formStyles from "./member-native-profile-workspace.module.css";
type PendingProfileRequest={accountId:string;idempotencyKey:string;expectedVersion:number|null};
type Draft=Pick<MemberProfileCommand,"displayName"|"phone"|"locale"|"timezone"|"travelPreferences">;
const profileLanguageNames:Record<MemberProfileCommand["locale"],string>={"en":"English","de":"Deutsch","fr":"Français","es":"Español","it":"Italiano","pt":"Português","nl":"Nederlands","sv":"Svenska","da":"Dansk","no":"Norsk","fi":"Suomi","pl":"Polski","cs":"Čeština","el":"Ελληνικά","tr":"Türkçe","ar":"العربية","ja":"日本語","ko":"한국어","zh":"中文","ms":"Bahasa Melayu"};
import {MemberNativePrivacyRequests} from "./member-native-privacy-requests";
export function MemberNativeProfileWorkspace({registry,email,emailVerified,locale,onSaved,onPrivacyRequest,signInSlot}:{registry:MemberOperationRegistry;email?:string|null;emailVerified?:boolean;locale:string;onSaved:()=>void;onPrivacyRequest:(topic:"profile"|"data_export"|"account_closure")=>void;signInSlot?:ReactNode}){
 const [profile,setProfile]=useState<MemberProfileRead|null>(null),[draft,setDraft]=useState<Draft|null>(null),[phase,setPhase]=useState<"loading"|"ready"|"saving"|"unknown"|"unavailable">("loading"),[notice,setNotice]=useState("");
 const pending=useRef<PendingProfileRequest|null>(null),checking=useRef<PendingProfileRequest|null>(null),active=useRef(true),revision=useRef(0);
 const storageKey=(accountId:string)=>"crays-member-profile-pending:"+accountId;
 function persistPending(request:PendingProfileRequest){
  try{
   const key=storageKey(request.accountId);
   if(sessionStorage.getItem(key)!==null)return false;
   sessionStorage.setItem(key,request.idempotencyKey);
   return sessionStorage.getItem(key)===request.idempotencyKey;
  }catch{return false;}
 }
 function clearPending(request:PendingProfileRequest){
  try{
   const key=storageKey(request.accountId),stored=sessionStorage.getItem(key);
   if(stored===null)return true;
   if(stored!==request.idempotencyKey)return false;
   sessionStorage.removeItem(key);
   return sessionStorage.getItem(key)===null;
  }catch{return false;}
 }
 function apply(data:MemberProfileRead){setProfile(data);setDraft({displayName:data.displayName,phone:data.phone,locale:data.locale??"en",timezone:data.timezone??"UTC",travelPreferences:data.travelPreferences??""});setPhase("ready");}
 useEffect(()=>{
  active.current=true;const controller=new AbortController(),request=++revision.current;
  pending.current=null;checking.current=null;setPhase("loading");setNotice("");
  void executeMemberProfile(registry,{idempotencyKey:null},controller.signal).then(data=>{
   if(controller.signal.aborted||!active.current||revision.current!==request||data.schema!=="crays.clubs.member-profile.v1")return;
   apply(data);
   let key:string|null;
   try{key=sessionStorage.getItem(storageKey(data.accountId));}
   catch{setPhase("unavailable");setNotice("We couldn’t check your previous profile request. No update will be sent. Refresh this page to try again.");return;}
   if(key!==null){
    if(!/^[A-Za-z0-9:_.-]{16,100}$/.test(key)){setPhase("unavailable");setNotice("Your previous profile request reference needs checking. No update will be sent.");return;}
    pending.current={accountId:data.accountId,idempotencyKey:key,expectedVersion:null};
    setPhase("unknown");setNotice("A previous profile request needs checking before another update.");
   }
  }).catch(()=>{if(!controller.signal.aborted&&active.current&&revision.current===request)setPhase("unavailable");});
  return()=>{active.current=false;controller.abort();};
 },[registry]);
 const editable=phase==="ready"&&draft!==null&&profile!==null;
 async function checkSaved(){
  const request=pending.current,generation=revision.current;
  if(!request||checking.current)return;
  checking.current=request;setNotice("Checking your saved request…");
  try{
   const data=await executeMemberProfile(registry,{idempotencyKey:request.idempotencyKey});
   if(!active.current||revision.current!==generation||pending.current!==request||data.schema!=="crays.clubs.member-profile.v1")return;
   const receipt=data.commandReceipt;
   if(data.accountId===request.accountId&&receipt?.accountId===request.accountId&&receipt.idempotencyKey===request.idempotencyKey&&data.version>=receipt.version&&(request.expectedVersion===null||receipt.version===request.expectedVersion+1)){
    if(!clearPending(request)){setPhase("unknown");setNotice("Your saved details are confirmed, but we couldn’t clear the matching request reference. No new update will be sent.");return;}
    pending.current=null;apply(data);setNotice("Your saved details are confirmed.");onSaved();
   }else setNotice("That request is not confirmed yet. Your edits are kept here; no update has been repeated.");
  }catch{if(active.current&&revision.current===generation&&pending.current===request)setNotice("We couldn’t check that request yet. No update has been repeated.");}
  finally{if(checking.current===request)checking.current=null;}
 }
 async function save(event:FormEvent){
  event.preventDefault();if(!editable||!draft||!profile||pending.current)return;
  const parsed=memberProfileCommand.safeParse({...draft,contractVersion:"1.0.0",expectedVersion:profile.version,idempotencyKey:"member-profile:"+crypto.randomUUID()});
  if(!parsed.success){setNotice("Check your name, phone number and preferences before saving.");return;}
  const request:PendingProfileRequest={accountId:profile.accountId,idempotencyKey:parsed.data.idempotencyKey,expectedVersion:profile.version},generation=revision.current;
  if(!persistPending(request)){setPhase("unavailable");setNotice("We couldn’t save your request reference. Your edits are kept here and no update was sent.");return;}
  pending.current=request;setPhase("saving");setNotice("Saving your details…");
  const current=()=>active.current&&revision.current===generation&&pending.current===request;
  try{
   const receipt=await executeMemberProfile(registry,parsed.data);if(!current())return;
   if(receipt.accountId!==request.accountId)throw new MemberProfileUpdateError("unknown","OUTCOME_UNKNOWN");
   await checkSaved();if(current())setPhase("unknown");
  }catch(error){
   if(!current())return;
   if(error instanceof MemberProfileUpdateError&&error.outcome==="rejected"){
    if(!clearPending(request)){setPhase("unknown");setNotice("That change was rejected, but the matching request reference still needs checking. No update has been repeated.");return;}
    pending.current=null;setPhase("loading");setNotice("That change was rejected before it was saved. Reloading your saved details…");
    try{
     const latest=await executeMemberProfile(registry,{idempotencyKey:null});
     if(!active.current||revision.current!==generation||latest.schema!=="crays.clubs.member-profile.v1")return;
     if(latest.accountId!==request.accountId)throw Error("PROFILE_ACCOUNT_CHANGED");
     apply(latest);setNotice(error.code==="CONFLICT"||error.code==="VERSION_CONFLICT"?"Your details changed. The saved version is reloaded; check it before saving again.":"That change wasn’t saved. Check your details or sign-in access before trying again.");
    }catch{if(active.current&&revision.current===generation){setPhase("unavailable");setNotice("That change wasn’t saved. We couldn’t reload your profile; refresh this page to reconnect.");}}
   }else{setPhase("unknown");setNotice("That update wasn’t confirmed. Check the saved request; we won’t repeat it.");}
  }
 }
 function cancel(){if(profile&&editable)apply(profile);setNotice("");}
 return <div className={styles.profileLayout}><div><form className={formStyles.form} onSubmit={event=>void save(event)}><section className={styles.panel}><h2>Personal details</h2><p>Your details. A little more you.</p>{phase==="loading"?<p role="status">Getting your saved details…</p>:phase==="unavailable"?<p role="status">Your profile isn’t available yet. Refresh this page to try again.</p>:null}<div className={formStyles.personal}><UserRound size={64} aria-hidden/><div className={formStyles.fieldGrid}><label className={formStyles.field}>Name<input disabled={!editable} value={draft?.displayName??""} maxLength={120} onChange={e=>setDraft(d=>d?{...d,displayName:e.target.value}:d)}/></label><label className={formStyles.field}>Email<input value={email??"Not connected"} readOnly/></label><div className={formStyles.readMetadata}>{emailVerified?<p className={styles.privacy}><CheckCircle2 size={20} aria-hidden/>Email verified</p>:null}<p className={styles.notice}>Your email is managed by your sign-in method.</p></div><label className={`${formStyles.field} ${formStyles.fullWidth}`}>Phone<input type="tel" disabled={!editable} value={draft?.phone??""} placeholder="+60123456789" onChange={e=>setDraft(d=>d?{...d,phone:e.target.value||null}:d)}/></label></div></div></section><section className={styles.panel}><h2>Your preferences</h2><p>Make this space feel like you.</p><div className={formStyles.fieldGrid}><label className={formStyles.field}>Language<select disabled={!editable} value={draft?.locale??"en"} onChange={e=>setDraft(d=>d?{...d,locale:e.target.value as Draft["locale"]}:d)}>{memberProfileCommand.shape.locale.options.map(value=><option key={value} value={value}>{profileLanguageNames[value]}</option>)}</select></label><label className={formStyles.field}>Timezone<input disabled={!editable} value={draft?.timezone??""} placeholder="Asia/Kuala_Lumpur" onChange={e=>setDraft(d=>d?{...d,timezone:e.target.value}:d)}/></label><label className={`${formStyles.field} ${formStyles.fullWidth}`}>Travel preferences<textarea disabled={!editable} value={draft?.travelPreferences??""} maxLength={500} onChange={e=>setDraft(d=>d?{...d,travelPreferences:e.target.value}:d)}/></label></div>{profile&&!profile.settingsPersisted?<p className={styles.notice}>These suggested preferences have not been saved yet.</p>:null}<div className={formStyles.actions}><button type="submit" className={shared.primaryAction} disabled={!editable} aria-busy={phase==="saving"||undefined}>{phase==="saving"?"Saving…":"Save changes"}</button><button type="button" className={shared.smallAction} disabled={!editable} onClick={cancel}>Cancel</button></div>{notice?<p role="status" className={styles.notice}>{notice}</p>:null}{phase==="unknown"?<><p className={styles.notice}>Request reference: {pending.current?.idempotencyKey}</p><button type="button" className={shared.smallAction} onClick={()=>void checkSaved()}>Check saved request</button></>:null}</section></form><section className={styles.panel}><h2>Stay in the loop.</h2><p>Booking and service updates are part of your account service. Optional marketing choices have no recorded decision here yet.</p><p className={styles.notice}>We’ll show optional choices when their original consent purpose and relationship are connected.</p></section></div><aside><section className={styles.panel}><h2>Privacy & account</h2><p>Your details. Your choices.</p><div className={styles.privacyActions}><button type="button" onClick={()=>onPrivacyRequest("profile")}><UserRound size={26} aria-hidden/><span><strong>A question about your profile?</strong><small>Let’s find the right next step.</small></span><ArrowRight size={19} aria-hidden/></button><Link href={`/${locale}/legal/privacy-policy`}><ShieldCheck size={26} aria-hidden/><span><strong>Review the privacy policy</strong><small>How CRAYS handles your information.</small></span><ArrowRight size={19} aria-hidden/></Link></div></section><MemberNativePrivacyRequests registry={registry}/>{signInSlot?<section className={`${styles.panel} ${formStyles.signInSlot}`}>{signInSlot}</section>:null}</aside></div>;
}
