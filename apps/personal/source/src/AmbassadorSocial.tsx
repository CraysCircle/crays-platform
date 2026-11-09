import {Handshake,CaretRight,Receipt} from '@phosphor-icons/react';
import type {ProductWorld} from './productModel';
import {partnerPublicBadges,ownPartnerStatements} from './ambassadorJourney';
import {usePreviewExpiry} from './usePreviewExpiry';
import './ambassadors.css';
export function AmbassadorMark({world,personId,onOpen}:{world:ProductWorld;personId:string;onOpen:(id:string)=>void}){
 usePreviewExpiry(Math.min(...partnerPublicBadges(world,personId).map(b=>b.expiresAt)));
 return <>{partnerPublicBadges(world,personId).map(b=><button type="button" className="ambassador-inline-badge" key={b.id} aria-label={`About ${b.name} at ${b.spaceName}`} onClick={e=>{e.stopPropagation();onOpen(b.id);}}><Handshake size={13}/>{b.name}</button>)}</>;
}
export function AmbassadorFinancialDiscovery({world,onStatement,walletId}:{world:ProductWorld;onStatement:(id:string)=>void;walletId?:string}){
 const statements=ownPartnerStatements(world);if(!statements.length)return null;
 return <section className="ambassador-financial-discovery" aria-label="Own Ambassador statements"><h2>Your partner statements</h2><p className="ambassador-caption">Own commission documents, separate from personal purchases.{walletId?' No payout has been associated with or credited to this wallet.':''}</p>{statements.map(s=><button type="button" className="ambassador-row" key={s.id} onClick={()=>onStatement(s.id)}><Receipt size={24}/><span><strong>{s.spaceName} · {s.period}</strong><small>Original source pending · no released USD amount</small></span><CaretRight size={18}/></button>)}</section>;
}
