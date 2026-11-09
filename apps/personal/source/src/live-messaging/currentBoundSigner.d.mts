export type CurrentSignerBinding=Readonly<{accountId:string;pubkey:string;bindingFingerprint:string}>;
export type SigningTemplate=Readonly<{kind:number;created_at:number;tags:readonly(readonly string[])[];content:string;pubkey?:string}>;
export type SignedEvent={kind:number;created_at:number;tags:string[][];content:string;pubkey:string;id:string;sig:string};
export type SignerOperation=Readonly<{kind:'identity'}|{kind:'sign';event:SigningTemplate}|{kind:'encrypt'|'decrypt';pubkey:string;payload:string}>;
export type PublicMessagingIdentity=CurrentSignerBinding&{publicBindingVerified:boolean;emailVerificationRequired:boolean};
export interface NonexportingSignerProvider {
 getPublicKey():Promise<string>;
 signEvent(event:SigningTemplate):Promise<SignedEvent>;
 nip44?:{encrypt?(pubkey:string,text:string):Promise<string>;decrypt?(pubkey:string,text:string):Promise<string>};
}
export interface CurrentBoundSigner extends NonexportingSignerProvider {
 readonly binding:CurrentSignerBinding;
 readonly signal:AbortSignal;
 close():void;
 nip44:{encrypt(pubkey:string,text:string):Promise<string>;decrypt(pubkey:string,text:string):Promise<string>};
}
export function createCurrentBoundSigner(options:{binding:CurrentSignerBinding;provider:NonexportingSignerProvider;readIdentity:(accountId:string)=>Promise<PublicMessagingIdentity>;isCurrent:(binding:CurrentSignerBinding)=>boolean;authorizeOperation:(binding:CurrentSignerBinding,operation:SignerOperation)=>boolean;signal:AbortSignal;timeoutMs?:number}):CurrentBoundSigner;
