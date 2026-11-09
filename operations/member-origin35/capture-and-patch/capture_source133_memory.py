"""Read-only XXL source capture; approved S3 URL on stdin; memory archive only."""
from pathlib import Path, PurePosixPath
import sys, os, json, hashlib, io, tarfile, urllib.request, urllib.parse
EXPECTED_ROWS_SHA256='b1f37f7849fb0ccd41d9a20c62a4d7032e2fa12b6e63b0437aefe597c68a849e'
q=Path('/home/craysdev/codex-chat-projects/member/output/successor-20261028')
c=q/'club-member-photo-contrast-candidate'
dep=(c/'node_modules').resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
rows=[]
for f in sorted((c/'src').rglob('*')):
 if f.is_symlink(): raise RuntimeError('SOURCE_SYMLINK_UNEXPECTED')
 if f.is_file(): rows.append({'source':str(f),'target':'candidate/'+str(f.relative_to(c)),'bytes':f.stat().st_size,'sha256':sha(f.read_bytes())})
for f,t in [(c/'tsconfig.json','candidate/tsconfig.json'),(q/'build-photo-contrast.cjs','build-photo-contrast.original.cjs'),(dep/'package.json','dependency-metadata/package.json'),(dep/'package-lock.json','dependency-metadata/package-lock.json')]:
 if f.is_symlink(): raise RuntimeError('METADATA_SYMLINK_UNEXPECTED')
 rows.append({'source':str(f),'target':t,'bytes':f.stat().st_size,'sha256':sha(f.read_bytes())})
serialized=json.dumps(rows,indent=2).encode()
if sha(serialized)!=EXPECTED_ROWS_SHA256 or len(rows)!=133: raise RuntimeError('EXACT_APPROVED_CAPTURE_ROWS_CHANGED')
settings=json.loads(sys.stdin.read())
url=settings['uploadURL']
parsed=urllib.parse.urlsplit(url)
if parsed.scheme!='https' or not parsed.hostname.endswith('.amazonaws.com'): raise RuntimeError('APPROVED_HTTPS_S3_URL_REQUIRED')
archive=io.BytesIO()
with tarfile.open(fileobj=archive,mode='w:gz',compresslevel=1) as tar:
 for row in rows:
  source=Path(row['source']); target=PurePosixPath(row['target'])
  if target.is_absolute() or '..' in target.parts or source.is_symlink(): raise RuntimeError('SAFE_SOURCE_AND_TARGET_REQUIRED')
  before=source.stat()
  with source.open('rb') as stream:
   opened=os.fstat(stream.fileno()); data=stream.read(); finished=os.fstat(stream.fileno())
  after=source.stat()
  identity=lambda s:(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
  if not identity(before)==identity(opened)==identity(finished)==identity(after): raise RuntimeError('SOURCE_CHANGED_DURING_CAPTURE')
  if len(data)!=row['bytes'] or sha(data)!=row['sha256']: raise RuntimeError('SOURCE_BYTES_CHANGED')
  item=tarfile.TarInfo(str(target)); item.size=len(data); item.mode=0o644; item.uid=0; item.gid=0; item.mtime=0
  tar.addfile(item,io.BytesIO(data))
 item=tarfile.TarInfo('CAPTURE_ROWS.json'); item.size=len(serialized); item.mode=0o644; item.mtime=0
 tar.addfile(item,io.BytesIO(serialized))
data=archive.getvalue()
request=urllib.request.Request(url,data=data,method='PUT',headers={'Content-Type':'application/gzip'})
try:
 with urllib.request.urlopen(request,timeout=90) as response:
  status=response.status
except Exception as error:
 print(json.dumps({'status':'UPLOAD_FAILED_NO_AUTOMATIC_REPLAY','errorClass':type(error).__name__}),flush=True)
 raise SystemExit(1)
if status not in [200,201,204]: raise RuntimeError('UPLOAD_NOT_CONFIRMED_NO_REPLAY')
print(json.dumps({'status':'SOURCE133_MEMORY_ARCHIVE_UPLOADED','sourceFiles':133,'sourceBytes':sum(x['bytes'] for x in rows),'archiveBytes':len(data),'archiveSHA256':sha(data),'rowsSHA256':sha(serialized),'XXLWrites':False,'httpStatus':status}))
