import "server-only";
import { checkPublicHospitalityMediaManifest, readPublicHospitalityMediaManifest } from "@/db/public-hospitality-media-repository";
import { readHospitalityPublicContent } from "@/db/clubs-hospitality-content-repository";
import { isHospitalityPropertyId, type HospitalityPropertyId, type HospitalityPublicContent } from "@/lib/member-commerce/clubs-hospitality-content-contract";
export const PUBLIC_HOSPITALITY_CONTENT_SCHEMA = "crays.hospitality.public-content-ui.v1" as const;
export type PublicHospitalityContentEnvelope = {
  schema: typeof PUBLIC_HOSPITALITY_CONTENT_SCHEMA;
  version: "1.0.0";
  propertyId: HospitalityPropertyId;
  status: "ready" | "content_unavailable";
  code: "HOSPITALITY_PUBLIC_CONTENT_READY" | "HOSPITALITY_PUBLIC_CONTENT_UNAVAILABLE";
  authority: "stored-approved-core-public-projection";
  nativeReadGranted: false;
  bookingGranted: false;
  content: HospitalityPublicContent | null;
};
export type PublicHospitalityContentPort = (propertyId: HospitalityPropertyId) => Promise<HospitalityPublicContent | null>;
export function createPublicHospitalityContentReader(read: PublicHospitalityContentPort, readMedia: (propertyId: HospitalityPropertyId) => Promise<unknown>) {
  return async (input: unknown): Promise<PublicHospitalityContentEnvelope> => {
    if (!input || typeof input !== "object" || Array.isArray(input)
      || Object.keys(input).length !== 1 || !("propertyId" in input)
      || !isHospitalityPropertyId(input.propertyId)) throw Error("HOSPITALITY_PUBLIC_INPUT_INVALID");
    const propertyId = input.propertyId;
    const base = { schema: PUBLIC_HOSPITALITY_CONTENT_SCHEMA, version: "1.0.0" as const,
      propertyId, authority: "stored-approved-core-public-projection" as const,
      nativeReadGranted: false as const, bookingGranted: false as const };
    try {
      // Existing repository verifies current published receipt, full payload SHA and exact approved allowlist.
      // Both independent public readers retain their own publication and runtime checks.
      // Await the complete pair before exposing anything; failures still close this envelope.
      const [content, media] = await Promise.all([read(propertyId), readMedia(propertyId)]);
      if (!content || content.propertyId !== propertyId || content.locale !== "en") {
        return { ...base, status: "content_unavailable", code: "HOSPITALITY_PUBLIC_CONTENT_UNAVAILABLE", content: null };
      }
      checkPublicHospitalityMediaManifest(content, media);
      return { ...base, status: "ready", code: "HOSPITALITY_PUBLIC_CONTENT_READY", content };
    } catch {
      // Internal SQL, storage details and credentials never become public errors.
      return { ...base, status: "content_unavailable", code: "HOSPITALITY_PUBLIC_CONTENT_UNAVAILABLE", content: null };
    }
  };
}
export const readPublicHospitalityContentEnvelope = createPublicHospitalityContentReader(readHospitalityPublicContent, readPublicHospitalityMediaManifest);
export const publicHospitalityContentResolvers = {
  Query: { clubPublicHospitalityContent: (_parent: unknown, args: { input: unknown }) => readPublicHospitalityContentEnvelope(args.input) },
};
