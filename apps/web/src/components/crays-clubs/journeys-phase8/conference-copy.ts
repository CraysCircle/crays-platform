export const conferenceLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
export type ConferenceLocale = (typeof conferenceLocales)[number];

export type ConferenceItem = {
  title: string;
  body: string;
  status?: string;
};

export type ConferenceShellCopy = {
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

export type ConferenceCopy = {
  localeName: string;
  metaTitle: string;
  metaDescription: string;
  shell: ConferenceShellCopy;
  status: {
    blocked: string;
    mediaBlocked: string;
    requiresEvidence: string;
    notAnnounced: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primary: string;
    secondary: string;
    boundary: string;
    signals: readonly string[];
  };
  archive: {
    eyebrow: string;
    title: string;
    lead: string;
    mediaLabel: string;
    items: readonly ConferenceItem[];
  };
  programme: {
    eyebrow: string;
    title: string;
    lead: string;
    note: string;
    items: readonly ConferenceItem[];
  };
  speakers: {
    eyebrow: string;
    title: string;
    lead: string;
    gate: string;
    items: readonly ConferenceItem[];
  };
  audience: {
    eyebrow: string;
    title: string;
    lead: string;
    items: readonly ConferenceItem[];
  };
  venue: {
    eyebrow: string;
    title: string;
    lead: string;
    items: readonly ConferenceItem[];
  };
  proof: {
    eyebrow: string;
    title: string;
    lead: string;
    requirements: readonly string[];
    action: string;
  };
  interest: {
    eyebrow: string;
    title: string;
    lead: string;
    unavailable: string;
    fields: {
      name: string;
      email: string;
      organisation: string;
      role: string;
      topic: string;
      access: string;
      consent: string;
    };
    submit: string;
    contact: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: ReadonlyArray<{ question: string; answer: string }>;
  };
};

const item = (title: string, body: string, status?: string): ConferenceItem => ({ title, body, status });

export const conferenceCopy: Record<ConferenceLocale, ConferenceCopy> = {
  en: {
    localeName: "English",
    metaTitle: "Conference | CRAYS Clubs",
    metaDescription: "The evidence-led CRAYS Clubs conference journey for programme, speakers, audience, venue and interest review.",
    shell: {
      languageName: "English", skip: "Skip to conference content", home: "CRAYS Clubs home", nav: "Primary navigation",
      menu: "Menu", open: "Open menu", close: "Close menu", account: "Account", language: "Language",
      title: "Explore CRAYS Clubs", lead: "Forest City is our campus. Discover people, places and invitation-led journeys.",
      explore: "Explore", belong: "Belong", company: "CRAYS Clubs", association: "CRAYS Association",
      associationLead: "The independent association is part of the wider CRAYS context.", newTab: "opens in a new tab",
      footerLead: "Meet friends, colleagues and partners in the new world of Crays Club.", footerCta: "Claim your global home",
      release: "Pre-release public experience. No promise of booking, price, availability, investment or admission.",
      links: { forest: "Forest City", community: "Community Life", school: "School & Jobs", ambassadors: "Ambassadors", families: "Families", teams: "Teams", events: "Events", companies: "Portfolio Companies", conference: "Conference", about: "About Us", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Become a Member", contact: "Contact", brand: "Brand as a Service", account: "Account", legal: "Legal" }
    },
    status: { blocked: "Blocked pending evidence", mediaBlocked: "Media withheld until rights are recorded", requiresEvidence: "Requires recorded confirmation", notAnnounced: "Not announced" },
    hero: {
      eyebrow: "CRAYS CONFERENCE",
      title: "Ideas need a room, a record and the right people.",
      lead: "The CRAYS Conference route is being designed as an editorial gathering inside the Clubs context. Programme, people, place and access will appear only after each fact has been confirmed and approved for publication.",
      primary: "Register interest",
      secondary: "Read the evidence gates",
      boundary: "No conference date, venue, ticket, speaker, sponsor, capacity or admission is currently announced on this page.",
      signals: ["One coherent programme", "Confirmed voices only", "Context before access", "A usable public record"]
    },
    archive: {
      eyebrow: "PUBLIC RECORD",
      title: "An edition becomes history only after it happened.",
      lead: "The reference establishes continuity through past editions and recorded talks. CRAYS preserves that function with an audit-ready archive architecture, but it will not invent former conferences, registration totals, playlists or outcomes.",
      mediaLabel: "Archive media role",
      items: [
        item("Edition record 01", "Reserved for a completed edition with verified title, date, programme, venue and publication authority.", "No qualifying CRAYS record"),
        item("Edition record 02", "Reserved for approved session media, captions, speaker consent and a stable source record.", "No qualifying CRAYS record"),
        item("Edition record 03", "Reserved for an edition summary that separates observed facts from future plans.", "No qualifying CRAYS record")
      ]
    },
    programme: {
      eyebrow: "PROGRAMME ARCHITECTURE",
      title: "A full day is built in chapters, not filled with claims.",
      lead: "This is the intended information architecture for a future confirmed programme. It is not an agenda announcement. Every chapter needs an owner, subject, participant scope, timing and publication status before release.",
      note: "Sequence is architectural. Times, sessions and access remain unconfirmed.",
      items: [
        item("Arrival and orientation", "Access instructions, conduct, accessibility and recording boundaries are published together.", "Awaiting programme owner"),
        item("Opening context", "A verified host frames the question, the limits of the day and the expected public record.", "Awaiting host confirmation"),
        item("Founder and operator dialogue", "A practical conversation is released only with named participants, approved scope and consent.", "Awaiting participants"),
        item("Technology and infrastructure", "A session can examine systems and tools without implying product endorsement or investment advice.", "Awaiting subject approval"),
        item("Economy and institution", "A moderated chapter can test business and organisational ideas with clear evidence boundaries.", "Awaiting subject approval"),
        item("Community and place", "Local and global perspectives require verified authority and must not imply partnerships.", "Awaiting authority review"),
        item("Hosted introductions", "A facilitated meeting interval may support relevant contact without promising introductions or outcomes.", "Awaiting format review"),
        item("Working roundtables", "Small-group work needs capacity, facilitation, participation rules and an explicit record policy.", "Awaiting format review"),
        item("Closing synthesis", "The final chapter records what was said, what remains open and what may be published.", "Awaiting programme approval")
      ]
    },
    speakers: {
      eyebrow: "SPEAKER ROLES",
      title: "Reputation is never borrowed.",
      lead: "The reference uses a broad named speaker roster as proof. CRAYS keeps the same editorial depth through role-specific speaker gates. A portrait, name, biography, logo or topic remains blocked until identity, authority, consent and session status are complete.",
      gate: "A role is not a speaker announcement.",
      items: [
        item("Conference host", "Responsible for continuity, boundaries and audience orientation."),
        item("Opening voice", "Frames the central question with a verified mandate."),
        item("Founder perspective", "Shares operating experience without implied endorsement."),
        item("Technology practitioner", "Explains systems through an approved factual brief."),
        item("Institutional perspective", "Appears only with verified authority and neutral relationship language."),
        item("Economic perspective", "Separates analysis from financial promotion or advice."),
        item("Community practitioner", "Connects lived practice to a clearly defined context."),
        item("Local context voice", "Speaks only within confirmed expertise and authority."),
        item("Research perspective", "Links claims to sources and distinguishes evidence from opinion."),
        item("Wellbeing perspective", "Avoids health claims and defines the informational boundary."),
        item("Culture and media voice", "Uses cleared works, attribution and recording permissions."),
        item("Roundtable moderator", "Holds time, fairness, conduct and record-making responsibility.")
      ]
    },
    audience: {
      eyebrow: "ATTENDEE JOURNEY",
      title: "Interest is the first state, never automatic admission.",
      lead: "The journey keeps application, review, invitation, access needs and attendance separate so that no interface state creates a false promise.",
      items: [
        item("Express interest", "Share only the minimum context needed for a future review."),
        item("Context review", "CRAYS checks relevance, purpose and the correct participation route."),
        item("Programme match", "A confirmed programme is compared with the stated interest."),
        item("Invitation decision", "Admission exists only after a separate explicit confirmation."),
        item("Access preparation", "Venue, conduct, accessibility and media choices are confirmed before arrival."),
        item("After the event", "Approved materials and corrections enter a controlled public record.")
      ]
    },
    venue: {
      eyebrow: "PLACE, FACILITIES AND MEDIA",
      title: "The room must be as legible as the programme.",
      lead: "These are the facility and media roles a complete conference page must answer. Listing them does not claim that a venue or service has been secured.",
      items: [
        item("Venue identity", "Publish the exact place only after contracting authority and public use are confirmed."),
        item("Arrival route", "Record transport context, entry point and time window without promising availability."),
        item("Main room", "Confirm layout, capacity, sightlines, sound and responsible operator."),
        item("Working rooms", "Describe breakouts only when rooms, facilitation and access are allocated."),
        item("Accessibility", "Publish verified physical, sensory and communication provisions plus a contact route."),
        item("Food and breaks", "State the confirmed service, ingredients process and dietary communication boundary."),
        item("Recording", "Separate stage capture, audience consent, release rights and later publication."),
        item("Press and creators", "Define accreditation, permitted areas, attribution and withdrawal handling."),
        item("Remote media", "Offer streams or recordings only after platform, rights and support are confirmed.")
      ]
    },
    proof: {
      eyebrow: "SOCIAL PROOF",
      title: "A quiet block is more truthful than a borrowed quote.",
      lead: "The reference uses registration figures, recognised people and recordings as public confidence signals. CRAYS will activate this surface only with its own verified event evidence.",
      requirements: ["Named source and authority", "Participant consent", "Exact statement or measured fact", "Media rights and crop record", "Owner review and withdrawal path"],
      action: "Explore Community Life"
    },
    interest: {
      eyebrow: "INTEREST PATH",
      title: "Tell us what you would want from a CRAYS conference.",
      lead: "The form architecture records intent, role, subject and access needs. Submission stays disabled until a data controller, purpose, retention period, secure endpoint and response owner are approved.",
      unavailable: "Interest submission is not active yet. No personal data is transmitted from this source implementation.",
      fields: { name: "Name", email: "Email", organisation: "Organisation or community", role: "Your role", topic: "Question or topic", access: "Accessibility or participation needs", consent: "I have read the future data-use notice" },
      submit: "Submission not yet open",
      contact: "Use the existing contact route"
    },
    faq: {
      eyebrow: "PRACTICAL QUESTIONS",
      title: "What must be clear before you decide.",
      items: [
        { question: "How long will the conference be?", answer: "No duration is announced. A released edition must publish start, finish, breaks, arrival window and timezone together." },
        { question: "What format will it use?", answer: "The architecture supports stage conversations, working sessions and hosted introductions, but the confirmed edition format must be published separately." },
        { question: "What subjects will be covered?", answer: "Only approved programme chapters with an accountable owner and evidence boundary will be listed. No topic in this source is a scheduled session." },
        { question: "Will there be ways to meet other people?", answer: "A future edition may include facilitated contact, but CRAYS will not promise introductions, access to named people or commercial outcomes." },
        { question: "How does Conference relate to CRAYS Clubs?", answer: "Conference is a distinct participation route within the wider Clubs experience. Membership, application, invitation and conference admission remain separate states." },
        { question: "Will sessions be recorded?", answer: "Recording is not confirmed. Any release requires speaker rights, audience notice, captions, storage rules and an approved publication record." }
      ]
    }
  },
  de: {
    localeName: "Deutsch",
    metaTitle: "Konferenz | CRAYS Clubs",
    metaDescription: "Die evidenzgefuehrte CRAYS-Clubs-Konferenzreise fuer Programm, Speaker, Publikum, Ort und Interessenpruefung.",
    shell: {
      languageName: "Deutsch", skip: "Zum Konferenzinhalt springen", home: "CRAYS Clubs Startseite", nav: "Hauptnavigation",
      menu: "Menue", open: "Menue oeffnen", close: "Menue schliessen", account: "Konto", language: "Sprache",
      title: "CRAYS Clubs entdecken", lead: "Forest City ist unser Campus. Entdecke Menschen, Orte und einladungsgefuehrte Wege.",
      explore: "Entdecken", belong: "Dazugehoeren", company: "CRAYS Clubs", association: "CRAYS Association",
      associationLead: "Der unabhaengige Verein ist Teil des groesseren CRAYS-Kontexts.", newTab: "oeffnet in einem neuen Tab",
      footerLead: "Triff Freunde, Kollegen und Partner in der neuen Welt des Crays Club.", footerCta: "Beanspruche dein globales Zuhause",
      release: "Oeffentliche Pre-Release-Erfahrung. Kein Versprechen zu Buchung, Preis, Verfuegbarkeit, Investment oder Aufnahme.",
      links: { forest: "Forest City", community: "Community Life", school: "School & Jobs", ambassadors: "Ambassadors", families: "Familien", teams: "Teams", events: "Events", companies: "Portfolio Companies", conference: "Konferenz", about: "Ueber uns", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Mitglied werden", contact: "Kontakt", brand: "Brand as a Service", account: "Konto", legal: "Rechtliches" }
    },
    status: { blocked: "Bis zum Nachweis gesperrt", mediaBlocked: "Medien bleiben bis zum Rechtenachweis verborgen", requiresEvidence: "Erfordert dokumentierte Bestaetigung", notAnnounced: "Nicht angekuendigt" },
    hero: {
      eyebrow: "CRAYS KONFERENZ", title: "Ideen brauchen einen Raum, einen Nachweis und die richtigen Menschen.",
      lead: "Die CRAYS-Konferenzroute wird als redaktionelles Treffen im Clubs-Kontext entworfen. Programm, Personen, Ort und Zugang erscheinen erst, wenn jeder Fakt bestaetigt und zur Veroeffentlichung freigegeben ist.",
      primary: "Interesse vormerken", secondary: "Evidenzgrenzen lesen",
      boundary: "Auf dieser Seite sind derzeit weder Datum, Ort, Ticket, Speaker, Sponsor, Kapazitaet noch Aufnahme angekuendigt.",
      signals: ["Ein zusammenhaengendes Programm", "Nur bestaetigte Stimmen", "Kontext vor Zugang", "Ein belastbarer oeffentlicher Nachweis"]
    },
    archive: {
      eyebrow: "OEFFENTLICHER NACHWEIS", title: "Eine Ausgabe wird erst nach ihrer Durchfuehrung zur Geschichte.",
      lead: "Die Referenz schafft Kontinuitaet ueber fruehere Ausgaben und Aufzeichnungen. CRAYS erhaelt diese Funktion mit einer auditfaehigen Archivstruktur, erfindet aber keine frueheren Konferenzen, Anmeldezahlen, Playlists oder Ergebnisse.",
      mediaLabel: "Archiv-Medienrolle",
      items: [
        item("Ausgabenachweis 01", "Reserviert fuer eine abgeschlossene Ausgabe mit bestaetigtem Titel, Datum, Programm, Ort und Veroeffentlichungsbefugnis.", "Kein qualifizierender CRAYS-Nachweis"),
        item("Ausgabenachweis 02", "Reserviert fuer freigegebene Sessions mit Untertiteln, Speaker-Einwilligung und stabiler Quelle.", "Kein qualifizierender CRAYS-Nachweis"),
        item("Ausgabenachweis 03", "Reserviert fuer eine Zusammenfassung, die beobachtete Fakten von Zukunftsplaenen trennt.", "Kein qualifizierender CRAYS-Nachweis")
      ]
    },
    programme: {
      eyebrow: "PROGRAMMARCHITEKTUR", title: "Ein voller Tag entsteht in Kapiteln, nicht aus Behauptungen.",
      lead: "Dies ist die vorgesehene Informationsarchitektur fuer ein spaeter bestaetigtes Programm, keine Agenda-Ankuendigung. Jedes Kapitel benoetigt Owner, Thema, Teilnehmerkreis, Zeit und Publikationsstatus.",
      note: "Die Reihenfolge ist architektonisch. Zeiten, Sessions und Zugang sind unbestaetigt.",
      items: [
        item("Ankunft und Orientierung", "Zugang, Verhalten, Barrierefreiheit und Aufzeichnungsgrenzen werden gemeinsam publiziert.", "Programm-Owner offen"),
        item("Eroeffnungskontext", "Ein verifizierter Host rahmt Frage, Tagesgrenzen und oeffentlichen Nachweis.", "Host-Bestaetigung offen"),
        item("Founder- und Operator-Dialog", "Das Praxisgespraech erscheint nur mit benannten Personen, freigegebenem Umfang und Einwilligung.", "Teilnehmende offen"),
        item("Technologie und Infrastruktur", "Systeme und Werkzeuge koennen ohne Produktendorsement oder Anlageberatung behandelt werden.", "Themenfreigabe offen"),
        item("Wirtschaft und Institution", "Ein moderiertes Kapitel prueft Geschaefts- und Organisationsideen mit klaren Evidenzgrenzen.", "Themenfreigabe offen"),
        item("Community und Ort", "Lokale und globale Perspektiven brauchen belegte Autoritaet und duerfen keine Partnerschaft implizieren.", "Autoritaetspruefung offen"),
        item("Moderierte Begegnungen", "Ein Kontaktfenster kann Austausch ermoeglichen, ohne Vorstellungen oder Ergebnisse zu versprechen.", "Formatpruefung offen"),
        item("Arbeits-Roundtables", "Kleingruppen brauchen Kapazitaet, Moderation, Regeln und eine klare Aufzeichnungspolitik.", "Formatpruefung offen"),
        item("Abschlusssynthese", "Der Abschluss dokumentiert Gesagtes, offene Punkte und publizierbare Inhalte.", "Programmfreigabe offen")
      ]
    },
    speakers: {
      eyebrow: "SPEAKER-ROLLEN", title: "Reputation wird niemals geliehen.",
      lead: "Die Referenz nutzt eine breite Namensliste als Beleg. CRAYS erhaelt die redaktionelle Tiefe durch rollenspezifische Gates. Portrait, Name, Biografie, Logo oder Thema bleiben bis zu Identitaet, Autoritaet, Einwilligung und Sessionstatus gesperrt.",
      gate: "Eine Rolle ist keine Speaker-Ankuendigung.",
      items: [
        item("Konferenz-Host", "Traegt Verantwortung fuer Zusammenhang, Grenzen und Publikumsorientierung."),
        item("Eroeffnungsstimme", "Rahmt die Leitfrage mit verifiziertem Mandat."),
        item("Founder-Perspektive", "Teilt Betriebserfahrung ohne implizite Empfehlung."),
        item("Technologiepraxis", "Erklaert Systeme anhand eines freigegebenen Faktenbriefings."),
        item("Institutionelle Perspektive", "Erscheint nur mit belegter Autoritaet und neutraler Beziehungssprache."),
        item("Wirtschaftsperspektive", "Trennt Analyse von Finanzwerbung und Beratung."),
        item("Community-Praxis", "Verbindet gelebte Praxis mit klar definiertem Kontext."),
        item("Lokale Kontextstimme", "Spricht nur innerhalb bestaetigter Expertise und Autoritaet."),
        item("Forschungsperspektive", "Verknuepft Aussagen mit Quellen und trennt Evidenz von Meinung."),
        item("Wellbeing-Perspektive", "Vermeidet Gesundheitsclaims und definiert Informationsgrenzen."),
        item("Kultur- und Medienstimme", "Nutzt freigegebene Werke, Attribution und Aufzeichnungsrechte."),
        item("Roundtable-Moderation", "Verantwortet Zeit, Fairness, Verhalten und Dokumentation.")
      ]
    },
    audience: {
      eyebrow: "TEILNEHMERREISE", title: "Interesse ist der erste Status, niemals automatische Aufnahme.",
      lead: "Der Weg trennt Interesse, Pruefung, Einladung, Zugangsbedarf und Teilnahme, damit kein Interface-Status ein falsches Versprechen erzeugt.",
      items: [
        item("Interesse ausdruecken", "Nur den minimal noetigen Kontext fuer eine spaetere Pruefung teilen."),
        item("Kontextpruefung", "CRAYS prueft Relevanz, Zweck und den richtigen Teilnahmeweg."),
        item("Programmabgleich", "Ein bestaetigtes Programm wird mit dem genannten Interesse abgeglichen."),
        item("Einladungsentscheidung", "Aufnahme besteht erst nach separater ausdruecklicher Bestaetigung."),
        item("Zugangsvorbereitung", "Ort, Verhalten, Barrierefreiheit und Medienwahl werden vor Ankunft bestaetigt."),
        item("Nach der Veranstaltung", "Freigegebene Medien und Korrekturen gehen in einen kontrollierten Nachweis ein.")
      ]
    },
    venue: {
      eyebrow: "ORT, AUSSTATTUNG UND MEDIEN", title: "Der Raum muss so lesbar sein wie das Programm.",
      lead: "Diese Rollen muss eine vollstaendige Konferenzseite beantworten. Ihre Auflistung behauptet weder gesicherten Ort noch Dienstleistung.",
      items: [
        item("Ortsidentitaet", "Den genauen Ort erst nach Vertragsbefugnis und Freigabe der oeffentlichen Nutzung nennen."),
        item("Anreiseweg", "Transportkontext, Eingang und Zeitfenster ohne Verfuegbarkeitsversprechen dokumentieren."),
        item("Hauptraum", "Layout, Kapazitaet, Sicht, Ton und verantwortlichen Betreiber bestaetigen."),
        item("Arbeitsraeume", "Breakouts nur mit zugeordneten Raeumen, Moderation und Zugang beschreiben."),
        item("Barrierefreiheit", "Gepruefte physische, sensorische und kommunikative Vorkehrungen plus Kontakt nennen."),
        item("Essen und Pausen", "Bestaetigten Service, Zutatenprozess und Grenze der Ernaehrungskommunikation erklaeren."),
        item("Aufzeichnung", "Buehnenaufnahme, Publikumseinwilligung, Rechte und Publikation trennen."),
        item("Presse und Creator", "Akkreditierung, erlaubte Bereiche, Attribution und Rueckzug definieren."),
        item("Remote-Medien", "Streams oder Aufzeichnungen erst nach Plattform-, Rechte- und Supportbestaetigung anbieten.")
      ]
    },
    proof: {
      eyebrow: "SOCIAL PROOF", title: "Eine ruhige Flaeche ist ehrlicher als ein geliehenes Zitat.",
      lead: "Die Referenz nutzt Zahlen, bekannte Personen und Aufzeichnungen als Vertrauenssignal. CRAYS aktiviert diese Flaeche nur mit eigener verifizierter Event-Evidenz.",
      requirements: ["Benannte Quelle und Autoritaet", "Einwilligung der Person", "Exakte Aussage oder Messwert", "Medienrechte und Crop-Nachweis", "Owner-Pruefung und Rueckzugsweg"],
      action: "Community Life entdecken"
    },
    interest: {
      eyebrow: "INTERESSENWEG", title: "Sag uns, was du von einer CRAYS-Konferenz erwarten wuerdest.",
      lead: "Die Formulararchitektur erfasst Absicht, Rolle, Thema und Zugangsbedarf. Die Uebermittlung bleibt gesperrt, bis Verantwortlicher, Zweck, Aufbewahrung, sicherer Endpoint und Antwort-Owner freigegeben sind.",
      unavailable: "Die Interessensuebermittlung ist noch nicht aktiv. Diese Source-Umsetzung uebertraegt keine personenbezogenen Daten.",
      fields: { name: "Name", email: "E-Mail", organisation: "Organisation oder Community", role: "Deine Rolle", topic: "Frage oder Thema", access: "Barrierefreiheits- oder Teilnahmebedarf", consent: "Ich habe den kuenftigen Datenhinweis gelesen" },
      submit: "Uebermittlung noch nicht offen", contact: "Bestehenden Kontaktweg nutzen"
    },
    faq: {
      eyebrow: "PRAKTISCHE FRAGEN", title: "Was vor einer Entscheidung klar sein muss.",
      items: [
        { question: "Wie lange wird die Konferenz dauern?", answer: "Es ist keine Dauer angekuendigt. Eine freigegebene Ausgabe muss Beginn, Ende, Pausen, Ankunftsfenster und Zeitzone gemeinsam nennen." },
        { question: "Welches Format wird verwendet?", answer: "Die Architektur unterstuetzt Buehnengespraeche, Arbeitssessions und moderierte Begegnungen; das bestaetigte Format wird separat publiziert." },
        { question: "Welche Themen werden behandelt?", answer: "Nur freigegebene Kapitel mit verantwortlichem Owner und Evidenzgrenze werden gelistet. Kein Thema dieser Source ist eine terminierte Session." },
        { question: "Wird es Moeglichkeiten geben, andere zu treffen?", answer: "Eine spaetere Ausgabe kann moderierten Kontakt enthalten. CRAYS verspricht weder Vorstellungen noch Zugang zu benannten Personen oder Geschaeftsergebnisse." },
        { question: "Wie gehoert Conference zu CRAYS Clubs?", answer: "Conference ist ein eigener Teilnahmeweg im Clubs-Erlebnis. Mitgliedschaft, Bewerbung, Einladung und Konferenzaufnahme bleiben getrennte Status." },
        { question: "Werden Sessions aufgezeichnet?", answer: "Aufzeichnung ist nicht bestaetigt. Jede Publikation braucht Speaker-Rechte, Publikumshinweis, Untertitel, Speicherregeln und einen freigegebenen Nachweis." }
      ]
    }
  },
  es: {
    localeName: "Espa\u00f1ol",
    metaTitle: "Conferencia | CRAYS Clubs",
    metaDescription: "El recorrido de conferencia de CRAYS Clubs guiado por evidencia para programa, ponentes, audiencia, lugar e inter\u00e9s.",
    shell: {
      languageName: "Espa\u00f1ol", skip: "Saltar al contenido de la conferencia", home: "Inicio CRAYS Clubs", nav: "Navegaci\u00f3n principal",
      menu: "Men\u00fa", open: "Abrir men\u00fa", close: "Cerrar men\u00fa", account: "Cuenta", language: "Idioma",
      title: "Explora CRAYS Clubs", lead: "Forest City es nuestro campus. Descubre personas, lugares y recorridos por invitaci\u00f3n.",
      explore: "Explorar", belong: "Pertenecer", company: "CRAYS Clubs", association: "CRAYS Association",
      associationLead: "La asociaci\u00f3n independiente forma parte del contexto CRAYS.", newTab: "se abre en una pesta\u00f1a nueva",
      footerLead: "Conoce a amigos, colegas y socios en el nuevo mundo Crays Club.", footerCta: "Reclama tu hogar global",
      release: "Experiencia p\u00fablica previa al lanzamiento. Sin promesa de reserva, precio, disponibilidad, inversi\u00f3n o admisi\u00f3n.",
      links: { forest: "Forest City", community: "Vida en comunidad", school: "Escuela y empleo", ambassadors: "Ambassadors", families: "Familias", teams: "Equipos", events: "Eventos", companies: "Portfolio Companies", conference: "Conferencia", about: "Sobre nosotros", lifestyle: "Estilo de vida", hospitality: "Hospitality", member: "Hazte miembro", contact: "Contacto", brand: "Brand as a Service", account: "Cuenta", legal: "Legal" }
    },
    status: { blocked: "Bloqueado hasta aportar evidencia", mediaBlocked: "Medios ocultos hasta registrar derechos", requiresEvidence: "Requiere confirmaci\u00f3n documentada", notAnnounced: "No anunciado" },
    hero: {
      eyebrow: "CONFERENCIA CRAYS", title: "Las ideas necesitan una sala, un registro y las personas adecuadas.",
      lead: "La ruta Conference de CRAYS se dise\u00f1a como un encuentro editorial dentro del contexto Clubs. Programa, personas, lugar y acceso aparecer\u00e1n solo cuando cada dato est\u00e9 confirmado y aprobado para publicaci\u00f3n.",
      primary: "Registrar inter\u00e9s", secondary: "Leer los l\u00edmites de evidencia",
      boundary: "Esta p\u00e1gina no anuncia fecha, lugar, entrada, ponente, patrocinador, aforo ni admisi\u00f3n.",
      signals: ["Un programa coherente", "Solo voces confirmadas", "Contexto antes que acceso", "Un registro p\u00fablico utilizable"]
    },
    archive: {
      eyebrow: "REGISTRO P\u00daBLICO", title: "Una edici\u00f3n se convierte en historia solo despu\u00e9s de celebrarse.",
      lead: "La referencia crea continuidad con ediciones y grabaciones anteriores. CRAYS mantiene esa funci\u00f3n mediante una arquitectura auditable, sin inventar conferencias, cifras, listas de reproducci\u00f3n ni resultados.",
      mediaLabel: "Funci\u00f3n de medios de archivo",
      items: [
        item("Registro de edici\u00f3n 01", "Reservado para una edici\u00f3n terminada con t\u00edtulo, fecha, programa, lugar y autoridad de publicaci\u00f3n verificados.", "Sin registro CRAYS v\u00e1lido"),
        item("Registro de edici\u00f3n 02", "Reservado para sesiones aprobadas con subt\u00edtulos, consentimiento del ponente y fuente estable.", "Sin registro CRAYS v\u00e1lido"),
        item("Registro de edici\u00f3n 03", "Reservado para un resumen que separe hechos observados de planes futuros.", "Sin registro CRAYS v\u00e1lido")
      ]
    },
    programme: {
      eyebrow: "ARQUITECTURA DEL PROGRAMA", title: "Un d\u00eda completo se construye por cap\u00edtulos, no con afirmaciones.",
      lead: "Esta es la arquitectura informativa prevista para un futuro programa confirmado, no un anuncio de agenda. Cada cap\u00edtulo necesita responsable, tema, participantes, horario y estado editorial.",
      note: "La secuencia es arquitect\u00f3nica. Horarios, sesiones y acceso siguen sin confirmar.",
      items: [
        item("Llegada y orientaci\u00f3n", "Acceso, conducta, accesibilidad y l\u00edmites de grabaci\u00f3n se publican juntos.", "Responsable pendiente"),
        item("Contexto de apertura", "Un anfitri\u00f3n verificado enmarca la pregunta y los l\u00edmites del d\u00eda.", "Anfitri\u00f3n pendiente"),
        item("Di\u00e1logo de fundadores y operadores", "La conversaci\u00f3n se publica solo con personas, alcance y consentimiento aprobados.", "Participantes pendientes"),
        item("Tecnolog\u00eda e infraestructura", "Puede examinar sistemas sin implicar recomendaci\u00f3n de producto o inversi\u00f3n.", "Tema pendiente"),
        item("Econom\u00eda e instituci\u00f3n", "Un cap\u00edtulo moderado prueba ideas con l\u00edmites de evidencia claros.", "Tema pendiente"),
        item("Comunidad y lugar", "Las perspectivas requieren autoridad verificada y no implican alianzas.", "Autoridad pendiente"),
        item("Presentaciones facilitadas", "Un intervalo puede favorecer contacto sin prometer presentaciones ni resultados.", "Formato pendiente"),
        item("Mesas de trabajo", "Los grupos necesitan aforo, facilitaci\u00f3n, reglas y pol\u00edtica de registro.", "Formato pendiente"),
        item("S\u00edntesis final", "El cierre registra lo dicho, lo abierto y lo publicable.", "Aprobaci\u00f3n pendiente")
      ]
    },
    speakers: {
      eyebrow: "ROLES DE PONENTES", title: "La reputaci\u00f3n nunca se toma prestada.",
      lead: "La referencia usa una lista amplia de nombres como prueba. CRAYS conserva la profundidad con controles por rol. Retrato, nombre, biograf\u00eda, logo y tema quedan bloqueados hasta completar identidad, autoridad, consentimiento y sesi\u00f3n.",
      gate: "Un rol no es un anuncio de ponente.",
      items: [
        item("Anfitri\u00f3n de conferencia", "Responsable de continuidad, l\u00edmites y orientaci\u00f3n."),
        item("Voz de apertura", "Enmarca la pregunta central con mandato verificado."),
        item("Perspectiva fundadora", "Comparte experiencia sin apoyo impl\u00edcito."),
        item("Profesional tecnol\u00f3gico", "Explica sistemas desde un briefing factual aprobado."),
        item("Perspectiva institucional", "Aparece solo con autoridad y lenguaje relacional neutro."),
        item("Perspectiva econ\u00f3mica", "Separa an\u00e1lisis de promoci\u00f3n o asesoramiento."),
        item("Pr\u00e1ctica comunitaria", "Conecta experiencia con un contexto definido."),
        item("Voz de contexto local", "Habla dentro de experiencia y autoridad confirmadas."),
        item("Perspectiva investigadora", "Vincula afirmaciones a fuentes y distingue opini\u00f3n."),
        item("Perspectiva de bienestar", "Evita afirmaciones sanitarias y define l\u00edmites."),
        item("Voz cultural y medi\u00e1tica", "Usa obras, atribuci\u00f3n y permisos aprobados."),
        item("Moderaci\u00f3n de mesa", "Responsable de tiempo, equidad, conducta y registro.")
      ]
    },
    audience: {
      eyebrow: "RECORRIDO DEL ASISTENTE", title: "El inter\u00e9s es el primer estado, nunca admisi\u00f3n autom\u00e1tica.",
      lead: "El recorrido separa inter\u00e9s, revisi\u00f3n, invitaci\u00f3n, necesidades y asistencia para evitar promesas falsas.",
      items: [
        item("Expresar inter\u00e9s", "Compartir solo el contexto m\u00ednimo para una futura revisi\u00f3n."),
        item("Revisi\u00f3n de contexto", "CRAYS revisa relevancia, prop\u00f3sito y ruta adecuada."),
        item("Encaje con programa", "Un programa confirmado se compara con el inter\u00e9s declarado."),
        item("Decisi\u00f3n de invitaci\u00f3n", "La admisi\u00f3n existe solo tras confirmaci\u00f3n separada."),
        item("Preparaci\u00f3n de acceso", "Lugar, conducta, accesibilidad y medios se confirman antes."),
        item("Despu\u00e9s del evento", "Material aprobado y correcciones entran en un registro controlado.")
      ]
    },
    venue: {
      eyebrow: "LUGAR, INSTALACIONES Y MEDIOS", title: "La sala debe ser tan legible como el programa.",
      lead: "Estas funciones deben resolverse en una p\u00e1gina completa. Enumerarlas no afirma que exista lugar o servicio contratado.",
      items: [
        item("Identidad del lugar", "Publicar el lugar exacto solo tras confirmar autoridad y uso p\u00fablico."),
        item("Ruta de llegada", "Registrar transporte, entrada y ventana sin prometer disponibilidad."),
        item("Sala principal", "Confirmar dise\u00f1o, aforo, visi\u00f3n, sonido y operador."),
        item("Salas de trabajo", "Describirlas solo con espacio, facilitaci\u00f3n y acceso asignados."),
        item("Accesibilidad", "Publicar medidas verificadas y un contacto."),
        item("Comida y pausas", "Explicar servicio confirmado, ingredientes y l\u00edmites diet\u00e9ticos."),
        item("Grabaci\u00f3n", "Separar escenario, consentimiento, derechos y publicaci\u00f3n."),
        item("Prensa y creadores", "Definir acreditaci\u00f3n, zonas, atribuci\u00f3n y retirada."),
        item("Medios remotos", "Ofrecer streaming solo tras confirmar plataforma, derechos y soporte.")
      ]
    },
    proof: {
      eyebrow: "PRUEBA SOCIAL", title: "Un bloque silencioso es m\u00e1s honesto que una cita prestada.",
      lead: "La referencia usa cifras, personas y grabaciones como confianza. CRAYS activa esta superficie solo con evidencia propia verificada.",
      requirements: ["Fuente y autoridad identificadas", "Consentimiento participante", "Afirmaci\u00f3n o medida exacta", "Derechos y recorte del medio", "Revisi\u00f3n owner y retirada"],
      action: "Explorar Community Life"
    },
    interest: {
      eyebrow: "RUTA DE INTER\u00c9S", title: "Cu\u00e9ntanos qu\u00e9 esperar\u00edas de una conferencia CRAYS.",
      lead: "El formulario registra intenci\u00f3n, rol, tema y necesidades. El env\u00edo queda bloqueado hasta aprobar responsable, finalidad, retenci\u00f3n, endpoint seguro y respuesta.",
      unavailable: "El env\u00edo de inter\u00e9s no est\u00e1 activo. Esta implementaci\u00f3n no transmite datos personales.",
      fields: { name: "Nombre", email: "Correo", organisation: "Organizaci\u00f3n o comunidad", role: "Tu rol", topic: "Pregunta o tema", access: "Necesidades de accesibilidad o participaci\u00f3n", consent: "He le\u00eddo el futuro aviso de datos" },
      submit: "Env\u00edo a\u00fan no abierto", contact: "Usar la ruta de contacto existente"
    },
    faq: {
      eyebrow: "PREGUNTAS PR\u00c1CTICAS", title: "Lo que debe estar claro antes de decidir.",
      items: [
        { question: "\u00bfCu\u00e1nto durar\u00e1 la conferencia?", answer: "No hay duraci\u00f3n anunciada. Una edici\u00f3n debe publicar inicio, fin, pausas, llegada y zona horaria juntos." },
        { question: "\u00bfQu\u00e9 formato tendr\u00e1?", answer: "La arquitectura admite conversaciones, trabajo y encuentros; el formato confirmado se publicar\u00e1 aparte." },
        { question: "\u00bfQu\u00e9 temas se tratar\u00e1n?", answer: "Solo se listar\u00e1n cap\u00edtulos aprobados con responsable y l\u00edmite. Ning\u00fan tema aqu\u00ed es una sesi\u00f3n programada." },
        { question: "\u00bfHabr\u00e1 oportunidades para conocer personas?", answer: "Una edici\u00f3n puede facilitar contacto, sin prometer presentaciones, acceso a personas ni resultados." },
        { question: "\u00bfC\u00f3mo se relaciona Conference con CRAYS Clubs?", answer: "Es una ruta distinta dentro de Clubs. Membres\u00eda, solicitud, invitaci\u00f3n y admisi\u00f3n siguen separadas." },
        { question: "\u00bfSe grabar\u00e1n las sesiones?", answer: "No est\u00e1 confirmado. Toda publicaci\u00f3n requiere derechos, aviso, subt\u00edtulos, reglas de almacenamiento y registro aprobado." }
      ]
    }
  },
  ca: {
    localeName: "Catal\u00e0",
    metaTitle: "Confer\u00e8ncia | CRAYS Clubs",
    metaDescription: "El recorregut de confer\u00e8ncia de CRAYS Clubs guiat per evid\u00e8ncia per a programa, ponents, p\u00fablic, lloc i inter\u00e8s.",
    shell: {
      languageName: "Catal\u00e0", skip: "Ves al contingut de la confer\u00e8ncia", home: "Inici CRAYS Clubs", nav: "Navegaci\u00f3 principal",
      menu: "Men\u00fa", open: "Obre el men\u00fa", close: "Tanca el men\u00fa", account: "Compte", language: "Idioma",
      title: "Explora CRAYS Clubs", lead: "Forest City \u00e9s el nostre campus. Descobreix persones, llocs i recorreguts per invitaci\u00f3.",
      explore: "Explora", belong: "Pertinen\u00e7a", company: "CRAYS Clubs", association: "CRAYS Association",
      associationLead: "L'associaci\u00f3 independent forma part del context CRAYS.", newTab: "s'obre en una pestanya nova",
      footerLead: "Coneix amics, col\u00b7legues i socis al nou m\u00f3n Crays Club.", footerCta: "Reivindica la teva llar global",
      release: "Experi\u00e8ncia p\u00fablica pr\u00e8via al llan\u00e7ament. Sense promesa de reserva, preu, disponibilitat, inversi\u00f3 o admissi\u00f3.",
      links: { forest: "Forest City", community: "Vida comunit\u00e0ria", school: "Escola i feina", ambassadors: "Ambassadors", families: "Fam\u00edlies", teams: "Equips", events: "Esdeveniments", companies: "Portfolio Companies", conference: "Confer\u00e8ncia", about: "Qui som", lifestyle: "Estil de vida", hospitality: "Hospitality", member: "Fes-te membre", contact: "Contacte", brand: "Brand as a Service", account: "Compte", legal: "Legal" }
    },
    status: { blocked: "Bloquejat fins a tenir evid\u00e8ncia", mediaBlocked: "Mitjans ocults fins a registrar els drets", requiresEvidence: "Requereix confirmaci\u00f3 documentada", notAnnounced: "No anunciat" },
    hero: {
      eyebrow: "CONFER\u00c8NCIA CRAYS", title: "Les idees necessiten una sala, un registre i les persones adequades.",
      lead: "La ruta Conference de CRAYS es dissenya com una trobada editorial dins del context Clubs. Programa, persones, lloc i acc\u00e9s apareixeran nom\u00e9s quan cada dada estigui confirmada i aprovada.",
      primary: "Registrar inter\u00e8s", secondary: "Llegir els l\u00edmits d'evid\u00e8ncia",
      boundary: "Aquesta p\u00e0gina no anuncia data, lloc, entrada, ponent, patrocinador, aforament ni admissi\u00f3.",
      signals: ["Un programa coherent", "Nom\u00e9s veus confirmades", "Context abans que acc\u00e9s", "Un registre p\u00fablic utilitzable"]
    },
    archive: {
      eyebrow: "REGISTRE P\u00daBLIC", title: "Una edici\u00f3 esdev\u00e9 hist\u00f2ria nom\u00e9s despr\u00e9s de celebrar-se.",
      lead: "La refer\u00e8ncia crea continu\u00eftat amb edicions i enregistraments anteriors. CRAYS mant\u00e9 aquesta funci\u00f3 amb una arquitectura auditable, sense inventar confer\u00e8ncies, xifres, llistes ni resultats.",
      mediaLabel: "Funci\u00f3 de mitjans d'arxiu",
      items: [
        item("Registre d'edici\u00f3 01", "Reservat per a una edici\u00f3 acabada amb t\u00edtol, data, programa, lloc i autoritat de publicaci\u00f3 verificats.", "Sense registre CRAYS v\u00e0lid"),
        item("Registre d'edici\u00f3 02", "Reservat per a sessions aprovades amb subt\u00edtols, consentiment del ponent i font estable.", "Sense registre CRAYS v\u00e0lid"),
        item("Registre d'edici\u00f3 03", "Reservat per a un resum que separi fets observats de plans futurs.", "Sense registre CRAYS v\u00e0lid")
      ]
    },
    programme: {
      eyebrow: "ARQUITECTURA DEL PROGRAMA", title: "Un dia complet es construeix per cap\u00edtols, no amb afirmacions.",
      lead: "Aquesta \u00e9s l'arquitectura informativa prevista per a un futur programa confirmat, no un anunci d'agenda. Cada cap\u00edtol necessita responsable, tema, participants, horari i estat editorial.",
      note: "La seq\u00fc\u00e8ncia \u00e9s arquitect\u00f2nica. Horaris, sessions i acc\u00e9s continuen sense confirmar.",
      items: [
        item("Arribada i orientaci\u00f3", "Acc\u00e9s, conducta, accessibilitat i l\u00edmits d'enregistrament es publiquen junts.", "Responsable pendent"),
        item("Context d'obertura", "Un amfitri\u00f3 verificat emmarca la pregunta i els l\u00edmits del dia.", "Amfitri\u00f3 pendent"),
        item("Di\u00e0leg de fundadors i operadors", "La conversa es publica nom\u00e9s amb persones, abast i consentiment aprovats.", "Participants pendents"),
        item("Tecnologia i infraestructura", "Pot examinar sistemes sense implicar recomanaci\u00f3 de producte o inversi\u00f3.", "Tema pendent"),
        item("Economia i instituci\u00f3", "Un cap\u00edtol moderat prova idees amb l\u00edmits d'evid\u00e8ncia clars.", "Tema pendent"),
        item("Comunitat i lloc", "Les perspectives requereixen autoritat verificada i no impliquen aliances.", "Autoritat pendent"),
        item("Presentacions facilitades", "Un interval pot afavorir contacte sense prometre presentacions ni resultats.", "Format pendent"),
        item("Taules de treball", "Els grups necessiten aforament, facilitaci\u00f3, regles i pol\u00edtica de registre.", "Format pendent"),
        item("S\u00edntesi final", "El tancament registra el que s'ha dit, el que queda obert i el que es pot publicar.", "Aprovaci\u00f3 pendent")
      ]
    },
    speakers: {
      eyebrow: "ROLS DE PONENTS", title: "La reputaci\u00f3 mai no es pren prestada.",
      lead: "La refer\u00e8ncia usa una llista de noms com a prova. CRAYS conserva la profunditat amb controls per rol. Retrat, nom, biografia, logotip i tema queden bloquejats fins a completar identitat, autoritat, consentiment i sessi\u00f3.",
      gate: "Un rol no \u00e9s un anunci de ponent.",
      items: [
        item("Amfitri\u00f3 de confer\u00e8ncia", "Responsable de continu\u00eftat, l\u00edmits i orientaci\u00f3."),
        item("Veu d'obertura", "Emmarca la pregunta central amb mandat verificat."),
        item("Perspectiva fundadora", "Comparteix experi\u00e8ncia sense suport impl\u00edcit."),
        item("Professional tecnol\u00f2gic", "Explica sistemes des d'un briefing factual aprovat."),
        item("Perspectiva institucional", "Apareix nom\u00e9s amb autoritat i llenguatge relacional neutre."),
        item("Perspectiva econ\u00f2mica", "Separa an\u00e0lisi de promoci\u00f3 o assessorament."),
        item("Pr\u00e0ctica comunit\u00e0ria", "Connecta experi\u00e8ncia amb un context definit."),
        item("Veu de context local", "Parla dins d'expertesa i autoritat confirmades."),
        item("Perspectiva investigadora", "Vincula afirmacions a fonts i distingeix opini\u00f3."),
        item("Perspectiva de benestar", "Evita afirmacions sanit\u00e0ries i defineix l\u00edmits."),
        item("Veu cultural i medi\u00e0tica", "Usa obres, atribuci\u00f3 i permisos aprovats."),
        item("Moderaci\u00f3 de taula", "Responsable de temps, equitat, conducta i registre.")
      ]
    },
    audience: {
      eyebrow: "RECORREGUT DE L'ASSISTENT", title: "L'inter\u00e8s \u00e9s el primer estat, mai admissi\u00f3 autom\u00e0tica.",
      lead: "El recorregut separa inter\u00e8s, revisi\u00f3, invitaci\u00f3, necessitats i assist\u00e8ncia per evitar promeses falses.",
      items: [
        item("Expressar inter\u00e8s", "Compartir nom\u00e9s el context m\u00ednim per a una futura revisi\u00f3."),
        item("Revisi\u00f3 de context", "CRAYS revisa rellev\u00e0ncia, prop\u00f2sit i ruta adequada."),
        item("Encaix amb programa", "Un programa confirmat es compara amb l'inter\u00e8s declarat."),
        item("Decisi\u00f3 d'invitaci\u00f3", "L'admissi\u00f3 existeix nom\u00e9s despr\u00e9s d'una confirmaci\u00f3 separada."),
        item("Preparaci\u00f3 d'acc\u00e9s", "Lloc, conducta, accessibilitat i mitjans es confirmen abans."),
        item("Despr\u00e9s de l'esdeveniment", "Materials aprovats i correccions entren en un registre controlat.")
      ]
    },
    venue: {
      eyebrow: "LLOC, INSTAL\u00b7LACIONS I MITJANS", title: "La sala ha de ser tan llegible com el programa.",
      lead: "Aquestes funcions s'han de resoldre en una p\u00e0gina completa. Enumerar-les no afirma que existeixi lloc o servei contractat.",
      items: [
        item("Identitat del lloc", "Publicar el lloc exacte nom\u00e9s despr\u00e9s de confirmar autoritat i \u00fas p\u00fablic."),
        item("Ruta d'arribada", "Registrar transport, entrada i finestra sense prometre disponibilitat."),
        item("Sala principal", "Confirmar disseny, aforament, visi\u00f3, so i operador."),
        item("Sales de treball", "Descriure-les nom\u00e9s amb espai, facilitaci\u00f3 i acc\u00e9s assignats."),
        item("Accessibilitat", "Publicar mesures verificades i un contacte."),
        item("Menjar i pauses", "Explicar servei confirmat, ingredients i l\u00edmits diet\u00e8tics."),
        item("Enregistrament", "Separar escenari, consentiment, drets i publicaci\u00f3."),
        item("Premsa i creadors", "Definir acreditaci\u00f3, zones, atribuci\u00f3 i retirada."),
        item("Mitjans remots", "Oferir streaming nom\u00e9s despr\u00e9s de confirmar plataforma, drets i suport.")
      ]
    },
    proof: {
      eyebrow: "PROVA SOCIAL", title: "Un bloc silenciat \u00e9s m\u00e9s honest que una cita prestada.",
      lead: "La refer\u00e8ncia usa xifres, persones i enregistraments com a confian\u00e7a. CRAYS activa aquesta superf\u00edcie nom\u00e9s amb evid\u00e8ncia pr\u00f2pia verificada.",
      requirements: ["Font i autoritat identificades", "Consentiment participant", "Afirmaci\u00f3 o mesura exacta", "Drets i retall del mitj\u00e0", "Revisi\u00f3 owner i retirada"],
      action: "Explorar Community Life"
    },
    interest: {
      eyebrow: "RUTA D'INTER\u00c8S", title: "Explica'ns qu\u00e8 esperaries d'una confer\u00e8ncia CRAYS.",
      lead: "El formulari registra intenci\u00f3, rol, tema i necessitats. L'enviament queda bloquejat fins a aprovar responsable, finalitat, retenci\u00f3, endpoint segur i resposta.",
      unavailable: "L'enviament d'inter\u00e8s no est\u00e0 actiu. Aquesta implementaci\u00f3 no transmet dades personals.",
      fields: { name: "Nom", email: "Correu", organisation: "Organitzaci\u00f3 o comunitat", role: "El teu rol", topic: "Pregunta o tema", access: "Necessitats d'accessibilitat o participaci\u00f3", consent: "He llegit el futur av\u00eds de dades" },
      submit: "Enviament encara no obert", contact: "Usar la ruta de contacte existent"
    },
    faq: {
      eyebrow: "PREGUNTES PR\u00c0CTIQUES", title: "El que ha de quedar clar abans de decidir.",
      items: [
        { question: "Quant durar\u00e0 la confer\u00e8ncia?", answer: "No hi ha durada anunciada. Una edici\u00f3 ha de publicar inici, final, pauses, arribada i zona hor\u00e0ria junts." },
        { question: "Quin format tindr\u00e0?", answer: "L'arquitectura admet converses, treball i trobades; el format confirmat es publicar\u00e0 a part." },
        { question: "Quins temes es tractaran?", answer: "Nom\u00e9s es llistaran cap\u00edtols aprovats amb responsable i l\u00edmit. Cap tema aqu\u00ed \u00e9s una sessi\u00f3 programada." },
        { question: "Hi haur\u00e0 oportunitats per con\u00e8ixer persones?", answer: "Una edici\u00f3 pot facilitar contacte, sense prometre presentacions, acc\u00e9s ni resultats." },
        { question: "Com es relaciona Conference amb CRAYS Clubs?", answer: "\u00c9s una ruta distinta dins de Clubs. Membresia, sol\u00b7licitud, invitaci\u00f3 i admissi\u00f3 continuen separades." },
        { question: "S'enregistraran les sessions?", answer: "No est\u00e0 confirmat. Publicar requereix drets, av\u00eds, subt\u00edtols, regles d'emmagatzematge i registre aprovat." }
      ]
    }
  },
  fr: {
    localeName: "Fran\u00e7ais",
    metaTitle: "Conf\u00e9rence | CRAYS Clubs",
    metaDescription: "Le parcours de conf\u00e9rence CRAYS Clubs guid\u00e9 par les preuves pour programme, intervenants, public, lieu et int\u00e9r\u00eat.",
    shell: {
      languageName: "Fran\u00e7ais", skip: "Aller au contenu de la conf\u00e9rence", home: "Accueil CRAYS Clubs", nav: "Navigation principale",
      menu: "Menu", open: "Ouvrir le menu", close: "Fermer le menu", account: "Compte", language: "Langue",
      title: "Explorer CRAYS Clubs", lead: "Forest City est notre campus. D\u00e9couvrez personnes, lieux et parcours sur invitation.",
      explore: "Explorer", belong: "Appartenir", company: "CRAYS Clubs", association: "CRAYS Association",
      associationLead: "L'association ind\u00e9pendante fait partie du contexte CRAYS.", newTab: "s'ouvre dans un nouvel onglet",
      footerLead: "Rencontrez amis, coll\u00e8gues et partenaires dans le nouvel univers Crays Club.", footerCta: "Revendiquez votre foyer mondial",
      release: "Exp\u00e9rience publique de pr\u00e9-lancement. Aucune promesse de r\u00e9servation, prix, disponibilit\u00e9, investissement ou admission.",
      links: { forest: "Forest City", community: "Vie communautaire", school: "\u00c9cole et emplois", ambassadors: "Ambassadors", families: "Familles", teams: "\u00c9quipes", events: "\u00c9v\u00e9nements", companies: "Portfolio Companies", conference: "Conf\u00e9rence", about: "\u00c0 propos", lifestyle: "Art de vivre", hospitality: "Hospitality", member: "Devenir membre", contact: "Contact", brand: "Brand as a Service", account: "Compte", legal: "Mentions l\u00e9gales" }
    },
    status: { blocked: "Bloqu\u00e9 en attente de preuve", mediaBlocked: "M\u00e9dia masqu\u00e9 jusqu'au registre des droits", requiresEvidence: "N\u00e9cessite une confirmation document\u00e9e", notAnnounced: "Non annonc\u00e9" },
    hero: {
      eyebrow: "CONF\u00c9RENCE CRAYS", title: "Les id\u00e9es ont besoin d'une salle, d'une trace et des bonnes personnes.",
      lead: "Le parcours Conference de CRAYS est con\u00e7u comme une rencontre \u00e9ditoriale dans le contexte Clubs. Programme, personnes, lieu et acc\u00e8s n'appara\u00eetront qu'apr\u00e8s confirmation et autorisation.",
      primary: "Signaler son int\u00e9r\u00eat", secondary: "Lire les limites de preuve",
      boundary: "Cette page n'annonce actuellement ni date, lieu, billet, intervenant, sponsor, capacit\u00e9 ou admission.",
      signals: ["Un programme coh\u00e9rent", "Uniquement des voix confirm\u00e9es", "Le contexte avant l'acc\u00e8s", "Une trace publique exploitable"]
    },
    archive: {
      eyebrow: "TRACE PUBLIQUE", title: "Une \u00e9dition devient historique seulement apr\u00e8s avoir eu lieu.",
      lead: "La r\u00e9f\u00e9rence cr\u00e9e une continuit\u00e9 avec les anciennes \u00e9ditions et vid\u00e9os. CRAYS conserve cette fonction dans une architecture auditable sans inventer conf\u00e9rences, chiffres, playlists ou r\u00e9sultats.",
      mediaLabel: "R\u00f4le m\u00e9dia d'archive",
      items: [
        item("Registre d'\u00e9dition 01", "R\u00e9serv\u00e9 \u00e0 une \u00e9dition termin\u00e9e avec titre, date, programme, lieu et autorit\u00e9 v\u00e9rifi\u00e9s.", "Aucun registre CRAYS qualifiant"),
        item("Registre d'\u00e9dition 02", "R\u00e9serv\u00e9 aux sessions approuv\u00e9es avec sous-titres, consentement et source stable.", "Aucun registre CRAYS qualifiant"),
        item("Registre d'\u00e9dition 03", "R\u00e9serv\u00e9 \u00e0 une synth\u00e8se s\u00e9parant faits observ\u00e9s et projets.", "Aucun registre CRAYS qualifiant")
      ]
    },
    programme: {
      eyebrow: "ARCHITECTURE DU PROGRAMME", title: "Une journ\u00e9e compl\u00e8te se construit en chapitres, pas en affirmations.",
      lead: "Voici l'architecture d'information pr\u00e9vue pour un futur programme confirm\u00e9, pas une annonce. Chaque chapitre exige responsable, sujet, public, horaire et statut de publication.",
      note: "La s\u00e9quence est architecturale. Horaires, sessions et acc\u00e8s ne sont pas confirm\u00e9s.",
      items: [
        item("Arriv\u00e9e et orientation", "Acc\u00e8s, conduite, accessibilit\u00e9 et limites d'enregistrement sont publi\u00e9s ensemble.", "Responsable en attente"),
        item("Contexte d'ouverture", "Un h\u00f4te v\u00e9rifi\u00e9 cadre la question et les limites de la journ\u00e9e.", "H\u00f4te en attente"),
        item("Dialogue fondateurs-op\u00e9rateurs", "Publication seulement avec personnes, p\u00e9rim\u00e8tre et consentement approuv\u00e9s.", "Participants en attente"),
        item("Technologie et infrastructure", "Examine les syst\u00e8mes sans recommandation de produit ou d'investissement.", "Sujet en attente"),
        item("\u00c9conomie et institution", "Un chapitre mod\u00e9r\u00e9 teste les id\u00e9es avec des limites de preuve claires.", "Sujet en attente"),
        item("Communaut\u00e9 et lieu", "Les perspectives exigent une autorit\u00e9 v\u00e9rifi\u00e9e et n'impliquent aucune alliance.", "Autorit\u00e9 en attente"),
        item("Rencontres facilit\u00e9es", "Un intervalle peut faciliter le contact sans promettre introductions ou r\u00e9sultats.", "Format en attente"),
        item("Tables de travail", "Les petits groupes exigent capacit\u00e9, facilitation, r\u00e8gles et politique de trace.", "Format en attente"),
        item("Synth\u00e8se finale", "La cl\u00f4ture consigne ce qui est dit, ouvert et publiable.", "Approbation en attente")
      ]
    },
    speakers: {
      eyebrow: "R\u00d4LES D'INTERVENANTS", title: "La r\u00e9putation ne s'emprunte jamais.",
      lead: "La r\u00e9f\u00e9rence utilise une longue liste de noms comme preuve. CRAYS garde cette profondeur par des contr\u00f4les de r\u00f4le. Portrait, nom, biographie, logo et sujet restent bloqu\u00e9s avant identit\u00e9, autorit\u00e9, consentement et session.",
      gate: "Un r\u00f4le n'est pas une annonce d'intervenant.",
      items: [
        item("H\u00f4te de conf\u00e9rence", "Responsable de continuit\u00e9, limites et orientation."),
        item("Voix d'ouverture", "Cadre la question centrale avec un mandat v\u00e9rifi\u00e9."),
        item("Perspective fondatrice", "Partage l'exp\u00e9rience sans soutien implicite."),
        item("Praticien technologique", "Explique les syst\u00e8mes depuis un brief factuel approuv\u00e9."),
        item("Perspective institutionnelle", "Appara\u00eet seulement avec autorit\u00e9 et langage relationnel neutre."),
        item("Perspective \u00e9conomique", "S\u00e9pare analyse, promotion et conseil."),
        item("Pratique communautaire", "Relie l'exp\u00e9rience \u00e0 un contexte d\u00e9fini."),
        item("Voix du contexte local", "Parle dans une expertise et une autorit\u00e9 confirm\u00e9es."),
        item("Perspective de recherche", "Relie les affirmations aux sources et distingue l'opinion."),
        item("Perspective bien-\u00eatre", "\u00c9vite les all\u00e9gations de sant\u00e9 et fixe les limites."),
        item("Voix culture et m\u00e9dias", "Utilise oeuvres, attribution et autorisations approuv\u00e9es."),
        item("Mod\u00e9ration de table", "Responsable du temps, de l'\u00e9quit\u00e9, de la conduite et de la trace.")
      ]
    },
    audience: {
      eyebrow: "PARCOURS DU PUBLIC", title: "L'int\u00e9r\u00eat est le premier \u00e9tat, jamais une admission automatique.",
      lead: "Le parcours s\u00e9pare int\u00e9r\u00eat, examen, invitation, besoins d'acc\u00e8s et pr\u00e9sence afin d'\u00e9viter toute fausse promesse.",
      items: [
        item("Exprimer son int\u00e9r\u00eat", "Partager uniquement le contexte minimum pour un futur examen."),
        item("Examen du contexte", "CRAYS v\u00e9rifie pertinence, objectif et parcours adapt\u00e9."),
        item("Correspondance programme", "Un programme confirm\u00e9 est compar\u00e9 \u00e0 l'int\u00e9r\u00eat d\u00e9clar\u00e9."),
        item("D\u00e9cision d'invitation", "L'admission existe seulement apr\u00e8s confirmation distincte."),
        item("Pr\u00e9paration de l'acc\u00e8s", "Lieu, conduite, accessibilit\u00e9 et m\u00e9dias sont confirm\u00e9s avant l'arriv\u00e9e."),
        item("Apr\u00e8s l'\u00e9v\u00e9nement", "Les contenus approuv\u00e9s et corrections entrent dans une trace contr\u00f4l\u00e9e.")
      ]
    },
    venue: {
      eyebrow: "LIEU, INSTALLATIONS ET M\u00c9DIAS", title: "La salle doit \u00eatre aussi lisible que le programme.",
      lead: "Une page compl\u00e8te doit r\u00e9pondre \u00e0 ces fonctions. Leur liste n'affirme aucun lieu ni service s\u00e9curis\u00e9.",
      items: [
        item("Identit\u00e9 du lieu", "Publier l'adresse seulement apr\u00e8s confirmation de l'autorit\u00e9 et de l'usage public."),
        item("Parcours d'arriv\u00e9e", "Consigner transport, entr\u00e9e et fen\u00eatre sans promettre de disponibilit\u00e9."),
        item("Salle principale", "Confirmer plan, capacit\u00e9, visibilit\u00e9, son et op\u00e9rateur."),
        item("Salles de travail", "D\u00e9crire uniquement avec salles, facilitation et acc\u00e8s attribu\u00e9s."),
        item("Accessibilit\u00e9", "Publier les mesures v\u00e9rifi\u00e9es et un contact."),
        item("Repas et pauses", "Expliquer service confirm\u00e9, ingr\u00e9dients et limites alimentaires."),
        item("Enregistrement", "S\u00e9parer sc\u00e8ne, consentement, droits et publication."),
        item("Presse et cr\u00e9ateurs", "D\u00e9finir accr\u00e9ditation, zones, attribution et retrait."),
        item("M\u00e9dias distants", "Proposer un flux seulement apr\u00e8s plateforme, droits et support confirm\u00e9s.")
      ]
    },
    proof: {
      eyebrow: "PREUVE SOCIALE", title: "Un bloc silencieux est plus honn\u00eate qu'une citation emprunt\u00e9e.",
      lead: "La r\u00e9f\u00e9rence utilise chiffres, personnes et vid\u00e9os pour la confiance. CRAYS active cette surface seulement avec ses propres preuves v\u00e9rifi\u00e9es.",
      requirements: ["Source et autorit\u00e9 nomm\u00e9es", "Consentement du participant", "D\u00e9claration ou mesure exacte", "Droits et recadrage du m\u00e9dia", "Revue owner et retrait"],
      action: "Explorer Community Life"
    },
    interest: {
      eyebrow: "PARCOURS D'INT\u00c9R\u00caT", title: "Dites-nous ce que vous attendriez d'une conf\u00e9rence CRAYS.",
      lead: "Le formulaire consigne intention, r\u00f4le, sujet et besoins. L'envoi reste bloqu\u00e9 jusqu'\u00e0 approbation du responsable, de la finalit\u00e9, de la conservation, du endpoint s\u00e9curis\u00e9 et de la r\u00e9ponse.",
      unavailable: "L'envoi d'int\u00e9r\u00eat n'est pas actif. Cette impl\u00e9mentation ne transmet aucune donn\u00e9e personnelle.",
      fields: { name: "Nom", email: "E-mail", organisation: "Organisation ou communaut\u00e9", role: "Votre r\u00f4le", topic: "Question ou sujet", access: "Besoins d'accessibilit\u00e9 ou de participation", consent: "J'ai lu la future notice de donn\u00e9es" },
      submit: "Envoi pas encore ouvert", contact: "Utiliser le parcours Contact existant"
    },
    faq: {
      eyebrow: "QUESTIONS PRATIQUES", title: "Ce qui doit \u00eatre clair avant de d\u00e9cider.",
      items: [
        { question: "Combien de temps durera la conf\u00e9rence ?", answer: "Aucune dur\u00e9e n'est annonc\u00e9e. Une \u00e9dition doit publier d\u00e9but, fin, pauses, arriv\u00e9e et fuseau ensemble." },
        { question: "Quel format sera utilis\u00e9 ?", answer: "L'architecture permet conversations, travail et rencontres ; le format confirm\u00e9 sera publi\u00e9 s\u00e9par\u00e9ment." },
        { question: "Quels sujets seront abord\u00e9s ?", answer: "Seuls les chapitres approuv\u00e9s avec responsable et limite seront list\u00e9s. Aucun sujet ici n'est une session planifi\u00e9e." },
        { question: "Pourra-t-on rencontrer d'autres personnes ?", answer: "Une \u00e9dition peut faciliter le contact sans promettre pr\u00e9sentation, acc\u00e8s \u00e0 une personne ou r\u00e9sultat." },
        { question: "Quel lien entre Conference et CRAYS Clubs ?", answer: "Conference est un parcours distinct dans Clubs. Adh\u00e9sion, candidature, invitation et admission restent s\u00e9par\u00e9es." },
        { question: "Les sessions seront-elles enregistr\u00e9es ?", answer: "Ce n'est pas confirm\u00e9. Toute publication exige droits, information du public, sous-titres, stockage et registre approuv\u00e9." }
      ]
    }
  },
  pt: {
    localeName: "Portugu\u00eas",
    metaTitle: "Confer\u00eancia | CRAYS Clubs",
    metaDescription: "O percurso de confer\u00eancia CRAYS Clubs guiado por evid\u00eancia para programa, oradores, p\u00fablico, local e interesse.",
    shell: {
      languageName: "Portugu\u00eas", skip: "Saltar para o conte\u00fado da confer\u00eancia", home: "In\u00edcio CRAYS Clubs", nav: "Navega\u00e7\u00e3o principal",
      menu: "Menu", open: "Abrir menu", close: "Fechar menu", account: "Conta", language: "Idioma",
      title: "Explorar CRAYS Clubs", lead: "Forest City \u00e9 o nosso campus. Descubra pessoas, lugares e percursos por convite.",
      explore: "Explorar", belong: "Pertencer", company: "CRAYS Clubs", association: "CRAYS Association",
      associationLead: "A associa\u00e7\u00e3o independente faz parte do contexto CRAYS.", newTab: "abre num novo separador",
      footerLead: "Encontre amigos, colegas e parceiros no novo mundo Crays Club.", footerCta: "Reivindique a sua casa global",
      release: "Experi\u00eancia p\u00fablica de pr\u00e9-lan\u00e7amento. Sem promessa de reserva, pre\u00e7o, disponibilidade, investimento ou admiss\u00e3o.",
      links: { forest: "Forest City", community: "Vida comunit\u00e1ria", school: "Escola e empregos", ambassadors: "Ambassadors", families: "Fam\u00edlias", teams: "Equipas", events: "Eventos", companies: "Portfolio Companies", conference: "Confer\u00eancia", about: "Sobre n\u00f3s", lifestyle: "Estilo de vida", hospitality: "Hospitality", member: "Tornar-se membro", contact: "Contacto", brand: "Brand as a Service", account: "Conta", legal: "Legal" }
    },
    status: { blocked: "Bloqueado at\u00e9 existir evid\u00eancia", mediaBlocked: "Media oculto at\u00e9 registar direitos", requiresEvidence: "Requer confirma\u00e7\u00e3o documentada", notAnnounced: "N\u00e3o anunciado" },
    hero: {
      eyebrow: "CONFER\u00caNCIA CRAYS", title: "As ideias precisam de uma sala, um registo e das pessoas certas.",
      lead: "O percurso Conference da CRAYS est\u00e1 a ser concebido como encontro editorial no contexto Clubs. Programa, pessoas, local e acesso s\u00f3 aparecem quando cada facto estiver confirmado e aprovado.",
      primary: "Registar interesse", secondary: "Ler os limites de evid\u00eancia",
      boundary: "Esta p\u00e1gina n\u00e3o anuncia data, local, bilhete, orador, patrocinador, lota\u00e7\u00e3o ou admiss\u00e3o.",
      signals: ["Um programa coerente", "Apenas vozes confirmadas", "Contexto antes do acesso", "Um registo p\u00fablico utiliz\u00e1vel"]
    },
    archive: {
      eyebrow: "REGISTO P\u00daBLICO", title: "Uma edi\u00e7\u00e3o torna-se hist\u00f3ria apenas depois de acontecer.",
      lead: "A refer\u00eancia cria continuidade com edi\u00e7\u00f5es e grava\u00e7\u00f5es passadas. A CRAYS mant\u00e9 essa fun\u00e7\u00e3o numa arquitetura audit\u00e1vel sem inventar confer\u00eancias, n\u00fameros, playlists ou resultados.",
      mediaLabel: "Fun\u00e7\u00e3o de media de arquivo",
      items: [
        item("Registo de edi\u00e7\u00e3o 01", "Reservado para uma edi\u00e7\u00e3o terminada com t\u00edtulo, data, programa, local e autoridade verificados.", "Sem registo CRAYS qualific\u00e1vel"),
        item("Registo de edi\u00e7\u00e3o 02", "Reservado para sess\u00f5es aprovadas com legendas, consentimento e fonte est\u00e1vel.", "Sem registo CRAYS qualific\u00e1vel"),
        item("Registo de edi\u00e7\u00e3o 03", "Reservado para um resumo que separa factos observados de planos futuros.", "Sem registo CRAYS qualific\u00e1vel")
      ]
    },
    programme: {
      eyebrow: "ARQUITETURA DO PROGRAMA", title: "Um dia completo constr\u00f3i-se em cap\u00edtulos, n\u00e3o em afirma\u00e7\u00f5es.",
      lead: "Esta \u00e9 a arquitetura de informa\u00e7\u00e3o prevista para um futuro programa confirmado, n\u00e3o um an\u00fancio. Cada cap\u00edtulo requer respons\u00e1vel, tema, p\u00fablico, hor\u00e1rio e estado editorial.",
      note: "A sequ\u00eancia \u00e9 arquitet\u00f3nica. Hor\u00e1rios, sess\u00f5es e acesso n\u00e3o est\u00e3o confirmados.",
      items: [
        item("Chegada e orienta\u00e7\u00e3o", "Acesso, conduta, acessibilidade e limites de grava\u00e7\u00e3o s\u00e3o publicados juntos.", "Respons\u00e1vel pendente"),
        item("Contexto de abertura", "Um anfitri\u00e3o verificado enquadra a pergunta e os limites do dia.", "Anfitri\u00e3o pendente"),
        item("Di\u00e1logo de founders e operadores", "A conversa s\u00f3 \u00e9 publicada com pessoas, \u00e2mbito e consentimento aprovados.", "Participantes pendentes"),
        item("Tecnologia e infraestrutura", "Examina sistemas sem implicar recomenda\u00e7\u00e3o de produto ou investimento.", "Tema pendente"),
        item("Economia e institui\u00e7\u00e3o", "Um cap\u00edtulo moderado testa ideias com limites de evid\u00eancia claros.", "Tema pendente"),
        item("Comunidade e lugar", "As perspetivas exigem autoridade verificada e n\u00e3o implicam alian\u00e7as.", "Autoridade pendente"),
        item("Apresenta\u00e7\u00f5es facilitadas", "Um intervalo pode facilitar contacto sem prometer apresenta\u00e7\u00f5es ou resultados.", "Formato pendente"),
        item("Mesas de trabalho", "Os grupos exigem capacidade, facilita\u00e7\u00e3o, regras e pol\u00edtica de registo.", "Formato pendente"),
        item("S\u00edntese final", "O fecho regista o que foi dito, o que fica aberto e o que pode ser publicado.", "Aprova\u00e7\u00e3o pendente")
      ]
    },
    speakers: {
      eyebrow: "PAP\u00c9IS DE ORADORES", title: "A reputa\u00e7\u00e3o nunca \u00e9 emprestada.",
      lead: "A refer\u00eancia usa uma lista extensa de nomes como prova. A CRAYS mant\u00e9 a profundidade com controlos por papel. Retrato, nome, biografia, log\u00f3tipo e tema ficam bloqueados at\u00e9 identidade, autoridade, consentimento e sess\u00e3o estarem completos.",
      gate: "Um papel n\u00e3o \u00e9 um an\u00fancio de orador.",
      items: [
        item("Anfitri\u00e3o da confer\u00eancia", "Respons\u00e1vel pela continuidade, limites e orienta\u00e7\u00e3o."),
        item("Voz de abertura", "Enquadra a pergunta central com mandato verificado."),
        item("Perspetiva de founder", "Partilha experi\u00eancia sem apoio impl\u00edcito."),
        item("Profissional de tecnologia", "Explica sistemas a partir de um briefing factual aprovado."),
        item("Perspetiva institucional", "Aparece apenas com autoridade e linguagem relacional neutra."),
        item("Perspetiva econ\u00f3mica", "Separa an\u00e1lise de promo\u00e7\u00e3o ou aconselhamento."),
        item("Pr\u00e1tica comunit\u00e1ria", "Liga experi\u00eancia a um contexto definido."),
        item("Voz de contexto local", "Fala dentro de experi\u00eancia e autoridade confirmadas."),
        item("Perspetiva de investiga\u00e7\u00e3o", "Liga afirma\u00e7\u00f5es a fontes e distingue opini\u00e3o."),
        item("Perspetiva de bem-estar", "Evita alega\u00e7\u00f5es de sa\u00fade e define limites."),
        item("Voz cultural e media", "Usa obras, atribui\u00e7\u00e3o e permiss\u00f5es aprovadas."),
        item("Modera\u00e7\u00e3o de mesa", "Respons\u00e1vel por tempo, equidade, conduta e registo.")
      ]
    },
    audience: {
      eyebrow: "PERCURSO DO PARTICIPANTE", title: "O interesse \u00e9 o primeiro estado, nunca admiss\u00e3o autom\u00e1tica.",
      lead: "O percurso separa interesse, revis\u00e3o, convite, necessidades e presen\u00e7a para impedir promessas falsas.",
      items: [
        item("Expressar interesse", "Partilhar apenas o contexto m\u00ednimo para revis\u00e3o futura."),
        item("Revis\u00e3o de contexto", "A CRAYS verifica relev\u00e2ncia, objetivo e percurso adequado."),
        item("Correspond\u00eancia de programa", "Um programa confirmado \u00e9 comparado com o interesse declarado."),
        item("Decis\u00e3o de convite", "A admiss\u00e3o existe apenas ap\u00f3s confirma\u00e7\u00e3o separada."),
        item("Prepara\u00e7\u00e3o de acesso", "Local, conduta, acessibilidade e media s\u00e3o confirmados antes."),
        item("Ap\u00f3s o evento", "Materiais aprovados e corre\u00e7\u00f5es entram num registo controlado.")
      ]
    },
    venue: {
      eyebrow: "LOCAL, INSTALA\u00c7\u00d5ES E MEDIA", title: "A sala tem de ser t\u00e3o leg\u00edvel como o programa.",
      lead: "Estas fun\u00e7\u00f5es devem ser resolvidas numa p\u00e1gina completa. Enumer\u00e1-las n\u00e3o afirma local ou servi\u00e7o contratado.",
      items: [
        item("Identidade do local", "Publicar o local exato apenas ap\u00f3s confirmar autoridade e uso p\u00fablico."),
        item("Percurso de chegada", "Registar transporte, entrada e janela sem prometer disponibilidade."),
        item("Sala principal", "Confirmar layout, capacidade, visibilidade, som e operador."),
        item("Salas de trabalho", "Descrever apenas com espa\u00e7o, facilita\u00e7\u00e3o e acesso atribu\u00eddos."),
        item("Acessibilidade", "Publicar medidas verificadas e contacto."),
        item("Comida e pausas", "Explicar servi\u00e7o confirmado, ingredientes e limites alimentares."),
        item("Grava\u00e7\u00e3o", "Separar palco, consentimento, direitos e publica\u00e7\u00e3o."),
        item("Imprensa e criadores", "Definir acredita\u00e7\u00e3o, zonas, atribui\u00e7\u00e3o e retirada."),
        item("Media remoto", "Oferecer streaming apenas ap\u00f3s plataforma, direitos e suporte confirmados.")
      ]
    },
    proof: {
      eyebrow: "PROVA SOCIAL", title: "Um bloco silencioso \u00e9 mais honesto do que uma cita\u00e7\u00e3o emprestada.",
      lead: "A refer\u00eancia usa n\u00fameros, pessoas e grava\u00e7\u00f5es como confian\u00e7a. A CRAYS ativa esta superf\u00edcie apenas com evid\u00eancia pr\u00f3pria verificada.",
      requirements: ["Fonte e autoridade identificadas", "Consentimento do participante", "Afirma\u00e7\u00e3o ou medida exata", "Direitos e recorte do media", "Revis\u00e3o owner e retirada"],
      action: "Explorar Community Life"
    },
    interest: {
      eyebrow: "PERCURSO DE INTERESSE", title: "Diga-nos o que esperaria de uma confer\u00eancia CRAYS.",
      lead: "O formul\u00e1rio regista inten\u00e7\u00e3o, papel, tema e necessidades. O envio fica bloqueado at\u00e9 aprovar respons\u00e1vel, finalidade, reten\u00e7\u00e3o, endpoint seguro e resposta.",
      unavailable: "O envio de interesse n\u00e3o est\u00e1 ativo. Esta implementa\u00e7\u00e3o n\u00e3o transmite dados pessoais.",
      fields: { name: "Nome", email: "E-mail", organisation: "Organiza\u00e7\u00e3o ou comunidade", role: "O seu papel", topic: "Pergunta ou tema", access: "Necessidades de acessibilidade ou participa\u00e7\u00e3o", consent: "Li o futuro aviso de dados" },
      submit: "Envio ainda n\u00e3o aberto", contact: "Usar o percurso Contacto existente"
    },
    faq: {
      eyebrow: "PERGUNTAS PR\u00c1TICAS", title: "O que deve estar claro antes de decidir.",
      items: [
        { question: "Quanto tempo durar\u00e1 a confer\u00eancia?", answer: "N\u00e3o h\u00e1 dura\u00e7\u00e3o anunciada. Uma edi\u00e7\u00e3o publica in\u00edcio, fim, pausas, chegada e fuso juntos." },
        { question: "Qual ser\u00e1 o formato?", answer: "A arquitetura suporta conversas, trabalho e encontros; o formato confirmado ser\u00e1 publicado separadamente." },
        { question: "Que temas ser\u00e3o abordados?", answer: "Apenas cap\u00edtulos aprovados com respons\u00e1vel e limite ser\u00e3o listados. Nenhum tema aqui \u00e9 sess\u00e3o marcada." },
        { question: "Haver\u00e1 oportunidades para conhecer pessoas?", answer: "Uma edi\u00e7\u00e3o pode facilitar contacto sem prometer apresenta\u00e7\u00f5es, acesso ou resultados." },
        { question: "Como Conference se relaciona com CRAYS Clubs?", answer: "\u00c9 um percurso distinto dentro de Clubs. Ades\u00e3o, candidatura, convite e admiss\u00e3o ficam separados." },
        { question: "As sess\u00f5es ser\u00e3o gravadas?", answer: "N\u00e3o est\u00e1 confirmado. Publicar exige direitos, aviso, legendas, armazenamento e registo aprovado." }
      ]
    }
  },
  it: {
    localeName: "Italiano",
    metaTitle: "Conferenza | CRAYS Clubs",
    metaDescription: "Il percorso Conference di CRAYS Clubs guidato da evidenze per programma, speaker, pubblico, luogo e interesse.",
    shell: {
      languageName: "Italiano", skip: "Vai al contenuto della conferenza", home: "Home CRAYS Clubs", nav: "Navigazione principale",
      menu: "Menu", open: "Apri menu", close: "Chiudi menu", account: "Account", language: "Lingua",
      title: "Esplora CRAYS Clubs", lead: "Forest City \u00e8 il nostro campus. Scopri persone, luoghi e percorsi su invito.",
      explore: "Esplora", belong: "Appartenenza", company: "CRAYS Clubs", association: "CRAYS Association",
      associationLead: "L'associazione indipendente fa parte del contesto CRAYS.", newTab: "si apre in una nuova scheda",
      footerLead: "Incontra amici, colleghi e partner nel nuovo mondo Crays Club.", footerCta: "Rivendica la tua casa globale",
      release: "Esperienza pubblica pre-release. Nessuna promessa di prenotazione, prezzo, disponibilit\u00e0, investimento o ammissione.",
      links: { forest: "Forest City", community: "Vita di comunit\u00e0", school: "Scuola e lavoro", ambassadors: "Ambassadors", families: "Famiglie", teams: "Team", events: "Eventi", companies: "Portfolio Companies", conference: "Conferenza", about: "Chi siamo", lifestyle: "Lifestyle", hospitality: "Hospitality", member: "Diventa membro", contact: "Contatti", brand: "Brand as a Service", account: "Account", legal: "Note legali" }
    },
    status: { blocked: "Bloccato in attesa di evidenza", mediaBlocked: "Media nascosto finch\u00e9 i diritti non sono registrati", requiresEvidence: "Richiede conferma documentata", notAnnounced: "Non annunciato" },
    hero: {
      eyebrow: "CONFERENZA CRAYS", title: "Le idee hanno bisogno di una stanza, di una traccia e delle persone giuste.",
      lead: "Il percorso Conference di CRAYS \u00e8 progettato come incontro editoriale nel contesto Clubs. Programma, persone, luogo e accesso appariranno solo dopo conferma e approvazione di ogni fatto.",
      primary: "Registra interesse", secondary: "Leggi i limiti delle evidenze",
      boundary: "Questa pagina non annuncia data, luogo, biglietto, speaker, sponsor, capienza o ammissione.",
      signals: ["Un programma coerente", "Solo voci confermate", "Contesto prima dell'accesso", "Una traccia pubblica utilizzabile"]
    },
    archive: {
      eyebrow: "TRACCIA PUBBLICA", title: "Un'edizione diventa storia solo dopo essere avvenuta.",
      lead: "La pagina di riferimento crea continuit\u00e0 con edizioni e registrazioni passate. CRAYS conserva questa funzione in un'architettura verificabile senza inventare conferenze, numeri, playlist o risultati.",
      mediaLabel: "Ruolo media di archivio",
      items: [
        item("Registro edizione 01", "Riservato a un'edizione conclusa con titolo, data, programma, luogo e autorit\u00e0 verificati.", "Nessun registro CRAYS idoneo"),
        item("Registro edizione 02", "Riservato a sessioni approvate con sottotitoli, consenso e fonte stabile.", "Nessun registro CRAYS idoneo"),
        item("Registro edizione 03", "Riservato a una sintesi che separa fatti osservati e piani futuri.", "Nessun registro CRAYS idoneo")
      ]
    },
    programme: {
      eyebrow: "ARCHITETTURA DEL PROGRAMMA", title: "Una giornata completa si costruisce in capitoli, non con affermazioni.",
      lead: "Questa \u00e8 l'architettura informativa prevista per un futuro programma confermato, non un annuncio. Ogni capitolo richiede responsabile, tema, pubblico, orario e stato editoriale.",
      note: "La sequenza \u00e8 architettonica. Orari, sessioni e accesso non sono confermati.",
      items: [
        item("Arrivo e orientamento", "Accesso, condotta, accessibilit\u00e0 e limiti di registrazione sono pubblicati insieme.", "Responsabile in attesa"),
        item("Contesto di apertura", "Un host verificato inquadra domanda e limiti della giornata.", "Host in attesa"),
        item("Dialogo founder e operatori", "La conversazione esce solo con persone, ambito e consenso approvati.", "Partecipanti in attesa"),
        item("Tecnologia e infrastruttura", "Esamina sistemi senza implicare raccomandazioni di prodotto o investimento.", "Tema in attesa"),
        item("Economia e istituzione", "Un capitolo moderato verifica idee con limiti di evidenza chiari.", "Tema in attesa"),
        item("Comunit\u00e0 e luogo", "Le prospettive richiedono autorit\u00e0 verificata e non implicano alleanze.", "Autorit\u00e0 in attesa"),
        item("Incontri facilitati", "Un intervallo pu\u00f2 facilitare contatto senza promettere presentazioni o risultati.", "Formato in attesa"),
        item("Tavoli di lavoro", "I gruppi richiedono capienza, facilitazione, regole e politica di registrazione.", "Formato in attesa"),
        item("Sintesi finale", "La chiusura registra quanto detto, aperto e pubblicabile.", "Approvazione in attesa")
      ]
    },
    speakers: {
      eyebrow: "RUOLI DEGLI SPEAKER", title: "La reputazione non viene mai presa in prestito.",
      lead: "La pagina di riferimento usa un ampio elenco di nomi come prova. CRAYS mantiene la profondit\u00e0 con controlli per ruolo. Ritratto, nome, biografia, logo e tema restano bloccati fino a identit\u00e0, autorit\u00e0, consenso e sessione completi.",
      gate: "Un ruolo non \u00e8 un annuncio di speaker.",
      items: [
        item("Host della conferenza", "Responsabile di continuit\u00e0, limiti e orientamento."),
        item("Voce di apertura", "Inquadra la domanda centrale con mandato verificato."),
        item("Prospettiva founder", "Condivide esperienza senza endorsement implicito."),
        item("Professionista tecnologico", "Spiega sistemi da un briefing fattuale approvato."),
        item("Prospettiva istituzionale", "Appare solo con autorit\u00e0 e linguaggio relazionale neutro."),
        item("Prospettiva economica", "Separa analisi da promozione o consulenza."),
        item("Pratica comunitaria", "Collega esperienza a un contesto definito."),
        item("Voce del contesto locale", "Parla entro competenza e autorit\u00e0 confermate."),
        item("Prospettiva di ricerca", "Collega affermazioni a fonti e distingue opinione."),
        item("Prospettiva wellbeing", "Evita claim sanitari e definisce i limiti."),
        item("Voce cultura e media", "Usa opere, attribuzione e permessi approvati."),
        item("Moderazione tavolo", "Responsabile di tempo, equit\u00e0, condotta e registrazione.")
      ]
    },
    audience: {
      eyebrow: "PERCORSO DEL PUBBLICO", title: "L'interesse \u00e8 il primo stato, mai ammissione automatica.",
      lead: "Il percorso separa interesse, revisione, invito, esigenze e presenza per evitare false promesse.",
      items: [
        item("Esprimere interesse", "Condividere solo il contesto minimo per una futura revisione."),
        item("Revisione del contesto", "CRAYS verifica pertinenza, scopo e percorso corretto."),
        item("Corrispondenza programma", "Un programma confermato viene confrontato con l'interesse dichiarato."),
        item("Decisione di invito", "L'ammissione esiste solo dopo una conferma separata."),
        item("Preparazione accesso", "Luogo, condotta, accessibilit\u00e0 e media sono confermati prima."),
        item("Dopo l'evento", "Materiali approvati e correzioni entrano in una traccia controllata.")
      ]
    },
    venue: {
      eyebrow: "LUOGO, STRUTTURE E MEDIA", title: "La stanza deve essere leggibile quanto il programma.",
      lead: "Queste funzioni devono essere risolte in una pagina completa. Elencarle non afferma un luogo o un servizio assicurato.",
      items: [
        item("Identit\u00e0 del luogo", "Pubblicare il luogo esatto solo dopo conferma di autorit\u00e0 e uso pubblico."),
        item("Percorso di arrivo", "Registrare trasporto, ingresso e finestra senza promettere disponibilit\u00e0."),
        item("Sala principale", "Confermare layout, capienza, visuale, suono e operatore."),
        item("Sale di lavoro", "Descrivere solo con spazi, facilitazione e accesso assegnati."),
        item("Accessibilit\u00e0", "Pubblicare misure verificate e un contatto."),
        item("Cibo e pause", "Spiegare servizio confermato, ingredienti e limiti alimentari."),
        item("Registrazione", "Separare palco, consenso, diritti e pubblicazione."),
        item("Stampa e creator", "Definire accredito, aree, attribuzione e ritiro."),
        item("Media remoti", "Offrire streaming solo dopo conferma di piattaforma, diritti e supporto.")
      ]
    },
    proof: {
      eyebrow: "PROVA SOCIALE", title: "Un blocco silenzioso \u00e8 pi\u00f9 onesto di una citazione presa in prestito.",
      lead: "La pagina di riferimento usa numeri, persone e registrazioni come fiducia. CRAYS attiva questa superficie solo con evidenze proprie verificate.",
      requirements: ["Fonte e autorit\u00e0 nominate", "Consenso del partecipante", "Dichiarazione o misura esatta", "Diritti e crop del media", "Revisione owner e ritiro"],
      action: "Esplora Community Life"
    },
    interest: {
      eyebrow: "PERCORSO DI INTERESSE", title: "Raccontaci cosa vorresti da una conferenza CRAYS.",
      lead: "Il modulo registra intenzione, ruolo, tema ed esigenze. L'invio resta bloccato finch\u00e9 responsabile, finalit\u00e0, conservazione, endpoint sicuro e risposta non sono approvati.",
      unavailable: "L'invio di interesse non \u00e8 attivo. Questa implementazione non trasmette dati personali.",
      fields: { name: "Nome", email: "E-mail", organisation: "Organizzazione o comunit\u00e0", role: "Il tuo ruolo", topic: "Domanda o tema", access: "Esigenze di accessibilit\u00e0 o partecipazione", consent: "Ho letto la futura informativa dati" },
      submit: "Invio non ancora aperto", contact: "Usa il percorso Contatti esistente"
    },
    faq: {
      eyebrow: "DOMANDE PRATICHE", title: "Cosa deve essere chiaro prima di decidere.",
      items: [
        { question: "Quanto durer\u00e0 la conferenza?", answer: "Non \u00e8 annunciata una durata. Un'edizione deve pubblicare inizio, fine, pause, arrivo e fuso insieme." },
        { question: "Quale formato verr\u00e0 usato?", answer: "L'architettura supporta conversazioni, lavoro e incontri; il formato confermato sar\u00e0 pubblicato separatamente." },
        { question: "Quali temi saranno trattati?", answer: "Saranno elencati solo capitoli approvati con responsabile e limite. Nessun tema qui \u00e8 una sessione programmata." },
        { question: "Ci saranno occasioni per incontrare persone?", answer: "Un'edizione pu\u00f2 facilitare contatto senza promettere presentazioni, accesso o risultati." },
        { question: "Come si collega Conference a CRAYS Clubs?", answer: "\u00c8 un percorso distinto dentro Clubs. Membership, candidatura, invito e ammissione restano separati." },
        { question: "Le sessioni saranno registrate?", answer: "Non \u00e8 confermato. Pubblicare richiede diritti, avviso, sottotitoli, regole di conservazione e registro approvato." }
      ]
    }
  }
};
