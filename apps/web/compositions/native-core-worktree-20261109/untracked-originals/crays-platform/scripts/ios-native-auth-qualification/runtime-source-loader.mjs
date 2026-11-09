import { registerHooks, createRequire } from 'node:module';
import ts from 'typescript';
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const workspace = resolve(root, '..');
const prefix = pathToFileURL(workspace + sep).href;
const pins = new Map();
const serverOnly = pathToFileURL(createRequire(import.meta.url).resolve('next/dist/compiled/server-only/empty.js')).href;
registerHooks({
 resolve(specifier, context, next) {
  // Match the actual Next server compilation alias, not a domain/auth mock.
  if (specifier === 'server-only') return { url: serverOnly, shortCircuit: true };
  if (context.parentURL?.startsWith(prefix) && !context.parentURL.includes('/node_modules/')) {
   let target;
   if (specifier.startsWith('@/')) target = resolve(root, 'src', specifier.slice(2));
   else if (specifier.startsWith('.')) target = fileURLToPath(new URL(specifier, context.parentURL));
   if (target) {
    if (!extname(target)) target += '.ts';
    if (!target.startsWith(workspace + sep) || !existsSync(target)) throw new Error('UNQUALIFIED_RUNTIME_IMPORT: ' + specifier);
    return { url: pathToFileURL(target).href, shortCircuit: true };
   }
  }
  try { return next(specifier, context); }
  catch (error) {
   if (specifier.startsWith('next/') && !extname(specifier)) return next(specifier + '.js', context);
   throw error;
  }
 },
 load(url, context, next) {
  if (url === pathToFileURL(resolve(root,'src/db/core-identity-runtime-pool.ts')).href && process.env.CRAYS_NATIVE_CONTROLLED_ORIGINAL_RPC_SQL === 'true') {
   const fixture=resolve(root,'scripts/ios-native-auth-qualification/original-core-rpc-fixture.mjs');
   pins.set(url,createHash('sha256').update(readFileSync(fileURLToPath(url))).digest('hex'));
   pins.set(pathToFileURL(fixture).href,createHash('sha256').update(readFileSync(fixture)).digest('hex'));
   return {format:'module',shortCircuit:true,source:'export * from '+JSON.stringify(pathToFileURL(fixture).href)+';'};
  }
  if (url.startsWith(prefix) && !url.includes('/node_modules/') && (url.endsWith('.ts') || url.endsWith('.json'))) {
   if (url.endsWith('/src/db/client.ts')) {
    const db = new URL(process.env.CRAYS_DATABASE_URL);
    const socket = db.searchParams.get('host');
    if (db.hostname !== 'localhost' || db.pathname !== '/ios_native_qualification' ||
        !socket || socket !== process.env.CRAYS_NATIVE_SQL_FIXTURE_SOCKET || !socket.startsWith('/tmp/crays-ios-native-sql-') || !socket.endsWith('/socket') || lstatSync(resolve(socket, '..')).uid !== process.getuid() || (lstatSync(resolve(socket, '..')).mode & 0o077) !== 0) {
     throw new Error('ONLY_OWN_ISOLATED_CORE_DATABASE_ADMITTED');
    }
   }
   const bytes = readFileSync(fileURLToPath(url)); pins.set(url, createHash('sha256').update(bytes).digest('hex'));
   return { format: 'module', shortCircuit: true, source: url.endsWith('.json')
     ? 'export default JSON.parse(' + JSON.stringify(bytes.toString()) + ');'
     : ts.transpileModule(bytes.toString(), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false } }).outputText };
  }
  return next(url, context);
 }
});
export function runtimeSourcePins() {
 for (const [url, hash] of pins) if (createHash('sha256').update(readFileSync(fileURLToPath(url))).digest('hex') !== hash) throw new Error('RUNTIME_SOURCE_CHANGED_DURING_TEST');
 return Object.fromEntries(pins);
}
