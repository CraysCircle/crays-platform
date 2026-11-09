import type { ProductWorld, Post } from "./productModel.ts";
// A member's post is not an official venue announcement merely because it belongs to a Spot.
export function contentAuthorTarget(
  post: Pick<Post, "author" | "venueId">,
  owner: string,
) {
  if (post.author === owner) return { kind: "self" as const, id: owner };
  if (
    post.author.startsWith("venue:") &&
    post.venueId &&
    post.author === `venue:${post.venueId}`
  )
    return { kind: "space" as const, id: post.venueId };
  return { kind: "person" as const, id: post.author };
}

export function contentPublisher(
  w: ProductWorld,
  p: Pick<Post, "author" | "venueId">,
) {
  const venue =
    p.author === `venue:${p.venueId}`
      ? w.venues.find((v) => v.id === p.venueId)
      : undefined;
  const group = p.author.startsWith("group:")
    ? w.objects.find((g) => g.kind === "group" && g.id === p.author.slice(6))
    : undefined;
  const person = w.people.find((person) => person.id === p.author);
  return {
    name:
      venue?.name ||
      (group ? String(group.name) : "") ||
      w.profiles[p.author]?.name ||
      person?.name ||
      p.author,
    image: venue?.image || w.profiles[p.author]?.photo || person?.avatar,
    kind: venue ? "Venue" : group ? "Group" : "Member",
  };
}
