"""Own metadata unit ExecStopPost receipt; no credentials, source or SQL access."""
from pathlib import Path
import os,sys,stat,json,hashlib,re
sha=lambda data:hashlib.sha256(data).hexdigest()
def read(path,maximum):
 fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
 with os.fdopen(fd,'rb')as f:
  before=os.fstat(f.fileno());assert stat.S_ISREG(before.st_mode)and before.st_uid==0 and before.st_nlink==1 and not before.st_mode&0o077 and 0<before.st_size<=maximum
  raw=f.read(maximum+1);after=os.fstat(f.fileno());assert len(raw)==before.st_size and (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns)
 return raw
def main():
 assert os.getuid()==0 and len(sys.argv)==3
 intent=Path(sys.argv[1]);parent=intent.parent
 assert re.fullmatch('/srv/crays/acceptance/neon-rds-selected-proof-[0-9a-f]{12}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',str(parent))
 meta=parent.lstat();assert stat.S_ISDIR(meta.st_mode)and meta.st_uid==0 and not meta.st_mode&0o077
 raw=read(intent,65536);assert sha(raw)==sys.argv[2];binding=json.loads(raw)
 scope=binding['rootScopedProofReuseReviewId'];db=binding['targetDatabase'];assert re.fullmatch('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',scope)and re.fullmatch('crays_dev_[0-9a-f]{12}',db)
 selected=binding['orderedSelectedTargets'];assert type(selected)is list and 0<len(selected)<=2 and all(type(item)is str and re.fullmatch('crays_dev_[0-9a-f]{12}',item)for item in selected)and len(selected)==len(set(selected))and set(selected)==set(binding['selectedDatabaseScopes'])and db in selected
 batch_group=sha(json.dumps(selected,separators=(',',':')).encode())[:12]
 assert parent==Path('/srv/crays/acceptance')/('neon-rds-selected-proof-'+batch_group+'-'+scope),'EXACT_SELECTED_BATCH_GROUP_AND_SCOPE_REQUIRED'
 batch_intent_raw=read(parent.parent/(parent.name+'.intent.json'),65536);assert sha(batch_intent_raw)==binding['batchIntentSHA256']
 batch_intent=json.loads(batch_intent_raw);assert batch_intent['rootScopedProofReuseReviewId']==scope and batch_intent['rootReviewCanonicalSHA256']==binding['rootReviewCanonicalSHA256']and batch_intent['selectedTargets']==selected and batch_intent['selectedDatabaseScopes']==binding['selectedDatabaseScopes']
 for key in ['proofCapsuleSHA256','sourceIndexSHA256']:assert batch_intent[key]==binding[key]
 unit='crays-neon-rds-proof-'+db.removeprefix('crays_dev_')+'-'+scope+'.service'
 assert binding['expectedMetadataUnit']==unit and intent.name==db+'-metadata-intent.json'
 assert sha(read(Path(__file__),16384))==binding['terminalWriterSHA256']
 invocation=os.environ.get('INVOCATION_ID');assert invocation and re.fullmatch('[0-9a-f]{32}',invocation)
 assert os.environ.get('SERVICE_RESULT')=='success'and os.environ.get('EXIT_CODE')=='exited'and os.environ.get('EXIT_STATUS')=='0','NO_DEFAULT_SUCCESS_FOR_MISSING_NATIVE_STATUS'
 group='/system.slice/'+unit;assert Path('/proc/self/cgroup').read_text().strip()=='0::'+group
 record=dict(status='OWN_METADATA_UNIT_NATIVE_EXECSTOPPOST_SUCCESS',unit=unit,rootScopedProofReuseReviewId=scope,targetDatabase=db,metadataIntentSHA256=sha(raw),terminalWriterSHA256=binding['terminalWriterSHA256'],rootReviewCanonicalSHA256=binding['rootReviewCanonicalSHA256'],invocationId=invocation,serviceResult='success',exitCode='exited',exitStatus='0',writerPID=os.getpid(),writerStartTicks=Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],cgroup=group,actualNativeCommandId=None,externalNativeCommandIdBindingRequired=True)
 out=parent/(db+'-metadata-terminal-actual.json');fd=os.open(out,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'w')as f:json.dump(record,f,sort_keys=True,separators=(',',':'));f.write('\n');f.flush();os.fsync(f.fileno())
if __name__=='__main__':main()
