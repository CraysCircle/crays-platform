import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';

const denied=()=>Error('Current contact context unavailable');
/** Existing explicitly admitted test contacts only. Public fixture affiliations
 * provide display context, never a production contact or physical meeting grant.
 * In particular a shared Spot is NOT an invented first-meeting record.
 */
export function createOwnedTestContactContext({catalogPath,networkPath,catalogSHA256,networkSHA256}){
 const version=path=>{const s=lstatSync(path,{bigint:true});if(!s.isFile()||s.isSymbolicLink())throw denied();return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');};
 function read(path,pin){const before=version(path),bytes=readFileSync(path);if(bytes.length>8*1024*1024||createHash('sha256').update(bytes).digest('hex')!==pin||before!==version(path))throw denied();return {data:JSON.parse(bytes),before};}
 const catalog=read(catalogPath,catalogSHA256),network=read(networkPath,networkSHA256);
 if(catalog.data.schema!=='crays.visible-public-demo-catalog.v3'||catalog.data.datasetRealm!=='crays-isolated-demo'||catalog.data.actualCoreAuthority!==false||network.data.schema!=='crays.local-social-preview-network.v1'||network.data.actualCoreAuthority!==false)throw denied();
 const text=v=>typeof v==='string'&&v.length>0&&v.length<=240;
 const spots=new Map(catalog.data.spots.map(s=>{if(![s.id,s.name,s.city].every(text))throw denied();return [s.id,Object.freeze({id:s.id,name:s.name,city:s.city})];}));
 const people=new Map(catalog.data.people.map(p=>{if(!text(p.name))throw denied();return [p.id,{pubkey:p.pubkey,homeSpotId:p.homeSpotId,name:p.id==='crays-demo-01a1863a-v1-person-0001'?'Mayan Voss':p.name}];}));
 const relationships=new Map(network.data.people.map(p=>[p.id,{connectedToViewer:p.connectedToViewer,spotIds:p.relaySpotIds}]));
 return Object.freeze({
  assertCurrent(){if(version(catalogPath)!==catalog.before||version(networkPath)!==network.before)throw denied();},
  title(options){this.read(options);return people.get(options.row.peerId).name.slice(0,200);},
  read({binding,row,isCurrent,admittedSpotIds}){
   this.assertCurrent();if(isCurrent()!==true||binding.kind!=='person'||binding.conversationId!==row.conversationId||!Array.isArray(admittedSpotIds))throw denied();
   const person=people.get(row.peerId),relationship=relationships.get(row.peerId);
   if(!person||person.pubkey!==row.peerPubkey||relationship?.connectedToViewer!==true||!Array.isArray(relationship.spotIds)||relationship.spotIds.length>100||!relationship.spotIds.includes(row.spotId))throw denied();
   const permitted=new Set(admittedSpotIds),sharedSpots=[...new Set(relationship.spotIds)].filter(id=>permitted.has(id)).map(id=>{const spot=spots.get(id);if(!spot)throw denied();return spot;});
   // An original registration location is descriptive, not live attendance.
   const homeSpot=spots.get(person.homeSpotId);if(!homeSpot)throw denied();
   this.assertCurrent();if(isCurrent()!==true)throw denied();
   return Object.freeze({schema:1,accountId:binding.accountId,conversationId:binding.conversationId,peerId:row.peerId,peerPubkey:row.peerPubkey,sharedSpots:Object.freeze(sharedSpots),homeSpot,firstMeeting:null});
  },
 });
}
