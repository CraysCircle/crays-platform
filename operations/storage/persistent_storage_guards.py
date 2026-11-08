"""Read-only persistent-volume checks shared by new AWS guest transfer tools."""
import os,pathlib,re,subprocess

def require(ok,guard):
 if not ok:raise RuntimeError(guard)
def verify_data_mount(data=pathlib.Path('/srv/crays')):
 require(os.geteuid()==0,'ROOT_ON_NEW_AWS_GUEST_REQUIRED')
 require(data.is_dir() and not data.is_symlink(),'PERSISTENT_DATA_DIRECTORY_REQUIRED')
 def find(field):
  return subprocess.run(['findmnt','-nro',field,'--mountpoint',str(data)],check=True,capture_output=True,text=True,timeout=15).stdout.strip()
 require(find('TARGET')==str(data),'PERSISTENT_VOLUME_MUST_BE_MOUNTED')
 receipt=data/'BOOTSTRAP_PERSISTENT_NODE_RECEIPT'
 require(receipt.is_file() and not receipt.is_symlink() and receipt.stat().st_uid==0 and receipt.stat().st_mode&0o077==0,'PRIVATE_NODE_RECEIPT_REQUIRED')
 rows=receipt.read_text().splitlines();values=dict(line.split('=',1) for line in rows)
 require(len(rows)==len(values)==4 and set(values)=={'instanceId','volumeId','filesystemUUID','operatingMode'},'NODE_RECEIPT_FIELDS_CHANGED')
 require(values['operatingMode']=='persistent24x7' and re.fullmatch('i-[0-9a-f]{17}',values['instanceId']) and re.fullmatch('vol-[0-9a-f]{17}',values['volumeId']),'PERSISTENT_NODE_RECEIPT_INVALID')
 require(re.fullmatch('[0-9a-f-]{36}',values['filesystemUUID']) and find('UUID')==values['filesystemUUID'],'DATA_FILESYSTEM_UUID_CHANGED')
 # The persistent data filesystem must differ from the host root filesystem.
 require(os.stat(data).st_dev!=os.stat('/').st_dev,'ROOT_FILESYSTEM_CANNOT_BE_DATA_VOLUME')
 return values

def assert_space(directory,additional):
 require(type(additional) is int and additional>=0,'INVALID_REQUESTED_DISK_BYTES')
 v=os.statvfs(directory)
 total=v.f_blocks*v.f_frsize;available=v.f_bavail*v.f_frsize
 # Keep >=10% or5GiB, whichever is larger, for databases/WAL/runtime activity.
 reserve=max(5*1024**3,(total+9)//10)
 require(available>=additional+reserve,'INSUFFICIENT_FREE_SPACE_PLUS_RUNTIME_RESERVE')
 return reserve
