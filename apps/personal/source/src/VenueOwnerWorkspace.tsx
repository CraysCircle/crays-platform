import {MerchantPaymentTerms} from './MerchantPaymentTerms';
import {SpaceSaaSHint} from "./SpaceSaaSHint";
import {Buildings,CaretRight,Files,CalendarBlank,ShoppingBag,Users,Receipt,SlidersHorizontal,ShieldCheck} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import type {ProductWorld} from './productModel';
import {verifiedVenueOperator} from './venueAuthority';
import './space-booking-discovery.css';
type Props={world:ProductWorld;scopeId:string;asset:(s:string)=>string;page?:'overview'|'finance'|'bookings'|'orders';onSetup:()=>void;onMerchant:()=>void;onCatalogue:()=>void;onBookings:()=>void;onOrders:()=>void;onFinance:()=>void;onPublic:()=>void;onSignIn:()=>void};
export function VenueOwnerWorkspace({world,scopeId,asset,page='overview',onSetup,onMerchant,onCatalogue,onBookings,onOrders,onFinance,onPublic,onSignIn}:Props){
 const setup=world.objects.find(o=>o.id===scopeId&&o.owner===world.owner&&o.kind==='venue-setup'),config=setup?.config as {name?:string;organisation?:string;image?:string}|undefined,venueId=typeof setup?.venueId==='string'?setup.venueId:undefined,verified=!!venueId&&verifiedVenueOperator(world,venueId);
 if(!world.identity.signedIn)return <MobileScroll><main className="detail-content"><h1>Your business stays private.</h1><button className="primary" onClick={onSignIn}>Sign in to manage your Spot</button></main></MobileScroll>;
 if(!setup)return <MobileScroll><main className="detail-content"><h1>This Spot workspace is unavailable.</h1><p>Open one of your own saved setups. No management authority is granted.</p></main></MobileScroll>;
 const action=(title:string,subtitle:string,Icon:typeof Files,fn:()=>void,enabled=true)=><button className="space-bookings-entry" disabled={!enabled} onClick={fn}><Icon size={25}/><span><strong>{title}</strong><small>{subtitle}</small></span><CaretRight size={19}/></button>;
 return <MobileScroll><main className="detail-content venue-owner-workspace"><img className="booking-original-image" src={asset(config?.image||'lifestyle-pro-00.jpg')} alt="Illustrative Spot business atmosphere"/><p className="eyebrow">YOUR SPOT · YOUR BUSINESS</p><h1>{config?.name||'Your Spot'}</h1><p>{config?.organisation||'Organisation details pending'}</p><p className="status-label"><ShieldCheck size={17}/>{verified?'Verified operator · preview':'Private setup · operator review pending'}</p>
 {page==='bookings'||page==='orders'?<><h2>{page==='bookings'?'Your venue’s bookings.':'Your venue’s orders.'}</h2><p>The seller-side {page==='bookings'?'reservation':'order and fulfilment'} feed is not connected in this preview.</p><section className="award-event"><Receipt size={30}/><h3>No operator records supplied.</h3><p>Personal guest bookings and purchases are not substituted for this business’s incoming orders. Actual seller-scoped readback is required.</p></section></>:page==='finance'?<><h2>Money, matched to this Spot.</h2><MerchantPaymentTerms calculator/><p>Sales, invoices, refunds and payouts must retain this organisation and Spot. Your personal purchases are not business revenue.</p><section className="award-event"><Receipt size={30}/><h3>Your seller ledger is not connected.</h3><p>No revenue or payout balance is claimed. Verified seller orders and provider receipts are required before amounts appear here.</p></section><div className="booking-status-flow"><span><strong>Payment</strong>Provider receipt required</span><span><strong>Settlement</strong>Reconciliation required</span><span><strong>Payout</strong>Not executed</span></div><p className="booking-provider-caption">A missing seller, channel or recipient binding stops execution. A booking request or successful payment alone does not confirm settlement or payout.</p></>:<>
 <h2>Build your own offer.</h2><p>Each Spot has its own catalogue, variants, prices and sales. Start manually or bring a menu, price list or service document.</p>
 {action('Catalogue, shop & experiences','Photos, PDF, text or voice → reviewed items and your own Spot prices',Files,onCatalogue)}
 {action('Bookings & reservations',verified?'Original requests, dates and provider confirmations':'Available after operator verification',CalendarBlank,onBookings,verified)}
 {action('Orders & fulfilment',verified?'This Spot’s original orders and delivery status':'Available after operator verification',ShoppingBag,onOrders,verified)}
 {action('Accept guest payments','After your paid Spot is ready: merchant Stripe, eligible Apple Pay and optional crypto',Receipt,onMerchant,verified)}
 {action('Payments, invoices & payouts',verified?'Separate seller receipts, settlement and payout reconciliation':'Seller access requires operator verification',Receipt,onFinance,verified)}
 {action('Your team & access','Scoped staff roles; private guest rights stay separate',Users,onSetup)}
 {action('Spot details, relay & services','Organisation, hours, media and your configured services',SlidersHorizontal,onSetup)}
 {verified&&action('View your guest Spot','See the offers and prices guests can currently access',Buildings,onPublic)}
 {!verified&&<p className="context-note">You can prepare your own private catalogue now. Import, sale, guest publication and seller finances need separate verification and permission.</p>}
 </>}
 <details className="award-details"><summary>Relay Spot or large-club SaaS?</summary><h3>Relay Spot</h3><p>Your monthly subscription plus the 0.25% ecosystem transaction fee to CRAYS AG. No 5% large-software fee and no automatic full-SaaS access.</p><h3>Large-club SaaS</h3><p>Only customers with the actual large-SaaS contract pay the 5% software fee to CRAYS AG, plus the 0.25% ecosystem transaction fee.</p><p>Your verified contract determines the enabled capabilities. This explanation does not assign a plan, activate software, calculate a payout or change your subscription.</p></details>
 <SpaceSaaSHint/>
 <p className="source-caption">Spot management preview. Actual Vendure, Auth0 AI Commerce, seller accounting and payout services are not connected by this screen.</p>
 </main></MobileScroll>;
}
