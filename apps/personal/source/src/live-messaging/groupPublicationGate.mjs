import {welcomeContextDigest} from './welcomeContextDigest.mjs';
/** Prevents the SDK's automatic retained-commit retry from becoming an implicit
 * resend. It only restricts an already admitted network. A classifier MUST use
 * the exact SDK pending record, never guess from a shared relay or envelope kind.
 * Ledger contains public artifact IDs/relay receipts, no MLS secrets/plaintext. */
export async function openGroupPublicationGate({network,journal,binding:input,classify,authorize,authorizeGroup,authorizeTransport,signal,verifyEvent,maxGroups=4096}){
 const binding=Object.freeze({...input}),lifetime=new AbortController();
 if(!binding.accountId||!binding.pubkey||typeof network?.publish!=='function'||typeof classify!=='function'||typeof authorize!=='function'||typeof authorizeGroup!=='function'||typeof authorizeTransport!=='function'||typeof verifyEvent!=='function'||!journal?.getItem||!journal?.setItem||!signal?.addEventListener||!Number.isSafeInteger(maxGroups)||maxGroups<1||maxGroups>4096)throw Error('Explicit current group publication gate required');
 let closed=false,queue=Promise.resolve(),persistenceWarning=false,pendingCount=0;const welcomeProofs=new WeakMap(),rows=new Map(),permits=new Set();
 const current=()=>!closed&&!signal.aborted&&authorize(binding)===true;
 const reject=(urls,message)=>Object.fromEntries(urls.map(url=>[url,{ok:false,uncertain:true,message}]));
 const validateUrls=urls=>Array.isArray(urls)&&urls.length>0&&urls.length<=16&&new Set(urls).size===urls.length&&urls.every(url=>typeof url==='string'&&url.length<=1024);
 const boundedResponse=(urls,response)=>Object.fromEntries(urls.map(url=>{const row=response?.[url];return[url,{ok:row?.ok===true,...(row?.uncertain===true?{uncertain:true}:{}),...(typeof row?.message==='string'?{message:row.message.slice(0,1024)}:{})}];}));
 const save=()=>journal.setItem('group-publications:'+binding.accountId,{schema:1,binding,rows:[...rows.values()]});
 const close=()=>{closed=true;lifetime.abort();permits.clear();signal.removeEventListener('abort',close);};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 try{
  if(!current())throw Error('Group publication account is no longer current');const saved=await journal.getItem('group-publications:'+binding.accountId);if(!current())throw Error('Group publication account is no longer current');
  if(saved){if(saved.schema!==1||JSON.stringify(saved.binding)!==JSON.stringify(binding)||!Array.isArray(saved.rows)||saved.rows.length>maxGroups)throw Error('Group publication journal scope mismatch');for(const row of saved.rows){if(!row||typeof row.groupId!=='string'||!row.groupId||row.groupId.length>256||typeof row.parentToken!=='string'||!row.parentToken||row.parentToken.length>1024||row.actorPubkey!==binding.pubkey||(row.invitees!==undefined&&(!Array.isArray(row.invitees)||row.invitees.length>100||!row.invitees.every(key=>/^[a-f0-9]{64}$/.test(key))))||(row.intentDigest!==undefined&&!/^[a-f0-9]{64}$/.test(row.intentDigest))||!/^[a-f0-9]{64}$/.test(row.eventId)||!['publishing','unconfirmed','acknowledged'].includes(row.state)||!validateUrls(row.relays)||rows.has(row.groupId))throw Error('Group publication record unavailable');if(row.state==='acknowledged'&&(!row.response||!row.relays.some(url=>row.response[url]?.ok===true)))throw Error('Group publication acknowledgement unavailable');if(row.invitations!==undefined&&(!Array.isArray(row.invitations)||row.invitations.length>100||!row.invitations.every(item=>item&&row.invitees?.includes(item.pubkey)&&/^[a-f0-9]{64}$/.test(item.keyPackageEventId))))throw Error('Retained invitation package unavailable');if(row.welcomes!==undefined){if(!row.welcomes||typeof row.welcomes!=='object'||Object.keys(row.welcomes).length>100)throw Error('Retained Welcome unavailable');for(const [target,welcome] of Object.entries(row.welcomes)){if(!row.invitations?.some(item=>item.pubkey===target)||!/^[a-f0-9]{64}$/.test(welcome?.eventId)||!validateUrls(welcome.relays)||!['publishing','unconfirmed','acknowledged'].includes(welcome.state))throw Error('Retained Welcome scope mismatch');if(welcome.state==='acknowledged'&&!welcome.relays.some(url=>welcome.response?.[url]?.ok===true))throw Error('Retained Welcome receipt unavailable');welcome.state=welcome.state==='publishing'?'unconfirmed':welcome.state;if(welcome.response)welcome.response=boundedResponse(welcome.relays,welcome.response);}}rows.set(row.groupId,{...row,...(row.response?{response:boundedResponse(row.relays,row.response)}:{}),state:row.state==='publishing'?'unconfirmed':row.state});}}
 }catch(error){close();throw error;}
 const publishWelcome=async(urls,event,options,operationSignal,context)=>{
  const targets=(event.tags??[]).filter(tag=>tag[0]==='p');
  if(targets.length!==1||targets[0].length!==2||!verifyEvent(event))return reject(urls,'Exact signed Welcome recipient required');
  const target=targets[0][1];let digest;try{if(context?.author!==binding.pubkey||context.recipient?.pubkey!==target)throw Error();digest=await welcomeContextDigest(context);}catch{return reject(urls,'Trusted exact SDK Welcome context required');}
  const matches=[...rows.values()].filter(row=>row.state==='acknowledged'&&(row.invitations??[]).some(item=>item.pubkey===target&&item.keyPackageEventId===context.recipient.keyPackageEventId&&item.welcomeDigest===digest));
  if(matches.length!==1)return reject(urls,'Unique confirmed invitation required');
  const row=matches[0],scope=Object.freeze({groupId:row.groupId,actorPubkey:binding.pubkey,invitees:Object.freeze([target])});
  const admitted=()=>current()&&!operationSignal.aborted&&authorizeGroup(scope)===true&&(!options.beforeSend||options.beforeSend()===true);
  if(!admitted())return reject(urls,'Current invitation permission required');
  const old=row.welcomes?.[target];
  if(old){if(old.eventId!==event.id||JSON.stringify(old.relays)!==JSON.stringify(urls))return reject(urls,'Resolve the original Welcome publication first');if(old.state==='acknowledged')return structuredClone(old.response);return reject(urls,'Original Welcome publication remains unconfirmed');}
  const welcome={eventId:event.id,relays:[...urls],state:'publishing'};row.welcomes={...row.welcomes,[target]:welcome};
  try{await save();if(!admitted())throw Error('Invitation revoked');const response=boundedResponse(urls,await network.publish(urls,event,{...options,signal:operationSignal,beforeSend:admitted}));welcome.state=urls.some(url=>response[url]?.ok===true)?'acknowledged':'unconfirmed';if(welcome.state==='acknowledged')welcome.response=response;await save().catch(()=>{persistenceWarning=true;});return response;}
  catch{welcome.state='unconfirmed';await save().catch(()=>{persistenceWarning=true;});return reject(urls,'Welcome publication is unconfirmed');}
 };
 const publish=async(urls,event,options={})=>{
  if(!validateUrls(urls)||!current()||options.signal?.aborted)return reject(Array.isArray(urls)?urls:[],'Group publication is not current');
  const operationSignal=AbortSignal.any([signal,lifetime.signal,...(options.signal?[options.signal]:[])]);
  const callerGuard=options.beforeSend;options={...options,beforeSend:()=>current()&&authorizeTransport(event)===true&&(!callerGuard||callerGuard()===true)};
  if(!options.beforeSend())return reject(urls,'Current transport scope required');
  const known=[...rows.values()].find(row=>row.eventId===event?.id);
  let classified=known;
  if(!classified){classified=await classify(event);if(!current()||options.signal?.aborted)return reject(urls,'Group publication is no longer current');}
  if(!classified){
   if(event?.kind===1059){const context=welcomeProofs.get(event);if(!context)return reject(urls,'Trusted SDK Welcome publication required');return publishWelcome(urls,event,options,operationSignal,context);}
   return network.publish(urls,event,{...options,signal:operationSignal});
  }
  if(!event||event.kind!==445||!verifyEvent(event)||typeof classified.groupId!=='string'||!classified.groupId||classified.groupId.length>256||typeof classified.parentToken!=='string'||!classified.parentToken||classified.parentToken.length>1024||classified.actorPubkey!==binding.pubkey)return reject(urls,'Exact original group publication required');
  const invitees=classified.invitees??[];if(!Array.isArray(invitees)||invitees.length>100||!invitees.every(key=>/^[a-f0-9]{64}$/.test(key)))return reject(urls,'Exact invitation targets required');
  const groupCurrent=()=>current()&&authorizeGroup(Object.freeze({groupId:classified.groupId,actorPubkey:binding.pubkey,invitees:Object.freeze([...invitees])}))===true;
  if(!groupCurrent())return reject(urls,'Current group publication permission required');
  const previous=rows.get(classified.groupId);
  if(previous&&previous.eventId!==event.id&&(previous.state!=='acknowledged'||(previous.invitations??[]).some(item=>previous.welcomes?.[item.pubkey]?.state!=='acknowledged')))return reject(urls,'Resolve the previous group publication first');
  if(previous?.eventId===event.id){
   if(JSON.stringify([...urls].sort())!==JSON.stringify([...previous.relays].sort()))return reject(urls,'Original group relay selection changed');
   if(previous.state==='acknowledged')return structuredClone(previous.response);
   if(!permits.delete(event.id))return reject(urls,'Explicit original group-publication retry required');
  }else if(!previous&&rows.size>=maxGroups)return reject(urls,'Group publication window exceeded');
  const invitations=classified.invitations??[];if(!Array.isArray(invitations)||invitations.length>100||!invitations.every(item=>invitees.includes(item.pubkey)&&/^[a-f0-9]{64}$/.test(item.keyPackageEventId)))return reject(urls,'Exact retained invite package required');
  const row={groupId:classified.groupId,parentToken:classified.parentToken,actorPubkey:classified.actorPubkey,invitees:[...invitees],invitations:structuredClone(invitations),...(classified.intentDigest?{intentDigest:classified.intentDigest}:{}),eventId:event.id,relays:[...urls],state:'publishing'};rows.set(row.groupId,row);
  try{await save();if(!groupCurrent()||options.signal?.aborted){row.state='unconfirmed';await save().catch(()=>{});return reject(urls,'Group publication is no longer current');}}
  catch{row.state='unconfirmed';persistenceWarning=true;return reject(urls,'Original group publication could not be retained');}
  let response;try{response=await network.publish(urls,event,{...options,signal:operationSignal,beforeSend:()=>groupCurrent()&&(!options.beforeSend||options.beforeSend()===true)});}catch{row.state='unconfirmed';await save().catch(()=>{persistenceWarning=true;});return reject(urls,'Group publication acknowledgement is unknown');}
  response=boundedResponse(urls,response);row.state=urls.some(url=>response[url]?.ok===true)?'acknowledged':'unconfirmed';if(row.state==='acknowledged')row.response=structuredClone(response);
  await save().catch(()=>{persistenceWarning=true;});return response;
 };
 const schedule=(urls,event,options={},context)=>{try{urls=structuredClone(urls);event=structuredClone(event);options={...options};if(context)welcomeProofs.set(event,structuredClone(context));}catch{return Promise.resolve(reject([],'Immutable original publication required'));}if(pendingCount>=64)return Promise.resolve(reject(Array.isArray(urls)?urls:[],'Group publication queue exceeded'));pendingCount++;const work=queue.then(()=>publish(urls,event,options)).finally(()=>{pendingCount--;});queue=work.catch(()=>{});return work;};
 return Object.freeze({network:{...network,publish:(urls,event,options)=>schedule(urls,event,options),publishWelcome:(urls,event,context)=>schedule(urls,event,{},context)},
  inspect(groupId){if(!current())return null;const row=rows.get(groupId);return row?Object.freeze({...structuredClone(row),persistenceWarning}):null;},
  permitOriginalRetry({groupId,eventId,parentToken}){if(!current())throw Error('Group publication account is no longer current');const row=rows.get(groupId);if(!row||authorizeGroup(Object.freeze({groupId:row.groupId,actorPubkey:binding.pubkey,invitees:Object.freeze([...(row.invitees??[])])}))!==true||row.state==='acknowledged'||row.eventId!==eventId||row.parentToken!==parentToken)throw Error('Exact unresolved original publication required');permits.add(eventId);},
  close,async settled(){await queue;},
 });
}
