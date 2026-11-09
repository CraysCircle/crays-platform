import { createHash } from "node:crypto";
import type { CanonicalGymNode, GymReadDomainKey, GymReadRepositoryPort } from "../reads/gym-read-model";

type CacheEntry = { value: string; expiresAt: number; tags: string[] };
const memory = new Map<string, CacheEntry>();
const counters = new Map<string, { count: number; resetAt: number }>();
let redisPromise: Promise<import("ioredis").default | null> | null = null;

async function optionalRedis() {
  if (process.env.CRAYS_REDIS_ENABLED !== "true" || !process.env.CRAYS_REDIS_URL) return null;
  redisPromise ??= import("ioredis").then(async ({ default: Redis }) => {
    const client = new Redis(process.env.CRAYS_REDIS_URL!, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1, connectTimeout: 1_000 });
    client.on("error", () => undefined);
    try { await client.connect(); return client; } catch { client.disconnect(); return null; }
  });
  return redisPromise;
}

export function gymCacheKey(scope: GymReadRepositoryPort["scope"], domain: GymReadDomainKey) {
  const accountScope = scope.accountId ? createHash("sha256").update(scope.accountId).digest("hex").slice(0, 16) : "no-account";
  return `crays:gql:v1:tenant:${scope.tenantId}:role:${scope.role}:account:${accountScope}:domain:${domain}`;
}
export function gymCacheTag(tenantId: string, domain: GymReadDomainKey) { return `tenant:${tenantId}:domain:${domain}`; }

export class CachedGymReadRepository implements GymReadRepositoryPort {
  constructor(readonly source: GymReadRepositoryPort, readonly ttlMs = 15_000) {}
  get scope() { return this.source.scope; }
  queryCount() { return this.source.queryCount(); }
  async list(domain: GymReadDomainKey): Promise<CanonicalGymNode[]> {
    const key = gymCacheKey(this.scope, domain);
    const redis = await optionalRedis();
    if (redis) {
      const cached = await redis.get(key).catch(() => null);
      if (cached) return JSON.parse(cached) as CanonicalGymNode[];
    }
    const hit = memory.get(key);
    if (hit && hit.expiresAt > Date.now()) return JSON.parse(hit.value) as CanonicalGymNode[];
    const value = await this.source.list(domain);
    memory.set(key, { value: JSON.stringify(value), expiresAt: Date.now() + this.ttlMs, tags: [gymCacheTag(this.scope.tenantId, domain)] });
    if (redis) {
      const tagKey = `crays:gql:v1:tag:${gymCacheTag(this.scope.tenantId,domain)}`;
      await redis.multi().set(key,JSON.stringify(value),"PX",this.ttlMs).sadd(tagKey,key).pexpire(tagKey,this.ttlMs*2).exec().catch(()=>null);
    }
    return value;
  }
}

export async function invalidateGymDomainCache(tenantId: string, domain: GymReadDomainKey) {
  const tag = gymCacheTag(tenantId, domain);
  let removed = 0;
  for (const [key, entry] of memory) if (entry.tags.includes(tag)) { memory.delete(key); removed += 1; }
  const redis = await optionalRedis();
  if (redis) {
    const tagKey=`crays:gql:v1:tag:${tag}`; const keys=await redis.smembers(tagKey).catch(()=>[]);
    if(keys.length) await redis.del(...keys,tagKey).catch(()=>0); else await redis.del(tagKey).catch(()=>0);
    removed+=keys.length;
  }
  return removed;
}

export async function checkGraphQLRateLimit(input: { ip: string; deviceId?: string | null; tenantId: string; role: string; accountId: string | null; operation: string; target: string; limit?: number; windowMs?: number }) {
  const windowMs = input.windowMs ?? 60_000; const limit = input.limit ?? 120;
  const dimensions=[`ip:${input.ip}`,`device:${input.deviceId??"unknown"}`,`tenant:${input.tenantId}`,`tenant-role:${input.tenantId}:${input.role}`,`account:${input.accountId??"anonymous"}`,`operation:${input.tenantId}:${input.operation}`,`target:${input.tenantId}:${input.target}`];
  const redis=await optionalRedis();
  if(redis){let allowed=true;let remaining=limit;let retryAfterMs=0;for(const dimension of dimensions){const key=`crays:gql:v1:rate:${createHash("sha256").update(dimension).digest("hex")}`;const result=await redis.eval(`local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end;return {n,redis.call('PTTL',KEYS[1])}`,1,key,String(windowMs)).catch(()=>null) as [number,number]|null;if(!result)continue;allowed=allowed&&result[0]<=limit;remaining=Math.min(remaining,Math.max(0,limit-result[0]));retryAfterMs=Math.max(retryAfterMs,result[1]);}return {allowed,remaining,retryAfterMs,backend:"redis-distributed" as const};}
  const now=Date.now();let allowed=true;let remaining=limit;let retryAfterMs=0;
  for(const dimension of dimensions){const key=createHash("sha256").update(dimension).digest("hex");const current=counters.get(key);const next=!current||current.resetAt<=now?{count:1,resetAt:now+windowMs}:{count:current.count+1,resetAt:current.resetAt};counters.set(key,next);allowed=allowed&&next.count<=limit;remaining=Math.min(remaining,Math.max(0,limit-next.count));retryAfterMs=Math.max(retryAfterMs,next.resetAt-now);}
  return { allowed,remaining,retryAfterMs,backend:"local-safe-degraded" as const };
}

export function clearLocalGraphQLPerformanceState() { memory.clear(); counters.clear(); }
