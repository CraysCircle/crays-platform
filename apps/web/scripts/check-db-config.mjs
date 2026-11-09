import { loadLocalEnv, getRedactedDatabaseTarget } from "./env-loader.mjs";

loadLocalEnv();

const target = getRedactedDatabaseTarget(process.env.CRAYS_DATABASE_URL);

const state = {
  configured: Boolean(process.env.CRAYS_DATABASE_URL),
  target,
  poolMax: process.env.CRAYS_DATABASE_POOL_MAX || "5",
  ssl: process.env.CRAYS_DATABASE_SSL || "auto",
  rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED || "true",
  nextStep: process.env.CRAYS_DATABASE_URL
    ? "Ready for explicit dry-run/migration command."
    : "Set CRAYS_DATABASE_URL in .env.local before running migrations.",
};

console.log(JSON.stringify(state, null, 2));
