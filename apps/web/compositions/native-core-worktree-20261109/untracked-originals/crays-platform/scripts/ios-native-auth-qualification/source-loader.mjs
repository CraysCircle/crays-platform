import { registerHooks, stripTypeScriptTypes, createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const prefix = pathToFileURL(root + sep).href;
const repository = pathToFileURL(resolve(root, 'src/db/core-identity-repository.ts')).href;
const nativeIdentityLookup = pathToFileURL(resolve(root, 'src/lib/native-core-identity-lookup.ts')).href;
const emailRegistration = pathToFileURL(resolve(root, 'src/db/native-email-registration.mjs')).href;
const emailVerification = pathToFileURL(resolve(root, 'src/db/account-email-verification.ts')).href;
const auth0 = pathToFileURL(resolve(root, 'src/lib/auth0.ts')).href;
const pins = new Map();
const serverOnly = pathToFileURL(createRequire(import.meta.url).resolve('next/dist/compiled/server-only/empty.js')).href;
registerHooks({
 resolve(specifier, context, next) {
  // Same original alias as the actual Next server compiler.
  if (specifier === 'server-only') return {url:serverOnly,shortCircuit:true};
  if (context.parentURL?.startsWith(prefix)) {
   let target;
   if (specifier.startsWith('@/')) target = resolve(root, 'src', specifier.slice(2));
   else if (specifier.startsWith('.')) target = fileURLToPath(new URL(specifier, context.parentURL));
   if (target) {
    if (!extname(target)) target += '.ts';
    if (!target.startsWith(root + sep) || !existsSync(target)) throw new Error('UNQUALIFIED_SOURCE_IMPORT');
    return { url: pathToFileURL(target).href, shortCircuit: true };
   }
  }
  return next(specifier, context);
 },
 load(url, context, next) {
  // Admission/DAL tests control the Core lookup port, exactly as their legacy
  // repository port. They do NOT qualify the productive original RPC adapter.
  // Separate original-lookup tests enable its real source and reject fallback.
  if (url === nativeIdentityLookup && process.env.CRAYS_NATIVE_QUALIFY_REAL_CORE_LOOKUP !== '1') return {
   format: 'module', shortCircuit: true, source: `
    export const lookupNativeIdentityThroughOriginalCore = (...args) => globalThis[Symbol.for('crays.native.fixture.lookup')](...args);
   `,
  };
  if (url === repository) return { format: 'module', shortCircuit: true, source: `
   const deny = () => { throw new Error('DATABASE_ACCESS_NOT_ADMITTED'); };
   export const createAuditEvent = deny, getIdentityBundleByAccountId = deny,
    getIdentityBundleByNostrPubkeyHex = deny, markNostrSignerProofVerified = deny;
   export const getIdentityBundleByProviderSubject = (...args) => globalThis[Symbol.for('crays.native.fixture.lookup')](...args);
  ` };
  if (url === emailRegistration) return { format: 'module', shortCircuit: true, source: `export const createNativeEmailRegistrationService = () => { throw new Error('DOMAIN_WRITE_NOT_ADMITTED_IN_PORT_TEST'); };` };
  if (url === emailVerification) return { format: 'module', shortCircuit: true, source: `export const getCurrentAccountEmailVerification = (...args) => globalThis[Symbol.for('crays.native.fixture.emailProofLookup')](...args); export const getCurrentAccountContactRevision = (...args) => globalThis[Symbol.for('crays.native.fixture.contactRevisionLookup')](...args);` };
  if (url === auth0) return { format: 'module', shortCircuit: true, source: `
   export const auth0 = { getSession: async () => { globalThis[Symbol.for('crays.native.fixture.browserCalls')]++; return null; } };
  ` };
  if (url.startsWith(prefix) && url.endsWith('.ts')) {
   const bytes = readFileSync(fileURLToPath(url)); pins.set(url, createHash('sha256').update(bytes).digest('hex'));
   return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(bytes.toString(), { mode: 'strip' }) };
  }
  return next(url, context);
 }
});
export function sourcePins() {
 for (const [url, hash] of pins) if (createHash('sha256').update(readFileSync(fileURLToPath(url))).digest('hex') !== hash) throw new Error('SOURCE_CHANGED_DURING_TEST');
 return Object.fromEntries(pins);
}
