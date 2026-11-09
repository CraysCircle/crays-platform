#!/usr/bin/env python3
"""ONE Root read-only Work24 Qlo binding check; no DB/network requests or mutations."""
import hashlib,hmac,json,os,re,stat,subprocess,sys,time
from pathlib import Path
from urllib.parse import urlsplit,unquote
CID='06a9a5a92df9bcd3fd3675a09172123333f68a1825df5c07a7ba5724a70eb071'
ENV=Path('/srv/crays/private/work24-qlo-runtime-20261108-01/environment-tls37.private.json')
TOKEN=Path('/srv/crays/runtime/business-qlo-20261108-01/gateway-originals19/bindings/team-consumer-token')
PRES=Path('/srv/crays/incoming/qlo-private-activation-20261108-20/ORIGINAL_GATEWAY_PRESERVATION_METADATA.json')
PROOF=Path('/srv/crays/acceptance/qlo-private-activation20-20261108-01/QLO_PRIVATE_ACTIVATION20_ACTUAL.json')
BOOT=Path('/srv/crays/runtime/work24-qlo-runtime-20261108-01/code/bootstrap.cjs')
RELEASE=Path('/srv/crays/releases/work24-qlo-20261108-01/app/.next-aws-work24-qlo')
CA='/run/crays-bindings/acceptance/coreIdentity-ca.pem'
REALM='crays_forest_city_main_test_20260925'
ROLE='crays_member_qlo_exchange_runtime_v1'
HOST='crays-prod-postgres-20261106-01.cpewggqg89tp.eu-central-2.rds.amazonaws.com'
CA_SHA='a2c1bf4e3775a038e1db2cf92f9792c94855f20c6e1a72ada7587cb29e242c6e'
PROOF_SHA='33b13859e719f85ade8e56b8e053723875fcc4be0d5355b8112062a32c0c608e'
PRES_SHA='fecb7411b57adb099b7ce5182ee3cb0d4606729d5f2f63c414b0e3196d5cb6db'
PUBLIC_FILES={
 'BUILD_ID':'178058470b09db9e8a5cd542a177857013b247896647e96348f11cfc85ace2d0',
 'server/app/api/crays/clubs/team/launch/redeem/route.js':'04c3af0d1a6770982034e0178d1c072ac5572e11469c9d7f499f697d05edaccf',
 'server/app/api/crays/clubs/team/session/route.js':'f26391a3e101666c986f6900085b0c7092fb30be2786846f3ca4f03c3b39849c',
}
def need(ok,code):
 if not ok: raise RuntimeError(code)
def sha(b):return hashlib.sha256(b).hexdigest()
def unique(pairs):
 out={}
 for k,v in pairs:
  need(k not in out,'DUPLICATE_JSON_KEY');out[k]=v
 return out
def parse(b):return json.loads(b,object_pairs_hook=unique)
def stable(path,maximum,owners,modes):
 p=Path(path);need(p.is_absolute() and p.resolve()==p,'CANONICAL_FIXED_FILE_REQUIRED')
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  a=os.fstat(fd)
  need(stat.S_ISREG(a.st_mode) and a.st_uid in owners and a.st_nlink==1 and stat.S_IMODE(a.st_mode) in modes and 0<a.st_size<=maximum,'FIXED_FILE_CUSTODY_REQUIRED')
  b=os.read(fd,maximum+1);z=os.fstat(fd);l=os.lstat(p)
  keys=lambda s:(s.st_dev,s.st_ino,s.st_uid,s.st_gid,s.st_mode,s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
  need(keys(a)==keys(z)==keys(l) and len(b)==a.st_size,'STABLE_FIXED_FILE_REQUIRED')
  return b,a
 finally:os.close(fd)
def physical(pid,ticks):
 raw=Path('/proc/%d/stat'%pid).read_text();need(raw[raw.rfind(')')+2:].split()[19]==str(ticks),'WORK_PHYSICAL_TICKS_REQUIRED')
 st={}
 for line in Path('/proc/%d/status'%pid).read_text().splitlines():
  k,_,v=line.partition(':');st[k]=v.strip()
 need(st['Uid'].split()==['1000']*4 and st['NoNewPrivs']=='1' and all(int(st[k],16)==0 for k in ['CapInh','CapPrm','CapEff','CapAmb']),'WORK_UID_CAP0_NNP_REQUIRED')
def main(reviewPath):
 os.umask(0o077);need(os.getuid()==0,'ROOT_REQUIRED')
 need(Path(reviewPath)==Path('/srv/crays/migration-work/20261108/root/business44-current-binding-check22-source01/ROOT_READONLY_BINDING_CHECK22_CURRENT_APPROVED.json'),'EXACT_CURRENT_ROOT_REVIEW_PATH_REQUIRED')
 r=parse(Path(reviewPath).read_bytes())
 need(r.get('executionApproved') is True and r.get('readOnlyBindingCheckOnly') is True and r.get('sourceSHA256')==sha(Path(__file__).read_bytes()),'EXACT_ROOT_READONLY_REVIEW_REQUIRED')
 need(r.get('selectedEnvironmentSource')==str(ENV) and r.get('actualMetadataCommandId')=='bc84d059-c2bd-48d6-b715-25e21e2aba64','ROOT_ACTUAL_ENV_SELECTION_REQUIRED')
 current33,_=stable(Path('/srv/crays/acceptance/common-private-team-transport33-20261108-01/RESULT_ACTUAL.json'),131072,(0,),(0o400,0o444,0o600,0o644))
 need(sha(current33)=='d602b8f271025eb283d46bf7f444c1aa5a2c922fac6c6de3b5a06535013126b4','EXACT_CURRENT33_RECEIPT_REQUIRED')
 a33=parse(current33)
 need(a33['status']=='SAME_COMMON33_CANONICAL_TEAM_AND_PERSONAL_FULL_SOURCE_GENERATION_READY' and a33['ids']=={'work':CID,'member':'0fa6bba9af8e7bb592e72b86afddf0d5702d892e72c5f62f6f415f735886872f','common':'435314e3c20f063e31197ec7319cb564a60048a0c0f38fc5d1aefcf0c397add0'} and a33['workProcess']==[1543294,'29471094'] and a33['sameMemberWorkPreserved'] is True,'CURRENT33_EXACT_FAMILY_AND_WORK_GENERATION_REQUIRED')
 v=json.loads(subprocess.run(['docker','inspect',CID],capture_output=True,check=True,timeout=10).stdout)[0]
 need(v['HostConfig']['NetworkMode']=='container:0fa6bba9af8e7bb592e72b86afddf0d5702d892e72c5f62f6f415f735886872f','EXACT_CURRENT_MEMBER_NAMESPACE_REQUIRED')
 need(v['Id']==CID and v['State']['Running'] and v['State']['Pid']==1543294,'EXACT_CURRENT_WORK_REQUIRED');physical(1543294,'29471094')
 mounts=v['Mounts']
 def mount(dest,source):
  rows=[m for m in mounts if m['Destination']==dest]
  need(len(rows)==1 and rows[0]['Source']==str(source) and rows[0]['RW'] is False,'EXACT_READONLY_BIND_REQUIRED')
 mount('/run/crays-work/environment.private.json',ENV)
 mount('/run/crays-work-code',BOOT.parent)
 mount('/srv/crays/releases/work24-qlo-20261108-01',RELEASE.parent.parent)
 proc=Path('/proc/1543294/root')
 for host,inside in [(ENV,'/run/crays-work/environment.private.json'),(BOOT,'/run/crays-work-code/bootstrap.cjs')]:
  a=os.stat(host);b=os.stat(proc/inside.lstrip('/'));need((a.st_dev,a.st_ino)==(b.st_dev,b.st_ino),'PROCESS_EFFECTIVE_BIND_REQUIRED')
 for name,pin in PUBLIC_FILES.items():
  b,_=stable(RELEASE/name,262144,(0,1000),(0o400,0o444));need(sha(b)==pin,'ORIGINAL_WORK24_PUBLIC_OUTPUT_PIN_REQUIRED')
 bootstrap,_=stable(BOOT,65536,(0,),(0o444,))
 need(sha(bootstrap)=='715b369d4784b7c8717e921d5cadd82278f24bccd883622f45521a36f635d151','ORIGINAL_BOOTSTRAP_PIN_REQUIRED')
 cmd=(v['Config'].get('Entrypoint') or [])+(v['Config'].get('Cmd') or [])
 need(sum(str(arg).count('/run/crays-work-code/bootstrap.cjs') for arg in cmd)==1,'ORIGINAL_BOOTSTRAP_LAUNCH_REQUIRED')
 p,_=stable(PROOF,131072,(0,),(0o400,));need(sha(p)==PROOF_SHA,'EXISTING_QLO20_PROOF_PIN_REQUIRED');q=parse(p)
 need(q['status']=='QLO_SAME_ROLE_LOGIN_AND_HMAC_PRIVATE_CUSTODY_COMMITTED_QUALIFIED' and q['sql']['status']=='REVIEWED_STAGE_COMMIT_ACKNOWLEDGED_AND_QUALIFIED','QLO20_COMMIT_PROOF_REQUIRED')
 qual=q['sql']['qualification'];need(qual['status']=='QUALIFICATION_PASS' and qual['database']==REALM and qual['sameExistingRole'] is True and qual['runtimeLOGIN'] is True and qual['newGrantsOrMemberships'] is False,'QLO20_QUALIFICATION_PROOF_REQUIRED')
 raw,es=stable(ENV,1048576,(1000,),(0o400,));need(es.st_gid==32022,'ENV_ORIGINAL_GROUP_REQUIRED')
 # Original loader embeds this private env digest. Compare only in RAM, never export it.
 need(sha(raw).encode() in bootstrap,'BOOTSTRAP_CURRENT_ENV_DIGEST_REQUIRED');env=parse(raw)
 preservation,_=stable(PRES,131072,(0,),(0o400,));need(sha(preservation)==PRES_SHA,'ORIGINAL_PRESERVATION_PIN_REQUIRED')
 original=next(x for x in parse(preservation)['originalFiles'] if x['name']=='team-consumer-token')
 tb,_=stable(TOKEN,256,(0,1000),(0o400,0o600))
 need(len(tb)==original['bytes'] and hmac.compare_digest(sha(tb),original['sha256']),'ORIGINAL_TOKEN_CUSTODY_REQUIRED')
 token=tb.decode('ascii').strip()
 need(re.fullmatch(r'[!-~]{32,160}',token) is not None,'ORIGINAL_TOKEN_FORMAT_REQUIRED')
 team=env.get('CRAYS_CLUBS_TEAM_CONSUMER_TOKEN','').strip()
 inline=env.get('CRAYS_CLUBS_QLO_PROVIDER_TOKEN','').strip();fileRef=env.get('CRAYS_CLUBS_QLO_PROVIDER_TOKEN_FILE','').strip()
 need(bool(inline)!=bool(fileRef),'EXACT_ONE_PROVIDER_TOKEN_SOURCE_REQUIRED')
 # Current TLS37 contract selects INLINE. A new file source needs its own explicit mount admission.
 need(bool(inline) and not fileRef,'PROVIDER_FILE_BINDING_OPEN_NOT_ADMITTED')
 need(hmac.compare_digest(team,token) and hmac.compare_digest(inline,token),'CONSUMER_PROVIDER_ORIGINAL_EQUALITY_REQUIRED')
 need(len(env.get('CRAYS_CLUBS_TEAM_ASSERTION_SECRET','').strip())>=32 and re.fullmatch(r'[A-Za-z0-9:_-]{3,160}',env.get('CRAYS_CLUBS_TEAM_CONSUMER_ID','').strip()) is not None,'ORIGINAL_ASSERTION_CONSUMER_ID_REQUIRED')
 u=urlsplit(env.get('CRAYS_QLO_CORE_DATABASE_URL',''))
 need(u.scheme in ('postgres','postgresql') and u.hostname==HOST and u.port in (None,5432) and unquote(u.username or '')==ROLE and bool(u.password) and unquote(u.path)=='/'+REALM and not u.query and not u.fragment,'EXACT_DEDICATED_QLO_CORE_BINDING_REQUIRED')
 need(env.get('CRAYS_QLO_CORE_DATABASE_NAME')==REALM and env.get('CRAYS_QLO_CORE_DATABASE_CA_FILE')==CA and env.get('CRAYS_QLO_AWS_CANONICAL_ORIGIN')=='1','ORIGINAL_QLO_PURPOSE_BINDING_REQUIRED')
 caHost=Path('/srv/crays/runtime/work-rds-five-purpose-20261107-17/database-bindings/coreIdentity-ca.pem')
 mount('/run/crays-bindings/acceptance',caHost.parent)
 cb,cs=stable(caHost,262144,(0,1000),(0o400,0o444));effective=os.stat(proc/CA.lstrip('/'))
 need((cs.st_dev,cs.st_ino)==(effective.st_dev,effective.st_ino) and sha(cb)==CA_SHA,'ORIGINAL_TLS_CA_REQUIRED')
 physical(1543294,'29471094')
 # No private values, their hashes/lengths, URL, env, cmdline or metadata are exported.
 return {'status':'CURRENT_WORK24_ORIGINAL_CONSUMER_AND_CORE_BINDINGS_QUALIFIED','currentWorkCID':CID,'currentWorkPID':1543294,'startTicks':'29471094','buildId':'kMjI_RyB7jmjx596KU3t7','originalTokenEquality':True,'singleProviderInlineSource':True,'originalAssertionAndConsumerIdRules':True,'dedicatedForestRoleAndTLSBinding':True,'historicalQLO20CommitAndQualificationReused':True,'freshDatabaseLoginOrRLSProbePerformed':False,'httpOrSQLExecuted':False,'customerAcceptance':False}
if __name__=='__main__':
 try:
  result=main(sys.argv[1]);print(json.dumps(result,separators=(',',':')))
 except Exception as e:
  safe=str(e) if isinstance(e,RuntimeError) and re.fullmatch(r'[A-Z0-9_]{1,96}',str(e)) else 'UNEXPORTED_PRIVATE_OR_TRANSPORT_ERROR'
  print(json.dumps({'status':'OPEN_OR_STOP','safeGuard':safe,'privateValuesExported':False}));sys.exit(1)
