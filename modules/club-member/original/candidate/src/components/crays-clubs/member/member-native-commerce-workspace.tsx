"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowRight,ShoppingBag,CheckCircle2} from "lucide-react";
import type {MemberExperienceRead} from "../../../lib/clubs/member-experience-contract";
import {MemberSaveExperiencePlanButton} from "./member-save-experience-plan-button";
import {MemberCommerceUpdateError,readMemberDemoCommerce,type MemberDemoCommerce} from "../../../lib/clubs/member-demo-commerce-client";
import shared from "./clubs-member-home.module.css";
import {commerceFeedsChanged,pendingCommerceFinanceIds,MEMBER_COMMERCE_REFRESH_EVENT,MEMBER_FINANCE_POLL_INTERVAL,MEMBER_FINANCE_POLL_MAX_MS} from "./member-commerce-refresh-policy";
import type {MemberWorkspace} from "./clubs-member-home-model";
import {MemberNativeCartPresentation} from "./member-native-cart-presentation";
import {memberCheckoutConfirmation,type OriginalCheckoutCartSnapshot} from "../../../lib/clubs/member-checkout-confirmation";
import offerStyles from "./member-commerce-offer.module.css";
import {memberCommerceCommandSchema} from "../../../lib/clubs/member-demo-commerce-command-contract";
import {reconcilePendingMemberCommerceStatus} from "../../../lib/clubs/member-demo-commerce-command-status";
import {restoreContextPending,saveContextPending,clearContextPending,withMemberCartLock,assertContextIntent,retainContextReceipt,type ContextPendingMemberCommerce} from "../../../lib/clubs/member-demo-commerce-pending-storage";

const MEMBER_CART_REFRESH_EVENT="crays-member-cart-updated";
type Offer=MemberExperienceRead["catalog"][number];
const money=(minor:number,locale:string)=>minor===0?"Free":new Intl.NumberFormat(locale,{style:"currency",currency:"USD"}).format(minor/100);
function useCommerce(expectedAccountId?:string|null){
 const expectedAccount=useRef(expectedAccountId);expectedAccount.current=expectedAccountId;
 const [data,setData]=useState<MemberDemoCommerce|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState<string|null>(null),[uncertain,setUncertain]=useState(false);
 const ownRefreshSource=useRef(Symbol("member-commerce-view")),pending=useRef(false),refreshing=useRef(false),revision=useRef(0),mounted=useRef(true),current=useRef<MemberDemoCommerce|null>(null),blocked=useRef(false);
 const lastReceipt=useRef<MemberDemoCommerce["commandReceipt"]|null>(null),checkoutSnapshot=useRef<OriginalCheckoutCartSnapshot|null>(null);
 function accept(value:MemberDemoCommerce,ticket:number){
  if(!mounted.current||ticket!==revision.current||expectedAccount.current!==undefined&&expectedAccount.current!==value.accountId)return;
  const changed=commerceFeedsChanged(current.current,value);current.current=value;setData(value);setLoading(false);setUncertain(blocked.current);
  setNotice(blocked.current?"We’re checking your saved cart update. No booking will be repeated.":null);
  if(changed)window.dispatchEvent(new CustomEvent(MEMBER_COMMERCE_REFRESH_EVENT,{detail:{accountId:value.accountId,source:ownRefreshSource.current}}));
 }
 function resetDisplay(){current.current=null;lastReceipt.current=null;checkoutSnapshot.current=null;if(mounted.current){setData(null);setLoading(true);}}
 /** History is read only for exact receipt recovery. It is never replayed and
  * missing history does not override the original Core prepared/unknown guard. */
 async function readLocked(account:string,ticket:number,initial?:MemberDemoCommerce){
  const isCurrent=()=>mounted.current&&ticket===revision.current&&(!current.current||current.current.accountId===account)&&(expectedAccount.current===undefined||expectedAccount.current===account);
  let value=initial??await readMemberDemoCommerce();if(value.accountId!==account||!isCurrent())throw new MemberCommerceUpdateError("unknown","FORBIDDEN");
  blocked.current=value.cart?.state==="reconciliation_required";
  for(let n=0;n<16;n++){
   const saved=restoreContextPending(account,window.localStorage);if(saved===null)break;
   value=await readMemberDemoCommerce(undefined,saved.intent.command);
   if(value.accountId!==account||!isCurrent())throw new MemberCommerceUpdateError("unknown","FORBIDDEN");
   assertContextIntent(account,window.localStorage,saved);
   const outcome=reconcilePendingMemberCommerceStatus(saved.intent,value.commandStatus,value);
   if(outcome.clearPending){if(outcome.state==="applied"&&saved.intent.command.action!=="checkout"){lastReceipt.current=null;checkoutSnapshot.current=null;}if(outcome.receipt)retainContextReceipt(account,window.localStorage,saved,outcome.receipt);clearContextPending(account,window.localStorage,saved.intent.command.idempotencyKey,saved);lastReceipt.current=outcome.receipt?.action==="checkout"&&outcome.receipt.state==="applied"?outcome.receipt:lastReceipt.current;checkoutSnapshot.current=outcome.checkoutSnapshot??checkoutSnapshot.current;}
   else{
    const status=value.commandStatus;
    if(status?.found&&status.state==="prepared")blocked.current=true;
    break;
   }
  }
  const latest=restoreContextPending(account,window.localStorage,true);
  if(!lastReceipt.current&&latest?.intent.command.action==="checkout"&&value.cart===null){
   const readback=await readMemberDemoCommerce(undefined,latest.intent.command);if(readback.accountId!==account||!isCurrent())throw new MemberCommerceUpdateError("unknown","FORBIDDEN");assertContextIntent(account,window.localStorage,latest);
   const outcome=reconcilePendingMemberCommerceStatus(latest.intent,readback.commandStatus,readback);
   if(outcome.clearPending&&outcome.receipt?.state==="applied"){lastReceipt.current=outcome.receipt;checkoutSnapshot.current=outcome.checkoutSnapshot;value=readback;}
  }
  blocked.current=blocked.current||value.cart?.state==="reconciliation_required";return value;
 }
 /** One exact status read after a lost command response. This never dispatches
  * another command and never infers success from local history or an empty cart. */
 async function recoverDispatchedIntent(saved:ContextPendingMemberCommerce,ticket:number){
  const account=saved.intent.accountId;
  const isCurrent=()=>mounted.current&&ticket===revision.current&&current.current?.accountId===account&&(expectedAccount.current===undefined||expectedAccount.current===account);
  return withMemberCartLock(account,async()=>{
   if(!isCurrent())return false;
   assertContextIntent(account,window.localStorage,saved);
   const value=await readMemberDemoCommerce(undefined,saved.intent.command);
   if(!isCurrent())return false;
   if(value.accountId!==account)throw new MemberCommerceUpdateError("unknown","FORBIDDEN");
   assertContextIntent(account,window.localStorage,saved);
   const outcome=reconcilePendingMemberCommerceStatus(saved.intent,value.commandStatus,value);
   if(!outcome.clearPending)return false;
   if(outcome.receipt)retainContextReceipt(account,window.localStorage,saved,outcome.receipt);
   clearContextPending(account,window.localStorage,saved.intent.command.idempotencyKey,saved);
   lastReceipt.current=outcome.receipt?.action==="checkout"&&outcome.receipt.state==="applied"?outcome.receipt:null;
   checkoutSnapshot.current=outcome.checkoutSnapshot;
   blocked.current=value.cart?.state==="reconciliation_required";
   accept(value,ticket);
   if(outcome.state==="rejected")setNotice("This change was not saved. Review your cart before continuing.");
   return true;
  });
 }
 async function readCurrentSnapshot(ticket:number){
  const first=await readMemberDemoCommerce();
  if(!mounted.current||ticket!==revision.current)throw Error("COMMERCE_VIEW_CHANGED");
  if(current.current&&current.current.accountId!==first.accountId)resetDisplay();
  return withMemberCartLock(first.accountId,()=>readLocked(first.accountId,ticket,first));
 }
 async function reload(){
  if(pending.current||refreshing.current)return;refreshing.current=true;setBusy(true);const ticket=++revision.current;
  try{accept(await readCurrentSnapshot(ticket),ticket);}catch{if(mounted.current&&ticket===revision.current){resetDisplay();blocked.current=true;setUncertain(true);setLoading(false);setNotice("We couldn’t load your cart. Please refresh to check its saved status.");}}
  finally{refreshing.current=false;if(mounted.current)setBusy(false);}
 }
 useEffect(()=>{mounted.current=true;resetDisplay();const ticket=++revision.current;void readCurrentSnapshot(ticket).then(value=>accept(value,ticket)).catch(()=>{if(mounted.current&&ticket===revision.current){resetDisplay();blocked.current=true;setUncertain(true);setLoading(false);setNotice("We couldn’t load your cart. Please refresh to check its saved status.");}});return()=>{mounted.current=false;revision.current++;};},[expectedAccountId]);
 useEffect(()=>{
  const refresh=(event:Event)=>{const detail=(event as CustomEvent<{accountId?:string;source?:symbol}>).detail;if(detail?.accountId===current.current?.accountId&&detail.source!==ownRefreshSource.current)void reload();};
  window.addEventListener(MEMBER_CART_REFRESH_EVENT,refresh);window.addEventListener(MEMBER_COMMERCE_REFRESH_EVENT,refresh);
  return()=>{window.removeEventListener(MEMBER_CART_REFRESH_EVENT,refresh);window.removeEventListener(MEMBER_COMMERCE_REFRESH_EVENT,refresh);};
 },[]);
 const pendingFinance=pendingCommerceFinanceIds(data).join("|");
 useEffect(()=>{
  if(!pendingFinance)return;let active=true,timer:ReturnType<typeof setTimeout>|undefined;const deadline=Date.now()+MEMBER_FINANCE_POLL_MAX_MS;
  const poll=async()=>{if(!active||Date.now()>=deadline)return;await reload();if(active)timer=setTimeout(()=>void poll(),MEMBER_FINANCE_POLL_INTERVAL);};
  timer=setTimeout(()=>void poll(),MEMBER_FINANCE_POLL_INTERVAL);return()=>{active=false;if(timer!==undefined)clearTimeout(timer);};
 },[pendingFinance]);
 async function run(command:Record<string,unknown>){
  if(pending.current||refreshing.current||uncertain&&command.action!=="restart")return;
  const accountId=current.current?.accountId,before=current.current?.cart;if(!accountId)return;
  pending.current=true;lastReceipt.current=null;checkoutSnapshot.current=null;setBusy(true);setNotice(null);const ticket=++revision.current,key=`mctx1.${Date.now()}.${crypto.randomUUID()}`;let dispatched=false,retained=false,dispatchedIntent:ContextPendingMemberCommerce|null=null;
  try{
   await withMemberCartLock(accountId,async()=>{
    const fresh=await readLocked(accountId,ticket);
    const guardedRestart=command.action==="restart"&&fresh.cart?.state==="reconciliation_required"&&fresh.cart.canStartFreshCart&&fresh.cart.unknownCommandId===command.commandId;
    if(blocked.current&&!guardedRestart||!mounted.current||ticket!==revision.current||current.current?.accountId!==accountId)throw Error("COMMERCE_PENDING_REVIEW_REQUIRED");
    if(JSON.stringify(fresh.cart)!==JSON.stringify(before??null))throw new MemberCommerceUpdateError("rejected","COMMERCE_COMMAND_REJECTED","CONFLICT");
    const body=memberCommerceCommandSchema.parse({...command,contractVersion:"1.0.0",idempotencyKey:key});
    if(body.expectedVersion!==(fresh.cart?.version??0))throw new MemberCommerceUpdateError("rejected","COMMERCE_COMMAND_REJECTED","CONFLICT");
    const authorized=await readMemberDemoCommerce(undefined,body);
    if(authorized.accountId!==accountId)throw new MemberCommerceUpdateError("unknown","FORBIDDEN");
    if(JSON.stringify(authorized.cart)!==JSON.stringify(fresh.cart)||authorized.commandStatus?.found!==false)throw new MemberCommerceUpdateError("rejected","COMMERCE_COMMAND_REJECTED","CONFLICT");
    retained=true;const saved=saveContextPending(accountId,window.localStorage,body,authorized.cartContext.token);
    if(!mounted.current||ticket!==revision.current)throw Error("COMMERCE_PENDING_REFERENCE_CHANGED");
    assertContextIntent(accountId,window.localStorage,saved);
    dispatched=true;dispatchedIntent=saved;
    try{
     const result=await readMemberDemoCommerce({...body,cartContextToken:saved.cartContextToken}),receipt=result.commandReceipt;
     if(result.accountId!==accountId||!receipt)throw new MemberCommerceUpdateError("unknown","MISSING_RECEIPT");
     retainContextReceipt(accountId,window.localStorage,saved,receipt);
     if(receipt.state!=="unknown")clearContextPending(accountId,window.localStorage,key,saved);
     if(!mounted.current||ticket!==revision.current||current.current?.accountId!==accountId)return;
     blocked.current=receipt.state==="unknown";
     if(receipt.state==="applied"&&body.action==="checkout"&&before&&"totalWithTax" in before.order&&receipt.orderId&&receipt.orderCode){
      lastReceipt.current=receipt;checkoutSnapshot.current={commandId:receipt.commandId,idempotencyKey:key,accountId,cartId:before.cartId,cartVersion:before.version,expectedVersion:body.expectedVersion,orderId:receipt.orderId,orderCode:receipt.orderCode,currency:"USD",totalMinor:before.order.totalWithTax,expectedTotalMinor:body.expectedTotalMinor,lines:before.lines.map(line=>({...line}))};
     }
     accept(result,ticket);if(receipt.state==="rejected")setNotice("This change was not saved. Review your cart before continuing.");
    }catch(error){
     if(error instanceof MemberCommerceUpdateError&&error.outcome==="rejected"){clearContextPending(accountId,window.localStorage,key,saved);retained=false;}
     throw error;
    }
   });
  }catch(error){
   if(!mounted.current||ticket!==revision.current)return;
   const identityLost=error instanceof MemberCommerceUpdateError&&["IDENTITY_BINDING_REQUIRED","FORBIDDEN"].includes(error.code);
   if(identityLost){resetDisplay();setLoading(false);}
   else if(dispatched&&retained&&dispatchedIntent){
    blocked.current=true;setUncertain(true);setNotice("We’re checking your saved cart update. No booking will be repeated.");
    try{if(await recoverDispatchedIntent(dispatchedIntent,ticket))return;}
    catch(readError){if(readError instanceof MemberCommerceUpdateError&&["IDENTITY_BINDING_REQUIRED","FORBIDDEN"].includes(readError.code)){resetDisplay();setLoading(false);}}
    if(!mounted.current||ticket!==revision.current)return;
   }
   blocked.current=retained||error instanceof MemberCommerceUpdateError&&error.code==="COMMERCE_OTHER_UPDATE_PENDING";setUncertain(blocked.current);
   setNotice(error instanceof MemberCommerceUpdateError&&error.code==="COMMERCE_OTHER_UPDATE_PENDING"?"An earlier cart update is still being checked. Refresh its saved status before another change.":retained?"That update has not been confirmed. Refresh to check its saved status; we will not repeat a booking.":error instanceof MemberCommerceUpdateError&&error.reasonCode==="CONFLICT"?"Your cart changed. Refresh and review the latest dates, quantities and total before continuing.":dispatched?"This change was not saved. Please check your cart and try again.":"We couldn’t check your saved cart. Refresh before making another change.");
  }finally{pending.current=false;if(mounted.current)setBusy(false);if(dispatched)window.dispatchEvent(new CustomEvent(MEMBER_CART_REFRESH_EVENT,{detail:{accountId,source:ownRefreshSource.current}}));}
 }
 const visible=expectedAccountId===undefined||data?.accountId===expectedAccountId;
 return {data:visible?data:null,busy,loading,notice,reload,run,uncertain,lastReceipt:visible?lastReceipt.current:null,checkoutSnapshot:visible?checkoutSnapshot.current:null};
}
export function MemberNativeCommerceOfferPanel({offer,locale,onCart,mode="experience",savedPlan,accountId}:{accountId?:string;offer:Offer;locale:string;onCart:()=>void;mode?:"experience"|"service";savedPlan?:MemberExperienceRead["plans"][number]}){
 const commerce=useCommerce(accountId),[slotId,setSlotId]=useState(offer.slots.find(slot=>slot.capacity!==0)?.slotId??""),[quantity,setQuantity]=useState(1);
 const inCart=commerce.data?.cart?.lines.find(line=>line.offerId===offer.offerId),slot=offer.slots.find(value=>value.slotId===slotId);
 const quarantined=commerce.uncertain||commerce.data?.cart?.state==="reconciliation_required";
 const valid=offer.sellable&&offer.currency==="USD"&&slot&&slot.capacity!==null&&slot.capacity>=quantity&&quantity>=1&&quantity<=100&&Number.isInteger(quantity);
 const formatDate=(date:string)=>new Intl.DateTimeFormat(locale,{dateStyle:"long",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
 useEffect(()=>{setSlotId(offer.slots.find(slot=>slot.capacity!==0)?.slotId??"");setQuantity(1);},[offer.offerId]);
 return <section className={offerStyles.panel}><h2>Make it part of your stay.</h2><p className={offerStyles.price}>{money(offer.unitPriceMinor,locale)}</p>
 <label className={offerStyles.field}>Choose your date<select value={inCart?.slotId??slotId} onChange={event=>setSlotId(event.target.value)} disabled={commerce.busy||quarantined||Boolean(inCart)}>{!slotId?<option value="">No available dates</option>:null}{offer.slots.map(date=><option value={date.slotId} disabled={date.capacity===0} key={date.slotId}>{formatDate(date.date)}{date.capacity===0?" · Fully booked":""}</option>)}</select></label>
 <label className={offerStyles.field}>{mode==="service"?"Quantity":"Guests"}<input type="number" inputMode="numeric" min={1} max={Math.min(100,slot?.capacity??0)} value={inCart?.quantity??quantity} disabled={commerce.busy||quarantined||Boolean(inCart)} onChange={event=>setQuantity(Number(event.target.value))}/></label>
 <div className={offerStyles.total}><span>Total</span><strong>{inCart?money(inCart.unitPriceMinor*inCart.quantity,locale):valid?money(offer.unitPriceMinor*quantity,locale):"Choose an available date and quantity"}</strong></div>
 {inCart&&!quarantined?<div className={offerStyles.added} role="status">{inCart.imageAssetId?<img src={inCart.imageAssetId} alt={inCart.title} width={56} height={56}/>:<ShoppingBag size={32} aria-hidden/>}<div><strong><CheckCircle2 size={16} aria-hidden/>In your cart</strong><p>{inCart.title}</p><p>{formatDate(inCart.date)} · {inCart.quantity} {inCart.quantity===1?"unit":"units"}</p></div></div>:null}
 <div className={offerStyles.actions}>{!inCart?<button className={shared.primaryAction} type="button" disabled={!commerce.data||!valid||commerce.busy||quarantined} onClick={()=>{if(slot)void commerce.run({action:"add",expectedVersion:commerce.data?.cart?.version??0,offerId:offer.offerId,offerVersion:offer.offerVersion,priceRevisionSha256:offer.priceRevisionSha256,slotId:slot.slotId,slotVersion:slot.version,slotSha256:slot.sourceSha256,quantity});}}><ShoppingBag size={18} aria-hidden/>{commerce.busy?"Adding to your cart…":"Add to cart"}</button>:null}<button type="button" className={inCart&&!quarantined?shared.primaryAction:offerStyles.cartButton} onClick={onCart}><ShoppingBag size={18} aria-hidden/>View cart <ArrowRight size={18} aria-hidden/></button></div>
 {commerce.notice?<p role="status" className={offerStyles.notice}>{commerce.notice}</p>:null}{mode==="experience"?<MemberSaveExperiencePlanButton offer={offer} selectedSlotId={slotId} savedPlan={savedPlan}/>:null}<p className={offerStyles.notice}>TEST booking · USD. No real money is charged. Adding to your cart does not confirm a booking.</p></section>;
}

export function MemberNativeCommerceCartWorkspace({locale,onExperiences,financeFeed,accountId,onPayments}:{locale:string;onExperiences:()=>void;financeFeed?:MemberWorkspace["finance"];accountId?:string|null;onPayments:(orderId:string)=>void}){
 const commerce=useCommerce(accountId),[reviewedVersion,setReviewedVersion]=useState<number|null>(null);
 const confirmation=memberCheckoutConfirmation(commerce.lastReceipt??null,commerce.data,financeFeed?.kind==="ready"?financeFeed.data:null,accountId??"",commerce.checkoutSnapshot);
 return <MemberNativeCartPresentation commerce={commerce} locale={locale} onExperiences={onExperiences} reviewedVersion={reviewedVersion} onReviewedVersionChange={setReviewedVersion} checkoutConfirmation={confirmation} onPayments={onPayments}/>;
}
