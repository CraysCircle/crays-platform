import {localPreviewId} from "./localPreviewId.ts";
import type { ProductWorld } from "./productModel.ts";
import { relaySources } from "./nostrSources.ts";
export type ProfileAffiliation = {
  id: string;
  name: string;
  kind: string;
  image?: string;
  venueId?: string;
  visible: boolean;
  shared: boolean;
};
// Profile disclosure is independent of source selection, membership and presence.
export function profileAffiliations(
  w: ProductWorld,
  personId: string,
  manage = false,
): ProfileAffiliation[] {
  if (!w.identity.signedIn) return [];
  const person = w.people.find((p) => p.id === personId);
  if (person?.blocked || person?.blockedByOther) return [];
  const own = personId === w.owner;
  const publishedSources = w.objects
    .filter(
      (o) =>
        o.kind === "profile-affiliation-visibility" &&
        o.owner === personId &&
        o.visible === true,
    )
    .flatMap((o) => {
      const venueId = String(o.sourceId).startsWith("space:")
        ? String(o.sourceId).slice(6)
        : undefined;
      const v = w.venues.find((v) => v.id === venueId);
      return v
        ? [{ id: String(o.sourceId), name: v.name, category: "Space", venueId }]
        : o.name && o.category
          ? [
              {
                id: String(o.sourceId),
                name: String(o.name),
                category: String(o.category),
                venueId: undefined,
              },
            ]
          : [];
    });
  const sources: {
    id: string;
    name: string;
    category: string;
    venueId?: string;
  }[] = own
    ? relaySources(w).filter((r) => !r.removed)
    : (
        person?.communityVenueIds ||
        (person?.venueId
          ? [person.venueId]
          : personId === "alex"
            ? ["harbor-house"]
            : [])
      ).flatMap((id) => {
        const v = w.venues.find((v) => v.id === id);
        return v
          ? [
              {
                id: `space:${id}`,
                name: v.name,
                category: "Space",
                venueId: id,
              },
            ]
          : [];
      });
  if (!own)
    for (const source of publishedSources)
      if (!sources.some((s) => s.id === source.id)) sources.push(source);
  const disclosed = own ? [] : person?.publicAffiliationIds || [];
  const ownSources = relaySources(w).filter((r) => !r.removed);
  return sources
    .map((r) => {
      const v = w.venues.find((v) => v.id === r.venueId);
      const choice = w.objects.find(
        (o) =>
          o.kind === "profile-affiliation-visibility" &&
          o.owner === personId &&
          o.sourceId === r.id,
      );
      const visible = choice
        ? choice.visible === true
        : disclosed.includes(r.id);
      const viewerHidden = w.objects.some(
        (o) =>
          o.kind === "profile-affiliation-visibility" &&
          o.owner === w.owner &&
          o.sourceId === r.id &&
          o.visible === false,
      );
      return {
        id: r.id,
        name: r.name,
        kind:
          r.category === "Space" ? "Venue community" : `${r.category} relay`,
        image: v?.image,
        venueId: r.venueId,
        visible,
        shared:
          !own &&
          !viewerHidden &&
          ownSources.some((s) => s.id === r.id) &&
          (!v || (v.operatorActive && v.membership === "active")),
      };
    })
    .filter((r) => (own && manage) || r.visible)
    .sort((a, b) => Number(b.shared) - Number(a.shared));
}
export function applyAffiliationVisibility(
  w: ProductWorld,
  op: string,
  data: Record<string, string>,
) {
  if (op !== "complete.profile.affiliation.visibility") return;
  if (!w.identity.signedIn)
    throw new Error("Sign in to manage your profile visibility.");
  if (data.personId && data.personId !== w.owner)
    throw new Error("Only the profile owner can change visibility.");
  if (!["Yes", "No"].includes(data.visible))
    throw new Error("Choose whether to show this affiliation.");
  if (
    !profileAffiliations(w, w.owner, true).some((r) => r.id === data.sourceId)
  )
    throw new Error("This source is no longer available.");
  let item = w.objects.find(
    (o) =>
      o.kind === "profile-affiliation-visibility" &&
      o.owner === w.owner &&
      o.sourceId === data.sourceId,
  );
  if (!item) {
    item = {
      id: localPreviewId(),
      owner: w.owner,
      kind: "profile-affiliation-visibility",
      sourceId: data.sourceId,
    };
    w.objects.push(item);
  }
  const source = relaySources(w).find((r) => r.id === data.sourceId)!;
  item.name = source.name;
  item.category = source.category;
  item.visible = data.visible === "Yes";
  return {
    objectId: item.id,
    message: item.visible
      ? "Shown on your profile."
      : "Hidden from your profile and shared connections.",
  };
}
