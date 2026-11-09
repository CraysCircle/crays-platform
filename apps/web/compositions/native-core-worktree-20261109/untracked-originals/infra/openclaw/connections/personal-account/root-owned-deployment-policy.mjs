/** Trusted server policy loader only. This is configuration, never a customer,
 * OAuth consent, schema admission, credential delivery or runtime grant. */
import { constants, openSync, closeSync, fstatSync, lstatSync, readSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const fail = () => { throw Error('DEPLOYMENT_NOT_CONFIGURED'); };
const exact = (value, required, optional = []) => value && Object.getPrototypeOf(value) === Object.prototype &&
  required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => [...required, ...optional].includes(key));
const text = (value, max = 2048) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
const strings = value => Array.isArray(value) && value.length <= 128 && value.every(item => text(item)) && new Set(value).size === value.length;
const ref = (value, prefix) => text(value, 208) && value.startsWith(prefix) && /^(keyref|appref):[A-Za-z0-9._/-]{1,200}$/.test(value);
const basename = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(value);
function referenceMap(value, prefix) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).length > 64) return false;
  return Object.entries(value).every(([key, filename]) => ref(key, prefix) && basename(filename));
}
function freeze(value) {
  if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value); }
  return value;
}
function validate(value) {
  if (!exact(value, ['appOrigin', 'custody', 'apps'], ['slack']) || !text(value.appOrigin)) fail();
  const origin = new URL(value.appOrigin);
  if (origin.protocol !== 'https:' || origin.origin !== value.appOrigin || origin.username || origin.password) fail();
  const custody = value.custody;
  if (!exact(custody, ['schema', 'service', 'directory', 'currentKeyRef', 'keys', 'appSecrets']) ||
      custody.schema !== 'crays.os-oauth-custody.v1' || typeof custody.service !== 'string' || !/^[A-Za-z0-9_.@:-]+\.service$/.test(custody.service) ||
      custody.directory !== '/run/credentials/' + custody.service || !referenceMap(custody.keys, 'keyref:') ||
      !referenceMap(custody.appSecrets, 'appref:') || !ref(custody.currentKeyRef, 'keyref:') || !Object.hasOwn(custody.keys, custody.currentKeyRef)) fail();
  const filenames = [...Object.values(custody.keys), ...Object.values(custody.appSecrets)];
  if (new Set(filenames).size !== filenames.length) fail();
  if (!value.apps || Object.getPrototypeOf(value.apps) !== Object.prototype || Object.keys(value.apps).some(key => !['google', 'microsoft', 'linkedin'].includes(key))) fail();
  for (const [provider, app] of Object.entries(value.apps)) {
    if (!exact(app, ['clientId', 'secretRef', 'redirectUri', 'approvedScopes']) || !text(app.clientId) || !strings(app.approvedScopes) ||
        !ref(app.secretRef, 'appref:') || !Object.hasOwn(custody.appSecrets, app.secretRef) ||
        app.redirectUri !== value.appOrigin + '/api/crays/personal-accounts/callback/' + provider) fail();
  }
  if (value.slack !== undefined) {
    const slack = value.slack;
    if (!exact(slack, ['appId', 'clientId', 'secretRef', 'stateSecretRef', 'redirectUri', 'approvedActions', 'approvedScopes', 'allowedWorkspaceIds', 'allowedEnterpriseIds', 'schemaUpgradeAdmitted']) ||
        !text(slack.appId) || !text(slack.clientId) || !ref(slack.secretRef, 'appref:') || !ref(slack.stateSecretRef, 'appref:') ||
        !Object.hasOwn(custody.appSecrets, slack.secretRef) || !Object.hasOwn(custody.appSecrets, slack.stateSecretRef) ||
        slack.redirectUri !== value.appOrigin + '/api/crays/personal-accounts/callback/slack' ||
        !strings(slack.approvedActions) || !strings(slack.approvedScopes) ||
        ![slack.allowedWorkspaceIds, slack.allowedEnterpriseIds].every(ids => ids === null || strings(ids)) || slack.schemaUpgradeAdmitted !== true) fail();
  }
  if (!Object.keys(value.apps).length && !value.slack) fail();
  return freeze(value);
}
const same = (a, b) => ['dev', 'ino', 'uid', 'gid', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key] === b[key]);
function secureStat(path, directory) {
  const stat = lstatSync(path, { bigint: true });
  if (stat.uid !== 0n || (stat.mode & 0o022n) !== 0n || (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1n)) fail();
  return stat;
}
/** Supply getPath only from the owning server's environment/bootstrap. Every
 * component must be root-owned and not group/world writable, with no symlinks.
 * No fallback to a previous policy: deletion, tamper or rotation revokes captured
 * object identities on the next host currentness check. */
export function createRootOwnedPersonalAccountPolicyLoader({ getPath } = {}) {
  if (typeof getPath !== 'function') fail();
  let cached;
  return function getDeploymentPolicy() {
    let fd, bytes;
    try {
      const path = getPath();
      if (path === undefined || path === null || path === '') { cached = undefined; return null; }
      if (!text(path, 4096) || !isAbsolute(path) || resolve(path) !== path || realpathSync(path) !== path) fail();
      const parents = [];
      for (let parent = dirname(path); ; parent = dirname(parent)) {
        parents.push([parent, secureStat(parent, true)]);
        if (parent === dirname(parent)) break;
        if (parents.length > 128) fail();
      }
      const before = secureStat(path, false);
      if (before.size < 2n || before.size > 65536n) fail();
      fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      if (!same(before, fstatSync(fd, { bigint: true }))) fail();
      bytes = Buffer.alloc(Number(before.size) + 1); let length = 0;
      while (length < bytes.length) { const count = readSync(fd, bytes, length, bytes.length - length, null); if (!count) break; length += count; }
      if (length !== Number(before.size) || !same(before, fstatSync(fd, { bigint: true })) || !same(before, secureStat(path, false))) fail();
      for (const [parent, stat] of parents) {
        const current = secureStat(parent, true);
        // Sibling creation must not revoke a policy; identity, ownership and
        // permission changes on this exact path still fail closed.
        if (!['dev', 'ino', 'uid', 'gid', 'mode'].every(key => stat[key] === current[key])) fail();
      }
      const fingerprint = createHash('sha256').update(bytes.subarray(0, length)).update(String(before.dev)).update(':').update(String(before.ino)).update(':').update(String(before.ctimeNs)).digest('hex');
      if (cached?.path === path && cached.fingerprint === fingerprint) return cached.value;
      const envelope = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)));
      if (!exact(envelope, ['schema', 'deployment']) || envelope.schema !== 'crays.personal-account-deployment.v1') fail();
      const value = validate(envelope.deployment);
      cached = { path, fingerprint, value }; return value;
    } catch { cached = undefined; return null; }
    finally { bytes?.fill(0); if (fd !== undefined) closeSync(fd); }
  };
}
