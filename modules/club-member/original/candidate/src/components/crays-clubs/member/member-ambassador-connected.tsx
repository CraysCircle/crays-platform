"use client";
/** NEXT_DEPLOYMENT. Only the genuine owner-bound BFF supplies reader and scope. */
import {useEffect,useMemo,useSyncExternalStore,type ReactNode} from "react";
import styles from "./member-ambassador-connection.module.css";
import {MemberAmbassadorWorkspace} from "./member-ambassador-workspace";
import {AmbassadorOwnResource,type AmbassadorOwnReader,type AmbassadorOwnScope} from "./member-ambassador-resource";
import type {AmbassadorReviewPort} from "./member-ambassador-review-ledger";
import {parseAmbassadorRoute,ambassadorRouteHash} from "./member-ambassador-route";
export type MemberAmbassadorConnection=Readonly<{reader:AmbassadorOwnReader;scope:AmbassadorOwnScope;requestPort?:AmbassadorReviewPort}>;
export function MemberAmbassadorConnected({connection=null,route,programme,onRoute,onMessages}:{connection?:MemberAmbassadorConnection|null;route:string;programme:ReactNode;onRoute(hash:string):void;onMessages(originalId:string):void}) {
 const scopeKey=connection?.scope.scopeKey??null,generationKey=connection?.scope.generationKey??null,reader=connection?.reader??null;
 const resource=useMemo(()=>new AmbassadorOwnResource(scopeKey&&generationKey?{scopeKey,generationKey}:null),[scopeKey,generationKey]);
 const state=useSyncExternalStore(resource.subscribe,resource.getSnapshot,resource.getServerSnapshot);
 useEffect(()=>{void resource.load(reader,scopeKey&&generationKey?{scopeKey,generationKey}:null);return()=>resource.clear();},[resource,reader,scopeKey,generationKey]);
 const target=parseAmbassadorRoute(route);
 if(target.kind==="programme")return <>{programme}</>;
 if(target.kind==="invalid")return <section aria-label="Ambassador navigation"><p role="status">We can’t open this Ambassador link. Choose a fresh view.</p><button type="button" onClick={()=>onRoute(ambassadorRouteHash("overview"))}>Back to your Ambassador desk</button></section>;
 if(state.kind==="ready")return <MemberAmbassadorWorkspace key={JSON.stringify([scopeKey,generationKey,state.data.profile.originalId])} data={state.data} view={target.view} selectedOriginalId={target.originalId} onView={(view,id=null)=>onRoute(ambassadorRouteHash(view,id))} onSelection={id=>onRoute(ambassadorRouteHash(target.view,id))} onMessages={onMessages} requestPort={connection?.requestPort} showHeading={false}/>;
 const messages={loading:"Bringing your Ambassador desk together…",not_authenticated:"Sign in to open your personal Ambassador desk.",not_admitted:"Your Ambassador access hasn’t been released for this account.",revoked:"Your Ambassador access is no longer active. Contact CRAYS for help.",dependency_pending:"Your personal Ambassador connection is being prepared.",unavailable:"We couldn’t load your Ambassador desk. Give it another go."};
 return <><section className={state.kind==="dependency_pending"&&target.view==="overview"&&target.originalId===null?styles.programmeNotice:undefined} data-release-target="next-deployment" aria-label="Ambassador connection"><p role="status">{messages[state.kind]}</p>{state.kind==="unavailable"?<button type="button" onClick={()=>void resource.load(reader,scopeKey&&generationKey?{scopeKey,generationKey}:null)}>Try again</button>:null}</section>{target.view==="overview"&&target.originalId===null?programme:<button type="button" onClick={()=>onRoute("#ambassador/programme")}>Explore the programme</button>}</>;
}
