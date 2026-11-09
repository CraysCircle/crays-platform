from pathlib import Path,PurePosixPath
from html.parser import HTMLParser
import os,stat,json,hashlib,re,posixpath,urllib.parse,datetime
DIST=Path('/srv/crays/migration-work/20261108/inventory/personal-frontend-build-entry-20261108-02/dist')
ROOT_STDOUT=Path('/srv/crays/migration-work/20261108/root/personal-build-root-window-20261108-02/stdout.txt')
PUBLIC=Path('/srv/crays/acceptance/unified-static-20261105-01/artifacts/personal')
CASE=Path('/srv/crays/migration-work/20261108/inventory/personal-build02-output-digest-20261108-01')
assert os.getuid()==0 and DIST.is_dir() and not DIST.is_symlink()
os.umask(0o077);CASE.mkdir(mode=0o700,exist_ok=False)
def sha(b):return hashlib.sha256(b).hexdigest()
def save(path,value):
 b=value if isinstance(value,bytes) else json.dumps(value,sort_keys=True,indent=2).encode()
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
 with os.fdopen(fd,'wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
 return {'path':str(path),'bytes':len(b),'sha256':sha(b)}
codeProof=save(CASE/'OUTPUT_DIGEST_CODE.py',CODE_SOURCE.encode());assert codeProof['sha256']==CODE_SHA
save(CASE/'INTENT.json',{'scope':'Existing actual build02 output only, no source/dependency inventory or build replay.','dist':str(DIST),'rootStdout':str(ROOT_STDOUT),'codeSHA256':CODE_SHA,'sharedRuntimeMutation':False})
result={'status':'INCOMPLETE','buildArtifactOnly':True,'fullRuntimeAcceptance':False,'sharedRuntimeChanged':False,'sourceOrDependencyRehashed':False,'buildOrTypecheckRepeated':False}
try:
 stdout=ROOT_STDOUT.read_bytes()
 rootOutput=save(CASE/'ROOT_RUNNER_STDOUT_RETAINED.txt',stdout)
 parsed=[]
 try:parsed=[json.loads(stdout)]
 except (json.JSONDecodeError,UnicodeDecodeError):
  for line in stdout.decode('utf-8','replace').splitlines():
   try:parsed.append(json.loads(line))
   except json.JSONDecodeError:pass
 files=[];rawRefs=[];importmap={};htmlAssets=[];symlinks=[];special=[];indexSHA=None
 class Html(HTMLParser):
  def __init__(self,rel):super().__init__();self.rel=rel;self.inmap=False;self.parts=[]
  def handle_starttag(self,tag,attrs):
   attrs=dict(attrs)
   for name in ('src','href','poster'):
    if name in attrs:
     rawRefs.append({'from':self.rel,'kind':'html-'+tag+'-'+name,'reference':attrs[name]})
     if self.rel=='index.html':htmlAssets.append({'tag':tag,'attribute':name,'reference':attrs[name]})
   if tag=='script' and attrs.get('type')=='importmap':self.inmap=True;self.parts=[]
  def handle_data(self,data):
   if self.inmap:self.parts.append(data)
  def handle_endtag(self,tag):
   if tag=='script' and self.inmap:
    d=json.loads(''.join(self.parts));importmap.update(d.get('imports',{}));self.inmap=False
 textTypes={'.html','.js','.mjs','.cjs','.css'}
 for top,dirs,names in os.walk(DIST,followlinks=False):
  top=Path(top)
  for name in list(dirs):
   p=top/name
   if p.is_symlink():dirs.remove(name);symlinks.append({'path':str(p.relative_to(DIST)),'link':os.readlink(p)})
  for name in sorted(names):
   p=top/name;meta=p.lstat();rel=p.relative_to(DIST).as_posix()
   if stat.S_ISLNK(meta.st_mode):symlinks.append({'path':rel,'link':os.readlink(p)});continue
   if not stat.S_ISREG(meta.st_mode):special.append(rel);continue
   h=hashlib.sha256();parts=[];collect=p.suffix.lower() in textTypes and meta.st_size<=16*1024*1024
   fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
   with os.fdopen(fd,'rb') as f:
    before=os.fstat(f.fileno())
    while True:
     b=f.read(65536)
     if not b:break
     h.update(b)
     if collect:parts.append(b)
    after=os.fstat(f.fileno())
   assert (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns),'BUILD_OUTPUT_UNSTABLE'
   row={'path':rel,'bytes':before.st_size,'mode':stat.S_IMODE(before.st_mode),'sha256':h.hexdigest()}
   files.append(row)
   if rel=='index.html':indexSHA=row['sha256']
   if collect:
    text=b''.join(parts).decode('utf-8','replace')
    if p.suffix.lower()=='.html':Html(rel).feed(text)
    elif p.suffix.lower() in ('.js','.mjs','.cjs'):
     for ref in re.findall(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']''',text):
      rawRefs.append({'from':rel,'kind':'js-literal-import','reference':ref})
     for ref in re.findall(r'''(?:new\s+URL|require)\s*\(\s*["']([^"']+)["']''',text):
      rawRefs.append({'from':rel,'kind':'js-literal-url-or-require','reference':ref})
    for ref in re.findall(r'''["'](/(?:assets|platform-runtime|world|land|models|fonts|textures)/[^"'\\\s]{1,1000})["']''',text):
     rawRefs.append({'from':rel,'kind':'literal-public-path','reference':ref})
    if p.suffix.lower()=='.css':
     for ref in re.findall(r'''url\(\s*["']?([^"')\s]+)''',text):
      rawRefs.append({'from':rel,'kind':'css-url','reference':ref})
 assert indexSHA and not symlinks and not special,'OUTPUT_NOT_COMPLETE_REGULAR_FILE_SET'
 files.sort(key=lambda x:x['path']);fileMap={f['path']:f for f in files}
 canonical=json.dumps(files,sort_keys=True,separators=(',',':')).encode();artifactDigest=sha(canonical)
 graph=[];external={};seen=set()
 for record in rawRefs:
  ref=record['reference'];key=(record['from'],record['kind'],ref)
  if key in seen:continue
  seen.add(key)
  if ref.startswith(('data:','blob:','#','javascript:')):continue
  row={'from':record['from'],'kind':record['kind']}
  parsedURL=urllib.parse.urlsplit(ref)
  if parsedURL.scheme in ('http','https') or ref.startswith('//'):
   row.update(reference=(parsedURL.scheme+'://' if parsedURL.scheme else '//')+(parsedURL.hostname or '')+parsedURL.path,classification='REMOTE_PUBLIC_REFERENCE_RUNTIME_DEPENDENCY',queryOrFragmentOmitted=bool(parsedURL.query or parsedURL.fragment))
   graph.append(row);continue
  if not ref.startswith(('/', './','../')):
   row.update(reference=ref,classification='BARE_MODULE_OR_LITERAL_REFERENCE',importMapTarget=importmap.get(ref))
   graph.append(row)
   if ref not in importmap:continue
   ref=importmap[ref];parsedURL=urllib.parse.urlsplit(ref);row=dict(row);row['kind']='importmap-resolved-reference'
  path=parsedURL.path
  normalized=posixpath.normpath(path.lstrip('/') if path.startswith('/') else posixpath.join(posixpath.dirname(record['from']),path))
  row['reference']=path;row['normalizedOutputPath']=normalized
  inDist=normalized in fileMap
  if inDist:
   row.update(classification='PRESENT_IN_THIS_BUILD_OUTPUT',targetSHA256=fileMap[normalized]['sha256'],targetBytes=fileMap[normalized]['bytes'])
  else:
   safe=not normalized.startswith('../') and normalized not in ('','.')
   present=False;existingBytes=None
   if safe:
    candidate=PUBLIC/normalized
    if candidate.is_file():present=True;existingBytes=candidate.stat().st_size
   category='OTHER_PUBLIC_OR_SHARED_RUNTIME_ASSET'
   if 'platform-runtime/react-19.2.7-' in path:category='ORIGINAL_REACT19_2_7_SHARED_RUNTIME'
   elif 'personal-focus-' in path:category='ORIGINAL_PERSONAL_FOCUS_ASSET'
   elif re.search(r'world|land|earth|globe',path,re.I):category='WORLD_LAND_PUBLIC_ASSET'
   item={'path':path,'normalizedOutputPath':normalized,'category':category,'presentInExistingPersonalPublicCandidate':present,'existingCandidateBytes':existingBytes,'existingCandidateContentNotRehashed':True,'requiredSeparateRuntimeBindingOrServing':True}
   external[normalized]=item
   row.update(classification='OUTSIDE_BUILD_OUTPUT_RUNTIME_BINDING_REQUIRED',existingPersonalPublicCandidatePresent=present)
  graph.append(row)
 for module,target in sorted(importmap.items()):
  parsedURL=urllib.parse.urlsplit(target);path=parsedURL.path;normalized=path.lstrip('/')
  if normalized not in fileMap and normalized not in external:
   candidate=PUBLIC/normalized;present=candidate.is_file()
   external[normalized]={'path':path,'normalizedOutputPath':normalized,'category':'ORIGINAL_REACT19_2_7_SHARED_RUNTIME' if 'react-19.2.7-' in path else 'IMPORTMAP_RUNTIME_TARGET','presentInExistingPersonalPublicCandidate':present,'existingCandidateBytes':candidate.stat().st_size if present else None,'existingCandidateContentNotRehashed':True,'requiredSeparateRuntimeBindingOrServing':True}
 manifest={'schema':'crays.personal.actual-build02-output-manifest.v1','qualification':'ACTUAL_BUILD_OUTPUT_BYTES_ONLY_FULL_RUNTIME_ACCEPTANCE_FALSE','dist':str(DIST),'codeProof':codeProof,'actualRootCommandId':'74ef670c-174c-47a6-86b1-cf4ab89b0431','rootStdout':rootOutput,'rootStdoutParsedRecords':parsed,'fileCount':len(files),'totalBytes':sum(f['bytes'] for f in files),'artifactDigestAlgorithm':'sha256 of UTF-8 canonical compact sorted-key JSON array of path/bytes/mode/sha256 rows sorted by path','artifactDigestSHA256':artifactDigest,'indexSHA256':indexSHA,'files':files,'indexAssetReferences':htmlAssets,'indexImportMap':importmap,'literalReferenceGraph':graph,'runtimeAssetsOutsideDist':sorted(external.values(),key=lambda v:v['normalizedOutputPath']),'referenceAnalysisLimitation':'Literal static/dynamic import, importmap, src/href/poster, URL/require and CSS url extraction; computed runtime URLs are not an exhaustive application dependency inventory.','externalCandidateMetadataOnlyNoContentHashing':True,'fullRuntimeAcceptance':False,'runtimeChanged':False,'sourceOrDependencyInventoryRepeated':False}
 manifestProof=save(CASE/'ACTUAL_BUILD_OUTPUT_MANIFEST.json',manifest)
 result.update(status='ACTUAL_BUILD02_COMPLETE_REGULAR_FILE_DIGEST_AND_LITERAL_REFERENCE_GRAPH_PREPARED',dist=str(DIST),fileCount=len(files),totalBytes=manifest['totalBytes'],artifactDigestSHA256=artifactDigest,indexSHA256=indexSHA,manifest=manifestProof,code=codeProof,rootStdout=rootOutput,literalReferenceCount=len(graph),outsideDistRuntimeAssetCount=len(external),runtimeReact19_2_7ImportMapPresent=any('react-19.2.7-' in v for v in importmap.values()),personalFocusAssetsOutsideDist=[v['path'] for v in external.values() if v['category']=='ORIGINAL_PERSONAL_FOCUS_ASSET'],worldLandAssetsOutsideDist=[v['path'] for v in external.values() if v['category']=='WORLD_LAND_PUBLIC_ASSET'])
except BaseException as e:
 result.update(errorType=type(e).__name__,error=str(e)[:350])
finally:
 result['atUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 resultProof=save(CASE/'RESULT_ACTUAL.json',result);print(json.dumps({'result':result,'resultProof':resultProof}))
if result['status']=='INCOMPLETE':raise SystemExit(1)
