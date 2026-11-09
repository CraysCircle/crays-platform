import type {Entity,ProductWorld} from './productModel';

export type IdentityChannel='email'|'phone'|'nostr'|'auth0';
export type IdentityChallengeStatus='pending'|'verified-demo'|'expired'|'locked'|'invalidated';
type Contact={value:string;revision:number;verifiedAt?:number};
type Challenge={id:string;channel:IdentityChannel|'totp';target:string;targetRevision:number;createdAt:number;expiresAt:number;attempts:number;status:IdentityChallengeStatus;verifiedAt?:number;counter?:number};
type Invitation={id:string;targetId:string;status:'prepared'|'share-opened-mock'|'cancelled';createdAt:number;updatedAt:number};
type State=Entity&{kind:'account-identity-preview-v1';schemaVersion:1;mock:true;sequence:number;email:Contact;phone:Contact;challenges:Challenge[];nostr?:{publicId:string;verifiedAt:number};auth0?:{reviewedAt:number};mfa:{enabled:boolean;revision:number;lastCounter?:number};discovery:{enabled:boolean;sampleLoaded:boolean;selfDiscoverable:boolean};invitations:Invitation[]};
export const identityDemoCode='123456';
export const identityTotpDemoCode='654321';
const validTime=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=8640000000000000;
const statuses:IdentityChallengeStatus[]=['pending','verified-demo','expired','locked','invalidated'];
const idFor=(owner:string)=>`account-identity-preview:${owner}`;
const own=(w:ProductWorld)=>{if(!w.identity.signedIn||!w.owner.trim())throw Error('Sign in to review your own private security setup.');};
const empty=(owner:string):State=>({id:idFor(owner),owner,kind:'account-identity-preview-v1',schemaVersion:1,mock:true,sequence:0,email:{value:'',revision:0},phone:{value:'',revision:0},challenges:[],mfa:{enabled:false,revision:0},discovery:{enabled:false,sampleLoaded:false,selfDiscoverable:false},invitations:[]});
function valid(s:Entity,w:ProductWorld):s is State{
 if(s.id!==idFor(w.owner)||s.owner!==w.owner||s.kind!=='account-identity-preview-v1'||s.mock!==true||s.schemaVersion!==1)return false;
 const state=s as State;
 return Number.isSafeInteger(state.sequence)&&state.sequence>=0&&['email','phone'].every(k=>{const c=state[k as 'email'|'phone'];return c&&typeof c.value==='string'&&Number.isSafeInteger(c.revision)&&c.revision>=0&&(c.verifiedAt===undefined||validTime(c.verifiedAt)&&Array.isArray(state.challenges)&&state.challenges.some(ch=>ch.channel===k&&ch.target===c.value&&ch.targetRevision===c.revision&&ch.status==='verified-demo'&&ch.verifiedAt===c.verifiedAt));})&&
 !!state.mfa&&typeof state.mfa.enabled==='boolean'&&Number.isSafeInteger(state.mfa.revision)&&state.mfa.revision>=0&&(state.mfa.lastCounter===undefined||Number.isSafeInteger(state.mfa.lastCounter))&&
 !!state.discovery&&typeof state.discovery.enabled==='boolean'&&typeof state.discovery.sampleLoaded==='boolean'&&typeof state.discovery.selfDiscoverable==='boolean'&&(!state.discovery.selfDiscoverable||state.phone.verifiedAt!==undefined)&&Array.isArray(state.challenges)&&new Set(state.challenges.map(c=>c?.id)).size===state.challenges.length&&
 state.challenges.every(c=>c&&typeof c.id==='string'&&c.id.startsWith(`account-challenge:${encodeURIComponent(w.owner)}:`)&&['email','phone','nostr','auth0','totp'].includes(c.channel)&&typeof c.target==='string'&&Number.isSafeInteger(c.targetRevision)&&c.targetRevision>=0&&validTime(c.createdAt)&&validTime(c.expiresAt)&&c.expiresAt>c.createdAt&&c.expiresAt-c.createdAt<=300000&&Number.isSafeInteger(c.attempts)&&c.attempts>=0&&c.attempts<=3&&statuses.includes(c.status)&&(c.status==='verified-demo'?validTime(c.verifiedAt)&&c.verifiedAt>=c.createdAt&&c.verifiedAt<c.expiresAt&&c.attempts>0:(c.verifiedAt===undefined||c.status==='invalidated'&&validTime(c.verifiedAt)))&&(c.status!=='locked'||c.attempts===3)&&(c.status!=='pending'||c.attempts<3)&&(c.channel!=='totp'||Number.isSafeInteger(c.counter)))&&
 Array.isArray(state.invitations)&&new Set(state.invitations.map(i=>i?.id)).size===state.invitations.length&&state.invitations.every(i=>i&&typeof i.id==='string'&&sampleContacts.some(t=>t.id===i.targetId)&&['prepared','share-opened-mock','cancelled'].includes(i.status)&&validTime(i.createdAt)&&validTime(i.updatedAt)&&i.updatedAt>=i.createdAt)&&
 (state.nostr===undefined||typeof state.nostr.publicId==='string'&&!/nsec/i.test(state.nostr.publicId)&&validTime(state.nostr.verifiedAt))&&(state.auth0===undefined||validTime(state.auth0.reviewedAt));
}
function read(w:ProductWorld):State{
 own(w);const rows=w.objects.filter(o=>o.id===idFor(w.owner)||o.kind==='account-identity-preview-v1'&&o.owner===w.owner);
 if(!rows.length)return empty(w.owner);
 if(rows.length!==1||!valid(rows[0],w))throw Error('The original private security record needs review. It was not replaced.');
 return structuredClone(rows[0]);
}
const write=(w:ProductWorld,s:State):ProductWorld=>({...w,objects:w.objects.some(o=>o.id===s.id)?w.objects.map(o=>o.id===s.id?s:o):[...w.objects,s]});
function timed(now:number){if(!validTime(now)||now>8640000000000000-300000)throw Error('Review this local challenge time.');}
function target(w:ProductWorld,s:State,channel:IdentityChannel|'totp'){
 if(channel==='email'||channel==='phone')return {value:s[channel].value,revision:s[channel].revision};
 if(channel==='nostr'){const value=w.identity.publicId;if(!value||/nsec/i.test(value))throw Error('Use only your existing public Nostr identity. Never enter a private key.');return{value,revision:0};}
 return channel==='auth0'?{value:`auth0-local-preview:${w.owner}`,revision:0}:{value:`totp-local-preview:${w.owner}`,revision:s.mfa.revision};
}
const mask=(value:string,channel:'email'|'phone')=>!value?'Not added':channel==='phone'?`${value.slice(0,3)}••••${value.slice(-2)}`:`${value[0]}•••@${value.split('@')[1]||'•••'}`;
export const sampleContacts=[{id:'fictional-alex',name:'Alex · fictional sample',maskedPhone:'+49••••12',targetOptedIn:true},{id:'fictional-sam',name:'Sam · fictional sample',maskedPhone:'+44••••73',targetOptedIn:false}] as const;
/** Owner-private masked projection. No email/phone is added to a public profile or contact graph. */
export function accountIdentity(w:ProductWorld,now=Date.now()){
 if(!w.identity.signedIn)return undefined;
 try{const s=read(w);return{email:{masked:mask(s.email.value,'email'),verifiedDemo:s.email.verifiedAt!==undefined},phone:{masked:mask(s.phone.value,'phone'),verifiedDemo:s.phone.verifiedAt!==undefined},nostrLinkedDemo:!!s.nostr&&s.nostr.publicId===w.identity.publicId,auth0ReviewedDemo:!!s.auth0,mfaEnabledDemo:s.mfa.enabled,selfDiscoverable:s.discovery.selfDiscoverable,discoveryEnabled:s.discovery.enabled,sampleLoaded:s.discovery.enabled&&s.discovery.sampleLoaded,
 challenges:s.challenges.map(c=>({id:c.id,channel:c.channel,status:c.status==='pending'&&now>=c.expiresAt?'expired' as const:c.status,attempts:c.attempts,expiresAt:c.expiresAt,...(c.counter===undefined?{}:{counter:c.counter})})),
 contacts:s.discovery.enabled&&s.discovery.sampleLoaded?sampleContacts.map(c=>({id:c.id,name:c.name,maskedPhone:c.maskedPhone,consentedMatch:c.targetOptedIn,matchLabel:c.targetOptedIn?'Consented fictional match':'No consented match shown'})):[],invitations:s.invitations.map(i=>({...i}))};}catch{return undefined;}
}
export function setAccountContact(w:ProductWorld,channel:'email'|'phone',value:string):ProductWorld{
 const s=read(w);if(!['email','phone'].includes(channel)||typeof value!=='string')throw Error('Choose your email or phone.');
 value=channel==='email'?value.trim().toLowerCase():value.replace(/[\s()-]/g,'');
 if(channel==='email'?!/^[^\s@]{1,64}@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value)||value.length>254:!/^\+[1-9]\d{7,14}$/.test(value))throw Error(channel==='email'?'Enter a valid email address for this local demo.':'Use an international phone number starting with +.');
 if(s[channel].value===value)return w;
 s[channel]={value,revision:s[channel].revision+1};if(channel==='phone'){s.discovery.selfDiscoverable=false;s.discovery.sampleLoaded=false;s.invitations.forEach(i=>{if(i.status!=='cancelled')i.status='cancelled';});}s.challenges.forEach(c=>{if(c.channel===channel)c.status='invalidated';});return write(w,s);
}
export function beginAccountChallenge(w:ProductWorld,channel:IdentityChannel,now=Date.now()):ProductWorld{
 const s=read(w);timed(now);if(!['email','phone','nostr','auth0'].includes(channel))throw Error('Choose a known local verification channel.');
 const t=target(w,s,channel);if(!t.value)throw Error('Save that private contact value first.');
 s.challenges.forEach(c=>{if(c.channel===channel&&c.status==='pending')c.status='invalidated';});
 s.sequence++;s.challenges.push({id:`account-challenge:${encodeURIComponent(w.owner)}:${s.sequence}`,channel,target:t.value,targetRevision:t.revision,createdAt:now,expiresAt:now+300000,attempts:0,status:'pending'});return write(w,s);
}
function attempt(w:ProductWorld,s:State,id:string,code:string,now:number,counter?:number):ProductWorld{
 timed(now);const c=s.challenges.find(c=>c.id===id);if(!c)throw Error('Open the exact original challenge.');
 const t=target(w,s,c.channel);
 if(c.status==='verified-demo'&&t.value===c.target&&t.revision===c.targetRevision)return w;
 if(c.status!=='pending')throw Error('This original challenge cannot be reused.');
 if(c.target!==t.value||c.targetRevision!==t.revision){c.status='invalidated';return write(w,s);}
 if(now<c.createdAt)throw Error('Keep the original challenge timeline.');
 if(now>=c.expiresAt){c.status='expired';return write(w,s);}
 const expected=c.channel==='totp'?identityTotpDemoCode:identityDemoCode;
 c.attempts++;if(code!==expected||c.channel==='totp'&&(counter!==c.counter||counter!==Math.floor(now/30000)||s.mfa.lastCounter===counter)){if(c.attempts>=3)c.status='locked';return write(w,s);}
 c.status='verified-demo';c.verifiedAt=now;
 if(c.channel==='email'||c.channel==='phone')s[c.channel].verifiedAt=now;
 else if(c.channel==='nostr')s.nostr={publicId:c.target,verifiedAt:now};
 else if(c.channel==='auth0')s.auth0={reviewedAt:now};
 else{s.mfa.enabled=true;s.mfa.lastCounter=counter;}
 return write(w,s);
}
export function verifyAccountChallenge(w:ProductWorld,id:string,code:string,now=Date.now()):ProductWorld{const s=read(w);if(s.challenges.find(c=>c.id===id)?.channel==='totp')throw Error('Use the separate TOTP counter review.');return attempt(w,s,id,code,now);}
export function beginAccountMfa(w:ProductWorld,now=Date.now()):ProductWorld{
 const s=read(w);timed(now);const counter=Math.floor(now/30000);s.challenges.forEach(c=>{if(c.channel==='totp'&&c.status==='pending')c.status='invalidated';});s.sequence++;
 s.challenges.push({id:`account-challenge:${encodeURIComponent(w.owner)}:${s.sequence}`,channel:'totp',target:`totp-local-preview:${w.owner}`,targetRevision:s.mfa.revision,createdAt:now,expiresAt:Math.min((counter+1)*30000,now+300000),attempts:0,status:'pending',counter});return write(w,s);
}
export function verifyAccountMfa(w:ProductWorld,id:string,code:string,counter:number,now=Date.now()):ProductWorld{const s=read(w);if(s.challenges.find(c=>c.id===id)?.channel!=='totp')throw Error('Open the separate authenticator setup.');return attempt(w,s,id,code,now,counter);}
export function disableAccountMfa(w:ProductWorld):ProductWorld{const s=read(w);s.mfa.enabled=false;s.mfa.revision++;s.challenges.forEach(c=>{if(c.channel==='totp')c.status='invalidated';});return write(w,s);}
export function setSelfDiscoverability(w:ProductWorld,enabled:boolean):ProductWorld{const s=read(w);if(typeof enabled!=='boolean'||enabled&&s.phone.verifiedAt===undefined)throw Error('Verify your saved phone in this demo before opting in to being found.');s.discovery.selfDiscoverable=enabled;if(!enabled){s.discovery.sampleLoaded=false;s.invitations.forEach(i=>{if(i.status!=='cancelled')i.status='cancelled';});}return write(w,s);}
export function setContactDiscovery(w:ProductWorld,enabled:boolean):ProductWorld{const s=read(w);if(typeof enabled!=='boolean')throw Error('Choose your contact discovery consent.');s.discovery.enabled=enabled;if(!enabled){s.discovery.sampleLoaded=false;s.invitations.forEach(i=>{if(i.status!=='cancelled')i.status='cancelled';});}return write(w,s);}
export function loadContactDiscoverySample(w:ProductWorld):ProductWorld{const s=read(w);if(!s.discovery.enabled||s.phone.verifiedAt===undefined)throw Error('Verify your saved phone and choose selected-address-book consent before loading the fictional sample.');s.discovery.sampleLoaded=true;return write(w,s);}
export function prepareContactInvitation(w:ProductWorld,targetId:string,now=Date.now()):ProductWorld{
 const s=read(w);timed(now);if(!s.discovery.enabled||!s.discovery.sampleLoaded||!sampleContacts.some(c=>c.id===targetId))throw Error('Choose one contact from the consented fictional sample.');
 const existing=s.invitations.find(i=>i.targetId===targetId&&i.status!=='cancelled');if(existing)return w;
 s.sequence++;s.invitations.push({id:`account-invitation:${encodeURIComponent(w.owner)}:${s.sequence}`,targetId,status:'prepared',createdAt:now,updatedAt:now});return write(w,s);
}
export function transitionContactInvitation(w:ProductWorld,id:string,action:'open-share'|'cancel',now=Date.now()):ProductWorld{
 const s=read(w);timed(now);const i=s.invitations.find(i=>i.id===id);if(!i||!['open-share','cancel'].includes(action))throw Error('Open your exact invitation preparation.');
 if(i.status==='cancelled'){if(action==='cancel')return w;throw Error('This cancelled preparation cannot be sent or reopened.');}
 if(now<i.updatedAt)throw Error('Keep the original invitation timeline.');
 if(action==='open-share'&&(!s.discovery.enabled||!s.discovery.sampleLoaded))throw Error('Contact discovery consent was withdrawn.');
 const status=action==='cancel'?'cancelled':'share-opened-mock';if(i.status===status)return w;i.status=status;i.updatedAt=now;return write(w,s);
}
