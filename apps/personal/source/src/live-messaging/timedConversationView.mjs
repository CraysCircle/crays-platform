import {conversationMessageExpiry} from './conversationTimer.mjs';
/** Keeps the real transport mounted. Expiry notifies subscribers at the exact
 * boundary, independently of slow network polls; readable cached media rows
 * disappear through the same client used by the media controller. */
export function createTimedConversationView({client,timer,signal,authorize,now=Date.now,setTimeout:schedule=globalThis.setTimeout,clearTimeout:cancel=globalThis.clearTimeout}){
 if(typeof client?.getSnapshot!=='function'||typeof timer?.getSnapshot!=='function'||!signal?.addEventListener||typeof authorize!=='function')throw Error('Current conversation timer required');
 let closed=false,snapshot,alarm,expiryAt=Infinity,unsubscribeClient,unsubscribeTimer;const listeners=new Set();
 const admitted=()=>!closed&&!signal.aborted&&authorize()===true;
 const close=()=>{if(closed)return;closed=true;cancel(alarm);unsubscribeClient?.();unsubscribeTimer?.();signal.removeEventListener('abort',close);timer.close();client.close();snapshot=Object.freeze({state:'closed',available:false,messages:[],sending:false,problem:null});for(const fn of listeners)fn();listeners.clear();};
 const emit=()=>{
  if(!admitted()){close();return;}cancel(alarm);const base=client.getSnapshot(),settings=timer.getSnapshot(),time=now();
  const expiry=message=>conversationMessageExpiry(message,settings.changes),available=base.available&&settings.available;
  const messages=available?base.messages.filter(m=>expiry(m)>time):[];
  snapshot=Object.freeze({...base,timerChanges:settings.changes,available,state:available?base.state:'unavailable',messages,pinnedReply:available&&base.pinnedReply&&expiry(base.pinnedReply)>time?base.pinnedReply:null});
  const next=Math.min(...messages.map(expiry).filter(v=>v>time));expiryAt=next;
  if(Number.isFinite(next)){alarm=schedule(emit,Math.min(Math.max(1,next-time),2147483647));alarm?.unref?.();}
  for(const fn of listeners)fn();
 };
 signal.addEventListener('abort',close,{once:true});emit();
 if(!closed){unsubscribeClient=client.subscribe(emit);unsubscribeTimer=timer.subscribe(emit);}
 const checkReply=replyTo=>{if(!admitted()||!snapshot.available)throw Error('This conversation is no longer available.');if(replyTo&&!snapshot.messages.some(m=>m.id===replyTo)&&!(snapshot.pinnedReply?.id===replyTo))throw Error('This reply has expired or is no longer visible.');};
 return Object.freeze({...client,messageTimer:timer,getSnapshot(){if(!admitted())close();else if(now()>=expiryAt)emit();return snapshot;},subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
  async refresh(){if(!admitted())throw Error('Conversation unavailable');await timer.reload();await client.refresh();emit();},
  prepareAttempt(text,replyTo=null){checkReply(replyTo);return client.prepareAttempt(text,replyTo);},
  send(value){checkReply(value.replyTo);return client.send(value);},
  ...(client.pinReplyOriginal?{pinReplyOriginal(id){checkReply(id);client.pinReplyOriginal(id);},isPinnedReplyOriginal:id=>admitted()&&snapshot.pinnedReply?.id===id&&client.isPinnedReplyOriginal(id)===true}:{}),close,
 });
}
