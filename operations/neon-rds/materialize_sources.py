#!/usr/bin/env python3
"""Restore captured source bytes without executing any migration program."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat


def digest(body):
    return hashlib.sha256(body).hexdigest()


def relative_path(value):
    p = PurePosixPath(value)
    if p.is_absolute() or not p.parts or any(x in (".", "..") for x in p.parts):
        raise ValueError("Unsafe manifest path")
    return Path(*p.parts)


def reject_symlinks(path):
    for item in (path, *path.parents):
        if item.is_symlink():
            raise ValueError("Symlink path refused")


def inside_git(path):
    return any((item / ".git").exists() for item in (path, *path.parents))


def restore(source_root, binding_file, destination):
    source_root = source_root.absolute()
    binding_file = binding_file.absolute()
    destination = destination.absolute()
    for path in (source_root, binding_file, destination):
        reject_symlinks(path)
    source_root = source_root.resolve(strict=True)
    binding_file = binding_file.resolve(strict=True)
    destination = destination.resolve(strict=False)
    if inside_git(binding_file.parent) or inside_git(destination.parent):
        raise ValueError("Private bindings and restored originals must remain outside Git")
    if destination == source_root or source_root in destination.parents:
        raise ValueError("Destination must be outside the public export")
    mode = binding_file.stat()
    if not stat.S_ISREG(mode.st_mode) or mode.st_mode & 0o077:
        raise ValueError("Binding file must be a regular owner-only file")
    manifest = json.loads((source_root / "SOURCE_EXPORT.json").read_text())
    bindings = json.loads(binding_file.read_text())["bindings"]
    declared = {item["id"]: item for item in manifest["bindings"]}
    if set(bindings) != set(declared):
        raise ValueError("Binding identifiers do not match the manifest")
    for value in bindings.values():
        if not isinstance(value, str) or re.fullmatch(r"[0-9a-fA-F]{64}", value) is None:
            raise ValueError("A binding must contain exactly 64 hexadecimal characters")
    prepared = []
    seen = set()
    for record in manifest["files"]:
        exported = source_root / relative_path(record["publicPath"])
        reject_symlinks(exported)
        body = exported.read_bytes()
        if len(body) != record["publicBytes"] or digest(body) != record["publicSHA256"]:
            raise ValueError("Exported source integrity check failed")
        for identifier in record["requiredBindings"]:
            marker = declared[identifier]["marker"].encode()
            if marker not in body:
                raise ValueError("Required source marker is absent")
            body = body.replace(marker, bindings[identifier].encode())
        if len(body) != record["originalBytes"] or digest(body) != record["originalSHA256"]:
            raise ValueError("Original source integrity check failed")
        relative = relative_path(record["sourcePath"])
        if relative in seen:
            raise ValueError("Duplicate output path")
        seen.add(relative)
        prepared.append((relative, body))
    # Validate every original before creating any output; refuse an existing tree.
    destination.mkdir(mode=0o700, parents=False, exist_ok=False)
    for relative, body in prepared:
        target = destination / relative
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        reject_symlinks(target)
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(body)
    return len(prepared)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bindings", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    count = restore(Path(__file__).resolve().parent, args.bindings, args.output)
    print(json.dumps({"verifiedOriginalFilesWritten": count, "sourceProgramsExecuted": False}))


if __name__ == "__main__":
    main()
