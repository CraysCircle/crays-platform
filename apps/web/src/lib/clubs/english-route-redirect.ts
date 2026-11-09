import { permanentRedirect } from "next/navigation";

export function redirectToEnglishRoute(
  route: string,
  query: Readonly<Record<string, string | string[] | undefined>>,
): never {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((entry) => search.append(key, entry));
    else if (value !== undefined) search.append(key, value);
  }
  permanentRedirect(`/en/${route.replace(/^\/+/, "")}${search.size ? `?${search.toString()}` : ""}`);
}
