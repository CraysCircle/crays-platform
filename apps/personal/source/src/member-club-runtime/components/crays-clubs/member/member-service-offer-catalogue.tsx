"use client";
import {useState,type ReactNode} from "react";
import type {MemberServiceOffersRead} from "../../../lib/clubs/member-service-offers-contract";
import type {MemberPurchaseFulfilmentRead} from "../../../lib/clubs/member-purchase-fulfilment-contract";
import type {MemberFinanceRead} from "../../../lib/clubs/member-finance-contract";
import type {MemberFeed} from "./clubs-member-home-model";
import {MemberExperienceReadWorkspace} from "./member-experience-read-workspace";
import {MemberPurchasedOfferOrders} from "./member-purchased-offer-orders";
import styles from "./member-experiences-workspace.module.css";

export function MemberServiceOfferCatalogue({feed,financeFeed,fulfilmentFeed,requestSlot,initialRequestSelected=false,locale,onMessages}:{feed:MemberFeed<MemberServiceOffersRead>|undefined;financeFeed?:MemberFeed<MemberFinanceRead>;fulfilmentFeed?:MemberFeed<MemberPurchaseFulfilmentRead>;requestSlot?:ReactNode;initialRequestSelected?:boolean;locale:string;onMessages:()=>void}){
 const [selected,setSelected]=useState<string|null>(null),[category,setCategory]=useState("All");
 const [section,setSection]=useState<"discover"|"purchased"|"requests">(initialRequestSelected?"requests":"discover");

 return <section aria-label="Your services">{!selected?<div className={styles.toolbar}><div className={styles.categories} role="group" aria-label="Service sections"><button type="button" aria-pressed={section==="discover"} onClick={()=>setSection("discover")}>Discover</button><button type="button" aria-pressed={section==="purchased"} onClick={()=>setSection("purchased")}>Your services</button><button type="button" aria-pressed={section==="requests"} onClick={()=>setSection("requests")}>Your requests</button></div></div>:null}{section==="discover"?(feed?.kind==="ready"?<MemberExperienceReadWorkspace data={feed.data} mode="service" locale={locale} selected={selected} category={category} onCategory={setCategory} onOpen={setSelected} onMessages={onMessages}/>:<p role="status">{feed?.kind==="loading"?"Finding a few good things for your stay…":"We can’t pull up your service offers just yet. Open Your services to check your recorded purchases."}</p>):section==="purchased"?<MemberPurchasedOfferOrders feed={financeFeed} fulfilmentFeed={fulfilmentFeed} catalog={feed?.kind==="ready"?feed.data.catalog:[]} mode="service" locale={locale}/>:requestSlot??<section className={styles.panel}><h2>Your requests</h2><p>Your stay requests will appear here.</p></section>}</section>;
}
