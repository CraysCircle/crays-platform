import "server-only";
import {getProductionPublicPool} from "./clubs-production-public-pool";

import { getCoreIdentityRuntimeRpcPool } from "./core-identity-runtime-pool";
import {
  hospitalitySha256, isHospitalityPropertyId, projectHospitalityPublicContent, validateHospitalityContent,
  type HospitalityContent, type HospitalityPropertyId, type HospitalityPublicContent,
} from "@/lib/member-commerce/clubs-hospitality-content-contract";

export type HospitalityManagementAuthority = {
  accountId: string; tenantSessionId: string; organizationId: string;
  roleKey: "club-manager" | "crays-management" | "admin";
};
export type HospitalityContentRead = {
  contentVersionId: string; revision: number; payloadSha256: string;
  content: HospitalityContent; state: "draft";
};
export class HospitalityContentIntegrityError extends Error {
  constructor() { super("HOSPITALITY_CONTENT_INTEGRITY_FAILED"); this.name = "HospitalityContentIntegrityError"; }
}
function validIdentity(value: string) { return typeof value === "string" && value.trim().length > 0 && value.length <= 256; }
function verifiedPayload(payloadJson: unknown, expectedSha256: unknown, propertyId: HospitalityPropertyId) {
  if (typeof payloadJson !== "string" || typeof expectedSha256 !== "string"
    || hospitalitySha256(payloadJson) !== expectedSha256) throw new HospitalityContentIntegrityError();
  const content = validateHospitalityContent(JSON.parse(payloadJson));
  if (content.propertyId !== propertyId) throw new HospitalityContentIntegrityError();
  return content;
}
function rpcResult(response: { rows: unknown[] }): Record<string, unknown> | null {
  if (response.rows.length !== 1) throw new HospitalityContentIntegrityError();
  const row = response.rows[0];
  if (!row || typeof row !== "object" || !("result" in row)) throw new HospitalityContentIntegrityError();
  const result = row.result;
  if (result === null) return null;
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new HospitalityContentIntegrityError();
  return result as Record<string, unknown>;
}
/** Authenticated management read; the database RPC validates the live session and property scope. */
export async function readHospitalityManagementContent(
  authority: HospitalityManagementAuthority, propertyId: HospitalityPropertyId,
): Promise<HospitalityContentRead | null> {
  if (!isHospitalityPropertyId(propertyId) || ![authority.accountId, authority.tenantSessionId, authority.organizationId].every(validIdentity)
    || !["club-manager", "crays-management", "admin"].includes(authority.roleKey)) return null;
  const result = await getCoreIdentityRuntimeRpcPool().query(
    "select crays_core_rpc.hospitality_content_read_v1($1,$2,$3,$4,$5) result",
    [authority.accountId, authority.tenantSessionId, authority.organizationId, authority.roleKey, propertyId],
  );
  const row = rpcResult(result);
  if (!row) return null;
  if (row.propertyId !== propertyId || row.locale !== "en" || row.state !== "draft"
    || typeof row.contentVersionId !== "string" || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1) {
    throw new HospitalityContentIntegrityError();
  }
  return { contentVersionId: row.contentVersionId, revision: Number(row.revision),
    payloadSha256: String(row.payloadSha256), content: verifiedPayload(row.payloadJson, row.payloadSha256, propertyId), state: "draft" };
}
/** Only stored, separately approved publication receipts can produce public content. No seed fallback. */
export async function readHospitalityPublicContent(propertyId: HospitalityPropertyId, query: (sql: string, values: readonly unknown[]) => Promise<{rows: unknown[]}> = (sql, values) => getProductionPublicPool().query(sql, values)): Promise<HospitalityPublicContent | null> {
  if (!isHospitalityPropertyId(propertyId)) return null;
  const result = await query(
    "select crays_core_rpc.hospitality_public_content_prod_v1($1) result", [propertyId],
  );
  const row = rpcResult(result);
  if (!row) return null;
  if (row.propertyId !== propertyId || typeof row.contentVersionId !== "string"
    || typeof row.publicProjectionJson !== "string" || typeof row.projectionSha256 !== "string"
    || hospitalitySha256(row.publicProjectionJson) !== row.projectionSha256) throw new HospitalityContentIntegrityError();
  const content = verifiedPayload(row.payloadJson, row.payloadSha256, propertyId);
  const projection = projectHospitalityPublicContent(content, row.contentVersionId, String(row.payloadSha256));
  // Reconstruct from the admitted content, then require exact equality to the approved publication.
  // Provider receipts, research conflicts, rights and storage internals cannot escape through the BFF.
  if (JSON.stringify(projection) !== JSON.stringify(JSON.parse(row.publicProjectionJson))) throw new HospitalityContentIntegrityError();
  return projection;
}

/** Protected original download. The runtime RPC validates current identity and exact property. */
export async function downloadHospitalityOriginalMedia(authority: HospitalityManagementAuthority, propertyId: HospitalityPropertyId, assetId: string) {
  if (!isHospitalityPropertyId(propertyId) || !validIdentity(assetId)
    || ![authority.accountId, authority.tenantSessionId, authority.organizationId].every(validIdentity)
    || !["club-manager", "crays-management", "admin"].includes(authority.roleKey)) return null;
  const response = await getCoreIdentityRuntimeRpcPool().query(
    "select crays_core_rpc.hospitality_media_download_v1($1,$2,$3,$4,$5,$6) result",
    [authority.accountId,authority.tenantSessionId,authority.organizationId,authority.roleKey,propertyId,assetId],
  );
  const row = rpcResult(response);
  if (!row) return null;
  if (row.propertyId !== propertyId || row.assetId !== assetId || typeof row.bytesBase64 !== "string"
    || typeof row.sha256 !== "string" || !Number.isSafeInteger(row.byteSize) || Number(row.byteSize) <= 0
    || Number(row.byteSize) > 10485760 || !["image/jpeg", "image/png", "image/webp"].includes(String(row.mimeType))) {
    throw new HospitalityContentIntegrityError();
  }
  const bytes = Buffer.from(row.bytesBase64, "base64");
  if (bytes.length !== row.byteSize || hospitalitySha256(bytes) !== row.sha256) throw new HospitalityContentIntegrityError();
  return { assetId, propertyId, bytes, sha256: row.sha256, mimeType: String(row.mimeType), byteSize: bytes.length };
}
