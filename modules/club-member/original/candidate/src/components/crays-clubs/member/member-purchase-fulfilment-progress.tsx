"use client";
import {useEffect,useState,useCallback} from "react";
import {memberPurchaseFulfilmentLabel,type MemberPurchaseFulfilmentRead} from "../../../lib/clubs/member-purchase-fulfilment-contract";
import type {MemberOperationRegistry} from "../../../lib/clubs/member-graphql-transport";
import type {MemberFeed} from "./clubs-member-home-model";
import {readMemberPurchaseFulfilmentFeed} from "./member-purchase-fulfilment-graphql-reader";
/** Bounded live read, then explicit reload/focus. No browser authority or provider writes. */
export function useMemberPurchaseFulfilmentProgress(registry:MemberOperationRegistry,enabled:boolean,expectedLineCount=0){
 const [feed,setFeed]=useState<MemberFeed<MemberPurchaseFulfilmentRead>>({kind:"loading"});
 const [refresh,setRefresh]=useState(0);
 const reload=useCallback(()=>setRefresh(v=>v+1),[]);
 useEffect(()=>{
  if(!enabled)return;
  let stopped=false,attempts=0,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined;
  async function read(){
   if(timer){clearTimeout(timer);timer=undefined;}
   controller?.abort();controller=new AbortController();const current=controller;
   try{
    const next=await readMemberPurchaseFulfilmentFeed(registry,fetch,current.signal);
    if(stopped||current.signal.aborted)return;setFeed(next);
    if(next.kind==="ready"&&next.data.tasks.length<Math.max(1,expectedLineCount)&&++attempts<12)timer=setTimeout(read,5000);
   }catch{ /* aborted or invalidated reads never replace current state */ }
  }
  const focus=()=>{if(document.visibilityState==="visible")void read();};
  void read();window.addEventListener("focus",focus);window.addEventListener("member-purchase-fulfilment-changed",focus);
  return()=>{stopped=true;controller?.abort();if(timer)clearTimeout(timer);window.removeEventListener("focus",focus);window.removeEventListener("member-purchase-fulfilment-changed",focus);};
 },[registry,enabled,refresh,expectedLineCount]);
 return {feed,reload};
}
/** Put this inside an existing booked card; it does not change the card's click target. */
export function MemberPurchaseFulfilmentStatus({feed,orderId,lineId}:{feed:MemberFeed<MemberPurchaseFulfilmentRead>|undefined;orderId:string;lineId:string}){
 if(!feed||feed.kind==="loading")return <span role="status">Checking TEST preparation…</span>;
 if(feed.kind!=="ready")return <span role="status">TEST preparation status is unavailable.</span>;
 const task=feed.data.tasks.find(t=>t.orderId===orderId&&t.lineId===lineId);
 if(!task)return <span role="status">TEST preparation is not verified yet.</span>;
 return <span title={`${task.assigneeName}. This is a TEST workflow; no real-world delivery has been confirmed.`}>
  <span>{memberPurchaseFulfilmentLabel[task.status]}</span>
  <span> · {task.assigneeName}</span>
 </span>;
}
