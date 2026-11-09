// Route exports are limited to the Next.js contract; unchanged handlers remain in their own module.
export { GET } from "./route-handlers";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
