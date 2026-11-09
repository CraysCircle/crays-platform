import type {CurrentSignerBinding} from './currentBoundSigner.mjs';
export type AccountDataKeyCache=Readonly<{close():void;get(request:{binding:CurrentSignerBinding;namespace:string;signal:AbortSignal;isCurrent:()=>boolean},open:()=>Promise<CryptoKey>):Promise<CryptoKey>}>;
export function createAccountDataKeyCache(options:{binding:CurrentSignerBinding;signal:AbortSignal;isCurrent:(binding:CurrentSignerBinding)=>boolean}):AccountDataKeyCache;
