import type {ReactNode} from 'react';
import {ArrowLeft,CaretRight,FileText,Receipt} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import './web-spot-payment-records.css';

export type SpotPaymentRow={id:string;title:string;subtitle:string;kind:'payment'|'invoice';open:()=>void};
type Props={
 breadcrumbs:ReactNode;back:()=>void;available:boolean;
 venue?:{name:string;city:string;image?:string};
 rows:SpotPaymentRow[];needsReview:boolean;error?:string;
 services:ReactNode;allReceipts:ReactNode;signIn:()=>void;
};

/** Presentation only. Callers supply freshly qualified original records and actions. */
export default function WebSpotPaymentRecords({breadcrumbs,back,available,venue,rows,needsReview,error,services,allReceipts,signIn}:Props){
 const payments=rows.filter(row=>row.kind==='payment'),invoices=rows.filter(row=>row.kind==='invoice');
 return <MobileScroll><main className="web-spot-payments"><div className="web-spot-payments-layout">
  <nav className="web-spot-payments-path" aria-label="Page path">{breadcrumbs}</nav>
  <header className="web-spot-payments-heading"><h1>Payments &amp; receipts.</h1><button onClick={back}><ArrowLeft size={20}/>Back</button></header>
  <p className="web-spot-payments-intro">{available?(venue?`Your records from ${venue.name}.`:'Your original records from this Spot.'):'Your payment records stay private.'}</p>
  <section className="web-spot-payments-content" aria-label="Your Spot payment records">
   {!available?<div className="web-spot-payments-empty"><Receipt size={24} aria-hidden="true"/><h2>Sign in to your own records.</h2><p>Open the account that owns these payment records.</p><button className="web-spot-payments-signin" onClick={signIn}>Sign in</button></div>:<>
    {needsReview&&<p className="web-spot-payments-review" role="status">Some original records need review. Your records have been retained; no other payment or invoice was selected.</p>}
    {!rows.length&&!needsReview&&<div className="web-spot-payments-empty"><Receipt size={24} aria-hidden="true"/><h2>No records here yet.</h2><p>No payment records supplied for your account at this Spot yet. A scan or booking request is not a payment.</p><div className="web-spot-payments-return">{services}</div></div>}
    {[{title:'Payments',items:payments},{title:'Membership invoices',items:invoices}].filter(group=>group.items.length).map(group=><section className="web-spot-payments-group" key={group.title}><h2>{group.title}</h2>{group.items.map(row=><button className="web-spot-payment-row" key={row.kind+':'+row.id} onClick={row.open}>{row.kind==='invoice'?<FileText size={24}/>:<Receipt size={24}/>}<span><strong>{row.title}</strong><small>{row.subtitle}</small>{row.kind==='invoice'&&<small>Design example · not a tax invoice</small>}</span><CaretRight size={18}/></button>)}</section>)}
    {(rows.length>0||needsReview)&&<div className="web-spot-payments-return">{services}</div>}
   </>}
   {error&&<p className="web-spot-payments-feedback" role="alert">{error}</p>}
  </section>
  {available&&<aside className="web-spot-payments-context" aria-label="About these records"><div className="web-spot-payments-identity">{venue?.image&&<img src={venue.image} alt={`${venue.name}, illustrative Spot image`}/>}<div><h2>{venue?.name||'Original Spot'}</h2>{venue&&<p>{venue.city}</p>}</div></div><p className="web-spot-payments-explanation">Payment records and invoices are different. Open an original to review its status and available document.</p><div className="web-spot-payments-all"><Receipt size={24}/>{allReceipts}<CaretRight size={18}/></div></aside>}
 </div></main></MobileScroll>;
}
