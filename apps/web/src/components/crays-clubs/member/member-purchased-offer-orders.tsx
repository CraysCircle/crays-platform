"use client";
import {paymentOrderHash} from "./member-payment-selection";
import {memberOwnedPurchasedLines} from "./member-plans-purchase-context";
import {FileText,ArrowRight} from "lucide-react";
import Image from "next/image";
import {MemberPurchaseFulfilmentStatus} from "./member-purchase-fulfilment-progress";
import type {MemberPurchaseFulfilmentRead} from "@/lib/clubs/member-purchase-fulfilment-contract";
import type {MemberFinanceRead} from "@/lib/clubs/member-finance-contract";
import {memberDate,type MemberFeed} from "./clubs-member-home-model";
import type {MemberExperienceRead} from "@/lib/clubs/member-experience-contract";
import shared from "./clubs-member-home.module.css";
import styles from "./member-experiences-workspace.module.css";

export function MemberPurchasedOfferOrders({feed,fulfilmentFeed,locale,mode}:{feed:MemberFeed<MemberFinanceRead>|undefined;fulfilmentFeed?:MemberFeed<MemberPurchaseFulfilmentRead>;catalog:MemberExperienceRead["catalog"];locale:string;mode:"experience"|"service"}){
 const purchaseLines=memberOwnedPurchasedLines(feed,mode);
 const lines=purchaseLines??[];
 function payments(orderId:string){history.replaceState(null,"",paymentOrderHash(orderId));window.dispatchEvent(new Event("hashchange"));}
 return <section className={styles.panel}><h2>{mode==="service"?"Your services":"My bookings"}</h2>{purchaseLines===null?<p role="status">{feed?.kind==="loading"?"Loading your recorded purchases…":"We can’t pull up your purchases just yet."}</p>:lines.length?<><p>Recorded TEST purchases with ERP invoices. No real money was charged.</p><div className={styles.discovery}>{lines.map(line=><button type="button" key={`${line.orderId}:${line.lineId}`} className={styles.experienceCard} onClick={()=>payments(line.orderId)}>{line.imageAssetId&&/^\/api\/member-demo-media\/member-demo-20261012-[0-9]{3}-[a-f0-9]{12}\.png$/.test(line.imageAssetId)?<Image src={line.imageAssetId} unoptimized alt={line.title} width={1672} height={941} sizes="(max-width:1100px) 100vw, 33vw"/>:<FileText size={38} aria-hidden/>}<span className={styles.category}>Booked · TEST</span><span className={styles.cardPrice}>{new Intl.NumberFormat(locale,{style:"currency",currency:line.currency}).format(line.grossTotalMinor/100)}</span><span className={styles.cardCopy}><strong>{line.title}</strong><span>{line.date?memberDate(line.date,locale):"Date not recorded"} · {line.quantity} {mode==="service"?"unit(s)":"guest(s)"}</span><span>Order {line.orderId} · Invoice {line.invoiceId}</span><MemberPurchaseFulfilmentStatus feed={fulfilmentFeed} orderId={line.orderId} lineId={line.lineId}/><span>View order &amp; invoice <ArrowRight size={18} aria-hidden/></span></span></button>)}</div></>:<p>{mode==="service"?"Your purchased services will appear here.":"Your purchased experiences will appear here."}</p>}</section>;
}
