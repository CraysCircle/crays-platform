import localizedBecomeMemberCopy from "./become-a-member-localized.generated.json";

export const becomeMemberLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
export type BecomeMemberLocale = (typeof becomeMemberLocales)[number];

type Item = { label?: string; title: string; body: string };
type Layer = { title: string; price: string; body: string };

export type BecomeMemberShellCopy = {
  languageName: string;
  skip: string;
  home: string;
  nav: string;
  menu: string;
  open: string;
  close: string;
  account: string;
  language: string;
  title: string;
  lead: string;
  explore: string;
  belong: string;
  company: string;
  association: string;
  associationLead: string;
  newTab: string;
  footerLead: string;
  footerCta: string;
  release: string;
  links: {
    forest: string;
    community: string;
    school: string;
    ambassadors: string;
    families: string;
    teams: string;
    events: string;
    companies: string;
    conference: string;
    about: string;
    lifestyle: string;
    hospitality: string;
    member: string;
    contact: string;
    brand: string;
    account: string;
    legal: string;
  };
};

export type BecomeMemberCopy = {
  localeName: string;
  metaTitle: string;
  metaDescription: string;
  shell: BecomeMemberShellCopy;
  pageLabel: string;
  mediaBlocked: string;
  hero: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
    signals: readonly string[];
  };
  idea: {
    title: string;
    lead: string;
    paragraphs: readonly string[];
  };
  access: {
    title: string;
    lead: string;
    items: readonly Item[];
  };
  living: {
    title: string;
    lead: string;
    body: string;
    items: readonly Item[];
  };
  companies: {
    title: string;
    lead: string;
    body: string;
    items: readonly Item[];
    close: string;
  };
  responsible: {
    title: string;
    lead: string;
    body: string;
    points: readonly string[];
  };
  creators: {
    title: string;
    lead: string;
    body: string;
    items: readonly Item[];
    close: string;
  };
  layers: {
    title: string;
    lead: string;
    body: string;
    items: readonly Layer[];
    close: string;
    signals: readonly string[];
  };
  closing: {
    title: string;
    lead: string;
    body: string;
    action: string;
  };
};

const sharedContent = {
  hero: {
    title: "One membership for living, working and showing up in the real world.",
    body: "Crays membership connects flexible stays, productive work settings, local community, responsible hospitality, business access and creator partnerships in one Crays layer.",
    primary: "Request membership access",
    secondary: "View membership layers",
    signals: ["Flexible Living", "Club Access", "Business Teams", "Creator Partners"]
  },
  idea: {
    title: "The Membership Idea",
    lead: "Crays is not another booking page. It is a membership system for people who move.",
    paragraphs: [
      "Remote work, subscription living, business mobility and creator-led community all point to the same need: people want places that make movement easier without making life feel temporary.",
      "A Crays membership gives members one route into stays, workspaces, hosted moments, local access and future booking logic instead of a stack of disconnected products."
    ]
  },
  access: {
    title: "Access Map",
    lead: "Four routes into the same Crays circle.",
    items: [
      { label: "01", title: "Flexible Living", body: "Stay across curated Crays places without losing routines, productivity or the feeling of home." },
      { label: "02", title: "Work-Ready Clubs", body: "Use workspaces, quiet zones, meetings, connectivity, coffee and service as daily infrastructure." },
      { label: "03", title: "Business Teams", body: "Give employees remote-work freedom, team connection and predictable access to productive places." },
      { label: "04", title: "Creator Partners", body: "Bring stories, audiences and cultural momentum into real Crays locations and events." }
    ]
  },
  living: {
    title: "Living System",
    lead: "Subscription living becomes useful when it solves work, home and community together.",
    body: "Today's rental market does not reflect the needs of a modern remote workforce. Crays turns flexible homes, hotels, clubs and work settings into one operating layer for people who live between cities.",
    items: [
      { label: "Remote Work", title: "Work from anywhere", body: "Members need reliable places to work without rebuilding their setup in every city." },
      { label: "Housing as a Service", title: "Live without losing home", body: "Furnished stays, comfort and routines make mobility feel practical instead of temporary." },
      { label: "City Layer", title: "Arrive with context", body: "The club gives local introductions, hosted access and a reason to show up." },
      { label: "Future Booking", title: "Ready for availability", body: "The visual membership layer can later connect to Crays Booking rooms, services and add-ons." }
    ]
  },
  companies: {
    title: "For Companies",
    lead: "Corporate team memberships make flexible work easier to trust.",
    body: "Companies can use Crays as a shared remote-work and living layer for teams, projects and business trips. The goal is simple: reduce friction, improve employer attractiveness and keep teams connected when work is no longer tied to one office.",
    items: [
      { title: "Competitive advantage", body: "Give teams access to places that support modern work and global mobility." },
      { title: "Talent signal", body: "Freedom, responsibility and memorable locations become part of the employer offer." },
      { title: "Flexible seats", body: "Memberships can scale up or down with employees, teams and project needs." },
      { title: "Monthly logic", body: "Corporate access can be structured as recurring memberships with one account layer." }
    ],
    close: "Built for companies that want remote freedom without losing team culture."
  },
  responsible: {
    title: "Responsible Living",
    lead: "Sustainability belongs in the operating model, not the footer.",
    body: "The sustainable-living layer is part of membership: lower-waste furnishing, conscious operations, community education and a roadmap toward healthier, more responsible places.",
    points: [
      "Furniture and materials selected for durability, reuse and donation paths.",
      "Resident guidance that helps reduce energy use without making daily life complicated.",
      "Local communities treated as partners, not backdrops.",
      "Long-term carbon discipline across homes, clubs and operating partners."
    ]
  },
  creators: {
    title: "Creator Partnerships",
    lead: "Creators help the Crays world become visible in real life.",
    body: "Crays works with creators, community builders and social voices who can translate places into stories. The useful partner does more than post online: they bring people together, document real moments and make the community easier to understand.",
    items: [
      { title: "Strong community", body: "Tell your audience about Crays lifestyle, memberships and real-world access." },
      { title: "Creator reach", body: "Influencer partnerships are built for creators with meaningful audiences and intent." },
      { title: "Travel rhythm", body: "Travel, document and work from Crays places while making the network tangible." },
      { title: "Supported platforms", body: "Instagram, YouTube, TikTok, LinkedIn, X, events and community channels." }
    ],
    close: "Creator partnerships should turn attention into people showing up, not empty reach."
  },
  layers: {
    title: "Membership Layers",
    lead: "Start narrow, then scale the access.",
    body: "The first visible membership structure stays simple. Pricing, availability, room types and services can later be connected to Crays Booking when the booking layer is ready.",
    items: [
      { title: "Fashion Membership", price: "EUR 3,500", body: "Entry layer for selected destinations, workspace access and standard Crays concierge support." },
      { title: "Sphere Membership", price: "EUR 5,000", body: "Broader accommodation access, work settings and community benefits across multiple Crays regions." },
      { title: "Falcon Membership", price: "EUR 7,500", body: "Premium city-life access with VIP events, stronger concierge service and automated check-in direction." }
    ],
    close: "Every layer starts with one membership conversation. The next step is matching access to the right use: private member, business team, creator partner or hospitality stay.",
    signals: ["City access", "Community rhythm", "Club lifestyle"]
  },
  closing: {
    lead: "One membership conversation. Then we connect the right layer.",
    body: "Start with the Crays Circle first. The booking, stay and add-on logic can become transactional after the Crays Booking connection is ready.",
    action: "Request membership access"
  }
};

const shells: Record<BecomeMemberLocale, BecomeMemberShellCopy> = {
  en: {
    languageName: "English", skip: "Skip to membership content", home: "CRAYS Clubs home", nav: "Primary navigation",
    menu: "Menu", open: "Open menu", close: "Close menu", account: "Account", language: "Language",
    title: "Explore CRAYS Clubs", lead: "Forest City is our campus. Discover people, places and invitation-led journeys.",
    explore: "Explore", belong: "Belong", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "The independent association is part of the wider CRAYS context.", newTab: "opens in a new tab",
    footerLead: "Meet friends, colleagues and partners in the new world of Crays Club.", footerCta: "Claim your global home",
    release: "Pre-release public experience. No promise of booking, price, availability, investment or admission.",
    links: { forest: "Forest City", community: "Community Life", school: "School & Jobs", ambassadors: "Ambassadors", families: "Families", teams: "Teams", events: "Events", companies: "Portfolio Companies", conference: "Conference", about: "About Us", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Become a Member", contact: "Contact", brand: "Brand as a Service", account: "Account", legal: "Legal" }
  },
  de: {
    languageName: "Deutsch", skip: "Zum Mitgliedschaftsinhalt springen", home: "CRAYS Clubs Startseite", nav: "Hauptnavigation",
    menu: "Menue", open: "Menue oeffnen", close: "Menue schliessen", account: "Konto", language: "Sprache",
    title: "CRAYS Clubs entdecken", lead: "Forest City ist unser Campus. Entdecke Menschen, Orte und einladungsgefuehrte Wege.",
    explore: "Entdecken", belong: "Dazugehoeren", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "Der unabhaengige Verein ist Teil des groesseren CRAYS-Kontexts.", newTab: "oeffnet in einem neuen Tab",
    footerLead: "Triff Freunde, Kollegen und Partner in der neuen Welt des Crays Club.", footerCta: "Beanspruche dein globales Zuhause",
    release: "Oeffentliche Pre-Release-Erfahrung. Kein Versprechen zu Buchung, Preis, Verfuegbarkeit, Investment oder Aufnahme.",
    links: { forest: "Forest City", community: "Community Life", school: "School & Jobs", ambassadors: "Ambassadors", families: "Familien", teams: "Teams", events: "Events", companies: "Portfolio Companies", conference: "Konferenz", about: "Ueber uns", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Mitglied werden", contact: "Kontakt", brand: "Brand as a Service", account: "Konto", legal: "Rechtliches" }
  },
  es: {
    languageName: "Espa\u00f1ol", skip: "Saltar al contenido de membres\u00eda", home: "Inicio CRAYS Clubs", nav: "Navegaci\u00f3n principal",
    menu: "Men\u00fa", open: "Abrir men\u00fa", close: "Cerrar men\u00fa", account: "Cuenta", language: "Idioma",
    title: "Explora CRAYS Clubs", lead: "Forest City es nuestro campus. Descubre personas, lugares y recorridos por invitaci\u00f3n.",
    explore: "Explorar", belong: "Pertenecer", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "La asociaci\u00f3n independiente forma parte del contexto CRAYS.", newTab: "se abre en una pesta\u00f1a nueva",
    footerLead: "Conoce a amigos, colegas y socios en el nuevo mundo Crays Club.", footerCta: "Reclama tu hogar global",
    release: "Experiencia p\u00fablica previa al lanzamiento. Sin promesa de reserva, precio, disponibilidad, inversi\u00f3n o admisi\u00f3n.",
    links: { forest: "Forest City", community: "Vida en comunidad", school: "Escuela y empleo", ambassadors: "Ambassadors", families: "Familias", teams: "Equipos", events: "Eventos", companies: "Portfolio Companies", conference: "Conferencia", about: "Sobre nosotros", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Hazte miembro", contact: "Contacto", brand: "Brand as a Service", account: "Cuenta", legal: "Legal" }
  },
  ca: {
    languageName: "Catal\u00e0", skip: "Ves al contingut de membresia", home: "Inici CRAYS Clubs", nav: "Navegaci\u00f3 principal",
    menu: "Men\u00fa", open: "Obre el men\u00fa", close: "Tanca el men\u00fa", account: "Compte", language: "Idioma",
    title: "Explora CRAYS Clubs", lead: "Forest City \u00e9s el nostre campus. Descobreix persones, llocs i recorreguts per invitaci\u00f3.",
    explore: "Explora", belong: "Pertinen\u00e7a", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "L'associaci\u00f3 independent forma part del context CRAYS.", newTab: "s'obre en una pestanya nova",
    footerLead: "Coneix amics, col\u00b7legues i socis al nou m\u00f3n Crays Club.", footerCta: "Reivindica la teva llar global",
    release: "Experi\u00e8ncia p\u00fablica pr\u00e8via al llan\u00e7ament. Sense promesa de reserva, preu, disponibilitat, inversi\u00f3 o admissi\u00f3.",
    links: { forest: "Forest City", community: "Vida comunit\u00e0ria", school: "Escola i feina", ambassadors: "Ambassadors", families: "Fam\u00edlies", teams: "Equips", events: "Esdeveniments", companies: "Portfolio Companies", conference: "Confer\u00e8ncia", about: "Sobre nosaltres", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Fes-te membre", contact: "Contacte", brand: "Brand as a Service", account: "Compte", legal: "Legal" }
  },
  fr: {
    languageName: "Fran\u00e7ais", skip: "Aller au contenu adh\u00e9sion", home: "Accueil CRAYS Clubs", nav: "Navigation principale",
    menu: "Menu", open: "Ouvrir le menu", close: "Fermer le menu", account: "Compte", language: "Langue",
    title: "Explorer CRAYS Clubs", lead: "Forest City est notre campus. D\u00e9couvrez personnes, lieux et parcours sur invitation.",
    explore: "Explorer", belong: "Appartenir", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "L'association ind\u00e9pendante fait partie du contexte CRAYS.", newTab: "s'ouvre dans un nouvel onglet",
    footerLead: "Rencontrez amis, coll\u00e8gues et partenaires dans le nouvel univers Crays Club.", footerCta: "Revendiquez votre foyer mondial",
    release: "Exp\u00e9rience publique de pr\u00e9-lancement. Aucune promesse de r\u00e9servation, prix, disponibilit\u00e9, investissement ou admission.",
    links: { forest: "Forest City", community: "Vie communautaire", school: "\u00c9cole et emplois", ambassadors: "Ambassadors", families: "Familles", teams: "\u00c9quipes", events: "\u00c9v\u00e9nements", companies: "Portfolio Companies", conference: "Conf\u00e9rence", about: "\u00c0 propos", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Devenir membre", contact: "Contact", brand: "Brand as a Service", account: "Compte", legal: "Mentions l\u00e9gales" }
  },
  pt: {
    languageName: "Portugu\u00eas", skip: "Saltar para o conte\u00fado de ades\u00e3o", home: "In\u00edcio CRAYS Clubs", nav: "Navega\u00e7\u00e3o principal",
    menu: "Menu", open: "Abrir menu", close: "Fechar menu", account: "Conta", language: "Idioma",
    title: "Explorar CRAYS Clubs", lead: "Forest City \u00e9 o nosso campus. Descubra pessoas, lugares e percursos por convite.",
    explore: "Explorar", belong: "Pertencer", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "A associa\u00e7\u00e3o independente faz parte do contexto CRAYS.", newTab: "abre num novo separador",
    footerLead: "Encontre amigos, colegas e parceiros no novo mundo Crays Club.", footerCta: "Reivindique a sua casa global",
    release: "Experi\u00eancia p\u00fablica de pr\u00e9-lan\u00e7amento. Sem promessa de reserva, pre\u00e7o, disponibilidade, investimento ou admiss\u00e3o.",
    links: { forest: "Forest City", community: "Vida comunit\u00e1ria", school: "Escola e empregos", ambassadors: "Ambassadors", families: "Fam\u00edlias", teams: "Equipas", events: "Eventos", companies: "Portfolio Companies", conference: "Confer\u00eancia", about: "Sobre n\u00f3s", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Torne-se membro", contact: "Contacto", brand: "Brand as a Service", account: "Conta", legal: "Legal" }
  },
  it: {
    languageName: "Italiano", skip: "Vai al contenuto membership", home: "Home CRAYS Clubs", nav: "Navigazione principale",
    menu: "Menu", open: "Apri menu", close: "Chiudi menu", account: "Account", language: "Lingua",
    title: "Esplora CRAYS Clubs", lead: "Forest City \u00e8 il nostro campus. Scopri persone, luoghi e percorsi su invito.",
    explore: "Esplora", belong: "Appartenenza", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "L'associazione indipendente fa parte del contesto CRAYS.", newTab: "si apre in una nuova scheda",
    footerLead: "Incontra amici, colleghi e partner nel nuovo mondo Crays Club.", footerCta: "Rivendica la tua casa globale",
    release: "Esperienza pubblica pre-release. Nessuna promessa di prenotazione, prezzo, disponibilit\u00e0, investimento o ammissione.",
    links: { forest: "Forest City", community: "Vita di comunit\u00e0", school: "Scuola e lavoro", ambassadors: "Ambassadors", families: "Famiglie", teams: "Team", events: "Eventi", companies: "Portfolio Companies", conference: "Conferenza", about: "Chi siamo", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Diventa membro", contact: "Contatti", brand: "Brand as a Service", account: "Account", legal: "Note legali" }
  }
};

const labels: Record<BecomeMemberLocale, { page: string; meta: string }> = {
  en: { page: "Become a Member", meta: "Become a Member | Crays Clubs" },
  de: { page: "Mitglied werden", meta: "Mitglied werden | Crays Clubs" },
  es: { page: "Hazte miembro", meta: "Hazte miembro | Crays Clubs" },
  ca: { page: "Fes-te membre", meta: "Fes-te membre | Crays Clubs" },
  fr: { page: "Devenir membre", meta: "Devenir membre | Crays Clubs" },
  pt: { page: "Torne-se membro", meta: "Torne-se membro | Crays Clubs" },
  it: { page: "Diventa membro", meta: "Diventa membro | Crays Clubs" }
};

const englishCopy: BecomeMemberCopy = {
  localeName: shells.en.languageName,
  metaTitle: labels.en.meta,
  metaDescription: sharedContent.hero.title,
  shell: shells.en,
  pageLabel: labels.en.page,
  mediaBlocked: "Media withheld until source, creator, license, retrieval record, crop and approval are complete.",
  ...sharedContent,
  closing: { ...sharedContent.closing, title: labels.en.page },
};

export const becomeMemberCopy: Record<BecomeMemberLocale, BecomeMemberCopy> = {
  en: englishCopy,
  ...(localizedBecomeMemberCopy as Record<Exclude<BecomeMemberLocale, "en">, BecomeMemberCopy>),
};
