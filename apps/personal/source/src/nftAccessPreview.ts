import type {Entity,ProductWorld} from './productModel.ts';
import {verifiedVenueOperator} from './venueAuthority.ts';
import {ownMerchantCheckout} from './merchantCheckout.ts';
import {localPreviewId} from './localPreviewId.ts';

/** Planned local examples only: no blockchain registry, signature, QR bearer credential or door hardware. */
export type NftCredential=Entity&{kind:'nft-profile-credential-preview'|'nft-community-credential-preview';origin:'explicit-fictional-registry'|'explicit-fictional-spot-issuer';issuer:string;schema:string;venueId?:string;walletId:'rgb';recipient:string;assetId:string;status:'active'|'revoked';revision:number;photoSnapshot:string;profileDisplay:boolean;identityBound:boolean;transferable:boolean;resalable:boolean;supply:1|'issuer-defined';transferTerms:string;createdAt:number;liveExecution:false};
export type NftSpotGrant=Entity&{kind:'nft-spot-grant-preview';origin:'explicit-verified-operator-example';issuer:string;venueId:string;credentialId:string;recipient:string;purpose:string;startsAt:number;expiresAt:number;transferTerms:string;entryLimit:number;status:'active'|'revoked';originalPaymentId:string;paymentSnapshot:string;revision:number;createdAt:number;liveExecution:false};
export type NftAccessChallenge=Entity&{kind:'nft-access-challenge-preview';credentialId:string;grantId:string;walletId:'rgb';walletSnapshot:string;audience:string;nonce:string;credentialSnapshot:string;grantSnapshot:string;issuedAt:number;expiresAt:number;status:'issued'|'unknown'|'confirmed'|'failed';attemptId?:string;holderProofSnapshot?:string;resolvedAt?:number;liveExecution:false};
export type NftHolderProof={kind:'explicit-fictional-holder-proof';challengeId:string;holder:string;walletId:'rgb';walletSnapshot:string;nonce:string;audience:string;credentialSnapshot:string;grantSnapshot:string};
const registry='CRAYS fictional profile registry · not a deployed contract';
const serial=(x:unknown)=>JSON.stringify(x);
function need(v:unknown,message:string):asserts v{if(!v)throw Error(message);}
function signed(w:ProductWorld){need(w.identity.signedIn,'Sign in to your own account.');}
function time(now:number){need(Number.isFinite(now)&&now>=0,'Use a valid current time.');}
function exact(w:ProductWorld,id:string){const rows=w.objects.filter(o=>o.id===id);return rows.length===1?rows[0]:undefined;}
function rgbWallet(w:ProductWorld){const rows=w.wallets.filter(a=>a.id==='rgb');return rows.length===1&&rows[0].network==='Bitcoin / RGB'?rows[0]:undefined;}
function walletSnapshot(w:ProductWorld){const a=rgbWallet(w);return a?serial({id:a.id,asset:a.asset,network:a.network,custody:a.custody,contract:a.contract||'',proof:a.proof,connected:a.connected,read:a.read}):'';}
function online(w:ProductWorld){signed(w);const a=rgbWallet(w);need(w.identity.relayState==='online'&&w.identity.signer==='demo-connected'&&a?.connected&&a.read&&a.proof==='valid','Reconnect the original account and RGB wallet for a fresh holder check.');}
function photo(w:ProductWorld,owner:string){return String(w.profiles[owner]?.photo||'');}
export function nftProfileCredentialId(owner:string){return `nft-profile-example:${encodeURIComponent(owner)}`;}
function credential(w:ProductWorld,id:string):NftCredential|undefined{
 const c=exact(w,id) as NftCredential|undefined;if(!c||!['nft-profile-credential-preview','nft-community-credential-preview'].includes(c.kind)||c.liveExecution!==false||c.owner!==c.recipient||!c.owner||c.walletId!=='rgb'||!c.assetId||!Number.isSafeInteger(c.revision)||c.revision<1||!['active','revoked'].includes(c.status))return;
 if(c.kind==='nft-profile-credential-preview'){
  if(w.objects.filter(o=>o.owner===c.owner&&o.kind==='nft-profile-credential-preview').length!==1||c.schema!=='CRAYS identity-bound schema · unqualified fictional example'||c.id!==nftProfileCredentialId(c.owner)||c.assetId!==`fictional-profile-asset:${encodeURIComponent(c.owner)}`||c.origin!=='explicit-fictional-registry'||c.issuer!==registry||c.identityBound!==true||c.transferable!==false||c.resalable!==false||c.supply!==1||c.profileDisplay!==true||c.photoSnapshot!==photo(w,c.owner))return;
 }else if(c.schema!=='Spot community schema · unqualified fictional example'||c.assetId!==`fictional-community-asset:${c.id}`||c.origin!=='explicit-fictional-spot-issuer'||!c.venueId||c.supply!=='issuer-defined'||c.identityBound!==false||typeof c.transferable!=='boolean'||typeof c.resalable!=='boolean'||!c.transferTerms)return;
 return c;
}
function paymentSnapshot(w:ProductWorld,id:string,recipient:string,venueId:string){if(!id)return '';const p=ownMerchantCheckout({...w,owner:recipient},id);if(!p||p.status!=='confirmed'||p.merchantCheckout!.venueId!==venueId)return;return serial(p);}
function grant(w:ProductWorld,id:string,now:number):NftSpotGrant|undefined{
 const g=exact(w,id) as NftSpotGrant|undefined;if(!g||g.kind!=='nft-spot-grant-preview'||g.origin!=='explicit-verified-operator-example'||g.liveExecution!==false||g.owner!==g.recipient||g.status!=='active'||!g.issuer||!Number.isSafeInteger(g.entryLimit)||g.entryLimit<1||g.entryLimit>100||!g.purpose.trim()||!g.transferTerms.trim()||!Number.isFinite(g.startsAt)||!Number.isFinite(g.expiresAt)||g.startsAt>now||g.expiresAt<=now||g.expiresAt<=g.startsAt||!Number.isSafeInteger(g.revision)||g.revision<1||w.venues.filter(v=>v.id===g.venueId&&v.operatorActive).length!==1)return;
 const c=credential(w,g.credentialId);if(!c||c.status!=='active'||c.recipient!==g.recipient||c.kind==='nft-community-credential-preview'&&(c.issuer!==g.issuer||c.venueId!==g.venueId||c.transferTerms!==g.transferTerms))return;
 const issuerView={...w,owner:g.issuer};if(!verifiedVenueOperator(issuerView,g.venueId))return;
 const p=paymentSnapshot(w,g.originalPaymentId,g.recipient,g.venueId);if(p===undefined||p!==g.paymentSnapshot)return;
 return g;
}
export function createNftProfileCredential(world:ProductWorld,now=Date.now()){
 signed(world);time(now);need(rgbWallet(world)&&photo(world,world.owner),'Keep your unique RGB wallet and profile picture.');const w=structuredClone(world),id=nftProfileCredentialId(w.owner);if(w.objects.some(o=>o.id===id)){need(credential(w,id),'Existing profile credential needs review; do not mint a duplicate.');return w;}
 need(!w.objects.some(o=>o.owner===w.owner&&o.kind==='nft-profile-credential-preview'),'Keep the original unique profile credential.');
 const c:NftCredential={id,owner:w.owner,kind:'nft-profile-credential-preview',origin:'explicit-fictional-registry',issuer:registry,schema:'CRAYS identity-bound schema · unqualified fictional example',walletId:'rgb',recipient:w.owner,assetId:`fictional-profile-asset:${encodeURIComponent(w.owner)}`,status:'active',revision:1,photoSnapshot:photo(w,w.owner),profileDisplay:true,identityBound:true,transferable:false,resalable:false,supply:1,transferTerms:'User-bound CRAYS profile example. Never transferable or saleable. No Spot membership or admission grant.',createdAt:now,liveExecution:false};w.objects.push(c);return w;
}
export type NftGrantInput={recipient:string;purpose:string;startsAt:number;expiresAt:number;transferTerms:string;originalPaymentId?:string;entryLimit?:number};
function issuerChecks(w:ProductWorld,venueId:string,input:NftGrantInput,now:number){signed(w);time(now);need(w.venues.filter(v=>v.id===venueId).length===1&&verifiedVenueOperator(w,venueId),'Only the exact separately verified Spot operator may issue this grant.');need(!!w.profiles[input.recipient]&&!!input.purpose?.trim()&&input.purpose.length<=500&&!!input.transferTerms?.trim()&&input.transferTerms.length<=2000&&Number.isFinite(input.startsAt)&&Number.isFinite(input.expiresAt)&&input.expiresAt>input.startsAt&&input.expiresAt>now,'Review exact recipient, purpose, dates and issuer terms.');need(input.entryLimit===undefined||Number.isSafeInteger(input.entryLimit)&&input.entryLimit>=1&&input.entryLimit<=100,'The issuer must define a valid entry limit.');const p=paymentSnapshot(w,input.originalPaymentId||'',input.recipient,venueId);need(p!==undefined,'Review the exact original confirmed Spot payment.');return p;}
function issueGrant(w:ProductWorld,venueId:string,c:NftCredential,input:NftGrantInput,p:string,now:number){const g:NftSpotGrant={id:localPreviewId(),owner:input.recipient,kind:'nft-spot-grant-preview',origin:'explicit-verified-operator-example',issuer:w.owner,venueId,credentialId:c.id,recipient:input.recipient,purpose:input.purpose,startsAt:input.startsAt,expiresAt:input.expiresAt,transferTerms:input.transferTerms,entryLimit:input.entryLimit??1,status:'active',originalPaymentId:input.originalPaymentId||'',paymentSnapshot:p,revision:1,createdAt:now,liveExecution:false};w.objects.push(g);return w;}
export function issueNftSpotGrant(world:ProductWorld,venueId:string,credentialId:string,input:NftGrantInput,now=Date.now()){
 const p=issuerChecks(world,venueId,input,now),w=structuredClone(world),c=credential(w,credentialId);need(c&&c.status==='active'&&c.recipient===input.recipient&&c.kind==='nft-profile-credential-preview','Select this recipient’s original user-bound profile credential. The separate grant supplies Spot rights.');return issueGrant(w,venueId,c,input,p,now);
}
export function issueNftCommunityCredential(world:ProductWorld,venueId:string,input:NftGrantInput&{transferable:boolean;resalable:boolean},now=Date.now()){
 const p=issuerChecks(world,venueId,input,now);need(typeof input.transferable==='boolean'&&typeof input.resalable==='boolean','The verified issuer must define structured transfer and resale rights.');const w=structuredClone(world),id=localPreviewId(),c:NftCredential={id,owner:input.recipient,kind:'nft-community-credential-preview',origin:'explicit-fictional-spot-issuer',issuer:w.owner,schema:'Spot community schema · unqualified fictional example',venueId,walletId:'rgb',recipient:input.recipient,assetId:`fictional-community-asset:${id}`,status:'active',revision:1,photoSnapshot:photo(w,input.recipient),profileDisplay:false,identityBound:false,transferable:input.transferable,resalable:input.resalable,supply:'issuer-defined',transferTerms:input.transferTerms,createdAt:now,liveExecution:false};w.objects.push(c);return issueGrant(w,venueId,c,input,p,now);
}
export function revokeNftSpotGrant(world:ProductWorld,grantId:string,now=Date.now()){
 signed(world);time(now);const w=structuredClone(world),g=exact(w,grantId) as NftSpotGrant|undefined;need(g?.kind==='nft-spot-grant-preview'&&g.issuer===w.owner&&verifiedVenueOperator(w,g.venueId),'Only the original verified Spot issuer may revoke its grant.');if(g.status==='revoked')return w;g.status='revoked';g.revision++;g.revokedAt=now;return w;
}
function activePair(w:ProductWorld,credentialId:string,grantId:string,venueId:string,now:number){const c=credential(w,credentialId),g=grant(w,grantId,now);need(c&&c.status==='active'&&c.owner===w.owner&&g&&g.credentialId===c.id&&g.recipient===w.owner&&g.venueId===venueId,'The original held credential and a separate current exact-Spot grant are required.');return {c,g};}
function admissionCapacity(w:ProductWorld,g:NftSpotGrant,currentId=''){
 const rows=w.objects.filter(o=>o.kind==='nft-access-challenge-preview'&&o.grantId===g.id);
 for(const q of rows){need(w.objects.filter(o=>o.id===q.id).length===1&&q.owner===g.recipient&&q.credentialId===g.credentialId&&q.audience===g.venueId&&q.liveExecution===false&&['issued','unknown','confirmed','failed'].includes(String(q.status)),'Conflicting admission originals need review.');}
 const confirmed=rows.filter(q=>q.status==='confirmed');need(confirmed.length<g.entryLimit,'The original admission allowance has already been used.');
 need(!rows.some(q=>q.id!==currentId&&q.status==='unknown'),'Reconcile the original unknown admission before requesting another.');
}
export function createNftAccessChallenge(world:ProductWorld,credentialId:string,grantId:string,venueId:string,now=Date.now()){
 online(world);time(now);const w=structuredClone(world),{c,g}=activePair(w,credentialId,grantId,venueId,now);admissionCapacity(w,g);need(!w.objects.some(o=>o.kind==='nft-access-challenge-preview'&&o.owner===w.owner&&o.grantId===grantId&&(o.status==='unknown'||o.status==='issued'&&Number(o.expiresAt)>now)),'Keep the current challenge; reconcile an unknown admission instead of retrying.');
 const q:NftAccessChallenge={id:localPreviewId(),owner:w.owner,kind:'nft-access-challenge-preview',credentialId,grantId,walletId:'rgb',walletSnapshot:walletSnapshot(w),audience:venueId,nonce:`fictional-nonce:${localPreviewId()}`,credentialSnapshot:serial(c),grantSnapshot:serial(g),issuedAt:now,expiresAt:Math.min(now+120000,g.expiresAt),status:'issued',liveExecution:false};w.objects.push(q);return w;
}
function challenge(w:ProductWorld,id:string){const q=exact(w,id) as NftAccessChallenge|undefined;need(q?.kind==='nft-access-challenge-preview'&&q.owner===w.owner&&q.liveExecution===false&&q.walletId==='rgb'&&q.nonce?.startsWith('fictional-nonce:')&&Number.isFinite(q.issuedAt)&&Number.isFinite(q.expiresAt)&&q.expiresAt>q.issuedAt&&q.expiresAt<=q.issuedAt+120000,'Keep your exact original fictional challenge.');return q;}
function expectedProof(q:NftAccessChallenge):NftHolderProof{return {kind:'explicit-fictional-holder-proof',challengeId:q.id,holder:q.owner,walletId:'rgb',walletSnapshot:q.walletSnapshot,nonce:q.nonce,audience:q.audience,credentialSnapshot:q.credentialSnapshot,grantSnapshot:q.grantSnapshot};}
function fresh(w:ProductWorld,q:NftAccessChallenge,now:number){need(now>=q.issuedAt&&now<q.expiresAt,'Challenge expired or invalid; retain its history and request a fresh challenge.');const {c,g}=activePair(w,q.credentialId,q.grantId,q.audience,now);admissionCapacity(w,g,q.id);need(q.walletSnapshot===walletSnapshot(w)&&q.credentialSnapshot===serial(c)&&q.grantSnapshot===serial(g),'Credential or grant changed; this challenge is held.');}
/** For the explicitly labelled local holder-proof example button, never a real wallet signature. */
export function nftHolderProofExample(world:ProductWorld,challengeId:string){signed(world);return expectedProof(challenge(world,challengeId));}
export function confirmNftAccessChallenge(world:ProductWorld,challengeId:string,proof:NftHolderProof,personallyApproved:boolean,now=Date.now()){
 online(world);time(now);const w=structuredClone(world),q=challenge(w,challengeId);need(q.status==='issued'&&personallyApproved===true&&serial(proof)===serial(expectedProof(q)),'Personally confirm the exact fictional holder proof, audience and nonce.');fresh(w,q,now);q.status='unknown';q.attemptId=localPreviewId();q.holderProofSnapshot=serial(proof);return w;
}
export function reconcileNftAdmission(world:ProductWorld,challengeId:string,attemptId:string,outcome:'unknown'|'confirmed'|'failed',now=Date.now()){
 signed(world);time(now);const w=structuredClone(world),q=challenge(w,challengeId);need(!!attemptId&&q.attemptId===attemptId&&q.holderProofSnapshot===serial(expectedProof(q))&&['unknown','confirmed','failed'].includes(outcome),'Check the same original personally confirmed admission attempt.');if(q.status===outcome)return w;need(q.status==='unknown','Do not replay or change a terminal admission.');if(outcome==='confirmed'){online(w);fresh(w,q,now);}q.status=outcome;if(outcome!=='unknown')q.resolvedAt=now;return w;
}
function grantAvailability(w:ProductWorld,id:string,now:number){
 const g=grant(w,id,now);if(!g)return exact(w,id)?.status==='revoked'?'revoked':'held';
 const rows=w.objects.filter(o=>o.kind==='nft-access-challenge-preview'&&o.grantId===id);
 if(rows.some(q=>w.objects.filter(o=>o.id===q.id).length!==1||q.owner!==g.recipient))return 'held';
 if(rows.filter(q=>q.status==='confirmed').length>=g.entryLimit)return 'used-example';
 if(rows.some(q=>q.status==='unknown'))return 'reserved-example';
 return 'available-example';
}
export function nftAccessInventory(w:ProductWorld,now=Date.now()){
 if(!w.identity.signedIn)return [];return w.objects.filter(o=>o.owner===w.owner&&['nft-profile-credential-preview','nft-community-credential-preview'].includes(String(o.kind))).map(o=>{const c=credential(w,o.id),grants=w.objects.filter(g=>g.kind==='nft-spot-grant-preview'&&g.recipient===w.owner&&g.credentialId===o.id).map(g=>({id:g.id,venueId:String(g.venueId),purpose:String(g.purpose),status:grantAvailability(w,g.id,now)}));return {id:o.id,status:c?.status==='active'&&rgbWallet(w)?'held-credential-example':c?.status==='revoked'?'revoked':'held',credential:c?structuredClone(c):undefined,grants};});
}
export function nftAdmissionView(w:ProductWorld,challengeId:string,now=Date.now()){
 if(!w.identity.signedIn)return;let q:NftAccessChallenge;try{q=challenge(w,challengeId);}catch{return;}let current=true;try{fresh(w,q,now);}catch{current=false;}return {id:q.id,audience:q.audience,status:['confirmed','failed'].includes(q.status)?q.status:!current?'held':q.status,currentChallengeUsable:current&&q.status==='issued',originalStatus:q.status,expiresAt:q.expiresAt,attemptId:q.attemptId,liveExecution:false};
}
