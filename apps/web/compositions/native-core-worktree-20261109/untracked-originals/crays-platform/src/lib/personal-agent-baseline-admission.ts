import "server-only";
import { createHash } from "node:crypto";
import type { CraysRouteContext } from "@/lib/dal/server-trust";
import { getCorePgPool } from "@/db/client";
import { resolveOcaEnvironmentReadAuthority } from "@/db/oca-environment-read-authority-service";
import { readOcaEnvironmentRecordFamily } from "@/db/oca-environment-read-model-repository";
import { OCA_ENVIRONMENT_READ_OPERATIONS } from "@/graphql/oca-environment-documents";
import { getInternalGraphQLRateDimensions } from "@/graphql/performance/request-metadata";

type Ref = Readonly<{ id: string; version: number; digest: string }>;
export type PersonalBaselineHostRegistration = Readonly<{
  route: CraysRouteContext;
  /** Actual already-signed registered read request; never mint a workload ticket here. */
  request: Request;
  deployment: Ref;
  configurationPath: string;
}>;
const hex = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const refMatches = (id: unknown, version: unknown, sha: unknown, ref: Ref) => id === ref.id && version === ref.version && sha === ref.digest;

/** Reuse actual signed read authority and the canonical field-scoped/RLS repository.
 * Read permission itself is NOT a deployment grant. Require the already recorded ACTIVE,
 * reconciled deployment and its current admitted environment/cell/allowed command chain.
 * This function creates no admission/role/ticket, installs nothing and performs no SQL writes.
 */
export async function resolveExistingPersonalBaselineHost(input: PersonalBaselineHostRegistration) {
  const ref = input.deployment;
  if (!ref || typeof ref.id !== "string" || !ref.id.length || ref.id.length > 200 ||
      !Number.isSafeInteger(ref.version) || ref.version < 1 || !hex(ref.digest)) return null;
  const operation = OCA_ENVIRONMENT_READ_OPERATIONS.OcaEnvironmentReadinessWorkbench.hash;
  if (getInternalGraphQLRateDimensions(input.request).operation.replace(/^sha256:/, "") !== operation) return null;
  const client = await getCorePgPool().connect().catch(() => null);
  if (!client) return null;
  try {
    await client.query("begin isolation level repeatable read read only");
    const role = await client.query<{ rolsuper: boolean; rolbypassrls: boolean }>("select rolsuper,rolbypassrls from pg_roles where rolname=current_user");
    if (!role.rows[0] || role.rows[0].rolsuper || role.rows[0].rolbypassrls) throw Error("NON_BYPASS_CORE_AUTHORITY_REQUIRED");
    const scope = await resolveOcaEnvironmentReadAuthority(input.route, input.request, operation, client);
    if (scope.status !== "resolved") throw Error("CURRENT_SIGNED_READ_AUTHORITY_REQUIRED");
    const page = await readOcaEnvironmentRecordFamily(client, scope, "deployment", ref.id, 1);
    const d = page.records[0];
    if (page.status !== "available" || page.hasMore || !d ||
        !refMatches(d.deploymentId, d.deploymentVersion, d.deploymentSha256, ref) ||
        d.deploymentState !== "active" || d.authoritativeOutcome !== "active" ||
        d.technicalAckState !== "acknowledged" || d.reconciliationState !== "reconciled" ||
        !hex(d.configurationManifestSha256) || !d.environmentManifestId || !d.cellInstanceId || !d.environmentCommandId ||
        !d.runtimeBundleId || !Number.isSafeInteger(d.runtimeBundleVersion) || !hex(d.runtimeBundleSha256)) {
      throw Error("ACTUAL_RECONCILED_DEPLOYMENT_REQUIRED");
    }
    const environments = await readOcaEnvironmentRecordFamily(client, scope, "environment_manifest", d.environmentManifestId, 1);
    const cells = await readOcaEnvironmentRecordFamily(client, scope, "cell_instance", d.cellInstanceId, 1);
    const commands = await readOcaEnvironmentRecordFamily(client, scope, "environment_command", d.environmentCommandId, 1);
    if ([environments, cells, commands].some(x => x.status !== "available" || x.hasMore || x.records.length !== 1)) {
      throw Error("CURRENT_ADMISSION_PROJECTION_REQUIRED");
    }
    const e = environments.records[0], c = cells.records[0], command = commands.records[0];
    if (e.manifestState !== "admitted" || !["separate", "verified_separate"].includes(e.developmentBoundaryState ?? "") ||
        !Number.isFinite(Date.parse(e.validUntil ?? "")) || Date.parse(e.validUntil!) <= Date.now() ||
        e.environmentManifestId !== d.environmentManifestId || e.manifestVersion !== d.environmentManifestVersion || e.environmentManifestSha256 !== d.environmentManifestSha256 ||
        c.cellState !== "active" || c.cellInstanceId !== scope.cellInstanceId || c.cellInstanceSha256 !== scope.cellInstanceDigest ||
        d.scopeCellInstanceId !== scope.cellInstanceId || command.scopeCellInstanceId !== scope.cellInstanceId ||
        c.cellVersion !== d.cellInstanceVersion || c.cellInstanceSha256 !== d.cellInstanceSha256 ||
        c.environmentManifestId !== e.environmentManifestId || c.environmentManifestVersion !== e.manifestVersion || c.environmentManifestSha256 !== e.environmentManifestSha256 ||
        c.runtimeBundleId !== d.runtimeBundleId || c.runtimeBundleVersion !== d.runtimeBundleVersion || c.runtimeBundleSha256 !== d.runtimeBundleSha256 ||
        command.commandVersion !== d.environmentCommandVersion || command.commandSha256 !== d.environmentCommandSha256 ||
        command.commandKind !== "record_deployment" || command.targetFamily !== "deployment" || command.targetRecordId !== d.deploymentId ||
        command.decision !== "allowed" || command.technicalAckState !== "acknowledged" || command.authoritativeOutcome !== "active" || command.reconciliationState !== "reconciled" ||
        [d, c, command].some(x => x.tenantId !== scope.tenantId || x.operatorId !== scope.operatorId ||
          x.legalEntityId !== scope.legalEntityId || x.vertical !== scope.vertical || x.storeId !== scope.storeId || x.sellerId !== scope.sellerId) ||
        e.tenantId !== scope.tenantId || e.operatorId !== scope.operatorId || e.legalEntityId !== scope.legalEntityId || e.vertical !== scope.vertical ||
        e.scopeCellInstanceId !== null || (e.storeId !== null && e.storeId !== scope.storeId) || (e.sellerId !== null && e.sellerId !== scope.sellerId)) {
      throw Error("CURRENT_ADMITTED_HOST_CHAIN_REQUIRED");
    }
    const expiresAtMs = Math.min(Date.parse(scope.expiresAt), Date.parse(e.validUntil!));
    if (expiresAtMs <= Date.now()) throw Error("ADMISSION_EXPIRED");
    await client.query("commit");
    return Object.freeze({ configurationSha256: d.configurationManifestSha256, expiresAtMs,
      bindingSha256: digest([scope.tenantId, scope.cellInstanceId, scope.cellInstanceDigest, d, e, c, command]) });
  } catch {
    await client.query("rollback").catch(() => undefined);
    return null;
  } finally { client.release(); }
}
