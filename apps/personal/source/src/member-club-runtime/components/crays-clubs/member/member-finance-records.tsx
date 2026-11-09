"use client";
import {useMemberRoute} from "../../../integration/member-route";
import {useEffect,useSyncExternalStore} from "react";
import {MemberFinanceRequestForm} from "./member-finance-request-form";
import {paymentOrderHash,selectPaymentOrder} from "./member-payment-selection";
import {CheckCircle2,FileText,ChevronDown,Download} from "lucide-react";
import type {MemberFinanceRead} from "../../../lib/clubs/member-finance-contract";
import type {MemberFeed} from "./clubs-member-home-model";
import shared from "./clubs-member-home.module.css";
import styles from "./member-complete-workspaces.module.css";
function subscribePaymentRoute(listener:()=>void){window.addEventListener("hashchange",listener);return()=>window.removeEventListener("hashchange",listener);}
function paymentRouteSnapshot(){return window.location.hash;}
function emptyPaymentRoute(){return "";}
const paymentRowId=(orderId:string)=>`member-payment-order-${encodeURIComponent(orderId)}`;
const paymentDetailId=(orderId:string)=>`member-payment-detail-${encodeURIComponent(orderId)}`;
export function MemberFinanceRecords({feed,locale,onRefresh}:{feed:MemberFeed<MemberFinanceRead>|undefined;locale:string;onRefresh:()=>void}){
 const memberRoute=useMemberRoute();
 const route=memberRoute.hash;
 const orders=feed?.kind==="ready"?feed.data.orders:[];
 const selection=selectPaymentOrder(orders,route);
 // A bare Payments route is the collapsed list; an exact original order link opens only that row.
 const current=route==="#payments"||route===""?undefined:selection.order;
 const money=(minor:number)=>new Intl.NumberFormat(locale,{style:"currency",currency:"USD"}).format(minor/100);
 function selectOrder(orderId:string){memberRoute.navigate(current?.orderId===orderId?"#payments":paymentOrderHash(orderId));}
 useEffect(()=>{if(current)document.getElementById(paymentRowId(current.orderId))?.scrollIntoView({block:"nearest",behavior:"auto"});},[current?.orderId]);
 return <section className={styles.panel} aria-label="Experience orders and ERP finance"><h2>Your orders &amp; invoices</h2><p>TEST purchases · Stored Vendure orders and ERP finance records.</p>{feed?.kind!=="ready"?<><p role="status">{feed?.kind==="loading"?"Getting your order details…":"We couldn’t load your order details."}</p><button type="button" className={shared.smallAction} onClick={onRefresh}>Try again</button></>:!orders.length?<p>No experience or service orders yet.</p>:<>
  <ul className={styles.paymentRecords}>{orders.map(order=>{const expanded=current?.orderId===order.orderId;const buttonId=`${paymentRowId(order.orderId)}-toggle`;return <li key={order.orderId} id={paymentRowId(order.orderId)} className={styles.paymentOrderRow}>
   <button id={buttonId} type="button" aria-expanded={expanded} aria-controls={paymentDetailId(order.orderId)} onClick={()=>selectOrder(order.orderId)}><FileText size={23} aria-hidden/><span><strong>{order.title}</strong><small>Order {order.orderId} · {order.totalMinor===0?"Free · No payment needed":`${order.invoiceStatus} in TEST`}</small></span><span>{money(order.totalMinor)}</span><ChevronDown className={styles.paymentToggleIcon} size={18} aria-hidden/></button>
   <div hidden={!expanded} id={paymentDetailId(order.orderId)} className={styles.paymentOrderDetails} role="region" aria-labelledby={buttonId}>{expanded?<><h3>{order.title}</h3><p className={styles.paymentStatus}><CheckCircle2 size={18} aria-hidden/> {order.totalMinor===0?"ERP acknowledged · No payment needed":"ERP acknowledged · TEST payment allocated"}</p><dl className={`${styles.facts} ${styles.paymentFacts}`}><div><dt>Invoice</dt><dd>{order.invoiceId}</dd></div><div><dt>Total</dt><dd>{money(order.totalMinor)}</dd></div><div><dt>Outstanding</dt><dd>{money(order.outstandingMinor)}</dd></div><div><dt>ERP sales order</dt><dd>{order.salesOrderId}</dd></div><div><dt>Payment receipt</dt><dd>{order.paymentEntryId??"No payment needed"}</dd></div></dl><a className={`${shared.smallAction} ${styles.paymentInvoiceDownload}`} href={`/api/clubs/member-self/invoices/${encodeURIComponent(order.invoiceId)}`} download>Download invoice <Download size={17} aria-hidden/></a><p className={styles.paymentTestNote}>No real money moved. This is your stored TEST invoice.</p><div className={styles.paymentRequestPanel}><MemberFinanceRequestForm key={order.orderId} orderId={order.orderId} onSaved={onRefresh}/></div></>:null}</div>
  </li>;})}</ul>{selection.unavailable?<p role="status">That invoice isn’t available in your current orders. Choose an order above.</p>:null}
 </>}</section>;
}

export function MemberInvoiceDownloads({feed,locale}:{feed:MemberFeed<MemberFinanceRead>|undefined;locale:string}){
 const orders=feed?.kind==="ready"?feed.data.orders:[];if(!orders.length)return null;
 return <details className={styles.panel}><summary className={shared.textAction}>Invoices &amp; receipts ({orders.length})</summary><h2>Your invoices</h2><ul className={styles.documents}>{orders.map(o=><li key={o.invoiceId}><a className={shared.smallAction} href={`/api/clubs/member-self/invoices/${encodeURIComponent(o.invoiceId)}`} download><FileText size={22} aria-hidden/><span>{o.title} · {o.invoiceId} · {new Intl.NumberFormat(locale,{style:"currency",currency:"USD"}).format(o.totalMinor/100)}</span><Download size={18} aria-hidden/>Download invoice</a></li>)}</ul><p>TEST invoices from your ERP finance records.</p></details>;
}
