import {usdMinor} from './usdCheckout';
export type RampDirection='fund'|'withdraw';
export type RampBinding={owner:string;walletId:string;asset:string;network:string;direction:RampDirection;usdAccountId:string;method:'Bank transfer'|'Card'};
export type RampQuote=RampBinding&{id:string;source:'fictional-preview';grossMicros:number;providerMicros:number;ecosystemMicros:number;netMicros:number;created:number;expires:number;btcConversion?:{source:'fictional-btc-card-rate';satsPerUSD:1000;receivedSats:number;roundingMicros:number}};
export function rampQuote(binding:RampBinding,amount:string,now=Date.now()):RampQuote{
 if(!binding.owner||!binding.walletId||!binding.usdAccountId||!['fund','withdraw'].includes(binding.direction)||!['USD','USDB','USDT','BTC'].includes(binding.asset)||!binding.network||!['Bank transfer','Card'].includes(binding.method)||binding.direction==='withdraw'&&binding.method!=='Bank transfer'||binding.asset==='BTC'&&(binding.direction!=='fund'||binding.method!=='Card'||binding.network!=='Bitcoin'))throw Error('Review the exact wallet, USD account, direction and payment method.');
 if(!Number.isSafeInteger(now)||now<0)throw Error('Review the quote time.');
 const minor=usdMinor(amount),grossMicros=minor*10000,providerMicros=1000000,ecosystemMicros=minor*25,netMicros=grossMicros-providerMicros-ecosystemMicros;
 if(netMicros<=0)throw Error('The example amount must cover its separately shown fees.');
 return {owner:binding.owner,walletId:binding.walletId,asset:binding.asset,network:binding.network,direction:binding.direction,usdAccountId:binding.usdAccountId,method:binding.method,id:`ramp-example:${binding.owner}:${binding.walletId}:${now}`,source:'fictional-preview',grossMicros,providerMicros,ecosystemMicros,netMicros,created:now,expires:now+300000,...(binding.asset==='BTC'?{btcConversion:{source:'fictional-btc-card-rate' as const,satsPerUSD:1000 as const,receivedSats:Math.floor(netMicros/1000),roundingMicros:netMicros%1000}}:{})};
}
export function readRampQuote(value:string|undefined,binding:RampBinding,now?:number):RampQuote|undefined{
 try{
  const q=JSON.parse(value||'null') as RampQuote;if(!q||q.grossMicros%10000!==0)return;
  const exact=rampQuote(binding,(q.grossMicros/1000000).toFixed(2),q.created);
  if(Object.keys(q).length!==Object.keys(exact).length||Object.entries(exact).some(([k,v])=>JSON.stringify(q[k as keyof RampQuote])!==JSON.stringify(v)))return;
  if(now!==undefined&&(now<q.created||now>=q.expires))return;return q;
 }catch{return;}
}
export function walletMoney(micros:number){return `${(micros/1000000).toFixed(6).replace(/(\.\d{2})0+$/,'$1').replace(/(\.\d*?[1-9])0+$/,'$1')} USD`;}
export function rampAmounts(q:RampQuote){
 const token=(n:number)=>`${(n/1000000).toFixed(6).replace(/\.?0+$/,'')} ${q.asset}`;
 if(q.asset==='BTC')return {debit:walletMoney(q.grossMicros),credit:`${((q.btcConversion?.receivedSats||0)/100000000).toFixed(8)} BTC · ${q.btcConversion?.receivedSats||0} sats`};
 return q.direction==='fund'?{debit:walletMoney(q.grossMicros),credit:q.asset==='USD'?walletMoney(q.netMicros):token(q.netMicros)}:{debit:q.asset==='USD'?walletMoney(q.grossMicros):token(q.grossMicros),credit:walletMoney(q.netMicros)};
}
export type RampExample={quote:RampQuote;status:'pending'|'unknown'|'failed'|'confirmed'|'reversed';execution?:unknown};
export function rampHistory(raw:string|undefined,owner:string,walletId:string):RampExample[]{
 try{
  const entries=JSON.parse(raw||'[]');if(!Array.isArray(entries))return [];
  const counts=new Map<string,number>();for(const e of entries)if(e?.quote?.id)counts.set(e.quote.id,(counts.get(e.quote.id)||0)+1);
  return entries.filter((e: RampExample)=>e&&e.quote?.owner===owner&&e.quote.walletId===walletId&&counts.get(e.quote.id)===1&&['pending','unknown','failed','confirmed','reversed'].includes(e.status)&&readRampQuote(JSON.stringify(e.quote),e.quote));
 }catch{return [];}
}
