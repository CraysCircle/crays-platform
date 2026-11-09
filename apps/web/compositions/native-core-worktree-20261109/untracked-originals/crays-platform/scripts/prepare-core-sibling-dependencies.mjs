import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

async function readPackageJSON(file) {
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await handle.stat();
    assert(before.isFile() && before.nlink === 1 && before.size <= 16 * 1024 * 1024, 'REGULAR_PACKAGE_METADATA_REQUIRED');
    const data = await handle.readFile('utf8');
    const after = await handle.stat();
    assert(before.dev === after.dev && before.ino === after.ino && before.size === after.size &&
      before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs, 'PACKAGE_METADATA_CHANGED');
    return JSON.parse(data);
  } finally { await handle.close(); }
}

async function ownDirectory(directory) {
  const info = await fs.lstat(directory);
  assert(info.isDirectory() && !info.isSymbolicLink() && info.uid === process.getuid(), 'OWN_REGULAR_DIRECTORY_REQUIRED');
  assert(await fs.realpath(directory) === directory, 'CANONICAL_DIRECTORY_REQUIRED');
  return info;
}

/** Packaging only, after npm ci in a fresh, private release candidate.
 * Retains the existing repository/sibling layout and one Core dependency set.
 * Never replaces an existing directory or a different/absolute/dangling link.
 * Does not install packages, configure credentials, start a host or grant access.
 * npm ci is responsible for lockfile tarball integrity; a version comparison
 * here is not a claim that every installed package byte has been verified.
 */
export async function prepareCoreSiblingDependencies(repositoryDirectory) {
  assert(path.isAbsolute(repositoryDirectory), 'ABSOLUTE_CANDIDATE_DIRECTORY_REQUIRED');
  const repository = path.resolve(repositoryDirectory);
  const core = path.join(repository, 'crays-platform');
  const modules = path.join(core, 'node_modules');
  const jose = path.join(modules, 'jose');
  const rootBefore = await ownDirectory(repository);
  const coreBefore = await ownDirectory(core);
  const modulesBefore = await ownDirectory(modules);
  await ownDirectory(jose);
  const [manifest, lock, installed] = await Promise.all([
    readPackageJSON(path.join(core, 'package.json')),
    readPackageJSON(path.join(core, 'package-lock.json')),
    readPackageJSON(path.join(jose, 'package.json')),
  ]);
  const pin = lock.packages?.['node_modules/jose'];
  assert(manifest.name === 'crays-platform' && manifest.dependencies?.jose &&
    manifest.dependencies.jose === lock.packages?.['']?.dependencies?.jose, 'OWN_CORE_LOCK_REQUIRED');
  assert(installed.name === 'jose' && installed.version === pin?.version &&
    typeof pin.integrity === 'string' && /^sha512-[A-Za-z0-9+/]+=*$/.test(pin.integrity), 'LOCK_PINNED_JOSE_REQUIRED');
  const entry = await fs.realpath(createRequire(path.join(core, 'package.json')).resolve('jose'));
  assert(entry.startsWith(jose + path.sep), 'OWN_CORE_JOSE_ENTRY_REQUIRED');

  const link = path.join(repository, 'node_modules');
  const relativeTarget = 'crays-platform/node_modules';
  let created = false;
  try {
    await fs.lstat(link);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try { await fs.symlink(relativeTarget, link, 'dir'); created = true; }
    catch (race) { if (race.code !== 'EEXIST') throw race; }
  }
  const info = await fs.lstat(link);
  assert(info.isSymbolicLink() && info.uid === process.getuid() &&
    await fs.readlink(link) === relativeTarget && await fs.realpath(link) === modules, 'EXACT_RELATIVE_CORE_DEPENDENCY_LINK_REQUIRED');
  for (const [directory, before] of [[repository, rootBefore], [core, coreBefore], [modules, modulesBefore]]) {
    const after = await ownDirectory(directory);
    assert(after.dev === before.dev && after.ino === before.ino, 'CANDIDATE_DIRECTORY_REBOUND');
  }
  return Object.freeze({
    schema: 'crays.core.relative-sibling-dependencies.v1',
    state: created ? 'CREATED' : 'ALREADY_PREPARED',
    target: relativeTarget,
    joseVersion: installed.version,
    lockIntegrity: pin.integrity,
    packageIntegrityVerification: 'npm ci required separately; no complete installed-byte integrity claim',
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  assert(process.argv.length === 2, 'No path override or overwrite option is supported.');
  const repository = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
  console.log(JSON.stringify(await prepareCoreSiblingDependencies(repository), null, 2));
}
