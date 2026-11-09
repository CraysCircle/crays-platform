import type {
  CraysFamilyLocale,
  FamiliesShellCopy,
} from "../journeys-phase8/families-copy";

export type LifestyleLocale = CraysFamilyLocale;

export const lifestyleLocales: readonly LifestyleLocale[] = [
  "en", "de", "es", "ca", "fr", "pt", "it",
];

type Card = {
  kicker: string;
  title: string;
  body: string;
  href?: string;
  external?: boolean;
};

type Stage = {
  marker: string;
  title: string;
  body: string;
};

type MediaItem = {
  label: string;
  media: "community" | "work" | "studio" | "food" | "blocked";
};

export type LifestyleCopy = {
  localeName: string;
  metadata: { title: string; description: string };
  shell: FamiliesShellCopy;
  firstHero: {
    eyebrow: string;
    title: string;
    body: string;
    ctas: readonly [string, string, string];
    signals: readonly string[];
  };
  anchors: readonly string[];
  layer: { eyebrow: string; title: string; body: string; cards: readonly Card[] };
  rhythm: {
    eyebrow: string;
    title: string;
    stages: readonly Stage[];
    outcome: string;
    mood: string;
  };
  feed: { eyebrow: string; title: string; body: string; stages: readonly Stage[] };
  doors: { eyebrow: string; title: string; cards: readonly Card[] };
  build: {
    eyebrow: string;
    title: string;
    body: string;
    ctas: readonly [string, string, string];
    values: readonly string[];
  };
  secondHero: {
    eyebrow: string;
    title: string;
    body: string;
    ctas: readonly [string, string];
    signals: readonly Card[];
    media: readonly MediaItem[];
  };
  architecture: {
    title: string;
    body: string;
    media: readonly MediaItem[];
    pillars: readonly Card[];
  };
  founder: { eyebrow: string; title: string; body: string; cards: readonly Card[]; media: readonly MediaItem[] };
  world: { eyebrow: string; title: string; body: string; cards: readonly Card[]; media: readonly MediaItem[] };
  ecosystem: { eyebrow: string; title: string; body: string; cards: readonly Card[]; media: readonly MediaItem[] };
  social: { eyebrow: string; title: string; body: string; stages: readonly Stage[]; media: readonly MediaItem[] };
  creators: { eyebrow: string; title: string; body: string; cards: readonly Card[] };
  seeking: {
    eyebrow: string;
    title: string;
    body: string;
    ctas: readonly [string, string];
    cards: readonly Card[];
  };
  vision: {
    eyebrow: string;
    title: string;
    body: string;
    closing: string;
    ctas: readonly [string, string];
  };
  mediaBlocked: string;
  mediaBlockedDetail: string;
  credits: string;
};

const shellBase: FamiliesShellCopy = {
  skip: "Skip to Lifestyle content",
  primaryNav: "Primary navigation",
  about: "About Us",
  lifestyle: "Lifestyle",
  hospitality: "Hospitality",
  community: "Community Life",
  families: "Families",
  membership: "Become a Member",
  ambassadors: "Ambassadors",
  teams: "Teams",
  events: "Events",
  conference: "Conference",
  companies: "Portfolio Companies",
  brandService: "Brand as a Service",
  contact: "Contact",
  account: "Account",
  legal: "Legal",
  menu: "Menu",
  close: "Close",
  association: "CRAYS Business Club Association",
  associationNote: "External association website",
  footerLine: "Meet friends, colleagues and business partners in the new Crays Club world.",
  siteNote: "The official Clubs website is www.craysclub.com.",
  footerNav: "Footer navigation",
};

const shells: Record<LifestyleLocale, FamiliesShellCopy> = {
  en: shellBase,
  de: {
    ...shellBase,
    skip: "Zum Lifestyle-Inhalt springen", primaryNav: "Hauptnavigation",
    about: "Über uns", hospitality: "Hospitality", community: "Community Life",
    families: "Familien", membership: "Mitglied werden", conference: "Konferenz",
    companies: "Portfolio-Unternehmen", contact: "Kontakt", account: "Konto",
    legal: "Rechtliches", menu: "Menü", close: "Schließen",
    associationNote: "Externe Website des Vereins",
    footerLine: "Triff Freunde, Kollegen und Geschäftspartner in der neuen Crays Club Welt.",
    siteNote: "Die offizielle Clubs-Website ist www.craysclub.com.",
    footerNav: "Footer-Navigation",
  },
  es: {
    ...shellBase,
    skip: "Ir al contenido Lifestyle", primaryNav: "Navegación principal",
    about: "Quiénes somos", hospitality: "Hospitalidad", community: "Vida en comunidad",
    families: "Familias", membership: "Hazte miembro", ambassadors: "Embajadores",
    teams: "Equipos", events: "Eventos", conference: "Conferencia",
    companies: "Empresas del portafolio", contact: "Contacto", account: "Cuenta",
    menu: "Menú", close: "Cerrar", associationNote: "Sitio externo de la asociación",
    footerLine: "Conoce a amigos, colegas y socios de negocio en el nuevo mundo Crays Club.",
    siteNote: "El sitio oficial de Clubs es www.craysclub.com.",
    footerNav: "Navegación del pie",
  },
  ca: {
    ...shellBase,
    skip: "Ves al contingut Lifestyle", primaryNav: "Navegació principal",
    about: "Qui som", hospitality: "Hospitalitat", community: "Vida en comunitat",
    families: "Famílies", membership: "Fes-te membre", ambassadors: "Ambaixadors",
    teams: "Equips", events: "Esdeveniments", conference: "Conferència",
    companies: "Empreses de cartera", contact: "Contacte", account: "Compte",
    menu: "Menú", close: "Tanca", associationNote: "Web externa de l'associació",
    footerLine: "Coneix amistats, col·legues i socis de negoci en el nou món Crays Club.",
    siteNote: "El web oficial de Clubs és www.craysclub.com.",
    footerNav: "Navegació del peu",
  },
  fr: {
    ...shellBase,
    skip: "Aller au contenu Lifestyle", primaryNav: "Navigation principale",
    about: "À propos", lifestyle: "Art de vivre", hospitality: "Hospitalité",
    community: "Vie de communauté", families: "Familles", membership: "Devenir membre",
    ambassadors: "Ambassadeurs", teams: "Équipes", events: "Événements",
    conference: "Conférence", companies: "Sociétés du portefeuille",
    contact: "Contact", account: "Compte", legal: "Mentions légales",
    close: "Fermer", associationNote: "Site externe de l'association",
    footerLine: "Rencontrez amis, collègues et partenaires dans le nouvel univers Crays Club.",
    siteNote: "Le site officiel des Clubs est www.craysclub.com.",
    footerNav: "Navigation de pied de page",
  },
  pt: {
    ...shellBase,
    skip: "Ir para o conteúdo Lifestyle", primaryNav: "Navegação principal",
    about: "Sobre nós", lifestyle: "Estilo de vida", hospitality: "Hospitalidade",
    community: "Vida em comunidade", families: "Famílias", membership: "Tornar-se membro",
    ambassadors: "Embaixadores", teams: "Equipas", events: "Eventos",
    conference: "Conferência", companies: "Empresas do portefólio",
    contact: "Contacto", account: "Conta", menu: "Menu", close: "Fechar",
    associationNote: "Site externo da associação",
    footerLine: "Encontre amigos, colegas e parceiros de negócio no novo mundo Crays Club.",
    siteNote: "O site oficial dos Clubs é www.craysclub.com.",
    footerNav: "Navegação do rodapé",
  },
  it: {
    ...shellBase,
    skip: "Vai al contenuto Lifestyle", primaryNav: "Navigazione principale",
    about: "Chi siamo", hospitality: "Ospitalità", community: "Vita di comunità",
    families: "Famiglie", membership: "Diventa membro", ambassadors: "Ambassador",
    teams: "Team", events: "Eventi", conference: "Conferenza",
    companies: "Società in portafoglio", contact: "Contatti",
    close: "Chiudi", associationNote: "Sito esterno dell'associazione",
    footerLine: "Incontra amici, colleghi e partner commerciali nel nuovo mondo Crays Club.",
    siteNote: "Il sito ufficiale dei Clubs è www.craysclub.com.",
    footerNav: "Navigazione del footer",
  },
};

export const lifestyleCopy: Record<LifestyleLocale, LifestyleCopy> = {
  en: {
    localeName: "English",
    metadata: {
      title: "Lifestyle | CRAYS Clubs",
      description: "The real-world operating layer for people who move: membership, hospitality, work, culture and community.",
    },
    shell: shells.en,
    firstHero: {
      eyebrow: "Crays Lifestyle",
      title: "The real-world operating layer for people who move.",
      body: "Crays connects membership, hospitality, work, culture, villas, payments and community into one recognizable lifestyle system for builders, creators, founders and global citizens.",
      ctas: ["Become a Member", "Explore stays", "Talk to Crays"],
      signals: ["Member Identity", "Venue Super Node", "Value Payments"],
    },
    anchors: ["Layer Map", "Daily Rhythm", "Crays Doors", "Build With Us"],
    layer: {
      eyebrow: "Layer Map",
      title: "Not another lifestyle page. A live map of the Crays ecosystem.",
      body: "The brand has four visible forces: the Association governs the shared IP, the Fund structures capital and real estate, World turns venues into smart local nodes, and Club makes the lifestyle tangible.",
      cards: [
        { kicker: "01", title: "Association", body: "Builders, makers, governance and shared brand IP.", href: "https://www.crays.org/", external: true },
        { kicker: "02", title: "Fund", body: "Real estate, wealth, villa infrastructure and portfolio logic.", href: "https://www.crays.fund/", external: true },
        { kicker: "03", title: "World", body: "Web5 hospitality, Nostr app, Super Nodes and payments.", href: "https://www.crays.world/", external: true },
        { kicker: "04", title: "Club", body: "Work, live, play, events, lounges and real rooms.", href: "hospitality" },
      ],
    },
    rhythm: {
      eyebrow: "Daily Rhythm",
      title: "One day should feel connected from first coffee to the last room.",
      stages: [
        { marker: "Morning", title: "Work signal", body: "Coffee, focus, local context and the right people nearby." },
        { marker: "Midday", title: "Club base", body: "Meetings, calls, service and a place that feels known." },
        { marker: "Evening", title: "Hosted culture", body: "Dinners and introductions that turn movement into belonging." },
        { marker: "Night", title: "Venue graph", body: "The room becomes visible: mood, intent, services and payments." },
      ],
      outcome: "Outcome · Less platform noise. More real activity.",
      mood: "Mood + intent · Social, work, creator, guest",
    },
    feed: {
      eyebrow: "From Feed To Room",
      title: "The interface should disappear into the place.",
      body: "Crays is strongest when the digital layer coordinates an actual outcome: arrive, match, reserve, order, pay, meet, stay or build. That is the lifestyle promise across Club, World, Fund and Association.",
      stages: [
        { marker: "01", title: "Arrive", body: "Venue context appears before the room feels anonymous." },
        { marker: "02", title: "Match", body: "People, purpose and proximity become useful signals." },
        { marker: "03", title: "Settle", body: "Payments and service stay close to the venue relationship." },
      ],
    },
    doors: {
      eyebrow: "Crays Doors",
      title: "Choose the door that creates real movement.",
      cards: [
        { kicker: "Member", title: "Enter the lifestyle layer", body: "Membership, access, social rhythm and recurring places.", href: "become-a-member" },
        { kicker: "Villas", title: "Book or request a stay", body: "Curated luxury properties with Crays hospitality logic.", href: "hospitality" },
        { kicker: "Venue", title: "Bring Crays to a room", body: "Super Nodes, app logic, payments and guest activation.", href: "https://www.crays.world/", external: true },
        { kicker: "Capital", title: "Understand the asset layer", body: "Luxury short-term rental real estate and investment infrastructure.", href: "https://www.crays.fund/", external: true },
      ],
    },
    build: {
      eyebrow: "Build With Us",
      title: "Bring what fits the values. Build what creates real activity.",
      body: "Venue, community, product, ownership and responsibility are not separate slogans. They are the filter for what belongs inside Crays.",
      ctas: ["Start Project Intake", "Hospitality Alliance", "Contact"],
      values: ["Venue", "Community", "Product", "Ownership", "Responsibility"],
    },
    secondHero: {
      eyebrow: "Crays Lifestyle",
      title: "Work, live, play and belong in one Crays layer.",
      body: "Crays turns mobility into a lifestyle system: real places, trusted people, hospitality routines and digital access for builders, makers, creators, founders and global citizens.",
      ctas: ["Become a Member", "Explore the model"],
      signals: [
        { kicker: "People", title: "Builders, makers and global citizens", body: "" },
        { kicker: "Places", title: "Clubs, villas, lounges and city bases", body: "" },
        { kicker: "Layer", title: "Access, identity, events and payments", body: "" },
      ],
      media: [
        { label: "Work ready", media: "work" },
        { label: "Social energy", media: "community" },
        { label: "Global rhythm", media: "blocked" },
      ],
    },
    architecture: {
      title: "Not a feed. A real-world lifestyle architecture.",
      body: "The digital layer should move people into rooms, villas, clubs, dinners, workspaces and shared opportunities.",
      media: [
        { label: "City", media: "work" },
        { label: "Community", media: "community" },
        { label: "Dinner", media: "food" },
        { label: "Living", media: "blocked" },
        { label: "Culture", media: "studio" },
      ],
      pillars: [
        { kicker: "Community", title: "People who build and move", body: "Members, guests, creators, founders, operators and partners meet around useful places, not passive feeds." },
        { kicker: "Lifestyle", title: "Work, live and play together", body: "Hospitality, work routines, dinners, villas, clubs and events are designed as one recognizable experience." },
        { kicker: "Technology", title: "Digital access with real-world outcomes", body: "Identity, bookings, payments, recommendations and community signals should end in actual meetings and activity." },
      ],
    },
    founder: {
      eyebrow: "Founder motivation",
      title: "A lifestyle system born from years on the road.",
      body: "The Crays idea comes from a simple observation: travel became easy, remote work became normal, but belonging did not become easier. People can move faster than ever, yet they still need places where work, trust, recovery and friendship can happen naturally.",
      cards: [
        { kicker: "Missing piece", title: "Real connection", body: "Mobility creates reach, but real value starts when people know where to arrive and whom to meet." },
        { kicker: "Answer", title: "Smart local hubs", body: "Crays spaces turn clubs, villas, lounges and partner venues into repeatable community nodes." },
        { kicker: "Operating model", title: "Useful hospitality", body: "Beautiful places matter, but service, access, routines and local intelligence make them work." },
        { kicker: "Outcome", title: "Belonging at speed", body: "Members can enter new places faster without feeling like every stay starts from zero." },
      ],
      media: [
        { label: "Movement", media: "work" },
        { label: "Trust", media: "community" },
        { label: "Recovery", media: "food" },
      ],
    },
    world: {
      eyebrow: "The world we want",
      title: "Freedom needs ownership, dignity and useful places.",
      body: "Crays connects personal freedom with real-world infrastructure: places to stay, work and meet, plus digital rails for identity, access, payments and participation. The vision is not luxury as decoration. It is luxury as reliability, privacy, quality and human proximity.",
      cards: [
        { kicker: "Ownership", title: "Keep more control", body: "Identity, memberships, access and participation should become more portable and less dependent on closed platforms." },
        { kicker: "Privacy", title: "Respect the guest", body: "High-quality hospitality needs trust, discretion and clear rules around data, access and community behavior." },
        { kicker: "Opportunity", title: "Meet the right people", body: "Crays spaces should create business, creator, cultural and personal opportunities that do not happen alone online." },
        { kicker: "Belonging", title: "Feel at home faster", body: "A known brand layer can make unfamiliar places easier to enter, use and enjoy." },
      ],
      media: [
        { label: "Ownership", media: "studio" },
        { label: "Useful places", media: "blocked" },
        { label: "Human proximity", media: "community" },
      ],
    },
    ecosystem: {
      eyebrow: "Ecosystem",
      title: "The products are proof that community can become useful.",
      body: "Crays Lifestyle is the connective tissue between clubs, villas, coffee culture, hotels, events, creators, hospitality services and future Bitcoin-native participation models. Each product should send people back into real places and shared moments.",
      cards: [
        { kicker: "Clubs", title: "Work-live-play bases", body: "Local-global places for meetings, focus, health, social life and recurring community." },
        { kicker: "Villas", title: "Hosted stays", body: "Mediterranean villas with Crays standards, owner logic and request-first booking." },
        { kicker: "Circle", title: "Digital access", body: "Profiles, discovery, services, memberships, payments and venue interaction in one layer." },
        { kicker: "Events", title: "Culture made visible", body: "Dinners, awards, rooftops and creator moments that make the community tangible." },
      ],
      media: [
        { label: "Clubs", media: "work" },
        { label: "Culture", media: "studio" },
        { label: "Hosted stays", media: "blocked" },
      ],
    },
    social: {
      eyebrow: "Real-world social layer",
      title: "The app should get people out of passive feeds and into the room.",
      body: "Digital tools are valuable when they coordinate real outcomes: a booking, a dinner, a work session, an introduction, a payment, a local service or a community moment. Crays uses technology as infrastructure for real-world velocity.",
      stages: [
        { marker: "01", title: "Identity follows you", body: "Profiles and context should travel between places and digital surfaces." },
        { marker: "02", title: "Places become nodes", body: "Clubs, villas and partner venues become local access points for the network." },
        { marker: "03", title: "Intent becomes action", body: "Discovery, matching and service logic should create meetings and bookings." },
        { marker: "04", title: "Value circulates", body: "Payments, creator demand, hospitality and participation stay close to the people creating value." },
        { marker: "05", title: "Trust compounds", body: "Good experiences make the next city, stay and introduction easier." },
      ],
      media: [
        { label: "Identity", media: "studio" },
        { label: "Place", media: "blocked" },
        { label: "Activity", media: "community" },
      ],
    },
    creators: {
      eyebrow: "Creators and culture",
      title: "Attention becomes connection when creators bring people into real places.",
      body: "Crays can connect creator audiences, partner brands, private events, hospitality spaces and direct payments. Fans should not only watch. They should be able to meet, travel, attend, co-create and become part of the venue economy.",
      cards: [
        { kicker: "Creator tools", title: "Profiles and paid access", body: "Portable identity, content, subscriptions, tips and event access can live closer to the fan relationship." },
        { kicker: "Fan journeys", title: "From screen to venue", body: "Creator demand can route into dinners, rooftops, retreats, clubs, villas and local experiences." },
      ],
    },
    seeking: {
      eyebrow: "What we are looking for",
      title: "Bring what fits the values. Build what creates real activity.",
      body: "Crays grows through people who can contribute useful places, communities, products, culture, capital, responsibility and operational excellence. The filter is not hype. The filter is whether the contribution creates trust, quality and real-world momentum.",
      ctas: ["Start Project Intake", "Talk to Crays"],
      cards: [
        { kicker: "01", title: "Venue", body: "Hotel, club, lounge, retreat, rooftop, coworking space or cultural location." },
        { kicker: "02", title: "Community", body: "Creator audience, founder circle, local scene or digital nomad group." },
        { kicker: "03", title: "Product", body: "Technology, hospitality service, wellness idea, retail concept or payment layer." },
        { kicker: "04", title: "Ownership", body: "Real assets, partner vehicles, co-investment and tokenized participation paths." },
        { kicker: "05", title: "Responsibility", body: "Freedom works best with kindness, discipline, discretion and useful contribution." },
      ],
    },
    vision: {
      eyebrow: "Vision 2035",
      title: "A Bitcoin-native lifestyle architecture for an era of real-world velocity.",
      body: "The long-term vision is a global network of physical Crays places and partner venues where people pay, travel, meet, create, book, invest and build with more ownership and less platform dependency.",
      closing: "Do not just predict the future. Go out and build it together.",
      ctas: ["New Projects", "Hospitality Brand Alliance"],
    },
    mediaBlocked: "Media held back",
    mediaBlockedDetail: "The exact hospitality or real-estate image remains hidden until source, relevance and publication rights are verified.",
    credits: "Media credits and rights notes",
  },
  de: {
    localeName: "Deutsch",
    metadata: { title: "Lifestyle | CRAYS Clubs", description: "Die reale operative Ebene für mobile Menschen: Mitgliedschaft, Hospitality, Arbeit, Kultur und Community." },
    shell: shells.de,
    firstHero: {
      eyebrow: "Crays Lifestyle",
      title: "Die reale operative Ebene für Menschen, die sich bewegen.",
      body: "Crays verbindet Mitgliedschaft, Hospitality, Arbeit, Kultur, Villen, Zahlungen und Community zu einem erkennbaren Lifestyle-System für Builders, Kreative, Gründer und globale Bürger.",
      ctas: ["Mitglied werden", "Aufenthalte entdecken", "Mit Crays sprechen"],
      signals: ["Member Identity", "Venue Super Node", "Value Payments"],
    },
    anchors: ["Layer Map", "Tagesrhythmus", "Crays Doors", "Mit uns bauen"],
    layer: {
      eyebrow: "Layer Map",
      title: "Keine weitere Lifestyle-Seite. Eine lebende Karte des Crays-Ökosystems.",
      body: "Die Marke hat vier sichtbare Kräfte: Die Association verwaltet gemeinsame IP, der Fund strukturiert Kapital und Immobilien, World macht Orte zu intelligenten lokalen Knoten und Club macht den Lifestyle greifbar.",
      cards: [
        { kicker: "01", title: "Association", body: "Builders, Makers, Governance und gemeinsame Marken-IP.", href: "https://www.crays.org/", external: true },
        { kicker: "02", title: "Fund", body: "Immobilien, Vermögen, Villen-Infrastruktur und Portfolio-Logik.", href: "https://www.crays.fund/", external: true },
        { kicker: "03", title: "World", body: "Web5-Hospitality, Nostr-App, Super Nodes und Zahlungen.", href: "https://www.crays.world/", external: true },
        { kicker: "04", title: "Club", body: "Arbeiten, leben, spielen, Events, Lounges und reale Räume.", href: "hospitality" },
      ],
    },
    rhythm: {
      eyebrow: "Tagesrhythmus",
      title: "Ein Tag sollte sich vom ersten Kaffee bis zum letzten Raum verbunden anfühlen.",
      stages: [
        { marker: "Morgen", title: "Arbeitssignal", body: "Kaffee, Fokus, lokaler Kontext und die richtigen Menschen in der Nähe." },
        { marker: "Mittag", title: "Club-Basis", body: "Meetings, Calls, Service und ein Ort, der vertraut wirkt." },
        { marker: "Abend", title: "Gehostete Kultur", body: "Dinner und Begegnungen, die Bewegung in Zugehörigkeit verwandeln." },
        { marker: "Nacht", title: "Venue Graph", body: "Der Raum wird sichtbar: Stimmung, Absicht, Services und Zahlungen." },
      ],
      outcome: "Ergebnis · Weniger Plattformrauschen. Mehr reale Aktivität.",
      mood: "Stimmung + Absicht · Sozial, Arbeit, Creator, Gast",
    },
    feed: {
      eyebrow: "Vom Feed in den Raum",
      title: "Das Interface sollte im Ort verschwinden.",
      body: "Crays ist am stärksten, wenn die digitale Ebene ein reales Ergebnis koordiniert: ankommen, matchen, reservieren, bestellen, zahlen, treffen, bleiben oder bauen. Das ist das Lifestyle-Versprechen über Club, World, Fund und Association.",
      stages: [
        { marker: "01", title: "Ankommen", body: "Venue-Kontext erscheint, bevor sich der Raum anonym anfühlt." },
        { marker: "02", title: "Matchen", body: "Menschen, Zweck und Nähe werden zu nützlichen Signalen." },
        { marker: "03", title: "Settlen", body: "Zahlungen und Service bleiben nah an der Beziehung zum Ort." },
      ],
    },
    doors: {
      eyebrow: "Crays Doors",
      title: "Wähle die Tür, die reale Bewegung erzeugt.",
      cards: [
        { kicker: "Member", title: "In die Lifestyle-Ebene eintreten", body: "Mitgliedschaft, Zugang, sozialer Rhythmus und wiederkehrende Orte.", href: "become-a-member" },
        { kicker: "Villas", title: "Aufenthalt buchen oder anfragen", body: "Kuratierte Luxusimmobilien mit Crays-Hospitality-Logik.", href: "hospitality" },
        { kicker: "Venue", title: "Crays in einen Raum bringen", body: "Super Nodes, App-Logik, Zahlungen und Gästeaktivierung.", href: "https://www.crays.world/", external: true },
        { kicker: "Capital", title: "Die Asset-Ebene verstehen", body: "Luxus-Kurzzeitvermietung, Immobilien- und Investment-Infrastruktur.", href: "https://www.crays.fund/", external: true },
      ],
    },
    build: {
      eyebrow: "Mit uns bauen",
      title: "Bring mit, was zu den Werten passt. Baue, was reale Aktivität schafft.",
      body: "Ort, Community, Produkt, Ownership und Verantwortung sind keine getrennten Slogans. Sie filtern, was zu Crays gehört.",
      ctas: ["Projekt-Intake starten", "Hospitality Alliance", "Kontakt"],
      values: ["Venue", "Community", "Produkt", "Ownership", "Verantwortung"],
    },
    secondHero: {
      eyebrow: "Crays Lifestyle",
      title: "Arbeiten, leben, spielen und dazugehören in einer Crays-Ebene.",
      body: "Crays verwandelt Mobilität in ein Lifestyle-System: reale Orte, vertraute Menschen, Hospitality-Routinen und digitaler Zugang für Builders, Makers, Kreative, Gründer und globale Bürger.",
      ctas: ["Mitglied werden", "Modell entdecken"],
      signals: [
        { kicker: "Menschen", title: "Builders, Makers und globale Bürger", body: "" },
        { kicker: "Orte", title: "Clubs, Villen, Lounges und City Bases", body: "" },
        { kicker: "Ebene", title: "Zugang, Identität, Events und Zahlungen", body: "" },
      ],
      media: [{ label: "Arbeitsbereit", media: "work" }, { label: "Soziale Energie", media: "community" }, { label: "Globaler Rhythmus", media: "blocked" }],
    },
    architecture: {
      title: "Kein Feed. Eine reale Lifestyle-Architektur.",
      body: "Die digitale Ebene soll Menschen in Räume, Villen, Clubs, Dinner, Workspaces und gemeinsame Möglichkeiten führen.",
      media: [{ label: "Stadt", media: "work" }, { label: "Community", media: "community" }, { label: "Dinner", media: "food" }, { label: "Wohnen", media: "blocked" }, { label: "Kultur", media: "studio" }],
      pillars: [
        { kicker: "Community", title: "Menschen, die bauen und sich bewegen", body: "Mitglieder, Gäste, Kreative, Gründer, Betreiber und Partner treffen sich an nützlichen Orten statt in passiven Feeds." },
        { kicker: "Lifestyle", title: "Zusammen arbeiten, leben und spielen", body: "Hospitality, Arbeitsroutinen, Dinner, Villen, Clubs und Events bilden ein erkennbares Erlebnis." },
        { kicker: "Technologie", title: "Digitaler Zugang mit realen Ergebnissen", body: "Identität, Buchungen, Zahlungen, Empfehlungen und Community-Signale sollen in echten Treffen und Aktivitäten enden." },
      ],
    },
    founder: {
      eyebrow: "Founder-Motivation", title: "Ein Lifestyle-System aus Jahren unterwegs.",
      body: "Die Crays-Idee folgt einer einfachen Beobachtung: Reisen wurde leicht, Remote Work normal, aber Zugehörigkeit nicht einfacher. Menschen bewegen sich schneller denn je und brauchen trotzdem Orte, an denen Arbeit, Vertrauen, Erholung und Freundschaft natürlich entstehen.",
      cards: [
        { kicker: "Fehlendes Stück", title: "Reale Verbindung", body: "Mobilität schafft Reichweite; Wert beginnt, wenn Menschen wissen, wo sie ankommen und wen sie treffen." },
        { kicker: "Antwort", title: "Intelligente lokale Hubs", body: "Crays-Orte machen Clubs, Villen, Lounges und Partner-Venues zu wiederholbaren Community-Knoten." },
        { kicker: "Betriebsmodell", title: "Nützliche Hospitality", body: "Schöne Orte zählen, doch Service, Zugang, Routinen und lokale Intelligenz machen sie nutzbar." },
        { kicker: "Ergebnis", title: "Schneller dazugehören", body: "Mitglieder können neue Orte schneller betreten, ohne dass jeder Aufenthalt bei null beginnt." },
      ],
      media: [{ label: "Bewegung", media: "work" }, { label: "Vertrauen", media: "community" }, { label: "Erholung", media: "food" }],
    },
    world: {
      eyebrow: "Die Welt, die wir wollen", title: "Freiheit braucht Ownership, Würde und nützliche Orte.",
      body: "Crays verbindet persönliche Freiheit mit realer Infrastruktur: Orte zum Wohnen, Arbeiten und Treffen sowie digitale Rails für Identität, Zugang, Zahlungen und Teilnahme. Luxus ist nicht Dekoration, sondern Verlässlichkeit, Privatsphäre, Qualität und menschliche Nähe.",
      cards: [
        { kicker: "Ownership", title: "Mehr Kontrolle behalten", body: "Identität, Mitgliedschaften, Zugang und Teilnahme sollen portabler und weniger abhängig von geschlossenen Plattformen werden." },
        { kicker: "Privatsphäre", title: "Den Gast respektieren", body: "Hochwertige Hospitality braucht Vertrauen, Diskretion und klare Regeln für Daten, Zugang und Community-Verhalten." },
        { kicker: "Möglichkeit", title: "Die richtigen Menschen treffen", body: "Crays-Orte sollen geschäftliche, kreative, kulturelle und persönliche Chancen schaffen, die online allein nicht entstehen." },
        { kicker: "Zugehörigkeit", title: "Schneller zuhause fühlen", body: "Eine bekannte Markenebene macht fremde Orte leichter zugänglich, nutzbar und erlebbar." },
      ],
      media: [{ label: "Ownership", media: "studio" }, { label: "Nützliche Orte", media: "blocked" }, { label: "Menschliche Nähe", media: "community" }],
    },
    ecosystem: {
      eyebrow: "Ökosystem", title: "Die Produkte beweisen, dass Community nützlich werden kann.",
      body: "Crays Lifestyle verbindet Clubs, Villen, Kaffeekultur, Hotels, Events, Kreative, Hospitality-Services und künftige Bitcoin-native Beteiligungsmodelle. Jedes Produkt soll Menschen zurück in reale Orte und gemeinsame Momente führen.",
      cards: [
        { kicker: "Clubs", title: "Work-Live-Play-Basen", body: "Lokal-globale Orte für Meetings, Fokus, Gesundheit, Sozialleben und wiederkehrende Community." },
        { kicker: "Villas", title: "Gehostete Aufenthalte", body: "Mediterrane Villen mit Crays-Standards, Owner-Logik und Anfrage vor Buchung." },
        { kicker: "Circle", title: "Digitaler Zugang", body: "Profile, Discovery, Services, Mitgliedschaften, Zahlungen und Venue-Interaktion in einer Ebene." },
        { kicker: "Events", title: "Kultur wird sichtbar", body: "Dinner, Awards, Rooftops und Creator-Momente machen die Community greifbar." },
      ],
      media: [{ label: "Clubs", media: "work" }, { label: "Kultur", media: "studio" }, { label: "Gehostete Aufenthalte", media: "blocked" }],
    },
    social: {
      eyebrow: "Reale soziale Ebene", title: "Die App soll Menschen aus passiven Feeds in den Raum bringen.",
      body: "Digitale Werkzeuge sind wertvoll, wenn sie reale Ergebnisse koordinieren: Buchung, Dinner, Work Session, Vorstellung, Zahlung, lokalen Service oder Community-Moment. Crays nutzt Technologie als Infrastruktur für reale Geschwindigkeit.",
      stages: [
        { marker: "01", title: "Identität folgt dir", body: "Profile und Kontext sollen zwischen Orten und digitalen Oberflächen reisen." },
        { marker: "02", title: "Orte werden Knoten", body: "Clubs, Villen und Partner-Venues werden lokale Zugangspunkte des Netzwerks." },
        { marker: "03", title: "Absicht wird Handlung", body: "Discovery, Matching und Service-Logik sollen Treffen und Buchungen erzeugen." },
        { marker: "04", title: "Wert zirkuliert", body: "Zahlungen, Creator-Nachfrage, Hospitality und Teilnahme bleiben nah an den Wertschaffenden." },
        { marker: "05", title: "Vertrauen wächst", body: "Gute Erlebnisse machen die nächste Stadt, den nächsten Aufenthalt und die nächste Begegnung leichter." },
      ],
      media: [{ label: "Identität", media: "studio" }, { label: "Ort", media: "blocked" }, { label: "Aktivität", media: "community" }],
    },
    creators: {
      eyebrow: "Kreative und Kultur", title: "Aufmerksamkeit wird Verbindung, wenn Kreative Menschen in reale Orte bringen.",
      body: "Crays kann Creator-Publikum, Partner-Brands, private Events, Hospitality-Orte und direkte Zahlungen verbinden. Fans sollen nicht nur zusehen, sondern treffen, reisen, teilnehmen, mitgestalten und Teil der Venue Economy werden.",
      cards: [
        { kicker: "Creator Tools", title: "Profile und bezahlter Zugang", body: "Portable Identität, Inhalte, Abos, Tips und Eventzugang können näher an der Fanbeziehung liegen." },
        { kicker: "Fan Journeys", title: "Vom Screen zum Venue", body: "Creator-Nachfrage kann in Dinner, Rooftops, Retreats, Clubs, Villen und lokale Erlebnisse führen." },
      ],
    },
    seeking: {
      eyebrow: "Was wir suchen", title: "Bring mit, was zu den Werten passt. Baue, was reale Aktivität schafft.",
      body: "Crays wächst durch Menschen, die nützliche Orte, Communities, Produkte, Kultur, Kapital, Verantwortung und operative Exzellenz beitragen. Nicht Hype ist der Filter, sondern Vertrauen, Qualität und reale Dynamik.",
      ctas: ["Projekt-Intake starten", "Mit Crays sprechen"],
      cards: [
        { kicker: "01", title: "Venue", body: "Hotel, Club, Lounge, Retreat, Rooftop, Coworking oder Kulturort." },
        { kicker: "02", title: "Community", body: "Creator-Publikum, Founder Circle, lokale Szene oder Digital-Nomad-Gruppe." },
        { kicker: "03", title: "Produkt", body: "Technologie, Hospitality-Service, Wellness-Idee, Retail-Konzept oder Payment-Layer." },
        { kicker: "04", title: "Ownership", body: "Reale Assets, Partnervehikel, Co-Investment und tokenisierte Beteiligungswege." },
        { kicker: "05", title: "Verantwortung", body: "Freiheit funktioniert am besten mit Freundlichkeit, Disziplin, Diskretion und nützlichem Beitrag." },
      ],
    },
    vision: {
      eyebrow: "Vision 2035", title: "Eine Bitcoin-native Lifestyle-Architektur für eine Ära realer Geschwindigkeit.",
      body: "Langfristig entsteht ein globales Netzwerk physischer Crays-Orte und Partner-Venues, an denen Menschen mit mehr Ownership und weniger Plattformabhängigkeit zahlen, reisen, treffen, gestalten, buchen, investieren und bauen.",
      closing: "Sag die Zukunft nicht nur voraus. Geh hinaus und baue sie gemeinsam.",
      ctas: ["Neue Projekte", "Hospitality Brand Alliance"],
    },
    mediaBlocked: "Medium zurückgehalten",
    mediaBlockedDetail: "Das exakte Hospitality- oder Immobilienbild bleibt verborgen, bis Quelle, Relevanz und Publikationsrechte verifiziert sind.",
    credits: "Mediennachweise und Rechtehinweise",
  },
  es: {
    localeName: "Español",
    metadata: { title: "Lifestyle | CRAYS Clubs", description: "La capa operativa del mundo real para personas que se mueven: membresía, hospitalidad, trabajo, cultura y comunidad." },
    shell: shells.es,
    firstHero: {
      eyebrow: "Crays Lifestyle", title: "La capa operativa del mundo real para personas que se mueven.",
      body: "Crays conecta membresía, hospitalidad, trabajo, cultura, villas, pagos y comunidad en un sistema reconocible para builders, creadores, fundadores y ciudadanos globales.",
      ctas: ["Hazte miembro", "Explorar estancias", "Hablar con Crays"],
      signals: ["Identidad de miembro", "Supernodo del espacio", "Pagos de valor"],
    },
    anchors: ["Mapa de capas", "Ritmo diario", "Puertas Crays", "Construye con nosotros"],
    layer: {
      eyebrow: "Mapa de capas", title: "No es otra página lifestyle. Es un mapa vivo del ecosistema Crays.",
      body: "La marca tiene cuatro fuerzas visibles: la Association gobierna la propiedad intelectual compartida, Fund estructura capital e inmuebles, World convierte espacios en nodos locales inteligentes y Club hace tangible el estilo de vida.",
      cards: [
        { kicker: "01", title: "Association", body: "Builders, makers, gobernanza y propiedad intelectual compartida.", href: "https://www.crays.org/", external: true },
        { kicker: "02", title: "Fund", body: "Inmuebles, patrimonio, infraestructura de villas y lógica de portafolio.", href: "https://www.crays.fund/", external: true },
        { kicker: "03", title: "World", body: "Hospitalidad Web5, app Nostr, Super Nodes y pagos.", href: "https://www.crays.world/", external: true },
        { kicker: "04", title: "Club", body: "Trabajar, vivir, jugar, eventos, lounges y espacios reales.", href: "hospitality" },
      ],
    },
    rhythm: {
      eyebrow: "Ritmo diario", title: "Un día debe sentirse conectado desde el primer café hasta la última sala.",
      stages: [
        { marker: "Mañana", title: "Señal de trabajo", body: "Café, concentración, contexto local y las personas adecuadas cerca." },
        { marker: "Mediodía", title: "Base Club", body: "Reuniones, llamadas, servicio y un lugar que se siente conocido." },
        { marker: "Tarde", title: "Cultura anfitriona", body: "Cenas y presentaciones que convierten movimiento en pertenencia." },
        { marker: "Noche", title: "Grafo del espacio", body: "La sala se hace visible: ambiente, intención, servicios y pagos." },
      ],
      outcome: "Resultado · Menos ruido de plataforma. Más actividad real.",
      mood: "Ambiente + intención · Social, trabajo, creador, huésped",
    },
    feed: {
      eyebrow: "Del feed a la sala", title: "La interfaz debe desaparecer dentro del lugar.",
      body: "Crays es más fuerte cuando la capa digital coordina un resultado real: llegar, conectar, reservar, pedir, pagar, conocer, alojarse o construir. Es la promesa lifestyle de Club, World, Fund y Association.",
      stages: [
        { marker: "01", title: "Llegar", body: "El contexto del espacio aparece antes de que la sala resulte anónima." },
        { marker: "02", title: "Conectar", body: "Personas, propósito y proximidad se convierten en señales útiles." },
        { marker: "03", title: "Instalarse", body: "Pagos y servicio permanecen cerca de la relación con el espacio." },
      ],
    },
    doors: {
      eyebrow: "Puertas Crays", title: "Elige la puerta que crea movimiento real.",
      cards: [
        { kicker: "Miembro", title: "Entrar en la capa lifestyle", body: "Membresía, acceso, ritmo social y lugares recurrentes.", href: "become-a-member" },
        { kicker: "Villas", title: "Reservar o solicitar estancia", body: "Propiedades de lujo seleccionadas con lógica de hospitalidad Crays.", href: "hospitality" },
        { kicker: "Espacio", title: "Llevar Crays a una sala", body: "Super Nodes, lógica de app, pagos y activación de huéspedes.", href: "https://www.crays.world/", external: true },
        { kicker: "Capital", title: "Entender la capa de activos", body: "Inmuebles de alquiler de lujo e infraestructura de inversión.", href: "https://www.crays.fund/", external: true },
      ],
    },
    build: {
      eyebrow: "Construye con nosotros", title: "Trae lo que encaja con los valores. Construye lo que crea actividad real.",
      body: "Espacio, comunidad, producto, propiedad y responsabilidad no son lemas separados. Son el filtro de lo que pertenece a Crays.",
      ctas: ["Iniciar propuesta", "Alianza de hospitalidad", "Contacto"],
      values: ["Espacio", "Comunidad", "Producto", "Propiedad", "Responsabilidad"],
    },
    secondHero: {
      eyebrow: "Crays Lifestyle", title: "Trabaja, vive, juega y pertenece en una sola capa Crays.",
      body: "Crays convierte la movilidad en un sistema lifestyle: lugares reales, personas de confianza, rutinas de hospitalidad y acceso digital para builders, makers, creadores, fundadores y ciudadanos globales.",
      ctas: ["Hazte miembro", "Explorar el modelo"],
      signals: [
        { kicker: "Personas", title: "Builders, makers y ciudadanos globales", body: "" },
        { kicker: "Lugares", title: "Clubs, villas, lounges y bases urbanas", body: "" },
        { kicker: "Capa", title: "Acceso, identidad, eventos y pagos", body: "" },
      ],
      media: [{ label: "Listo para trabajar", media: "work" }, { label: "Energía social", media: "community" }, { label: "Ritmo global", media: "blocked" }],
    },
    architecture: {
      title: "No es un feed. Es una arquitectura lifestyle del mundo real.",
      body: "La capa digital debe llevar a las personas a salas, villas, clubs, cenas, espacios de trabajo y oportunidades compartidas.",
      media: [{ label: "Ciudad", media: "work" }, { label: "Comunidad", media: "community" }, { label: "Cena", media: "food" }, { label: "Vivir", media: "blocked" }, { label: "Cultura", media: "studio" }],
      pillars: [
        { kicker: "Comunidad", title: "Personas que construyen y se mueven", body: "Miembros, huéspedes, creadores, fundadores, operadores y socios se encuentran en lugares útiles, no en feeds pasivos." },
        { kicker: "Lifestyle", title: "Trabajar, vivir y jugar juntos", body: "Hospitalidad, rutinas de trabajo, cenas, villas, clubs y eventos forman una experiencia reconocible." },
        { kicker: "Tecnología", title: "Acceso digital con resultados reales", body: "Identidad, reservas, pagos, recomendaciones y señales comunitarias deben terminar en encuentros y actividad." },
      ],
    },
    founder: {
      eyebrow: "Motivación del fundador", title: "Un sistema lifestyle nacido de años en movimiento.",
      body: "La idea Crays parte de una observación: viajar se hizo fácil y el trabajo remoto normal, pero pertenecer no. Las personas se mueven más rápido y aún necesitan lugares donde trabajo, confianza, recuperación y amistad surjan de forma natural.",
      cards: [
        { kicker: "Pieza que falta", title: "Conexión real", body: "La movilidad amplía el alcance, pero el valor empieza cuando sabes dónde llegar y a quién conocer." },
        { kicker: "Respuesta", title: "Nodos locales inteligentes", body: "Los espacios Crays convierten clubs, villas, lounges y espacios asociados en nodos repetibles." },
        { kicker: "Modelo operativo", title: "Hospitalidad útil", body: "Los lugares bellos importan, pero servicio, acceso, rutinas e inteligencia local los hacen funcionar." },
        { kicker: "Resultado", title: "Pertenecer más rápido", body: "Los miembros entran antes en nuevos lugares sin sentir que cada estancia parte de cero." },
      ],
      media: [{ label: "Movimiento", media: "work" }, { label: "Confianza", media: "community" }, { label: "Recuperación", media: "food" }],
    },
    world: {
      eyebrow: "El mundo que queremos", title: "La libertad necesita propiedad, dignidad y lugares útiles.",
      body: "Crays conecta libertad personal e infraestructura real: lugares para alojarse, trabajar y reunirse, más vías digitales para identidad, acceso, pagos y participación. El lujo no es decoración, sino fiabilidad, privacidad, calidad y proximidad humana.",
      cards: [
        { kicker: "Propiedad", title: "Conservar más control", body: "Identidad, membresías, acceso y participación deben ser más portátiles y menos dependientes de plataformas cerradas." },
        { kicker: "Privacidad", title: "Respetar al huésped", body: "La hospitalidad de calidad necesita confianza, discreción y reglas claras para datos, acceso y conducta." },
        { kicker: "Oportunidad", title: "Conocer a las personas adecuadas", body: "Los espacios Crays deben crear oportunidades empresariales, creativas, culturales y personales que no nacen solo online." },
        { kicker: "Pertenencia", title: "Sentirse en casa antes", body: "Una capa de marca conocida facilita entrar, usar y disfrutar lugares desconocidos." },
      ],
      media: [{ label: "Propiedad", media: "studio" }, { label: "Lugares útiles", media: "blocked" }, { label: "Proximidad humana", media: "community" }],
    },
    ecosystem: {
      eyebrow: "Ecosistema", title: "Los productos prueban que la comunidad puede resultar útil.",
      body: "Crays Lifestyle conecta clubs, villas, cultura de café, hoteles, eventos, creadores, servicios de hospitalidad y futuros modelos de participación Bitcoin-native. Cada producto debe devolver personas a lugares reales y momentos compartidos.",
      cards: [
        { kicker: "Clubs", title: "Bases work-live-play", body: "Lugares locales y globales para reuniones, concentración, salud, vida social y comunidad recurrente." },
        { kicker: "Villas", title: "Estancias anfitrionas", body: "Villas mediterráneas con estándares Crays, lógica de propietario y solicitud antes de reserva." },
        { kicker: "Circle", title: "Acceso digital", body: "Perfiles, descubrimiento, servicios, membresías, pagos e interacción con espacios en una capa." },
        { kicker: "Eventos", title: "Cultura visible", body: "Cenas, premios, azoteas y momentos de creadores hacen tangible la comunidad." },
      ],
      media: [{ label: "Clubs", media: "work" }, { label: "Cultura", media: "studio" }, { label: "Estancias", media: "blocked" }],
    },
    social: {
      eyebrow: "Capa social real", title: "La app debe sacar a las personas de feeds pasivos y llevarlas a la sala.",
      body: "Las herramientas digitales son valiosas cuando coordinan resultados reales: reserva, cena, sesión de trabajo, presentación, pago, servicio local o momento comunitario. Crays usa tecnología como infraestructura para velocidad real.",
      stages: [
        { marker: "01", title: "La identidad te acompaña", body: "Perfiles y contexto deben viajar entre lugares y superficies digitales." },
        { marker: "02", title: "Los lugares se vuelven nodos", body: "Clubs, villas y espacios asociados se convierten en accesos locales a la red." },
        { marker: "03", title: "La intención se hace acción", body: "Descubrimiento, matching y servicio deben crear encuentros y reservas." },
        { marker: "04", title: "El valor circula", body: "Pagos, demanda de creadores, hospitalidad y participación quedan cerca de quienes crean valor." },
        { marker: "05", title: "La confianza se acumula", body: "Las buenas experiencias facilitan la próxima ciudad, estancia y presentación." },
      ],
      media: [{ label: "Identidad", media: "studio" }, { label: "Lugar", media: "blocked" }, { label: "Actividad", media: "community" }],
    },
    creators: {
      eyebrow: "Creadores y cultura", title: "La atención se convierte en conexión cuando los creadores llevan personas a lugares reales.",
      body: "Crays puede conectar audiencias, marcas, eventos privados, espacios de hospitalidad y pagos directos. Los fans no solo deben mirar: pueden conocerse, viajar, asistir, cocrear y entrar en la economía del espacio.",
      cards: [
        { kicker: "Herramientas", title: "Perfiles y acceso de pago", body: "Identidad portátil, contenido, suscripciones, propinas y acceso a eventos más cerca de la relación con fans." },
        { kicker: "Viajes del fan", title: "De la pantalla al espacio", body: "La demanda puede llegar a cenas, azoteas, retiros, clubs, villas y experiencias locales." },
      ],
    },
    seeking: {
      eyebrow: "Lo que buscamos", title: "Trae lo que encaja con los valores. Construye lo que crea actividad real.",
      body: "Crays crece con personas que aportan lugares útiles, comunidades, productos, cultura, capital, responsabilidad y excelencia operativa. El filtro no es el hype, sino confianza, calidad e impulso real.",
      ctas: ["Iniciar propuesta", "Hablar con Crays"],
      cards: [
        { kicker: "01", title: "Espacio", body: "Hotel, club, lounge, retiro, azotea, coworking o lugar cultural." },
        { kicker: "02", title: "Comunidad", body: "Audiencia creadora, círculo de fundadores, escena local o grupo nómada." },
        { kicker: "03", title: "Producto", body: "Tecnología, hospitalidad, bienestar, retail o capa de pagos." },
        { kicker: "04", title: "Propiedad", body: "Activos reales, vehículos asociados, coinversión y participación tokenizada." },
        { kicker: "05", title: "Responsabilidad", body: "La libertad funciona mejor con amabilidad, disciplina, discreción y contribución útil." },
      ],
    },
    vision: {
      eyebrow: "Visión 2035", title: "Una arquitectura lifestyle Bitcoin-native para una era de velocidad real.",
      body: "La visión a largo plazo es una red global de lugares Crays físicos y espacios asociados donde pagar, viajar, conocer, crear, reservar, invertir y construir con más propiedad y menos dependencia de plataformas.",
      closing: "No te limites a predecir el futuro. Sal y constrúyelo juntos.",
      ctas: ["Nuevos proyectos", "Hospitality Brand Alliance"],
    },
    mediaBlocked: "Medio retenido",
    mediaBlockedDetail: "La imagen exacta de hospitalidad o inmueble queda oculta hasta verificar fuente, relevancia y derechos.",
    credits: "Créditos y notas de derechos",
  },
  ca: {
    localeName: "Català",
    metadata: { title: "Lifestyle | CRAYS Clubs", description: "La capa operativa del món real per a persones que es mouen: membresia, hospitalitat, feina, cultura i comunitat." },
    shell: shells.ca,
    firstHero: { eyebrow: "Crays Lifestyle", title: "La capa operativa del món real per a persones que es mouen.", body: "Crays connecta membresia, hospitalitat, feina, cultura, vil·les, pagaments i comunitat en un sistema reconeixible per a builders, creadors, fundadors i ciutadans globals.", ctas: ["Fes-te membre", "Explora estades", "Parla amb Crays"], signals: ["Identitat de membre", "Supernode del lloc", "Pagaments de valor"] },
    anchors: ["Mapa de capes", "Ritme diari", "Portes Crays", "Construeix amb nosaltres"],
    layer: {
      eyebrow: "Mapa de capes", title: "No és una altra pàgina lifestyle. És un mapa viu de l'ecosistema Crays.",
      body: "La marca té quatre forces visibles: l'Association governa la propietat intel·lectual compartida, Fund estructura capital i immobles, World converteix llocs en nodes locals intel·ligents i Club fa tangible l'estil de vida.",
      cards: [
        { kicker: "01", title: "Association", body: "Builders, makers, governança i propietat intel·lectual compartida.", href: "https://www.crays.org/", external: true },
        { kicker: "02", title: "Fund", body: "Immobles, patrimoni, infraestructura de vil·les i lògica de cartera.", href: "https://www.crays.fund/", external: true },
        { kicker: "03", title: "World", body: "Hospitalitat Web5, app Nostr, Super Nodes i pagaments.", href: "https://www.crays.world/", external: true },
        { kicker: "04", title: "Club", body: "Treballar, viure, jugar, esdeveniments, lounges i espais reals.", href: "hospitality" },
      ],
    },
    rhythm: {
      eyebrow: "Ritme diari", title: "Un dia s'ha de sentir connectat des del primer cafè fins a l'última sala.",
      stages: [
        { marker: "Matí", title: "Senyal de feina", body: "Cafè, concentració, context local i les persones adequades a prop." },
        { marker: "Migdia", title: "Base Club", body: "Reunions, trucades, servei i un lloc que se sent conegut." },
        { marker: "Vespre", title: "Cultura amfitriona", body: "Sopars i presentacions que converteixen moviment en pertinença." },
        { marker: "Nit", title: "Graf del lloc", body: "La sala es fa visible: ambient, intenció, serveis i pagaments." },
      ],
      outcome: "Resultat · Menys soroll de plataforma. Més activitat real.",
      mood: "Ambient + intenció · Social, feina, creador, hoste",
    },
    feed: {
      eyebrow: "Del feed a la sala", title: "La interfície ha de desaparèixer dins del lloc.",
      body: "Crays és més fort quan la capa digital coordina un resultat real: arribar, connectar, reservar, demanar, pagar, conèixer, allotjar-se o construir. És la promesa lifestyle de Club, World, Fund i Association.",
      stages: [
        { marker: "01", title: "Arribar", body: "El context del lloc apareix abans que la sala sembli anònima." },
        { marker: "02", title: "Connectar", body: "Persones, propòsit i proximitat es tornen senyals útils." },
        { marker: "03", title: "Instal·lar-se", body: "Pagaments i servei es mantenen a prop de la relació amb el lloc." },
      ],
    },
    doors: {
      eyebrow: "Portes Crays", title: "Tria la porta que crea moviment real.",
      cards: [
        { kicker: "Membre", title: "Entrar a la capa lifestyle", body: "Membresia, accés, ritme social i llocs recurrents.", href: "become-a-member" },
        { kicker: "Vil·les", title: "Reservar o sol·licitar una estada", body: "Propietats de luxe seleccionades amb lògica d'hospitalitat Crays.", href: "hospitality" },
        { kicker: "Lloc", title: "Portar Crays a una sala", body: "Super Nodes, lògica d'app, pagaments i activació d'hostes.", href: "https://www.crays.world/", external: true },
        { kicker: "Capital", title: "Entendre la capa d'actius", body: "Immobles de lloguer de luxe i infraestructura d'inversió.", href: "https://www.crays.fund/", external: true },
      ],
    },
    build: { eyebrow: "Construeix amb nosaltres", title: "Porta allò que encaixa amb els valors. Construeix allò que crea activitat real.", body: "Lloc, comunitat, producte, propietat i responsabilitat no són eslògans separats. Són el filtre del que pertany a Crays.", ctas: ["Inicia proposta", "Aliança d'hospitalitat", "Contacte"], values: ["Lloc", "Comunitat", "Producte", "Propietat", "Responsabilitat"] },
    secondHero: {
      eyebrow: "Crays Lifestyle", title: "Treballa, viu, juga i pertany en una sola capa Crays.",
      body: "Crays converteix la mobilitat en un sistema lifestyle: llocs reals, persones de confiança, rutines d'hospitalitat i accés digital per a builders, makers, creadors, fundadors i ciutadans globals.",
      ctas: ["Fes-te membre", "Explora el model"],
      signals: [{ kicker: "Persones", title: "Builders, makers i ciutadans globals", body: "" }, { kicker: "Llocs", title: "Clubs, vil·les, lounges i bases urbanes", body: "" }, { kicker: "Capa", title: "Accés, identitat, esdeveniments i pagaments", body: "" }],
      media: [{ label: "Preparat per treballar", media: "work" }, { label: "Energia social", media: "community" }, { label: "Ritme global", media: "blocked" }],
    },
    architecture: {
      title: "No és un feed. És una arquitectura lifestyle del món real.",
      body: "La capa digital ha de portar persones a sales, vil·les, clubs, sopars, espais de treball i oportunitats compartides.",
      media: [{ label: "Ciutat", media: "work" }, { label: "Comunitat", media: "community" }, { label: "Sopar", media: "food" }, { label: "Viure", media: "blocked" }, { label: "Cultura", media: "studio" }],
      pillars: [
        { kicker: "Comunitat", title: "Persones que construeixen i es mouen", body: "Membres, hostes, creadors, fundadors, operadors i socis es troben en llocs útils, no en feeds passius." },
        { kicker: "Lifestyle", title: "Treballar, viure i jugar junts", body: "Hospitalitat, rutines de feina, sopars, vil·les, clubs i esdeveniments formen una experiència reconeixible." },
        { kicker: "Tecnologia", title: "Accés digital amb resultats reals", body: "Identitat, reserves, pagaments, recomanacions i senyals comunitaris han d'acabar en trobades i activitat." },
      ],
    },
    founder: {
      eyebrow: "Motivació del fundador", title: "Un sistema lifestyle nascut d'anys en moviment.",
      body: "La idea Crays parteix d'una observació: viatjar es va fer fàcil i el treball remot normal, però pertànyer no. Les persones es mouen més ràpid i encara necessiten llocs on feina, confiança, recuperació i amistat sorgeixin naturalment.",
      cards: [
        { kicker: "Peça absent", title: "Connexió real", body: "La mobilitat amplia l'abast, però el valor comença quan saps on arribar i qui trobar." },
        { kicker: "Resposta", title: "Nodes locals intel·ligents", body: "Els espais Crays converteixen clubs, vil·les, lounges i llocs associats en nodes repetibles." },
        { kicker: "Model operatiu", title: "Hospitalitat útil", body: "Els llocs bonics importen, però servei, accés, rutines i intel·ligència local els fan funcionar." },
        { kicker: "Resultat", title: "Pertànyer més ràpid", body: "Els membres entren abans en llocs nous sense sentir que cada estada comença de zero." },
      ],
      media: [{ label: "Moviment", media: "work" }, { label: "Confiança", media: "community" }, { label: "Recuperació", media: "food" }],
    },
    world: {
      eyebrow: "El món que volem", title: "La llibertat necessita propietat, dignitat i llocs útils.",
      body: "Crays connecta llibertat personal i infraestructura real: llocs per allotjar-se, treballar i trobar-se, més vies digitals per identitat, accés, pagaments i participació. El luxe és fiabilitat, privacitat, qualitat i proximitat humana.",
      cards: [
        { kicker: "Propietat", title: "Conservar més control", body: "Identitat, membresies, accés i participació han de ser més portàtils i menys dependents de plataformes tancades." },
        { kicker: "Privacitat", title: "Respectar l'hoste", body: "L'hospitalitat de qualitat necessita confiança, discreció i regles clares per dades, accés i conducta." },
        { kicker: "Oportunitat", title: "Trobar les persones adequades", body: "Els espais Crays han de crear oportunitats empresarials, creatives, culturals i personals que no neixen només online." },
        { kicker: "Pertinença", title: "Sentir-se a casa abans", body: "Una capa de marca coneguda facilita entrar, usar i gaudir llocs desconeguts." },
      ],
      media: [{ label: "Propietat", media: "studio" }, { label: "Llocs útils", media: "blocked" }, { label: "Proximitat humana", media: "community" }],
    },
    ecosystem: {
      eyebrow: "Ecosistema", title: "Els productes proven que la comunitat pot ser útil.",
      body: "Crays Lifestyle connecta clubs, vil·les, cultura del cafè, hotels, esdeveniments, creadors, serveis d'hospitalitat i futurs models Bitcoin-native. Cada producte ha de retornar persones a llocs reals i moments compartits.",
      cards: [
        { kicker: "Clubs", title: "Bases work-live-play", body: "Llocs locals i globals per reunions, concentració, salut, vida social i comunitat recurrent." },
        { kicker: "Vil·les", title: "Estades amfitriones", body: "Vil·les mediterrànies amb estàndards Crays, lògica de propietari i sol·licitud abans de reserva." },
        { kicker: "Circle", title: "Accés digital", body: "Perfils, descoberta, serveis, membresies, pagaments i interacció amb llocs en una capa." },
        { kicker: "Esdeveniments", title: "Cultura visible", body: "Sopars, premis, rooftops i moments creadors fan tangible la comunitat." },
      ],
      media: [{ label: "Clubs", media: "work" }, { label: "Cultura", media: "studio" }, { label: "Estades", media: "blocked" }],
    },
    social: {
      eyebrow: "Capa social real", title: "L'app ha de treure les persones dels feeds passius i portar-les a la sala.",
      body: "Les eines digitals són valuoses quan coordinen resultats reals: reserva, sopar, sessió de feina, presentació, pagament, servei local o moment comunitari. Crays usa tecnologia com a infraestructura per velocitat real.",
      stages: [
        { marker: "01", title: "La identitat t'acompanya", body: "Perfils i context han de viatjar entre llocs i superfícies digitals." },
        { marker: "02", title: "Els llocs es tornen nodes", body: "Clubs, vil·les i llocs associats es converteixen en accessos locals a la xarxa." },
        { marker: "03", title: "La intenció es fa acció", body: "Descoberta, matching i servei han de crear trobades i reserves." },
        { marker: "04", title: "El valor circula", body: "Pagaments, demanda creadora, hospitalitat i participació queden prop de qui crea valor." },
        { marker: "05", title: "La confiança s'acumula", body: "Les bones experiències faciliten la ciutat, estada i presentació següents." },
      ],
      media: [{ label: "Identitat", media: "studio" }, { label: "Lloc", media: "blocked" }, { label: "Activitat", media: "community" }],
    },
    creators: {
      eyebrow: "Creadors i cultura", title: "L'atenció es converteix en connexió quan els creadors porten persones a llocs reals.",
      body: "Crays pot connectar audiències, marques, esdeveniments privats, espais d'hospitalitat i pagaments directes. Els fans poden trobar-se, viatjar, assistir, cocrear i entrar en l'economia del lloc.",
      cards: [{ kicker: "Eines", title: "Perfils i accés de pagament", body: "Identitat portàtil, contingut, subscripcions, propines i accés a esdeveniments més a prop dels fans." }, { kicker: "Viatges del fan", title: "De la pantalla al lloc", body: "La demanda pot arribar a sopars, rooftops, recessos, clubs, vil·les i experiències locals." }],
    },
    seeking: {
      eyebrow: "El que busquem", title: "Porta allò que encaixa amb els valors. Construeix allò que crea activitat real.",
      body: "Crays creix amb persones que aporten llocs útils, comunitats, productes, cultura, capital, responsabilitat i excel·lència operativa. El filtre és confiança, qualitat i impuls real, no hype.",
      ctas: ["Inicia proposta", "Parla amb Crays"],
      cards: [
        { kicker: "01", title: "Lloc", body: "Hotel, club, lounge, retir, rooftop, coworking o espai cultural." },
        { kicker: "02", title: "Comunitat", body: "Audiència creadora, cercle fundador, escena local o grup nòmada." },
        { kicker: "03", title: "Producte", body: "Tecnologia, hospitalitat, benestar, retail o capa de pagaments." },
        { kicker: "04", title: "Propietat", body: "Actius reals, vehicles associats, coinversió i participació tokenitzada." },
        { kicker: "05", title: "Responsabilitat", body: "La llibertat funciona millor amb amabilitat, disciplina, discreció i contribució útil." },
      ],
    },
    vision: { eyebrow: "Visió 2035", title: "Una arquitectura lifestyle Bitcoin-native per a una era de velocitat real.", body: "La visió és una xarxa global de llocs Crays físics i espais associats on pagar, viatjar, trobar-se, crear, reservar, invertir i construir amb més propietat i menys dependència de plataformes.", closing: "No et limitis a predir el futur. Surt i construeix-lo junts.", ctas: ["Nous projectes", "Hospitality Brand Alliance"] },
    mediaBlocked: "Mitjà retingut",
    mediaBlockedDetail: "La imatge exacta d'hospitalitat o immoble queda oculta fins a verificar font, rellevància i drets.",
    credits: "Crèdits i notes de drets",
  },
  fr: {
    localeName: "Français",
    metadata: { title: "Lifestyle | CRAYS Clubs", description: "La couche opérationnelle réelle pour les personnes mobiles: adhésion, hospitalité, travail, culture et communauté." },
    shell: shells.fr,
    firstHero: { eyebrow: "Crays Lifestyle", title: "La couche opérationnelle réelle pour ceux qui bougent.", body: "Crays relie adhésion, hospitalité, travail, culture, villas, paiements et communauté dans un système reconnaissable pour bâtisseurs, créateurs, fondateurs et citoyens du monde.", ctas: ["Devenir membre", "Explorer les séjours", "Parler à Crays"], signals: ["Identité membre", "Super Node du lieu", "Paiements de valeur"] },
    anchors: ["Carte des couches", "Rythme quotidien", "Portes Crays", "Construire avec nous"],
    layer: {
      eyebrow: "Carte des couches", title: "Pas une autre page lifestyle. Une carte vivante de l'écosystème Crays.",
      body: "Quatre forces sont visibles: l'Association gouverne la propriété intellectuelle commune, Fund structure capital et immobilier, World transforme les lieux en nœuds locaux intelligents et Club rend le mode de vie tangible.",
      cards: [
        { kicker: "01", title: "Association", body: "Bâtisseurs, makers, gouvernance et propriété intellectuelle commune.", href: "https://www.crays.org/", external: true },
        { kicker: "02", title: "Fund", body: "Immobilier, patrimoine, infrastructure de villas et logique de portefeuille.", href: "https://www.crays.fund/", external: true },
        { kicker: "03", title: "World", body: "Hospitalité Web5, application Nostr, Super Nodes et paiements.", href: "https://www.crays.world/", external: true },
        { kicker: "04", title: "Club", body: "Travailler, vivre, jouer, événements, lounges et pièces réelles.", href: "hospitality" },
      ],
    },
    rhythm: {
      eyebrow: "Rythme quotidien", title: "Une journée doit rester liée du premier café à la dernière pièce.",
      stages: [
        { marker: "Matin", title: "Signal de travail", body: "Café, concentration, contexte local et bonnes personnes à proximité." },
        { marker: "Midi", title: "Base Club", body: "Réunions, appels, service et un lieu qui paraît familier." },
        { marker: "Soir", title: "Culture accueillie", body: "Dîners et présentations qui transforment le mouvement en appartenance." },
        { marker: "Nuit", title: "Graphe du lieu", body: "La pièce devient visible: ambiance, intention, services et paiements." },
      ],
      outcome: "Résultat · Moins de bruit de plateforme. Plus d'activité réelle.",
      mood: "Ambiance + intention · Social, travail, créateur, client",
    },
    feed: {
      eyebrow: "Du flux à la pièce", title: "L'interface doit disparaître dans le lieu.",
      body: "Crays est plus fort lorsque la couche numérique coordonne un résultat réel: arriver, associer, réserver, commander, payer, rencontrer, séjourner ou construire. C'est la promesse de Club, World, Fund et Association.",
      stages: [{ marker: "01", title: "Arriver", body: "Le contexte du lieu apparaît avant que la pièce ne soit anonyme." }, { marker: "02", title: "Associer", body: "Personnes, objectif et proximité deviennent des signaux utiles." }, { marker: "03", title: "S'installer", body: "Paiements et service restent proches de la relation au lieu." }],
    },
    doors: {
      eyebrow: "Portes Crays", title: "Choisissez la porte qui crée un mouvement réel.",
      cards: [
        { kicker: "Membre", title: "Entrer dans la couche lifestyle", body: "Adhésion, accès, rythme social et lieux récurrents.", href: "become-a-member" },
        { kicker: "Villas", title: "Réserver ou demander un séjour", body: "Propriétés de luxe sélectionnées selon la logique d'hospitalité Crays.", href: "hospitality" },
        { kicker: "Lieu", title: "Amener Crays dans une pièce", body: "Super Nodes, logique applicative, paiements et activation des clients.", href: "https://www.crays.world/", external: true },
        { kicker: "Capital", title: "Comprendre la couche d'actifs", body: "Immobilier locatif de luxe et infrastructure d'investissement.", href: "https://www.crays.fund/", external: true },
      ],
    },
    build: { eyebrow: "Construire avec nous", title: "Apportez ce qui correspond aux valeurs. Construisez ce qui crée une activité réelle.", body: "Lieu, communauté, produit, propriété et responsabilité ne sont pas des slogans séparés. Ils filtrent ce qui appartient à Crays.", ctas: ["Démarrer le projet", "Alliance hospitalité", "Contact"], values: ["Lieu", "Communauté", "Produit", "Propriété", "Responsabilité"] },
    secondHero: {
      eyebrow: "Crays Lifestyle", title: "Travaillez, vivez, jouez et appartenez à une même couche Crays.",
      body: "Crays transforme la mobilité en système lifestyle: lieux réels, personnes de confiance, routines d'hospitalité et accès numérique pour bâtisseurs, makers, créateurs, fondateurs et citoyens du monde.",
      ctas: ["Devenir membre", "Explorer le modèle"],
      signals: [{ kicker: "Personnes", title: "Bâtisseurs, makers et citoyens du monde", body: "" }, { kicker: "Lieux", title: "Clubs, villas, lounges et bases urbaines", body: "" }, { kicker: "Couche", title: "Accès, identité, événements et paiements", body: "" }],
      media: [{ label: "Prêt à travailler", media: "work" }, { label: "Énergie sociale", media: "community" }, { label: "Rythme mondial", media: "blocked" }],
    },
    architecture: {
      title: "Pas un flux. Une architecture lifestyle du monde réel.", body: "La couche numérique doit conduire vers des pièces, villas, clubs, dîners, espaces de travail et opportunités partagées.",
      media: [{ label: "Ville", media: "work" }, { label: "Communauté", media: "community" }, { label: "Dîner", media: "food" }, { label: "Habiter", media: "blocked" }, { label: "Culture", media: "studio" }],
      pillars: [
        { kicker: "Communauté", title: "Ceux qui construisent et bougent", body: "Membres, clients, créateurs, fondateurs, opérateurs et partenaires se retrouvent dans des lieux utiles, pas des flux passifs." },
        { kicker: "Lifestyle", title: "Travailler, vivre et jouer ensemble", body: "Hospitalité, travail, dîners, villas, clubs et événements forment une expérience reconnaissable." },
        { kicker: "Technologie", title: "Accès numérique, résultats réels", body: "Identité, réservations, paiements, recommandations et signaux communautaires doivent finir en rencontres et activités." },
      ],
    },
    founder: {
      eyebrow: "Motivation du fondateur", title: "Un système lifestyle né d'années sur la route.",
      body: "L'idée Crays vient d'un constat: voyager est devenu facile et le télétravail normal, mais l'appartenance non. Les personnes bougent plus vite et ont toujours besoin de lieux où travail, confiance, récupération et amitié naissent naturellement.",
      cards: [{ kicker: "Pièce manquante", title: "Connexion réelle", body: "La mobilité étend la portée; la valeur commence quand on sait où arriver et qui rencontrer." }, { kicker: "Réponse", title: "Hubs locaux intelligents", body: "Les lieux Crays transforment clubs, villas, lounges et partenaires en nœuds répétables." }, { kicker: "Modèle", title: "Hospitalité utile", body: "La beauté compte, mais service, accès, routines et intelligence locale rendent les lieux utiles." }, { kicker: "Résultat", title: "Appartenir plus vite", body: "Les membres entrent plus vite dans de nouveaux lieux sans repartir de zéro." }],
      media: [{ label: "Mouvement", media: "work" }, { label: "Confiance", media: "community" }, { label: "Récupération", media: "food" }],
    },
    world: {
      eyebrow: "Le monde souhaité", title: "La liberté a besoin de propriété, de dignité et de lieux utiles.",
      body: "Crays relie liberté personnelle et infrastructure réelle: lieux où séjourner, travailler et se rencontrer, plus des rails numériques pour identité, accès, paiements et participation. Le luxe signifie fiabilité, confidentialité, qualité et proximité humaine.",
      cards: [{ kicker: "Propriété", title: "Garder plus de contrôle", body: "Identité, adhésions, accès et participation doivent être plus portables et moins dépendants des plateformes fermées." }, { kicker: "Confidentialité", title: "Respecter le client", body: "Une hospitalité de qualité exige confiance, discrétion et règles claires sur données, accès et comportement." }, { kicker: "Opportunité", title: "Rencontrer les bonnes personnes", body: "Les lieux Crays doivent créer des occasions professionnelles, créatives, culturelles et personnelles impossibles seulement en ligne." }, { kicker: "Appartenance", title: "Se sentir chez soi plus vite", body: "Une marque connue facilite l'entrée, l'usage et le plaisir dans des lieux inconnus." }],
      media: [{ label: "Propriété", media: "studio" }, { label: "Lieux utiles", media: "blocked" }, { label: "Proximité humaine", media: "community" }],
    },
    ecosystem: {
      eyebrow: "Écosystème", title: "Les produits prouvent qu'une communauté peut devenir utile.",
      body: "Crays Lifestyle relie clubs, villas, culture café, hôtels, événements, créateurs, services d'hospitalité et futurs modèles Bitcoin-native. Chaque produit doit ramener les personnes vers des lieux réels et des moments partagés.",
      cards: [{ kicker: "Clubs", title: "Bases work-live-play", body: "Lieux locaux et mondiaux pour réunions, concentration, santé, vie sociale et communauté récurrente." }, { kicker: "Villas", title: "Séjours accueillis", body: "Villas méditerranéennes aux standards Crays, logique propriétaire et demande avant réservation." }, { kicker: "Circle", title: "Accès numérique", body: "Profils, découverte, services, adhésions, paiements et interaction avec les lieux en une couche." }, { kicker: "Événements", title: "Culture visible", body: "Dîners, prix, rooftops et moments créateurs rendent la communauté tangible." }],
      media: [{ label: "Clubs", media: "work" }, { label: "Culture", media: "studio" }, { label: "Séjours", media: "blocked" }],
    },
    social: {
      eyebrow: "Couche sociale réelle", title: "L'application doit sortir les personnes des flux passifs et les amener dans la pièce.",
      body: "Les outils numériques valent lorsqu'ils coordonnent des résultats réels: réservation, dîner, travail, présentation, paiement, service local ou moment communautaire. Crays utilise la technologie comme infrastructure de vitesse réelle.",
      stages: [{ marker: "01", title: "L'identité vous suit", body: "Profils et contexte voyagent entre lieux et surfaces numériques." }, { marker: "02", title: "Les lieux deviennent des nœuds", body: "Clubs, villas et partenaires deviennent des accès locaux au réseau." }, { marker: "03", title: "L'intention devient action", body: "Découverte, association et service doivent créer rencontres et réservations." }, { marker: "04", title: "La valeur circule", body: "Paiements, demande créative, hospitalité et participation restent proches des créateurs de valeur." }, { marker: "05", title: "La confiance s'accumule", body: "Les bonnes expériences facilitent la prochaine ville, le prochain séjour et la prochaine rencontre." }],
      media: [{ label: "Identité", media: "studio" }, { label: "Lieu", media: "blocked" }, { label: "Activité", media: "community" }],
    },
    creators: {
      eyebrow: "Créateurs et culture", title: "L'attention devient connexion quand les créateurs amènent les personnes dans des lieux réels.",
      body: "Crays peut relier publics, marques, événements privés, lieux d'hospitalité et paiements directs. Les fans peuvent se rencontrer, voyager, participer, cocréer et entrer dans l'économie du lieu.",
      cards: [{ kicker: "Outils créateurs", title: "Profils et accès payant", body: "Identité portable, contenu, abonnements, pourboires et accès événementiel plus proches des fans." }, { kicker: "Parcours fans", title: "De l'écran au lieu", body: "La demande peut aller vers dîners, rooftops, retraites, clubs, villas et expériences locales." }],
    },
    seeking: {
      eyebrow: "Ce que nous recherchons", title: "Apportez ce qui correspond aux valeurs. Construisez ce qui crée une activité réelle.",
      body: "Crays grandit avec ceux qui apportent lieux utiles, communautés, produits, culture, capital, responsabilité et excellence opérationnelle. Le filtre est la confiance, la qualité et l'élan réel, pas le battage.",
      ctas: ["Démarrer le projet", "Parler à Crays"],
      cards: [{ kicker: "01", title: "Lieu", body: "Hôtel, club, lounge, retraite, rooftop, coworking ou lieu culturel." }, { kicker: "02", title: "Communauté", body: "Public créateur, cercle de fondateurs, scène locale ou groupe nomade." }, { kicker: "03", title: "Produit", body: "Technologie, hospitalité, bien-être, retail ou couche de paiement." }, { kicker: "04", title: "Propriété", body: "Actifs réels, véhicules partenaires, co-investissement et participation tokenisée." }, { kicker: "05", title: "Responsabilité", body: "La liberté fonctionne avec bienveillance, discipline, discrétion et contribution utile." }],
    },
    vision: { eyebrow: "Vision 2035", title: "Une architecture lifestyle Bitcoin-native pour une ère de vitesse réelle.", body: "La vision est un réseau mondial de lieux Crays physiques et partenaires où payer, voyager, rencontrer, créer, réserver, investir et construire avec plus de propriété et moins de dépendance aux plateformes.", closing: "Ne vous contentez pas de prédire l'avenir. Sortez et construisez-le ensemble.", ctas: ["Nouveaux projets", "Hospitality Brand Alliance"] },
    mediaBlocked: "Média retenu", mediaBlockedDetail: "L'image exacte d'hospitalité ou d'immobilier reste masquée jusqu'à vérification de la source, de la pertinence et des droits.", credits: "Crédits médias et notes de droits",
  },
  pt: {
    localeName: "Português", metadata: { title: "Lifestyle | CRAYS Clubs", description: "A camada operacional do mundo real para pessoas em movimento: adesão, hospitalidade, trabalho, cultura e comunidade." }, shell: shells.pt,
    firstHero: { eyebrow: "Crays Lifestyle", title: "A camada operacional do mundo real para pessoas em movimento.", body: "A Crays liga adesão, hospitalidade, trabalho, cultura, villas, pagamentos e comunidade num sistema reconhecível para builders, criadores, fundadores e cidadãos globais.", ctas: ["Tornar-se membro", "Explorar estadias", "Falar com a Crays"], signals: ["Identidade de membro", "Super Node do espaço", "Pagamentos de valor"] },
    anchors: ["Mapa de camadas", "Ritmo diário", "Portas Crays", "Construir connosco"],
    layer: { eyebrow: "Mapa de camadas", title: "Não é outra página lifestyle. É um mapa vivo do ecossistema Crays.", body: "A marca tem quatro forças: a Association governa a propriedade intelectual comum, Fund estrutura capital e imobiliário, World transforma espaços em nós locais inteligentes e Club torna o estilo de vida tangível.", cards: [
      { kicker: "01", title: "Association", body: "Builders, makers, governação e propriedade intelectual comum.", href: "https://www.crays.org/", external: true }, { kicker: "02", title: "Fund", body: "Imobiliário, património, infraestrutura de villas e lógica de portefólio.", href: "https://www.crays.fund/", external: true }, { kicker: "03", title: "World", body: "Hospitalidade Web5, app Nostr, Super Nodes e pagamentos.", href: "https://www.crays.world/", external: true }, { kicker: "04", title: "Club", body: "Trabalhar, viver, brincar, eventos, lounges e espaços reais.", href: "hospitality" },
    ] },
    rhythm: { eyebrow: "Ritmo diário", title: "Um dia deve sentir-se ligado do primeiro café à última sala.", stages: [
      { marker: "Manhã", title: "Sinal de trabalho", body: "Café, foco, contexto local e as pessoas certas por perto." }, { marker: "Meio-dia", title: "Base Club", body: "Reuniões, chamadas, serviço e um lugar que parece conhecido." }, { marker: "Noite", title: "Cultura anfitriã", body: "Jantares e apresentações que transformam movimento em pertença." }, { marker: "Madrugada", title: "Grafo do espaço", body: "A sala torna-se visível: ambiente, intenção, serviços e pagamentos." },
    ], outcome: "Resultado · Menos ruído de plataforma. Mais atividade real.", mood: "Ambiente + intenção · Social, trabalho, criador, hóspede" },
    feed: { eyebrow: "Do feed para a sala", title: "A interface deve desaparecer dentro do lugar.", body: "A Crays é mais forte quando a camada digital coordena um resultado real: chegar, combinar, reservar, pedir, pagar, conhecer, ficar ou construir. É a promessa de Club, World, Fund e Association.", stages: [{ marker: "01", title: "Chegar", body: "O contexto aparece antes de a sala parecer anónima." }, { marker: "02", title: "Combinar", body: "Pessoas, propósito e proximidade tornam-se sinais úteis." }, { marker: "03", title: "Instalar-se", body: "Pagamentos e serviço ficam próximos da relação com o espaço." }] },
    doors: { eyebrow: "Portas Crays", title: "Escolha a porta que cria movimento real.", cards: [
      { kicker: "Membro", title: "Entrar na camada lifestyle", body: "Adesão, acesso, ritmo social e lugares recorrentes.", href: "become-a-member" }, { kicker: "Villas", title: "Reservar ou pedir estadia", body: "Propriedades de luxo selecionadas com lógica de hospitalidade Crays.", href: "hospitality" }, { kicker: "Espaço", title: "Levar Crays a uma sala", body: "Super Nodes, app, pagamentos e ativação de hóspedes.", href: "https://www.crays.world/", external: true }, { kicker: "Capital", title: "Compreender a camada de ativos", body: "Imobiliário de arrendamento de luxo e infraestrutura de investimento.", href: "https://www.crays.fund/", external: true },
    ] },
    build: { eyebrow: "Construir connosco", title: "Traga o que corresponde aos valores. Construa o que cria atividade real.", body: "Espaço, comunidade, produto, propriedade e responsabilidade não são slogans separados. São o filtro do que pertence à Crays.", ctas: ["Iniciar projeto", "Aliança de hospitalidade", "Contacto"], values: ["Espaço", "Comunidade", "Produto", "Propriedade", "Responsabilidade"] },
    secondHero: { eyebrow: "Crays Lifestyle", title: "Trabalhe, viva, brinque e pertença numa só camada Crays.", body: "A Crays transforma mobilidade num sistema lifestyle: lugares reais, pessoas de confiança, rotinas de hospitalidade e acesso digital para builders, makers, criadores, fundadores e cidadãos globais.", ctas: ["Tornar-se membro", "Explorar o modelo"], signals: [{ kicker: "Pessoas", title: "Builders, makers e cidadãos globais", body: "" }, { kicker: "Lugares", title: "Clubs, villas, lounges e bases urbanas", body: "" }, { kicker: "Camada", title: "Acesso, identidade, eventos e pagamentos", body: "" }], media: [{ label: "Pronto para trabalhar", media: "work" }, { label: "Energia social", media: "community" }, { label: "Ritmo global", media: "blocked" }] },
    architecture: { title: "Não é um feed. É uma arquitetura lifestyle do mundo real.", body: "A camada digital deve levar pessoas a salas, villas, clubs, jantares, espaços de trabalho e oportunidades partilhadas.", media: [{ label: "Cidade", media: "work" }, { label: "Comunidade", media: "community" }, { label: "Jantar", media: "food" }, { label: "Viver", media: "blocked" }, { label: "Cultura", media: "studio" }], pillars: [
      { kicker: "Comunidade", title: "Pessoas que constroem e se movem", body: "Membros, hóspedes, criadores, fundadores, operadores e parceiros encontram-se em lugares úteis, não em feeds passivos." }, { kicker: "Lifestyle", title: "Trabalhar, viver e brincar juntos", body: "Hospitalidade, trabalho, jantares, villas, clubs e eventos formam uma experiência reconhecível." }, { kicker: "Tecnologia", title: "Acesso digital com resultados reais", body: "Identidade, reservas, pagamentos, recomendações e sinais comunitários devem terminar em encontros e atividade." },
    ] },
    founder: { eyebrow: "Motivação do fundador", title: "Um sistema lifestyle nascido de anos na estrada.", body: "A ideia Crays parte de uma observação: viajar ficou fácil e o trabalho remoto normal, mas pertencer não. As pessoas movem-se mais depressa e ainda precisam de lugares onde trabalho, confiança, recuperação e amizade aconteçam naturalmente.", cards: [
      { kicker: "Peça em falta", title: "Ligação real", body: "A mobilidade amplia alcance; o valor começa quando sabemos onde chegar e quem conhecer." }, { kicker: "Resposta", title: "Hubs locais inteligentes", body: "Espaços Crays tornam clubs, villas, lounges e parceiros em nós comunitários repetíveis." }, { kicker: "Modelo", title: "Hospitalidade útil", body: "Lugares bonitos contam, mas serviço, acesso, rotinas e inteligência local fazem-nos funcionar." }, { kicker: "Resultado", title: "Pertencer mais depressa", body: "Membros entram mais depressa em novos lugares sem começar cada estadia do zero." },
    ], media: [{ label: "Movimento", media: "work" }, { label: "Confiança", media: "community" }, { label: "Recuperação", media: "food" }] },
    world: { eyebrow: "O mundo que queremos", title: "A liberdade precisa de propriedade, dignidade e lugares úteis.", body: "A Crays liga liberdade pessoal a infraestrutura real: lugares para ficar, trabalhar e encontrar, mais vias digitais para identidade, acesso, pagamentos e participação. Luxo significa fiabilidade, privacidade, qualidade e proximidade humana.", cards: [
      { kicker: "Propriedade", title: "Manter mais controlo", body: "Identidade, adesões, acesso e participação devem ser mais portáteis e menos dependentes de plataformas fechadas." }, { kicker: "Privacidade", title: "Respeitar o hóspede", body: "Hospitalidade de qualidade exige confiança, discrição e regras claras para dados, acesso e conduta." }, { kicker: "Oportunidade", title: "Conhecer as pessoas certas", body: "Espaços Crays devem criar oportunidades empresariais, criativas, culturais e pessoais que não surgem apenas online." }, { kicker: "Pertença", title: "Sentir-se em casa mais cedo", body: "Uma marca conhecida facilita entrar, usar e apreciar lugares desconhecidos." },
    ], media: [{ label: "Propriedade", media: "studio" }, { label: "Lugares úteis", media: "blocked" }, { label: "Proximidade humana", media: "community" }] },
    ecosystem: { eyebrow: "Ecossistema", title: "Os produtos provam que a comunidade pode tornar-se útil.", body: "Crays Lifestyle liga clubs, villas, cultura de café, hotéis, eventos, criadores, serviços de hospitalidade e futuros modelos Bitcoin-native. Cada produto deve devolver pessoas a lugares reais e momentos partilhados.", cards: [
      { kicker: "Clubs", title: "Bases work-live-play", body: "Lugares locais e globais para reuniões, foco, saúde, vida social e comunidade recorrente." }, { kicker: "Villas", title: "Estadias anfitriãs", body: "Villas mediterrânicas com padrões Crays, lógica de proprietário e pedido antes da reserva." }, { kicker: "Circle", title: "Acesso digital", body: "Perfis, descoberta, serviços, adesões, pagamentos e interação com espaços numa camada." }, { kicker: "Eventos", title: "Cultura visível", body: "Jantares, prémios, rooftops e momentos criadores tornam a comunidade tangível." },
    ], media: [{ label: "Clubs", media: "work" }, { label: "Cultura", media: "studio" }, { label: "Estadias", media: "blocked" }] },
    social: { eyebrow: "Camada social real", title: "A app deve tirar pessoas dos feeds passivos e levá-las à sala.", body: "Ferramentas digitais valem quando coordenam resultados reais: reserva, jantar, trabalho, apresentação, pagamento, serviço local ou momento comunitário. A Crays usa tecnologia como infraestrutura para velocidade real.", stages: [
      { marker: "01", title: "A identidade acompanha-o", body: "Perfis e contexto viajam entre lugares e superfícies digitais." }, { marker: "02", title: "Lugares tornam-se nós", body: "Clubs, villas e parceiros tornam-se acessos locais à rede." }, { marker: "03", title: "Intenção torna-se ação", body: "Descoberta, matching e serviço devem criar encontros e reservas." }, { marker: "04", title: "O valor circula", body: "Pagamentos, procura criadora, hospitalidade e participação ficam perto de quem cria valor." }, { marker: "05", title: "A confiança acumula", body: "Boas experiências facilitam a próxima cidade, estadia e apresentação." },
    ], media: [{ label: "Identidade", media: "studio" }, { label: "Lugar", media: "blocked" }, { label: "Atividade", media: "community" }] },
    creators: { eyebrow: "Criadores e cultura", title: "A atenção torna-se ligação quando criadores levam pessoas a lugares reais.", body: "A Crays pode ligar audiências, marcas, eventos privados, espaços de hospitalidade e pagamentos diretos. Fãs podem encontrar-se, viajar, participar, cocriar e entrar na economia do espaço.", cards: [{ kicker: "Ferramentas", title: "Perfis e acesso pago", body: "Identidade portátil, conteúdo, subscrições, gorjetas e acesso a eventos mais perto dos fãs." }, { kicker: "Percursos", title: "Do ecrã ao espaço", body: "A procura pode chegar a jantares, rooftops, retiros, clubs, villas e experiências locais." }] },
    seeking: { eyebrow: "O que procuramos", title: "Traga o que corresponde aos valores. Construa o que cria atividade real.", body: "A Crays cresce com quem traz lugares úteis, comunidades, produtos, cultura, capital, responsabilidade e excelência operacional. O filtro é confiança, qualidade e impulso real, não hype.", ctas: ["Iniciar projeto", "Falar com a Crays"], cards: [
      { kicker: "01", title: "Espaço", body: "Hotel, club, lounge, retiro, rooftop, coworking ou espaço cultural." }, { kicker: "02", title: "Comunidade", body: "Audiência criadora, círculo fundador, cena local ou grupo nómada." }, { kicker: "03", title: "Produto", body: "Tecnologia, hospitalidade, bem-estar, retail ou pagamentos." }, { kicker: "04", title: "Propriedade", body: "Ativos reais, veículos parceiros, coinvestimento e participação tokenizada." }, { kicker: "05", title: "Responsabilidade", body: "Liberdade funciona melhor com bondade, disciplina, discrição e contribuição útil." },
    ] },
    vision: { eyebrow: "Visão 2035", title: "Uma arquitetura lifestyle Bitcoin-native para uma era de velocidade real.", body: "A visão é uma rede global de lugares Crays físicos e parceiros onde pagar, viajar, encontrar, criar, reservar, investir e construir com mais propriedade e menos dependência de plataformas.", closing: "Não se limite a prever o futuro. Saia e construa-o em conjunto.", ctas: ["Novos projetos", "Hospitality Brand Alliance"] },
    mediaBlocked: "Media retido", mediaBlockedDetail: "A imagem exata de hospitalidade ou imobiliário fica oculta até verificar fonte, relevância e direitos.", credits: "Créditos e notas de direitos",
  },
  it: {
    localeName: "Italiano", metadata: { title: "Lifestyle | CRAYS Clubs", description: "Il livello operativo reale per persone in movimento: membership, ospitalità, lavoro, cultura e community." }, shell: shells.it,
    firstHero: { eyebrow: "Crays Lifestyle", title: "Il livello operativo reale per persone in movimento.", body: "Crays collega membership, ospitalità, lavoro, cultura, ville, pagamenti e community in un sistema riconoscibile per builder, creator, founder e cittadini globali.", ctas: ["Diventa membro", "Esplora i soggiorni", "Parla con Crays"], signals: ["Identità membro", "Super Node del luogo", "Pagamenti di valore"] },
    anchors: ["Mappa dei livelli", "Ritmo quotidiano", "Porte Crays", "Costruisci con noi"],
    layer: { eyebrow: "Mappa dei livelli", title: "Non un'altra pagina lifestyle. Una mappa viva dell'ecosistema Crays.", body: "Il brand ha quattro forze: Association governa la proprietà intellettuale comune, Fund struttura capitale e immobili, World trasforma i luoghi in nodi locali intelligenti e Club rende tangibile lo stile di vita.", cards: [
      { kicker: "01", title: "Association", body: "Builder, maker, governance e proprietà intellettuale comune.", href: "https://www.crays.org/", external: true }, { kicker: "02", title: "Fund", body: "Immobili, patrimonio, infrastruttura di ville e logica di portafoglio.", href: "https://www.crays.fund/", external: true }, { kicker: "03", title: "World", body: "Ospitalità Web5, app Nostr, Super Nodes e pagamenti.", href: "https://www.crays.world/", external: true }, { kicker: "04", title: "Club", body: "Lavorare, vivere, giocare, eventi, lounge e stanze reali.", href: "hospitality" },
    ] },
    rhythm: { eyebrow: "Ritmo quotidiano", title: "Una giornata deve restare connessa dal primo caffè all'ultima stanza.", stages: [
      { marker: "Mattina", title: "Segnale di lavoro", body: "Caffè, concentrazione, contesto locale e persone giuste vicine." }, { marker: "Mezzogiorno", title: "Base Club", body: "Riunioni, chiamate, servizio e un luogo che sembra familiare." }, { marker: "Sera", title: "Cultura ospitata", body: "Cene e presentazioni trasformano il movimento in appartenenza." }, { marker: "Notte", title: "Grafo del luogo", body: "La stanza diventa visibile: atmosfera, intento, servizi e pagamenti." },
    ], outcome: "Risultato · Meno rumore di piattaforma. Più attività reale.", mood: "Atmosfera + intento · Socialità, lavoro, creator, ospite" },
    feed: { eyebrow: "Dal feed alla stanza", title: "L'interfaccia deve scomparire nel luogo.", body: "Crays è più forte quando il livello digitale coordina un risultato reale: arrivare, abbinare, prenotare, ordinare, pagare, incontrare, soggiornare o costruire. È la promessa di Club, World, Fund e Association.", stages: [{ marker: "01", title: "Arrivare", body: "Il contesto appare prima che la stanza sembri anonima." }, { marker: "02", title: "Abbinare", body: "Persone, scopo e prossimità diventano segnali utili." }, { marker: "03", title: "Stabilirsi", body: "Pagamenti e servizio restano vicini al rapporto con il luogo." }] },
    doors: { eyebrow: "Porte Crays", title: "Scegli la porta che crea movimento reale.", cards: [
      { kicker: "Membro", title: "Entra nel livello lifestyle", body: "Membership, accesso, ritmo sociale e luoghi ricorrenti.", href: "become-a-member" }, { kicker: "Ville", title: "Prenota o richiedi un soggiorno", body: "Proprietà di lusso selezionate con logica di ospitalità Crays.", href: "hospitality" }, { kicker: "Luogo", title: "Porta Crays in una stanza", body: "Super Nodes, app, pagamenti e attivazione degli ospiti.", href: "https://www.crays.world/", external: true }, { kicker: "Capitale", title: "Comprendi il livello degli asset", body: "Immobili di lusso per soggiorni brevi e infrastruttura di investimento.", href: "https://www.crays.fund/", external: true },
    ] },
    build: { eyebrow: "Costruisci con noi", title: "Porta ciò che rispetta i valori. Costruisci ciò che crea attività reale.", body: "Luogo, community, prodotto, proprietà e responsabilità non sono slogan separati. Sono il filtro di ciò che appartiene a Crays.", ctas: ["Avvia progetto", "Alleanza ospitalità", "Contatti"], values: ["Luogo", "Community", "Prodotto", "Proprietà", "Responsabilità"] },
    secondHero: { eyebrow: "Crays Lifestyle", title: "Lavora, vivi, gioca e appartieni in un unico livello Crays.", body: "Crays trasforma la mobilità in un sistema lifestyle: luoghi reali, persone fidate, routine di ospitalità e accesso digitale per builder, maker, creator, founder e cittadini globali.", ctas: ["Diventa membro", "Esplora il modello"], signals: [{ kicker: "Persone", title: "Builder, maker e cittadini globali", body: "" }, { kicker: "Luoghi", title: "Club, ville, lounge e basi urbane", body: "" }, { kicker: "Livello", title: "Accesso, identità, eventi e pagamenti", body: "" }], media: [{ label: "Pronto al lavoro", media: "work" }, { label: "Energia sociale", media: "community" }, { label: "Ritmo globale", media: "blocked" }] },
    architecture: { title: "Non un feed. Un'architettura lifestyle del mondo reale.", body: "Il livello digitale deve portare persone in stanze, ville, club, cene, spazi di lavoro e opportunità condivise.", media: [{ label: "Città", media: "work" }, { label: "Community", media: "community" }, { label: "Cena", media: "food" }, { label: "Vivere", media: "blocked" }, { label: "Cultura", media: "studio" }], pillars: [
      { kicker: "Community", title: "Persone che costruiscono e si muovono", body: "Membri, ospiti, creator, founder, operatori e partner si incontrano in luoghi utili, non in feed passivi." }, { kicker: "Lifestyle", title: "Lavorare, vivere e giocare insieme", body: "Ospitalità, lavoro, cene, ville, club ed eventi formano un'esperienza riconoscibile." }, { kicker: "Tecnologia", title: "Accesso digitale, risultati reali", body: "Identità, prenotazioni, pagamenti, raccomandazioni e segnali di community devono finire in incontri e attività." },
    ] },
    founder: { eyebrow: "Motivazione del founder", title: "Un sistema lifestyle nato da anni sulla strada.", body: "L'idea Crays nasce da un'osservazione: viaggiare è diventato facile e lavorare da remoto normale, ma appartenere no. Le persone si muovono più velocemente e hanno ancora bisogno di luoghi dove lavoro, fiducia, recupero e amicizia accadano naturalmente.", cards: [
      { kicker: "Elemento mancante", title: "Connessione reale", body: "La mobilità amplia la portata; il valore inizia quando sai dove arrivare e chi incontrare." }, { kicker: "Risposta", title: "Hub locali intelligenti", body: "I luoghi Crays trasformano club, ville, lounge e partner in nodi di community ripetibili." }, { kicker: "Modello", title: "Ospitalità utile", body: "La bellezza conta, ma servizio, accesso, routine e intelligenza locale fanno funzionare i luoghi." }, { kicker: "Risultato", title: "Appartenere più in fretta", body: "I membri entrano più rapidamente in luoghi nuovi senza ripartire da zero." },
    ], media: [{ label: "Movimento", media: "work" }, { label: "Fiducia", media: "community" }, { label: "Recupero", media: "food" }] },
    world: { eyebrow: "Il mondo che vogliamo", title: "La libertà ha bisogno di proprietà, dignità e luoghi utili.", body: "Crays collega libertà personale e infrastruttura reale: luoghi dove soggiornare, lavorare e incontrarsi, più binari digitali per identità, accesso, pagamenti e partecipazione. Lusso significa affidabilità, privacy, qualità e prossimità umana.", cards: [
      { kicker: "Proprietà", title: "Mantieni più controllo", body: "Identità, membership, accesso e partecipazione devono essere più portabili e meno dipendenti da piattaforme chiuse." }, { kicker: "Privacy", title: "Rispetta l'ospite", body: "L'ospitalità di qualità richiede fiducia, discrezione e regole chiare per dati, accesso e comportamento." }, { kicker: "Opportunità", title: "Incontra le persone giuste", body: "I luoghi Crays devono creare opportunità professionali, creative, culturali e personali che non nascono solo online." }, { kicker: "Appartenenza", title: "Sentiti a casa prima", body: "Un brand conosciuto facilita entrare, usare e apprezzare luoghi sconosciuti." },
    ], media: [{ label: "Proprietà", media: "studio" }, { label: "Luoghi utili", media: "blocked" }, { label: "Prossimità umana", media: "community" }] },
    ecosystem: { eyebrow: "Ecosistema", title: "I prodotti dimostrano che la community può diventare utile.", body: "Crays Lifestyle collega club, ville, cultura del caffè, hotel, eventi, creator, servizi di ospitalità e futuri modelli Bitcoin-native. Ogni prodotto deve riportare persone in luoghi reali e momenti condivisi.", cards: [
      { kicker: "Club", title: "Basi work-live-play", body: "Luoghi locali e globali per riunioni, concentrazione, salute, vita sociale e community ricorrente." }, { kicker: "Ville", title: "Soggiorni ospitati", body: "Ville mediterranee con standard Crays, logica proprietaria e richiesta prima della prenotazione." }, { kicker: "Circle", title: "Accesso digitale", body: "Profili, scoperta, servizi, membership, pagamenti e interazione con i luoghi in un livello." }, { kicker: "Eventi", title: "Cultura visibile", body: "Cene, premi, rooftop e momenti creator rendono tangibile la community." },
    ], media: [{ label: "Club", media: "work" }, { label: "Cultura", media: "studio" }, { label: "Soggiorni", media: "blocked" }] },
    social: { eyebrow: "Livello sociale reale", title: "L'app deve portare le persone dai feed passivi alla stanza.", body: "Gli strumenti digitali valgono quando coordinano risultati reali: prenotazione, cena, lavoro, presentazione, pagamento, servizio locale o momento comunitario. Crays usa la tecnologia come infrastruttura per velocità reale.", stages: [
      { marker: "01", title: "L'identità ti segue", body: "Profili e contesto viaggiano tra luoghi e superfici digitali." }, { marker: "02", title: "I luoghi diventano nodi", body: "Club, ville e partner diventano accessi locali alla rete." }, { marker: "03", title: "L'intento diventa azione", body: "Scoperta, matching e servizio devono creare incontri e prenotazioni." }, { marker: "04", title: "Il valore circola", body: "Pagamenti, domanda creator, ospitalità e partecipazione restano vicini a chi crea valore." }, { marker: "05", title: "La fiducia cresce", body: "Le buone esperienze facilitano la prossima città, il soggiorno e l'incontro." },
    ], media: [{ label: "Identità", media: "studio" }, { label: "Luogo", media: "blocked" }, { label: "Attività", media: "community" }] },
    creators: { eyebrow: "Creator e cultura", title: "L'attenzione diventa connessione quando i creator portano persone in luoghi reali.", body: "Crays può collegare audience, brand, eventi privati, luoghi di ospitalità e pagamenti diretti. I fan possono incontrarsi, viaggiare, partecipare, cocreare ed entrare nell'economia del luogo.", cards: [{ kicker: "Strumenti", title: "Profili e accesso a pagamento", body: "Identità portabile, contenuti, abbonamenti, mance e accesso eventi più vicini ai fan." }, { kicker: "Percorsi fan", title: "Dallo schermo al luogo", body: "La domanda può arrivare a cene, rooftop, retreat, club, ville ed esperienze locali." }] },
    seeking: { eyebrow: "Ciò che cerchiamo", title: "Porta ciò che rispetta i valori. Costruisci ciò che crea attività reale.", body: "Crays cresce con chi porta luoghi utili, community, prodotti, cultura, capitale, responsabilità ed eccellenza operativa. Il filtro è fiducia, qualità e slancio reale, non hype.", ctas: ["Avvia progetto", "Parla con Crays"], cards: [
      { kicker: "01", title: "Luogo", body: "Hotel, club, lounge, retreat, rooftop, coworking o spazio culturale." }, { kicker: "02", title: "Community", body: "Audience creator, founder circle, scena locale o gruppo nomade." }, { kicker: "03", title: "Prodotto", body: "Tecnologia, ospitalità, wellness, retail o pagamenti." }, { kicker: "04", title: "Proprietà", body: "Asset reali, veicoli partner, coinvestimento e partecipazione tokenizzata." }, { kicker: "05", title: "Responsabilità", body: "La libertà funziona con gentilezza, disciplina, discrezione e contributo utile." },
    ] },
    vision: { eyebrow: "Visione 2035", title: "Un'architettura lifestyle Bitcoin-native per un'era di velocità reale.", body: "La visione è una rete globale di luoghi Crays fisici e partner dove pagare, viaggiare, incontrare, creare, prenotare, investire e costruire con più proprietà e meno dipendenza dalle piattaforme.", closing: "Non limitarti a prevedere il futuro. Esci e costruiscilo insieme.", ctas: ["Nuovi progetti", "Hospitality Brand Alliance"] },
    mediaBlocked: "Media trattenuto", mediaBlockedDetail: "L'immagine esatta di ospitalità o immobiliare resta nascosta finché fonte, rilevanza e diritti non sono verificati.", credits: "Crediti media e note sui diritti",
  },
};
