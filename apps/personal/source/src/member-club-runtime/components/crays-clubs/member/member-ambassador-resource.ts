/** NEXT_DEPLOYMENT: normalized Member consumer, not an installed endpoint.
 * The owning BFF must authorize and project the original SaaS records first. */
import {z} from "zod";
import type {AmbassadorWorkspacePresentation} from "./member-ambassador-workspace";
const text=z.string().max(4000).refine(value=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value));
const id=z.string().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]+$/);
const version=z.number().int().positive();
const url=z.string().max(4096).refine(value=>{try{if(/[\u0000-\u001f\u007f]/.test(value)||value.includes('\\'))return false;if(value.startsWith('/'))return !value.startsWith('//');const parsed=new URL(value);return parsed.protocol==='https:'&&Boolean(parsed.hostname)&&!parsed.username&&!parsed.password;}catch{return false;}});
const row=<T extends z.ZodTypeAny>(schema:T)=>z.array(schema).max(500).refine(values=>new Set(values.map(value=>(value as {originalId:string}).originalId)).size===values.length,"Duplicate original record");
export const ambassadorOwnPresentationSchema=z.object({
 qr:z.object({imageUrl:url,downloadUrl:url,sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict().optional(),
 financeSummary:z.object({currency:z.string().regex(/^[A-Z]{3}$/),year:z.number().int().min(2000).max(9999),approvedAmountMinor:z.number().int().safe(),awaitingReviewAmountMinor:z.number().int().safe(),paidThisYearAmountMinor:z.number().int().safe()}).strict().optional(),
 profile:z.object({originalId:id,version,name:text,programmeStatus:text,contractStatus:text,publishedUrl:url.nullable(),portrait:z.object({url,sha256:z.string().regex(/^[a-f0-9]{64}$/),width:z.number().int().positive(),height:z.number().int().positive(),alt:text,focalX:z.number().min(0).max(100),focalY:z.number().min(0).max(100)}).strict().nullable()}).strict(),
 requests:row(z.object({originalId:id,version,name:text,applicantType:text,country:text,interest:text,receivedAt:text,status:text,nextStep:text,formFields:z.array(z.object({label:text,value:text}).strict()).max(40),activities:row(z.object({originalId:id,at:text,text}).strict())}).strict()),
 bookings:row(z.object({originalId:id,reference:text,name:text,property:text,arrival:text,departure:text,guests:text,status:text,referralOriginalId:id}).strict()),
 tasks:row(z.object({originalId:id,title:text,dueAt:text.nullable(),status:text,requestOriginalId:id}).strict()),
 links:row(z.object({originalId:id,title:text,approvedUrl:url,language:text}).strict()),
 materials:row(z.object({originalId:id,title:text,kind:text,version,downloadUrl:url.nullable(),previewUrl:url.nullable().optional(),thumbnailUrl:url.nullable().optional()}).strict()),
 settlements:row(z.object({originalId:id,period:text,currency:z.string().regex(/^[A-Z]{3}$/),confirmedAmountMinor:z.number().int().safe(),status:text,contractVersion:text,bookingReferences:z.array(text).max(500),documentOriginalId:id.nullable(),documentDownloadUrl:url.nullable()}).strict()),
 documents:row(z.object({originalId:id,title:text,kind:text,version,status:text,validUntil:text.nullable(),downloadUrl:url.nullable(),previewUrl:url.nullable().optional(),thumbnailUrl:url.nullable().optional()}).strict())
}).strict();
export type AmbassadorOwnScope=Readonly<{scopeKey:string;generationKey:string}>;
export type AmbassadorResourceState={kind:"loading"}|{kind:"ready";data:AmbassadorWorkspacePresentation}|{kind:"not_authenticated"|"not_admitted"|"revoked"|"dependency_pending"|"unavailable"};
/** Must be supplied by the genuine Core-bound BFF transport; no caller IDs/roles. */
export type AmbassadorOwnReader=(signal:AbortSignal)=>Promise<{kind:"ready";scope:AmbassadorOwnScope;data:unknown}|Exclude<AmbassadorResourceState,{kind:"ready"}|{kind:"loading"}>>;
export class AmbassadorOwnResource {
 constructor(private readonly expectedScope:AmbassadorOwnScope|null=null){}
 private readonly serverState:AmbassadorResourceState={kind:"dependency_pending"};private current:AmbassadorResourceState=this.serverState;private controller:AbortController|null=null;private revision=0;private listeners=new Set<()=>void>();
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};getSnapshot=()=>this.current;getServerSnapshot=()=>this.serverState;
 private publish(state:AmbassadorResourceState){this.current=state;for(const fn of this.listeners)fn();}
 clear(){this.revision++;this.controller?.abort();this.controller=null;this.publish({kind:"dependency_pending"});}
 async load(reader:AmbassadorOwnReader|null,scope:AmbassadorOwnScope|null){this.clear();if(!reader||!scope)return;if(this.expectedScope&&(scope.scopeKey!==this.expectedScope.scopeKey||scope.generationKey!==this.expectedScope.generationKey)){this.publish({kind:"not_admitted"});return;}const revision=this.revision;const controller=new AbortController();this.controller=controller;this.publish({kind:"loading"});try{const result=await reader(controller.signal);if(controller.signal.aborted||revision!==this.revision)return;if(result.kind!=="ready"){this.publish(result);return;}if(result.scope.scopeKey!==scope.scopeKey||result.scope.generationKey!==scope.generationKey){this.publish({kind:"not_admitted"});return;}const parsed=ambassadorOwnPresentationSchema.safeParse(result.data);this.publish(parsed.success?{kind:"ready",data:parsed.data}:{kind:"unavailable"});}catch{if(!controller.signal.aborted&&revision===this.revision)this.publish({kind:"unavailable"});}}
}



