import {CalendarBlank,CaretRight,Clock} from '@phosphor-icons/react';
import {useState} from 'react';
import {Carousel} from './mobile';
import type {ProductWorld} from './productModel';
import {guestVenueCatalogue} from './venueCatalogue';
import './space-booking-discovery.css';
export function SpaceBookableOffers({world,venueId,compact=false,desktop=false,asset,onOffer}:{world:ProductWorld;venueId:string;compact?:boolean;desktop?:boolean;asset:(s:string)=>string;onOffer:(id:string)=>void}){
 const [category,setCategory]=useState('All');const venue=world.venues.find(v=>v.id===venueId);const items=(guestVenueCatalogue(world,venueId)||[]).filter(i=>i.kind==='service');if(!items.length)return null;
 items.sort((a,b)=>Number(!!b.stay)-Number(!!a.stay));
 const categories=['All',...new Set(items.map(i=>i.category))],selected=categories.includes(category)?category:'All',visible=items.filter(i=>selected==='All'||i.category===selected);
 const cards=(compact?visible.slice(0,3):visible).map(item=><button className="space-bookable-card" key={item.id} aria-label={`View service ${item.name}`} onClick={()=>onOffer(item.id)}><img src={asset(item.image||venue?.image||'lifestyle-club-07.jpg')} alt={`Illustrative ${item.category.toLowerCase()} experience`}/><span className="space-bookable-card-copy"><small>{item.category} · {venue?.name}</small><strong>{item.name}</strong><span><Clock size={15}/>{item.serviceDuration||'Confirm duration'}</span><b>{item.variants[0]?.currency==='USD'?`${item.variants[0].spacePrice} USD`:'USD quote required'} <small>/ {item.unit}</small></b><span className="space-bookable-card-action">Choose options<CaretRight size={17}/></span></span></button>);
 return <section className={"space-bookable-offers"+(desktop?" web-spot-offers-desktop":"")} aria-label="Spot services and experiences"><div className="space-offer-heading"><div><p>MAKE IT PART OF YOUR DAY</p><h2>Services & experiences.</h2></div><CalendarBlank size={26}/></div>{!compact&&<label className="space-offer-category"><span>Find your kind of moment</span><select aria-label="Service and experience category" value={selected} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>}
 {desktop?<div className="web-spot-offers-grid">{cards}</div>:<Carousel ariaLabel="Bookable Spot offers" className="space-offer-rail" contentClassName="space-offer-rail-content">{cards}</Carousel>}
 <p className="space-offer-caption">{items.some(i=>i.sourceAuthority==='fictional-preview')?'Illustrative preview offers and prices. ':''}Your date, final total and booking are confirmed separately by this Spot.</p></section>;
}
