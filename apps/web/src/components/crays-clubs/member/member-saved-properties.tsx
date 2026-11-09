"use client";
import Link from "next/link";
import Image from "next/image";
import {ArrowRight,RefreshCw} from "lucide-react";
import {memberProperty,type MemberWorkspace} from "./clubs-member-home-model";
import styles from "./member-saved-properties.module.css";
import shared from "./clubs-member-home.module.css";
export function MemberSavedProperties({feed,locale,onRefresh}:{feed:MemberWorkspace["savedProperties"];locale:string;onRefresh:()=>void}){
 if(!feed||feed.kind!=="ready")return <section className={styles.panel}><h2>Your saved stays</h2><p>{feed?.kind==="loading"?"Loading your saved stays…":"We can’t pull up your saved stays just yet."}</p><button type="button" className={shared.smallAction} onClick={onRefresh}>Give it another go <RefreshCw size={17} aria-hidden/></button></section>;
 return <section className={styles.panel}><h2>Your saved stays</h2>{feed.data.savedPropertyIds.length?<div className={styles.grid}>{feed.data.savedPropertyIds.map(id=>{const property=memberProperty(id);return property?<article key={id} className={styles.card}><Image src={property.image} alt={property.title} width={1280} height={800}/><div><h3>{property.title}</h3><p>A place to keep in mind for your next chapter.</p><Link href={`/${locale}/${property.href}`} className={shared.textAction}>Explore this stay <ArrowRight size={18} aria-hidden/></Link></div></article>:<article key={id} className={styles.card}><div><h3>A saved CRAYS property</h3><p>Its property details aren’t connected yet.</p></div></article>;})}</div>:<p>Found a place you love? Your saved stays will appear here.</p>}</section>;
}
