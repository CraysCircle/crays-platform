import type { ProductWorld, Post } from "./productModel.ts";
// Fictional editorial content for a used demo account. No staff role or publishing grant is given to the viewer.
export function withPublishingExamples(input: ProductWorld): ProductWorld {
  if (input.settings.publishingExamples === "v1" || input.owner !== "thorben")
    return input;
  const w = structuredClone(input);
  const venue = w.venues.find((v) => v.id === "forest-city");
  if (!venue) return input;
  const id = "demo-forest-city-sunset-offer";
  if (!w.posts.some((p) => p.id === id)) {
    const offer = {
      name: "Sunset table, good company.",
      price: "45.00",
      currency: "USD",
      priceBasis: "Per guest" as const,
      date: "",
      expires: "",
      capacity: "6",
      action: "Book now",
      conditions:
        "Fictional preview offer: one shared-table menu per guest. Drinks and any additional charges are agreed separately. The Spot confirms date, time and availability before any payment.",
    };
    const post: Post = {
      id,
      author: "venue:forest-city",
      title: offer.name,
      text: "A slower evening by the coast. Bring your favourite people; we’ll help you find a table.",
      type: "image",
      audience: "Public",
      venueId: venue.id,
      status: "accepted",
      liked: false,
      saved: false,
      reposted: false,
      protected: false,
      license: false,
      mediaAvailable: true,
      createdAt: Date.now() - 120000,
      replies: [],
      readPosition: 0,
      publishing: {
        owner: "forest-city-team",
        publisherId: "venue:forest-city",
        targetIds: ["global", "space:forest-city"],
        revision: 1,
        media: [
          {
            id: "demo-sunset-table-image",
            name: "The shared table",
            url: "/assets/crays/venue-table.png",
            kind: "image",
            alt: "A table set for a shared evening",
            state: "uploaded-preview",
          },
        ],
        mediaRights: true,
        venueTag: venue.id,
        eventId: `preview-event:${id}`,
        receipts: [
          { targetId: "global", status: "accepted" },
          { targetId: "space:forest-city", status: "accepted" },
        ],
        offer,
      },
    };
    w.posts.unshift(post);
    w.objects.unshift({
      id: `venue-offer:${id}`,
      owner: "forest-city-team",
      kind: "venue-offer",
      publisherId: post.author,
      venueId: venue.id,
      postId: id,
      ...offer,
      status: "published-demo",
      version: 1,
      source: "Fictional editorial demo, not a real venue quote",
      realBooking: false,
    });
  }
  w.settings.publishingExamples = "v1";
  return w;
}
