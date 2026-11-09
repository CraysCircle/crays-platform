import type {HistoryVisibility,HistoryVisibilityBinding} from './historyVisibility.mjs';
type Journal={getItem(key:string):Promise<any>;setItem(key:string,value:any):Promise<unknown>;removeItem(key:string):Promise<unknown>;keys():Promise<string[]>};
/** Prepared SDK-backend boundary. A source proof is supplied by the current SDK
 * session, never by a cached row or a client-selected membership. Missing legacy
 * captures require source-backed recovery; no implicit generation migration.
 * Terminal purge requires its separately supplied exact-scope permission and
 * grants no decoded-history reads. Projected caches and browser SDK adoption
 * remain separate requirements.
 */
export function openFencedSdkRumorStore(options:{binding:HistoryVisibilityBinding;journal:Journal;exclusive:<T>(key:string,operation:()=>Promise<T>,signal:AbortSignal)=>Promise<T>;authorize:(binding:HistoryVisibilityBinding)=>boolean;authorizePurge?:(binding:HistoryVisibilityBinding)=>boolean;validateRumor:(value:any)=>any;verifyOriginal:(id:string)=>Promise<unknown|null|undefined>;signal:AbortSignal;crypto?:Crypto;newId?:()=>string}):Promise<Readonly<{
 binding:HistoryVisibilityBinding;visibility:HistoryVisibility;
 getItem(key:string):Promise<any|null>;setItem(key:string,value:any):Promise<void>;
 keys():Promise<string[]>;removeItem(key:string):Promise<void>;clear():Promise<void>;
 recoveryDisposition(key:string,expectedSource:unknown):Promise<'unresolved'|'cleared'|'current'>;
 verifyRecoveredWrites():Promise<void>;
 flush():Promise<void>;getProblem():string|null;close():void;
}>>;
