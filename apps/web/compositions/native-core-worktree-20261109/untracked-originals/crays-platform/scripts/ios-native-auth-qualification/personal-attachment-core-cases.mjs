import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

/** Run only INSIDE the existing admitted disposable Core/HTTP qualifier.
 * Trusted principals below are explicit synthetic test actors, not real Auth0
 * owner/session grants. SQL, original owner/binding resolver and RLS are real.
 */
export async function qualifyPersonalAttachmentCustody({t,admin,pool,fixtures,issuer,personalCall,runtimeTarget,originalsCall,originalReadCall}) {
 assert.ok(process.env.CRAYS_NATIVE_SQL_FIXTURE_SOCKET);
 assert.equal((await admin.query('select current_database() db')).rows[0].db,'ios_native_qualification');
 const role=(await pool.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0];
 assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,false);
 await admin.query(readFileSync(new URL('../../database/migrations/0215_personal_message_attachment_custody.sql',import.meta.url),'utf8'));
 const nameMigration=readFileSync(new URL('../../database/migrations/0217_personal_message_original_display_name.sql',import.meta.url),'utf8');
 await admin.query(nameMigration);await admin.query(nameMigration);
 await admin.query(readFileSync(new URL('../../database/migrations/0217_personal_message_original_display_name.down.sql',import.meta.url),'utf8'));await admin.query(nameMigration);
 await admin.query(`grant select,insert on crays_core.personal_message_attachment_versions,crays_core.personal_message_attachment_erasures to ios_native_personal_http_fixture;
  grant select,insert,update,delete on crays_core.personal_message_attachment_payloads to ios_native_personal_http_fixture;
  grant update on crays_core.personal_message_attachment_versions to ios_native_personal_http_fixture;`);
 const api=await import('../../src/db/personal-message-attachment-custody.ts');
 const own=(await personalCall('NativePersonalConversation')).body.data.nativePersonalConversation;
 const contact=(await admin.query('select primary_contact_revision::text revision from crays_core.crays_accounts where account_id=$1',[fixtures[0].account.accountId])).rows[0].revision;
 const incoming=await personalCall('ReceiveScopedAgentMessage',{bindingId:own.bindingId,expectedBindingRevision:own.revision,
  expectedContactRevision:contact,idempotencyKey:'attachment-original-'+randomUUID(),body:'Synthetic own source for attachment custody qualification'});
 assert.ok(!incoming.body.errors,JSON.stringify(incoming.body));
 const ingress=incoming.body.data.receiveScopedAgentMessage;
 assert.ok(ingress?.messageId&&ingress.receiptId);
 let revoked=false;
 const principal=index=>Object.freeze({providerKey:'auth0',providerSubject:fixtures[index].authIdentity.providerSubject,
  issuer,clientId:'native_http_fixture',accountId:fixtures[index].account.accountId,
  recordCommittedOutbox(){throw Error('Attachment commands must not dispatch a new model turn');},
  assertCurrent(){if(revoked)throw Error('NATIVE_AUTHENTICATION_TEST_REVOKED');}});
 const a=principal(0),b=principal(1);
 const original=Buffer.from('Synthetic immutable source bytes, NOT a decoded video.');
 const input={messageId:ingress.messageId,receiptId:ingress.receiptId,idempotencyKey:'media-'+randomUUID(),
  expectedContactRevision:contact,mimeType:'video/mp4',bytes:Buffer.from(original),retainSeconds:300};
 let receipt,reference,erasure;
 await t.test('actual register/receipt and exact server hash',async()=>{
  receipt=await api.registerOwnMessageAttachment(a,input);reference={attachmentId:receipt.attachmentId,version:receipt.version,sha256:receipt.sha256};
  assert.equal(receipt.sha256,createHash('sha256').update(original).digest('hex'));
  assert.equal(receipt.effectAuthorized,false);assert.equal(receipt.attachmentDelivered,false);assert.equal(receipt.available,true);
 });
 await t.test('actual reload returns exact original bytes',async()=>assert.deepEqual((await api.readOwnMessageAttachmentOriginal(a,reference)).bytes,original));
 let named;
 await t.test('display name commits on the same immutable own version while legacy names stay null',async()=>{
  named=await api.registerOwnMessageAttachment(a,{...input,idempotencyKey:'named-'+randomUUID(),displayName:'Travel notes.pdf'});
  const rows=(await admin.query('select attachment_id,display_name from crays_core.personal_message_attachment_versions where attachment_id=any($1::text[])',[[named.attachmentId,receipt.attachmentId]])).rows;
  assert.equal(rows.find(r=>r.attachment_id===named.attachmentId).display_name,'Travel notes.pdf');assert.equal(rows.find(r=>r.attachment_id===receipt.attachmentId).display_name,null);
  assert.deepEqual((await api.readOwnMessageAttachmentOriginal(a,{attachmentId:named.attachmentId,version:1,sha256:named.sha256})).bytes,original);
 });
 await t.test('named original replay cannot rename a committed command or mutate immutable metadata',async()=>{
  const stored=(await admin.query('select idempotency_key from crays_core.personal_message_attachment_versions where attachment_id=$1',[named.attachmentId])).rows[0];
  const replay=await api.registerOwnMessageAttachment(a,{...input,idempotencyKey:stored.idempotency_key,displayName:'Travel notes.pdf'});assert.equal(replay.attachmentId,named.attachmentId);assert.equal(replay.replayed,true);
  await assert.rejects(api.registerOwnMessageAttachment(a,{...input,idempotencyKey:stored.idempotency_key,displayName:'Other.pdf'}),/IDEMPOTENCY_CONFLICT/);
  await assert.rejects(admin.query("update crays_core.personal_message_attachment_versions set display_name='Other.pdf' where attachment_id=$1",[named.attachmentId]),/immutable/);
 });
 await t.test('SQL display-name constraint independently refuses a path on an original version',async()=>{
  const c=await pool.connect();try{await c.query('begin');await c.query("select set_config('crays.native_personal_account',$1,true)",[a.accountId]);
   await assert.rejects(c.query(`insert into crays_core.personal_message_attachment_versions
   (attachment_id,account_id,canonical_person_id,agent_id,binding_id,binding_revision,contact_revision,message_id,receipt_id,registration_receipt_id,idempotency_key,command_sha256,mime_type,byte_length,source_sha256,created_at,expires_at,display_name)
   select $1,account_id,canonical_person_id,agent_id,binding_id,binding_revision,contact_revision,message_id,receipt_id,$2,$3,command_sha256,mime_type,byte_length,source_sha256,created_at,expires_at,'../escape.pdf'
   from crays_core.personal_message_attachment_versions where attachment_id=$4`,['personal-attachment-'+randomUUID(),'personal-attachment-registration-'+randomUUID(),'bad-name-'+randomUUID(),named.attachmentId]),/personal_original_display_name_bounded/);
  }finally{await c.query('rollback');c.release();}
 });
 await t.test('display-name downgrade cannot erase already recorded named history',async()=>{
  try{await assert.rejects(admin.query(readFileSync(new URL('../../database/migrations/0217_personal_message_original_display_name.down.sql',import.meta.url),'utf8')),/Named original history prevents/);}finally{await admin.query('rollback');}
  assert.equal((await admin.query('select display_name from crays_core.personal_message_attachment_versions where attachment_id=$1',[named.attachmentId])).rows[0].display_name,'Travel notes.pdf');
 });

 await t.test('same command replays original durable registration receipt',async()=>{
  const replay=await api.registerOwnMessageAttachment(a,input);assert.equal(replay.registrationReceiptId,receipt.registrationReceiptId);assert.equal(replay.attachmentId,receipt.attachmentId);assert.equal(replay.replayed,true);
 });
 await t.test('different bytes with same key fail without replacing original',async()=>{
  await assert.rejects(api.registerOwnMessageAttachment(a,{...input,bytes:Buffer.from('changed')}),/IDEMPOTENCY_CONFLICT/);
  assert.deepEqual((await api.readOwnMessageAttachmentOriginal(a,reference)).bytes,original);
 });
 await t.test('native source declarations round-trip byte-identically without decoding',async()=>{
  for(const mimeType of ['image/heic','image/heif','video/quicktime','text/plain',
   'audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/x-wav','audio/vnd.wave']){
   const r=await api.registerOwnMessageAttachment(a,{...input,idempotencyKey:'native-format-'+randomUUID(),mimeType});
   assert.equal(r.mimeType,mimeType);assert.equal(r.effectAuthorized,false);assert.equal(r.attachmentDelivered,false);
   const result=await api.readOwnMessageAttachmentOriginal(a,{attachmentId:r.attachmentId,version:r.version,sha256:r.sha256});
   assert.deepEqual(result.bytes,original);assert.equal(result.receipt.sha256,receipt.sha256);
  }
 });
 await t.test('caller mutation during first SQL await cannot retarget bytes',async()=>{
  const mutable={...input,idempotencyKey:'mutation-'+randomUUID(),bytes:Buffer.from(original)};
  const result=api.registerOwnMessageAttachment(a,mutable);mutable.bytes.fill(0);mutable.messageId='foreign-message';
  const r=await result;assert.deepEqual((await api.readOwnMessageAttachmentOriginal(a,{attachmentId:r.attachmentId,version:r.version,sha256:r.sha256})).bytes,original);
 });
 await t.test('other canonical account cannot read or reconcile owner source',async()=>{
  await assert.rejects(api.readOwnMessageAttachmentOriginal(b,reference),/ORIGINAL_UNAVAILABLE/);
  assert.equal(await api.lookupOwnRegistration(b,input.idempotencyKey),null);
 });
 await t.test('changed contact revision cannot mint a custody record',async()=>assert.rejects(api.registerOwnMessageAttachment(a,{...input,idempotencyKey:'revision-'+randomUUID(),expectedContactRevision:String(BigInt(contact)+1n)}),/CONTACT_CHANGED/));
 await t.test('unknown message/reference strings cannot become original custody',async()=>assert.rejects(api.registerOwnMessageAttachment(a,{...input,idempotencyKey:'message-'+randomUUID(),messageId:'legacy-reference-only'}),/EXACT_OWN_MESSAGE_REQUIRED/));
 await t.test('wrong exact source hash is denied',async()=>assert.rejects(api.readOwnMessageAttachmentOriginal(a,{...reference,sha256:'0'.repeat(64)}),/ORIGINAL_UNAVAILABLE/));
 async function attemptedMutation(sql,parameters) {
  const c=await pool.connect();
  try {await c.query('begin');await c.query("select set_config('crays.native_personal_account',$1,true)",[a.accountId]);await assert.rejects(c.query(sql,parameters),/immutable/);}
  finally {await c.query('rollback');c.release();}
 }
 await t.test('actual trigger rejects manifest mutation with own RLS scope',async()=>attemptedMutation("update crays_core.personal_message_attachment_versions set mime_type='image/png' where attachment_id=$1",[receipt.attachmentId]));
 await t.test('actual trigger rejects payload replacement',async()=>attemptedMutation('update crays_core.personal_message_attachment_payloads set original_bytes=$2 where attachment_id=$1',[receipt.attachmentId,Buffer.from('changed')]));
 await t.test('actual trigger rejects unreceipted payload deletion',async()=>attemptedMutation('delete from crays_core.personal_message_attachment_payloads where attachment_id=$1',[receipt.attachmentId]));
 async function attemptedErasure({removePayload,reason,expected}) {
  const c=await pool.connect();
  try {
   await c.query('begin');
   await c.query("select set_config('crays.native_personal_account',$1,true)",[a.accountId]);
   await c.query("insert into crays_core.personal_message_attachment_erasures(attachment_id,receipt_id,reason) values($1,$2,$3)",
    [receipt.attachmentId,'personal-attachment-erasure-'+randomUUID(),reason]);
   if(removePayload)await c.query('delete from crays_core.personal_message_attachment_payloads where attachment_id=$1',[receipt.attachmentId]);
   // Exercise the deferred commit boundary, not only an INSERT statement.
   await assert.rejects(c.query('commit'),expected);
  } finally {await c.query('rollback');c.release();}
  assert.deepEqual((await api.readOwnMessageAttachmentOriginal(a,reference)).bytes,original);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_erasures where attachment_id=$1',[receipt.attachmentId])).rows[0].n,0);
 }
 await t.test('erasure receipt without actual payload deletion is rejected at commit',async()=>
  attemptedErasure({removePayload:false,reason:'owner-request',expected:/requires payload removal/}));
 await t.test('early retention erasure rolls back receipt and byte deletion together',async()=>
  attemptedErasure({removePayload:true,reason:'retention-expired',expected:/retention has not expired/}));
 async function attemptedOriginal({payload,sourceHash}) {
  const id='personal-attachment-'+randomUUID(),key='deferred-'+randomUUID(),c=await pool.connect();
  try {
   await c.query('begin');
   await c.query("select set_config('crays.native_personal_account',$1,true)",[a.accountId]);
   await c.query(`insert into crays_core.personal_message_attachment_versions
    (attachment_id,account_id,canonical_person_id,agent_id,binding_id,binding_revision,contact_revision,message_id,receipt_id,
     registration_receipt_id,idempotency_key,command_sha256,mime_type,byte_length,source_sha256,created_at,expires_at)
    select $1,account_id,canonical_person_id,agent_id,binding_id,binding_revision,contact_revision,message_id,receipt_id,
     $2,$3,command_sha256,mime_type,byte_length,$4,created_at,expires_at
    from crays_core.personal_message_attachment_versions where attachment_id=$5`,
    [id,'personal-attachment-registration-'+randomUUID(),key,sourceHash,receipt.attachmentId]);
   if(payload)await c.query('insert into crays_core.personal_message_attachment_payloads(attachment_id,original_bytes) values($1,$2)',[id,payload]);
   await assert.rejects(c.query('commit'),/Exact own message attachment original required/);
  } finally {await c.query('rollback');c.release();}
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_versions where attachment_id=$1',[id])).rows[0].n,0);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_payloads where attachment_id=$1',[id])).rows[0].n,0);
 }
 await t.test('deferred commit rejects a manifest without actual original bytes',async()=>
  attemptedOriginal({payload:null,sourceHash:receipt.sha256}));
 await t.test('deferred commit rejects bytes differing from canonical source hash',async()=>
  attemptedOriginal({payload:Buffer.from(original),sourceHash:'0'.repeat(64)}));
 await t.test('own retention command refuses active original without a deletion receipt',async()=>{
  await assert.rejects(api.expireOwnMessageAttachment(a,reference),/RETENTION_NOT_EXPIRED/);
  assert.deepEqual((await api.readOwnMessageAttachmentOriginal(a,reference)).bytes,original);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_erasures where attachment_id=$1',[receipt.attachmentId])).rows[0].n,0);
 });
 let expiredReference,expiredErasure;
 await t.test('expired original fixture remains valid custody but unavailable for reading',async()=>{
  // Controlled SQL clock fixture: preserve the original five-minute lifetime
  // while moving both timestamps into the past. No production clock/trigger
  // is changed and no immutable manifest UPDATE is used.
  const id='personal-attachment-'+randomUUID(),c=await pool.connect();
  try {
   await c.query('begin');await c.query("select set_config('crays.native_personal_account',$1,true)",[a.accountId]);
   await c.query(`insert into crays_core.personal_message_attachment_versions
    (attachment_id,account_id,canonical_person_id,agent_id,binding_id,binding_revision,contact_revision,message_id,receipt_id,
     registration_receipt_id,idempotency_key,command_sha256,mime_type,byte_length,source_sha256,created_at,expires_at)
    select $1,account_id,canonical_person_id,agent_id,binding_id,binding_revision,contact_revision,message_id,receipt_id,
     $2,$3,command_sha256,mime_type,byte_length,source_sha256,now()-interval '10 minutes',now()-interval '5 minutes'
    from crays_core.personal_message_attachment_versions where attachment_id=$4`,
    [id,'personal-attachment-registration-'+randomUUID(),'expired-'+randomUUID(),receipt.attachmentId]);
   await c.query('insert into crays_core.personal_message_attachment_payloads(attachment_id,original_bytes) values($1,$2)',[id,original]);
   await c.query('commit');
  } finally {await c.query('rollback');c.release();}
  expiredReference={...reference,attachmentId:id};
  await assert.rejects(api.readOwnMessageAttachmentOriginal(a,expiredReference),/ORIGINAL_UNAVAILABLE/);
 });
 await t.test('own expiry command commits byte removal with actual retention receipt',async()=>{
  expiredErasure=await api.expireOwnMessageAttachment(a,expiredReference);
  assert.equal(expiredErasure.reason,'retention-expired');assert.equal(expiredErasure.bytesErased,true);assert.equal(expiredErasure.replayed,false);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_payloads where attachment_id=$1',[expiredReference.attachmentId])).rows[0].n,0);
  assert.equal((await admin.query('select reason from crays_core.personal_message_attachment_erasures where attachment_id=$1',[expiredReference.attachmentId])).rows[0].reason,'retention-expired');
 });
 await t.test('expiry reconciliation retains original receipt and cannot recreate bytes',async()=>{
  assert.equal((await api.expireOwnMessageAttachment(a,expiredReference)).receiptId,expiredErasure.receiptId);
  assert.equal((await api.eraseOwnMessageAttachment(a,expiredReference)).reason,'retention-expired');
  await assert.rejects(api.readOwnMessageAttachmentOriginal(a,expiredReference),/ORIGINAL_UNAVAILABLE/);
 });
 await t.test('actual non-owner RLS hides manifest payload and erasure records',async()=>{
  const c=await pool.connect();
  try {
   await c.query('begin');await c.query("select set_config('crays.native_personal_account',$1,true)",[b.accountId]);
   for(const table of ['personal_message_attachment_versions','personal_message_attachment_payloads','personal_message_attachment_erasures'])
    assert.equal((await c.query(`select count(*)::int n from crays_core.${table} where attachment_id=$1`,[receipt.attachmentId])).rows[0].n,0);
  } finally {await c.query('rollback');c.release();}
 });
 await t.test('own erasure atomically removes payload and preserves receipt',async()=>{
  erasure=await api.eraseOwnMessageAttachment(a,reference);assert.equal(erasure.bytesErased,true);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_payloads where attachment_id=$1',[receipt.attachmentId])).rows[0].n,0);
 });
 await t.test('erased original cannot be read',async()=>assert.rejects(api.readOwnMessageAttachmentOriginal(a,reference),/ORIGINAL_UNAVAILABLE/));
 await t.test('same old upload command cannot resurrect erased bytes',async()=>{
  const replay=await api.registerOwnMessageAttachment(a,input);assert.equal(replay.available,false);assert.equal(replay.registrationReceiptId,receipt.registrationReceiptId);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_payloads where attachment_id=$1',[receipt.attachmentId])).rows[0].n,0);
 });
 await t.test('erasure retry retains exact original erasure receipt',async()=>assert.equal((await api.eraseOwnMessageAttachment(a,reference)).receiptId,erasure.receiptId));
 await t.test('read-only registration reconciliation keeps erased state',async()=>{
  const reconciled=await api.lookupOwnRegistration(a,input.idempotencyKey);assert.equal(reconciled.available,false);assert.equal(reconciled.attachmentId,receipt.attachmentId);
 });
 await t.test('revoked trusted test principal receives no source bytes',async()=>{
  revoked=true;try{await assert.rejects(api.readOwnMessageAttachmentOriginal(a,reference),/TEST_REVOKED/);}finally{revoked=false;}
 });
 // Atomic source+message ingress, through original current Core owner/RLS and
 // original outbox. Synthetic principals remain explicit; no live SDK/model IO.
 const {receiveOwnPersonalMessageWithOriginals:receive}=await import('../../src/db/personal-messenger-adapter.ts');
 const {createNativePersonalRuntimeRepository}=await import('../../src/db/native-personal-runtime-repository.ts');
 const runtime=createNativePersonalRuntimeRepository({...runtimeTarget,bindingId:own.bindingId,bindingRevision:own.revision,contactRevision:contact},async()=>{});
 let wakes=0;
 const atomicPrincipal=Object.freeze({...a,recordCommittedOutbox(){wakes++;}});
 const fresh=()=>({bindingId:own.bindingId,expectedBindingRevision:own.revision,expectedContactRevision:contact,
  idempotencyKey:'atomic-'+randomUUID(),body:'Atomic original plus text',originals:[{mimeType:'text/plain',bytes:Buffer.from('atomic source'),retainSeconds:300}]});
 let atomicInput,atomicReceipt;
 await t.test('atomic message, source manifest/payload, ingress and outbox commit together',async()=>{
  atomicInput=fresh();atomicReceipt=await receive(atomicPrincipal,atomicInput);assert.equal(wakes,1);
  const rows=await admin.query(`select m.body,m.attachment_refs,v.attachment_id,p.original_bytes,o.state
   from crays_core.messages m join crays_core.personal_messenger_ingress_receipts r on r.message_id=m.message_id
   join crays_core.personal_messenger_outbox o on o.receipt_id=r.receipt_id
   join crays_core.personal_message_attachment_versions v on v.message_id=m.message_id
   join crays_core.personal_message_attachment_payloads p on p.attachment_id=v.attachment_id where r.receipt_id=$1`,[atomicReceipt.receiptId]);
  assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].body,atomicInput.body);assert.deepEqual(rows.rows[0].original_bytes,atomicInput.originals[0].bytes);
  assert.deepEqual(rows.rows[0].attachment_refs,[rows.rows[0].attachment_id]);assert.equal(rows.rows[0].state,'waiting_runtime_admission');
 });
 await t.test('atomic lost acknowledgement replay keeps message/receipt/source and wakes once',async()=>{
  const r=await receive(atomicPrincipal,atomicInput);assert.equal(r.messageId,atomicReceipt.messageId);assert.equal(r.receiptId,atomicReceipt.receiptId);assert.equal(r.replayed,true);assert.equal(wakes,1);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_versions where message_id=$1',[r.messageId])).rows[0].n,1);
 });
 await t.test('atomic same key with changed bytes or metadata conflicts before new writes',async()=>{
  for(const delta of [{bytes:Buffer.from('different')},{mimeType:'image/png'},{retainSeconds:301}])await assert.rejects(receive(atomicPrincipal,{...atomicInput,originals:[{...atomicInput.originals[0],...delta}]}),/IDEMPOTENCY_CONFLICT/);
  assert.equal(wakes,1);
 });
 await t.test('atomic multi-original order participates in replay identity',async()=>{
  const v=fresh();v.originals.push({mimeType:'text/plain',bytes:Buffer.from('second source'),retainSeconds:300});
  const r=await receive(atomicPrincipal,v);await assert.rejects(receive(atomicPrincipal,{...v,originals:[...v.originals].reverse()}),/IDEMPOTENCY_CONFLICT/);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_versions where message_id=$1',[r.messageId])).rows[0].n,2);
 });
 await t.test('atomic file-only original retains empty body and cannot enter text dispatcher',async()=>{
  const r=await receive(atomicPrincipal,{...fresh(),body:''});assert.equal((await admin.query('select body from crays_core.messages where message_id=$1',[r.messageId])).rows[0].body,'');
  await assert.rejects(runtime.prepare(r.receiptId),/MEDIA_ADMISSION_REQUIRED/);
 });
 await t.test('attached message excluded from text pending page and direct claim rolls back attempt',async()=>{
  const ids=[];let cursor=null;do{const page=await runtime.pendingOutboxPage(cursor,20);ids.push(...page.receiptIds);cursor=page.nextAfterReceiptId;}while(cursor!==null);
  assert.ok(!ids.includes(atomicReceipt.receiptId));await assert.rejects(runtime.prepare(atomicReceipt.receiptId),/MEDIA_ADMISSION_REQUIRED/);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_messenger_runtime_attempts where receipt_id=$1',[atomicReceipt.receiptId])).rows[0].n,0);
 });
 await t.test('second-source SQL failure rolls back entire message, first source, receipts and outbox',async()=>{
  const v=fresh();v.originals.push({mimeType:'text/plain',bytes:Buffer.from('reject-atomic-original'),retainSeconds:300});
  await admin.query(`create function crays_core.atomic_original_fixture_denial() returns trigger language plpgsql as $$ begin
   if new.original_bytes=convert_to('reject-atomic-original','UTF8') then raise exception 'Synthetic second-source failure';end if;return new;end $$;
   create trigger atomic_original_fixture_denial before insert on crays_core.personal_message_attachment_payloads for each row execute function crays_core.atomic_original_fixture_denial()`);
  const count=(await admin.query('select count(*)::int n from crays_core.personal_message_attachment_versions')).rows[0].n,before=wakes;
  try{await assert.rejects(receive(atomicPrincipal,v),/UNAVAILABLE/);}finally{await admin.query('drop trigger atomic_original_fixture_denial on crays_core.personal_message_attachment_payloads;drop function crays_core.atomic_original_fixture_denial()');}
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_versions')).rows[0].n,count);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where idempotency_key=$1',[v.idempotencyKey])).rows[0].n,0);assert.equal(wakes,before);
 });
 await t.test('atomic postcommit wake failure reconciles original key without duplicate',async()=>{
  const v=fresh();const lost=Object.freeze({...a,recordCommittedOutbox(){throw Error('synthetic lost wake acknowledgement');}});
  await assert.rejects(receive(lost,v),/OUTCOME_UNKNOWN/);const r=await receive(atomicPrincipal,v);assert.equal(r.replayed,true);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where idempotency_key=$1',[v.idempotencyKey])).rows[0].n,1);
 });
 await t.test('atomic wrong person/contact creates no message and no wake',async()=>{
  const v=fresh(),before=wakes;
  const foreignContact=(await admin.query('select primary_contact_revision::text revision from crays_core.crays_accounts where account_id=$1',[b.accountId])).rows[0].revision;
  await assert.rejects(receive({...b,recordCommittedOutbox(){wakes++;}},{...v,expectedContactRevision:foreignContact}),/BINDING_CHANGED/);
  await assert.rejects(receive(atomicPrincipal,{...v,expectedContactRevision:String(BigInt(contact)+1n)}),/CONTACT_CHANGED/);assert.equal(wakes,before);
 });
 await t.test('atomic captured caller mutation after first await cannot alter stored bytes/body',async()=>{
  const v=fresh(),expected=Buffer.from(v.originals[0].bytes),body=v.body,pending=receive(atomicPrincipal,v);v.body='changed';v.originals[0].bytes.fill(0);
  const r=await pending;const row=(await admin.query(`select m.body,p.original_bytes from crays_core.messages m
   join crays_core.personal_message_attachment_versions v on v.message_id=m.message_id
   join crays_core.personal_message_attachment_payloads p on p.attachment_id=v.attachment_id where m.message_id=$1`,[r.messageId])).rows[0];
  assert.equal(row.body,body);assert.deepEqual(row.original_bytes,expected);
 });
 await t.test('existing text claim forbids later original append without modifying its request',async()=>{
  const v=fresh();const text=await personalCall('ReceiveScopedAgentMessage',Object.fromEntries(Object.entries(v).filter(([key])=>key!=='originals')));
  assert.ok(!text.body.errors,JSON.stringify(text.body));const r=text.body.data.receiveScopedAgentMessage,claim=await runtime.prepare(r.receiptId);
  await assert.rejects(api.registerOwnMessageAttachment(a,{...input,messageId:r.messageId,receiptId:r.receiptId,idempotencyKey:'late-'+randomUUID()}),/MESSAGE_ALREADY_CLAIMED/);
  assert.equal((await runtime.read(r.receiptId)).attemptId,claim.attemptId);assert.deepEqual((await admin.query('select attachment_refs from crays_core.messages where message_id=$1',[r.messageId])).rows[0].attachment_refs,[]);
 });

 const binaryInput=()=>{
  const v=fresh();return {metadata:{...v,originals:v.originals.map(o=>({mimeType:o.mimeType,retainSeconds:o.retainSeconds,byteLength:o.bytes.length,sha256:createHash('sha256').update(o.bytes).digest('hex')}))},originals:v.originals};
 };
 let binary,binaryReceipt;
 await t.test('actual authenticated binary HTTP stores exact original atomically in current own Core',async()=>{
  binary=binaryInput();const r=await originalsCall(binary.metadata,binary.originals);assert.equal(r.status,200,JSON.stringify(r.body));assert.match(r.headers.get('cache-control'),/no-store/);
  binaryReceipt=r.body.data.receiveScopedAgentMessageWithOriginals;assert.equal(binaryReceipt.outcome,'STORED_RUNTIME_UNAVAILABLE');
  const rows=await admin.query(`select m.body,p.original_bytes,v.source_sha256 from crays_core.messages m
   join crays_core.personal_message_attachment_versions v on v.message_id=m.message_id
   join crays_core.personal_message_attachment_payloads p on p.attachment_id=v.attachment_id where m.message_id=$1`,[binaryReceipt.messageId]);
  assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].body,binary.metadata.body);assert.deepEqual(rows.rows[0].original_bytes,binary.originals[0].bytes);assert.equal(rows.rows[0].source_sha256,binary.metadata.originals[0].sha256);
  await assert.rejects(runtime.prepare(binaryReceipt.receiptId),/MEDIA_ADMISSION_REQUIRED/);
 });
 await t.test('binary HTTP retry reconciles exact source receipt without another original',async()=>{
  const r=await originalsCall(binary.metadata,binary.originals);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.data.receiveScopedAgentMessageWithOriginals.receiptId,binaryReceipt.receiptId);assert.equal(r.body.data.receiveScopedAgentMessageWithOriginals.replayed,true);
 });
 await t.test('binary HTTP same idempotency key and changed source returns409 without replacing bytes',async()=>{
  const original={...binary.originals[0],bytes:Buffer.from('changed authenticated original')},meta={...binary.metadata,originals:[{...binary.metadata.originals[0],byteLength:original.bytes.length,sha256:createHash('sha256').update(original.bytes).digest('hex')}]};
  const r=await originalsCall(meta,[original]);assert.equal(r.status,409,JSON.stringify(r.body));assert.match(r.body.errors[0].message,/IDEMPOTENCY_CONFLICT/);
 });
 await t.test('binary HTTP wrong token scope/cookie/current person cannot store owner attachment',async()=>{
  const v=binaryInput();
  for(const options of [{scope:'fixture:identity:read fixture:personal:read'},{headers:{cookie:'forged=x'}},{subject:'auth0|ios-native-b'}]){
   const r=await originalsCall(v.metadata,v.originals,options);assert.ok([400,401,403,409].includes(r.status),JSON.stringify(r.body));assert.ok(r.body.errors?.length);assert.match(r.headers.get('cache-control'),/no-store/);
  }
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where idempotency_key=$1',[v.metadata.idempotencyKey])).rows[0].n,0);
 });
 await t.test('binary HTTP hash mismatch never creates message or receipt',async()=>{
  const v=binaryInput();v.metadata.originals[0].sha256='0'.repeat(64);const r=await originalsCall(v.metadata,v.originals);assert.equal(r.status,400,JSON.stringify(r.body));assert.match(r.body.errors[0].message,/HASH_MISMATCH/);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_messenger_ingress_receipts where idempotency_key=$1',[v.metadata.idempotencyKey])).rows[0].n,0);
 });
 await t.test('binary HTTP forged authority fields and extra file parts are not admitted',async()=>{
  const v=binaryInput();for(const [meta,options] of [[{...v.metadata,accountId:b.accountId},{}],[v.metadata,{modifyForm(f){f.append('externalURL','https://example.invalid');}}]]){
   const r=await originalsCall(meta,v.originals,options);assert.equal(r.status,400,JSON.stringify(r.body));
  }
 });
 await t.test('binary HTTP file-only body stays empty and text dispatcher has no send claim',async()=>{
  const v=binaryInput();v.metadata.body='';const r=await originalsCall(v.metadata,v.originals);assert.equal(r.status,200,JSON.stringify(r.body));
  const receipt=r.body.data.receiveScopedAgentMessageWithOriginals;assert.equal((await admin.query('select body from crays_core.messages where message_id=$1',[receipt.messageId])).rows[0].body,'');await assert.rejects(runtime.prepare(receipt.receiptId),/MEDIA_ADMISSION_REQUIRED/);
 });
 const projectionInput=binaryInput();projectionInput.metadata.body='';
 projectionInput.originals[0].displayName='Travel notes.pdf';
 projectionInput.originals.push({mimeType:'text/plain',bytes:Buffer.from('Second exact own source'),retainSeconds:300});
 projectionInput.metadata.originals=projectionInput.originals.map(o=>({mimeType:o.mimeType,retainSeconds:o.retainSeconds,byteLength:o.bytes.length,sha256:createHash('sha256').update(o.bytes).digest('hex'),...(o.displayName?{displayName:o.displayName}:{})}));
 let projectionReceipt,projectedOriginals;
 const originalPage=async(name='NativePersonalConversationOriginals',extra={})=>{
  const result=await personalCall(name,{},extra);assert.equal(result.status,200,JSON.stringify(result.body));assert.ok(!result.body.errors,JSON.stringify(result.body));
  const page=result.body.data[name==='NativePersonalTranscriptOriginals'?'nativePersonalTranscript':name==='NativePersonalRequestsOriginals'?'nativePersonalRequests':name==='BindPersonalMessengerOriginals'?'bindPersonalMessenger':'nativePersonalConversation'];
  return page;
 };
 await t.test('new original-aware APQ returns exact ordered canonical metadata for a file-only owner message',async()=>{
  const stored=await originalsCall(projectionInput.metadata,projectionInput.originals);assert.equal(stored.status,200,JSON.stringify(stored.body));projectionReceipt=stored.body.data.receiveScopedAgentMessageWithOriginals;
  const page=await originalPage(),m=page.messages.find(m=>m.messageId===projectionReceipt.messageId);assert.ok(m);assert.equal(m.body,'');assert.equal(m.hasOriginals,true);assert.equal(m.originals.length,2);projectedOriginals=m.originals;
  const ids=(await admin.query('select attachment_refs from crays_core.messages where message_id=$1',[m.messageId])).rows[0].attachment_refs;
  assert.deepEqual(m.originals.map(o=>o.attachmentId),ids);
  assert.deepEqual(m.originals.map(o=>o.sha256),projectionInput.metadata.originals.map(o=>o.sha256));
  for(const [i,o] of m.originals.entries()){
   assert.equal(o.version,1);assert.equal(o.byteLength,projectionInput.originals[i].bytes.length);assert.equal(o.mimeType,projectionInput.originals[i].mimeType);assert.equal(o.messageReceiptId,projectionReceipt.receiptId);assert.equal(o.availability,'RETAINED');
   assert.equal(o.displayName,projectionInput.originals[i].displayName??null);assert.match(o.registrationReceiptId,/^personal-attachment-registration-/);assert.ok(Date.parse(o.expiresAt)>Date.parse(o.createdAt));
  }
  assert.ok(!JSON.stringify(m).includes('original_bytes'));assert.ok(!JSON.stringify(m).includes('accountId'));
 });
 await t.test('transcript and request APQs retain the same actual original provenance without model delivery',async()=>{
  const transcript=(await originalPage('NativePersonalTranscriptOriginals')).messages.find(m=>m.messageId===projectionReceipt.messageId);
  const request=(await originalPage('NativePersonalRequestsOriginals')).requests.find(m=>m.messageId===projectionReceipt.messageId);
  assert.equal(transcript.authorKind,'OWNER');assert.deepEqual(transcript.originals,projectedOriginals);assert.equal(transcript.hasOriginals,true);
  assert.equal(request.body,'');assert.equal(request.hasOriginals,true);assert.deepEqual(request.originals,projectedOriginals);assert.equal(request.receiptId,projectionReceipt.receiptId);assert.equal(request.dispatchState,'NOT_ATTEMPTED');
  await assert.rejects(runtime.prepare(projectionReceipt.receiptId),/MEDIA_ADMISSION_REQUIRED/);
 });
 await t.test('original-aware reads require the same current own identity and read scope',async()=>{
  const foreign=await originalPage('NativePersonalTranscriptOriginals',{subject:'auth0|ios-native-b'});assert.ok(!foreign.messages.some(m=>m.messageId===projectionReceipt.messageId));assert.ok(!JSON.stringify(foreign).includes(projectedOriginals[0].sha256));
  for(const extra of [{scope:'fixture:identity:read fixture:personal:write'},{headers:{cookie:'forged=1'}}]){
   const denied=await personalCall('NativePersonalConversationOriginals',{},extra);assert.ok([401,403].includes(denied.status));assert.ok(denied.body.errors?.length);assert.ok(!JSON.stringify(denied.body).includes(projectedOriginals[0].sha256));
  }
  assert.equal((await personalCall('NativePersonalTranscriptOriginals',{accountId:b.accountId})).status,403);
 });
 await t.test('legacy raw references and duplicate associations do not invent another canonical original',async()=>{
  const text=await personalCall('ReceiveScopedAgentMessage',{bindingId:own.bindingId,expectedBindingRevision:own.revision,expectedContactRevision:contact,idempotencyKey:'projection-legacy-'+randomUUID(),body:'Synthetic raw reference must not become custody'});
  const textId=text.body.data.receiveScopedAgentMessage.messageId;
  await admin.query('update crays_core.messages set attachment_refs=$2::jsonb where message_id=$1',[textId,JSON.stringify([projectedOriginals[0].attachmentId,'personal-attachment-'+randomUUID()])]);
  await admin.query('update crays_core.messages set attachment_refs=attachment_refs||jsonb_build_array($2::text) where message_id=$1',[projectionReceipt.messageId,projectedOriginals[0].attachmentId]);
  const page=await originalPage();const original=page.messages.find(m=>m.messageId===projectionReceipt.messageId),legacy=page.messages.find(m=>m.messageId===textId);
  assert.deepEqual(original.originals,projectedOriginals);assert.equal(legacy.hasOriginals,false);assert.deepEqual(legacy.originals,[]);
 });
 await t.test('erased original remains a truthful unavailable manifest and replay never resurrects it',async()=>{
  const first=projectedOriginals[0];await api.eraseOwnMessageAttachment(a,{attachmentId:first.attachmentId,version:first.version,sha256:first.sha256});
  const m=(await originalPage()).messages.find(m=>m.messageId===projectionReceipt.messageId);assert.equal(m.hasOriginals,true);assert.equal(m.originals[0].availability,'ERASED');assert.equal(m.originals[0].sha256,first.sha256);assert.equal(m.originals[1].availability,'RETAINED');
  const replay=await originalsCall(projectionInput.metadata,projectionInput.originals);assert.equal(replay.status,200,JSON.stringify(replay.body));assert.equal(replay.body.data.receiveScopedAgentMessageWithOriginals.replayed,true);
  await assert.rejects(api.readOwnMessageAttachmentOriginal(a,{attachmentId:first.attachmentId,version:first.version,sha256:first.sha256}),/ORIGINAL_UNAVAILABLE/);
 });
 await t.test('changed binding revision leaves a redacted file-only placeholder without original access metadata',async()=>{
  const revision=(await admin.query('select revision::text from crays_core.personal_messenger_bindings where binding_id=$1',[own.bindingId])).rows[0].revision;
  await admin.query('update crays_core.personal_messenger_bindings set revision=revision+1 where binding_id=$1',[own.bindingId]);
  try{
   const m=(await originalPage()).messages.find(m=>m.messageId===projectionReceipt.messageId);assert.equal(m.body,'');assert.equal(m.hasOriginals,true);assert.deepEqual(m.originals,[]);
   const second=projectedOriginals[1];await assert.rejects(api.readOwnMessageAttachmentOriginal(a,{attachmentId:second.attachmentId,version:second.version,sha256:second.sha256}),/ORIGINAL_UNAVAILABLE/);
  }finally{await admin.query('update crays_core.personal_messenger_bindings set revision=$2::bigint where binding_id=$1',[own.bindingId,revision]);}
 });
 await t.test('old persisted text APQs remain byte-compatible and do not claim new source projections',async()=>{
  const page=await personalCall('NativePersonalConversation');assert.equal(page.status,200,JSON.stringify(page.body));
  const m=page.body.data.nativePersonalConversation.messages.find(m=>m.messageId===projectionReceipt.messageId);assert.equal(m.body,'');assert.ok(!Object.hasOwn(m,'hasOriginals'));assert.ok(!Object.hasOwn(m,'originals'));
 });
 let downloadReceipt,downloadReference,downloadSource;
 await t.test('actual native original download reuses verified Auth0 Core and exact canonical source bytes',async()=>{
  const v=binaryInput(),stored=await originalsCall(v.metadata,v.originals);assert.equal(stored.status,200,JSON.stringify(stored.body));const ingress=stored.body.data.receiveScopedAgentMessageWithOriginals;
  downloadSource=Buffer.alloc(131073,0xad);downloadReceipt=await api.registerOwnMessageAttachment(a,{...input,messageId:ingress.messageId,receiptId:ingress.receiptId,idempotencyKey:'download-source-'+randomUUID(),bytes:downloadSource,mimeType:'video/quicktime'});
  downloadReference={attachmentId:downloadReceipt.attachmentId,version:downloadReceipt.version,sha256:downloadReceipt.sha256};
  const read=await originalReadCall(downloadReference);assert.equal(read.status,200,read.bytes.toString());assert.deepEqual(read.bytes,downloadSource);
  assert.equal(read.headers.get('content-length'),String(downloadSource.length));assert.equal(read.headers.get('content-type'),'video/quicktime');assert.equal(read.headers.get('content-encoding'),'identity');assert.equal(read.headers.get('content-disposition'),'attachment; filename="original"');
  assert.equal(read.headers.get('x-crays-original-id'),downloadReceipt.attachmentId);assert.equal(read.headers.get('x-crays-original-version'),'1');assert.equal(read.headers.get('x-crays-original-sha256'),createHash('sha256').update(read.bytes).digest('hex'));
  assert.equal(read.headers.get('x-crays-original-message-receipt'),ingress.receiptId);assert.equal(read.headers.get('x-crays-original-registration-receipt'),downloadReceipt.registrationReceiptId);assert.match(read.headers.get('cache-control'),/no-store/);
  await assert.rejects(runtime.prepare(ingress.receiptId),/MEDIA_ADMISSION_REQUIRED/);
 });
 await t.test('repeated private original reads mint no new source command receipt or model attempt',async()=>{
  const before=await admin.query(`select (select count(*) from crays_core.personal_message_attachment_versions)::text versions,
   (select count(*) from crays_core.personal_messenger_ingress_receipts)::text receipts,(select count(*) from crays_core.personal_messenger_runtime_attempts)::text attempts`);
  for(let i=0;i<3;i++){const read=await originalReadCall(downloadReference);assert.equal(read.status,200,read.bytes.toString());assert.deepEqual(read.bytes,downloadSource);}
  const after=await admin.query(`select (select count(*) from crays_core.personal_message_attachment_versions)::text versions,
   (select count(*) from crays_core.personal_messenger_ingress_receipts)::text receipts,(select count(*) from crays_core.personal_messenger_runtime_attempts)::text attempts`);assert.deepEqual(after.rows,before.rows);
 });
 await t.test('native original read requires own canonical person and read scope not just a known source ID',async()=>{
  for(const extra of [{subject:'auth0|ios-native-b'},{scope:'fixture:identity:read fixture:personal:write'},{headers:{cookie:'forged=1'}}]){
   const read=await originalReadCall(downloadReference,extra);assert.ok([400,401,403,503].includes(read.status));assert.ok(JSON.parse(read.bytes).errors?.length);assert.equal(read.headers.get('x-crays-original-id'),null);assert.ok(!read.bytes.equals(downloadSource));
  }
 });
 await t.test('native read rejects wrong digest version and model/path authority fields',async()=>{
  for(const value of [{...downloadReference,sha256:'0'.repeat(64)},{...downloadReference,version:2},{...downloadReference,accountId:b.accountId},{...downloadReference,path:'/private/other'},{...downloadReference,modelGrant:true}]){
   const read=await originalReadCall(value);assert.ok([400,403,503].includes(read.status));assert.ok(JSON.parse(read.bytes).errors?.length);assert.equal(read.headers.get('x-crays-original-sha256'),null);
  }
 });
 await t.test('native private original read never resurrects erased payload',async()=>{
  const erased=projectedOriginals[0];const read=await originalReadCall({attachmentId:erased.attachmentId,version:erased.version,sha256:erased.sha256});
  assert.equal(read.status,503);assert.ok(JSON.parse(read.bytes).errors?.length);assert.equal(read.headers.get('x-crays-original-id'),null);
  assert.equal((await admin.query('select count(*)::int n from crays_core.personal_message_attachment_payloads where attachment_id=$1',[erased.attachmentId])).rows[0].n,0);
 });
 await t.test('current binding revision is rechecked before native original-byte read',async()=>{
  const revision=(await admin.query('select revision::text from crays_core.personal_messenger_bindings where binding_id=$1',[own.bindingId])).rows[0].revision;
  await admin.query('update crays_core.personal_messenger_bindings set revision=revision+1 where binding_id=$1',[own.bindingId]);
  try{const read=await originalReadCall(downloadReference);assert.equal(read.status,503);assert.ok(JSON.parse(read.bytes).errors?.length);assert.equal(read.headers.get('x-crays-original-id'),null);}
  finally{await admin.query('update crays_core.personal_messenger_bindings set revision=$2::bigint where binding_id=$1',[own.bindingId,revision]);}
  const resumed=await originalReadCall(downloadReference);assert.equal(resumed.status,200);assert.deepEqual(resumed.bytes,downloadSource);
 });
 await t.test('native original read recomputes digest and refuses actual corrupted stored bytes',async()=>{
  assert.equal((await admin.query('select current_database() db')).rows[0].db,'ios_native_qualification');
  await admin.query('alter table crays_core.personal_message_attachment_payloads disable trigger personal_attachment_payload_immutable');
  try{
   await admin.query('update crays_core.personal_message_attachment_payloads set original_bytes=$2 where attachment_id=$1',[downloadReceipt.attachmentId,Buffer.alloc(downloadSource.length,0xbc)]);
   const read=await originalReadCall(downloadReference);assert.equal(read.status,503);assert.ok(JSON.parse(read.bytes).errors?.length);assert.equal(read.headers.get('x-crays-original-id'),null);
  }finally{
   await admin.query('update crays_core.personal_message_attachment_payloads set original_bytes=$2 where attachment_id=$1',[downloadReceipt.attachmentId,downloadSource]);await admin.query('alter table crays_core.personal_message_attachment_payloads enable trigger personal_attachment_payload_immutable');
  }
 });
 await t.test('native read keeps its16MiB boundary while internal own custody still supports larger originals',async()=>{
  const bytes=Buffer.alloc(16*1024*1024+1,0xad),r=await api.registerOwnMessageAttachment(a,{...input,messageId:downloadReceipt.messageId,receiptId:downloadReceipt.messageReceiptId,idempotencyKey:'native-read-limit-'+randomUUID(),bytes});
  const ref={attachmentId:r.attachmentId,version:r.version,sha256:r.sha256};
  try{const read=await originalReadCall(ref);assert.equal(read.status,413,read.bytes.toString());assert.ok(JSON.parse(read.bytes).errors?.length);assert.equal(read.headers.get('x-crays-original-id'),null);}
  finally{await api.eraseOwnMessageAttachment(a,ref);}
 });
 await t.test('native original busy is explicit and only its own response slot is released',async()=>{
  const {acquireNativeOriginalReadCapacity}=await import('../../src/lib/native-auth/native-personal-original-read.mjs');const lease=acquireNativeOriginalReadCapacity(a.accountId);
  try{const read=await originalReadCall(downloadReference);assert.equal(read.status,429,read.bytes.toString());assert.equal(read.headers.get('retry-after'),'1');assert.ok(JSON.parse(read.bytes).errors?.length);}
  finally{lease.release();}
  const resumed=await originalReadCall(downloadReference);assert.equal(resumed.status,200);assert.deepEqual(resumed.bytes,downloadSource);
 });

}
