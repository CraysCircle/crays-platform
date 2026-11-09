#!/usr/bin/env python3
"""Owner-authorized additional local Core device; never phone/channel relinking.
Capture the original SDK token through a private pipe, not argv or console.
"""
import pathlib,json,hashlib,subprocess,os,stat,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
PRIVATE=pathlib.Path('/home/craysdev/.config/crays/native-core/owner-v1')
TASK=ROOT.parent/'.task-work/native-owner-consumer-20261025'
NODE='/opt/crays/openclaw/dependency-artifacts/sdk4-complete/2badb63c9d2ed692a4d2d71c63e1d96ac7453a9c5519348a8dc5a001d611afbb/node-runtime/bin/node'
ARTIFACT='/opt/crays/openclaw/personal-services/crays-native-core-owner-bootstrap-v1/pair-owner-service-device.mjs'
def metadata():
 fields=subprocess.check_output(['systemctl','show','crays-owner-tools-whatsapp-live.service','-p','MainPID','-p','InvocationID','-p','ActiveState','-p','ControlGroup'],text=True)
 return dict(x.split('=',1)for x in fields.splitlines())
def main():
 assert os.getuid()==1000
 action_path=TASK/'ACTION_BIND_EXISTING_OWNER_SERVICE.json';action_bytes=action_path.read_bytes();action=json.loads(action_bytes)
 source=pathlib.Path(action['source']);assert hashlib.sha256(source.read_bytes()).hexdigest()==action['sourceSha256']
 live=metadata();assert live['ActiveState']=='active' and live['InvocationID']==action['expectedServiceInvocation'] and int(live['MainPID'])==2208217
 gateway=action['existingGatewayPid'];assert str(gateway) in pathlib.Path('/sys/fs/cgroup'+live['ControlGroup']+'/cgroup.procs').read_text().splitlines()
 identity_path=PRIVATE/'gateway-service-identity.json';credential_path=PRIVATE/'gateway-service-credential.json'
 assert not identity_path.exists() and not credential_path.exists(),'Existing own device needs explicit reconciliation, never another pairing'
 generation="""import{generateKeyPairSync,createHash}from'node:crypto';import{writeFileSync}from'node:fs';const k=generateKeyPairSync('ed25519'),r=k.publicKey.export({type:'spki',format:'der'}).subarray(-32);const i={deviceId:createHash('sha256').update(r).digest('hex'),publicKeyPem:k.publicKey.export({type:'spki',format:'pem'}),privateKeyPem:k.privateKey.export({type:'pkcs8',format:'pem'})};writeFileSync(process.argv[1],JSON.stringify(i)+'\\n',{mode:0o600,flag:'wx'});console.log(JSON.stringify({deviceId:i.deviceId,publicKey:r.toString('base64url')}));"""
 public=json.loads(subprocess.check_output([NODE,'--input-type=module','-e',generation,str(identity_path)],text=True))
 intent={**public,'sourceApprovalSha256':hashlib.sha256(action_bytes).hexdigest()}
 (TASK/'PAIRING_PREPARED.json').write_text(json.dumps({'deviceId':public['deviceId'],'sourceApprovalSha256':intent['sourceApprovalSha256'],'originalOwnerServiceInvocation':live['InvocationID'],'minimalScopes':action['minimalDeviceScopes']},indent=2)+'\n')
 # Publish only the tiny reviewed public helper, not a runtime/dependency copy.
 publisher="""import pathlib,hashlib,os,sys
s=pathlib.Path(sys.argv[1]);p=pathlib.Path(sys.argv[2]);h=sys.argv[3];b=s.read_bytes();assert hashlib.sha256(b).hexdigest()==h
p.parent.mkdir(mode=0o555,parents=True,exist_ok=True)
if p.exists():assert p.is_file() and not p.is_symlink() and p.stat().st_uid==0 and p.read_bytes()==b
else:
 f=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o444)
 with os.fdopen(f,'wb')as w:w.write(b);w.flush();os.fsync(w.fileno())
st=p.stat();assert st.st_uid==0 and st.st_gid==0 and st.st_nlink==1 and st.st_mode&0o777==0o444
"""
 subprocess.run(['sudo','-n','python3','-c',publisher,str(source),ARTIFACT,action['sourceSha256']],check=True,timeout=10)
 assert metadata()==live,'Original host identity changed before pairing'
 command=['sudo','-n','nsenter','--target',str(gateway),'--mount','--net','--wd=/','--setgid','61304','--setuid','61304','--',NODE,ARTIFACT]
 completed=subprocess.run(command,input=json.dumps(intent)+'\n',text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=35)
 if completed.returncode:
  # Preserve no raw original response or credentials in logs.
  (TASK/'PAIRING_FAILURE.json').write_text(json.dumps({'exitCode':completed.returncode,'stdoutBytes':len(completed.stdout),'stderrBytes':len(completed.stderr),'requiresExactDeviceReadbackBeforeRetry':True},indent=2)+'\n')
  raise RuntimeError('Original SDK pairing did not complete; exact own device needs readback')
 result=json.loads(completed.stdout)
 assert result['deviceId']==public['deviceId'] and result['scopes']==action['minimalDeviceScopes'] and isinstance(result['token'],str) and result['token']
 assert metadata()==live,'Host changed after original pairing; retain exact device for reconciliation'
 fd=os.open(credential_path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w')as f:json.dump(result,f);f.write('\n');f.flush();os.fsync(f.fileno())
 proof={'status':'ACTUAL_ORIGINAL_LOCAL_CORE_SERVICE_DEVICE_PAIRED_NOT_PHONE_OR_MODEL','deviceId':public['deviceId'],'scopes':result['scopes'],'ownerServiceInvocationUnchanged':live['InvocationID'],'sharedTokenRead':False,'whatsappChanged':False,'modelCalled':False,'credentialPrinted':False}
 (TASK/'ACTUAL_DEVICE_PAIRING_RESULT.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
if __name__=='__main__':
 try:main()
 except BaseException as e:print(json.dumps({'status':'PAIRING_NOT_ACCEPTED','errorType':type(e).__name__}));sys.exit(1)
