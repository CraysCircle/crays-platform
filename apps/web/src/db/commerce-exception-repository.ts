import "server-only";

import {getCorePgPool} from "@/db/client";
import {
  acknowledgeCommerceException,
  configureCommerceExceptionCoreScope,
  escalateDueCommerceExceptions,
  listCommerceExceptionAttention,
  prepareCommerceExceptionAttentionInput,
  prepareCommerceExceptionPersistenceInput,
  persistCommerceException,
  type CommerceExceptionDb,
  type CommerceExceptionPool,
} from "@/lib/member-commerce/commerce-exception-repository";
import type {createCommerceException} from "@/lib/member-commerce/commerce-exception-queue-contract";

const pool = () => getCorePgPool() as unknown as CommerceExceptionPool;

async function scoped<T>(tenantId: string, work: (db: CommerceExceptionDb) => Promise<T>) {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await configureCommerceExceptionCoreScope(client, tenantId);
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function persistCoreCommerceException(input: Readonly<{
  exceptionId: string;
  tenantId: string;
  record: ReturnType<typeof createCommerceException>;
}>) {
  const snapshot = prepareCommerceExceptionPersistenceInput(input);
  return scoped(snapshot.tenantId, (db) => persistCommerceException(db, snapshot));
}

export function listCoreCommerceExceptionAttention(input: Parameters<typeof listCommerceExceptionAttention>[1]) {
  const snapshot = prepareCommerceExceptionAttentionInput(input);
  return scoped(snapshot.tenantId, (db) => listCommerceExceptionAttention(db, snapshot));
}

export function acknowledgeCoreCommerceException(input: Parameters<typeof acknowledgeCommerceException>[1]) {
  return acknowledgeCommerceException(pool(), input);
}

export function escalateDueCoreCommerceExceptions(input: Parameters<typeof escalateDueCommerceExceptions>[1]) {
  return escalateDueCommerceExceptions(pool(), input);
}
