import "server-only";
import { cache } from "react";
import type { ClubsLocale } from "../../clubs/public-site";
import type { PublicAmbassadorView } from "../../clubs/public-ambassador-view";
import { getPublicAmbassadorRepository } from "./public-ambassador-saas-runtime";

/** Request-local snapshot: SSR content and metadata share the same actual SaaS version.
 * No static registry fallback, cross-request cache, or private fields reach the browser. */
export const loadPublicAmbassadors = cache(async (locale: ClubsLocale): Promise<readonly PublicAmbassadorView[]> =>
 getPublicAmbassadorRepository().list(locale));

export async function findPublicAmbassador(locale: ClubsLocale, slug: string): Promise<PublicAmbassadorView | null> {
 if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
 return (await loadPublicAmbassadors(locale)).find(profile => profile.slug === slug) ?? null;
}
