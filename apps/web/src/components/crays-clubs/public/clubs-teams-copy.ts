import type {
  CraysFamilyLocale,
  FamiliesShellCopy,
} from "../journeys-phase8/families-copy";
import localizedTeamsCopy from "./clubs-teams-localized.generated.json";

export type TeamsLocale = CraysFamilyLocale;

export type TeamsFrame = {
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  explore: string;
  contact: string;
  benefitsEyebrow: string;
  benefitsTitle: string;
  proofEyebrow: string;
  proofTitle: string;
  methodEyebrow: string;
  methodTitle: string;
  expertiseEyebrow: string;
  expertiseTitle: string;
  facilitiesEyebrow: string;
  facilitiesTitle: string;
  voicesEyebrow: string;
  voicesTitle: string;
  faqEyebrow: string;
  faqTitle: string;
  closingEyebrow: string;
  closingTitle: string;
  closingBody: string;
  closingCta: string;
  sourceLabel: string;
  blockedLabel: string;
  showAll: string;
};

export const teamsShellCopy = {
  en: {
    about: "About Us", lifestyle: "Lifestyle", hospitality: "Hospitality",
    community: "Community Life", membership: "Become a Member",
    ambassadors: "Ambassadors", families: "Families", teams: "Teams",
    events: "Events", companies: "Portfolio Companies", conference: "Conference",
    brandService: "Brand as a Service", contact: "Contact", account: "Account",
    legal: "Legal", skip: "Skip to Teams content", primaryNav: "Primary navigation",
    menu: "Menu", close: "Close", association: "CRAYS Association",
    associationNote: "Open the association website",
    footerLine: "Work, live and play across one connected club world.",
    siteNote: "The official CRAYS Clubs website.", footerNav: "Footer navigation",
  },
  de: {
    about: "Über uns", lifestyle: "Lifestyle", hospitality: "Hospitality",
    community: "Community Life", membership: "Mitglied werden",
    ambassadors: "Ambassadors", families: "Familien", teams: "Teams",
    events: "Events", companies: "Portfolio-Unternehmen", conference: "Konferenz",
    brandService: "Brand as a Service", contact: "Kontakt", account: "Konto",
    legal: "Rechtliches", skip: "Zum Teams-Inhalt springen",
    primaryNav: "Hauptnavigation", menu: "Menü", close: "Schließen",
    association: "CRAYS Association",
    associationNote: "Website der Association öffnen",
    footerLine: "Arbeiten, leben und spielen in einer verbundenen Clubwelt.",
    siteNote: "Die offizielle Website der CRAYS Clubs.", footerNav: "Footer-Navigation",
  },
  es: {
    about: "Sobre nosotros", lifestyle: "Lifestyle", hospitality: "Hospitality",
    community: "Vida en comunidad", membership: "Hazte miembro",
    ambassadors: "Ambassadors", families: "Familias", teams: "Equipos",
    events: "Eventos", companies: "Empresas del portafolio", conference: "Conferencia",
    brandService: "Brand as a Service", contact: "Contacto", account: "Cuenta",
    legal: "Legal", skip: "Ir al contenido de equipos",
    primaryNav: "Navegación principal", menu: "Menú", close: "Cerrar",
    association: "CRAYS Association",
    associationNote: "Abrir el sitio de la asociación",
    footerLine: "Trabaja, vive y disfruta en un mundo de clubes conectado.",
    siteNote: "El sitio oficial de CRAYS Clubs.", footerNav: "Navegación del pie",
  },
  ca: {
    about: "Sobre nosaltres", lifestyle: "Lifestyle", hospitality: "Hospitality",
    community: "Vida en comunitat", membership: "Fes-te membre",
    ambassadors: "Ambassadors", families: "Famílies", teams: "Equips",
    events: "Esdeveniments", companies: "Empreses del portafoli",
    conference: "Conferència", brandService: "Brand as a Service",
    contact: "Contacte", account: "Compte", legal: "Legal",
    skip: "Ves al contingut d'equips", primaryNav: "Navegació principal",
    menu: "Menú", close: "Tanca", association: "CRAYS Association",
    associationNote: "Obre el web de l'associació",
    footerLine: "Treballa, viu i gaudeix en un món de clubs connectat.",
    siteNote: "El lloc oficial de CRAYS Clubs.", footerNav: "Navegació del peu",
  },
  fr: {
    about: "À propos", lifestyle: "Lifestyle", hospitality: "Hospitality",
    community: "Vie communautaire", membership: "Devenir membre",
    ambassadors: "Ambassadors", families: "Familles", teams: "Équipes",
    events: "Événements", companies: "Sociétés du portefeuille",
    conference: "Conférence", brandService: "Brand as a Service",
    contact: "Contact", account: "Compte", legal: "Mentions légales",
    skip: "Aller au contenu Équipes", primaryNav: "Navigation principale",
    menu: "Menu", close: "Fermer", association: "CRAYS Association",
    associationNote: "Ouvrir le site de l'association",
    footerLine: "Travaillez, vivez et partagez dans un monde de clubs connecté.",
    siteNote: "Le site officiel de CRAYS Clubs.",
    footerNav: "Navigation du pied de page",
  },
  pt: {
    about: "Sobre nós", lifestyle: "Lifestyle", hospitality: "Hospitality",
    community: "Vida em comunidade", membership: "Torne-se membro",
    ambassadors: "Ambassadors", families: "Famílias", teams: "Equipas",
    events: "Eventos", companies: "Empresas do portefólio",
    conference: "Conferência", brandService: "Brand as a Service",
    contact: "Contacto", account: "Conta", legal: "Informação legal",
    skip: "Ir para o conteúdo de Equipas", primaryNav: "Navegação principal",
    menu: "Menu", close: "Fechar", association: "CRAYS Association",
    associationNote: "Abrir o site da associação",
    footerLine: "Trabalhe, viva e desfrute num mundo de clubes conectado.",
    siteNote: "O site oficial dos CRAYS Clubs.", footerNav: "Navegação do rodapé",
  },
  it: {
    about: "Chi siamo", lifestyle: "Lifestyle", hospitality: "Hospitality",
    community: "Vita di comunità", membership: "Diventa membro",
    ambassadors: "Ambassadors", families: "Famiglie", teams: "Team",
    events: "Eventi", companies: "Società in portafoglio",
    conference: "Conferenza", brandService: "Brand as a Service",
    contact: "Contatto", account: "Account", legal: "Note legali",
    skip: "Vai al contenuto Team", primaryNav: "Navigazione principale",
    menu: "Menu", close: "Chiudi", association: "CRAYS Association",
    associationNote: "Apri il sito dell'associazione",
    footerLine: "Lavora, vivi e condividi in un mondo di club connesso.",
    siteNote: "Il sito ufficiale di CRAYS Clubs.", footerNav: "Navigazione del footer",
  },
} satisfies Record<TeamsLocale, FamiliesShellCopy>;

export const teamsMetadata: Record<TeamsLocale, { title: string; description: string }> = {
  en: { title: "Teams | CRAYS Clubs", description: "A scoped CRAYS Clubs journey for teams to work, learn, build and spend meaningful time together." },
  de: { title: "Teams | CRAYS Clubs", description: "Eine abgestimmte CRAYS-Clubs-Journey für gemeinsames Arbeiten, Lernen, Bauen und wertvolle Teamzeit." },
  es: { title: "Equipos | CRAYS Clubs", description: "Un recorrido CRAYS Clubs definido para trabajar, aprender, construir y compartir tiempo como equipo." },
  ca: { title: "Equips | CRAYS Clubs", description: "Un recorregut CRAYS Clubs definit per treballar, aprendre, construir i compartir temps com a equip." },
  fr: { title: "Équipes | CRAYS Clubs", description: "Un parcours CRAYS Clubs cadré pour travailler, apprendre, construire et partager du temps en équipe." },
  pt: { title: "Equipas | CRAYS Clubs", description: "Um percurso CRAYS Clubs definido para trabalhar, aprender, construir e partilhar tempo em equipa." },
  it: { title: "Team | CRAYS Clubs", description: "Un percorso CRAYS Clubs definito per lavorare, imparare, costruire e condividere tempo come team." },
};

export const teamsFrames: Record<TeamsLocale, TeamsFrame> = {
  en: {
    heroEyebrow: "Teams at CRAYS Clubs",
    heroTitle: "Give the work a place to move.",
    heroBody: "Bring a team into a focused club environment for protected work, shared decisions, practical learning and real time together. Every format begins with scope and confirmation; CRAYS never promises a commercial outcome.",
    explore: "Explore the team journey", contact: "Talk to CRAYS",
    benefitsEyebrow: "One team rhythm", benefitsTitle: "A complete working environment, scoped before arrival.",
    proofEyebrow: "Builder proof", proofTitle: "What a real team story must be able to prove.",
    methodEyebrow: "Why teams choose the format", methodTitle: "Learn. Network. Build. Demo.",
    expertiseEyebrow: "Expertise and speakers", expertiseTitle: "Real expertise only after the person and topic are confirmed.",
    facilitiesEyebrow: "The operating layer", facilitiesTitle: "What a team format can bring together.",
    voicesEyebrow: "Social proof", voicesTitle: "No borrowed praise. Only publishable CRAYS evidence.",
    faqEyebrow: "Before a team begins", faqTitle: "The practical questions belong in the open.",
    closingEyebrow: "Start with the work", closingTitle: "Shape a team format around a real purpose.",
    closingBody: "Tell CRAYS what the team needs to decide, make or understand. The next step is a scoped conversation, not a booking or an availability promise.",
    closingCta: "Open a scoped conversation", sourceLabel: "Image source",
    blockedLabel: "Publication gate", showAll: "View all expertise release slots",
  },
  de: {
    heroEyebrow: "Teams bei CRAYS Clubs", heroTitle: "Gib der Arbeit einen Ort, an dem sie vorankommt.",
    heroBody: "Bringe dein Team in eine fokussierte Clubumgebung für geschützte Arbeitszeit, gemeinsame Entscheidungen, praktisches Lernen und echte Zeit miteinander. Jedes Format beginnt mit Scope und Bestätigung; CRAYS verspricht kein wirtschaftliches Ergebnis.",
    explore: "Team-Journey entdecken", contact: "Mit CRAYS sprechen",
    benefitsEyebrow: "Ein Teamrhythmus", benefitsTitle: "Eine vollständige Arbeitsumgebung, vor der Anreise abgestimmt.",
    proofEyebrow: "Builder-Nachweis", proofTitle: "Was eine echte Teamgeschichte belegen können muss.",
    methodEyebrow: "Warum Teams das Format wählen", methodTitle: "Lernen. Vernetzen. Bauen. Zeigen.",
    expertiseEyebrow: "Expertise und Speaker", expertiseTitle: "Reale Expertise erst nach Bestätigung von Person und Thema.",
    facilitiesEyebrow: "Die operative Ebene", facilitiesTitle: "Was ein Teamformat zusammenführen kann.",
    voicesEyebrow: "Social Proof", voicesTitle: "Kein geliehenes Lob. Nur veröffentlichbare CRAYS-Evidenz.",
    faqEyebrow: "Bevor ein Team startet", faqTitle: "Die praktischen Fragen gehören auf den Tisch.",
    closingEyebrow: "Beginne mit der Arbeit", closingTitle: "Gestalte ein Teamformat um einen realen Zweck.",
    closingBody: "Sage CRAYS, was das Team entscheiden, bauen oder verstehen muss. Der nächste Schritt ist ein Scope-Gespräch, keine Buchung und kein Verfügbarkeitsversprechen.",
    closingCta: "Scope-Gespräch öffnen", sourceLabel: "Bildquelle",
    blockedLabel: "Publikationsgate", showAll: "Alle Expertise-Freigabeslots ansehen",
  },
  es: {
    heroEyebrow: "Equipos en CRAYS Clubs", heroTitle: "Dale al trabajo un lugar donde avanzar.",
    heroBody: "Reúne al equipo en un entorno de club enfocado para trabajo protegido, decisiones compartidas, aprendizaje práctico y tiempo real juntos. Cada formato empieza con alcance y confirmación; CRAYS no promete resultados comerciales.",
    explore: "Explorar el recorrido", contact: "Hablar con CRAYS",
    benefitsEyebrow: "Un ritmo de equipo", benefitsTitle: "Un entorno de trabajo completo, definido antes de llegar.",
    proofEyebrow: "Prueba de builders", proofTitle: "Lo que una historia real de equipo debe poder demostrar.",
    methodEyebrow: "Por qué elegir el formato", methodTitle: "Aprender. Conectar. Construir. Mostrar.",
    expertiseEyebrow: "Expertise y ponentes", expertiseTitle: "Expertise real solo cuando persona y tema estén confirmados.",
    facilitiesEyebrow: "La capa operativa", facilitiesTitle: "Lo que puede reunir un formato de equipo.",
    voicesEyebrow: "Prueba social", voicesTitle: "Sin elogios prestados. Solo evidencia CRAYS publicable.",
    faqEyebrow: "Antes de empezar", faqTitle: "Las preguntas prácticas deben estar abiertas.",
    closingEyebrow: "Empieza por el trabajo", closingTitle: "Diseña un formato alrededor de un propósito real.",
    closingBody: "Cuéntanos qué necesita decidir, crear o entender el equipo. El siguiente paso es una conversación de alcance, no una reserva ni una promesa de disponibilidad.",
    closingCta: "Abrir conversación de alcance", sourceLabel: "Fuente de imagen",
    blockedLabel: "Puerta de publicación", showAll: "Ver todos los espacios de expertise",
  },
  ca: {
    heroEyebrow: "Equips a CRAYS Clubs", heroTitle: "Dona a la feina un lloc on avançar.",
    heroBody: "Reuneix l'equip en un entorn de club enfocat per a feina protegida, decisions compartides, aprenentatge pràctic i temps real junts. Cada format comença amb abast i confirmació; CRAYS no promet resultats comercials.",
    explore: "Explora el recorregut", contact: "Parla amb CRAYS",
    benefitsEyebrow: "Un ritme d'equip", benefitsTitle: "Un entorn de treball complet, definit abans d'arribar.",
    proofEyebrow: "Prova de builders", proofTitle: "El que una història real d'equip ha de poder demostrar.",
    methodEyebrow: "Per què triar el format", methodTitle: "Aprendre. Connectar. Construir. Mostrar.",
    expertiseEyebrow: "Expertesa i ponents", expertiseTitle: "Expertesa real només quan persona i tema estiguin confirmats.",
    facilitiesEyebrow: "La capa operativa", facilitiesTitle: "El que pot reunir un format d'equip.",
    voicesEyebrow: "Prova social", voicesTitle: "Sense elogis prestats. Només evidència CRAYS publicable.",
    faqEyebrow: "Abans de començar", faqTitle: "Les preguntes pràctiques han d'estar obertes.",
    closingEyebrow: "Comença per la feina", closingTitle: "Dissenya un format al voltant d'un propòsit real.",
    closingBody: "Explica què necessita decidir, crear o entendre l'equip. El pas següent és una conversa d'abast, no una reserva ni una promesa de disponibilitat.",
    closingCta: "Obre una conversa d'abast", sourceLabel: "Font de la imatge",
    blockedLabel: "Porta de publicació", showAll: "Veure tots els espais d'expertesa",
  },
  fr: {
    heroEyebrow: "Équipes chez CRAYS Clubs", heroTitle: "Donnez au travail un lieu pour avancer.",
    heroBody: "Réunissez l'équipe dans un environnement de club concentré pour du travail protégé, des décisions partagées, un apprentissage pratique et du vrai temps ensemble. Chaque format commence par un cadrage et une confirmation ; CRAYS ne promet aucun résultat commercial.",
    explore: "Explorer le parcours", contact: "Parler à CRAYS",
    benefitsEyebrow: "Un rythme d'équipe", benefitsTitle: "Un environnement de travail complet, cadré avant l'arrivée.",
    proofEyebrow: "Preuve builder", proofTitle: "Ce qu'une véritable histoire d'équipe doit pouvoir prouver.",
    methodEyebrow: "Pourquoi choisir le format", methodTitle: "Apprendre. Rencontrer. Construire. Présenter.",
    expertiseEyebrow: "Expertise et intervenants", expertiseTitle: "Une expertise réelle uniquement après confirmation de la personne et du sujet.",
    facilitiesEyebrow: "La couche opérationnelle", facilitiesTitle: "Ce qu'un format d'équipe peut réunir.",
    voicesEyebrow: "Preuve sociale", voicesTitle: "Aucun éloge emprunté. Seulement des preuves CRAYS publiables.",
    faqEyebrow: "Avant de commencer", faqTitle: "Les questions pratiques doivent rester ouvertes.",
    closingEyebrow: "Commencez par le travail", closingTitle: "Façonnez un format autour d'un objectif réel.",
    closingBody: "Dites à CRAYS ce que l'équipe doit décider, créer ou comprendre. L'étape suivante est une conversation de cadrage, pas une réservation ni une promesse de disponibilité.",
    closingCta: "Ouvrir une conversation de cadrage", sourceLabel: "Source de l'image",
    blockedLabel: "Porte de publication", showAll: "Voir tous les domaines d'expertise",
  },
  pt: {
    heroEyebrow: "Equipas nos CRAYS Clubs", heroTitle: "Dê ao trabalho um lugar para avançar.",
    heroBody: "Reúna a equipa num ambiente de clube focado para trabalho protegido, decisões partilhadas, aprendizagem prática e tempo real em conjunto. Cada formato começa com âmbito e confirmação; a CRAYS não promete resultados comerciais.",
    explore: "Explorar o percurso", contact: "Falar com a CRAYS",
    benefitsEyebrow: "Um ritmo de equipa", benefitsTitle: "Um ambiente de trabalho completo, definido antes da chegada.",
    proofEyebrow: "Prova de builders", proofTitle: "O que uma história real de equipa deve conseguir provar.",
    methodEyebrow: "Porquê escolher o formato", methodTitle: "Aprender. Ligar. Construir. Demonstrar.",
    expertiseEyebrow: "Especialistas e oradores", expertiseTitle: "Especialistas reais apenas após confirmação da pessoa e do tema.",
    facilitiesEyebrow: "A camada operacional", facilitiesTitle: "O que um formato de equipa pode reunir.",
    voicesEyebrow: "Prova social", voicesTitle: "Sem elogios emprestados. Apenas evidência CRAYS publicável.",
    faqEyebrow: "Antes de começar", faqTitle: "As perguntas práticas devem ficar em aberto.",
    closingEyebrow: "Comece pelo trabalho", closingTitle: "Desenhe um formato em torno de um objetivo real.",
    closingBody: "Diga à CRAYS o que a equipa precisa de decidir, criar ou compreender. O próximo passo é uma conversa de âmbito, não uma reserva nem uma promessa de disponibilidade.",
    closingCta: "Abrir conversa de âmbito", sourceLabel: "Fonte da imagem",
    blockedLabel: "Porta de publicação", showAll: "Ver todos os domínios de especialidade",
  },
  it: {
    heroEyebrow: "Team nei CRAYS Clubs", heroTitle: "Dai al lavoro un luogo in cui avanzare.",
    heroBody: "Porta il team in un ambiente club focalizzato per lavoro protetto, decisioni condivise, apprendimento pratico e tempo reale insieme. Ogni formato inizia da perimetro e conferma; CRAYS non promette risultati commerciali.",
    explore: "Esplora il percorso", contact: "Parla con CRAYS",
    benefitsEyebrow: "Un ritmo di team", benefitsTitle: "Un ambiente di lavoro completo, definito prima dell'arrivo.",
    proofEyebrow: "Prova builder", proofTitle: "Ciò che una vera storia di team deve poter dimostrare.",
    methodEyebrow: "Perché scegliere il formato", methodTitle: "Imparare. Connettersi. Costruire. Presentare.",
    expertiseEyebrow: "Competenze e speaker", expertiseTitle: "Competenze reali solo dopo la conferma di persona e tema.",
    facilitiesEyebrow: "Il livello operativo", facilitiesTitle: "Ciò che un formato di team può riunire.",
    voicesEyebrow: "Prova sociale", voicesTitle: "Nessun elogio preso in prestito. Solo evidenza CRAYS pubblicabile.",
    faqEyebrow: "Prima di iniziare", faqTitle: "Le domande pratiche devono restare aperte.",
    closingEyebrow: "Parti dal lavoro", closingTitle: "Costruisci un formato attorno a uno scopo reale.",
    closingBody: "Racconta a CRAYS cosa il team deve decidere, creare o comprendere. Il passo successivo è una conversazione di perimetro, non una prenotazione né una promessa di disponibilità.",
    closingCta: "Apri una conversazione di perimetro", sourceLabel: "Fonte immagine",
    blockedLabel: "Gate di pubblicazione", showAll: "Vedi tutti gli ambiti di competenza",
  },
};

export const benefits = [
  ["Stay coordination", "A lodging role can be scoped only after the real property, dates and access are confirmed."],
  ["Shared meals", "Food can support the team rhythm; menus, dietary handling and service remain confirmation items."],
  ["Movement", "Time for movement can be planned without promising a gym, class or performance result."],
  ["Learning", "A practical session begins with a real question from the team's current work."],
  ["Coworking", "Quiet individual work and shared review time are given distinct places in the day."],
  ["Workshops", "The whole room can map, challenge and decide around a bounded problem."],
  ["Team rooms", "Private team space remains a scoped facility role, not blanket availability."],
  ["Community", "Introductions are opt-in, context-led and never a promised customer or investor route."],
  ["Connectivity", "Technical needs are captured before any location-level performance statement is made."],
  ["Content studio", "Production requires confirmed equipment, support, rights and publication boundaries."],
  ["Fitness formats", "An instructor, schedule, access and safety owner must be confirmed before a class is offered."],
  ["One written scope", "Services, responsibilities and exclusions are recorded together instead of hidden behind a package claim."],
] as const;

export const proofLanes = [
  {
    number: "01", title: "Founding teams",
    question: "Can a small team protect focus without cutting itself off?",
    answer: "A CRAYS format can separate maker time, decision time and opt-in community time. The founders keep ownership of priorities and outcomes; the club supplies only the setting and services that are confirmed.",
    gate: "Publish only with the real organization, dates, format, consent and an evidence-based account of what was completed.",
  },
  {
    number: "02", title: "Distributed teams",
    question: "Can remote colleagues turn one gathering into better working habits?",
    answer: "The program can create a shared place to plan, build, review and document. The team decides what continues afterwards, and no later company result is attributed to CRAYS without proof.",
    gate: "Separate the delivered gathering from later performance, hiring, revenue or product outcomes.",
  },
  {
    number: "03", title: "Product and creative teams",
    question: "Can makers move from a loose problem to work they can explain?",
    answer: "Protected production, workshops and an optional demo create a practical sequence: frame the problem, make decisions, build a version, then state what changed and what remains unresolved.",
    gate: "The team approves every public artifact and defines the boundary around confidential work and intellectual property.",
  },
  {
    number: "04", title: "Leadership groups",
    question: "Can leaders step outside routine without staging corporate theatre?",
    answer: "The visit remains working time. The agenda can hold difficult decisions, individual thought, group discussion and a written record of ownership without pretending that a retreat itself creates alignment.",
    gate: "No leader, company or statement appears until identity, role, wording and publication permission are confirmed.",
  },
  {
    number: "05", title: "Company residencies",
    question: "Can a longer format combine delivery, sustainable rhythm and local connection?",
    answer: "A residency can sequence focused work, learning, movement and community while accommodation, facilities, access and dates remain subject to explicit written confirmation.",
    gate: "A capability becomes a case study only after delivery and approval of the factual record.",
  },
] as const;

export const methods = [
  {
    step: "Learn", line: "Put useful knowledge next to the work.",
    body: "The team identifies what it must understand before arrival. Any session is then shaped around a live decision or capability rather than a generic curriculum.",
    details: ["Name the decision or capability first.", "Use a practitioner only after participation is confirmed.", "Separate practical learning from legal, financial or employment advice.", "Record what the team will test afterwards."],
  },
  {
    step: "Network", line: "Meet people for a reason, never for a badge.",
    body: "Introductions start with context and mutual consent. CRAYS does not imply that a visitor will meet an investor, customer, employer or partner.",
    details: ["State which perspective would be useful.", "Confirm consent before identities are shared.", "Give each conversation a clear boundary.", "Let relationships develop without a commercial promise."],
  },
  {
    step: "Build", line: "Turn protected time into visible progress.",
    body: "Focused blocks, team rooms and review points help the team move its own priorities. CRAYS does not become the delivery team and does not guarantee a launch.",
    details: ["Choose a bounded outcome.", "Protect maker time from unnecessary programming.", "Schedule decisions before work blocks.", "Record what changed and what still needs evidence."],
  },
  {
    step: "Demo", line: "Explain the work without inflating the story.",
    body: "An optional demo can show what was learned or made after audience, confidentiality and feedback rules are agreed. It is not a funding event or endorsement.",
    details: ["Decide what can be shown.", "Invite only an appropriate confirmed audience.", "Separate feedback from commitments.", "Publish nothing without explicit approval."],
  },
] as const;

export const expertiseSlots = [
  ["Founder operations", "Priorities, decision ownership and operating rhythm."],
  ["Product practice", "Problem framing, judgment and delivery choices."],
  ["Engineering", "Architecture, reliability and responsible implementation."],
  ["Design", "Research, interaction and product coherence."],
  ["Go-to-market", "Positioning, channels and evidence-led learning."],
  ["Brand and content", "Narrative, production and truthful communication."],
  ["Remote leadership", "Distributed decisions and written operating habits."],
  ["Community building", "Consent, belonging and useful participation."],
  ["Team health", "Sustainable routines without medical claims."],
  ["Facilitation", "Structured critique, mapping and decision sessions."],
  ["Company formation", "Only through an appropriately qualified confirmed expert."],
  ["Finance", "Only through an appropriately qualified confirmed expert."],
  ["Legal operations", "Only through an appropriately qualified confirmed expert."],
  ["Regional context", "Only through verified local knowledge."],
  ["Hospitality operations", "Only through confirmed operational practitioners."],
  ["Technology strategy", "Choices, trade-offs and accountable roadmaps."],
  ["Security and privacy", "Only through confirmed qualified practitioners."],
  ["People operations", "No hiring or employment outcome promise."],
  ["Creative production", "Rights-aware production and publication decisions."],
  ["Public communication", "Evidence, approvals and responsible claims."],
] as const;

export const facilities = [
  ["Accommodation coordination", "A real option appears only after property, dates and access are confirmed.", "Confirmation required"],
  ["Shared meals", "Meal formats can support the day; menus, dietary handling and service require confirmation.", "Scope before arrival"],
  ["Movement and gym", "Movement belongs in the rhythm; actual facility access must be verified.", "Access not yet claimed"],
  ["Expert sessions", "A session is attached to a confirmed person, topic and date.", "Profiles awaiting approval"],
  ["Community moments", "Opt-in gatherings create room for conversation without a networking guarantee.", "Format-led"],
  ["Coworking", "Quiet work, shared tables and review zones are mapped to the agreed program.", "Location confirmation required"],
  ["Content studio", "Use depends on equipment, support, rights and the content allowed for publication.", "Rights-aware"],
  ["Workshops", "Rooms and formats support mapping, critique, planning and decisions.", "Agenda-led"],
  ["Fitness classes", "Instructor, schedule, access and safety responsibility must be confirmed.", "Program blocked"],
  ["Introductions", "Customer, partner, employer and investor introductions are never guaranteed.", "Mutual consent required"],
  ["Connectivity", "Requirements are captured before any performance claim is made.", "Technical confirmation required"],
] as const;

export const socialProof = [
  ["Team outcome", "Approved organization, dates, format and a factual account of completed work."],
  ["Founder reflection", "Verified person and role, exact approved statement and publication consent."],
  ["Program evidence", "Delivered agenda and a record separating activity from later outcomes."],
  ["Community experience", "Consent from every identifiable contributor and no inferred endorsement."],
  ["Return visit", "A real second engagement plus approval to state why the team returned."],
] as const;

export const faqs = [
  ["Is this a booking page?", "No. Teams explains the journey and opens a scoped conversation. Dates, accommodation, facilities, access and commercial terms require separate confirmation."],
  ["Does CRAYS promise introductions?", "No. A relevant introduction may be considered only after context and mutual consent exist. There is no promise of investors, customers, partners, employers or funding."],
  ["Can the team's work remain private?", "Yes. The team decides what may be discussed, demonstrated or published. Public proof, media and quotations need separate explicit approval."],
  ["Is every facility always available?", "No. Each facility, service and operating detail must be confirmed for the actual location, scope and dates."],
  ["Can CRAYS guarantee a launch or result?", "No. The team owns decisions and outcomes. CRAYS provides a structured setting and only explicitly confirmed services."],
  ["How does a team begin?", "Begin with purpose, size, working needs and preferred format. CRAYS can then identify what is possible, what needs confirmation and what remains blocked."],
] as const;

export type TeamsContent = {
  benefits: typeof benefits;
  proofLanes: typeof proofLanes;
  methods: typeof methods;
  expertiseSlots: typeof expertiseSlots;
  facilities: typeof facilities;
  socialProof: typeof socialProof;
  faqs: typeof faqs;
};

const englishTeamsContent: TeamsContent = {
  benefits,
  proofLanes,
  methods,
  expertiseSlots,
  facilities,
  socialProof,
  faqs,
};

export function getTeamsContent(locale: TeamsLocale): TeamsContent {
  if (locale === "en") return englishTeamsContent;
  return (localizedTeamsCopy as unknown as Record<Exclude<TeamsLocale, "en">, TeamsContent>)[locale];
}
