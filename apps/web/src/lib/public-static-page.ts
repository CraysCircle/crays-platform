import { readFile } from "node:fs/promises";
import path from "node:path";

const publicRoot = path.join(process.cwd(), "public");

export async function readPublicStaticPage(fileName: "home.html" | "franchise.html") {
  const html = await readFile(path.join(publicRoot, "static-pages", fileName), "utf8");

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
