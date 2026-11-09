import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { indexSdkInventory, verifySdkInventoryLink } from './sdk-inventory-links.mjs';

const row = { relative: '.bin/launch', target_relative: 'pkg/cli', directory: false };
const file = { relative: 'pkg/cli', bytes: 3, sha256: 'a'.repeat(64) };
const inventory = () => ({ targets: [{ ...file }], symlinks: [{ ...row }] });
const counts = { fileCount: 1, symlinkCount: 1 };
async function fixture(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'crays-sdk-link-boundary-'));
  try {
    await fs.mkdir(root + '/pkg'); await fs.mkdir(root + '/.bin');
    await fs.writeFile(root + '/pkg/cli', 'abc');
    await fs.symlink('../pkg/cli', root + '/.bin/launch');
    return await fn(await fs.realpath(root));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
}

test('original inventory uses exact symlink row array, not a numeric count', () => {
  const i = inventory(), indexed = indexSdkInventory(i, counts);
  assert.equal(indexed.links.get(row.relative).target_relative, file.relative);
  assert.throws(() => indexSdkInventory({ ...i, symlinks: 1 }, counts), /EXACT_SDK_LINK_ROWS_REQUIRED/);
});

test('missing and duplicate link rows cannot satisfy exact original count/fileset', () => {
  assert.throws(() => indexSdkInventory({ ...inventory(), symlinks: [] }, counts), /EXACT_SDK_LINK_ROWS_REQUIRED/);
  assert.throws(() => indexSdkInventory({ ...inventory(), symlinks: [row, row] }, { ...counts, symlinkCount: 2 }), /VALID_UNIQUE_SDK_LINK_REQUIRED/);
});

test('file/link collision, escaping target and unpinned target are rejected', () => {
  for (const changed of [
    { ...row, relative: file.relative },
    { ...row, target_relative: '../outside' },
    { ...row, target_relative: 'pkg/unpinned' },
    { ...row, directory: 'false' },
  ]) assert.throws(() => indexSdkInventory({ ...inventory(), symlinks: [changed] }, counts));
});

test('exact real relative-to-target file symlink passes the narrow relation check', async () => fixture(async root => {
  const indexed = indexSdkInventory(inventory(), counts);
  await verifySdkInventoryLink(root, row.relative, indexed.links.get(row.relative));
}));

test('different same-root target is denied even though both files remain inside SDK root', async () => fixture(async root => {
  await fs.writeFile(root + '/pkg/other', 'abc');
  await fs.unlink(root + '/.bin/launch'); await fs.symlink('../pkg/other', root + '/.bin/launch');
  await assert.rejects(verifySdkInventoryLink(root, row.relative, row), /EXACT_SDK_LINK_TARGET_REQUIRED/);
}));

test('ordinary file replacing expected symlink is denied', async () => fixture(async root => {
  await fs.unlink(root + '/.bin/launch'); await fs.writeFile(root + '/.bin/launch', 'abc');
  await assert.rejects(verifySdkInventoryLink(root, row.relative, row), /SDK_SYMLINK_TYPE_REQUIRED/);
}));

test('target kind must match original directory boolean', async () => fixture(async root => {
  await fs.unlink(root + '/pkg/cli'); await fs.mkdir(root + '/pkg/cli');
  await assert.rejects(verifySdkInventoryLink(root, row.relative, row), /SDK_LINK_TARGET_KIND_REQUIRED/);
}));

test('exact directory link is supported only for a pinned directory and actual directory identity', async () => fixture(async root => {
  const directoryRow = { ...row, target_relative: 'pkg', directory: true };
  const indexed = indexSdkInventory({ ...inventory(), symlinks: [directoryRow] }, counts);
  await fs.unlink(root + '/.bin/launch'); await fs.symlink('../pkg', root + '/.bin/launch');
  await verifySdkInventoryLink(root, directoryRow.relative, indexed.links.get(directoryRow.relative));
}));

test('unexpected relative link and an intermediate target alias cannot replace the exact original relation', async () => fixture(async root => {
  await assert.rejects(verifySdkInventoryLink(root, '.bin/foreign', row));
  await fs.rename(root + '/pkg/cli', root + '/pkg/real');
  await fs.symlink('real', root + '/pkg/cli');
  await assert.rejects(verifySdkInventoryLink(root, row.relative, row), /EXACT_RESOLVED_SDK_LINK_TARGET_REQUIRED/);
}));
