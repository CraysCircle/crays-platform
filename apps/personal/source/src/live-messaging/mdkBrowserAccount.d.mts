import type {CurrentAccountMessagingPort} from './currentAccountMessaging.mjs';
/** Original runtime owns durable evolution/fanout recovery. No raw engine
 * events, exporter secrets or process-local pending references leave this API.
 * The host must pump the bound transport and commit before network dispatch.
 */
export interface MdkDeviceRuntime {
 transport_bridge():{drain():string;resolve(id:number,value:string,failed:boolean):void;close():void;free():void};
 publish_invitation_key(slot:string):Promise<void>;
 activate():Promise<void>;
 set_inbox_route(pubkey:string,endpointsJSON:string):boolean;
 find_group_by_routing(routingId:string):string|undefined;
 create_founder_group(name:string,description:string,routingId:string,relaysJSON:string,mediaEndpointsJSON?:string):Promise<string|undefined>;
 sync_groups():Promise<void>;
 group_summary(groupId:string):string;
 group_routing(groupId:string):string|undefined;
 manage_group(groupId:string,expectedEpochPinJSON:string,actionJSON:string):Promise<string>;
 timeline(groupId:string,beforeAt:bigint|undefined,beforeId:string|undefined,limit:number):Promise<string>;
 retry_delay_ms(groupId:string):bigint|undefined;
 send_chat_event(groupId:string,eventJSON:string):Promise<string>;
 ingest_event(groupId:string|undefined,eventJSON:string,endpoint:string):Promise<string>;
 reconcile_group(groupId:string):Promise<string>;
 redeliver_group_welcome(groupId:string,messageId:string,recipient:string):Promise<string>;
 resume_publications():Promise<string>;
 maintenance():Promise<string>;
 close():void;free():void;
}
export interface MdkRawBrowserAccount {
 prepare_identity(pubkey:string):string;
 complete_identity(signature:string):string;
 take_device_runtime(inboxesJSON:string):MdkDeviceRuntime;
 signer_bridge():{drain():string;resolve(id:number,value:string,error:boolean):void;snapshot?():Uint8Array;management_publication_id?(groupId:string,expectedParent:string,actionJSON:string):string;invitation_commit_matches?(groupId:string,transportId:string,expectedParent:string,keyPackageJSON:string):boolean;invitation_publication_ids?(groupId:string,expectedParent:string,keyPackageJSON:string):string;welcome_delivery_confirmed?(groupId:string,transportId:string,recipient:string):boolean;close():void;free():void};
 snapshot():Uint8Array;
 fresh_key_package_publication(slot:string,relaysJSON:string):Promise<string>;
 create_group(name:string,description:string,packagesJSON:string,relaysJSON:string):Promise<string>;
 join_group(eventJSON:string):Promise<string>;
 manage_group(groupId:string,expectedEpochPinJSON:string,actionJSON:string):Promise<string>;
 confirm_group_publication(pendingReference:string):Promise<string>;
 drain_group_work(groupId:string):Promise<string>;
 send_chat(groupId:string,content:string):Promise<string>;
 send_chat_attempt(groupId:string,content:string,requestId:string,replyId?:string):Promise<string>;
 ingest_group(eventJSON:string):Promise<string>;
 ingest_timeline(eventJSON:string):Promise<string>;
 timeline(groupId:string,beforeAt:bigint|undefined,beforeId:string|undefined,limit:number):string;
 group_summary(groupId:string):string;
 group_routing(groupId:string):string|undefined;
 close():void;free():void;
}
export interface MdkBrowserAccountClass {new():MdkRawBrowserAccount;restore(bytes:Uint8Array):MdkRawBrowserAccount;}
export interface MdkBrowserAccount {
 readonly storageFormat:'crays-original-mdk-current-v1';
 readonly accountPubkey:string;readonly mlsSignaturePublicKey:string;
 run<T>(work:(account:MdkRawBrowserAccount)=>T|Promise<T>):Promise<T>;
 checkpointDuringOperation():Promise<void>;
 invitationCommitMatches(groupId:string,transportId:string,expectedParent:string,keyPackage:unknown):boolean;
 recordControlEffects(groupId:string,effects:unknown):Promise<void>;
 managementDeliveryConfirmed(groupId:string,transportId:string):Promise<boolean>;
 managementPublicationId(groupId:string,expectedParent:string,actionJson:string):string|null;
 invitationPublicationIds(groupId:string,expectedParent:string,keyPackage:unknown):Readonly<{commit:string;welcomes:readonly string[]}>|null;
 welcomeDeliveryConfirmed(groupId:string,transportId:string,recipient:string):boolean;
 readTimeline(groupId:string,options?:{before?:{at:number;messageId:string};limit?:number}):Promise<MdkTimelinePage>;
 ingestTimeline(eventJSON:string):Promise<{outcome:unknown;projected:number;timelineChange:'none'|'append'|'withdrawal'}>;
 subscribeTimeline(listener:(change:Readonly<{kind:'append'|'withdrawal'|'closed'}>)=>void):()=>void;
 close():Promise<void>;settled():Promise<void>;
}
/** Original MDK timeline DTO. It contains no engine exporter secret or leaf. */
export interface MdkTimelinePage {
 messages:Array<{message_id_hex:string;group_id_hex:string;source_message_id_hex:string|null;source_epoch:number|null;sender:string;plaintext:string;kind:number;tags:string[][];timeline_at:number;received_at:number;direction:string;deleted:boolean;invalidation_status:string|null;retention_expires_at:number|null;reply_to_message_id_hex:string|null;reply_preview:unknown;media:unknown;reactions:unknown}>;
 has_more_before:boolean;has_more_after:boolean;
}
export type MdkBrowserAccountContext=Pick<CurrentAccountMessagingPort,'accountId'|'identity'|'signer'|'signal'>;
export function openMdkBrowserAccount(options:{account:MdkBrowserAccountContext;AccountClass:MdkBrowserAccountClass;deviceSlot:string;controlReceipts?:{capture(groupId:string,effects:unknown):Promise<void>;confirmed(groupId:string,transportId:string):Promise<boolean>};isCurrent:()=>boolean;locks?:LockManager;snapshots:{load():Promise<{bytes:Uint8Array|null;revision:number}>;commit(bytes:Uint8Array,revision:number):Promise<{revision:number}>}}):Promise<MdkBrowserAccount>;
