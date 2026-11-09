export type EventsLocale = "en" | "de" | "es" | "ca" | "fr" | "pt" | "it";

type EventsCopy = {
  pageLabel: string;
  metaDescription: string;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primary: string;
    secondary: string;
    boundary: string;
  };
  discover: {
    eyebrow: string;
    title: string;
    body: string;
    searchLabel: string;
    searchPlaceholder: string;
    filterTitle: string;
    statusLabel: string;
    statusItems: string[];
    typeLabel: string;
    typeItems: string[];
    audienceLabel: string;
    audienceItems: string[];
    calendarTitle: string;
    previous: string;
    next: string;
    weekdays: string[];
    noDatesTitle: string;
    noDatesBody: string;
    timelineTitle: string;
    timelineBody: string;
    allEvents: string;
    myEvents: string;
    createEvent: string;
  };
  formats: {
    eyebrow: string;
    title: string;
    body: string;
    items: Array<{ title: string; body: string }>;
  };
  journey: {
    eyebrow: string;
    title: string;
    body: string;
    steps: Array<{ label: string; title: string; body: string }>;
  };
  detail: {
    eyebrow: string;
    title: string;
    body: string;
    panelTitle: string;
    panelState: string;
    rows: Array<{ label: string; value: string }>;
    actions: string[];
    gate: string;
  };
  access: {
    eyebrow: string;
    title: string;
    body: string;
    points: Array<{ title: string; body: string }>;
  };
  host: {
    eyebrow: string;
    title: string;
    body: string;
    process: Array<{ title: string; body: string }>;
    action: string;
    gate: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: Array<{ question: string; answer: string }>;
  };
  closing: {
    eyebrow: string;
    title: string;
    body: string;
    action: string;
  };
  mediaDisclosure: string;
};

const en: EventsCopy = {
  pageLabel: "Events",
  metaDescription: "Discover how talks, workshops, meetups and community gatherings are organised through CRAYS Clubs, with live event data held behind an evidence gate.",
  hero: {
    eyebrow: "CRAYS Clubs Events",
    title: "A calendar is useful. The people in it make it matter.",
    lead: "CRAYS Events is the shared place for finding talks, practical workshops, member-led meetups, community tables and movement sessions. Discovery, access, approval, attendance and check-in remain separate so every event can state clearly who it is for and what is actually confirmed.",
    primary: "Explore the event journey",
    secondary: "Discuss hosting",
    boundary: "No public CRAYS event inventory, date, speaker or place is authorised in this source state. The page therefore shows the complete discovery system without presenting sample events as real availability.",
  },
  discover: {
    eyebrow: "Discover",
    title: "Search by interest, then understand the access state.",
    body: "The reference journey combines search, filters, a date view and a chronological event stream. CRAYS preserves those functions while keeping unpublished inventory closed. A future authorised feed can populate this surface without changing the information architecture.",
    searchLabel: "Search events",
    searchPlaceholder: "Search by title, topic, host or place",
    filterTitle: "Filter by",
    statusLabel: "My status",
    statusItems: ["All events", "My events", "Hosting", "Invited"],
    typeLabel: "Event type",
    typeItems: ["Talks", "Workshops", "Meetups", "Community gatherings"],
    audienceLabel: "Audience",
    audienceItems: ["All audiences", "Adults only", "Family-specific"],
    calendarTitle: "Event calendar",
    previous: "Previous period",
    next: "Next period",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    noDatesTitle: "Published dates are not connected yet.",
    noDatesBody: "The calendar remains intentionally empty until an authorised CRAYS inventory contract provides event identity, time zone, start and end time, location, access rule and publication state.",
    timelineTitle: "Upcoming events",
    timelineBody: "No event is presented as upcoming in this source-only implementation. When authorised, entries will group by date and retain status, audience, host, location and registration state.",
    allEvents: "All events",
    myEvents: "My events",
    createEvent: "Create event",
  },
  formats: {
    eyebrow: "What belongs here",
    title: "Different formats, one legible community rhythm.",
    body: "An event page should show more than a poster. Each format needs enough context to help a person judge relevance, required preparation, audience fit and the point at which interest becomes a confirmed place.",
    items: [
      { title: "Talks and conversations", body: "A focused subject, a clearly identified host or speaker role, an audience frame and room for questions. Names and credentials appear only after CRAYS has approved the underlying event record." },
      { title: "Workshops and build sessions", body: "Hands-on formats state what participants will work on, what they should bring, whether capacity is limited and whether a request needs review before confirmation." },
      { title: "Meetups and shared tables", body: "Smaller social formats make the purpose, meeting point and community boundary visible without turning a casual gathering into an unsupported attendance promise." },
      { title: "Movement and outdoor sessions", body: "Activity-led events disclose their audience, accessibility and practical conditions event by event. A category never implies that every session is available or suitable for everyone." },
    ],
  },
  journey: {
    eyebrow: "From discovery to the door",
    title: "Every state has one job.",
    body: "The reference separates browsing, invitations, requests, approval, registration and tickets. CRAYS keeps that separation so an interface label never quietly becomes an admission or booking claim.",
    steps: [
      { label: "01", title: "Discover", body: "Search, filter or browse by date without creating a registration state." },
      { label: "02", title: "Open details", body: "Read the event purpose, time, location, host role, audience rule and publication status." },
      { label: "03", title: "Choose a route", body: "An event may support open RSVP, invitation response or request-to-join. Those routes are not interchangeable." },
      { label: "04", title: "Review when required", body: "A request can remain pending, be accepted or be declined. Pending review is not registration." },
      { label: "05", title: "Confirm attendance", body: "Only the authorised event service may create a confirmed registration and communicate any event-specific conditions." },
      { label: "06", title: "Ticket and check-in", body: "A ticket or QR role appears only after confirmation and remains distinct from identity, membership, payment and venue access." },
      { label: "07", title: "Change or cancel", body: "Withdrawal and cancellation retain an auditable state and follow the terms attached to that specific event." },
    ],
  },
  detail: {
    eyebrow: "Event details",
    title: "One panel should answer the practical questions.",
    body: "The source opens an event in a focused detail surface rather than losing the visitor in a second navigation system. The CRAYS counterpart reserves every required field while refusing to populate facts that have not been published.",
    panelTitle: "Event record",
    panelState: "Awaiting authorised event data",
    rows: [
      { label: "When", value: "Date, local time and duration pending" },
      { label: "Where", value: "Verified venue or online location pending" },
      { label: "Hosted by", value: "Approved host identity pending" },
      { label: "Audience", value: "Open, adults-only or family-specific rule pending" },
      { label: "Access", value: "RSVP, invitation or request-to-join rule pending" },
      { label: "Attendance", value: "No count or capacity published" },
    ],
    actions: ["Request to join", "Accept invitation", "View ticket", "Copy event link"],
    gate: "These controls document the interaction roles only. They remain inactive until identity, event persistence, approval, ticketing and response ownership are authorised.",
  },
  access: {
    eyebrow: "Audience and access",
    title: "Relevant does not automatically mean available.",
    body: "Filters help people find a plausible event. They do not override a host decision, capacity, age rule, family condition, membership boundary or final confirmation.",
    points: [
      { title: "Open RSVP", body: "An open RSVP still requires a published event record and a successful confirmation response. A visible button alone is not a place." },
      { title: "Request to join", body: "The attendee can provide the requested context. The request remains pending until the authorised reviewer responds." },
      { title: "Invitation", body: "An invitation has its own accept or decline state. It does not silently enrol another person or bypass event-specific conditions." },
      { title: "Adults and families", body: "Adults-only and family-specific are explicit event attributes. CRAYS will not infer child suitability, supervision, care or universal access from an event category." },
    ],
  },
  host: {
    eyebrow: "Host with CRAYS",
    title: "Start with a purpose, not a public listing.",
    body: "A host journey needs editorial review, accountable ownership and an operational plan before an event enters the calendar. The source role called Create Event is therefore represented as a governed CRAYS process rather than an open publishing form.",
    process: [
      { title: "Frame the event", body: "Describe the purpose, audience, format, proposed timing, expected setting and the value for the community." },
      { title: "Review the operating needs", body: "CRAYS confirms the responsible host, venue fit, access logic, capacity model, media expectations and any event-specific paperwork." },
      { title: "Publish only after approval", body: "Dates, speakers, logos, sponsors, registration paths and availability remain private until the CRAYS team has verified and approved them." },
    ],
    action: "Discuss an event",
    gate: "The Contact route starts a conversation only. It does not create an event, reserve a venue, confirm availability or authorise public promotion.",
  },
  faq: {
    eyebrow: "Practical questions",
    title: "Before an event becomes a plan.",
    items: [
      { question: "Are there confirmed CRAYS events on this page now?", answer: "No. This source implementation contains the complete discovery and participation structure, but no authorised live inventory has been connected. It therefore makes no date or availability claim." },
      { question: "Can I register through this page?", answer: "Not yet. RSVP, request, invitation response and ticket controls remain inactive until an authorised internal event contract, identity flow and response owner are demonstrably connected." },
      { question: "What is the difference between RSVP and request to join?", answer: "An RSVP asks the event service to confirm attendance under an open route. A request to join enters review and can remain pending or be declined. Neither state is a membership decision." },
      { question: "Does My Events mean I am registered?", answer: "No. My Events is a view across events linked to your account and can include hosting, invitations, pending requests or confirmed registrations. Each status must remain visible." },
      { question: "Are events family-friendly?", answer: "Only an event explicitly published as family-specific may be shown that way. No childcare, supervision, programme suitability or universal family access is inferred." },
      { question: "Can I propose or host an event?", answer: "You can start a conversation through Contact. CRAYS must review the proposal, operating responsibilities and publication facts before any event is listed." },
      { question: "When does a ticket become available?", answer: "Only after the authorised service has created a confirmed registration for an event that uses tickets. A QR code or check-in role is not generated in this source-only page." },
    ],
  },
  closing: {
    eyebrow: "Events at CRAYS",
    title: "Find the room where the next useful conversation can begin.",
    body: "The calendar will become live only with verified events and accountable participation states. Until then, the hosting conversation is the truthful next step.",
    action: "Discuss an event",
  },
  mediaDisclosure: "Licensed editorial reference image. It does not depict a CRAYS event, location, member, speaker or endorsement.",
};

const de: EventsCopy = {
  pageLabel: "Events",
  metaDescription: "So organisiert CRAYS Clubs Talks, Workshops, Meetups und Community-Treffen, während Live-Eventdaten bis zur Freigabe gesperrt bleiben.",
  hero: {
    eyebrow: "CRAYS Clubs Events",
    title: "Ein Kalender ist nützlich. Die Menschen darin machen ihn relevant.",
    lead: "CRAYS Events ist der gemeinsame Ort für Talks, praktische Workshops, mitgliedergeführte Meetups, Community-Tische und Bewegungssessions. Entdeckung, Zugang, Prüfung, Teilnahme und Check-in bleiben getrennt, damit jedes Event klar ausweist, für wen es gedacht und was tatsächlich bestätigt ist.",
    primary: "Event-Journey entdecken",
    secondary: "Hosting besprechen",
    boundary: "In diesem Quellenstand ist kein öffentliches CRAYS-Event, Datum, Speaker oder Ort autorisiert. Die Seite zeigt deshalb das vollständige Discovery-System, ohne Beispieldaten als echte Verfügbarkeit darzustellen.",
  },
  discover: {
    eyebrow: "Entdecken",
    title: "Nach Interesse suchen und danach den Zugangsstatus verstehen.",
    body: "Die Referenz verbindet Suche, Filter, Datumsansicht und einen chronologischen Event-Stream. CRAYS erhält diese Funktionen und hält unveröffentlichtes Inventar geschlossen. Ein später autorisierter Feed kann diese Fläche befüllen, ohne die Informationsarchitektur zu verändern.",
    searchLabel: "Events suchen",
    searchPlaceholder: "Nach Titel, Thema, Host oder Ort suchen",
    filterTitle: "Filtern nach",
    statusLabel: "Mein Status",
    statusItems: ["Alle Events", "Meine Events", "Hosting", "Eingeladen"],
    typeLabel: "Eventtyp",
    typeItems: ["Talks", "Workshops", "Meetups", "Community-Treffen"],
    audienceLabel: "Publikum",
    audienceItems: ["Alle Zielgruppen", "Nur Erwachsene", "Familienspezifisch"],
    calendarTitle: "Eventkalender",
    previous: "Vorheriger Zeitraum",
    next: "Nächster Zeitraum",
    weekdays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    noDatesTitle: "Veröffentlichte Termine sind noch nicht angebunden.",
    noDatesBody: "Der Kalender bleibt absichtlich leer, bis ein autorisierter CRAYS-Inventarvertrag Eventidentität, Zeitzone, Start, Ende, Ort, Zugangsregel und Publikationsstatus liefert.",
    timelineTitle: "Kommende Events",
    timelineBody: "In dieser reinen Quellenimplementierung wird kein Event als kommend dargestellt. Nach Autorisierung werden Einträge nach Datum gruppiert und behalten Status, Zielgruppe, Host, Ort und Registrierungsstand.",
    allEvents: "Alle Events",
    myEvents: "Meine Events",
    createEvent: "Event erstellen",
  },
  formats: {
    eyebrow: "Was hierher gehört",
    title: "Unterschiedliche Formate, ein lesbarer Community-Rhythmus.",
    body: "Eine Eventseite muss mehr als ein Poster zeigen. Jedes Format braucht genug Kontext, damit Menschen Relevanz, Vorbereitung, Zielgruppenpassung und den Übergang von Interesse zu bestätigter Teilnahme beurteilen können.",
    items: [
      { title: "Talks und Gespräche", body: "Ein fokussiertes Thema, eine klar ausgewiesene Host- oder Speaker-Rolle, ein Zielgruppenrahmen und Raum für Fragen. Namen und Qualifikationen erscheinen erst nach Freigabe des zugrunde liegenden Eventdatensatzes." },
      { title: "Workshops und Build Sessions", body: "Praxisformate erklären, woran gearbeitet wird, was mitzubringen ist, ob Kapazität begrenzt ist und ob eine Anfrage vor Bestätigung geprüft werden muss." },
      { title: "Meetups und gemeinsame Tische", body: "Kleinere soziale Formate machen Zweck, Treffpunkt und Community-Grenze sichtbar, ohne aus einem lockeren Treffen ein unbelegtes Teilnahmeversprechen zu machen." },
      { title: "Bewegung und Outdoor", body: "Aktivitätsformate nennen Zielgruppe, Barrierebedingungen und praktische Voraussetzungen je Event. Eine Kategorie bedeutet niemals, dass jede Session verfügbar oder für alle geeignet ist." },
    ],
  },
  journey: {
    eyebrow: "Von der Entdeckung bis zur Tür",
    title: "Jeder Status hat genau eine Aufgabe.",
    body: "Die Referenz trennt Browsing, Einladungen, Anfragen, Prüfung, Registrierung und Tickets. CRAYS behält diese Trennung, damit ein Interface-Label nicht stillschweigend zu Admission- oder Booking-Claim wird.",
    steps: [
      { label: "01", title: "Entdecken", body: "Suchen, filtern oder nach Datum stöbern, ohne einen Registrierungsstatus zu erzeugen." },
      { label: "02", title: "Details öffnen", body: "Zweck, Zeit, Ort, Host-Rolle, Zielgruppenregel und Publikationsstatus lesen." },
      { label: "03", title: "Route wählen", body: "Ein Event kann offenes RSVP, Einladungsantwort oder Join-Anfrage unterstützen. Diese Wege sind nicht austauschbar." },
      { label: "04", title: "Prüfung bei Bedarf", body: "Eine Anfrage kann ausstehen, angenommen oder abgelehnt werden. Pending Review ist keine Registrierung." },
      { label: "05", title: "Teilnahme bestätigen", body: "Nur der autorisierte Eventservice darf eine bestätigte Registrierung erzeugen und eventspezifische Bedingungen kommunizieren." },
      { label: "06", title: "Ticket und Check-in", body: "Ticket oder QR erscheinen erst nach Bestätigung und bleiben getrennt von Identität, Mitgliedschaft, Zahlung und Venue-Zugang." },
      { label: "07", title: "Ändern oder stornieren", body: "Rückzug und Stornierung behalten einen auditierbaren Status und folgen den Bedingungen des konkreten Events." },
    ],
  },
  detail: {
    eyebrow: "Eventdetails",
    title: "Ein Panel sollte die praktischen Fragen beantworten.",
    body: "Die Quelle öffnet ein Event in einer fokussierten Detailfläche, statt Besucher in einer zweiten Navigation zu verlieren. Das CRAYS-Gegenstück reserviert jedes notwendige Feld und verweigert Fakten, die noch nicht publiziert wurden.",
    panelTitle: "Eventdatensatz",
    panelState: "Wartet auf autorisierte Eventdaten",
    rows: [
      { label: "Wann", value: "Datum, Ortszeit und Dauer ausstehend" },
      { label: "Wo", value: "Verifizierter Ort oder Online-Location ausstehend" },
      { label: "Hosted by", value: "Freigegebene Host-Identität ausstehend" },
      { label: "Zielgruppe", value: "Offen, nur Erwachsene oder familienspezifisch ausstehend" },
      { label: "Zugang", value: "RSVP-, Einladungs- oder Join-Anfrage-Regel ausstehend" },
      { label: "Teilnahme", value: "Keine Zahl oder Kapazität veröffentlicht" },
    ],
    actions: ["Join anfragen", "Einladung annehmen", "Ticket ansehen", "Eventlink kopieren"],
    gate: "Diese Controls dokumentieren nur die Interaktionsrollen. Sie bleiben inaktiv, bis Identität, Eventpersistenz, Prüfung, Ticketing und Response-Verantwortung autorisiert sind.",
  },
  access: {
    eyebrow: "Zielgruppe und Zugang",
    title: "Relevant bedeutet nicht automatisch verfügbar.",
    body: "Filter helfen, ein passendes Event zu finden. Sie überschreiben keine Host-Entscheidung, Kapazität, Altersregel, Familienbedingung, Mitgliedschaftsgrenze oder finale Bestätigung.",
    points: [
      { title: "Offenes RSVP", body: "Auch offenes RSVP verlangt einen publizierten Eventdatensatz und eine erfolgreiche Bestätigungsantwort. Ein sichtbarer Button ist noch kein Platz." },
      { title: "Join anfragen", body: "Teilnehmende können den verlangten Kontext liefern. Die Anfrage bleibt offen, bis die autorisierte Prüfung antwortet." },
      { title: "Einladung", body: "Eine Einladung besitzt eigene Accept- und Decline-Zustände. Sie meldet niemanden stillschweigend an und umgeht keine Eventbedingungen." },
      { title: "Erwachsene und Familien", body: "Adults-only und familienspezifisch sind explizite Eventattribute. CRAYS leitet keine Kindergeeignetheit, Betreuung, Aufsicht oder Universalzugang aus einer Kategorie ab." },
    ],
  },
  host: {
    eyebrow: "Mit CRAYS hosten",
    title: "Mit einem Zweck beginnen, nicht mit einem öffentlichen Listing.",
    body: "Eine Host-Journey braucht redaktionelle Prüfung, klare Verantwortung und einen Betriebsplan, bevor ein Event in den Kalender gelangt. Die Quellenrolle Create Event wird deshalb als gesteuerter CRAYS-Prozess statt als offenes Publishing-Formular dargestellt.",
    process: [
      { title: "Event rahmen", body: "Zweck, Zielgruppe, Format, vorgeschlagenen Zeitpunkt, Umgebung und Wert für die Community beschreiben." },
      { title: "Betriebsbedarf prüfen", body: "CRAYS bestätigt verantwortlichen Host, Venue-Fit, Zugangslogik, Kapazitätsmodell, Medienerwartungen und eventspezifisches Paperwork." },
      { title: "Erst nach Freigabe publizieren", body: "Termine, Speaker, Logos, Sponsoren, Registrierung und Verfügbarkeit bleiben privat, bis das CRAYS-Team sie geprüft und freigegeben hat." },
    ],
    action: "Event besprechen",
    gate: "Die Contact-Route startet nur ein Gespräch. Sie erstellt kein Event, reserviert keinen Ort, bestätigt keine Verfügbarkeit und autorisiert keine öffentliche Bewerbung.",
  },
  faq: {
    eyebrow: "Praktische Fragen",
    title: "Bevor ein Event zum Plan wird.",
    items: [
      { question: "Gibt es jetzt bestätigte CRAYS-Events auf dieser Seite?", answer: "Nein. Die Quellenimplementierung enthält die vollständige Discovery- und Teilnahme-Struktur, aber kein autorisiertes Live-Inventar. Deshalb gibt es keinen Termin- oder Verfügbarkeitsclaim." },
      { question: "Kann ich mich über diese Seite registrieren?", answer: "Noch nicht. RSVP, Anfrage, Einladungsantwort und Ticket bleiben inaktiv, bis interner Eventvertrag, Identity-Flow und Response Owner nachweislich autorisiert sind." },
      { question: "Was unterscheidet RSVP von Join-Anfrage?", answer: "RSVP bittet den Eventservice um Bestätigung über eine offene Route. Eine Join-Anfrage geht in Prüfung und kann ausstehen oder abgelehnt werden. Keiner der Zustände ist eine Mitgliedschaftsentscheidung." },
      { question: "Bedeutet Meine Events, dass ich registriert bin?", answer: "Nein. Meine Events kann Hosting, Einladungen, offene Anfragen oder bestätigte Registrierungen enthalten. Jeder Status muss sichtbar bleiben." },
      { question: "Sind Events familienfreundlich?", answer: "Nur ein ausdrücklich familienspezifisch publiziertes Event darf so erscheinen. Betreuung, Aufsicht, Programmeignung oder allgemeiner Familienzugang werden nicht abgeleitet." },
      { question: "Kann ich ein Event vorschlagen oder hosten?", answer: "Über Contact kann ein Gespräch beginnen. Vor einem Listing prüft CRAYS Vorschlag, Betriebsverantwortung und Publikationsfakten." },
      { question: "Wann wird ein Ticket verfügbar?", answer: "Erst nachdem der autorisierte Service eine bestätigte Registrierung für ein Event mit Ticketing erzeugt hat. Diese Quellseite generiert weder QR noch Check-in." },
    ],
  },
  closing: {
    eyebrow: "Events bei CRAYS",
    title: "Finde den Raum, in dem das nächste nützliche Gespräch beginnen kann.",
    body: "Der Kalender wird erst mit verifizierten Events und verantworteten Teilnahmezuständen live. Bis dahin ist das Hosting-Gespräch der wahrheitsgemäße nächste Schritt.",
    action: "Event besprechen",
  },
  mediaDisclosure: "Lizenzierte redaktionelle Referenzaufnahme. Sie zeigt kein CRAYS-Event, keinen CRAYS-Ort, kein Mitglied, keinen Speaker und kein Endorsement.",
};

const es: EventsCopy = {
  pageLabel: "Eventos",
  metaDescription: "Descubre cómo CRAYS Clubs organiza charlas, talleres, encuentros y reuniones comunitarias, con los datos en directo cerrados hasta su autorización.",
  hero: {
    eyebrow: "Eventos de CRAYS Clubs",
    title: "Un calendario es útil. Las personas que lo llenan le dan sentido.",
    lead: "CRAYS Events reúne charlas, talleres prácticos, encuentros impulsados por miembros, mesas comunitarias y sesiones de movimiento. Descubrimiento, acceso, revisión, asistencia y check-in permanecen separados para que cada evento indique con claridad a quién se dirige y qué está realmente confirmado.",
    primary: "Explorar el recorrido",
    secondary: "Hablar sobre organizar",
    boundary: "En este estado no hay ningún evento, fecha, ponente o lugar público de CRAYS autorizado. La página muestra el sistema completo sin presentar ejemplos como disponibilidad real.",
  },
  discover: {
    eyebrow: "Descubrir",
    title: "Busca por interés y entiende después el estado de acceso.",
    body: "La referencia combina búsqueda, filtros, vista de fechas y flujo cronológico. CRAYS conserva todas esas funciones manteniendo cerrado el inventario no publicado. Un feed autorizado podrá ocupar esta superficie sin alterar su arquitectura.",
    searchLabel: "Buscar eventos",
    searchPlaceholder: "Buscar por título, tema, anfitrión o lugar",
    filterTitle: "Filtrar por",
    statusLabel: "Mi estado",
    statusItems: ["Todos", "Mis eventos", "Organizando", "Invitado"],
    typeLabel: "Tipo de evento",
    typeItems: ["Charlas", "Talleres", "Encuentros", "Reuniones comunitarias"],
    audienceLabel: "Público",
    audienceItems: ["Todos los públicos", "Solo adultos", "Específico para familias"],
    calendarTitle: "Calendario de eventos",
    previous: "Periodo anterior",
    next: "Periodo siguiente",
    weekdays: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    noDatesTitle: "Las fechas publicadas aún no están conectadas.",
    noDatesBody: "El calendario queda vacío hasta que un contrato autorizado aporte identidad del evento, zona horaria, inicio, fin, lugar, acceso y estado de publicación.",
    timelineTitle: "Próximos eventos",
    timelineBody: "Ningún evento aparece como próximo en esta implementación de fuente. Cuando exista autorización, se agruparán por fecha conservando estado, público, anfitrión, lugar y registro.",
    allEvents: "Todos los eventos",
    myEvents: "Mis eventos",
    createEvent: "Crear evento",
  },
  formats: {
    eyebrow: "Qué pertenece aquí",
    title: "Formatos distintos, un ritmo comunitario legible.",
    body: "Una página de evento debe ofrecer más que un cartel. Cada formato necesita contexto para valorar relevancia, preparación, encaje del público y el momento en que el interés se convierte en plaza confirmada.",
    items: [
      { title: "Charlas y conversaciones", body: "Tema enfocado, rol claro de anfitrión o ponente, marco de público y espacio para preguntas. Nombres y credenciales solo aparecen tras aprobar el registro del evento." },
      { title: "Talleres y sesiones de construcción", body: "Los formatos prácticos explican qué se hará, qué llevar, si existe límite y si una solicitud necesita revisión previa." },
      { title: "Encuentros y mesas compartidas", body: "Los formatos sociales pequeños muestran propósito, punto de reunión y límites comunitarios sin prometer asistencia." },
      { title: "Movimiento y aire libre", body: "Cada actividad declara público, accesibilidad y condiciones prácticas. Una categoría nunca implica disponibilidad o idoneidad universal." },
    ],
  },
  journey: {
    eyebrow: "Del descubrimiento a la puerta",
    title: "Cada estado tiene una sola función.",
    body: "La referencia separa navegación, invitación, solicitud, aprobación, registro y entrada. CRAYS mantiene esa separación para que una etiqueta no se convierta silenciosamente en promesa de admisión o reserva.",
    steps: [
      { label: "01", title: "Descubrir", body: "Buscar, filtrar o navegar por fecha sin crear registro." },
      { label: "02", title: "Abrir detalles", body: "Leer propósito, hora, lugar, anfitrión, público y publicación." },
      { label: "03", title: "Elegir ruta", body: "Puede haber RSVP abierto, respuesta a invitación o solicitud. No son intercambiables." },
      { label: "04", title: "Revisión", body: "Una solicitud puede quedar pendiente, aceptarse o rechazarse. Pendiente no es registro." },
      { label: "05", title: "Confirmar asistencia", body: "Solo el servicio autorizado confirma y comunica condiciones específicas." },
      { label: "06", title: "Entrada y check-in", body: "Ticket o QR aparece tras confirmar y queda separado de identidad, membresía, pago y acceso." },
      { label: "07", title: "Cambiar o cancelar", body: "Retirada y cancelación conservan estado auditable y siguen condiciones del evento." },
    ],
  },
  detail: {
    eyebrow: "Detalles",
    title: "Un panel debe responder las preguntas prácticas.",
    body: "La fuente abre el evento en una superficie enfocada. CRAYS reserva todos los campos requeridos sin rellenar hechos no publicados.",
    panelTitle: "Registro del evento",
    panelState: "Pendiente de datos autorizados",
    rows: [
      { label: "Cuándo", value: "Fecha, hora local y duración pendientes" },
      { label: "Dónde", value: "Lugar verificado o ubicación online pendiente" },
      { label: "Organiza", value: "Identidad aprobada pendiente" },
      { label: "Público", value: "Regla abierta, adulta o familiar pendiente" },
      { label: "Acceso", value: "RSVP, invitación o solicitud pendiente" },
      { label: "Asistencia", value: "Sin cifra ni capacidad publicada" },
    ],
    actions: ["Solicitar acceso", "Aceptar invitación", "Ver entrada", "Copiar enlace"],
    gate: "Los controles documentan roles de interacción. Siguen inactivos hasta autorizar identidad, persistencia, revisión, ticketing y responsabilidad de respuesta.",
  },
  access: {
    eyebrow: "Público y acceso",
    title: "Relevante no significa automáticamente disponible.",
    body: "Los filtros ayudan a encontrar un evento plausible, pero no sustituyen decisión del anfitrión, capacidad, edad, condiciones familiares, membresía o confirmación.",
    points: [
      { title: "RSVP abierto", body: "Necesita un evento publicado y respuesta de confirmación. Un botón visible no es una plaza." },
      { title: "Solicitud", body: "La persona aporta el contexto pedido y espera al revisor autorizado." },
      { title: "Invitación", body: "Tiene estados propios de aceptar o rechazar y no evita condiciones específicas." },
      { title: "Adultos y familias", body: "Son atributos explícitos. CRAYS no deduce cuidado infantil, supervisión o idoneidad por categoría." },
    ],
  },
  host: {
    eyebrow: "Organiza con CRAYS",
    title: "Empieza por el propósito, no por publicar.",
    body: "Organizar exige revisión editorial, responsabilidad y plan operativo antes de entrar al calendario. Crear evento se representa como proceso gobernado, no formulario abierto.",
    process: [
      { title: "Definir", body: "Explicar propósito, público, formato, momento, entorno y valor comunitario." },
      { title: "Revisar operaciones", body: "CRAYS confirma anfitrión responsable, lugar, acceso, capacidad, medios y documentación." },
      { title: "Publicar tras aprobación", body: "Fechas, ponentes, logos, patrocinadores, registro y disponibilidad siguen privados hasta la aprobación." },
    ],
    action: "Hablar de un evento",
    gate: "Contact solo inicia una conversación. No crea un evento, reserva un lugar, confirma disponibilidad ni autoriza promoción.",
  },
  faq: {
    eyebrow: "Preguntas prácticas",
    title: "Antes de convertir un evento en plan.",
    items: [
      { question: "¿Hay eventos CRAYS confirmados ahora?", answer: "No. La estructura está implementada, pero no existe inventario autorizado conectado; no se afirma fecha ni disponibilidad." },
      { question: "¿Puedo registrarme aquí?", answer: "Aún no. RSVP, solicitud, invitación y ticket siguen inactivos hasta autorizar contrato, identidad y respuesta." },
      { question: "¿Qué diferencia hay entre RSVP y solicitud?", answer: "RSVP pide confirmación en una ruta abierta. La solicitud entra en revisión y puede quedar pendiente o rechazarse. Ninguna decide membresía." },
      { question: "¿Mis eventos significa que estoy registrado?", answer: "No. Puede incluir hosting, invitaciones, solicitudes o registros confirmados, siempre con estado visible." },
      { question: "¿Los eventos son familiares?", answer: "Solo si el evento se publica expresamente así. No se infiere cuidado, supervisión o acceso general." },
      { question: "¿Puedo proponer u organizar?", answer: "Puedes iniciar una conversación en Contact. CRAYS revisa operación y hechos antes de publicar." },
      { question: "¿Cuándo aparece la entrada?", answer: "Solo tras un registro confirmado en un evento con tickets. Esta página no genera QR ni check-in." },
    ],
  },
  closing: {
    eyebrow: "Eventos en CRAYS",
    title: "Encuentra la sala donde puede empezar la próxima conversación útil.",
    body: "El calendario será real solo con eventos verificados y estados responsables. Hasta entonces, hablar sobre hosting es el siguiente paso verdadero.",
    action: "Hablar de un evento",
  },
  mediaDisclosure: "Imagen editorial con licencia. No muestra un evento, lugar, miembro, ponente ni respaldo de CRAYS.",
};

const ca: EventsCopy = {
  pageLabel: "Esdeveniments",
  metaDescription: "Descobreix com CRAYS Clubs organitza xerrades, tallers, trobades i reunions comunitàries, amb les dades en directe tancades fins a autorització.",
  hero: {
    eyebrow: "Esdeveniments CRAYS Clubs",
    title: "Un calendari és útil. Les persones que l'omplen li donen sentit.",
    lead: "CRAYS Events reuneix xerrades, tallers pràctics, trobades impulsades per membres, taules comunitàries i sessions de moviment. Descoberta, accés, revisió, assistència i check-in romanen separats perquè cada esdeveniment indiqui a qui s'adreça i què està confirmat.",
    primary: "Explorar el recorregut",
    secondary: "Parlar d'organitzar",
    boundary: "En aquest estat no hi ha cap esdeveniment, data, ponent o lloc públic de CRAYS autoritzat. La pàgina mostra el sistema complet sense presentar exemples com disponibilitat real.",
  },
  discover: {
    eyebrow: "Descobrir",
    title: "Cerca per interès i entén després l'estat d'accés.",
    body: "La referència combina cerca, filtres, vista de dates i flux cronològic. CRAYS conserva aquestes funcions mantenint tancat l'inventari no publicat. Un feed autoritzat podrà omplir la superfície sense canviar l'arquitectura.",
    searchLabel: "Cercar esdeveniments",
    searchPlaceholder: "Cerca per títol, tema, amfitrió o lloc",
    filterTitle: "Filtrar per",
    statusLabel: "El meu estat",
    statusItems: ["Tots", "Els meus esdeveniments", "Organitzant", "Convidat"],
    typeLabel: "Tipus",
    typeItems: ["Xerrades", "Tallers", "Trobades", "Reunions comunitàries"],
    audienceLabel: "Públic",
    audienceItems: ["Tots els públics", "Només adults", "Específic per a famílies"],
    calendarTitle: "Calendari",
    previous: "Període anterior",
    next: "Període següent",
    weekdays: ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"],
    noDatesTitle: "Les dates publicades encara no estan connectades.",
    noDatesBody: "El calendari queda buit fins que un contracte autoritzat aporti identitat, zona horària, inici, final, lloc, accés i publicació.",
    timelineTitle: "Pròxims esdeveniments",
    timelineBody: "Cap esdeveniment es presenta com a pròxim. Amb autorització, les entrades s'agruparan per data mantenint estat, públic, amfitrió, lloc i registre.",
    allEvents: "Tots",
    myEvents: "Els meus",
    createEvent: "Crear esdeveniment",
  },
  formats: {
    eyebrow: "Què hi pertany",
    title: "Formats diferents, un ritme comunitari llegible.",
    body: "Una pàgina ha de mostrar més que un cartell. Cada format necessita context per valorar rellevància, preparació, públic i el moment en què l'interès esdevé plaça confirmada.",
    items: [
      { title: "Xerrades i converses", body: "Tema enfocat, rol clar d'amfitrió o ponent, marc de públic i preguntes. Noms i credencials només després d'aprovar el registre." },
      { title: "Tallers i sessions de construcció", body: "Expliquen què es farà, què cal portar, si hi ha límit i si la sol·licitud necessita revisió." },
      { title: "Trobades i taules compartides", body: "Fan visibles propòsit, punt de trobada i límits sense prometre assistència." },
      { title: "Moviment i aire lliure", body: "Cada activitat declara públic, accessibilitat i condicions. La categoria no implica disponibilitat universal." },
    ],
  },
  journey: {
    eyebrow: "De la descoberta a la porta",
    title: "Cada estat té una sola funció.",
    body: "La referència separa navegació, invitació, sol·licitud, aprovació, registre i entrada. CRAYS manté aquesta separació sense convertir etiquetes en promeses.",
    steps: [
      { label: "01", title: "Descobrir", body: "Cercar, filtrar o navegar sense crear registre." },
      { label: "02", title: "Obrir detalls", body: "Llegir propòsit, hora, lloc, amfitrió, públic i publicació." },
      { label: "03", title: "Triar ruta", body: "RSVP obert, invitació o sol·licitud no són intercanviables." },
      { label: "04", title: "Revisió", body: "Una sol·licitud pot quedar pendent, acceptar-se o rebutjar-se." },
      { label: "05", title: "Confirmar", body: "Només el servei autoritzat confirma l'assistència." },
      { label: "06", title: "Entrada i check-in", body: "Ticket o QR apareix després de confirmar i resta separat de membresia i pagament." },
      { label: "07", title: "Canviar o cancel·lar", body: "La retirada conserva estat auditable i segueix les condicions específiques." },
    ],
  },
  detail: {
    eyebrow: "Detalls",
    title: "Un panell ha de respondre les preguntes pràctiques.",
    body: "La font obre l'esdeveniment en una superfície enfocada. CRAYS reserva tots els camps sense inventar fets.",
    panelTitle: "Registre",
    panelState: "Pendent de dades autoritzades",
    rows: [
      { label: "Quan", value: "Data, hora local i durada pendents" },
      { label: "On", value: "Lloc verificat o online pendent" },
      { label: "Organitza", value: "Identitat aprovada pendent" },
      { label: "Públic", value: "Regla oberta, adulta o familiar pendent" },
      { label: "Accés", value: "RSVP, invitació o sol·licitud pendent" },
      { label: "Assistència", value: "Sense xifra ni capacitat publicada" },
    ],
    actions: ["Sol·licitar accés", "Acceptar invitació", "Veure entrada", "Copiar enllaç"],
    gate: "Els controls només documenten rols i romanen inactius fins a autoritzar identitat, persistència, revisió, ticketing i resposta.",
  },
  access: {
    eyebrow: "Públic i accés",
    title: "Rellevant no significa automàticament disponible.",
    body: "Els filtres ajuden, però no anul·len decisió de l'amfitrió, capacitat, edat, família, membresia o confirmació.",
    points: [
      { title: "RSVP obert", body: "Cal registre publicat i resposta confirmada. Un botó no és una plaça." },
      { title: "Sol·licitud", body: "La persona aporta context i espera la revisió autoritzada." },
      { title: "Invitació", body: "Té acceptació i rebuig propis i no evita condicions." },
      { title: "Adults i famílies", body: "Són atributs explícits; no s'infereix cura, supervisió o idoneïtat." },
    ],
  },
  host: {
    eyebrow: "Organitza amb CRAYS",
    title: "Comença pel propòsit, no per publicar.",
    body: "Cal revisió editorial, responsabilitat i pla operatiu abans d'entrar al calendari. Crear esdeveniment és un procés governat.",
    process: [
      { title: "Definir", body: "Descriure propòsit, públic, format, moment, entorn i valor." },
      { title: "Revisar operacions", body: "CRAYS confirma host, lloc, accés, capacitat, mitjans i documentació." },
      { title: "Publicar després d'aprovar", body: "Dates, ponents, logos, patrocinadors, registre i disponibilitat resten privats fins a aprovació." },
    ],
    action: "Parlar d'un esdeveniment",
    gate: "Contact només inicia conversa; no crea, reserva, confirma ni autoritza promoció.",
  },
  faq: {
    eyebrow: "Preguntes pràctiques",
    title: "Abans de convertir un esdeveniment en pla.",
    items: [
      { question: "Hi ha esdeveniments CRAYS confirmats?", answer: "No. L'estructura és completa, però no hi ha inventari autoritzat connectat." },
      { question: "Puc registrar-m'hi?", answer: "Encara no. RSVP, sol·licitud, invitació i ticket esperen contracte i identitat autoritzats." },
      { question: "Quina diferència hi ha entre RSVP i sol·licitud?", answer: "RSVP demana confirmació en ruta oberta; la sol·licitud entra en revisió. Cap decideix membresia." },
      { question: "Els meus esdeveniments vol dir registrat?", answer: "No. Pot incloure hosting, invitacions, sol·licituds o confirmacions amb estat visible." },
      { question: "Són familiars?", answer: "Només quan es publica explícitament. No s'infereix cura o supervisió." },
      { question: "Puc proposar o organitzar?", answer: "Contact inicia la conversa; CRAYS revisa abans de publicar." },
      { question: "Quan apareix l'entrada?", answer: "Després d'un registre confirmat en un event amb tickets. Aquesta pàgina no genera QR." },
    ],
  },
  closing: {
    eyebrow: "Esdeveniments a CRAYS",
    title: "Troba la sala on pot començar la pròxima conversa útil.",
    body: "El calendari serà viu només amb esdeveniments verificats i estats responsables. Fins llavors, parlar de hosting és el pas honest.",
    action: "Parlar d'un esdeveniment",
  },
  mediaDisclosure: "Imatge editorial amb llicència. No mostra cap esdeveniment, lloc, membre, ponent ni suport de CRAYS.",
};

const fr: EventsCopy = {
  pageLabel: "Événements",
  metaDescription: "Découvrez comment CRAYS Clubs organise conférences, ateliers, rencontres et moments communautaires, avec des données en direct fermées jusqu'à autorisation.",
  hero: {
    eyebrow: "Événements CRAYS Clubs",
    title: "Un calendrier est utile. Les personnes qui le composent lui donnent du sens.",
    lead: "CRAYS Events rassemble conférences, ateliers pratiques, rencontres proposées par les membres, tables communautaires et sessions de mouvement. Découverte, accès, examen, participation et check-in restent distincts afin que chaque événement précise son public et ce qui est réellement confirmé.",
    primary: "Explorer le parcours",
    secondary: "Parler d'un accueil",
    boundary: "Aucun événement, date, intervenant ou lieu public CRAYS n'est autorisé dans cet état. La page montre donc le système complet sans présenter d'exemple comme une disponibilité réelle.",
  },
  discover: {
    eyebrow: "Découvrir",
    title: "Cherchez par intérêt, puis comprenez l'état d'accès.",
    body: "La référence associe recherche, filtres, vue calendrier et flux chronologique. CRAYS conserve ces fonctions tout en fermant l'inventaire non publié. Un flux autorisé pourra remplir cette surface sans changer l'architecture.",
    searchLabel: "Rechercher des événements",
    searchPlaceholder: "Titre, sujet, hôte ou lieu",
    filterTitle: "Filtrer par",
    statusLabel: "Mon statut",
    statusItems: ["Tous", "Mes événements", "Hôte", "Invité"],
    typeLabel: "Type",
    typeItems: ["Conférences", "Ateliers", "Rencontres", "Moments communautaires"],
    audienceLabel: "Public",
    audienceItems: ["Tous publics", "Adultes uniquement", "Spécifique aux familles"],
    calendarTitle: "Calendrier",
    previous: "Période précédente",
    next: "Période suivante",
    weekdays: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    noDatesTitle: "Les dates publiées ne sont pas encore connectées.",
    noDatesBody: "Le calendrier reste vide jusqu'à ce qu'un contrat autorisé fournisse identité, fuseau, début, fin, lieu, règle d'accès et publication.",
    timelineTitle: "Événements à venir",
    timelineBody: "Aucun événement n'est présenté comme à venir. Après autorisation, les entrées seront groupées par date avec statut, public, hôte, lieu et inscription.",
    allEvents: "Tous les événements",
    myEvents: "Mes événements",
    createEvent: "Créer un événement",
  },
  formats: {
    eyebrow: "Ce qui a sa place ici",
    title: "Des formats différents, un rythme communautaire lisible.",
    body: "Une page événement doit montrer plus qu'une affiche. Chaque format apporte le contexte nécessaire pour juger la pertinence, la préparation, le public et le passage de l'intérêt à une place confirmée.",
    items: [
      { title: "Conférences et conversations", body: "Sujet ciblé, rôle clair d'hôte ou d'intervenant, public et questions. Noms et qualités seulement après validation du dossier." },
      { title: "Ateliers et sessions de construction", body: "Ils précisent le travail, ce qu'il faut apporter, la capacité et la nécessité éventuelle d'un examen." },
      { title: "Rencontres et tables partagées", body: "Ils rendent visibles le but, le point de rencontre et la limite communautaire sans promettre une présence." },
      { title: "Mouvement et plein air", body: "Chaque activité déclare public, accessibilité et conditions. La catégorie n'implique jamais une disponibilité universelle." },
    ],
  },
  journey: {
    eyebrow: "De la découverte à la porte",
    title: "Chaque état a une seule fonction.",
    body: "La référence sépare navigation, invitation, demande, approbation, inscription et billet. CRAYS maintient cette séparation pour éviter toute promesse implicite.",
    steps: [
      { label: "01", title: "Découvrir", body: "Chercher, filtrer ou parcourir sans créer d'inscription." },
      { label: "02", title: "Ouvrir les détails", body: "Lire but, heure, lieu, hôte, public et publication." },
      { label: "03", title: "Choisir la voie", body: "RSVP ouvert, invitation ou demande ne sont pas interchangeables." },
      { label: "04", title: "Examen", body: "Une demande peut rester en attente, être acceptée ou refusée." },
      { label: "05", title: "Confirmer", body: "Seul le service autorisé confirme la participation." },
      { label: "06", title: "Billet et check-in", body: "Billet ou QR suit la confirmation et reste distinct de l'identité, adhésion et paiement." },
      { label: "07", title: "Modifier ou annuler", body: "Le retrait reste auditable et suit les conditions propres à l'événement." },
    ],
  },
  detail: {
    eyebrow: "Détails",
    title: "Un panneau doit répondre aux questions pratiques.",
    body: "La source ouvre l'événement dans une surface ciblée. CRAYS réserve tous les champs sans inventer les faits manquants.",
    panelTitle: "Dossier événement",
    panelState: "En attente de données autorisées",
    rows: [
      { label: "Quand", value: "Date, heure locale et durée en attente" },
      { label: "Où", value: "Lieu vérifié ou en ligne en attente" },
      { label: "Hôte", value: "Identité approuvée en attente" },
      { label: "Public", value: "Règle ouverte, adulte ou famille en attente" },
      { label: "Accès", value: "RSVP, invitation ou demande en attente" },
      { label: "Présence", value: "Aucun nombre ni capacité publié" },
    ],
    actions: ["Demander à rejoindre", "Accepter l'invitation", "Voir le billet", "Copier le lien"],
    gate: "Ces contrôles documentent uniquement les rôles et restent inactifs jusqu'à autorisation de l'identité, persistance, examen, billetterie et réponse.",
  },
  access: {
    eyebrow: "Public et accès",
    title: "Pertinent ne signifie pas automatiquement disponible.",
    body: "Les filtres aident à trouver, mais ne remplacent ni décision de l'hôte, capacité, âge, famille, adhésion ni confirmation.",
    points: [
      { title: "RSVP ouvert", body: "Il exige un dossier publié et une réponse confirmée. Un bouton n'est pas une place." },
      { title: "Demande", body: "La personne fournit le contexte demandé et attend l'examen autorisé." },
      { title: "Invitation", body: "Elle a ses propres états accepter/refuser et ne contourne aucune condition." },
      { title: "Adultes et familles", body: "Ce sont des attributs explicites; aucune garde, supervision ou aptitude n'est déduite." },
    ],
  },
  host: {
    eyebrow: "Accueillir avec CRAYS",
    title: "Commencez par le but, pas par la publication.",
    body: "Il faut examen éditorial, responsabilité et plan opérationnel avant le calendrier. Créer un événement devient donc un processus gouverné.",
    process: [
      { title: "Cadrer", body: "Décrire but, public, format, moment, environnement et valeur communautaire." },
      { title: "Examiner l'opération", body: "CRAYS confirme hôte, lieu, accès, capacité, média et documents." },
      { title: "Publier après approbation", body: "Dates, intervenants, logos, sponsors, inscription et disponibilité restent privés jusque-là." },
    ],
    action: "Parler d'un événement",
    gate: "Contact ouvre uniquement une conversation; il ne crée, ne réserve, ne confirme et n'autorise rien.",
  },
  faq: {
    eyebrow: "Questions pratiques",
    title: "Avant qu'un événement devienne un plan.",
    items: [
      { question: "Y a-t-il des événements CRAYS confirmés ici?", answer: "Non. La structure est complète, mais aucun inventaire autorisé n'est connecté." },
      { question: "Puis-je m'inscrire ici?", answer: "Pas encore. RSVP, demande, invitation et billet attendent un contrat et une identité autorisés." },
      { question: "Différence entre RSVP et demande?", answer: "Le RSVP sollicite une confirmation ouverte; la demande passe en examen. Aucun ne décide de l'adhésion." },
      { question: "Mes événements signifie inscrit?", answer: "Non. Cette vue peut contenir accueil, invitations, demandes ou inscriptions avec leur statut." },
      { question: "Les événements sont-ils familiaux?", answer: "Seulement si cela est explicitement publié. Aucune garde ou supervision n'est déduite." },
      { question: "Puis-je proposer ou accueillir?", answer: "Contact lance la conversation; CRAYS examine avant publication." },
      { question: "Quand le billet apparaît-il?", answer: "Après inscription confirmée à un événement avec billets. Cette page ne génère aucun QR." },
    ],
  },
  closing: {
    eyebrow: "Événements chez CRAYS",
    title: "Trouvez la salle où peut commencer la prochaine conversation utile.",
    body: "Le calendrier ne sera actif qu'avec des événements vérifiés et des états responsables. D'ici là, la discussion d'accueil est l'étape honnête.",
    action: "Parler d'un événement",
  },
  mediaDisclosure: "Image éditoriale sous licence. Elle ne représente aucun événement, lieu, membre, intervenant ou soutien CRAYS.",
};

const pt: EventsCopy = {
  pageLabel: "Eventos",
  metaDescription: "Descubra como o CRAYS Clubs organiza palestras, workshops, encontros e reuniões comunitárias, mantendo dados ao vivo fechados até autorização.",
  hero: {
    eyebrow: "Eventos CRAYS Clubs",
    title: "Um calendário é útil. As pessoas nele dão sentido.",
    lead: "CRAYS Events reúne palestras, workshops práticos, encontros conduzidos por membros, mesas comunitárias e sessões de movimento. Descoberta, acesso, análise, presença e check-in continuam separados para cada evento declarar o público e o que está confirmado.",
    primary: "Explorar a jornada",
    secondary: "Falar sobre organizar",
    boundary: "Nenhum evento, data, palestrante ou local público CRAYS está autorizado neste estado. A página mostra o sistema completo sem tratar exemplos como disponibilidade real.",
  },
  discover: {
    eyebrow: "Descobrir",
    title: "Pesquise por interesse e depois entenda o acesso.",
    body: "A referência combina pesquisa, filtros, calendário e fluxo cronológico. CRAYS preserva as funções mantendo o inventário não publicado fechado. Um feed autorizado poderá preencher a superfície sem mudar a arquitetura.",
    searchLabel: "Pesquisar eventos",
    searchPlaceholder: "Título, tema, anfitrião ou local",
    filterTitle: "Filtrar por",
    statusLabel: "Meu estado",
    statusItems: ["Todos", "Meus eventos", "Organizando", "Convidado"],
    typeLabel: "Tipo",
    typeItems: ["Palestras", "Workshops", "Encontros", "Reuniões comunitárias"],
    audienceLabel: "Público",
    audienceItems: ["Todos", "Somente adultos", "Específico para famílias"],
    calendarTitle: "Calendário",
    previous: "Período anterior",
    next: "Próximo período",
    weekdays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    noDatesTitle: "Datas publicadas ainda não estão conectadas.",
    noDatesBody: "O calendário fica vazio até um contrato autorizado fornecer identidade, fuso, início, fim, local, acesso e publicação.",
    timelineTitle: "Próximos eventos",
    timelineBody: "Nenhum evento aparece como próximo. Com autorização, entradas serão agrupadas por data mantendo estado, público, anfitrião, local e registro.",
    allEvents: "Todos os eventos",
    myEvents: "Meus eventos",
    createEvent: "Criar evento",
  },
  formats: {
    eyebrow: "O que pertence aqui",
    title: "Formatos diferentes, um ritmo comunitário legível.",
    body: "Uma página precisa mostrar mais que um cartaz. Cada formato oferece contexto para avaliar relevância, preparação, público e quando interesse vira presença confirmada.",
    items: [
      { title: "Palestras e conversas", body: "Tema focado, papel claro de anfitrião ou palestrante, público e perguntas. Nomes e credenciais só após aprovação." },
      { title: "Workshops e sessões práticas", body: "Explicam trabalho, materiais, limite e eventual análise antes da confirmação." },
      { title: "Encontros e mesas compartilhadas", body: "Mostram propósito, ponto de encontro e limites sem prometer presença." },
      { title: "Movimento e atividades externas", body: "Cada atividade declara público, acessibilidade e condições. Categoria não implica disponibilidade universal." },
    ],
  },
  journey: {
    eyebrow: "Da descoberta à porta",
    title: "Cada estado tem uma função.",
    body: "A referência separa navegação, convite, pedido, aprovação, registro e ingresso. CRAYS mantém a separação sem promessas silenciosas.",
    steps: [
      { label: "01", title: "Descobrir", body: "Pesquisar, filtrar ou navegar sem criar registro." },
      { label: "02", title: "Abrir detalhes", body: "Ler propósito, hora, local, anfitrião, público e publicação." },
      { label: "03", title: "Escolher rota", body: "RSVP aberto, convite ou pedido não são intercambiáveis." },
      { label: "04", title: "Análise", body: "Pedido pode ficar pendente, ser aceito ou recusado." },
      { label: "05", title: "Confirmar", body: "Somente o serviço autorizado confirma presença." },
      { label: "06", title: "Ingresso e check-in", body: "Ticket ou QR segue confirmação e fica separado de identidade, membresia e pagamento." },
      { label: "07", title: "Alterar ou cancelar", body: "Retirada mantém estado auditável e segue condições específicas." },
    ],
  },
  detail: {
    eyebrow: "Detalhes",
    title: "Um painel deve responder perguntas práticas.",
    body: "A fonte abre o evento em uma superfície focada. CRAYS reserva todos os campos sem inventar fatos.",
    panelTitle: "Registro do evento",
    panelState: "Aguardando dados autorizados",
    rows: [
      { label: "Quando", value: "Data, hora local e duração pendentes" },
      { label: "Onde", value: "Local verificado ou online pendente" },
      { label: "Anfitrião", value: "Identidade aprovada pendente" },
      { label: "Público", value: "Regra aberta, adulta ou familiar pendente" },
      { label: "Acesso", value: "RSVP, convite ou pedido pendente" },
      { label: "Presença", value: "Sem número ou capacidade publicada" },
    ],
    actions: ["Pedir participação", "Aceitar convite", "Ver ingresso", "Copiar link"],
    gate: "Controles apenas documentam papéis e ficam inativos até autorizar identidade, persistência, análise, ticketing e resposta.",
  },
  access: {
    eyebrow: "Público e acesso",
    title: "Relevante não significa automaticamente disponível.",
    body: "Filtros ajudam, mas não substituem decisão do anfitrião, capacidade, idade, família, membresia ou confirmação.",
    points: [
      { title: "RSVP aberto", body: "Exige registro publicado e resposta confirmada. Botão não é vaga." },
      { title: "Pedido", body: "A pessoa fornece contexto e aguarda análise autorizada." },
      { title: "Convite", body: "Tem estados próprios e não contorna condições." },
      { title: "Adultos e famílias", body: "São atributos explícitos; cuidado, supervisão ou adequação não são inferidos." },
    ],
  },
  host: {
    eyebrow: "Organize com CRAYS",
    title: "Comece pelo propósito, não pela publicação.",
    body: "É preciso análise editorial, responsabilidade e plano operacional antes do calendário. Criar evento vira processo governado.",
    process: [
      { title: "Definir", body: "Descrever propósito, público, formato, período, ambiente e valor." },
      { title: "Analisar operação", body: "CRAYS confirma anfitrião, local, acesso, capacidade, mídia e documentos." },
      { title: "Publicar após aprovação", body: "Datas, palestrantes, logos, patrocinadores, registro e disponibilidade ficam privados até aprovação." },
    ],
    action: "Falar sobre um evento",
    gate: "Contact apenas inicia conversa; não cria, reserva, confirma ou autoriza promoção.",
  },
  faq: {
    eyebrow: "Perguntas práticas",
    title: "Antes de um evento virar plano.",
    items: [
      { question: "Há eventos CRAYS confirmados aqui?", answer: "Não. A estrutura está completa, mas nenhum inventário autorizado foi conectado." },
      { question: "Posso me registrar?", answer: "Ainda não. RSVP, pedido, convite e ingresso aguardam contrato e identidade autorizados." },
      { question: "Diferença entre RSVP e pedido?", answer: "RSVP pede confirmação aberta; pedido entra em análise. Nenhum decide membresia." },
      { question: "Meus eventos significa registrado?", answer: "Não. Pode reunir hosting, convites, pedidos ou registros, com estado visível." },
      { question: "São eventos familiares?", answer: "Somente quando explicitamente publicados. Nenhum cuidado ou supervisão é inferido." },
      { question: "Posso propor ou organizar?", answer: "Contact inicia a conversa; CRAYS analisa antes de publicar." },
      { question: "Quando o ingresso aparece?", answer: "Após registro confirmado em evento com tickets. Esta página não gera QR." },
    ],
  },
  closing: {
    eyebrow: "Eventos no CRAYS",
    title: "Encontre a sala onde a próxima conversa útil pode começar.",
    body: "O calendário ficará ativo apenas com eventos verificados e estados responsáveis. Até lá, conversar sobre hosting é o próximo passo honesto.",
    action: "Falar sobre um evento",
  },
  mediaDisclosure: "Imagem editorial licenciada. Não retrata evento, local, membro, palestrante ou apoio CRAYS.",
};

const it: EventsCopy = {
  pageLabel: "Eventi",
  metaDescription: "Scopri come CRAYS Clubs organizza talk, workshop, meetup e incontri di comunità, mantenendo chiusi i dati live fino all'autorizzazione.",
  hero: {
    eyebrow: "Eventi CRAYS Clubs",
    title: "Un calendario è utile. Le persone al suo interno gli danno valore.",
    lead: "CRAYS Events riunisce talk, workshop pratici, meetup guidati dai membri, tavoli comunitari e sessioni di movimento. Scoperta, accesso, revisione, partecipazione e check-in restano separati affinché ogni evento dichiari pubblico e stato realmente confermato.",
    primary: "Esplora il percorso",
    secondary: "Parla di hosting",
    boundary: "Nessun evento, data, speaker o luogo pubblico CRAYS è autorizzato in questo stato. La pagina mostra il sistema completo senza presentare esempi come disponibilità reale.",
  },
  discover: {
    eyebrow: "Scopri",
    title: "Cerca per interesse, poi comprendi lo stato di accesso.",
    body: "La fonte combina ricerca, filtri, calendario e flusso cronologico. CRAYS conserva le funzioni mantenendo chiuso l'inventario non pubblicato. Un feed autorizzato potrà riempire la superficie senza cambiare architettura.",
    searchLabel: "Cerca eventi",
    searchPlaceholder: "Titolo, tema, host o luogo",
    filterTitle: "Filtra per",
    statusLabel: "Il mio stato",
    statusItems: ["Tutti", "I miei eventi", "Hosting", "Invitato"],
    typeLabel: "Tipo",
    typeItems: ["Talk", "Workshop", "Meetup", "Incontri comunitari"],
    audienceLabel: "Pubblico",
    audienceItems: ["Tutti", "Solo adulti", "Specifico per famiglie"],
    calendarTitle: "Calendario",
    previous: "Periodo precedente",
    next: "Periodo successivo",
    weekdays: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
    noDatesTitle: "Le date pubblicate non sono ancora collegate.",
    noDatesBody: "Il calendario resta vuoto finché un contratto autorizzato fornisce identità, fuso, inizio, fine, luogo, accesso e pubblicazione.",
    timelineTitle: "Prossimi eventi",
    timelineBody: "Nessun evento è mostrato come prossimo. Dopo autorizzazione, gli elementi saranno raggruppati per data con stato, pubblico, host, luogo e registrazione.",
    allEvents: "Tutti gli eventi",
    myEvents: "I miei eventi",
    createEvent: "Crea evento",
  },
  formats: {
    eyebrow: "Cosa appartiene qui",
    title: "Formati diversi, un ritmo comunitario leggibile.",
    body: "Una pagina evento deve mostrare più di una locandina. Ogni formato offre il contesto per valutare rilevanza, preparazione, pubblico e passaggio dall'interesse al posto confermato.",
    items: [
      { title: "Talk e conversazioni", body: "Tema focalizzato, ruolo chiaro di host o speaker, pubblico e domande. Nomi e credenziali solo dopo approvazione." },
      { title: "Workshop e sessioni pratiche", body: "Spiegano attività, materiali, capacità e necessità di revisione." },
      { title: "Meetup e tavoli condivisi", body: "Rendono visibili scopo, punto d'incontro e confini senza promettere presenza." },
      { title: "Movimento e attività esterne", body: "Ogni attività dichiara pubblico, accessibilità e condizioni. La categoria non implica disponibilità universale." },
    ],
  },
  journey: {
    eyebrow: "Dalla scoperta alla porta",
    title: "Ogni stato ha un solo compito.",
    body: "La fonte separa navigazione, invito, richiesta, approvazione, registrazione e biglietto. CRAYS mantiene la separazione evitando promesse implicite.",
    steps: [
      { label: "01", title: "Scopri", body: "Cerca, filtra o naviga senza creare registrazione." },
      { label: "02", title: "Apri dettagli", body: "Leggi scopo, ora, luogo, host, pubblico e pubblicazione." },
      { label: "03", title: "Scegli percorso", body: "RSVP aperto, invito o richiesta non sono intercambiabili." },
      { label: "04", title: "Revisione", body: "La richiesta può restare pendente, essere accettata o rifiutata." },
      { label: "05", title: "Conferma", body: "Solo il servizio autorizzato conferma la presenza." },
      { label: "06", title: "Biglietto e check-in", body: "Ticket o QR segue conferma e resta separato da identità, membership e pagamento." },
      { label: "07", title: "Modifica o annulla", body: "Il ritiro resta verificabile e segue le condizioni specifiche." },
    ],
  },
  detail: {
    eyebrow: "Dettagli",
    title: "Un pannello deve rispondere alle domande pratiche.",
    body: "La fonte apre l'evento in una superficie focalizzata. CRAYS riserva tutti i campi senza inventare fatti.",
    panelTitle: "Record evento",
    panelState: "In attesa di dati autorizzati",
    rows: [
      { label: "Quando", value: "Data, ora locale e durata in attesa" },
      { label: "Dove", value: "Luogo verificato o online in attesa" },
      { label: "Host", value: "Identità approvata in attesa" },
      { label: "Pubblico", value: "Regola aperta, adulta o famiglia in attesa" },
      { label: "Accesso", value: "RSVP, invito o richiesta in attesa" },
      { label: "Presenze", value: "Nessun numero o capacità pubblicato" },
    ],
    actions: ["Richiedi accesso", "Accetta invito", "Vedi biglietto", "Copia link"],
    gate: "I controlli documentano solo i ruoli e restano inattivi finché identità, persistenza, revisione, ticketing e risposta non sono autorizzati.",
  },
  access: {
    eyebrow: "Pubblico e accesso",
    title: "Rilevante non significa automaticamente disponibile.",
    body: "I filtri aiutano, ma non sostituiscono decisione dell'host, capacità, età, famiglia, membership o conferma.",
    points: [
      { title: "RSVP aperto", body: "Richiede record pubblicato e risposta confermata. Un pulsante non è un posto." },
      { title: "Richiesta", body: "La persona fornisce contesto e attende revisione autorizzata." },
      { title: "Invito", body: "Ha stati propri e non aggira condizioni specifiche." },
      { title: "Adulti e famiglie", body: "Sono attributi espliciti; assistenza, supervisione o idoneità non vengono dedotte." },
    ],
  },
  host: {
    eyebrow: "Ospita con CRAYS",
    title: "Inizia dallo scopo, non dalla pubblicazione.",
    body: "Servono revisione editoriale, responsabilità e piano operativo prima del calendario. Crea evento diventa un processo governato.",
    process: [
      { title: "Definisci", body: "Descrivi scopo, pubblico, formato, periodo, ambiente e valore." },
      { title: "Rivedi operazioni", body: "CRAYS conferma host, luogo, accesso, capacità, media e documenti." },
      { title: "Pubblica dopo approvazione", body: "Date, speaker, loghi, sponsor, registrazione e disponibilità restano privati fino ad approvazione." },
    ],
    action: "Parla di un evento",
    gate: "Contact avvia solo una conversazione; non crea, prenota, conferma o autorizza promozione.",
  },
  faq: {
    eyebrow: "Domande pratiche",
    title: "Prima che un evento diventi un piano.",
    items: [
      { question: "Ci sono eventi CRAYS confermati?", answer: "No. La struttura è completa, ma nessun inventario autorizzato è collegato." },
      { question: "Posso registrarmi qui?", answer: "Non ancora. RSVP, richiesta, invito e ticket attendono contratto e identità autorizzati." },
      { question: "Differenza tra RSVP e richiesta?", answer: "RSVP chiede conferma aperta; la richiesta entra in revisione. Nessuno decide la membership." },
      { question: "I miei eventi significa registrato?", answer: "No. Può includere hosting, inviti, richieste o registrazioni con stato visibile." },
      { question: "Gli eventi sono per famiglie?", answer: "Solo se pubblicati esplicitamente. Nessuna assistenza o supervisione è implicita." },
      { question: "Posso proporre o ospitare?", answer: "Contact avvia il dialogo; CRAYS rivede prima di pubblicare." },
      { question: "Quando appare il biglietto?", answer: "Dopo registrazione confermata a un evento con ticket. Questa pagina non genera QR." },
    ],
  },
  closing: {
    eyebrow: "Eventi in CRAYS",
    title: "Trova la stanza dove può iniziare la prossima conversazione utile.",
    body: "Il calendario diventerà live solo con eventi verificati e stati responsabili. Fino ad allora, parlare di hosting è il passo sincero.",
    action: "Parla di un evento",
  },
  mediaDisclosure: "Immagine editoriale con licenza. Non raffigura un evento, luogo, membro, speaker o endorsement CRAYS.",
};

export const eventsCopy: Record<EventsLocale, EventsCopy> = {
  en,
  de,
  es,
  ca,
  fr,
  pt,
  it,
};
