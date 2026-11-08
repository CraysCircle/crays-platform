"""Retained Recovery01 files only: no SQL, cloud, credential, subprocess or file write."""
import pathlib,os,stat,json,hashlib,re,base64,gzip,resource,signal

def inspect(C):
 assert C['instance']=='i-0eb300e1b02414d8f'and C['database']in ['crays_dev_060408f873e0', 'crays_dev_08af27a169d1', 'crays_dev_26e9e39e1a4d', 'crays_dev_283aefa36882', 'crays_dev_2989d706a39b', 'crays_dev_321358bbc6a0', 'crays_dev_32850bb44881', 'crays_dev_38a4c903826f', 'crays_dev_4d18bb49bb09', 'crays_dev_57f1084b11f4', 'crays_dev_7660fa574189', 'crays_dev_7b438a8cdc0e', 'crays_dev_814f4813593b', 'crays_dev_836e8b9b1da5', 'crays_dev_8a298be15caf', 'crays_dev_a2f6fbb3f74e', 'crays_dev_a4310b437ba5', 'crays_dev_aa34eb02b7de', 'crays_dev_bb71b6983f8f', 'crays_dev_c3cf3567ce06', 'crays_dev_c570f79d6ee3', 'crays_dev_cfb6611a7f71', 'crays_dev_d2e487bcd30f', 'crays_dev_f0fbb7ddf8b4', 'crays_dev_f27eb91d67f6', 'crays_dev_0db21754ff7f', 'crays_dev_171e6450bade', 'crays_dev_2582f8491a2a', 'crays_dev_3ecb0654c2e0', 'crays_dev_3ff6b759d4c1', 'crays_dev_788703a21e4d', 'crays_dev_ac38d9637ed2', 'crays_dev_bd85cdf0072c', 'crays_dev_d4b535e04202', 'crays_dev_e379e548fc64', 'crays_dev_e77d597e46f1', 'crays_dev_e821914e1c2f', 'crays_dev_f6e62f4684ce'] and isinstance(C['expectedDifferences'],int)and 0<C['expectedDifferences']<=128
 assert re.fullmatch('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',C['rootScopedProofReuseReviewId'])
 suffix=C['database'].removeprefix('crays_dev_')
 assert C['stage']=='/srv/crays/incoming/neon-rds-recovery01-'+suffix+'-20261108-01'and C['out']=='/srv/crays/acceptance/neon-rds-recovery01-'+suffix+'-20261108-01'
 resource.setrlimit(resource.RLIMIT_AS,(134217728,134217728))
 resource.setrlimit(resource.RLIMIT_CPU,(10,10));signal.alarm(30)
 assert os.getuid()==0
 unit='crays-neon-rds-proof-'+C['database'].removeprefix('crays_dev_')+'-'+C['rootScopedProofReuseReviewId']+'.service'
 assert C['expectedMetadataUnit']==unit and os.environ.get('INVOCATION_ID')
 group='/system.slice/'+unit;assert pathlib.Path('/proc/self/cgroup').read_text().strip()=='0::'+group
 kernel=pathlib.Path('/sys/fs/cgroup')/group.lstrip('/')
 assert (kernel/'memory.max').read_text().strip()=='134217728'and (kernel/'cpu.max').read_text().strip()=='25000 100000'and (kernel/'pids.max').read_text().strip()=='16'
 identity=dict(unit=unit,pid=os.getpid(),startTicks=pathlib.Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],cgroup=group,invocationId=os.environ['INVOCATION_ID'],memoryMaxBytes=134217728,cpuMax='25000 100000',tasksMax=16)
 assert pathlib.Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()==C['instance']
 root=pathlib.Path('/srv/crays');stage=pathlib.Path(C['stage']);out=pathlib.Path(C['out'])
 assert root.is_dir()and not root.is_symlink()and root.stat().st_dev!=pathlib.Path('/').stat().st_dev
 for p in [stage,out]:
  st=p.lstat();assert stat.S_ISDIR(st.st_mode)and st.st_uid==0 and not st.st_mode&0o077
 def sha(data):return hashlib.sha256(data).hexdigest()
 def canonical(value):return sha(json.dumps(value,sort_keys=True,separators=(',',':')).encode())
 def read(p,maximum,digest=None):
  fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
  with os.fdopen(fd,'rb')as f:
   st=os.fstat(f.fileno());assert stat.S_ISREG(st.st_mode)and st.st_uid==0 and st.st_nlink==1 and not st.st_mode&0o077 and 0<st.st_size<=maximum
   data=f.read(maximum+1);after=os.fstat(f.fileno())
   assert len(data)==st.st_size and (st.st_dev,st.st_ino,st.st_size,st.st_mtime_ns,st.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns)
  if digest is not None:assert sha(data)==digest
  return data
 controller=json.loads(read(out/'CONTROLLER_RESULT_ACTUAL.json',65536))
 assert canonical(controller)==C['controllerCanonicalSHA256']and controller['errorClass']is None
 assert all(controller[k]is True for k in ['ownClientPhysicallyRemoved','ownCredentialRamJobsPhysicallyRemoved','ownControllerChildrenAbsent'])
 result=controller['result'];assert result['database']==C['database']and result['dataFingerprintExact']and result['catalogDifferenceBlocks']==C['expectedDifferences']and result['sourceMetadataAccepted']is False
 manifest=read(stage/'INPUT_MANIFEST.json',65536,C['inputManifestSHA256'])
 projector=read(stage/'project_private_schema_blocks.py',16384,C['projectorSHA256'])
 source=read(stage/'source-schema.private.sql',8*1024**2,C['sourceSchemaSHA256'])
 target=read(out/'TARGET_SCHEMA_ACTUAL.private.sql',8*1024**2)
 comparison_raw=read(out/'TARGET_SCHEMA_COMPARISON_ACTUAL.json',65536);comparison=json.loads(comparison_raw)
 assert comparison['targetSchemaSHA256']==sha(target)and comparison['exact']is False and comparison['semanticNormalizationUsed']is False
 assert len(comparison['differences'])==C['expectedDifferences']
 module={'__name__':'recovery01_pinned_projection','__file__':str(stage/'project_private_schema_blocks.py')}
 exec(compile(projector,module['__file__'],'exec'),module)
 def blocks(data):
  raw,count=re.subn(rb'(?m)^\\(?:un)?restrict [A-Za-z0-9]+\r?\n',b'',data);assert count==2
  values={}
  for block in module['project'](raw)['blocks']:
   key=tuple(block[k]for k in ['type','schema','name','owner']);assert key not in values
   values[key]=raw[block['byteStart']:block['byteEnd']].strip()
  return values
 originals=blocks(source);actual=blocks(target)
 differences=[{'key':list(k),'expectedSHA256':sha(originals[k])if k in originals else None,'actualSHA256':sha(actual[k])if k in actual else None}for k in sorted(set(originals)|set(actual))if originals.get(k)!=actual.get(k)]
 assert differences==comparison['differences']and len(originals)==comparison['originalObjectBlocks']and len(actual)==comparison['actualObjectBlocks']
 selected=[];total=0
 for d in differences:
  key=tuple(d['key']);entry=dict(d)
  for name,mapping in [('original',originals),('target',actual)]:
   data=mapping.get(key);total+=len(data)if data else 0
   entry[name+'BlockBytes']=len(data)if data is not None else None
  selected.append(entry)
 assert total<=2*8*1024**2,'SELECTED_METADATA_SIZE_EXCEEDS_TWO_ALREADY_BOUNDED_SCHEMA_FILES'
 payload=dict(status='RETAINED_RECOVERY_EXACT_COMPARISON_METADATA_ONLY',inputManifestSHA256=C['inputManifestSHA256'],projectorSHA256=C['projectorSHA256'],blockBodiesReturned=False,totalSelectedBlockBytes=total,database=C['database'],originalCommandId=None,rootScopedProofReuseReviewId=C['rootScopedProofReuseReviewId'],externalNativeCommandIdBindingRequired=True,nativeMetadataReaderPhysicalIdentity=identity,controllerCanonicalSHA256=C['controllerCanonicalSHA256'],sourceSchemaSHA256=sha(source),targetSchemaSHA256=sha(target),comparisonSHA256=sha(comparison_raw),comparison=comparison,selected=selected,sourceOrTargetSQLExecuted=False,credentialsRead=False,filesWritten=False,liveDatabaseRequeried=False,customerRowsRead=False,sourceMetadataAccepted=False)
 raw=json.dumps(payload,sort_keys=True,separators=(',',':')).encode();compressed=gzip.compress(raw,mtime=0)
 assert len(compressed)<=16384
 envelope=dict(status='COMPRESSED_RETAINED_POSTIMAGE_COMPLETE',bytes=len(raw),sha256=sha(raw),gzipBase64=base64.b64encode(compressed).decode())
 output=json.dumps(envelope,separators=(',',':'));assert len(output.encode())<23500
 return output

if __name__=='__main__':raise SystemExit('SOURCE_ONLY_EXACT_CONTRACT_EMBEDDING_REQUIRED')
