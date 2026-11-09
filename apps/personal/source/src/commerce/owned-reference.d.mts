export type OwnedReference=Readonly<{type:'event';eventId:string}>|Readonly<{type:'address';kind:30023|34235|34236;pubkey:string;identifier:string}>;
type ReferencedEvent=Readonly<{id:string;kind:number;pubkey:string;created_at:number;tags:readonly(readonly string[])[]}>;
export function captureOwnedReference(value:unknown):OwnedReference|null;
export function ownedReferenceMatches(event:ReferencedEvent|undefined,reference?:OwnedReference|null):boolean;
export function selectOwnedReferencedBindings<T extends {spotId:string;event:ReferencedEvent}>(rows:readonly T[],reference:OwnedReference|null,selectedSpotIds:readonly string[]):readonly T[];
