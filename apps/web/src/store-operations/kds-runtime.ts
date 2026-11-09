import "server-only";
import type { PoolClient } from "pg";
import { getCorePgPool } from "@/db/client";
import type { KdsDatabase, KdsQuery } from "./kds";

function queryFromClient(client: PoolClient): KdsQuery {
  return async <Row>(text: string, values: readonly unknown[] = []) => {
    const result = await client.query(text, [...values]);
    return { rows: result.rows as Row[] };
  };
}

export function getKdsRuntimeDatabase(): KdsDatabase {
  return {
    query: async <Row>(text: string, values: readonly unknown[] = []) => {
      const result = await getCorePgPool().query(text, [...values]);
      return { rows: result.rows as Row[] };
    },
    transaction: async <T>(effect: (database: { query: KdsQuery }) => Promise<T>) => {
      const client = await getCorePgPool().connect();
      try {
        await client.query("begin");
        const result = await effect({ query: queryFromClient(client) });
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
