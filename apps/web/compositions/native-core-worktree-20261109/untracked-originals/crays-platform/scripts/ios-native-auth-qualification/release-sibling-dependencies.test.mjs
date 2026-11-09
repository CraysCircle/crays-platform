import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareCoreSiblingDependencies } from '../prepare-core-sibling-dependencies.mjs';

const core = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
async function fixture(run) {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'crays-core-release-layout-'));
  const root = path.join(parent, 'candidate');
  const app = path.join(root, 'crays-platform');
  await fs.mkdir(path.join(app, 'node_modules'), { recursive: true, mode: 0o700 });
  await fs.copyFile(path.join(core, 'package.json'), path.join(app, 'package.json'));
  await fs.copyFile(path.join(core, 'package-lock.json'), path.join(app, 'package-lock.json'));
  await fs.cp(path.join(core, 'node_modules/jose'), path.join(app, 'node_modules/jose'), { recursive: true });
  try { await run({ parent, root, app, link: path.join(root, 'node_modules') }); }
  finally { await fs.rm(parent, { recursive: true, force: true }); }
}

test('original sibling OIDC module loads with the same installed jose after portable preparation and relocation', async () => {
  await fixture(async ({ parent, root }) => {
    const verifier = path.join(root, 'infra/openclaw/connections/personal-account/oidc-verifier.mjs');
    await fs.mkdir(path.dirname(verifier), { recursive: true });
    await fs.copyFile(path.join(core, '../infra/openclaw/connections/personal-account/oidc-verifier.mjs'), verifier);
    const invoke = file => spawnSync(process.execPath, ['--input-type=module', '-e',
      `const m=await import(${JSON.stringify(pathToFileURL(file).href)});if(typeof m.createOidcVerifier!=='function'||typeof m.createFixedJwksFetcher!=='function')process.exit(9);`],
    { encoding: 'utf8', env: { PATH: path.dirname(process.execPath) + ':/usr/bin:/bin', HOME: parent, NODE_ENV: 'production' } });
    const absent = invoke(verifier);
    assert.notEqual(absent.status, 0);
    assert.match(absent.stderr, /ERR_MODULE_NOT_FOUND/);
    assert.match(absent.stderr, /jose/);
    assert.equal((await prepareCoreSiblingDependencies(root)).state, 'CREATED');
    assert.equal((await prepareCoreSiblingDependencies(root)).state, 'ALREADY_PREPARED');
    assert.equal(await fs.readlink(path.join(root, 'node_modules')), 'crays-platform/node_modules');
    assert.equal(invoke(verifier).status, 0);
    const relocated = path.join(parent, 'relocated');
    await fs.rename(root, relocated);
    assert.equal(invoke(path.join(relocated, 'infra/openclaw/connections/personal-account/oidc-verifier.mjs')).status, 0);
  });
});

for (const kind of ['absolute-own', 'different-relative', 'dangling', 'directory']) {
  test(`preserves and refuses ${kind} existing root dependency entry`, async () => {
    await fixture(async ({ root, app, link }) => {
      if (kind === 'directory') {
        await fs.mkdir(link);
        await fs.writeFile(path.join(link, 'keep'), 'preserve');
      } else {
        const target = kind === 'absolute-own' ? path.join(app, 'node_modules') : kind === 'dangling' ? 'absent' : 'crays-platform';
        await fs.symlink(target, link);
      }
      const before = await fs.lstat(link);
      const target = before.isSymbolicLink() ? await fs.readlink(link) : null;
      await assert.rejects(prepareCoreSiblingDependencies(root), /EXACT_RELATIVE_CORE_DEPENDENCY_LINK_REQUIRED/);
      const after = await fs.lstat(link);
      assert.equal(after.ino, before.ino);
      if (target !== null) assert.equal(await fs.readlink(link), target);
      else assert.equal(await fs.readFile(path.join(link, 'keep'), 'utf8'), 'preserve');
    });
  });
}

test('mismatched installed jose is rejected before root link creation', async () => {
  await fixture(async ({ root, app, link }) => {
    const file = path.join(app, 'node_modules/jose/package.json');
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    value.version = '0.0.0';
    await fs.writeFile(file, JSON.stringify(value));
    await assert.rejects(prepareCoreSiblingDependencies(root), /LOCK_PINNED_JOSE_REQUIRED/);
    await assert.rejects(fs.lstat(link), { code: 'ENOENT' });
  });
});

test('a different Core/lock declaration is rejected before root link creation', async () => {
  await fixture(async ({ root, app, link }) => {
    const file = path.join(app, 'package.json');
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    value.dependencies.jose = '0.0.0';
    await fs.writeFile(file, JSON.stringify(value));
    await assert.rejects(prepareCoreSiblingDependencies(root), /OWN_CORE_LOCK_REQUIRED/);
    await assert.rejects(fs.lstat(link), { code: 'ENOENT' });
  });
});

test('a symlinked candidate root cannot redirect preparation into another tree', async () => {
  await fixture(async ({ parent, root, link }) => {
    const redirected = path.join(parent, 'redirected');
    await fs.symlink(root, redirected);
    await assert.rejects(prepareCoreSiblingDependencies(redirected), /OWN_REGULAR_DIRECTORY_REQUIRED/);
    await assert.rejects(fs.lstat(link), { code: 'ENOENT' });
  });
});
