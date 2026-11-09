#!/usr/bin/env python3
"""Restore the exact recorded 2,045-file Club Build38 source input without executing it."""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, os, re, subprocess

def relative(value):
    p=PurePosixPath(value)
    if p.is_absolute() or not p.parts or '..' in p.parts or '\\' in value:
        raise ValueError('Unsafe source path')
    return p

def body_at(root, value):
    rel=relative(value); p=root.joinpath(*rel.parts)
    if not p.resolve().is_relative_to(root.resolve()) or p.is_symlink():
        raise ValueError('Unsafe source storage')
    return p.read_bytes()

def verified(body, size, digest):
    if len(body)!=size or hashlib.sha256(body).hexdigest()!=digest:
        raise ValueError('Source integrity check failed')
    return body

def restore(repo, manifest_path, state, bindings, output, reference_cache=None, reference_repository=None):
    manifest=json.loads(manifest_path.read_text())
    required=set(manifest['requiredProtectedBindings'])
    if set(bindings)!=required or any(not isinstance(v,str) or not v for v in bindings.values()):
        raise ValueError('Protected source bindings are missing or invalid')
    if output.exists() or output.is_symlink():
        raise ValueError('Output must not already exist')
    for p in [output,*output.parents]:
        if p.is_symlink():
            raise ValueError('Output path must not contain symlinks')
    rows=[x for x in manifest['files'] if x['state']==state]
    if len(rows)!=2045 or len({x['path'] for x in rows})!=2045:
        raise ValueError('Invalid source state')
    prepared=[]
    for row in rows:
        relative(row['path']); storage=row['storage']
        if storage['kind']=='repository-file':
            body=body_at(repo,storage['path'])
            verified(body,storage['bytes'],storage['sha256'])
        elif storage['kind']=='immutable-git-source':
            sha=storage['gitBlobSHA1']
            if not re.fullmatch('[0-9a-f]{40}',sha):
                raise ValueError('Invalid reference object')
            if reference_cache is not None:
                body=body_at(reference_cache,sha+'.bin')
            else:
                reference_repo=reference_repository or repo
                commit=storage['commit'];relative(storage['path'])
                if not re.fullmatch('[0-9a-f]{40}',commit):
                    raise ValueError('Invalid reference commit')
                env=os.environ.copy()
                for k in list(env):
                    if k.startswith(('GIT_TRACE','GIT_CONFIG_KEY_','GIT_CONFIG_VALUE_')) or k in ['GIT_CURL_VERBOSE','GIT_CONFIG_PARAMETERS','GIT_CONFIG_COUNT']:
                        env.pop(k,None)
                env.update(GIT_OPTIONAL_LOCKS='0',GIT_CONFIG_GLOBAL='/dev/null',GIT_CONFIG_NOSYSTEM='1',GIT_TERMINAL_PROMPT='0')
                try:
                    candidate=body_at(reference_repo,storage['path'])
                    body=candidate if len(candidate)==row['originalBytes'] and hashlib.sha256(candidate).hexdigest()==row['originalSHA256'] else None
                except OSError:
                    body=None
                if body is None:
                    body=subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-C',str(reference_repo),'show',commit+':'+storage['path']],env=env,stderr=subprocess.DEVNULL)
            if hashlib.sha1(b'blob '+str(len(body)).encode()+b'\0'+body).hexdigest()!=sha:
                raise ValueError('Reference object check failed')
        else:
            raise ValueError('Unknown source storage')
        for replacement in row['protectedReplacements']:
            token=replacement['token'].encode()
            if body.count(token)!=replacement['occurrences']:
                raise ValueError('Protected template check failed')
            body=body.replace(token,bindings[replacement['binding']].encode())
        if b'__CRAYS_CORE_PROTECTED_' in body:
            raise ValueError('Unresolved source template')
        verified(body,row['originalBytes'],row['originalSHA256'])
        prepared.append((row,body))
    output.mkdir(parents=True)
    for row,body in prepared:
        f=output.joinpath(*relative(row['path']).parts);f.parent.mkdir(parents=True,exist_ok=True)
        with f.open('xb') as target:target.write(body)
        if row.get('originalMode'):
            f.chmod(int(row['originalMode'],8))
    return len(prepared)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository-root',type=Path,required=True)
    parser.add_argument('--state',choices=['build38'],default='build38')
    parser.add_argument('--bindings',type=Path)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--reference-cache',type=Path)
    args=parser.parse_args()
    try:
        n=restore(args.repository_root,Path(__file__).with_name('source-inputs.json'),args.state,json.loads(args.bindings.read_text()) if args.bindings else {},args.output,args.reference_cache)
    except (ValueError,OSError,subprocess.SubprocessError,json.JSONDecodeError):
        parser.exit(1,'Source restoration refused; check paths, bindings and recorded hashes.\n')
    print(json.dumps({'sourceFilesRestored':n,'sourceProgramsExecuted':False}))
if __name__=='__main__':
    main()
