import {isCraysBrandSetup,craysFranchiseMessage} from './craysFranchisePolicy.ts';
import {hoursFromSetup} from './venueHours';
import {localPreviewId} from "./localPreviewId.ts";
import type { ActionContext, Entity, ProductWorld, Venue } from "./productModel.ts";
export const venueServiceChoices = ["Food & drinks", "Events", "Rooms", "Workspace", "Gym & wellbeing", "Spa", "Transport", "Reception"];
export const venueStaffRoles = ["Publishing", "Community", "Service", "Billing", "Administration"];
export const venueWeekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export type VenueSetupConfig = { name:string; organisation:string; relationship:string; city:string; address:string; timezone:string; type:string; email:string; description:string; image:string; logo:string; services:string[]; hours:{day:string;closed:boolean;opens:string;closes:string;overnight:boolean}[]; department:string; integrations:string; access:string; rules:string; readAccess:string; writeAccess:string; groups:string; socialOptIn:boolean; relayMode:string; relayUrl:string; relayOwner:string; staff:{id:string;name:string;email:string;role:string}[]; publishDefault:string };
export const newVenueSetupConfig = (): VenueSetupConfig => ({ name:"",organisation:"",relationship:"",city:"",address:"",timezone:"Europe/Berlin",type:"",email:"",description:"",image:"",logo:"",services:[],hours:venueWeekDays.map(day=>({day,closed:false,opens:"09:00",closes:"18:00",overnight:false})),department:"",integrations:"",access:"Invitation & approval",rules:"",readAccess:"Members only",writeAccess:"Staff only",groups:"",socialOptIn:true,relayMode:"Managed option",relayUrl:"",relayOwner:"",staff:[],publishDefault:"Venue community" });
const need=(ok:unknown,m:string)=>{if(!ok)throw Error(m);};
export function validateVenueRelay(value:string) {
 let u:URL;try{u=new URL(value);}catch{throw Error("Enter a valid wss:// relay address.");}
 need(u.protocol==="wss:" && !!u.hostname && !u.username && !u.password && !u.search && !u.hash,"Use wss:// without passwords, credentials, query strings or fragments.");
 need(!["localhost","127.0.0.1","0.0.0.0","[::1]"].includes(u.hostname),"Choose the intended external venue relay, not a local address.");
 return u.href;
}
export function validVenueImage(value:string, optional=false) {
 if(!value)return optional;
 if(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(png|jpg|jpeg|webp)$/.test(value))return true;
 const match=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match || match[2].length*3/4-(match[2].endsWith("==")?2:match[2].endsWith("=")?1:0)>3*1024*1024)return false;
 try { const bytes=atob(match[2].slice(0,32));return match[1]==="png"?bytes.startsWith("\x89PNG\r\n\x1a\n"):match[1]==="jpeg"?bytes.startsWith("\xff\xd8\xff"):bytes.startsWith("RIFF")&&bytes.slice(8,12)==="WEBP"; } catch{return false;}
}
export function venueConfigurationChecks(c:VenueSetupConfig) {
 const checks:{name:string;ok:boolean;detail:string}[]=[];
 const check=(name:string,test:()=>boolean,detail:string)=>{let ok=false;try{ok=test();}catch{}checks.push({name,ok,detail});};
 check("Independent Spot",()=>!isCraysBrandSetup(c),craysFranchiseMessage);
 check("Organisation & place",()=>!!(c.name.trim()&&c.organisation.trim()&&c.relationship.trim()&&c.city.trim()&&c.address.trim()&&c.type.trim()&&c.description.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)),"Name, responsible organisation, representation, location and business contact.");
 check("Time zone",()=>{new Intl.DateTimeFormat("en",{timeZone:c.timezone}).format();return true;},"The venue’s actual local time zone.");
 check("Venue media",()=>validVenueImage(c.image)&&validVenueImage(c.logo,true),"Use your own PNG, JPEG or WebP; no executable SVG or external tracking URL.");
 check("Services & hours",()=>c.services.length>0&&new Set(c.services).size===c.services.length&&c.services.every(s=>venueServiceChoices.includes(s))&&c.hours.length===7&&new Set(c.hours.map(h=>h.day)).size===7&&c.hours.every(h=>venueWeekDays.includes(h.day)&& (h.closed || (/^([01]\d|2[0-3]):[0-5]\d$/.test(h.opens)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h.closes)&&(h.overnight ? h.closes<h.opens : h.closes>h.opens)))),"Choose offered services and each day’s hours; an overnight closing is a separate choice.");
 check("Community boundaries",()=>["Invitation & approval","Booking or ticket","Existing membership","Permitted local QR check-in","Combination to review"].includes(c.access)&&!!c.rules.trim()&&["Members only","Public updates only"].includes(c.readAccess)&&["Staff only","Permitted members"].includes(c.writeAccess)&&c.socialOptIn===true,"Admission, private groups and voluntary social visibility stay separate from relay access and physical presence.");
 check("Relay configuration",()=>["Managed option","Bring my own relay"].includes(c.relayMode)&&!!c.relayOwner.trim()&&(c.relayMode!=="Bring my own relay"||!!validateVenueRelay(c.relayUrl)),"A configuration check does not connect or provision a relay.");
 check("Limited team roles",()=>c.staff.length<=50&&new Set(c.staff.map(p=>p.id)).size===c.staff.length&&c.staff.every(p=>!!p.id&&!!p.name.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)&&venueStaffRoles.includes(p.role)),"Each invitation has one role scoped only to this venue; no private member data.");
 check("Publishing defaults",()=>["Venue community","Global public updates","Approved groups"].includes(c.publishDefault),"Each post still reviews publisher, audience and distribution. Private groups never become global by default.");
 return checks;
}
function setupFingerprint(c:VenueSetupConfig) {const text=JSON.stringify(c);let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return `${text.length}:${h>>>0}`;}
export function venueSetupGates(w:ProductWorld,setup:Entity) {
 const c=setup.config as VenueSetupConfig;
 const authority=w.objects.find(o=>o.kind==="operator-authority"&&o.owner===w.owner&&o.setupId===setup.id&&o.organisation===c.organisation&&o.status==="verified-demo"&&o.reviewedBy&&(!o.expiresAt||Number(o.expiresAt)>Date.now()));
 const entitlement=w.objects.find(o=>o.kind==="venue-entitlement"&&o.owner===w.owner&&o.setupId===setup.id&&o.status==="active-demo"&&o.verifiedForPreview===true);
 const contract=entitlement&&w.objects.find(o=>o.id===entitlement.contractId&&o.owner===w.owner&&o.kind==="crays-plan-contract"&&o.segment==="venue"&&o.serviceScopeId===setup.id&&o.status==="active-preview"&&o.planId&&o.pricingVersion&&(typeof o.currentPeriodStart==="number"?o.currentPeriodStart:Date.parse(String(o.currentPeriodStart)))<=Date.now()&&(typeof o.currentPeriodEnd==="number"?o.currentPeriodEnd:Date.parse(String(o.currentPeriodEnd)))>Date.now());
 return {authority:!!authority,entitlement:!!contract,configuration:setup.reviewedVersion===setup.version&&setup.reviewedFingerprint===setupFingerprint(c)&&venueConfigurationChecks(c).every(x=>x.ok),relay:setup.relayCheck==="passed-demo"&&setup.checkedVersion===setup.version};
}
export function applyVenueSetup(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext) {
 if(!op.startsWith("complete.venue-setup."))return;
 need(w.identity.signedIn,"Sign in to manage your own venue setup.");
 const own=ctx.objectId?w.objects.find(o=>o.id===ctx.objectId&&o.owner===w.owner&&o.kind==="venue-setup"):undefined;
 if(ctx.objectId)need(own,"This venue setup is not available in your account.");
 if(own)need(!isCraysBrandSetup(own.config),craysFranchiseMessage);
 if(own)need(String(own.version)===d.expectedVersion,"This setup changed. Reopen its latest version.");
 if(op==="complete.venue-setup.save") {
  const config=JSON.parse(d.config||"{}") as VenueSetupConfig;
  need(JSON.stringify(config).length<8500000,"Choose smaller venue media.");
  need(typeof config.name==="string"&&typeof config.organisation==="string"&&Array.isArray(config.services)&&Array.isArray(config.staff)&&Array.isArray(config.hours),"Use the guided venue setup fields.");
  need(!isCraysBrandSetup(config),craysFranchiseMessage);
  need(validVenueImage(config.image,true)&&validVenueImage(config.logo,true),"Use your own PNG, JPEG or WebP image up to 3 MB.");
  if(config.relayMode==="Bring my own relay"&&config.relayUrl)validateVenueRelay(config.relayUrl);
  need(!own?.venueId,"A released venue needs a separate reviewed configuration change; this setup preserves its original record.");
  const serial=JSON.stringify(config);
  if(own&&JSON.stringify(own.config)===serial)return {objectId:own.id,message:"Your original setup draft is already saved."};
  const o=own||{id:localPreviewId(),owner:w.owner,kind:"venue-setup"};
  Object.assign(o,{name:config.name||"My new venue",config,version:Number(o.version||0)+1,status:"draft",reviewedVersion:0,checkedVersion:0,relayCheck:"not-checked",updatedAt:Date.now()});
  if(!own)w.objects.unshift(o);
  return {objectId:o.id,message:"Venue draft saved. No relay, operator role, staff invitation or guest access was created."};
 }
 need(own,"Save your own venue draft first.");
 const s=own!,c=s.config as VenueSetupConfig;
 if(op==="complete.venue-setup.resume") {need(d.approved==="Yes"&&s.status==="withdrawn"&&!s.venueId,"Only an unreleased withdrawn setup can be resumed after confirmation.");s.status="draft";s.version=Number(s.version)+1;s.reviewedVersion=0;s.checkedVersion=0;s.relayCheck="not-checked";return {objectId:s.id,message:"The same setup is resumed as a draft. Review and checks must be renewed."};}
 if(op==="complete.venue-setup.withdraw") {
  need(d.approved==="Yes","Confirm withdrawing this setup.");s.status="withdrawn";s.reviewedVersion=0;s.checkedVersion=0;
  const venue=w.venues.find(v=>v.id===`venue-${s.id}`&&v.id===s.venueId);if(venue){venue.operatorActive=false;venue.presence="none";}
  return {objectId:s.id,message:"Setup withdrawn in preview. Independent contacts, purchases and private conversations remain unchanged."};
 }
 need(s.status!=="withdrawn","Resume and review this withdrawn setup before new actions.");
 need(d.approved==="Yes","Review and approve this exact setup action.");
 const failed=venueConfigurationChecks(c).filter(x=>!x.ok);need(!failed.length,failed.map(x=>x.name).join(", ")+" needs attention.");
 if(op==="complete.venue-setup.review") {s.reviewedVersion=s.version;s.reviewedFingerprint=setupFingerprint(c);s.status="reviewed";return {objectId:s.id,message:"Configuration reviewed. Operator approval, subscription and relay check remain separate."};}
 need(s.reviewedVersion===s.version&&s.reviewedFingerprint===setupFingerprint(c),"Review the exact latest configuration first.");
 if(op==="complete.venue-setup.submit") {
  let application=w.objects.find(o=>o.kind==="operator-application"&&o.owner===w.owner&&o.setupId===s.id);
  if(!application){application={id:localPreviewId(),owner:w.owner,kind:"operator-application",setupId:s.id};w.objects.unshift(application);}
  Object.assign(application,{name:c.name,organisation:c.organisation,relationship:c.relationship,city:c.city,type:c.type,email:c.email,consent:"Yes",status:"pending-representation-review",operatorVerified:false,subscription:"not-contracted",relayProvisioned:false,staffInvitationsSent:false});s.applicationId=application.id;s.status="awaiting-review";
  return {objectId:s.id,message:"Representation submitted for review. No self-verification, contract or operator grant was created."};
 }
 if(op==="complete.venue-setup.check") {need(["Passed","Unreachable","Unknown"].includes(d.outcome),"Choose a configuration preview outcome.");s.relayCheck=d.outcome==="Passed"?"passed-demo":d.outcome==="Unknown"?"unknown":"unreachable";s.checkedVersion=s.version;return {objectId:s.id,message:"Configuration preview recorded. No real relay connection or provisioning took place."};}
 const gates=venueSetupGates(w,s);
 need(gates.authority,"A separately verified operator representative is required. Subscription does not grant this authority.");
 need(gates.entitlement,"A current venue contract and matching entitlement for this exact setup are required.");
 need(gates.configuration&&gates.relay,"Complete the reviewed configuration and successful relay preview first.");
 if(op==="complete.venue-setup.ready"){s.status="ready-preview";return {objectId:s.id,message:"Ready in preview. Guest release is a separate explicit action."};}
 if(op==="complete.venue-setup.release") {
  need(s.status==="ready-preview"||s.status==="released-preview","Make this setup ready before releasing it to guests.");
  if(s.venueId){need(s.venueId===`venue-${s.id}`,"This setup cannot modify another venue.");return {objectId:s.id,message:"This original venue is already released in preview. No duplicate was created."};}
  const id=`venue-${s.id}`;
  const v:Venue={id,name:c.name,type:c.type,city:c.city,description:c.description,image:c.image,services:[...c.services],visited:false,membership:"active",grant:"Verified operator preview; not a visit",otherGrant:false,presence:"none",visibility:{Socializing:false,Business:false,Dating:false},area:"Venue community",operatorActive:true,role:"Operator",relay:c.relayMode==="Bring my own relay"?c.relayUrl:"Managed relay pending real provisioning",relayJoined:false};
  v.openingHours=hoursFromSetup(c,s.id,id);w.venues.push(v);w.settings[`publishing:${id}:members`]=c.writeAccess==="Permitted members";s.venueId=id;s.status="released-preview";
  for(const p of c.staff)w.objects.push({id:localPreviewId(),owner:w.owner,kind:"venue-staff-invitation",setupId:s.id,venueId:id,name:p.name,email:p.email,role:p.role,status:"prepared-not-sent",scope:"This venue only"});
  return {objectId:s.id,message:"Your own venue is released in the clickdummy. No live provisioning or staff messages; no existing guest role was changed."};
 }
 throw Error("This venue setup action is unavailable.");
}
