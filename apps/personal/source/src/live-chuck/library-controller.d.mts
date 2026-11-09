import type {ChuckOriginalReference} from './originals.mjs';
export type ChuckLibraryItem=Readonly<{key:string;sourceMessageId:string;sourceReceiptId:string;requestedAt:string;reference:ChuckOriginalReference}>;
export type ChuckLibrarySnapshot=Readonly<{phase:'idle'|'loading'|'loading-older'|'ready'|'unavailable';items:readonly ChuckLibraryItem[];hasMore:boolean;problem:string|null;checkedAt:string|null}>;
export class PersonalChuckLibraryController{
 constructor(config:{execute:(name:string,variables?:Record<string,unknown>,control?:{signal?:AbortSignal})=>Promise<unknown>});
 subscribe:(listener:()=>void)=>()=>void;getSnapshot:()=>ChuckLibrarySnapshot;setContext(scope:string):void;invalidateAccess():void;load(options?:{more?:boolean}):Promise<void>;dispose():void;
}
