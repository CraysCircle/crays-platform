import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const loadedFiles = new Map<string, Record<string, string>>();

function parseEnvFile(path: string) {
  const cached = loadedFiles.get(path);
  if (cached) return cached;
  if (!existsSync(path)) {
    loadedFiles.set(path, {});
    return {};
  }

  const entries: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    entries[key] = value;
  }
  loadedFiles.set(path, entries);
  return entries;
}

function candidateEnvFiles() {
  const cwd = process.cwd();
  const parent = dirname(cwd);
  const grandParent = dirname(parent);
  return [
    join(cwd, ".env.local"),
    join(parent, ".env.local"),
    join(grandParent, ".env.local"),
    resolve(".env.local"),
  ];
}

export function privateEnvValue(key: string) {
  if (process.env[key]) return process.env[key];
  for (const file of candidateEnvFiles()) {
    const value = parseEnvFile(file)[key];
    if (value) return value;
  }
  return undefined;
}
