import type { ClubsLocale } from "../../../lib/clubs/public-site";

export type AmbassadorJourneyCopy = {
  metaTitle: string; metaDescription: string;
  directEyebrow: string; referralEyebrow: string; directTitle: string; referralTitle: string;
  directIntro: string; referralIntro: string; primaryCta: string; learnCta: string;
  referralLabel: string; confirmedLabel: string; isabelRole: string; isabelDetail: string; identityGate: string;
  functionEyebrow: string; functionTitle: string; functionIntro: string; functions: Array<{ title: string; body: string }>;
  storyEyebrow: string; storyTitle: string; storyBody: string; storyBodyTwo: string;
  processEyebrow: string; processTitle: string; processIntro: string; states: Array<{ title: string; body: string }>;
  authorityNote: string; formEyebrow: string; directFormTitle: string; referralFormTitle: string; formIntro: string;
  applicantType: string; types: { individual: string; family: string; team: string };
  fullName: string; email: string; basedIn: string; interest: string; interests: Array<{ value: string; label: string }>;
  arrival: string; arrivalHint: string; length: string; lengthHint: string; linkedin: string; social: string; website: string;
  motivation: string; contribution: string; consent: string; submit: string;
  previewTitle: string; previewBody: string; previewDirect: string; previewReferral: string;
  missing: string; invalidEmail: string; invalidUrl: string; consentRequired: string;
  faqEyebrow: string; faqTitle: string; faqs: Array<{ q: string; a: string }>;
  closeEyebrow: string; closeTitle: string; closeBody: string; directLink: string; mediaUnavailable: string;
};

const interestValues = ["community", "school-jobs", "fitness-wellbeing", "family", "company-residency", "culture-events"];
const toInterests = (labels: string[]) => interestValues.map((value, index) => ({ value, label: labels[index] }));

const en: AmbassadorJourneyCopy = {
  metaTitle: "Become a member | CRAYS Club", metaDescription: "Start a direct or Ambassador-referred CRAYS Club membership application.",
  directEyebrow: "CRAYS Club membership", referralEyebrow: "Ambassador referral",
  directTitle: "Your global home starts with a conversation.", referralTitle: "An introduction opens the door. The CRAYS team makes the decision.",
  directIntro: "Tell us who you are, what you are building and how you hope to take part. This is an application for team review, not a booking, admission or payment.",
  referralIntro: "Your Ambassador records the introduction and may prequalify the fit. The referral does not guarantee membership: final review and every decision remain with the CRAYS team.",
  primaryCta: "Start the application", learnCta: "See how decisions work", referralLabel: "Referred by", confirmedLabel: "Confirmed Ambassador",
  isabelRole: "First confirmed Ambassador and Forest City project lead",
  isabelDetail: "Isabel Maria Jeworski is the first confirmed CRAYS Club Ambassador. Ambassador confirmations are coordinated with Isabel and remain visible to the owner for audit.",
  identityGate: "A portrait is intentionally withheld until an image-rights record is approved.",
  functionEyebrow: "One application, distinct paths", functionTitle: "A membership journey built for people who contribute.",
  functionIntro: "The application gives the team enough context to understand your interests without turning interest into a promise. Every format remains subject to review and later operational confirmation.",
  functions: [
    { title: "Community introductions", body: "Describe the people, projects and conversations you hope to meet. Introductions are curated after admission; they are not promised by this form." },
    { title: "Work and building", body: "Share the work, company or independent practice you are developing and the focused environment that would help." },
    { title: "School & Jobs", body: "Explain what you want to learn, teach or make discoverable through CRAYS Club. No separate school institution or employment outcome is implied." },
    { title: "Fitness and wellbeing", body: "Tell us how movement and recovery fit your working rhythm. Facilities and schedules require separate confirmation." },
    { title: "Families and teams", body: "Apply as an individual, family or team while keeping every participant and later admission decision explicit." },
    { title: "Culture and events", body: "Show how you might host, join or strengthen a thoughtful club culture. Event feasibility is reviewed separately." },
  ],
  storyEyebrow: "Why CRAYS Club", storyTitle: "Join our community of builders & makers.",
  storyBody: "Connect with friends, colleagues, and business partners in one place. CRAYS Clubs are phygital work-live-play spaces for creators, founders, and nomads.",
  storyBodyTwo: "Learn here. Get discovered anywhere. Membership is shaped around contribution, mutual respect and the quality of the community rather than a checkout transaction.",
  processEyebrow: "Decision architecture", processTitle: "Nothing is silently bundled.",
  processIntro: "Your application moves through explicit gates. A referral can support context and prequalification, but cannot decide admission or trigger a booking or payment.",
  states: [
    { title: "1. Application", body: "You provide the complete membership information for review." },
    { title: "2. Referral", body: "An approved Ambassador link attaches sponsor identity and referral context as separate metadata." },
    { title: "3. Prequalification", body: "The Ambassador may assess basic fit and completeness without approving membership." },
    { title: "4. Team review", body: "The CRAYS team reviews the application and any referral record." },
    { title: "5. Decision", body: "Only the CRAYS team records the final membership decision." },
    { title: "6. Invitation / admission", body: "Invitation and admission follow only a positive decision and remain a distinct state." },
    { title: "7. Booking", body: "A stay, event or facility is considered only through its own later journey." },
    { title: "8. Payment", body: "No payment is collected here. Payment can occur only after its own confirmed basis." },
  ],
  authorityNote: "Ambassadors introduce and may prequalify. They do not approve, admit, book, charge or promise an outcome.",
  formEyebrow: "Membership application", directFormTitle: "Tell the CRAYS team how you want to take part.",
  referralFormTitle: "Continue Isabel's introduction with your full application.",
  formIntro: "Direct and referred applicants complete the same fields. Referral metadata is added only when an approved Ambassador link is used.",
  applicantType: "Applying as", types: { individual: "Individual", family: "Family", team: "Team" },
  fullName: "Full name", email: "Email address", basedIn: "Where are you currently based?", interest: "Primary interest",
  interests: toInterests(["Community", "School & Jobs", "Fitness & wellbeing", "Families", "Company formats", "Culture & events"]),
  arrival: "Preferred arrival or participation window", arrivalHint: "A preference only; it does not confirm availability.",
  length: "Preferred participation length", lengthHint: "Describe the rhythm you are considering. No stay is reserved.",
  linkedin: "LinkedIn profile (optional)", social: "Other social profile (optional)", website: "Website or portfolio (optional)",
  motivation: "How did you hear about CRAYS Club, and why now?", contribution: "What would you like to contribute to the community?",
  consent: "I agree that CRAYS may use the information I provide to assess my membership application and contact me about it. I have read the Privacy Policy and Data Protection information.",
  submit: "Submit application", previewTitle: "Preview prepared, not submitted",
  previewBody: "The interface validated this local preview. No information was stored, emailed or sent to a provider because an authorized submission controller and endpoint are not connected.",
  previewDirect: "Direct application: no Ambassador referral metadata is attached.",
  previewReferral: "Referral application: Isabel's approved slug and sponsor context are attached in the preview ledger, but are not persisted.",
  missing: "Please complete this field.", invalidEmail: "Enter a valid email address.", invalidUrl: "Enter a complete http or https URL.", consentRequired: "Consent is required to prepare the preview.",
  faqEyebrow: "Questions before you apply", faqTitle: "Clear boundaries make better introductions.",
  faqs: [
    { q: "Does an Ambassador referral guarantee membership?", a: "No. An Ambassador can introduce and prequalify an applicant. The CRAYS team always makes the final decision." },
    { q: "Is the direct application different from a referred application?", a: "The applicant fields are identical. An approved vanity link adds separate referral and sponsor metadata for audit." },
    { q: "Does this application book a stay or facility?", a: "No. Application, admission, booking and payment are separate states and separate actions." },
    { q: "Is payment taken when I apply?", a: "No. This page does not collect payment and does not create a charge." },
    { q: "What happens to my information now?", a: "The current source implementation creates only a local preview. Submission remains closed until an authorized controller, privacy basis, retention policy and endpoint are connected." },
  ],
  closeEyebrow: "Ready when you are", closeTitle: "CLAIM YOUR GLOBAL HOME", closeBody: "Meet friends, colleagues and business partners in the new CRAYS Club world.",
  directLink: "Apply directly", mediaUnavailable: "Rights-cleared named portrait pending",
};

const de: AmbassadorJourneyCopy = {
  ...en,
  metaTitle: "Mitglied werden | CRAYS Club", metaDescription: "Direkter oder durch einen Ambassador vermittelter Mitgliedsantrag beim CRAYS Club.",
  directEyebrow: "CRAYS Club Mitgliedschaft", referralEyebrow: "Ambassador-Empfehlung",
  directTitle: "Dein globales Zuhause beginnt mit einem Gespräch.", referralTitle: "Eine Vorstellung öffnet die Tür. Das CRAYS-Team entscheidet.",
  directIntro: "Erzähle uns, wer du bist, woran du arbeitest und wie du dich einbringen möchtest. Dies ist ein Antrag zur Teamprüfung, keine Buchung, Aufnahme oder Zahlung.",
  referralIntro: "Dein Ambassador dokumentiert die Vorstellung und kann die grundsätzliche Passung vorqualifizieren. Die Empfehlung garantiert keine Mitgliedschaft; die Entscheidung bleibt beim CRAYS-Team.",
  primaryCta: "Antrag beginnen", learnCta: "Entscheidungsweg ansehen", referralLabel: "Empfohlen von", confirmedLabel: "Bestätigte Ambassador",
  isabelRole: "Erste bestätigte Ambassador und Projektleitung Forest City", isabelDetail: "Isabel Maria Jeworski ist die erste bestätigte CRAYS Club Ambassador. Ambassador-Bestätigungen werden mit Isabel koordiniert und bleiben für den Owner auditierbar.",
  identityGate: "Ein Porträt bleibt bewusst ausgeblendet, bis ein freigegebener Bildrechtenachweis vorliegt.",
  functionEyebrow: "Ein Antrag, getrennte Wege", functionTitle: "Eine Mitgliedschaftsreise für Menschen, die beitragen.",
  functionIntro: "Der Antrag gibt dem Team genug Kontext, ohne Interesse in ein Versprechen zu verwandeln. Jedes Format bleibt von Prüfung und später operativer Bestätigung abhängig.",
  functions: [
    { title: "Community-Vorstellungen", body: "Beschreibe Menschen, Projekte und Gespräche, die du kennenlernen möchtest. Vorstellungen werden erst nach Aufnahme kuratiert und hier nicht versprochen." },
    { title: "Arbeiten und Aufbauen", body: "Teile, woran du als Unternehmen, Team oder unabhängige Person arbeitest und welche konzentrierte Umgebung dir hilft." },
    { title: "School & Jobs", body: "Erkläre, was du lernen, weitergeben oder durch CRAYS Club sichtbar machen möchtest. Eine separate Schule oder ein Beschäftigungsergebnis wird nicht impliziert." },
    { title: "Fitness und Wohlbefinden", body: "Zeige, wie Bewegung und Erholung in deinen Arbeitsrhythmus passen. Einrichtungen und Zeiten brauchen separate Bestätigung." },
    { title: "Familien und Teams", body: "Bewirb dich als Einzelperson, Familie oder Team; Beteiligte und spätere Aufnahmeentscheidungen bleiben ausdrücklich getrennt." },
    { title: "Kultur und Events", body: "Zeige, wie du zu einer aufmerksamen Clubkultur beitragen könntest. Die Machbarkeit von Events wird separat geprüft." },
  ],
  storyEyebrow: "Warum CRAYS Club", storyTitle: "Werde Teil unserer Community aus Builders & Makers.",
  storyBody: "Verbinde dich an einem Ort mit Freunden, Kollegen und Geschäftspartnern. CRAYS Clubs sind phygitale Work-Live-Play-Orte für Kreative, Gründer und Nomaden.",
  storyBodyTwo: "Lerne hier. Werde überall entdeckt. Mitgliedschaft entsteht aus Beitrag, gegenseitigem Respekt und der Qualität der Community, nicht aus einem Checkout.",
  processEyebrow: "Entscheidungsarchitektur", processTitle: "Nichts wird stillschweigend gebündelt.",
  processIntro: "Dein Antrag durchläuft klare Gates. Eine Empfehlung kann Kontext und Vorqualifizierung stärken, aber weder Aufnahme noch Buchung oder Zahlung auslösen.",
  states: [
    { title: "1. Antrag", body: "Du stellst die vollständigen Informationen zur Prüfung bereit." },
    { title: "2. Referral", body: "Ein freigegebener Ambassador-Link führt Sponsoridentität und Empfehlungskontext als eigene Metadaten." },
    { title: "3. Vorqualifizierung", body: "Der Ambassador kann Passung und Vollständigkeit einschätzen, aber keine Mitgliedschaft genehmigen." },
    { title: "4. Teamprüfung", body: "Das CRAYS-Team prüft den Antrag und gegebenenfalls den Referral-Datensatz." },
    { title: "5. Entscheidung", body: "Nur das CRAYS-Team dokumentiert die endgültige Mitgliedschaftsentscheidung." },
    { title: "6. Einladung / Aufnahme", body: "Einladung und Aufnahme folgen nur einer positiven Entscheidung und bleiben ein eigener Status." },
    { title: "7. Buchung", body: "Aufenthalt, Event oder Einrichtung werden erst in einer eigenen späteren Journey betrachtet." },
    { title: "8. Zahlung", body: "Hier wird keine Zahlung erhoben. Sie kann erst auf eigener bestätigter Grundlage erfolgen." },
  ],
  authorityNote: "Ambassadors stellen vor und können vorqualifizieren. Sie genehmigen, nehmen auf, buchen, berechnen oder versprechen kein Ergebnis.",
  formEyebrow: "Mitgliedsantrag", directFormTitle: "Erzähle dem CRAYS-Team, wie du dich einbringen möchtest.", referralFormTitle: "Führe Isabels Vorstellung mit deinem vollständigen Antrag fort.",
  formIntro: "Direkte und vermittelte Bewerber füllen dieselben Felder aus. Referral-Metadaten kommen nur bei einem freigegebenen Ambassador-Link hinzu.",
  applicantType: "Antrag als", types: { individual: "Einzelperson", family: "Familie", team: "Team" }, fullName: "Vollständiger Name", email: "E-Mail-Adresse", basedIn: "Wo lebst du aktuell?", interest: "Hauptinteresse",
  interests: toInterests(["Community", "School & Jobs", "Fitness & Wohlbefinden", "Familien", "Unternehmensformate", "Kultur & Events"]),
  arrival: "Bevorzugtes Ankunfts- oder Teilnahmefenster", arrivalHint: "Nur eine Präferenz; keine Verfügbarkeitsbestätigung.", length: "Bevorzugte Teilnahmedauer", lengthHint: "Beschreibe deinen gedachten Rhythmus. Es wird kein Aufenthalt reserviert.",
  linkedin: "LinkedIn-Profil (optional)", social: "Anderes Social-Profil (optional)", website: "Website oder Portfolio (optional)", motivation: "Wie hast du vom CRAYS Club erfahren und warum jetzt?", contribution: "Was möchtest du zur Community beitragen?",
  consent: "Ich stimme zu, dass CRAYS meine Angaben zur Prüfung meiner Mitgliedschaftsbewerbung verwenden und mich dazu kontaktieren darf. Ich habe die Datenschutzerklärung und die Informationen zum Datenschutz gelesen.", submit: "Bewerbung senden",
  previewTitle: "Vorschau vorbereitet, nicht gesendet", previewBody: "Die Oberfläche hat diese lokale Vorschau validiert. Es wurden keine Daten gespeichert, gemailt oder an Provider gesendet, da Controller und Endpoint nicht autorisiert sind.",
  previewDirect: "Direktantrag: keine Ambassador-Referral-Metadaten.", previewReferral: "Referral-Antrag: Isabels freigegebener Slug und Sponsorkontext liegen nur in der nicht persistierten Vorschau.",
  missing: "Bitte fülle dieses Feld aus.", invalidEmail: "Gib eine gültige E-Mail-Adresse ein.", invalidUrl: "Gib eine vollständige http- oder https-URL ein.", consentRequired: "Die Zustimmung ist für die Vorschau erforderlich.",
  faqEyebrow: "Fragen vor dem Antrag", faqTitle: "Klare Grenzen schaffen bessere Vorstellungen.",
  faqs: [
    { q: "Garantiert eine Ambassador-Empfehlung die Mitgliedschaft?", a: "Nein. Ein Ambassador kann vorstellen und vorqualifizieren. Die endgültige Entscheidung trifft immer das CRAYS-Team." },
    { q: "Unterscheidet sich der Direktantrag?", a: "Die Felder sind identisch. Ein freigegebener Vanity-Link ergänzt getrennte Referral- und Sponsor-Metadaten für das Audit." },
    { q: "Bucht der Antrag einen Aufenthalt oder eine Einrichtung?", a: "Nein. Antrag, Aufnahme, Buchung und Zahlung sind getrennte Zustände und Aktionen." },
    { q: "Wird beim Antrag bezahlt?", a: "Nein. Diese Seite erhebt keine Zahlung und erzeugt keine Belastung." },
    { q: "Was geschieht aktuell mit meinen Angaben?", a: "Der aktuelle Source-Stand erzeugt nur eine lokale Vorschau. Versand bleibt geschlossen, bis Controller, Datenschutzgrundlage, Aufbewahrung und Endpoint autorisiert sind." },
  ],
  closeEyebrow: "Bereit, wenn du es bist", closeBody: "Triff Freunde, Kollegen und Geschäftspartner in der neuen CRAYS Club Welt.", directLink: "Direkt bewerben", mediaUnavailable: "Bildrechtenachweis für benanntes Porträt ausstehend",
};

const es: AmbassadorJourneyCopy = {
  ...en,
  metaTitle: "Hazte miembro | CRAYS Club", metaDescription: "Solicitud directa o referida por Ambassador para CRAYS Club.", directEyebrow: "Membresía de CRAYS Club", referralEyebrow: "Referencia de Ambassador",
  directTitle: "Tu hogar global empieza con una conversación.", referralTitle: "Una presentación abre la puerta. El equipo CRAYS decide.",
  directIntro: "Cuéntanos quién eres, qué estás construyendo y cómo quieres participar. Es una solicitud para revisión del equipo, no una reserva, admisión ni pago.",
  referralIntro: "Tu Ambassador registra la presentación y puede hacer una precalificación. La referencia no garantiza la membresía; la decisión final corresponde al equipo CRAYS.",
  primaryCta: "Iniciar la solicitud", learnCta: "Ver el proceso de decisión", referralLabel: "Referido por", confirmedLabel: "Ambassador confirmada",
  isabelRole: "Primera Ambassador confirmada y responsable del proyecto Forest City", isabelDetail: "Isabel Maria Jeworski es la primera Ambassador confirmada de CRAYS Club. Las confirmaciones se coordinan con Isabel y permanecen visibles para la auditoría del owner.", identityGate: "El retrato se retiene hasta aprobar un registro de derechos de imagen.",
  functionEyebrow: "Una solicitud, estados distintos", functionTitle: "Una membresía para personas que contribuyen.", functionIntro: "La solicitud aporta contexto sin convertir el interés en una promesa. Cada formato depende de revisión y confirmación operativa posterior.",
  functions: [
    { title: "Presentaciones de comunidad", body: "Describe las personas, proyectos y conversaciones que esperas encontrar. Las presentaciones se curan tras la admisión y no se prometen aquí." },
    { title: "Trabajo y construcción", body: "Comparte el trabajo, empresa o práctica independiente que desarrollas y el entorno de concentración que te ayudaría." },
    { title: "School & Jobs", body: "Explica qué quieres aprender, enseñar o hacer visible mediante CRAYS Club. No se implica una escuela separada ni un resultado laboral." },
    { title: "Fitness y bienestar", body: "Cuéntanos cómo encajan movimiento y recuperación en tu ritmo. Instalaciones y horarios requieren confirmación aparte." },
    { title: "Familias y equipos", body: "Solicita como persona, familia o equipo manteniendo explícitos cada participante y toda decisión posterior." },
    { title: "Cultura y eventos", body: "Muestra cómo podrías reforzar una cultura de club considerada. La viabilidad de eventos se revisa por separado." },
  ],
  storyEyebrow: "Por qué CRAYS Club", storyTitle: "Únete a nuestra comunidad de builders & makers.", storyBody: "Conecta con amigos, colegas y socios de negocio en un solo lugar. CRAYS Clubs son espacios phygital work-live-play para creadores, fundadores y nómadas.", storyBodyTwo: "Aprende aquí. Hazte visible en cualquier lugar. La membresía se basa en contribución, respeto mutuo y calidad de comunidad, no en un checkout.",
  processEyebrow: "Arquitectura de decisión", processTitle: "Nada se agrupa de forma implícita.", processIntro: "La solicitud pasa por puertas explícitas. Una referencia aporta contexto, pero no decide la admisión ni activa reserva o pago.",
  states: [
    { title: "1. Solicitud", body: "Aportas toda la información de membresía para revisión." }, { title: "2. Referral", body: "El enlace aprobado añade identidad del sponsor y contexto como metadatos separados." },
    { title: "3. Precalificación", body: "El Ambassador puede valorar ajuste y completitud sin aprobar membresía." }, { title: "4. Revisión del equipo", body: "El equipo CRAYS revisa la solicitud y cualquier registro de referral." },
    { title: "5. Decisión", body: "Solo el equipo CRAYS registra la decisión final." }, { title: "6. Invitación / admisión", body: "Solo sigue a una decisión positiva y permanece como estado propio." },
    { title: "7. Reserva", body: "Estancias, eventos o instalaciones se consideran en su propio recorrido posterior." }, { title: "8. Pago", body: "Aquí no se cobra. Un pago exige su propia base confirmada." },
  ],
  authorityNote: "Los Ambassadors presentan y pueden precalificar. No aprueban, admiten, reservan, cobran ni prometen resultados.",
  formEyebrow: "Solicitud de membresía", directFormTitle: "Cuenta al equipo CRAYS cómo quieres participar.", referralFormTitle: "Continúa la presentación de Isabel con tu solicitud completa.", formIntro: "Solicitantes directos y referidos completan los mismos campos. Los metadatos solo se añaden con un enlace aprobado.",
  applicantType: "Solicitas como", types: { individual: "Persona", family: "Familia", team: "Equipo" }, fullName: "Nombre completo", email: "Correo electrónico", basedIn: "¿Dónde resides ahora?", interest: "Interés principal", interests: toInterests(["Comunidad", "School & Jobs", "Fitness y bienestar", "Familias", "Formatos para empresas", "Cultura y eventos"]),
  arrival: "Ventana preferida de llegada o participación", arrivalHint: "Solo una preferencia; no confirma disponibilidad.", length: "Duración preferida", lengthHint: "Describe el ritmo previsto. No se reserva ninguna estancia.", linkedin: "Perfil de LinkedIn (opcional)", social: "Otro perfil social (opcional)", website: "Web o portfolio (opcional)", motivation: "¿Cómo conociste CRAYS Club y por qué ahora?", contribution: "¿Qué quieres aportar a la comunidad?",
  consent: "Acepto que CRAYS utilice la información que facilito para evaluar mi solicitud de membresía y contactarme al respecto. He leído la política de privacidad y la información sobre protección de datos.", submit: "Enviar solicitud", previewTitle: "Vista previa preparada, no enviada", previewBody: "La interfaz validó esta vista local. No se guardó ni envió información porque no hay controlador ni endpoint autorizados.", previewDirect: "Solicitud directa: sin metadatos de Ambassador.", previewReferral: "Solicitud referida: el slug aprobado de Isabel y el contexto permanecen solo en la vista previa.", missing: "Completa este campo.", invalidEmail: "Introduce un correo válido.", invalidUrl: "Introduce una URL http o https completa.", consentRequired: "Se requiere consentimiento para preparar la vista.",
  faqEyebrow: "Preguntas antes de solicitar", faqTitle: "Los límites claros crean mejores presentaciones.",
  faqs: [
    { q: "¿Una referencia garantiza la membresía?", a: "No. Un Ambassador puede presentar y precalificar. La decisión final siempre es del equipo CRAYS." },
    { q: "¿Es diferente la solicitud directa?", a: "Los campos son idénticos. Un vanity link aprobado añade metadatos separados de referral y sponsor para auditoría." },
    { q: "¿La solicitud reserva una estancia?", a: "No. Solicitud, admisión, reserva y pago son estados y acciones separados." },
    { q: "¿Se paga al solicitar?", a: "No. Esta página no recauda pagos ni crea cargos." },
    { q: "¿Qué pasa ahora con mis datos?", a: "El source actual crea solo una vista previa local. El envío sigue cerrado hasta autorizar controller, privacidad, retención y endpoint." },
  ],
  closeEyebrow: "Cuando quieras", closeBody: "Conoce amigos, colegas y socios de negocio en el nuevo mundo CRAYS Club.", directLink: "Solicitud directa", mediaUnavailable: "Retrato retenido hasta verificar derechos",
};

const ca: AmbassadorJourneyCopy = {
  ...en,
  metaTitle: "Fes-te membre | CRAYS Club", metaDescription: "Sol·licitud directa o referida per Ambassador per a CRAYS Club.", directEyebrow: "Membresia de CRAYS Club", referralEyebrow: "Referència d'Ambassador",
  directTitle: "La teva llar global comença amb una conversa.", referralTitle: "Una presentació obre la porta. L'equip CRAYS decideix.", directIntro: "Explica'ns qui ets, què construeixes i com vols participar. És una sol·licitud per a revisió, no una reserva, admissió ni pagament.", referralIntro: "L'Ambassador registra la presentació i pot prequalificar l'encaix. La referència no garanteix la membresia; la decisió final és de l'equip CRAYS.", primaryCta: "Començar la sol·licitud", learnCta: "Veure el procés", referralLabel: "Referit per", confirmedLabel: "Ambassador confirmada",
  isabelRole: "Primera Ambassador confirmada i responsable del projecte Forest City", isabelDetail: "Isabel Maria Jeworski és la primera Ambassador confirmada de CRAYS Club. Les confirmacions es coordinen amb Isabel i resten visibles per a l'auditoria de l'owner.", identityGate: "El retrat es reté fins que se n'aprovi el registre de drets.",
  functionEyebrow: "Una sol·licitud, estats separats", functionTitle: "Una membresia per a persones que contribueixen.", functionIntro: "La sol·licitud dona context sense convertir l'interès en promesa. Cada format depèn de revisió i confirmació posterior.",
  functions: [
    { title: "Presentacions de comunitat", body: "Descriu les persones, projectes i converses que esperes trobar. Les presentacions es curen després de l'admissió i no es prometen aquí." },
    { title: "Treball i construcció", body: "Comparteix la feina, empresa o pràctica independent que desenvolupes i l'entorn de concentració que t'ajudaria." },
    { title: "School & Jobs", body: "Explica què vols aprendre, ensenyar o fer visible mitjançant CRAYS Club. No s'implica cap escola separada ni resultat laboral." },
    { title: "Fitness i benestar", body: "Explica com encaixen moviment i recuperació en el teu ritme. Instal·lacions i horaris requereixen confirmació separada." },
    { title: "Famílies i equips", body: "Sol·licita com a persona, família o equip mantenint explícits participants i decisions posteriors." },
    { title: "Cultura i esdeveniments", body: "Mostra com podries reforçar una cultura de club atenta. La viabilitat d'esdeveniments es revisa a part." },
  ],
  storyEyebrow: "Per què CRAYS Club", storyTitle: "Uneix-te a la nostra comunitat de builders & makers.", storyBody: "Connecta amb amics, col·legues i socis de negoci en un sol lloc. CRAYS Clubs són espais phygital work-live-play per a creadors, fundadors i nòmades.", storyBodyTwo: "Aprèn aquí. Fes-te visible arreu. La membresia neix de la contribució, el respecte mutu i la qualitat de comunitat, no d'un checkout.",
  processEyebrow: "Arquitectura de decisió", processTitle: "Res no s'agrupa en silenci.", processIntro: "La sol·licitud passa per portes explícites. Una referència dona context, però no decideix admissió ni activa reserva o pagament.",
  states: [
    { title: "1. Sol·licitud", body: "Aportes tota la informació de membresia per a revisió." }, { title: "2. Referral", body: "L'enllaç aprovat afegeix identitat de sponsor i context com a metadades separades." },
    { title: "3. Prequalificació", body: "L'Ambassador pot valorar encaix i completesa sense aprovar membresia." }, { title: "4. Revisió d'equip", body: "L'equip CRAYS revisa la sol·licitud i qualsevol registre de referral." },
    { title: "5. Decisió", body: "Només l'equip CRAYS registra la decisió final." }, { title: "6. Invitació / admissió", body: "Només segueix una decisió positiva i resta com a estat propi." },
    { title: "7. Reserva", body: "Estades, esdeveniments o instal·lacions es consideren en un recorregut posterior propi." }, { title: "8. Pagament", body: "Aquí no es cobra. Un pagament exigeix la seva pròpia base confirmada." },
  ],
  authorityNote: "Els Ambassadors presenten i poden prequalificar. No aproven, admeten, reserven, cobren ni prometen resultats.",
  formEyebrow: "Sol·licitud de membresia", directFormTitle: "Explica a l'equip CRAYS com vols participar.", referralFormTitle: "Continua la presentació d'Isabel amb la sol·licitud completa.", formIntro: "Sol·licitants directes i referits omplen els mateixos camps. Les metadades només s'afegeixen amb un enllaç aprovat.", applicantType: "Sol·licites com", types: { individual: "Persona", family: "Família", team: "Equip" }, fullName: "Nom complet", email: "Correu electrònic", basedIn: "On resideixes ara?", interest: "Interès principal", interests: toInterests(["Comunitat", "School & Jobs", "Fitness i benestar", "Famílies", "Formats per a empreses", "Cultura i esdeveniments"]), arrival: "Finestra preferida d'arribada o participació", arrivalHint: "Només una preferència; no confirma disponibilitat.", length: "Durada preferida", lengthHint: "Descriu el ritme previst. No es reserva cap estada.", linkedin: "Perfil de LinkedIn (opcional)", social: "Altre perfil social (opcional)", website: "Web o portfoli (opcional)", motivation: "Com vas conèixer CRAYS Club i per què ara?", contribution: "Què vols aportar a la comunitat?", consent: "Accepto que CRAYS utilitzi la informació que facilito per avaluar la meva sol·licitud de membresia i contactar-me sobre aquesta. He llegit la política de privacitat i la informació sobre protecció de dades.", submit: "Envia la sol·licitud", previewTitle: "Vista prèvia preparada, no enviada", previewBody: "La interfície ha validat aquesta vista local. No s'ha desat ni enviat informació perquè no hi ha controlador ni endpoint autoritzats.", previewDirect: "Sol·licitud directa: sense metadades d'Ambassador.", previewReferral: "Sol·licitud referida: el slug aprovat d'Isabel i el context resten només a la vista prèvia.", missing: "Completa aquest camp.", invalidEmail: "Introdueix un correu vàlid.", invalidUrl: "Introdueix una URL http o https completa.", consentRequired: "Cal consentiment per preparar la vista.",
  faqEyebrow: "Preguntes abans de sol·licitar", faqTitle: "Els límits clars creen millors presentacions.", faqs: [
    { q: "Una referència garanteix la membresia?", a: "No. Un Ambassador pot presentar i prequalificar. La decisió final sempre és de l'equip CRAYS." }, { q: "La sol·licitud directa és diferent?", a: "Els camps són idèntics. Un vanity link aprovat afegeix metadades separades per a auditoria." }, { q: "La sol·licitud reserva una estada?", a: "No. Sol·licitud, admissió, reserva i pagament són estats i accions separats." }, { q: "Es paga en sol·licitar?", a: "No. Aquesta pàgina no recapta pagaments ni crea càrrecs." }, { q: "Què passa ara amb les dades?", a: "El source actual crea només una vista local. L'enviament resta tancat fins a autoritzar controller, privacitat, retenció i endpoint." },
  ],
  closeEyebrow: "Quan vulguis", closeBody: "Coneix amics, col·legues i socis de negoci al nou món CRAYS Club.", directLink: "Sol·licitud directa", mediaUnavailable: "Retrat retingut fins a verificar-ne els drets",
};

const fr: AmbassadorJourneyCopy = {
  ...en,
  metaTitle: "Devenir membre | CRAYS Club", metaDescription: "Candidature directe ou recommandée par un Ambassador pour CRAYS Club.", directEyebrow: "Adhésion CRAYS Club", referralEyebrow: "Recommandation Ambassador", directTitle: "Votre maison globale commence par une conversation.", referralTitle: "Une introduction ouvre la porte. L'équipe CRAYS décide.", directIntro: "Dites-nous qui vous êtes, ce que vous construisez et comment vous souhaitez participer. Il s'agit d'une candidature à examiner, pas d'une réservation, admission ou paiement.", referralIntro: "Votre Ambassador consigne l'introduction et peut préqualifier l'adéquation. La recommandation ne garantit pas l'adhésion; la décision finale appartient à l'équipe CRAYS.", primaryCta: "Commencer la candidature", learnCta: "Voir le processus", referralLabel: "Recommandé par", confirmedLabel: "Ambassador confirmée",
  isabelRole: "Première Ambassador confirmée et responsable du projet Forest City", isabelDetail: "Isabel Maria Jeworski est la première Ambassador confirmée de CRAYS Club. Les confirmations sont coordonnées avec Isabel et restent visibles pour l'audit de l'owner.", identityGate: "Le portrait reste masqué jusqu'à validation des droits d'image.", functionEyebrow: "Une candidature, des étapes distinctes", functionTitle: "Une adhésion pour celles et ceux qui contribuent.", functionIntro: "La candidature donne du contexte sans transformer l'intérêt en promesse. Chaque format reste soumis à examen et confirmation opérationnelle.",
  functions: [
    { title: "Introductions communautaires", body: "Décrivez les personnes, projets et conversations que vous espérez rencontrer. Les introductions sont organisées après admission et ne sont pas promises ici." },
    { title: "Travail et construction", body: "Présentez le travail, l'entreprise ou la pratique indépendante que vous développez et l'environnement concentré qui vous aiderait." },
    { title: "School & Jobs", body: "Expliquez ce que vous voulez apprendre, transmettre ou rendre visible via CRAYS Club. Aucune école distincte ni résultat d'emploi n'est sous-entendu." },
    { title: "Fitness et bien-être", body: "Dites comment mouvement et récupération s'intègrent à votre rythme. Installations et horaires exigent une confirmation distincte." },
    { title: "Familles et équipes", body: "Candidatez comme individu, famille ou équipe en gardant explicites participants et décisions ultérieures." },
    { title: "Culture et événements", body: "Montrez comment vous pourriez renforcer une culture attentive. La faisabilité des événements est examinée séparément." },
  ],
  storyEyebrow: "Pourquoi CRAYS Club", storyTitle: "Rejoignez notre communauté de builders & makers.", storyBody: "Retrouvez amis, collègues et partenaires professionnels en un lieu. CRAYS Clubs sont des espaces phygital work-live-play pour créateurs, fondateurs et nomades.", storyBodyTwo: "Apprenez ici. Soyez remarqué partout. L'adhésion repose sur la contribution, le respect mutuel et la qualité de la communauté, pas sur un checkout.", processEyebrow: "Architecture de décision", processTitle: "Rien n'est regroupé implicitement.", processIntro: "La candidature franchit des étapes explicites. Une recommandation apporte du contexte, mais ne décide pas l'admission et ne déclenche ni réservation ni paiement.",
  states: [
    { title: "1. Candidature", body: "Vous fournissez toutes les informations d'adhésion pour examen." }, { title: "2. Recommandation", body: "Le lien approuvé ajoute identité du sponsor et contexte comme métadonnées distinctes." },
    { title: "3. Préqualification", body: "L'Ambassador peut évaluer adéquation et complétude sans approuver." }, { title: "4. Examen de l'équipe", body: "L'équipe CRAYS examine la candidature et tout dossier de recommandation." },
    { title: "5. Décision", body: "Seule l'équipe CRAYS consigne la décision finale." }, { title: "6. Invitation / admission", body: "Elle suit uniquement une décision positive et reste un état distinct." },
    { title: "7. Réservation", body: "Séjour, événement ou installation suivent leur propre parcours ultérieur." }, { title: "8. Paiement", body: "Aucun paiement ici. Il exige sa propre base confirmée." },
  ],
  authorityNote: "Les Ambassadors présentent et peuvent préqualifier. Ils n'approuvent, n'admettent, ne réservent, ne facturent et ne promettent aucun résultat.",
  formEyebrow: "Candidature d'adhésion", directFormTitle: "Dites à l'équipe CRAYS comment vous souhaitez participer.", referralFormTitle: "Poursuivez l'introduction d'Isabel avec votre candidature complète.", formIntro: "Les candidats directs et recommandés remplissent les mêmes champs. Les métadonnées ne s'ajoutent qu'avec un lien approuvé.", applicantType: "Vous candidatez comme", types: { individual: "Individu", family: "Famille", team: "Équipe" }, fullName: "Nom complet", email: "Adresse e-mail", basedIn: "Où vivez-vous actuellement?", interest: "Intérêt principal", interests: toInterests(["Communauté", "School & Jobs", "Fitness et bien-être", "Familles", "Formats entreprise", "Culture et événements"]), arrival: "Période préférée d'arrivée ou participation", arrivalHint: "Une préférence seulement; aucune disponibilité confirmée.", length: "Durée souhaitée", lengthHint: "Décrivez le rythme envisagé. Aucun séjour n'est réservé.", linkedin: "Profil LinkedIn (facultatif)", social: "Autre profil social (facultatif)", website: "Site ou portfolio (facultatif)", motivation: "Comment avez-vous connu CRAYS Club et pourquoi maintenant?", contribution: "Que souhaitez-vous apporter à la communauté?", consent: "J’accepte que CRAYS utilise les informations fournies pour examiner ma candidature et me contacter à ce sujet. J’ai lu la politique de confidentialité et les informations sur la protection des données.", submit: "Envoyer ma candidature", previewTitle: "Aperçu préparé, non envoyé", previewBody: "L'interface a validé cet aperçu local. Aucune donnée n'a été stockée ou envoyée, faute de contrôleur et endpoint autorisés.", previewDirect: "Candidature directe: aucune métadonnée Ambassador.", previewReferral: "Candidature recommandée: le slug approuvé d'Isabel reste dans l'aperçu non persisté.", missing: "Complétez ce champ.", invalidEmail: "Saisissez une adresse e-mail valide.", invalidUrl: "Saisissez une URL http ou https complète.", consentRequired: "Le consentement est requis pour l'aperçu.",
  faqEyebrow: "Questions avant de candidater", faqTitle: "Des limites claires créent de meilleures introductions.", faqs: [
    { q: "Une recommandation garantit-elle l'adhésion?", a: "Non. Un Ambassador peut présenter et préqualifier. L'équipe CRAYS prend toujours la décision finale." }, { q: "La candidature directe est-elle différente?", a: "Les champs sont identiques. Un vanity link approuvé ajoute des métadonnées distinctes pour l'audit." }, { q: "La candidature réserve-t-elle un séjour?", a: "Non. Candidature, admission, réservation et paiement sont des états et actions distincts." }, { q: "Paie-t-on en candidatant?", a: "Non. Cette page ne collecte aucun paiement et ne crée aucun débit." }, { q: "Que deviennent les informations?", a: "Le source actuel crée seulement un aperçu local. L'envoi reste fermé jusqu'à autorisation du contrôleur, de la base de confidentialité, de la conservation et de l'endpoint." },
  ],
  closeEyebrow: "Quand vous êtes prêt", closeBody: "Rencontrez amis, collègues et partenaires professionnels dans le nouvel univers CRAYS Club.", directLink: "Candidature directe", mediaUnavailable: "Portrait masqué jusqu'à vérification des droits",
};

const pt: AmbassadorJourneyCopy = {
  ...en,
  metaTitle: "Torne-se membro | CRAYS Club", metaDescription: "Candidatura direta ou indicada por Ambassador ao CRAYS Club.", directEyebrow: "Membresia CRAYS Club", referralEyebrow: "Indicação de Ambassador", directTitle: "A sua casa global começa com uma conversa.", referralTitle: "Uma apresentação abre a porta. A equipa CRAYS decide.", directIntro: "Conte-nos quem é, o que está a construir e como quer participar. Esta é uma candidatura para análise, não reserva, admissão ou pagamento.", referralIntro: "A Ambassador regista a apresentação e pode pré-qualificar a adequação. A indicação não garante membresia; a decisão final pertence à equipa CRAYS.", primaryCta: "Iniciar candidatura", learnCta: "Ver o processo", referralLabel: "Indicado por", confirmedLabel: "Ambassador confirmada",
  isabelRole: "Primeira Ambassador confirmada e líder do projeto Forest City", isabelDetail: "Isabel Maria Jeworski é a primeira Ambassador confirmada do CRAYS Club. As confirmações são coordenadas com Isabel e ficam visíveis para auditoria do owner.", identityGate: "O retrato fica retido até aprovação dos direitos de imagem.", functionEyebrow: "Uma candidatura, estados separados", functionTitle: "Uma membresia para quem contribui.", functionIntro: "A candidatura oferece contexto sem transformar interesse em promessa. Cada formato depende de análise e confirmação operacional posterior.",
  functions: [
    { title: "Apresentações de comunidade", body: "Descreva pessoas, projetos e conversas que espera encontrar. As apresentações são curadas depois da admissão e não prometidas aqui." },
    { title: "Trabalho e construção", body: "Partilhe o trabalho, empresa ou prática independente que desenvolve e o ambiente de foco que o ajudaria." },
    { title: "School & Jobs", body: "Explique o que quer aprender, ensinar ou tornar visível através do CRAYS Club. Não se implica uma escola separada nem resultado de emprego." },
    { title: "Fitness e bem-estar", body: "Conte como movimento e recuperação entram no seu ritmo. Instalações e horários exigem confirmação separada." },
    { title: "Famílias e equipas", body: "Candidate-se como pessoa, família ou equipa mantendo participantes e decisões posteriores explícitos." },
    { title: "Cultura e eventos", body: "Mostre como poderia reforçar uma cultura de clube atenta. A viabilidade de eventos é analisada separadamente." },
  ],
  storyEyebrow: "Porquê CRAYS Club", storyTitle: "Junte-se à nossa comunidade de builders & makers.", storyBody: "Ligue-se a amigos, colegas e parceiros de negócio num só lugar. CRAYS Clubs são espaços phygital work-live-play para criadores, fundadores e nómadas.", storyBodyTwo: "Aprenda aqui. Seja descoberto em qualquer lugar. A membresia nasce da contribuição, respeito mútuo e qualidade da comunidade, não de um checkout.", processEyebrow: "Arquitetura de decisão", processTitle: "Nada é agrupado em silêncio.", processIntro: "A candidatura atravessa etapas explícitas. Uma indicação traz contexto, mas não decide admissão nem ativa reserva ou pagamento.",
  states: [
    { title: "1. Candidatura", body: "Fornece toda a informação de membresia para análise." }, { title: "2. Referral", body: "O link aprovado acrescenta identidade do sponsor e contexto como metadados separados." },
    { title: "3. Pré-qualificação", body: "A Ambassador pode avaliar adequação e completude sem aprovar." }, { title: "4. Análise da equipa", body: "A equipa CRAYS analisa a candidatura e qualquer registo de referral." },
    { title: "5. Decisão", body: "Só a equipa CRAYS regista a decisão final." }, { title: "6. Convite / admissão", body: "Só segue uma decisão positiva e permanece um estado próprio." },
    { title: "7. Reserva", body: "Estadia, evento ou instalação seguem o seu próprio percurso posterior." }, { title: "8. Pagamento", body: "Não há pagamento aqui. Exige uma base confirmada própria." },
  ],
  authorityNote: "Ambassadors apresentam e podem pré-qualificar. Não aprovam, admitem, reservam, cobram ou prometem resultados.",
  formEyebrow: "Candidatura de membresia", directFormTitle: "Conte à equipa CRAYS como quer participar.", referralFormTitle: "Continue a apresentação de Isabel com a candidatura completa.", formIntro: "Candidatos diretos e indicados preenchem os mesmos campos. Metadados só entram com um link aprovado.", applicantType: "Candidatura como", types: { individual: "Pessoa", family: "Família", team: "Equipa" }, fullName: "Nome completo", email: "E-mail", basedIn: "Onde vive atualmente?", interest: "Interesse principal", interests: toInterests(["Comunidade", "School & Jobs", "Fitness e bem-estar", "Famílias", "Formatos empresariais", "Cultura e eventos"]), arrival: "Janela preferida de chegada ou participação", arrivalHint: "Apenas preferência; não confirma disponibilidade.", length: "Duração preferida", lengthHint: "Descreva o ritmo pretendido. Nenhuma estadia é reservada.", linkedin: "Perfil LinkedIn (opcional)", social: "Outro perfil social (opcional)", website: "Site ou portefólio (opcional)", motivation: "Como conheceu o CRAYS Club e porquê agora?", contribution: "O que gostaria de contribuir para a comunidade?", consent: "Concordo que a CRAYS utilize as informações que forneço para avaliar a minha candidatura e me contactar a esse respeito. Li a política de privacidade e as informações sobre proteção de dados.", submit: "Enviar candidatura", previewTitle: "Pré-visualização preparada, não enviada", previewBody: "A interface validou esta vista local. Nenhum dado foi guardado ou enviado porque não existem controlador e endpoint autorizados.", previewDirect: "Candidatura direta: sem metadados de Ambassador.", previewReferral: "Candidatura indicada: o slug aprovado de Isabel fica apenas na vista não persistida.", missing: "Preencha este campo.", invalidEmail: "Introduza um e-mail válido.", invalidUrl: "Introduza um URL http ou https completo.", consentRequired: "O consentimento é necessário para a vista.",
  faqEyebrow: "Perguntas antes da candidatura", faqTitle: "Limites claros criam melhores apresentações.", faqs: [
    { q: "Uma indicação garante membresia?", a: "Não. Uma Ambassador pode apresentar e pré-qualificar. A decisão final é sempre da equipa CRAYS." }, { q: "A candidatura direta é diferente?", a: "Os campos são idênticos. Um vanity link aprovado acrescenta metadados separados para auditoria." }, { q: "A candidatura reserva uma estadia?", a: "Não. Candidatura, admissão, reserva e pagamento são estados e ações separados." }, { q: "Paga-se ao candidatar?", a: "Não. Esta página não recolhe pagamentos nem cria cobranças." }, { q: "O que acontece agora aos dados?", a: "O source atual cria apenas uma vista local. O envio fica fechado até autorizar controlador, privacidade, retenção e endpoint." },
  ],
  closeEyebrow: "Quando estiver pronto", closeBody: "Encontre amigos, colegas e parceiros de negócio no novo mundo CRAYS Club.", directLink: "Candidatura direta", mediaUnavailable: "Retrato retido até verificação dos direitos",
};

const it: AmbassadorJourneyCopy = {
  ...en,
  metaTitle: "Diventa membro | CRAYS Club", metaDescription: "Candidatura diretta o presentata da un Ambassador per CRAYS Club.", directEyebrow: "Membership CRAYS Club", referralEyebrow: "Referral Ambassador", directTitle: "La tua casa globale inizia con una conversazione.", referralTitle: "Una presentazione apre la porta. Il team CRAYS decide.", directIntro: "Raccontaci chi sei, cosa stai costruendo e come vuoi partecipare. Questa è una candidatura da valutare, non una prenotazione, ammissione o pagamento.", referralIntro: "L'Ambassador registra la presentazione e può prequalificare l'idoneità. Il referral non garantisce la membership; la decisione finale spetta al team CRAYS.", primaryCta: "Inizia la candidatura", learnCta: "Vedi il processo", referralLabel: "Presentato da", confirmedLabel: "Ambassador confermata",
  isabelRole: "Prima Ambassador confermata e project lead Forest City", isabelDetail: "Isabel Maria Jeworski è la prima Ambassador confermata di CRAYS Club. Le conferme vengono coordinate con Isabel e restano visibili per l'audit dell'owner.", identityGate: "Il ritratto resta escluso finché i diritti d'immagine non sono approvati.", functionEyebrow: "Una candidatura, stati separati", functionTitle: "Una membership per chi contribuisce.", functionIntro: "La candidatura offre contesto senza trasformare l'interesse in promessa. Ogni formato resta soggetto a valutazione e conferma operativa successiva.",
  functions: [
    { title: "Presentazioni di community", body: "Descrivi persone, progetti e conversazioni che speri di incontrare. Le presentazioni vengono curate dopo l'ammissione e non sono promesse qui." },
    { title: "Lavoro e costruzione", body: "Condividi il lavoro, l'azienda o la pratica indipendente che sviluppi e l'ambiente concentrato che ti aiuterebbe." },
    { title: "School & Jobs", body: "Spiega cosa vuoi imparare, insegnare o rendere visibile tramite CRAYS Club. Non si implica una scuola separata né un esito lavorativo." },
    { title: "Fitness e benessere", body: "Racconta come movimento e recupero entrano nel tuo ritmo. Strutture e orari richiedono conferma separata." },
    { title: "Famiglie e team", body: "Candidati come persona, famiglia o team mantenendo espliciti partecipanti e decisioni successive." },
    { title: "Cultura ed eventi", body: "Mostra come potresti rafforzare una cultura attenta. La fattibilità degli eventi viene valutata separatamente." },
  ],
  storyEyebrow: "Perché CRAYS Club", storyTitle: "Unisciti alla nostra community di builders & makers.", storyBody: "Connettiti con amici, colleghi e partner commerciali in un unico luogo. CRAYS Clubs sono spazi phygital work-live-play per creator, founder e nomadi.", storyBodyTwo: "Impara qui. Fatti scoprire ovunque. La membership nasce da contributo, rispetto reciproco e qualità della community, non da un checkout.", processEyebrow: "Architettura decisionale", processTitle: "Nulla viene unito implicitamente.", processIntro: "La candidatura attraversa passaggi espliciti. Un referral aggiunge contesto, ma non decide l'ammissione e non attiva prenotazione o pagamento.",
  states: [
    { title: "1. Candidatura", body: "Fornisci tutte le informazioni di membership per la valutazione." }, { title: "2. Referral", body: "Il link approvato aggiunge identità dello sponsor e contesto come metadati separati." },
    { title: "3. Prequalifica", body: "L'Ambassador può valutare idoneità e completezza senza approvare." }, { title: "4. Valutazione del team", body: "Il team CRAYS valuta candidatura ed eventuale record referral." },
    { title: "5. Decisione", body: "Solo il team CRAYS registra la decisione finale." }, { title: "6. Invito / ammissione", body: "Segue solo una decisione positiva e resta uno stato distinto." },
    { title: "7. Prenotazione", body: "Soggiorno, evento o struttura seguono un percorso successivo proprio." }, { title: "8. Pagamento", body: "Qui non si paga. Il pagamento richiede una base confermata propria." },
  ],
  authorityNote: "Gli Ambassadors presentano e possono prequalificare. Non approvano, ammettono, prenotano, addebitano o promettono risultati.",
  formEyebrow: "Candidatura membership", directFormTitle: "Racconta al team CRAYS come vuoi partecipare.", referralFormTitle: "Continua la presentazione di Isabel con la candidatura completa.", formIntro: "Candidati diretti e presentati compilano gli stessi campi. I metadati si aggiungono solo con un link approvato.", applicantType: "Candidatura come", types: { individual: "Persona", family: "Famiglia", team: "Team" }, fullName: "Nome completo", email: "Indirizzo email", basedIn: "Dove vivi attualmente?", interest: "Interesse principale", interests: toInterests(["Community", "School & Jobs", "Fitness e benessere", "Famiglie", "Formati aziendali", "Cultura ed eventi"]), arrival: "Finestra preferita di arrivo o partecipazione", arrivalHint: "Solo una preferenza; non conferma disponibilità.", length: "Durata preferita", lengthHint: "Descrivi il ritmo previsto. Nessun soggiorno viene riservato.", linkedin: "Profilo LinkedIn (facoltativo)", social: "Altro profilo social (facoltativo)", website: "Sito o portfolio (facoltativo)", motivation: "Come hai conosciuto CRAYS Club e perché proprio ora?", contribution: "Cosa vorresti portare alla community?", consent: "Acconsento all’utilizzo delle informazioni fornite da parte di CRAYS per valutare la mia candidatura e contattarmi al riguardo. Ho letto l’informativa sulla privacy e le informazioni sulla protezione dei dati.", submit: "Invia candidatura", previewTitle: "Anteprima preparata, non inviata", previewBody: "L'interfaccia ha validato questa anteprima locale. Nessun dato è stato salvato o inviato perché controller ed endpoint non sono autorizzati.", previewDirect: "Candidatura diretta: nessun metadato Ambassador.", previewReferral: "Candidatura referral: slug approvato di Isabel e contesto restano nell'anteprima non persistita.", missing: "Completa questo campo.", invalidEmail: "Inserisci un indirizzo email valido.", invalidUrl: "Inserisci un URL http o https completo.", consentRequired: "Il consenso è necessario per l'anteprima.",
  faqEyebrow: "Domande prima di candidarsi", faqTitle: "Confini chiari creano presentazioni migliori.", faqs: [
    { q: "Un referral garantisce la membership?", a: "No. Un Ambassador può presentare e prequalificare. La decisione finale spetta sempre al team CRAYS." }, { q: "La candidatura diretta è diversa?", a: "I campi sono identici. Un vanity link approvato aggiunge metadati separati per l'audit." }, { q: "La candidatura prenota un soggiorno?", a: "No. Candidatura, ammissione, prenotazione e pagamento sono stati e azioni separati." }, { q: "Si paga candidandosi?", a: "No. Questa pagina non raccoglie pagamenti e non crea addebiti." }, { q: "Cosa accade ora ai dati?", a: "Il source attuale crea solo un'anteprima locale. L'invio resta chiuso finché controller, privacy, conservazione ed endpoint non sono autorizzati." },
  ],
  closeEyebrow: "Quando vuoi", closeBody: "Incontra amici, colleghi e partner commerciali nel nuovo mondo CRAYS Club.", directLink: "Candidatura diretta", mediaUnavailable: "Ritratto escluso fino alla verifica dei diritti",
};

export const ambassadorJourneyCopy: Record<ClubsLocale, AmbassadorJourneyCopy> = { en, de, es, ca, fr, pt, it };
