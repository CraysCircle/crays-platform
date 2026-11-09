import type {NostrEvent,EventTemplate} from 'nostr-tools';
export type PrivateInboxSigner={getPublicKey():Promise<string>;signEvent(event:EventTemplate):Promise<NostrEvent>;nip44:{decrypt(pubkey:string,ciphertext:string):Promise<string>}};
export type PrivateInboxRumor={id:string;pubkey:string;kind:14;created_at:number;tags:string[][];content:string};
export function unwrapPrivateInboxEvent(options:{event:NostrEvent;recipient:string;signer:PrivateInboxSigner;isCurrent:()=>boolean}):Promise<Readonly<PrivateInboxRumor>>;
export class OwnedPrivateInboxPeer{
 constructor(options:{spotId:string;registry:Array<{spotId:string;operator:string;scope:string;url:string}>;recipient:string;signer:PrivateInboxSigner;isCurrent:()=>boolean;signal:AbortSignal;WebSocket?:typeof WebSocket;fetch?:typeof fetch});
 readonly url:string;
 ready():Promise<void>;
 readOriginals(ids:string[]):Promise<NostrEvent[]>;
 supportsHistoryCursor():Promise<boolean>;
 readInboxBefore(options?:{limit?:number;before?:{id:string;created_at:number}|null}):Promise<NostrEvent[]>;
 readInbox(options?:{limit?:number;since?:number;until?:number}):Promise<NostrEvent[]>;
 publishPrivate(event:NostrEvent):Promise<{eventId:string;accepted:boolean}>;
 close():void;
}
