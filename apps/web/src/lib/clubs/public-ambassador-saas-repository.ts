import "server-only";
import { z } from "zod";
import {
  storedPublicAmbassadorSchema, projectPublicAmbassador,
  admittedPublicSiteOrigin, publicAmbassadorPath,
} from "./public-ambassador-saas-projection";

type RestrictedRpc = {
  query(sql: string, values: readonly unknown[]): Promise<{ rows: unknown[] }>;
};

const snapshotSchema = z.object({
  schema: z.literal("crays.clubs.saas-public-ambassadors.test.v1"),
  profiles: z.array(storedPublicAmbassadorSchema).max(200),
}).strict();

/** Anonymous read exposes only explicitly published fields, never private SaaS workspace data. */
export function createSaasPublicAmbassadorRepository(rpc: RestrictedRpc, configuredOrigin: string) {
  const origin = admittedPublicSiteOrigin(configuredOrigin);
  async function readSnapshot() {
    const result = await rpc.query(
      "SELECT crays_core_rpc.club_growth_public_ambassadors_test_v1() data", [],
    );
    if (result.rows.length !== 1) throw new Error("PUBLIC_AMBASSADOR_SOURCE_UNAVAILABLE");
    const row = result.rows[0];
    if (!row || typeof row !== "object" || !("data" in row) || row.data === null) {
      throw new Error("PUBLIC_AMBASSADOR_SOURCE_UNAVAILABLE");
    }
    const snapshot = snapshotSchema.parse(row.data);
    const ids = new Set(), slugs = new Set();
    for (const profile of snapshot.profiles) {
      if (ids.has(profile.ambassadorRecordId) || slugs.has(profile.slug) || profile.publicationState !== "published") {
        throw new Error("INVALID_PUBLIC_AMBASSADOR_SOURCE");
      }
      ids.add(profile.ambassadorRecordId); slugs.add(profile.slug);
    }
    return snapshot;
  }
  return {
    async list(locale: string) {
      publicAmbassadorPath(locale, "validation");
      const snapshot = await readSnapshot();
      return snapshot.profiles.map(profile => projectPublicAmbassador(profile, locale, origin)!);
    },
    async find(locale: string, requestedSlug: string) {
      publicAmbassadorPath(locale, requestedSlug);
      const snapshot = await readSnapshot();
      const record = snapshot.profiles.find(profile => profile.slug === requestedSlug);
      return record ? projectPublicAmbassador(record, locale, origin) : null;
    },
  };
}
