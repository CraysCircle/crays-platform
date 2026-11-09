#!/usr/bin/env python3
"""Restore only captured source bytes. No original source program is executed."""
import argparse, hashlib, json, os, stat
from pathlib import Path, PurePosixPath
def digest(b): return hashlib.sha256(b).hexdigest()
def checked_relative(value):
    p=PurePosixPath(value)
    if p.is_absolute() or not p.parts or any(x in ('..','.','') for x in p.parts) or '\\' in value:
        raise ValueError('UNSAFE_RELATIVE_PATH')
    return p
def existing_chain(path):
    absolute=Path(os.path.abspath(path))
    for p in reversed((absolute,*absolute.parents)):
        if p.exists() or p.is_symlink():
            s=p.lstat()
            if stat.S_ISLNK(s.st_mode): raise ValueError('SYMLINK_PATH_REFUSED')
    return absolute
def private_destination(value, archive):
    dest=existing_chain(value)
    if dest.exists() or dest.is_symlink(): raise ValueError('DESTINATION_MUST_BE_NEW')
    if dest == archive or archive in dest.parents: raise ValueError('ARCHIVE_DESTINATION_REFUSED')
    for p in dest.parents:
        if (p/'.git').exists() or (p/'.git').is_symlink(): raise ValueError('GIT_DESTINATION_REFUSED')
    if not dest.parent.is_dir(): raise ValueError('DESTINATION_PARENT_REQUIRED')
    return dest
def read_regular(path, private=False):
    path=Path(os.path.abspath(path))
    parent=os.open('/',os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:
        for part in path.parts[1:-1]:
            nxt=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent)
            os.close(parent);parent=nxt
        fd=os.open(path.name,os.O_RDONLY|os.O_NOFOLLOW,dir_fd=parent)
    finally: os.close(parent)
    try:
        s=os.fstat(fd)
        if not stat.S_ISREG(s.st_mode) or s.st_size>1048576 or (private and s.st_mode&0o077): raise ValueError('PRIVATE_REGULAR_SOURCE_REQUIRED')
        with os.fdopen(os.dup(fd),'rb') as f: b=f.read(1048577)
        t=os.fstat(fd)
        if (s.st_dev,s.st_ino,s.st_size,s.st_mtime_ns,s.st_ctime_ns)!=(t.st_dev,t.st_ino,t.st_size,t.st_mtime_ns,t.st_ctime_ns): raise ValueError('SOURCE_CHANGED')
        if len(b)!=s.st_size: raise ValueError('SOURCE_SIZE_MISMATCH')
        return b
    finally: os.close(fd)
def read_private_bindings(path):
    return json.loads(read_regular(path,private=True))['slots']
def prepare(archive, bindings):
    m=json.loads(read_regular(archive/'source-capture.json'))
    prepared=[];seen=set()
    for row in m['files']:
        rel=checked_relative(row['originalRelativePath'])
        if str(rel) in seen: raise ValueError('DUPLICATE_ORIGINAL_PATH')
        seen.add(str(rel))
        stored=checked_relative(row['publishedRelativePath'])
        p=archive.joinpath(*stored.parts)
        b=read_regular(p)
        if len(b)!=row['publishedBytes'] or digest(b)!=row['publishedSHA256']: raise ValueError('PUBLIC_SOURCE_HASH_MISMATCH')
        for item in row['protectedSlots']:
            marker=item['marker'].encode('ascii')
            value=bindings.get(item['slot'])
            if not isinstance(value,str) or b.count(marker)!=item['occurrences']: raise ValueError('PROTECTED_BINDING_REQUIRED')
            b=b.replace(marker,value.encode('utf-8'))
        if len(b)!=row['originalBytes'] or digest(b)!=row['originalSHA256']: raise ValueError('ORIGINAL_SOURCE_HASH_MISMATCH')
        prepared.append((rel,b))
    return prepared
def write_new(dest,prepared):
    parent=os.open('/',os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:
        for part in dest.parent.parts[1:]:
            nxt=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent)
            os.close(parent);parent=nxt
        os.mkdir(dest.name,mode=0o700,dir_fd=parent)
        root=os.open(dest.name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=parent)
    finally: os.close(parent)
    try:
        for rel,b in prepared:
            fd=os.dup(root)
            try:
                for part in rel.parts[:-1]:
                    try: os.mkdir(part,mode=0o700,dir_fd=fd)
                    except FileExistsError: pass
                    nxt=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd)
                    os.close(fd);fd=nxt
                out=os.open(rel.parts[-1],os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600,dir_fd=fd)
                with os.fdopen(out,'wb') as f: f.write(b)
            finally: os.close(fd)
    finally: os.close(root)
def main():
    a=argparse.ArgumentParser(description=__doc__);a.add_argument('--destination',required=True);a.add_argument('--bindings-file');args=a.parse_args()
    archive=Path(__file__).resolve().parent
    dest=private_destination(args.destination,archive)
    bindings=read_private_bindings(args.bindings_file) if args.bindings_file else {}
    prepared=prepare(archive,bindings)
    write_new(dest,prepared)
    print(json.dumps({'status':'RESTORED_EXACT_SOURCE_ONLY','files':len(prepared),'originalProgramsExecuted':False}))
if __name__=='__main__': main()
