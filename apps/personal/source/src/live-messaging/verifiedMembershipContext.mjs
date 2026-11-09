/** Original parent invitation context is distinct from MLS metadata/relay access.
 * Never infer a Circle/VIF/Spot identity from the selected relay alone. */
export function verifiedMembershipContext({groupId,pubkey,context,origin,membershipId}){
 if(!/^[a-f0-9]{64}$/.test(groupId)||!/^[a-f0-9]{64}$/.test(pubkey)||!['welcome','creation'].includes(origin)||!/^[a-f0-9]{64}$/.test(membershipId)||!['spot','circle'].includes(context?.kind))throw Error('Explicit verified membership context required');
 const conversationId=context.kind==='circle'?'circle:'+groupId:context.conversationId;
 if(typeof conversationId!=='string'||!conversationId||conversationId.length>200||(context.kind==='circle'&&context.conversationId&&context.conversationId!==conversationId))throw Error('Exact original conversation required');
 return Object.freeze({groupId,pubkey,kind:context.kind,conversationId,origin,membershipId});
}
export function readVerifiedMembershipContext(row,{groupId,pubkey}){
 const bound=verifiedMembershipContext({groupId,pubkey,context:row,origin:row?.origin,membershipId:row?.membershipId});
 if(row?.groupId!==groupId||row?.pubkey!==pubkey||row?.conversationId!==bound.conversationId)throw Error('Persisted conversation membership mismatch');return bound;
}
