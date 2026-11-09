import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

export const CCLUB_PUBLIC_INQUIRY_SCHEMA = "crays.clubs.public-inquiry.v1" as const;
export const CCLUB_PUBLIC_INQUIRY_PRIVACY_NOTICE_VERSION =
  "cclub-public-inquiry-privacy-2026-08-29.v1" as const;
export const CCLUB_PUBLIC_INQUIRY_OPERATION_HEADER =
  "x-crays-inquiry-operation" as const;
export const CCLUB_PUBLIC_INQUIRY_RECONCILE_OPERATION = "reconcile" as const;

export const publicGolfMiceInquiryInputSchema = z
  .object({
    inquiryType: z.enum(["golf_tourism", "mice_event"]),
    contactName: z.string().trim().min(2).max(120),
    contactEmail: z.string().trim().toLowerCase().email().max(254),
    organizationName: z.string().trim().min(2).max(160).nullable().optional(),
    countryOrRegion: z.string().trim().min(2).max(120),
    preferredStartDate: z.string().date().nullable().optional(),
    preferredEndDate: z.string().date().nullable().optional(),
    participantCount: z.number().int().min(1).max(5000),
    message: z.string().trim().min(20).max(4000),
    privacyNoticeVersion: z.literal(CCLUB_PUBLIC_INQUIRY_PRIVACY_NOTICE_VERSION),
    privacyConsent: z.literal(true),
    contactConsent: z.literal(true),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.preferredStartDate &&
      value.preferredEndDate &&
      value.preferredStartDate > value.preferredEndDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["preferredEndDate"],
        message: "preferredEndDate must not precede preferredStartDate",
      });
    }
  })
  .transform((value) => ({
    ...value,
    organizationName: value.organizationName ?? null,
    preferredStartDate: value.preferredStartDate ?? null,
    preferredEndDate: value.preferredEndDate ?? null,
  }));

export type PublicGolfMiceInquiryInput = z.output<typeof publicGolfMiceInquiryInputSchema>;
export type PublicGolfMiceInquiryType = PublicGolfMiceInquiryInput["inquiryType"];
export type PublicInquiryDeliveryState =
  | "provider_not_bound"
  | "queued"
  | "delivered"
  | "reconciled";

export class PublicGolfMiceInquiryValidationError extends Error {
  constructor() {
    super("CCLUB_PUBLIC_INQUIRY_VALIDATION_ERROR");
    this.name = "PublicGolfMiceInquiryValidationError";
  }
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9:_.-]{15,199}$/;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashPublicInquiryEvidence(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function normalizePublicGolfMiceInquiryInput(value: unknown): PublicGolfMiceInquiryInput {
  const parsed = publicGolfMiceInquiryInputSchema.safeParse(value);
  if (!parsed.success) throw new PublicGolfMiceInquiryValidationError();
  return Object.freeze(parsed.data);
}

export function normalizePublicInquiryIdempotencyKey(value: string | null): string {
  const normalized = value?.trim() ?? "";
  if (!IDEMPOTENCY_KEY.test(normalized)) throw new PublicGolfMiceInquiryValidationError();
  return normalized;
}

export const publicGolfMiceInquiryConfirmationContract = Object.freeze({
  confirmationStatus: "received" as const,
  teamQueueStatus: "queued" as const,
  providerDeliveryState: "provider_not_bound" as const,
  providerDeliveryClaimed: false as const,
  reconciliation: Object.freeze({
    operationHeader: CCLUB_PUBLIC_INQUIRY_OPERATION_HEADER,
    operationValue: CCLUB_PUBLIC_INQUIRY_RECONCILE_OPERATION,
    sameIdempotencyKeyRequired: true as const,
    samePayloadRequired: true as const,
    readOnly: true as const,
  }),
});

export const publicGolfMiceInquiryConfig = Object.freeze({
  schemaVersion: CCLUB_PUBLIC_INQUIRY_SCHEMA,
  status: "source_ready" as const,
  destination: "CRAYS_TEAM" as const,
  inquiryTypes: Object.freeze([
    Object.freeze({ key: "golf_tourism" as const, label: "Golf tourism inquiry" }),
    Object.freeze({ key: "mice_event" as const, label: "MICE and event inquiry" }),
  ]),
  privacyNoticeVersion: CCLUB_PUBLIC_INQUIRY_PRIVACY_NOTICE_VERSION,
  privacyHref: "/en/privacy",
  dataProtectionHref: "/en/data-protection",
  providerDeliveryState: "provider_not_bound" as const,
  providerDeliveryClaimed: false as const,
  hotelContactPublished: false as const,
  qloTokenPublished: false as const,
  confirmationContract: publicGolfMiceInquiryConfirmationContract,
});
