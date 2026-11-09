import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import PINS from './HOST_COMPOSITION_SOURCE_PINS.json' with { type: 'json' };
import { readRootFile, sha } from './verify-shared-artifacts.mjs';
import { openRuntimeRoot } from './open-runtime-root.mjs';
import { indexSdkInventory, verifySdkInventoryLink } from './sdk-inventory-links.mjs';

const ROOT = '/var/lib/crays-personal-agents';
const prefix = '/opt/crays/openclaw/personal-services/';
const decode = value => value.replace(/\\([0-7]{3})/g, (_, n) => String.fromCharCode(parseInt(n, 8)));
const exact = (value, keys) => assert(value && Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'HOST_CONFIGURATION_SHAPE_REQUIRED');
async function namespace() { return fs.readlink('/proc/self/ns/mnt'); }
async function mounts() {
  return (await fs.readFile('/proc/self/mountinfo', 'utf8')).trim().split('\n').map(line => {
    const fields = line.split(' '); return { point: decode(fields[4]), options: fields[5].split(',') };
  });
}
async function rootDirectory(directory) {
  const s = await fs.lstat(directory);
  assert(s.isDirectory() && !s.isSymbolicLink() && s.uid === 0 && (s.mode & 0o022) === 0, 'IMMUTABLE_ROOT_DIRECTORY_REQUIRED');
}
/** Qualification only: reads a CURRENT Core deployment's exact Root-owned configuration.
 * Does not mount/chown/start/create anything or turn preflight evidence into admission.
 * Whole source/SDK hashing is bootstrap work, never a per-user registration side effect.
 */
export async function qualifyHostComposition(configurationPath, expectedConfigurationSha256) {
  assert(process.getuid() > 0, 'NON_ROOT_RUNTIME_HOST_REQUIRED');
  assert(/^\/opt\/crays\/openclaw\/personal-services\/[a-zA-Z0-9_.-]+\/HOST_CONFIGURATION.json$/.test(configurationPath), 'FIXED_ROOT_CONFIGURATION_REQUIRED');
  assert(/^[a-f0-9]{64}$/.test(expectedConfigurationSha256));
  const raw = await readRootFile(configurationPath, 16384);
  assert.equal(sha(raw), expectedConfigurationSha256, 'CORE_CONFIGURATION_PIN_REQUIRED');
  const c = JSON.parse(raw);
  exact(c, ['schema', 'sourceRoot', 'sdkInventoryPath', 'uid', 'mountNamespace', 'privateRootDev', 'privateRootIno']);
  assert.equal(c.schema, 'crays.personal-baseline-host-configuration.v1');
  assert.equal(c.sourceRoot, path.dirname(configurationPath));
  assert(c.sourceRoot.startsWith(prefix));
  assert.equal(c.sdkInventoryPath, c.sourceRoot + '/SDK_INPUT_INVENTORY.json');
  assert.equal(c.uid, process.getuid());
  const sdkRoot = c.sourceRoot + '/infra/openclaw/runtime/personal-agent-materializer/node_modules';
  const assertCurrent = async () => {
    assert.equal(await namespace(), c.mountNamespace, 'HOST_MOUNT_NAMESPACE_CHANGED');
    assert.equal(sha(await readRootFile(configurationPath, 16384)), expectedConfigurationSha256, 'HOST_CONFIGURATION_CHANGED');
    const rows = await mounts();
    assert(rows.some(m => m.point === c.sourceRoot && m.options.includes('ro')), 'IMMUTABLE_SOURCE_MOUNT_REQUIRED');
    assert(rows.filter(m => m.point.startsWith(c.sourceRoot + '/')).every(m => m.options.includes('ro')), 'NO_WRITABLE_SOURCE_SUBMOUNT');
    assert(rows.some(m => m.point === ROOT && m.options.includes('rw')), 'EXACT_PRIVATE_ROOT_MOUNT_REQUIRED');
    const root = await openRuntimeRoot();
    try {
      const s = await root.handle.stat();
      assert.equal(String(s.dev), c.privateRootDev); assert.equal(String(s.ino), c.privateRootIno);
      await root.assertCurrent();
    } finally { await root.handle.close(); }
  };
  await assertCurrent();
  await rootDirectory(c.sourceRoot);
  const node = await readRootFile(process.execPath, PINS.node.bytes);
  assert.equal(node.length, PINS.node.bytes); assert.equal(sha(node), PINS.node.sha256, 'QUALIFIED_ORIGINAL_NODE_REQUIRED');
  for (const row of PINS.files) {
    const bytes = await readRootFile(c.sourceRoot + '/' + row.relative);
    assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256, 'IMMUTABLE_SOURCE_PIN_REQUIRED');
  }
  const inventoryRaw = await readRootFile(c.sdkInventoryPath);
  assert.equal(sha(inventoryRaw), PINS.sdk.inventorySha256, 'ORIGINAL_SDK_INVENTORY_PIN_REQUIRED');
  const inventory = JSON.parse(inventoryRaw);
  assert.equal(inventory.original_manifest_sha256, PINS.sdk.originalManifestSha256);
  const indexed = indexSdkInventory(inventory, PINS.sdk);
  const expected = new Set(indexed.files.keys());
  const found = new Set(), foundLinks = new Set(); let entryCount = 0;
  const sdkRootBefore = await fs.lstat(sdkRoot);
  assert(sdkRootBefore.isDirectory() && !sdkRootBefore.isSymbolicLink() && await fs.realpath(sdkRoot) === sdkRoot, 'CANONICAL_SDK_ROOT_REQUIRED');
  const walk = async (directory, relative = '') => {
    assert(relative.length <= 2048 && relative.split('/').length <= 64, 'BOUNDED_SDK_TREE_REQUIRED');
    await rootDirectory(directory);
    const directoryBefore = await fs.lstat(directory);
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      assert(++entryCount <= PINS.sdk.fileCount * 4, 'BOUNDED_SDK_ENTRY_COUNT_REQUIRED');
      const next = relative ? relative + '/' + entry.name : entry.name;
      const full = sdkRoot + '/' + next;
      if (entry.isDirectory()) await walk(full, next);
      else if (entry.isSymbolicLink()) {
        const metadata = await fs.lstat(full);
        assert.equal(metadata.uid, 0);
        const pinnedLink = indexed.links.get(next);
        assert(pinnedLink && !foundLinks.has(next), 'UNEXPECTED_SDK_LINK');
        await verifySdkInventoryLink(sdkRoot, next, pinnedLink);
        foundLinks.add(next);
      } else { assert(entry.isFile() && expected.has(next), 'UNEXPECTED_SDK_FILE'); found.add(next); }
      assert(found.size <= PINS.sdk.fileCount);
    }
    const directoryAfter = await fs.lstat(directory);
    assert(directoryAfter.isDirectory() && !directoryAfter.isSymbolicLink() && directoryAfter.dev === directoryBefore.dev &&
      directoryAfter.ino === directoryBefore.ino, 'SDK_DIRECTORY_REBOUND');
  };
  await walk(sdkRoot);
  assert.equal(found.size, PINS.sdk.fileCount); assert.deepEqual([...foundLinks].sort(), [...indexed.links.keys()].sort(), 'EXACT_SDK_LINK_FILESET_REQUIRED');
  for (const row of inventory.targets) {
    assert(typeof row.relative === 'string' && !path.isAbsolute(row.relative) && row.relative.split('/').every(x => x && x !== '.' && x !== '..'));
    const bytes = await readRootFile(sdkRoot + '/' + row.relative, row.bytes); // Exact pinned cap; two original members exceed the generic16MiB default.
    assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256, 'ORIGINAL_SDK_MEMBER_PIN_REQUIRED');
  }
  const sdkRootAfter = await fs.lstat(sdkRoot);
  assert(sdkRootAfter.isDirectory() && !sdkRootAfter.isSymbolicLink() && sdkRootAfter.dev === sdkRootBefore.dev &&
    sdkRootAfter.ino === sdkRootBefore.ino && await fs.realpath(sdkRoot) === sdkRoot, 'SDK_ROOT_REBOUND');
  await assertCurrent();
  const module = await import(pathToFileURL(c.sourceRoot + '/' + PINS.entry).href);
  assert.equal(typeof module.createServerPersonalRuntimeMaterializer, 'function');
  return Object.freeze({ assertCurrent, createMaterializer: ({ getClient }) => module.createServerPersonalRuntimeMaterializer({ getClient }) });
}
