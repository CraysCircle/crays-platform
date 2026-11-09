import {MarmotClient,deserializeApplicationData} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/index.js';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
/** Real protocol actor for the explicitly isolated existing CRAYS test people.
 * A trusted host supplies that person's existing signer and encrypted stores.
 * No owner identity, Core person, VIF edge or automatic public relay is created.
 */
export async function openOwnedGroupTestActor({pubkey,ownerPubkey,deviceSlot,signer,network,stores,relays,readGroups,signal,onApplication=async()=>{}}){
 const names=['groupStateStore','keyPackageStore','ingestStateStore','inviteStore','rewindStore','removedMarkerStore','conversationStore'];
 if(!hex(deviceSlot)||!hex(pubkey)||!hex(ownerPubkey)||pubkey===ownerPubkey||!signal?.addEventListener||typeof readGroups!=='function'||typeof onApplication!=='function'||!Array.isArray(relays)||!relays.length||relays.length>100||new Set(relays).size!==relays.length||relays.some(url=>!/^ws:\/\/127\.0\.0\.1:18990\/spots\/crays-demo-01a1863a-v1-spot-[0-9]{4}$/.test(url))||names.some(name=>!stores?.[name]?.getItem||!stores[name].setItem))throw Error('Explicit owned test actor required');
 if(await signer.getPublicKey()!==pubkey)throw Error('Existing test identity mismatch');
 const client=new MarmotClient({signer,network,clientId:deviceSlot,...Object.fromEntries(names.map(name=>[name,stores[name]]))}),groups=new Map();
 let closed=false,invites,timer,working,closing,reconnectRevision=0,connectedRevision=0,problem=false;const current=()=>!closed&&!signal.aborted;
 const allowed=async()=>{if(!current())throw Error('Test actor closed');const rows=await readGroups();if(!current()||!Array.isArray(rows)||rows.length>100)throw Error('Current registered group scope required');return rows.filter(row=>hex(row.groupId)&&hex(row.routingId)&&row.ownerPubkey===ownerPubkey&&Array.isArray(row.members)&&row.members.every(hex)&&row.members.includes(pubkey)&&row.members.includes(ownerPubkey)&&relays.includes(row.relay));};
 async function attach(group,rows){
  if(groups.has(group.idStr))return;
  const row=rows.find(row=>row.groupId===group.idStr),route=group.snapshot.groupData.nostrGroupId,routingId=typeof route==='string'?route:Array.from(route,byte=>byte.toString(16).padStart(2,'0')).join('');
  if(!row||row.routingId!==routingId||group.status!=='active'||!group.snapshot.members.includes(pubkey)||!group.snapshot.members.includes(ownerPubkey)||group.snapshot.groupData.relays.length!==1||group.snapshot.groupData.relays[0]!==row.relay){await client.groups.unload(group.id);return;}
  const received=async data=>{try{if(!current())return;const latest=await allowed();if(!latest.some(row=>row.groupId===group.idStr))return;const rumor=deserializeApplicationData(data);if(rumor&&rumor.pubkey!==pubkey)await onApplication({group,client,rumor});}catch{problem=true;}};
  group.on('applicationMessage',received);let subscription;
  try{subscription=await client.groups.connect(group.id,{signal,backfillPageSize:200});if(!current())throw Error('Test actor closed');groups.set(group.idStr,{group,subscription,received});}catch(error){group.off('applicationMessage',received);subscription?.unsubscribe();throw error;}
 }
 async function refresh(){
  if(!current())return;if(working)return working;
  working=(async()=>{const rows=await allowed();
   if(reconnectRevision!==connectedRevision){const revision=reconnectRevision;invites?.unsubscribe();invites=null;for(const value of groups.values()){value.subscription.unsubscribe();value.group.off('applicationMessage',value.received);}groups.clear();invites=await client.invites.listen(relays);if(!current()){invites.unsubscribe();throw Error('Test actor closed');}connectedRevision=revision;}
   for(const [id,value] of groups)if(!rows.some(row=>row.groupId===id)||value.group.status!=='active'||!value.group.snapshot.members.includes(pubkey)){value.subscription.unsubscribe();value.group.off('applicationMessage',value.received);groups.delete(id);await client.groups.unload(value.group.id);}
   for(const row of rows){if(groups.has(row.groupId))continue;let group;try{group=await client.groups.get(row.groupId);}catch{}if(group)await attach(group,rows);}
   const unread=await client.invites.getUnread();if(unread.length>100)throw Error('Bounded test invitation inbox required');
   for(const welcome of unread){if(!current())return;if(welcome.pubkey!==ownerPubkey||!rows.length)continue;
    const joined=await client.joinGroupFromWelcome({welcomeRumor:welcome});if(!current()){await client.groups.unload(joined.group.id);return;}await attach(joined.group,await allowed());if(groups.has(joined.group.idStr))await client.invites.markAsRead(welcome.id);
   }problem=false;
  })();try{await working;}finally{working=null;}
 }
 const schedule=()=>{if(current())void refresh().catch(()=>{problem=true;});};
 function close(){if(closing)return closing;closed=true;closing=(async()=>{clearInterval(timer);signal.removeEventListener('abort',abort);client.invites.off('decrypted',schedule);invites?.unsubscribe();for(const value of groups.values()){value.subscription.unsubscribe();value.group.off('applicationMessage',value.received);}await working?.catch(()=>{});for(const value of groups.values())await client.groups.unload(value.group.id).catch(()=>{});groups.clear();})();return closing;}
 const abort=()=>{void close();};signal.addEventListener('abort',abort,{once:true});
 try{if(!current())throw Error('Test actor closed');const advertised=await network.getUserInboxRelays(pubkey);if(!current())throw Error('Test actor closed');if(relays.some(url=>!advertised.includes(url))){const event=await signer.signEvent({kind:10050,created_at:Math.floor(Date.now()/1000),tags:relays.map(url=>['relay',url]),content:''});if(!current())throw Error('Test actor closed');const receipts=await network.publish(relays,event,{signal,beforeSend:current});if(relays.some(url=>receipts[url]?.ok!==true))throw Error('Test inbox relay advertisement not acknowledged');}await client.keyPackages.ensurePublished({relays,client:'crays-owned-isolated-test-person'});invites=await client.invites.listen(relays);client.invites.on('decrypted',schedule);await refresh();timer=setInterval(schedule,3000);timer.unref?.();return Object.freeze({client,refresh,requestReconnect(){if(current()){reconnectRevision++;problem=true;}},getSnapshot:()=>Object.freeze({available:current(),connectedGroups:groups.size,problem}),close});}catch(error){await close();throw error;}
}
