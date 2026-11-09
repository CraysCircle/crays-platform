import {chuckFileSize,chuckFileType} from './chuckFilePresentation';
import './chuck-upload-status.css';
import {ChuckOriginalMessageLocator,validChuckMessageId} from './live-chuck/message-locator.mjs';
import {chuckScopeAuthorityLost} from './live-chuck/scope-revocation.mjs';
import {personalNavigationLocation} from './webPersonalNavigation';
import {PersonalWorkspaceActionController,type WorkspaceActionSnapshot} from './live-chuck/workspace-actions.mjs';
import {PersonalChuckWorkspaceController,type WorkspaceSnapshot} from './live-chuck/workspace-controller.mjs';
import {PersonalChuckLibraryController,type ChuckLibrarySnapshot} from './live-chuck/library-controller.mjs';
import ChuckMessageBody from './ChuckMessageBody';
import WebChuckTaskDetailLayout from './WebChuckTaskDetailLayout';
import './chuck-task-actions.css';
import {PersonalChuckTaskDecisionController,type ChuckTaskDecisionSnapshot} from './live-chuck/task-decision-controller.mjs';
import {MessageAvatar} from './live-messaging/WebHumanConversation';
import './chuck-vifs-layout.css';
import {createContext,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {PersonalChuckController,type ChuckSnapshot,type ChuckPending} from './live-chuck/controller.mjs';
import {resolveChuckWebContext} from './live-chuck/context.mjs';
import {createChuckFetchTransport} from './live-chuck/protocol.mjs';
import {createOriginalUploadTransport} from './live-chuck/upload-transport.mjs';
import {captureOriginalUploadCommand,type OriginalUploadDescriptor} from './live-chuck/upload-command.mjs';
import {Paperclip,ArrowUp,X} from '@phosphor-icons/react';
import {PersonalChuckArchiveController,type ChuckArchiveSnapshot} from './live-chuck/archive-controller.mjs';
import {PersonalChuckTaskController,type ChuckTaskSnapshot} from './live-chuck/task-controller.mjs';
import type {PersonalChuckTask} from './live-chuck/tasks.mjs';
import {createChuckPendingJournal,createChuckTaskDecisionJournal,createChuckWorkspaceActionJournal} from './live-chuck/journal.mjs';
import {createChuckOriginalReader,type ChuckOriginalReader} from './live-chuck/original-reader.mjs';
import {isOriginalLocallyRetained,NATIVE_ORIGINAL_TRANSFER_MAX_BYTES,ORIGINAL_MIME_TYPES,type ChuckOriginalReference} from './live-chuck/originals.mjs';

export type WebChuckRuntime={workspaceActions:PersonalWorkspaceActionController|null;workspaceActionSnapshot:WorkspaceActionSnapshot;workspace:PersonalChuckWorkspaceController|null;workspaceSnapshot:WorkspaceSnapshot;library:PersonalChuckLibraryController|null;librarySnapshot:ChuckLibrarySnapshot;decisions:PersonalChuckTaskDecisionController|null;decisionSnapshot:ChuckTaskDecisionSnapshot;controller:PersonalChuckController|null;snapshot:ChuckSnapshot;tasks:PersonalChuckTaskController|null;archive:PersonalChuckArchiveController|null;taskSnapshot:ChuckTaskSnapshot;readOriginal:ChuckOriginalReader|null;invalidateAccess:()=>void;submit:(body:string)=>Promise<boolean>;refreshContext:()=>void};
const Context=createContext<WebChuckRuntime|undefined>(undefined);
const initial:ChuckSnapshot=Object.freeze({phase:'idle',setup:null,conversation:null,messages:[],pending:null,latestReceipt:null,problem:null,canRetryOriginal:false});
const initialTasks:ChuckTaskSnapshot=Object.freeze({phase:'idle',tasks:[],hasMore:false,detail:null,problem:null,source:null,sourcePhase:'idle',sourceCursor:null});
const initialWorkspaceAction:WorkspaceActionSnapshot=Object.freeze({phase:"idle",pending:null,current:null,receipt:null,problem:null,archive:[],archiveHasMore:false,archiveAfter:null,blockedOriginalKey:null});
const initialWorkspace:WorkspaceSnapshot=Object.freeze({phase:'idle',records:[],detail:null,hasMore:false,nextAfter:null,problem:null});
const initialLibrary:ChuckLibrarySnapshot=Object.freeze({phase:'idle',items:[],hasMore:false,problem:null,checkedAt:null});
const initialDecisions:ChuckTaskDecisionSnapshot={phase:'idle',task:null,pending:null,latestReceipt:null,canRetryOriginal:false,problem:null};
const emptySubscribe=()=>()=>{};
export const useWebChuck=()=>useContext(Context);
const conversationVisible=()=>[...document.querySelectorAll('[data-live-chuck-conversation]')].some(node=>node.getClientRects().length&&!node.closest('[data-flow-current="false"]'));
const conversationReviewActive=()=>{
 const scope=document.querySelector('dialog:modal')??document;
 return [...scope.querySelectorAll('.chuck-connection-status')].some(region=>{
  if(!region.getClientRects().length||region.closest('[data-flow-current="false"],[inert],[hidden]'))return false;
  return region.contains(document.activeElement)||[...region.querySelectorAll('details[open]')].some(review=>review.getClientRects().length>0);
 });
};

/** General Web scope triggers lifecycle reset only. Authenticated Personal-Core
 * bootstrap supplies actual custody scope; every operation rechecks SDK/Core. */
export function WebPersonalChuckProvider({accountScope,children}:{accountScope:string;children:ReactNode}){
 const [holder,setHolder]=useState<{loginScope:string;scope:string;workspaceActions:PersonalWorkspaceActionController|null;workspace:PersonalChuckWorkspaceController;controller:PersonalChuckController|null;library:PersonalChuckLibraryController;tasks:PersonalChuckTaskController;decisions:PersonalChuckTaskDecisionController|null;archive:PersonalChuckArchiveController|null;readOriginal:ChuckOriginalReader}|null>(null);
 const [bootstrap,setBootstrap]=useState({loginScope:accountScope,phase:'loading',problem:null as string|null}),[retry,setRetry]=useState(0);
 const canonicalForLogin=useRef<{loginScope:string;scope:string}|null>(null);
 const workspace=holder?.loginScope===accountScope?holder.workspace:null;
 const workspaceActions=holder?.loginScope===accountScope?holder.workspaceActions:null;
 const library=holder?.loginScope===accountScope?holder.library:null;
 const decisions=holder?.loginScope===accountScope?holder.decisions:null;
 const controller=holder?.loginScope===accountScope?holder.controller:null,tasks=holder?.loginScope===accountScope?holder.tasks:null,archive=holder?.loginScope===accountScope?holder.archive:null;
 useEffect(()=>{
  const abort=new AbortController();let decisionJournal:ReturnType<typeof createChuckTaskDecisionJournal>|undefined,decisionController:PersonalChuckTaskDecisionController|undefined;
  let journal:ReturnType<typeof createChuckPendingJournal>|undefined,next:PersonalChuckController|undefined,taskController:PersonalChuckTaskController|undefined,archiveController:PersonalChuckArchiveController|undefined,libraryController:PersonalChuckLibraryController|undefined,workspaceController:PersonalChuckWorkspaceController|undefined;
  let actionJournal:ReturnType<typeof createChuckWorkspaceActionJournal>|undefined,actionController:PersonalWorkspaceActionController|undefined;
  const dispose=()=>{actionController?.dispose();if(actionJournal)void actionJournal.close();workspaceController?.dispose();libraryController?.dispose();decisionController?.dispose();if(decisionJournal)void decisionJournal.close();next?.dispose();taskController?.dispose();archiveController?.dispose();if(journal)void journal.close();};
  setHolder(null);setBootstrap({loginScope:accountScope,phase:'loading',problem:null});
  void(async()=>{
   try{
    const context=await resolveChuckWebContext({signal:abort.signal});if(abort.signal.aborted)return;
    const pinned=canonicalForLogin.current;if(pinned?.loginScope===accountScope&&pinned.scope!==context.accountScope)throw Object.assign(new Error('session-context-changed'),{code:'session-context-changed'});
    canonicalForLogin.current={loginScope:accountScope,scope:context.accountScope};const execute=createChuckFetchTransport({accountScope:context.accountScope});
    const originalUpload=createOriginalUploadTransport({accountScope:context.accountScope});
    const upload:typeof originalUpload=async(...args)=>{try{return await originalUpload(...args);}catch(error){if(['access-denied','binding-revoked','binding-changed','contact-changed'].includes((error as {code?:string})?.code??'')){actionController?.invalidateAccess();taskController?.invalidateAccess();archiveController?.clear();decisionController?.invalidateAccess();libraryController?.invalidateAccess();workspaceController?.invalidateAccess();}throw error;}};
    taskController=new PersonalChuckTaskController({execute,includeOriginals:true});taskController.setContext(context.accountScope);
    libraryController=new PersonalChuckLibraryController({execute:async(...args)=>{try{return await execute(...args);}catch(error){if(['access-denied','binding-revoked','binding-changed','contact-changed'].includes((error as {code?:string})?.code??'')){actionController?.invalidateAccess();next?.invalidateAccess();taskController?.invalidateAccess();archiveController?.clear();decisionController?.invalidateAccess();libraryController?.invalidateAccess();workspaceController?.invalidateAccess();}throw error;}}});libraryController.setContext(context.accountScope);

    workspaceController=new PersonalChuckWorkspaceController({seedTestDataRequested:true,accountScope:context.accountScope,assertCurrent:()=>{if(abort.signal.aborted)throw Object.assign(new Error('context-changed'),{code:'context-changed'});}});
    const readOriginal=createChuckOriginalReader({accountScope:context.accountScope});
    // Authoritative reads do not depend on this browser's pending-send store.
    // Each read retains the freshly verified canonical Core context and guards.
    setHolder({loginScope:accountScope,scope:context.accountScope,workspaceActions:null,workspace:workspaceController,controller:null,library:libraryController,tasks:taskController,decisions:null,archive:null,readOriginal});
    setBootstrap({loginScope:accountScope,phase:'loading',problem:null});
    try{
     journal=createChuckPendingJournal();
     if(!await journal.claimContext(accountScope,context.accountScope))throw Object.assign(Error('pending-context-changed'),{code:'pending-context-changed'});
     if(abort.signal.aborted){dispose();return;}
     next=new PersonalChuckController({execute,journal,includeOriginals:true,upload});next.setContext(context.accountScope);
     archiveController=new PersonalChuckArchiveController({execute,journal,includeOriginals:true});archiveController.setContext(context.accountScope);
     const readyConversation=next,readyArchive=archiveController;
     setHolder(previous=>previous&&previous.workspace===workspaceController?{...previous,controller:readyConversation,archive:readyArchive}:previous);
     setBootstrap({loginScope:accountScope,phase:'ready',problem:null});
    }catch(error){
     // Keep every unresolved original untouched; do not send, clear, rebind,
     // replace a key or reuse a different account's journal to recover reads.
     next?.dispose();next=undefined;archiveController?.dispose();archiveController=undefined;
     if(journal)void journal.close();journal=undefined;
     if(abort.signal.aborted){dispose();return;}
     setBootstrap({loginScope:accountScope,phase:'storage-error',problem:(error as {code?:string})?.code==='pending-context-changed'?'pending-context-changed':'pending-storage'});
    }
    // Workspace command custody is independent of the conversation journal.
    try{
     actionJournal=createChuckWorkspaceActionJournal();if(!await actionJournal.claimContext(accountScope,context.accountScope))throw Object.assign(Error('context-changed'),{code:'context-changed'});
     if(abort.signal.aborted){dispose();return;}
     actionController=new PersonalWorkspaceActionController({accountScope:context.accountScope,journal:actionJournal,assertCurrent:()=>{if(abort.signal.aborted)throw Object.assign(Error('context-changed'),{code:'context-changed'});}});
     const readyActions=actionController;setHolder(previous=>previous&&previous.workspace===workspaceController?{...previous,workspaceActions:readyActions}:previous);
    }catch{actionController?.dispose();actionController=undefined;if(actionJournal)void actionJournal.close();actionJournal=undefined;}
    // A blocked decision journal must not disable an already admitted conversation.
    try{decisionJournal=createChuckTaskDecisionJournal();if(!await decisionJournal.claimContext(accountScope,context.accountScope))throw Object.assign(new Error('session-context-changed'),{code:'session-context-changed'});if(abort.signal.aborted){dispose();return;}
    decisionController=new PersonalChuckTaskDecisionController({execute:async(...args)=>{try{return await execute(...args);}catch(error){if(['access-denied','binding-revoked','binding-changed','contact-changed'].includes((error as {code?:string})?.code??'')){actionController?.invalidateAccess();next?.invalidateAccess();taskController?.invalidateAccess();archiveController?.clear();decisionController?.invalidateAccess();libraryController?.invalidateAccess();workspaceController?.invalidateAccess();}throw error;}},journal:decisionJournal});decisionController.setContext(context.accountScope);
    if(abort.signal.aborted){dispose();return;}const readyDecisions=decisionController;setHolder(previous=>previous&&previous.workspace===workspaceController?{...previous,decisions:readyDecisions??null}:previous);
    }catch{decisionController?.dispose();decisionController=undefined;if(decisionJournal)void decisionJournal.close();decisionJournal=undefined;}

   }catch(error){if(abort.signal.aborted)return;dispose();setHolder(null);const code=(error as {requiresOriginalSignIn?:boolean})?.requiresOriginalSignIn===true?'sign-in-required':(error as {code?:string})?.code??'unavailable';setBootstrap({loginScope:accountScope,phase:code==='pending-storage'?'storage-error':'unavailable',problem:code});}
  })();
  return()=>{abort.abort();dispose();};
 },[accountScope,retry]);
 const workspaceActionSnapshot=useSyncExternalStore(workspaceActions?.subscribe??emptySubscribe,workspaceActions?.getSnapshot??(()=>initialWorkspaceAction),()=>initialWorkspaceAction);
 const workspaceSnapshot=useSyncExternalStore(workspace?.subscribe??emptySubscribe,workspace?.getSnapshot??(()=>initialWorkspace),()=>initialWorkspace);
 const librarySnapshot=useSyncExternalStore(library?.subscribe??emptySubscribe,library?.getSnapshot??(()=>initialLibrary),()=>initialLibrary);
 const current=useSyncExternalStore(controller?.subscribe??emptySubscribe,controller?.getSnapshot??(()=>initial),()=>initial);
 const decisionSnapshot=useSyncExternalStore(decisions?.subscribe??emptySubscribe,decisions?.getSnapshot??(()=>initialDecisions),()=>initialDecisions);
 const taskCurrent=useSyncExternalStore(tasks?.subscribe??emptySubscribe,tasks?.getSnapshot??(()=>initialTasks),()=>initialTasks);
 // Reconcile durable originals after the visible workspace's first reads
 // settle. No private journal payload is exposed or command sent before its
 // original current-authority checks; no context/permission is cached.
 const initialReconciliation=useRef<{actions:PersonalWorkspaceActionController|null;decisions:PersonalChuckTaskDecisionController|null}>({actions:null,decisions:null});
 const readRoute=()=>{
  if(typeof window==='undefined')return '';
  const location=personalNavigationLocation(window.location.pathname,window.location.hash);
  return location.kind==='route'?location.route.name:'';
 };
 const [route,setRoute]=useState(readRoute);
 useEffect(()=>{
  let frame=0;
  const refresh=()=>{window.cancelAnimationFrame(frame);frame=window.requestAnimationFrame(()=>setRoute(readRoute()));};
  const events=['hashchange','popstate','crays:web-destination','crays:web-content','crays:web-overview'];
  for(const event of events)window.addEventListener(event,refresh);
  refresh();return()=>{window.cancelAnimationFrame(frame);for(const event of events)window.removeEventListener(event,refresh);};
 },[]);
 const workspaceList=['chuck','chuckWorkspace','chuckPeople','chuckSavedPeople','chuckDismissedPeople'].includes(route);
 // A retained, hidden parent does not start reads. Only the active original
 // destination's required reads hold background journal reconciliation.
 const criticalReadPending=((workspaceList||route==='chuckRecommendation')&&!!workspace&&['idle','loading'].includes(workspaceSnapshot.phase))||(['chuck','chuckWorkspace','chuckTasks','agentTask'].includes(route)&&!!tasks&&['idle','loading','loading-detail'].includes(taskCurrent.phase))||(route==='chuckKnowledge'&&!!library&&['idle','loading'].includes(librarySnapshot.phase));
 useEffect(()=>{
  if(!workspaceActions||criticalReadPending||initialReconciliation.current.actions===workspaceActions)return;
  initialReconciliation.current.actions=workspaceActions;void workspaceActions.load();
 },[workspaceActions,criticalReadPending]);
 useEffect(()=>{
  if(!decisions||criticalReadPending||initialReconciliation.current.decisions===decisions)return;
  initialReconciliation.current.decisions=decisions;void decisions.load();
 },[decisions,criticalReadPending]);
 const boot=bootstrap.loginScope===accountScope?bootstrap:{phase:'loading',problem:null};
 const snapshot=controller?current:{...initial,phase:boot.phase==='ready'?'loading':boot.phase,problem:boot.problem};
 const taskSnapshot=tasks?taskCurrent:{...initialTasks,phase:boot.phase==='loading'?'loading-detail':'unavailable',problem:boot.problem};
 useEffect(()=>{const receipt=decisionSnapshot.latestReceipt;if(receipt&&tasks?.getSnapshot().detail?.taskId===receipt.taskId)void tasks.open(receipt.taskId);},[decisionSnapshot.latestReceipt?.eventId,tasks]);
 const refreshContext=useCallback(()=>setRetry(value=>value+1),[]);
 const attempts=useRef({key:'',count:0});
 // Read-only reconnect belongs to the already admitted controller. Never
 // recreate identity, bind, or resend in response to a transport failure.
 const reconnect=useRef<{controller:PersonalChuckController|null;admitted:boolean;count:number}>({controller:null,admitted:false,count:0});
 useEffect(()=>{
  if(reconnect.current.controller!==controller)reconnect.current={controller,admitted:false,count:0};
  if(snapshot.conversation&&['ready','waiting-reply','outcome-unknown'].includes(snapshot.phase)){reconnect.current.admitted=true;reconnect.current.count=0;}
 },[controller,snapshot.phase,snapshot.conversation]);
 const canReconnect=useCallback(()=>!!controller&&reconnect.current.controller===controller&&reconnect.current.admitted&&controller.getSnapshot().phase==='unavailable'&&['connection','unavailable'].includes(controller.getSnapshot().problem??''),[controller]);
 useEffect(()=>{
  if(!canReconnect())return;
  let timer:number;
  const tick=()=>{
   if(!canReconnect())return;
   if(document.visibilityState!=='visible'||!navigator.onLine||!conversationVisible()||conversationReviewActive()){timer=window.setTimeout(tick,15000);return;}
   reconnect.current.count++;void controller!.refresh();
  };
  timer=window.setTimeout(tick,Math.min(30000,5000+reconnect.current.count*5000));
  return()=>window.clearTimeout(timer);
 },[controller,snapshot.phase,snapshot.problem,canReconnect]);
 useEffect(()=>{
  const checkingOriginal=snapshot.phase==='outcome-unknown'&&!!snapshot.pending;
  if(!controller||snapshot.phase!=='waiting-reply'&&!checkingOriginal)return;
  const key=checkingOriginal?snapshot.pending!.command.idempotencyKey:snapshot.latestReceipt?.messageId??'';
  if(attempts.current.key!==key)attempts.current={key,count:0};
  let timer:number;
  const tick=()=>{if(document.visibilityState==='visible'&&navigator.onLine&&conversationVisible()&&(!checkingOriginal||!conversationReviewActive())){attempts.current.count++;void(checkingOriginal?controller.reconcile():controller.refresh());}else timer=window.setTimeout(tick,15000);};
  timer=window.setTimeout(tick,Math.min(15000,3000+attempts.current.count*2000));
  return()=>window.clearTimeout(timer);
 },[controller,snapshot.phase,snapshot.latestReceipt?.messageId,snapshot.pending?.command.idempotencyKey]);
 useEffect(()=>{
  if(!controller)return;
  const refresh=()=>{if(document.visibilityState==='visible'&&navigator.onLine&&conversationVisible()&&(controller.getSnapshot().conversation||canReconnect()&&!conversationReviewActive()))void controller.refresh();};
  document.addEventListener('visibilitychange',refresh);window.addEventListener('online',refresh);
  return()=>{document.removeEventListener('visibilitychange',refresh);window.removeEventListener('online',refresh);};
 },[controller,canReconnect]);
 const submit=useCallback(async(body:string)=>!!(await controller?.send(body)),[controller]);
 const readOriginal=holder?.loginScope===accountScope?holder.readOriginal:null;
 const invalidateAccess=useCallback(()=>{workspaceActions?.invalidateAccess();controller?.invalidateAccess();tasks?.invalidateAccess();archive?.clear();decisions?.invalidateAccess();library?.invalidateAccess();workspace?.invalidateAccess();},[controller,tasks,archive,decisions,library,workspace,workspaceActions]);
 // A confirmed authority/context loss in any original projection also hides
 // every other loaded private projection. Only the in-memory views are cleared;
 // unresolved commands/receipts remain in their original durable journals.
 // Layout timing removes stale private UI before painting this committed state.
 useLayoutEffect(()=>{
  if([snapshot,taskSnapshot,decisionSnapshot,librarySnapshot,workspaceSnapshot,workspaceActionSnapshot].some(chuckScopeAuthorityLost))invalidateAccess();
 },[snapshot.phase,snapshot.problem,taskSnapshot.phase,taskSnapshot.problem,decisionSnapshot.phase,decisionSnapshot.problem,librarySnapshot.phase,librarySnapshot.problem,workspaceSnapshot.phase,workspaceSnapshot.problem,workspaceActionSnapshot.phase,workspaceActionSnapshot.problem,invalidateAccess]);
 const value=useMemo(()=>({workspaceActions,workspaceActionSnapshot,workspace,workspaceSnapshot,library,librarySnapshot,controller,snapshot,tasks,archive,taskSnapshot,readOriginal,invalidateAccess,submit,refreshContext,decisions,decisionSnapshot}),[workspaceActions,workspaceActionSnapshot,workspace,workspaceSnapshot,library,librarySnapshot,controller,snapshot,tasks,archive,taskSnapshot,readOriginal,invalidateAccess,submit,refreshContext,decisions,decisionSnapshot]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Original CRAYS login only after a confirmed SDK-session 401. No account,
 * identity, agent, credential or second login mechanism is introduced here. */
function ChuckOriginalSignIn({problem}:{problem:string|null}){
 return problem==='sign-in-required'?<p><a className="chuck-s1-link" href="/auth/login?returnTo=%2F%23chuck">Reconnect your CRAYS sign-in</a></p>:null;
}
function chuckReadProblem(problem:string|null){
 if(problem==='sign-in-required')return 'Your CRAYS sign-in needs to be renewed before Chuck can load your data.';
 if(problem==='access-denied')return 'Your current access to Chuck could not be verified.';
 if(problem==='context-changed'||problem==='session-context-changed')return 'Your account context changed. Check your current CRAYS account and try again.';
 if(problem==='connection')return 'The connection to Chuck was interrupted. Try again when you are online.';
 if(problem==='invalid-response')return 'Chuck returned data that could not be verified. Please retry.';
 return 'Chuck could not load your recommendations. Please retry.';
}
/** Retry current Core reads without a replacement identity or local records. */
export function WebChuckRecommendationsStatus({runtime}:{runtime:WebChuckRuntime}){
 const workspace=runtime.workspace,snapshot=runtime.workspaceSnapshot;
 if(snapshot.phase==='ready')return null;
 const busy=snapshot.phase==='loading'||!workspace&&['idle','loading','connecting'].includes(runtime.snapshot.phase);
 const contextChanged=!workspace||['access-denied','context-changed'].includes(snapshot.problem??'');
 return <div role="status" aria-live="polite" aria-busy={busy}>
  <p>{busy?'Loading your recommendations…':chuckReadProblem(workspace?snapshot.problem:runtime.snapshot.problem)}</p><ChuckOriginalSignIn problem={runtime.snapshot.problem}/>
  {!busy&&<button type="button" className="chuck-s1-link" onClick={()=>{if(contextChanged)runtime.refreshContext();else void workspace.load();}}>Retry recommendations</button>}
 </div>;
}

const phaseText:Record<string,string>={idle:'Opening your Chuck conversation…',loading:'Checking your current conversation…','loading-older':'Loading earlier messages…',connecting:'Connecting your personal Chuck…',sending:'Sending your request…','checking-receipt':'Checking your original request…','waiting-reply':'Your request is stored. Waiting for Chuck’s reply…','outcome-unknown':'Your request has not been confirmed. Check its status before sending again.','storage-error':'This browser could not safely update your saved request. Check the original request status before sending again.','contact-required':'Review your verified contact in your CRAYS account to continue.',unavailable:'Your Chuck conversation is currently unavailable. Your written request has been kept.','reviewing-request':'Keeping your original request for review…'};
function WebChuckPendingFiles({pending}:{pending:ChuckPending}){
 const command=pending.command;if(!('originals'in command))return null;
 return <section aria-label="Files in original request"><ul>{command.originals.map((r,i)=><li key={i} style={{overflowWrap:'anywhere'}}>{r.displayName??`Original ${i+1}`} · {chuckFileSize(r.byteLength)} · requested retention: {r.retainSeconds%86400===0?`${r.retainSeconds/86400} days`:`${Math.round(r.retainSeconds/60)} minutes`}</li>)}</ul><p>{command.inputPurpose?'Selected as input for this Chuck request. Processing permissions are checked separately.':'Not selected as input for Chuck.'}</p>{pending.receipt?<p>{!command.inputPurpose&&!command.body.trim()?'Files are saved with this request.':command.inputPurpose&&!pending.receipt.sourceUse?'The request was stored. Its file-use receipt is not confirmed.':'Files are saved. Chuck’s processing result is not confirmed.'}</p>:<p>File storage has not been confirmed. Check the original request status.</p>}</section>;
}

type SelectedChuckFile={descriptor:OriginalUploadDescriptor;bytes:ArrayBuffer};
export function WebChuckFileComposer({runtime,body,onBodyChange,bottom,focusComposer=false,voiceControl,sourceRequiresReview=false,children}:{runtime:WebChuckRuntime;body:string;onBodyChange:(value:string)=>void;bottom:number;focusComposer?:boolean;voiceControl?:ReactNode;sourceRequiresReview?:boolean;children?:ReactNode}){
 const c=runtime.controller,s=runtime.snapshot,authorized=!!c&&!!s.setup&&!!s.conversation;
 const scope=authorized?`${s.conversation!.bindingId}:${s.conversation!.revision}:${s.setup!.contactRevision}`:'';
 const owner=useRef(c),currentScope=useRef(scope);owner.current=c;currentScope.current=scope;
 const [selection,setSelection]=useState<{controller:PersonalChuckController;scope:string;files:SelectedChuckFile[]}|null>(null);
 const [preparing,setPreparing]=useState(false),[problem,setProblem]=useState(''),[retainSeconds,setRetainSeconds]=useState(604800),[inputPurpose,setInputPurpose]=useState(true);
 const mounted=useRef(true),generation=useRef(0),picker=useRef<HTMLInputElement>(null),field=useRef<HTMLTextAreaElement>(null),form=useRef<HTMLFormElement>(null),bodyRef=useRef(body);bodyRef.current=body;
 const files=selection?.controller===c&&selection.scope===scope?selection.files:[];
 const busy=preparing||!['ready','waiting-reply'].includes(s.phase),available=authorized&&!busy;
 useEffect(()=>{mounted.current=true;generation.current++;setSelection(null);setProblem('');setPreparing(false);return()=>{mounted.current=false;generation.current++;};},[c]);
 useEffect(()=>{if(['access-denied','binding-revoked','binding-changed','contact-changed'].includes(s.problem??'')){generation.current++;setSelection(null);setPreparing(false);setProblem('');}},[s.problem]);
 useLayoutEffect(()=>{const node=field.current;if(!node)return;node.style.height='0px';node.style.height=`${Math.min(node.scrollHeight,132)}px`;},[body,files.length]);
 useLayoutEffect(()=>{const node=form.current,chat=node?.closest<HTMLElement>('.chat-screen');if(!node||!chat)return;const size=()=>chat.style.setProperty('--chat-composer-height',`${node.getBoundingClientRect().height||68}px`);const observer=new ResizeObserver(size);observer.observe(node);size();return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!focusComposer)return;const timer=window.setTimeout(()=>{if(form.current?.closest('[data-flow-current="true"]')&&(document.activeElement===document.body||form.current.contains(document.activeElement)))field.current?.focus();},280);return()=>window.clearTimeout(timer);},[focusComposer]);
 const select=async(selected:File[])=>{
  if(!c||!available||!selected.length)return;const token=++generation.current,own=c,ownScope=scope;setPreparing(true);setProblem('');
  const current=()=>{if(!mounted.current||token!==generation.current||owner.current!==own||currentScope.current!==ownScope)throw Error('selection-changed');};
  try{
   const combined=files.reduce((n,r)=>n+r.descriptor.byteLength,0)+selected.reduce((n,r)=>n+r.size,0);
   if(files.length+selected.length>8||combined>NATIVE_ORIGINAL_TRANSFER_MAX_BYTES)throw Error('limit');
   const added:SelectedChuckFile[]=[];
   for(const file of selected){
    current();if(!file.size||!ORIGINAL_MIME_TYPES.includes(file.type))throw Error('type');
    const data=await file.arrayBuffer();current();const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',data));current();
    const descriptor={mimeType:file.type,byteLength:data.byteLength,sha256:Array.from(digest,n=>n.toString(16).padStart(2,'0')).join(''),retainSeconds,displayName:file.name};
    captureOriginalUploadCommand({bindingId:s.conversation!.bindingId,expectedBindingRevision:s.conversation!.revision,expectedContactRevision:s.setup!.contactRevision!,idempotencyKey:'file-selection-check',body:'',originals:[descriptor]});added.push({descriptor,bytes:data});
   }
   current();setSelection({controller:own,scope:ownScope,files:[...files,...added]});
  }catch(error){if(token===generation.current&&owner.current===own&&currentScope.current===ownScope)setProblem((error as Error).message==='limit'?'Choose up to 8 files, no more than 16 MB in total.':'This selection could not be prepared. Check the file type, name and size.');}
  finally{if(token===generation.current){setPreparing(false);if(owner.current===own&&currentScope.current===ownScope&&form.current?.getClientRects().length&&!form.current.closest('[data-flow-current="false"]')&&(document.activeElement===document.body||document.activeElement===picker.current))field.current?.focus({preventScroll:true});}}
 };
 const send=async()=>{
  if(sourceRequiresReview){setProblem('Review this source with Chuck before sending. Your written request has been kept.');return;}
  if(!c||!available||!body.trim()&&!files.length)return;const own=c,ownScope=scope,text=body,previous=s.pending?.command.idempotencyKey;setProblem('');
  const receipt=files.length?await own.sendOriginals({body:text,originals:files.map(r=>({...r.descriptor,retainSeconds})),payloads:files.map(r=>r.bytes),...(inputPurpose?{inputPurpose:'personal-chuck-input' as const}:{})}):await own.send(text);
  if(!mounted.current||owner.current!==own)return;
  const after=own.getSnapshot(),saved=after.pending?.command.idempotencyKey;
  if(receipt||saved&&saved!==previous){setSelection(null);if(bodyRef.current===text)onBodyChange('');}
  if(receipt&&currentScope.current===ownScope&&form.current?.getClientRects().length&&!form.current.closest('[data-flow-current="false"]')&&(document.activeElement===document.body||form.current.contains(document.activeElement)))field.current?.focus({preventScroll:true});
 };
 return <form ref={form} className="chat-composer-wrap" style={{bottom}} aria-label="Message Chuck" onSubmit={event=>{event.preventDefault();void send();}}>
  {authorized&&children}
  {authorized&&files.length>0&&<section aria-label="Selected files" style={{padding:'8px 12px',maxHeight:'min(40vh, 280px)',overflowY:'auto',overscrollBehavior:'contain'}}><ul>{files.map((r,i)=><li key={i} style={{display:'flex',alignItems:'center',gap:8,overflowWrap:'anywhere'}}><span style={{minWidth:0,flex:1}}>{r.descriptor.displayName} · {chuckFileSize(r.descriptor.byteLength)}</span><button type="button" className="icon-button" aria-label={`Remove ${r.descriptor.displayName}`} disabled={busy} onClick={event=>{const focused=document.activeElement===event.currentTarget;setSelection({controller:c!,scope,files:files.filter((_,index)=>index!==i)});if(focused)requestAnimationFrame(()=>{if(owner.current===c&&currentScope.current===scope&&form.current?.getClientRects().length&&!form.current.closest('[data-flow-current="false"]')&&document.activeElement===document.body)field.current?.focus({preventScroll:true});});}}><X size={18}/></button></li>)}</ul><label>Keep originals for <select aria-label="Keep originals for" disabled={busy} value={retainSeconds} onChange={event=>setRetainSeconds(Number(event.target.value))}><option value={86400}>1 day</option><option value={604800}>7 days</option><option value={2592000}>30 days</option></select></label><label style={{display:'block'}}><input type="checkbox" checked={inputPurpose} disabled={busy} onChange={event=>setInputPurpose(event.target.checked)}/> Include these files in this Chuck request</label><p>Files will be saved with this request. Processing permissions are checked separately.</p></section>}
  {authorized&&preparing&&<p role="status">Preparing selected files…</p>}{authorized&&problem&&<p role="alert">{problem}</p>}
  <div className="chat-composer"><button type="button" className="icon-button" aria-label="Attach a file" disabled={!available} onClick={()=>picker.current?.click()}><Paperclip size={23}/></button><input ref={picker} type="file" multiple accept={ORIGINAL_MIME_TYPES.join(',')} aria-label="Choose files for Chuck" hidden onChange={event=>{const selected=Array.from(event.target.files??[]);event.target.value='';void select(selected);}}/><textarea ref={field} rows={1} aria-label="Message Chuck" placeholder="Message Chuck…" value={body} onChange={event=>onBodyChange(event.target.value)}/><div className="chat-actions">{available&&voiceControl}<button type="submit" className="icon-button chat-send" aria-label="Send message" disabled={!available||(!body.trim()&&!files.length)}><ArrowUp size={22}/></button></div></div>
 </form>;
}
export function WebChuckConnectionStatus({runtime}:{runtime:WebChuckRuntime}){
 const {snapshot:s,controller:c}=runtime;const recoveryButton=useRef<HTMLButtonElement>(null);
 const [review,setReview]=useState<{controller:PersonalChuckController|null;key:string|null;checked:boolean}>({controller:null,key:null,checked:false});
 const reviewed=review.checked&&review.controller===c&&review.key===s.pending?.command.idempotencyKey;
 const busy=['loading','loading-older','connecting','sending','checking-receipt','reviewing-request'].includes(s.phase);
 return <section className="chuck-connection-status" aria-label="Chuck conversation status">
  <ChuckOriginalSignIn problem={s.problem}/>
  <p role="status" aria-live="polite">{s.problem==='upload-wait-stopped'?'Waiting stopped. The original request may already be saved; it has not been cancelled.':s.phase==='ready'?'Your Chuck conversation':s.problem==='binding-revoked'?'Access to this Chuck conversation has been revoked. Refresh checks your current access.':s.problem==='review-required'?'The current request changed. Refresh and review it again before setting it aside.':phaseText[s.phase]??'Your Chuck conversation is unavailable.'}</p>
  {s.phase==='sending'&&s.uploadWaitKey&&c&&typeof c.stopWaitingForUpload==='function'&&<div className="chuck-recovery-actions"><button type="button" className="text-action" onClick={()=>{if(s.uploadWaitKey)c.stopWaitingForUpload(s.uploadWaitKey);}}>Stop waiting for upload</button><p>This stops waiting in this browser. The original request may already be saved. Check its status before trying again.</p></div>}
  {!busy&&!c&&<><p>You can write your message below. Sending becomes available when your Chuck connection is ready.</p><button className="text-action" type="button" onClick={runtime.refreshContext}>Check Chuck connection</button></>}
  {!busy&&c&&<div className="chuck-recovery-actions">
   {s.problem==='access-denied'&&<button className="text-action" type="button" onClick={runtime.refreshContext}>Check Chuck connection</button>}
   <button ref={recoveryButton} data-chuck-recovery-focus className="text-action" type="button" onClick={()=>void(s.conversation?c.refresh():c.load())}>Refresh conversation</button>
   {s.problem==='binding-changed'&&<button className="text-action" type="button" onClick={()=>void c.connect()}>Connect my Chuck conversation</button>}
   {s.pending&&s.pending.status!=='stored'&&<button className="text-action chuck-check-original" type="button" onClick={()=>void c.reconcile()}>Check original request</button>}
   {s.canRetryOriginal&&<button className="text-action" type="button" onClick={()=>void c.retryOriginal()}>Retry the same request</button>}
  </div>}
  {s.pending&&<details><summary>Review current request</summary><p style={{whiteSpace:'pre-wrap'}}>{s.pending.command.body}</p><WebChuckPendingFiles pending={s.pending}/><p>The original request may still run. Setting it aside keeps it for review and does not cancel it.</p><label><input type="checkbox" checked={reviewed} onChange={e=>setReview({controller:c,key:s.pending?.command.idempotencyKey??null,checked:e.target.checked})}/>I understand the original request may still run.</label><button type="button" disabled={!reviewed||busy} onClick={()=>{const expectedOriginal=s.pending;setReview({controller:null,key:null,checked:false});if(expectedOriginal)void c?.setAsideOriginal({understandOriginalMayStillExecute:true,expectedOriginal});}}>Keep original and set aside</button></details>}
  <WebChuckSavedRequests runtime={runtime} onRestoreUnavailable={()=>recoveryButton.current?.focus({preventScroll:true})}/>
 </section>;
}

const initialArchive:ChuckArchiveSnapshot=Object.freeze({phase:'idle',records:[],hasMore:false,nextAfterId:null,checked:null,problem:null});
function WebChuckSavedRequests({runtime,onRestoreUnavailable}:{runtime:WebChuckRuntime;onRestoreUnavailable:()=>void}){
 const {archive,snapshot}=runtime;const reviewButton=useRef<HTMLButtonElement>(null),region=useRef<HTMLElement>(null),completion=useRef<HTMLParagraphElement>(null),focusTarget=useRef<string|null>(null);const [expandedKey,setExpandedKey]=useState<string|null>(null);
 const s=useSyncExternalStore(archive?.subscribe??emptySubscribe,archive?.getSnapshot??(()=>initialArchive),()=>initialArchive);
 const available=!!snapshot.setup&&!!snapshot.conversation&&!['unavailable','contact-required','storage-error'].includes(snapshot.phase);
 useEffect(()=>{if(!available)archive?.clear();},[archive,available]);
 useEffect(()=>{setExpandedKey(null);focusTarget.current=null;},[archive]);
 useLayoutEffect(()=>{if(s.phase==='unavailable'){focusTarget.current=null;reviewButton.current?.focus({preventScroll:true});}else if(['ready','restored'].includes(s.phase)&&focusTarget.current){const key=focusTarget.current;focusTarget.current=null;if(key==='loaded')(completion.current??reviewButton.current)?.focus({preventScroll:true});else [...(region.current?.querySelectorAll<HTMLButtonElement>('button[data-saved-request]')??[])].find(button=>button.dataset.savedRequest===key)?.focus({preventScroll:true});}},[s.phase]);
 if(!archive||!available)return null;
 const busy=['loading','checking','restoring'].includes(s.phase);
 const reopen=async(key:string)=>{focusTarget.current='loaded';try{if(!await archive.restoreRequest(key))return;const main=runtime.controller;if(!main)return;await main.load();if(main.getSnapshot().pending?.command.idempotencyKey===key&&main.getSnapshot().conversation)await main.reconcile();if(['unavailable','contact-required','storage-error'].includes(main.getSnapshot().phase))requestAnimationFrame(()=>{if(['unavailable','contact-required','storage-error'].includes(main.getSnapshot().phase))onRestoreUnavailable();});}catch{/* A disposed account context cannot continue this read-only check. */}};
 return <section ref={region} aria-label="Saved Chuck requests"><button ref={reviewButton} className="text-action" type="button" disabled={busy} onClick={()=>{focusTarget.current='loaded';void archive.load();}}>Review saved requests</button>
  <p>Copies retained in this browser. Setting a request aside does not cancel it.</p>
  {busy&&<p role="status">Checking saved requests…</p>}
  {s.phase==='unavailable'&&<p role="status">{s.problem==='active-request'?'Review and set aside your current request before reopening another saved request.':'Saved requests could not be checked with your current access.'}</p>}
  {s.phase==='restored'&&<p ref={completion} role="status" tabIndex={-1} style={{outline:'none'}}>The original request was restored. It has not been sent again.</p>}
  {s.phase==='ready'&&!s.records.length&&<p role="status">No saved requests for this conversation were found in this page.</p>}
  {s.phase==='ready'&&!!s.records.length&&<p ref={completion} tabIndex={-1} style={{outline:'none'}} role="status">{s.records.length} saved requests loaded for this conversation.</p>}
  {s.phase==='ready'&&!!s.records.length&&<ul>{s.records.map(row=>{const key=row.record.command.idempotencyKey,checked=s.checked?.key===key?s.checked:null;return <li key={key}><details open={expandedKey===key} onToggle={event=>{if(event.currentTarget.open)setExpandedKey(key);else setExpandedKey(current=>current===key?null:current);}}><summary>Request saved on <time dateTime={row.archivedAt}>{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(row.archivedAt))}</time></summary><p>Local copy of your request</p><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{row.record.command.body}</p><WebChuckPendingFiles pending={row.record}/><div style={{display:'flex',flexWrap:'wrap',gap:12}}><button className="text-action" type="button" disabled={busy} data-saved-request={key} onClick={()=>{focusTarget.current=key;void archive.checkRequest(key);}}>Check request status</button>{row.record.status!=='stored'&&<button className="text-action" type="button" disabled={busy||['loading','loading-older','connecting','sending','checking-receipt','reviewing-request'].includes(snapshot.phase)} onClick={()=>void reopen(key)}>Reopen for status check</button>}</div>{checked&&<p role="status">{!checked.receipt?'No receipt is confirmed. This does not prove the request was never sent or cancelled.':checked.replyInLoadedPage?'The request was stored. A matching Chuck reply was found while checking this request.':'The request was stored. A reply is not confirmed in the loaded conversation page.'}</p>}</details></li>;})}</ul>}
  {s.hasMore&&<button className="text-action" type="button" disabled={busy} onClick={()=>{focusTarget.current='loaded';void archive.load({more:true});}}>More saved requests</button>}
 </section>;
}

export function WebChuckOriginalFile({runtime,original,compact=false}:{runtime:WebChuckRuntime;original:ChuckOriginalReference;compact?:boolean}){
 const [state,setState]=useState<{phase:string;received:number;url:string|null}>({phase:'idle',received:0,url:null});
 const active=useRef<AbortController|null>(null),url=useRef<string|null>(null);
 const fileRegion=useRef<HTMLElement>(null),saveLink=useRef<HTMLAnchorElement>(null),saveFocus=useRef<Element|null>(null);
 const clearUrl=()=>{if(url.current)URL.revokeObjectURL(url.current);url.current=null;};
 useLayoutEffect(()=>{
  setState({phase:'idle',received:0,url:null});
  let timer:number;
  const check=()=>{if(!isOriginalLocallyRetained(original)){active.current?.abort();active.current=null;clearUrl();setState({phase:'original-unavailable',received:0,url:null});}else timer=window.setTimeout(check,Math.min(60000,Math.max(1,Date.parse(original.expiresAt)-Date.now())));};
  check();return()=>{window.clearTimeout(timer);active.current?.abort();active.current=null;clearUrl();};
 },[original]);
 useLayoutEffect(()=>{const previousFocus=saveFocus.current;saveFocus.current=null;if(state.phase==='ready'&&previousFocus&&(document.activeElement===document.body||document.activeElement===previousFocus))saveLink.current?.focus({preventScroll:true});},[state.phase]);
 const download=async()=>{
  if(!runtime.readOriginal||active.current)return;const job=new AbortController();active.current=job;clearUrl();setState({phase:'loading',received:0,url:null});
  try{const blob=await runtime.readOriginal(original,{signal:job.signal,onProgress:received=>{if(active.current===job&&!job.signal.aborted)setState({phase:'loading',received,url:null});}});if(active.current!==job||job.signal.aborted)return;url.current=URL.createObjectURL(blob);saveFocus.current=fileRegion.current?.contains(document.activeElement)?document.activeElement:null;setState({phase:'ready',received:original.byteLength,url:url.current});}
  catch(error){if(active.current===job){const problem=job.signal.aborted?'cancelled':(error as {code?:string})?.code??'unavailable';if(problem==='access-denied'){const focused=document.activeElement,region=fileRegion.current?.closest<HTMLElement>('[aria-label="Chuck task"],[data-live-chuck-conversation],[data-chuck-original-library]'),restoreFocus=!!fileRegion.current?.contains(focused);runtime.invalidateAccess();if(restoreFocus)requestAnimationFrame(()=>{if(runtime.controller?.getSnapshot().problem==='access-denied'&&region?.isConnected&&region.getClientRects().length&&!region.closest('[data-flow-current="false"]')&&(document.activeElement===document.body||document.activeElement===focused))region.querySelector<HTMLElement>('[data-chuck-recovery-focus]')?.focus({preventScroll:true});});}else setState({phase:problem,received:0,url:null});}}
  finally{if(active.current===job)active.current=null;}
 };
 const retained=isOriginalLocallyRetained(original),tooLarge=original.byteLength>NATIVE_ORIGINAL_TRANSFER_MAX_BYTES;
 const text=state.phase==='loading'?`Downloading ${Math.floor(state.received/original.byteLength*100)}%…`:state.phase==='ready'?(compact?'Your file is ready to save.':'File checked and ready to save.'):state.phase==='cancelled'?'Download cancelled.':state.phase==='access-denied'?'Your access could not be verified. Refresh the conversation.':state.phase==='original-busy'?'Another file is being retrieved. Try again after it finishes.':state.phase==='invalid-response'?'The file could not be verified. No file is available to save.':state.phase!=='idle'?'This file could not be retrieved. Refresh the conversation and try again.':null;
 return <section ref={fileRegion} aria-label={original.displayName??'Original file'} className={compact?'chuck-source-file-transfer':undefined} style={compact?undefined:{display:'flex',flexDirection:'column',gap:8,marginBlock:8,minWidth:0,maxWidth:'100%',overflowWrap:'anywhere'}}>{!compact&&<><strong>{original.displayName??'Original file'}</strong><small>{chuckFileType(original.mimeType)} · {chuckFileSize(original.byteLength)}</small></>}
  {!retained?<p>{original.availability==='ERASED'?(compact?'This file has been removed.':'This original has been removed.'):original.availability==='EXPIRED'||Date.now()>=Date.parse(original.expiresAt)?(compact?'This file has expired.':'This original has expired.'):(compact?'This file is unavailable.':'This original is currently unavailable.')}</p>:tooLarge?<p>This file exceeds the current 16 MB download limit. Its original record is retained.</p>:<>
   {text&&<p role="status">{text}</p>}
   {state.phase==='loading'?<button className="text-action" type="button" onClick={()=>active.current?.abort()}>Cancel download</button>:state.url?<a ref={saveLink} className={compact?'chuck-s1-primary':undefined} href={state.url} download={original.displayName??'original'}>{compact?'Save file':'Save original file'}</a>:<button className="text-action" type="button" disabled={!runtime.readOriginal} onClick={()=>void download()}>{compact?'Download file':'Download original'}</button>}
  </>}
 </section>;
}

const initialMessageLocation=Object.freeze({phase:'waiting',pagesRead:0,canContinue:false});
function WebChuckMessageTarget({controller,targetId,log}:{controller:PersonalChuckController|null;targetId:string;log:{current:HTMLDivElement|null}}){
 const locator=useMemo(()=>controller&&validChuckMessageId(targetId)?new ChuckOriginalMessageLocator({controller,targetId}):null,[controller,targetId]);
 const location=useSyncExternalStore(locator?.subscribe??emptySubscribe,locator?.getSnapshot??(()=>initialMessageLocation),()=>initialMessageLocation);
 const landed=useRef<ChuckOriginalMessageLocator|null>(null);
 useEffect(()=>{locator?.start();return()=>locator?.dispose();},[locator]);
 useLayoutEffect(()=>{if(!locator||location.phase!=='found'||landed.current===locator)return;const frame=window.requestAnimationFrame(()=>{if(locator.getSnapshot().phase!=='found'||!controller?.getSnapshot().messages.some(m=>m.messageId===targetId))return;const node=[...(log.current?.querySelectorAll<HTMLElement>('[data-message-id]')??[])].find(n=>n.dataset.messageId===targetId);if(!node)return;const viewport=node.closest('[data-testid="mobile-scroll"]');if(viewport instanceof HTMLElement)viewport.scrollTop+=node.getBoundingClientRect().top-viewport.getBoundingClientRect().top-24;node.focus({preventScroll:true});landed.current=locator;});return()=>window.cancelAnimationFrame(frame);},[locator,location.phase,targetId,log,controller]);
 const text=!validChuckMessageId(targetId)?'This original message link is unavailable.':location.phase==='found'?'Original message found.':location.phase==='searching'?'Looking in earlier messages…':location.phase==='more'?'The original message is further back. You can look in more earlier messages.':location.phase==='paused'?'Stopped looking. Your request has not been sent again.':location.phase==='missing'?'This original message is not in the currently available conversation history.':'Open your current authorized conversation to find this original message.';
 return <section aria-label="Original message location"><p role="status">{text}</p>{location.phase==='searching'&&<button type="button" className="text-action" onClick={()=>locator?.cancel()}>Stop looking</button>}{location.canContinue&&<button type="button" className="text-action" onClick={()=>locator?.continue()}>Look in earlier messages</button>}</section>;
}

export function WebChuckOriginalMessages({runtime,ownPhoto,chuckPhoto,onOpenTask,jumpTo=""}:{runtime:WebChuckRuntime;ownPhoto?:string;chuckPhoto?:string;onOpenTask?:(taskId:string)=>void;jumpTo?:string}){
 const {snapshot:s,controller:c}=runtime;
 type ScrollPosition={top:number;height:number;nearBottom:boolean;messageId:string|null;offset:number};
 const log=useRef<HTMLDivElement>(null),anchor=useRef<ScrollPosition|null>(null),scroll=useRef<ScrollPosition|null>(null),previous=useRef('');
 const checking=useRef(false);
 const measure=(viewport:HTMLElement):ScrollPosition=>{const bounds=viewport.getBoundingClientRect(),visible=[...(log.current?.querySelectorAll<HTMLElement>('[data-message-id]')??[])].find(node=>{const rect=node.getBoundingClientRect();return rect.bottom>bounds.top&&rect.top<bounds.bottom;});return{top:viewport.scrollTop,height:viewport.scrollHeight,nearBottom:viewport.scrollHeight-viewport.scrollTop-viewport.clientHeight<80,messageId:visible?.dataset.messageId??null,offset:visible?visible.getBoundingClientRect().top-bounds.top:0};};
 useLayoutEffect(()=>{
  const viewport=log.current?.closest('[data-testid="mobile-scroll"]');
  if(!(viewport instanceof HTMLElement))return;
  const update=()=>{if(!checking.current)scroll.current=measure(viewport);};
  viewport.addEventListener('scroll',update,{passive:true});update();return()=>viewport.removeEventListener('scroll',update);
 },[]);
 useLayoutEffect(()=>{
  const viewport=log.current?.closest('[data-testid="mobile-scroll"]');
  if(!(viewport instanceof HTMLElement))return;
  checking.current=['loading','loading-older','connecting','sending','checking-receipt','reviewing-request'].includes(s.phase);
  if(checking.current&&!s.messages.length){if(previous.current&&scroll.current&&!anchor.current)anchor.current=scroll.current;return;}
  if(!s.messages.length){anchor.current=null;previous.current='';scroll.current=null;return;}
  const last=s.messages.at(-1)?.messageId??'';
  if(last!==previous.current&&(!previous.current||scroll.current?.nearBottom||last===s.latestReceipt?.messageId)){viewport.scrollTop=viewport.scrollHeight;anchor.current=null;}
  else if(anchor.current){const saved=anchor.current,node=[...(log.current?.querySelectorAll<HTMLElement>('[data-message-id]')??[])].find(node=>node.dataset.messageId===saved.messageId);if(node)viewport.scrollTop+=node.getBoundingClientRect().top-viewport.getBoundingClientRect().top-saved.offset;else viewport.scrollTop=saved.top;anchor.current=null;}
  previous.current=last;scroll.current=measure(viewport);
 },[s.messages,s.phase]);
 return <>
  {jumpTo&&<WebChuckMessageTarget controller={c} targetId={jumpTo} log={log}/>}
  {s.conversation?.hasOlderMessages&&<button className="text-action" type="button" disabled={s.phase==='loading-older'} onClick={()=>{const viewport=log.current?.closest('[data-testid="mobile-scroll"]');if(viewport instanceof HTMLElement)anchor.current=measure(viewport);void c?.loadOlder();}}>Earlier messages</button>}
  <div ref={log} className="chuck-message-log" role="log" aria-label="Your conversation with Chuck" aria-live="polite" aria-relevant="additions text" aria-busy={s.phase==='loading'||s.phase==='loading-older'} style={{display:'flex',flexDirection:'column',gap:10}}>
   {s.messages.map(m=><div key={m.messageId} className={`message ${m.authorKind==='OWNER'?'outgoing':'incoming'}`} data-message-id={m.messageId} tabIndex={-1} style={{outline:"none"}}><MessageAvatar photo={m.authorKind==='OWNER'?ownPhoto:chuckPhoto} name={m.authorKind==='OWNER'?'You':'Chuck'}/><span className="sr-only">{m.authorKind==='OWNER'?'You':'Chuck'}: </span>{m.body&&<ChuckMessageBody body={m.body} owner={m.authorKind==='OWNER'} onOpenTask={onOpenTask}/>}{m.originals?.map(original=><WebChuckOriginalFile key={`${original.attachmentId}:${original.sha256}:${original.availability}`} runtime={runtime} original={original}/>)}{m.hasOriginals&&!m.originals?.length&&<p>File details are currently unavailable.</p>}<small><time dateTime={m.createdAt}>{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(m.createdAt))}</time></small></div>)}
  </div>
 </>;
}

export const chuckTaskStateLabel=(state:string)=>({'awaiting-review':'Ready for your review','plan-confirmed':'Plan agreed — execution not authorized',paused:'Paused',cancelled:'Cancelled'}[state]??'Review current task');
export function WebChuckTaskStatus({runtime}:{runtime:WebChuckRuntime}){
 const {tasks,taskSnapshot:s}=runtime;
 const busy=s.phase.startsWith('loading')||!tasks&&['idle','loading','connecting'].includes(runtime.snapshot.phase);
 const reconnect=!tasks||['access-denied','binding-changed','binding-revoked','contact-changed','contact-required','context-changed'].includes(s.problem??'');
 return <section aria-label="Chuck tasks status"><p role="status" aria-live="polite">{busy?'Loading your Chuck tasks…':s.phase==='unavailable'?'Your Chuck tasks are currently unavailable. Refresh to check your current access.':s.phase==='ready'?s.tasks.length?`${s.tasks.length} Chuck ${s.tasks.length===1?'proposal':'proposals'} loaded. Agreeing to a plan does not start execution.`:'No Chuck proposals are available in this page.':'Open your current Chuck tasks.'}</p><p>Search and filters apply to the loaded task pages. Earlier proposals may require loading earlier tasks.</p><div style={{display:'flex',flexWrap:'wrap',gap:12}}><button className="text-action" type="button" disabled={busy} onClick={()=>{if(reconnect)runtime.refreshContext();else void tasks?.load();}}>Refresh tasks</button>{s.hasMore&&<button className="text-action" type="button" disabled={busy} onClick={()=>void tasks?.loadOlder()}>Earlier tasks</button>}</div></section>;
}
export function WebChuckTaskDetail({taskId,onConversation,onRevise,onBack,onTab,onApps}:{taskId:string;onConversation:()=>void;onRevise?:()=>void;onBack?:()=>void;onTab?:(tab:string)=>void;onApps?:()=>void}){
 const runtime=useWebChuck(),tasks=runtime?.tasks,s=runtime?.taskSnapshot??initialTasks;
 // Retained task views yield their scoped read before the next view opens.
 // Activity restores this effect before paint on Back/Forward; originals and
 // decision journals remain owned by the account provider.
 const receipt=runtime?.decisionSnapshot.latestReceipt;
 const receiptEvent=receipt?.taskId===taskId?receipt.eventId:'';
 // An original decision receipt prompts a fresh canonical task read.
 // No optimistic status and no second decision command are introduced.
 useLayoutEffect(()=>{if(!tasks)return;void tasks.open(taskId);return()=>tasks.cancelRead(taskId);},[tasks,taskId,receiptEvent]);
 const detail=s.detail?.taskId===taskId?s.detail:null,sourceBusy=s.phase==='loading-source';
 const sourceHeading=useRef<HTMLHeadingElement>(null),detailHeading=useRef<HTMLHeadingElement>(null),sourceWasLoading=useRef(false),detailRegion=useRef<HTMLElement>(null),sourceReturnFocus=useRef<Element|null>(null);
 useLayoutEffect(()=>{if(sourceBusy){sourceWasLoading.current=true;return;}if(sourceWasLoading.current){sourceWasLoading.current=false;const previous=sourceReturnFocus.current;sourceReturnFocus.current=null;const region=detailRegion.current;if(previous&&region?.isConnected&&region.getClientRects().length&&!region.closest('[data-flow-current="false"]')&&(document.activeElement===document.body||document.activeElement===previous))(s.phase==='unavailable'?detailHeading.current:sourceHeading.current)?.focus({preventScroll:true});}},[sourceBusy,s.phase,s.sourcePhase]);
 const reviewSource=(earlier=false)=>{sourceReturnFocus.current=detailRegion.current?.contains(document.activeElement)?document.activeElement:null;void tasks?.openSource({earlier});};
 useEffect(()=>{if(!tasks||!detail?.sourceAvailable||s.phase!=='ready'||s.sourcePhase!=='idle')return;let current=true;const task=detail;queueMicrotask(()=>{const snapshot=tasks.getSnapshot();if(current&&snapshot.phase==='ready'&&snapshot.sourcePhase==='idle'&&snapshot.detail?.taskId===task.taskId&&snapshot.detail.version===task.version&&snapshot.detail.planSHA256===task.planSHA256)void tasks.openSource();});return()=>{current=false;};},[tasks,detail?.taskId,detail?.version,detail?.planSHA256,detail?.sourceAvailable,s.phase,s.sourcePhase]);
 return <WebChuckTaskDetailLayout canonicalNavigation={!!runtime} task={detail} phase={s.phase} status={detail?chuckTaskStateLabel(detail.state):''} original={<section aria-label="Original Chuck request" aria-busy={sourceBusy}><h2 ref={sourceHeading} tabIndex={-1} style={{outline:'none'}}>Original request</h2>{sourceBusy?<p role="status">Checking the original request…</p>:s.sourcePhase==='ready'&&s.source?<><p role="status">Original request loaded.</p>{s.source.body&&<p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{s.source.body}</p>}{runtime&&s.source.originals?.map(original=><WebChuckOriginalFile key={`${original.attachmentId}:${original.sha256}:${original.availability}`} runtime={runtime} original={original}/>)}{s.source.hasOriginals&&!s.source.originals?.length&&<p>File details are currently unavailable.</p>}<time dateTime={s.source.createdAt}>{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(s.source.createdAt))}</time></>:s.sourcePhase==='earlier-available'?<p role="status">The original request was not in this page. You can look in earlier requests.</p>:s.sourcePhase==='unavailable'?<p role="status">The original request could not be retrieved with your current access.</p>:<p>Read the exact request behind this proposal.</p>}{detail?.sourceAvailable&&<button className="text-action" type="button" disabled={sourceBusy} onClick={()=>reviewSource()}>Read original request</button>}{s.sourceCursor&&<button className="text-action" type="button" disabled={sourceBusy} onClick={()=>reviewSource(true)}>Look in earlier requests</button>}</section>} actions={<WebChuckTaskActions runtime={runtime} taskId={taskId}/>} onRefresh={()=>{if(!tasks||['access-denied','binding-changed','binding-revoked','contact-changed','contact-required','context-changed'].includes(s.problem??''))runtime?.refreshContext();else void tasks.open(taskId);}} onConversation={onConversation} onRevise={onRevise} onBack={onBack} onTab={onTab} onApps={onApps} regionRef={detailRegion} headingRef={detailHeading}/>;
}

function WebChuckTaskActions({runtime,taskId}:{runtime:WebChuckRuntime|undefined;taskId:string}){
 const controller=runtime?.decisions,s=runtime?.decisionSnapshot??initialDecisions,task=runtime?.taskSnapshot.detail;
 const key=task&&task.taskId===taskId?JSON.stringify([task.taskId,task.version,task.planSHA256,task.lastEventId]):'';
 const [review,setReview]=useState({key:'',decision:'confirm-plan' as 'confirm-plan'|'pause'|'cancel',checked:false});
 const choice=review.key===key?review.decision:'confirm-plan',checked=review.key===key&&review.checked,canAgree=!!task?.sourceAvailable&&runtime?.taskSnapshot.sourcePhase==='ready';
 const busy=runtime?.taskSnapshot.phase==='loading-source'||['sending','checking-receipt','reviewing-decision'].includes(s.phase),unresolved=!!s.pending&&s.pending.status!=='stored'||['outcome-unknown','storage-error','unavailable'].includes(s.phase);
 const receipt=s.latestReceipt?.taskId===taskId?s.latestReceipt:null;
 if(!task||task.taskId!==taskId)return null;
 if(!controller)return <section aria-label="Plan decisions unavailable"><p role="status">Plan decisions are currently unavailable in this browser. Your conversation and saved tasks remain available.</p><button type="button" onClick={runtime?.refreshContext}>Check access again</button></section>;
 const send=async()=>{if(!checked||busy||unresolved)return;const original=task;setReview({key:'',decision:choice,checked:false});await controller.decide({reviewedTask:original,decision:choice});};
 return <section aria-label="Review this Chuck plan" className="chuck-task-actions"><h2>Your decision</h2><p>Review this version. Agreeing to the plan does not start its steps, contact anyone or authorize spending.</p><label>Decision<select aria-label="Decision" value={choice} disabled={busy||unresolved||task.state==='cancelled'} onChange={e=>setReview({key,decision:e.target.value as typeof choice,checked:false})}><option value="confirm-plan" disabled={!canAgree}>Agree to this plan</option><option value="pause">Pause this plan</option><option value="cancel">Stop this plan</option></select></label><label><input type="checkbox" checked={checked} disabled={busy||unresolved||task.state==='cancelled'} onChange={e=>setReview({key,decision:choice,checked:e.target.checked})}/>I have reviewed this version and this decision.</label><button type="button" disabled={!checked||busy||unresolved||task.state==='cancelled'||choice==='confirm-plan'&&!canAgree} onClick={()=>void send()}>Save my decision</button>{receipt&&<p role="status">Your {receipt.decision==='confirm-plan'?'plan agreement':receipt.decision==='pause'?'pause':'stop'} is recorded. No execution or payment was authorized.</p>}{unresolved&&<p role="status">The original decision needs checking. It may already have been saved. Check its status before making another decision.</p>}{(unresolved||s.pending)&&<button type="button" disabled={busy} onClick={()=>void controller.reconcile()}>Check original decision status</button>}{s.canRetryOriginal&&s.pending?.command.taskId===taskId&&<button type="button" disabled={busy} onClick={()=>void controller.retryOriginal()}>Retry the same original decision</button>}{busy&&<p role="status">Checking your original decision…</p>}</section>;
}
