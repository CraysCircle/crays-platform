import type {MdkBrowserAccount,MdkBrowserAccountContext,MdkTimelinePage} from './mdkBrowserAccount.mjs';
export interface MdkPublicationMetadata {transportId:string;kind:'group'|'welcome';groupId:string|null;recipient:string|null}
export interface MdkPublicationHooks {beforePublication?(metadata:Readonly<MdkPublicationMetadata>):void|Promise<void>}
export interface MdkRuntimeEffects {
 projected:number;queued:number;pendingConvergence:number;
 publicationReports:Array<{transportId:string;metRequiredAcks:boolean}>;
 fanoutOutcomes:Array<{transportId:string;mlsConfirmationRequired:boolean;mlsConfirmed:boolean;complete:boolean;acceptedTargets:number;outstandingTargets:number}>;
 acknowledgedPublications:number;unresolvedPublications:number;failures:number;welcomeFailures:number;supersededIntents:number;
 publishedAppMessages:Array<{groupId:string;appEventId:string;transportId:string}>;
 unresolvedAppMessages:Array<{groupId:string;appEventId:string;transportId:string}>;
 failedAppMessages:Array<{groupId:string;appEventId:string;transportId:string}>;
 timelineChange:'none'|'withdrawal';
}
export interface MdkCanonicalChatEvent {id:string;pubkey:string;kind:9;created_at:number;tags:string[][];content:string}
export interface MdkMediaReference {locators:ReadonlyArray<Readonly<{kind:string;value:string}>>;ciphertext_sha256:string;plaintext_sha256:string;nonce_hex:string;file_name:string;media_type:string;version:'encrypted-media-v2';source_epoch:number;dim:string|null;thumbhash:string|null}
export interface MdkNormalDeviceRuntime {
 readonly storageFormat:'crays-original-mdk-current-v1';readonly accountPubkey:string;
 verifyInvitationCommit?(groupId:string,transportId:string,expectedParent:string,keyPackage:unknown):boolean|Promise<boolean>;
 managementDeliveryConfirmed?(groupId:string,transportId:string):Promise<boolean>;
 managementPublicationId?(groupId:string,expectedParent:string,actionJson:string):string|null;
 invitationPublicationIds?(groupId:string,expectedParent:string,keyPackage:unknown):Readonly<{commit:string;welcomes:readonly string[]}>|null|Promise<Readonly<{commit:string;welcomes:readonly string[]}>|null>;
 welcomeDeliveryConfirmed?(groupId:string,transportId:string,recipient:string):boolean|Promise<boolean>;
 publishInvitationKey(slot:string):Promise<void>;
 activate():Promise<void>;
 setInboxRoute(pubkey:string,endpoints:string[]):Promise<void>;
 findGroupByRouting(routingId:string):Promise<string|null>;
 createFounderGroup(input:{name:string;description:string;routingId:string;relays:string[];mediaEndpoints?:string[]}):Promise<Readonly<{groupId:string;routingId:string}>>;
 syncGroups():Promise<void>;
 summary(groupId:string):Promise<unknown>;
 routing(groupId:string):Promise<Readonly<{groupId:string;routingId:string;relays:readonly string[]}>|null>;
 mediaPolicy(groupId:string):Promise<Readonly<{media_format:string;allowed_locator_kinds:readonly string[];default_blob_endpoints:readonly Readonly<{locator_kind:string;base_url:string}>[]}>|null>;
 manage(groupId:string,epochPin:unknown,action:unknown,hooks?:MdkPublicationHooks):Promise<MdkRuntimeEffects>;
 ownDevices(groupId:string):Promise<Readonly<{groupId:string;epochPin:unknown;devices:readonly Readonly<{signatureKey:string;currentDevice:boolean}>[]}>>;
 removeOwnDevices(groupId:string,epochPin:unknown,leafSignatureKeys:readonly string[],hooks?:MdkPublicationHooks):Promise<MdkRuntimeEffects>;
 prepareMedia(groupId:string,input:{data:Uint8Array;fileName:string;mediaType:string}):Promise<Readonly<{reference:Readonly<{plaintext_sha256:string;ciphertext_sha256:string;nonce_hex:string;file_name:string;media_type:string;version:'encrypted-media-v2';source_epoch:number}>;ciphertext:Uint8Array}>>;
 buildMediaTag(groupId:string,reference:unknown):Promise<string[]>;
 mediaReference(groupId:string,messageId:string,index:number):Promise<Readonly<MdkMediaReference>>;
 openMedia(groupId:string,messageId:string,index:number,data:Uint8Array):Promise<Uint8Array>;
 sendChatEvent(groupId:string,event:MdkCanonicalChatEvent):Promise<MdkRuntimeEffects|{existingAppEventId:string;confirmedTransportId:string|null;timelineChange:'none'}>;
 ingest(groupId:string|undefined,event:unknown,endpoint:string):Promise<MdkRuntimeEffects>;
 redeliverWelcome(groupId:string,messageId:string,recipient:string,hooks?:MdkPublicationHooks):Promise<MdkRuntimeEffects>;
 reconcile(groupId:string,hooks?:MdkPublicationHooks):Promise<MdkRuntimeEffects>;
 readTimeline(groupId:string,options?:{before?:{at:number;messageId:string};limit?:number}):Promise<MdkTimelinePage>;
 subscribeTimeline(listener:(change:Readonly<{kind:'append'|'withdrawal'|'closed'|'offline'}>)=>void):()=>void;
 close():Promise<void>;settled():Promise<void>;
}
export function openMdkDeviceRuntime(options:{
 account:MdkBrowserAccountContext;runtime:MdkBrowserAccount;inboxes:Record<string,string[]>;
 isCurrent():boolean;authorize(operation:string,payload:unknown):boolean;onFailure?(failure:Readonly<{phase:string;code:'original-runtime-failed'}>):void;
 network:{publish(relays:string[],event:unknown,options:{signal:AbortSignal;beforeSend():boolean}):Promise<Record<string,{ok:boolean;uncertain?:boolean}>>;request(relays:string[],filters:unknown,signal?:AbortSignal):Promise<unknown[]>;subscription(relays:string[],filters:unknown):{subscribe(observer:{next?(event:unknown):void;error?(error:unknown):void}):{unsubscribe():void}}};
}):Promise<MdkNormalDeviceRuntime>;
