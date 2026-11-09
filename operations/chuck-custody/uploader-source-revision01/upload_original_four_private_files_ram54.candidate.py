"""Exact four-file source custody upload. Root RAM only; never hashes source secrets.
This source is staged for review, not installation or activation. Invoke with -I -B -u
and code supplied by Root from RAM; presigned URL arrives only over stdin after READY.
"""
import os,sys,stat,json,io,tarfile,time,selectors,urllib.parse,urllib.request,ssl,termios
from pathlib import Path
BUCKET='crays-acceptance-backups-391674093840-eu-central-2'
KEY_PREFIX='restore/approved/private/20261109/chuck54-'
MAX_FILE=128*1024
MAX_TOTAL=1024*1024
FILES=(
('/home/craysdev/.config/crays/native-core/owner-v1/server-environment.json','server-environment.original.json'),
('/home/craysdev/.config/crays/native-core/owner-v1/gateway-service-identity.json','gateway-service-identity.original.json'),
('/home/craysdev/.config/crays/native-core/owner-v1/gateway-service-credential.json','gateway-service-credential.original.json'),
('/home/craysdev/codex-chat-projects/openclaw/apps/ios/.secrets/owner-first-account-intake.json','owner-first-account-intake.original.json'),
)
def need(ok):
 if not ok:raise RuntimeError()
def ident(s):
 return(s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns,s.st_mode,s.st_uid,s.st_gid,s.st_nlink)
def emit(value):
 sys.stdout.write(json.dumps(value,separators=(',',':'))+'\n');sys.stdout.flush()
def stable(opened):
 for row in opened:
  fd=row['fd'];p=row['path'];a=os.fstat(fd);b=p.lstat()
  need(ident(a)==row['identity']and ident(b)==row['identity']and stat.S_ISREG(a.st_mode)and not stat.S_ISLNK(b.st_mode))
def read_exact(fd,size):
 result=bytearray()
 while len(result)<=size:
  block=os.read(fd,min(65536,size+1-len(result)))
  if not block:break
  result.extend(block)
 need(len(result)==size)
 return bytes(result)
def read_request():
 sel=selectors.DefaultSelector();sel.register(sys.stdin.fileno(),selectors.EVENT_READ)
 deadline=time.monotonic()+180;body=bytearray()
 try:
  while b'\n'not in body:
   remaining=deadline-time.monotonic();need(remaining>0)
   if not sel.select(timeout=min(remaining,30)):continue
   block=os.read(sys.stdin.fileno(),4096);need(block)
   body.extend(block);need(len(body)<=32768)
  line,tail=bytes(body).split(b'\n',1);need(not tail.strip())
  request=json.loads(line.decode('utf-8'));need(type(request)is dict and set(request)=={'url','key'})
  need(type(request['url'])is str and type(request['key'])is str)
  return request
 finally:sel.close()
def validate_url(url,key):
 need(key.startswith(KEY_PREFIX)and key.endswith('.tar')and len(key)<=256)
 tail=key[len(KEY_PREFIX):-4];need(tail and all(c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'for c in tail))
 u=urllib.parse.urlsplit(url)
 need(u.scheme=='https'and u.username is None and u.password is None and u.port in(None,443)and not u.fragment)
 allowed={BUCKET+'.s3.eu-central-2.amazonaws.com':('/'+key),'s3.eu-central-2.amazonaws.com':('/'+BUCKET+'/'+key)}
 need(u.hostname in allowed and urllib.parse.unquote(u.path)==allowed[u.hostname])
 need(u.netloc in(u.hostname,u.hostname+':443')and '%'not in u.netloc and '\\'not in url)
 q=urllib.parse.parse_qs(u.query,keep_blank_values=True,strict_parsing=True)
 for name in ['X-Amz-Algorithm','X-Amz-Credential','X-Amz-Date','X-Amz-Expires','X-Amz-SignedHeaders','X-Amz-Signature']:
  need(len(q.get(name,[]))==1)
 need(q['X-Amz-Algorithm'][0]=='AWS4-HMAC-SHA256'and '/eu-central-2/s3/aws4_request'in q['X-Amz-Credential'][0])
 need(q['X-Amz-Expires'][0].isdigit()and 1<=int(q['X-Amz-Expires'][0])<=900)
 need('host'in q['X-Amz-SignedHeaders'][0].split(';'))
 signature=q['X-Amz-Signature'][0];need(len(signature)==64 and all(c in'0123456789abcdef'for c in signature))
 need(not any(k.lower().startswith('x-amz-checksum')for k in q))
 return url
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  return None
def main():
 opened=[];old_tty=None;tty_fd=None;put_attempted=False
 try:
  need(os.geteuid()==0 and len(sys.argv)==1)
  os.umask(0o077)
  # Disable terminal echo before READY, so the following stdin URL is never echoed.
  if os.isatty(sys.stdin.fileno()):
   tty_fd=sys.stdin.fileno();old_tty=termios.tcgetattr(tty_fd);quiet=list(old_tty)
   quiet[3]&=~(termios.ECHO|termios.ECHONL)
   termios.tcsetattr(tty_fd,termios.TCSANOW,quiet)
  total=0;payloads=[];metadata=[]
  for path,name in FILES:
   p=Path(path);need(p.resolve()==p)
   fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
   try:
    s=os.fstat(fd)
    need(stat.S_ISREG(s.st_mode)and s.st_uid==1000 and s.st_gid==1000 and stat.S_IMODE(s.st_mode)==0o600 and s.st_nlink==1 and 0<=s.st_size<=MAX_FILE)
    need(ident(p.lstat())==ident(s))
    row={'fd':fd,'path':p,'identity':ident(s)};opened.append(row);fd=None
    body=read_exact(row['fd'],s.st_size);total+=len(body);need(total<=MAX_TOTAL)
    stable(opened);payloads.append((name,body))
    metadata.append({'name':name,'originalPath':path,'bytes':s.st_size,'uid':s.st_uid,'gid':s.st_gid,'mode':'0600','regular':True,'nlink':1,'sourceIdentity':{'device':s.st_dev,'inode':s.st_ino,'size':s.st_size,'mtimeNs':s.st_mtime_ns,'ctimeNs':s.st_ctime_ns}})
   finally:
    if fd is not None:os.close(fd)
  manifest=json.dumps({'schema':'crays.chuck54.original-four-file-ram-custody.v1','files':metadata,'sourceDigestsComputed':False,'sourceFilesChanged':False},sort_keys=True,separators=(',',':')).encode()
  payloads.append(('CUSTODY_METADATA.private.json',manifest));memory=io.BytesIO()
  with tarfile.open(fileobj=memory,mode='w',format=tarfile.USTAR_FORMAT)as archive:
   for name,body in payloads:
    need('/'not in name and name not in('.','..'))
    info=tarfile.TarInfo(name);info.type=tarfile.REGTYPE;info.size=len(body);info.uid=0 if name=='CUSTODY_METADATA.private.json'else 1000;info.gid=info.uid;info.mode=0o600;info.mtime=0
    archive.addfile(info,io.BytesIO(body))
  archive_body=memory.getvalue();need(0<len(archive_body)<=MAX_TOTAL);stable(opened)
  emit({'status':'READY','bytes':len(archive_body),'fileCount':4})
  request=read_request();url=validate_url(request['url'],request['key']);stable(opened)
  context=ssl.create_default_context(cafile='/etc/ssl/certs/ca-certificates.crt')
  opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect(),urllib.request.HTTPSHandler(context=context))
  req=urllib.request.Request(url,data=archive_body,method='PUT',headers={'Content-Length':str(len(archive_body)),'Content-Type':'application/x-tar','x-amz-server-side-encryption':'AES256','If-None-Match':'*'})
  put_attempted=True
  with opener.open(req,timeout=90)as response:
   need(response.status==200)
   version=response.headers.get('x-amz-version-id')
   need(type(version)is str and version not in('','null')and len(version)<=1024 and all(33<=ord(c)<=126 for c in version))
  stable(opened)
  emit({'status':'ACK','key':request['key'],'versionId':version,'bytes':len(archive_body),'fileCount':4,'sourceCustodyStable':True})
  return 0
 except BaseException as error:
  emit({'status':'ERROR','errorClass':type(error).__name__,'putMayHaveSucceeded':put_attempted,'automaticRetryAllowed':False})
  return 1
 finally:
  for row in opened:
   try:os.close(row['fd'])
   except BaseException:pass
  if old_tty is not None:
   try:termios.tcsetattr(tty_fd,termios.TCSANOW,old_tty)
   except BaseException:pass
if __name__=='__main__':
 raise SystemExit(main())
