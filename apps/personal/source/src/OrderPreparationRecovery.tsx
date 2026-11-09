import {useState} from 'react';
import {WarningCircle,ArrowClockwise} from '@phosphor-icons/react';
import type {ActionContext,ActionResult,ProductWorld} from './productModel';
import {ownPickupOrder} from './orderPickupPreview';
import {localPreviewId} from './localPreviewId';
import {preparationRecoveryRecord,preparationRecoverySource,preparationRecoveryReasons,type PreparationRecoveryReason} from './orderPreparationRecovery';
import './order-preparation-recovery.css';
const reasons:Record<PreparationRecoveryReason,string>={delayed:'Preparation delayed',offline:'Status source offline','kds-lost':'Preparation display unavailable'};
export function OrderPreparationRecovery({world,orderId,run}:{world:ProductWorld;orderId:string;run:(op:string,data:Record<string,string>,ctx:ActionContext)=>ActionResult}){
 const [message,setMessage]=useState(''),[error,setError]=useState(false),o=ownPickupOrder(world,orderId);
 if(!o)return null;const record=preparationRecoveryRecord(o),unresolved=record?.observations.find(x=>x.state!=='recovered');
 let current:ReturnType<typeof preparationRecoverySource>|undefined,held='';try{current=preparationRecoverySource(world,orderId);}catch(e){held=e instanceof Error?e.message:String(e);}
 if(!current&&!o.preparationRecovery)return null;
 const action=(op:'observe'|'check',data:Record<string,string>)=>{if(!current)return;const r=run(`order.preparation.example.${op}`,{approved:'Yes',scenario:'explicit-local-example',actionKey:localPreviewId(),paymentId:current.payment.id,expectedRevision:String(record?.revision||0),expectedPickupRevision:String(current.pickup.revision),...data},{featureId:'AL-298',objectId:o.id,venueId:String(o.venueId),...(typeof o.sourceTaskId==='string'?{sourceTaskId:o.sourceTaskId}:{})});setMessage(r.message);setError(!r.ok);};
 return <section className="order-preparation-recovery" aria-label="Preparation status recovery"><div className="preparation-recovery-heading"><WarningCircle size={25}/><h2>{unresolved?'Checking preparation status.':'If preparation needs a check.'}</h2></div>
  <p>Explicit fictional source observations on this same paid pickup order. A delay or lost status display does not prove the kitchen stopped or that another preparation is needed.</p>
  {held&&<p role="status">{held} The retained observation history stays here; no new action is permitted.</p>}
  {unresolved&&<><h3>{reasons[unresolved.reason]}</h3><p>{unresolved.state==='unknown'?'The source outcome is still unknown.':'The observation is unresolved.'} Normal preparation updates and collection need this original check first.</p><details><summary>Original observation reference</summary><p>{unresolved.id} · version {unresolved.version}</p></details>{current&&<><button className="secondary" onClick={()=>action('check',{observationId:unresolved.id,observationVersion:String(unresolved.version),outcome:'unknown'})}>Example: source still unknown<ArrowClockwise size={18}/></button><button className="secondary" onClick={()=>action('check',{observationId:unresolved.id,observationVersion:String(unresolved.version),outcome:'recovered'})}>Example: original source recovered</button></>}</>}
  {!unresolved&&current&&<details><summary>Explore a fictional source problem</summary>{preparationRecoveryReasons.map(reason=><button className="secondary" key={reason} onClick={()=>action('observe',{reason})}>Example: {reasons[reason].toLowerCase()}</button>)}</details>}
  <p className="source-caption">Recovery records an observation only. It never restarts a preparation ticket, marks an order ready, sends a new order, pays again or changes collection.</p>
  <button className="secondary" disabled>Contact seller support · policy not configured</button><p className="source-caption">No support request can be submitted here until this seller supplies the authorised support route.</p>
  {record&&<details><summary>Same-order observation history</summary>{record.observations.map(observation=><article key={observation.id}><h3>{reasons[observation.reason]} · {observation.state}</h3>{observation.history.map(h=><p key={h.version}>v{h.version} · {h.state} · {new Date(h.at).toLocaleString('en-GB')}</p>)}</article>)}</details>}
  {Boolean(o.preparationRecovery)&&!record&&<p role="alert">This original observation needs source review. Preparation remains held.</p>}
  {message&&<p role={error?'alert':'status'}>{message}</p>}
 </section>;
}
