import type {ChuckOriginalRequest,ChuckSourceCursor} from './requests.mjs';
import type {PersonalChuckTask} from './tasks.mjs';
export type ChuckTaskSnapshot={phase:string;tasks:PersonalChuckTask[];hasMore:boolean;detail:PersonalChuckTask|null;problem:string|null;source:(ChuckOriginalRequest&{hasOriginals?:boolean;originals?:readonly import('./originals.mjs').ChuckOriginalReference[]})|null;sourcePhase:string;sourceCursor:ChuckSourceCursor|null};
export class PersonalChuckTaskController{
 constructor(config:{execute:(name:string,variables?:Record<string,unknown>,control?:{signal?:AbortSignal})=>Promise<unknown>;includeOriginals?:boolean});
 subscribe:(listener:()=>void)=>()=>void;getSnapshot:()=>ChuckTaskSnapshot;setContext(scope:string):void;invalidateAccess():void;cancelRead(taskId:string):void;load():Promise<void>;loadOlder():Promise<void>;openSource(options?:{earlier?:boolean}):Promise<ChuckOriginalRequest|null|undefined>;open(taskId:string):Promise<PersonalChuckTask|undefined>;dispose():void;
}
