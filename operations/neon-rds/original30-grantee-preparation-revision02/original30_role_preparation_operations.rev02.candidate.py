"""Specific Root-only Original30 preparation operations; source-only until pinned admission."""
from pathlib import Path
import os,stat,json,hashlib,re,datetime,subprocess,selectors,time,base64,secrets
ROOT=Path(__file__).resolve().parent
OUT=Path('/srv/crays/acceptance/native-core-original30-grantee-preparation-20261109-01')
HOST='crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com'
SQL_NAME='PREPARE_ORIGINAL30_GRANTEES.candidate.sql'
SQL_SHA='a5feae0ffb60429cfd13ac013fc15f8bb0417334f4f368920f916318ca019faa'
CONTRACT_SHA='83f60e61b44c3fbab063a5419c45fa4ca8a185c7db12e72ea84bc75eda44ac9e'
EXPECTED_NAME='expected_roles_memberships.private.json'
ADMISSION_NAME='ROOT_PREPARATION_ADMISSION.private.json'
LIMIT=524288
def need(value,code):
 if not value:raise RuntimeError(code)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def unique(pairs):
 value={}
 for key,item in pairs:need(key not in value,'DUPLICATE_JSON_KEY');value[key]=item
 return value
def parse(raw):
 def bad(_):raise ValueError('NONFINITE_JSON')
 return json.loads(raw,object_pairs_hook=unique,parse_constant=bad)
def stable(path,uid=0,maximum=LIMIT):
 path=Path(path);need(path.is_absolute() and path.resolve()==path,'EXACT_PROTECTED_PATH')
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_CLOEXEC)
 try:
  a=os.fstat(fd);need(stat.S_ISREG(a.st_mode) and a.st_uid==uid and a.st_nlink==1 and not a.st_mode&0o077 and 0<a.st_size<=maximum,'PROTECTED_INPUT_CUSTODY')
  chunks=[];length=0
  while length<=maximum:
   chunk=os.read(fd,min(65536,maximum+1-length))
   if not chunk:break
   chunks.append(chunk);length+=len(chunk)
  raw=b''.join(chunks);b=os.fstat(fd)
  need(len(raw)==a.st_size and (a.st_dev,a.st_ino,a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(b.st_dev,b.st_ino,b.st_size,b.st_mtime_ns,b.st_ctime_ns),'STABLE_INPUT_REQUIRED')
  return raw
 finally:os.close(fd)
def exclusive(name,raw):
 need(type(raw) is bytes and 0<len(raw)<=LIMIT,'BOUNDED_PRIVATE_RECEIPT')
 fd=os.open(OUT/name,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW|os.O_CLOEXEC,0o600)
 with os.fdopen(fd,'wb')as f:f.write(raw);f.flush();os.fsync(f.fileno())
 fd=os.open(OUT,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
 try:os.fsync(fd)
 finally:os.close(fd)
def encoded(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def configuration():
 sql=stable(ROOT/SQL_NAME,maximum=32768)
 need(sha(sql)==SQL_SHA,'EXACT_REVIEWED_ORIGINAL30_SQL')
 contract_raw=stable(ROOT/'ROOT_PREPARATION_CONTRACT.source-only.json',maximum=32768)
 need(sha(contract_raw)==CONTRACT_SHA,'EXACT_REVIEWED_PREPARATION_CONTRACT')
 contract=parse(contract_raw)
 expected_raw=stable(ROOT/EXPECTED_NAME);admission_raw=stable(ROOT/ADMISSION_NAME,maximum=32768)
 expected=parse(expected_raw);admission=parse(admission_raw)
 need(set(expected)=={'roles','memberships'} and type(expected['roles']) is list and len(expected['roles'])==131 and type(expected['memberships']) is list and len(expected['memberships'])==245,'EXACT_PROTECTED_131_245_PREIMAGE')
 need(len({r['name']for r in expected['roles']})==131,'UNIQUE_ORIGINAL_ROLE_PREIMAGE')
 need(admission.get('actor')=='crays_rds_admin' and admission.get('targetDatabase')=='crays_core_xl_20261109' and admission.get('sourceSQLSHA256')==SQL_SHA,'EXACT_ROOT_SQL_TARGET_BINDING')
 for key in ('executionApproved','exclusiveRoleWriterFenceHeld','prepareOriginal30Only'):need(admission.get(key) is True,'ROOT_EXACT_PREPARATION_AUTHORITY')
 for key in ('existingRolesAlterAllowed','ordinaryConnectAllowed','restoreExecutionAllowed'):need(admission.get(key) is False,'ROOT_SCOPE_NO_EXTRA_RIGHTS')
 need(type(admission.get('rootScopeId')) is str and re.fullmatch('[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}',admission['rootScopeId']),'FINITE_ROOT_SCOPE')
 need(type(admission.get('reviewSHA256')) is str and re.fullmatch('[a-f0-9]{64}',admission['reviewSHA256']),'BOUND_INDEPENDENT_REVIEW_REQUIRED')
 start=datetime.datetime.fromisoformat(admission['notBeforeUTC'].replace('Z','+00:00'));end=datetime.datetime.fromisoformat(admission['expiresAtUTC'].replace('Z','+00:00'));now=datetime.datetime.now(datetime.timezone.utc)
 need(start.tzinfo is not None and end.tzinfo is not None and start<=now and now+datetime.timedelta(seconds=95)<end and (end-start).total_seconds()<=600,'FRESH_BOUNDED_ROOT_ADMISSION')
 names=contract['candidateNames'];need(type(names) is list and len(names)==len(set(names))==30 and all(type(n) is str and re.fullmatch('[a-z_][a-z0-9_]{0,62}',n)for n in names),'EXACT_30_SOURCE_NAMES')
 need(not(set(names)&{r['name']for r in expected['roles']}),'PREPARATION_NAMES_ALREADY_PRESENT_HOLD')
 need(type(admission.get('bootstrapGrantorName')) is str and any(r['name']==admission['bootstrapGrantorName'] and r['superuser'] is True for r in expected['roles']),'BOUND_NATIVE_BOOTSTRAP_GRANTOR')
 return sql,contract,expected_raw,admission_raw,expected,admission
def inputs():
 _,_,expected,admission,_,_=configuration()
 return {EXPECTED_NAME:expected,ADMISSION_NAME:admission}
def pending_projection(raw,expected,admission,names):
 value=parse(raw)
 need(type(value) is dict and value.get('actor')==value.get('sessionActor')=='crays_rds_admin' and value.get('database')=='postgres' and value.get('targetDatabase')=='crays_core_xl_20261109','EXACT_PENDING_SESSION')
 for key in ('postimageValidatedBeforeCommit',):need(value.get(key) is True,'PENDING_POSTIMAGE_NOT_VALIDATED')
 for key in ('commitAcknowledged','fullOriginalAuthenticationParity','ordinaryConsumerConnectGranted','restoreExecutionApproved'):need(value.get(key) is False,'PENDING_SCOPE_DRIFT')
 need(value.get('createroleSelfGrant')=='' and value.get('createdRoleNames')==names,'EXACT_CREATED_30_NAMES')
 new_roles=[{'name':n,'login':False,'inherit':False,'createDB':False,'createRole':False,'superuser':False,'bypassRLS':False,'replication':False,'connectionLimit':-1,'validUntil':None,'migrationAdminCanSet':False,'migrationAdminHasUsage':False,'configSHA256':None}for n in names]
 new_edges=[{'role':n,'member':'crays_rds_admin','grantor':admission['bootstrapGrantorName'],'admin':True,'inherit':False,'set':False}for n in names]
 roles=sorted(expected['roles']+new_roles,key=lambda r:r['name'].encode('utf-8'))
 edges=sorted(expected['memberships']+new_edges,key=lambda r:(r['role'].encode('utf-8'),r['member'].encode('utf-8'),r['grantor'].encode('utf-8')))
 need(type(value.get('roles')) is list and value['roles']==roles and len(value['roles'])==161,'FULL_PENDING_ROLE_POSTIMAGE_NOT_EXACT')
 need(type(value.get('memberships')) is list and value['memberships']==edges and len(value['memberships'])==275,'FULL_PENDING_MEMBERSHIP_POSTIMAGE_NOT_EXACT')
 return value
def exchange(process,payload,stdout,stderr,deadline,marker=None,close_input=False):
 need(type(payload) is bytes and len(payload)<=LIMIT,'BOUNDED_PSQL_INPUT')
 selector=selectors.DefaultSelector();sent=0;open_readers=2
 try:
  for stream,label in ((process.stdout,'stdout'),(process.stderr,'stderr')):
   os.set_blocking(stream.fileno(),False);selector.register(stream,selectors.EVENT_READ,label)
  os.set_blocking(process.stdin.fileno(),False);selector.register(process.stdin,selectors.EVENT_WRITE,'stdin')
  while True:
   remaining=deadline-time.monotonic();need(remaining>0,'FINITE_PERSISTENT_PSQL_DEADLINE')
   if marker is not None and sent==len(payload) and stdout.endswith(marker):return
   if open_readers==0:
    need(marker is None and sent==len(payload),'PSQL_EXIT_BEFORE_PENDING_POSTIMAGE')
    try:process.wait(timeout=min(remaining,1))
    except subprocess.TimeoutExpired:continue
    return
   for key,_ in selector.select(min(remaining,.25)):
    if key.data=='stdin':
     try:n=os.write(key.fd,payload[sent:sent+65536])
     except BlockingIOError:continue
     need(n>0,'PSQL_STDIN_CLOSED');sent+=n
     if sent==len(payload):
      selector.unregister(key.fileobj)
      if close_input:key.fileobj.close()
    else:
     try:chunk=os.read(key.fd,65536)
     except BlockingIOError:continue
     if not chunk:selector.unregister(key.fileobj);open_readers-=1;continue
     buf=stdout if key.data=='stdout' else stderr
     buf.extend(chunk)
     need(len(buf)<=(LIMIT if key.data=='stdout' else 65536),'BOUNDED_PSQL_PRIVATE_STREAMS')
 finally:selector.close()
def commit_acknowledged(raw,stderr,returncode,ack):
 need(returncode==0 and not stderr and raw==b'COMMIT\n'+ack+b'\n','COMMIT_OUTCOME_UNKNOWN_HOLD_NO_REPLAY')
def transaction(process,sql,expected_raw,admission_raw,expected,admission,names,save,deadline,state,token,io=exchange):
 marker=('ORIGINAL30_PENDING_END_'+admission['rootScopeId'].encode('utf-8').hex()+'_'+token).encode()
 ack=('ORIGINAL30_COMMIT_ACK_'+admission['rootScopeId'].encode('utf-8').hex()+'_'+token).encode()
 # BASE64 parameters contain no psql metacommand quoting or variable interpolation.
 bound=(b"SELECT pg_catalog.set_config('crays.original30_expected',pg_catalog.convert_from(pg_catalog.decode($1,'base64'),'UTF8'),true) IS NOT NULL AND pg_catalog.set_config('crays.original30_admission',pg_catalog.convert_from(pg_catalog.decode($2,'base64'),'UTF8'),true) IS NOT NULL AS parameters_bound\n"
  +b"\\bind "+base64.b64encode(expected_raw)+b' '+base64.b64encode(admission_raw)+b"\n\\gset\n")
 payload=(b"BEGIN;\nSET LOCAL idle_in_transaction_session_timeout='30s';\nSET LOCAL transaction_timeout='90s';\n"+bound+sql+b'\n\\echo '+marker+b'\n')
 stdout=bytearray();stderr=bytearray()
 io(process,payload,stdout,stderr,deadline,marker=marker+b'\n')
 need(not stderr and stdout.endswith(marker+b'\n'),'PENDING_PROTOCOL_NOT_EXACT')
 pending=bytes(stdout[:-len(marker)-1])
 need(0<len(pending)<=LIMIT,'BOUNDED_FULL_PENDING_POSTIMAGE')
 # Capture the complete raw pending projection before JSON parsing or any postimage assertions.
 save('preparation-pending-postimage.private.json',pending)
 value=pending_projection(pending,expected,admission,names)
 save('COMMIT_ATTEMPTED_ACTUAL.safe.json',encoded({'rootScopeId':admission['rootScopeId'],'commitRequested':True,'automaticReplayAllowed':False}))
 state['commitAttempted']=True
 offset=len(stdout)
 io(process,b'\\set QUIET off\nCOMMIT;\n\\echo '+ack+b'\n\\q\n',stdout,stderr,deadline,close_input=True)
 commit_acknowledged(bytes(stdout[offset:]),bytes(stderr),process.returncode,ack)
 state['ackObserved']=True
 committed=dict(value)
 committed.update(schema='crays.native-core.original30-preparation.committed.v1',rootScopeId=admission['rootScopeId'],commitAcknowledged=True,psqlExitCode=0,commitCommandTag='COMMIT',scopeAckMatched=True,existingRolesUnchanged=True,existingMembershipsUnchanged=True)
 save('preparation-committed-actual.private.json',encoded(committed))
 return {'status':'ORIGINAL30_GRANTEES_PREPARATION_COMMITTED','commitAcknowledged':True,'createdRoleCount':30,'existingRolesUnchanged':True,'existingMembershipsUnchanged':True,'privateCommittedReceiptPath':str(OUT/'preparation-committed-actual.private.json')}
def run(cid,job,endpoint):
 os.umask(0o077)
 need(os.getuid()==0 and type(cid) is str and re.fullmatch('[a-f0-9]{64}',cid),'EXACT_OWN_CLIENT_REQUIRED')
 need(endpoint==HOST==parse(stable(ROOT/'native-binding.json'))['endpoint'],'EXACT_EXISTING_RDS_ENDPOINT')
 sql,contract,expected_raw,admission_raw,expected,admission=configuration()
 job=Path(job);need(job.is_absolute() and job.resolve()==job and job.is_dir(),'EXACT_EXISTING_CUSTODY_JOB')
 need(stable(job/'compatibility.sql',uid=1000,maximum=32768)==sql,'EXACT_RAM_SQL_COPY')
 need(stable(job/EXPECTED_NAME,uid=1000)==expected_raw and stable(job/ADMISSION_NAME,uid=1000,maximum=32768)==admission_raw,'EXACT_RAM_PRIVATE_INPUT_COPIES')
 OUT.mkdir(mode=0o700)
 exclusive('OPERATIONS_INTENT_ACTUAL.safe.json',encoded({'rootScopeId':admission['rootScopeId'],'sqlSourceSHA256':SQL_SHA,'automaticReplayAllowed':False}))
 process=None;state={'commitAttempted':False,'ackObserved':False}
 try:
  process=subprocess.Popen(['/usr/bin/docker','exec','-i',cid,'psql','-X','-qAt','--no-password','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-v','SHOW_CONTEXT=never','-h',endpoint,'-p','5432','-U','crays_rds_admin','-d','postgres'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,bufsize=0)
  return transaction(process,sql,expected_raw,admission_raw,expected,admission,contract['candidateNames'],exclusive,time.monotonic()+90,state,secrets.token_hex(16))
 except BaseException as error:
  outcome='ACK_OBSERVED_RECEIPT_NOT_DURABLE_HOLD'if state['ackObserved']else('UNKNOWN_HOLD'if state['commitAttempted']else'NO_COMMIT_SENT')
  receipt={'status':'ORIGINAL30_PREPARATION_STOP_INSPECT_SAME_INTENT_NO_REPLAY','rootScopeId':admission['rootScopeId'],'errorClass':type(error).__name__,'commitAttempted':state['commitAttempted'],'scopeAckAndExit0Observed':state['ackObserved'],'commitOutcome':outcome,'automaticReplayAllowed':False,'rawErrorPrinted':False}
  try:exclusive('STOP_ACTUAL.safe.json',encoded(receipt))
  except BaseException:pass
  raise RuntimeError('ORIGINAL30_PREPARATION_HOLD_INSPECT_EXISTING_INTENT_NO_REPLAY')from None
 finally:
  if process is not None:
   try:process.stdin.close()
   except BaseException:pass
   if process.poll()is None:
    process.terminate()
    try:process.wait(timeout=5)
    except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
   for stream in (process.stdout,process.stderr):
    try:stream.close()
    except BaseException:pass
  # This reaps only docker exec's client; the unchanged Custodian must remove the own
  # client container, RAM credential job, and children before releasing Root resources.
