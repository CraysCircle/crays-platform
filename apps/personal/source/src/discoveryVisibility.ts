import {localPresenceCurrent} from './localPresence.ts';
import { sharedPlaceIds, type Person, type ProductWorld } from "./productModel.ts";

// F35/F59 and the owner's per-source privacy correction. This projects what a
// viewer may discover/display; it never changes membership or contact authority.
export function affiliationDisclosure(
  w: ProductWorld,
  personId: string,
  sourceId: string,
): "shown" | "hidden" | "unknown" {
  const choice = w.objects.find(
    (o) => o.kind === "profile-affiliation-visibility" &&
      o.owner === personId && o.sourceId === sourceId,
  );
  if (choice) return choice.visible === true ? "shown" : "hidden";
  return w.people.find((p) => p.id === personId)?.publicAffiliationIds?.includes(sourceId)
    ? "shown" : "unknown";
}

export function discoverableSharedPlaceIds(
  w: ProductWorld,
  person: Person,
  options: { venueId?: string; local?: boolean; purpose?: string } = {},
): string[] {
  if (!w.identity.signedIn || person.id === w.owner || person.blocked || person.blockedByOther)
    return [];
  return sharedPlaceIds(w, person).filter((id) => {
    if (options.venueId && options.venueId !== id) return false;
    const sourceId = `space:${id}`;
    if (affiliationDisclosure(w, person.id, sourceId) === "hidden" ||
      affiliationDisclosure(w, w.owner, sourceId) === "hidden") return false;
    if (options.local) {
      const venue = w.venues.find((v) => v.id === id);
      return localPresenceCurrent(w,id) && person.venueId === id &&
        person.localPresence === true && person.localVisibility?.[options.purpose || "Socializing"] === true;
    }
    return affiliationDisclosure(w, person.id, sourceId) === "shown";
  });
}

export const canPresentDiscovery = (
  w: ProductWorld,
  person: Person,
  options: { venueId?: string; local?: boolean; purpose?: string } = {},
) => discoverableSharedPlaceIds(w, person, options).length > 0;

export const disclosedSharedPlaceNames = (w: ProductWorld, person: Person) =>
  discoverableSharedPlaceIds(w, person)
    .map((id) => w.venues.find((v) => v.id === id)?.name)
    .filter((name): name is string => Boolean(name));
