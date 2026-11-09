"""Read-only exact public package closure; S3 uploadURL on stdin; memory archive."""
from pathlib import Path,PurePosixPath
import os,sys,json,hashlib,io,tarfile,urllib.request,urllib.parse
ROOT=Path("/srv/crays/dev-state/01a10c77-eb8c-7eb0-9eb9-bdbb06755ebb/frontend-release-20261007/next-deployment-20261008/candidate/node_modules")
PACKAGES=json.loads("[{\"relativeRoot\":\"vite\",\"name\":\"vite\",\"version\":\"8.1.4\",\"files\":35,\"bytes\":2245083},{\"relativeRoot\":\"typescript\",\"name\":\"typescript\",\"version\":\"5.9.3\",\"files\":132,\"bytes\":23625066},{\"relativeRoot\":\"react\",\"name\":\"react\",\"version\":\"19.2.4\",\"files\":27,\"bytes\":171604},{\"relativeRoot\":\"react-dom\",\"name\":\"react-dom\",\"version\":\"19.2.4\",\"files\":43,\"bytes\":7319413},{\"relativeRoot\":\"clsx\",\"name\":\"clsx\",\"version\":\"2.1.1\",\"files\":10,\"bytes\":8555},{\"relativeRoot\":\"lucide-react\",\"name\":\"lucide-react\",\"version\":\"1.23.0\",\"files\":4028,\"bytes\":30788238},{\"relativeRoot\":\"tailwind-merge\",\"name\":\"tailwind-merge\",\"version\":\"3.6.0\",\"files\":29,\"bytes\":1014786},{\"relativeRoot\":\"zod\",\"name\":\"zod\",\"version\":\"4.4.3\",\"files\":718,\"bytes\":4558122},{\"relativeRoot\":\"@types/node\",\"name\":\"@types/node\",\"version\":\"20.19.43\",\"files\":69,\"bytes\":2288801},{\"relativeRoot\":\"@types/react\",\"name\":\"@types/react\",\"version\":\"19.2.17\",\"files\":16,\"bytes\":407653},{\"relativeRoot\":\"@types/react-dom\",\"name\":\"@types/react-dom\",\"version\":\"19.2.3\",\"files\":17,\"bytes\":30063},{\"relativeRoot\":\"lightningcss\",\"name\":\"lightningcss\",\"version\":\"1.32.0\",\"files\":14,\"bytes\":510515},{\"relativeRoot\":\"vite/node_modules/picomatch\",\"name\":\"picomatch\",\"version\":\"4.0.5\",\"files\":10,\"bytes\":92989},{\"relativeRoot\":\"postcss\",\"name\":\"postcss\",\"version\":\"8.5.16\",\"files\":55,\"bytes\":206377},{\"relativeRoot\":\"rolldown\",\"name\":\"rolldown\",\"version\":\"1.1.5\",\"files\":49,\"bytes\":785915},{\"relativeRoot\":\"tinyglobby\",\"name\":\"tinyglobby\",\"version\":\"0.2.17\",\"files\":7,\"bytes\":39288},{\"relativeRoot\":\"scheduler\",\"name\":\"scheduler\",\"version\":\"0.27.0\",\"files\":15,\"bytes\":82665},{\"relativeRoot\":\"undici-types\",\"name\":\"undici-types\",\"version\":\"6.21.0\",\"files\":41,\"bytes\":83680},{\"relativeRoot\":\"csstype\",\"name\":\"csstype\",\"version\":\"3.2.3\",\"files\":5,\"bytes\":1253449},{\"relativeRoot\":\"detect-libc\",\"name\":\"detect-libc\",\"version\":\"2.1.2\",\"files\":8,\"bytes\":26437},{\"relativeRoot\":\"lightningcss-linux-x64-gnu\",\"name\":\"lightningcss-linux-x64-gnu\",\"version\":\"1.32.0\",\"files\":4,\"bytes\":10056972},{\"relativeRoot\":\"nanoid\",\"name\":\"nanoid\",\"version\":\"3.3.15\",\"files\":25,\"bytes\":24698},{\"relativeRoot\":\"picocolors\",\"name\":\"picocolors\",\"version\":\"1.1.1\",\"files\":7,\"bytes\":6373},{\"relativeRoot\":\"source-map-js\",\"name\":\"source-map-js\",\"version\":\"1.2.1\",\"files\":18,\"bytes\":139872},{\"relativeRoot\":\"rolldown/node_modules/@oxc-project/types\",\"name\":\"@oxc-project/types\",\"version\":\"0.139.0\",\"files\":4,\"bytes\":44577},{\"relativeRoot\":\"@rolldown/pluginutils\",\"name\":\"@rolldown/pluginutils\",\"version\":\"1.0.1\",\"files\":8,\"bytes\":25693},{\"relativeRoot\":\"@rolldown/binding-linux-x64-gnu\",\"name\":\"@rolldown/binding-linux-x64-gnu\",\"version\":\"1.1.5\",\"files\":3,\"bytes\":19130901},{\"relativeRoot\":\"tinyglobby/node_modules/fdir\",\"name\":\"fdir\",\"version\":\"6.5.0\",\"files\":7,\"bytes\":53291},{\"relativeRoot\":\"tinyglobby/node_modules/picomatch\",\"name\":\"picomatch\",\"version\":\"4.0.5\",\"files\":10,\"bytes\":92989}]")
sha=lambda b:hashlib.sha256(b).hexdigest()
settings=json.loads(sys.stdin.read());url=settings['uploadURL'];parsed=urllib.parse.urlsplit(url)
if parsed.scheme!='https' or not parsed.hostname.endswith('.amazonaws.com'):raise RuntimeError('APPROVED_HTTPS_S3_URL_REQUIRED')
rows=[];seen=set();buffer=io.BytesIO()
with tarfile.open(fileobj=buffer,mode='w:gz',compresslevel=1) as tar:
 for package in PACKAGES:
  directory=ROOT/package['relativeRoot']
  if directory.is_symlink() or not directory.resolve().is_relative_to(ROOT):raise RuntimeError('PACKAGE_ROOT_CHANGED')
  metadata=json.loads((directory/'package.json').read_bytes())
  if metadata['name']!=package['name'] or metadata['version']!=package['version']:raise RuntimeError('EXACT_PACKAGE_VERSION_CHANGED')
  files=[]
  for current,dirs,names in os.walk(directory,followlinks=False):
   dirs[:]=sorted(n for n in dirs if n!='node_modules')
   for name in dirs+names:
    if (Path(current)/name).is_symlink():raise RuntimeError('UNREVIEWED_PACKAGE_SYMLINK')
   for name in sorted(names):
    source=Path(current)/name
    if source.is_file():files.append(source)
  if len(files)!=package['files'] or sum(f.stat().st_size for f in files)!=package['bytes']:raise RuntimeError('EXACT_PACKAGE_METADATA_CHANGED')
  for source in files:
   before=source.stat()
   with source.open('rb') as stream:opened=os.fstat(stream.fileno());data=stream.read();finished=os.fstat(stream.fileno())
   after=source.stat();identity=lambda s:(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
   if not identity(before)==identity(opened)==identity(finished)==identity(after):raise RuntimeError('PACKAGE_FILE_CHANGED_DURING_CAPTURE')
   target='node_modules/'+source.relative_to(ROOT).as_posix()
   if target in seen or '..' in PurePosixPath(target).parts:raise RuntimeError('DUPLICATE_OR_UNSAFE_TARGET')
   seen.add(target);row={'target':target,'bytes':len(data),'sha256':sha(data),'mode':0o755 if before.st_mode&0o111 else 0o644};rows.append(row)
   item=tarfile.TarInfo(target);item.size=len(data);item.mode=row['mode'];item.mtime=0;item.uid=0;item.gid=0;tar.addfile(item,io.BytesIO(data))
 if len(rows)!=5414 or sum(row['bytes'] for row in rows)!=105114065:raise RuntimeError('EXACT_PUBLIC_CLOSURE_SIZE_CHANGED')
 manifest=json.dumps({'sourceRoot':str(ROOT),'packages':PACKAGES,'rows':rows},indent=2).encode()
 item=tarfile.TarInfo('DEPENDENCY_CAPTURE_MANIFEST.json');item.size=len(manifest);item.mode=0o644;item.mtime=0;tar.addfile(item,io.BytesIO(manifest))
data=buffer.getvalue()
try:
 with urllib.request.urlopen(urllib.request.Request(url,data=data,method='PUT',headers={'Content-Type':'application/gzip'}),timeout=90) as response:status=response.status
except Exception as error:
 print(json.dumps({'status':'UPLOAD_FAILED_NO_AUTOMATIC_REPLAY','errorClass':type(error).__name__}),flush=True);raise SystemExit(1)
if status not in [200,201,204]:raise RuntimeError('UPLOAD_NOT_CONFIRMED_NO_REPLAY')
print(json.dumps({'status':'EXACT_PUBLIC_DEPENDENCY_MEMORY_ARCHIVE_UPLOADED','packages':29,'files':len(rows),'sourceBytes':sum(row['bytes'] for row in rows),'archiveBytes':len(data),'archiveSHA256':sha(data),'fileManifestSHA256':sha(manifest),'XXLWrites':False,'httpStatus':status}))
