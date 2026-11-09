#!/usr/bin/env python3
"""Reconstruct recorded Member source inputs. Does not run application code."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess

BASE_COMMIT = "cbe2fe2b8784597640ad74ba0abd9c4ba7c3d3ea"
COMPOSITIONS = {"original": "original-source.json", "aws-build25": "aws-build25-source.json"}
BINDING_NAMES = {"MEMBER_TEST_ACCOUNT_ID", "MEMBER_TEST_SUBJECT_SHA256"}

def checked_path(value):
    if not isinstance(value, str) or "\\" in value:
        raise ValueError("invalid relative source path")
    p = PurePosixPath(value)
    if p.is_absolute() or not p.parts or any(x in ("", ".", "..") for x in p.parts):
        raise ValueError("invalid relative source path")
    return p

def no_symlink_components(path):
    if any(p.is_symlink() for p in [path, *path.parents]):
        raise ValueError("symbolic links are not accepted for restore paths")

def sha(data):
    return hashlib.sha256(data).hexdigest()

def reconstruct(bundle, repository, composition, destination, bindings_file):
    repository = Path(repository).absolute()
    destination = Path(destination).absolute()
    no_symlink_components(repository)
    no_symlink_components(destination)
    if destination.exists():
        raise ValueError("destination must not already exist")
    if not destination.parent.is_dir():
        raise ValueError("destination parent must already exist")
    for parent in [destination.parent, *destination.parent.parents]:
        if (parent / ".git").exists():
            raise ValueError("restore destination must be outside a Git working tree")
    if destination.is_relative_to(repository) or destination.is_relative_to(bundle):
        raise ValueError("restore destination must be outside the repository and source bundle")
    env = os.environ.copy()
    for key in list(env):
        if key in ("GIT_CONFIG_PARAMETERS", "GIT_CONFIG_COUNT", "GIT_CURL_VERBOSE") or key.startswith(("GIT_TRACE", "GIT_CONFIG_KEY_", "GIT_CONFIG_VALUE_")):
            env.pop(key, None)
    env.update(GIT_CONFIG_GLOBAL="/dev/null", GIT_CONFIG_NOSYSTEM="1", GIT_TERMINAL_PROMPT="0")
    def git(*args):
        return subprocess.run(["git", "-C", str(repository), *args], env=env, capture_output=True, check=True).stdout
    if git("rev-parse", "--verify", BASE_COMMIT + "^{commit}").decode().strip() != BASE_COMMIT:
        raise ValueError("required original shared source commit is unavailable")
    manifest = json.loads((bundle / COMPOSITIONS[composition]).read_text())
    if manifest["baseSourceCommit"] != BASE_COMMIT:
        raise ValueError("unexpected base source commit")
    rows = manifest["files"]
    if not isinstance(rows, list) or len(rows) != manifest["fileCount"] or not 0 < len(rows) < 10000:
        raise ValueError("invalid source file set")
    needed = set()
    for row in rows:
        needed.update(row.get("protectedBindings", []))
    if not needed <= BINDING_NAMES:
        raise ValueError("unknown protected source input")
    bindings = {}
    if bindings_file:
        path = Path(bindings_file).absolute()
        no_symlink_components(path)
        bindings = json.loads(path.read_text())
        if not isinstance(bindings, dict) or not set(bindings) <= BINDING_NAMES:
            raise ValueError("invalid protected source input names")
    if needed - set(bindings):
        raise ValueError("required protected source inputs are missing")
    for name in needed:
        value = bindings[name]
        if not isinstance(value, str) or not 0 < len(value) <= 4096 or "__CRAYS_PROTECTED_" in value:
            raise ValueError("invalid protected source input value")
    prepared = []
    seen = set()
    total = 0
    for row in rows:
        rel = checked_path(row["path"])
        if str(rel) in seen:
            raise ValueError("duplicate source output path")
        seen.add(str(rel))
        size = row["bytes"]
        if not isinstance(size, int) or not 0 <= size <= 16 * 1024 * 1024 or not re.fullmatch(r"[0-9a-f]{64}", row["sha256"]):
            raise ValueError("invalid recorded source size or digest")
        storage = row["storage"]
        if storage["kind"] == "git":
            if row.get("protectedBindings") or storage["path"] != "apps/web/" + str(rel):
                raise ValueError("invalid original Git source reference")
            raw = git("show", BASE_COMMIT + ":" + storage["path"])
        elif storage["kind"] == "file":
            export = bundle / str(checked_path(storage["path"]))
            no_symlink_components(export)
            if not export.resolve().is_relative_to(bundle.resolve()):
                raise ValueError("source export is outside this bundle")
            raw = export.read_bytes()
            if len(raw) != storage["bytes"] or sha(raw) != storage["sha256"]:
                raise ValueError("source export integrity mismatch: " + str(rel))
            for name in row.get("protectedBindings", []):
                marker = ("__CRAYS_PROTECTED_" + name + "__").encode()
                if marker not in raw:
                    raise ValueError("missing protected input marker: " + str(rel))
                raw = raw.replace(marker, bindings[name].encode())
            if b"__CRAYS_PROTECTED_" in raw:
                raise ValueError("unresolved protected input marker: " + str(rel))
        else:
            raise ValueError("unknown source storage type")
        if len(raw) != size or sha(raw) != row["sha256"]:
            raise ValueError("original source integrity mismatch: " + str(rel))
        total += len(raw)
        if total > 64 * 1024 * 1024:
            raise ValueError("source composition exceeds the bounded restore size")
        prepared.append((rel, raw))
    for rel, _ in prepared:
        if any(str(p) in seen for p in rel.parents if str(p) != "."):
            raise ValueError("source file and directory paths conflict")
    os.umask(0o077)
    destination.mkdir(mode=0o700)
    for rel, raw in prepared:
        target = destination / str(rel)
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(raw)
    return {"composition": composition, "files": len(prepared), "bytes": total, "originalSHA256AndSizesVerifiedBeforeWriting": True, "sourceProgramsExecuted": False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repository", required=True, help="Existing local crays-platform Git clone; no network access is used")
    parser.add_argument("--composition", required=True, choices=sorted(COMPOSITIONS))
    parser.add_argument("--destination", required=True, help="New directory outside Git; its parent must already exist")
    parser.add_argument("--bindings-file", help="Owner-supplied protected JSON; values are never printed")
    args = parser.parse_args()
    try:
        result = reconstruct(Path(__file__).resolve().parent, args.repository, args.composition, args.destination, args.bindings_file)
    except (ValueError, OSError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
        raise SystemExit("Source reconstruction refused: " + str(exc)) from None
    print(json.dumps(result))

if __name__ == "__main__":
    main()
