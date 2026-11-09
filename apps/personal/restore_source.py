#!/usr/bin/env python3
"""Restore an exact archived Personal web application source input."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath

ALLOWED = {"MEMBER_TEST_ACCOUNT_ID", "MEMBER_TEST_SUBJECT_SHA256"}

def safe_path(value):
    if not isinstance(value, str) or "\\" in value:
        raise ValueError("invalid relative source path")
    p = PurePosixPath(value)
    if p.is_absolute() or not p.parts or ".." in p.parts:
        raise ValueError("invalid relative source path")
    return p

def no_links(p):
    if any(x.is_symlink() for x in [p, *p.parents]):
        raise ValueError("symlinked restore paths are not accepted")

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def restore(root, version, destination, bindings_file, asset_root=None):
    dest = Path(destination).absolute()
    no_links(dest)
    dest = dest.resolve()
    if dest.exists() or not dest.parent.is_dir():
        raise ValueError("destination must be new and its parent must exist")
    if dest.is_relative_to(root):
        raise ValueError("destination must be outside this source archive")
    if any((x / ".git").exists() for x in [dest.parent, *dest.parent.parents]):
        raise ValueError("destination must be outside Git")
    manifest = json.loads((root / ("source-" + version + ".json")).read_text())
    rows = manifest["files"]
    expected_count = {"baseline": 1486, "candidate": 1489}[version]
    if len(rows) != expected_count or manifest["fileCount"] != expected_count:
        raise ValueError("unexpected source file set")
    required = {key for row in rows for key in row.get("protectedInputs", [])}
    if not required <= ALLOWED:
        raise ValueError("unknown protected input name")
    values = {}
    if bindings_file:
        p = Path(bindings_file).absolute()
        no_links(p)
        values = json.loads(p.read_text())
        if not isinstance(values, dict) or not set(values) <= ALLOWED:
            raise ValueError("invalid protected input names")
    if required - set(values):
        raise ValueError("required protected source input is missing")
    for key in required:
        value = values[key]
        if not isinstance(value, str) or not 0 < len(value) < 4096 or "__CRAYS_PROTECTED_" in value:
            raise ValueError("invalid protected source input value")
    output = []
    seen = set()
    total = 0
    for row in rows:
        target = safe_path(row["path"])
        if str(target) in seen:
            raise ValueError("duplicate output path")
        seen.add(str(target))
        if row.get("protectedAsset"):
            if asset_root is None:
                raise ValueError("original asset root is required")
            owner_root = Path(asset_root).absolute()
            no_links(owner_root)
            source = owner_root / str(target)
            no_links(source)
            if not source.resolve().is_relative_to(owner_root.resolve()):
                raise ValueError("asset path is outside owner root")
            raw = source.read_bytes()
            if len(raw) != row["bytes"] or digest(raw) != row["sha256"]:
                raise ValueError("original asset integrity mismatch: " + str(target))
        else:
            source = root / str(safe_path(row["exportPath"]))
            no_links(source)
            if not source.resolve().is_relative_to(root):
                raise ValueError("export path is outside this archive")
            raw = source.read_bytes()
            if len(raw) != row["exportBytes"] or digest(raw) != row["exportSHA256"]:
                raise ValueError("source export integrity mismatch: " + str(target))
        for key in row.get("protectedInputs", []):
            marker = ("__CRAYS_PROTECTED_" + key + "__").encode()
            if marker not in raw:
                raise ValueError("missing protected marker")
            raw = raw.replace(marker, values[key].encode())
        if b"__CRAYS_PROTECTED_" in raw or len(raw) != row["bytes"] or digest(raw) != row["sha256"]:
            raise ValueError("original source integrity mismatch: " + str(target))
        total += len(raw)
        if total > 128 * 1024 * 1024:
            raise ValueError("source input exceeds restore size limit")
        output.append((target, raw))
    if any(str(p) in seen for target, _ in output for p in target.parents if str(p) != "."):
        raise ValueError("conflicting source paths")
    os.umask(0o077)
    dest.mkdir(mode=0o700)
    for target, raw in output:
        p = dest / str(target)
        p.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
    return {"version": version, "originalFilesSHA256AndSizeVerified": len(output), "sourceProgramsExecuted": False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", choices=["baseline", "candidate"], required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--bindings-file", help="Owner-supplied protected source inputs; never add to Git")
    parser.add_argument("--asset-root", help="Owner-supplied original image directory; each asset hash is verified")
    args = parser.parse_args()
    try:
        result = restore(Path(__file__).resolve().parent, args.version, args.destination, args.bindings_file, args.asset_root)
    except (ValueError, OSError, KeyError, TypeError) as exc:
        raise SystemExit("Source restoration refused: " + str(exc)) from None
    print(json.dumps(result))

if __name__ == "__main__":
    main()
