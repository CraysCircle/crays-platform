import { createHash } from "node:crypto";
import { z } from "zod";

export const publicAmbassadorLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const slug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const httpsUrl = z.url().refine(value => {
  let u: URL;
  try { u = new URL(value); } catch { return false; }
  return u.protocol === "https:" && !u.username && !u.password && !u.hash;
});

// SaaS-owned TEST media URL, bound by the server to a published original profile.
const portraitUrl = z.union([httpsUrl, z.string().regex(/^\/api\/crays\/clubs\/public\/ambassadors\/[a-z0-9]+(?:-[a-z0-9]+)*\/portrait\?sha=[a-f0-9]{64}$/)]);
/** Persisted by the SaaS upload service after inspecting the ORIGINAL bytes. */
export const originalAmbassadorPortraitSchema = z.object({
  assetId: z.string().min(1).max(256),
  personId: z.string().min(1).max(256),
  url: portraitUrl,
  sha256: sha,
  bytes: z.number().int().positive().max(50 * 1024 * 1024),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  contentType: z.enum(["image/png", "image/jpeg"]),
  focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict(),
}).strict();

/** A SaaS record, never a browser-supplied publication or recipient authority. */
export const storedPublicAmbassadorSchema = z.object({
  ambassadorRecordId: z.string().min(1).max(256),
  personId: z.string().min(1).max(256),
  version: z.number().int().positive(),
  name: z.string().trim().min(1).max(180),
  slug,
  publicationState: z.enum(["draft", "published", "withdrawn"]),
  role: z.enum(["founder", "cofounder", "ambassador"]),
  affiliation: z.string().trim().min(1).max(180),
  linkedInUrl: httpsUrl.nullable(),
  portrait: originalAmbassadorPortraitSchema,
}).strict().refine(v => v.personId === v.portrait.personId, "Portrait belongs to another person");

export type StoredPublicAmbassador = z.infer<typeof storedPublicAmbassadorSchema>;

export function admittedPublicSiteOrigin(configuredOrigin: string): string {
  const u = new URL(configuredOrigin);
  if (u.username || u.password || u.pathname !== "/" || u.search || u.hash ||
      !["https://www.craysclub.com", "http://127.0.0.1:18790", "http://localhost:18790"].includes(u.origin)) {
    throw new Error("UNADMITTED_PUBLIC_SITE_ORIGIN");
  }
  return u.origin;
}

export function publicAmbassadorPath(locale: string, storedSlug: string): string {
  if (!(publicAmbassadorLocales as readonly string[]).includes(locale)) throw new Error("INVALID_LOCALE");
  return `/${locale}/ambassadors/${slug.parse(storedSlug)}`;
}

/** Call ONLY when creating the SaaS record; persist once under a UNIQUE slug constraint.
 * occupied must be read in the same locked transaction as the INSERT. Renaming a
 * person does not call this function and does not change their acquisition URL.
 */
export function allocateAmbassadorSlug(name: string, originalRecordId: string, occupied: ReadonlySet<string>): string {
  const displayName = z.string().trim().min(1).max(180).parse(name);
  z.string().min(1).max(256).parse(originalRecordId);
  const base = displayName.normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/g, "") || "ambassador";
  if (!occupied.has(base)) return base;
  const suffix = createHash("sha256").update(originalRecordId, "utf8").digest("hex");
  for (const size of [8, 12, 16]) {
    const candidate = `${base}-${suffix.slice(0, size)}`;
    if (!occupied.has(candidate)) return candidate;
  }
  throw new Error("AMBASSADOR_SLUG_CONFLICT");
}

/** One projection feeds directory, profile, original media and social preview. */
export function projectPublicAmbassador(raw: unknown, locale: string, configuredOrigin: string) {
  const record = storedPublicAmbassadorSchema.parse(raw);
  if (record.publicationState !== "published") return null;
  const path = publicAmbassadorPath(locale, record.slug);
  const origin = admittedPublicSiteOrigin(configuredOrigin);
  const url = new URL(path, origin).href;
  const mediaUrl = new URL(record.portrait.url, origin).href;
  return {
    slug: record.slug,
    name: record.name,
    version: record.version,
    role: record.role,
    affiliation: record.affiliation,
    linkedInUrl: record.linkedInUrl,
    canonicalPath: path,
    canonicalUrl: url,
    media: {
      url: record.portrait.url,
      sha256: record.portrait.sha256,
      bytes: record.portrait.bytes,
      width: record.portrait.width,
      height: record.portrait.height,
      contentType: record.portrait.contentType,
      focalPoint: record.portrait.focalPoint,
      alt: record.name,
    },
    socialImage: {
      url: mediaUrl,
      width: record.portrait.width,
      height: record.portrait.height,
      alt: `${record.name} | CRAYS`,
    },
  };
}

/** Upload service verifies metadata against its decoder; it never resizes/re-encodes. */
export function verifyOriginalPortraitBytes(bytes: Uint8Array, inspected: {
  width: number; height: number; contentType: "image/png" | "image/jpeg";
}, stored: z.infer<typeof originalAmbassadorPortraitSchema>): void {
  const portrait = originalAmbassadorPortraitSchema.parse(stored);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== portrait.bytes || digest !== portrait.sha256 ||
      inspected.width !== portrait.width || inspected.height !== portrait.height ||
      inspected.contentType !== portrait.contentType) throw new Error("ORIGINAL_PORTRAIT_MISMATCH");
}
