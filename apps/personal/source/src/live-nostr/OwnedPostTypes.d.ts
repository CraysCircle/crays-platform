// Declaration-only host facade; runtime view model is bundled separately.
import type{PublicMedia}from'./public-feed.mjs';
export type OwnedReference=Readonly<{type:'event';eventId:string}>|Readonly<{type:'address';kind:30023|34235|34236;pubkey:string;identifier:string}>;
type ReferencedEvent=Readonly<{id:string;kind:number;pubkey:string;created_at:number;tags:readonly(readonly string[])[]}>;
export function captureOwnedReference(value:unknown):OwnedReference|null;
export function ownedReferenceMatches(event:ReferencedEvent|undefined,reference?:OwnedReference|null):boolean;
export function selectOwnedReferencedBindings<T extends {spotId:string;event:ReferencedEvent}>(rows:readonly T[],reference:OwnedReference|null,selectedSpotIds:readonly string[]):readonly T[];
export type OwnedSignedEvent=Readonly<{id:string;pubkey:string;kind:number;created_at:number;content:string;tags:readonly(readonly string[])[];sig:string}>;
export type OwnedStockAsset=Readonly<{assetId:string;sha256:string;admissionKey:string;mime:string;kind:'image'|'video'|'audio';bytes:number;publicFreeStock:true;proxyPath:string;hostedURL:string;originalURL?:string|null;sourceURL:string;licenseURL:string;dimensions:readonly number[]|null;attribution:Readonly<{required:boolean;author:string|null;text:string|null}>;review?:Readonly<Record<string,boolean>>}>;
export type OwnedMediaBinding=Readonly<{assetId:string;url:string;sha256:string;mime:string;bytes:number;width?:number;height?:number}>;
export type OwnedMediaCredit=Readonly<{assetId:string;sourceURL:string;licenseURL:string;required:boolean;author:string|null;text:string|null;review?:Readonly<Record<string,boolean>>}>;
export type OwnedMediaImage=Readonly<{url:string;declaredDimensions:{width:number;height:number};credit:OwnedMediaCredit}>;
export type OwnedFeedPost=Readonly<{spotId:string;dataOrigin:'actual-owned-spot-relay';event:OwnedSignedEvent;authorProfile:OwnedSignedEvent;media:readonly OwnedMediaBinding[]}>;
export interface OwnedMediaPresentation{
 resolveVideoURL(url:string,mime:string|null):string|null;
 post(input:OwnedFeedPost,options?:{displayMedia?:boolean}):Readonly<{event:OwnedSignedEvent;content:string;media:readonly PublicMedia[];credits:readonly OwnedMediaCredit[];contentWarning:string|null;mediaWithheld:boolean;sourceRealm:'crays-isolated-demo'}>;
 profile(event:OwnedSignedEvent):Readonly<{event:OwnedSignedEvent;picture:OwnedMediaImage|null;banner:OwnedMediaImage|null;sourceRealm:'crays-isolated-demo'}>;
}
export const OWNED_STOCK_PREFIX:'/api/crays/personal/nostr/public-stock/';
export function createOwnedMediaPresentation(options:{assets:readonly OwnedStockAsset[];assertAdmissionCurrent:(sha256:string,admissionKey:string)=>boolean}):OwnedMediaPresentation;
export type OwnedPresentationContext=Readonly<{sourceRealm:'crays-isolated-demo';scopeKey:string;generation:string;selectedSpotIds:readonly string[]}>;
export type OwnedReferenceDestination=Readonly<{type:'reference';reference:OwnedReference;label:string;href:string|null;sourceRealm:'crays-isolated-demo'}>;
export type OwnedTextPart=Readonly<{type:'text';text:string}>|Readonly<{type:'link';text:string;url:string}>|Readonly<{type:'profile';pubkey:string;label:string;href:string;sourceRealm:'crays-isolated-demo'}>|OwnedReferenceDestination;
export type OwnedPostView=OwnedPresentationContext&Readonly<{
 schema:'crays.owned-post-presentation.v1';contextKey:string;original:OwnedSignedEvent;spotId:string;
 author:Readonly<{pubkey:string;name:string;profilePath:string;pictureURL:string|null;pictureCredit:OwnedMediaCredit|null}>;
 originalPath:string;createdAtSeconds:number;title:string|null;summary:string|null;body:Readonly<{format:'markdown'|'plain';text:string}>;parts:readonly OwnedTextPart[];
 contentWarning:string|null;requiresReveal:boolean;media:readonly PublicMedia[];credits:readonly OwnedMediaCredit[];quotes:readonly OwnedReferenceDestination[];inReplyTo:OwnedReferenceDestination|null;
 realCoreAuthority:false;publicRelaysContacted:false;
}>;
export interface OwnedPostPresentation{
 isCurrent(view:OwnedPostView|null|undefined):boolean;
 post(input:OwnedFeedPost,options?:{revealed?:boolean}):OwnedPostView|null;
}
export function createOwnedPostPresentation(options:{media:OwnedMediaPresentation;getContext:()=>OwnedPresentationContext;resolveKnownProfile?:(pubkey:string)=>OwnedSignedEvent|null|undefined}):OwnedPostPresentation;
