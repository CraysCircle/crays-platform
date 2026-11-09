/** Runtime validation is mandatory; a URL is not an identity/access grant. */
export type PublicRelay = `wss://${string}`;
export type PublicContent = 'all' | 'articles' | 'shortVideos' | 'profiles' | 'following';
export type PublicReadReference = Readonly<{type:'event';eventId:string;author?:string;kind?:1|20|21|22|30023|34235|34236}>|Readonly<{type:'address';pubkey:string;kind:30023|34235|34236;identifier:string}>;
export type PublicQuery = {until?:number;limit?:number;search?:string}&(
 {content?:PublicContent;authors?:readonly string[];ids?:readonly string[];reference?:never;replyTo?:never;commentsTo?:never;engagementTo?:never;deletionsFor?:never}|
 {reference:PublicReadReference;content?:never;authors?:never;ids?:never;replyTo?:never;commentsTo?:never;engagementTo?:never;deletionsFor?:never}|
 {replyTo:readonly string[];reference?:never;content?:never;authors?:never;ids?:never;commentsTo?:never;engagementTo?:never;deletionsFor?:never}|
 {commentsTo:PublicCommentTarget;engagementTo?:never;deletionsFor?:never;reference?:never;replyTo?:never;content?:never;authors?:never;ids?:never}|
 {engagementTo:readonly string[];deletionsFor?:never;commentsTo?:never;reference?:never;replyTo?:never;content?:never;authors?:never;ids?:never}|
 {deletionsFor:readonly string[];engagementTo?:never;commentsTo?:never;reference?:never;replyTo?:never;content?:never;authors?:never;ids?:never});
export type PublicCommentTarget=Readonly<{type:'event';eventId:string;kind?:20|21|22|1111|30023|34235|34236;author?:string}>|Readonly<{type:'address';pubkey:string;kind:30023|34235|34236;identifier:string}>;
export type PublicEvent = Readonly<{id:string;pubkey:string;sig:string;kind:number;created_at:number;tags:readonly (readonly string[])[];content:string}>;
export type VerifiedPublicOriginal = Readonly<{event:PublicEvent;relays:readonly PublicRelay[]}>;
export type PrimalPublicProfileSource = Readonly<{provider:'primal';transport:'profile-cache';url:'wss://cache2.primal.net/v1'}>;
/** Distinct profile-only origin. No relays property and no public action grant. */
export type VerifiedPrimalPublicProfile = Readonly<{event:PublicEvent;source:PrimalPublicProfileSource}>;
export const PRIMAL_PROFILE_SOURCE:PrimalPublicProfileSource;
export type PrimalPublicAuthorSource=Readonly<{provider:'primal';transport:'public-author-cache';url:'wss://cache2.primal.net/v1'}>;
export type VerifiedPrimalPublicOriginal=Readonly<{event:PublicEvent;source:PrimalPublicAuthorSource}>;
export const PRIMAL_AUTHOR_SOURCE:PrimalPublicAuthorSource;
/** Presentation selection for events already independently verified by their read source. */
export function publicProfileVersionIds(events:readonly PublicEvent[]):readonly string[];
export type PublicAuthorPage=Readonly<{source:PrimalPublicAuthorSource;selection:Readonly<{pubkey:string;section:'authored'|'replies'|'articles';limit:number;until?:number}>;originals:readonly VerifiedPrimalPublicOriginal[];retainedOriginals?:readonly VerifiedPrimalPublicOriginal[];problem:string|null;pageComplete:boolean;disabled:boolean;historyComplete:false;received:number;rejected:number;ignored:number}>;
export function readPrimalPublicAuthor(options:{pubkey:string;relays:readonly PublicRelay[];section?:'authored'|'replies'|'articles';limit?:number;until?:number;signal?:AbortSignal},transport?:{connect?:(url:string)=>WebSocket;timeoutMs?:number;now?:()=>number}):Promise<PublicAuthorPage>;

export function readPrimalPublicProfiles(options:{authors:readonly string[];relays:readonly PublicRelay[];signal?:AbortSignal},transport?:{connect?:(url:string)=>WebSocket;timeoutMs?:number;now?:()=>number}):Promise<Readonly<{source:PrimalPublicProfileSource;originals:readonly VerifiedPrimalPublicProfile[];retainedOriginals?:readonly VerifiedPrimalPublicProfile[];problem:string|null;complete:boolean;disabled:boolean;received:number;rejected:number;ignored:number}>>;
export type PublicSourceStatus = Readonly<{relay:PublicRelay;received:number;rejected:number;reachedStoredEnd:boolean;failure:string|null;requestUntil?:number|null;fromPreviousStoredEnd?:boolean;nextPageUntil?:number|null}>;
export type PublicFeedSnapshot = Readonly<{phase:'idle'|'loading'|'loaded'|'disabled'|'failed'|'disposed';posts:readonly VerifiedPublicOriginal[];retainedOriginals?:readonly VerifiedPublicOriginal[];sources:readonly PublicSourceStatus[];problem:string|null;nextPageUntil:number|null;mayHaveMore:boolean;isLoadingMore:boolean;paginationProblem:string|null;paginationStalled:boolean;paginationHasGaps:boolean;unsupportedActions:readonly string[];dataOrigin:'verified-public-relay';eventIDsAreCorePersonIDs:false}>;
export type PublicNostrAdapter = {subscribe(listener:()=>void):()=>void;getSnapshot():PublicFeedSnapshot;start(options:PublicQuery&{scope:string;relays:readonly PublicRelay[]}):Promise<void>;refresh(query?:PublicQuery):Promise<void>;loadMore():Promise<void>;continueBeforeCurrentBoundary():Promise<void>;cancel():void;dispose():void};
export function createPublicNostrAdapter(options?:{connect?:(url:string)=>WebSocket;timeoutMs?:number}):PublicNostrAdapter;
export const PUBLIC_RELAYS:readonly PublicRelay[];
export const PUBLIC_KINDS:readonly number[];
export const UNSUPPORTED_ACTIONS:readonly string[];
export function publicFilter(options?:PublicQuery):Readonly<{kinds:readonly number[];limit:number;authors?:readonly string[];ids?:readonly string[];until?:number;'#e'?:readonly string[];'#d'?:readonly string[];'#a'?:readonly string[];'#k'?:readonly string[];search?:string}>;
export class PublicNostrSession {
 constructor(options?:{relays?:readonly PublicRelay[];connect?:(url:string)=>WebSocket;timeoutMs?:number});
 selectSources(relays:readonly PublicRelay[]):void;
 cancel():void;
 fetch(options?:PublicQuery,control?:{signal?:AbortSignal;sourceUntil?:Readonly<Partial<Record<PublicRelay,number|null>>>;onProgress?:(partial:Readonly<{posts:readonly VerifiedPublicOriginal[];sources:readonly PublicSourceStatus[]}>)=>void}):Promise<Readonly<{posts:readonly VerifiedPublicOriginal[];sources:readonly PublicSourceStatus[];disabled:boolean;nextPageUntil:number|null;mayHaveMore:boolean;sourceCursors:Readonly<Partial<Record<PublicRelay,number|null>>>}>>;
}
export type PublicControllerSnapshot=Omit<PublicFeedSnapshot,'unsupportedActions'|'dataOrigin'|'eventIDsAreCorePersonIDs'>;
export class PublicFeedController {
 constructor(options:{scope:string;relays?:readonly PublicRelay[];connect?:(url:string)=>WebSocket;timeoutMs?:number});
 getSnapshot():PublicControllerSnapshot;
 subscribe(listener:()=>void):()=>void;
 setContext(options:{scope:string;relays:readonly PublicRelay[]}):void;
 refresh(query?:PublicQuery):Promise<void>;
 loadMore():Promise<void>;
 continueBeforeCurrentBoundary():Promise<void>;
 dispose():void;
}
/** Signed author hints only. Prefer actual decoded image/video dimensions. */
export type PublicMediaDimensions=Readonly<{width:number;height:number}>;
export type PublicMedia = Readonly<{url:string;kind:'image'|'video'|'audio';mimeType:string|null;alt:string|null;previewURL:string|null;fallbackURLs:readonly string[];fallbackMimeTypes?:Readonly<Record<string,string|null>>;declaredDimensions?:PublicMediaDimensions;fallbackDeclaredDimensions?:Readonly<Record<string,PublicMediaDimensions|null>>}>;
export type PublicEventReference = Readonly<{type:'event';eventId:string;authorPubkey:string|null;nostrURI:string}>;
export type PublicAddressReference = Readonly<{type:'address';kind:number;pubkey:string;identifier:string;nostrURI:string|null}>;
export type PublicThread = Readonly<{root:PublicEventReference|null;parent:PublicEventReference|null;interpretation:'nip10-marked'|'nip10-deprecated-positional'|'none'}>;
export type PublicPostPresentation = Readonly<{
 original:VerifiedPublicOriginal;dataOrigin:'verified-public-relay';eventIDsAreCorePersonIDs:false;
 reference:PublicEventReference;address:PublicAddressReference|null;
 author:Readonly<{pubkey:string;npub:string;nostrURI:string;corePersonId:null}>;
 kind:number;type:'note'|'article'|'image'|'video';shortVideo:boolean;createdAtSeconds:number;
 title:string|null;body:Readonly<{text:string;format:'plain'|'markdown';allowRawHTML:false}>;
 summary:string|null;coverURL:string|null;publishedAtSeconds:number|null;contentWarning:string|null;
 mediaRequiresConsent:boolean;media:readonly PublicMedia[];thread:PublicThread;
 quotes:readonly (PublicEventReference|PublicAddressReference)[];topics:readonly string[];
 mediaBytesVerified:false;licenceGranted:false;
}>;
export type PublicProfilePresentation = Readonly<{
 original:VerifiedPublicOriginal|VerifiedPrimalPublicProfile;pubkey:string;npub:string;corePersonId:null;
 name:string|null;displayName:string|null;about:string|null;pictureURL:string|null;bannerURL:string|null;
 websiteURL:string|null;nip05Claim:string|null;nip05Verified:false;realPersonVerified:false;
}>;
/** Pure data projection; verifies a fresh original. Does not fetch media or create Core rights. */
export function presentPublicOriginal(original:VerifiedPublicOriginal):PublicPostPresentation;
export type PublicCachedPostPresentation=Omit<PublicPostPresentation,'original'|'dataOrigin'>&Readonly<{original:VerifiedPrimalPublicOriginal;dataOrigin:'verified-public-cache'}>;
export function presentPrimalCachedOriginal(original:VerifiedPrimalPublicOriginal):PublicCachedPostPresentation;
export function presentPublicProfile(original:VerifiedPublicOriginal):PublicProfilePresentation;
export function presentPrimalCachedProfile(original:VerifiedPrimalPublicProfile):PublicProfilePresentation;
export function publicExternalURL(value:unknown):string|null;

export type PublicTextPart = Readonly<{type:'text';text:string}|{type:'link';text:string;url:string}|{type:'profile';text:string;pubkey:string}|{type:'reference';text:string;reference:PublicReadReference}>;
export function presentPublicText(text:string):readonly PublicTextPart[];

export function publicAddressCode(reference:PublicReadReference):string|null;

export function publicSearchMatches(event:PublicEvent,search:string):boolean;

export type PublicCommentScope=Readonly<{type:'event';eventId:string;kind:number;author:string|null;authorCandidates:readonly string[];authorHintPresent:boolean}>|Readonly<{type:'address';kind:number;pubkey:string;identifier:string;versionEventId:string|null}>;
export type PublicCommentPresentation=Readonly<{media:readonly PublicMedia[];contentWarning:string|null;mediaRequiresConsent:boolean;original:VerifiedPublicOriginal;authorPubkey:string;root:PublicCommentScope;parent:PublicCommentScope;body:Readonly<{text:string;format:'plain';allowRawHTML:false}>;corePersonId:null}>;
export function presentPublicComment(original:VerifiedPublicOriginal):PublicCommentPresentation;
export function presentPublicFollowing(original:VerifiedPublicOriginal):Readonly<{original:VerifiedPublicOriginal;ownerPubkey:string;people:readonly Readonly<{pubkey:string;npub:string;nameHint:string|null;corePersonId:null}>[];privateContactRightsGranted:false;completeFollowersList:false}>;
/** Proposal only: the protected server must authorize, compare the current full
 * baseline and durably journal before signing. No empty-list creation fallback. */
export function proposePublicFollowChange(options:{original:VerifiedPublicOriginal;ownerPubkey:string;targetPubkey:string;following:boolean;createdAt:number}):Readonly<{
 type:'public-follow-change-proposal';ownerPubkey:string;targetPubkey:string;following:boolean;baselineEventId:string;changed:boolean;
 unsignedEvent:Readonly<{kind:3;created_at:number;tags:readonly (readonly string[])[];content:string}>|null;
 proposedEventFingerprint:string|null;requiresAuthoritativeBaselineCheck:true;coreIdentityAccepted:false;
 privateContactRightsGranted:false;changesPrivateSaved:false;relayWritePerformed:false;networkAtomicCompareAndSet:false;
}>;
/** Pure stale-baseline/intent check only. The server still resolves actor,
 * binding, capability and durable operation independently before signing. */
export function recheckPublicFollowChange(review:{ownerPubkey:string;targetPubkey:string;following:boolean;createdAt:number;baselineEventId:string;proposedEventFingerprint:string|null},currentOriginal:VerifiedPublicOriginal):ReturnType<typeof proposePublicFollowChange>;
export function publicCommentMatchesTarget(original:VerifiedPublicOriginal,target:PublicCommentTarget,rootTarget?:PublicCommentTarget):boolean;

export type PublicEngagementPresentation=Readonly<{targetEventId:string;likeProfiles:number;dislikeProfiles:number;repostProfiles:number;emojiReactions:readonly Readonly<{text:string;profiles:number}>[];observedEventIds:readonly string[];coverage:'observed-selected-public-sources-only';completeNetworkCount:false;countsCorePeople:false;includesProps:false}>;
export function presentPublicEngagement(target:VerifiedPublicOriginal,originals:readonly VerifiedPublicOriginal[]):PublicEngagementPresentation;
export function presentPublicEngagementBatch(targets:readonly VerifiedPublicOriginal[],originals:readonly VerifiedPublicOriginal[]):readonly PublicEngagementPresentation[];

export type PublicCommandAction='publish'|'reply'|'like'|'repost';
export type PublicActionBinding=Readonly<{status:'available';pubkey:string;revision:string;capabilities:readonly PublicCommandAction[]}>|Readonly<{status:'unavailable'}>;
export type PublicCommandReview=Readonly<{action:PublicCommandAction;unsignedEvent:Readonly<{kind:number;created_at:number;tags:readonly (readonly string[])[];content:string}>;pubkey:string;expectedBindingRevision:string;reviewedEventFingerprint:string}>;
/** Server resolves canonical identity and rights independently on EVERY call.
 * readSigningReceipt must also recheck authorization before returning a signature.
 * Durable per-account pending discovery/reconciliation must be admitted before UI writes. */
export type ProtectedPublicActionPorts=Readonly<{
 readBinding:(options:{signal:AbortSignal})=>Promise<PublicActionBinding>;
 signReviewed:(options:{review:PublicCommandReview;idempotencyKey:string;signal:AbortSignal})=>Promise<{event:PublicEvent}>;
 readSigningReceipt:(options:{idempotencyKey:string;reviewedEventFingerprint:string;signal:AbortSignal})=>Promise<{status:'signed';event:PublicEvent}|{status:'unknown'}>;
}>;
export type PublicPublicationResult=Readonly<{eventId:string;phase:'accepted'|'partial'|'unknown'|'not-published';receipts:readonly Readonly<{relay:PublicRelay;eventId:string;status:'accepted'|'rejected'|'unknown'|'not-sent';reason:string}>[];automaticRetry:false;coreBindingAccepted:false}>;
export type PublicActionSnapshot=Readonly<{phase:'unavailable'|'idle'|'review'|'checking'|'signing'|'publishing'|'failed'|'unknown'|'signed'|'accepted'|'partial'|'not-published'|'disposed';review:PublicCommandReview|null;result:PublicPublicationResult|Readonly<{event:PublicEvent;relayPublicationConfirmed:false}>|null;operationId:string|null;problem:string|null}>;
export type PublicActionController=Readonly<{
 subscribe:(listener:()=>void)=>()=>void;
 getSnapshot:()=>PublicActionSnapshot;
 getOutstanding:()=>readonly Readonly<{operationId:string;eventId:string;action:PublicCommandAction}>[];
 setContext:(context:{scope:string;writeRelays:readonly PublicRelay[]})=>void;
 prepare:(intent:{action:PublicCommandAction;target?:VerifiedPublicOriginal;content?:string;publication?:PublicPublicationDraft})=>Promise<void>;
 approve:(fingerprint:string)=>Promise<void>;
 reconcile:(id?:string)=>Promise<void>;
 resumePublication:(fingerprint:string)=>Promise<void>;
 dispose:()=>void;
}>;
export function createPublicActionController(options?:{ports?:ProtectedPublicActionPorts|null;connect?:(url:string)=>WebSocket;now?:()=>number;operationId?:()=>string}):PublicActionController;
export function preparePublicCommand(options:{binding:PublicActionBinding;action:PublicCommandAction;target?:VerifiedPublicOriginal;content?:string;publication?:PublicPublicationDraft;createdAt:number}):PublicCommandReview;
export function verifySignedPublicCommand(review:PublicCommandReview,event:unknown):PublicEvent;
export function publishReviewedPublicEvent(review:PublicCommandReview,event:PublicEvent,options:{relays:readonly PublicRelay[];signal?:AbortSignal;connect?:(url:string)=>WebSocket;timeoutMs?:number;fetchRelayInfo?:typeof fetch}):Promise<PublicPublicationResult>;

export type PublicDraftMedia=Readonly<{url:string;mimeType:string;alt?:string;previewURL?:string;sha256?:string;width?:number;height?:number}>;
export function createPublicPlaybackCoordinator(options?:{isCurrent?:()=>boolean}):Readonly<{register:(ports:{pause:()=>void;isAllowed?:()=>boolean})=>Readonly<{claim:()=>boolean;release:()=>void}>;pauseAll:()=>boolean;dispose:()=>void}>;
export function readPublicMediaDraftStorage(value:unknown):Readonly<{status:'ready';media:readonly PublicDraftMedia[];problem:null}>|Readonly<{status:'unavailable';media:null;problem:'stored-public-media-needs-review'}>;
export type PublicPublicationDraft=Readonly<{format:'note'|'article'|'image'|'video'|'audio';text:string;title?:string;summary?:string;identifier?:string;media:readonly PublicDraftMedia[];warning?:string;audience:'Public';access:'Free';shortVideo?:boolean;expiresAt?:number}>;
export function snapshotPublicPublicationDraft(input:unknown):PublicPublicationDraft;
export function publicPublicationEvent(input:PublicPublicationDraft,createdAt:number):PublicCommandReview['unsignedEvent'];

export function publicPublicationDraftIdentity(input:PublicPublicationDraft):string;
export function publicReviewDraftIdentity(review:PublicCommandReview):string;

export type PublicProfileStore=Readonly<{
 scope:string;
 subscribe:(listener:()=>void)=>()=>void;
 getSnapshot:()=>number;
 get:(pubkey:string)=>PublicProfilePresentation|undefined;
 merge:(profiles:ReadonlyMap<string,PublicProfilePresentation>)=>void;
 acquire:(request:{scope:string;authors:readonly string[];relays:readonly PublicRelay[]})=>()=>void;
}>;
export function createPublicProfileStore(scope:string,transport?:{loadProfiles?:typeof readPrimalPublicProfiles}):PublicProfileStore;
export function publicNostrLink(value:unknown):Extract<PublicTextPart,{type:'profile'|'reference'}>|null;
export function remarkPublicNostrReferences():(tree:unknown)=>void;

export type PrimalReportedEngagement=Readonly<{eventId:string;likes:number;replies:number;reposts:number;zaps:number;satszapped:number;providerReported:true;cryptographicallyVerifiedCounts:false;completeNetworkCount:false;includesProps:false;actualPaymentProof:false}>;
export const PRIMAL_ENGAGEMENT_SOURCE:Readonly<{provider:'primal';transport:'public-event-statistics-cache';url:'wss://cache2.primal.net/v1'}>;
export type PrimalPublicEngagementResult=Readonly<{source:typeof PRIMAL_ENGAGEMENT_SOURCE;selection:Readonly<{eventIds:readonly string[]}>;entries:readonly PrimalReportedEngagement[];problem:string|null;requestComplete:boolean;disabled:boolean;providerReported:true;cryptographicallyVerifiedCounts:false;completeNetworkCount:false;includesProps:false;actualPaymentProof:false}>;
export function readPrimalPublicEngagement(options:{eventIds:readonly string[];relays:readonly PublicRelay[];signal?:AbortSignal},transport?:{connect?:(url:string)=>WebSocket;timeoutMs?:number;now?:()=>number}):Promise<PrimalPublicEngagementResult>;

export type PublicZapTarget=Readonly<{schema:'crays.public-zap-target.v1';eventId:string;authorPubkey:string;state:'unavailable'|'recipients-declared';problem:string|null;recipients:readonly Readonly<{pubkey:string;weight:number;totalWeight:number;name:string|null;profileEventId:string|null;lightningAddress:string|null;endpointURL:string|null;state:'excluded'|'profile-unavailable'|'payment-address-unavailable'|'address-declared';providerCapabilityVerified:false}>[];actualPaymentEnabled:false;includesProps:false;annualQualificationGranted:false;realCoreAuthority:false}>;
export function presentPublicZapTarget(options:{target:VerifiedPublicOriginal;profiles?:readonly PublicProfilePresentation[];relays:readonly PublicRelay[]}):PublicZapTarget;

export const PUBLIC_RELAY_CLIENTS:readonly Readonly<{id:string;name:string;relays:readonly PublicRelay[]}>[];
export const DEFAULT_PUBLIC_RELAYS:readonly PublicRelay[];
export const PUBLIC_WRITE_RELAYS:readonly PublicRelay[];
export const MAX_PUBLIC_READ_RELAYS:20;
export function normalizePublicRelayURL(value:unknown):PublicRelay|null;
export function isPublicReadRelay(value:unknown):value is PublicRelay;
export function snapshotPublicReadRelays(value:unknown):readonly PublicRelay[];
export function publicRelayLabel(url:string):string;

export type PublicSourceChoice=Readonly<{id:string;name:string;relays:readonly PublicRelay[];selected:boolean}>;
export function resolvePublicReadPreferences(draft?:Record<string,string>,sources?:readonly {category:string;removed:boolean;read:boolean;feed:boolean;name:string;url:string}[]):Readonly<{relays:readonly PublicRelay[];choices:readonly PublicSourceChoice[];problem:string|null}>;
export function togglePublicReadChoice(draft:Record<string,string>,sources:readonly {category:string;removed:boolean;read:boolean;feed:boolean;name:string;url:string}[],id:string,exclusive?:boolean):string;

export function createPublicQuoteDraft(options:{target:VerifiedPublicOriginal;text?:string}):PublicPublicationDraft;
export function createPublicQuoteDraftStore(scope:string):Readonly<{scope:string;get:(eventId:string)=>string;set:(eventId:string,text:string)=>void;discard:(eventId:string)=>void;clear:()=>void}>;

/** Independent protected public-upload admission, not private encrypted storage.
 * This DTO is never authority by itself: the protected signer/server must resolve
 * the canonical actor, current grant and exact reviewed server/hash independently.
 */
export interface PublicUploadBinding {
 readonly status:'available'; readonly pubkey:string; readonly revision:string;
 readonly capabilities:readonly string[]; readonly uploadOrigin:string;
 readonly publicOrigins:readonly string[]; readonly maximumBytes:number;
}
export interface PublicUploadBindingSnapshot {
 readonly status:'available'; readonly pubkey:string; readonly revision:string;
 readonly capability:'public-blob-upload'; readonly uploadOrigin:string;
 readonly publicOrigins:readonly string[]; readonly maximumBytes:number;
}
export interface PublicBlobMetadata {readonly sha256:string;readonly size:number;readonly mimeType:string}
export interface PublicUploadUnsignedEvent {readonly kind:24242;readonly created_at:number;readonly tags:readonly (readonly string[])[];readonly content:string}
export interface PublicUploadReview {
 readonly action:'public-blob-upload';readonly file:Blob;readonly metadata:PublicBlobMetadata;
 readonly binding:PublicUploadBindingSnapshot;readonly bindingFingerprint:string;
 readonly pubkey:string;readonly expectedBindingRevision:string;
 readonly unsignedEvent:PublicUploadUnsignedEvent;readonly reviewedEventFingerprint:string;
 readonly uploadAuthorized:false;readonly publicationAuthorized:false;
}
export interface PublicUploadSignedEvent extends PublicUploadUnsignedEvent {readonly id:string;readonly pubkey:string;readonly sig:string}
/** Canonical BUD02 wire shape. Different from normalized presentation data. */
export interface PublicBlobWireDescriptor {readonly url:string;readonly sha256:string;readonly size:number;readonly type:string;readonly uploaded:number}
export interface PublicBlobValidatedDescriptor {
 readonly url:string;readonly sha256:string;readonly size:number;readonly mimeType:string;
 readonly uploaded:number;readonly originalMimeType:string;readonly mimeDeclarationMatches:boolean;
 readonly descriptorMatchesOriginal:true;readonly remoteBytesVerified:false;readonly availabilityVerified:false;
 readonly uploadAuthorized:false;readonly publicationAuthorized:false;
}
export interface PublicUploadOptions {
 readonly readBinding: (request:{signal:AbortSignal})=>PublicUploadBinding|Promise<PublicUploadBinding>;
 readonly signal?:AbortSignal; readonly fetch?:typeof globalThis.fetch;
 /** One overall deadline for binding/hash/request/response. 100..20000ms. */
 readonly timeoutMs?:number;
}
export type PublicUploadResult = {
 readonly phase:'uploaded';readonly descriptor:PublicBlobWireDescriptor;readonly validatedDescriptor:PublicBlobValidatedDescriptor;
 readonly httpStatus:number;readonly uploadReceiptMatchesReviewedBytes:true;readonly remoteBytesVerified:false;
 readonly publicationAuthorized:false;readonly coreBindingAccepted:false;readonly automaticRetry:false;
}|{
 readonly phase:'rejected';readonly httpStatus:number;readonly sha256:string;
 readonly publicationAuthorized:false;readonly automaticRetry:false;readonly remoteAbsenceProven:false;
}|{
 readonly phase:'unknown';readonly sha256:string|null;readonly problem:string;
 readonly automaticRetry:false;readonly publicationAuthorized:false;readonly remoteAbsenceProven:false;
};
export interface PublicUploadedBlobVerification {
 readonly descriptor:PublicBlobValidatedDescriptor;readonly sha256:string;readonly size:number;
 readonly remoteBytesVerified:true;readonly mimeContentVerified:false;readonly availabilityVerifiedAt:number;
 readonly futureAvailabilityGuaranteed:false;readonly publicationAuthorized:false;readonly coreBindingAccepted:false;
}
export function snapshotPublicUploadBinding(binding:PublicUploadBinding):PublicUploadBindingSnapshot;
export function preparePublicBlobUpload(input:{file:Blob;binding:PublicUploadBinding;createdAt:number;signal?:AbortSignal}):Promise<PublicUploadReview>;
export function uploadReviewedPublicBlob(review:PublicUploadReview,signed:PublicUploadSignedEvent,options:PublicUploadOptions):Promise<PublicUploadResult>;
/** Recheck bytes by explicit public GET. Does not reuse the upload token. */
export function verifyUploadedPublicBlob(review:PublicUploadReview,descriptor:PublicBlobWireDescriptor,options:PublicUploadOptions):Promise<PublicUploadedBlobVerification>;
