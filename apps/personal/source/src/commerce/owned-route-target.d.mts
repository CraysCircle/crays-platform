import type{OwnedReference}from'./owned-reference.mjs';
export type OwnedRouteTarget=Readonly<{type:'profile';pubkey:string}>|Readonly<{type:'reference';reference:OwnedReference}>;
export type OwnedRouteRecognition=Readonly<{schema:'crays.owned-route-recognition.v1';target:OwnedRouteTarget;recognized:boolean;matchingSelectedSpotIds:readonly string[];publicFallbackPermitted:false;publicQueriesMade:false;originalRead:false;actualCoreAuthority:false}>;
export function captureOwnedRouteTarget(value:unknown):OwnedRouteTarget;
export function validOwnedRouteRecognition(value:unknown,target:OwnedRouteTarget,selectedSpotIds:readonly string[]):value is OwnedRouteRecognition;
