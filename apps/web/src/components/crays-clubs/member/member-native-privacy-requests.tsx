"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import type {MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import {memberPrivacyCommand,type MemberPrivacyCommand,type MemberPrivacyRead} from "@/lib/clubs/member-privacy-contract";
import {recordedPrivacyRequest} from "./member-privacy-pending";
import {executeMemberPrivacy,MemberPrivacyUpdateError} from "./member-privacy-client";
import styles from "./member-complete-workspaces.module.css";
import privacyStyles from "./member-privacy-requests.module.css";
import shared from "./clubs-member-home.module.css";
const original="acct_384c05e7-e716-4dc9-864d-8c63bf13876c";
const titles={data_export:"Data export",data_correction:"Data correction",account_closure:"Account closure review"};
export function MemberNativePrivacyRequests({registry}:{registry:MemberOperationRegistry}){
 const [data,setData]=useState<MemberPrivacyRead|null>(null),[kind,setKind]=useState<MemberPrivacyCommand["kind"]>("data_export"),[reason,setReason]=useState(""),[ack,setAck]=useState(false),[phase,setPhase]=useState<"loading"|"ready"|"saving"|"unknown"|"unavailable">("loading"),[notice,setNotice]=useState("");
 const noticeRef=useRef<HTMLParagraphElement>(null);
 const pending=useRef<MemberPrivacyCommand|null>(null),pendingRaw=useRef<string|null>(null),checking=useRef<symbol|null>(null),generation=useRef(0),active=useRef(true),storageKey=`crays-member-privacy-pending:${original}`;
 function restorePending(){
  try{
   const raw=sessionStorage.getItem(storageKey);
   if(pending.current)return raw===null||raw===pendingRaw.current;
   if(raw===null){pendingRaw.current=null;return true;}
   const parsed=memberPrivacyCommand.safeParse(JSON.parse(raw));
   if(!parsed.success)return false;
   pending.current=parsed.data;pendingRaw.current=raw;return true;
  }catch{return false;}
 }
 function persist(command:MemberPrivacyCommand){
  try{
   if(sessionStorage.getItem(storageKey)!==null)return false;
   const raw=JSON.stringify(command);sessionStorage.setItem(storageKey,raw);
   if(sessionStorage.getItem(storageKey)!==raw)return false;
   pending.current=command;pendingRaw.current=raw;return true;
  }catch{return false;}
 }
 function clearPending(command:MemberPrivacyCommand){
  if(pending.current!==command)return false;
  try{
   const raw=sessionStorage.getItem(storageKey);
   if(raw!==null&&raw!==pendingRaw.current)return false;
   if(raw!==null)sessionStorage.removeItem(storageKey);
   if(sessionStorage.getItem(storageKey)!==null)return false;
   pending.current=null;pendingRaw.current=null;return true;
  }catch{return false;}
 }
 const reconcile=async(signal?:AbortSignal)=>{
  if(checking.current)return;
  if(!restorePending()){setPhase("unavailable");setNotice("We couldn’t check your previous request reference. No request will be sent; refresh this page to reconnect.");return;}
  const command=pending.current,g=generation.current,ticket=Symbol();checking.current=ticket;
  try{
   const read=await executeMemberPrivacy(registry,{idempotencyKey:command?.idempotencyKey??null},signal);
   if(!active.current||signal?.aborted||g!==generation.current||pending.current!==command||!("requests" in read))return;
   setData(read);
   if(command){
    const saved=recordedPrivacyRequest(read,command);
    if(saved){
     if(!clearPending(command)){setPhase("unknown");setNotice("Your request is saved, but its matching reference still needs checking. No request has been repeated.");return;}
     setReason("");setAck(false);setPhase("ready");setNotice(`Your request is saved: ${saved.requestId}. It is waiting for review.`);
    }else{setPhase("unknown");setNotice("This request has not been confirmed. Check its saved status; we will not send it again.");}
   }else{
    if(sessionStorage.getItem(storageKey)!==null){setPhase("unavailable");setNotice("A previous request reference needs checking before another request.");return;}
    setPhase("ready");
   }
  }catch(error){
   if(!active.current||signal?.aborted||g!==generation.current||pending.current!==command||checking.current!==ticket)return;
   throw error;
  }finally{if(checking.current===ticket)checking.current=null;}
 };
 useEffect(()=>{
  active.current=true;const controller=new AbortController();pending.current=null;pendingRaw.current=null;checking.current=null;setPhase("loading");
  void reconcile(controller.signal).catch(()=>{if(active.current&&!controller.signal.aborted)setPhase(pending.current?"unknown":"unavailable");});
  return()=>{active.current=false;generation.current++;controller.abort();};
 },[registry]);
 useEffect(()=>{if(phase==="ready"&&notice.startsWith("Your request is saved:"))noticeRef.current?.focus({preventScroll:true});},[phase,notice]);
 async function submit(event:FormEvent){
  event.preventDefault();if(phase!=="ready"||!data||pending.current||checking.current)return;
  const command=memberPrivacyCommand.safeParse({contractVersion:"1.0.0",idempotencyKey:`privacy_${crypto.randomUUID()}`,expectedVersion:data.version,kind,reason:reason.trim(),acknowledgedRequestOnly:ack});
  if(!command.success){setNotice("Please add at least 10 characters and confirm that this is a request for review.");return;}
  if(!persist(command.data)){setPhase("unavailable");setNotice("We couldn’t save your request reference. Your details are kept here and no request was sent.");return;}
  setPhase("saving");setNotice("");const request=command.data,g=generation.current;
  const current=()=>active.current&&g===generation.current&&pending.current===request;
  try{await executeMemberPrivacy(registry,request);if(!current())return;await reconcile();}
  catch(error){
   if(!current())return;
   if(error instanceof MemberPrivacyUpdateError&&error.outcome==="rejected"){
    if(!clearPending(request)){setPhase("unknown");setNotice("That request was rejected, but its matching reference still needs checking. No request has been repeated.");return;}
    setPhase("loading");setNotice("That request was not saved. Refreshing your details so you can check and try again.");
    try{await reconcile();}catch{if(active.current&&g===generation.current)setPhase("unavailable");}
   }else{setPhase("unknown");setNotice("The result is not confirmed. Check the saved request before taking another step.");}
  }
 }
 const disabled=phase!=="ready";
 return <section className={styles.panel} aria-label="Your privacy requests"><h2>Your privacy requests</h2><p>Ask for an export, a correction or an account closure review. Each request is saved with its own reference.</p><p className={styles.notice}>Submitting a request does not export your data, change consent or delete your account. Our team reviews the next step.</p>{phase==="loading"?<p role="status">Loading your requests…</p>:null}<form className={privacyStyles.form} onSubmit={event=>void submit(event)}><label className={privacyStyles.field}>Request type<select disabled={disabled} value={kind} onChange={e=>setKind(e.target.value as MemberPrivacyCommand["kind"])}>{Object.entries(titles).map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label><label className={privacyStyles.field}>What would you like us to review?<textarea disabled={disabled} value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)} placeholder="Tell us what you need. Please do not include passwords or payment details."/></label><label className={privacyStyles.checkRow}><input type="checkbox" disabled={disabled} checked={ack} onChange={e=>setAck(e.target.checked)}/>I understand that this sends a request for review.</label><div className={privacyStyles.actions}><button type="submit" className={shared.primaryAction} disabled={disabled||!ack||reason.trim().length<10} aria-busy={phase==="saving"||undefined}>{phase==="saving"?"Saving your request…":"Send request"}</button></div></form>{notice?<p ref={noticeRef} tabIndex={-1} role="status" className={styles.notice}>{notice}</p>:null}{phase==="unknown"||phase==="unavailable"?<button type="button" className={shared.smallAction} onClick={()=>void reconcile().catch(()=>{if(active.current)setPhase(pending.current?"unknown":"unavailable");})}>Check saved requests</button>:null}{data?.historyTruncated?<p className={styles.notice}>Showing the latest {data.historyLimit} of {data.totalRequests} requests.</p>:null}{data&&data.requests.length>0?<p className={styles.notice}>Your requests are saved in your account. Team workflow linking is not connected yet.</p>:null}{data?.requests.length?<ul className={privacyStyles.history}>{data.requests.map(row=><li className={privacyStyles.historyItem} key={row.requestId}><strong>{titles[row.kind]} · Requested</strong><p>{row.reason}</p><small>{row.requestId} · {row.submittedAt}</small></li>)}</ul>:data?<p>No privacy requests saved yet.</p>:null}</section>;
}

