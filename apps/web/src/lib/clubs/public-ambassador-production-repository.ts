import "server-only";
import {createHash} from "node:crypto";
import {z} from "zod";
import {admittedPublicSiteOrigin, publicAmbassadorPath} from "./public-ambassador-saas-projection";

const admittedSlug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const sourceUrl = z.url().refine(value => {
  const url = new URL(value);
  return url.origin === "https://www.craysclub.com" && !url.username && !url.password && !url.search && !url.hash &&
    url.pathname.startsWith("/__crays-clubs/people/");
});
const profileSchema = z.object({
  slug: admittedSlug,name: z.string().trim().min(1).max(180),version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  role: z.enum(["founder", "cofounder", "ambassador"]),affiliation: z.string().trim().min(1).max(180),
  linkedInUrl: z.url().refine(value => { const u = new URL(value); return u.origin === "https://www.linkedin.com" && !u.username && !u.password; }).nullable(),
  canonicalPath: z.string(),canonicalUrl: z.url(),
  media: z.object({url: sourceUrl,sha256: hash,bytes: z.number().int().positive().max(50*1024*1024),
    width: z.number().int().positive().max(20000),height: z.number().int().positive().max(20000),
    contentType: z.enum(["image/png", "image/jpeg"]),
    focalPoint: z.object({x: z.number().min(0).max(1),y: z.number().min(0).max(1)}).strict(),alt: z.string(),
  }).strict(),
  socialImage: z.object({url: sourceUrl,width: z.number().int().positive(),height: z.number().int().positive(),alt: z.string()}).strict(),
}).strict().refine(p => p.canonicalPath === `/en/ambassadors/${p.slug}` &&
  p.canonicalUrl === `https://www.craysclub.com${p.canonicalPath}` && p.media.alt === p.name &&
  p.socialImage.url === p.media.url && p.socialImage.width === p.media.width && p.socialImage.height === p.media.height &&
  p.socialImage.alt === `${p.name} | CRAYS`, "Invalid admitted original profile");
const snapshotSchema = z.object({schema: z.literal("crays.clubs.production-public-ambassadors.v1"),profiles: z.array(profileSchema).max(200)}).strict();
type RestrictedRpc = {query(sql: string,values: readonly unknown[]): Promise<{rows: unknown[]}>};

export function createProductionPublicAmbassadorRepository(rpc: RestrictedRpc, configuredOrigin: string) {
  const origin = admittedPublicSiteOrigin(configuredOrigin);
  function checkedSnapshot(raw: unknown) {
    const records = snapshotSchema.parse(raw).profiles;
    if (new Set(records.map(p => p.slug)).size !== records.length) throw new Error("INVALID_PUBLIC_AMBASSADOR_SOURCE");
    return records;
  }
  async function snapshot() {
    const result = await rpc.query("SELECT crays_core_rpc.club_public_ambassadors_prod_v1() data",[]);
    if (result.rows.length !== 1) throw new Error("PUBLIC_AMBASSADOR_SOURCE_UNAVAILABLE");
    const row = result.rows[0];
    if (!row || typeof row !== "object" || !("data" in row)) throw new Error("PUBLIC_AMBASSADOR_SOURCE_UNAVAILABLE");
    return checkedSnapshot(row.data);
  }
  function project(p: z.infer<typeof profileSchema>,locale: string) {
    const canonicalPath = publicAmbassadorPath(locale,p.slug);
    const mediaUrl = `/api/crays/clubs/public/ambassadors/${p.slug}/portrait?sha=${p.media.sha256}`;
    return {...p,canonicalPath,canonicalUrl: new URL(canonicalPath,origin).href,
      media: {...p.media,url: mediaUrl},socialImage: {...p.socialImage,url: new URL(mediaUrl,origin).href}};
  }
  return {
    async list(locale: string) {publicAmbassadorPath(locale,"validation"); return (await snapshot()).map(p => project(p,locale));},
    async find(locale: string,slug: string) {
      publicAmbassadorPath(locale,slug);
      const p = (await snapshot()).find(p => p.slug === slug);
      return p ? project(p,locale) : null;
    },
    async portrait(slug: string,sha256: string) {
      const parsedSlug = admittedSlug.safeParse(slug);
      const parsedHash = hash.safeParse(sha256);
      if (!parsedSlug.success || !parsedHash.success) return null;
      // Only the currently admitted SaaS publication owns this portrait URL.
      // Same admitted functions and current statement snapshot, one restricted
      // read instead of two round trips. Every original metadata/hash check stays.
      const result = await rpc.query("SELECT crays_core_rpc.club_public_ambassadors_prod_v1() data, crays_core_rpc.club_public_ambassador_portrait_prod_v1($1::text,$2::text) portrait_data",[slug,sha256]);
      if (result.rows.length !== 1) throw new Error("PUBLIC_AMBASSADOR_SOURCE_UNAVAILABLE");
      const row = result.rows[0];
      if (!row || typeof row !== "object" || !("data" in row) || !("portrait_data" in row)) throw new Error("PUBLIC_AMBASSADOR_SOURCE_UNAVAILABLE");
      const current = checkedSnapshot(row.data).find(p => p.slug === slug && p.media.sha256 === sha256);
      if (!current || row.portrait_data === null) return null;
      const meta = z.object({slug: z.literal(slug),version: z.literal(current.version),sha256: z.literal(sha256),
        byteSize: z.literal(current.media.bytes),width: z.literal(current.media.width),
        height: z.literal(current.media.height),contentType: z.literal(current.media.contentType),
        bytesBase64: z.string().min(1).max(70*1024*1024),}).strict().parse(row.portrait_data);
      const bytes = Buffer.from(meta.bytesBase64,"base64");
      if (bytes.length !== meta.byteSize || createHash("sha256").update(bytes).digest("hex") !== sha256)
        throw new Error("ORIGINAL_PORTRAIT_MISMATCH");
      return {bytes,sha256,contentType: meta.contentType,width: meta.width,height: meta.height};
    },
  };
}
