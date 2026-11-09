"""Specific Original30 preparation entry; no execution without concrete Root review."""
from pathlib import Path
import os,json,runpy,hashlib,stat,subprocess,datetime
ROOT=Path(__file__).resolve().parent
EXPECTED_ROOT=Path('/srv/crays/migration-work/20261108/neon-rds/native-core-original30-grantee-preparation-runtime-source01')
UNIT='crays-rds-original30-preparation-20261109-01.service'
SQL_NAME='PREPARE_ORIGINAL30_GRANTEES.candidate.sql'
SQL_SHA='a5feae0ffb60429cfd13ac013fc15f8bb0417334f4f368920f916318ca019faa'
SQL_REVIEW_SHA='7c500d9f1112ea33f909ce2af2a89c89d96d22d3ea94e5ba4dce998bd20e35ee'
OUT=Path('/srv/crays/acceptance/native-core-original30-grantee-preparation-20261109-01')
def stable(path,expected=None,limit=1048576):
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NOATIME)
 try:
  st=os.fstat(fd)
  assert stat.S_ISREG(st.st_mode) and st.st_uid==0 and st.st_nlink==1 and stat.S_IMODE(st.st_mode) in (0o400,0o600) and 0<st.st_size<=limit,'EXACT_ROOT_PROTECTED_INPUT_REQUIRED'
  raw=os.read(fd,limit+1)
  assert len(raw)==st.st_size and os.fstat(fd)==st and os.stat(path,follow_symlinks=False)==st,'STABLE_PROTECTED_INPUT_REQUIRED'
 finally:os.close(fd)
 if expected is not None:assert hashlib.sha256(raw).hexdigest()==expected,'ROOT_REVIEWED_EXACT_INPUT_PIN_REQUIRED'
 return raw
def pairs(items):
 d={}
 for k,v in items:
  assert k not in d,'DUPLICATE_INPUT_JSON_KEY'
  d[k]=v
 return d
def load_json(raw):return json.loads(raw,object_pairs_hook=pairs,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('NONFINITE_JSON_FORBIDDEN')))
def main():
 assert ROOT==EXPECTED_ROOT and os.getuid()==0 and os.environ.get('INVOCATION_ID'),'OWN_ROOT_PREPARATION_UNIT_REQUIRED'
 group=Path('/proc/self/cgroup').read_text().strip().split(':',2)[-1]
 assert group=='/system.slice/'+UNIT,'EXACT_PREPARATION_UNIT_CGROUP_REQUIRED'
 review=load_json(stable(ROOT/'ROOT_EXECUTION_REVIEW.json'))
 assert review.get('rootExecutionReviewComplete') is True and review.get('stage')=='native_core_original30_grantee_preparation01','ROOT_PREPARATION_EXECUTION_REVIEW_REQUIRED'
 assert review.get('guestSHA256')==hashlib.sha256(stable(Path(__file__))).hexdigest(),'EXACT_REVIEWED_GUEST_REQUIRED'
 assert review.get('outerRootHeavyFenceHeld') is True and review.get('rootPhysicalResourceAdmissionVerified') is True,'EXTERNAL_ROOT_HEAVY_FENCE_ADMISSION_REQUIRED'
 required={'secure_original30_role_preparation_session.candidate.py','original30_role_preparation_operations.rev02.candidate.py',SQL_NAME,'expected_roles_memberships.private.json','ROOT_PREPARATION_ADMISSION.private.json','native-binding.json','rds-ca.pem','ROOT_PREPARATION_CONTRACT.source-only.json','INDEPENDENT_SQL_SOURCE_REVIEW.public.json','INDEPENDENT_RUNTIME_SOURCE_REVIEW.public.json'}
 assert set(review['inputPins'])==required,'EXACT_RUNTIME_INPUT_SET_REQUIRED'
 data={}
 for name,pin in review['inputPins'].items():
  assert isinstance(pin,str) and len(pin)==64 and set(pin)<=set('0123456789abcdef'),'EXACT_INPUT_SHA_REQUIRED'
  data[name]=stable(ROOT/name,pin)
 assert review['inputPins'][SQL_NAME]==SQL_SHA,'EXACT_SOURCE_SQL_REQUIRED'
 assert review['inputPins']['INDEPENDENT_SQL_SOURCE_REVIEW.public.json']==SQL_REVIEW_SHA,'EXACT_SQL_SOURCE_REVIEW_REQUIRED'
 assert review.get('independentReviewEvidenceSHA256')==review['inputPins']['INDEPENDENT_RUNTIME_SOURCE_REVIEW.public.json'],'RUNTIME_REVIEW_BINDING_REQUIRED'
 admission=load_json(data['ROOT_PREPARATION_ADMISSION.private.json'])
 assert admission.get('executionApproved') is True and admission.get('exclusiveRoleWriterFenceHeld') is True and admission.get('prepareOriginal30Only') is True,'EXACT_ROLE_PREPARATION_ADMISSION_REQUIRED'
 assert admission.get('existingRolesAlterAllowed') is False and admission.get('ordinaryConnectAllowed') is False and admission.get('restoreExecutionAllowed') is False,'ONLY_NEW30_NOLOGIN_SCOPE_REQUIRED'
 assert admission.get('actor')=='crays_rds_admin' and admission.get('targetDatabase')=='crays_core_xl_20261109','EXACT_ACTOR_TARGET_REQUIRED'
 assert admission.get('sourceSQLSHA256')==SQL_SHA and admission.get('reviewSHA256')==SQL_REVIEW_SHA and admission.get('rootScopeId')==review.get('rootScopeId') and isinstance(admission.get('rootScopeId'),str) and admission['rootScopeId'],'EXACT_ROOT_SOURCE_SCOPE_BINDING_REQUIRED'
 start=datetime.datetime.fromisoformat(admission['notBeforeUTC'].replace('Z','+00:00'))
 end=datetime.datetime.fromisoformat(admission['expiresAtUTC'].replace('Z','+00:00'))
 now=datetime.datetime.now(datetime.timezone.utc)
 assert start.tzinfo and end.tzinfo and start<=now<end and datetime.timedelta(0)<end-start<=datetime.timedelta(minutes=10),'FRESH_ROOT_ADMISSION_REQUIRED'
 expected=load_json(data['expected_roles_memberships.private.json'])
 assert set(expected)=={'roles','memberships'} and isinstance(expected['roles'],list) and isinstance(expected['memberships'],list) and len(expected['roles'])==131 and len(expected['memberships'])==245,'EXACT_EXPECTED_FULL_PREIMAGE_REQUIRED'
 cgroup=Path('/sys/fs/cgroup')/group.lstrip('/')
 memory=int((cgroup/'memory.max').read_text());tasks=int((cgroup/'pids.max').read_text())
 quota,period=(cgroup/'cpu.max').read_text().split()
 assert 0<memory<=805306368 and 0<tasks<=128 and quota!='max' and 0<int(quota)/int(period)<=.5,'EXISTING_BOUNDED_CONTROLLER_REQUIRED'
 limits={'controllerPID':os.getpid(),'controllerStartTicks':Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],'invocationId':os.environ['INVOCATION_ID'],'memoryMaxBytes':memory,'pidsMax':tasks,'cpuMax':quota+' '+period,'unit':UNIT,'unitProperties':subprocess.run(['/usr/bin/systemctl','show',UNIT,'--property=RuntimeMaxUSec,TimeoutStopUSec,KillMode,InvocationID,MemoryMax,TasksMax,CPUQuotaPerSecUSec'],capture_output=True,text=True,check=True,timeout=10).stdout}
 session=runpy.run_path(str(ROOT/'secure_original30_role_preparation_session.candidate.py'))
 ops=runpy.run_path(str(ROOT/'original30_role_preparation_operations.rev02.candidate.py'))
 result=session['restore'](load_json(data['native-binding.json']),ROOT/SQL_NAME,ROOT/'rds-ca.pem',ops)
 r=session['docker']('inspect',session['NAME'])
 assert r.returncode==1 and r.stdout.strip()=='[]' and r.stderr.strip().lower()=='error: no such object: '+session['NAME'].lower(),'OWN_PREPARATION_CLIENT_REMOVAL_REQUIRED'
 assert not list(Path('/run').glob('crays-rds-original30-preparation-20261109-01-*')),'OWN_CREDENTIAL_RAM_REMOVAL_REQUIRED'
 assert not [x for x in (cgroup/'cgroup.procs').read_text().split() if int(x)!=os.getpid()],'OWN_CONTROLLER_CHILDREN_ABSENT_REQUIRED'
 assert result.get('commitAcknowledged') is True and result.get('createdRoleCount')==30 and result.get('existingRolesUnchanged') is True and result.get('existingMembershipsUnchanged') is True,'EXACT_COMMITTED_SAFE_RESULT_REQUIRED'
 safe={'status':'ORIGINAL30_GRANTEES_PREPARATION_COMMITTED_PHYSICAL_RETURN','commitAcknowledged':True,'createdRoleCount':30,'existingRolesUnchanged':True,'existingMembershipsUnchanged':True,'ordinaryConnectGranted':False,'restoreExecutionApproved':False,'fullOriginalAuthenticationParity':False,'ownClientPhysicallyRemoved':True,'ownCredentialRAMJobsRemoved':True,'ownControllerChildrenAbsent':True,'nativeUnitLimits':limits,'privateCommittedReceiptPath':str(OUT/'preparation-committed-actual.private.json')}
 raw=(json.dumps(safe,sort_keys=True)+'\n').encode()
 fd=os.open(OUT/'CONTROLLER_METADATA_ACTUAL.safe.json',os.O_CREAT|os.O_EXCL|os.O_WRONLY|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'wb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
 print(json.dumps(safe,sort_keys=True))
if __name__=='__main__':
 try:main()
 except BaseException as exc:
  print(json.dumps({'status':'ORIGINAL30_PREPARATION_FAILED_HOLD_NO_REPLAY','safeGuard':'PREPARATION_OR_PHYSICAL_RETURN_NOT_PROVEN','exceptionClass':type(exc).__name__ if type(exc).__name__ in ('RuntimeError','AssertionError','ValueError','TypeError','KeyError','OSError','TimeoutExpired','KeyboardInterrupt','SystemExit') else 'OtherError','ordinaryConnectGranted':False,'restoreExecutionApproved':False}))
  raise SystemExit(1)
