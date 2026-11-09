import type {ActionContext,ProductWorld} from './productModel.ts';
export function walletDraftContextKey(owner:string,walletId:string,featureId:string,context:Partial<ActionContext>,purpose:string){
 if(!owner||!walletId||!featureId)throw Error('Choose the exact account and task before opening its draft.');
 return `wallet:v2:${JSON.stringify([owner,walletId,featureId,purpose,context.sourceId||'',context.postId||'',context.offerId||'',context.offerVersion||'',context.objectId||'',...(context.renewalOf?['renewal',context.renewalOf]:[])])}`;
}
export function walletDraftDefaults(w:ProductWorld,walletId:string,context:Partial<ActionContext>,purpose:string){
 const wallet=w.wallets.find(v=>v.id===walletId);if(!wallet)throw Error('This exact account is unavailable.');
 return {walletId,recipient:context.recipient||context.personId||'',amount:context.amount||'',purpose,approved:'No',feeConfirmed:'No',fee:'',outcome:'Pending',read:wallet.connected?(wallet.read?'Yes':'No'):'Yes',transfer:wallet.connected&&wallet.transfer?'Yes':'No',budget:wallet.connected&&wallet.budget?'Yes':'No',proof:wallet.proof==='valid'?'Valid':wallet.proof==='invalid'?'Invalid':'Missing'};
}
