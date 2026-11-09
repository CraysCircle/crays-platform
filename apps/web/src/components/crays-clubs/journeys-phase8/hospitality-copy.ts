import localizedHospitalityCopy from "./hospitality-localized.generated.json";

export const hospitalityLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
export type HospitalityLocale = (typeof hospitalityLocales)[number];

type Item = { label?: string; title: string; body: string };

export type HospitalityShellCopy = {
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

export type HospitalityCopy = {
  localeName: string;
  metaTitle: string;
  metaDescription: string;
  shell: HospitalityShellCopy;
  mediaBlocked: string;
  form: {
    title: string;
    languages: readonly string[];
    email: string;
    job: string;
    residence: string;
    places: string;
    regions: readonly string[];
    membership: string;
    select: string;
    memberships: readonly string[];
    upload: string;
    accept: string;
    terms: string;
    submit: string;
    success: string;
    error: string;
    unavailable: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    alliance: string;
    model: string;
  };
  journey: {
    title: string;
    lead: string;
    items: readonly Item[];
  };
  engine: {
    eyebrow: string;
    title: string;
    body: string;
    items: readonly Item[];
  };
  culture: {
    title: string;
    lead: string;
    body: string;
    items: readonly Item[];
  };
  guestFlow: {
    title: string;
    lead: string;
    body: string;
    items: readonly Item[];
  };
  operator: {
    title: string;
    lead: string;
    body: string;
    items: readonly Item[];
  };
  digital: {
    title: string;
    lead: string;
    body: string;
    items: readonly Item[];
  };
  promise: {
    title: string;
    lead: string;
    body: string;
    intake: string;
    talk: string;
  };
};

const english: HospitalityCopy = {
  localeName: "English",
  metaTitle: "Hospitality | CRAYS Clubs",
  metaDescription: "Hospitality as the real-world layer of Crays.",
  shell: {
    languageName: "English", skip: "Skip to Hospitality content", home: "CRAYS Clubs home", nav: "Primary navigation",
    menu: "Menu", open: "Open menu", close: "Close menu", account: "Account", language: "Language",
    title: "Explore CRAYS Clubs", lead: "Forest City is our campus. Discover people, places and invitation-led journeys.",
    explore: "Explore", belong: "Belong", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "The independent association is part of the wider CRAYS context.", newTab: "opens in a new tab",
    footerLead: "Meet friends, colleagues and partners in the new world of Crays Club.", footerCta: "Claim your global home",
    release: "Pre-release public experience. No promise of booking, price, availability, investment or admission.",
    links: { forest: "Forest City", community: "Community Life", school: "School & Jobs", ambassadors: "Ambassadors", families: "Families", teams: "Teams", events: "Events", companies: "Portfolio Companies", conference: "Conference", about: "About Us", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Become a Member", contact: "Contact", brand: "Brand as a Service", account: "Account", legal: "Legal" }
  },
  mediaBlocked: "Media withheld until source, rights, creator, crop and approval are recorded.",
  form: {
    title: "Hospitality Brand Alliance",
    languages: ["English", "Spanish", "Deutsch"],
    email: "Your Email Address*",
    job: "Current Job",
    residence: "Current Residence",
    places: "What are your favourable places for exploring?",
    regions: ["North America", "South America", "Western Europe", "Central and Eastern Europe", "Middle East", "Oceania", "Africa"],
    membership: "Which membership suits you best?",
    select: "Select one...",
    memberships: ["Fashion Membership - 1.850\u20ac", "Sphere Membership - 2.500\u20ac", "Falcon Membership - 3.750\u20ac"],
    upload: "Please Upload any images and blueprints of the property you have.",
    accept: "I accept the",
    terms: "Terms",
    submit: "Start Project Intake",
    success: "Thank you! Your submission has been received!",
    error: "Oops! Something went wrong while submitting the form.",
    unavailable: "This retained form purpose is source-implemented but not connected. No data or files are transmitted."
  },
  hero: {
    eyebrow: "Crays Hospitality",
    title: "Hospitality as the real-world layer of Crays.",
    body: "Crays connects clubs, hotels, coffee, events, villas, lounges and digital access into one recognizable operating system for people who work, live, travel and build globally.",
    alliance: "Hospitality Brand Alliance",
    model: "Explore the model"
  },
  journey: {
    title: "One guest journey",
    lead: "Arrive, meet, work, dine, stay, pay and reconnect through Crays.",
    items: [
      { label: "Anchor", title: "Crays Clubs", body: "Social living rooms for cities, hotels and destination venues." },
      { label: "Daily ritual", title: "Crays Coffee", body: "Neighborhood contact points that make the network local and repeatable." },
      { label: "Access", title: "Crays Circle", body: "Identity, memberships, payments, matching, bookings and local context." },
      { label: "Upside", title: "Partner Layer", body: "Operators, owners, creators and brands can plug into demand and infrastructure." }
    ]
  },
  engine: {
    eyebrow: "The Crays engine",
    title: "Not another hotel brand. A social operating system for places.",
    body: "Hospitality is where the Crays ecosystem becomes visible. A member should recognize the same logic in a club lounge, a coffee shop, a hotel, a villa, a rooftop, a retreat or a partner venue: familiar access, trusted people, strong design, local services and digital continuity.",
    items: [
      { title: "Place", body: "Premium rooms, lounges, desks, terraces, pools and event spaces." },
      { title: "People", body: "Members, founders, travelers, creators, owners and local partners." },
      { title: "Technology", body: "Profiles, bookings, access, payments, CRM, AI and local network effects." },
      { title: "Participation", body: "Partner models that can move from usage to contribution and structured upside." }
    ]
  },
  culture: {
    title: "Club, coffee, culture",
    lead: "The brand feels consistent, but every node has its own local energy.",
    body: "Crays should not feel like a copy-paste chain. The CI holds the system together, while each city and venue can express its own rhythm: business in the morning, community in the afternoon, dining and events at night.",
    items: [
      { label: "01", title: "Urban club layer", body: "Work, meetings, member access, private events and premium daily hospitality." },
      { label: "02", title: "Events and creators", body: "Culture, founders, music, dinners and partners turn venues into demand engines." },
      { label: "03", title: "Travel lifestyle", body: "Villas, beaches, rooftops and destination clubs extend the same membership feeling." }
    ]
  },
  guestFlow: {
    title: "Guest flow",
    lead: "One journey from first visit to long-term belonging.",
    body: "The hospitality experience should feel simple for guests and useful for operators. Each interaction adds context: where someone stayed, what they booked, who they met, what they bought, which event they joined and what they may want next.",
    items: [
      { label: "01", title: "Arrive", body: "Recognizable welcome, local orientation and member-aware access." },
      { label: "02", title: "Meet", body: "Introductions, tables, meetings, social signals and community moments." },
      { label: "03", title: "Use", body: "Workspaces, lounges, F&B, spa, pool, retail, rooms and partner services." },
      { label: "04", title: "Pay", body: "Bookings, tickets, tips, retail, subscriptions and direct settlement concepts." },
      { label: "05", title: "Return", body: "Better recommendations, loyalty, invitations and cross-location continuity." }
    ]
  },
  operator: {
    title: "Operator and partner value",
    lead: "Hospitality becomes a demand, data and participation layer.",
    body: "For operators, owners and brand partners, Crays is designed to bring more than design language. It can add community demand, membership logic, software, event formats, partner revenue, CRM context and a route into structured project participation.",
    items: [
      { title: "Revenue", body: "Accommodation, F&B, events, retail, access, subscriptions and licensing." },
      { title: "Demand", body: "Members, creators, founders, travelers and local communities create repeat traffic." },
      { title: "Data", body: "Booking, visit, payment and preference signals improve yield and service quality." },
      { title: "Asset logic", body: "Selected venues and owners can discuss contribution, fund and project structures." }
    ]
  },
  digital: {
    title: "Digital world meets real world",
    lead: "The room gets smarter without losing its human feeling.",
    body: "Profiles, access, booking, payments, local matching, AI and venue operations should serve the hospitality moment, not dominate it. The tech layer stays quiet on the surface and powerful in the background.",
    items: [
      { title: "Nostr profile", body: "Portable identity and reputation." },
      { title: "Booking layer", body: "Villas, stays, events and services in one flow." },
      { title: "Payments", body: "Cards, receipts, tips, Lightning concepts and direct settlement." },
      { title: "Venue CRM", body: "Context for better hospitality before the guest has to explain." },
      { title: "AI assist", body: "Recommendations, routing, matching and service orchestration." },
      { title: "Partner API", body: "Hotels, owners, operators and brands can connect into Crays." }
    ]
  },
  promise: {
    title: "The hospitality promise",
    lead: "Crays makes global life feel less fragmented.",
    body: "When hospitality, community, access, technology and participation work together, the guest does not feel pushed through disconnected products. They feel recognized, connected and invited into a world that keeps unfolding.",
    intake: "Start Project Intake",
    talk: "Talk to Crays"
  }
};

const de: HospitalityCopy = {
  ...english,
  localeName: "Deutsch",
  metaDescription: "Hospitality als Real-World Layer von Crays.",
  shell: {
    languageName: "Deutsch", skip: "Zum Hospitality-Inhalt springen", home: "CRAYS Clubs Startseite", nav: "Hauptnavigation",
    menu: "Menue", open: "Menue oeffnen", close: "Menue schliessen", account: "Konto", language: "Sprache",
    title: "CRAYS Clubs entdecken", lead: "Forest City ist unser Campus. Entdecke Menschen, Orte und einladungsgefuehrte Wege.",
    explore: "Entdecken", belong: "Dazugehoeren", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "Der unabhaengige Verein ist Teil des groesseren CRAYS-Kontexts.", newTab: "oeffnet in einem neuen Tab",
    footerLead: "Triff Freunde, Kollegen und Partner in der neuen Welt des Crays Club.", footerCta: "Beanspruche dein globales Zuhause",
    release: "Oeffentliche Pre-Release-Erfahrung. Kein Versprechen zu Buchung, Preis, Verfuegbarkeit, Investment oder Aufnahme.",
    links: { forest: "Forest City", community: "Community Life", school: "School & Jobs", ambassadors: "Ambassadors", families: "Familien", teams: "Teams", events: "Events", companies: "Portfolio Companies", conference: "Konferenz", about: "Ueber uns", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Mitglied werden", contact: "Kontakt", brand: "Brand as a Service", account: "Konto", legal: "Rechtliches" }
  },
  mediaBlocked: "Medien bleiben verborgen, bis Quelle, Rechte, Creator, Crop und Freigabe dokumentiert sind.",
  form: { ...english.form, accept: "Ich akzeptiere die" },
  hero: { ...english.hero, title: "Hospitality als Real-World Layer von Crays.", model: "Modell entdecken" },
  journey: {
    ...english.journey,
    title: "Eine Guest Journey",
    lead: "Ankommen, treffen, arbeiten, essen, bleiben, zahlen und reconnecten durch Crays.",
    items: [
      { label: "Anchor", title: "Crays Clubs", body: "Social Living Rooms fuer Staedte, Hotels und Destination Venues." },
      english.journey.items[1],
      english.journey.items[2],
      english.journey.items[3]
    ]
  },
  engine: {
    ...english.engine,
    eyebrow: "Die Crays Engine",
    title: "Keine weitere Hotelbrand. Ein Social Operating System fuer Orte.",
    items: [
      { title: "Place", body: "Premium Rooms, Lounges, Desks, Terrassen, Pools und Event Spaces." },
      { title: "People", body: "Members, Founder, Travelers, Creators, Owners und lokale Partner." },
      { title: "Technology", body: "Profile, Bookings, Access, Payments, CRM, AI und lokale Network Effects." },
      english.engine.items[3]
    ]
  },
  promise: { ...english.promise, intake: "Projekt einreichen", talk: "Mit Crays sprechen" }
};

const es: HospitalityCopy = {
  ...english,
  localeName: "Espa\u00f1ol",
  metaDescription: "Hospitality como real-world layer de Crays.",
  shell: {
    languageName: "Espa\u00f1ol", skip: "Saltar al contenido de Hospitality", home: "Inicio CRAYS Clubs", nav: "Navegaci\u00f3n principal",
    menu: "Men\u00fa", open: "Abrir men\u00fa", close: "Cerrar men\u00fa", account: "Cuenta", language: "Idioma",
    title: "Explora CRAYS Clubs", lead: "Forest City es nuestro campus. Descubre personas, lugares y recorridos por invitaci\u00f3n.",
    explore: "Explorar", belong: "Pertenecer", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "La asociaci\u00f3n independiente forma parte del contexto CRAYS.", newTab: "se abre en una pesta\u00f1a nueva",
    footerLead: "Conoce a amigos, colegas y socios en el nuevo mundo Crays Club.", footerCta: "Reclama tu hogar global",
    release: "Experiencia p\u00fablica previa al lanzamiento. Sin promesa de reserva, precio, disponibilidad, inversi\u00f3n o admisi\u00f3n.",
    links: { forest: "Forest City", community: "Vida en comunidad", school: "Escuela y empleo", ambassadors: "Ambassadors", families: "Familias", teams: "Equipos", events: "Eventos", companies: "Portfolio Companies", conference: "Conferencia", about: "Sobre nosotros", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Hazte miembro", contact: "Contacto", brand: "Brand as a Service", account: "Cuenta", legal: "Legal" }
  },
  mediaBlocked: "Los medios quedan ocultos hasta registrar fuente, derechos, creador, recorte y aprobaci\u00f3n.",
  form: { ...english.form, accept: "Acepto la" },
  hero: { ...english.hero, title: "Hospitality como real-world layer de Crays.", model: "Explorar el modelo" },
  engine: { ...english.engine, eyebrow: "El motor Crays", title: "No otra marca hotelera. Un sistema social operativo para lugares." },
  promise: { ...english.promise, talk: "Hablar con Crays" }
};

const ca: HospitalityCopy = {
  ...english,
  localeName: "Catal\u00e0",
  metaDescription: "Hospitality com a real-world layer de Crays.",
  shell: {
    languageName: "Catal\u00e0", skip: "Ves al contingut de Hospitality", home: "Inici CRAYS Clubs", nav: "Navegaci\u00f3 principal",
    menu: "Men\u00fa", open: "Obre el men\u00fa", close: "Tanca el men\u00fa", account: "Compte", language: "Idioma",
    title: "Explora CRAYS Clubs", lead: "Forest City \u00e9s el nostre campus. Descobreix persones, llocs i recorreguts per invitaci\u00f3.",
    explore: "Explora", belong: "Pertinen\u00e7a", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "L'associaci\u00f3 independent forma part del context CRAYS.", newTab: "s'obre en una pestanya nova",
    footerLead: "Coneix amics, col\u00b7legues i socis al nou m\u00f3n Crays Club.", footerCta: "Reivindica la teva llar global",
    release: "Experi\u00e8ncia p\u00fablica pr\u00e8via al llan\u00e7ament. Sense promesa de reserva, preu, disponibilitat, inversi\u00f3 o admissi\u00f3.",
    links: { forest: "Forest City", community: "Vida comunit\u00e0ria", school: "Escola i feina", ambassadors: "Ambassadors", families: "Fam\u00edlies", teams: "Equips", events: "Esdeveniments", companies: "Portfolio Companies", conference: "Confer\u00e8ncia", about: "Sobre nosaltres", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Fes-te membre", contact: "Contacte", brand: "Brand as a Service", account: "Compte", legal: "Legal" }
  },
  mediaBlocked: "Els mitjans queden ocults fins a registrar font, drets, creador, retall i aprovaci\u00f3.",
  form: { ...english.form, accept: "Accepto la" },
  hero: { ...english.hero, title: "Hospitality com a real-world layer de Crays.", model: "Explorar el model" },
  promise: { ...english.promise, talk: "Parlar amb Crays" }
};

const fr: HospitalityCopy = {
  ...english,
  localeName: "Fran\u00e7ais",
  metaDescription: "Hospitality comme real-world layer de Crays.",
  shell: {
    languageName: "Fran\u00e7ais", skip: "Aller au contenu Hospitality", home: "Accueil CRAYS Clubs", nav: "Navigation principale",
    menu: "Menu", open: "Ouvrir le menu", close: "Fermer le menu", account: "Compte", language: "Langue",
    title: "Explorer CRAYS Clubs", lead: "Forest City est notre campus. D\u00e9couvrez personnes, lieux et parcours sur invitation.",
    explore: "Explorer", belong: "Appartenir", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "L'association ind\u00e9pendante fait partie du contexte CRAYS.", newTab: "s'ouvre dans un nouvel onglet",
    footerLead: "Rencontrez amis, coll\u00e8gues et partenaires dans le nouvel univers Crays Club.", footerCta: "Revendiquez votre foyer mondial",
    release: "Exp\u00e9rience publique de pr\u00e9-lancement. Aucune promesse de r\u00e9servation, prix, disponibilit\u00e9, investissement ou admission.",
    links: { forest: "Forest City", community: "Vie communautaire", school: "\u00c9cole et emplois", ambassadors: "Ambassadors", families: "Familles", teams: "\u00c9quipes", events: "\u00c9v\u00e9nements", companies: "Portfolio Companies", conference: "Conf\u00e9rence", about: "\u00c0 propos", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Devenir membre", contact: "Contact", brand: "Brand as a Service", account: "Compte", legal: "Mentions l\u00e9gales" }
  },
  mediaBlocked: "Les m\u00e9dias restent masqu\u00e9s jusqu'au registre de la source, des droits, du cr\u00e9ateur, du recadrage et de l'approbation.",
  form: { ...english.form, accept: "J'accepte la" },
  hero: { ...english.hero, title: "Hospitality comme real-world layer de Crays.", model: "Explorer le mod\u00e8le" },
  promise: { ...english.promise, talk: "Parler \u00e0 Crays" }
};

const pt: HospitalityCopy = {
  ...english,
  localeName: "Portugu\u00eas",
  metaDescription: "Hospitality como real-world layer da Crays.",
  shell: {
    languageName: "Portugu\u00eas", skip: "Saltar para o conte\u00fado Hospitality", home: "In\u00edcio CRAYS Clubs", nav: "Navega\u00e7\u00e3o principal",
    menu: "Menu", open: "Abrir menu", close: "Fechar menu", account: "Conta", language: "Idioma",
    title: "Explorar CRAYS Clubs", lead: "Forest City \u00e9 o nosso campus. Descubra pessoas, lugares e percursos por convite.",
    explore: "Explorar", belong: "Pertencer", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "A associa\u00e7\u00e3o independente faz parte do contexto CRAYS.", newTab: "abre num novo separador",
    footerLead: "Encontre amigos, colegas e parceiros no novo mundo Crays Club.", footerCta: "Reivindique a sua casa global",
    release: "Experi\u00eancia p\u00fablica de pr\u00e9-lan\u00e7amento. Sem promessa de reserva, pre\u00e7o, disponibilidade, investimento ou admiss\u00e3o.",
    links: { forest: "Forest City", community: "Vida comunit\u00e1ria", school: "Escola e empregos", ambassadors: "Ambassadors", families: "Fam\u00edlias", teams: "Equipas", events: "Eventos", companies: "Portfolio Companies", conference: "Confer\u00eancia", about: "Sobre n\u00f3s", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Torne-se membro", contact: "Contacto", brand: "Brand as a Service", account: "Conta", legal: "Legal" }
  },
  mediaBlocked: "Os media ficam ocultos at\u00e9 registar fonte, direitos, criador, recorte e aprova\u00e7\u00e3o.",
  form: { ...english.form, accept: "Aceito a" },
  hero: { ...english.hero, title: "Hospitality como real-world layer da Crays.", model: "Explorar o modelo" },
  promise: { ...english.promise, talk: "Falar com a Crays" }
};

const it: HospitalityCopy = {
  ...english,
  localeName: "Italiano",
  metaDescription: "Hospitality come real-world layer di Crays.",
  shell: {
    languageName: "Italiano", skip: "Vai al contenuto Hospitality", home: "Home CRAYS Clubs", nav: "Navigazione principale",
    menu: "Menu", open: "Apri menu", close: "Chiudi menu", account: "Account", language: "Lingua",
    title: "Esplora CRAYS Clubs", lead: "Forest City \u00e8 il nostro campus. Scopri persone, luoghi e percorsi su invito.",
    explore: "Esplora", belong: "Appartenenza", company: "CRAYS Clubs", association: "CRAYS Association",
    associationLead: "L'associazione indipendente fa parte del contesto CRAYS.", newTab: "si apre in una nuova scheda",
    footerLead: "Incontra amici, colleghi e partner nel nuovo mondo Crays Club.", footerCta: "Rivendica la tua casa globale",
    release: "Esperienza pubblica pre-release. Nessuna promessa di prenotazione, prezzo, disponibilit\u00e0, investimento o ammissione.",
    links: { forest: "Forest City", community: "Vita di comunit\u00e0", school: "Scuola e lavoro", ambassadors: "Ambassadors", families: "Famiglie", teams: "Team", events: "Eventi", companies: "Portfolio Companies", conference: "Conferenza", about: "Chi siamo", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Diventa membro", contact: "Contatti", brand: "Brand as a Service", account: "Account", legal: "Note legali" }
  },
  mediaBlocked: "I media restano nascosti finch\u00e9 fonte, diritti, creator, ritaglio e approvazione non sono registrati.",
  form: { ...english.form, accept: "Accetto la" },
  hero: { ...english.hero, title: "Hospitality come real-world layer di Crays.", model: "Scopri il modello" },
  promise: { ...english.promise, talk: "Parla con Crays" }
};

export const hospitalityCopy: Record<HospitalityLocale, HospitalityCopy> = {
  en: english,
  ...(localizedHospitalityCopy as Record<Exclude<HospitalityLocale, "en">, HospitalityCopy>),
};
