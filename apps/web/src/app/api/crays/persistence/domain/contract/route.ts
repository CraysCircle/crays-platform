import {
  coreDomainIndexes,
  coreDomainRlsRules,
  coreDomainTables,
  getCoreDomainPersistenceState,
} from "@/lib/core-domain-persistence";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    state: getCoreDomainPersistenceState(),
    tables: coreDomainTables,
    indexes: coreDomainIndexes,
    rls: coreDomainRlsRules,
    liveDatabaseConnected: false,
    note: "This endpoint exposes the CRAYS core domain persistence contract. It does not execute a database migration or return live business data.",
  });
}
