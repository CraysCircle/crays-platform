import type {createProductionPublicAmbassadorRepository} from "./public-ambassador-production-repository";
type Repository = ReturnType<typeof createProductionPublicAmbassadorRepository>;
const headers = {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"};
const canonicalOrigins = ["https://www.craysclub.com", "https://craysclub.com"];
/** Any additional origin must come from the release owner's verified exact runtime/deployment manifest. */
export function createProductionPublicAmbassadorPortraitHandler(repository: Repository, verifiedReleaseOrigin?: string) {
  const origins = new Set(canonicalOrigins);
  if (verifiedReleaseOrigin) {
    const parsed = new URL(verifiedReleaseOrigin);
    const ownLoopback = ["http://127.0.0.1:18895", "http://localhost:18895", "http://127.0.0.1:18790", "http://localhost:18790", "http://127.0.0.1:18925", "http://localhost:18925", "http://127.0.0.1:18926", "http://localhost:18926"].includes(parsed.origin);
    if (parsed.origin !== verifiedReleaseOrigin || parsed.username || parsed.password ||
        (!ownLoopback && parsed.protocol !== "https:")) throw new Error("UNVERIFIED_PUBLIC_RELEASE_ORIGIN");
    origins.add(verifiedReleaseOrigin);
  }
  return async function(request: Request): Promise<Response> {
    const absent = (status: number) => new Response(null,{status,headers});
    if (request.method !== "GET") return new Response(null,{status: 405,headers: {...headers,Allow: "GET"}});
    const url = new URL(request.url);
    const localTransport = verifiedReleaseOrigin !== undefined &&
      ["http://127.0.0.1:18790", "http://localhost:18790"].includes(verifiedReleaseOrigin) &&
      ["http://127.0.0.1:18890", "http://localhost:18890"].includes(url.origin) &&
      ["127.0.0.1:18790", "localhost:18790"].includes(request.headers.get("host") ?? "");
    if (!origins.has(url.origin) && !localTransport) return absent(421);
    const match = /^\/api\/crays\/clubs\/public\/ambassadors\/([a-z0-9]+(?:-[a-z0-9]+)*)\/portrait$/.exec(url.pathname);
    if (!match || match[1].length > 120) return absent(404);
    if ([...url.searchParams.keys()].some(k => k !== "sha" && k !== "w") || url.searchParams.getAll("sha").length !== 1) return absent(400);
    const sha = url.searchParams.get("sha")!;
    if (!/^[a-f0-9]{64}$/.test(sha)) return absent(400);
    const widths = new Set([320,480,640,960]);
    const widthValues = url.searchParams.getAll("w");
    if (widthValues.length > 1 || (widthValues.length === 1 && !widths.has(Number(widthValues[0])))) return absent(400);
    const width = widthValues.length === 1 ? Number(widthValues[0]) : null;
    try {
      const original = await repository.portrait(match[1],sha);
      if (!original) return absent(404);
      // Publication, role, original hash and bytes are verified above on EVERY
      // request, including conditional requests. Original no-width URL stays exact.
      if (width === null) return new Response(new Uint8Array(original.bytes),{headers: {...headers,"Content-Type": original.contentType}});
      const {default: sharp} = await import("sharp");
      const bytes = await sharp(original.bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality:84,effort:4}).toBuffer();
      const etag = `"${sha}-w${width}-webp84-v1"`;
      const variantHeaders = {"Cache-Control":"public, no-cache, must-revalidate","X-Content-Type-Options":"nosniff","Content-Type":"image/webp",ETag:etag};
      if (request.headers.get("if-none-match") === etag) return new Response(null,{status:304,headers:variantHeaders});
      return new Response(new Uint8Array(bytes),{headers:variantHeaders});
    } catch {return absent(503);}
  };
}
