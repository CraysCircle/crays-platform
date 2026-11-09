import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const relative = value => typeof value === 'string' && value.length > 0 && value.length <= 2048 &&
  !path.isAbsolute(value) && value.split('/').every(x => x && x !== '.' && x !== '..');

/** Exact inventory shape/index only; not an admission or Root-ownership verifier. */
export function indexSdkInventory(inventory, expected) {
  assert(Array.isArray(inventory.targets) && inventory.targets.length === expected.fileCount, 'EXACT_SDK_FILE_ROWS_REQUIRED');
  assert(Array.isArray(inventory.symlinks) && inventory.symlinks.length === expected.symlinkCount, 'EXACT_SDK_LINK_ROWS_REQUIRED');
  const files = new Map(), links = new Map();
  for (const row of inventory.targets) {
    assert(relative(row.relative) && !files.has(row.relative) && Number.isSafeInteger(row.bytes) && row.bytes >= 0 &&
      typeof row.sha256 === 'string' && /^[a-f0-9]{64}$/.test(row.sha256), 'VALID_UNIQUE_SDK_FILE_REQUIRED');
    files.set(row.relative, row);
  }
  for (const row of inventory.symlinks) {
    assert(relative(row.relative) && relative(row.target_relative) && typeof row.directory === 'boolean' &&
      !links.has(row.relative) && !files.has(row.relative), 'VALID_UNIQUE_SDK_LINK_REQUIRED');
    if (row.directory) assert([...files.keys()].some(name => name.startsWith(row.target_relative + '/')), 'PINNED_SDK_TARGET_DIRECTORY_REQUIRED');
    else assert(files.has(row.target_relative), 'PINNED_SDK_TARGET_FILE_REQUIRED');
    links.set(row.relative, row);
  }
  return { files, links };
}

/** Verify one EXACT indexed symlink against real filesystem target/type and inode identity.
 * Root ownership/read-only mounts and full file bytes are separately mandatory in qualification.
 * This narrow verifier cannot publish a composition or establish admission by itself. */
export async function verifySdkInventoryLink(root, linkRelative, row) {
  assert(relative(linkRelative) && row.relative === linkRelative && relative(row.target_relative) && typeof row.directory === 'boolean');
  const rootBefore = await fs.lstat(root);
  assert(rootBefore.isDirectory() && !rootBefore.isSymbolicLink() && await fs.realpath(root) === root, 'CANONICAL_SDK_ROOT_REQUIRED');
  const file = root + '/' + linkRelative, target = root + '/' + row.target_relative;
  const before = await fs.lstat(file);
  assert(before.isSymbolicLink(), 'SDK_SYMLINK_TYPE_REQUIRED');
  const rawTarget = await fs.readlink(file);
  assert.equal(path.resolve(path.dirname(file), rawTarget), target, 'EXACT_SDK_LINK_TARGET_REQUIRED');
  const resolved = await fs.realpath(file);
  assert.equal(resolved, target, 'EXACT_RESOLVED_SDK_LINK_TARGET_REQUIRED');
  assert.equal(await fs.realpath(target), target, 'CANONICAL_PINNED_SDK_TARGET_REQUIRED');
  const targetBefore = await fs.lstat(target);
  assert(!targetBefore.isSymbolicLink() && (row.directory ? targetBefore.isDirectory() : targetBefore.isFile()), 'SDK_LINK_TARGET_KIND_REQUIRED');
  const after = await fs.lstat(file), targetAfter = await fs.lstat(target), rootAfter = await fs.lstat(root);
  assert(after.isSymbolicLink() && after.dev === before.dev && after.ino === before.ino &&
    await fs.readlink(file) === rawTarget, 'SDK_LINK_REBOUND');
  assert(targetAfter.dev === targetBefore.dev && targetAfter.ino === targetBefore.ino &&
    targetAfter.isDirectory() === row.directory && !targetAfter.isSymbolicLink(), 'SDK_LINK_TARGET_REBOUND');
  assert(rootAfter.isDirectory() && !rootAfter.isSymbolicLink() && rootAfter.dev === rootBefore.dev && rootAfter.ino === rootBefore.ino,
    'SDK_ROOT_REBOUND');
}
