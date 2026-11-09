export type ForestCityPublicLocale = "en" | "de" | "es" | "ca" | "fr" | "pt" | "it";

type FeatureCopy = { label: string; title: string; body: string };
type PathCopy = { eyebrow: string; title: string; body: string; action: string; boundary: string };
type FaqCopy = { question: string; answer: string };

export type ForestCityPublicCopy = {
  metadata: { title: string; description: string };
  eyebrow: string;
  title: string;
  intro: string;
  exploreAction: string;
  inquiryAction: string;
  contextEyebrow: string;
  contextTitle: string;
  contextBody: string;
  contextFacts: FeatureCopy[];
  placeMediaBlocked: string;
  placeMediaDetail: string;
  pathsEyebrow: string;
  pathsTitle: string;
  pathsBody: string;
  golf: PathCopy;
  marina: PathCopy;
  everydayEyebrow: string;
  everydayTitle: string;
  everydayBody: string;
  functions: FeatureCopy[];
  statesEyebrow: string;
  statesTitle: string;
  statesBody: string;
  states: FeatureCopy[];
  faqEyebrow: string;
  faqTitle: string;
  faqs: FaqCopy[];
  closingEyebrow: string;
  closingTitle: string;
  closingBody: string;
  closingAction: string;
};

export const forestCityPublicCopy: Record<ForestCityPublicLocale, ForestCityPublicCopy> = {
  en: {
    metadata: { title: "Forest City | CRAYS Clubs", description: "The public CRAYS Clubs journey for Forest City, Malaysia." },
    eyebrow: "CRAYS Clubs · Forest City, Malaysia",
    title: "Forest City is our campus.",
    intro: "A public introduction to the Forest City CRAYS Clubs project: a place-led journey connecting work, community, learning and everyday life while keeping admission, hotel booking, contracts and payment as separate states.",
    exploreAction: "Explore the journey",
    inquiryAction: "Contact CRAYS Clubs",
    contextEyebrow: "The place and the project",
    contextTitle: "One Forest City context. Several distinct journeys.",
    contextBody: "This page explains how the CRAYS Clubs public layer is intended to bring the Forest City story together. It does not confirm an opening date, a property operator, inventory, access, programme delivery or a commercial outcome.",
    contextFacts: [
      { label: "01 / Context", title: "Forest City, Malaysia", body: "Forest City is the geographic context for this CRAYS Clubs project. The public journey describes the project without turning location into an availability or property claim." },
      { label: "02 / Club layer", title: "A work-live-play perspective", body: "Community, focused work, learning, family life and culture are presented as connected functions. Each operational service still requires its own confirmed scope." },
      { label: "03 / Public layer", title: "Understand before acting", body: "Visitors can learn about the intended journeys and move to an existing contact or editorial destination. This layer does not grant admission or create a booking." },
      { label: "04 / Commercial boundary", title: "The system remains authoritative", body: "Where hotel inventory is later shown, the existing CRAYS source remains responsible for price, availability and booking state. This public page publishes none of those values." }
    ],
    placeMediaBlocked: "Forest City media held back",
    placeMediaDetail: "No correctly identified, final-use-cleared Forest City, Golf Hotel or Marina Hotel asset was available inside this authorised source-only task.",
    pathsEyebrow: "Editorial paths",
    pathsTitle: "Golf and Marina remain different journeys.",
    pathsBody: "Both places can be introduced publicly. The next action is deliberately different because hotel discovery, club admission and booking are not the same event.",
    golf: { eyebrow: "Forest City Golf Hotel", title: "Golf, stay and the wider Forest City rhythm", body: "The Golf path is editorial here. Visitors may continue to the existing Forest City source, where the CRAYS system separately determines whether any inventory, price or booking action can be shown.", action: "Continue to the existing Golf journey", boundary: "No price, room, date or availability is asserted on this page." },
    marina: { eyebrow: "Forest City Marina Hotel", title: "An invitation-led Marina path", body: "The Marina path explains the place without starting a booking. Any personal invitation, sponsor confirmation, admission and later hotel action remain separate gates controlled outside this public page.", action: "Understand the admission sequence", boundary: "This page neither invites nor admits a person and does not unlock Marina booking." },
    everydayEyebrow: "Life around the campus",
    everydayTitle: "More than a stay. A connected public story.",
    everydayBody: "The Forest City journey needs room for community, work, learning, families and culture without presenting unconfirmed programmes as operating facts.",
    functions: [
      { label: "Community", title: "Meet around shared interests", body: "A public community function can introduce ways people may encounter one another. It does not claim existing members, attendance, events or outcomes." },
      { label: "Remote work", title: "A base for focused work", body: "The work function explains the intended relationship between concentration, peer exchange and place. Desks, connectivity and access remain subject to confirmed operations." },
      { label: "School and jobs", title: "Learn here. Get discovered anywhere.", body: "The learning function connects practice, feedback and visibility without promising employment, placement, speakers, qualifications or career results." },
      { label: "Families", title: "A journey that considers family life", body: "Family information belongs in the same place-led story. Childcare, schooling, safeguarding and family services must be confirmed independently before being represented as available." },
      { label: "Lifestyle Culture", title: "Crays is where strangers become stories.", body: "Culture gives the journey social rhythm through food, movement and shared time. No specific event, host, venue or recurring programme is claimed here." },
      { label: "Host company", title: "Bring a working group into the conversation", body: "Company enquiries can describe an intended format. Operator review, feasibility, approval, admission, contract, booking and payment remain separate." }
    ],
    statesEyebrow: "Clear boundaries",
    statesTitle: "Interest is not admission. Admission is not booking.",
    statesBody: "Every consequential step keeps its own authority so that a public story cannot silently become a reservation, contract or payment.",
    states: [
      { label: "01", title: "Public discovery", body: "Read the context and compare the editorial Golf, Marina, work, learning, family and community paths." },
      { label: "02", title: "Interest or inquiry", body: "An enquiry can state intent. It creates no promise, place, admission, inventory hold or commercial obligation." },
      { label: "03", title: "Operator and feasibility review", body: "Scope, participants, operational capacity, rights and required safeguards are checked before any approval." },
      { label: "04", title: "Admission", body: "Where a club or property requires admission, invitation, sponsor relationship and admission are confirmed through their own authorised process." },
      { label: "05", title: "Booking or contract", body: "Only the relevant authorised system and parties can create a booking or contract after all preceding gates are satisfied." },
      { label: "06", title: "Payment", body: "Payment can follow only through an authorised payment process attached to a valid booking or contract state. This page initiates none." }
    ],
    faqEyebrow: "Questions before the next step",
    faqTitle: "Forest City FAQ",
    faqs: [
      { question: "Is the Forest City CRAYS Clubs project open?", answer: "This public source does not confirm an opening date, operating status or access. A future operational release requires separate evidence and approval." },
      { question: "Can I book a hotel from this page?", answer: "No. The Golf link leads to the existing Forest City source, whose system remains authoritative for any inventory or booking state. Marina remains admission-led." },
      { question: "Does the memorandum establish any wider relationship?", answer: "No relationship beyond the exact memorandum statement is inferred here. No exclusivity, authority, operating right or further legal effect is claimed." },
      { question: "Can I apply for Marina access?", answer: "This page does not provide admission. Invitation, sponsor confirmation and admission are distinct authorised states before any later booking step." },
      { question: "Are school, work and family services available now?", answer: "They are public journey functions, not availability claims. Each service requires confirmed operator, scope, safeguards and release evidence." },
      { question: "Are the people in the generic images CRAYS members?", answer: "No. Generic stock imagery illustrates broad community functions and does not depict or endorse CRAYS members, customers or Forest City participants." }
    ],
    closingEyebrow: "Continue carefully",
    closingTitle: "Start with the Forest City story.",
    closingBody: "Ask about the project, the intended public journey or the appropriate next route. The contact step remains an enquiry and creates no admission, booking, contract or payment.",
    closingAction: "Contact CRAYS Clubs"
  },
  de: {
    metadata: { title: "Forest City | CRAYS Clubs", description: "Die öffentliche CRAYS-Clubs-Journey für Forest City, Malaysia." },
    eyebrow: "CRAYS Clubs · Forest City, Malaysia",
    title: "Forest City ist unser Campus.",
    intro: "Eine öffentliche Einführung in das CRAYS-Clubs-Projekt in Forest City: eine ortsbezogene Journey für Arbeit, Community, Lernen und Alltag, während Zulassung, Hotelbuchung, Vertrag und Zahlung getrennte Zustände bleiben.",
    exploreAction: "Journey entdecken", inquiryAction: "CRAYS Clubs kontaktieren",
    contextEyebrow: "Ort und Projekt", contextTitle: "Ein Forest-City-Kontext. Mehrere getrennte Journeys.",
    contextBody: "Diese Seite erklärt, wie die öffentliche CRAYS-Clubs-Ebene die Forest-City-Geschichte zusammenführen soll. Sie bestätigt weder Eröffnungsdatum noch Betreiber, Bestand, Zugang, Programmdurchführung oder wirtschaftliches Ergebnis.",
    contextFacts: [
      { label: "01 / Kontext", title: "Forest City, Malaysia", body: "Forest City ist der geografische Kontext dieses CRAYS-Clubs-Projekts. Die öffentliche Journey beschreibt das Vorhaben, ohne aus dem Ort eine Verfügbarkeits- oder Immobilienaussage abzuleiten." },
      { label: "02 / Club-Ebene", title: "Eine Work-Live-Play-Perspektive", body: "Community, konzentriertes Arbeiten, Lernen, Familienleben und Kultur erscheinen als verbundene Funktionen. Jede operative Leistung benötigt weiterhin einen bestätigten Umfang." },
      { label: "03 / Öffentliche Ebene", title: "Verstehen, bevor etwas ausgelöst wird", body: "Besucher können die vorgesehenen Journeys verstehen und zu bestehenden Kontakt- oder redaktionellen Zielen wechseln. Diese Ebene erteilt keine Zulassung und erzeugt keine Buchung." },
      { label: "04 / Wirtschaftliche Grenze", title: "Das System bleibt maßgeblich", body: "Wenn später Hotelbestand gezeigt wird, bleibt die bestehende CRAYS-Quelle für Preis, Verfügbarkeit und Buchungsstatus verantwortlich. Diese öffentliche Seite veröffentlicht keine dieser Angaben." }
    ],
    placeMediaBlocked: "Forest-City-Medien zurückgehalten", placeMediaDetail: "In diesem autorisierten Source-only-Auftrag lag kein korrekt identifiziertes und für die finale Nutzung freigegebenes Forest-City-, Golf-Hotel- oder Marina-Hotel-Medium vor.",
    pathsEyebrow: "Redaktionelle Wege", pathsTitle: "Golf und Marina bleiben unterschiedliche Journeys.",
    pathsBody: "Beide Orte können öffentlich eingeführt werden. Der nächste Schritt unterscheidet sich bewusst, weil Hotelentdeckung, Clubzulassung und Buchung nicht dasselbe Ereignis sind.",
    golf: { eyebrow: "Forest City Golf Hotel", title: "Golf, Aufenthalt und der größere Forest-City-Rhythmus", body: "Der Golf-Weg bleibt hier redaktionell. Besucher können zur bestehenden Forest-City-Quelle wechseln; dort entscheidet das CRAYS-System separat, ob Bestand, Preis oder Buchungsaktion gezeigt werden darf.", action: "Zur bestehenden Golf-Journey", boundary: "Diese Seite behauptet weder Preis noch Zimmer, Datum oder Verfügbarkeit." },
    marina: { eyebrow: "Forest City Marina Hotel", title: "Ein einladungsgeführter Marina-Weg", body: "Der Marina-Weg erklärt den Ort, ohne eine Buchung zu beginnen. Persönliche Einladung, Sponsorbestätigung, Zulassung und eine spätere Hotelaktion bleiben getrennte Gates außerhalb dieser öffentlichen Seite.", action: "Zulassungsfolge verstehen", boundary: "Diese Seite lädt niemanden ein, lässt niemanden zu und schaltet keine Marina-Buchung frei." },
    everydayEyebrow: "Leben rund um den Campus", everydayTitle: "Mehr als ein Aufenthalt. Eine verbundene öffentliche Geschichte.",
    everydayBody: "Die Forest-City-Journey braucht Raum für Community, Arbeit, Lernen, Familien und Kultur, ohne unbestätigte Programme als laufenden Betrieb darzustellen.",
    functions: [
      { label: "Community", title: "Über gemeinsame Interessen zusammenkommen", body: "Eine öffentliche Community-Funktion kann mögliche Begegnungsformen erklären. Sie behauptet keine bestehenden Mitglieder, Teilnehmer, Events oder Ergebnisse." },
      { label: "Remote Work", title: "Eine Basis für konzentriertes Arbeiten", body: "Die Arbeitsfunktion beschreibt das beabsichtigte Verhältnis von Fokus, Austausch und Ort. Schreibtische, Konnektivität und Zugang bleiben von bestätigtem Betrieb abhängig." },
      { label: "Schule & Jobs", title: "Lerne hier. Werde überall entdeckt.", body: "Die Lernfunktion verbindet Praxis, Feedback und Sichtbarkeit, ohne Beschäftigung, Vermittlung, Speaker, Abschlüsse oder Karriereergebnisse zu versprechen." },
      { label: "Families", title: "Eine Journey, die Familienleben mitdenkt", body: "Familieninformationen gehören in dieselbe ortsbezogene Geschichte. Betreuung, Schule, Schutzkonzept und Familienleistungen müssen separat bestätigt werden, bevor sie als verfügbar gelten." },
      { label: "Lebensstil und Kultur", title: "Bei Crays werden Fremde zu Geschichten.", body: "Kultur gibt der Journey durch Essen, Bewegung und gemeinsame Zeit einen sozialen Rhythmus. Kein konkretes Event, Host, Venue oder wiederkehrendes Programm wird behauptet." },
      { label: "Host Company", title: "Eine Arbeitsgruppe ins Gespräch bringen", body: "Unternehmensanfragen können ein gewünschtes Format beschreiben. Betreiberprüfung, Machbarkeit, Freigabe, Zulassung, Vertrag, Buchung und Zahlung bleiben getrennt." }
    ],
    statesEyebrow: "Klare Grenzen", statesTitle: "Interesse ist keine Zulassung. Zulassung ist keine Buchung.",
    statesBody: "Jeder folgenschwere Schritt behält seine eigene Autorität, damit eine öffentliche Geschichte nicht stillschweigend zu Reservierung, Vertrag oder Zahlung wird.",
    states: [
      { label: "01", title: "Öffentliche Orientierung", body: "Kontext lesen und die redaktionellen Wege für Golf, Marina, Arbeit, Lernen, Familie und Community vergleichen." },
      { label: "02", title: "Interesse oder Anfrage", body: "Eine Anfrage kann Absicht beschreiben. Sie erzeugt kein Versprechen, keinen Platz, keine Zulassung, Reservierung oder Verpflichtung." },
      { label: "03", title: "Betreiber- und Machbarkeitsprüfung", body: "Umfang, Teilnehmer, Kapazität, Rechte und Schutzanforderungen werden vor jeder Freigabe geprüft." },
      { label: "04", title: "Zulassung", body: "Wo Club oder Property eine Zulassung verlangen, werden Einladung, Sponsorbeziehung und Aufnahme in einem eigenen autorisierten Prozess bestätigt." },
      { label: "05", title: "Buchung oder Vertrag", body: "Nur das zuständige autorisierte System und die Parteien können nach erfüllten Gates Buchung oder Vertrag erzeugen." },
      { label: "06", title: "Zahlung", body: "Zahlung darf nur über einen autorisierten Prozess zu einem gültigen Buchungs- oder Vertragsstatus folgen. Diese Seite löst nichts aus." }
    ],
    faqEyebrow: "Fragen vor dem nächsten Schritt", faqTitle: "Forest City FAQ",
    faqs: [
      { question: "Ist das Forest-City-Projekt von CRAYS Clubs geöffnet?", answer: "Diese öffentliche Quelle bestätigt weder Eröffnungsdatum noch Betriebsstatus oder Zugang. Eine spätere Freigabe benötigt eigene Evidenz und Autorisierung." },
      { question: "Kann ich auf dieser Seite ein Hotel buchen?", answer: "Nein. Der Golf-Link führt zur bestehenden Forest-City-Quelle, deren System für Bestand und Buchungsstatus maßgeblich bleibt. Marina bleibt zulassungsgeführt." },
      { question: "Begründet das Memorandum eine weitergehende Beziehung?", answer: "Über den exakten Memorandum-Satz hinaus wird keine Beziehung abgeleitet. Exklusivität, Autorität, Betriebsrecht oder weitere Rechtsfolge werden nicht behauptet." },
      { question: "Kann ich Marina-Zugang beantragen?", answer: "Diese Seite stellt keine Zulassung bereit. Einladung, Sponsorbestätigung und Zulassung sind eigenständige autorisierte Zustände vor einer späteren Buchung." },
      { question: "Sind Schule, Arbeit und Familienangebote bereits verfügbar?", answer: "Sie sind Funktionen der öffentlichen Journey, keine Verfügbarkeitsclaims. Jede Leistung braucht bestätigten Betreiber, Umfang, Schutz und Freigabeevidenz." },
      { question: "Sind die Personen auf den generischen Bildern CRAYS-Mitglieder?", answer: "Nein. Generische Stockmedien illustrieren breite Community-Funktionen und zeigen oder bestätigen keine CRAYS-Mitglieder, Kunden oder Forest-City-Teilnehmer." }
    ],
    closingEyebrow: "Sorgfältig fortsetzen", closingTitle: "Beginnen Sie mit der Forest-City-Geschichte.",
    closingBody: "Fragen Sie nach Projekt, öffentlicher Journey oder dem passenden nächsten Weg. Der Kontaktschritt bleibt eine Anfrage und erzeugt weder Zulassung, Buchung, Vertrag noch Zahlung.", closingAction: "CRAYS Clubs kontaktieren"
  },
  es: {
    metadata: { title: "Forest City | CRAYS Clubs", description: "El recorrido público de CRAYS Clubs para Forest City, Malasia." },
    eyebrow: "CRAYS Clubs · Forest City, Malasia", title: "Forest City es nuestro campus.",
    intro: "Una introducción pública al proyecto CRAYS Clubs en Forest City: un recorrido ligado al lugar que conecta trabajo, comunidad, aprendizaje y vida cotidiana, manteniendo admisión, reserva hotelera, contrato y pago como estados separados.",
    exploreAction: "Explorar el recorrido", inquiryAction: "Contactar con CRAYS Clubs",
    contextEyebrow: "El lugar y el proyecto", contextTitle: "Un contexto de Forest City. Varios recorridos distintos.",
    contextBody: "Esta página explica cómo la capa pública de CRAYS Clubs pretende reunir la historia de Forest City. No confirma fecha de apertura, operador, inventario, acceso, ejecución de programas ni resultado comercial.",
    contextFacts: [
      { label: "01 / Contexto", title: "Forest City, Malasia", body: "Forest City es el contexto geográfico de este proyecto CRAYS Clubs. El recorrido público describe el proyecto sin convertir la ubicación en una afirmación de disponibilidad o propiedad." },
      { label: "02 / Capa club", title: "Una perspectiva work-live-play", body: "Comunidad, trabajo concentrado, aprendizaje, vida familiar y cultura aparecen como funciones conectadas. Cada servicio operativo sigue necesitando un alcance confirmado." },
      { label: "03 / Capa pública", title: "Comprender antes de actuar", body: "Las personas pueden conocer los recorridos previstos y pasar a destinos editoriales o de contacto existentes. Esta capa no concede admisión ni crea una reserva." },
      { label: "04 / Límite comercial", title: "El sistema conserva la autoridad", body: "Si más adelante se muestra inventario hotelero, la fuente CRAYS existente seguirá determinando precio, disponibilidad y estado de reserva. Esta página pública no publica esos valores." }
    ],
    placeMediaBlocked: "Medios de Forest City retenidos", placeMediaDetail: "En esta tarea autorizada de solo código no había un recurso de Forest City, Golf Hotel o Marina Hotel correctamente identificado y autorizado para uso final.",
    pathsEyebrow: "Recorridos editoriales", pathsTitle: "Golf y Marina siguen siendo recorridos diferentes.",
    pathsBody: "Ambos lugares pueden presentarse públicamente. El siguiente paso es distinto a propósito porque descubrir un hotel, obtener admisión y reservar no son el mismo hecho.",
    golf: { eyebrow: "Forest City Golf Hotel", title: "Golf, estancia y el ritmo más amplio de Forest City", body: "El recorrido Golf es editorial aquí. Se puede continuar a la fuente Forest City existente, donde el sistema CRAYS determina por separado si puede mostrarse inventario, precio o una acción de reserva.", action: "Continuar al recorrido Golf existente", boundary: "Esta página no afirma precio, habitación, fecha ni disponibilidad." },
    marina: { eyebrow: "Forest City Marina Hotel", title: "Un recorrido Marina guiado por invitación", body: "El recorrido Marina explica el lugar sin iniciar una reserva. Invitación personal, confirmación de sponsor, admisión y una acción hotelera posterior siguen siendo puertas separadas fuera de esta página.", action: "Comprender la secuencia de admisión", boundary: "Esta página no invita ni admite a nadie y no habilita reservas Marina." },
    everydayEyebrow: "Vida alrededor del campus", everydayTitle: "Más que una estancia. Una historia pública conectada.",
    everydayBody: "El recorrido Forest City necesita espacio para comunidad, trabajo, aprendizaje, familias y cultura sin presentar programas no confirmados como operaciones activas.",
    functions: [
      { label: "Comunidad", title: "Encontrarse alrededor de intereses compartidos", body: "La función pública de comunidad puede explicar formas de encuentro posibles. No afirma miembros, asistencia, eventos ni resultados existentes." },
      { label: "Trabajo remoto", title: "Una base para trabajar con concentración", body: "La función de trabajo explica la relación prevista entre concentración, intercambio y lugar. Mesas, conectividad y acceso dependen de operaciones confirmadas." },
      { label: "Escuela y empleo", title: "Aprende aquí. Hazte visible en cualquier lugar.", body: "La función de aprendizaje conecta práctica, feedback y visibilidad sin prometer empleo, colocación, ponentes, titulaciones ni resultados profesionales." },
      { label: "Familias", title: "Un recorrido que tiene en cuenta la vida familiar", body: "La información familiar pertenece a la misma historia del lugar. Cuidado infantil, escuela, protección y servicios familiares deben confirmarse por separado antes de mostrarse como disponibles." },
      { label: "Estilo de vida y cultura", title: "En Crays, los desconocidos se convierten en historias.", body: "La cultura aporta ritmo social mediante comida, movimiento y tiempo compartido. No se afirma ningún evento, anfitrión, espacio o programa recurrente concreto." },
      { label: "Host Company", title: "Incorporar un grupo de trabajo a la conversación", body: "Una consulta de empresa puede describir el formato deseado. Revisión operativa, viabilidad, aprobación, admisión, contrato, reserva y pago permanecen separados." }
    ],
    statesEyebrow: "Límites claros", statesTitle: "El interés no es admisión. La admisión no es reserva.",
    statesBody: "Cada paso con consecuencias mantiene su propia autoridad para que una historia pública no se convierta silenciosamente en reserva, contrato o pago.",
    states: [
      { label: "01", title: "Descubrimiento público", body: "Leer el contexto y comparar los recorridos editoriales de Golf, Marina, trabajo, aprendizaje, familias y comunidad." },
      { label: "02", title: "Interés o consulta", body: "Una consulta puede expresar intención. No crea promesa, plaza, admisión, retención de inventario ni obligación comercial." },
      { label: "03", title: "Revisión operativa y de viabilidad", body: "Alcance, participantes, capacidad, derechos y protecciones necesarias se revisan antes de cualquier aprobación." },
      { label: "04", title: "Admisión", body: "Cuando un club o propiedad exige admisión, invitación, relación con sponsor y admisión se confirman mediante su propio proceso autorizado." },
      { label: "05", title: "Reserva o contrato", body: "Solo el sistema y las partes autorizadas correspondientes pueden crear reserva o contrato una vez cumplidas todas las puertas previas." },
      { label: "06", title: "Pago", body: "El pago solo puede seguir mediante un proceso autorizado unido a un estado válido de reserva o contrato. Esta página no inicia ninguno." }
    ],
    faqEyebrow: "Preguntas antes del siguiente paso", faqTitle: "Preguntas sobre Forest City",
    faqs: [
      { question: "¿Está abierto el proyecto CRAYS Clubs de Forest City?", answer: "Esta fuente pública no confirma fecha de apertura, estado operativo ni acceso. Una publicación operativa futura necesita evidencia y autorización separadas." },
      { question: "¿Puedo reservar un hotel desde esta página?", answer: "No. El enlace Golf lleva a la fuente Forest City existente, cuyo sistema conserva la autoridad sobre inventario y estado de reserva. Marina sigue guiada por admisión." },
      { question: "¿El memorando establece una relación más amplia?", answer: "No se deriva ninguna relación más allá de la declaración exacta del memorando. No se afirma exclusividad, autoridad, derecho operativo ni efecto jurídico adicional." },
      { question: "¿Puedo solicitar acceso a Marina?", answer: "Esta página no ofrece admisión. Invitación, confirmación de sponsor y admisión son estados autorizados independientes antes de una reserva posterior." },
      { question: "¿Están disponibles ahora escuela, trabajo y servicios familiares?", answer: "Son funciones del recorrido público, no afirmaciones de disponibilidad. Cada servicio requiere operador, alcance, protecciones y evidencia de publicación confirmados." },
      { question: "¿Las personas de las imágenes genéricas son miembros de CRAYS?", answer: "No. Las imágenes genéricas ilustran funciones comunitarias amplias y no muestran ni avalan miembros, clientes o participantes de Forest City." }
    ],
    closingEyebrow: "Continuar con cuidado", closingTitle: "Empieza por la historia de Forest City.",
    closingBody: "Pregunta por el proyecto, el recorrido público previsto o la ruta adecuada. El contacto sigue siendo una consulta y no crea admisión, reserva, contrato ni pago.", closingAction: "Contactar con CRAYS Clubs"
  },
  ca: {
    metadata: { title: "Forest City | CRAYS Clubs", description: "El recorregut públic de CRAYS Clubs per a Forest City, Malàisia." },
    eyebrow: "CRAYS Clubs · Forest City, Malàisia", title: "Forest City és el nostre campus.",
    intro: "Una introducció pública al projecte CRAYS Clubs de Forest City: un recorregut vinculat al lloc que connecta treball, comunitat, aprenentatge i vida quotidiana, mantenint admissió, reserva hotelera, contracte i pagament com a estats separats.",
    exploreAction: "Explorar el recorregut", inquiryAction: "Contactar amb CRAYS Clubs",
    contextEyebrow: "El lloc i el projecte", contextTitle: "Un context de Forest City. Diversos recorreguts diferents.",
    contextBody: "Aquesta pàgina explica com la capa pública de CRAYS Clubs vol reunir la història de Forest City. No confirma data d'obertura, operador, inventari, accés, execució de programes ni resultat comercial.",
    contextFacts: [
      { label: "01 / Context", title: "Forest City, Malàisia", body: "Forest City és el context geogràfic d'aquest projecte CRAYS Clubs. El recorregut públic descriu el projecte sense convertir la ubicació en una afirmació de disponibilitat o propietat." },
      { label: "02 / Capa club", title: "Una perspectiva work-live-play", body: "Comunitat, treball concentrat, aprenentatge, vida familiar i cultura apareixen com a funcions connectades. Cada servei operatiu continua necessitant un abast confirmat." },
      { label: "03 / Capa pública", title: "Entendre abans d'actuar", body: "Les persones poden conèixer els recorreguts previstos i passar a destinacions editorials o de contacte existents. Aquesta capa no concedeix admissió ni crea cap reserva." },
      { label: "04 / Límit comercial", title: "El sistema manté l'autoritat", body: "Si més endavant es mostra inventari hoteler, la font CRAYS existent continuarà determinant preu, disponibilitat i estat de reserva. Aquesta pàgina no publica aquests valors." }
    ],
    placeMediaBlocked: "Mitjans de Forest City retinguts", placeMediaDetail: "En aquesta tasca autoritzada de només codi no hi havia cap recurs de Forest City, Golf Hotel o Marina Hotel correctament identificat i autoritzat per a l'ús final.",
    pathsEyebrow: "Recorreguts editorials", pathsTitle: "Golf i Marina continuen sent recorreguts diferents.",
    pathsBody: "Tots dos llocs es poden presentar públicament. El pas següent és diferent expressament perquè descobrir un hotel, obtenir admissió i reservar no són el mateix fet.",
    golf: { eyebrow: "Forest City Golf Hotel", title: "Golf, estada i el ritme més ampli de Forest City", body: "El recorregut Golf és editorial aquí. Es pot continuar a la font Forest City existent, on el sistema CRAYS determina separadament si es pot mostrar inventari, preu o una acció de reserva.", action: "Continuar al recorregut Golf existent", boundary: "Aquesta pàgina no afirma preu, habitació, data ni disponibilitat." },
    marina: { eyebrow: "Forest City Marina Hotel", title: "Un recorregut Marina guiat per invitació", body: "El recorregut Marina explica el lloc sense iniciar una reserva. Invitació personal, confirmació de sponsor, admissió i una acció hotelera posterior continuen sent portes separades fora d'aquesta pàgina.", action: "Entendre la seqüència d'admissió", boundary: "Aquesta pàgina no convida ni admet ningú i no habilita reserves Marina." },
    everydayEyebrow: "Vida al voltant del campus", everydayTitle: "Més que una estada. Una història pública connectada.",
    everydayBody: "El recorregut Forest City necessita espai per a comunitat, treball, aprenentatge, famílies i cultura sense presentar programes no confirmats com a operacions actives.",
    functions: [
      { label: "Comunitat", title: "Trobar-se al voltant d'interessos compartits", body: "La funció pública de comunitat pot explicar formes de trobada possibles. No afirma membres, assistència, esdeveniments ni resultats existents." },
      { label: "Treball remot", title: "Una base per treballar amb concentració", body: "La funció de treball explica la relació prevista entre concentració, intercanvi i lloc. Taules, connectivitat i accés depenen d'operacions confirmades." },
      { label: "Escola i feina", title: "Aprèn aquí. Fes-te visible a qualsevol lloc.", body: "La funció d'aprenentatge connecta pràctica, feedback i visibilitat sense prometre feina, col·locació, ponents, titulacions ni resultats professionals." },
      { label: "Famílies", title: "Un recorregut que considera la vida familiar", body: "La informació familiar pertany a la mateixa història del lloc. Cura infantil, escola, protecció i serveis familiars s'han de confirmar separadament abans de mostrar-se com a disponibles." },
      { label: "Estil de vida i cultura", title: "A Crays, els desconeguts es converteixen en històries.", body: "La cultura aporta ritme social mitjançant menjar, moviment i temps compartit. No s'afirma cap esdeveniment, amfitrió, espai o programa recurrent concret." },
      { label: "Host Company", title: "Incorporar un grup de treball a la conversa", body: "Una consulta d'empresa pot descriure el format desitjat. Revisió operativa, viabilitat, aprovació, admissió, contracte, reserva i pagament romanen separats." }
    ],
    statesEyebrow: "Límits clars", statesTitle: "L'interès no és admissió. L'admissió no és reserva.",
    statesBody: "Cada pas amb conseqüències manté la seva pròpia autoritat perquè una història pública no es converteixi silenciosament en reserva, contracte o pagament.",
    states: [
      { label: "01", title: "Descobriment públic", body: "Llegir el context i comparar els recorreguts editorials de Golf, Marina, treball, aprenentatge, famílies i comunitat." },
      { label: "02", title: "Interès o consulta", body: "Una consulta pot expressar intenció. No crea promesa, plaça, admissió, retenció d'inventari ni obligació comercial." },
      { label: "03", title: "Revisió operativa i de viabilitat", body: "Abast, participants, capacitat, drets i proteccions necessàries es revisen abans de qualsevol aprovació." },
      { label: "04", title: "Admissió", body: "Quan un club o una propietat exigeix admissió, invitació, relació amb sponsor i admissió es confirmen mitjançant el seu propi procés autoritzat." },
      { label: "05", title: "Reserva o contracte", body: "Només el sistema i les parts autoritzades corresponents poden crear reserva o contracte un cop complertes les portes prèvies." },
      { label: "06", title: "Pagament", body: "El pagament només pot seguir mitjançant un procés autoritzat vinculat a un estat vàlid de reserva o contracte. Aquesta pàgina no n'inicia cap." }
    ],
    faqEyebrow: "Preguntes abans del pas següent", faqTitle: "Preguntes sobre Forest City",
    faqs: [
      { question: "Està obert el projecte CRAYS Clubs de Forest City?", answer: "Aquesta font pública no confirma data d'obertura, estat operatiu ni accés. Una publicació operativa futura necessita evidència i autorització separades." },
      { question: "Puc reservar un hotel des d'aquesta pàgina?", answer: "No. L'enllaç Golf porta a la font Forest City existent, el sistema de la qual manté l'autoritat sobre inventari i estat de reserva. Marina continua guiada per admissió." },
      { question: "El memoràndum estableix una relació més àmplia?", answer: "No es deriva cap relació més enllà de la declaració exacta del memoràndum. No s'afirma exclusivitat, autoritat, dret operatiu ni efecte jurídic addicional." },
      { question: "Puc sol·licitar accés a Marina?", answer: "Aquesta pàgina no ofereix admissió. Invitació, confirmació de sponsor i admissió són estats autoritzats independents abans d'una reserva posterior." },
      { question: "Escola, treball i serveis familiars estan disponibles ara?", answer: "Són funcions del recorregut públic, no afirmacions de disponibilitat. Cada servei requereix operador, abast, proteccions i evidència de publicació confirmats." },
      { question: "Les persones de les imatges genèriques són membres de CRAYS?", answer: "No. Les imatges genèriques il·lustren funcions comunitàries àmplies i no mostren ni avalen membres, clients o participants de Forest City." }
    ],
    closingEyebrow: "Continuar amb cura", closingTitle: "Comença per la història de Forest City.",
    closingBody: "Pregunta pel projecte, el recorregut públic previst o la ruta adequada. El contacte continua sent una consulta i no crea admissió, reserva, contracte ni pagament.", closingAction: "Contactar amb CRAYS Clubs"
  },
  fr: {
    metadata: { title: "Forest City | CRAYS Clubs", description: "Le parcours public CRAYS Clubs pour Forest City, Malaisie." },
    eyebrow: "CRAYS Clubs · Forest City, Malaisie", title: "Forest City est notre campus.",
    intro: "Une introduction publique au projet CRAYS Clubs de Forest City : un parcours ancré dans le lieu reliant travail, communauté, apprentissage et vie quotidienne, tout en séparant admission, réservation hôtelière, contrat et paiement.",
    exploreAction: "Explorer le parcours", inquiryAction: "Contacter CRAYS Clubs",
    contextEyebrow: "Le lieu et le projet", contextTitle: "Un contexte Forest City. Plusieurs parcours distincts.",
    contextBody: "Cette page explique comment la couche publique CRAYS Clubs doit réunir le récit Forest City. Elle ne confirme ni date d'ouverture, ni opérateur, ni inventaire, ni accès, ni programme opérationnel, ni résultat commercial.",
    contextFacts: [
      { label: "01 / Contexte", title: "Forest City, Malaisie", body: "Forest City est le contexte géographique de ce projet CRAYS Clubs. Le parcours public décrit le projet sans transformer le lieu en affirmation de disponibilité ou de propriété." },
      { label: "02 / Couche club", title: "Une perspective work-live-play", body: "Communauté, travail concentré, apprentissage, vie familiale et culture sont présentés comme des fonctions reliées. Chaque service opérationnel exige toujours un périmètre confirmé." },
      { label: "03 / Couche publique", title: "Comprendre avant d'agir", body: "Les visiteurs peuvent comprendre les parcours prévus et rejoindre des destinations éditoriales ou de contact existantes. Cette couche n'accorde aucune admission et ne crée aucune réservation." },
      { label: "04 / Limite commerciale", title: "Le système reste l'autorité", body: "Si un inventaire hôtelier est ensuite affiché, la source CRAYS existante reste responsable du prix, de la disponibilité et de l'état de réservation. Cette page ne publie aucune de ces valeurs." }
    ],
    placeMediaBlocked: "Médias Forest City retenus", placeMediaDetail: "Aucun média Forest City, Golf Hotel ou Marina Hotel correctement identifié et autorisé pour l'usage final n'était disponible dans cette tâche source-only.",
    pathsEyebrow: "Parcours éditoriaux", pathsTitle: "Golf et Marina restent deux parcours différents.",
    pathsBody: "Les deux lieux peuvent être présentés publiquement. L'étape suivante diffère volontairement, car découverte hôtelière, admission au club et réservation ne constituent pas le même événement.",
    golf: { eyebrow: "Forest City Golf Hotel", title: "Golf, séjour et rythme plus large de Forest City", body: "Le parcours Golf reste éditorial ici. Les visiteurs peuvent poursuivre vers la source Forest City existante, où le système CRAYS détermine séparément si un inventaire, un prix ou une action de réservation peut être affiché.", action: "Continuer vers le parcours Golf existant", boundary: "Cette page n'affirme aucun prix, chambre, date ou disponibilité." },
    marina: { eyebrow: "Forest City Marina Hotel", title: "Un parcours Marina guidé par invitation", body: "Le parcours Marina présente le lieu sans commencer de réservation. Invitation personnelle, confirmation du sponsor, admission et action hôtelière ultérieure restent des étapes séparées hors de cette page.", action: "Comprendre la séquence d'admission", boundary: "Cette page n'invite ni n'admet personne et ne déverrouille aucune réservation Marina." },
    everydayEyebrow: "La vie autour du campus", everydayTitle: "Plus qu'un séjour. Un récit public relié.",
    everydayBody: "Le parcours Forest City doit laisser de la place à la communauté, au travail, à l'apprentissage, aux familles et à la culture sans présenter des programmes non confirmés comme opérationnels.",
    functions: [
      { label: "Communauté", title: "Se rencontrer autour d'intérêts communs", body: "La fonction communautaire publique peut expliquer des formes de rencontre possibles. Elle ne prétend pas qu'il existe des membres, participants, événements ou résultats." },
      { label: "Travail à distance", title: "Une base pour le travail concentré", body: "La fonction travail explique le lien prévu entre concentration, échanges et lieu. Bureaux, connectivité et accès restent soumis à des opérations confirmées." },
      { label: "École et emplois", title: "Apprenez ici. Faites-vous connaître partout.", body: "La fonction apprentissage relie pratique, retours et visibilité sans promettre emploi, placement, intervenants, qualification ou résultat professionnel." },
      { label: "Familles", title: "Un parcours attentif à la vie familiale", body: "Les informations familiales appartiennent au même récit du lieu. Garde d'enfants, école, protection et services familiaux doivent être confirmés séparément avant d'être présentés comme disponibles." },
      { label: "Art de vivre et culture", title: "Chez Crays, les inconnus deviennent des histoires.", body: "La culture donne un rythme social au parcours par les repas, le mouvement et le temps partagé. Aucun événement, hôte, lieu ou programme récurrent précis n'est revendiqué." },
      { label: "Host Company", title: "Faire entrer un groupe de travail dans la conversation", body: "Une demande d'entreprise peut décrire un format envisagé. Revue opérateur, faisabilité, approbation, admission, contrat, réservation et paiement restent séparés." }
    ],
    statesEyebrow: "Limites claires", statesTitle: "L'intérêt n'est pas l'admission. L'admission n'est pas la réservation.",
    statesBody: "Chaque étape ayant des conséquences conserve sa propre autorité afin qu'un récit public ne devienne pas silencieusement une réservation, un contrat ou un paiement.",
    states: [
      { label: "01", title: "Découverte publique", body: "Lire le contexte et comparer les parcours éditoriaux Golf, Marina, travail, apprentissage, familles et communauté." },
      { label: "02", title: "Intérêt ou demande", body: "Une demande peut exprimer une intention. Elle ne crée ni promesse, ni place, ni admission, ni blocage d'inventaire, ni obligation commerciale." },
      { label: "03", title: "Revue opérateur et faisabilité", body: "Périmètre, participants, capacité, droits et protections nécessaires sont vérifiés avant toute approbation." },
      { label: "04", title: "Admission", body: "Lorsqu'un club ou une propriété exige une admission, invitation, relation sponsor et admission sont confirmées par leur propre processus autorisé." },
      { label: "05", title: "Réservation ou contrat", body: "Seuls le système concerné et les parties autorisées peuvent créer une réservation ou un contrat après satisfaction de toutes les étapes précédentes." },
      { label: "06", title: "Paiement", body: "Le paiement ne peut suivre que par un processus autorisé lié à un état valide de réservation ou de contrat. Cette page n'en initie aucun." }
    ],
    faqEyebrow: "Questions avant l'étape suivante", faqTitle: "FAQ Forest City",
    faqs: [
      { question: "Le projet CRAYS Clubs de Forest City est-il ouvert ?", answer: "Cette source publique ne confirme ni date d'ouverture, ni état opérationnel, ni accès. Une future publication opérationnelle exige des preuves et une autorisation séparées." },
      { question: "Puis-je réserver un hôtel depuis cette page ?", answer: "Non. Le lien Golf mène à la source Forest City existante, dont le système reste l'autorité pour l'inventaire et l'état de réservation. Marina reste guidée par l'admission." },
      { question: "Le mémorandum établit-il une relation plus large ?", answer: "Aucune relation n'est déduite au-delà de la déclaration exacte du mémorandum. Aucune exclusivité, autorité, droit d'exploitation ou conséquence juridique supplémentaire n'est revendiquée." },
      { question: "Puis-je demander un accès Marina ?", answer: "Cette page ne fournit aucune admission. Invitation, confirmation du sponsor et admission sont des états autorisés distincts avant toute réservation ultérieure." },
      { question: "L'école, le travail et les services familiaux sont-ils disponibles ?", answer: "Ce sont des fonctions du parcours public, pas des affirmations de disponibilité. Chaque service exige opérateur, périmètre, protections et preuve de publication confirmés." },
      { question: "Les personnes des images génériques sont-elles membres CRAYS ?", answer: "Non. Les images génériques illustrent des fonctions communautaires larges et ne représentent ni ne recommandent des membres, clients ou participants Forest City." }
    ],
    closingEyebrow: "Continuer avec soin", closingTitle: "Commencez par l'histoire Forest City.",
    closingBody: "Posez une question sur le projet, le parcours public prévu ou la bonne destination. Le contact reste une demande et ne crée ni admission, ni réservation, ni contrat, ni paiement.", closingAction: "Contacter CRAYS Clubs"
  },
  pt: {
    metadata: { title: "Forest City | CRAYS Clubs", description: "A jornada pública CRAYS Clubs para Forest City, Malásia." },
    eyebrow: "CRAYS Clubs · Forest City, Malásia", title: "Forest City é o nosso campus.",
    intro: "Uma introdução pública ao projeto CRAYS Clubs de Forest City: uma jornada ligada ao lugar que conecta trabalho, comunidade, aprendizagem e vida quotidiana, mantendo admissão, reserva hoteleira, contrato e pagamento como estados separados.",
    exploreAction: "Explorar a jornada", inquiryAction: "Contactar CRAYS Clubs",
    contextEyebrow: "O lugar e o projeto", contextTitle: "Um contexto Forest City. Várias jornadas distintas.",
    contextBody: "Esta página explica como a camada pública CRAYS Clubs pretende reunir a história de Forest City. Não confirma data de abertura, operador, inventário, acesso, execução de programas ou resultado comercial.",
    contextFacts: [
      { label: "01 / Contexto", title: "Forest City, Malásia", body: "Forest City é o contexto geográfico deste projeto CRAYS Clubs. A jornada pública descreve o projeto sem transformar a localização numa afirmação de disponibilidade ou propriedade." },
      { label: "02 / Camada do clube", title: "Uma perspetiva work-live-play", body: "Comunidade, trabalho focado, aprendizagem, vida familiar e cultura são apresentados como funções ligadas. Cada serviço operacional continua a exigir um âmbito confirmado." },
      { label: "03 / Camada pública", title: "Compreender antes de agir", body: "Os visitantes podem conhecer as jornadas previstas e seguir para destinos editoriais ou de contacto existentes. Esta camada não concede admissão nem cria reserva." },
      { label: "04 / Limite comercial", title: "O sistema mantém a autoridade", body: "Se mais tarde for apresentado inventário hoteleiro, a fonte CRAYS existente continua responsável por preço, disponibilidade e estado da reserva. Esta página não publica esses valores." }
    ],
    placeMediaBlocked: "Media de Forest City retida", placeMediaDetail: "Nenhum recurso de Forest City, Golf Hotel ou Marina Hotel corretamente identificado e autorizado para uso final estava disponível nesta tarefa source-only.",
    pathsEyebrow: "Jornadas editoriais", pathsTitle: "Golf e Marina continuam jornadas diferentes.",
    pathsBody: "Ambos os lugares podem ser apresentados publicamente. O passo seguinte é deliberadamente diferente porque descoberta de hotel, admissão no clube e reserva não são o mesmo evento.",
    golf: { eyebrow: "Forest City Golf Hotel", title: "Golf, estadia e o ritmo mais amplo de Forest City", body: "A jornada Golf é editorial aqui. Os visitantes podem continuar para a fonte Forest City existente, onde o sistema CRAYS determina separadamente se inventário, preço ou ação de reserva podem ser mostrados.", action: "Continuar para a jornada Golf existente", boundary: "Esta página não afirma preço, quarto, data ou disponibilidade." },
    marina: { eyebrow: "Forest City Marina Hotel", title: "Uma jornada Marina guiada por convite", body: "A jornada Marina apresenta o lugar sem iniciar uma reserva. Convite pessoal, confirmação de sponsor, admissão e ação hoteleira posterior continuam portas separadas fora desta página.", action: "Compreender a sequência de admissão", boundary: "Esta página não convida nem admite ninguém e não desbloqueia reservas Marina." },
    everydayEyebrow: "Vida em torno do campus", everydayTitle: "Mais do que uma estadia. Uma história pública conectada.",
    everydayBody: "A jornada Forest City precisa de espaço para comunidade, trabalho, aprendizagem, famílias e cultura sem apresentar programas não confirmados como operações ativas.",
    functions: [
      { label: "Comunidade", title: "Encontrar-se em torno de interesses partilhados", body: "A função pública de comunidade pode explicar formas possíveis de encontro. Não afirma membros, participação, eventos ou resultados existentes." },
      { label: "Trabalho remoto", title: "Uma base para trabalho focado", body: "A função trabalho explica a relação pretendida entre foco, intercâmbio e lugar. Mesas, conectividade e acesso dependem de operações confirmadas." },
      { label: "Escola e empregos", title: "Aprenda aqui. Seja reconhecido em qualquer lugar.", body: "A função aprendizagem liga prática, feedback e visibilidade sem prometer emprego, colocação, oradores, qualificações ou resultados profissionais." },
      { label: "Famílias", title: "Uma jornada que considera a vida familiar", body: "A informação familiar pertence à mesma história do lugar. Cuidados infantis, escola, proteção e serviços familiares devem ser confirmados separadamente antes de serem apresentados como disponíveis." },
      { label: "Estilo de vida e cultura", title: "Na Crays, desconhecidos tornam-se histórias.", body: "A cultura dá ritmo social à jornada através de comida, movimento e tempo partilhado. Nenhum evento, anfitrião, local ou programa recorrente específico é afirmado." },
      { label: "Host Company", title: "Trazer um grupo de trabalho para a conversa", body: "Uma consulta empresarial pode descrever um formato pretendido. Revisão operacional, viabilidade, aprovação, admissão, contrato, reserva e pagamento permanecem separados." }
    ],
    statesEyebrow: "Limites claros", statesTitle: "Interesse não é admissão. Admissão não é reserva.",
    statesBody: "Cada passo com consequências mantém a sua própria autoridade para que uma história pública não se transforme silenciosamente em reserva, contrato ou pagamento.",
    states: [
      { label: "01", title: "Descoberta pública", body: "Ler o contexto e comparar as jornadas editoriais Golf, Marina, trabalho, aprendizagem, famílias e comunidade." },
      { label: "02", title: "Interesse ou consulta", body: "Uma consulta pode indicar intenção. Não cria promessa, lugar, admissão, retenção de inventário ou obrigação comercial." },
      { label: "03", title: "Revisão operacional e viabilidade", body: "Âmbito, participantes, capacidade, direitos e proteções necessárias são verificados antes de qualquer aprovação." },
      { label: "04", title: "Admissão", body: "Quando um clube ou propriedade exige admissão, convite, relação com sponsor e admissão são confirmados pelo seu próprio processo autorizado." },
      { label: "05", title: "Reserva ou contrato", body: "Apenas o sistema relevante e as partes autorizadas podem criar uma reserva ou contrato após todas as portas anteriores serem satisfeitas." },
      { label: "06", title: "Pagamento", body: "O pagamento só pode seguir por um processo autorizado ligado a um estado válido de reserva ou contrato. Esta página não inicia nenhum." }
    ],
    faqEyebrow: "Perguntas antes do próximo passo", faqTitle: "FAQ Forest City",
    faqs: [
      { question: "O projeto CRAYS Clubs de Forest City está aberto?", answer: "Esta fonte pública não confirma data de abertura, estado operacional ou acesso. Uma futura publicação operacional exige evidência e autorização separadas." },
      { question: "Posso reservar um hotel nesta página?", answer: "Não. A ligação Golf leva à fonte Forest City existente, cujo sistema mantém autoridade sobre inventário e estado de reserva. Marina continua guiada por admissão." },
      { question: "O memorando estabelece uma relação mais ampla?", answer: "Nenhuma relação é inferida para além da declaração exata do memorando. Não se afirma exclusividade, autoridade, direito operacional ou efeito jurídico adicional." },
      { question: "Posso pedir acesso Marina?", answer: "Esta página não fornece admissão. Convite, confirmação de sponsor e admissão são estados autorizados distintos antes de qualquer reserva posterior." },
      { question: "Escola, trabalho e serviços familiares estão disponíveis?", answer: "São funções da jornada pública, não afirmações de disponibilidade. Cada serviço exige operador, âmbito, proteções e evidência de publicação confirmados." },
      { question: "As pessoas nas imagens genéricas são membros CRAYS?", answer: "Não. As imagens genéricas ilustram funções comunitárias amplas e não representam nem endossam membros, clientes ou participantes de Forest City." }
    ],
    closingEyebrow: "Continuar com cuidado", closingTitle: "Comece pela história de Forest City.",
    closingBody: "Pergunte sobre o projeto, a jornada pública prevista ou o destino adequado. O contacto continua uma consulta e não cria admissão, reserva, contrato ou pagamento.", closingAction: "Contactar CRAYS Clubs"
  },
  it: {
    metadata: { title: "Forest City | CRAYS Clubs", description: "Il percorso pubblico CRAYS Clubs per Forest City, Malesia." },
    eyebrow: "CRAYS Clubs · Forest City, Malesia", title: "Forest City è il nostro campus.",
    intro: "Un'introduzione pubblica al progetto CRAYS Clubs di Forest City: un percorso legato al luogo che connette lavoro, comunità, apprendimento e vita quotidiana, mantenendo ammissione, prenotazione alberghiera, contratto e pagamento come stati separati.",
    exploreAction: "Esplora il percorso", inquiryAction: "Contatta CRAYS Clubs",
    contextEyebrow: "Il luogo e il progetto", contextTitle: "Un contesto Forest City. Diversi percorsi distinti.",
    contextBody: "Questa pagina spiega come il livello pubblico CRAYS Clubs intende riunire il racconto Forest City. Non conferma data di apertura, operatore, inventario, accesso, programmi operativi o risultato commerciale.",
    contextFacts: [
      { label: "01 / Contesto", title: "Forest City, Malesia", body: "Forest City è il contesto geografico di questo progetto CRAYS Clubs. Il percorso pubblico descrive il progetto senza trasformare il luogo in un'affermazione di disponibilità o proprietà." },
      { label: "02 / Livello club", title: "Una prospettiva work-live-play", body: "Comunità, lavoro concentrato, apprendimento, vita familiare e cultura sono presentati come funzioni connesse. Ogni servizio operativo richiede ancora un ambito confermato." },
      { label: "03 / Livello pubblico", title: "Comprendere prima di agire", body: "I visitatori possono conoscere i percorsi previsti e passare a destinazioni editoriali o di contatto esistenti. Questo livello non concede ammissione e non crea prenotazioni." },
      { label: "04 / Confine commerciale", title: "Il sistema resta l'autorità", body: "Se in seguito viene mostrato inventario alberghiero, la fonte CRAYS esistente resta responsabile di prezzo, disponibilità e stato della prenotazione. Questa pagina non pubblica tali valori." }
    ],
    placeMediaBlocked: "Media Forest City trattenuti", placeMediaDetail: "In questa attività source-only non era disponibile alcun media Forest City, Golf Hotel o Marina Hotel correttamente identificato e autorizzato per l'uso finale.",
    pathsEyebrow: "Percorsi editoriali", pathsTitle: "Golf e Marina restano percorsi differenti.",
    pathsBody: "Entrambi i luoghi possono essere presentati pubblicamente. Il passo successivo è volutamente diverso perché scoperta dell'hotel, ammissione al club e prenotazione non sono lo stesso evento.",
    golf: { eyebrow: "Forest City Golf Hotel", title: "Golf, soggiorno e il ritmo più ampio di Forest City", body: "Il percorso Golf è editoriale qui. I visitatori possono continuare alla fonte Forest City esistente, dove il sistema CRAYS determina separatamente se inventario, prezzo o azione di prenotazione possono essere mostrati.", action: "Continua al percorso Golf esistente", boundary: "Questa pagina non afferma prezzo, camera, data o disponibilità." },
    marina: { eyebrow: "Forest City Marina Hotel", title: "Un percorso Marina guidato da invito", body: "Il percorso Marina presenta il luogo senza iniziare una prenotazione. Invito personale, conferma dello sponsor, ammissione e successiva azione alberghiera restano passaggi separati fuori da questa pagina.", action: "Comprendi la sequenza di ammissione", boundary: "Questa pagina non invita né ammette nessuno e non abilita prenotazioni Marina." },
    everydayEyebrow: "Vita intorno al campus", everydayTitle: "Più di un soggiorno. Un racconto pubblico connesso.",
    everydayBody: "Il percorso Forest City ha bisogno di spazio per comunità, lavoro, apprendimento, famiglie e cultura senza presentare programmi non confermati come operativi.",
    functions: [
      { label: "Comunità", title: "Incontrarsi intorno a interessi condivisi", body: "La funzione pubblica di comunità può spiegare possibili forme di incontro. Non afferma membri, presenze, eventi o risultati esistenti." },
      { label: "Lavoro da remoto", title: "Una base per il lavoro concentrato", body: "La funzione lavoro spiega il rapporto previsto tra concentrazione, scambio e luogo. Postazioni, connettività e accesso dipendono da operazioni confermate." },
      { label: "Scuola e lavoro", title: "Impara qui. Fatti conoscere ovunque.", body: "La funzione apprendimento collega pratica, feedback e visibilità senza promettere occupazione, collocamento, relatori, qualifiche o risultati professionali." },
      { label: "Famiglie", title: "Un percorso che considera la vita familiare", body: "Le informazioni per le famiglie appartengono allo stesso racconto del luogo. Cura dei bambini, scuola, tutela e servizi familiari devono essere confermati separatamente prima di essere mostrati come disponibili." },
      { label: "Stile di vita e cultura", title: "Da Crays, gli sconosciuti diventano storie.", body: "La cultura dà ritmo sociale al percorso attraverso cibo, movimento e tempo condiviso. Non viene affermato alcun evento, host, luogo o programma ricorrente specifico." },
      { label: "Host Company", title: "Portare un gruppo di lavoro nella conversazione", body: "Una richiesta aziendale può descrivere un formato desiderato. Revisione operativa, fattibilità, approvazione, ammissione, contratto, prenotazione e pagamento restano separati." }
    ],
    statesEyebrow: "Confini chiari", statesTitle: "L'interesse non è ammissione. L'ammissione non è prenotazione.",
    statesBody: "Ogni passaggio con conseguenze conserva la propria autorità affinché un racconto pubblico non diventi silenziosamente prenotazione, contratto o pagamento.",
    states: [
      { label: "01", title: "Scoperta pubblica", body: "Leggere il contesto e confrontare i percorsi editoriali Golf, Marina, lavoro, apprendimento, famiglie e comunità." },
      { label: "02", title: "Interesse o richiesta", body: "Una richiesta può esprimere un intento. Non crea promessa, posto, ammissione, blocco di inventario o obbligo commerciale." },
      { label: "03", title: "Revisione operativa e fattibilità", body: "Ambito, partecipanti, capacità, diritti e tutele necessarie vengono verificati prima di qualsiasi approvazione." },
      { label: "04", title: "Ammissione", body: "Quando un club o una proprietà richiede ammissione, invito, rapporto con lo sponsor e ammissione sono confermati tramite il proprio processo autorizzato." },
      { label: "05", title: "Prenotazione o contratto", body: "Solo il sistema pertinente e le parti autorizzate possono creare prenotazione o contratto dopo il completamento di tutti i passaggi precedenti." },
      { label: "06", title: "Pagamento", body: "Il pagamento può seguire solo tramite un processo autorizzato collegato a uno stato valido di prenotazione o contratto. Questa pagina non ne avvia alcuno." }
    ],
    faqEyebrow: "Domande prima del prossimo passo", faqTitle: "FAQ Forest City",
    faqs: [
      { question: "Il progetto CRAYS Clubs di Forest City è aperto?", answer: "Questa fonte pubblica non conferma data di apertura, stato operativo o accesso. Una futura pubblicazione operativa richiede prove e autorizzazione separate." },
      { question: "Posso prenotare un hotel da questa pagina?", answer: "No. Il link Golf conduce alla fonte Forest City esistente, il cui sistema mantiene l'autorità su inventario e stato della prenotazione. Marina resta guidata dall'ammissione." },
      { question: "Il memorandum stabilisce una relazione più ampia?", answer: "Non viene dedotta alcuna relazione oltre alla dichiarazione esatta del memorandum. Non vengono affermati esclusività, autorità, diritto operativo o ulteriori effetti giuridici." },
      { question: "Posso richiedere accesso Marina?", answer: "Questa pagina non fornisce ammissione. Invito, conferma dello sponsor e ammissione sono stati autorizzati distinti prima di qualsiasi prenotazione successiva." },
      { question: "Scuola, lavoro e servizi familiari sono disponibili?", answer: "Sono funzioni del percorso pubblico, non affermazioni di disponibilità. Ogni servizio richiede operatore, ambito, tutele e prova di pubblicazione confermati." },
      { question: "Le persone nelle immagini generiche sono membri CRAYS?", answer: "No. Le immagini generiche illustrano ampie funzioni comunitarie e non rappresentano né sostengono membri, clienti o partecipanti Forest City." }
    ],
    closingEyebrow: "Continuare con attenzione", closingTitle: "Inizia dalla storia di Forest City.",
    closingBody: "Chiedi del progetto, del percorso pubblico previsto o della destinazione appropriata. Il contatto resta una richiesta e non crea ammissione, prenotazione, contratto o pagamento.", closingAction: "Contatta CRAYS Clubs"
  }
};
