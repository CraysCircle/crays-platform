import * as legacyConferenceCopyModule from "../journeys-phase8/conference-copy";

export const conferenceLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
export type ConferenceLocale = (typeof conferenceLocales)[number];

type Pair = { title: string; text: string };
type Gate = { label: string; title: string; text: string; gate: string };

export type ConferencePublicCopy = {
  metaTitle: string;
  metaDescription: string;
  mediaNotice: string;
  navLabel: string;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    status: string;
    primary: string;
    secondary: string;
    caption: string;
    signalLabel: string;
    signalValue: string;
  };
  nav: Array<{ href: string; label: string }>;
  archive: {
    kicker: string;
    title: string;
    lead: string;
    items: Gate[];
    playerLabel: string;
    playerText: string;
    playerButton: string;
  };
  programme: {
    kicker: string;
    title: string;
    lead: string;
    boundary: string;
    items: Pair[];
    caption: string;
  };
  speakers: {
    kicker: string;
    title: string;
    lead: string;
    gate: string;
    roles: string[];
    roleGate: string;
  };
  audience: { kicker: string; title: string; lead: string; items: Pair[] };
  participation: { kicker: string; title: string; lead: string; items: Pair[]; caption: string };
  practical: { kicker: string; title: string; lead: string; items: Pair[] };
  recording: { kicker: string; title: string; text: string; caption: string };
  form: {
    kicker: string;
    title: string;
    lead: string;
    gate: string;
    fields: string[];
    consent: string;
    submit: string;
    contact: string;
  };
  faq: {
    kicker: string;
    title: string;
    lead: string;
    permalink: string;
    items: Array<{ question: string; answer: string }>;
  };
  closing: { kicker: string; title: string; text: string; primary: string; secondary: string };
  alts: Record<"heroVenue" | "archiveStage" | "archivePanel" | "networking" | "recording" | "arrival", string>;
};

const en: ConferencePublicCopy = {
  metaTitle: "Conference | CRAYS Clubs",
  metaDescription: "The evidence-gated CRAYS Conference journey: purpose, programme architecture, voice roles, participation states and practical questions.",
  mediaNotice: "Licensed editorial reference, not documentation of a CRAYS event.",
  navLabel: "Conference page sections",
  hero: {
    eyebrow: "CRAYS Clubs / Conference",
    title: "A room for ideas that need people around them.",
    lead: "This page defines the complete shape of a future CRAYS Conference: a concentrated editorial gathering for builders, operators, community leaders and curious members. No date, venue, programme, speaker, ticket or seat is announced here.",
    status: "Conference status: concept and participation journey only",
    primary: "Explore the evidence archive",
    secondary: "Understand the request path",
    caption: "Venue-function reference: a shared-stage setting, not a confirmed CRAYS location.",
    signalLabel: "Current public state",
    signalValue: "No edition is open"
  },
  nav: [
    { href: "#archive", label: "Evidence archive" },
    { href: "#programme", label: "Programme architecture" },
    { href: "#voices", label: "Voices" },
    { href: "#participation", label: "Participation" },
    { href: "#questions", label: "Questions" }
  ],
  archive: {
    kicker: "Published record",
    title: "A conference earns an archive after it happens.",
    lead: "A credible event page should let people inspect previous editions, watch authorised sessions and follow a published record. CRAYS has not supplied approved evidence for a past Conference edition, so all three archive functions remain visible without pretending an edition, audience or recording exists.",
    items: [
      { label: "Archive position 01", title: "Edition overview", text: "This position will hold the dated edition narrative, verified location, approved programme and accountable source links only after an edition is formally announced and completed.", gate: "Blocked: no approved CRAYS Conference edition record." },
      { label: "Archive position 02", title: "Session library", text: "This position preserves the function of a watchable talk and conversation library, including captions, participants, subjects and recording rights.", gate: "Blocked: no authorised CRAYS recordings or publication rights." },
      { label: "Archive position 03", title: "Public report", text: "This position is reserved for a factual post-event report with measured participation, documented outcomes and a correction path.", gate: "Blocked: no verified report, attendance count or outcome evidence." }
    ],
    playerLabel: "Session-player role",
    playerText: "Playback stays unavailable until a real session, consent record, rights clearance, captions and hosting destination are approved.",
    playerButton: "Playback unavailable"
  },
  programme: {
    kicker: "Programme architecture",
    title: "Dense enough to matter. Open enough for real exchange.",
    lead: "The public reference uses a concentrated format built from talks, breaks and encounters. The CRAYS counterpart preserves every function while refusing to publish a fictional schedule. These are programme roles, not announced sessions or times.",
    boundary: "No date, duration, running order or session availability has been approved.",
    items: [
      { title: "Opening context", text: "A concise shared frame would explain why the room has gathered, which facts are confirmed and which questions remain open." },
      { title: "Short stage contributions", text: "Focused presentations would carry one clear idea each, with identity, remit and claims checked before publication." },
      { title: "Moderated conversations", text: "Contrasting perspectives would enter dialogue rather than appear as endorsements or predetermined agreement." },
      { title: "Working-room exchange", text: "Smaller sessions would turn broad themes into questions, examples and next steps without promising deals, jobs or access." },
      { title: "Pause and peer contact", text: "Unprogrammed time would support introductions and reflection; meeting a person or obtaining an outcome could never be guaranteed." },
      { title: "Closing synthesis", text: "The close would separate what was learned, what was proposed and what still requires evidence or a decision." }
    ],
    caption: "Exchange-role reference: conversation during a third-party conference break."
  },
  speakers: {
    kicker: "Voices in the room",
    title: "The roster is a responsibility, not decoration.",
    lead: "The source page uses a deep portrait roster to show who carries the programme. CRAYS preserves twenty-four equally visible roster positions, but no person is named, pictured or implied until identity, remit, consent and programme status are approved.",
    gate: "Speaker roster blocked pending confirmed people, consent and programme evidence.",
    roles: ["Opening-frame voice", "Founder perspective", "Community operator", "Technology builder", "Place and city practitioner", "Remote-work leader", "Creative and cultural voice", "Hospitality operator", "Learning facilitator", "Movement and wellbeing practitioner", "Association perspective", "Local ecosystem voice", "Global member perspective", "Critical respondent", "Roundtable moderator", "Workshop facilitator", "Editorial interviewer", "Operational case owner", "Research perspective", "Public-interest questioner", "Host-company perspective", "Independent maker", "Future-of-work practitioner", "Closing synthesis voice"],
    roleGate: "Role only / person not announced"
  },
  audience: {
    kicker: "Who the journey is for",
    title: "Arrive with a question, not a promised outcome.",
    lead: "The Conference function connects people who build, host, operate, study or challenge new ways of working and belonging. Participation would create a shared room, not automatic membership, investment, employment, partnership or commercial access.",
    items: [
      { title: "Builders and operators", text: "People carrying real products, services, teams or places can bring evidence and practical questions." },
      { title: "Community stewards", text: "People responsible for participation, culture and trust can compare methods without turning experience into a guarantee." },
      { title: "Independent practitioners", text: "Researchers, creatives and specialists can contribute a clear point of view when their role is confirmed." },
      { title: "Curious members and guests", text: "People exploring the subject can follow the public information and use the same transparent request path." }
    ]
  },
  participation: {
    kicker: "Participation states",
    title: "Interest is not admission, and admission is not payment.",
    lead: "Every transition remains separate so nobody mistakes a form, referral or message for a confirmed place.",
    items: [
      { title: "Discovery", text: "Read the public purpose, evidence, boundaries and practical information without creating a participation claim." },
      { title: "Application or request", text: "A future authorised form may collect interest and access needs; submission would only create a request record." },
      { title: "Team review", text: "The CRAYS team would assess the request against published edition criteria. No automatic approval is implied." },
      { title: "Invitation or admission", text: "Only an explicit CRAYS decision could create an invitation or admission state, with its own terms and scope." },
      { title: "Registration", text: "An admitted person may then be asked to confirm details. Registration remains distinct from the request." },
      { title: "Ticket or payment", text: "Any ticket or payment step needs separately approved price, tax, refund, payment and provider authority. None exists here." },
      { title: "Check-in", text: "Arrival verification would occur only for a confirmed edition and registered participant; prior states cannot imply it." }
    ],
    caption: "Registration-role reference: a third-party check-in scene, not an open CRAYS registration."
  },
  practical: {
    kicker: "Practical layer",
    title: "A venue claim begins with verified facts.",
    lead: "The page reserves every practical function people need before deciding whether to travel or participate. Each surface stays pending until an edition and location are authorised.",
    items: [
      { title: "Location and access", text: "Exact address, entry route, transport context and local access information require a confirmed venue." },
      { title: "Stage and sightlines", text: "Room layout, capacity, seating and visibility must be evidenced rather than inferred from reference imagery." },
      { title: "Breakout spaces", text: "Working-room availability, access and session allocation remain programme decisions." },
      { title: "Food and breaks", text: "Catering, dietary handling, break timing and included services are not currently announced." },
      { title: "Accessibility", text: "Step-free access, hearing, sensory, seating and assistance information must be venue-specific and verified." },
      { title: "Remote participation", text: "Streaming, recording, captions, replay and remote access are not promised until rights and delivery are approved." }
    ]
  },
  recording: {
    kicker: "Recording and publication",
    title: "A camera does not create permission.",
    text: "Recording would require speaker and participant consent, a defined capture policy, accessibility work, publication rights, hosting authority and a correction path. Until those controls exist, this page does not promise live viewing, replay or a public video library.",
    caption: "Production-role reference: third-party recording equipment, not a CRAYS media operation."
  },
  form: {
    kicker: "Interest request",
    title: "The complete request surface is visible, but submission is closed.",
    lead: "The fields show what a responsible request could need. They do not collect data because no approved controller, privacy notice, endpoint, retention schedule, response owner or edition-specific purpose has been demonstrated.",
    gate: "Submission disabled pending backend, privacy, controller, retention and response authority.",
    fields: ["Full name", "Email address", "Organisation or community", "Your role or perspective", "Question, topic or contribution", "Accessibility or participation needs"],
    consent: "I have read the edition-specific privacy information and understand the request state.",
    submit: "Request submission unavailable",
    contact: "Use the general contact page"
  },
  faq: {
    kicker: "Practical questions",
    title: "What can be said before an edition exists.",
    lead: "These answers preserve the full decision function of the public reference while separating a future format from current facts.",
    permalink: "Link to this answer",
    items: [
      { question: "How long would the Conference run?", answer: "No edition date or duration is confirmed. A future announcement must publish arrival, opening, breaks, closing and departure information together, rather than exposing an isolated headline time." },
      { question: "What would the format be?", answer: "The intended architecture combines concise stage contributions, moderated conversations, working-room exchange and real pauses. It is not a published schedule, and the final format may only be described after approval." },
      { question: "Which subjects would be covered?", answer: "The editorial scope may examine business communities, technology, work, place, learning, culture and practical operations. Named sessions and claims require confirmed contributors and evidence." },
      { question: "Would I be able to meet other participants?", answer: "A conference can create room for conversation through breaks and smaller sessions, but CRAYS cannot guarantee a meeting, introduction, business result or access to any person." },
      { question: "How does this relate to CRAYS Clubs?", answer: "Conference is a distinct editorial participation journey inside the Clubs ecosystem. A request, attendance or contribution would not itself create membership, admission to another programme or a commercial relationship." },
      { question: "Would sessions be recorded or available remotely?", answer: "No recording, stream or replay is currently confirmed. Any future media offer would require consent, rights, captions, hosting, access conditions and an explicit publication decision." }
    ]
  },
  closing: {
    kicker: "Stay with the evidence",
    title: "The next edition starts with an authorised fact, not a countdown.",
    text: "Until CRAYS publishes an edition, this page remains the transparent map of purpose, programme roles and participation boundaries. General questions can use the existing contact route; no conference place is created there.",
    primary: "Contact CRAYS Clubs",
    secondary: "Return to Community Life"
  },
  alts: {
    heroVenue: "Auditorium illustrating the venue role of a future conference",
    archiveStage: "Third-party conference stage illustrating an edition archive",
    archivePanel: "Third-party panel illustrating a session-library format",
    networking: "People exchanging ideas during a third-party conference break",
    recording: "Camera setup illustrating recording and publication decisions",
    arrival: "Third-party registration desk illustrating the check-in state"
  }
};

const de: ConferencePublicCopy = {
  ...en,
  metaTitle: "Konferenz | CRAYS Clubs",
  metaDescription: "Die evidenzgebundene CRAYS-Conference-Journey mit Zweck, Programmarchitektur, Stimmen, Teilnahmestufen und praktischen Fragen.",
  mediaNotice: "Lizenzierte redaktionelle Referenz, keine Dokumentation einer CRAYS-Veranstaltung.",
  navLabel: "Abschnitte der Konferenzseite",
  hero: {
    eyebrow: "CRAYS Clubs / Konferenz",
    title: "Ein Raum für Ideen, die Menschen um sich brauchen.",
    lead: "Diese Seite definiert die vollständige Form einer künftigen CRAYS Conference: ein konzentriertes redaktionelles Treffen für Gestaltende, Betreiber, Community-Verantwortliche und neugierige Mitglieder. Hier sind weder Datum noch Ort, Programm, Sprecher, Ticket oder Platz angekündigt.",
    status: "Konferenzstatus: nur Konzept und Teilnahmeweg",
    primary: "Evidenzarchiv erkunden",
    secondary: "Anfrageweg verstehen",
    caption: "Referenz für die Ortsfunktion: eine gemeinsame Bühne, kein bestätigter CRAYS-Ort.",
    signalLabel: "Aktueller öffentlicher Stand",
    signalValue: "Keine Ausgabe geöffnet"
  },
  nav: [{ href: "#archive", label: "Evidenzarchiv" }, { href: "#programme", label: "Programmarchitektur" }, { href: "#voices", label: "Stimmen" }, { href: "#participation", label: "Teilnahme" }, { href: "#questions", label: "Fragen" }],
  archive: {
    kicker: "Veröffentlichter Nachweis",
    title: "Ein Archiv entsteht erst, nachdem eine Konferenz stattgefunden hat.",
    lead: "Eine glaubwürdige Veranstaltungsseite muss frühere Ausgaben prüfbar machen, autorisierte Sessions zeigen und auf veröffentlichte Nachweise verweisen. Für eine vergangene CRAYS Conference liegt keine freigegebene Evidenz vor; deshalb bleiben drei Archivfunktionen sichtbar, ohne Ausgabe, Publikum oder Aufzeichnung vorzutäuschen.",
    items: [
      { label: "Archivposition 01", title: "Ausgabenübersicht", text: "Hier können erst nach formaler Ankündigung und Abschluss Datum, bestätigter Ort, freigegebenes Programm und verantwortbare Quellen stehen.", gate: "Blockiert: kein freigegebener Datensatz einer CRAYS Conference." },
      { label: "Archivposition 02", title: "Session-Bibliothek", text: "Hier bleibt die Funktion einer abrufbaren Bibliothek mit Gesprächen, Untertiteln, Beteiligten, Themen und dokumentierten Medienrechten erhalten.", gate: "Blockiert: keine autorisierten CRAYS-Aufzeichnungen oder Publikationsrechte." },
      { label: "Archivposition 03", title: "Öffentlicher Bericht", text: "Dieser Platz ist für einen sachlichen Abschlussbericht mit gemessener Teilnahme, belegten Ergebnissen und einem Korrekturweg reserviert.", gate: "Blockiert: kein verifizierter Bericht, keine Teilnehmerzahl, keine Ergebnisevidenz." }
    ],
    playerLabel: "Rolle des Session-Players",
    playerText: "Wiedergabe bleibt gesperrt, bis reale Session, Einwilligungen, Rechte, Untertitel und Hostingziel freigegeben sind.",
    playerButton: "Wiedergabe nicht verfügbar"
  },
  programme: {
    kicker: "Programmarchitektur",
    title: "Dicht genug, um relevant zu sein. Offen genug für echten Austausch.",
    lead: "Die öffentliche Referenz arbeitet mit konzentrierten Beiträgen, Pausen und Begegnungen. Das CRAYS-Gegenstück bewahrt jede Funktion, veröffentlicht aber keinen erfundenen Zeitplan. Dies sind Programmrollen, keine angekündigten Sessions oder Uhrzeiten.",
    boundary: "Datum, Dauer, Ablauf und Session-Verfügbarkeit sind nicht freigegeben.",
    items: [
      { title: "Gemeinsamer Auftakt", text: "Ein kurzer Rahmen würde Zweck, bestätigte Fakten und offene Fragen für alle im Raum trennen." },
      { title: "Kurze Bühnenbeiträge", text: "Jeder fokussierte Beitrag würde eine klare Idee tragen; Identität, Auftrag und Aussagen müssten vorab geprüft sein." },
      { title: "Moderierte Gespräche", text: "Unterschiedliche Perspektiven würden in Dialog treten, ohne Zustimmung oder vorbestimmten Konsens zu behaupten." },
      { title: "Austausch in Arbeitsräumen", text: "Kleinere Formate würden aus großen Themen Fragen, Beispiele und nächste Schritte machen, ohne Geschäfte, Jobs oder Zugang zu versprechen." },
      { title: "Pause und Begegnung", text: "Unverplante Zeit könnte Vorstellungen und Reflexion ermöglichen; eine bestimmte Begegnung oder ein Ergebnis wäre nie garantiert." },
      { title: "Abschließende Synthese", text: "Zum Ende würden Erkenntnisse, Vorschläge und weiterhin evidenz- oder entscheidungsbedürftige Punkte sauber getrennt." }
    ],
    caption: "Referenz für Austausch: Gespräch während der Pause einer fremden Konferenz."
  },
  speakers: {
    kicker: "Stimmen im Raum",
    title: "Die Besetzung ist Verantwortung, nicht Dekoration.",
    lead: "Die Quellseite zeigt mit einem tiefen Porträtraster, wer das Programm trägt. CRAYS erhält vierundzwanzig gleich sichtbare Positionen, nennt oder bebildert aber niemanden, bevor Identität, Auftrag, Einwilligung und Programmstatus freigegeben sind.",
    gate: "Sprecherliste blockiert, bis Personen, Einwilligungen und Programm belegt sind.",
    roles: ["Stimme für den Auftakt", "Gründerperspektive", "Community-Betrieb", "Technologieentwicklung", "Orts- und Stadtpraxis", "Remote-Work-Perspektive", "Kreative und kulturelle Stimme", "Hospitality-Betrieb", "Lernbegleitung", "Bewegung und Wohlbefinden", "Association-Perspektive", "Lokales Ökosystem", "Globale Mitgliederperspektive", "Kritische Erwiderung", "Roundtable-Moderation", "Workshop-Begleitung", "Redaktionelles Interview", "Operative Fallverantwortung", "Forschungsperspektive", "Frage im öffentlichen Interesse", "Host-Company-Perspektive", "Unabhängige Gestaltung", "Zukunft-der-Arbeit-Praxis", "Abschließende Synthese"],
    roleGate: "Nur Rolle / Person nicht angekündigt"
  },
  audience: {
    kicker: "Für wen der Weg gedacht ist",
    title: "Mit einer Frage ankommen, nicht mit einem versprochenen Ergebnis.",
    lead: "Die Konferenzfunktion verbindet Menschen, die neue Formen von Arbeit und Zugehörigkeit aufbauen, betreiben, beherbergen, untersuchen oder hinterfragen. Teilnahme schafft einen gemeinsamen Raum, aber nicht automatisch Mitgliedschaft, Investment, Beschäftigung, Partnerschaft oder Geschäftszugang.",
    items: [
      { title: "Gestaltende und Betreiber", text: "Menschen mit realen Produkten, Diensten, Teams oder Orten können Evidenz und praktische Fragen einbringen." },
      { title: "Community-Verantwortliche", text: "Verantwortliche für Teilhabe, Kultur und Vertrauen können Methoden vergleichen, ohne Erfahrung als Garantie auszugeben." },
      { title: "Unabhängige Praktiker", text: "Forschende, Kreative und Spezialisten können nach bestätigter Rolle einen klaren Standpunkt beitragen." },
      { title: "Neugierige Mitglieder und Gäste", text: "Interessierte können die öffentlichen Informationen prüfen und denselben transparenten Anfrageweg nutzen." }
    ]
  },
  participation: {
    kicker: "Teilnahmestufen",
    title: "Interesse ist keine Zulassung, und Zulassung ist keine Zahlung.",
    lead: "Jeder Übergang bleibt getrennt, damit niemand Formular, Empfehlung oder Nachricht mit einem bestätigten Platz verwechselt.",
    items: [
      { title: "Entdeckung", text: "Öffentlichen Zweck, Evidenz, Grenzen und praktische Angaben lesen, ohne einen Teilnahmeanspruch zu erzeugen." },
      { title: "Bewerbung oder Anfrage", text: "Ein später autorisiertes Formular könnte Interesse und Zugangsbedarfe erfassen; Absenden würde nur einen Anfragedatensatz erzeugen." },
      { title: "Teamprüfung", text: "Das CRAYS-Team würde anhand veröffentlichter Kriterien prüfen. Eine automatische Freigabe ist ausgeschlossen." },
      { title: "Einladung oder Zulassung", text: "Nur eine ausdrückliche CRAYS-Entscheidung könnte Einladung oder Zulassung mit eigenem Umfang erzeugen." },
      { title: "Registrierung", text: "Eine zugelassene Person könnte anschließend Angaben bestätigen; Registrierung bleibt von der Anfrage getrennt." },
      { title: "Ticket oder Zahlung", text: "Jeder Schritt braucht separat freigegebene Preise, Steuern, Erstattung, Zahlungslogik und Provider-Autorität. Hier besteht nichts davon." },
      { title: "Check-in", text: "Die Ankunftsprüfung wäre nur bei bestätigter Ausgabe und registrierter Person möglich und folgt nicht aus früheren Stufen." }
    ],
    caption: "Registrierungsreferenz: fremde Check-in-Szene, keine offene CRAYS-Registrierung."
  },
  practical: {
    kicker: "Praktische Ebene",
    title: "Eine Ortsaussage beginnt mit verifizierten Fakten.",
    lead: "Die Seite reserviert jede praktische Funktion, die vor Reise oder Teilnahme nötig ist. Alles bleibt bis zu einer autorisierten Ausgabe und einem bestätigten Ort ausstehend.",
    items: [
      { title: "Ort und Zugang", text: "Adresse, Eingang, Verkehrskontext und lokale Hinweise benötigen einen bestätigten Veranstaltungsort." },
      { title: "Bühne und Sicht", text: "Raumaufbau, Kapazität, Bestuhlung und Sicht müssen belegt statt aus Referenzbildern abgeleitet werden." },
      { title: "Arbeitsräume", text: "Verfügbarkeit, Zugang und Zuordnung kleinerer Räume bleiben Programmentscheidungen." },
      { title: "Essen und Pausen", text: "Catering, Ernährungsbedarfe, Pausenzeiten und enthaltene Leistungen sind nicht angekündigt." },
      { title: "Barrierefreiheit", text: "Stufenfreiheit, Hör-, sensorische, Sitz- und Unterstützungsinformationen müssen ortsspezifisch belegt sein." },
      { title: "Remote-Teilnahme", text: "Streaming, Aufnahme, Untertitel, Replay und Fernzugang sind ohne Rechte- und Delivery-Freigabe nicht versprochen." }
    ]
  },
  recording: {
    kicker: "Aufnahme und Veröffentlichung",
    title: "Eine Kamera erzeugt keine Erlaubnis.",
    text: "Aufnahmen bräuchten Einwilligungen, eine definierte Capture-Policy, Barrierefreiheitsarbeit, Publikationsrechte, Hosting-Autorität und einen Korrekturweg. Bis dahin verspricht diese Seite weder Livezugang noch Replay oder Videobibliothek.",
    caption: "Produktionsreferenz: fremdes Aufnahmeequipment, kein CRAYS-Medienbetrieb."
  },
  form: {
    kicker: "Interessenanfrage",
    title: "Die vollständige Anfragefläche ist sichtbar, aber das Absenden bleibt geschlossen.",
    lead: "Die Felder zeigen den Bedarf einer verantwortlichen Anfrage. Sie erheben keine Daten, weil kein freigegebener Verantwortlicher, Datenschutzhinweis, Endpoint, Aufbewahrungsplan, Antwort-Owner oder ausgabenspezifischer Zweck belegt ist.",
    gate: "Absenden blockiert bis Backend, Datenschutz, Verantwortlichkeit, Aufbewahrung und Antwortprozess autorisiert sind.",
    fields: ["Vollständiger Name", "E-Mail-Adresse", "Organisation oder Community", "Ihre Rolle oder Perspektive", "Frage, Thema oder Beitrag", "Barrierefreiheits- oder Teilnahmebedarf"],
    consent: "Ich habe die ausgabenspezifischen Datenschutzinformationen gelesen und verstehe den Anfragestatus.",
    submit: "Anfrage nicht verfügbar",
    contact: "Allgemeine Kontaktseite nutzen"
  },
  faq: {
    kicker: "Praktische Fragen",
    title: "Was gesagt werden kann, bevor eine Ausgabe existiert.",
    lead: "Diese Antworten erhalten die vollständige Entscheidungsfunktion der Referenz und trennen künftiges Format von heutigen Fakten.",
    permalink: "Link zu dieser Antwort",
    items: [
      { question: "Wie lange würde die Conference dauern?", answer: "Datum und Dauer sind nicht bestätigt. Eine künftige Ankündigung muss Ankunft, Beginn, Pausen, Abschluss und Abreise gemeinsam veröffentlichen statt einer isolierten Uhrzeit." },
      { question: "Welches Format wäre vorgesehen?", answer: "Die beabsichtigte Architektur kombiniert kurze Bühnenbeiträge, moderierte Gespräche, Arbeitsräume und echte Pausen. Sie ist kein publizierter Ablauf; das finale Format darf erst nach Freigabe beschrieben werden." },
      { question: "Welche Themen würden behandelt?", answer: "Der redaktionelle Rahmen kann Business-Communities, Technologie, Arbeit, Ort, Lernen, Kultur und praktische Betriebsfragen untersuchen. Benannte Sessions und Aussagen brauchen bestätigte Beteiligte und Evidenz." },
      { question: "Könnte ich andere Teilnehmende treffen?", answer: "Eine Konferenz kann durch Pausen und kleine Formate Raum für Gespräche schaffen. CRAYS garantiert aber weder Treffen, Vorstellung, Geschäftsergebnis noch Zugang zu einer Person." },
      { question: "Wie gehört das zu CRAYS Clubs?", answer: "Conference ist ein eigener redaktioneller Teilnahmeweg im Clubs-Ökosystem. Anfrage, Besuch oder Beitrag schaffen allein weder Mitgliedschaft noch Zulassung zu einem anderen Programm oder eine Geschäftsbeziehung." },
      { question: "Würden Sessions aufgenommen oder remote verfügbar?", answer: "Aufnahme, Stream und Replay sind nicht bestätigt. Jedes spätere Medienangebot bräuchte Einwilligung, Rechte, Untertitel, Hosting, Zugangsregeln und eine ausdrückliche Publikationsentscheidung." }
    ]
  },
  closing: {
    kicker: "Bei der Evidenz bleiben",
    title: "Die nächste Ausgabe beginnt mit einer autorisierten Tatsache, nicht mit einem Countdown.",
    text: "Bis CRAYS eine Ausgabe veröffentlicht, bleibt diese Seite die transparente Karte für Zweck, Programmrollen und Teilnahmegrenzen. Allgemeine Fragen können den bestehenden Kontaktweg nutzen; dort entsteht kein Konferenzplatz.",
    primary: "CRAYS Clubs kontaktieren",
    secondary: "Zurück zu Community Life"
  },
  alts: {
    heroVenue: "Auditorium als Referenz für die Ortsfunktion einer künftigen Konferenz",
    archiveStage: "Fremde Konferenzbühne als Referenz für ein Ausgabenarchiv",
    archivePanel: "Fremdes Panel als Referenz für eine Session-Bibliothek",
    networking: "Menschen im Austausch während einer fremden Konferenzpause",
    recording: "Kameraaufbau als Referenz für Aufnahme- und Publikationsentscheidungen",
    arrival: "Fremder Registrierungsbereich als Referenz für den Check-in-Status"
  }
};

function spanishVariant(localeName: "es" | "ca"): ConferencePublicCopy {
  const catalan = localeName === "ca";
  return {
    ...en,
    metaTitle: catalan ? "Conferència | CRAYS Clubs" : "Conferencia | CRAYS Clubs",
    metaDescription: catalan
      ? "El recorregut CRAYS Conference basat en evidències: propòsit, arquitectura, veus, estats i preguntes pràctiques."
      : "El recorrido CRAYS Conference sujeto a evidencias: propósito, arquitectura, voces, estados y preguntas prácticas.",
    mediaNotice: catalan ? "Referència editorial amb llicència; no documenta un esdeveniment CRAYS." : "Referencia editorial con licencia; no documenta un evento CRAYS.",
    navLabel: catalan ? "Seccions de la pàgina de conferència" : "Secciones de la página de conferencia",
    hero: catalan ? {
      eyebrow: "CRAYS Clubs / Conferència",
      title: "Una sala per a idees que necessiten persones al voltant.",
      lead: "Aquesta pàgina defineix la forma completa d'una futura CRAYS Conference: una trobada editorial concentrada per a creadors, operadors, responsables de comunitat i membres curiosos. Aquí no s'anuncien data, seu, programa, ponent, entrada ni plaça.",
      status: "Estat: només concepte i recorregut de participació",
      primary: "Explorar l'arxiu d'evidències",
      secondary: "Entendre la ruta de sol·licitud",
      caption: "Referència de la funció de seu: escenari compartit, no ubicació CRAYS confirmada.",
      signalLabel: "Estat públic actual",
      signalValue: "Cap edició oberta"
    } : {
      eyebrow: "CRAYS Clubs / Conferencia",
      title: "Una sala para ideas que necesitan personas a su alrededor.",
      lead: "Esta página define la forma completa de una futura CRAYS Conference: un encuentro editorial concentrado para quienes crean, operan, cuidan comunidades y exploran con curiosidad. Aquí no se anuncia fecha, sede, programa, ponente, entrada ni plaza.",
      status: "Estado: solo concepto y recorrido de participación",
      primary: "Explorar el archivo de evidencias",
      secondary: "Entender la ruta de solicitud",
      caption: "Referencia de la función de sede: escenario compartido, no ubicación CRAYS confirmada.",
      signalLabel: "Estado público actual",
      signalValue: "Ninguna edición abierta"
    },
    nav: catalan
      ? [{ href: "#archive", label: "Arxiu d'evidències" }, { href: "#programme", label: "Arquitectura del programa" }, { href: "#voices", label: "Veus" }, { href: "#participation", label: "Participació" }, { href: "#questions", label: "Preguntes" }]
      : [{ href: "#archive", label: "Archivo de evidencias" }, { href: "#programme", label: "Arquitectura del programa" }, { href: "#voices", label: "Voces" }, { href: "#participation", label: "Participación" }, { href: "#questions", label: "Preguntas" }],
    archive: catalan ? {
      kicker: "Registre publicat",
      title: "Una conferència obté arxiu després de celebrar-se.",
      lead: "Una pàgina creïble ha de permetre revisar edicions anteriors, veure sessions autoritzades i seguir un registre publicat. CRAYS no disposa de proves aprovades d'una edició anterior; les tres funcions resten visibles sense fingir edició, públic ni gravació.",
      items: [
        { label: "Posició d'arxiu 01", title: "Resum d'edició", text: "Després de l'anunci formal i el tancament, aquest espai podrà contenir data, seu verificada, programa aprovat i fonts responsables.", gate: "Bloquejat: no hi ha registre aprovat d'una CRAYS Conference." },
        { label: "Posició d'arxiu 02", title: "Biblioteca de sessions", text: "Conserva la funció d'una biblioteca reproduïble amb converses, subtítols, participants, temes i drets documentats.", gate: "Bloquejat: no hi ha gravacions CRAYS autoritzades ni drets de publicació." },
        { label: "Posició d'arxiu 03", title: "Informe públic", text: "Reservat per a un informe factual amb participació mesurada, resultats documentats i correccions quan calgui.", gate: "Bloquejat: no hi ha informe, xifra d'assistència ni resultats verificats." }
      ],
      playerLabel: "Funció del reproductor",
      playerText: "La reproducció resta tancada fins a aprovar sessió real, consentiments, drets, subtítols i allotjament.",
      playerButton: "Reproducció no disponible"
    } : {
      kicker: "Registro publicado",
      title: "Una conferencia obtiene archivo después de celebrarse.",
      lead: "Una página creíble debe permitir revisar ediciones anteriores, ver sesiones autorizadas y seguir un registro publicado. CRAYS no dispone de pruebas aprobadas de una edición anterior; las tres funciones quedan visibles sin fingir edición, público ni grabación.",
      items: [
        { label: "Posición de archivo 01", title: "Resumen de edición", text: "Tras anuncio formal y cierre, este lugar podrá contener fecha, sede verificada, programa aprobado y fuentes responsables.", gate: "Bloqueado: no existe registro aprobado de una CRAYS Conference." },
        { label: "Posición de archivo 02", title: "Biblioteca de sesiones", text: "Conserva la función de una biblioteca reproducible con conversaciones, subtítulos, participantes, temas y derechos documentados.", gate: "Bloqueado: no hay grabaciones CRAYS autorizadas ni derechos de publicación." },
        { label: "Posición de archivo 03", title: "Informe público", text: "Reservado para un informe factual con participación medida, resultados documentados y correcciones cuando proceda.", gate: "Bloqueado: no hay informe, cifra de asistentes ni resultados verificados." }
      ],
      playerLabel: "Función del reproductor",
      playerText: "La reproducción seguirá cerrada hasta aprobar sesión real, consentimientos, derechos, subtítulos y alojamiento.",
      playerButton: "Reproducción no disponible"
    },
    programme: catalan ? {
      kicker: "Arquitectura del programa",
      title: "Prou dens per importar. Prou obert per intercanviar de debò.",
      lead: "La referència pública empra intervencions, pauses i trobades concentrades. La versió CRAYS conserva totes les funcions sense publicar un horari fictici. Són funcions de programa, no sessions ni hores anunciades.",
      boundary: "No s'han aprovat data, durada, ordre ni disponibilitat de sessions.",
      items: [
        { title: "Context d'obertura", text: "Un marc breu separaria el motiu de trobada, els fets confirmats i les preguntes obertes." },
        { title: "Intervencions breus", text: "Cada aportació portaria una idea clara, amb identitat, encàrrec i afirmacions revisats abans de publicar-se." },
        { title: "Converses moderades", text: "Perspectives diferents dialogarien sense presentar-se com adhesions ni acords predeterminats." },
        { title: "Intercanvi en sales", text: "Formats petits convertirien grans temes en preguntes i passos sense prometre negocis, feina o accés." },
        { title: "Pausa i contacte", text: "El temps sense programa facilitaria presentacions i reflexió; mai garantiria una persona o resultat." },
        { title: "Síntesi de tancament", text: "El final distingiria aprenentatges, propostes i assumptes encara subjectes a evidència o decisió." }
      ],
      caption: "Referència d'intercanvi: conversa durant la pausa d'una conferència aliena."
    } : {
      kicker: "Arquitectura del programa",
      title: "Denso para importar. Abierto para intercambiar de verdad.",
      lead: "La referencia pública emplea intervenciones, pausas y encuentros concentrados. La versión CRAYS conserva todas las funciones sin publicar un horario ficticio. Son funciones de programa, no sesiones ni horas anunciadas.",
      boundary: "No se han aprobado fecha, duración, orden ni disponibilidad de sesiones.",
      items: [
        { title: "Contexto de apertura", text: "Un marco breve separaría el motivo de reunión, los hechos confirmados y las preguntas abiertas." },
        { title: "Intervenciones breves", text: "Cada aportación llevaría una idea clara, con identidad, cometido y afirmaciones revisados antes de publicarse." },
        { title: "Conversaciones moderadas", text: "Perspectivas distintas dialogarían sin presentarse como adhesiones ni acuerdos predeterminados." },
        { title: "Intercambio en salas", text: "Formatos pequeños convertirían grandes temas en preguntas y pasos sin prometer negocios, empleo o acceso." },
        { title: "Pausa y contacto", text: "El tiempo sin programa facilitaría presentaciones y reflexión; nunca garantizaría una persona o resultado." },
        { title: "Síntesis de cierre", text: "El cierre distinguiría aprendizajes, propuestas y asuntos todavía sujetos a evidencia o decisión." }
      ],
      caption: "Referencia de intercambio: conversación en la pausa de una conferencia ajena."
    },
    speakers: catalan ? {
      kicker: "Veus a la sala",
      title: "El cartell és una responsabilitat, no decoració.",
      lead: "La font usa una galeria extensa per mostrar qui sosté el programa. CRAYS conserva vint-i-quatre posicions igualment visibles, però no anomena, retrata ni insinua ningú sense identitat, funció, consentiment i estat aprovats.",
      gate: "Cartell bloquejat fins a confirmar persones, consentiment i programa.",
      roles: ["Veu d'obertura", "Perspectiva fundadora", "Operació de comunitat", "Construcció tecnològica", "Pràctica de lloc i ciutat", "Treball remot", "Veu creativa i cultural", "Operació d'hospitalitat", "Facilitació de l'aprenentatge", "Moviment i benestar", "Perspectiva d'associació", "Ecosistema local", "Perspectiva global de membres", "Resposta crítica", "Moderació de taula", "Facilitació de taller", "Entrevista editorial", "Cas operatiu", "Perspectiva de recerca", "Pregunta d'interès públic", "Empresa amfitriona", "Creació independent", "Futur del treball", "Síntesi final"],
      roleGate: "Només funció / persona no anunciada"
    } : {
      kicker: "Voces en la sala",
      title: "El elenco es una responsabilidad, no decoración.",
      lead: "La fuente usa una galería extensa para mostrar quién sostiene el programa. CRAYS conserva veinticuatro posiciones igualmente visibles, pero no nombra, retrata ni insinúa personas sin identidad, cometido, consentimiento y estado aprobados.",
      gate: "El elenco está bloqueado hasta confirmar personas, consentimiento y programa.",
      roles: ["Voz de apertura", "Perspectiva fundadora", "Operación de comunidad", "Construcción tecnológica", "Práctica de lugar y ciudad", "Trabajo remoto", "Voz creativa y cultural", "Operación de hospitalidad", "Facilitación del aprendizaje", "Movimiento y bienestar", "Perspectiva de asociación", "Ecosistema local", "Perspectiva global de miembros", "Respuesta crítica", "Moderación de mesa", "Facilitación de taller", "Entrevista editorial", "Caso operativo", "Perspectiva investigadora", "Pregunta de interés público", "Empresa anfitriona", "Creación independiente", "Futuro del trabajo", "Síntesis final"],
      roleGate: "Solo función / persona no anunciada"
    },
    audience: catalan ? {
      kicker: "A qui serveix el recorregut",
      title: "Arribar amb una pregunta, no amb un resultat promès.",
      lead: "La funció connecta qui construeix, allotja, opera, estudia o qüestiona noves formes de treball i pertinença. Participar crea una sala comuna, no membresia, inversió, feina, aliança ni accés comercial automàtics.",
      items: [
        { title: "Creadors i operadors", text: "Qui sosté productes, serveis, equips o llocs reals pot aportar evidència i preguntes pràctiques." },
        { title: "Responsables de comunitat", text: "Qui cuida participació, cultura i confiança pot comparar mètodes sense convertir experiència en garantia." },
        { title: "Professionals independents", text: "Investigadors, creatius i especialistes poden aportar una posició clara quan la funció estigui confirmada." },
        { title: "Membres i convidats curiosos", text: "Qui explora el tema pot revisar la informació pública i usar la mateixa ruta transparent." }
      ]
    } : {
      kicker: "A quién sirve el recorrido",
      title: "Llegar con una pregunta, no con un resultado prometido.",
      lead: "La función conecta a quienes construyen, alojan, operan, estudian o cuestionan nuevas formas de trabajo y pertenencia. Participar crea una sala común, no membresía, inversión, empleo, alianza ni acceso comercial automáticos.",
      items: [
        { title: "Creadores y operadores", text: "Quienes sostienen productos, servicios, equipos o lugares reales pueden aportar evidencia y preguntas prácticas." },
        { title: "Responsables de comunidad", text: "Quienes cuidan participación, cultura y confianza pueden comparar métodos sin convertir experiencia en garantía." },
        { title: "Profesionales independientes", text: "Investigadores, creativos y especialistas pueden aportar una posición clara cuando su función esté confirmada." },
        { title: "Miembros e invitados curiosos", text: "Quien explora el tema puede revisar la información pública y usar la misma ruta transparente." }
      ]
    },
    participation: catalan ? {
      kicker: "Estats de participació",
      title: "Interès no és admissió, i admissió no és pagament.",
      lead: "Cada transició queda separada perquè ningú confongui formulari, referència o missatge amb una plaça confirmada.",
      items: [
        { title: "Descoberta", text: "Llegir propòsit, evidència, límits i informació pràctica sense crear dret de participació." },
        { title: "Sol·licitud", text: "Un futur formulari autoritzat podria recollir interès i necessitats; enviar-lo només crearia un registre." },
        { title: "Revisió de l'equip", text: "CRAYS avaluaria segons criteris publicats. No existeix aprovació automàtica." },
        { title: "Invitació o admissió", text: "Només una decisió explícita de CRAYS podria crear invitació o admissió amb abast propi." },
        { title: "Registre", text: "Una persona admesa podria confirmar dades després; registre i sol·licitud continuen separats." },
        { title: "Entrada o pagament", text: "Qualsevol pas necessita preu, impostos, devolució, pagament i autoritat de proveïdor aprovats per separat. Aquí no existeixen." },
        { title: "Check-in", text: "La verificació d'arribada només existiria per a edició confirmada i persona registrada; no deriva d'etapes prèvies." }
      ],
      caption: "Referència de registre: escena de check-in aliena, no registre CRAYS obert."
    } : {
      kicker: "Estados de participación",
      title: "Interés no es admisión, y admisión no es pago.",
      lead: "Cada transición queda separada para que nadie confunda formulario, referencia o mensaje con una plaza confirmada.",
      items: [
        { title: "Descubrimiento", text: "Leer propósito, evidencia, límites e información práctica sin crear derecho de participación." },
        { title: "Solicitud", text: "Un futuro formulario autorizado podría recoger interés y necesidades; enviarlo solo crearía un registro." },
        { title: "Revisión del equipo", text: "CRAYS evaluaría según criterios publicados. No existe aprobación automática." },
        { title: "Invitación o admisión", text: "Solo una decisión explícita de CRAYS podría crear invitación o admisión con alcance propio." },
        { title: "Registro", text: "Una persona admitida podría confirmar datos después; registro y solicitud siguen separados." },
        { title: "Entrada o pago", text: "Cualquier paso requiere precio, impuestos, reembolso, pago y autoridad de proveedor aprobados por separado. Aquí no existen." },
        { title: "Check-in", text: "La verificación de llegada solo existiría para edición confirmada y persona registrada; no se deduce de etapas previas." }
      ],
      caption: "Referencia de registro: escena de check-in ajena, no registro CRAYS abierto."
    },
    practical: catalan ? {
      kicker: "Capa pràctica",
      title: "Una afirmació sobre la seu comença amb fets verificats.",
      lead: "La pàgina reserva tota funció pràctica necessària abans de viatjar o participar. Cada superfície queda pendent fins a autoritzar edició i lloc.",
      items: [
        { title: "Ubicació i accés", text: "Adreça, entrada, transport i context local necessiten una seu confirmada." },
        { title: "Escenari i visibilitat", text: "Distribució, capacitat, seients i visió s'han de provar, no inferir d'imatges." },
        { title: "Sales de treball", text: "Disponibilitat, accés i assignació continuen sent decisions de programa." },
        { title: "Menjar i pauses", text: "Càtering, dietes, horari de pauses i serveis inclosos no estan anunciats." },
        { title: "Accessibilitat", text: "Accés sense graons, audició, necessitats sensorials, seient i suport s'han de verificar per a la seu." },
        { title: "Participació remota", text: "No es prometen emissió, gravació, subtítols, repetició ni accés remot sense drets i lliurament aprovats." }
      ]
    } : {
      kicker: "Capa práctica",
      title: "Una afirmación sobre sede empieza con hechos verificados.",
      lead: "La página reserva toda función práctica necesaria antes de viajar o participar. Cada superficie queda pendiente hasta autorizar edición y lugar.",
      items: [
        { title: "Ubicación y acceso", text: "Dirección, entrada, transporte y contexto local necesitan sede confirmada." },
        { title: "Escenario y visibilidad", text: "Distribución, capacidad, asientos y visión deben probarse, no inferirse de imágenes." },
        { title: "Salas de trabajo", text: "Disponibilidad, acceso y asignación siguen siendo decisiones de programa." },
        { title: "Comida y pausas", text: "Catering, dietas, horario de pausas y servicios incluidos no están anunciados." },
        { title: "Accesibilidad", text: "Acceso sin escalones, audición, necesidades sensoriales, asiento y apoyo deben verificarse para la sede." },
        { title: "Participación remota", text: "No se prometen emisión, grabación, subtítulos, repetición ni acceso remoto sin derechos y entrega aprobados." }
      ]
    },
    recording: catalan
      ? { kicker: "Gravació i publicació", title: "Una càmera no crea permís.", text: "Gravar exigiria consentiment, política de captura, accessibilitat, drets, autoritat d'allotjament i via de correcció. Fins llavors no es promet directe, repetició ni videoteca pública.", caption: "Referència de producció: equip aliè, no operació audiovisual CRAYS." }
      : { kicker: "Grabación y publicación", title: "Una cámara no crea permiso.", text: "Grabar exigiría consentimiento, política de captura, accesibilidad, derechos, autoridad de alojamiento y vía de corrección. Hasta entonces no se promete directo, repetición ni videoteca pública.", caption: "Referencia de producción: equipo ajeno, no operación audiovisual CRAYS." },
    form: catalan ? {
      kicker: "Sol·licitud d'interès",
      title: "La superfície completa és visible, però l'enviament està tancat.",
      lead: "Els camps mostren què necessitaria una sol·licitud responsable. No recullen dades perquè no s'ha demostrat responsable, privacitat, endpoint, conservació, propietari de resposta ni propòsit autoritzats.",
      gate: "Enviament desactivat fins a autoritzar backend, privacitat, responsable, conservació i resposta.",
      fields: ["Nom complet", "Correu electrònic", "Organització o comunitat", "La teva funció o perspectiva", "Pregunta, tema o contribució", "Necessitats d'accés o participació"],
      consent: "He llegit la privacitat específica de l'edició i entenc l'estat de la sol·licitud.",
      submit: "Enviament no disponible",
      contact: "Usar la pàgina general de contacte"
    } : {
      kicker: "Solicitud de interés",
      title: "La superficie completa está visible, pero el envío está cerrado.",
      lead: "Los campos muestran lo necesario para una solicitud responsable. No recogen datos porque no se ha demostrado responsable, privacidad, endpoint, conservación, propietario de respuesta ni propósito autorizado.",
      gate: "Envío desactivado hasta autorizar backend, privacidad, responsable, conservación y respuesta.",
      fields: ["Nombre completo", "Correo electrónico", "Organización o comunidad", "Tu función o perspectiva", "Pregunta, tema o contribución", "Necesidades de acceso o participación"],
      consent: "He leído la privacidad específica de la edición y entiendo el estado de la solicitud.",
      submit: "Envío no disponible",
      contact: "Usar la página general de contacto"
    },
    faq: catalan ? {
      kicker: "Preguntes pràctiques",
      title: "Què es pot dir abans que existeixi una edició.",
      lead: "Les respostes mantenen tota la funció de decisió de la referència i separen format futur de fets actuals.",
      permalink: "Enllaç a aquesta resposta",
      items: [
        { question: "Quant duraria la Conference?", answer: "No hi ha data ni durada confirmades. Un anunci futur ha de publicar arribada, obertura, pauses, tancament i sortida conjuntament, no una hora aïllada." },
        { question: "Quin format tindria?", answer: "L'arquitectura prevista combina aportacions breus, converses moderades, treball en sales i pauses reals. No és un programa publicat; el format final només es podrà descriure després de l'aprovació." },
        { question: "Quins assumptes cobriria?", answer: "L'abast editorial pot explorar comunitats empresarials, tecnologia, treball, lloc, aprenentatge, cultura i operacions. Sessions i afirmacions concretes necessiten persones i proves confirmades." },
        { question: "Podria conèixer altres participants?", answer: "La conferència pot crear espai per conversar, però CRAYS no garanteix trobada, presentació, resultat empresarial ni accés a ningú." },
        { question: "Com es relaciona amb CRAYS Clubs?", answer: "Conference és un recorregut editorial diferenciat dins l'ecosistema Clubs. Sol·licitar, assistir o contribuir no crea per si sol membresia, admissió ni relació comercial." },
        { question: "Es gravarien sessions o hi hauria accés remot?", answer: "No hi ha gravació, emissió ni repetició confirmades. Qualsevol oferta futura requereix consentiment, drets, subtítols, allotjament, condicions i decisió expressa." }
      ]
    } : {
      kicker: "Preguntas prácticas",
      title: "Qué puede decirse antes de que exista una edición.",
      lead: "Las respuestas mantienen toda la función de decisión de la referencia y separan formato futuro de hechos actuales.",
      permalink: "Enlace a esta respuesta",
      items: [
        { question: "¿Cuánto duraría la Conference?", answer: "No hay fecha ni duración confirmadas. Un anuncio futuro debe publicar llegada, apertura, pausas, cierre y salida en conjunto, no una hora aislada." },
        { question: "¿Qué formato tendría?", answer: "La arquitectura prevista combina aportaciones breves, conversaciones moderadas, trabajo en salas y pausas reales. No es un programa publicado; el formato final solo podrá describirse tras aprobación." },
        { question: "¿Qué asuntos cubriría?", answer: "El alcance editorial puede explorar comunidades empresariales, tecnología, trabajo, lugar, aprendizaje, cultura y operaciones. Sesiones y afirmaciones concretas necesitan personas y pruebas confirmadas." },
        { question: "¿Podría conocer a otros participantes?", answer: "La conferencia puede crear espacio para conversar, pero CRAYS no garantiza encuentro, presentación, resultado empresarial ni acceso a nadie." },
        { question: "¿Cómo se relaciona con CRAYS Clubs?", answer: "Conference es un recorrido editorial distinto dentro del ecosistema Clubs. Solicitar, asistir o contribuir no crea por sí solo membresía, admisión ni relación comercial." },
        { question: "¿Se grabarían sesiones o habría acceso remoto?", answer: "No hay grabación, emisión ni repetición confirmadas. Cualquier oferta futura requiere consentimiento, derechos, subtítulos, alojamiento, condiciones y decisión expresa." }
      ]
    },
    closing: catalan
      ? { kicker: "Seguir l'evidència", title: "La següent edició comença amb un fet autoritzat, no amb un compte enrere.", text: "Fins que CRAYS publiqui una edició, aquesta pàgina és el mapa transparent de propòsit, funcions i límits. Les preguntes generals poden usar Contacte; allà no es crea cap plaça.", primary: "Contactar amb CRAYS Clubs", secondary: "Tornar a Community Life" }
      : { kicker: "Seguir la evidencia", title: "La siguiente edición empieza con un hecho autorizado, no con una cuenta atrás.", text: "Hasta que CRAYS publique una edición, esta página es el mapa transparente de propósito, funciones y límites. Las preguntas generales pueden usar Contacto; allí no se crea una plaza.", primary: "Contactar con CRAYS Clubs", secondary: "Volver a Community Life" },
    alts: catalan
      ? { heroVenue: "Auditori que il·lustra la funció de seu d'una futura conferència", archiveStage: "Escenari aliè que il·lustra un arxiu d'edició", archivePanel: "Panell aliè que il·lustra una biblioteca de sessions", networking: "Persones conversant a la pausa d'una conferència aliena", recording: "Equip de càmera que il·lustra decisions de gravació", arrival: "Registre aliè que il·lustra l'estat de check-in" }
      : { heroVenue: "Auditorio que ilustra la función de sede de una conferencia futura", archiveStage: "Escenario ajeno que ilustra un archivo de edición", archivePanel: "Panel ajeno que ilustra una biblioteca de sesiones", networking: "Personas conversando en la pausa de una conferencia ajena", recording: "Equipo de cámara que ilustra decisiones de grabación", arrival: "Registro ajeno que ilustra el estado de check-in" }
  };
}

function romanceVariant(locale: "fr" | "pt" | "it"): ConferencePublicCopy {
  const data = {
    fr: {
      metaTitle: "Conférence | CRAYS Clubs",
      metaDescription: "Le parcours CRAYS Conference fondé sur les preuves : intention, architecture, voix, états et questions pratiques.",
      mediaNotice: "Référence éditoriale sous licence, pas la documentation d'un événement CRAYS.",
      navLabel: "Sections de la page conférence",
      hero: ["CRAYS Clubs / Conférence", "Une salle pour les idées qui ont besoin de personnes autour d'elles.", "Cette page définit la forme complète d'une future CRAYS Conference : un rendez-vous éditorial concentré pour bâtisseurs, opérateurs, responsables de communauté et membres curieux. Aucune date, aucun lieu, programme, intervenant, billet ou siège n'est annoncé ici.", "Statut : concept et parcours de participation uniquement", "Explorer les preuves", "Comprendre la demande", "Référence de fonction du lieu : une scène commune, pas un site CRAYS confirmé.", "État public actuel", "Aucune édition ouverte"],
      nav: ["Archives probantes", "Architecture du programme", "Voix", "Participation", "Questions"],
      archive: ["Trace publiée", "Une conférence mérite ses archives après avoir eu lieu.", "Une page crédible doit permettre d'examiner les éditions passées, de voir les sessions autorisées et de suivre la trace publiée. CRAYS ne dispose d'aucune preuve approuvée d'une édition passée ; les trois fonctions restent donc visibles sans inventer édition, audience ou enregistrement.", "Position d'archive", "Vue d'ensemble de l'édition", "Après annonce formelle et clôture, cet espace pourra réunir date, lieu vérifié, programme approuvé et sources responsables.", "Bloqué : aucun dossier approuvé d'une CRAYS Conference.", "Bibliothèque de sessions", "Elle conserve la fonction d'une bibliothèque consultable avec échanges, sous-titres, participants, sujets et droits documentés.", "Bloqué : aucun enregistrement CRAYS autorisé ni droit de publication.", "Rapport public", "Réservé à un rapport factuel avec participation mesurée, résultats documentés et corrections éventuelles.", "Bloqué : aucun rapport, chiffre de fréquentation ou résultat vérifié.", "Rôle du lecteur de session", "La lecture reste fermée jusqu'à validation d'une session réelle, des consentements, droits, sous-titres et de l'hébergement.", "Lecture indisponible"],
      programme: ["Architecture du programme", "Assez dense pour compter. Assez ouvert pour un véritable échange.", "La référence publique s'appuie sur des interventions, pauses et rencontres concentrées. La version CRAYS conserve chaque fonction sans publier d'horaire fictif. Il s'agit de rôles de programme, pas de sessions ni d'heures annoncées.", "Date, durée, déroulé et disponibilité des sessions ne sont pas approuvés.", "Contexte d'ouverture", "Un cadre bref distinguerait la raison du rassemblement, les faits confirmés et les questions ouvertes.", "Interventions courtes", "Chaque contribution porterait une idée claire, après vérification de l'identité, du mandat et des affirmations.", "Conversations modérées", "Des perspectives différentes dialogueraient sans être présentées comme des soutiens ou un accord imposé.", "Échanges en ateliers", "De petits formats transformeraient les grands thèmes en questions et étapes, sans promettre affaires, emplois ou accès.", "Pause et rencontres", "Le temps non programmé favoriserait présentations et recul, sans garantir une personne ou un résultat.", "Synthèse finale", "La clôture séparerait acquis, propositions et éléments qui exigent encore preuve ou décision.", "Référence d'échange : conversation pendant la pause d'une conférence tierce."],
      speakers: ["Voix dans la salle", "La programmation humaine est une responsabilité, pas un décor.", "La source utilise une galerie profonde pour montrer qui porte le programme. CRAYS conserve vingt-quatre positions aussi visibles, sans nommer, montrer ni suggérer personne avant validation de l'identité, du mandat, du consentement et du statut.", "Liste bloquée jusqu'à confirmation des personnes, consentements et du programme.", "Rôle uniquement / personne non annoncée"],
      roles: ["Voix d'ouverture", "Perspective fondatrice", "Opération de communauté", "Construction technologique", "Pratique du lieu et de la ville", "Travail à distance", "Voix créative et culturelle", "Opération d'hospitalité", "Facilitation de l'apprentissage", "Mouvement et bien-être", "Perspective associative", "Écosystème local", "Perspective membre globale", "Réponse critique", "Modération de table ronde", "Facilitation d'atelier", "Entretien éditorial", "Cas opérationnel", "Perspective de recherche", "Question d'intérêt public", "Entreprise hôte", "Créateur indépendant", "Futur du travail", "Synthèse finale"],
      audience: ["À qui s'adresse le parcours", "Venir avec une question, pas un résultat promis.", "La fonction relie celles et ceux qui bâtissent, accueillent, opèrent, étudient ou questionnent de nouvelles formes de travail et d'appartenance. Participer crée une salle commune, pas automatiquement une adhésion, un investissement, un emploi, un partenariat ou un accès commercial.", "Bâtisseurs et opérateurs", "Les personnes portant produits, services, équipes ou lieux réels peuvent apporter preuves et questions pratiques.", "Responsables de communauté", "Les personnes chargées de la participation, de la culture et de la confiance peuvent comparer des méthodes sans transformer l'expérience en garantie.", "Praticiens indépendants", "Chercheurs, créatifs et spécialistes peuvent contribuer une position claire lorsque leur rôle est confirmé.", "Membres et invités curieux", "Toute personne explorant le sujet peut consulter l'information publique et suivre la même voie transparente."],
      participation: ["États de participation", "L'intérêt n'est pas l'admission, et l'admission n'est pas le paiement.", "Chaque transition reste séparée afin que personne ne confonde formulaire, recommandation ou message avec une place confirmée.", "Découverte", "Lire intention, preuves, limites et informations pratiques sans créer de droit de participation.", "Candidature ou demande", "Un futur formulaire autorisé pourrait recueillir intérêt et besoins ; l'envoi créerait seulement une demande.", "Examen par l'équipe", "CRAYS évaluerait selon les critères publiés. Aucune approbation automatique n'est sous-entendue.", "Invitation ou admission", "Seule une décision explicite de CRAYS pourrait créer une invitation ou admission avec son propre périmètre.", "Inscription", "Une personne admise pourrait ensuite confirmer ses informations ; inscription et demande restent distinctes.", "Billet ou paiement", "Toute étape exige prix, taxes, remboursement, paiement et autorité du prestataire approuvés séparément. Rien de tel n'existe ici.", "Accueil sur place", "Le contrôle d'arrivée n'existerait que pour une édition confirmée et une personne inscrite ; il ne découle pas des étapes précédentes.", "Référence d'inscription : accueil d'une conférence tierce, pas une inscription CRAYS ouverte."],
      practical: ["Couche pratique", "Toute affirmation sur le lieu commence par des faits vérifiés.", "La page réserve toutes les fonctions nécessaires avant de voyager ou participer. Chaque surface reste en attente d'une édition et d'un lieu autorisés.", "Lieu et accès", "Adresse, entrée, transport et contexte local exigent un lieu confirmé.", "Scène et visibilité", "Disposition, capacité, places et visibilité doivent être prouvées, pas déduites d'images.", "Espaces de travail", "Disponibilité, accès et affectation restent des décisions de programme.", "Repas et pauses", "Restauration, régimes, horaires de pause et services inclus ne sont pas annoncés.", "Accessibilité", "Accès sans marche, audition, besoins sensoriels, assise et assistance doivent être vérifiés pour le lieu.", "Participation à distance", "Diffusion, enregistrement, sous-titres, replay et accès distant ne sont pas promis sans droits et livraison approuvés."],
      recording: ["Enregistrement et publication", "Une caméra ne crée pas l'autorisation.", "Enregistrer exigerait consentements, politique de captation, accessibilité, droits, autorité d'hébergement et voie de correction. Jusque-là, aucun direct, replay ou catalogue vidéo public n'est promis.", "Référence de production : équipement tiers, pas une opération média CRAYS."],
      form: ["Demande d'intérêt", "La surface complète est visible, mais l'envoi est fermé.", "Les champs montrent ce qu'exigerait une demande responsable. Ils ne collectent rien car aucun responsable, avis de confidentialité, endpoint, calendrier de conservation, propriétaire de réponse ou but d'édition n'est autorisé.", "Envoi désactivé jusqu'à autorisation du backend, de la confidentialité, du responsable, de la conservation et de la réponse.", "Nom complet", "Adresse e-mail", "Organisation ou communauté", "Votre rôle ou perspective", "Question, sujet ou contribution", "Besoins d'accès ou de participation", "J'ai lu les informations de confidentialité propres à l'édition et comprends l'état de la demande.", "Envoi indisponible", "Utiliser la page Contact générale"],
      faq: ["Questions pratiques", "Ce qui peut être dit avant qu'une édition existe.", "Ces réponses conservent toute la fonction de décision de la référence et distinguent format futur et faits actuels.", "Lien vers cette réponse", "Combien de temps durerait la Conference ?", "Aucune date ni durée n'est confirmée. Une future annonce devra publier ensemble arrivée, ouverture, pauses, clôture et départ, pas une heure isolée.", "Quel serait le format ?", "L'architecture envisagée combine interventions courtes, conversations modérées, ateliers et vraies pauses. Ce n'est pas un planning publié ; le format final ne pourra être décrit qu'après approbation.", "Quels sujets seraient abordés ?", "Le champ éditorial peut explorer communautés d'affaires, technologie, travail, lieux, apprentissage, culture et opérations. Sessions et affirmations nommées exigent des contributeurs confirmés et des preuves.", "Pourrais-je rencontrer d'autres participants ?", "Une conférence peut créer de l'espace pour parler, mais CRAYS ne garantit ni rencontre, ni présentation, ni résultat commercial, ni accès à une personne.", "Quel est le lien avec CRAYS Clubs ?", "Conference est un parcours éditorial distinct dans l'écosystème Clubs. Une demande, une présence ou une contribution ne crée à elle seule ni adhésion, ni admission ailleurs, ni relation commerciale.", "Les sessions seraient-elles enregistrées ou accessibles à distance ?", "Aucun enregistrement, direct ou replay n'est confirmé. Toute offre future exige consentement, droits, sous-titres, hébergement, conditions d'accès et décision explicite."],
      closing: ["Rester avec les preuves", "La prochaine édition commence par un fait autorisé, pas un compte à rebours.", "Jusqu'à publication d'une édition par CRAYS, cette page reste la carte transparente de l'intention, des rôles et des limites. Les questions générales peuvent passer par Contact ; aucune place n'y est créée.", "Contacter CRAYS Clubs", "Retour à Community Life"],
      alts: ["Auditorium illustrant la fonction de lieu d'une future conférence", "Scène tierce illustrant une archive d'édition", "Table ronde tierce illustrant une bibliothèque de sessions", "Personnes échangeant pendant la pause d'une conférence tierce", "Caméra illustrant les décisions d'enregistrement", "Accueil tiers illustrant l'état de check-in"]
    },
    pt: {
      metaTitle: "Conferência | CRAYS Clubs",
      metaDescription: "A jornada CRAYS Conference baseada em evidência: propósito, arquitetura, vozes, estados e perguntas práticas.",
      mediaNotice: "Referência editorial licenciada; não documenta um evento CRAYS.",
      navLabel: "Secções da página da conferência",
      hero: ["CRAYS Clubs / Conferência", "Uma sala para ideias que precisam de pessoas à sua volta.", "Esta página define a forma completa de uma futura CRAYS Conference: um encontro editorial concentrado para criadores, operadores, líderes de comunidade e membros curiosos. Aqui não são anunciados data, local, programa, orador, bilhete ou lugar.", "Estado: apenas conceito e percurso de participação", "Explorar o arquivo de evidência", "Compreender o pedido", "Referência da função do local: palco partilhado, não local CRAYS confirmado.", "Estado público atual", "Nenhuma edição aberta"],
      nav: ["Arquivo de evidência", "Arquitetura do programa", "Vozes", "Participação", "Perguntas"],
      archive: ["Registo publicado", "Uma conferência ganha arquivo depois de acontecer.", "Uma página credível deve permitir examinar edições passadas, ver sessões autorizadas e seguir o registo publicado. CRAYS não dispõe de evidência aprovada de uma edição anterior; as três funções ficam visíveis sem fingir edição, público ou gravação.", "Posição de arquivo", "Visão da edição", "Após anúncio formal e conclusão, este espaço poderá reunir data, local verificado, programa aprovado e fontes responsáveis.", "Bloqueado: não existe registo aprovado de uma CRAYS Conference.", "Biblioteca de sessões", "Preserva a função de uma biblioteca reproduzível com conversas, legendas, participantes, temas e direitos documentados.", "Bloqueado: não existem gravações CRAYS autorizadas ou direitos de publicação.", "Relatório público", "Reservado para um relatório factual com participação medida, resultados documentados e correções quando necessário.", "Bloqueado: não há relatório, número de participantes ou resultados verificados.", "Função do reprodutor", "A reprodução continua fechada até serem aprovados sessão real, consentimentos, direitos, legendas e alojamento.", "Reprodução indisponível"],
      programme: ["Arquitetura do programa", "Denso para importar. Aberto para uma troca real.", "A referência pública usa intervenções, pausas e encontros concentrados. A versão CRAYS conserva todas as funções sem publicar um horário fictício. São funções de programa, não sessões ou horas anunciadas.", "Data, duração, ordem e disponibilidade de sessões não foram aprovadas.", "Contexto de abertura", "Um enquadramento breve separaria a razão do encontro, factos confirmados e perguntas abertas.", "Intervenções curtas", "Cada contribuição levaria uma ideia clara, com identidade, mandato e afirmações verificados antes da publicação.", "Conversas moderadas", "Perspetivas diferentes dialogariam sem serem apresentadas como apoio ou acordo predeterminado.", "Troca em salas", "Formatos pequenos transformariam temas amplos em perguntas e passos sem prometer negócios, empregos ou acesso.", "Pausa e contacto", "Tempo não programado apoiaria apresentações e reflexão; nunca garantiria pessoa ou resultado.", "Síntese de encerramento", "O fecho separaria aprendizagens, propostas e pontos que ainda exigem evidência ou decisão.", "Referência de troca: conversa na pausa de uma conferência terceira."],
      speakers: ["Vozes na sala", "O elenco é uma responsabilidade, não decoração.", "A fonte usa uma galeria extensa para mostrar quem sustenta o programa. CRAYS preserva vinte e quatro posições igualmente visíveis, mas não nomeia, retrata ou sugere ninguém sem identidade, mandato, consentimento e estado aprovados.", "Elenco bloqueado até confirmar pessoas, consentimentos e programa.", "Apenas função / pessoa não anunciada"],
      roles: ["Voz de abertura", "Perspetiva fundadora", "Operação de comunidade", "Construção tecnológica", "Prática de lugar e cidade", "Trabalho remoto", "Voz criativa e cultural", "Operação de hospitalidade", "Facilitação de aprendizagem", "Movimento e bem-estar", "Perspetiva associativa", "Ecossistema local", "Perspetiva global de membros", "Resposta crítica", "Moderação de mesa", "Facilitação de workshop", "Entrevista editorial", "Caso operacional", "Perspetiva de investigação", "Pergunta de interesse público", "Empresa anfitriã", "Criador independente", "Futuro do trabalho", "Síntese final"],
      audience: ["Para quem é o percurso", "Chegar com uma pergunta, não com um resultado prometido.", "A função liga quem constrói, acolhe, opera, estuda ou questiona novas formas de trabalho e pertença. Participar cria uma sala comum, não adesão, investimento, emprego, parceria ou acesso comercial automáticos.", "Criadores e operadores", "Quem sustenta produtos, serviços, equipas ou lugares reais pode trazer evidência e perguntas práticas.", "Responsáveis de comunidade", "Quem cuida de participação, cultura e confiança pode comparar métodos sem transformar experiência em garantia.", "Profissionais independentes", "Investigadores, criativos e especialistas podem contribuir uma perspetiva clara quando a função estiver confirmada.", "Membros e convidados curiosos", "Quem explora o tema pode rever a informação pública e usar o mesmo percurso transparente."],
      participation: ["Estados de participação", "Interesse não é admissão, e admissão não é pagamento.", "Cada transição fica separada para ninguém confundir formulário, referência ou mensagem com lugar confirmado.", "Descoberta", "Ler propósito, evidência, limites e informação prática sem criar direito de participação.", "Candidatura ou pedido", "Um futuro formulário autorizado poderá recolher interesse e necessidades; o envio criaria apenas um pedido.", "Revisão da equipa", "CRAYS avaliaria segundo critérios publicados. Não existe aprovação automática.", "Convite ou admissão", "Só uma decisão explícita da CRAYS poderia criar convite ou admissão com âmbito próprio.", "Registo", "Uma pessoa admitida poderia depois confirmar dados; registo e pedido continuam separados.", "Bilhete ou pagamento", "Qualquer passo exige preço, impostos, reembolso, pagamento e autoridade de fornecedor aprovados separadamente. Nada disso existe aqui.", "Check-in", "A verificação de chegada só existiria para edição confirmada e pessoa registada; não resulta de etapas anteriores.", "Referência de registo: cena de check-in terceira, não registo CRAYS aberto."],
      practical: ["Camada prática", "Uma afirmação sobre local começa com factos verificados.", "A página reserva todas as funções necessárias antes de viajar ou participar. Cada superfície fica pendente até haver edição e local autorizados.", "Local e acesso", "Morada, entrada, transporte e contexto local exigem local confirmado.", "Palco e visibilidade", "Disposição, capacidade, lugares e visão devem ser provados, não inferidos de imagens.", "Salas de trabalho", "Disponibilidade, acesso e atribuição continuam decisões de programa.", "Comida e pausas", "Catering, dietas, horários e serviços incluídos não estão anunciados.", "Acessibilidade", "Acesso sem degraus, audição, necessidades sensoriais, assento e apoio devem ser verificados para o local.", "Participação remota", "Não se prometem transmissão, gravação, legendas, repetição ou acesso remoto sem direitos e entrega aprovados."],
      recording: ["Gravação e publicação", "Uma câmara não cria permissão.", "Gravar exigiria consentimento, política de captação, acessibilidade, direitos, autoridade de alojamento e via de correção. Até lá não se promete direto, repetição ou videoteca pública.", "Referência de produção: equipamento terceiro, não operação audiovisual CRAYS."],
      form: ["Pedido de interesse", "A superfície completa está visível, mas o envio está fechado.", "Os campos mostram o necessário para um pedido responsável. Não recolhem dados porque não há controlador, privacidade, endpoint, retenção, responsável de resposta ou propósito de edição autorizados.", "Envio desativado até autorizar backend, privacidade, controlador, retenção e resposta.", "Nome completo", "Endereço de e-mail", "Organização ou comunidade", "A sua função ou perspetiva", "Pergunta, tema ou contribuição", "Necessidades de acesso ou participação", "Li a informação de privacidade da edição e compreendo o estado do pedido.", "Envio indisponível", "Usar a página geral de contacto"],
      faq: ["Perguntas práticas", "O que pode ser dito antes de existir uma edição.", "As respostas preservam toda a função de decisão da referência e separam formato futuro de factos atuais.", "Ligação para esta resposta", "Quanto tempo duraria a Conference?", "Não há data ou duração confirmadas. Um anúncio futuro deve publicar chegada, abertura, pausas, fecho e saída em conjunto, não uma hora isolada.", "Qual seria o formato?", "A arquitetura prevista combina contribuições curtas, conversas moderadas, trabalho em salas e pausas reais. Não é um horário publicado; o formato final só pode ser descrito após aprovação.", "Que assuntos seriam cobertos?", "O âmbito editorial pode explorar comunidades empresariais, tecnologia, trabalho, lugar, aprendizagem, cultura e operações. Sessões e afirmações concretas exigem participantes e evidência confirmados.", "Poderia conhecer outros participantes?", "Uma conferência pode criar espaço para conversar, mas CRAYS não garante encontro, apresentação, resultado comercial ou acesso a qualquer pessoa.", "Como se relaciona com CRAYS Clubs?", "Conference é um percurso editorial distinto no ecossistema Clubs. Pedido, presença ou contribuição não criam por si adesão, admissão noutro programa ou relação comercial.", "As sessões seriam gravadas ou acessíveis remotamente?", "Não há gravação, transmissão ou repetição confirmadas. Qualquer oferta futura exige consentimento, direitos, legendas, alojamento, condições e decisão expressa."],
      closing: ["Seguir a evidência", "A próxima edição começa com um facto autorizado, não com uma contagem decrescente.", "Até CRAYS publicar uma edição, esta página é o mapa transparente do propósito, funções e limites. Perguntas gerais podem usar Contacto; aí não nasce um lugar.", "Contactar CRAYS Clubs", "Voltar a Community Life"],
      alts: ["Auditório que ilustra a função de local de uma futura conferência", "Palco terceiro que ilustra um arquivo de edição", "Painel terceiro que ilustra uma biblioteca de sessões", "Pessoas em conversa durante a pausa de uma conferência terceira", "Câmara que ilustra decisões de gravação", "Registo terceiro que ilustra o estado de check-in"]
    },
    it: {
      metaTitle: "Conferenza | CRAYS Clubs",
      metaDescription: "Il percorso CRAYS Conference vincolato alle evidenze: scopo, architettura, voci, stati e domande pratiche.",
      mediaNotice: "Riferimento editoriale con licenza; non documenta un evento CRAYS.",
      navLabel: "Sezioni della pagina conferenza",
      hero: ["CRAYS Clubs / Conferenza", "Una sala per idee che hanno bisogno di persone intorno.", "Questa pagina definisce la forma completa di una futura CRAYS Conference: un incontro editoriale concentrato per chi costruisce, gestisce, cura comunità ed esplora con curiosità. Qui non vengono annunciati data, sede, programma, relatore, biglietto o posto.", "Stato: solo concetto e percorso di partecipazione", "Esplora l'archivio delle evidenze", "Comprendi il percorso di richiesta", "Riferimento per la funzione della sede: palcoscenico condiviso, non luogo CRAYS confermato.", "Stato pubblico attuale", "Nessuna edizione aperta"],
      nav: ["Archivio evidenze", "Architettura del programma", "Voci", "Partecipazione", "Domande"],
      archive: ["Traccia pubblicata", "Una conferenza conquista un archivio dopo essere avvenuta.", "Una pagina credibile deve permettere di esaminare le edizioni precedenti, vedere sessioni autorizzate e seguire la traccia pubblicata. CRAYS non dispone di evidenza approvata di un'edizione passata; le tre funzioni restano visibili senza fingere edizione, pubblico o registrazione.", "Posizione archivio", "Panoramica dell'edizione", "Dopo annuncio formale e conclusione, questo spazio potrà contenere data, sede verificata, programma approvato e fonti responsabili.", "Bloccato: nessun registro approvato di una CRAYS Conference.", "Biblioteca delle sessioni", "Conserva la funzione di una biblioteca fruibile con conversazioni, sottotitoli, partecipanti, temi e diritti documentati.", "Bloccato: nessuna registrazione CRAYS autorizzata o diritto di pubblicazione.", "Rapporto pubblico", "Riservato a un rapporto fattuale con partecipazione misurata, risultati documentati ed eventuali correzioni.", "Bloccato: nessun rapporto, numero di presenze o risultato verificato.", "Funzione del player", "La riproduzione resta chiusa finché sessione reale, consensi, diritti, sottotitoli e hosting non sono approvati.", "Riproduzione non disponibile"],
      programme: ["Architettura del programma", "Densa per contare. Aperta per uno scambio reale.", "Il riferimento pubblico usa interventi, pause e incontri concentrati. La versione CRAYS conserva tutte le funzioni senza pubblicare un orario fittizio. Sono ruoli di programma, non sessioni o orari annunciati.", "Data, durata, ordine e disponibilità delle sessioni non sono approvati.", "Contesto iniziale", "Una cornice breve separerebbe motivo dell'incontro, fatti confermati e domande aperte.", "Interventi brevi", "Ogni contributo porterebbe un'idea chiara, con identità, mandato e affermazioni verificati prima della pubblicazione.", "Conversazioni moderate", "Prospettive diverse dialogherebbero senza essere presentate come sostegno o accordo predeterminato.", "Scambio nei gruppi", "Formati piccoli trasformerebbero temi ampi in domande e passi, senza promettere affari, lavoro o accesso.", "Pausa e contatto", "Il tempo non programmato favorirebbe presentazioni e riflessione; non garantirebbe mai una persona o un risultato.", "Sintesi finale", "La chiusura distinguerebbe apprendimenti, proposte e punti che richiedono ancora evidenza o decisione.", "Riferimento di scambio: conversazione durante la pausa di una conferenza terza."],
      speakers: ["Voci nella sala", "Il roster è una responsabilità, non decorazione.", "La fonte usa una galleria profonda per mostrare chi sostiene il programma. CRAYS conserva ventiquattro posizioni ugualmente visibili, ma non nomina, ritrae o suggerisce nessuno senza identità, mandato, consenso e stato approvati.", "Roster bloccato fino alla conferma di persone, consensi e programma.", "Solo ruolo / persona non annunciata"],
      roles: ["Voce di apertura", "Prospettiva fondatrice", "Gestione della comunità", "Costruzione tecnologica", "Pratica di luogo e città", "Lavoro remoto", "Voce creativa e culturale", "Gestione dell'ospitalità", "Facilitazione dell'apprendimento", "Movimento e benessere", "Prospettiva associativa", "Ecosistema locale", "Prospettiva globale dei membri", "Risposta critica", "Moderazione roundtable", "Facilitazione workshop", "Intervista editoriale", "Caso operativo", "Prospettiva di ricerca", "Domanda d'interesse pubblico", "Azienda ospite", "Creatore indipendente", "Futuro del lavoro", "Sintesi finale"],
      audience: ["A chi serve il percorso", "Arrivare con una domanda, non con un risultato promesso.", "La funzione collega chi costruisce, ospita, gestisce, studia o mette in discussione nuovi modi di lavorare e appartenere. Partecipare crea una sala comune, non automaticamente membership, investimento, lavoro, partnership o accesso commerciale.", "Costruttori e operatori", "Chi porta prodotti, servizi, team o luoghi reali può contribuire evidenze e domande pratiche.", "Responsabili di comunità", "Chi cura partecipazione, cultura e fiducia può confrontare metodi senza trasformare l'esperienza in garanzia.", "Professionisti indipendenti", "Ricercatori, creativi e specialisti possono portare una posizione chiara quando il ruolo è confermato.", "Membri e ospiti curiosi", "Chi esplora il tema può leggere le informazioni pubbliche e seguire lo stesso percorso trasparente."],
      participation: ["Stati di partecipazione", "L'interesse non è ammissione, e l'ammissione non è pagamento.", "Ogni transizione resta separata affinché nessuno confonda modulo, segnalazione o messaggio con un posto confermato.", "Scoperta", "Leggere scopo, evidenze, limiti e informazioni pratiche senza creare un diritto di partecipazione.", "Candidatura o richiesta", "Un futuro modulo autorizzato potrebbe raccogliere interesse e necessità; l'invio creerebbe solo una richiesta.", "Revisione del team", "CRAYS valuterebbe secondo criteri pubblicati. Non è implicata alcuna approvazione automatica.", "Invito o ammissione", "Solo una decisione esplicita di CRAYS potrebbe creare invito o ammissione con ambito proprio.", "Registrazione", "Una persona ammessa potrebbe poi confermare i dati; registrazione e richiesta restano distinte.", "Biglietto o pagamento", "Ogni passo richiede prezzo, imposte, rimborso, pagamento e autorità del provider approvati separatamente. Qui non esistono.", "Check-in", "La verifica all'arrivo esisterebbe solo per edizione confermata e persona registrata; non deriva dagli stati precedenti.", "Riferimento di registrazione: check-in di terzi, non registrazione CRAYS aperta."],
      practical: ["Livello pratico", "Ogni affermazione sulla sede inizia da fatti verificati.", "La pagina riserva tutte le funzioni necessarie prima di viaggiare o partecipare. Ogni superficie resta in attesa finché edizione e luogo non sono autorizzati.", "Luogo e accesso", "Indirizzo, ingresso, trasporti e contesto locale richiedono una sede confermata.", "Palco e visuale", "Layout, capacità, sedute e visibilità devono essere provati, non dedotti dalle immagini.", "Spazi di lavoro", "Disponibilità, accesso e assegnazione restano decisioni di programma.", "Cibo e pause", "Catering, esigenze alimentari, orari e servizi inclusi non sono annunciati.", "Accessibilità", "Accesso senza gradini, udito, esigenze sensoriali, sedute e assistenza devono essere verificati per la sede.", "Partecipazione remota", "Streaming, registrazione, sottotitoli, replay e accesso remoto non sono promessi senza diritti e delivery approvati."],
      recording: ["Registrazione e pubblicazione", "Una videocamera non crea il permesso.", "Registrare richiederebbe consenso, policy di ripresa, accessibilità, diritti, autorità di hosting e percorso di correzione. Fino ad allora non sono promessi diretta, replay o videoteca pubblica.", "Riferimento di produzione: attrezzatura di terzi, non operazione media CRAYS."],
      form: ["Richiesta d'interesse", "La superficie completa è visibile, ma l'invio è chiuso.", "I campi mostrano ciò che servirebbe a una richiesta responsabile. Non raccolgono dati perché non sono dimostrati titolare, privacy, endpoint, conservazione, responsabile della risposta o finalità autorizzati.", "Invio disabilitato finché backend, privacy, titolare, conservazione e risposta non sono autorizzati.", "Nome completo", "Indirizzo e-mail", "Organizzazione o comunità", "Il tuo ruolo o prospettiva", "Domanda, tema o contributo", "Esigenze di accesso o partecipazione", "Ho letto le informazioni privacy dell'edizione e comprendo lo stato della richiesta.", "Invio non disponibile", "Usa la pagina Contatti generale"],
      faq: ["Domande pratiche", "Cosa si può dire prima che esista un'edizione.", "Le risposte conservano l'intera funzione decisionale del riferimento e separano formato futuro e fatti attuali.", "Link a questa risposta", "Quanto durerebbe la Conference?", "Non sono confermate data o durata. Un annuncio futuro dovrà pubblicare insieme arrivo, apertura, pause, chiusura e partenza, non un orario isolato.", "Quale sarebbe il formato?", "L'architettura prevista combina contributi brevi, conversazioni moderate, lavoro in gruppi e pause reali. Non è un programma pubblicato; il formato finale potrà essere descritto solo dopo l'approvazione.", "Quali temi verrebbero trattati?", "L'ambito editoriale può esplorare comunità d'impresa, tecnologia, lavoro, luogo, apprendimento, cultura e operazioni. Sessioni e affermazioni specifiche richiedono persone ed evidenze confermate.", "Potrei incontrare altri partecipanti?", "Una conferenza può creare spazio per conversare, ma CRAYS non garantisce incontro, presentazione, risultato commerciale o accesso ad alcuna persona.", "Come si collega a CRAYS Clubs?", "Conference è un percorso editoriale distinto nell'ecosistema Clubs. Richiesta, presenza o contributo non creano da soli membership, ammissione altrove o relazione commerciale.", "Le sessioni verrebbero registrate o rese disponibili da remoto?", "Non sono confermati registrazione, streaming o replay. Ogni offerta futura richiede consenso, diritti, sottotitoli, hosting, condizioni e decisione esplicita."],
      closing: ["Seguire le evidenze", "La prossima edizione inizia con un fatto autorizzato, non con un conto alla rovescia.", "Finché CRAYS non pubblica un'edizione, questa pagina resta la mappa trasparente di scopo, funzioni e limiti. Le domande generali possono usare Contatti; lì non nasce alcun posto.", "Contatta CRAYS Clubs", "Torna a Community Life"],
      alts: ["Auditorium che illustra la funzione di sede di una futura conferenza", "Palco di terzi che illustra un archivio d'edizione", "Panel di terzi che illustra una biblioteca di sessioni", "Persone in conversazione durante la pausa di una conferenza terza", "Videocamera che illustra decisioni di registrazione", "Registrazione di terzi che illustra lo stato di check-in"]
    }
  }[locale];

  const a = data.archive;
  const p = data.programme;
  const u = data.audience;
  const s = data.participation;
  const v = data.practical;
  const f = data.form;
  const q = data.faq;
  return {
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    mediaNotice: data.mediaNotice,
    navLabel: data.navLabel,
    hero: { eyebrow: data.hero[0], title: data.hero[1], lead: data.hero[2], status: data.hero[3], primary: data.hero[4], secondary: data.hero[5], caption: data.hero[6], signalLabel: data.hero[7], signalValue: data.hero[8] },
    nav: ["#archive", "#programme", "#voices", "#participation", "#questions"].map((href, index) => ({ href, label: data.nav[index] })),
    archive: {
      kicker: a[0], title: a[1], lead: a[2],
      items: [
        { label: a[3] + " 01", title: a[4], text: a[5], gate: a[6] },
        { label: a[3] + " 02", title: a[7], text: a[8], gate: a[9] },
        { label: a[3] + " 03", title: a[10], text: a[11], gate: a[12] }
      ],
      playerLabel: a[13], playerText: a[14], playerButton: a[15]
    },
    programme: {
      kicker: p[0], title: p[1], lead: p[2], boundary: p[3],
      items: [[p[4], p[5]], [p[6], p[7]], [p[8], p[9]], [p[10], p[11]], [p[12], p[13]], [p[14], p[15]]].map(([title, text]) => ({ title, text })),
      caption: p[16]
    },
    speakers: { kicker: data.speakers[0], title: data.speakers[1], lead: data.speakers[2], gate: data.speakers[3], roles: data.roles, roleGate: data.speakers[4] },
    audience: {
      kicker: u[0], title: u[1], lead: u[2],
      items: [[u[3], u[4]], [u[5], u[6]], [u[7], u[8]], [u[9], u[10]]].map(([title, text]) => ({ title, text }))
    },
    participation: {
      kicker: s[0], title: s[1], lead: s[2],
      items: [[s[3], s[4]], [s[5], s[6]], [s[7], s[8]], [s[9], s[10]], [s[11], s[12]], [s[13], s[14]], [s[15], s[16]]].map(([title, text]) => ({ title, text })),
      caption: s[17]
    },
    practical: {
      kicker: v[0], title: v[1], lead: v[2],
      items: [[v[3], v[4]], [v[5], v[6]], [v[7], v[8]], [v[9], v[10]], [v[11], v[12]], [v[13], v[14]]].map(([title, text]) => ({ title, text }))
    },
    recording: { kicker: data.recording[0], title: data.recording[1], text: data.recording[2], caption: data.recording[3] },
    form: { kicker: f[0], title: f[1], lead: f[2], gate: f[3], fields: f.slice(4, 10), consent: f[10], submit: f[11], contact: f[12] },
    faq: {
      kicker: q[0], title: q[1], lead: q[2], permalink: q[3],
      items: [[q[4], q[5]], [q[6], q[7]], [q[8], q[9]], [q[10], q[11]], [q[12], q[13]], [q[14], q[15]]].map(([question, answer]) => ({ question, answer }))
    },
    closing: { kicker: data.closing[0], title: data.closing[1], text: data.closing[2], primary: data.closing[3], secondary: data.closing[4] },
    alts: { heroVenue: data.alts[0], archiveStage: data.alts[1], archivePanel: data.alts[2], networking: data.alts[3], recording: data.alts[4], arrival: data.alts[5] }
  };
}

const copyByLocale: Record<ConferenceLocale, ConferencePublicCopy> = {
  en,
  de,
  es: spanishVariant("es"),
  ca: spanishVariant("ca"),
  fr: romanceVariant("fr"),
  pt: romanceVariant("pt"),
  it: romanceVariant("it")
};

type UnknownRecord = Record<string, unknown>;
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function resolveLegacyShell(locale: ConferenceLocale): unknown {
  const source = legacyConferenceCopyModule as UnknownRecord;
  for (const key of ["getConferenceContent", "getConferenceCopy", "getConferencePageCopy"]) {
    const candidate = source[key];
    if (typeof candidate === "function") {
      const result = (candidate as (value: ConferenceLocale) => unknown)(locale);
      if (isRecord(result) && isRecord(result.shell)) return result.shell;
    }
  }
  for (const key of ["conferenceContent", "conferenceCopy", "conferencePageCopy", "CONFERENCE_COPY"]) {
    const candidate = source[key];
    if (!isRecord(candidate)) continue;
    const localized = candidate[locale] ?? candidate.en;
    if (isRecord(localized) && isRecord(localized.shell)) return localized.shell;
  }
  throw new Error("Existing localized Conference shell copy could not be resolved.");
}

export function getConferencePublicContent(locale: ConferenceLocale) {
  return { ...copyByLocale[locale], shell: resolveLegacyShell(locale) };
}

