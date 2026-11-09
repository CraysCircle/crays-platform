export const searchTrust = [
  {
    title: "Local Crays support",
    text: "A Forest City-based Crays contact helps with arrival, handover and stay questions.",
  },
  {
    title: "Availability first",
    text: "Each request is checked before payment so guests move forward with clear terms.",
  },
  {
    title: "Clear hotel details",
    text: "Access, stay lengths, from-rates and hotel facilities are presented in one clear place.",
  },
  {
    title: "Saved stay flow",
    text: "Account, Wish List, Cart and Booking Request stay connected from search to the request.",
  },
] as const;

export const searchPromos = [
  {
    title: "Longer Forest City stays",
    text: "Compare hotel access, stay lengths and available from-rates before availability is checked.",
    href: "/en/search?destination=Forest+City",
  },
  {
    title: "Book and relax",
    text: "Crays confirms availability, guest fit and final pricing before the request moves forward.",
    href: "/en/search?attribute=flexible",
  },
  {
    title: "Forest City properties",
    text: "Use destination, dates, guests, filters and the map to explore the two Forest City hotels.",
    href: "/en/search",
  },
] as const;

export const searchDestinations = [
  {
    title: "Forest City Marina Hotel",
    queryValue: "Forest City Marina Hotel",
    text: "Membership access and monthly stays.",
  },
  {
    title: "Forest City Golf Hotel",
    queryValue: "Forest City Golf Hotel",
    text: "Public night, week and month stays.",
  },
  {
    title: "Forest City waterfront",
    queryValue: "Forest City",
    text: "Hotel discovery around the Forest City waterfront.",
  },
  {
    title: "Legacy Golf Course",
    queryValue: "Forest City Golf Hotel",
    text: "Golf-side Forest City hospitality.",
  },
] as const;

export const searchCollections = [
  {
    title: "Public hotel stays",
    queryValue: "public-hotel",
    text: "Open discovery for the Forest City Golf Hotel.",
  },
  {
    title: "Member monthly stays",
    queryValue: "member-monthly",
    text: "Membership and admission are checked separately.",
  },
  {
    title: "Golf hospitality",
    queryValue: "golf-hotel",
    text: "Night, week and month stay intent.",
  },
  {
    title: "Marina hospitality",
    queryValue: "marina-hotel",
    text: "Monthly member stay intent.",
  },
] as const;

export const forestCityHighlights = [
  {
    title: "Stay",
    text: "Forest City Marina Hotel on Pulau Satu and Forest City Golf Hotel anchor the current CRAYS property discovery.",
  },
  {
    title: "Golf and recreation",
    text: "The golf resort has two 18-hole courses, while the hotels include pools, gyms, dining and event spaces.",
  },
  {
    title: "Regional access",
    text: "Forest City is positioned close to the Malaysia-Singapore Second Link, with road access to the Sultan Abu Bakar CIQ.",
  },
] as const;

export const forestCityFacts = [
  "Pulau Satu is the central developed island within Forest City's four-island masterplan.",
  "Forest City Golf Resort has the Jack Nicklaus Legacy Course and LGK Classic Course.",
  "Forest City International School operates on Jalan Forest City 9.",
  "Invest Malaysia Facilitation Centre Johor operates from Pulau Satu.",
] as const;

export const forestCityZoneBenefits = [
  {
    title: "Approved business projects",
    text: "Qualifying Global Services Hub and service-relocation projects may receive a 5% corporate tax rate, subject to approval, substance and annual compliance requirements.",
    sourceHref:
      "https://www.mida.gov.my/forms-and-guidelines/fcsfz-tax-incentive-package/",
    sourceLabel: "MIDA FCSFZ guidance",
  },
  {
    title: "Single Family Office framework",
    text: "Qualifying Single Family Office Vehicles on Pulau Satu may receive a 0% income-tax rate for up to 10 + 10 years, subject to SC approval and annual certification.",
    sourceHref:
      "https://www.sc.com.my/development/single-family-office/single-family-office-sfo-tax-incentive",
    sourceLabel: "Securities Commission Malaysia",
  },
  {
    title: "Investor facilitation",
    text: "IMFC-J in Forest City coordinates investor enquiries and location confirmation across participating Johor and federal agencies.",
    sourceHref:
      "https://www.mida.gov.my/media-release/imfc-j-to-drive-realisation-of-investments-into-js-sez-streamlining-facilitation-processes-for-investors/",
    sourceLabel: "MIDA IMFC-J",
  },
] as const;

export const editorialArticles = [
  {
    title: "Why a Crays Forest City stay?",
    text: "Compare public and member-only access, stay lengths, available from-rates and hotel information before availability is checked.",
  },
  {
    title: "Collections for different stay types",
    text: "Guests can enter through public hotel stays, monthly member stays, golf hospitality and marina hospitality.",
  },
  {
    title: "Search, map and detail pages",
    text: "The journey starts with search and the map, then moves into a hotel page with photography, amenities, dining, location and stay-request steps.",
  },
  {
    title: "Plan with clear stay information",
    text: "Review hotel access, amenities, dining, meetings, room categories and stay conditions before opening the booking steps.",
  },
] as const;

export const searchReviews: ReadonlyArray<{
  byline: string;
  score: string;
  text: string;
}> = [];

export const searchFaq = [
  {
    question: "How does a Crays property request work?",
    answer:
      "Choose dates, guests and relevant filters, then review Dates, Guests, Services and Request. The final request remains unavailable until live availability and booking are connected.",
  },
  {
    question: "Is the price shown on search already the final booking price?",
    answer:
      "No. Search shows a provisional from-rate for the stated stay length. Availability, services, taxes, the total, deposit and payment are checked separately.",
  },
  {
    question: "What happens after I send a request?",
    answer:
      "Request submission is not available yet, so the page never claims that a request, reservation or message has been sent.",
  },
  {
    question: "When do I pay?",
    answer:
      "No payment step is active yet. Payment timing and terms appear only with a final quote.",
  },
  {
    question: "Can I change or cancel my request?",
    answer:
      "No request or booking is created by the current flow. Hotel-direct policies are information only and are not presented as CRAYS booking terms.",
  },
  {
    question:
      "Are pets, children and special services guaranteed by the filter?",
    answer:
      "No. Filters record your preferences but do not guarantee a hotel match, availability or a service.",
  },
  {
    question: "Why book through Crays instead of a generic marketplace?",
    answer:
      "Crays combines Forest City hotel discovery, clear stay information, guest assistance and a request-first booking journey.",
  },
] as const;

export const exploreCards = [
  {
    title: "Destinations",
    text: "Browse Forest City properties.",
    href: "/en/search",
  },
  {
    title: "Inspiration",
    text: "Lifestyle, hospitality and Crays context.",
    href: "/en/lifestyle",
  },
  {
    title: "Contact",
    text: "Talk to Crays before your request.",
    href: "/en/contact",
  },
  {
    title: "Forest City hospitality",
    text: "See the two Forest City hotel settings.",
    href: "/en/hospitality",
  },
] as const;

export const filterGroups = [
  {
    title: "Popular",
    items: [
      "Free parking",
      "Wi-Fi",
      "TV",
      "Air conditioning",
      "Hot tub",
      "Iron",
    ],
  },
  {
    title: "Essentials",
    items: [
      "Kitchen",
      "Washer",
      "Dryer",
      "Heating",
      "Dedicated workspace",
      "Hair dryer",
    ],
  },
  {
    title: "Features",
    items: [
      "Pool",
      "EV charger",
      "Crib",
      "King bed",
      "Gym",
      "BBQ grill",
      "Breakfast",
      "Indoor fireplace",
      "Smoking allowed",
    ],
  },
  {
    title: "Location",
    items: ["Waterfront", "Beach nearby", "Sea view", "Golf nearby"],
  },
  { title: "Safety", items: ["Smoke alarm", "Carbon monoxide alarm"] },
  {
    title: "Booking options",
    items: [
      "Instant request",
      "Self check-in",
      "Allows pets",
      "Flexible arrival",
    ],
  },
  { title: "Standout stays", items: ["Crays favorite", "Luxe"] },
  {
    title: "Property type",
    items: ["Hotel", "Golf hotel", "Marina hotel"],
  },
  {
    title: "Accessibility features",
    items: [
      "Step-free access",
      "Disabled parking spot",
      "Wider entrance",
      "Step-free bedroom access",
      "Step-free bathroom access",
      "Shower grab bar",
    ],
  },
  {
    title: "Host language",
    items: ["English", "Malay", "Mandarin"],
  },
] as const;
