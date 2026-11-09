import "server-only";
import type { createNativePersonalRuntimeRepository, PreparedPersonalAttempt } from "@/db/native-personal-runtime-repository";
import { personalSdkAgentId, type PersonalAgentRouteGuard } from "./native-personal-agent-route";

type Repository = ReturnType<typeof createNativePersonalRuntimeRepository>;
/** Server-host-only dependency. The host must own an authenticated ORIGINAL
 * GatewayClient with explicit operator.sessions.read/write and revalidate the
 * current personal deployment/profile/session/lifecycle before and after IO.
 * Neither this interface nor a matching JSON/hash grants runtime admission.
 * This module is deliberately not registered as a native/public operation. */
export type PersonalSdkSessionGuards = Readonly<{
  expectedSessionRoutingContract: string;
  expectedLeafEntryId: string | null;
  expectedAgentRoute?: PersonalAgentRouteGuard;
  expectedGatewayPrincipal?: Readonly<{corePersonId:string;sdkPrincipalId:string;sdkProfileId:string;runtimeBindingSHA256:string}>;
  expectedGatewayService?: Readonly<{corePersonId:string;deviceId:string;hostInvocationId:string;runtimeBindingSHA256:string}>;
}>;
export type PersonalSdkTransport = Readonly<{
  assertCurrent(attempt: PreparedPersonalAttempt): Promise<PersonalSdkSessionGuards>;
  request(method: "chat.send" | "chat.history", params: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
}>;
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue | null => value!==null && typeof value==="object" && !Array.isArray(value) ? value as RecordValue : null;
const fail = (code: string) => new Error("NATIVE_PERSONAL_SDK_"+code);
const correlation = (p: PreparedPersonalAttempt) => ({runId:p.sdkRunId,sessionId:p.sdkSessionId});

/** Only a trusted, same-client SDK chat event can enter acceptEvent. Native JSON,
 * arbitrary Nostr messages or a last-assistant history row are not producers.
 * ACK/input consumption is not an answer. Replay NEVER calls chat.send again. */
export function createNativePersonalSdkDispatch(repository: Repository, transport: PersonalSdkTransport) {
  async function history(p: PreparedPersonalAttempt, signal?: AbortSignal, offset?: number) {
    signal?.throwIfAborted();await transport.assertCurrent(p);signal?.throwIfAborted();
    const response=record(await transport.request("chat.history",{
      // Original SDK: sessionId request selector requires messageId. Current
      // history instead returns its active sessionId, checked exactly below.
      sessionKey:p.sdkSessionKey,agentId:personalSdkAgentId(p),
      inputRunIds:[p.sdkRunId],limit:50,maxBytes:65536,...(offset===undefined?{}:{offset}),
    },signal));
    signal?.throwIfAborted();await transport.assertCurrent(p);signal?.throwIfAborted();
    if(!response || response.sessionKey!==p.sdkSessionKey || response.sessionId!==p.sdkSessionId || !Array.isArray(response.messages))throw fail("SESSION_CHANGED");
    return response;
  }
  /** The original history handler attaches the current projected session and
   * overwrites its leaf from the actual active transcript on the initial tail.
   * These are read facts, not a Core host/profile/model admission. Never infer
   * the active leaf from the last displayed row or a caller-supplied null. */
  function sessionLeaf(p: PreparedPersonalAttempt, page: RecordValue, required: boolean): string | null | undefined {
    const info=record(page.sessionInfo);
    if(!info || info.key!==p.sdkSessionKey ||
       (info.sessionId!==undefined && info.sessionId!==p.sdkSessionId) ||
       (info.agentId!==undefined && info.agentId!==personalSdkAgentId(p)) ||
       info.archived===true || info.restartRecoveryStatus==="tombstoned")throw fail("SESSION_DESCRIPTION_REQUIRED");
    if(!Object.hasOwn(info,"activeLeafEntryId")){
      if(required)throw fail("ACTIVE_SESSION_LEAF_REQUIRED");
      return undefined; // Original SDK offset pages need not repeat the leaf.
    }
    const leaf=info.activeLeafEntryId;
    if(leaf!==null && (typeof leaf!=="string" || !leaf.trim() || Buffer.byteLength(leaf)>256 || /[\x00-\x1f\x7f]/.test(leaf)))throw fail("INVALID_SESSION_LEAF");
    return leaf as string|null;
  }
  /** Original SDK offset pagination is distinct from its incremental delta
   * cursor. Inspect every bounded page before promoting any terminal, so an
   * older same-run media/final sibling cannot silently disappear. A changed
   * session/leaf/window, incomplete page or scan bound is reconciliation only.
   * No offset is synthesized from the displayed message count: SDK projection
   * siblings may share a raw sequence and repeat at page boundaries. */
  async function completeHistory(p: PreparedPersonalAttempt, signal?: AbortSignal): Promise<unknown[] | null> {
    const before=await transport.assertCurrent(p);
    const guards=structuredClone(before);
    if(!guards || typeof guards.expectedSessionRoutingContract!=="string" || !guards.expectedSessionRoutingContract.trim() ||
       (guards.expectedLeafEntryId!==null && typeof guards.expectedLeafEntryId!=="string"))return null;
    const stable=async()=>{
      signal?.throwIfAborted();const now=await transport.assertCurrent(p);signal?.throwIfAborted();
      return now?.expectedSessionRoutingContract===guards.expectedSessionRoutingContract && now.expectedLeafEntryId===guards.expectedLeafEntryId;
    };
    let offset=0,total:number|undefined,bytes=0,first:RecordValue|undefined;
    const messages:unknown[]=[];let activeLeaf:string|null|undefined;
    const signature=(page:RecordValue)=>JSON.stringify([page.messages,page.totalMessages,page.hasMore,page.nextOffset]);
    for(let pageIndex=0;pageIndex<16;pageIndex++){
      if(!await stable())return null;
      const page=await history(p,signal,pageIndex===0?undefined:offset);
      if(!await stable())return null;
      const observedLeaf=sessionLeaf(p,page,pageIndex===0);
      if(pageIndex===0)activeLeaf=observedLeaf;
      else if(observedLeaf!==undefined && observedLeaf!==activeLeaf)return null;
      const n=page.totalMessages,next=page.nextOffset;
      // Legacy/partial windows cannot establish that all parts of a final
      // response were inspected. Never guess completion from a last assistant.
      if(page.windowReset===true || typeof page.hasMore!=="boolean" || !Number.isSafeInteger(n) || (n as number)<0 ||
         (page.offset!==undefined && page.offset!==offset) || (pageIndex>0 && page.offset!==offset) ||
         (total!==undefined && n!==total))return null;
      total=n as number;first??=page;
      bytes+=Buffer.byteLength(JSON.stringify(page));
      messages.push(...page.messages as unknown[]);
      if(bytes>1048576 || messages.length>1000)return null;
      if(page.hasMore){
        if(!Number.isSafeInteger(next) || (next as number)<=offset || (next as number)>total)return null;
        offset=next as number;continue;
      }
      if(next!==undefined)return null;
      // An append/rewind during offset walking can shift the pages even when
      // all individual replies are well formed. Re-read the tail and require
      // the same current routing/leaf as before the walk before publication.
      if(pageIndex>0){
        const tail=await history(p,signal);
        if(sessionLeaf(p,tail,true)!==activeLeaf || tail.windowReset===true || signature(tail)!==signature(first))return null;
      }
      return await stable()?messages:null;
    }
    return null; // Finite scan exhausted; never accept an incomplete result.
  }
  function terminalText(message: RecordValue): string {
    if(message.role!=="assistant" || message.isError===true)throw fail("INVALID_TERMINAL_MESSAGE");
    if((message.phase!==undefined && message.phase!=="final_answer") || message.openclawStreamFallback!==undefined ||
      record(message.openclawAbort)?.aborted===true || message.truncated===true || record(message.__openclaw)?.truncated===true ||
      typeof message.errorMessage==="string" || message.endTurn===false ||
      (message.stopReason!==undefined && message.stopReason!=="stop"))throw fail("NONFINAL_TERMINAL_MESSAGE");
    let text: string | undefined;
    if(Array.isArray(message.content)) {
      const phases=message.content.map(block=>{
        const signature=record(block)?.textSignature;
        if(typeof signature!=="string" || !signature.startsWith("{"))return undefined;
        try {
          const parsed=record(JSON.parse(signature));
          return parsed?.v===1 && ["commentary","final_answer"].includes(String(parsed.phase)) ? parsed.phase : undefined;
        }catch{return undefined;}
      });
      // Original SDK phase vocabulary/signature precedence: explicit phased
      // blocks must not be joined with commentary or legacy unphased siblings.
      if(phases.some(phase=>phase!==undefined) && phases.some(phase=>phase!=="final_answer"))throw fail("NONFINAL_TERMINAL_MESSAGE");
      if(!message.content.length || message.content.some(block=>record(block)?.type!=="text" || typeof record(block)?.text!=="string"))throw fail("NON_TEXT_RESULT_REQUIRES_ADAPTER");
      text=message.content.map(block=>record(block)!.text as string).join("\n");
    }
    if(message.text!==undefined) {
      if(typeof message.text!=="string" || (text!==undefined && text!==message.text))throw fail("INCONSISTENT_TERMINAL_TEXT");
      text=message.text;
    }
    if(text===undefined || !text.trim() || Buffer.byteLength(text)>16384 || text.includes("\0"))throw fail("INVALID_TERMINAL_TEXT");
    return text;
  }
  async function persistTerminal(p: PreparedPersonalAttempt,text: string,signal?: AbortSignal) {
    signal?.throwIfAborted();await transport.assertCurrent(p);signal?.throwIfAborted();
    // One stable terminal identity across live delivery and persisted recovery.
    // Same exact projection replays, a changed terminal conflicts in Core.
    const observationId=await repository.observe(p.attemptId,"sdk-terminal-response","terminal_reply",{...correlation(p),text});
    signal?.throwIfAborted();
    const messageId=await repository.promote(p.attemptId,observationId);
    await transport.assertCurrent(p);
    return {state:"canonical_response" as const,messageId};
  }
  async function recover(p: PreparedPersonalAttempt,signal?: AbortSignal) {
    const messages=await completeHistory(p,signal),found=new Map<string,string>();let unsupportedFinal=false;
    if(messages===null)return {state:"reconciliation_required" as const,attemptId:p.attemptId};
    for(const value of messages) {
      const message=record(value),meta=record(message?.__openclaw);
      if(!message || !meta || typeof meta.id!=="string" || !meta.id.trim() || Buffer.byteLength(meta.id)>200 ||
        message.role!=="assistant" || message.stopReason!=="stop" || message.endTurn===false ||
        message.isError===true || typeof message.errorMessage==="string" || message.truncated===true || meta.truncated===true ||
        message.openclawStreamFallback!==undefined || record(message.openclawAbort)?.aborted===true ||
        (message.phase!==undefined && message.phase!=="final_answer") ||
        (message.openclawDeliveryMirror!==undefined && record(message.openclawDeliveryMirror)?.final!==true))continue;
      // Original SDK persists provider run ownership in __openclaw.runId;
      // gateway-authored transcript injections carry the exact idempotencyKey.
      // Present but contradictory identities are never treated as aliases.
      if(meta.runId!==undefined && meta.runId!==p.sdkRunId)continue;
      if(message.idempotencyKey!==undefined && message.idempotencyKey!==p.sdkRunId)continue;
      if(meta.runId!==p.sdkRunId && message.idempotencyKey!==p.sdkRunId)continue;
      try {
        const text=terminalText(message);
        if(found.has(meta.id) && found.get(meta.id)!==text)throw fail("AMBIGUOUS_HISTORY_TERMINAL");
        found.set(meta.id,text);
      } catch(error) {
        if(error instanceof Error && error.message.endsWith("AMBIGUOUS_HISTORY_TERMINAL"))throw error;
        // A same-run final media/result row prevents accepting only a text
        // sibling and thereby silently losing part of the completed output.
        unsupportedFinal=true;continue;
      }
    }
    if(found.size>1)throw fail("AMBIGUOUS_HISTORY_TERMINAL");
    if(unsupportedFinal)return {state:"reconciliation_required" as const,attemptId:p.attemptId};
    if(found.size===1)return persistTerminal(p,[...found.values()][0],signal);
    // Bounded history absence/consumption never authorizes a replacement send.
    return {state:"reconciliation_required" as const,attemptId:p.attemptId};
  }
  async function existing(receiptId: string) {
    const p=await repository.read(receiptId);
    if(!p)throw fail("ORIGINAL_ATTEMPT_REQUIRED");
    await transport.assertCurrent(p);return p;
  }
  return Object.freeze({
    async dispatch(receiptId: string,signal?: AbortSignal) {
      signal?.throwIfAborted();
      const p=await repository.prepare(receiptId); // durable commit BEFORE SDK IO
      signal?.throwIfAborted();
      if(!p.freshlyCreated)return recover(p,signal);
      await transport.assertCurrent(p);signal?.throwIfAborted();
      // Fail closed on changed exact session before handing the original to SDK.
      const preflight=await history(p,signal);
      const activeLeaf=sessionLeaf(p,preflight,true);
      if(activeLeaf===undefined)throw fail("ACTIVE_SESSION_LEAF_REQUIRED");
      const guards=await transport.assertCurrent(p);signal?.throwIfAborted();
      if(!guards || typeof guards.expectedSessionRoutingContract!=="string" ||
        !guards.expectedSessionRoutingContract.trim() || Buffer.byteLength(guards.expectedSessionRoutingContract)>1024 ||
        (guards.expectedLeafEntryId!==null && (typeof guards.expectedLeafEntryId!=="string" || !guards.expectedLeafEntryId.trim() || Buffer.byteLength(guards.expectedLeafEntryId)>256)))throw fail("SESSION_GUARDS_REQUIRED");
      let raw: unknown;
      try {
        raw=await transport.request("chat.send",{
          sessionKey:p.sdkSessionKey,sessionId:p.sdkSessionId,agentId:personalSdkAgentId(p),
          message:p.body,idempotencyKey:p.sdkRunId,
          expectedSessionRoutingContract:guards.expectedSessionRoutingContract,
          expectedLeafEntryId:activeLeaf,
        },signal);
      } catch(error) {
        await transport.assertCurrent(p);
        // Unknown error shapes are conservatively potentially sent. No raw
        // exception, credentials or provider text is copied into Core receipts.
        const sent=record(error)?.requestSent;
        await repository.observe(p.attemptId,"sdk-send-unknown","transport_unknown",{
          ...correlation(p),requestSent:typeof sent==="boolean"?sent:true,
        });
        return {state:"transport_unknown" as const,attemptId:p.attemptId};
      }
      await transport.assertCurrent(p);
      const ack=record(raw);
      if(!ack || ack.runId!==p.sdkRunId || !["started","in_flight","ok","accepted"].includes(String(ack.status)))throw fail("INVALID_ACK");
      const projection: RecordValue={...correlation(p),status:ack.status};
      if(ack.messageSeq!==undefined) {
        if(!Number.isSafeInteger(ack.messageSeq) || (ack.messageSeq as number)<0)throw fail("INVALID_ACK");
        projection.messageSeq=ack.messageSeq;
      }
      await repository.observe(p.attemptId,"sdk-send-ack","acknowledged",projection);
      return {state:"acknowledged" as const,attemptId:p.attemptId};
    },
    async reconcile(receiptId: string) {
      return recover(await existing(receiptId));
    },
    async acceptEvent(receiptId: string, event: unknown) {
      const p=await existing(receiptId);
      const frame=record(event),payload=record(frame?.payload);
      if(!frame || frame.event!=="chat" || !payload || payload.runId!==p.sdkRunId || payload.sessionKey!==p.sdkSessionKey ||
        (payload.agentId!==undefined && payload.agentId!==personalSdkAgentId(p)))throw fail("FOREIGN_EVENT");
      if(!Number.isSafeInteger(payload.seq) || (payload.seq as number)<1)throw fail("INVALID_EVENT");
      if(!["final","error","aborted"].includes(String(payload.state)))return {state:"nonterminal" as const};
      // SDK chat events omit sessionId for scoped keys. Re-read the exact
      // currently admitted session; never manufacture that field from event JSON.
      await history(p);
      const key="sdk-chat-"+String(payload.seq);
      if(payload.state!=="final") {
        await repository.observe(p.attemptId,key,"terminal_error",{
          ...correlation(p),errorCode:payload.state==="aborted"?"SDK_ABORTED":"SDK_TERMINAL_ERROR",
        });
        return {state:"terminal_error" as const};
      }
      const message=record(payload.message);
      if(!message)throw fail("INVALID_TERMINAL_MESSAGE");
      return persistTerminal(p,terminalText(message));
    },
  });
}
