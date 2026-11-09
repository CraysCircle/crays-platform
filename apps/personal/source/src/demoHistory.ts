import {creatorUSDPreviewPrice} from "./creatorUSDPreview";
import { withMediaExamples } from "./mediaExamples.ts";
import { withPublishingExamples } from "./publishingExamples.ts";
import { withPersonalPlanExamples } from "./personalPlanExamples.ts";
import { withSpaceStories } from "./spaceExperience.ts";
import { forestCityDemo } from "./venueDefaults.ts";
import type { ProductWorld, Post, Entity } from "./productModel";
// Fictional July–October 2026 account history, exclusively for the clickdummy.
// Merging never enables a signer, wallet transfer, local presence, visibility or a real service.
export const DEMO_HISTORY_VERSION = "2026-10-lived-in-v17";
export function withDemoHistory(input: ProductWorld): ProductWorld {
  if (
    input.owner !== "thorben" ||
    input.settings.demoHistory === DEMO_HISTORY_VERSION
  )
    return input;
  const w = structuredClone(input);
  const alexDisclosure = w.people.find((p) => p.id === "alex");
  if (alexDisclosure && !alexDisclosure.publicAffiliationIds)
    alexDisclosure.publicAffiliationIds = ["space:harbor-house"];
  // Explicit owner correction: Thorben has no synthetic Scout membership.
  w.objects = w.objects.filter(
    (o) => !(o.id === "demo-badge-thorben" && o.personId === "thorben"),
  );
  if (!w.venues.some((v) => v.id === forestCityDemo.id))
    w.venues.unshift(structuredClone(forestCityDemo));
  const forest = w.venues.find((v) => v.id === forestCityDemo.id);
  if (forest && !forest.services.includes("Food & drinks"))
    forest.services.unshift("Food & drinks");
  const at = (days: number) =>
    Date.parse("2026-10-18T09:00:00Z") - days * 86400000;
  const add = (o: Entity) => {
    if (!w.objects.some((x) => x.id === o.id)) w.objects.push(o);
  };
  const people = [
    [
      "antje-vif",
      "Antje",
      "Community builder. Shared tables, thoughtful travel and new ideas.",
      "person-antje-vif.webp",
      "harbor-house",
    ],
    [
      "leo",
      "Leo",
      "Architecture and independent hospitality.",
      "person-leo.webp",
      "harbor-house",
    ],
    [
      "nina",
      "Nina",
      "Movement coach. Small steps and stronger mornings.",
      "person-nina.webp",
      "move",
    ],
    [
      "sofia",
      "Sofia",
      "A photographer collecting stories around shared tables.",
      "person-sofia.webp",
      "harbor-house",
    ],
    [
      "jules",
      "Jules",
      "Making documentaries about people and places.",
      "person-jules.webp",
      "harbor-house",
    ],
    [
      "amina",
      "Amina",
      "Food, neighbourhoods and the stories between them.",
      "person-amina.webp",
      "harbor-house",
    ],
    [
      "marco",
      "Marco",
      "Music, small venues and evenings worth remembering.",
      "person-marco.webp",
      "harbor-house",
    ],
    [
      "elena",
      "Elena",
      "Designing quieter ways to work together.",
      "person-elena.webp",
      "move",
    ],
    [
      "theo",
      "Theo",
      "A weekend cyclist and a weekday maker.",
      "person-theo.webp",
      "move",
    ],
    [
      "maya-creator",
      "Maya Studio",
      "Travel films, creative field notes and a little behind the scenes.",
      "person-maya-creator.webp",
      "",
    ],
    [
      "kai-creator",
      "Kai Moves",
      "Movement classes, recovery notes and practical training.",
      "person-kai-creator.webp",
      "",
    ],
    [
      "lena-creator",
      "Lena Tables",
      "Good food, shared tables and recipes to keep.",
      "person-lena-creator.webp",
      "",
    ],
  ];
  people.forEach(([pid, name, bio, avatar, venueId], i) => {
    const existingPerson = w.people.find((p) => p.id === pid);
    if (
      existingPerson &&
      [
        "contact-antje.png",
        "contact-thorben.png",
        "alex.png",
        "circle.png",
      ].includes(existingPerson.avatar)
    )
      existingPerson.avatar = avatar;
    if (!w.people.some((p) => p.id === pid))
      w.people.push({
        id: pid,
        name,
        bio,
        avatar,
        venueId: venueId || undefined,
        communityVenueIds: venueId ? [venueId] : [],
        following: i % 3 !== 1,
        contact: i < 9,
        blocked: false,
        purpose: i % 2 ? "Business" : "Socializing",
        request: i < 9 ? "accepted" : "none",
        consentSelf: i < 9,
        consentOther: i < 9,
        localPresence: false,
        localVisibility: { Business: false, Socializing: false, Dating: false },
      });
    if (i < 9) {
      const lines = [
        [
          "them",
          `It was lovely meeting you at ${venueId === "move" ? "Move Together" : "Harbor House"}.`,
        ],
        ["me", "Likewise. Shall we keep the conversation going here?"],
        ["them", "Absolutely. I’ll send you the notes we talked about."],
        ["me", "Thanks! I saved the article for the train home."],
        [
          "them",
          "I’m putting a small gathering together next month. Interested?",
        ],
        ["me", "That sounds good. Send the details when they’re ready."],
        ["them", "No rush. We can choose a day that works for both of us."],
        ["me", "A small table and an unhurried evening sounds perfect."],
        ["them", "The details are ready — shall we pick a date?"],
      ];
      lines.forEach(([from, text], j) =>
        add({
          id: `demo-chat-${pid}-${j}`,
          owner: w.owner,
          kind: "private-message",
          personId: pid,
          name: `Conversation with ${name}`,
          text,
          from,
          delivery: "delivered-demo",
          status: "delivered-demo",
          createdAt: at(86 - i * 3 - j * 5),
          sourceId: `demo-connection-${pid}`,
          postId: j === 3 ? "article-1" : undefined,
        }),
      );
    }
  });
  const creators = [
    [
      "maya-creator",
      "Maya Studio",
      "Stories & field notes",
      "Films, travel essays and the details behind every story.",
    ],
    [
      "kai-creator",
      "Kai Moves",
      "Move at your pace",
      "Thoughtful movement sessions, recovery and practical guides.",
    ],
    [
      "lena-creator",
      "Lena Tables",
      "Around the table",
      "Recipes, gatherings and the stories behind good food.",
    ],
  ];
  creators.forEach(([pid, name, title, description], i) => {
    add({
      id: `creator-profile-${pid}`,
      owner: w.owner,
      kind: "creator-profile",
      personId: pid,
      name,
      title,
      description,
      status: "published-demo",
      audience: "Public",
      handle: pid,
      cover: i === 1 ? "venue-gym.jpg" : "venue-table.png",
      links: [
        { label: "My latest work", target: "collection" },
        { label: "Join my membership", target: "membership" },
        { label: "About my work", target: "about" },
      ],
      source: "Synthetic creator, not an actual business",
      createdAt: at(90),
    });
    for (let j = 0; j < 8; j++) {
      const id = `demo-original-${pid}-${j}`;
      if (w.posts.some((p) => p.id === id)) continue;
      const titleSets = [
        [
          "A slower weekend in Lisbon",
          "What makes a place feel like yours?",
          "Behind the lens: an evening together",
          "A field guide to thoughtful travel",
          "The creative notebook — September",
          "Finding a story in the everyday",
          "An afternoon with the community",
          "Three months of making things",
        ],
        [
          "A stronger start to your morning",
          "Moving together, staying yourself",
          "A quiet recovery session",
          "Your practical movement notebook",
          "The twenty-minute reset",
          "Small habits, steady progress",
          "Training without a perfect week",
          "A walk is a good place to start",
        ],
        [
          "A table for six",
          "Recipes worth passing on",
          "Inside a neighbourhood kitchen",
          "The shared-table recipe book",
          "A little preparation, a better dinner",
          "A season of simple food",
          "From market to table",
          "Notes from our last gathering",
        ],
      ];
      const paid = j === 3 || j === 4;
      const type: Post["type"] =
        j === 2
          ? "video"
          : j === 6
            ? "image"
            : j % 3 === 0
              ? "article"
              : "note";
      w.posts.push({
        id,
        author: pid,
        title: titleSets[i][j],
        text: paid
          ? `A preview from ${name}. Open the offer to see exactly what is included and who can access it.`
          : `${description}\n\nThis chapter began with a conversation, became a small shared project, and gave us a reason to come back.\n\nThe full original is here to read at your own pace. Save it for later, follow the next chapter, or explore the work behind it.`,
        fullText: paid
          ? `# ${titleSets[i][j]}\n\nAn original fictional ${name} publication for this prototype.\n\n## Make a little room\n\nBegin with the thing you want to share. Give it time and a clear purpose.\n\n## Take it with you\n\nKeep the notes that matter. Return to the people and ideas behind them.`
          : undefined,
        type,
        audience: "Public",
        status: "accepted",
        liked: j === 0,
        saved: j === 0 || j === 3,
        reposted: false,
        protected: paid,
        license: j === 3,
        mediaAvailable: !(i === 1 && j === 3),
        createdAt: at(84 - j * 10 - i * 2),
        image: i === 1 ? "venue-gym.jpg" : "venue-table.png",
        alt: "Illustrative CRAYS community atmosphere",
        replies: [],
        readPosition: j === 0 ? 20 : 0,
        rightsTerms: "Personal reading or viewing only. No redistribution.",
        rightsDuration:
          j === 3
            ? "Ongoing personal access to this edition"
            : "One month, where included in the membership",
      });
      if (paid)
        add({
          id: `offer-${id}`,
          owner: w.owner,
          kind: "public-creator-offer",
          sellerId: pid,
          postId: id,
          name: titleSets[i][j],
          type: j === 4 ? "subscription" : "one-time",
          price: creatorUSDPreviewPrice(pid,j===4),
          currency: "USD",
          term: j === 4 ? "1 month" : "Ongoing personal access to this edition",
          conditions:
            "Personal use. No redistribution. No automatic renewal in this preview.",
          visibility: "Public",
          purchaseEligibility: "Anyone eligible",
          status: "published-demo",
          version: "demo-offer-v1",
          venueId: undefined,
          sample: true,
        });
      if (j === 3) {
        const paymentId = `demo-purchase-${pid}`;
        if (!w.payments.some((p) => p.id === paymentId))
          w.payments.push({
            id: paymentId,
            owner: w.owner,
            sourceId: id,
            recipient: pid,
            walletId: "ln",
            asset: "sats",
            network: "Lightning",
            amount: String(3500 + i * 500),
            fee: "2",
            status: "confirmed",
            reference: `synthetic-receipt-${pid}`,
            purpose: "Content purchase",
          });
        add({
          id: `demo-licence-${pid}`,
          owner: w.owner,
          kind: "license",
          name: titleSets[i][j],
          postId: id,
          status: "valid",
          issuer: pid,
          recipient: w.owner,
          network: "RGB sample",
          contract: `synthetic-contract-${pid}`,
          sourcePayment: paymentId,
          term: "Ongoing personal access to this edition",
          createdAt: at(47 - i * 2),
        });
      }
    }
    add({
      id: `demo-subscription-${pid}`,
      owner: w.owner,
      kind: "subscription",
      sellerId: pid,
      name: `${name} membership`,
      term: "1 month",
      status: i === 2 ? "expired" : i === 1 ? "expiring" : "active",
      starts: "2026-09-25",
      ends: i === 2 ? "2026-10-15" : "2026-10-25",
      autoRenew: false,
      sourceId: `offer-demo-original-${pid}-4`,
      createdAt: at(23),
    });
  });
  const subjects = [
    "A shared table on a rainy afternoon",
    "Notes from our neighbourhood walk",
    "The workshop we made together",
    "A question for the next gathering",
    "Good ideas need a little breathing room",
    "What we learned at the last session",
    "Something worth reading on the way home",
    "A small invitation to make something",
  ];
  for (let i = 0; i < 32; i++) {
    const pid = people[i % 9][0];
    const id = `demo-community-original-${i}`;
    if (w.posts.some((p) => p.id === id)) continue;
    const venueId = people[i % 9][4];
    const own = i % 5 === 0;
    w.posts.push({
      id,
      author: own ? w.owner : pid,
      title: subjects[i % subjects.length],
      text: `${subjects[i % subjects.length]}.\n\nWe started with a small group at ${venueId === "move" ? "Move Together" : "Harbor House"}. A few familiar faces, a few new perspectives, and a useful idea to carry into the next week.\n\nWhat would you like to make room for next time?`,
      type: i % 7 === 0 ? "article" : i % 6 === 0 ? "image" : "note",
      audience: i % 4 === 0 ? "Public" : "Community",
      venueId,
      status: own && i % 10 === 0 ? "draft" : "accepted",
      liked: i % 3 === 0,
      saved: i % 6 === 0,
      reposted: false,
      protected: false,
      license: false,
      mediaAvailable: true,
      createdAt: at(90 - i * 2.6),
      image:
        i % 6 === 0
          ? venueId === "move"
            ? "venue-gym.jpg"
            : "venue-table.png"
          : undefined,
      replies: [],
      readPosition: 0,
    });
  }
  const groups = [
    ["demo-group-table", "The Saturday Table", "harbor-house"],
    ["demo-group-move", "Early Movers", "move"],
    ["demo-group-makers", "Independent Makers", ""],
  ];
  groups.forEach(([id, name, venueId], i) => {
    add({
      id,
      owner: w.owner,
      kind: "group",
      name,
      venueId: venueId || undefined,
      access: i === 2 ? "Request to join" : "Open",
      membership: "active",
      audience: "Private group",
      role: "Member",
      history: "From joining only",
      description:
        "A small group with shared interests. Existing member conversations remain private.",
    });
    for (let j = 0; j < 7; j++)
      add({
        id: `${id}-message-${j}`,
        owner: w.owner,
        kind: "group-message",
        groupId: id,
        text: [
          "Shall we make a plan for next week?",
          "I can do Saturday morning.",
          "A smaller group would be lovely.",
          "I saved a few ideas to discuss.",
          "Let’s check the venue before confirming.",
          "The time works for me.",
          "Looking forward to seeing everyone.",
        ][j],
        from: j % 3 === 0 ? "me" : "them",
        author: j % 3 === 0 ? w.owner : people[(i + j) % 9][0],
        status: "delivered-demo",
        createdAt: at(28 - j * 3),
      });
  });
  const taskSeeds = [
    [
      "Gathering ideas for Saturday",
      "Review three ideas for a small gathering, without sending invitations.",
      "AL-305",
      "event-1",
      "review",
    ],
    [
      "Notes for the next conversation",
      "Keep my own three points for the next chat with Alex.",
      "AL-278",
      "demo-followup-alex",
      "completed",
    ],
    [
      "A movement routine for busy weeks",
      "Prepare a practical routine, without making a booking.",
      "AL-248",
      "demo-movement-result",
      "completed",
    ],
    [
      "A creator reading list",
      "Find the original publications I saved and keep their authors attached.",
      "AL-112",
      "article-1",
      "completed",
    ],
    [
      "A table for our next visit",
      "Prepare the date and guest count for Harbor House.",
      "AL-273",
      "demo-booking-0",
      "waiting-for-approval",
    ],
    [
      "A creator launch checklist",
      "Prepare my own publishing checklist. Do not publish or change prices.",
      "AL-202",
      "demo-publication-result",
      "paused",
    ],
  ];
  taskSeeds.forEach(([name, request, sourceFunction, resultId, status], i) => {
    add({
      id: `demo-agent-task-${i}`,
      owner: w.owner,
      kind: "agent-task",
      name,
      request,
      status,
      sourceChatId: "chuck",
      sourceMessageId: `demo-chuck-request-${i}`,
      sourceFunction,
      sourceContext: {
        objectId: resultId,
        venueId: i === 2 ? "move" : "harbor-house",
      },
      lastObjectId: resultId,
      createdAt: at(45 - i * 7),
    });
  });
  add({
    id: "demo-followup-alex",
    owner: w.owner,
    kind: "followup",
    name: "A few thoughts for Alex",
    text: "Ask about the neighbourhood project. Share my own workshop notes. Suggest a coffee if the week allows.",
    status: "prepared",
    personId: "alex",
    sourceId: "demo-agent-task-1",
  });
  add({
    id: "demo-movement-result",
    owner: w.owner,
    kind: "service",
    name: "A movement routine for busy weeks",
    purpose: "Training",
    venueId: "move",
    status: "draft",
    text: "Two short sessions and one walk. Review the session details with your coach before starting.",
    sourceId: "demo-agent-task-2",
  });
  add({
    id: "demo-publication-result",
    owner: w.owner,
    kind: "publication-plan",
    name: "A creator launch checklist",
    text: "Review originals, choose a preview, check audience, confirm terms, then sign and publish.",
    status: "draft",
    sourceId: "demo-agent-task-5",
  });
  for (let i = 0; i < 8; i++) {
    const venueId = i % 2 ? "move" : "harbor-house";
    add({
      id: `demo-booking-${i}`,
      owner: w.owner,
      kind: "booking",
      name: [
        "Dinner with Alex",
        "Movement session with Nina",
        "Community supper",
        "A morning reset",
        "Design Circle dinner",
        "Strength & mobility",
        "Sunday at Harbor House",
        "Recovery & coffee",
      ][i],
      venueId,
      date: new Date(at(i === 0 ? -2 : i === 1 ? -5 : 6 + i * 9))
        .toISOString()
        .slice(0, 10),
      time: i % 2 ? "08:30" : "18:30",
      timezone: venueId === "move" ? "Europe/Berlin" : "Europe/Lisbon",
      partySize: String(2 + (i % 4)),
      participants:
        i === 0
          ? "You and Alex"
          : i === 1
            ? "You and Nina"
            : "You and your invited guests",
      notes: "A quiet spot, if available.",
      status: i === 0 ? "requested" : i === 4 ? "cancelled" : "confirmed",
      priceStatus: "Price to be agreed",
      sourceId: i === 0 ? "demo-agent-task-4" : "demo-visit-history",
      createdAt: at(7 + i * 9),
    });
  }
  w.objects
    .filter(
      (o) =>
        o.kind === "booking" &&
        o.id.startsWith("demo-booking-") &&
        [
          "A table for good conversations",
          "A movement session together",
        ].includes(String(o.name)),
    )
    .forEach((o) => {
      const i = Number(o.id.split("-").at(-1));
      const names = [
        "Dinner with Alex",
        "Movement session with Nina",
        "Community supper",
        "A morning reset",
        "Design Circle dinner",
        "Strength & mobility",
        "Sunday at Harbor House",
        "Recovery & coffee",
      ];
      o.name = names[i];
      if (i < 2) {
        o.date = new Date(at(i === 0 ? -2 : -5)).toISOString().slice(0, 10);
        o.participants = i === 0 ? "You and Alex" : "You and Nina";
      }
    });
  for (let i = 0; i < 9; i++) {
    add({
      id: `demo-event-${i}`,
      owner: w.owner,
      kind: "event",
      name: [
        "A shared-table evening",
        "A conversation about making things",
        "Move together, then coffee",
      ][i % 3],
      venueId: i % 3 === 2 ? "move" : "harbor-house",
      date: new Date(at(48 - i * 7)).toISOString().slice(0, 10),
      time: i % 3 === 2 ? "09:00" : "18:30",
      timezone: i % 3 === 2 ? "Europe/Berlin" : "Europe/Lisbon",
      status: "available",
      attendance: i > 6 ? "interested" : i % 4 === 0 ? "declined" : "none",
      capacity: "Availability on request",
      recurring: false,
      createdAt: at(60 - i * 7),
    });
  }
  for (let i = 0; i < 5; i++)
    add({
      id: `demo-order-${i}`,
      owner: w.owner,
      kind: "order",
      name: "Coffee at Harbor House",
      venueId: "harbor-house",
      items: [{ id: "coffee", variant: "Regular", quantity: (i % 2) + 1 }],
      status: i === 4 ? "cancelled" : "placed-demo",
      delivery: "Pick up",
      fulfilment: i === 4 ? "Not started" : "Delivered",
      paymentMethod: "Lightning",
      priceStatus: "Agreed sample quote",
      quote: {
        subtotal: String(1500 * ((i % 2) + 1)),
        fees: "0",
        discount: "0",
        tip: "0",
        total: String(1500 * ((i % 2) + 1)),
        currency: "sats",
        expires: new Date(at(4 + i * 8)).toISOString(),
        version: `demo-quote-${i}`,
        source: "Synthetic historical provider quote",
      },
      createdAt: at(5 + i * 8),
    });
  const lena = w.people.find((p) => p.id === "lena-creator");
  // Explicitly published fictional appearances, never inferred from a private
  // membership or live presence. A public invitation grants no Spot rights.
  for (const creator of w.objects.filter(
    (o) =>
      o.kind === "creator-profile" &&
      ["maya-creator", "kai-creator", "lena-creator"].includes(
        String(o.personId),
      ),
  )) {
    if (!Array.isArray(creator.publicSpaceIds))
      creator.publicSpaceIds =
        creator.personId === "kai-creator" ? ["move"] : ["harbor-house"];
  }
  if (lena) lena.communityVenueIds = ["harbor-house"];
  const memberOffer = w.objects.find(
    (o) => o.id === "offer-demo-original-lena-creator-4",
  );
  if (memberOffer) {
    memberOffer.purchaseEligibility = "Community members";
    memberOffer.venueId = "harbor-house";
  }
  const memberOriginal = w.posts.find(
    (p) => p.id === "demo-original-lena-creator-4",
  );
  if (memberOriginal) memberOriginal.venueId = "harbor-house";
  // Synthetic public awards: display is not the authority for service access.
  const badgeSubjects = [w.owner, ...w.people.map((p) => p.id)].filter(
    (id) => id !== "thorben",
  );
  badgeSubjects.forEach((id, i) => {
    const creator = id.endsWith("-creator");
    const badgeId = creator
      ? ["BADGE-R01", "BADGE-R02", "BADGE-R03"][i % 3]
      : ["BADGE-C01", "BADGE-C02", "BADGE-C03", "BADGE-C04"][i % 4];
    add({
      id: `demo-badge-${id}`,
      owner: w.owner,
      kind: "badge-award",
      personId: id,
      badgeId,
      status: "issued-demo",
      displayPublic: true,
      issuer: "CRAYS fictional membership registry",
      evidence: "Synthetic membership receipt",
      createdAt: at(80),
    });
    if (creator)
      add({
        id: `demo-creator-benefits-${id}`,
        owner: w.owner,
        kind: "creator-entitlement",
        personId: id,
        badgeAwardId: `demo-badge-${id}`,
        status: "active",
        source: "Fictional Caster membership benefits, not an image",
        creatorRelay: `wss://${id}.relay.example.invalid`,
        blossomServer: `https://${id}.media.example.invalid`,
        infrastructureStatus: "demo-only-not-provisioned",
      });
  });
  for (const person of w.people) {
    if (
      ["alex.png", "circle.png"].includes(person.avatar) &&
      person.id !== "alex"
    )
      person.avatar = `person-${person.id}.webp`;
  }
  if (["alex.png", "person-thorben.webp"].includes(w.profiles.thorben.photo))
    w.profiles.thorben.photo = "contact-thorben.png";
  if (w.profiles.antje.photo === "circle.png")
    w.profiles.antje.photo = "person-antje-vif.webp";
  // Explicit fictional showcase for the profile in the owner's screenshot.
  // Never overwrite a person's already chosen links or create an account connection.
  for(const personId of ["alex","maya-creator"]){
    add({id:`demo-social-${personId}`,owner:w.owner,kind:"profile-social-links",personId,status:"published-demo",audience:"Public",sample:true,
      source:"Fictional demonstration links; not verified external accounts",
      links:[{label:"instagram",url:`https://www.instagram.com/crays.demo.${personId}/`},{label:"tiktok",url:`https://www.tiktok.com/@crays.demo.${personId}`},{label:"youtube",url:`https://www.youtube.com/@crays-demo-${personId}`},{label:"x",url:`https://x.com/crays_demo_${personId.replaceAll('-','_')}`},{label:"snapchat",url:`https://www.snapchat.com/add/crays.demo.${personId}`},{label:"facebook",url:`https://www.facebook.com/crays.demo.${personId}`}]
    });
  }
  add({id:"offer-paid-1",owner:w.owner,kind:"public-creator-offer",sellerId:"alex",postId:"paid-1",name:"A creator’s field notes",type:"one-time",price:"4",currency:"USD",term:"Ongoing personal access to this edition",conditions:"Personal use. No redistribution. Fictional preview offer only.",visibility:"Public",purchaseEligibility:"Anyone eligible",status:"published-demo",version:"demo-offer-v1",sample:true});
  w.settings.demoHistory = DEMO_HISTORY_VERSION;
  w.settings["chat:marco:archived"] = true;
  return withMediaExamples(
    withPublishingExamples(withPersonalPlanExamples(withSpaceStories(w))),
  );
}
export const demoChuckConversations = [
  [
    "Gathering ideas for Saturday",
    "Review three ideas for a small gathering, without sending invitations.",
    "I kept the event and Spot together. The ideas are ready for your review.",
    "AL-305",
    "event-1",
  ],
  [
    "Notes for the next conversation",
    "Keep my own three points for the next chat with Alex.",
    "Your own follow-up notes are saved. I have not read or shared the private conversation.",
    "AL-278",
    "demo-followup-alex",
  ],
  [
    "A movement routine for busy weeks",
    "Prepare a practical routine, without making a booking.",
    "The routine is a draft. You can review it in Move Together. Nothing has been booked.",
    "AL-248",
    "demo-movement-result",
  ],
  [
    "A creator reading list",
    "Find the original publications I saved and keep their authors attached.",
    "Your saved originals are in your library. Payment, rights and availability stay separate.",
    "AL-112",
    "article-1",
  ],
  [
    "A table for our next visit",
    "Prepare the date and guest count for Harbor House.",
    "Your booking request is ready to review with Harbor House. It is not a confirmed reservation.",
    "AL-273",
    "demo-booking-0",
  ],
  [
    "A creator launch checklist",
    "Prepare my own publishing checklist. Do not publish or change prices.",
    "The checklist is saved. Publishing and offer terms still need your review.",
    "AL-202",
    "demo-publication-result",
  ],
];
