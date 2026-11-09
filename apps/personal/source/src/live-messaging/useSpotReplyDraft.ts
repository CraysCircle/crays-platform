import {useEffect,useMemo,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import type {createCurrentSpotRelayClient} from './currentSpotRelayClient.mjs';
type Client=ReturnType<typeof createCurrentSpotRelayClient>;
type Status='idle'|'loading'|'saving'|'saved'|'conflict'|'unavailable';
/** The existing account store encrypts the draft. Never sends a relay command. */
export function useSpotReplyDraft(client:Client|null){
 const [text,display]=useState(''),[status,setStatus]=useState<Status>('idle');
 const session=useMemo(()=>({client,text:'',dirty:false,edits:0,revision:null as string|null,hydrated:false,hydrating:null as Promise<void>|null,conflict:false,disposed:false,tail:Promise.resolve()}),[client]);
 const current=()=>!session.disposed&&!!session.client&&session.client.getSnapshot().state!=='closed';
 useEffect(()=>{session.disposed=false;display('');setStatus('idle');return()=>{session.disposed=true;session.text='';};},[session]);
 async function hydrate(){
  if(!current()||session.hydrated)return;
  if(!session.hydrating)session.hydrating=(async()=>{
   const saved=await session.client!.readDraft();if(!current())return;
   session.revision=saved.revision;session.hydrated=true;
   // Typing while the original encrypted read is pending wins locally.
   if(!session.dirty){session.text=saved.text;display(saved.text);setStatus(saved.text?'saved':'idle');}
   else if(saved.text&&saved.text!==session.text){session.conflict=true;setStatus('conflict');}
  })().finally(()=>{session.hydrating=null;});
  await session.hydrating;
 }
 const focus=()=>{if(!current()||session.hydrated)return;setStatus('loading');void hydrate().catch(()=>{if(current())setStatus('unavailable');});};
 const persist=(value:string)=>{
  session.tail=session.tail.catch(()=>{}).then(async()=>{
   if(!current()||session.conflict)return;
   await hydrate();if(!current()||!session.hydrated||session.conflict)return;
   const result=await session.client!.saveDraft({text:value,expectedRevision:session.revision});if(!current())return;
   if(result.status==='conflict'){session.conflict=true;setStatus('conflict');return;}
   session.revision=result.revision;if(session.text===value)setStatus('saved');
  }).catch(()=>{if(current())setStatus('unavailable');});
 };
 const setText:Dispatch<SetStateAction<string>>=next=>{
  if(!current())return;
  const value=typeof next==='function'?next(session.text):next;
  session.text=value;session.dirty=true;session.edits++;display(value);
  if(session.conflict){setStatus('conflict');return;}
  setStatus('saving');persist(value);
 };
 // Explicit recovery re-reads the current revision; never blindly overwrites it.
 const useSaved=async()=>{
  if(!current())return;try{
   await session.tail;const edits=session.edits,saved=await session.client!.readDraft();if(!current()||session.edits!==edits)return;
   session.revision=saved.revision;session.hydrated=true;session.conflict=false;session.text=saved.text;session.dirty=false;display(saved.text);setStatus('saved');
  }catch{if(current())setStatus('unavailable');}
 };
 const keepMine=async()=>{
  if(!current())return;try{
   await session.tail;const saved=await session.client!.readDraft();if(!current())return;
   session.revision=saved.revision;session.hydrated=true;session.conflict=false;setStatus('saving');persist(session.text);
  }catch{if(current())setStatus('unavailable');}
 };
 const clearSent=async(sentText:string)=>{
  if(!current())return;
  // A receipt only clears the exact text it confirms, never a newer tab edit.
  await session.tail;if(!current())return;
  const saved=await session.client!.readDraft();if(!current())return;
  if(session.text===sentText){session.text='';display('');session.edits++;}
  if(saved.text!==sentText)return;
  const cleared=await session.client!.saveDraft({text:'',expectedRevision:saved.revision});if(!current())return;
  if(cleared.status==='saved'){session.revision=cleared.revision;session.hydrated=true;session.conflict=false;if(!session.text)setStatus('saved');}
  else {session.conflict=true;setStatus('conflict');}
 };
 return {text,setText,status,focus,useSaved,keepMine,clearSent};
}
