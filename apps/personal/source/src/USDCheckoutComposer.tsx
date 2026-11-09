import {useState} from 'react';
import {PaymentPriceReview} from './PaymentPriceReview';
import {buildUSDCheckoutQuote,requireUSDCheckoutQuote,type USDCheckoutBinding,type USDCheckoutQuote,checkoutUSD,usdMinor} from './usdCheckout';
import {usePreviewExpiry} from './usePreviewExpiry';
export function USDCheckoutComposer({binding,title,recipient,draft,set,onPrepare}:{binding:USDCheckoutBinding;title:string;recipient:string;draft:Record<string,string>;set:(k:string,v:string)=>void;onPrepare:(data:Record<string,string>)=>void}){
 const [error,setError]=useState('');let quote:USDCheckoutQuote|undefined,quoteIssue='';
 try{if(draft.usdQuote)quote=requireUSDCheckoutQuote(JSON.parse(draft.usdQuote),binding,Date.now());}catch(e){quoteIssue=e instanceof Error?e.message:'Review the original quote.';}
 usePreviewExpiry(quote?.expiresAt||Number.NaN);
 const edit=(key:string,value:string)=>{set(key,value);set('usdQuote','');set('approved','No');set('feeConfirmed','No');setError('');};
 const load=()=>{try{const q=buildUSDCheckoutQuote(binding,draft.providerFee||'');set('usdQuote',JSON.stringify(q));set('approved','No');set('feeConfirmed','No');setError('');}catch(e){setError(e instanceof Error?e.message:'Review this example quote.');}};
 let price='Choose your USD amount';try{price=checkoutUSD(usdMinor(binding.usdAmount)*10000);}catch{}
 return <section className="usd-checkout-composer" aria-label="USD checkout">
 {binding.purpose==='Zap'&&<label className="product-field"><span>Your Props · USD</span><input aria-label="Your Props · USD" type="number" inputMode="decimal" step="0.01" min="0.01" value={draft.usdAmount||''} onChange={e=>edit('usdAmount',e.target.value)}/></label>}
 <PaymentPriceReview title={title} recipient={recipient} quote={quote} amountLabel={price}/>
 <label className="product-field"><span>{binding.asset==='USD'?'Merchant provider cost · USD':`Example provider fee · ${binding.asset}`}</span><input aria-label={`Example provider fee · ${binding.asset}`} type="number" min="0" step={binding.asset==='sats'?'1':binding.asset==='BTC'?'0.00000001':binding.asset==='USD'?'0.01':'0.000001'} inputMode="decimal" value={draft.providerFee||''} onChange={e=>edit('providerFee',e.target.value)}/></label>
 <p className="context-note">Choose the payment route above. Load an explicit design example to review its USD price, fees and payment amount. No live exchange rate or funds are connected. CRAYS fees use official USD settlement; recipient merchant processing costs are not added to the guest bill.</p>
 <button className="secondary" onClick={load}>Load illustrative USD quote</button>
 {(error||quoteIssue)&&<p className="notice" role="alert">{error||quoteIssue}</p>}
 <button className="primary" disabled={!quote} onClick={()=>{if(quote)onPrepare({amount:quote.principal,fee:quote.fee,usdAmount:binding.usdAmount,usdQuote:JSON.stringify(quote),recipient:binding.recipient,purpose:binding.purpose,network:binding.network});}}>Prepare payment for review</button>
 <p className="source-caption">Preparing does not send money. Approval and outcome are separate; {binding.purpose==='Award vote'?'Props payment confirmation and voting proof remain separate.':binding.purpose==='Content purchase'?'Payment confirmation, content rights and media availability are separate.':'This historical payment route grants no content or Props.'}</p>
 </section>;
}
