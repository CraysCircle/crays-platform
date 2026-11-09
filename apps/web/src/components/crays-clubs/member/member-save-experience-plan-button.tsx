"use client";
import {useEffect,useRef,useState} from "react";
import {Bookmark,BookmarkCheck} from "lucide-react";
import type {MemberExperienceRead} from "@/lib/clubs/member-experience-contract";
import {writeMemberSavedPlan} from "@/lib/clubs/member-demo-saved-plan-client";
import shared from "./clubs-member-home.module.css";
type Offer=MemberExperienceRead["catalog"][number];type Plan=MemberExperienceRead["plans"][number];
export function MemberSaveExperiencePlanButton({offer,selectedSlotId,savedPlan}:{offer:Offer;selectedSlotId?:string;savedPlan?:Plan}){
 const [plan,setPlan]=useState<Plan|undefined>(savedPlan),[busy,setBusy]=useState(false),[notice,setNotice]=useState<string|null>(null);const pending=useRef(false),request=useRef<{fingerprint:string;key:string}|null>(null);
 useEffect(()=>{setPlan(savedPlan);},[savedPlan]);
 async function update(){if(pending.current)return;pending.current=true;setBusy(true);setNotice(null);const slot=offer.slots.find(s=>s.slotId===selectedSlotId);const command=plan?{action:"remove",offerId:offer.offerId,offerVersion:offer.offerVersion,expectedPlanVersion:plan.version}:{action:"save",offerId:offer.offerId,offerVersion:offer.offerVersion,expectedPlanVersion:0,slotId:slot?.slotId??null,slotVersion:slot?.version??null,slotSha256:slot?.sourceSha256??null};const fingerprint=JSON.stringify(command);if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,key:crypto.randomUUID()};try{const out=await writeMemberSavedPlan({...command,idempotencyKey:request.current.key});setPlan(out.plan??undefined);request.current=null;setNotice(out.plan?"Saved for later. Your plan is an idea, not a confirmed booking.":"Removed from your saved plans.");}catch{setNotice("We couldn’t confirm that change. Refresh your plans before trying again.");}finally{pending.current=false;setBusy(false);}}
 return <div><button type="button" className={shared.textAction} disabled={busy} aria-pressed={Boolean(plan)} onClick={()=>void update()}>{plan?<BookmarkCheck size={18} aria-hidden/>:<Bookmark size={18} aria-hidden/>}{busy?"Updating your plan…":plan?"Remove saved plan":"Save for later"}</button>{notice?<p role="status">{notice}</p>:null}</div>;
}
