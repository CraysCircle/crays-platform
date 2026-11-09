import {memberDocumentFeed} from "./member-document-feed";
import {memberConversationFeed} from "./member-conversation-feed";
import {memberProperty,type MemberView,type MemberWorkspace} from './clubs-member-home-model';
export type MemberSearchKind='stays'|'requests'|'services'|'conversations'|'documents'|'saved';
export type MemberSearchResult={key:string;kind:MemberSearchKind;id:string;title:string;reference:string|null;status:string|null;view:MemberView;target:string|null};
const fold=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en');
/** Searches only the explicit member-safe fields already returned by the owned BFF. No provider or staff payload is indexed. */
export function searchMemberWorkspace(workspace:MemberWorkspace,query:string,kind:MemberSearchKind|'all'='all'){
 const results:MemberSearchResult[]=[];const unavailable:MemberSearchKind[]=[];const loading:MemberSearchKind[]=[];const connected:MemberSearchKind[]=[];
 const state=(name:MemberSearchKind,feed:{kind:string}|undefined)=>{if(feed?.kind==='ready')connected.push(name);else if(feed?.kind==='loading')loading.push(name);else unavailable.push(name);};
 const savedFeed=workspace.savedProperties?.kind==='ready'?workspace.savedProperties:workspace.savedCart.kind==='ready'?workspace.savedCart:workspace.savedProperties??workspace.savedCart;
 const documentFeed=memberDocumentFeed(workspace);
 const conversationFeed=memberConversationFeed(workspace);
 state('stays',workspace.bookings);state('requests',workspace.requests);state('services',workspace.services);state('conversations',conversationFeed);state('documents',documentFeed);state('saved',savedFeed);
 if(workspace.bookings.kind==='ready')for(const b of workspace.bookings.data.bookings)results.push({key:`stays:${b.bookingId}`,kind:'stays',id:b.bookingId,title:memberProperty(b.propertyId)?.title??'Your CRAYS stay',reference:b.publicReference,status:b.status,view:'bookings',target:b.bookingId});
 if(workspace.requests.kind==='ready')for(const r of workspace.requests.data.requests)results.push({key:`requests:${r.bookingRequestId}`,kind:'requests',id:r.bookingRequestId,title:'Stay request',reference:r.publicReference,status:r.status,view:'requests',target:`booking:${r.bookingRequestId}`});
 if(workspace.services.kind==='ready')for(const r of workspace.services.data.services)results.push({key:`services:${r.selectionId}`,kind:'services',id:r.selectionId,title:r.displayName,reference:null,status:r.status,view:'requests',target:`services:${r.selectionId}`});
 if(conversationFeed.kind==='ready')for(const r of conversationFeed.data.supportCases)results.push({key:`conversations:${r.caseId}`,kind:'conversations',id:r.caseId,title:r.subject,reference:r.publicReference,status:r.status,view:'support',target:r.caseId});
 if(documentFeed.kind==='ready'){
  for(const r of documentFeed.data.documents)results.push({key:`documents:${r.documentId}`,kind:'documents',id:r.documentId,title:r.title,reference:null,status:null,view:'documents',target:r.documentId});
 }
 const saved=savedFeed.kind==='ready'?savedFeed.data.savedPropertyIds:[];
 for(const id of saved)results.push({key:`saved:${id}`,kind:'saved',id,title:memberProperty(id)?.title??'Saved stay',reference:null,status:null,view:'saved',target:null});
 const terms=fold(query.trim()).split(/\s+/).filter(Boolean);const unique=[...new Map(results.map(r=>[r.key,r])).values()];
 const matches=unique.filter(r=>(kind==='all'||r.kind===kind)&&terms.every(term=>fold([r.title,r.reference??'',r.status??'',r.id].join(' ')).includes(term)));
 return {results:matches.slice(0,100),total:matches.length,connected:kind==='all'?connected:connected.filter(s=>s===kind),unavailable:kind==='all'?unavailable:unavailable.filter(s=>s===kind),loading:kind==='all'?loading:loading.filter(s=>s===kind)};
}
