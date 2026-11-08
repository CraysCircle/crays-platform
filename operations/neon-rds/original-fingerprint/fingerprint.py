"""Streaming COPY-text multiset fingerprints; never persist or print data rows."""
import hashlib,json,os,subprocess,time
MOD=1<<256
def fingerprint(command,output,progress):
 tables={};sequences=[];current=None;total=0;last=time.monotonic()
 error_path=output.with_suffix('.stderr.private.txt')
 with error_path.open('xb') as errors:
  os.chmod(error_path,0o600)
  p=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=errors)
  try:
   for line in p.stdout:
    if current is not None:
     if line==b'\\.\n':current=None;continue
     h=int.from_bytes(hashlib.sha256(line).digest(),'big')
     item=tables[current];item['rows']+=1;item['bytes']+=len(line);item['sum']=(item['sum']+h)%MOD;item['xor']^=h;total+=1
    elif line.startswith(b'COPY ') and line.rstrip().endswith(b' FROM stdin;'):
     current=line.rstrip().decode('utf-8');assert current not in tables,'Repeated COPY block'
     tables[current]={'rows':0,'bytes':0,'sum':0,'xor':0}
    elif line.startswith(b'SELECT pg_catalog.setval('):sequences.append(line.rstrip().decode('utf-8'))
    elif not line.strip() or line.startswith((b'--',b'SET ',b'\\restrict ',b'\\unrestrict ')) or line.rstrip()==b"SELECT pg_catalog.set_config('search_path', '', false);":pass
    else:raise RuntimeError('Unsupported non-COPY data statement; no contents logged')
    if time.monotonic()-last>5:
     progress.write_text(json.dumps({'rowsHashed':total,'tableBlocksSeen':len(tables),'sequenceSetsSeen':len(sequences)})+'\n');os.chmod(progress,0o600);last=time.monotonic()
   assert current is None,'Truncated COPY block'
   assert p.wait(timeout=10)==0,'Data extraction failed; private diagnostics retained'
  finally:
   if p.poll() is None:p.terminate();p.wait(timeout=10)
 for value in tables.values():
  value['sum']=format(value['sum'],'064x');value['xor']=format(value['xor'],'064x')
 result={'algorithm':'Per COPY header: count,byte length,sum256(SHA256(encoded row)),xor256(SHA256(encoded row)); order independent; sequence setval statements compared exactly','tables':tables,'sequenceStatements':sorted(sequences),'totalRows':total,'tableBlocks':len(tables),'sequenceSets':len(sequences),'rowContentsStored':False}
 fd=os.open(output,os.O_CREAT|os.O_EXCL|os.O_WRONLY|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'w') as f:json.dump(result,f,indent=2);f.write('\n')
 return result
