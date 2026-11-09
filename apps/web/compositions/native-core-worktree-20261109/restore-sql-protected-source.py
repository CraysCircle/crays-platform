#!/usr/bin/env python3
"""Restore protected original source bytes from the pinned private custody archive."""
import argparse, hashlib, io, json, os, tarfile
from pathlib import Path, PurePosixPath

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def safe_relative(value):
    path = PurePosixPath(value)
    if path.is_absolute() or not path.parts or any(x in (".", "..", "") for x in path.parts):
        raise ValueError("unsafe source path")
    return path

def private_destination(public_root, destination):
    if not destination.is_absolute():
        destination = Path.cwd() / destination
    if ".." in destination.parts or not destination.parent.is_dir():
        raise ValueError("private destination parent must exist")
    if destination.parent.stat().st_uid != os.geteuid():
        raise ValueError("private destination parent must be owned by current user")
    for ancestor in (destination.parent, *destination.parent.parents):
        if ancestor.is_symlink():
            raise ValueError("symlinked destination parent")
        metadata = ancestor.stat()
        if metadata.st_uid not in (0, os.geteuid()) or metadata.st_mode & 0o022:
            raise ValueError("untrusted or writable destination ancestor")
        git_marker = ancestor / ".git"
        if git_marker.exists() or git_marker.is_symlink():
            raise ValueError("private destination must be outside Git")
    if destination.resolve().is_relative_to(public_root.resolve()):
        raise ValueError("private destination must be outside public source")
    if destination.exists() or destination.is_symlink():
        raise ValueError("destination must be new")
    return destination

def restore(public_root, private_archive, destination):
    destination = private_destination(public_root, destination)
    manifest = json.loads((public_root / "untracked-sql-identity-protected-source.json").read_text())
    archive_bytes = private_archive.read_bytes()
    if len(archive_bytes) != manifest["privateArchiveBytes"] or digest(archive_bytes) != manifest["privateArchiveSHA256"]:
        raise ValueError("private archive identity mismatch")
    originals = {}
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
        members = archive.getmembers()
        if len(members) != 849 or sum(x.size for x in members) > 32 * 1024 * 1024:
            raise ValueError("private archive structure mismatch")
        lookup = {}
        for member in members:
            safe_relative(member.name)
            if not member.isfile() or member.issym() or member.islnk() or member.name in lookup:
                raise ValueError("unsafe private archive member")
            lookup[member.name] = member
        for row in manifest["files"]:
            source_path = safe_relative(row["sourcePath"])
            template_path = public_root.joinpath(*safe_relative(row["templateRelativePath"]).parts)
            if template_path.is_symlink() or not template_path.resolve().is_relative_to(public_root.resolve()):
                raise ValueError("unsafe public template")
            template_bytes = template_path.read_bytes()
            if digest(template_bytes) != row["templateSHA256"] or len(template_bytes) != row["templateBytes"]:
                raise ValueError("public template identity mismatch")
            original = archive.extractfile(lookup["originals/" + str(source_path)]).read()
            if digest(original) != row["originalSHA256"] or len(original) != row["originalBytes"]:
                raise ValueError("original source identity mismatch")
            original_text = original.decode("utf-8")
            restored_text = template_bytes.decode("utf-8")
            for binding in row["bindings"]:
                value = original_text[binding["sourceCharacterStart"]:binding["sourceCharacterEnd"]]
                if not value or restored_text.count(binding["placeholder"]) != binding["occurrences"]:
                    raise ValueError("protected binding shape mismatch")
                restored_text = restored_text.replace(binding["placeholder"], value)
            restored = restored_text.encode("utf-8")
            if restored != original:
                raise ValueError("original source restoration mismatch")
            originals[str(source_path)] = restored
    if destination.exists() or destination.is_symlink():
        raise ValueError("destination must be new")
    destination = private_destination(public_root, destination)
    destination.mkdir(mode=0o700)
    for source_path, raw in originals.items():
        target = destination.joinpath(*safe_relative(source_path).parts)
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with target.open("xb") as stream:
            stream.write(raw)
        os.chmod(target, 0o600)
    return {"restoredOriginalFiles": len(originals), "restoredOriginalBytes": sum(map(len, originals.values())), "allOriginalBytesVerified": True, "productProgramsExecuted": False}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--public-root", required=True, type=Path)
    parser.add_argument("--private-archive", required=True, type=Path)
    parser.add_argument("--destination", required=True, type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(restore(args.public_root, args.private_archive, args.destination)))
    except (ValueError, KeyError, OSError, UnicodeError, tarfile.TarError, json.JSONDecodeError):
        parser.exit(2, "Protected source restoration refused; check archive, templates and a new destination.\n")
