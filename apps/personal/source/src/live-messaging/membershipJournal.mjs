/** Isolate conversation attempts/history by an actual verified membership incarnation.
 * The caller obtains the ID from its verified SDK Welcome join or actual solo creation.
 * A mere epoch change never opens another namespace or erases unknown attempts. */
export function createMembershipJournal({journal,groupId,welcomeRumorId,membershipId=welcomeRumorId,origin='welcome',isCurrent}){
 if(!journal?.getItem||!journal?.setItem||!/^[a-f0-9]{64}$/.test(groupId)||!/^[a-f0-9]{64}$/.test(membershipId)||!['welcome','creation'].includes(origin)||typeof isCurrent!=='function')throw Error('Verified membership journal required');
 let closed=false;const prefix='membership:'+groupId+':'+membershipId+':';
 const check=key=>{if(closed||!isCurrent())throw Error('Membership journal is no longer current');if(typeof key!=='string'||!key||key.length>1024)throw Error('Bounded journal key required');return prefix+key;};
 return Object.freeze({async getItem(key){const value=await journal.getItem(check(key));check(key);return value;},async setItem(key,value){await journal.setItem(check(key),value);check(key);},close(){closed=true;}});
}
