import type {NonexportingSignerProvider} from './currentBoundSigner.mjs';
export function createCurrentHostSigner(options:{accountId:string;isCurrent(accountId:string):boolean;signal:AbortSignal;fetcher?:typeof fetch}):NonexportingSignerProvider&{close():void};
