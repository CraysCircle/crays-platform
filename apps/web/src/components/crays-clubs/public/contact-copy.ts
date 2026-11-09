import type {
  CraysFamilyLocale,
  FamiliesShellCopy,
} from "../journeys-phase8/families-copy";

export type ContactLocale = CraysFamilyLocale;

type ContactChannel = { label: string; detail: string };
type ContactDesk = { eyebrow: string; title: string; body: string };

export type ContactPageCopy = {
  metadata: { title: string; description: string };
  shell: FamiliesShellCopy;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    primary: string;
    secondary: string;
    mediaAlt: string;
    mediaFallback: string;
  };
  channels: {
    eyebrow: string;
    title: string;
    open: string;
    items: readonly ContactChannel[];
  };
  desk: {
    eyebrow: string;
    title: string;
    body: string;
    items: readonly ContactDesk[];
  };
  form: {
    eyebrow: string;
    title: string;
    body: string;
    locationLabel: string;
    locationName: string;
    locationAddress: string;
    fullName: string;
    email: string;
    requestType: string;
    requestPlaceholder: string;
    requestOptions: readonly string[];
    message: string;
    consentPrefix: string;
    consentLink: string;
    consentSuffix: string;
    send: string;
    unavailable: string;
  };
  official: {
    eyebrow: string;
    title: string;
    imprint: string;
    headquartersLabel: string;
    operationsLabel: string;
  };
  community: { eyebrow: string; title: string; body: string; cta: string };
};

const shell = {
  en: {
    about: "About Us",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    community: "Community Life",
    membership: "Become a Member",
    ambassadors: "Ambassadors",
    families: "Families",
    teams: "Teams",
    events: "Events",
    companies: "Portfolio Companies",
    conference: "Conference",
    brandService: "Brand as a Service",
    contact: "Contact",
    account: "Account",
    legal: "Legal",
    skip: "Skip to contact content",
    primaryNav: "Primary navigation",
    menu: "Menu",
    close: "Close",
    association: "Crays.org",
    associationNote: "Open the association website",
    footerLine: "Work, live and play across one connected club world.",
    siteNote: "The official CRAYS Clubs website.",
    footerNav: "Footer navigation",
  },
  de: {
    about: "Über uns",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    community: "Community Life",
    membership: "Mitglied werden",
    ambassadors: "Ambassadors",
    families: "Familien",
    teams: "Teams",
    events: "Events",
    companies: "Portfolio-Unternehmen",
    conference: "Konferenz",
    brandService: "Brand as a Service",
    contact: "Kontakt",
    account: "Konto",
    legal: "Rechtliches",
    skip: "Zum Kontaktinhalt springen",
    primaryNav: "Hauptnavigation",
    menu: "Menü",
    close: "Schließen",
    association: "Crays.org",
    associationNote: "Website der Association öffnen",
    footerLine: "Arbeiten, leben und spielen in einer verbundenen Clubwelt.",
    siteNote: "Die offizielle Website der CRAYS Clubs.",
    footerNav: "Footer-Navigation",
  },
  es: {
    about: "Sobre nosotros",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    community: "Vida en comunidad",
    membership: "Hazte miembro",
    ambassadors: "Ambassadors",
    families: "Familias",
    teams: "Equipos",
    events: "Eventos",
    companies: "Empresas del portafolio",
    conference: "Conferencia",
    brandService: "Brand as a Service",
    contact: "Contacto",
    account: "Cuenta",
    legal: "Legal",
    skip: "Ir al contenido de contacto",
    primaryNav: "Navegación principal",
    menu: "Menú",
    close: "Cerrar",
    association: "Crays.org",
    associationNote: "Abrir el sitio de la asociación",
    footerLine: "Trabaja, vive y disfruta en un mundo de clubes conectado.",
    siteNote: "El sitio web oficial de CRAYS Clubs.",
    footerNav: "Navegación del pie",
  },
  ca: {
    about: "Sobre nosaltres",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    community: "Vida en comunitat",
    membership: "Fes-te membre",
    ambassadors: "Ambassadors",
    families: "Famílies",
    teams: "Equips",
    events: "Esdeveniments",
    companies: "Empreses del portafoli",
    conference: "Conferència",
    brandService: "Brand as a Service",
    contact: "Contacte",
    account: "Compte",
    legal: "Legal",
    skip: "Ves al contingut de contacte",
    primaryNav: "Navegació principal",
    menu: "Menú",
    close: "Tanca",
    association: "Crays.org",
    associationNote: "Obre el web de l'associació",
    footerLine: "Treballa, viu i gaudeix en un món de clubs connectat.",
    siteNote: "El lloc web oficial de CRAYS Clubs.",
    footerNav: "Navegació del peu",
  },
  fr: {
    about: "À propos",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    community: "Vie communautaire",
    membership: "Devenir membre",
    ambassadors: "Ambassadors",
    families: "Familles",
    teams: "Équipes",
    events: "Événements",
    companies: "Sociétés du portefeuille",
    conference: "Conférence",
    brandService: "Brand as a Service",
    contact: "Contact",
    account: "Compte",
    legal: "Mentions légales",
    skip: "Aller au contenu de contact",
    primaryNav: "Navigation principale",
    menu: "Menu",
    close: "Fermer",
    association: "Crays.org",
    associationNote: "Ouvrir le site de l'association",
    footerLine:
      "Travaillez, vivez et partagez dans un monde de clubs connecté.",
    siteNote: "Le site officiel de CRAYS Clubs.",
    footerNav: "Navigation du pied de page",
  },
  pt: {
    about: "Sobre nós",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    community: "Vida em comunidade",
    membership: "Torne-se membro",
    ambassadors: "Ambassadors",
    families: "Famílias",
    teams: "Equipas",
    events: "Eventos",
    companies: "Empresas do portefólio",
    conference: "Conferência",
    brandService: "Brand as a Service",
    contact: "Contacto",
    account: "Conta",
    legal: "Informação legal",
    skip: "Ir para o conteúdo de contacto",
    primaryNav: "Navegação principal",
    menu: "Menu",
    close: "Fechar",
    association: "Crays.org",
    associationNote: "Abrir o site da associação",
    footerLine: "Trabalhe, viva e desfrute num mundo de clubes conectado.",
    siteNote: "O site oficial dos CRAYS Clubs.",
    footerNav: "Navegação do rodapé",
  },
  it: {
    about: "Chi siamo",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    community: "Vita di comunità",
    membership: "Diventa membro",
    ambassadors: "Ambassadors",
    families: "Famiglie",
    teams: "Team",
    events: "Eventi",
    companies: "Società in portafoglio",
    conference: "Conferenza",
    brandService: "Brand as a Service",
    contact: "Contatto",
    account: "Account",
    legal: "Note legali",
    skip: "Vai al contenuto di contatto",
    primaryNav: "Navigazione principale",
    menu: "Menu",
    close: "Chiudi",
    association: "Crays.org",
    associationNote: "Apri il sito dell'associazione",
    footerLine: "Lavora, vivi e condividi in un mondo di club connesso.",
    siteNote: "Il sito ufficiale di CRAYS Clubs.",
    footerNav: "Navigazione del footer",
  },
} satisfies Record<ContactLocale, FamiliesShellCopy>;

export const contactCopy: Record<ContactLocale, ContactPageCopy> = {
  en: {
    metadata: {
      title: "Contact | Crays Clubs",
      description: "Reach the right desk inside the Crays Club network.",
    },
    shell: shell.en,
    hero: {
      eyebrow: "Contact Crays Clubs",
      title: "Reach the right desk inside the club network.",
      body: "For guest access, club stays, hospitality partnerships, community support and official entity questions, start here and route the request directly to the Crays Club team.",
      primary: "Start with General Inquiries",
      secondary: "Open Contact Form",
      mediaAlt: "Forest City Golf Hotel at blue hour",
      mediaFallback: "Contact media is temporarily unavailable.",
    },
    channels: {
      eyebrow: "Direct Channels",
      title: "Fast paths into Crays Club",
      open: "Open",
      items: [
        { label: "General Inquiries", detail: "info@craysclub.com" },
        {
          label: "Contact via LinkedIn",
          detail: "Open the Crays company profile.",
        },
        { label: "Contact via Telegram", detail: "Open a direct Crays chat." },
        {
          label: "Contact via WhatsApp",
          detail: "Open the Crays direct mobile route.",
        },
        {
          label: "Contact via Signal",
          detail: "Open Signal for direct contact.",
        },
      ],
    },
    desk: {
      eyebrow: "Contact Desk",
      title: "Choose the right route.",
      body: "The Crays World contact logic is kept here, but adapted for Crays Clubs: access, operations, technology and official company questions land in one clean club layer.",
      items: [
        {
          eyebrow: "General Inquiries",
          title: "First contact and routing",
          body: "For ecosystem questions, partnerships, press, legal entity questions, project ideas and anything that needs to be routed inside Crays Clubs.",
        },
        {
          eyebrow: "Club Access",
          title: "Guest access and memberships",
          body: "For first access, membership interest, Palma flagship questions, club living, VIP club and future stay availability.",
        },
        {
          eyebrow: "Hospitality Partners",
          title: "Venues, hotels and brands",
          body: "For hotel operators, venue partners, hospitality brands, creators and companies that want to connect with the Crays Club layer.",
        },
        {
          eyebrow: "Technical Support",
          title: "App and platform support",
          body: "For account access, booking concepts, future Crays Booking integration, profile issues and support around the Crays technology layer.",
        },
      ],
    },
    form: {
      eyebrow: "Contact Form",
      title: "Send the request with context.",
      body: "Use this form for access, stays, partnerships, press, support or official entity questions. The current static version routes by email and is ready to be connected to a backend later.",
      locationLabel: "Crays Club Flagship",
      locationName: "Forest City Malaysia",
      locationAddress: "2km away from Singapore",
      fullName: "Full Name",
      email: "Email",
      requestType: "Request Type",
      requestPlaceholder: "Select one",
      requestOptions: [
        "Guest access",
        "Club stay",
        "Membership",
        "Hospitality partnership",
        "Technical support",
        "Legal entity question",
      ],
      message: "Message",
      consentPrefix: "I accept the",
      consentLink: "Privacy Policy",
      consentSuffix: ".",
      send: "Send request",
      unavailable:
        "Submission is not active. No message or personal data is transmitted from this form.",
    },
    official: {
      eyebrow: "Official Information",
      title: "Operating Entity",
      imprint: "Open imprint",
      headquartersLabel: "Global Headquarter",
      operationsLabel: "Operational Business",
    },
    community: {
      eyebrow: "Crays Community",
      title: "Real needs, digital networks and real-life places.",
      body: "Crays Clubs connect people who want more than a feed: guests, founders, creators, hospitality operators, builders and makers showing up in one place, online and in person.",
      cta: "Open Crays Community",
    },
  },
  de: {
    metadata: {
      title: "Kontakt | Crays Clubs",
      description:
        "Den richtigen Kontakt innerhalb des Crays-Club-Netzwerks erreichen.",
    },
    shell: shell.de,
    hero: {
      eyebrow: "Crays Clubs kontaktieren",
      title: "Erreiche den richtigen Ansprechpartner im Clubnetzwerk.",
      body: "Für Gastzugang, Clubaufenthalte, Hospitality-Partnerschaften, Community-Support und Fragen zu offiziellen Einheiten startest du hier und leitest deine Anfrage direkt an das Crays-Club-Team.",
      primary: "Mit allgemeinen Anfragen starten",
      secondary: "Kontaktformular öffnen",
      mediaAlt: "Forest City Golf Hotel in der blauen Stunde",
      mediaFallback: "Das Kontaktmotiv ist vorübergehend nicht verfügbar.",
    },
    channels: {
      eyebrow: "Direkte Kanäle",
      title: "Schnelle Wege in den Crays Club",
      open: "Öffnen",
      items: [
        { label: "Allgemeine Anfragen", detail: "info@craysclub.com" },
        {
          label: "Kontakt über LinkedIn",
          detail: "Das Unternehmensprofil von Crays öffnen.",
        },
        {
          label: "Kontakt über Telegram",
          detail: "Einen direkten Crays-Chat öffnen.",
        },
        {
          label: "Kontakt über WhatsApp",
          detail: "Den direkten mobilen Crays-Kanal öffnen.",
        },
        {
          label: "Kontakt über Signal",
          detail: "Signal für den direkten Kontakt öffnen.",
        },
      ],
    },
    desk: {
      eyebrow: "Kontaktstelle",
      title: "Wähle den richtigen Weg.",
      body: "Die Kontaktlogik von Crays World bleibt hier erhalten, ist aber für Crays Clubs angepasst: Zugang, Betrieb, Technologie und offizielle Unternehmensfragen landen in einer klaren Clubebene.",
      items: [
        {
          eyebrow: "Allgemeine Anfragen",
          title: "Erstkontakt und Weiterleitung",
          body: "Für Fragen zum Ökosystem, Partnerschaften, Presse, Rechtsträger, Projektideen und alles, was innerhalb der Crays Clubs weitergeleitet werden muss.",
        },
        {
          eyebrow: "Clubzugang",
          title: "Gastzugang und Mitgliedschaften",
          body: "Für den ersten Zugang, Mitgliedschaftsinteresse, Fragen zum Palma Flagship, Club Living, VIP Club und künftige Verfügbarkeit von Aufenthalten.",
        },
        {
          eyebrow: "Hospitality-Partner",
          title: "Locations, Hotels und Marken",
          body: "Für Hotelbetreiber, Location-Partner, Hospitality-Marken, Kreative und Unternehmen, die sich mit der Crays-Club-Ebene verbinden möchten.",
        },
        {
          eyebrow: "Technischer Support",
          title: "App- und Plattform-Support",
          body: "Für Kontozugang, Buchungskonzepte, die künftige Crays-Booking-Integration, Profilprobleme und Support rund um die Crays-Technologieebene.",
        },
      ],
    },
    form: {
      eyebrow: "Kontaktformular",
      title: "Anfrage mit Kontext senden.",
      body: "Nutze dieses Formular für Zugang, Aufenthalte, Partnerschaften, Presse, Support oder Fragen zu offiziellen Einheiten. Die Oberfläche ist vollständig, die Übermittlung bleibt jedoch deaktiviert, bis ein autorisiertes Backend und ein Datenprozess bestehen.",
      locationLabel: "Crays Club Flagship",
      locationName: "Forest City Malaysia",
      locationAddress: "2km von Singapur entfernt",
      fullName: "Vollständiger Name",
      email: "E-Mail",
      requestType: "Anfragetyp",
      requestPlaceholder: "Auswählen",
      requestOptions: [
        "Gastzugang",
        "Clubaufenthalt",
        "Mitgliedschaft",
        "Hospitality-Partnerschaft",
        "Technischer Support",
        "Frage zum Rechtsträger",
      ],
      message: "Nachricht",
      consentPrefix: "Ich akzeptiere die",
      consentLink: "Datenschutzerklärung",
      consentSuffix: ".",
      send: "Anfrage senden",
      unavailable:
        "Die Übermittlung ist nicht aktiv. Über dieses Formular werden keine Nachricht und keine personenbezogenen Daten übertragen.",
    },
    official: {
      eyebrow: "Offizielle Informationen",
      title: "Betreibergesellschaft",
      imprint: "Impressum öffnen",
      headquartersLabel: "Globaler Hauptsitz",
      operationsLabel: "Operatives Geschäft",
    },
    community: {
      eyebrow: "Crays Community",
      title: "Echte Bedürfnisse, digitale Netzwerke und reale Orte.",
      body: "Crays Clubs verbinden Menschen, die mehr als einen Feed suchen: Gäste, Gründer, Kreative, Hospitality-Betreiber, Builder und Maker, die an einem Ort zusammenkommen, online und persönlich.",
      cta: "Crays Community öffnen",
    },
  },
  es: {
    metadata: {
      title: "Contacto | Crays Clubs",
      description: "Llega al equipo adecuado dentro de la red de Crays Clubs.",
    },
    shell: shell.es,
    hero: {
      eyebrow: "Contactar con Crays Clubs",
      title: "Llega al equipo adecuado dentro de la red de clubes.",
      body: "Para el acceso de invitados, estancias en el club, colaboraciones de hospitality, apoyo a la comunidad y preguntas sobre entidades oficiales, empieza aquí y dirige la solicitud al equipo de Crays Clubs.",
      primary: "Empezar con consultas generales",
      secondary: "Abrir formulario de contacto",
      mediaAlt: "Forest City Golf Hotel durante la hora azul",
      mediaFallback: "La imagen de contacto no está disponible temporalmente.",
    },
    channels: {
      eyebrow: "Canales directos",
      title: "Vías rápidas para llegar a Crays Club",
      open: "Abrir",
      items: [
        { label: "Consultas generales", detail: "info@craysclub.com" },
        {
          label: "Contactar por LinkedIn",
          detail: "Abrir el perfil de empresa de Crays.",
        },
        {
          label: "Contactar por Telegram",
          detail: "Abrir un chat directo con Crays.",
        },
        {
          label: "Contactar por WhatsApp",
          detail: "Abrir la vía móvil directa de Crays.",
        },
        {
          label: "Contactar por Signal",
          detail: "Abrir Signal para contactar directamente.",
        },
      ],
    },
    desk: {
      eyebrow: "Equipo de contacto",
      title: "Elige la vía adecuada.",
      body: "La lógica de contacto de Crays World se mantiene aquí, adaptada a Crays Clubs: acceso, operaciones, tecnología y preguntas oficiales de empresa llegan a una única capa clara del club.",
      items: [
        {
          eyebrow: "Consultas generales",
          title: "Primer contacto y derivación",
          body: "Para preguntas sobre el ecosistema, colaboraciones, prensa, entidades jurídicas, ideas de proyectos y cualquier asunto que deba dirigirse dentro de Crays Clubs.",
        },
        {
          eyebrow: "Acceso al club",
          title: "Acceso de invitados y membresías",
          body: "Para el primer acceso, interés en la membresía, preguntas sobre Palma Flagship, club living, VIP Club y futura disponibilidad de estancias.",
        },
        {
          eyebrow: "Socios de hospitality",
          title: "Espacios, hoteles y marcas",
          body: "Para operadores hoteleros, socios de espacios, marcas de hospitality, creadores y empresas que quieran conectar con la capa de Crays Clubs.",
        },
        {
          eyebrow: "Soporte técnico",
          title: "Soporte de app y plataforma",
          body: "Para acceso a la cuenta, conceptos de reserva, futura integración de Crays Booking, incidencias de perfil y soporte sobre la capa tecnológica de Crays.",
        },
      ],
    },
    form: {
      eyebrow: "Formulario de contacto",
      title: "Envía la solicitud con contexto.",
      body: "Utiliza este formulario para acceso, estancias, colaboraciones, prensa, soporte o preguntas sobre entidades oficiales. La interfaz está completa, pero el envío permanece desactivado hasta que exista un backend y un proceso de datos autorizados.",
      locationLabel: "Crays Club Flagship",
      locationName: "Forest City Malaysia",
      locationAddress: "A 2km de Singapur",
      fullName: "Nombre completo",
      email: "Correo electrónico",
      requestType: "Tipo de solicitud",
      requestPlaceholder: "Selecciona una opción",
      requestOptions: [
        "Acceso de invitado",
        "Estancia en el club",
        "Membresía",
        "Colaboración de hospitality",
        "Soporte técnico",
        "Pregunta sobre entidad jurídica",
      ],
      message: "Mensaje",
      consentPrefix: "Acepto la",
      consentLink: "Política de privacidad",
      consentSuffix: ".",
      send: "Enviar solicitud",
      unavailable:
        "El envío no está activo. Este formulario no transmite mensajes ni datos personales.",
    },
    official: {
      eyebrow: "Información oficial",
      title: "Entidad operadora",
      imprint: "Abrir aviso legal",
      headquartersLabel: "Sede global",
      operationsLabel: "Negocio operativo",
    },
    community: {
      eyebrow: "Comunidad Crays",
      title: "Necesidades reales, redes digitales y lugares físicos.",
      body: "Crays Clubs conecta a personas que buscan algo más que un feed: invitados, fundadores, creadores, operadores de hospitality, builders y makers que se encuentran en un mismo lugar, en línea y en persona.",
      cta: "Abrir Crays Community",
    },
  },
  ca: {
    metadata: {
      title: "Contacte | Crays Clubs",
      description: "Arriba a l'equip adequat dins la xarxa de Crays Clubs.",
    },
    shell: shell.ca,
    hero: {
      eyebrow: "Contacta amb Crays Clubs",
      title: "Arriba a l'equip adequat dins la xarxa de clubs.",
      body: "Per a l'accés de convidats, estades al club, col·laboracions de hospitality, suport a la comunitat i preguntes sobre entitats oficials, comença aquí i dirigeix la sol·licitud a l'equip de Crays Clubs.",
      primary: "Comença amb consultes generals",
      secondary: "Obre el formulari de contacte",
      mediaAlt: "Forest City Golf Hotel durant l'hora blava",
      mediaFallback: "La imatge de contacte no està disponible temporalment.",
    },
    channels: {
      eyebrow: "Canals directes",
      title: "Vies ràpides per arribar a Crays Club",
      open: "Obre",
      items: [
        { label: "Consultes generals", detail: "info@craysclub.com" },
        {
          label: "Contacta per LinkedIn",
          detail: "Obre el perfil d'empresa de Crays.",
        },
        {
          label: "Contacta per Telegram",
          detail: "Obre un xat directe amb Crays.",
        },
        {
          label: "Contacta per WhatsApp",
          detail: "Obre la via mòbil directa de Crays.",
        },
        {
          label: "Contacta per Signal",
          detail: "Obre Signal per al contacte directe.",
        },
      ],
    },
    desk: {
      eyebrow: "Equip de contacte",
      title: "Tria la via adequada.",
      body: "La lògica de contacte de Crays World es manté aquí, adaptada a Crays Clubs: accés, operacions, tecnologia i preguntes oficials d'empresa arriben a una única capa clara del club.",
      items: [
        {
          eyebrow: "Consultes generals",
          title: "Primer contacte i derivació",
          body: "Per a preguntes sobre l'ecosistema, col·laboracions, premsa, entitats jurídiques, idees de projectes i qualsevol qüestió que s'hagi de dirigir dins de Crays Clubs.",
        },
        {
          eyebrow: "Accés al club",
          title: "Accés de convidats i membres",
          body: "Per al primer accés, interès en la membresia, preguntes sobre Palma Flagship, club living, VIP Club i futura disponibilitat d'estades.",
        },
        {
          eyebrow: "Socis de hospitality",
          title: "Espais, hotels i marques",
          body: "Per a operadors hotelers, socis d'espais, marques de hospitality, creadors i empreses que vulguin connectar amb la capa de Crays Clubs.",
        },
        {
          eyebrow: "Suport tècnic",
          title: "Suport d'app i plataforma",
          body: "Per a l'accés al compte, conceptes de reserva, futura integració de Crays Booking, incidències de perfil i suport sobre la capa tecnològica de Crays.",
        },
      ],
    },
    form: {
      eyebrow: "Formulari de contacte",
      title: "Envia la sol·licitud amb context.",
      body: "Utilitza aquest formulari per a accés, estades, col·laboracions, premsa, suport o preguntes sobre entitats oficials. La interfície és completa, però l'enviament roman desactivat fins que existeixi un backend i un procés de dades autoritzats.",
      locationLabel: "Crays Club Flagship",
      locationName: "Forest City Malaysia",
      locationAddress: "A 2km de Singapur",
      fullName: "Nom complet",
      email: "Correu electrònic",
      requestType: "Tipus de sol·licitud",
      requestPlaceholder: "Selecciona una opció",
      requestOptions: [
        "Accés de convidat",
        "Estada al club",
        "Membresia",
        "Col·laboració de hospitality",
        "Suport tècnic",
        "Pregunta sobre entitat jurídica",
      ],
      message: "Missatge",
      consentPrefix: "Accepto la",
      consentLink: "Política de privacitat",
      consentSuffix: ".",
      send: "Envia la sol·licitud",
      unavailable:
        "L'enviament no està actiu. Aquest formulari no transmet missatges ni dades personals.",
    },
    official: {
      eyebrow: "Informació oficial",
      title: "Entitat operadora",
      imprint: "Obre l'avís legal",
      headquartersLabel: "Seu global",
      operationsLabel: "Negoci operatiu",
    },
    community: {
      eyebrow: "Comunitat Crays",
      title: "Necessitats reals, xarxes digitals i llocs físics.",
      body: "Crays Clubs connecta persones que busquen més que un feed: convidats, fundadors, creadors, operadors de hospitality, builders i makers que es troben en un mateix lloc, en línia i en persona.",
      cta: "Obre Crays Community",
    },
  },
  fr: {
    metadata: {
      title: "Contact | Crays Clubs",
      description:
        "Joignez le bon interlocuteur au sein du réseau Crays Clubs.",
    },
    shell: shell.fr,
    hero: {
      eyebrow: "Contacter Crays Clubs",
      title: "Joignez le bon interlocuteur au sein du réseau de clubs.",
      body: "Pour l'accès invité, les séjours au club, les collaborations hospitality, le soutien communautaire et les questions relatives aux entités officielles, commencez ici et adressez directement votre demande à l'équipe Crays Clubs.",
      primary: "Commencer par les demandes générales",
      secondary: "Ouvrir le formulaire de contact",
      mediaAlt: "Forest City Golf Hotel à l'heure bleue",
      mediaFallback: "Le visuel de contact est temporairement indisponible.",
    },
    channels: {
      eyebrow: "Canaux directs",
      title: "Accès rapides à Crays Club",
      open: "Ouvrir",
      items: [
        { label: "Demandes générales", detail: "info@craysclub.com" },
        {
          label: "Contacter via LinkedIn",
          detail: "Ouvrir le profil de l'entreprise Crays.",
        },
        {
          label: "Contacter via Telegram",
          detail: "Ouvrir une discussion directe avec Crays.",
        },
        {
          label: "Contacter via WhatsApp",
          detail: "Ouvrir le canal mobile direct de Crays.",
        },
        {
          label: "Contacter via Signal",
          detail: "Ouvrir Signal pour un contact direct.",
        },
      ],
    },
    desk: {
      eyebrow: "Service de contact",
      title: "Choisissez le bon parcours.",
      body: "La logique de contact de Crays World est conservée ici, mais adaptée à Crays Clubs : accès, opérations, technologie et questions officielles d'entreprise arrivent dans une couche club claire et unique.",
      items: [
        {
          eyebrow: "Demandes générales",
          title: "Premier contact et orientation",
          body: "Pour les questions sur l'écosystème, les collaborations, la presse, les entités juridiques, les idées de projets et tout sujet devant être orienté au sein de Crays Clubs.",
        },
        {
          eyebrow: "Accès au club",
          title: "Accès invité et adhésions",
          body: "Pour un premier accès, l'intérêt pour une adhésion, les questions sur Palma Flagship, le club living, le VIP Club et la disponibilité future des séjours.",
        },
        {
          eyebrow: "Partenaires hospitality",
          title: "Lieux, hôtels et marques",
          body: "Pour les opérateurs hôteliers, partenaires de lieux, marques hospitality, créateurs et entreprises souhaitant se connecter à la couche Crays Clubs.",
        },
        {
          eyebrow: "Support technique",
          title: "Support de l'application et de la plateforme",
          body: "Pour l'accès au compte, les concepts de réservation, la future intégration Crays Booking, les problèmes de profil et l'assistance liée à la couche technologique de Crays.",
        },
      ],
    },
    form: {
      eyebrow: "Formulaire de contact",
      title: "Envoyez votre demande avec son contexte.",
      body: "Utilisez ce formulaire pour l'accès, les séjours, les collaborations, la presse, le support ou les questions relatives aux entités officielles. L'interface est complète, mais l'envoi reste désactivé jusqu'à l'existence d'un backend et d'un processus de données autorisés.",
      locationLabel: "Crays Club Flagship",
      locationName: "Forest City Malaysia",
      locationAddress: "À 2km de Singapour",
      fullName: "Nom complet",
      email: "E-mail",
      requestType: "Type de demande",
      requestPlaceholder: "Sélectionner",
      requestOptions: [
        "Accès invité",
        "Séjour au club",
        "Adhésion",
        "Collaboration hospitality",
        "Support technique",
        "Question sur une entité juridique",
      ],
      message: "Message",
      consentPrefix: "J'accepte la",
      consentLink: "Politique de confidentialité",
      consentSuffix: ".",
      send: "Envoyer la demande",
      unavailable:
        "L'envoi n'est pas actif. Aucun message ni aucune donnée personnelle ne sont transmis par ce formulaire.",
    },
    official: {
      eyebrow: "Informations officielles",
      title: "Société exploitante",
      imprint: "Ouvrir les mentions légales",
      headquartersLabel: "Siège mondial",
      operationsLabel: "Activité opérationnelle",
    },
    community: {
      eyebrow: "Communauté Crays",
      title:
        "Des besoins réels, des réseaux numériques et des lieux physiques.",
      body: "Crays Clubs rassemble des personnes qui recherchent plus qu'un fil d'actualité : invités, fondateurs, créateurs, opérateurs hospitality, builders et makers réunis au même endroit, en ligne et en personne.",
      cta: "Ouvrir Crays Community",
    },
  },
  pt: {
    metadata: {
      title: "Contacto | Crays Clubs",
      description: "Chegue à equipa certa dentro da rede Crays Clubs.",
    },
    shell: shell.pt,
    hero: {
      eyebrow: "Contactar Crays Clubs",
      title: "Chegue à equipa certa dentro da rede de clubes.",
      body: "Para acesso de convidados, estadias no clube, colaborações de hospitality, apoio à comunidade e questões sobre entidades oficiais, comece aqui e encaminhe o pedido diretamente para a equipa Crays Clubs.",
      primary: "Começar com pedidos gerais",
      secondary: "Abrir formulário de contacto",
      mediaAlt: "Forest City Golf Hotel durante a hora azul",
      mediaFallback: "A imagem de contacto está temporariamente indisponível.",
    },
    channels: {
      eyebrow: "Canais diretos",
      title: "Caminhos rápidos para o Crays Club",
      open: "Abrir",
      items: [
        { label: "Pedidos gerais", detail: "info@craysclub.com" },
        {
          label: "Contactar pelo LinkedIn",
          detail: "Abrir o perfil empresarial da Crays.",
        },
        {
          label: "Contactar pelo Telegram",
          detail: "Abrir uma conversa direta com a Crays.",
        },
        {
          label: "Contactar pelo WhatsApp",
          detail: "Abrir o canal móvel direto da Crays.",
        },
        {
          label: "Contactar pelo Signal",
          detail: "Abrir o Signal para contacto direto.",
        },
      ],
    },
    desk: {
      eyebrow: "Equipa de contacto",
      title: "Escolha o caminho certo.",
      body: "A lógica de contacto do Crays World é mantida aqui, mas adaptada aos Crays Clubs: acesso, operações, tecnologia e questões empresariais oficiais chegam a uma camada de clube clara e única.",
      items: [
        {
          eyebrow: "Pedidos gerais",
          title: "Primeiro contacto e encaminhamento",
          body: "Para questões sobre o ecossistema, colaborações, imprensa, entidades jurídicas, ideias de projetos e qualquer assunto que precise de ser encaminhado dentro dos Crays Clubs.",
        },
        {
          eyebrow: "Acesso ao clube",
          title: "Acesso de convidados e adesões",
          body: "Para primeiro acesso, interesse em adesão, questões sobre Palma Flagship, club living, VIP Club e disponibilidade futura de estadias.",
        },
        {
          eyebrow: "Parceiros de hospitality",
          title: "Espaços, hotéis e marcas",
          body: "Para operadores hoteleiros, parceiros de espaços, marcas de hospitality, criadores e empresas que pretendam ligar-se à camada dos Crays Clubs.",
        },
        {
          eyebrow: "Suporte técnico",
          title: "Suporte da aplicação e plataforma",
          body: "Para acesso à conta, conceitos de reserva, futura integração do Crays Booking, problemas de perfil e suporte relacionado com a camada tecnológica da Crays.",
        },
      ],
    },
    form: {
      eyebrow: "Formulário de contacto",
      title: "Envie o pedido com contexto.",
      body: "Utilize este formulário para acesso, estadias, colaborações, imprensa, suporte ou questões sobre entidades oficiais. A interface está completa, mas o envio permanece desativado até existir um backend e um processo de dados autorizados.",
      locationLabel: "Crays Club Flagship",
      locationName: "Forest City Malaysia",
      locationAddress: "A 2km de Singapura",
      fullName: "Nome completo",
      email: "Email",
      requestType: "Tipo de pedido",
      requestPlaceholder: "Selecionar",
      requestOptions: [
        "Acesso de convidado",
        "Estadia no clube",
        "Adesão",
        "Colaboração de hospitality",
        "Suporte técnico",
        "Questão sobre entidade jurídica",
      ],
      message: "Mensagem",
      consentPrefix: "Aceito a",
      consentLink: "Política de privacidade",
      consentSuffix: ".",
      send: "Enviar pedido",
      unavailable:
        "O envio não está ativo. Este formulário não transmite mensagens nem dados pessoais.",
    },
    official: {
      eyebrow: "Informação oficial",
      title: "Entidade operadora",
      imprint: "Abrir ficha legal",
      headquartersLabel: "Sede global",
      operationsLabel: "Atividade operacional",
    },
    community: {
      eyebrow: "Comunidade Crays",
      title: "Necessidades reais, redes digitais e lugares físicos.",
      body: "Os Crays Clubs ligam pessoas que procuram mais do que um feed: convidados, fundadores, criadores, operadores de hospitality, builders e makers reunidos num só lugar, online e presencialmente.",
      cta: "Abrir Crays Community",
    },
  },
  it: {
    metadata: {
      title: "Contatto | Crays Clubs",
      description: "Raggiungi il referente giusto nella rete Crays Clubs.",
    },
    shell: shell.it,
    hero: {
      eyebrow: "Contatta Crays Clubs",
      title: "Raggiungi il referente giusto nella rete dei club.",
      body: "Per accesso ospiti, soggiorni nel club, collaborazioni hospitality, supporto alla community e domande sulle entità ufficiali, inizia qui e indirizza la richiesta direttamente al team Crays Clubs.",
      primary: "Inizia dalle richieste generali",
      secondary: "Apri il modulo di contatto",
      mediaAlt: "Forest City Golf Hotel durante l'ora blu",
      mediaFallback: "L'immagine di contatto è temporaneamente indisponibile.",
    },
    channels: {
      eyebrow: "Canali diretti",
      title: "Percorsi rapidi per entrare in contatto con Crays Club",
      open: "Apri",
      items: [
        { label: "Richieste generali", detail: "info@craysclub.com" },
        {
          label: "Contatta tramite LinkedIn",
          detail: "Apri il profilo aziendale di Crays.",
        },
        {
          label: "Contatta tramite Telegram",
          detail: "Apri una chat diretta con Crays.",
        },
        {
          label: "Contatta tramite WhatsApp",
          detail: "Apri il canale mobile diretto di Crays.",
        },
        {
          label: "Contatta tramite Signal",
          detail: "Apri Signal per il contatto diretto.",
        },
      ],
    },
    desk: {
      eyebrow: "Team di contatto",
      title: "Scegli il percorso giusto.",
      body: "La logica di contatto di Crays World viene mantenuta qui, ma adattata a Crays Clubs: accesso, operazioni, tecnologia e domande aziendali ufficiali arrivano in un unico livello chiaro del club.",
      items: [
        {
          eyebrow: "Richieste generali",
          title: "Primo contatto e instradamento",
          body: "Per domande sull'ecosistema, collaborazioni, stampa, entità giuridiche, idee di progetto e qualsiasi tema da indirizzare all'interno di Crays Clubs.",
        },
        {
          eyebrow: "Accesso al club",
          title: "Accesso ospiti e membership",
          body: "Per il primo accesso, l'interesse alla membership, domande sul Palma Flagship, club living, VIP Club e futura disponibilità dei soggiorni.",
        },
        {
          eyebrow: "Partner hospitality",
          title: "Spazi, hotel e brand",
          body: "Per operatori alberghieri, partner di spazi, brand hospitality, creator e aziende che desiderano connettersi al livello Crays Clubs.",
        },
        {
          eyebrow: "Supporto tecnico",
          title: "Supporto app e piattaforma",
          body: "Per accesso all'account, concetti di prenotazione, futura integrazione Crays Booking, problemi del profilo e supporto relativo al livello tecnologico Crays.",
        },
      ],
    },
    form: {
      eyebrow: "Modulo di contatto",
      title: "Invia la richiesta con il contesto.",
      body: "Usa questo modulo per accesso, soggiorni, collaborazioni, stampa, supporto o domande sulle entità ufficiali. L'interfaccia è completa, ma l'invio resta disattivato finché non esistono un backend e un processo dati autorizzati.",
      locationLabel: "Crays Club Flagship",
      locationName: "Forest City Malaysia",
      locationAddress: "A 2km da Singapore",
      fullName: "Nome completo",
      email: "Email",
      requestType: "Tipo di richiesta",
      requestPlaceholder: "Seleziona",
      requestOptions: [
        "Accesso ospite",
        "Soggiorno nel club",
        "Membership",
        "Collaborazione hospitality",
        "Supporto tecnico",
        "Domanda su entità giuridica",
      ],
      message: "Messaggio",
      consentPrefix: "Accetto la",
      consentLink: "Privacy Policy",
      consentSuffix: ".",
      send: "Invia richiesta",
      unavailable:
        "L'invio non è attivo. Questo modulo non trasmette messaggi né dati personali.",
    },
    official: {
      eyebrow: "Informazioni ufficiali",
      title: "Società operativa",
      imprint: "Apri le note legali",
      headquartersLabel: "Sede globale",
      operationsLabel: "Attività operativa",
    },
    community: {
      eyebrow: "Community Crays",
      title: "Esigenze reali, reti digitali e luoghi fisici.",
      body: "Crays Clubs connette persone che cercano più di un feed: ospiti, founder, creator, operatori hospitality, builder e maker che si incontrano in un unico luogo, online e di persona.",
      cta: "Apri Crays Community",
    },
  },
};
