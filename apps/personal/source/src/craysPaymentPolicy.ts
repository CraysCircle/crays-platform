import type {ProductWorld,Wallet} from './productModel';
export const officialUSDMethods=['Stripe','Apple Pay'] as const;
export function craysBeneficiary(w:ProductWorld,recipient:string,sourceId:string){const name=recipient.trim().toLocaleLowerCase();return ['crays','crays ag','crays matching'].includes(name)||w.objects.some(o=>o.id===sourceId&&o.owner===w.owner&&o.kind==='crays-plan-review');}
export function requireCraysUSD(w:ProductWorld,recipient:string,sourceId:string,wallet:Pick<Wallet,'asset'|'network'>,method?:string){
 if(!craysBeneficiary(w,recipient,sourceId))return;
 if(wallet.asset!=='USD'||wallet.network!=='Stripe · USD')throw Error('Payments to CRAYS AG use official USD checkout only. Choose Stripe or eligible Apple Pay; crypto wallets cannot pay CRAYS AG.');
 if(method!==undefined&&!officialUSDMethods.includes(method as typeof officialUSDMethods[number]))throw Error('Choose Stripe or eligible Apple Pay for this official USD checkout.');
}
