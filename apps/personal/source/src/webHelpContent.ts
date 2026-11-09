/** Source-backed customer help; source/decision ledgers remain in review/, never rendered as product copy. */
export type HelpCategory='start'|'chuck'|'people'|'plans'|'content'|'membership'|'privacy'|'ecosystem';
export type HelpArticle={id:string;question:string;category:HelpCategory;paragraphs:string[];action?:{label:string;destination:string}|null;publicSources:string[];related:string[]};
export const helpCategories=[
  {
    "id": "start",
    "name": "Getting started",
    "description": "The basics and your own CRAYS account."
  },
  {
    "id": "chuck",
    "name": "Chuck & control",
    "description": "Your own assistant, tasks and choices."
  },
  {
    "id": "people",
    "name": "People & places",
    "description": "Connections, communities and time together."
  },
  {
    "id": "plans",
    "name": "Plans & purchases",
    "description": "Plans, original bookings and purchase support."
  },
  {
    "id": "content",
    "name": "Profile & content",
    "description": "Your profile, originals and permitted sources."
  },
  {
    "id": "membership",
    "name": "Memberships, wallets & Props",
    "description": "Plans, source accounts and creator support."
  },
  {
    "id": "privacy",
    "name": "Account & privacy",
    "description": "Security, permissions and your own records."
  },
  {
    "id": "ecosystem",
    "name": "The CRAYS ecosystem",
    "description": "Club, Gym, independent Spots and partners."
  }
] as const;
export const helpArticles:HelpArticle[]=[
  {
    "id": "what-is-crays",
    "question": "What is CRAYS?",
    "category": "start",
    "paragraphs": [
      "CRAYS brings conversations, people, plans, creative work and independent places into one product. Chuck is your personal AI concierge, while direct controls let you make your own choices."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [
      "https://www.crays.world/"
    ],
    "related": [
      "vif",
      "own-agent",
      "account"
    ]
  },
  {
    "id": "vif",
    "question": "What does VIF mean?",
    "category": "start",
    "paragraphs": [
      "VIF means Very Important Family: close personal connections chosen by the user; friends, collaborators or romantic connections."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [
      "https://www.crays.world/",
      "https://www.crays.world/find-your-people"
    ],
    "related": [
      "what-is-crays",
      "own-agent",
      "account"
    ]
  },
  {
    "id": "chuck",
    "question": "What can I bring to Chuck?",
    "category": "chuck",
    "paragraphs": [
      "Bring a question, text, voice, photo or file to Chuck. Planning, research, writing and organisation keep their own inputs and results. Review the current capability, source access and any approval before an action can proceed."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [
      "https://www.crays.world/chuck"
    ],
    "related": [
      "control",
      "relationship-assistance",
      "memory-control"
    ]
  },
  {
    "id": "own-agent",
    "question": "Do I need a separate Chuck signup?",
    "category": "start",
    "paragraphs": [
      "You do not need a second Chuck or OpenClaw signup. CRAYS is designed to provide your own personal Chuck through your CRAYS account.",
      "WhatsApp, Telegram, Signal and Nextcloud are independent optional connections, not prerequisites for Chuck in CRAYS. A connected service still needs its own permission and current availability; this preview does not prove that an external connection or personal backend is ready."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [],
    "related": [
      "chuck",
      "control",
      "connected-tools"
    ]
  },
  {
    "id": "control",
    "question": "Does Chuck act without asking?",
    "category": "chuck",
    "paragraphs": [
      "Chuck can continue within an explicit valid delegation. A general request is not unlimited permission. The authorised action, recipient or channel, purpose, cost limit, scope and expiry still apply at each step. Outside those limits, a new specific approval is needed. You can review or withdraw permission, while already completed external effects remain separate."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [
      "https://www.crays.world/bring-your-spot",
      "https://www.craysclub.com/en/agentic-life"
    ],
    "related": [
      "chuck",
      "relationship-assistance",
      "memory-control"
    ]
  },
  {
    "id": "intro",
    "question": "How do introductions work?",
    "category": "people",
    "paragraphs": [
      "Review the person, permitted reasons, purpose and information that would be shared. You choose whether to proceed; the other person then makes their own decision. A private connection requires both current consents. Decline or withdrawal is respected without trying again through another purpose or channel. Any booking or paid next step needs its own permission."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [
      "https://www.crays.world/find-your-people"
    ],
    "related": [
      "purpose",
      "presence",
      "circles"
    ]
  },
  {
    "id": "purpose",
    "question": "Can I choose friendship, business or dating?",
    "category": "people",
    "paragraphs": [
      "Yes. Choose Socializing, Business or Dating separately. Chuck may suggest a purpose for your request, but that is not permission to publish your intention, share private profile details or contact anyone. Choose or change Socializing, Business or Dating and the permitted search scope separately. A check-in alone does not make you visible."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [
      "https://www.crays.world/find-your-people"
    ],
    "related": [
      "intro",
      "presence",
      "circles"
    ]
  },
  {
    "id": "presence",
    "question": "Does a community membership show I am at the place?",
    "category": "people",
    "paragraphs": [
      "Community membership, bookings, physical check-in and voluntary social visibility are separate; local presence needs current proof and purpose permission."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [
      "https://www.crays.world/bring-your-spot"
    ],
    "related": [
      "intro",
      "purpose",
      "circles"
    ]
  },
  {
    "id": "circles",
    "question": "What are Circles?",
    "category": "people",
    "paragraphs": [
      "Circles are groups around shared interests and activities. A place can have its own groups, while independent global Circles can connect people across places without a shared physical visit.",
      "Both can have open, approval-based or invitation-only joining rules. Joining a global Circle does not grant access to another place’s private directory, content or current on-site people. Leaving a place, leaving a Circle and withdrawing a disclosure permission are separate choices."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [
      "https://www.crays.world/find-your-people"
    ],
    "related": [
      "group-access",
      "away-from-place",
      "place-leaves"
    ]
  },
  {
    "id": "account",
    "question": "Can one account work across places?",
    "category": "start",
    "paragraphs": [
      "CRAYS is designed around one account across the product. Each independent place or service keeps its own offers, prices and access terms. A personal account does not automatically grant admission to a Club, Gym or other place."
    ],
    "action": {
      "label": "Review your settings",
      "destination": "privacy"
    },
    "publicSources": [
      "https://www.crays.world/"
    ],
    "related": [
      "what-is-crays",
      "vif",
      "own-agent"
    ]
  },
  {
    "id": "nostr",
    "question": "What does Nostr mean here?",
    "category": "content",
    "paragraphs": [
      "Nostr is an open protocol for signed social content. Your independent identity, compatible apps and chosen relays are separate from a CRAYS membership or paid badge. Review which sources are actually connected and what a particular identity status proves.",
      "Your signer, independent keys, encrypted history and wallet recovery have different controls. Do not put private keys or recovery secrets into a support description or ordinary chat. Revoking a session does not recall every public event or guarantee recovery of missing encrypted history."
    ],
    "action": {
      "label": "Review identity & relays",
      "destination": "nostr"
    },
    "publicSources": [
      "https://www.crays.world/",
      "https://www.crays.world/bring-your-spot"
    ],
    "related": [
      "devices-history",
      "lost-device",
      "verification-badges"
    ]
  },
  {
    "id": "media",
    "question": "What are relays and Blossom?",
    "category": "content",
    "paragraphs": [
      "Relays carry signed social content; Blossom hosts media. Choosing a host does not grant someone access to a private conversation or a purchased original. Source availability, access rights and backups each need their own review."
    ],
    "action": {
      "label": "Review content & hosting",
      "destination": "hosting"
    },
    "publicSources": [
      "https://www.crays.world/bring-your-spot"
    ],
    "related": [
      "nostr",
      "ads",
      "profile"
    ]
  },
  {
    "id": "ads",
    "question": "Does CRAYS show personalised advertising?",
    "category": "content",
    "paragraphs": [
      "CRAYS World describes a feed without paid placement or personalised advertising based on your personal data. Your source and privacy choices remain separate controls."
    ],
    "action": {
      "label": "Review your settings",
      "destination": "privacy"
    },
    "publicSources": [
      "https://www.crays.world/"
    ],
    "related": [
      "nostr",
      "media",
      "profile"
    ]
  },
  {
    "id": "profile",
    "question": "How can I control profile sharing?",
    "category": "content",
    "paragraphs": [
      "A profile shows the information and originals its owner is allowed to share with you. Creator offers, paid status and identity verification have distinct meanings. A paid badge is not proof of identity or permission to contact someone, read private data or buy on their behalf.",
      "Review the public, community or private audience and the exact fields you choose to share. Private contact preferences, memberships, location, birthday and personality results need their own disclosure choices; a profile preview does not grant someone access to those fields."
    ],
    "action": {
      "label": "Open your profile",
      "destination": "profile"
    },
    "publicSources": [],
    "related": [
      "nostr",
      "media",
      "ads"
    ]
  },
  {
    "id": "library",
    "question": "Where are saved and purchased originals?",
    "category": "content",
    "paragraphs": [
      "Library supports Saved, Continue and Purchased. Content access, media availability, reading progress and own original payments remain separate; a retained receipt does not itself grant unavailable content access.",
      "Your library helps find eligible originals, saved items, collections and purchased rights. These remain different from ownership, guaranteed availability or unlimited usage. Your private files and private-group content retain their own permissions; private conversations are not automatically imported into an index."
    ],
    "action": {
      "label": "Open your Library",
      "destination": "library"
    },
    "publicSources": [],
    "related": [
      "nostr",
      "media",
      "ads"
    ]
  },
  {
    "id": "tasks",
    "question": "What is the difference between manual tasks and Chuck reviews?",
    "category": "plans",
    "paragraphs": [
      "Completing a private manual task is personal organisation and does not approve a booking, payment, message or agent action. Agent tasks keep their source-specific review controls."
    ],
    "action": {
      "label": "Open your tasks",
      "destination": "activity-tasks"
    },
    "publicSources": [],
    "related": [
      "plans",
      "map",
      "commerce"
    ]
  },
  {
    "id": "plans",
    "question": "Is a saved plan already booked?",
    "category": "plans",
    "paragraphs": [
      "A draft plan, checklist or linked original helps you organise an idea. Saving it or marking a personal task done does not confirm a reservation, payment, calendar invitation, service request or current presence.",
      "Interest, request, provisional reservation, payment, provider confirmation, cancellation and error are different states. Check the original provider’s actual terms, capacity and your access before treating an event or service as booked."
    ],
    "action": {
      "label": "Open your plans",
      "destination": "activity-plans"
    },
    "publicSources": [],
    "related": [
      "task-stop-effects",
      "action-evidence",
      "commerce"
    ]
  },
  {
    "id": "map",
    "question": "Does my Travel Map prove where I am?",
    "category": "plans",
    "paragraphs": [
      "Visited/want/favourite city records are private user choices; not live presence, verified street coordinates or automatic travel history. Sharing and source links need explicit controls."
    ],
    "action": {
      "label": "Open your Travel Map",
      "destination": "activity-travel"
    },
    "publicSources": [],
    "related": [
      "tasks",
      "plans",
      "commerce"
    ]
  },
  {
    "id": "commerce",
    "question": "Where can I review bookings and purchases?",
    "category": "plans",
    "paragraphs": [
      "Activity → Commerce brings your original bookings and purchases together. The responsible provider, request status, payment, refund and retained receipt remain separate. Open the original before deciding what to do next."
    ],
    "action": {
      "label": "Review original purchases",
      "destination": "activity-commerce"
    },
    "publicSources": [],
    "related": [
      "tasks",
      "plans",
      "map"
    ]
  },
  {
    "id": "wallet",
    "question": "Does connecting a wallet reveal every balance or permit every payment?",
    "category": "membership",
    "paragraphs": [
      "Connected, read, transfer and budget rights differ; exact source, owner, freshness/validation and transaction review still govern display and action. Disconnected wallet does not erase retained own receipts."
    ],
    "action": {
      "label": "Review wallets & accounts",
      "destination": "wallets"
    },
    "publicSources": [],
    "related": [
      "prices",
      "props",
      "props-count"
    ]
  },
  {
    "id": "prices",
    "question": "Where can I review current membership prices?",
    "category": "membership",
    "paragraphs": [
      "Open Badges & memberships for the current User, Creator and Spots catalogue, including the selected billing period and source terms. Existing lifetime or earned rights stay separate from a new recurring plan. Do not assume a yearly discount or an entitlement that is not shown."
    ],
    "action": {
      "label": "Review badges & memberships",
      "destination": "memberships"
    },
    "publicSources": [],
    "related": [
      "wallet",
      "props",
      "props-count"
    ]
  },
  {
    "id": "props",
    "question": "What does a Prop support?",
    "category": "membership",
    "paragraphs": [
      "A paid Prop supports the specific contest you choose. The published USD1 allocation is 50% to the recipient, 25% to the prize pool and 25% to the event. Likes and follows are free. A Prop alone does not buy an original, membership, ticket, private connection or prize entry."
    ],
    "action": {
      "label": "Explore Props",
      "destination": "props"
    },
    "publicSources": [
      "https://www.crays.world/",
      "https://www.crays.world/give-props"
    ],
    "related": [
      "wallet",
      "prices",
      "props-count"
    ]
  },
  {
    "id": "props-count",
    "question": "Where do paid Props count?",
    "category": "membership",
    "paragraphs": [
      "Each valid Prop counts once in its chosen contest and once in the creator annual total in that category. Another contest has its own goal."
    ],
    "action": {
      "label": "Explore Props",
      "destination": "props"
    },
    "publicSources": [
      "https://www.crays.world/give-props"
    ],
    "related": [
      "wallet",
      "prices",
      "props"
    ]
  },
  {
    "id": "award",
    "question": "When is the CRAYS Props Award?",
    "category": "membership",
    "paragraphs": [
      "The published CRAYS Props Award ceremony is in Cannes on 2 June 2028 at 12:00 noon Europe/Paris. Current standings are separate from final results. Awards, invitations and participation have their own published conditions."
    ],
    "action": {
      "label": "Explore Props",
      "destination": "props"
    },
    "publicSources": [
      "https://www.craysaward.com/",
      "https://www.crays.world/give-props"
    ],
    "related": [
      "wallet",
      "prices",
      "props"
    ]
  },
  {
    "id": "creator",
    "question": "How are creators, memberships and originals different?",
    "category": "membership",
    "paragraphs": [
      "Buying an original, joining a creator’s content membership and supporting a Props contest are separate journeys. Each original offer keeps its own seller, price, usage rights, access conditions and delivery status.",
      "CRAYS World publishes 0% CRAYS content-sales commission. External payment, network or hosting costs are separate and must be shown by their responsible source; that statement does not make every transaction cost-free.",
      "Creator status is not identity verification or permission to manage another person’s work. A creator workspace requires its own current authority; no separate Nostr identity or AI-generated publication is required merely to keep existing originals."
    ],
    "action": {
      "label": "Review badges & memberships",
      "destination": "memberships"
    },
    "publicSources": [
      "https://www.crays.world/"
    ],
    "related": [
      "prices",
      "props",
      "purchase-access",
      "studio-separate"
    ]
  },
  {
    "id": "spots",
    "question": "What can be a Spot?",
    "category": "people",
    "paragraphs": [
      "A Spot can be a permanent, temporary or moving place, event or journey: for example a restaurant, hotel, festival, airport or workspace. It keeps its own operator, rules, offers and identity.",
      "Open a place to browse its permitted community content, groups, events, people and services directly. A Spot is more than a group chat. Some content or services may be unavailable, expired or withdrawn; not every place offers the same departments or facilities.",
      "Community membership, service access, booking, current check-in and voluntary social visibility stay separate. Following a relay does not prove that you are there, and visiting does not authorise you to represent or manage the place."
    ],
    "action": {
      "label": "Discover places",
      "destination": "spots-discover"
    },
    "publicSources": [
      "https://www.crays.world/bring-your-spot"
    ],
    "related": [
      "spot-services",
      "community-entry",
      "local-checkin",
      "studio-separate"
    ]
  },
  {
    "id": "franchise",
    "question": "Does a Spot need a CRAYS franchise?",
    "category": "ecosystem",
    "paragraphs": [
      "An independent Spot can keep its own brand. A CRAYS franchise or brand licence is a separate agreement; browsing a Spot or selecting a Spot plan does not grant a franchise licence or operator rights."
    ],
    "action": null,
    "publicSources": [
      "https://www.crays.world/bring-your-spot",
      "https://www.crays.pro/"
    ],
    "related": [
      "club",
      "gym",
      "gym-content"
    ]
  },
  {
    "id": "club",
    "question": "How can I join CRAYS Club?",
    "category": "ecosystem",
    "paragraphs": [
      "Club is invitation-led; direct application and approved Ambassador route exist, with final admission kept by the CRAYS team. Digital profile alone is not Club admission."
    ],
    "action": null,
    "publicSources": [
      "https://www.craysclub.com/"
    ],
    "related": [
      "franchise",
      "gym",
      "gym-content"
    ]
  },
  {
    "id": "gym",
    "question": "Is a free Gym digital account physical access?",
    "category": "ecosystem",
    "paragraphs": [
      "No: free digital Gym member account is separate from studio entry, which requires active Gym plan, confirmed payment and valid access entitlement."
    ],
    "action": null,
    "publicSources": [
      "https://www.craysgym.com/faq"
    ],
    "related": [
      "franchise",
      "club",
      "gym-content"
    ]
  },
  {
    "id": "gym-content",
    "question": "Where do nutrition, recipes and training belong?",
    "category": "ecosystem",
    "paragraphs": [
      "Training, nutrition, recipes, trainers and wellbeing belong in the Gym section. Your own Gym events and bookings can still appear in the global personal agenda. Access to each service depends on its actual plan, payment and permissions."
    ],
    "action": null,
    "publicSources": [
      "https://www.craysgym.com/"
    ],
    "related": [
      "franchise",
      "club",
      "gym"
    ]
  },
  {
    "id": "association",
    "question": "Is the Association the operator of every venture?",
    "category": "ecosystem",
    "paragraphs": [
      "Association supplies legal/governance/brand/standards/project-approval layer; independent ecosystem companies retain their own management and economic decisions."
    ],
    "action": null,
    "publicSources": [
      "https://www.crays.org/en/association/"
    ],
    "related": [
      "franchise",
      "club",
      "gym"
    ]
  },
  {
    "id": "help",
    "question": "Where do account and privacy settings live?",
    "category": "privacy",
    "paragraphs": [
      "Open your name menu at the top right, then Privacy & settings. Account, visibility, permissions, devices, notifications and connected services are grouped there. Each control still checks the account and source it affects."
    ],
    "action": {
      "label": "Review your settings",
      "destination": "privacy"
    },
    "publicSources": [],
    "related": [
      "legal",
      "devices-history",
      "connected-tools"
    ]
  },
  {
    "id": "legal",
    "question": "Where can I find the terms and privacy information?",
    "category": "privacy",
    "paragraphs": [
      "Terms of use and privacy information are separate documents for the relevant service. Open only the verified current original that applies to that service; a marketing explanation is not a substitute for those terms.",
      "If the verified document is not available here, the page says so and offers the help route. Opening or reading a document does not automatically record a new contract acceptance."
    ],
    "action": {
      "label": "Review legal information",
      "destination": "legal"
    },
    "publicSources": [],
    "related": [
      "help",
      "connected-tools",
      "leave-export"
    ]
  },
  {
    "id": "manual-access",
    "question": "Can I use CRAYS without asking Chuck?",
    "category": "start",
    "paragraphs": [
      "You can open permitted conversations, search, original content, communities and services directly. Chuck is optional assistance; you do not have to ask an AI to read an article, find a conversation or browse a place.",
      "A community can include posts, discussions, articles, media, groups, people and events, rather than just one group chat. Search only covers the sources and records you can currently access; a few selected results are not the whole community.",
      "The input for your personal Chuck and an input that sends a message to another person have different purposes. Opening Chuck does not invite it into a private chat or give it permission to read that chat."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [],
    "related": [
      "messenger-find",
      "feed-choice",
      "spots",
      "chuck-chat-consent"
    ]
  },
  {
    "id": "return-context",
    "question": "What happens when I return to a conversation or article?",
    "category": "start",
    "paragraphs": [
      "Returning can restore eligible reading, selection, playback, conversation and draft context. A relevant view opens in response to your request; an unsolicited suggestion should not replace work you are already doing.",
      "Saved interface state is separate from current access, payment status or presence. Returning, following a notification or switching devices still checks the original and does not repeat a payment, publication or message. No fixed interruption timeout or guaranteed device synchronisation is implied."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "devices-history",
      "uncertain-action",
      "same-product"
    ]
  },
  {
    "id": "community-publishing",
    "question": "Who can publish official and community posts?",
    "category": "people",
    "paragraphs": [
      "Official operator posts and eligible member contributions remain clearly attributed. Review the exact audience before publication: public, the specific authorised community, a valid on-site context or an authorised private group.",
      "Audience labels do not themselves grant access. Private messages, bookings, payments and presence must not silently become public posts. Membership does not mean every member may publish everywhere, and changing an audience cannot recall all copies already received."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [],
    "related": [
      "publish-review",
      "group-access",
      "local-checkin"
    ]
  },
  {
    "id": "group-access",
    "question": "Why can I see a group but not join it?",
    "category": "people",
    "paragraphs": [
      "An open group allows eligible people to join; another group may require approval or an authorised private invitation. Community membership and subgroup membership are separate.",
      "A private group’s existence, participants and messages are not automatically discoverable. An operator or moderator role does not by itself reveal private group conversations. Recommendations and search must respect those same limits."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [],
    "related": [
      "circles",
      "contact-requests",
      "chuck-chat-consent"
    ]
  },
  {
    "id": "community-entry",
    "question": "Do I need a hotel booking to join a Spot community?",
    "category": "people",
    "paragraphs": [
      "A hotel booking is not universally required. A place may configure eligible bookings or tickets, membership, a permitted local check-in, or invitation and approval as entry routes. Review that place’s actual rules.",
      "Following a public source, joining its community, having a service entitlement and being physically present are different states. A static QR code alone should not be treated as infallible proof of location."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [],
    "related": [
      "before-first-visit",
      "local-checkin",
      "partner-benefits"
    ]
  },
  {
    "id": "before-first-visit",
    "question": "What changes when a booking is cancelled before my first visit?",
    "category": "people",
    "paragraphs": [
      "Before your first verified visit, cancellation or a confirmed no-show ends provisional community access derived from that booking or ticket unless another valid entry right remains.",
      "After a verified visit, the community connection remains subject to leaving, valid blocks and other restrictions. Personal contacts and chats keep their own rights. A booking or past visit is not evidence of current presence, and leaving does not guarantee continued access to protected place content."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [],
    "related": [
      "community-entry",
      "away-from-place",
      "plans"
    ]
  },
  {
    "id": "local-checkin",
    "question": "Does scanning a QR code make me visible to everyone?",
    "category": "people",
    "paragraphs": [
      "Checking in does not automatically publish your presence. Socializing, Business and Dating visibility have separate choices that you can withdraw. Turning off social visibility does not remove otherwise valid place services.",
      "Current presence expires unless renewed with suitable verified local evidence, and you can end it manually. Opening the app, chatting or connecting to a relay does not renew it. There is no universal check-in duration.",
      "A place may also have separately verified areas. Membership, presence at the place, presence inside an area and service rights stay distinct. The 15-minute Wave preview is not the general venue check-in lifetime."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [],
    "related": [
      "presence",
      "matching-search-scope",
      "wave-nearby"
    ]
  },
  {
    "id": "away-from-place",
    "question": "Can I use my community after leaving the place?",
    "category": "people",
    "paragraphs": [
      "Eligible community use can continue away from the place: permitted posts, media, groups, conversations, events and offers remain governed by their own access rules.",
      "People currently on site and on-site-only content require separate current local evidence and purpose visibility. Membership, an earlier visit or an existing booking does not provide a remote view of unknown people who are there now."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [],
    "related": [
      "local-checkin",
      "group-access",
      "matching-search-scope"
    ]
  },
  {
    "id": "place-leaves",
    "question": "What happens to my contacts if a place leaves CRAYS?",
    "category": "people",
    "paragraphs": [
      "A place’s operator services follow their actual contractual rules if it leaves CRAYS. Personal connections, eligible private conversations and independent Circles do not end solely because the operator leaves.",
      "A former place must not be shown as currently active. Continued operator services, private archives or foreign relay availability are not guaranteed, and no universal grace period is assumed. A relationship with one place does not grant membership or access at another."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [],
    "related": [
      "circles",
      "leave-export",
      "partner-benefits"
    ]
  },
  {
    "id": "contact-requests",
    "question": "Why do I need permission before messaging someone?",
    "category": "people",
    "paragraphs": [
      "Unknown people use contact or message requests. The recipient can accept, decline or ignore a request. Confirmed contacts may chat only while their current rights allow it.",
      "Following, buying, giving Props, sharing a community or being at the same place is not acceptance of private contact. Chuck can prepare a first message or introduction, but preparation is not sending. A block or refusal must not be bypassed through another purpose or network."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "intro",
      "wave-nearby",
      "chat-options"
    ]
  },
  {
    "id": "messenger-find",
    "question": "Where can I find unread, archived and shared conversations?",
    "category": "people",
    "paragraphs": [
      "Use the VIFs conversation search, unread filter, favourites, groups, archive and your own chat lists. The fuller conversation filters also distinguish All, Personal, Venue groups, Global Circles and Unread, with requests kept separate.",
      "Inside a conversation, use Search to find permitted message text, move between matching results and return to the matching message. Shared content has its own search and media filters. Partial, missing, expired or withdrawn sources are different from no matching results.",
      "Pinning, muting, archiving and changing a local list organise your conversations; they do not give Chuck permission to search private messages. Use the separate reviewed Chuck-access controls for that."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "chat-options",
      "shared-content",
      "chuck-chat-consent",
      "wave-nearby"
    ]
  },
  {
    "id": "chuck-chat-consent",
    "question": "Does Chuck read my private conversations automatically?",
    "category": "people",
    "paragraphs": [
      "Chuck does not automatically read a private conversation. An invitation identifies its purpose, the permitted data and the required participants’ consent. Access to past history needs its own explicit scope.",
      "Chat participation does not automatically allow recordings, transcription, persistent memory, matching reuse or an external message, booking or payment. Those uses have their own permissions. Review duration, recipients and scope, and withdraw access through the original permission.",
      "Withdrawal stops future authorised processing within its actual scope; it cannot universally recall copies already received elsewhere."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "voice-control",
      "memory-control",
      "connected-tools"
    ]
  },
  {
    "id": "calls-and-media",
    "question": "Can I call people or share voice messages and files?",
    "category": "people",
    "paragraphs": [
      "CRAYS’s messenger scope includes text, voice messages, pictures, video, files and original content, plus individual and group voice or video calls. Current connection, app and device permissions determine actual availability.",
      "Use the relevant chat header for voice or video, or the conversation menu for a call link and a new group call. Incoming, declined, busy, unanswered, interrupted and denied-device-access states are distinct from a connected call.",
      "Call recording, transcription and AI participation need separate suitable consent. Calls in this local preview are examples: no real person is called, and the screens do not prove encryption or background delivery."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "call-links",
      "chuck-chat-consent",
      "devices-history"
    ]
  },
  {
    "id": "devices-history",
    "question": "Can I recover every old message on a new device?",
    "category": "privacy",
    "paragraphs": [
      "Only devices you authorise may use your private account. Recovering protected history depends on the right keys or backups being available in time. Missing encrypted history cannot be promised recoverable. Withdrawing a device and handling copies it already received are separate."
    ],
    "action": {
      "label": "Review devices & recoverable history",
      "destination": "devices"
    },
    "publicSources": [],
    "related": [
      "help",
      "legal",
      "connected-tools"
    ]
  },
  {
    "id": "publish-review",
    "question": "Does creating a draft publish it?",
    "category": "content",
    "paragraphs": [
      "No. A draft is separate from publication. Review the exact content, audience and destination before authorising it. Signing, media upload, relay acceptance and actual discoverability are different steps; an unclear or partial result must stay visible. Scheduled publication also needs its own time, time-zone and later-authorisation rules."
    ],
    "action": {
      "label": "Prepare a draft",
      "destination": "editor"
    },
    "publicSources": [],
    "related": [
      "community-publishing",
      "social-actions",
      "library"
    ]
  },
  {
    "id": "feed-choice",
    "question": "Can I browse a chronological feed instead of recommendations?",
    "category": "content",
    "paragraphs": [
      "Choose chronological browsing from your selected accessible sources, or other available following, community and topic views. Personalised recommendations are optional. You can adjust interests and exclude sources; recommendations must not hide your direct access to eligible originals or reveal private sources."
    ],
    "action": {
      "label": "Review your feed sources",
      "destination": "feed"
    },
    "publicSources": [],
    "related": [
      "nostr",
      "media",
      "ads"
    ]
  },
  {
    "id": "personality-permission",
    "question": "Are personality tests required, and who sees my results?",
    "category": "people",
    "paragraphs": [
      "Tests are optional. Taking a test, using it for matching and showing the result are separate choices. Each optional MBTI, OCEAN, Predictive Index or Enneagram result starts private. Control its matching use, purpose, recipients and disclosure separately, including duration and withdrawal. Matching without tests remains possible. Withdrawal affects future use; already authorised copies cannot be universally recalled."
    ],
    "action": {
      "label": "Review visibility & matching",
      "destination": "visibility"
    },
    "publicSources": [],
    "related": [
      "intro",
      "purpose",
      "presence"
    ]
  },
  {
    "id": "relationship-assistance",
    "question": "Does turning off Chuck’s relationship help remove a contact?",
    "category": "chuck",
    "paragraphs": [
      "No. Ongoing reminders, follow-ups and relationship assistance need the permission you choose for that relationship. Private-chat participation is separate. You can pause or end assistance without deleting the connection or chat. Nothing is automatically shared with the other person, booked or promised on your behalf."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [],
    "related": [
      "chuck",
      "control",
      "memory-control"
    ]
  },
  {
    "id": "memory-control",
    "question": "What does Chuck remember, and can I change it?",
    "category": "chuck",
    "paragraphs": [
      "Temporary task context, confirmed personal memory and permitted relationship facts are separate. You can review a saved memory and its purpose, correct it, restrict it or request forgetting. Source, consent, time and freshness must be honest. Original notes and business records stay separate; removing a local memory is not proof that every index, provider or independent copy was erased."
    ],
    "action": {
      "label": "Review what Chuck remembers",
      "destination": "memory"
    },
    "publicSources": [],
    "related": [
      "chuck",
      "control",
      "relationship-assistance"
    ]
  },
  {
    "id": "connected-tools",
    "question": "Does connecting an app authorise every action?",
    "category": "privacy",
    "paragraphs": [
      "No. Accounts and tools are connected individually for a stated purpose. Read access, drafts, changes, sending and paid actions are separate permissions. A premium service or badge does not authorise private email, calendars, files, contacts or conversations. You can inspect and withdraw relevant connections."
    ],
    "action": {
      "label": "Review your settings",
      "destination": "privacy"
    },
    "publicSources": [],
    "related": [
      "help",
      "legal",
      "devices-history"
    ]
  },
  {
    "id": "notifications-priority",
    "question": "Can I control when Chuck interrupts me?",
    "category": "privacy",
    "paragraphs": [
      "Yes. Your notification preferences and permissions control permitted interruptions. Notifications draw attention to permitted events; they do not authorise a message, purchase or booking. You control applicable sources, delivery preferences and quiet times. Urgent attention, discreet suggestions and summaries are different product priorities; actual device delivery has operating-system limits."
    ],
    "action": {
      "label": "Review notification preferences",
      "destination": "notifications"
    },
    "publicSources": [],
    "related": [
      "proactive-connections",
      "control",
      "calls-and-media"
    ]
  },
  {
    "id": "voice-control",
    "question": "Is my microphone always listening?",
    "category": "chuck",
    "paragraphs": [
      "No. Short voice input, a deliberately started live conversation and text have separate controls. The active microphone must be visible and stoppable. Microphone permission, recording, transcription, persistent storage and memory use are separate decisions; live voice alone is not permission to store everything or train a model."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [],
    "related": [
      "chuck",
      "control",
      "relationship-assistance"
    ]
  },
  {
    "id": "model-budget",
    "question": "Can I control AI models and spending?",
    "category": "chuck",
    "paragraphs": [
      "Your available AI models, resources and spending follow your actual permissions and limits. A higher-cost change needs the applicable authorisation. Core direct messaging, feed, profile, media and community controls should remain independent of AI quota. Changing a model does not widen data permissions or permit new external actions."
    ],
    "action": {
      "label": "Open Chuck",
      "destination": "chuck"
    },
    "publicSources": [],
    "related": [
      "control",
      "manual-access",
      "prices",
      "connected-tools"
    ]
  },
  {
    "id": "uncertain-action",
    "question": "Should I retry a payment or booking after a timeout?",
    "category": "plans",
    "paragraphs": [
      "First check its original status and evidence. A lost response may leave the outcome unknown even if an action happened. Do not blindly repeat a payment, booking or message. Keep confirmed steps, review unresolved ones and obtain permission for changed costs, recipients, terms or disclosures before a new action."
    ],
    "action": {
      "label": "Review original purchases",
      "destination": "activity-commerce"
    },
    "publicSources": [],
    "related": [
      "tasks",
      "plans",
      "map"
    ]
  },
  {
    "id": "purchase-access",
    "question": "Why can payment be confirmed but a purchased file unavailable?",
    "category": "plans",
    "paragraphs": [
      "Payment status, purchase eligibility, permission to view an original, actual file delivery and acquired usage rights are separate. A confirmed payment does not prove a file is reachable, and a missing file does not by itself erase a separately acquired right.",
      "Open the exact original receipt and current rights, media and expiry status. A content membership ending does not automatically remove separately permanent rights. Download or offline access is available only where both the actual capability and licence allow it.",
      "Do not pay again solely because media cannot load. Review the original with the responsible seller or provider; any alternative source or retry needs its own rights and current approval."
    ],
    "action": {
      "label": "Review original purchases",
      "destination": "activity-commerce"
    },
    "publicSources": [],
    "related": [
      "purchase-help",
      "uncertain-action",
      "library",
      "payment-methods"
    ]
  },
  {
    "id": "purchase-help",
    "question": "Who can refund a creator purchase?",
    "category": "plans",
    "paragraphs": [
      "The responsible seller or authorised payment provider handles a refund under the actual offer conditions, deadlines and transaction state. A support report is not a refund decision, payment reversal or restored content access.",
      "Keep the exact payment, original offer, receipt, rights, media status and expiry or withdrawal details together. Unresolved outcomes stay unresolved. Chuck may prepare permitted evidence, but it must not retry a payment, bypass rights or promise recovery.",
      "A confirmed Lightning payment is not simply reversed. A refund, if supported and authorised, is a separate process with its own recipient and evidence."
    ],
    "action": {
      "label": "Review original purchases",
      "destination": "activity-commerce"
    },
    "publicSources": [],
    "related": [
      "support-original",
      "purchase-access",
      "uncertain-action"
    ]
  },
  {
    "id": "analytics-privacy",
    "question": "Does a purchase reveal my private profile to a creator or place?",
    "category": "content",
    "paragraphs": [
      "A purchase, visit or membership does not automatically share your private profile, conversations, personality data or marketing permission with a creator or place. Payment identity must not silently be joined to an independent Nostr identity.",
      "Business reporting must distinguish observed figures, estimates and unavailable data and use sufficiently aggregated results to avoid identifying people. A relay connection is not proof of physical presence; analytics must not infer private cross-place profiles or claim exact global Nostr reach."
    ],
    "action": {
      "label": "Review your settings",
      "destination": "privacy"
    },
    "publicSources": [],
    "related": [
      "profile",
      "local-checkin",
      "connected-tools"
    ]
  },
  {
    "id": "moderation-limit",
    "question": "Can a place delete my personal identity or independent conversations?",
    "category": "people",
    "paragraphs": [
      "A place’s operator controls only its authorised community and services. A digital community restriction is separate from a physical house ban, your independent identity and your permitted private connections.",
      "Review the stated reason, affected scope, actual status and any available appeal or escalation route. An operator does not automatically control private conversations, other places or copies held by independent services."
    ],
    "action": {
      "label": "Review people & places",
      "destination": "connect"
    },
    "publicSources": [],
    "related": [
      "contact-requests",
      "support-original",
      "place-leaves"
    ]
  },
  {
    "id": "partner-benefits",
    "question": "Does my membership give access to every partner place?",
    "category": "membership",
    "paragraphs": [
      "A benefit needs a current verified offer and entitlement for the receiving partner. Review who provides it, its validity, conditions, any additional cost and the minimum information needed to prove eligibility.",
      "The receiving provider still confirms capacity, access and any booking. A badge or benefit is not a reservation or proof that you are on site; membership at one place does not automatically grant membership, visibility or service access at another."
    ],
    "action": {
      "label": "Review badges & memberships",
      "destination": "memberships"
    },
    "publicSources": [],
    "related": [
      "prices",
      "plans",
      "community-entry"
    ]
  },
  {
    "id": "lost-device",
    "question": "What should I do if I lose a device or suspect misuse?",
    "category": "privacy",
    "paragraphs": [
      "Review your devices, current sessions and permissions. Use the security controls to pause authorised agent activity where available and report suspected misuse. These controls do not require an AI conversation.",
      "Device/session access, signer access, independent identity keys, wallet recovery and delegated actions are separate. Locking or withdrawing one does not automatically secure or recover all the others.",
      "Withdrawing access cannot recall all copies already received, reverse a confirmed payment or remove every published event. Lost keys or encrypted history are not guaranteed recoverable; keep the original evidence and use the responsible source’s recovery process."
    ],
    "action": {
      "label": "Review security & recovery",
      "destination": "security"
    },
    "publicSources": [],
    "related": [
      "devices-history",
      "connected-tools",
      "leave-export"
    ]
  },
  {
    "id": "verification-badges",
    "question": "Does a badge guarantee that a person or seller is safe?",
    "category": "membership",
    "paragraphs": [
      "A badge alone does not guarantee identity or a safe person or seller. Paid status, control of a Nostr key, proof of a domain identifier, an authorised operator role and optional personal verification mean different things.",
      "Check what a specific status actually proves. Pseudonyms remain possible, and neither a badge nor verification automatically authorises a private introduction, disclosure, purchase or business action."
    ],
    "action": {
      "label": "Open your profile",
      "destination": "profile"
    },
    "publicSources": [],
    "related": [
      "profile",
      "prices",
      "contact-requests"
    ]
  },
  {
    "id": "leave-export",
    "question": "What can I take with me if I leave CRAYS?",
    "category": "privacy",
    "paragraphs": [
      "Before leaving, review subscriptions and services, ongoing Chuck tasks, community access, permissions, private data, funds and records that must remain with their original sources. A closure review is not automatic cancellation of each source.",
      "Eligible exports may include your own records and rights evidence, not unrestricted copies of other people’s private information or redistribution rights to purchased media. An export does not guarantee that another app or agent can import everything.",
      "Deletion, restricted processing, pending review and deletion not possible are different outcomes. Only an actual responsible-source confirmation can establish a completed operation. Your independent Nostr identity and public copies are separate; the local closure preview does not erase those services."
    ],
    "action": {
      "label": "Review account consequences",
      "destination": "closure"
    },
    "publicSources": [],
    "related": [
      "library",
      "connected-tools",
      "memory-control",
      "lost-device"
    ]
  },
  {
    "id": "studio-separate",
    "question": "Does my personal account let me manage a place or creator business?",
    "category": "ecosystem",
    "paragraphs": [
      "A personal account, visit, purchase or badge does not give you permission to manage a creator business or place. Publishing, offers, staff roles and business data need their own current authority for the correct organisation and place.",
      "Independent Spot self-service and a CRAYS franchise are different arrangements. Running a Spot requires legitimate operator authority and its actual contract or subscription. Personal Chuck and an operator’s business assistant do not automatically share permissions or private data.",
      "Public business information is educational here; it does not mean the operator workspace or every connected business service is available in this personal preview."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "franchise",
      "spots",
      "verification-badges"
    ]
  },
  {
    "id": "same-product",
    "question": "Why does the web layout differ from the app?",
    "category": "start",
    "paragraphs": [
      "The desktop and notebook layout uses available space for adjacent conversations, reading and task views. The intended identity, permissions, original records and core functions stay part of one CRAYS product.",
      "Different layouts do not themselves prove that every device has synchronised state. A device change does not start a microphone, camera, signature or new data-sharing permission. Actual recovery and synchronisation depend on the supported platform and source state."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "return-context",
      "devices-history",
      "manual-access"
    ]
  },
  {
    "id": "full-originals",
    "question": "Can I open the complete article, discussion or media?",
    "category": "content",
    "paragraphs": [
      "Open an original to use its appropriate reading, thread, gallery or player controls directly. Available actions still depend on your current rights. Returning should preserve eligible reading or playback context where supported; a saved link does not restore deleted or inaccessible media."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "nostr",
      "media",
      "ads"
    ]
  },
  {
    "id": "social-actions",
    "question": "Do social actions need Chuck or give extra access?",
    "category": "content",
    "paragraphs": [
      "Supported replies, follows, reactions, reposts, bookmarks and sharing are available directly. Chuck assistance is optional. Before a public or financial action, review its destination or recipient, amount if applicable, audience and consequences. A model response is not a signed event or payment confirmation, and an interaction does not unlock private content."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "nostr",
      "media",
      "ads"
    ]
  },
  {
    "id": "matching-search-scope",
    "question": "Who can appear in a people search?",
    "category": "people",
    "paragraphs": [
      "The permitted search scope can be a current local place, your accessible communities or authorised business contacts. Each person and data field still needs permission for the chosen purpose. Local discovery needs current local presence and purpose visibility; you cannot remotely inspect unknown people at a place. Public Nostr discovery is a different activity."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "intro",
      "purpose",
      "presence"
    ]
  },
  {
    "id": "matching-reasons",
    "question": "Why is a person recommended to me?",
    "category": "people",
    "paragraphs": [
      "A recommendation should explain relevant permitted context such as your current purpose, shared interests, complementary needs, availability or an allowed community connection. Optional tests are only additional separate sources. There is no invented psychological profile or unsupported compatibility percentage, and a recommendation is not consent to contact."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "intro",
      "purpose",
      "presence"
    ]
  },
  {
    "id": "proactive-connections",
    "question": "When may Chuck suggest a new connection?",
    "category": "people",
    "paragraphs": [
      "Proactive suggestions require your permission for the purpose and search scope. You can control when, where, frequency and channel, pause them or turn them off. A suggestion does not send a message or make an introduction, and expired local presence must not keep producing claims that you are there."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "intro",
      "purpose",
      "presence"
    ]
  },
  {
    "id": "task-stop-effects",
    "question": "Does stopping a Chuck task cancel a booking or payment?",
    "category": "plans",
    "paragraphs": [
      "No. A task can show work in progress, waiting for your decision, paused, completed, failed or uncertain. Pausing or stopping agent work does not automatically reverse an action already completed at its source. Review the original booking, payment or message and its actual confirmation separately."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "tasks",
      "plans",
      "map"
    ]
  },
  {
    "id": "action-evidence",
    "question": "Where can I see what Chuck actually did?",
    "category": "plans",
    "paragraphs": [
      "Review the task result and its permitted original evidence: status, time, relevant service, applicable approval and available confirmation or receipt. Prepared, awaiting approval, sent or requested, confirmed, failed and cancelled are different states. A model answer or estimated cost is not proof of an executed payment or confirmed booking."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "tasks",
      "plans",
      "map"
    ]
  },
  {
    "id": "parallel-decisions",
    "question": "Does one unanswered decision stop every task?",
    "category": "plans",
    "paragraphs": [
      "Only the waiting step and work that depends on it should pause. Other independent, permitted work can continue after checking rights and conflicts. Your decision applies only to its stated scope and context; no response is never consent. You can review pending decisions or pause the relevant task."
    ],
    "action": null,
    "publicSources": [],
    "related": [
      "tasks",
      "plans",
      "map"
    ]
  },
  {
    "id": "wave-nearby",
    "question": "Where can I find Wave Nearby, and what does it share?",
    "category": "people",
    "paragraphs": [
      "Open VIFs and choose Wave Nearby in the conversation list. Wave is a voluntary way to say hello to people who choose the same purpose: Socializing, Business or Dating. It is separate from a Spot check-in and your other visibility settings.",
      "In this local preview, you choose a purpose and turn Wave on for a 15-minute sample session, with a visible timer and a Turn off control. This is not a general venue-presence duration. Bluetooth and offline transport are not connected, and the example profiles do not contact a real person.",
      "An incoming Wave can be accepted or declined. An outgoing Wave waits for the other person and can be withdrawn. A Wave conversation opens only after both consents remain valid. Blocking, ending or expiry stops eligible continuation; a previous-history entry does not renew a session. Chuck is not automatically included."
    ],
    "action": {
      "label": "Open Wave Nearby",
      "destination": "wave"
    },
    "publicSources": [],
    "related": [
      "local-checkin",
      "intro",
      "contact-requests"
    ]
  },
  {
    "id": "chat-options",
    "question": "What is in the conversation’s three-dot menu?",
    "category": "people",
    "paragraphs": [
      "Open the three-dot menu in the selected conversation. Depending on the conversation and your rights, it includes contact information, message search and selection, notification mute, disappearing-message preferences, chat design, favourites and your private chat lists.",
      "You can also review chat export, close the reading pane, prepare a call link or group call, report or block a person, and review local clear or delete controls. More conversation tools keeps the original additional controls reachable. Agent and group conversations have different permitted options.",
      "Closing a pane is not deleting history. A local clear, delete, timer or export does not prove deletion of copies on other devices or services. Report and block have their own source-specific review and do not silently publish private messages."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "messenger-find",
      "message-selection",
      "chat-export",
      "shared-content",
      "call-links",
      "chuck-chat-consent"
    ]
  },
  {
    "id": "shared-content",
    "question": "Where are a chat’s shared photos, files and links?",
    "category": "people",
    "paragraphs": [
      "Use a conversation’s contact information or More conversation tools to open Shared content. Search and the available media filters help find permitted pictures, videos, files, links, articles and original posts.",
      "Open the exact original to inspect it and return to your previous context. An empty result, inaccessible or expired item, withdrawn access and an unavailable file are different states. Exporting or saving a reference does not create new access or ownership."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "messenger-find",
      "library",
      "purchase-access"
    ]
  },
  {
    "id": "call-links",
    "question": "Does preparing a call link start or send a call?",
    "category": "people",
    "paragraphs": [
      "From the conversation menu, review Send call link or New group call. Choose the intended voice or video mode and the permitted people before preparing a request. A prepared link is not a connected call or an automatically sent invitation.",
      "The local preview distinguishes active, expired, withdrawn and needs-review link states and individual participant responses. These examples do not start an operating-system call, open the camera or microphone, or prove an external person received an invitation."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "calls-and-media",
      "chuck-chat-consent",
      "devices-history"
    ]
  },
  {
    "id": "support-original",
    "question": "How do I keep a support request connected to the right original?",
    "category": "plans",
    "paragraphs": [
      "For a booking, payment, purchase or access problem, open support from the exact original where possible. Review the responsible party, affected item, original payment, rights and media status separately. If several payments match, choose the exact one rather than guessing.",
      "Add your description and the scope of the issue using text or the available voice control. A support report does not grant a refund, make a second payment, restore media or give new access to a private original.",
      "In this local preview, submission and Check this sample ticket only save or update an own example record. They do not contact a provider, confirm delivery or supply a real support response."
    ],
    "action": {
      "label": "Report a problem",
      "destination": "support-report"
    },
    "publicSources": [],
    "related": [
      "purchase-help",
      "purchase-access",
      "uncertain-action"
    ]
  },
  {
    "id": "spot-services",
    "question": "Can I contact a place or request a service without Chuck?",
    "category": "people",
    "paragraphs": [
      "Open the place’s services or relevant department to see what that operator actually offers and to communicate directly where supported. Chuck can help prepare a request, but you can use the direct controls yourself.",
      "A request for a table, stay, activity or other service is not confirmation. Availability, capacity, price, conditions, payment and final provider response remain specific to the original offer. Not every Spot has the same services."
    ],
    "action": {
      "label": "Discover places",
      "destination": "spots-discover"
    },
    "publicSources": [],
    "related": [
      "spots",
      "plans",
      "community-entry"
    ]
  },
  {
    "id": "payment-methods",
    "question": "Which payment method can I use?",
    "category": "membership",
    "paragraphs": [
      "Payment methods depend on the exact offer, your connected wallet or approved payment source and current availability. Bitcoin or Lightning support, an authorised card flow and any separately validated optional method do not imply that every seller supports every method.",
      "Review the actual recipient, amount, source fees and confirmation state. No general exchange rate, fee-free transaction, automatic refund or transfer permission follows from connecting a wallet."
    ],
    "action": {
      "label": "Review wallets & accounts",
      "destination": "wallets"
    },
    "publicSources": [],
    "related": [
      "wallet",
      "purchase-help",
      "purchase-access"
    ]
  },
  {
    "id": "message-selection",
    "question": "What happens when I reply to, forward or remove selected messages?",
    "category": "people",
    "paragraphs": [
      "Use Select messages in the conversation menu to review particular permitted messages. The selection has its own reply, forward, export and local-remove actions; it is different from exporting the whole conversation.",
      "A prepared reply or forward is not automatically sent. Review the exact selected words, their original authors, the recipient and any existing unsent draft before continuing. Local removal applies to the selected preview copies; it does not delete the sender’s original or every external copy."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "chat-options",
      "chat-export",
      "messenger-find"
    ]
  },
  {
    "id": "chat-export",
    "question": "Is exporting a chat the same as exporting selected messages?",
    "category": "people",
    "paragraphs": [
      "Choose Export chat to review the whole eligible conversation, or export only selected messages from the selection tools. Review the available format and included content before creating a local download.",
      "An export retains only what the source and your current rights actually provide. It does not recover missing keys, recreate unavailable media, grant redistribution rights or move another person’s private history into Chuck. Cancelling the review does not send or export anything."
    ],
    "action": {
      "label": "Open your VIFs",
      "destination": "vifs"
    },
    "publicSources": [],
    "related": [
      "message-selection",
      "shared-content",
      "leave-export"
    ]
  }
];
