import {lstatSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createOwnedGroupTestPeers} from './ownedGroupTestPeers.mjs';
import {createOwnedGroupDirectory} from './ownedGroupDirectory.mjs';
const root='/srv/crays/worktrees/nostr-web-01a1863a/apps/web-runtime/';
/** Uses only pinned public metadata of the already approved isolated test
 * network. This does not relabel the original pair index as group authority:
 * every group must be explicitly registered by the verified current owner.
 */
export function createOriginalHostGroupDirectory({assertRuntimeCurrent}){
 const sources=[
  [root+'.qualification/owned-test-conversations-v266/CONVERSATION_INDEX.json','179d12f151ca923423163c08505a763b1d659b98b4da764c18382d8dd7705388'],
  [root+'.qualification/nostr-relay-fleet-v3/CONFIG.json','7f589bf97181006faedbbbe6833d5888d05fd3304204cd93b4721aa4bbb455a4'],
 ];
 const version=file=>{const s=lstatSync(file,{bigint:true});if(!s.isFile()||s.isSymbolicLink()||s.size>4n*1024n*1024n)throw Error('Original group context unavailable');return[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs,s.mode,s.uid].join(':');};
 const snapshots=sources.map(([file,pin])=>{const before=version(file),raw=readFileSync(file);if(version(file)!==before||createHash('sha256').update(raw).digest('hex')!==pin)throw Error('Original group source changed');return{file,version:before,value:JSON.parse(raw)};});
 const [index,config]=snapshots.map(row=>row.value);
 if(index.groupAdmission!==false||index.productionCoreContacts!==false||index.scope!=='owned-isolated-test-network-only'||index.conversations.length!==980||config.namespace!=='crays-demo-01a1863a-v1'||config.tenants.length!==100||index.ownerPubkey!==config.ownerViewer)throw Error('Original test network required');
 const current=()=>{assertRuntimeCurrent();for(const row of snapshots)if(version(row.file)!==row.version)throw Error('Original group source changed');};
 const readersBySpot=Object.fromEntries(config.tenants.map(row=>[row.spotId,[config.ownerViewer,row.publisher,...row.readers]]));
 let peers;const directory=createOwnedGroupDirectory({file:'/home/craysdev/.local/state/crays-nostr-demo-relays-01a1863a-v1/private-groups.json',ownerAccountId:index.ownerAccountId,ownerPubkey:index.ownerPubkey,relays:index.registry,readersBySpot,contacts:index.conversations.map(row=>row.peerPubkey),assertRuntimeCurrent:current,ensureTestPeer:(pubkey,relay)=>peers.ensure(pubkey,relay)});
 peers=createOwnedGroupTestPeers({ownerPubkey:index.ownerPubkey,contacts:index.conversations,relays:index.registry,readersBySpot,vaultPath:'/home/craysdev/.local/state/crays-nostr-demo-01a1863a-v2/synthetic-keys.json',stateRoot:'/home/craysdev/.local/state/crays-nostr-messaging-01a1863a/group-test-participants-v1',readGroups:pubkey=>directory.testParticipantGroups(pubkey),assertRuntimeCurrent:current});
 return Object.freeze({...directory,close:()=>peers.close()});
}
