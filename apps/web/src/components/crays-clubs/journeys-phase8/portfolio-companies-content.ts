export const portfolioLocales = [
  "en",
  "de",
  "es",
  "ca",
  "fr",
  "pt",
  "it",
] as const;
export type PortfolioLocale = (typeof portfolioLocales)[number];
export type CopyItem = { title: string; body: string };
export type PortfolioCompaniesCopy = {
  localeName: string;
  metaTitle: string;
  metaDescription: string;
  ui: {
    skip: string;
    menu: string;
    close: string;
    account: string;
    language: string;
    association: string;
  };
  footer: {
    line: string;
    explore: string;
    participate: string;
    information: string;
    rights: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    cta: string;
    contextLabel: string;
  };
  contextItems: readonly string[];
  evidence: { label: string; states: readonly string[]; note: string };
  mapper: {
    eyebrow: string;
    title: string;
    lead: string;
    patternLabel: string;
    sizeLabel: string;
    patterns: readonly string[];
    resultLabel: string;
    tiers: readonly CopyItem[];
    note: string;
  };
  companies: {
    eyebrow: string;
    title: string;
    lead: string;
    items: readonly CopyItem[];
  };
  reasons: {
    eyebrow: string;
    title: string;
    lead: string;
    items: readonly CopyItem[];
    cta: string;
  };
  programme: {
    eyebrow: string;
    title: string;
    lead: string;
    items: readonly CopyItem[];
    note: string;
  };
  provision: {
    eyebrow: string;
    title: string;
    lead: string;
    items: readonly CopyItem[];
  };
  record: {
    eyebrow: string;
    title: string;
    lead: string;
    items: readonly CopyItem[];
  };
  closing: {
    eyebrow: string;
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
};

export type NavigationLabels = {
  forestCity: string;
  communityLife: string;
  about: string;
  lifestyle: string;
  hospitality: string;
  families: string;
  teams: string;
  events: string;
  portfolio: string;
  conference: string;
  member: string;
  ambassadors: string;
  contact: string;
  account: string;
  brand: string;
  legal: string;
};

export const navigationLabels: Record<PortfolioLocale, NavigationLabels> = {
  en: {
    forestCity: "Forest City",
    communityLife: "Community Life",
    about: "About Us",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    families: "Families",
    teams: "Teams",
    events: "Events",
    portfolio: "Portfolio Companies",
    conference: "Conference",
    member: "Become a Member",
    ambassadors: "Ambassadors",
    contact: "Contact",
    account: "Account",
    brand: "Brand as a Service",
    legal: "Legal",
  },
  de: {
    forestCity: "Forest City",
    communityLife: "Community Life",
    about: "Über uns",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    families: "Familien",
    teams: "Teams",
    events: "Events",
    portfolio: "Portfolio Companies",
    conference: "Konferenz",
    member: "Mitglied werden",
    ambassadors: "Ambassadors",
    contact: "Kontakt",
    account: "Konto",
    brand: "Brand as a Service",
    legal: "Rechtliches",
  },
  es: {
    forestCity: "Forest City",
    communityLife: "Vida en comunidad",
    about: "Sobre nosotros",
    lifestyle: "Estilo de vida",
    hospitality: "Hospitality",
    families: "Familias",
    teams: "Equipos",
    events: "Eventos",
    portfolio: "Portfolio Companies",
    conference: "Conferencia",
    member: "Hazte miembro",
    ambassadors: "Ambassadors",
    contact: "Contacto",
    account: "Cuenta",
    brand: "Brand as a Service",
    legal: "Legal",
  },
  ca: {
    forestCity: "Forest City",
    communityLife: "Vida en comunitat",
    about: "Qui som",
    lifestyle: "Estil de vida",
    hospitality: "Hospitality",
    families: "Famílies",
    teams: "Equips",
    events: "Esdeveniments",
    portfolio: "Portfolio Companies",
    conference: "Conferència",
    member: "Fes-te membre",
    ambassadors: "Ambassadors",
    contact: "Contacte",
    account: "Compte",
    brand: "Brand as a Service",
    legal: "Legal",
  },
  fr: {
    forestCity: "Forest City",
    communityLife: "Vie de la communauté",
    about: "À propos",
    lifestyle: "Art de vivre",
    hospitality: "Hospitality",
    families: "Familles",
    teams: "Équipes",
    events: "Événements",
    portfolio: "Portfolio Companies",
    conference: "Conférence",
    member: "Devenir membre",
    ambassadors: "Ambassadors",
    contact: "Contact",
    account: "Compte",
    brand: "Brand as a Service",
    legal: "Mentions légales",
  },
  pt: {
    forestCity: "Forest City",
    communityLife: "Vida em comunidade",
    about: "Sobre nós",
    lifestyle: "Estilo de vida",
    hospitality: "Hospitality",
    families: "Famílias",
    teams: "Equipas",
    events: "Eventos",
    portfolio: "Portfolio Companies",
    conference: "Conferência",
    member: "Tornar-se membro",
    ambassadors: "Ambassadors",
    contact: "Contacto",
    account: "Conta",
    brand: "Brand as a Service",
    legal: "Legal",
  },
  it: {
    forestCity: "Forest City",
    communityLife: "Vita di comunità",
    about: "Chi siamo",
    lifestyle: "Lifestyle",
    hospitality: "Hospitality",
    families: "Famiglie",
    teams: "Team",
    events: "Eventi",
    portfolio: "Portfolio Companies",
    conference: "Conferenza",
    member: "Diventa membro",
    ambassadors: "Ambassadors",
    contact: "Contatti",
    account: "Account",
    brand: "Brand as a Service",
    legal: "Note legali",
  },
};

const item = (title: string, body: string): CopyItem => ({ title, body });

export const portfolioCompaniesCopy: Record<
  PortfolioLocale,
  PortfolioCompaniesCopy
> = {
  en: {
    localeName: "English",
    metaTitle: "Portfolio Companies | CRAYS Clubs",
    metaDescription:
      "A confirmation-led route for companies considering a working presence in the CRAYS Clubs context.",
    ui: {
      skip: "Skip to content",
      menu: "Menu",
      close: "Close",
      account: "Account",
      language: "Language",
      association: "CRAYS Association",
    },
    footer: {
      line: "Work, community and life in the CRAYS Clubs context.",
      explore: "Explore",
      participate: "Participate",
      information: "Information",
      rights: "CRAYS Clubs. All rights reserved.",
    },
    hero: {
      eyebrow: "Portfolio Companies",
      title: "A working network, grounded in Forest City.",
      lead: "Companies come together around clear purpose, useful time and confirmed participation.",
      cta: "Introduce your company",
      contextLabel: "A confirmed context may bring together",
    },
    contextItems: [
      "Working presence",
      "Community orientation",
      "Focused sessions",
      "Remote-work rhythm",
      "Company workshops",
      "Event context",
      "CRAYS Gym context",
      "Hospitality context",
      "Conference context",
      "Local orientation",
      "Published company story",
    ],
    evidence: {
      label: "PUBLIC COMPANY EVIDENCE",
      states: [
        "Identity confirmation",
        "Purpose review",
        "Format approval",
        "Publication consent",
      ],
      note: "No company logo, endorsement or success story is displayed before these four records exist.",
    },
    mapper: {
      eyebrow: "FORMAT MAPPER",
      title: "Find the right working context",
      lead: "Preview a possible working context. Admission, services and timing always require separate confirmation.",
      patternLabel: "Working pattern",
      sizeLabel: "Team size",
      patterns: ["Day", "Week", "Month"],
      resultLabel: "Suggested conversation",
      tiers: [
        item("Focused session", "Half-day to one day"),
        item("Working week", "Five days together"),
        item("Longer team rhythm", "Two+ weeks with flow"),
      ],
      note: "This result is orientation only. Admission, services, timing and terms require separate confirmation.",
    },
    companies: {
      eyebrow: "COMPANY CONTEXT",
      title: "Company stories, only when confirmed",
      lead: "Illustrative formats only; no company story is published without confirmed evidence.",
      items: [
        item(
          "Focused beachfront sessions",
          "Small teams making space for clarity and alignment.",
        ),
        item(
          "Team working weeks",
          "Teams staying in flow with the right balance.",
        ),
        item(
          "Offsite sprints",
          "We are gathering details about this experience.",
        ),
        item("Longer team rhythms", "No details available from the company."),
      ],
    },
    reasons: {
      eyebrow: "WHY THE CONTEXT MATTERS",
      title: "Ways companies take part",
      lead: "Choose the format that fits how your team works.",
      items: [
        item(
          "Workshop & learning",
          "Shared learning and facilitated workshops.",
        ),
        item("Focused sprint", "Time-boxed sprints for product or strategy."),
        item("Hosted gathering", "Customer days, retreats and convenings."),
        item("Ongoing rhythm", "Regular cadence with deep working flow."),
      ],
      cta: "Start the company conversation",
    },
    programme: {
      eyebrow: "PROGRAMME GOVERNANCE",
      title: "Programme and people",
      lead: "Example formats only; no session, person or date is confirmed by this preview.",
      items: [
        item("Welcome & orientation", "Morning"),
        item("Design workshop", "Full day"),
        item("Founder roundtable", "Evening"),
        item("Team focus time", "All day"),
        item("Community briefing", "Morning"),
        item(
          "Remote-work sessions",
          "A working format for distributed teams with a defined timetable and responsibility.",
        ),
        item(
          "Conference moments",
          "Participation connected to a confirmed conference programme, not automatic admission.",
        ),
        item(
          "Company showcases",
          "A factual presentation published only with company approval and evidence.",
        ),
        item(
          "Expert conversations",
          "A session announced only after the speaker, subject and usage permissions are confirmed.",
        ),
        item(
          "Local-context briefings",
          "Practical orientation presented without claims of authority, exclusivity or endorsement.",
        ),
        item(
          "Learning sessions",
          "A defined learning format with no education, certification or job guarantee.",
        ),
        item(
          "Closing review",
          "A documented reflection that separates observed facts from future possibilities.",
        ),
      ],
      note: "Until a person and session are confirmed, the interface shows the format and its governance state, not a placeholder identity.",
    },
    provision: {
      eyebrow: "CONFIRMABLE ELEMENTS",
      title: "What a company context can include",
      lead: "Each element requires separate confirmation; listing it does not make it available or included.",
      items: [
        item("Working setting", "Quiet zones, desks and flexible areas."),
        item(
          "Community orientation",
          "Spaces for strategy, reviews and calls.",
        ),
        item("Focused sessions", "Recording, streaming and creative tools."),
        item("Company workshops", "Meet people, share and learn together."),
        item("Event context", "On-the-ground support for teams."),
        item(
          "Conference context",
          "A separate route into an announced conference format.",
        ),
        item(
          "Remote-work rhythm",
          "Practical consideration of time zones, cadence and team responsibility.",
        ),
        item(
          "Content setting",
          "A separately approved environment for factual company communication.",
        ),
        item(
          "CRAYS Gym context",
          "A separately confirmed wellbeing context; no access is implied here.",
        ),
        item(
          "Hospitality context",
          "A separately transmitted and confirmed hospitality element, if applicable.",
        ),
        item(
          "Company publication",
          "An approved profile based only on released facts and media.",
        ),
      ],
    },
    record: {
      eyebrow: "PUBLIC RECORD STANDARD",
      title: "Company record preview",
      lead: "We publish only what’s confirmed. You decide what’s visible.",
      items: [
        item("Company name", "The company name is confirmed."),
        item(
          "About your company",
          "The public company description is confirmed.",
        ),
        item("Participation formats", "Only approved formats are listed."),
        item("Team size range", "Only a confirmed range is displayed."),
        item("Location preferences", "Only approved preferences are shown."),
        item("Recent activity", "Only confirmed activity is published."),
        item(
          "07 · Access",
          "No membership, facility or programme access is implied beyond confirmation.",
        ),
        item(
          "08 · Outcomes",
          "Observed facts are separated from hopes, projections and future plans.",
        ),
        item(
          "09 · Attribution",
          "Words are attributed only to a verified speaker who approved them.",
        ),
        item(
          "10 · Review",
          "The organisation has reviewed the final wording and media context.",
        ),
        item(
          "11 · Owner audit",
          "Material approvals and changes remain visible to the responsible owner.",
        ),
        item(
          "12 · Withdrawal",
          "A correction or withdrawal route is recorded before publication.",
        ),
      ],
    },
    closing: {
      eyebrow: "A CLEAR FIRST STEP",
      title: "Start a company conversation",
      body: "We’ll understand your goals and recommend the right format.",
      primary: "Start a conversation",
      secondary: "Explore Community Life",
    },
  },
  de: {
    localeName: "Deutsch",
    metaTitle: "Portfolio Companies | CRAYS Clubs",
    metaDescription:
      "Ein bestätigungsgeführter Weg für Unternehmen, die eine Arbeitspräsenz im Umfeld der CRAYS Clubs prüfen.",
    ui: {
      skip: "Zum Inhalt springen",
      menu: "Menü",
      close: "Schließen",
      account: "Konto",
      language: "Sprache",
      association: "CRAYS Association",
    },
    footer: {
      line: "Arbeit, Gemeinschaft und Leben im Umfeld der CRAYS Clubs.",
      explore: "Entdecken",
      participate: "Teilnehmen",
      information: "Information",
      rights: "CRAYS Clubs. Alle Rechte vorbehalten.",
    },
    hero: {
      eyebrow: "Portfolio Companies",
      title: "Ein Arbeitsnetzwerk mit Basis in Forest City.",
      lead: "Unternehmen kommen rund um einen klaren Zweck, sinnvolle gemeinsame Zeit und bestätigte Teilnahme zusammen.",
      cta: "Unternehmen vorstellen",
      contextLabel: "Ein bestätigter Kontext kann verbinden",
    },
    contextItems: [
      "Arbeitspräsenz",
      "Community-Orientierung",
      "Fokussierte Sessions",
      "Remote-Work-Rhythmus",
      "Unternehmensworkshops",
      "Event-Kontext",
      "CRAYS-Gym-Kontext",
      "Hospitality-Kontext",
      "Konferenz-Kontext",
      "Lokale Orientierung",
      "Freigegebene Unternehmensstory",
    ],
    evidence: {
      label: "ÖFFENTLICHER UNTERNEHMENSNACHWEIS",
      states: [
        "Identitätsbestätigung",
        "Zweckprüfung",
        "Formatfreigabe",
        "Publikationsfreigabe",
      ],
      note: "Kein Unternehmenslogo, keine Empfehlung und keine Erfolgsgeschichte erscheint, bevor diese vier Nachweise vorliegen.",
    },
    mapper: {
      eyebrow: "FORMAT-MAPPER",
      title: "Was braucht das passende Unternehmensformat?",
      lead: "Beschreiben Sie Arbeitsweise und Teamgröße. Der Mapper ordnet den Prüfpfad für das erste Gespräch ein.",
      patternLabel: "Geplante Arbeitsweise",
      sizeLabel: "Erwartete Teilnehmende",
      patterns: [
        "Fokussierte Unternehmenssession",
        "Wiederkehrende Arbeitspräsenz",
        "Programm- oder Event-Kontext",
      ],
      resultLabel: "Empfohlener Prüfpfad",
      tiers: [
        item(
          "Kompakte Kontextprüfung",
          "Zweck, benannte Teilnehmende und das kleinste sinnvolle Format klären, bevor Termine oder Zugang besprochen werden.",
        ),
        item(
          "Teamformat-Prüfung",
          "Arbeitsbedarf, gemeinsame Sessions, Community-Verhalten und separat zu bestätigende Elemente einordnen.",
        ),
        item(
          "Erweiterte Umfangsprüfung",
          "Governance, verantwortliche Koordination, gestufte Bestätigungen und einen realistischen Rhythmus vor Zusagen festlegen.",
        ),
      ],
      note: "Das Ergebnis dient nur der Orientierung. Aufnahme, Leistungen, Zeitraum und Bedingungen benötigen eine separate Bestätigung.",
    },
    companies: {
      eyebrow: "UNTERNEHMENSKONTEXT",
      title: "Was eine veröffentlichbare Unternehmenspräsenz zeigen muss.",
      lead: "Unternehmensgeschichten erscheinen erst, wenn Organisation, Beteiligte, Fakten und Publikationsrechte bestätigt sind.",
      items: [
        item(
          "Der operative Zweck",
          "Darlegen, was das Unternehmen am Ort tun möchte und warum physische Präsenz relevant ist.",
        ),
        item(
          "Die beteiligten Menschen",
          "Verantwortliche Koordination und die von der Anfrage erfassten Teilnehmenden benennen.",
        ),
        item(
          "Der Arbeitsrhythmus",
          "Beschreiben, ob der Kontext fokussiert, wiederkehrend oder mit einem bestätigten Programm verbunden ist.",
        ),
        item(
          "Der freigegebene öffentliche Nachweis",
          "Nur Fakten, Medien und Ergebnisse veröffentlichen, die das Unternehmen geprüft und freigegeben hat.",
        ),
      ],
    },
    reasons: {
      eyebrow: "WARUM DAS UMFELD RELEVANT IST",
      title: "Dem Team einen Ort für bewusstes Arbeiten geben.",
      lead: "Der Wert ist kein Leistungspaket mit Versprechen. Er entsteht, wenn der reale Unternehmenszweck mit Ort, Menschen und bestätigtem Clubkontext zusammenpasst.",
      items: [
        item(
          "Raum für Fokus",
          "Ein Arbeitsumfeld um ein definiertes Ziel formen, nicht um einen offenen Besuch.",
        ),
        item(
          "Sessions mit Zweck",
          "Workshops oder moderierte Formate nur mit bestätigtem Umfang und Host einsetzen.",
        ),
        item(
          "Relevante Begegnungen",
          "Bedingungen für Community-Kontakt schaffen, ohne Kontakte oder geschäftliche Ergebnisse zu versprechen.",
        ),
        item(
          "Ein größerer Teamrhythmus",
          "Arbeit mit separat bestätigten Community-, Wellbeing- oder Eventelementen verbinden, wenn passend.",
        ),
      ],
      cta: "Unternehmensgespräch beginnen",
    },
    programme: {
      eyebrow: "PROGRAMM-GOVERNANCE",
      title: "Menschen und Sessions erscheinen nur nach Bestätigung.",
      lead: "Das Programm zeigt Arbeitsformate und ihren Bestätigungsstand, ohne Namen, Verfügbarkeit oder Autorität zu erfinden.",
      items: [
        item(
          "Unternehmensbriefings",
          "Ein kompaktes operatives Briefing mit benanntem Host, Zweck und Teilnehmerumfang.",
        ),
        item(
          "Arbeitsworkshops",
          "Eine praktische Session mit freigegebenem Thema, Moderation und erwartetem Ergebnis.",
        ),
        item(
          "Founder Tables",
          "Ein Gespräch im kleinen Format, erst nach Bestätigung von Beteiligten und Grenzen.",
        ),
        item(
          "Team Reviews",
          "Eine fokussierte Prüfung eines Teamziels ohne Leistungs- oder Ergebnisversprechen.",
        ),
        item(
          "Community-Orientierungen",
          "Einführung in Verhalten, lokalen Kontext und relevante bestätigte Clubpunkte.",
        ),
        item(
          "Remote-Work-Sessions",
          "Arbeitsformat für verteilte Teams mit festgelegtem Zeitplan und Verantwortung.",
        ),
        item(
          "Konferenzmomente",
          "Teilnahme an einem bestätigten Konferenzprogramm, nicht als automatischer Zugang.",
        ),
        item(
          "Unternehmenspräsentationen",
          "Faktische Vorstellung nur mit Freigabe und Beleg des Unternehmens.",
        ),
        item(
          "Expertengespräche",
          "Ankündigung erst nach Bestätigung von Person, Thema und Nutzungsrechten.",
        ),
        item(
          "Briefings zum lokalen Kontext",
          "Praktische Orientierung ohne Autoritäts-, Exklusivitäts- oder Empfehlungsclaim.",
        ),
        item(
          "Lernsessions",
          "Definiertes Lernformat ohne Bildungs-, Zertifikats- oder Jobgarantie.",
        ),
        item(
          "Abschlussprüfung",
          "Dokumentierte Reflexion, die Beobachtungen von künftigen Möglichkeiten trennt.",
        ),
      ],
      note: "Bis Person und Session bestätigt sind, zeigt die Oberfläche das Format und seinen Governance-Status, keine Platzhalteridentität.",
    },
    provision: {
      eyebrow: "BESTÄTIGBARE ELEMENTE",
      title: "Was kann Teil eines Unternehmenskontexts werden?",
      lead: "Jedes Element hat eine eigene Bestätigung. Die Auflistung macht es weder inklusive noch verfügbar oder buchbar.",
      items: [
        item(
          "Arbeitsumfeld",
          "Ein für das bestätigte Format definiertes Arbeitsumfeld.",
        ),
        item(
          "Community-Orientierung",
          "Einführung in Erwartungen und relevante Community-Punkte.",
        ),
        item(
          "Fokussierte Sessions",
          "Zeitlich begrenzte Sessions mit Zweck und verantwortlichem Host.",
        ),
        item(
          "Unternehmensworkshops",
          "Workshop erst nach Freigabe von Thema, Moderation und Umfang.",
        ),
        item(
          "Event-Kontext",
          "Verbindung zu einem konkret bestätigten Event oder Programm.",
        ),
        item(
          "Konferenz-Kontext",
          "Separater Weg in ein angekündigtes Konferenzformat.",
        ),
        item(
          "Remote-Work-Rhythmus",
          "Praktische Betrachtung von Zeitzonen, Taktung und Teamverantwortung.",
        ),
        item(
          "Content-Umfeld",
          "Separat freigegebenes Umfeld für faktische Unternehmenskommunikation.",
        ),
        item(
          "CRAYS-Gym-Kontext",
          "Separat bestätigter Wellbeing-Kontext; hieraus folgt kein Zugang.",
        ),
        item(
          "Hospitality-Kontext",
          "Separat übermitteltes und bestätigtes Hospitality-Element, falls relevant.",
        ),
        item(
          "Unternehmenspublikation",
          "Freigegebenes Profil ausschließlich aus veröffentlichten Fakten und Medien.",
        ),
      ],
    },
    record: {
      eyebrow: "STANDARD FÜR ÖFFENTLICHE NACHWEISE",
      title:
        "Was muss stimmen, bevor CRAYS eine Unternehmensgeschichte erzählt?",
      lead: "Der Publikationsstandard hält jedes öffentliche Unternehmensdetail nachvollziehbar, prüfbar und freigabegeführt.",
      items: [
        item(
          "01 · Identität",
          "Rechtlicher und öffentlicher Organisationsname sind bestätigt.",
        ),
        item(
          "02 · Autorität",
          "Eine benannte Vertretung darf das eingereichte Material freigeben.",
        ),
        item(
          "03 · Zweck",
          "Der Grund des Unternehmenskontexts ist ohne Übertreibung beschrieben.",
        ),
        item(
          "04 · Beteiligte",
          "Gezeigte oder genannte Personen besitzen die erforderlichen Freigaben.",
        ),
        item(
          "05 · Medien",
          "Jedes Bild hat Quelle, Nutzungsgrundlage, Crop und Alt-Rolle.",
        ),
        item(
          "06 · Format",
          "Das relevante Teilnahmeformat wurde ausdrücklich bestätigt.",
        ),
        item(
          "07 · Zugang",
          "Keine Mitgliedschaft und kein Facility- oder Programmzugang wird weitergehend impliziert.",
        ),
        item(
          "08 · Ergebnisse",
          "Beobachtete Fakten sind von Hoffnungen, Projektionen und Plänen getrennt.",
        ),
        item(
          "09 · Attribution",
          "Worte werden nur einer bestätigten Person mit Freigabe zugeschrieben.",
        ),
        item(
          "10 · Prüfung",
          "Die Organisation hat finalen Wortlaut und Medienkontext geprüft.",
        ),
        item(
          "11 · Owner-Audit",
          "Freigaben und Änderungen bleiben für den verantwortlichen Owner sichtbar.",
        ),
        item(
          "12 · Rücknahme",
          "Ein Korrektur- oder Rücknahmeweg ist vor Veröffentlichung erfasst.",
        ),
      ],
    },
    closing: {
      eyebrow: "EIN KLARER ERSTER SCHRITT",
      title: "Beginnen Sie mit Unternehmen, Menschen und Zweck.",
      body: "Senden Sie eine kurze Vorstellung. CRAYS ordnet den passenden Prüfpfad ein; nichts auf dieser Seite erzeugt Aufnahme, Verfügbarkeit, Zugang oder eine Buchung.",
      primary: "CRAYS Clubs kontaktieren",
      secondary: "Community Life entdecken",
    },
  },
  es: {
    localeName: "Español",
    metaTitle: "Portfolio Companies | CRAYS Clubs",
    metaDescription:
      "Una vía guiada por confirmación para empresas que estudian una presencia de trabajo en el contexto de CRAYS Clubs.",
    ui: {
      skip: "Ir al contenido",
      menu: "Menú",
      close: "Cerrar",
      account: "Cuenta",
      language: "Idioma",
      association: "CRAYS Association",
    },
    footer: {
      line: "Trabajo, comunidad y vida en el contexto de CRAYS Clubs.",
      explore: "Explorar",
      participate: "Participar",
      information: "Información",
      rights: "CRAYS Clubs. Todos los derechos reservados.",
    },
    hero: {
      eyebrow: "Portfolio Companies",
      title: "Una red de trabajo con base en Forest City.",
      lead: "Las empresas se reúnen en torno a un propósito claro, tiempo útil y participación confirmada.",
      cta: "Presentar la empresa",
      contextLabel: "Un contexto confirmado puede reunir",
    },
    contextItems: [
      "Presencia de trabajo",
      "Orientación comunitaria",
      "Sesiones enfocadas",
      "Ritmo de trabajo remoto",
      "Talleres de empresa",
      "Contexto de eventos",
      "Contexto CRAYS Gym",
      "Contexto hospitality",
      "Contexto de conferencia",
      "Orientación local",
      "Historia empresarial aprobada",
    ],
    evidence: {
      label: "EVIDENCIA PÚBLICA DE EMPRESA",
      states: [
        "Confirmación de identidad",
        "Revisión del propósito",
        "Aprobación del formato",
        "Consentimiento de publicación",
      ],
      note: "No se muestra ningún logotipo, respaldo o historia de éxito antes de disponer de estos cuatro registros.",
    },
    mapper: {
      eyebrow: "MAPA DE FORMATO",
      title: "¿Qué necesita el formato adecuado para la empresa?",
      lead: "Describe el patrón de trabajo y el tamaño del equipo. El mapa identifica la vía de revisión para la primera conversación.",
      patternLabel: "Patrón de trabajo previsto",
      sizeLabel: "Participantes previstos",
      patterns: [
        "Sesión empresarial enfocada",
        "Presencia de trabajo recurrente",
        "Contexto de programa o evento",
      ],
      resultLabel: "Vía de revisión sugerida",
      tiers: [
        item(
          "Revisión compacta del contexto",
          "Aclarar propósito, participantes y el formato mínimo útil antes de hablar de fechas o acceso.",
        ),
        item(
          "Revisión del formato de equipo",
          "Ordenar necesidades de trabajo, sesiones compartidas, conducta comunitaria y elementos que requieran confirmación separada.",
        ),
        item(
          "Revisión de alcance ampliado",
          "Establecer gobernanza, coordinación, confirmaciones por fases y un ritmo operativo realista antes de compromisos.",
        ),
      ],
      note: "El resultado es solo orientativo. Admisión, servicios, calendario y condiciones requieren confirmación separada.",
    },
    companies: {
      eyebrow: "CONTEXTO EMPRESARIAL",
      title: "Qué debe mostrar una presencia empresarial publicable.",
      lead: "Las historias aparecen solo cuando la organización, las personas, los hechos y los permisos de publicación están confirmados.",
      items: [
        item(
          "El propósito operativo",
          "Explicar qué pretende hacer la empresa en el entorno y por qué importa la presencia física.",
        ),
        item(
          "Las personas implicadas",
          "Identificar a la persona coordinadora y a quienes cubre la solicitud.",
        ),
        item(
          "El ritmo de trabajo",
          "Describir si el contexto es enfocado, recurrente o ligado a un programa confirmado.",
        ),
        item(
          "El registro público aprobado",
          "Publicar solo hechos, medios y resultados revisados y autorizados por la organización.",
        ),
      ],
    },
    reasons: {
      eyebrow: "POR QUÉ IMPORTA EL CONTEXTO",
      title: "Dar al equipo un lugar que favorezca el trabajo deliberado.",
      lead: "El valor no es una promesa empaquetada. Surge al alinear el propósito real de la empresa con el lugar, las personas y el contexto de club confirmado.",
      items: [
        item(
          "Espacio para enfocarse",
          "Configurar el entorno alrededor de un objetivo definido, no de una visita abierta.",
        ),
        item(
          "Sesiones con propósito",
          "Usar talleres o formatos facilitados solo con alcance y responsable confirmados.",
        ),
        item(
          "Encuentros relevantes",
          "Crear condiciones para el contacto comunitario sin prometer presentaciones ni resultados comerciales.",
        ),
        item(
          "Un ritmo de equipo más amplio",
          "Conectar el trabajo con elementos comunitarios, de bienestar o eventos confirmados por separado cuando proceda.",
        ),
      ],
      cta: "Iniciar la conversación empresarial",
    },
    programme: {
      eyebrow: "GOBERNANZA DEL PROGRAMA",
      title: "Las personas y sesiones aparecen solo cuando están confirmadas.",
      lead: "El programa muestra formatos de trabajo y su estado de confirmación sin inventar nombres, disponibilidad ni autoridad.",
      items: [
        item(
          "Briefings de empresa",
          "Briefing operativo conciso con responsable, propósito y alcance de participantes.",
        ),
        item(
          "Talleres de trabajo",
          "Sesión práctica con tema, facilitación y resultado previsto aprobados.",
        ),
        item(
          "Mesas de fundadores",
          "Conversación reducida considerada tras confirmar participantes y límites.",
        ),
        item(
          "Revisiones de equipo",
          "Revisión enfocada de un objetivo definido y del contexto de trabajo que lo acompaña.",
        ),
        item(
          "Orientaciones comunitarias",
          "Introducción a conducta, contexto local y puntos de club confirmados.",
        ),
        item(
          "Sesiones de trabajo remoto",
          "Formato para equipos distribuidos con horario y responsabilidad definidos.",
        ),
        item(
          "Momentos de conferencia",
          "Participación vinculada a un programa confirmado, no admisión automática.",
        ),
        item(
          "Presentaciones de empresa",
          "Presentación factual publicada solo con aprobación y evidencia.",
        ),
        item(
          "Conversaciones expertas",
          "Anuncio solo tras confirmar persona, tema y permisos de uso.",
        ),
        item(
          "Briefings de contexto local",
          "Orientación práctica sin autoridad, exclusividad ni respaldo implícitos.",
        ),
        item(
          "Sesiones de aprendizaje",
          "Formato definido sin garantía educativa, de certificación o empleo.",
        ),
        item(
          "Revisión de cierre",
          "Reflexión documentada que separa hechos observados de posibilidades futuras.",
        ),
      ],
      note: "Hasta confirmar persona y sesión, la interfaz muestra formato y estado de gobernanza, no una identidad provisional.",
    },
    provision: {
      eyebrow: "ELEMENTOS CONFIRMABLES",
      title: "¿Qué puede formar parte de un contexto empresarial?",
      lead: "Cada elemento tiene su propia confirmación. Enumerarlo no significa que esté incluido, disponible o reservable.",
      items: [
        item(
          "Entorno de trabajo",
          "Contexto de trabajo adecuado definido para el formato confirmado.",
        ),
        item(
          "Orientación comunitaria",
          "Introducción a expectativas y puntos comunitarios pertinentes.",
        ),
        item(
          "Sesiones enfocadas",
          "Sesiones limitadas con propósito y responsable declarado.",
        ),
        item(
          "Talleres de empresa",
          "Taller tras aprobar tema, facilitación y alcance.",
        ),
        item(
          "Contexto de evento",
          "Vínculo con un evento o programa específicamente confirmado.",
        ),
        item(
          "Contexto de conferencia",
          "Vía separada hacia un formato de conferencia anunciado.",
        ),
        item(
          "Ritmo de trabajo remoto",
          "Consideración práctica de husos horarios, cadencia y responsabilidad.",
        ),
        item(
          "Entorno de contenidos",
          "Entorno aprobado por separado para comunicación empresarial factual.",
        ),
        item(
          "Contexto CRAYS Gym",
          "Contexto de bienestar confirmado aparte; aquí no se implica acceso.",
        ),
        item(
          "Contexto hospitality",
          "Elemento transmitido y confirmado por separado, cuando corresponda.",
        ),
        item(
          "Publicación de empresa",
          "Perfil aprobado basado únicamente en hechos y medios autorizados.",
        ),
      ],
    },
    record: {
      eyebrow: "ESTÁNDAR DE REGISTRO PÚBLICO",
      title:
        "¿Qué debe ser cierto antes de que CRAYS cuente una historia empresarial?",
      lead: "El estándar mantiene cada detalle empresarial público atribuible, revisable y basado en consentimiento.",
      items: [
        item(
          "01 · Identidad",
          "Se han confirmado los nombres legal y público de la organización.",
        ),
        item(
          "02 · Autoridad",
          "Una persona representante está autorizada para aprobar el material.",
        ),
        item(
          "03 · Propósito",
          "La razón del contexto se expresa sin afirmaciones infladas.",
        ),
        item(
          "04 · Participantes",
          "Las personas mostradas o nombradas cuentan con permisos.",
        ),
        item(
          "05 · Medios",
          "Cada imagen registra fuente, base de uso, recorte y función alternativa.",
        ),
        item(
          "06 · Formato",
          "El formato de participación se ha confirmado expresamente.",
        ),
        item(
          "07 · Acceso",
          "No se implica membresía ni acceso más allá de la confirmación.",
        ),
        item(
          "08 · Resultados",
          "Los hechos observados se separan de expectativas y planes.",
        ),
        item(
          "09 · Atribución",
          "Las palabras se atribuyen solo a una persona verificada que las aprobó.",
        ),
        item(
          "10 · Revisión",
          "La organización revisó texto final y contexto visual.",
        ),
        item(
          "11 · Auditoría del owner",
          "Aprobaciones y cambios permanecen visibles para el owner responsable.",
        ),
        item(
          "12 · Retirada",
          "Existe una vía de corrección o retirada antes de publicar.",
        ),
      ],
    },
    closing: {
      eyebrow: "UN PRIMER PASO CLARO",
      title: "Empieza por la empresa, sus personas y su propósito.",
      body: "Envía una presentación concisa. CRAYS identificará la vía de revisión adecuada; nada en esta página crea admisión, disponibilidad, acceso ni reserva.",
      primary: "Contactar con CRAYS Clubs",
      secondary: "Explorar Community Life",
    },
  },
  ca: {
    localeName: "Català",
    metaTitle: "Portfolio Companies | CRAYS Clubs",
    metaDescription:
      "Una via guiada per confirmació per a empreses que estudien una presència de treball en el context de CRAYS Clubs.",
    ui: {
      skip: "Ves al contingut",
      menu: "Menú",
      close: "Tanca",
      account: "Compte",
      language: "Idioma",
      association: "CRAYS Association",
    },
    footer: {
      line: "Treball, comunitat i vida en el context de CRAYS Clubs.",
      explore: "Explora",
      participate: "Participa",
      information: "Informació",
      rights: "CRAYS Clubs. Tots els drets reservats.",
    },
    hero: {
      eyebrow: "Portfolio Companies",
      title: "Una xarxa de treball amb base a Forest City.",
      lead: "Les empreses es reuneixen al voltant d’un propòsit clar, temps útil i participació confirmada.",
      cta: "Presenta l'empresa",
      contextLabel: "Un context confirmat pot reunir",
    },
    contextItems: [
      "Presència de treball",
      "Orientació comunitària",
      "Sessions enfocades",
      "Ritme de treball remot",
      "Tallers d'empresa",
      "Context d'esdeveniments",
      "Context CRAYS Gym",
      "Context hospitality",
      "Context de conferència",
      "Orientació local",
      "Història empresarial aprovada",
    ],
    evidence: {
      label: "EVIDÈNCIA PÚBLICA D'EMPRESA",
      states: [
        "Confirmació d’identitat",
        "Revisió del propòsit",
        "Aprovació del format",
        "Consentiment de publicació",
      ],
      note: "No es mostra cap logotip, suport o història d'èxit abans que existeixin aquests quatre registres.",
    },
    mapper: {
      eyebrow: "MAPA DE FORMAT",
      title: "Què necessita el format adequat per a l'empresa?",
      lead: "Descriu el patró de treball i la mida de l'equip. El mapa identifica la via de revisió per a la primera conversa.",
      patternLabel: "Patró de treball previst",
      sizeLabel: "Participants previstos",
      patterns: [
        "Sessió empresarial enfocada",
        "Presència de treball recurrent",
        "Context de programa o esdeveniment",
      ],
      resultLabel: "Via de revisió suggerida",
      tiers: [
        item(
          "Revisió compacta del context",
          "Aclarir propòsit, participants i el format mínim útil abans de parlar de dates o accés.",
        ),
        item(
          "Revisió del format d'equip",
          "Ordenar necessitats, sessions compartides, conducta comunitària i elements de confirmació separada.",
        ),
        item(
          "Revisió d'abast ampliat",
          "Establir governança, coordinació, confirmacions per fases i un ritme realista abans de compromisos.",
        ),
      ],
      note: "El resultat és només orientatiu. Admissió, serveis, calendari i condicions requereixen confirmació separada.",
    },
    companies: {
      eyebrow: "CONTEXT EMPRESARIAL",
      title: "Què ha de mostrar una presència empresarial publicable.",
      lead: "Les històries apareixen només quan l’organització, les persones, els fets i els permisos de publicació estan confirmats.",
      items: [
        item(
          "El propòsit operatiu",
          "Explicar què vol fer l'empresa en l'entorn i per què importa la presència física.",
        ),
        item(
          "Les persones implicades",
          "Identificar la coordinació responsable i les persones cobertes per la sol·licitud.",
        ),
        item(
          "El ritme de treball",
          "Descriure si el context és enfocat, recurrent o lligat a un programa confirmat.",
        ),
        item(
          "El registre públic aprovat",
          "Publicar només fets, mitjans i resultats revisats i autoritzats per l'organització.",
        ),
      ],
    },
    reasons: {
      eyebrow: "PER QUÈ IMPORTA EL CONTEXT",
      title: "Donar a l'equip un lloc que afavoreixi el treball deliberat.",
      lead: "El valor no és una promesa empaquetada. Neix d'alinear el propòsit real de l'empresa amb el lloc, les persones i el context de club confirmat.",
      items: [
        item(
          "Espai per concentrar-se",
          "Configurar l'entorn al voltant d'un objectiu definit, no d'una visita oberta.",
        ),
        item(
          "Sessions amb propòsit",
          "Utilitzar tallers o formats facilitats només amb abast i responsable confirmats.",
        ),
        item(
          "Trobades rellevants",
          "Crear condicions per al contacte comunitari sense prometre presentacions ni resultats comercials.",
        ),
        item(
          "Un ritme d'equip més ampli",
          "Connectar el treball amb elements comunitaris, de benestar o esdeveniments confirmats per separat.",
        ),
      ],
      cta: "Inicia la conversa empresarial",
    },
    programme: {
      eyebrow: "GOVERNANÇA DEL PROGRAMA",
      title: "Les persones i sessions apareixen només quan estan confirmades.",
      lead: "El programa mostra formats de treball i el seu estat de confirmació sense inventar noms, disponibilitat ni autoritat.",
      items: [
        item(
          "Briefings d'empresa",
          "Briefing operatiu amb responsable, propòsit i abast de participants.",
        ),
        item(
          "Tallers de treball",
          "Sessió pràctica amb tema, facilitació i resultat previst aprovats.",
        ),
        item(
          "Taules de fundadors",
          "Conversa reduïda considerada després de confirmar participants i límits.",
        ),
        item(
          "Revisions d'equip",
          "Revisió enfocada d'un objectiu sense promeses de rendiment o resultats.",
        ),
        item(
          "Orientacions comunitàries",
          "Introducció a conducta, context local i punts de club confirmats.",
        ),
        item(
          "Sessions de treball remot",
          "Format per a equips distribuïts amb horari i responsabilitat definits.",
        ),
        item(
          "Moments de conferència",
          "Participació vinculada a un programa confirmat, no admissió automàtica.",
        ),
        item(
          "Presentacions d'empresa",
          "Presentació factual publicada només amb aprovació i evidència.",
        ),
        item(
          "Converses expertes",
          "Anunci només després de confirmar persona, tema i permisos d'ús.",
        ),
        item(
          "Briefings de context local",
          "Orientació pràctica sense autoritat, exclusivitat ni suport implícits.",
        ),
        item(
          "Sessions d'aprenentatge",
          "Format definit sense garantia educativa, de certificació o feina.",
        ),
        item(
          "Revisió de tancament",
          "Reflexió documentada que separa fets observats de possibilitats futures.",
        ),
      ],
      note: "Fins a confirmar persona i sessió, la interfície mostra format i estat de governança, no una identitat provisional.",
    },
    provision: {
      eyebrow: "ELEMENTS CONFIRMABLES",
      title: "Què pot formar part d'un context empresarial?",
      lead: "Cada element té la seva pròpia confirmació. Enumerar-lo no significa que estigui inclòs, disponible o reservable.",
      items: [
        item(
          "Entorn de treball",
          "Context de treball adequat definit per al format confirmat.",
        ),
        item(
          "Orientació comunitària",
          "Introducció a expectatives i punts comunitaris pertinents.",
        ),
        item(
          "Sessions enfocades",
          "Sessions limitades amb propòsit i responsable declarat.",
        ),
        item(
          "Tallers d'empresa",
          "Taller després d'aprovar tema, facilitació i abast.",
        ),
        item(
          "Context d'esdeveniment",
          "Vincle amb un esdeveniment o programa específicament confirmat.",
        ),
        item(
          "Context de conferència",
          "Via separada cap a un format de conferència anunciat.",
        ),
        item(
          "Ritme de treball remot",
          "Consideració pràctica de fusos horaris, cadència i responsabilitat.",
        ),
        item(
          "Entorn de continguts",
          "Entorn aprovat per separat per a comunicació empresarial factual.",
        ),
        item(
          "Context CRAYS Gym",
          "Context de benestar confirmat a part; aquí no s'implica accés.",
        ),
        item(
          "Context hospitality",
          "Element transmès i confirmat per separat, quan correspongui.",
        ),
        item(
          "Publicació d'empresa",
          "Perfil aprovat basat només en fets i mitjans autoritzats.",
        ),
      ],
    },
    record: {
      eyebrow: "ESTÀNDARD DE REGISTRE PÚBLIC",
      title:
        "Què ha de ser cert abans que CRAYS expliqui una història empresarial?",
      lead: "L’estàndard manté cada detall empresarial públic atribuïble, revisable i basat en consentiment.",
      items: [
        item(
          "01 · Identitat",
          "S'han confirmat els noms legal i públic de l'organització.",
        ),
        item(
          "02 · Autoritat",
          "Una persona representant està autoritzada per aprovar el material.",
        ),
        item(
          "03 · Propòsit",
          "La raó del context s'expressa sense afirmacions inflades.",
        ),
        item(
          "04 · Participants",
          "Les persones mostrades o esmentades tenen permisos.",
        ),
        item(
          "05 · Mitjans",
          "Cada imatge registra font, base d'ús, retall i funció alternativa.",
        ),
        item(
          "06 · Format",
          "El format de participació s'ha confirmat expressament.",
        ),
        item(
          "07 · Accés",
          "No s'implica membresia ni accés més enllà de la confirmació.",
        ),
        item(
          "08 · Resultats",
          "Els fets observats se separen d'expectatives i plans.",
        ),
        item(
          "09 · Atribució",
          "Les paraules s'atribueixen només a una persona verificada.",
        ),
        item(
          "10 · Revisió",
          "L'organització ha revisat text final i context visual.",
        ),
        item(
          "11 · Auditoria de l'owner",
          "Aprovacions i canvis continuen visibles per a l'owner responsable.",
        ),
        item(
          "12 · Retirada",
          "Existeix una via de correcció o retirada abans de publicar.",
        ),
      ],
    },
    closing: {
      eyebrow: "UN PRIMER PAS CLAR",
      title: "Comença per l'empresa, les persones i el propòsit.",
      body: "Envia una presentació breu. CRAYS identificarà la via de revisió adequada; res d'aquesta pàgina crea admissió, disponibilitat, accés ni reserva.",
      primary: "Contacta amb CRAYS Clubs",
      secondary: "Explora Community Life",
    },
  },
  fr: {
    localeName: "Français",
    metaTitle: "Portfolio Companies | CRAYS Clubs",
    metaDescription:
      "Un parcours guidé par confirmation pour les entreprises envisageant une présence de travail dans le contexte CRAYS Clubs.",
    ui: {
      skip: "Aller au contenu",
      menu: "Menu",
      close: "Fermer",
      account: "Compte",
      language: "Langue",
      association: "CRAYS Association",
    },
    footer: {
      line: "Travail, communauté et vie dans le contexte CRAYS Clubs.",
      explore: "Explorer",
      participate: "Participer",
      information: "Information",
      rights: "CRAYS Clubs. Tous droits réservés.",
    },
    hero: {
      eyebrow: "Portfolio Companies",
      title: "Un réseau de travail ancré à Forest City.",
      lead: "Les entreprises se réunissent autour d’un objectif clair, d’un temps utile et d’une participation confirmée.",
      cta: "Présenter l'entreprise",
      contextLabel: "Un contexte confirmé peut réunir",
    },
    contextItems: [
      "Présence de travail",
      "Orientation communautaire",
      "Sessions ciblées",
      "Rythme de travail à distance",
      "Ateliers d'entreprise",
      "Contexte événementiel",
      "Contexte CRAYS Gym",
      "Contexte hospitality",
      "Contexte conférence",
      "Orientation locale",
      "Histoire d'entreprise approuvée",
    ],
    evidence: {
      label: "PREUVE PUBLIQUE D'ENTREPRISE",
      states: [
        "Confirmation d’identité",
        "Examen de l’objectif",
        "Approbation du format",
        "Consentement de publication",
      ],
      note: "Aucun logo, soutien ou récit de réussite n'est affiché avant l'existence de ces quatre éléments.",
    },
    mapper: {
      eyebrow: "CARTOGRAPHIE DU FORMAT",
      title: "De quoi le bon format d'entreprise a-t-il besoin ?",
      lead: "Décrivez le rythme de travail et la taille de l'équipe. L'outil identifie le parcours d'examen pour le premier échange.",
      patternLabel: "Rythme de travail envisagé",
      sizeLabel: "Participants prévus",
      patterns: [
        "Session d'entreprise ciblée",
        "Présence de travail récurrente",
        "Contexte de programme ou d'événement",
      ],
      resultLabel: "Parcours d'examen suggéré",
      tiers: [
        item(
          "Examen compact du contexte",
          "Clarifier l'objectif, les participants et le plus petit format utile avant d'aborder dates ou accès.",
        ),
        item(
          "Examen du format d'équipe",
          "Cartographier besoins, sessions communes, conduite communautaire et éléments à confirmer séparément.",
        ),
        item(
          "Examen de portée étendue",
          "Établir gouvernance, coordination, confirmations par étapes et rythme réaliste avant tout engagement.",
        ),
      ],
      note: "Le résultat est indicatif. Admission, services, calendrier et conditions exigent une confirmation distincte.",
    },
    companies: {
      eyebrow: "CONTEXTE D'ENTREPRISE",
      title: "Ce qu'une présence d'entreprise publiable doit démontrer.",
      lead: "Les récits apparaissent uniquement lorsque l’organisation, les personnes, les faits et les autorisations de publication sont confirmés.",
      items: [
        item(
          "L'objectif opérationnel",
          "Expliquer ce que l'entreprise souhaite faire sur place et pourquoi la présence physique compte.",
        ),
        item(
          "Les personnes concernées",
          "Nommer la coordination responsable et les participants couverts par la demande.",
        ),
        item(
          "Le rythme de travail",
          "Préciser si le contexte est ciblé, récurrent ou lié à un programme confirmé.",
        ),
        item(
          "Le dossier public approuvé",
          "Publier uniquement les faits, médias et résultats examinés et autorisés.",
        ),
      ],
    },
    reasons: {
      eyebrow: "POURQUOI LE CONTEXTE COMPTE",
      title: "Offrir à l'équipe un lieu propice au travail intentionnel.",
      lead: "La valeur n'est pas une promesse emballée. Elle naît de l'alignement entre l'objectif réel, le lieu, les personnes et le contexte de club confirmé.",
      items: [
        item(
          "De l'espace pour se concentrer",
          "Façonner le cadre autour d'un objectif défini plutôt que d'une visite ouverte.",
        ),
        item(
          "Des sessions utiles",
          "Utiliser ateliers ou formats facilités uniquement avec périmètre et responsable confirmés.",
        ),
        item(
          "Des rencontres pertinentes",
          "Créer les conditions du contact communautaire sans promettre présentations ou résultats commerciaux.",
        ),
        item(
          "Un rythme d'équipe élargi",
          "Relier le travail à des éléments communautaires, bien-être ou événements confirmés séparément.",
        ),
      ],
      cta: "Commencer l'échange entreprise",
    },
    programme: {
      eyebrow: "GOUVERNANCE DU PROGRAMME",
      title: "Les personnes et sessions n'apparaissent qu'après confirmation.",
      lead: "Le programme présente les formats de travail et leur état de confirmation sans inventer de noms, de disponibilité ou d’autorité.",
      items: [
        item(
          "Briefings d'entreprise",
          "Briefing opérationnel concis avec responsable, objectif et périmètre.",
        ),
        item(
          "Ateliers de travail",
          "Session pratique avec sujet, facilitation et résultat attendu approuvés.",
        ),
        item(
          "Tables de fondateurs",
          "Petit échange envisagé après confirmation des participants et limites.",
        ),
        item(
          "Revues d'équipe",
          "Revue ciblée d’un objectif défini et du contexte de travail qui l’accompagne.",
        ),
        item(
          "Orientations communautaires",
          "Introduction à la conduite, au contexte local et aux points club confirmés.",
        ),
        item(
          "Sessions de travail à distance",
          "Format pour équipes distribuées avec calendrier et responsabilité définis.",
        ),
        item(
          "Moments de conférence",
          "Participation liée à un programme confirmé, sans admission automatique.",
        ),
        item(
          "Présentations d'entreprise",
          "Présentation factuelle publiée uniquement avec approbation et preuves.",
        ),
        item(
          "Échanges d'experts",
          "Annonce après confirmation de la personne, du sujet et des droits d'usage.",
        ),
        item(
          "Briefings de contexte local",
          "Orientation pratique sans autorité, exclusivité ni soutien implicite.",
        ),
        item(
          "Sessions d'apprentissage",
          "Format défini sans garantie éducative, de certification ou d'emploi.",
        ),
        item(
          "Revue de clôture",
          "Réflexion documentée séparant faits observés et possibilités futures.",
        ),
      ],
      note: "Jusqu'à confirmation, l'interface affiche le format et son état de gouvernance, pas une identité provisoire.",
    },
    provision: {
      eyebrow: "ÉLÉMENTS CONFIRMABLES",
      title: "Que peut comprendre un contexte d'entreprise ?",
      lead: "Chaque élément possède sa propre confirmation. Sa présence dans la liste ne le rend ni inclus, ni disponible, ni réservable.",
      items: [
        item(
          "Cadre de travail",
          "Contexte de travail adapté défini pour le format confirmé.",
        ),
        item(
          "Orientation communautaire",
          "Introduction aux attentes et points communautaires pertinents.",
        ),
        item(
          "Sessions ciblées",
          "Sessions limitées avec objectif et responsable déclaré.",
        ),
        item(
          "Ateliers d'entreprise",
          "Atelier après validation du sujet, de la facilitation et du périmètre.",
        ),
        item(
          "Contexte événementiel",
          "Lien avec un événement ou programme précisément confirmé.",
        ),
        item(
          "Contexte conférence",
          "Parcours distinct vers un format de conférence annoncé.",
        ),
        item(
          "Rythme à distance",
          "Prise en compte des fuseaux, de la cadence et des responsabilités.",
        ),
        item(
          "Cadre de contenu",
          "Environnement approuvé séparément pour une communication factuelle.",
        ),
        item(
          "Contexte CRAYS Gym",
          "Contexte bien-être confirmé séparément ; aucun accès n'est implicite.",
        ),
        item(
          "Contexte hospitality",
          "Élément transmis et confirmé séparément, le cas échéant.",
        ),
        item(
          "Publication d'entreprise",
          "Profil approuvé fondé uniquement sur des faits et médias autorisés.",
        ),
      ],
    },
    record: {
      eyebrow: "STANDARD DU DOSSIER PUBLIC",
      title:
        "Que doit-on vérifier avant que CRAYS raconte une histoire d'entreprise ?",
      lead: "Le standard conserve chaque détail public attribuable, révisable et fondé sur le consentement.",
      items: [
        item(
          "01 · Identité",
          "Les noms juridique et public de l'organisation sont confirmés.",
        ),
        item(
          "02 · Autorité",
          "Une personne représentante est autorisée à approuver le contenu.",
        ),
        item(
          "03 · Objectif",
          "La raison du contexte est décrite sans affirmation excessive.",
        ),
        item(
          "04 · Participants",
          "Les personnes montrées ou nommées disposent des permissions.",
        ),
        item(
          "05 · Médias",
          "Chaque image possède source, base d'usage, recadrage et rôle alternatif.",
        ),
        item(
          "06 · Format",
          "Le format de participation a été expressément confirmé.",
        ),
        item(
          "07 · Accès",
          "Aucune adhésion ni accès n'est suggéré au-delà de la confirmation.",
        ),
        item(
          "08 · Résultats",
          "Les faits observés sont séparés des attentes et projets.",
        ),
        item(
          "09 · Attribution",
          "Les mots ne sont attribués qu'à une personne vérifiée.",
        ),
        item(
          "10 · Revue",
          "L'organisation a revu le texte final et le contexte visuel.",
        ),
        item(
          "11 · Audit owner",
          "Validations et changements restent visibles pour l'owner responsable.",
        ),
        item(
          "12 · Retrait",
          "Une voie de correction ou retrait est enregistrée avant publication.",
        ),
      ],
    },
    closing: {
      eyebrow: "UN PREMIER PAS CLAIR",
      title: "Commencez par l'entreprise, ses personnes et son objectif.",
      body: "Envoyez une présentation concise. CRAYS identifiera le parcours d'examen adapté ; rien sur cette page ne crée admission, disponibilité, accès ou réservation.",
      primary: "Contacter CRAYS Clubs",
      secondary: "Explorer Community Life",
    },
  },
  pt: {
    localeName: "Português",
    metaTitle: "Portfolio Companies | CRAYS Clubs",
    metaDescription:
      "Um percurso guiado por confirmação para empresas que ponderam uma presença de trabalho no contexto CRAYS Clubs.",
    ui: {
      skip: "Ir para o conteúdo",
      menu: "Menu",
      close: "Fechar",
      account: "Conta",
      language: "Idioma",
      association: "CRAYS Association",
    },
    footer: {
      line: "Trabalho, comunidade e vida no contexto CRAYS Clubs.",
      explore: "Explorar",
      participate: "Participar",
      information: "Informação",
      rights: "CRAYS Clubs. Todos os direitos reservados.",
    },
    hero: {
      eyebrow: "Portfolio Companies",
      title: "Uma rede de trabalho com base em Forest City.",
      lead: "As empresas reúnem-se em torno de um propósito claro, tempo útil e participação confirmada.",
      cta: "Apresentar a empresa",
      contextLabel: "Um contexto confirmado pode reunir",
    },
    contextItems: [
      "Presença de trabalho",
      "Orientação comunitária",
      "Sessões focadas",
      "Ritmo de trabalho remoto",
      "Workshops de empresa",
      "Contexto de eventos",
      "Contexto CRAYS Gym",
      "Contexto hospitality",
      "Contexto de conferência",
      "Orientação local",
      "História empresarial aprovada",
    ],
    evidence: {
      label: "EVIDÊNCIA PÚBLICA DA EMPRESA",
      states: [
        "Confirmação de identidade",
        "Revisão do objetivo",
        "Aprovação do formato",
        "Consentimento de publicação",
      ],
      note: "Nenhum logótipo, apoio ou história de sucesso é mostrado antes de existirem estes quatro registos.",
    },
    mapper: {
      eyebrow: "MAPA DE FORMATO",
      title: "O que precisa o formato certo para a empresa?",
      lead: "Descreva o padrão de trabalho e o tamanho da equipa. O mapa identifica o percurso de revisão para a primeira conversa.",
      patternLabel: "Padrão de trabalho pretendido",
      sizeLabel: "Participantes previstos",
      patterns: [
        "Sessão empresarial focada",
        "Presença de trabalho recorrente",
        "Contexto de programa ou evento",
      ],
      resultLabel: "Percurso de revisão sugerido",
      tiers: [
        item(
          "Revisão compacta do contexto",
          "Clarificar objetivo, participantes e o menor formato útil antes de falar de datas ou acesso.",
        ),
        item(
          "Revisão do formato de equipa",
          "Mapear necessidades, sessões partilhadas, conduta comunitária e elementos a confirmar separadamente.",
        ),
        item(
          "Revisão de âmbito alargado",
          "Estabelecer governação, coordenação, confirmações faseadas e um ritmo realista antes de compromissos.",
        ),
      ],
      note: "O resultado é apenas orientativo. Admissão, serviços, calendário e condições exigem confirmação separada.",
    },
    companies: {
      eyebrow: "CONTEXTO EMPRESARIAL",
      title: "O que uma presença empresarial publicável deve demonstrar.",
      lead: "As histórias aparecem apenas quando a organização, as pessoas, os factos e as permissões de publicação estão confirmados.",
      items: [
        item(
          "O objetivo operacional",
          "Explicar o que a empresa pretende fazer no contexto e por que a presença física é relevante.",
        ),
        item(
          "As pessoas envolvidas",
          "Identificar a coordenação responsável e os participantes abrangidos pelo pedido.",
        ),
        item(
          "O ritmo de trabalho",
          "Descrever se o contexto é focado, recorrente ou ligado a um programa confirmado.",
        ),
        item(
          "O registo público aprovado",
          "Publicar apenas factos, meios e resultados revistos e autorizados pela organização.",
        ),
      ],
    },
    reasons: {
      eyebrow: "POR QUE O CONTEXTO IMPORTA",
      title: "Dar à equipa um lugar que apoie o trabalho deliberado.",
      lead: "O valor não é uma promessa empacotada. Nasce do alinhamento do objetivo real com o lugar, as pessoas e o contexto de clube confirmado.",
      items: [
        item(
          "Espaço para concentração",
          "Moldar o ambiente em torno de um objetivo definido, não de uma visita aberta.",
        ),
        item(
          "Sessões com propósito",
          "Usar workshops ou formatos facilitados apenas com âmbito e responsável confirmados.",
        ),
        item(
          "Encontros relevantes",
          "Criar condições para contacto comunitário sem prometer apresentações ou resultados comerciais.",
        ),
        item(
          "Um ritmo de equipa mais amplo",
          "Ligar o trabalho a elementos comunitários, de bem-estar ou eventos confirmados separadamente.",
        ),
      ],
      cta: "Iniciar a conversa empresarial",
    },
    programme: {
      eyebrow: "GOVERNAÇÃO DO PROGRAMA",
      title: "Pessoas e sessões aparecem apenas quando confirmadas.",
      lead: "O programa mostra formatos de trabalho e o respetivo estado de confirmação sem inventar nomes, disponibilidade ou autoridade.",
      items: [
        item(
          "Briefings de empresa",
          "Briefing operacional conciso com responsável, objetivo e âmbito de participantes.",
        ),
        item(
          "Workshops de trabalho",
          "Sessão prática com tema, facilitação e resultado previsto aprovados.",
        ),
        item(
          "Mesas de fundadores",
          "Conversa pequena considerada após confirmação de participantes e limites.",
        ),
        item(
          "Revisões de equipa",
          "Revisão focada de um objetivo sem promessas de desempenho ou resultados.",
        ),
        item(
          "Orientações comunitárias",
          "Introdução à conduta, contexto local e pontos de clube confirmados.",
        ),
        item(
          "Sessões de trabalho remoto",
          "Formato para equipas distribuídas com horário e responsabilidade definidos.",
        ),
        item(
          "Momentos de conferência",
          "Participação ligada a programa confirmado, não admissão automática.",
        ),
        item(
          "Apresentações de empresa",
          "Apresentação factual publicada apenas com aprovação e evidência.",
        ),
        item(
          "Conversas com especialistas",
          "Anúncio só após confirmar pessoa, tema e permissões de uso.",
        ),
        item(
          "Briefings de contexto local",
          "Orientação prática sem autoridade, exclusividade ou apoio implícitos.",
        ),
        item(
          "Sessões de aprendizagem",
          "Formato definido sem garantia educativa, de certificação ou emprego.",
        ),
        item(
          "Revisão de encerramento",
          "Reflexão documentada que separa factos de possibilidades futuras.",
        ),
      ],
      note: "Até pessoa e sessão estarem confirmadas, a interface mostra formato e estado de governação, não uma identidade provisória.",
    },
    provision: {
      eyebrow: "ELEMENTOS CONFIRMÁVEIS",
      title: "O que pode fazer parte de um contexto empresarial?",
      lead: "Cada elemento tem confirmação própria. A listagem não significa inclusão, disponibilidade ou reserva.",
      items: [
        item(
          "Ambiente de trabalho",
          "Contexto de trabalho adequado definido para o formato confirmado.",
        ),
        item(
          "Orientação comunitária",
          "Introdução às expectativas e pontos comunitários relevantes.",
        ),
        item(
          "Sessões focadas",
          "Sessões limitadas com objetivo e responsável declarado.",
        ),
        item(
          "Workshops de empresa",
          "Workshop após aprovação do tema, facilitação e âmbito.",
        ),
        item(
          "Contexto de evento",
          "Ligação a evento ou programa especificamente confirmado.",
        ),
        item(
          "Contexto de conferência",
          "Percurso separado para um formato de conferência anunciado.",
        ),
        item(
          "Ritmo de trabalho remoto",
          "Consideração prática de fusos, cadência e responsabilidade.",
        ),
        item(
          "Ambiente de conteúdos",
          "Ambiente aprovado separadamente para comunicação empresarial factual.",
        ),
        item(
          "Contexto CRAYS Gym",
          "Contexto de bem-estar confirmado à parte; não implica acesso.",
        ),
        item(
          "Contexto hospitality",
          "Elemento transmitido e confirmado separadamente, quando aplicável.",
        ),
        item(
          "Publicação da empresa",
          "Perfil aprovado baseado apenas em factos e meios autorizados.",
        ),
      ],
    },
    record: {
      eyebrow: "PADRÃO DE REGISTO PÚBLICO",
      title:
        "O que deve ser verdade antes de a CRAYS contar uma história empresarial?",
      lead: "O padrão mantém cada detalhe empresarial público atribuível, revisto e baseado em consentimento.",
      items: [
        item(
          "01 · Identidade",
          "Os nomes legal e público da organização foram confirmados.",
        ),
        item(
          "02 · Autoridade",
          "Uma pessoa representante está autorizada a aprovar o material.",
        ),
        item(
          "03 · Objetivo",
          "A razão do contexto é descrita sem afirmações inflacionadas.",
        ),
        item(
          "04 · Participantes",
          "As pessoas mostradas ou nomeadas têm permissões.",
        ),
        item(
          "05 · Meios",
          "Cada imagem regista fonte, base de uso, corte e função alternativa.",
        ),
        item(
          "06 · Formato",
          "O formato de participação foi expressamente confirmado.",
        ),
        item(
          "07 · Acesso",
          "Não se implica adesão ou acesso para além da confirmação.",
        ),
        item(
          "08 · Resultados",
          "Os factos observados são separados de expectativas e planos.",
        ),
        item(
          "09 · Atribuição",
          "As palavras são atribuídas apenas a uma pessoa verificada.",
        ),
        item(
          "10 · Revisão",
          "A organização reviu o texto final e o contexto visual.",
        ),
        item(
          "11 · Auditoria do owner",
          "Aprovações e alterações permanecem visíveis para o owner responsável.",
        ),
        item(
          "12 · Retirada",
          "Existe um percurso de correção ou retirada antes da publicação.",
        ),
      ],
    },
    closing: {
      eyebrow: "UM PRIMEIRO PASSO CLARO",
      title: "Comece pela empresa, pelas pessoas e pelo objetivo.",
      body: "Envie uma apresentação concisa. A CRAYS identificará o percurso de revisão adequado; nada nesta página cria admissão, disponibilidade, acesso ou reserva.",
      primary: "Contactar CRAYS Clubs",
      secondary: "Explorar Community Life",
    },
  },
  it: {
    localeName: "Italiano",
    metaTitle: "Portfolio Companies | CRAYS Clubs",
    metaDescription:
      "Un percorso guidato dalla conferma per aziende che valutano una presenza lavorativa nel contesto CRAYS Clubs.",
    ui: {
      skip: "Vai al contenuto",
      menu: "Menu",
      close: "Chiudi",
      account: "Account",
      language: "Lingua",
      association: "CRAYS Association",
    },
    footer: {
      line: "Lavoro, comunità e vita nel contesto CRAYS Clubs.",
      explore: "Esplora",
      participate: "Partecipa",
      information: "Informazioni",
      rights: "CRAYS Clubs. Tutti i diritti riservati.",
    },
    hero: {
      eyebrow: "Portfolio Companies",
      title: "Una rete di lavoro con base a Forest City.",
      lead: "Le aziende si riuniscono attorno a uno scopo chiaro, tempo utile e partecipazione confermata.",
      cta: "Presenta l'azienda",
      contextLabel: "Un contesto confermato può riunire",
    },
    contextItems: [
      "Presenza lavorativa",
      "Orientamento alla comunità",
      "Sessioni mirate",
      "Ritmo di lavoro da remoto",
      "Workshop aziendali",
      "Contesto eventi",
      "Contesto CRAYS Gym",
      "Contesto hospitality",
      "Contesto conferenza",
      "Orientamento locale",
      "Storia aziendale approvata",
    ],
    evidence: {
      label: "EVIDENZA PUBBLICA DELL'AZIENDA",
      states: [
        "Conferma dell’identità",
        "Revisione dello scopo",
        "Approvazione del formato",
        "Consenso alla pubblicazione",
      ],
      note: "Nessun logo, sostegno o storia di successo viene mostrato prima che esistano questi quattro record.",
    },
    mapper: {
      eyebrow: "MAPPA DEL FORMATO",
      title: "Di cosa ha bisogno il formato giusto per l'azienda?",
      lead: "Descrivi il modello di lavoro e le dimensioni del team. La mappa identifica il percorso di revisione per il primo confronto.",
      patternLabel: "Modello di lavoro previsto",
      sizeLabel: "Partecipanti previsti",
      patterns: [
        "Sessione aziendale mirata",
        "Presenza lavorativa ricorrente",
        "Contesto programma o evento",
      ],
      resultLabel: "Percorso di revisione suggerito",
      tiers: [
        item(
          "Revisione compatta del contesto",
          "Chiarire scopo, partecipanti e formato minimo utile prima di discutere date o accesso.",
        ),
        item(
          "Revisione del formato team",
          "Mappare esigenze, sessioni condivise, condotta comunitaria ed elementi da confermare separatamente.",
        ),
        item(
          "Revisione di ambito esteso",
          "Stabilire governance, coordinamento, conferme progressive e un ritmo realistico prima degli impegni.",
        ),
      ],
      note: "Il risultato è solo orientativo. Ammissione, servizi, tempi e condizioni richiedono conferma separata.",
    },
    companies: {
      eyebrow: "CONTESTO AZIENDALE",
      title: "Cosa deve mostrare una presenza aziendale pubblicabile.",
      lead: "Le storie appaiono solo quando organizzazione, persone, fatti e permessi di pubblicazione sono confermati.",
      items: [
        item(
          "Lo scopo operativo",
          "Spiegare cosa intende fare l'azienda nel contesto e perché conta la presenza fisica.",
        ),
        item(
          "Le persone coinvolte",
          "Identificare il coordinamento responsabile e i partecipanti coperti dalla richiesta.",
        ),
        item(
          "Il ritmo di lavoro",
          "Descrivere se il contesto è mirato, ricorrente o collegato a un programma confermato.",
        ),
        item(
          "Il record pubblico approvato",
          "Pubblicare solo fatti, media e risultati esaminati e autorizzati dall'organizzazione.",
        ),
      ],
    },
    reasons: {
      eyebrow: "PERCHÉ IL CONTESTO CONTA",
      title: "Dare al team un luogo che sostenga il lavoro intenzionale.",
      lead: "Il valore non è una promessa confezionata. Nasce dall'allineamento tra lo scopo reale, il luogo, le persone e il contesto di club confermato.",
      items: [
        item(
          "Spazio per concentrarsi",
          "Costruire l'ambiente intorno a un obiettivo definito, non a una visita aperta.",
        ),
        item(
          "Sessioni con uno scopo",
          "Usare workshop o formati facilitati solo con ambito e responsabile confermati.",
        ),
        item(
          "Incontri pertinenti",
          "Creare condizioni per il contatto comunitario senza promettere presentazioni o risultati commerciali.",
        ),
        item(
          "Un ritmo di team più ampio",
          "Collegare il lavoro a elementi comunitari, wellbeing o eventi confermati separatamente.",
        ),
      ],
      cta: "Avvia la conversazione aziendale",
    },
    programme: {
      eyebrow: "GOVERNANCE DEL PROGRAMMA",
      title: "Persone e sessioni compaiono solo quando confermate.",
      lead: "Il programma mostra formati di lavoro e stato di conferma senza inventare nomi, disponibilità o autorità.",
      items: [
        item(
          "Briefing aziendali",
          "Briefing operativo conciso con responsabile, scopo e perimetro dei partecipanti.",
        ),
        item(
          "Workshop di lavoro",
          "Sessione pratica con tema, facilitazione e risultato atteso approvati.",
        ),
        item(
          "Tavoli dei founder",
          "Confronto ristretto valutato dopo la conferma di partecipanti e limiti.",
        ),
        item(
          "Revisioni del team",
          "Revisione mirata di un obiettivo senza promesse di prestazione o risultati.",
        ),
        item(
          "Orientamenti comunitari",
          "Introduzione a condotta, contesto locale e punti club confermati.",
        ),
        item(
          "Sessioni di lavoro da remoto",
          "Formato per team distribuiti con calendario e responsabilità definiti.",
        ),
        item(
          "Momenti di conferenza",
          "Partecipazione collegata a un programma confermato, non ammissione automatica.",
        ),
        item(
          "Presentazioni aziendali",
          "Presentazione fattuale pubblicata solo con approvazione ed evidenza.",
        ),
        item(
          "Conversazioni con esperti",
          "Annuncio solo dopo conferma di persona, tema e diritti d'uso.",
        ),
        item(
          "Briefing sul contesto locale",
          "Orientamento pratico senza autorità, esclusività o sostegno impliciti.",
        ),
        item(
          "Sessioni di apprendimento",
          "Formato definito senza garanzia educativa, di certificazione o lavoro.",
        ),
        item(
          "Revisione finale",
          "Riflessione documentata che separa fatti osservati da possibilità future.",
        ),
      ],
      note: "Finché persona e sessione non sono confermate, l'interfaccia mostra formato e stato di governance, non un'identità provvisoria.",
    },
    provision: {
      eyebrow: "ELEMENTI CONFERMABILI",
      title: "Cosa può far parte di un contesto aziendale?",
      lead: "Ogni elemento ha una conferma propria. L'elenco non significa inclusione, disponibilità o prenotabilità.",
      items: [
        item(
          "Ambiente di lavoro",
          "Contesto lavorativo adeguato definito per il formato confermato.",
        ),
        item(
          "Orientamento comunitario",
          "Introduzione alle aspettative e ai punti comunitari pertinenti.",
        ),
        item(
          "Sessioni mirate",
          "Sessioni limitate con scopo e responsabile dichiarato.",
        ),
        item(
          "Workshop aziendali",
          "Workshop dopo l'approvazione di tema, facilitazione e ambito.",
        ),
        item(
          "Contesto evento",
          "Collegamento a un evento o programma specificamente confermato.",
        ),
        item(
          "Contesto conferenza",
          "Percorso separato verso un formato di conferenza annunciato.",
        ),
        item(
          "Ritmo da remoto",
          "Considerazione pratica di fusi orari, cadenza e responsabilità.",
        ),
        item(
          "Ambiente contenuti",
          "Ambiente approvato separatamente per comunicazioni aziendali fattuali.",
        ),
        item(
          "Contesto CRAYS Gym",
          "Contesto wellbeing confermato a parte; qui non è implicito l'accesso.",
        ),
        item(
          "Contesto hospitality",
          "Elemento trasmesso e confermato separatamente, se pertinente.",
        ),
        item(
          "Pubblicazione aziendale",
          "Profilo approvato basato solo su fatti e media autorizzati.",
        ),
      ],
    },
    record: {
      eyebrow: "STANDARD DEL RECORD PUBBLICO",
      title:
        "Cosa deve essere vero prima che CRAYS racconti una storia aziendale?",
      lead: "Lo standard mantiene ogni dettaglio aziendale pubblico attribuibile, verificabile e basato sul consenso.",
      items: [
        item(
          "01 · Identità",
          "I nomi legale e pubblico dell'organizzazione sono confermati.",
        ),
        item(
          "02 · Autorità",
          "Un rappresentante nominato è autorizzato ad approvare il materiale.",
        ),
        item(
          "03 · Scopo",
          "La ragione del contesto è descritta senza affermazioni eccessive.",
        ),
        item(
          "04 · Partecipanti",
          "Le persone mostrate o nominate dispongono dei permessi.",
        ),
        item(
          "05 · Media",
          "Ogni immagine registra fonte, base d'uso, ritaglio e ruolo alternativo.",
        ),
        item(
          "06 · Formato",
          "Il formato di partecipazione è stato confermato esplicitamente.",
        ),
        item(
          "07 · Accesso",
          "Nessuna adesione o accesso è implicito oltre la conferma.",
        ),
        item(
          "08 · Risultati",
          "I fatti osservati sono separati da aspettative e piani.",
        ),
        item(
          "09 · Attribuzione",
          "Le parole sono attribuite solo a una persona verificata.",
        ),
        item(
          "10 · Revisione",
          "L'organizzazione ha rivisto testo finale e contesto visivo.",
        ),
        item(
          "11 · Audit owner",
          "Approvazioni e modifiche restano visibili all'owner responsabile.",
        ),
        item(
          "12 · Ritiro",
          "È registrato un percorso di correzione o ritiro prima della pubblicazione.",
        ),
      ],
    },
    closing: {
      eyebrow: "UN PRIMO PASSO CHIARO",
      title: "Inizia dall'azienda, dalle persone e dallo scopo.",
      body: "Invia una presentazione concisa. CRAYS individuerà il percorso di revisione appropriato; nulla in questa pagina crea ammissione, disponibilità, accesso o prenotazione.",
      primary: "Contatta CRAYS Clubs",
      secondary: "Esplora Community Life",
    },
  },
};
