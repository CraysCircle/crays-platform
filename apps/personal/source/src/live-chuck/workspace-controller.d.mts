export type WorkspaceRecommendation={id:string;version:string;kind:'recommendation';provenance:string;createdAt:string;updatedAt:string;contentSHA256:string;profilePath:string;sources:readonly {kind:string;id:string;version:string;sha256:string}[];payload:{title:string;summary:string;purpose:string;state:string;rationale:readonly string[];person:{namespace:string;personId:string;pubkey:string;profileVersion:string;profileSHA256:string}}};
export type WorkspaceSnapshot={phase:'idle'|'loading'|'ready'|'unavailable';records:readonly WorkspaceRecommendation[];detail:WorkspaceRecommendation|null;hasMore:boolean;nextAfter:{id:string;version:string}|null;problem:string|null};
export class PersonalChuckWorkspaceController{
 constructor(options:{fetch?:typeof globalThis.fetch;accountScope:string;assertCurrent:()=>void;seedTestDataRequested?:boolean});
 getSnapshot:()=>WorkspaceSnapshot;
 subscribe:(listener:()=>void)=>()=>void;
 load(options?:{more?:boolean}):Promise<unknown>;
 open(id:string):Promise<unknown>;
 invalidateAccess():void;
 dispose():void;
}
