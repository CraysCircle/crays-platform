import type {ProductWorld} from './productModel';
import {awardWalletId,awardVotes,awardQualifiedVotes,awardCampaigns,canManageAward,type AwardVote} from './awardPreview';
/** Read-only projection of original Award records: never mint a balance or a second payment. */
export function awardWalletVotes(world:ProductWorld,walletId?:string):AwardVote[]{
 return awardVotes(world).filter(v=>!walletId||walletId==='rgb'||awardWalletId(v)===walletId).slice().sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
}
export function awardWalletStatus(v:AwardVote,world:ProductWorld){
 const payment=v.status==='confirmed-demo'?'Payment confirmed · preview':v.status==='refunded-demo'?'Refund recorded · preview':v.status==='unknown'?'Payment outcome unknown':v.status==='failed'?'Payment failed · preview':'Payment prepared';
 const counted=awardQualifiedVotes(world).some(row=>row.id===v.id);
 const proof=v.status==='refunded-demo'?'Voting proof no longer counts':v.proof==='problem'?'Voting proof needs review':v.status==='confirmed-demo'&&v.proof==='verified-preview'?(counted?`${v.quantity} votes counted · preview`:'Voting evidence needs review'):'Voting proof not verified';
 return{payment,proof,payout:v.status==='confirmed-demo'?(counted?'Allocation recorded · payout not connected':'Allocation held · voting evidence needs review'):v.status==='refunded-demo'?'Allocation reversed · preview':'No settled allocation'};
}
export function awardWalletEarnings(world:ProductWorld){
 const own=new Set(awardCampaigns(world).filter(c=>canManageAward(world,c)).map(c=>c.id));
 return awardQualifiedVotes(world).filter(v=>own.has(v.campaignId));
}
