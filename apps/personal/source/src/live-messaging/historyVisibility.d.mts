export type HistoryVisibilityBinding=Readonly<{kind:'person'|'spot'|'circle';accountId:string;conversationId:string;groupId:string;pubkey:string;membershipId:string}>;
export type HistoryVisibility=Readonly<{
 getSnapshot():Readonly<{available:boolean;generation:number|null;revision:number|null;pending:number;problem:string|null}>;
 isVisible(row:{id:string;historyGeneration?:number}):boolean;
 subscribe(listener:()=>void):()=>void;
 withdraw(id:string):Promise<void>;
 /** Only the SDK backend may supply a retained, durable operation token. */
 clear(options?:{operationId:string}):Promise<void>;
 restore(id:string):Promise<void>;
 retry():Promise<void>;
 refresh():Promise<void>;
 flush():Promise<void>;
 close():void;
}>;
/** The admitted SDK adapter supplies current saved-original provenance. This
 * metadata classifier does not validate MLS, create an original or grant access.
 * Callers must fence live SDK changes and stamp validated materializations only.
 */
export function openHistoryVisibility(options:{binding:HistoryVisibilityBinding;journal:{getItem(key:string):Promise<unknown>;setItem(key:string,value:unknown):Promise<unknown>};exclusive:<T>(key:string,operation:()=>Promise<T>,signal:AbortSignal)=>Promise<T>;authorize:(binding:HistoryVisibilityBinding)=>boolean;authorizePurge?:(binding:HistoryVisibilityBinding)=>boolean;signal:AbortSignal;verifyOriginal:(id:string)=>Promise<unknown|null>;newId?:()=>string}):Promise<HistoryVisibility>;
