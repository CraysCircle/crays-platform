#!/usr/bin/env python3
"""Activate only the owned native HTTPS edge; no Core/Chuck restart or schema change."""
import importlib.util,pathlib,os,json,sys,hashlib,subprocess,time,ssl,socket,http.client
p=pathlib.Path(__file__).with_name('run-http-sql.py');spec=importlib.util.spec_from_file_location('admission',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
run=m.ROOT/'.qualification/native-ip-https-activation-v43-20261025';key='craysIosNativeIpHttpsActivation';unit='crays-native-core-https.service'
source=m.ROOT/'scripts/native-server/crays-native-core-https-ip.service';oldsource=m.ROOT/'scripts/native-server/crays-native-core-https.service';installed=pathlib.Path('/etc/systemd/system')/unit
files=['scripts/native-server/Caddyfile.ip','scripts/native-server/crays-native-core-https-ip.service','scripts/native-server/crays-native-core-https.service','scripts/ios-native-auth-qualification/activate-native-ip-https-v43.py']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def pins():return {f:sha(m.ROOT/f)for f in files}
def cmd(args,timeout=15):return subprocess.run(args,check=True,text=True,capture_output=True,timeout=timeout).stdout
sudo=['/usr/bin/sudo','-n']
def show():return dict(line.split('=',1)for line in cmd(['/usr/bin/systemctl','show',unit,'-p','ActiveState','-p','MainPID','-p','InvocationID','-p','DropInPaths','-p','NRestarts']).splitlines())
def install(src):
 temp='/etc/systemd/system/.crays-native-core-https.service.own-ip-staging'
 assert not pathlib.Path(temp).exists()
 cmd(sudo+['/usr/bin/install','-o','root','-g','root','-m','0644',str(src),temp]);cmd(sudo+['/usr/bin/mv','-T',temp,str(installed)]);cmd(sudo+['/usr/bin/systemctl','daemon-reload'])
def tls():
 context=ssl.create_default_context()
 with socket.create_connection(('87.106.245.200',443),timeout=4)as raw:
  with context.wrap_socket(raw,server_hostname='87.106.245.200')as secured:
   c=secured.getpeercert();assert ('IP Address','87.106.245.200')in c['subjectAltName']
   return {'defaultSystemTrustVerified':True,'ipSanMatched':True,'tlsVersion':secured.version(),'notBefore':c['notBefore'],'notAfter':c['notAfter'],'issuer':c['issuer'],'leafSHA256':hashlib.sha256(secured.getpeercert(binary_form=True)).hexdigest()}
def main():
 lease=None;changed=False;activated=False;owned_invocation=None;out={'status':'PREPARING','sourceBefore':pins(),'coreOrOwnerChuckChanged':False}
 try:
  with m.locks():
   x=json.loads(m.REGISTRY.read_text())
   if any(x.get(k)for k in ['heavy','heavyLease','heavyBuildLease','exclusiveHeavy']):print('BusyNoQueue',flush=True);return 75
   assert not run.exists();run.mkdir(mode=0o700)
   lease={'leaseId':'CRAYS-NATIVE-IP-HTTPS-'+str(os.getpid()),'ownerThreadId':m.OWNER,'pid':os.getpid(),'startTicks':m.ticks(os.getpid()),'state':'active','issuedAt':m.now(),'CPUs':1,'memoryMiB':1536,'scope':'Own HTTPS activation only; existing signed Caddy50%CPU/512MiB plus finite controller50%CPU/1GiB; public-IP ACME certificate, original Core missing-auth check; no Core/consumer/owner restart or model call'}
   x['heavy']=[lease];x[key]=lease;m.write_registry(x)
  prepared=json.loads((m.ROOT.parent/'.task-work/native-owner-consumer-20261025/ip-https/PREPARED.json').read_text());artifact=pathlib.Path(prepared['root'])
  assert sha(pathlib.Path(prepared['policy']['binary']))==prepared['policy']['binarySHA256']
  for name,pin in prepared['pins'].items():
   f=artifact/name;s=f.lstat();assert s.st_uid==0 and s.st_gid==0 and s.st_nlink==1 and s.st_mode&0o777==0o444 and not f.is_symlink() and sha(f)==pin['sha256']
  addresses=json.loads(cmd(['/usr/sbin/ip','-j','-4','addr','show']));assert any(a.get('local')=='87.106.245.200'for r in addresses for a in r.get('addr_info',[]))
  before=show();assert before['ActiveState']=='inactive'and before['MainPID']=='0'and not before['DropInPaths'] and installed.read_bytes()==oldsource.read_bytes()
  assert not cmd(['/usr/bin/ss','-ltnH','( sport = :80 or sport = :443 )']).strip()
  cmd(['/usr/bin/systemd-analyze','verify',str(source)])
  out['preflight']={'ownedServiceWasInactive':True,'oldUnitMatchesRetainedSource':True,'ports80And443WereFree':True,'ipAssignedToHost':True,'configRoot':str(artifact),'originalSignedBinarySHA256':prepared['policy']['binarySHA256']}
  install(source);changed=True;cmd(sudo+['/usr/bin/systemctl','start',unit],30);owned_invocation=show()['InvocationID'];out['startedInvocation']=owned_invocation;m.atomic(run/'RUN.json',out)
  deadline=time.monotonic()+70;proof=None
  while time.monotonic()<deadline:
   state=show();assert state['InvocationID']==owned_invocation and state['ActiveState']=='active'
   try:proof=tls();break
   except (OSError,ssl.SSLError):time.sleep(2)
  if proof is None:raise RuntimeError('Public trusted IP certificate not ready within bounded activation')
  connection=http.client.HTTPSConnection('87.106.245.200',timeout=8,context=ssl.create_default_context())
  try:
   connection.request('POST','/api/native/personal-message-originals/read',body='{}',headers={'Content-Type':'application/json'});response=connection.getresponse();body=response.read(4096);data=json.loads(body)
   assert response.status==401 and data.get('data')is None and len(data['errors'])==1 and data['errors'][0]['extensions']['code'].startswith('NATIVE_AUTHENTICATION_')
   out['originalCoreAuthBoundary']={'status':response.status,'code':data['errors'][0]['extensions']['code'],'personalDataReturned':False}
  finally:connection.close()
  connection=http.client.HTTPSConnection('87.106.245.200',timeout=8,context=ssl.create_default_context())
  try:
   connection.request('GET','/');response=connection.getresponse();assert response.status==404;response.read();out['nonApiPathStatus']=404
  finally:connection.close()
  assert show()['InvocationID']==owned_invocation
  cmd(sudo+['/usr/bin/systemctl','enable',unit]);activated=True
  out.update(status='PASS_ACTUAL_PUBLIC_TRUSTED_IP_HTTPS_AND_ORIGINAL_CORE_AUTH',tls=proof,service=show(),enabledForBoot=True,automaticRenewal='Original Caddy-managed shortlived profile; first issuance verified, future six-day renewal not claimed as elapsed/device-tested')
  return 0
 except BlockingIOError:
  if lease is None:print('BusyNoQueue coordination mutex',flush=True);return 75
  raise
 except BaseException as e:out['status']='FAIL';out['errorType']=type(e).__name__;raise
 finally:
  if changed and not activated:
   state=show()
   if installed.read_bytes()==source.read_bytes()and (owned_invocation is None or state['InvocationID']==owned_invocation):
    cmd(sudo+['/usr/bin/systemctl','stop',unit],30);install(oldsource);out['ownInactiveUnitRestored']=True
   else:out['manualReconciliationRequiredUnexpectedUnitOrInvocation']=True
  if lease:
   out['sourceAfter']=pins();out['sourceUnchanged']=out['sourceBefore']==out['sourceAfter'];m.atomic(run/'RUN.json',out)
   for retry in range(100):
    try:
     with m.locks():
      x=json.loads(m.REGISTRY.read_text());assert x.get('heavy')==[lease]and x.get(key)==lease
      x['heavy']=[];x[key]={**lease,'state':'terminal_returned','returnedAt':m.now()};m.write_registry(x)
     break
    except BlockingIOError:time.sleep(.1)
   else:raise RuntimeError('Own terminal lease return pending; no foreign lease changed')
   out['ownLeaseReturned']=True;m.atomic(run/'RUN.json',out);print(json.dumps({'status':out['status'],'ownLeaseReturned':True,'tlsReady':activated}),flush=True)
if __name__=='__main__':sys.exit(m.run_with_termination_cleanup(main))
