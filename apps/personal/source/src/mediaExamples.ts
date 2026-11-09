import type { ProductWorld, Post } from "./productModel.ts";
import type { PublishingMedia } from "./publishing.ts";
const image = (file: string, alt: string): PublishingMedia => ({
  id: file,
  name: alt,
  url: `/assets/crays/${file}`,
  kind: "image",
  alt,
  state: "uploaded-preview",
});
const garden: PublishingMedia = {
  id: "garden-clip",
  name: "A moment in the garden",
  url: "/assets/crays/lifestyle-garden.mp4",
  kind: "video",
  alt: "Close-up video of a bee visiting pink flowers",
  state: "uploaded-preview",
};
const waves: PublishingMedia = {
  id: "waves-clip",
  name: "Sea air, no agenda",
  url: "/assets/crays/lifestyle-waves.mp4",
  kind: "video",
  alt: "Foaming waves reaching a sandy beach, filmed from above",
  state: "uploaded-preview",
};
const coast: PublishingMedia = {
  id: "coast-clip",
  name: "A slower afternoon",
  url: "/assets/crays/lifestyle-coast.mp4",
  kind: "video",
  alt: "An aerial video of turquoise water and a beach with white umbrellas",
  state: "uploaded-preview",
};
const club = [
  image(
    "lifestyle-club-04.webp",
    "The pool and waterfront building at Forest City",
  ),
  image("lifestyle-club-05.jpg", "A palm-lined beach at sunset"),
  image("lifestyle-club-10.jpg", "A quiet moment in a bright travel lounge"),
  image("lifestyle-gym-00.webp", "A group gathering outside a CRAYS building"),
  image("lifestyle-club-03.webp", "Forest City by the coast"),
  image("lifestyle-club-00.webp", "Forest City skyline and waterfront"),
];
const gym = [
  image("lifestyle-gym-01.webp", "Friends taking a break after a gym session"),
  image(
    "lifestyle-gym-02.webp",
    "A woman resting beside weights after training",
  ),
  image("lifestyle-gym-03.webp", "Two friends sharing a cafe moment"),
];
// Only known fictional editorial IDs are enriched. Authored publishing drafts and purchases remain unchanged.
export function withMediaExamples(input: ProductWorld): ProductWorld {
  if (input.owner !== "thorben" || input.settings.mediaExamples === "v2")
    return input;
  const w = structuredClone(input);
  const pool = [...club, ...gym];
  for (const [i, p] of w.posts.entries()) {
    const known =
      [
        "note-1",
        "article-1",
        "gallery-1",
        "venue-note",
        "demo-forest-city-sunset-offer",
      ].includes(p.id) ||
      /^demo-(original-|community-original-)/.test(p.id) ||
      p.id.startsWith("space-welcome-");
    if (
      !known ||
      p.status === "draft" ||
      p.protected ||
      (p.publishing && p.id !== "demo-forest-city-sunset-offer")
    )
      continue;
    const media =
      p.id === "note-1"
        ? [club[2], club[3]]
        : p.id === "gallery-1"
          ? [club[1], club[4]]
          : p.id === "article-1"
            ? [club[0]]
            : p.id === "venue-note"
              ? [club[3]]
              : p.id === "demo-forest-city-sunset-offer"
                ? [club[4]]
                : p.type === "video"
                  ? [
                      p.author === "kai-creator"
                        ? garden
                        : p.author === "lena-creator"
                          ? coast
                          : waves,
                    ]
                  : [pool[i % pool.length]];
    if (/^demo-community-original-/.test(p.id)) {
      const captions = [
        "The kind of afternoon you wish you could bottle. Same time next week?",
        "Coffee first. Everything else can wait.",
        "Came for an hour. Stayed for the conversations.",
        "A little movement, a better morning. Who’s joining next time?",
        "New faces, familiar feeling. This is why we keep coming back.",
        "Leaving a little space in the weekend for this.",
      ];
      p.text = captions[i % captions.length];
    } else if (/^demo-original-/.test(p.id) && p.type !== "article") {
      p.text =
        p.author === "kai-creator"
          ? "A small reset between busy days. Keep it simple, keep showing up."
          : p.author === "lena-creator"
            ? "Good company makes the whole evening. A few moments from the weekend."
            : "The best part of going somewhere new? The people you end up meeting.";
    }
    if (p.id.startsWith("space-welcome-")) {
      const venue = w.venues.find((v) => v.id === p.venueId);
      if (venue) {
        media.splice(
          0,
          media.length,
          image(venue.image, `${venue.name}: community venue`),
        );
      }
    }
    p.image = undefined;
    if (p.publishing) p.publishing.media = media;
    else p.demoMedia = media;
  }
  const now = Date.now();
  const seeds: [string, string, string, string, PublishingMedia[], string?][] =
    [
      [
        "demo-story-alex",
        "alex",
        "Story",
        "A little room to breathe.",
        [club[2], club[1]],
      ],
      [
        "demo-story-forest",
        "venue:forest-city",
        "Story",
        "This evening, by the water.",
        [club[0]],
        "forest-city",
      ],
      [
        "demo-story-antje",
        "antje-vif",
        "Story",
        "Good people. A good afternoon.",
        [club[3]],
        "harbor-house",
      ],
      [
        "demo-story-maya",
        "maya-creator",
        "Story",
        "Between the busy bits.",
        [garden],
      ],
      [
        "demo-reel-alex",
        "alex",
        "Reel",
        "Sea air. No agenda. Just this.",
        [waves],
      ],
      [
        "demo-reel-maya",
        "maya-creator",
        "Reel",
        "A slower afternoon, somewhere by the sea.",
        [coast],
      ],
      [
        "demo-story-own",
        "thorben",
        "Story",
        "Our next stop. Forest City.",
        [club[5]],
      ],
      [
        "demo-story-archive",
        "thorben",
        "Story",
        "A weekend worth remembering.",
        [club[4]],
      ],
    ];
  for (const [id, author, format, text, media, venueId] of seeds) {
    const earlier = w.posts.find((p) => p.id === id && p.author === author);
    if (earlier) {
      earlier.text = text;
      earlier.title = text;
      earlier.publishing!.media = media;
      continue;
    }
    const targets = venueId ? [`space:${venueId}`] : ["global"];
    const p: Post = {
      id,
      author,
      title: text,
      text,
      type: media.some((m) => m.kind === "video") ? "video" : "image",
      audience: venueId ? "Community" : "Public",
      venueId,
      status: "accepted",
      liked: false,
      saved: false,
      reposted: false,
      protected: false,
      license: false,
      mediaAvailable: true,
      createdAt: now - (id.endsWith("archive") ? 90000000 : 1800000),
      replies: [],
      readPosition: 0,
      publishing: {
        owner: author,
        publisherId: author,
        targetIds: targets,
        format: format as "Story" | "Reel",
        storyExpiresAt:
          format === "Story"
            ? now + (id.endsWith("archive") ? -3600000 : 82800000)
            : undefined,
        revision: 1,
        media,
        mediaRights: true,
        venueTag: venueId || "",
        eventId: `preview-event:${id}`,
        receipts: targets.map((targetId) => ({ targetId, status: "accepted" })),
      },
    };
    w.posts.push(p);
  }
  w.settings.mediaExamples = "v2";
  return w;
}
