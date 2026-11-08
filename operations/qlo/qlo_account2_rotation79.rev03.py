"""SOURCE79: ROOT-only AWS account2 repair. Never change XL/XXL."""
import os,stat,json,re,hashlib,secrets,subprocess,selectors,time,signal,http.client,base64
from pathlib import Path
ROOT=Path('/srv/crays/runtime/business-qlo-20261108-01')
OUT=ROOT/'key-rotation79'; NEW=OUT/'bindings/qlo-provider-read-webservice-key'
OLD=ROOT/'gateway-originals19/bindings/qlo-provider-read-webservice-key'
OLDRECEIPT=ROOT/'gateway-originals19/MATERIALIZE19_ACTUAL.json'
ACL=ROOT/'key-scope40/KEY_SCOPE40_ACTUAL.json'
DB='ac0839f3d6b11a1d08e6af3f503a33fea3030a119c5fdd16bc38a48d620226fb'
WEB='cf9c80ed35866706b4fd6fed56a7003685b67d8123f1f8cc69c6052881117f90'
IMAGES={DB:'sha256:a532724022429812ec797c285c1b540a644c15e248579c6bfdf12a8fbaab4964',WEB:'sha256:f0f4d9210c80c03f74861da26880ac7d95a8624893a11c715048482c933c0810'}
GATEWAY='crays-business-qlo-gateway-20261108-35'
ENV={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','DOCKER_HOST':'unix:///var/run/docker.sock','LANG':'C'}
ACL_PIN='1324029970a95304db2caf2747b5448f9abc532d40f160c4aea049330cf68a9b'
def need(v,c):
 if not v:raise RuntimeError(c)
def sha(b):return hashlib.sha256(b).hexdigest()
def canon(x):return json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def ident(s):return(s.st_dev,s.st_ino,s.st_uid,s.st_gid,stat.S_IMODE(s.st_mode),s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
def directory(path,mode=None):
 for p in [*reversed(path.parents),path]:
  s=p.lstat();need(stat.S_ISDIR(s.st_mode)and not stat.S_ISLNK(s.st_mode),'NO_SYMLINK_PARENT')
 s=path.lstat();need(s.st_uid==0 and s.st_gid==0 and(mode is None or stat.S_IMODE(s.st_mode)==mode),'ROOT_DIRECTORY_CUSTODY')
def read(path,mode=0o400,cap=262144):
 directory(path.parent)
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  s=os.fstat(fd);need(stat.S_ISREG(s.st_mode)and s.st_uid==0 and s.st_gid==0 and stat.S_IMODE(s.st_mode)==mode and s.st_nlink==1 and 0<s.st_size<=cap,'ROOT_FILE_CUSTODY')
  b=os.read(fd,cap+1);need(len(b)==s.st_size and ident(os.fstat(fd))==ident(s)and ident(path.lstat())==ident(s),'STABLE_ROOT_FILE')
  return b,s
 finally:os.close(fd)
def storage_admission():
 p=Path('/srv/crays/incoming/guest-runtime-bootstrap-20261105-01/persistent_storage_guards.candidate.py')
 directory(p.parent)
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  st=os.fstat(fd);need(stat.S_ISREG(st.st_mode)and st.st_uid==0 and st.st_gid==0 and not(stat.S_IMODE(st.st_mode)&0o022)and st.st_nlink==1 and 0<st.st_size<=65536,'ROOT_STORAGE_HELPER_CUSTODY')
  raw=os.read(fd,65537);need(len(raw)==st.st_size and ident(os.fstat(fd))==ident(st)and ident(p.lstat())==ident(st),'STABLE_STORAGE_HELPER_BYTES')
  need(sha(raw)=='3efa226b84d375cf96f911c620b7dbefa814f0c54abb8fa61944d0aeb658c739','EXACT_EXISTING_PERSISTENT_STORAGE_GUARD')
  ns={'__name__':'crays_existing_storage_guard79','__file__':str(p)}
  exec(compile(raw,str(p),'exec'),ns)
  mounted=ns['verify_data_mount'](Path('/srv/crays'))
  need(mounted['instanceId']=='i-0eb300e1b02414d8f'and ROOT.stat().st_dev==Path('/srv/crays').stat().st_dev,'EXACT_OWN_PERSISTENT_ROOT_MOUNT')
 finally:os.close(fd)
def syncdir(path):
 d=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
 try:os.fsync(d)
 finally:os.close(d)
def put(path,obj,raw=False):
 directory(path.parent,0o700);b=obj if raw else canon(obj)
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o400)
 with os.fdopen(fd,'wb')as f:f.write(b);f.flush();os.fsync(f.fileno())
 d=os.open(path.parent,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
 try:os.fsync(d)
 finally:os.close(d)
def dock(args,timeout=8):
 q=subprocess.run(['/usr/bin/docker',*args],capture_output=True,timeout=timeout,env=ENV)
 need(q.returncode==0 and len(q.stdout)<=262144,'BOUNDED_DOCKER_CONTROL')
 return q.stdout
def pair():
 result={}
 fmt='{"id":{{json .Id}},"image":{{json .Image}},"running":{{json .State.Running}},"pid":{{json .State.Pid}},"start":{{json .State.StartedAt}},"network":{{json .HostConfig.NetworkMode}}}'
 for cid,img in IMAGES.items():
  d=json.loads(dock(['inspect','--format',fmt,cid]));need(d['id']==cid and d['image']==img and d['running']and d['pid']>0,'ORIGINAL_QLO_PAIR')
  if cid==WEB:need(d['network']=='container:'+DB,'ORIGINAL_WEB_NAMESPACE')
  result[cid]=d
 names=dock(['ps','-a','--no-trunc','--filter','name=^/'+GATEWAY+'$','--format','{{.ID}}']).strip()
 need(not names,'GATEWAY_MUST_REMAIN_NOT_CREATED_OR_STARTED')
 return result
def key(raw):
 k=raw.strip();need(len(k)==32 and re.fullmatch(b'[A-Za-z0-9]{32}',k),'ORIGINAL_KEY_FORMAT')
 return k
def scope(rows):
 need(isinstance(rows,list)and len(rows)<=1000,'BOUNDED_ACL_ROWS');out=[]
 for r in rows:
  need(set(r)=={'resource','method'}and isinstance(r['resource'],str)and re.fullmatch('[A-Za-z0-9_]{1,100}',r['resource'])and r['method']in['GET','HEAD','POST','PUT','DELETE','PATCH'],'CLOSED_ACL_FIELDS')
  out.append((r['resource'],r['method']))
 need(len(out)==28 and len(set(out))==28 and len({x[0]for x in out})==14 and sum(x[1]=='GET'for x in out)==14 and sum(x[1]=='HEAD'for x in out)==14,'ORIGINAL_ACCOUNT2_READONLY_14')
 return sorted(out)
class Mysql:
 def __init__(self,prior=None):
  self.p=subprocess.Popen(['/usr/bin/docker','exec','-i',DB,'/usr/bin/timeout','--signal=TERM','--kill-after=2s','35s','mysql','--defaults-extra-file=/run/crays/root.cnf','--connect-timeout=5','--batch','--raw','--skip-column-names','--unbuffered','--skip-reconnect','crays_clubs_qlo'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=ENV)
  self.buffer=b'';self.sel=selectors.DefaultSelector();self.sel.register(self.p.stdout,selectors.EVENT_READ);self.tx=False;self.attempted=False
  self.send("SET SESSION sql_log_off=1; SET SESSION wait_timeout=12; SET SESSION innodb_lock_wait_timeout=3; SET SESSION lock_wait_timeout=3; SET SESSION max_execution_time=5000; SELECT JSON_OBJECT('phase','session','generalLogOff',@@GLOBAL.general_log=0,'sessionLogOff',@@SESSION.sql_log_off=1,'rootIdentity',SUBSTRING_INDEX(CURRENT_USER(),'@',1)='root','databaseExact',DATABASE()='crays_clubs_qlo','connectionId',CONNECTION_ID(),'accountEngine',(SELECT ENGINE='InnoDB' FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='qlo_webservice_account'),'permissionEngine',(SELECT ENGINE='InnoDB' FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='qlo_webservice_permission'));")
  d=self.row('session')
  need(all(d.get(n)==1 for n in ['generalLogOff','sessionLogOff','rootIdentity','databaseExact','accountEngine','permissionEngine'])and type(d.get('connectionId'))is int,'PRIVATE_MYSQL_SESSION_ADMISSION')
  self.connection=d['connectionId']
  if prior is not None:
   need(type(prior)is int and prior>0,'PRIOR_SESSION_ID')
   self.send("SELECT JSON_OBJECT('phase','prior','gone',NOT EXISTS(SELECT 1 FROM information_schema.processlist WHERE ID="+str(prior)+"));")
   need(self.row('prior')['gone']==1,'PRIOR_CLIENT_STILL_LIVE_READONLY_STOP')
 def send(self,s):
  s=s.replace('@KEY@',chr(96)+'key'+chr(96))
  self.p.stdin.write((s+'\n').encode());self.p.stdin.flush()
 def frame(self):
  end=time.monotonic()+7
  while b'\n'not in self.buffer:
   need(time.monotonic()<end,'BOUNDED_MYSQL_FRAME_TIMEOUT')
   ready=self.sel.select(max(0,min(1,end-time.monotonic())));need(self.p.poll()is None or ready,'MYSQL_CLIENT_EXITED')
   if ready:
    b=os.read(self.p.stdout.fileno(),65536);need(b,'MYSQL_STREAM_EOF')
    self.buffer+=b;need(len(self.buffer)<=262144,'MYSQL_FRAME_CAP')
  line,self.buffer=self.buffer.split(b'\n',1);need(len(line)<=65536,'MYSQL_LINE_CAP')
  d=json.loads(line);need(isinstance(d,dict),'MYSQL_JSON_OBJECT');return d
 def row(self,phase):
  d=self.frame();need(d.get('phase')==phase,'MYSQL_CLOSED_PHASE');return d
 def vars(self,old,new):
  self.send("SET @rotation79_old=UNHEX('"+old.hex()+"'),@rotation79_new=UNHEX('"+new.hex()+"');")
 def inspect(self,lock=False):
  self.send(("START TRANSACTION;"if lock else"START TRANSACTION READ ONLY;")+" SELECT JSON_OBJECT('phase','account','active',active,'oldMatches',BINARY @KEY@=@rotation79_old,'newMatches',BINARY @KEY@=@rotation79_new,'keyLength',CHAR_LENGTH(@KEY@)) FROM qlo_webservice_account WHERE id_webservice_account=2"+(" FOR UPDATE"if lock else"")+";")
  self.tx=True;account=self.row('account')
  self.send("SELECT JSON_OBJECT('phase','acl','resource',resource,'method',method) FROM qlo_webservice_permission WHERE id_webservice_account=2 ORDER BY resource,method"+(" FOR UPDATE"if lock else"")+"; SELECT JSON_OBJECT('phase','acl_end');")
  rows=[]
  while True:
   d=self.frame();need(d.get('phase')in['acl','acl_end'],'CLOSED_ACL_PHASE')
   if d['phase']=='acl_end':need(set(d)=={'phase'},'CLOSED_ACL_END');break
   need(set(d)=={'phase','resource','method'},'CLOSED_ACL_ROW')
   rows.append({'resource':d['resource'],'method':d['method']});need(len(rows)<=1000,'ACL_CAP')
  self.send("SELECT JSON_OBJECT('phase','others','rows',JSON_ARRAYAGG(JSON_OBJECT('accountId',id_webservice_account,'active',active))) FROM qlo_webservice_account WHERE id_webservice_account IN(1,3,5);")
  others=self.row('others')['rows']
  need(isinstance(others,list)and len(others)==3 and {r['accountId']:r['active']for r in others}=={1:0,3:0,5:1},'OTHER_ORIGINAL_ACCOUNT_STATES')
  return account,scope(rows),others
 def rollback(self):
  self.send("ROLLBACK; SELECT JSON_OBJECT('phase','rolled_back');");self.row('rolled_back');self.tx=False
 def close(self):
  if self.p.poll()is None:
   if self.tx and not self.attempted:
    try:self.rollback()
    except BaseException:pass
   try:self.p.stdin.close()
   except BaseException:pass
   try:self.p.wait(timeout=5)
   except subprocess.TimeoutExpired:pass
  self.sel.close()
  need(self.p.poll()is not None,'MYSQL_CLIENT_UNCERTAIN_RETAIN_INTENT')
  need(self.p.returncode==0,'MYSQL_CLIENT_NONZERO_RETAIN_INTENT')
def probe(secret,expected):
 conn=http.client.HTTPConnection('172.26.0.2',80,timeout=5)
 try:
  conn.request('GET','/api/hotels?display=%5Bid%5D&limit=1&output_format=JSON',headers={'Host':'team.craysclub.com','x-forwarded-host':'team.craysclub.com','x-forwarded-proto':'https','Accept':'application/json','Authorization':'Basic '+base64.b64encode(secret+b':').decode(),'Connection':'close'})
  r=conn.getresponse();b=r.read(65537);need(len(b)<=65536,'BOUNDED_PROVIDER_RESPONSE')
  if expected=='denied':need(r.status in(401,403),'OLD_KEY_MUST_BE_DENIED')
  else:
   need(r.status==200 and (r.getheader('Content-Type')or'').split(';')[0].strip().lower()=='application/json','NEW_KEY_READONLY_JSON')
   d=json.loads(b);need(isinstance(d,dict)and isinstance(d.get('hotels'),list)and len(d['hotels'])==1 and isinstance(d['hotels'][0],dict)and 'id'in d['hotels'][0],'ORIGINAL_BOUNDED_HOTEL_READ')
 finally:conn.close()
def main():
 os.umask(0o077)
 need(os.getuid()==0 and Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f','EXACT_AWS_HOST');directory(ROOT,0o711)
 review=globals().get('ROOT79_REVIEW_BINDING');need(isinstance(review,dict)and set(review)=={'sourceSHA256','reviewSHA256'}and all(isinstance(x,str)and re.fullmatch('[a-f0-9]{64}',x)for x in review.values()),'EXACT_ROOT_REVIEW_BINDING')
 mode=globals().get('ROOT79_MODE','apply');need(mode in['apply','reconcile'],'CLOSED_MODE')
 storage_admission()
 before=pair();need(b'timeout'in dock(['exec',DB,'/usr/bin/timeout','--version'],timeout=5).lower(),'EXISTING_NATIVE_TIMEOUT_REQUIRED')
 oldBody,_=read(OLD);old=key(oldBody)
 oldReceiptRaw,_=read(OLDRECEIPT,0o600);oldReceipt=json.loads(oldReceiptRaw)
 need(oldReceipt.get('status')=='ORIGINAL_QLO_GATEWAY_FILES_KEYS_AND_NATIVE_ACCOUNT2_CUSTODY_PASS_NOT_STARTED','ORIGINAL19_RECEIPT')
 pin=next(x for x in oldReceipt['files']if x['name']=='qlo-provider-read-webservice-key')
 need(len(oldBody)==pin['bytes']and sha(oldBody)==pin['sha256'],'PRIVATE_ORIGINAL19_BINDING_MATCH')
 aclRaw,_=read(ACL);baseline=json.loads(aclRaw)
 need(sha(canon(baseline['permissions']))==ACL_PIN,'ORIGINAL40_ACL_BASELINE')
 expected=scope([{'resource':r['resource'],'method':r['method']}for r in baseline['permissions']if r['accountId']==2])
 mysql=None
 if mode=='apply':
  need(not os.path.lexists(OUT),'EXISTING79_INTENT_RECONCILE_ONLY')
  OUT.mkdir(mode=0o700);syncdir(ROOT)
  (OUT/'bindings').mkdir(mode=0o700);syncdir(OUT)
  put(OUT/'INTENT.json',{'schema':'crays.qlo.account2.aws-rotation79.intent.v1','accountId':2,'sourceReviewPins':review,'oldBindingRef':str(OLD),'newProtectedBindingRef':str(NEW),'gatewayMustRemainStopped':True,'automaticRetry':False,'unknownCommitReadOnlyReconciliationOnly':True})
  new=secrets.token_hex(16).encode();need(new!=old,'NEW_KEY_DISTINCT')
  put(NEW,new+b'\n',raw=True);newBody,st=read(NEW);need(newBody==new+b'\n','NEW_KEY_DURABLE_READBACK')
  private={'schema':'crays.qlo.account2.aws-rotation79.private-custody.v1','accountId':2,'newProtectedBindingRef':str(NEW),'oldBindingRef':str(OLD),'uid':0,'gid':0,'mode':'0400','nlink':1,'dev':st.st_dev,'inode':st.st_ino,'bytes':33,'newSecretLength':32,'sha256':sha(newBody),'createdBeforeDatabaseCommit':True,'sourceReviewPins':review,'historicalOriginalCustody19CanonicalSHA256':sha(canon(oldReceipt))}
  put(OUT/'CUSTODY.private.json',private)
 else:
  directory(OUT,0o700);need(not os.path.lexists(OUT/'ACTUAL.json'),'ROTATION_ALREADY_COMPLETE_NO_REPLAY')
  intent=json.loads(read(OUT/'INTENT.json')[0]);need(intent['accountId']==2 and intent['sourceReviewPins']==review,'EXACT_PRIOR_INTENT')
  private=json.loads(read(OUT/'CUSTODY.private.json')[0]);newBody,st=read(NEW);new=key(newBody)
  need(private['newProtectedBindingRef']==str(NEW)and private['bytes']==33 and private['sha256']==sha(newBody)and private['dev']==st.st_dev and private['inode']==st.st_ino and private['sourceReviewPins']==review and private['historicalOriginalCustody19CanonicalSHA256']==sha(canon(oldReceipt)) and private['schema']=='crays.qlo.account2.aws-rotation79.private-custody.v1' and private['accountId']==2 and private['oldBindingRef']==str(OLD) and private['uid']==0 and private['gid']==0 and private['mode']=='0400' and private['nlink']==1 and private['newSecretLength']==32 and private['createdBeforeDatabaseCommit'] is True and len(newBody)==33 and newBody.endswith(b'\n'),'EXACT_PRIOR_PRIVATE_CUSTODY')
 try:
  prior=None
  if mode=='reconcile':
   session=json.loads(read(OUT/'SESSION.private.json')[0]);prior=session['connectionId']
  mysql=Mysql(prior);mysql.vars(old,new)
  if mode=='apply':
   put(OUT/'SESSION.private.json',{'connectionId':mysql.connection,'sourceReviewPins':review})
   a,current,others=mysql.inspect(lock=True)
   need(a['active']==1 and a['oldMatches']==1 and a['newMatches']==0 and a['keyLength']==32 and current==expected,'EXACT_ACCOUNT2_OLD_KEY_AND_ACL')
   mysql.send("PREPARE rotation79_update FROM 'UPDATE qlo_webservice_account SET @KEY@=? WHERE id_webservice_account=2 AND active=1 AND BINARY @KEY@=?'; EXECUTE rotation79_update USING @rotation79_new,@rotation79_old; SELECT JSON_OBJECT('phase','updated','rows',ROW_COUNT()); DEALLOCATE PREPARE rotation79_update;")
   need(mysql.row('updated')['rows']==1,'EXACT_ONE_ACCOUNT_UPDATED')
   put(OUT/'COMMIT_ATTEMPTED.json',{'accountId':2,'newProtectedBindingRef':str(NEW),'sourceReviewPins':review,'newKeyDurablySavedBeforeCommit':True})
   mysql.attempted=True;mysql.send("COMMIT; SELECT JSON_OBJECT('phase','committed');");mysql.row('committed');mysql.tx=False
  a,current,others=mysql.inspect(lock=False)
  need(a['active']==1 and a['oldMatches']==0 and a['newMatches']==1 and a['keyLength']==32 and current==expected,'READONLY_COMMIT_RECONCILIATION_NOT_NEW')
  mysql.rollback();mysql.close();mysql=None
  need(pair()==before,'ORIGINAL_QLO_PAIR_UNCHANGED')
  probe(old,'denied');probe(new,'read')
  need(pair()==before and read(OLD)[0]==oldBody and read(NEW)[0]==newBody,'POSTPROBE_ORIGINAL_PAIR_AND_FILES_UNCHANGED')
  actual={'schema':'crays.qlo.account2.aws-rotation79.actual.v1','status':'QLO_AWS_ACCOUNT2_ROTATION79_COMPLETE','accountId':2,'newProtectedBindingRef':str(NEW),'privateCustodyRef':str(OUT/'CUSTODY.private.json'),'newKeyFileUid':0,'newKeyFileGid':0,'newKeyFileMode':'0400','newKeyFileBytes':33,'newKeyFileNlink':1,'oldKeyDenied':True,'newKeyReadonlyProbe':True,'baselineAclUnchanged':True,'knownOtherAccountStatusesUnchanged':True,'knownOtherAccountIds':[1,3,5],'commitReconciled':True,'rotationComplete':True,'publicKeyValuesOrHashesLogged':False,'sourceReviewPins':review,'sourceXLXXLChanged':False,'gatewayStarted':False,'fullCustomerAcceptance':False,'allConsumersIdentified':False,'account5Rotated':False}
  put(OUT/'ACTUAL.json',actual);print(json.dumps(actual))
 finally:
  if mysql is not None:
   try:mysql.close()
   except BaseException:pass
def deadline(_s,_f):raise RuntimeError('FINITE79_READER_DEADLINE')
signal.signal(signal.SIGALRM,deadline);signal.alarm(100)
try:main()
except BaseException as e:
 print(json.dumps({'status':'QLO79_INCOMPLETE_RETAIN_ALL_CUSTODY_INSPECT_NO_REPLAY','errorClass':type(e).__name__,'safeGuard':str(e)if type(e)is RuntimeError and re.fullmatch('[A-Z][A-Z0-9_]{3,120}',str(e))else None,'automaticRetry':False,'gatewayMayStart':False,'rawStreamsPrinted':False}))
 raise SystemExit(1)
finally:signal.alarm(0)
