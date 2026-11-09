import {
  coreIdentityIndexes,
  coreIdentityRlsRules,
  coreIdentityTables,
  getCoreIdentityPersistenceState,
} from "@/lib/core-identity-persistence";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    state: getCoreIdentityPersistenceState(),
    tables: coreIdentityTables,
    indexes: coreIdentityIndexes,
    rls: coreIdentityRlsRules,
    liveDatabaseConnected: false,
    note: "This endpoint exposes the CRAYS core identity persistence contract. It does not execute a database migration.",
  });
}
