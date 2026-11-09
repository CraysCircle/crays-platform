import {useState} from 'react';
import {CalendarCheck,Receipt,ShieldCheck,ArrowRight,Clock} from '@phosphor-icons/react';
import {MobileScroll,useKeyboard} from './mobile';
import {usePreviewExpiry} from './usePreviewExpiry';
import type {ActionContext,ActionResult,ProductWorld} from './productModel';
import {creatorRenewalPayments,creatorRenewalReview} from './creatorRenewalReview';
import './creator-renewal.css';
import {CreatorPriceContext} from './CreatorPromotionPrice';

export type CreatorRenewalWorkspaceProps={
  world:ProductWorld;
  accessId:string;
  run:(op:string,data:Record<string,string>,context:ActionContext)=>ActionResult;
  onPayment:(context:ActionContext)=>void;
  onReceipt:(paymentId:string)=>void;
  onBack:()=>void;
};
const date=(value:number)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(value)+' · UTC';
export function CreatorRenewalWorkspace({world,accessId,run,onPayment,onReceipt,onBack}:CreatorRenewalWorkspaceProps){
  const keyboard=useKeyboard();
  const [approvedFor,setApprovedFor]=useState(''),[message,setMessage]=useState('');
  let review:ReturnType<typeof creatorRenewalReview>|undefined,error='';
  try{review=creatorRenewalReview(world,accessId);}catch(e){error=e instanceof Error?e.message:'Review your original membership first.';}
  const accessRows=world.identity.signedIn?world.objects.filter(o=>o.id===accessId&&o.owner===world.owner&&o.kind==='subscription'):[];
  const access=accessRows.length===1&&world.objects.filter(o=>o.id===accessId).length===1?accessRows[0]:undefined;
  const end=access?Number(access.endsAt||Date.parse(String(access.ends||''))):NaN;
  const attempts=creatorRenewalPayments(world,accessId);
  const openAttempts=attempts.filter(p=>['prepared','approved','submitted','pending','unknown'].includes(p.status)||p.status==='confirmed'&&!world.objects.some(o=>o.owner===world.owner&&o.kind==='entitlement-payment'&&o.paymentId===p.id&&o.entitlementId===accessId));
  const pending=openAttempts.length===1?openAttempts[0]:undefined;
  const expiry=review?.offer.expires?Date.parse(String(review.offer.expires)):NaN;
  usePreviewExpiry(expiry);usePreviewExpiry(end);usePreviewExpiry(review?.pricing.nextChangeAt||NaN);
  const sellerId=String(access?.sellerId||''),seller=world.people.find(p=>p.id===sellerId)?.name||world.profiles[sellerId]?.name||'Creator';
  const approved=!!review&&approvedFor===review.snapshot;
  const navigate=(fn:()=>void)=>{keyboard.hide();fn();};
  const pay=()=>{
    if(!review||!approved)return;
    try{
      const current=creatorRenewalReview(world,accessId);
      if(current.snapshot!==approvedFor)throw Error('These terms changed. Review the current renewal before continuing.');
      const result=run('creator.purchase.review',{version:String(current.offer.version)},current.context);
      setApprovedFor('');setMessage(result.message);
      if(result.ok){
        const reviewed=creatorRenewalReview(result.world,accessId);
        if(reviewed.snapshot!==current.snapshot){setMessage('The membership changed. Review its current terms again.');return;}
        navigate(()=>onPayment(reviewed.context));
      }
    }catch(e){setApprovedFor('');setMessage(e instanceof Error?e.message:'Review the current original.');}
  };
  const apply=()=>{
    if(!pending||pending.status!=='confirmed'||!review)return;
    const result=run('complete.subscription.apply',{paymentId:pending.id},review.context);
    setApprovedFor('');setMessage(result.message);
  };
  return <MobileScroll><main className="detail-content creator-renewal">
    <p className="eyebrow">YOUR CONTENT MEMBERSHIP</p><h1>A little more from {seller}.</h1>
    {!access?<section className="creator-renewal-state"><ShieldCheck size={28}/><h2>Your membership stays private.</h2><p>{error||'This original is unavailable. No other membership or payment was selected.'}</p></section>:<>
      <section className="creator-renewal-current"><CalendarCheck size={27}/><div><small>{Number.isFinite(end)&&end<=Date.now()?'PREVIOUS ACCESS PERIOD':'YOUR CURRENT ACCESS'}</small><h2>{String(access.name||'Content membership')}</h2><p>{Number.isFinite(end)?`Until ${date(end)}`:'Original expiry needs review'}</p></div></section>
      <p>Renew this creator’s defined content membership. Single purchases, lifetime rights, personal chats and Spot memberships remain separate.</p>
      {openAttempts.length>1?<section className="creator-renewal-state" role="alert"><h2>Check the existing payments first.</h2><p>More than one unresolved original needs review. No new payment was prepared.</p></section>:pending?<section className="creator-renewal-state"><Clock size={27}/><h2>{pending.status==='confirmed'?'Your renewal payment is confirmed.':'Your renewal is already being checked.'}</h2><p>{pending.status==='confirmed'?'Apply this same settled payment to its original membership once. It does not create a new subscription.':'Keep this original attempt. An unknown or pending outcome does not extend access or authorise another charge.'}</p><p className="creator-renewal-status">{pending.amount} {pending.asset} · {pending.status}</p><button className="secondary" onClick={()=>navigate(()=>onReceipt(pending.id))}><Receipt size={20}/>Open original payment</button>{pending.status==='confirmed'&&review&&<button className="primary" onClick={apply}>Apply confirmed renewal<ArrowRight size={18}/></button>}</section>:review?<section className="creator-renewal-offer" aria-label="Current renewal terms"><small>REVIEWED SEPARATELY · NO AUTOMATIC RENEWAL</small><h2>{String(review.offer.name)}</h2><div className="creator-renewal-price"><strong>{review.pricing.price} USD</strong><span>for {String(review.offer.term)}</span></div><dl><div><dt>Creator</dt><dd>{seller}</dd></div><div><dt>Access begins</dt><dd>{end>Date.now()?`After the current period ends · ${date(end)}`:'When the confirmed renewal is applied'}</dd></div><div><dt>New period</dt><dd>{String(review.offer.term)} from that start</dd></div><div><dt>Offer version</dt><dd>{String(review.offer.version)}</dd></div></dl><CreatorPriceContext pricing={review.pricing}/><h3>What you are renewing</h3><p className="creator-renewal-terms">{String(review.offer.conditions)}</p><p>The displayed amount is the current offer, reviewed independently of your previous purchase. Payment method and any exact fees are reviewed next. Your expiry changes only after the matching confirmed payment is applied.</p><label className="creator-renewal-approval"><input type="checkbox" checked={approved} onChange={e=>setApprovedFor(e.target.checked?review.snapshot:'')}/><span>I reviewed this creator, price, period and access terms.</span></label><button className="primary" disabled={!approved} onClick={pay}>Continue to payment review<ArrowRight size={19}/></button></section>:<section className="creator-renewal-state" role="status"><h2>Renewal needs its original terms.</h2><p>{error}</p></section>}
      {access.latestPaymentId&&world.payments.filter(p=>p.id===access.latestPaymentId&&p.owner===world.owner).length===1&&<button className="creator-renewal-link" onClick={()=>navigate(()=>onReceipt(String(access.latestPaymentId)))}><Receipt size={21}/><span>Last applied payment</span><ArrowRight size={18}/></button>}
      {!!attempts.length&&<details className="creator-renewal-history"><summary>Renewal payment history</summary>{attempts.map(p=><button className="creator-renewal-link" key={p.id} onClick={()=>navigate(()=>onReceipt(p.id))}><Receipt size={20}/><span>{p.amount} {p.asset}<small>{p.status} · {p.reference||p.id}</small></span><ArrowRight size={17}/></button>)}</details>}
    </>}
    {message&&<p className="creator-renewal-message" role="status">{message}</p>}
    <p className="source-caption">Clickdummy example. No real charge or cryptographic licence is issued. Payment, access duration and media availability retain their own status.</p>
    <button className="secondary" onClick={()=>navigate(onBack)}>Back to your membership</button>
  </main></MobileScroll>;
}
