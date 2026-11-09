/** Digest only; Welcome plaintext stays in the protected SDK/network closure. */
export async function welcomeContextDigest({welcomeRumor:rumor,recipient,author}){
 if(!rumor||rumor.kind!==444||rumor.pubkey!==author||!/^[a-f0-9]{64}$/.test(author)||!/^[a-f0-9]{64}$/.test(recipient?.pubkey)||!/^[a-f0-9]{64}$/.test(recipient?.keyPackageEventId)||typeof rumor.content!=='string'||!rumor.content||rumor.content.length>131072||!Array.isArray(rumor.tags))throw Error('Exact trusted Welcome context required');
 const refs=rumor.tags.filter(tag=>tag[0]==='e'),routes=rumor.tags.filter(tag=>tag[0]==='relays');
 if(refs.length!==1||refs[0].length!==2||refs[0][1]!==recipient.keyPackageEventId||routes.length!==1||routes[0].length<2||routes[0].length>17||new Set(routes[0].slice(1)).size!==routes[0].length-1||!routes[0].slice(1).every(url=>typeof url==='string'&&url.length<=1024))throw Error('Exact Welcome package and relay scope required');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([author,recipient.pubkey,recipient.keyPackageEventId,rumor.content,routes[0].slice(1)])));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
