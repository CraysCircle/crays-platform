"""Own atomic heavy lease; protocol reused from the already qualified PG restore runner."""
from pathlib import Path
import contextlib,fcntl,json,os,stat
CONTROL=Path('/srv/crays/migration-work/20261108/inventory/personal-build-lease-control-20261108-01')
REG=CONTROL/'state/LEASES.json'
@contextlib.contextmanager
def locks():
    with contextlib.ExitStack() as stack:
        for p in [CONTROL/'.root-coordination.lock',Path(str(REG)+'.lock'),REG.parent/'.root-coordination.lock',REG.with_name(REG.name+'.root-coordination.lock')]:
            f=stack.enter_context(p.open('a+'));fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
        yield

def transition(before,after,raw,meta):
    assert {k:v for k,v in before.items() if k not in ('heavy','heavyLease')}=={k:v for k,v in after.items() if k not in ('heavy','heavyLease')}
    tmp=REG.with_name('LEASES.aws-restore-'+str(os.getpid())+'.tmp')
    fd=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,stat.S_IMODE(meta.st_mode))
    try:
        with os.fdopen(fd,'wb') as f:
            os.fchmod(f.fileno(),stat.S_IMODE(meta.st_mode));os.fchown(f.fileno(),meta.st_uid,meta.st_gid)
            f.write((json.dumps(after,indent=2)+'\n').encode());f.flush();os.fsync(f.fileno())
        assert REG.read_bytes()==raw and REG.stat().st_ino==meta.st_ino,'Registry changed during CAS'
        os.replace(tmp,REG)
        parent=os.open(REG.parent,os.O_DIRECTORY);os.fsync(parent);os.close(parent)
        assert json.loads(REG.read_text())==after
    finally:
        if tmp.exists():tmp.unlink()
