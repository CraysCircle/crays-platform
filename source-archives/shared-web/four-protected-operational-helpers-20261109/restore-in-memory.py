# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (C) 2026 CRAYS AG
"""In-memory exact restoration reference for four SOURCE_TEMPLATE archives.
This helper performs no filesystem, network, source import, logging or execution.
Callers must verify immutable artifact hashes and keep patch/output bytes private.
"""
import base64
import hashlib
import json
import re

def _need(ok, label):
    if not ok:
        raise ValueError(label)

def _sha(raw):
    return hashlib.sha256(raw).hexdigest()

def _rows(value):
    _need(isinstance(value, list) and len(value) == 4, "EXACT_FOUR_ROWS_REQUIRED")
    mapped = {}
    for row in value:
        _need(isinstance(row, dict), "ROW_OBJECT_REQUIRED")
        path = row.get("originalRelativePath")
        _need(isinstance(path, str) and path and not path.startswith("/") and
              all(p not in ("", ".", "..") for p in path.split("/")) and
              "\\" not in path and "\x00" not in path, "SAFE_ORIGINAL_RELATIVE_PATH_REQUIRED")
        _need(path not in mapped, "DUPLICATE_ORIGINAL_PATH")
        mapped[path] = row
    return mapped

def restore_checked(manifest_bytes, manifest_sha256, template_bytes_by_relative_path,
                    private_patch_bytes, private_patch_sha256):
    """Return four verified original byte streams in memory; never run or write them."""
    _need(isinstance(manifest_bytes, bytes) and len(manifest_bytes) <= 262144,
          "BOUNDED_MANIFEST_REQUIRED")
    _need(isinstance(private_patch_bytes, bytes) and len(private_patch_bytes) <= 1048576,
          "BOUNDED_PRIVATE_PATCH_REQUIRED")
    _need(_sha(manifest_bytes) == manifest_sha256, "MANIFEST_HASH_MISMATCH")
    _need(_sha(private_patch_bytes) == private_patch_sha256, "PRIVATE_PATCH_HASH_MISMATCH")
    public = json.loads(manifest_bytes)
    private = json.loads(private_patch_bytes)
    _need(public.get("schema") == "crays.protected-sharedweb-source.public-map.v1" and
          public.get("sourceKind") == "SOURCE_TEMPLATE_NOT_RUNNABLE_INPUT",
          "EXACT_PUBLIC_SCHEMA_REQUIRED")
    _need(private.get("schema") == "crays.protected-sharedweb-source.private-patch.v1",
          "EXACT_PRIVATE_SCHEMA_REQUIRED")
    pubrows = _rows(public.get("files"))
    privrows = _rows(private.get("files"))
    _need(set(pubrows) == set(privrows), "EXACT_PUBLIC_PRIVATE_FILESET_REQUIRED")
    expected_templates = {r["templateRelativePath"] for r in pubrows.values()}
    _need(isinstance(template_bytes_by_relative_path, dict) and
          set(template_bytes_by_relative_path) == expected_templates and
          len(expected_templates) == 4, "EXACT_TEMPLATE_FILESET_REQUIRED")
    groups = {}
    for group in private.get("groups", []):
        gid = group.get("id")
        _need(type(gid) is int and 0 < gid < 10000 and gid not in groups,
              "UNIQUE_GROUP_ID_REQUIRED")
        kind = group.get("kind")
        _need(kind in ("TEXT", "NUMBER"), "EXACT_GROUP_KIND_REQUIRED")
        original = base64.b64decode(group["originalBase64"], validate=True)
        marker = base64.b64decode(group["replacementBase64"], validate=True)
        token = ("CRAYS_PROTECTED_" + kind + "_" + str(gid).zfill(4)).encode()
        expected_marker = token if kind == "TEXT" else b"0/*" + token + b"*/"
        _need(marker == expected_marker and len(original) <= 65536,
              "EXACT_BOUNDED_MARKER_REQUIRED")
        _need(len(original) == group["originalBytes"] and
              _sha(original) == group["originalSHA256"], "PRIVATE_VALUE_HASH_MISMATCH")
        _need(b"CRAYS_PROTECTED_" not in original, "NO_RECURSIVE_MARKER_VALUE")
        groups[gid] = (marker, original)
    _need(groups, "PRIVATE_GROUPS_REQUIRED")
    result = {}
    used = set()
    total_template_bytes = 0
    for path, row in pubrows.items():
        other = privrows[path]
        for key in ("originalBytes", "originalSHA256", "templateRelativePath",
                    "templateBytes", "templateSHA256", "groups"):
            _need(row[key] == other[key], "PUBLIC_PRIVATE_ROW_BINDING_MISMATCH")
        raw = template_bytes_by_relative_path[row["templateRelativePath"]]
        _need(isinstance(raw, bytes) and len(raw) <= 131072,
              "BOUNDED_TEMPLATE_REQUIRED")
        _need(len(raw) == row["templateBytes"] and _sha(raw) == row["templateSHA256"],
              "TEMPLATE_HASH_MISMATCH")
        total_template_bytes += len(raw)
        _need(total_template_bytes <= 524288, "AGGREGATE_TEMPLATE_LIMIT")
        declared = {}
        for item in row["groups"]:
            gid, count = item["groupId"], item["occurrences"]
            _need(gid not in declared and gid in groups and
                  type(count) is int and count > 0, "DECLARED_GROUP_COUNT_REQUIRED")
            declared[gid] = count
        expected_tokens = set()
        for gid, count in declared.items():
            marker, original = groups[gid]
            _need(raw.count(marker) == count, "MARKER_OCCURRENCE_MISMATCH")
            expected_tokens.add(re.search(rb"CRAYS_PROTECTED_(?:TEXT|NUMBER)_[0-9]{4}", marker).group())
        observed = set(re.findall(rb"CRAYS_PROTECTED_(?:TEXT|NUMBER)_[0-9]{4}", raw))
        _need(observed == expected_tokens, "UNKNOWN_OR_MISSING_TEMPLATE_MARKER")
        for gid in declared:
            marker, original = groups[gid]
            raw = raw.replace(marker, original)
            used.add(gid)
        _need(b"CRAYS_PROTECTED_" not in raw, "UNRESOLVED_MARKER")
        _need(len(raw) == row["originalBytes"] and _sha(raw) == row["originalSHA256"],
              "ORIGINAL_BYTE_HASH_MISMATCH")
        result[path] = raw
    _need(used == set(groups), "UNREFERENCED_PRIVATE_GROUP")
    _need(len(result) == 4 and sum(map(len, result.values())) == 69610,
          "EXACT_ORIGINAL_SCOPE_REQUIRED")
    return result
