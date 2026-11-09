/** A founder has no Welcome rumor. Derive a separate origin only after the real
 * SDK created an active solo group for this creator; never label it a Welcome. */
export async function founderMembership(group,pubkey){
 if(!group||!/^[a-f0-9]{64}$/.test(group.idStr)||!/^[a-f0-9]{64}$/.test(pubkey)||group.status!=='active'||group.closedSignal?.aborted||group.snapshot.members.length!==1||group.snapshot.members[0]!==pubkey||group.snapshot.groupData?.adminPubkeys.length!==1||group.snapshot.groupData.adminPubkeys[0]!==pubkey)throw Error('Actual SDK founder membership required');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['crays-actual-creation-v1',group.idStr,pubkey])));
 if(group.closedSignal?.aborted||!group.snapshot.members.includes(pubkey))throw Error('Founder membership changed');
 return Object.freeze({origin:'creation',membershipId:Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')});
}
