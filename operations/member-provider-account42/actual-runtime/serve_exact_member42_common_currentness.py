"""Candidate only. Fixed read-only identities witness; never a Docker/systemd proxy.
Policy contains public source pins and process identities, no principal/credential.
Not installed/started by importing this file.
"""
import os, pathlib, stat, json, hashlib, socket, struct, subprocess, signal, re
ROOT=pathlib.Path('/srv/crays/runtime/chuck-core-currentness-20261107-07')
POLICY=ROOT/'PUBLIC_PROCESS_BINDING.root.json'
SOCKET=pathlib.Path('/run/crays-chuck-core-currentness/status.sock')
DOCKER_CONFIG=pathlib.Path('/srv/crays/releases/chuck-core-composition-20261107-07/empty-docker-config')
COMMON='8ab040c7e161951dd27f42168016e7e9ac9f3431d3a19498f2e00624bebd0808'
UNIT='crays-owner-tools-whatsapp-live.service'
def need(ok):
 if not ok:raise RuntimeError('EXACT_CURRENTNESS_DENIED')
def canonical(x):return json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def root_bytes(p,limit):
 fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW)
 with os.fdopen(fd,'rb') as f:
  s=os.fstat(f.fileno());need(stat.S_ISREG(s.st_mode) and s.st_uid==0 and s.st_nlink==1 and not s.st_mode&0o022 and s.st_size<=limit)
  b=f.read(limit+1);a=os.fstat(f.fileno());q=pathlib.Path(p).lstat()
  need(len(b)==s.st_size and (s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns)==(a.st_dev,a.st_ino,a.st_size,a.st_mtime_ns,a.st_ctime_ns) and (q.st_dev,q.st_ino)==(s.st_dev,s.st_ino));return b

def check_empty_docker_config():
 s=DOCKER_CONFIG.lstat();need(stat.S_ISDIR(s.st_mode) and s.st_uid==0 and s.st_gid==0 and stat.S_IMODE(s.st_mode)==0o555 and DOCKER_CONFIG.resolve()==DOCKER_CONFIG and not list(DOCKER_CONFIG.iterdir()))

def command(argv):
 if argv[0]=='/usr/bin/docker':
  check_empty_docker_config()
  argv=[argv[0],'--config',str(DOCKER_CONFIG),'--host','unix:///var/run/docker.sock',*argv[1:]]
 p=subprocess.run(argv,stdin=subprocess.DEVNULL,capture_output=True,timeout=3,env={'PATH':'/usr/bin:/bin','LANG':'C','LC_ALL':'C'})
 need(p.returncode==0 and len(p.stdout)<2*1024*1024);return p.stdout

def ticks(pid):
 # comm can contain spaces/parentheses. Fields after final ')' begin at stat3.
 s=pathlib.Path('/proc',str(pid),'stat').read_text();return int(s[s.rfind(')')+2:].split()[19])
def process(pid):
 need(type(pid) is int and pid>0)
 p=pathlib.Path('/proc',str(pid));before=ticks(pid)
 status=dict(x.split(':',1) for x in (p/'status').read_text().splitlines() if ':' in x)
 uids=[int(x) for x in status['Uid'].split()];need(len(set(uids))==1)
 value={'pid':pid,'startTicks':before,'uid':uids[0],'cgroup':(p/'cgroup').read_text().strip(),'capMasks':{k:status[k].strip() for k in ['CapInh','CapPrm','CapEff','CapBnd','CapAmb']},'noNewPrivs':int(status['NoNewPrivs'])}
 need(ticks(pid)==before and all(int(v,16)==0 for v in value['capMasks'].values()) and value['noNewPrivs']==1);return value

def validate_policy(p):
 need(set(p)=={'schema','common','sdk','appNetwork','publicSourceFiles'})
 need(p['schema']=='crays.chuck.exact-currentness.public.v1' and p['common']['predecessorId']==COMMON and re.fullmatch('[0-9a-f]{64}',p['common']['id']) is not None and p['common']['uid']==1000 and p['sdk']['unit']==UNIT and p['sdk']['uid']==61304)
 need(re.fullmatch('[0-9a-f]{64}',p['appNetwork']['id']) is not None and p['appNetwork']['gateway']=='172.24.0.1')
 need(1<=len(p['publicSourceFiles'])<=64 and sum(x['bytes'] for x in p['publicSourceFiles'])<=32*1024*1024)
 for row in p['publicSourceFiles']:
  path=pathlib.Path(row['path']);need(str(path).startswith(('/srv/crays/releases/','/opt/crays/openclaw/')) and '..' not in path.parts and path.is_absolute() and re.fullmatch('[0-9a-f]{64}',row['sha256']) is not None)
 return p

def observe(p,peer):
 need(peer[1]==1000 and peer[0]==p['common']['process']['pid'])
 need(process(peer[0])==p['common']['process'] and p['common']['id'] in p['common']['process']['cgroup'])
 cid=p['common']['id'];c=json.loads(command(['/usr/bin/docker','inspect',cid]));need(len(c)==1);c=c[0]
 need(c['Id']==cid and c['Image']==p['common']['image'] and c['State']['Running'] and c['State']['Pid']==peer[0])
 anchor=p['common']['namespaceAnchor'];need(anchor['id']=='9e3bffe1affbfab8f880ceafc5f071223d0eb8232e5c1b05640495f9d9f6b4b0')
 observed_anchor=json.loads(command(['/usr/bin/docker','inspect',anchor['id']]));need(len(observed_anchor)==1);observed_anchor=observed_anchor[0]
 anchor_networks=list(observed_anchor['NetworkSettings']['Networks'].values());app_endpoints=[x for x in anchor_networks if x['NetworkID']==p['appNetwork']['id']]
 need(len(app_endpoints)==1 and app_endpoints[0]['IPAddress']=='172.24.0.2' and sha(canonical(app_endpoints[0]))==anchor['appEndpointSHA256'])
 need(observed_anchor['State']['Running'] and observed_anchor['State']['Pid']==anchor['process']['pid'] and process(anchor['process']['pid'])==anchor['process'] and c['HostConfig']['NetworkMode']=='container:'+anchor['id'])
 for key,field in [('Config','configSHA256'),('HostConfig','hostConfigSHA256'),('Mounts','mountsSHA256')]:need(sha(canonical(c[key]))==p['common'][field])
 network=json.loads(command(['/usr/bin/docker','network','inspect',p['appNetwork']['id']]));need(len(network)==1);network=network[0]
 need(network['Id']==p['appNetwork']['id'] and sha(canonical(network['IPAM']['Config']))==p['appNetwork']['ipamConfigSHA256'] and network['Driver']=='bridge' and not network['Internal'] and network['Options']==p['appNetwork']['options'])
 need(any(x.get('Gateway')==p['appNetwork']['gateway'] for x in network['IPAM']['Config']))
 raw=command(['/usr/bin/systemctl','show',UNIT,'-p','Id','-p','ActiveState','-p','InvocationID','-p','MainPID','-p','UID','-p','ExecMainStartTimestampMonotonic','-p','ControlGroup']).decode()
 values=dict(x.split('=',1) for x in raw.splitlines() if '=' in x)
 need(values['Id']==UNIT and values['ActiveState']=='active' and values['InvocationID']==p['sdk']['invocationId'] and int(values['MainPID'])==p['sdk']['process']['pid'] and int(values['UID'])==61304 and values['ControlGroup']=='/system.slice/'+UNIT and int(values['ExecMainStartTimestampMonotonic'])==p['sdk']['startedMonotonicUSec'])
 need(process(int(values['MainPID']))==p['sdk']['process'])
 for row in p['publicSourceFiles']:
  body=root_bytes(row['path'],row['bytes']);need(len(body)==row['bytes'] and sha(body)==row['sha256'])
 need(process(peer[0])==p['common']['process'] and process(p['sdk']['process']['pid'])==p['sdk']['process'])

def main():
 os.umask(0o077);need(os.geteuid()==0 and pathlib.Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip()=='i-0eb300e1b02414d8f')
 check_empty_docker_config()
 directory=SOCKET.parent;d=directory.lstat();need(stat.S_ISDIR(d.st_mode) and d.st_uid==0 and not d.st_mode&0o022 and directory.resolve()==directory)
 need(not os.path.lexists(SOCKET));listener=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);admitted=None
 try:
  listener.bind(str(SOCKET));os.chown(SOCKET,1000,1000);os.chmod(SOCKET,0o600);admitted=SOCKET.lstat();listener.listen(4);listener.settimeout(1)
  stopping=False
  def stop(*unused):
   nonlocal stopping;stopping=True
  signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
  while not stopping:
   try:client,_=listener.accept()
   except socket.timeout:continue
   with client:
    client.settimeout(4)
    try:
     peer=struct.unpack('3i',client.getsockopt(socket.SOL_SOCKET,socket.SO_PEERCRED,struct.calcsize('3i')))
     # One exact line, one response, no method/argv/path supplied by caller.
     data=b''
     while not data.endswith(b'\n') and len(data)<=512:
      block=client.recv(513-len(data));need(bool(block));data+=block
     need(len(data)<=512 and data.count(b'\n')==1)
     req=json.loads(data);need(set(req)=={'schema','op','policySHA256','nonce'} and req['schema']=='crays.chuck.currentness.request.v1' and req['op']=='assert' and re.fullmatch('[0-9a-f]{64}',req['policySHA256']) and re.fullmatch('[0-9a-f]{32}',req['nonce']))
     raw=root_bytes(POLICY,32768);need(sha(raw)==req['policySHA256']);p=validate_policy(json.loads(raw));observe(p,peer);need(root_bytes(POLICY,32768)==raw)
     reply={'schema':'crays.chuck.currentness.reply.v1','nonce':req['nonce'],'policySHA256':req['policySHA256'],'current':True,'coreId':p['common']['id'],'coreHostPid':p['common']['process']['pid'],'coreStartTicks':p['common']['process']['startTicks'],'sdkPid':p['sdk']['process']['pid'],'sdkInvocationId':p['sdk']['invocationId']};client.sendall(canonical(reply)+b'\n')
    except Exception:
     # No stderr, inspect values, caller text, paths or policy contents escape.
     try:client.sendall(b'{"schema":"crays.chuck.currentness.reply.v1","current":false}\n')
     except OSError:pass
 finally:
  listener.close()
  if admitted is not None and os.path.lexists(SOCKET):
   q=SOCKET.lstat()
   if stat.S_ISSOCK(q.st_mode) and (q.st_dev,q.st_ino)==(admitted.st_dev,admitted.st_ino):SOCKET.unlink()
if __name__=='__main__':
 try:main()
 except Exception:raise SystemExit(1)
