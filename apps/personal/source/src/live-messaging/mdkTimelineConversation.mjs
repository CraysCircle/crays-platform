const format='crays-original-mdk-current-v1';
const fields=['accountId','conversationId','groupId','membershipId','pubkey','kind'];
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const failure=()=>Error('The admitted group conversation is unavailable');
/** Normal desktop HumanConversationClient over original MDK canonical order.
 * Requires a distinct current Core grant AND an original-MDK command client.
 * This never upgrades a legacy group, supplies a writer, or grants a VIF link.
 * Publication verdicts continue to come only from that admitted command port.
 */
export async function openMdkTimelineConversation({binding:input,runtime,commands,authorize,signal,pageSize=50,maxVisible=500}){
 const binding=Object.freeze({...input});
 if(!['spot','circle'].includes(binding.kind)||!fields.every(key=>typeof binding[key]==='string'&&binding[key].length>0)||!hex(binding.pubkey)||runtime?.storageFormat!==format||runtime.accountPubkey!==binding.pubkey||commands?.storageFormat!==format||typeof authorize!=='function'||!signal?.addEventListener||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>200||!Number.isSafeInteger(maxVisible)||maxVisible<pageSize||maxVisible>1000||['readTimeline','subscribeTimeline'].some(key=>typeof runtime[key]!=='function')||['getAdmission','getSnapshot','subscribe','refresh','prepareAttempt','acknowledgeAttempt','send','close'].some(key=>typeof commands[key]!=='function'))throw failure();
 const listeners=new Set();let closed=false,verified=false,rows=[],more=false,desired=pageSize,busy=false,problem=null,inFlight=null,sequence=0,unsubscribeSource,unsubscribeCommands,expiryTimer;
 let snapshot=Object.freeze({state:'loading',available:false,messages:Object.freeze([]),sending:false,problem:null});
 const admitted=()=>{try{const actual=commands.getAdmission();return !closed&&!signal.aborted&&authorize(binding,'read')===true&&fields.every(key=>actual?.[key]===binding[key])&&commands.getSnapshot().available===true;}catch{return false;}};
 const check=()=>{if(!admitted())throw failure();};
 const writable=()=>verified&&commands.getSnapshot().canSend!==false&&authorize(binding,'send')===true;
 const notify=()=>{for(const listener of listeners)try{listener();}catch{}};
 function close(){
  if(closed)return;closed=true;sequence++;clearTimeout(expiryTimer);signal.removeEventListener('abort',close);unsubscribeSource?.();unsubscribeCommands?.();rows=[];
  snapshot=Object.freeze({state:'closed',available:false,messages:Object.freeze([]),sending:false,problem:null});notify();listeners.clear();commands.close();
 }
 function emit(){
  if(!admitted()){close();return;}
  const base=commands.getSnapshot(),own=new Map(base.messages.map(row=>[row.id,row])),messages=[];
  let nextExpiry=Infinity;const now=Date.now()/1000;
  for(const row of rows){
   if(row.retention_expires_at!==null&&row.retention_expires_at!==undefined){if(row.retention_expires_at<=now)continue;nextExpiry=Math.min(nextExpiry,row.retention_expires_at);}
   if(row.kind!==9||row.deleted||row.invalidation_status!==null)continue;
   const receipt=own.get(row.message_id_hex),matched=receipt?.text===row.plaintext&&receipt.author===row.sender;
   messages.push(Object.freeze({id:row.message_id_hex,text:row.plaintext,author:row.sender,createdAt:row.timeline_at,
    status:row.sender===binding.pubkey?(matched&&receipt.status==='sent-to-relay'?'sent-to-relay':'unconfirmed'):'received',
    ...(hex(row.reply_to_message_id_hex)?{replyTo:row.reply_to_message_id_hex}:{}),
    ...(matched&&receipt.requestId?{requestId:receipt.requestId}:{}),
   }));
  }
  // Only the independently admitted writer owns local pending rows/receipts.
  const shown=new Set(messages.map(row=>row.id));
  for(const row of base.messages)if(!shown.has(row.id)&&typeof row.id==='string'&&row.id.startsWith('pending:')&&row.author===binding.pubkey&&['sending','unconfirmed'].includes(row.status)&&!rows.some(source=>source.message_id_hex===row.id))messages.push(Object.freeze({...row}));
  clearTimeout(expiryTimer);
  if(Number.isFinite(nextExpiry)&&nextExpiry>now)expiryTimer=setTimeout(()=>{emit();void refresh().catch(()=>{});},Math.min(2147483647,Math.max(1,(nextExpiry-now)*1000)));
  const pinned=base.pinnedReply&&messages.find(row=>row.id===base.pinnedReply.id&&row.text===base.pinnedReply.text&&row.author===base.pinnedReply.author);
  snapshot=Object.freeze({...base,available:true,canSend:verified&&base.canSend!==false&&authorize(binding,'send')===true,messages:Object.freeze(messages),pinnedReply:pinned||null,loadingEarlier:busy,hasEarlierMessages:more,historyExpanded:desired>pageSize,historyWindowLimit:maxVisible,problem:problem||base.problem});notify();
 }
 function validate(page){
  if(!page||!Array.isArray(page.messages)||page.messages.length>pageSize||typeof page.has_more_before!=='boolean')throw failure();
  for(const row of page.messages){
   if(row.group_id_hex!==binding.groupId||!hex(row.message_id_hex)||typeof row.plaintext!=='string'||!Number.isSafeInteger(row.timeline_at)||row.timeline_at<0||typeof row.deleted!=='boolean'||!(row.invalidation_status===null||typeof row.invalidation_status==='string')||row.kind===9&&!hex(row.sender))throw failure();
  }
  return page;
 }
 async function readWindow(size,token){
  const result=[],seen=new Set();let before,hasMore=true;
  while(result.length<size&&hasMore){
   check();const page=validate(await runtime.readTimeline(binding.groupId,{before,limit:Math.min(pageSize,size-result.length)}));check();if(token!==sequence)return null;
   for(const row of page.messages){if(seen.has(row.message_id_hex))throw failure();seen.add(row.message_id_hex);}
   result.unshift(...page.messages);hasMore=page.has_more_before;
   const oldest=page.messages[0];if(hasMore&&!oldest)throw failure();
   before=oldest?{at:oldest.timeline_at,messageId:oldest.message_id_hex}:undefined;
  }
  return{rows:result,more:hasMore};
 }
 function refresh(){
  if(inFlight)return inFlight;try{check();}catch{close();return Promise.reject(failure());}
  const token=++sequence;busy=true;emit();
  const work=(async()=>{try{const page=await readWindow(desired,token);check();if(!page||token!==sequence)return;rows=page.rows;more=page.more;problem=null;verified=true;}catch{if(admitted()){if(token===sequence){problem='Group history could not be verified. Try again.';rows=[];verified=false;}}else close();throw failure();}finally{busy=false;if(!closed)emit();}})();
  inFlight=work;void work.finally(()=>{if(inFlight===work)inFlight=null;}).catch(()=>{});return work;
 }
 const sourceChanged=change=>{if(change?.kind==='closed'||!admitted()){close();return;}
  // Conceal until the new canonical projection is read. Invalidation must not
  // leave old cached plaintext visible during an asynchronous refresh.
  sequence++;if(change?.kind!=='append'){verified=false;rows=[];}emit();const pending=inFlight??Promise.resolve();void pending.catch(()=>{}).then(()=>refresh()).catch(()=>{});
 };
 signal.addEventListener('abort',close,{once:true});
 try{check();unsubscribeSource=runtime.subscribeTimeline(sourceChanged);unsubscribeCommands=commands.subscribe(emit);await refresh();check();}
 catch(error){close();throw error;}
 return Object.freeze({
  getAdmission:()=>admitted()?binding:null,getSnapshot(){if(!admitted())close();return snapshot;},
  subscribe(listener){if(closed)return()=>{};listeners.add(listener);return()=>listeners.delete(listener);},
  refresh:async()=>{check();await commands.refresh();check();return refresh();},
  async loadOlder(){check();if(inFlight)await inFlight;check();if(!more)return;if(desired>=maxVisible)throw Error('Return to the latest messages before loading another history window.');desired=Math.min(maxVisible,desired+pageSize);return refresh();},
  async showLatest(){check();if(inFlight)await inFlight;check();desired=pageSize;return refresh();},
  prepareAttempt:(...args)=>{check();if(!writable())throw failure();return commands.prepareAttempt(...args);},
  acknowledgeAttempt:(...args)=>{check();return commands.acknowledgeAttempt(...args);},
  send:async value=>{check();if(!writable())throw failure();const result=await commands.send(value);check();await refresh();return result;},close,
  ...(commands.messageTimer?{messageTimer:commands.messageTimer}:{}),
  ...(commands.localView?{localView:commands.localView}:{}),
  ...(commands.flushLocalView?{flushLocalView:()=>commands.flushLocalView()}:{}),
  ...(commands.pinReplyOriginal?{pinReplyOriginal(id){check();if(!snapshot.messages.some(row=>row.id===id&&['received','sent-to-relay'].includes(row.status)))throw failure();commands.pinReplyOriginal(id);emit();}}:{}),
  ...(commands.clearReplyOriginal?{clearReplyOriginal(){check();commands.clearReplyOriginal();emit();}}:{}),
  isPinnedReplyOriginal:id=>admitted()&&snapshot.pinnedReply?.id===id,
 });
}
