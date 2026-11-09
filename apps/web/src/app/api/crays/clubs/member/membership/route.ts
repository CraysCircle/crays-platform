// Route exports are limited to the Next.js contract; unchanged handlers remain in their own module.
export { GET, POST } from "./route-handlers";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
