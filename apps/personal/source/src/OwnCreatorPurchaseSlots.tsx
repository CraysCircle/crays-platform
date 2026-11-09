'use client';
import {useState,useSyncExternalStore,type ReactNode} from 'react';
import {ArrowRight,CaretLeft,FileText,LockKey} from '@phosphor-icons/react';
import type {OwnPurchaseController,OwnPurchaseClientSnapshot} from './commerce/own-purchase-controller.mjs';
import type {OwnPurchaseView,createOwnPurchasePresentation} from './commerce/own-purchase-presentation.mjs';
import type {OwnPurchaseOriginalCommand,OwnPurchaseFormat} from './commerce/own-purchase-read-contract.mjs';
import type {OwnedRouteTarget} from './commerce/owned-route-target.mjs';
import './own-creator-purchase-slots.css';

type Presentation=ReturnType<typeof createOwnPurchasePresentation>;
type CurrentGuard=Readonly<{isCurrent:()=>boolean}>;
type Common={onOriginal?:(selector:OwnPurchaseOriginalCommand)=>void;controller:OwnPurchaseController;presentation:Presentation;onRoute:(target:OwnedRouteTarget,guard:CurrentGuard)=>void|Promise<void>;onSpot:(spotId:string,guard:CurrentGuard)=>void|Promise<void>};
type View='all'|'library'|'needs-review';
const headings:Record<View,string>={all:'Creator purchases',library:'Purchased content & rights','needs-review':'Creator purchases to review'};

function States({view}:{view:OwnPurchaseView}){
 return <dl className="own-purchase-states"><div><dt>Payment</dt><dd>{view.paymentLabel}</dd></div><div><dt>Licence</dt><dd>{view.rightsLabel}</dd></div><div><dt>Content</dt><dd>{view.accessLabel}</dd></div></dl>;
}
function useOwnPurchase({controller,presentation}:Common){
 const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
 const [failure,setFailure]=useState<OwnPurchaseClientSnapshot|null>(null);
 const run=(view:OwnPurchaseView,action:(guard:CurrentGuard)=>void|Promise<void>)=>{
  const guard={isCurrent:()=>controller.isCurrent(snapshot)&&presentation.isCurrent(view)};
  if(!guard.isCurrent())return;
  try{Promise.resolve(action(guard)).catch(()=>{if(guard.isCurrent())setFailure(snapshot);});}
  catch{if(guard.isCurrent())setFailure(snapshot);}
 };
 return {snapshot,run,failed:failure===snapshot};
}

/** Existing Commerce/Library slot only. Host owns service lifetime, existing
 * search/view command and canonical route admission; no fetch on mount. */
export function OwnCreatorPurchaseList(props:Common&{view:View;query:string;format?:OwnPurchaseFormat;renderAdmittedPreview?:(view:OwnPurchaseView)=>ReactNode}){
 const {controller,presentation,view,query,format='all',renderAdmittedPreview,onRoute,onSpot}=props;
 const {snapshot,run,failed}=useOwnPurchase(props);
 if(['withheld','disposed'].includes(snapshot.phase))return null;
 const matches=snapshot.selection?.command.view===view&&snapshot.selection.command.query===query&&snapshot.selection.command.format===format;
 const current=controller.isCurrent(snapshot);
 const loading=matches&&['loading','loading-more'].includes(snapshot.phase);
 const rows=matches&&current?presentation.rows(snapshot):[];
 const start=()=>{if(!controller.isCurrent(snapshot))return;void controller.start({view,query,format,limit:30}).catch(()=>{/* Controller exposes its safe error state. */});};
 return <section className="own-purchase-slot" aria-label={headings[view]} aria-busy={loading}>
  <header className="web-commerce-section-heading"><h2>{headings[view]}</h2>{matches&&snapshot.page&&<span>{rows.length} of {snapshot.page.visibleCount}</span>}</header>
  <p className="web-commerce-muted">Demo purchases. Payment, licence and content availability are separate.</p>
  {(!matches||snapshot.phase==='idle')&&<button className="web-commerce-history" onClick={start}>Load Creator purchases<ArrowRight size={17}/></button>}
  {matches&&snapshot.phase==='loading'&&<p role="status">Loading your Creator purchases…</p>}
  {snapshot.phase==='error'&&<p role="alert">Your Creator purchases could not be loaded. <button className="own-purchase-text-action" onClick={start}>Try again</button></p>}
  {rows.map(row=><article className="web-commerce-card own-purchase-row" key={row.key} data-own-purchase={row.key}>
   <div className="own-purchase-preview">{presentation.isCurrent(row)&&renderAdmittedPreview?.(row)||<span className="own-purchase-locked"><LockKey size={26} aria-hidden="true"/><small>Content not delivered</small></span>}</div>
   <div className="own-purchase-copy"><small>{row.simulationLabel} · {row.formatLabel} · {row.priceLabel}</small><h3>{row.title}</h3>
    <p><button className="own-purchase-text-action" onClick={()=>run(row,g=>onRoute(row.creator.target,g))}>{row.creator.name}</button><span>·</span><button className="own-purchase-text-action" onClick={()=>run(row,g=>onSpot(row.spot.id,g))}>{row.spot.name}</button></p>
    <States view={row}/>{row.refundLabel&&<p>{row.refundLabel}</p>}
   </div>
   <button onClick={()=>run(row,()=>props.onOriginal?props.onOriginal(row.originalSelector):controller.openOriginal(row.originalSelector))} aria-label={'Review purchase: '+row.title}>Review original<ArrowRight size={17}/></button>
  </article>)}
  {matches&&snapshot.phase==='loaded'&&!rows.length&&<p role="status">No Creator purchases match this view.</p>}
  {matches&&snapshot.page?.hasMore&&<button className="web-commerce-history" disabled={loading} onClick={()=>{if(!controller.isCurrent(snapshot))return;void controller.loadMore().catch(()=>{/* Controller exposes its safe error state. */});}}>{loading?'Loading more…':'Load more Creator purchases'}<ArrowRight size={17}/></button>}
  {failed&&<p role="status">This original could not be opened. Your purchase has not changed.</p>}
 </section>;
}

/** Render in the existing original/detail area, not a new overlay or shop. */
export function OwnCreatorPurchaseOriginal(props:Common&{onClose:()=>void}){
 const {controller,presentation,onRoute,onSpot,onClose}=props;
 const {snapshot,run,failed}=useOwnPurchase(props);
 if(!controller.isCurrent(snapshot)||['withheld','disposed'].includes(snapshot.phase)||snapshot.detail.phase==='idle'&&snapshot.phase!=='error')return null;
 const row=presentation.selected(snapshot);
 const kind=snapshot.detail.selector?.kind;
 const label=kind==='receipt'?'Purchase receipt':kind==='licence'?'Content licence':'Creator purchase';
 return <section className="own-purchase-slot own-purchase-original" aria-label={label} aria-busy={snapshot.detail.phase==='loading'}>
  <button className="own-purchase-text-action" onClick={()=>{if(!controller.isCurrent(snapshot))return;controller.closeOriginal();onClose();}}><CaretLeft size={18}/>Back to your purchases</button>
  <h2>{label}</h2>
  {snapshot.phase==='error'&&<p role="alert">Your original could not be loaded. Return to your purchases to try again.</p>}
  {snapshot.detail.phase==='loading'&&<p role="status">Loading your original…</p>}
  {snapshot.detail.phase==='unavailable'&&<p role="status">This original is unavailable in your current account.</p>}
  {row&&<><small>{row.simulationLabel}</small><h3>{row.title}</h3><p>{row.formatLabel} · {row.priceLabel}</p>
   <p><button className="own-purchase-text-action" onClick={()=>run(row,g=>onRoute(row.creator.target,g))}>{row.creator.name}</button><span> · </span><button className="own-purchase-text-action" onClick={()=>run(row,g=>onSpot(row.spot.id,g))}>{row.spot.name}</button></p>
   <States view={row}/>{row.refundLabel&&<p>{row.refundLabel}</p>}
   {row.reconcileSameAttempt&&<p className="web-commerce-muted">The demo payment outcome needs review. Keep the same payment attempt; no new charge is started here.</p>}
   <p className="web-commerce-muted">{row.commissionLabel}. {row.externalFeesLabel}. This demo record is not a tax invoice or proof of an actual payment or RGB licence.</p>
   <div className="own-purchase-original-links">
    <button className="web-commerce-history" onClick={()=>run(row,g=>onRoute(row.previewTarget,g))}>Open public preview<ArrowRight size={17}/></button>
    {kind!=='receipt'&&<button className="web-commerce-history" onClick={()=>run(row,()=>props.onOriginal?props.onOriginal(row.receiptSelector):controller.openOriginal(row.receiptSelector))}><FileText size={18}/>Review receipt</button>}
    {row.rightsSelector&&kind!=='licence'&&<button className="web-commerce-history" onClick={()=>run(row,()=>props.onOriginal?props.onOriginal(row.rightsSelector!):controller.openOriginal(row.rightsSelector!))}><LockKey size={18}/>Review licence</button>}
   </div>
  </>}
  {failed&&<p role="status">This original could not be opened. Your purchase has not changed.</p>}
 </section>;
}
