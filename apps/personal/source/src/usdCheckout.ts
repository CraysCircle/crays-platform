/** Pure clickdummy quote calculation. It creates no account, payment or entitlement. */
export type USDCheckoutIntent='Zap'|'Content purchase'|'Award vote';
export type USDCheckoutBinding={owner:string;sourceId:string;recipient:string;purpose:USDCheckoutIntent;offerId?:string;offerVersion?:string;walletId:string;asset:string;network:string;usdAmount:string};
export type USDCheckoutQuote=Omit<USDCheckoutBinding,'usdAmount'>&{id:string;sourceAuthority:'fictional-preview';settlementPrecision?:'usd-cent';feeTreatment?:'official-usd-v1';ecosystemCollection?:'separate-usd'|'stripe-usd-split';providerFeePayer?:'payer'|'recipient';baseMinor:number;ecosystemMicros:number;roundingMicros:number;providerFee:string;principal:string;fee:string;total:string;usdTotalMicros:number;createdAt:number;expiresAt:number;rateLabel:string};
export function usdMinor(value:string){
 if(!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value))throw Error('Enter a USD amount with up to two decimal places.');
 const [whole,fraction='']=value.split('.'),n=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n<1||n>100_000_000)throw Error('Choose a positive USD amount within this preview’s limit.');return n;
}
export function checkoutUSD(micros:number){return `${(micros/1_000_000).toFixed(micros%10000===0?2:micros%100===0?4:6)} USD`;}
function nativeUnits(value:string,scale:number){
 const places=scale===1?0:scale===100?2:scale===100_000_000?8:6;
 const pattern=places?new RegExp(`^(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,${places}})?$`):/^(?:0|[1-9]\d{0,9})$/;
 if(!pattern.test(value))throw Error('Enter the example provider fee in the selected payment unit, including zero if explicitly quoted.');
 const [a,b='']=value.split('.'),n=Number(a)*scale+Number(b.padEnd(places,'0')||0);if(!Number.isSafeInteger(n))throw Error('This fee needs source review.');return n;
}
function nativeText(units:number,scale:number){return scale===1?String(units):(units/scale).toFixed(scale===100?2:scale===100_000_000?8:6).replace(/\.?0+$/,'');}
function calculateUSDCheckoutQuote(b:USDCheckoutBinding,providerFee:string,now:number,legacyUSD=false,current=false):USDCheckoutQuote{
 if(!b.owner||!b.sourceId||!b.recipient||!b.walletId||!b.network||!['Zap','Content purchase','Award vote'].includes(b.purpose)||!Number.isSafeInteger(now)||now<0)throw Error('Review the exact original, recipient and payment account.');
 if(['Content purchase','Award vote'].includes(b.purpose)&&(!b.offerId||!b.offerVersion))throw Error('Review the exact offer version first.');
 if(!['USD','USDT','USDB','BTC','sats'].includes(b.asset))throw Error('Choose Stripe/USD, USDT/Utexo, USDB/Spark, Bitcoin or Lightning for this USD review.');
 const bitcoin=b.asset==='sats'||b.asset==='BTC',baseMinor=usdMinor(b.usdAmount),baseMicros=baseMinor*10000,ecosystemMicros=baseMinor*25,scale=b.asset==='sats'?1:b.asset==='BTC'?100_000_000:b.asset==='USD'&&!legacyUSD?100:1_000_000,providerUnits=nativeUnits(providerFee,scale);
 const fiat=b.asset==='USD'&&!legacyUSD,unitMicros=bitcoin?1000:fiat?10000:1;
 const principalUnits=bitcoin?baseMinor*10:fiat?baseMinor:baseMicros;
 const separateUSD=current&&b.asset!=='USD',merchantProvider=current&&b.asset==='USD';
 const ecosystemUnits=separateUSD?0:Math.ceil(ecosystemMicros/unitMicros);
 const roundingMicros=separateUSD?0:ecosystemUnits*unitMicros-ecosystemMicros;
 const collectedProviderUnits=merchantProvider?0:providerUnits;
 const usdTotalMicros=baseMicros+(separateUSD?0:ecosystemMicros)+roundingMicros+(collectedProviderUnits*unitMicros);
 if(merchantProvider&&providerUnits>principalUnits)throw Error('The merchant provider fee exceeds this sale. Review the actual quoted costs.');
 if(fiat&&usdTotalMicros<500000)throw Error('The Stripe example total must be at least 0.50 USD. Choose another payment route or review a larger amount.');
 const binding={owner:b.owner,sourceId:b.sourceId,recipient:b.recipient,purpose:b.purpose,walletId:b.walletId,asset:b.asset,network:b.network,...(b.offerId?{offerId:b.offerId}:{}),...(b.offerVersion?{offerVersion:b.offerVersion}:{})};
 return {...binding,id:`${current?'usd-preview-v3':'usd-preview'}:${b.owner}:${b.sourceId}:${b.walletId}:${now}`,sourceAuthority:'fictional-preview',...(fiat?{settlementPrecision:'usd-cent' as const}:{}),...(current?{feeTreatment:'official-usd-v1' as const,ecosystemCollection:separateUSD?'separate-usd' as const:'stripe-usd-split' as const,providerFeePayer:merchantProvider?'recipient' as const:'payer' as const}:{}),baseMinor,ecosystemMicros,roundingMicros,providerFee:nativeText(providerUnits,scale),principal:nativeText(principalUnits,scale),fee:nativeText(ecosystemUnits+collectedProviderUnits,scale),total:nativeText(principalUnits+ecosystemUnits+collectedProviderUnits,scale),usdTotalMicros,createdAt:now,expiresAt:now+5*60_000,rateLabel:b.asset==='sats'?'Illustration only: 1 USD = 1,000 sats':b.asset==='BTC'?'Illustration only: 1 USD = 0.00001 BTC':['USDT','USDB'].includes(b.asset)?`Illustration only: 1 USD = 1 ${b.asset}`:'Stripe · USD account · no currency conversion'};
}
export function buildUSDCheckoutQuote(b:USDCheckoutBinding,providerFee:string,now=Date.now()){return calculateUSDCheckoutQuote(b,providerFee,now,false,true);}
export function requireUSDCheckoutQuote(value:unknown,b:USDCheckoutBinding,now?:number):USDCheckoutQuote{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Load and review the exact USD payment quote first.');
 const q=value as USDCheckoutQuote,legacyUSD=b.asset==='USD'&&q.settlementPrecision===undefined,expected=calculateUSDCheckoutQuote(b,q.providerFee,q.createdAt,legacyUSD,q.feeTreatment==='official-usd-v1');
 if(Object.keys(q).length!==Object.keys(expected).length||Object.entries(expected).some(([key,v])=>q[key as keyof USDCheckoutQuote]!==v))throw Error('The amount, recipient, account or quote changed. Review this original again.');
 if(now!==undefined&&q.feeTreatment!=='official-usd-v1')throw Error('This historical USD quote needs a fresh official-USD fee review before a new submission. Its original recorded amounts are retained.');
 if(now!==undefined&&(now<q.createdAt||now>=q.expiresAt))throw Error('This example quote expired. No new payment was submitted; review a fresh quote.');return q;
}
