import * as familiesCopyModule from "../journeys-phase8/families-copy";

export const schoolJobsLocales = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;
export type SchoolJobsLocale = (typeof schoolJobsLocales)[number];

type Item = { title: string; text: string };
type GateItem = Item & { gate: string };

export type SchoolJobsPublicCopy = {
  metaTitle: string;
  metaDescription: string;
  mediaNotice: string;
  navLabel: string;
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    boundary: string;
    primary: string;
    secondary: string;
    caption: string;
    signalLabel: string;
    signalValue: string;
  };
  nav: Array<{ href: string; label: string }>;
  four: { kicker: string; title: string; lead: string; items: GateItem[]; caption: string };
  states: { kicker: string; title: string; lead: string; items: Item[] };
  skills: { kicker: string; title: string; lead: string; items: Item[]; boundary: string; caption: string };
  programme: { kicker: string; title: string; lead: string; requirements: Item[]; gate: string; caption: string };
  assessment: { kicker: string; title: string; text: string; items: Item[]; caption: string };
  employer: { kicker: string; title: string; lead: string; items: Item[]; caption: string };
  roles: {
    kicker: string;
    title: string;
    lead: string;
    columns: string[];
    emptyTitle: string;
    emptyText: string;
    gate: string;
  };
  interest: { kicker: string; title: string; lead: string; disabled: string; contact: string; membership: string };
  faq: { kicker: string; title: string; lead: string; permalink: string; items: Array<{ question: string; answer: string }> };
  closing: { kicker: string; title: string; text: string; primary: string; secondary: string };
  alts: Record<"heroWorkshop" | "learningRoom" | "skillsPractice" | "programmeWorkshop" | "assessmentStudio" | "employerExchange", string>;
};

const fixedTitle = "Learn here. Get discovered anywhere." as const;

const en: SchoolJobsPublicCopy = {
  metaTitle: "School & Jobs | CRAYS Clubs",
  metaDescription: "The evidence-gated CRAYS Club & Jobs journey: learning discovery, programme application, assessment, skills evidence and employer introduction.",
  mediaNotice: "Licensed editorial reference, not documentation of a CRAYS programme, learner or employer.",
  navLabel: "School and Jobs page sections",
  hero: {
    eyebrow: "CRAYS Clubs / School & Jobs",
    title: fixedTitle,
    lead: "Learning becomes useful when people can understand what you practised, how your work was observed and what evidence you choose to share. This page defines that complete CRAYS journey without pretending that a programme, job, employer or hiring outcome is currently available.",
    boundary: "Public status: function designed; programmes, assessments, employers and roles not yet evidenced.",
    primary: "Follow the four-step function",
    secondary: "See every decision state",
    caption: "Creative visual of collaborative lifestyle learning; not actual CRAYS programme participants or outcome.",
    signalLabel: "Current opportunity state",
    signalValue: "No verified roles published"
  },
  nav: [
    { href: "#four-step", label: "Four-step function" },
    { href: "#evidence", label: "Skills evidence" },
    { href: "#programmes", label: "Programmes" },
    { href: "#employers", label: "Employer function" },
    { href: "#questions", label: "Questions" }
  ],
  four: {
    kicker: "The complete function",
    title: "Four steps, with no hidden jump from learning to a job.",
    lead: "The Homepage names four core functions. Here each receives its full meaning and its own evidence boundary. None of the steps automatically creates the next one.",
    items: [
      { title: "Build verified skills", text: "Choose a capability, practise it through defined work and assemble evidence that explains the task, your contribution, the review method and the date.", gate: "Architecture defined; no CRAYS credential is issued." },
      { title: "Join CRAYS Club", text: "Discover a published programme, inspect its purpose and requirements, then submit a programme application if that specific programme is open.", gate: "No programme catalogue, intake or application window is approved." },
      { title: "Complete a live assessment", text: "Where a programme requires assessment, complete an observed task against a disclosed rubric with an identified reviewer and a correction route.", gate: "No live assessment, rubric, reviewer or assessment date is approved." },
      { title: "Meet hiring partners", text: "With your consent, suitable evidence could support employer discovery or a clearly attributed introduction. The employer would still control any role and hiring decision.", gate: "No hiring partner, employer introduction or vacancy is currently verified." }
    ],
    caption: "Creative visual of a modern collaborative learning room; not actual CRAYS programme participants or outcome."
  },
  states: {
    kicker: "State separation",
    title: "Progress is a chain of explicit decisions.",
    lead: "A learner should always know what has happened, who is responsible and what has not happened. These eight states cannot be collapsed into a single success message.",
    items: [
      { title: "Learning discovery", text: "Browse confirmed learning purposes and evidence expectations without becoming an applicant or learner." },
      { title: "Programme application", text: "Submit information only to an authorised, open programme. A submission is a request for assessment, not acceptance." },
      { title: "Programme assessment", text: "The responsible CRAYS team reviews the application against published entry criteria and records a separate outcome." },
      { title: "Learning participation", text: "Only an explicit acceptance can establish participation, scope, timing and applicable conditions for a real programme." },
      { title: "Skills evidence", text: "Evidence is created from actual work and review. Participation alone must never be presented as verified capability." },
      { title: "Employer discovery or introduction", text: "A learner controls whether eligible evidence may be discoverable or used in an attributed introduction." },
      { title: "Job application", text: "A person applies separately to a real, verified employer role under that employer's process and information." },
      { title: "Employer decision", text: "Screening, interview, offer, rejection and employment decisions remain with the employer and are never guaranteed by CRAYS." }
    ]
  },
  skills: {
    kicker: "Skills evidence",
    title: "Make the work legible, not louder.",
    lead: "A useful evidence record shows more than a badge. It lets a reviewer understand the capability, the work context, the standard used and what part belongs to the learner.",
    items: [
      { title: "Capability statement", text: "A narrow, readable description of what the evidence supports, without claiming adjacent expertise." },
      { title: "Work sample", text: "An artefact or outcome with provenance, ownership and permitted sharing clearly recorded." },
      { title: "Observed task", text: "Where observation is used, the task, conditions, tools and assistance are documented." },
      { title: "Assessment rubric", text: "Criteria and performance levels are visible before the assessment, not invented after the result." },
      { title: "Reviewer identity", text: "The accountable reviewer, remit and conflict boundary are attached to the assessment." },
      { title: "Contribution record", text: "Team work distinguishes the learner's contribution from the collective result." },
      { title: "Consent and audience", text: "The learner controls which evidence may be shared, with whom and for which purpose." },
      { title: "Version, expiry and correction", text: "Date, version, supersession and challenge paths keep evidence current and contestable." }
    ],
    boundary: "No evidence record, credential, score or learner profile is currently issued by this public page.",
    caption: "Creative visual of media and prototyping practice; not actual CRAYS programme participants or outcome."
  },
  programme: {
    kicker: "Programme discovery",
    title: "A programme must explain itself before asking someone to apply.",
    lead: "The programme surface is not a decorative catalogue. Every future CRAYS learning offer would need enough verified information for a person to judge relevance, effort, access and evidence consequences.",
    requirements: [
      { title: "Purpose and outcomes", text: "The intended capabilities, limits and evidence outputs must be stated in concrete language." },
      { title: "Entry criteria", text: "Required experience, tools, language and prerequisites must be published before application." },
      { title: "Format and workload", text: "Location, delivery mode, expected time, attendance and collaboration requirements need approval." },
      { title: "Assessment method", text: "Tasks, rubric, reviewer role, retake or correction process and evidence use must be explicit." },
      { title: "Support and accessibility", text: "Available support, access conditions and reasonable-adjustment process must be programme-specific." },
      { title: "Dates, capacity and cost", text: "A programme may only publish timing, seats, price or included services after responsible approval." }
    ],
    gate: "Programme discovery gate: no programme has a verified owner, curriculum, intake, dates, capacity, price or application contract.",
    caption: "Creative visual of an international project studio; not actual CRAYS programme participants or outcome."
  },
  assessment: {
    kicker: "Observed work",
    title: "Assessment is evidence work, not theatre.",
    text: "A live task can be useful when its purpose, conditions and reviewer responsibility are visible. It cannot be used as a vague performance ritual or as a shortcut to an employment promise.",
    items: [
      { title: "Before", text: "Publish the capability, task boundary, allowed tools, accessibility route, rubric and data use." },
      { title: "During", text: "Record conditions, assistance, interruptions and reviewer observations without covert surveillance." },
      { title: "After", text: "Separate feedback, assessment outcome, evidence publication and any employer-facing permission." },
      { title: "Challenge", text: "Provide correction, appeal and evidence-withdrawal paths appropriate to the authorised programme." }
    ],
    caption: "Creative visual of a supportive prototype review; not actual CRAYS programme participants or outcome."
  },
  employer: {
    kicker: "Employer function",
    title: "Discovery can open a conversation. It cannot decide the outcome.",
    lead: "The employer layer exists to make suitable, consented evidence understandable and to keep introductions accountable. It must never manufacture a partner logo, vacancy or hiring result.",
    items: [
      { title: "Employer verification", text: "Identity, responsible contact, role authority and publication permission are checked before any organisation appears." },
      { title: "Role verification", text: "Title, location, discipline, work arrangement, requirements and application destination must come from the employer." },
      { title: "Consent-based discovery", text: "A learner chooses whether eligible evidence is discoverable and can withdraw that permission." },
      { title: "Attributed introduction", text: "Any introduction records source, purpose, participants and status without being presented as an interview or offer." },
      { title: "Separate application", text: "The employer's real application process begins only after the person elects to apply to a verified role." },
      { title: "Independent decision", text: "The employer owns screening and hiring; CRAYS does not promise interviews, offers, salary or employment." }
    ],
    caption: "Creative visual of a professional portfolio exchange; not actual CRAYS programme participants or outcome."
  },
  roles: {
    kicker: "Verified opportunities",
    title: "No vacancy is better than a fictional vacancy.",
    lead: "This surface will only display roles whose employer identity, role authority, source, publication window and application destination are evidenced.",
    columns: ["Role", "Location", "Discipline", "Evidence state"],
    emptyTitle: "No verified openings are published.",
    emptyText: "No employer, title, location, salary, application date or availability is inferred. A future role must pass the publication gate before it can appear here.",
    gate: "Role publication gate: employer verification, role source, consent, owner, validity window and application route required."
  },
  interest: {
    kicker: "Next action",
    title: "Explore the function without creating a false application.",
    lead: "There is no authorised School programme or job-interest endpoint on this page. General questions may use Contact, while membership remains a separate Clubs journey and does not create enrolment or employment status.",
    disabled: "Programme application unavailable",
    contact: "Ask a general question",
    membership: "Explore membership separately"
  },
  faq: {
    kicker: "Questions",
    title: "Know exactly what each signal means.",
    lead: "The answers below keep learning, evidence, introduction and employment decisions separate.",
    permalink: "Link to this answer",
    items: [
      { question: "Is CRAYS Club currently accepting applications?", answer: "No authorised programme, intake or application window is evidenced on this page. A future programme must publish its owner, purpose, criteria, format, dates, capacity, conditions and submission contract before applications open." },
      { question: "Does completing a programme create a verified skill?", answer: "No. Participation and skills evidence are different states. A capability can only be represented through defined work, an approved assessment method, accountable review and a precise evidence record." },
      { question: "What does a live assessment mean?", answer: "It means an observed task under disclosed conditions and against a published rubric. No CRAYS live assessment is currently scheduled or available." },
      { question: "Who can see skills evidence?", answer: "Any future evidence-sharing model must be consent-based and purpose-limited. The learner should know the audience, duration and withdrawal path before evidence becomes discoverable." },
      { question: "Does employer discovery mean I have applied for a job?", answer: "No. Discovery or an introduction is not a job application. A person must separately choose to apply to a real, verified employer role." },
      { question: "Does CRAYS decide who gets hired?", answer: "No. The employer controls screening, interviews, offers, rejection and employment. CRAYS cannot guarantee a meeting, interview, salary, role or hiring outcome." },
      { question: "Are there verified jobs on this page now?", answer: "No. The role surface is intentionally empty until employer identity, role authority, publication validity and an authorised application destination are evidenced." },
      { question: "Is School & Jobs the same as Clubs membership?", answer: "No. Membership, programme application, learning participation, evidence sharing, employer introduction and job application are separate journeys with separate decisions." }
    ]
  },
  closing: {
    kicker: "Evidence before opportunity",
    title: "Build the pathway before publishing the promise.",
    text: "CRAYS Club & Jobs will become useful through clear programmes, observable work, learner-controlled evidence and verified employer roles. Until those inputs are approved, this page remains an honest map rather than a false marketplace.",
    primary: "Contact CRAYS Clubs",
    secondary: "Return to the Homepage"
  },
  alts: {
    heroWorkshop: "Young international adults collaborating in a modern Forest City learning lounge",
    learningRoom: "Young adults learning and collaborating in a bright modern studio",
    skillsPractice: "Creative learners practising media and prototyping skills together",
    programmeWorkshop: "International project team reviewing a sustainable-city model",
    assessmentStudio: "Young designer discussing a prototype with a supportive review group",
    employerExchange: "Creative professionals exchanging portfolio feedback in a waterfront lounge"
  }
};

const de: SchoolJobsPublicCopy = {
  ...en,
  metaTitle: "School & Jobs | CRAYS Clubs",
  metaDescription: "Die evidenzgebundene CRAYS-School-&-Jobs-Journey von Lernentdeckung über Bewerbung und Skills-Evidenz bis zur Arbeitgebervorstellung.",
  mediaNotice: "Lizenzierte redaktionelle Referenz, keine Dokumentation eines CRAYS-Programms, Lernenden oder Arbeitgebers.",
  navLabel: "Abschnitte der School-&-Jobs-Seite",
  hero: {
    eyebrow: "CRAYS Clubs / School & Jobs",
    title: fixedTitle,
    lead: "Lernen wird nützlich, wenn andere verstehen können, was geübt wurde, wie Arbeit beobachtet wurde und welche Evidenz eine Person teilen möchte. Diese Seite definiert die vollständige CRAYS-Journey, ohne ein verfügbares Programm, einen Job, Arbeitgeber oder Einstellungserfolg vorzutäuschen.",
    boundary: "Öffentlicher Status: Funktion entworfen; Programme, Assessments, Arbeitgeber und Rollen nicht belegt.",
    primary: "Vier-Schritt-Funktion verfolgen",
    secondary: "Alle Entscheidungsstufen sehen",
    caption: "Kreative Visualisierung kollaborativen Lifestyle-Lernens; keine tatsächlichen CRAYS-Programmteilnehmenden und kein Ergebnis.",
    signalLabel: "Aktueller Opportunity-Stand",
    signalValue: "Keine verifizierte Rolle veröffentlicht"
  },
  nav: [{ href: "#four-step", label: "Vier-Schritt-Funktion" }, { href: "#evidence", label: "Skills-Evidenz" }, { href: "#programmes", label: "Programme" }, { href: "#employers", label: "Arbeitgeberfunktion" }, { href: "#questions", label: "Fragen" }],
  four: {
    kicker: "Die vollständige Funktion",
    title: "Vier Schritte, ohne versteckten Sprung vom Lernen zum Job.",
    lead: "Die Homepage benennt vier Kernfunktionen. Hier erhält jede ihre vollständige Bedeutung und eigene Evidenzgrenze. Kein Schritt erzeugt automatisch den nächsten.",
    items: [
      { title: "Verifizierte Skills aufbauen", text: "Eine Fähigkeit wählen, sie durch definierte Arbeit üben und Evidenz mit Aufgabe, eigenem Beitrag, Prüfverfahren und Datum zusammenstellen.", gate: "Architektur definiert; kein CRAYS-Credential wird ausgestellt." },
      { title: "CRAYS Club beitreten", text: "Ein veröffentlichtes Programm entdecken, Zweck und Anforderungen prüfen und nur bei geöffnetem Programm eine Bewerbung senden.", gate: "Kein Programmkatalog, Intake oder Bewerbungsfenster freigegeben." },
      { title: "Live-Assessment abschließen", text: "Wenn erforderlich, eine beobachtete Aufgabe anhand offengelegter Kriterien mit identifiziertem Reviewer und Korrekturweg bearbeiten.", gate: "Kein Live-Assessment, Rubric, Reviewer oder Termin freigegeben." },
      { title: "Arbeitgeber kennenlernen", text: "Mit Einwilligung könnte passende Evidenz Arbeitgeber-Discovery oder eine klar attribuierte Vorstellung unterstützen. Jede Rolle und Entscheidung bliebe beim Arbeitgeber.", gate: "Kein Hiring Partner, Arbeitgeber-Intro oder Vacancy verifiziert." }
    ],
    caption: "Kreative Visualisierung eines modernen kollaborativen Lernraums; keine tatsächlichen CRAYS-Programmteilnehmenden und kein Ergebnis."
  },
  states: {
    kicker: "Getrennte Zustände",
    title: "Fortschritt ist eine Kette ausdrücklicher Entscheidungen.",
    lead: "Lernende müssen erkennen können, was geschehen ist, wer verantwortlich ist und was nicht geschehen ist. Diese acht Zustände dürfen nicht zu einer Erfolgsmeldung verschmelzen.",
    items: [
      { title: "Lernentdeckung", text: "Bestätigte Lernzwecke und Evidenzerwartungen ansehen, ohne Bewerber- oder Lernstatus zu erzeugen." },
      { title: "Programmbewerbung", text: "Daten nur an ein autorisiertes offenes Programm senden. Absenden ist Prüfbitte, keine Annahme." },
      { title: "Programmprüfung", text: "Das verantwortliche CRAYS-Team prüft anhand veröffentlichter Eingangskriterien und protokolliert ein separates Ergebnis." },
      { title: "Lernteilnahme", text: "Nur eine ausdrückliche Annahme kann Teilnahme, Umfang, Zeit und Bedingungen eines realen Programms begründen." },
      { title: "Skills-Evidenz", text: "Evidenz entsteht aus realer Arbeit und Review. Teilnahme allein darf nie als verifizierte Fähigkeit gelten." },
      { title: "Arbeitgeber-Discovery oder Intro", text: "Lernende bestimmen, ob geeignete Evidenz auffindbar oder für eine attribuierte Vorstellung genutzt werden darf." },
      { title: "Jobbewerbung", text: "Eine Person bewirbt sich separat auf eine reale, verifizierte Arbeitgeberrolle unter dessen Prozess." },
      { title: "Arbeitgeberentscheidung", text: "Screening, Interview, Angebot, Absage und Beschäftigung bleiben beim Arbeitgeber und werden nie von CRAYS garantiert." }
    ]
  },
  skills: {
    kicker: "Skills-Evidenz",
    title: "Arbeit verständlich machen, nicht lauter.",
    lead: "Ein sinnvoller Evidenzdatensatz zeigt mehr als ein Badge. Er erklärt Fähigkeit, Arbeitskontext, Bewertungsstandard und den eigenen Anteil.",
    items: [
      { title: "Fähigkeitsaussage", text: "Enge, lesbare Beschreibung dessen, was belegt ist, ohne benachbarte Expertise zu behaupten." },
      { title: "Arbeitsprobe", text: "Artefakt oder Ergebnis mit Herkunft, Eigentum und zulässiger Weitergabe." },
      { title: "Beobachtete Aufgabe", text: "Aufgabe, Bedingungen, Werkzeuge und Unterstützung werden dokumentiert." },
      { title: "Assessment-Rubric", text: "Kriterien und Leistungsstufen stehen vor der Prüfung fest, nicht erst nach dem Ergebnis." },
      { title: "Reviewer-Identität", text: "Verantwortlicher Reviewer, Auftrag und Konfliktgrenze werden angebunden." },
      { title: "Beitragsnachweis", text: "Teamarbeit trennt den eigenen Beitrag vom gemeinsamen Ergebnis." },
      { title: "Einwilligung und Publikum", text: "Lernende steuern, was mit wem zu welchem Zweck geteilt werden darf." },
      { title: "Version, Ablauf und Korrektur", text: "Datum, Version, Ersetzung und Widerspruch halten Evidenz aktuell und anfechtbar." }
    ],
    boundary: "Diese öffentliche Seite stellt keinen Evidenzdatensatz, kein Credential, keinen Score und kein Lernprofil aus.",
    caption: "Kreative Visualisierung von Medien- und Prototyping-Praxis; keine tatsächlichen CRAYS-Programmteilnehmenden und kein Ergebnis."
  },
  programme: {
    kicker: "Programmentdeckung",
    title: "Ein Programm muss sich erklären, bevor es um eine Bewerbung bittet.",
    lead: "Die Programmfläche ist kein dekorativer Katalog. Jedes künftige CRAYS-Angebot braucht genug verifizierte Information, damit Relevanz, Aufwand, Zugang und Evidenzfolgen beurteilt werden können.",
    requirements: [
      { title: "Zweck und Ergebnisse", text: "Beabsichtigte Fähigkeiten, Grenzen und Evidenzausgaben müssen konkret beschrieben sein." },
      { title: "Eingangskriterien", text: "Erfahrung, Werkzeuge, Sprache und Voraussetzungen müssen vor Bewerbung veröffentlicht sein." },
      { title: "Format und Aufwand", text: "Ort, Delivery-Modus, Zeitbedarf, Anwesenheit und Zusammenarbeit benötigen Freigabe." },
      { title: "Assessment-Methode", text: "Aufgabe, Kriterien, Reviewer, Wiederholung, Korrektur und Evidenznutzung müssen klar sein." },
      { title: "Support und Barrierefreiheit", text: "Unterstützung, Zugangsbedingungen und Anpassungsweg müssen programmspezifisch sein." },
      { title: "Termine, Kapazität und Kosten", text: "Timing, Plätze, Preis und Leistungen dürfen erst nach verantwortlicher Freigabe erscheinen." }
    ],
    gate: "Programmgate: Kein Programm hat verifizierten Owner, Curriculum, Intake, Termine, Kapazität, Preis oder Bewerbungsvertrag.",
    caption: "Kreative Visualisierung eines internationalen Projektstudios; keine tatsächlichen CRAYS-Programmteilnehmenden und kein Ergebnis."
  },
  assessment: {
    kicker: "Beobachtete Arbeit",
    title: "Assessment ist Evidenzarbeit, kein Theater.",
    text: "Eine Live-Aufgabe kann nützlich sein, wenn Zweck, Bedingungen und Reviewer-Verantwortung sichtbar sind. Sie ist kein vages Ritual und keine Abkürzung zu einer Beschäftigungszusage.",
    items: [
      { title: "Davor", text: "Fähigkeit, Aufgabe, erlaubte Tools, Barrierefreiheitsweg, Rubric und Datennutzung veröffentlichen." },
      { title: "Währenddessen", text: "Bedingungen, Hilfe, Unterbrechungen und Beobachtungen ohne verdeckte Überwachung festhalten." },
      { title: "Danach", text: "Feedback, Assessment-Ergebnis, Evidenzpublikation und Arbeitgeberfreigabe trennen." },
      { title: "Anfechtung", text: "Korrektur-, Widerspruchs- und Rückzugswege passend zum autorisierten Programm anbieten." }
    ],
    caption: "Kreative Visualisierung einer unterstützenden Prototypenbesprechung; keine tatsächlichen CRAYS-Programmteilnehmenden und kein Ergebnis."
  },
  employer: {
    kicker: "Arbeitgeberfunktion",
    title: "Discovery kann ein Gespräch öffnen. Sie entscheidet nicht über das Ergebnis.",
    lead: "Die Arbeitgeberfunktion macht passende, eingewilligte Evidenz verständlich und hält Vorstellungen nachvollziehbar. Sie darf niemals Partnerlogo, Stelle oder Einstellungserfolg erfinden.",
    items: [
      { title: "Arbeitgeberprüfung", text: "Identität, verantwortlicher Kontakt, Rollenautorität und Publikationsrecht werden vor Darstellung geprüft." },
      { title: "Rollenprüfung", text: "Titel, Ort, Disziplin, Arbeitsmodell, Anforderungen und Bewerbungsziel stammen vom Arbeitgeber." },
      { title: "Einwilligungsbasierte Discovery", text: "Lernende wählen, ob geeignete Evidenz auffindbar ist, und können dies zurücknehmen." },
      { title: "Attribuierte Vorstellung", text: "Quelle, Zweck, Beteiligte und Status werden protokolliert, ohne Interview oder Angebot zu behaupten." },
      { title: "Separate Bewerbung", text: "Der reale Arbeitgeberprozess beginnt erst, wenn sich die Person auf eine verifizierte Rolle bewirbt." },
      { title: "Unabhängige Entscheidung", text: "Screening und Hiring gehören dem Arbeitgeber; CRAYS verspricht kein Interview, Angebot, Gehalt oder Job." }
    ],
    caption: "Kreative Visualisierung eines professionellen Portfolioaustauschs; keine tatsächlichen CRAYS-Programmteilnehmenden und kein Ergebnis."
  },
  roles: {
    kicker: "Verifizierte Opportunities",
    title: "Keine Stelle ist besser als eine erfundene Stelle.",
    lead: "Hier erscheinen nur Rollen, deren Arbeitgeberidentität, Rollenautorität, Quelle, Publikationsfenster und Bewerbungsziel belegt sind.",
    columns: ["Rolle", "Ort", "Disziplin", "Evidenzstatus"],
    emptyTitle: "Keine verifizierte Stelle veröffentlicht.",
    emptyText: "Arbeitgeber, Titel, Ort, Gehalt, Bewerbungsdatum und Verfügbarkeit werden nicht inferiert. Eine künftige Rolle muss vor Darstellung das Publikationsgate passieren.",
    gate: "Rollengate: Arbeitgeberprüfung, Rollenquelle, Einwilligung, Owner, Gültigkeitsfenster und Bewerbungsweg erforderlich."
  },
  interest: {
    kicker: "Nächste Aktion",
    title: "Die Funktion erkunden, ohne eine falsche Bewerbung zu erzeugen.",
    lead: "Auf dieser Seite besteht kein autorisierter School-Programm- oder Job-Interest-Endpoint. Allgemeine Fragen können Contact nutzen; Mitgliedschaft bleibt eine getrennte Clubs-Journey und erzeugt weder Lern- noch Beschäftigungsstatus.",
    disabled: "Programmbewerbung nicht verfügbar",
    contact: "Allgemeine Frage stellen",
    membership: "Mitgliedschaft separat erkunden"
  },
  faq: {
    kicker: "Fragen",
    title: "Genau verstehen, was jedes Signal bedeutet.",
    lead: "Die Antworten halten Lernen, Evidenz, Vorstellung und Arbeitgeberentscheidung getrennt.",
    permalink: "Link zu dieser Antwort",
    items: [
      { question: "Nimmt CRAYS Club aktuell Bewerbungen an?", answer: "Nein. Auf dieser Seite ist kein autorisiertes Programm, Intake oder Bewerbungsfenster belegt. Ein künftiges Programm muss Owner, Zweck, Kriterien, Format, Termine, Kapazität, Bedingungen und Submission-Vertrag veröffentlichen." },
      { question: "Erzeugt ein abgeschlossenes Programm einen verifizierten Skill?", answer: "Nein. Teilnahme und Skills-Evidenz sind getrennt. Eine Fähigkeit kann nur durch definierte Arbeit, freigegebene Prüfung, verantwortliches Review und einen präzisen Evidenzdatensatz dargestellt werden." },
      { question: "Was bedeutet Live-Assessment?", answer: "Eine beobachtete Aufgabe unter offengelegten Bedingungen und anhand veröffentlichter Kriterien. Aktuell ist kein CRAYS-Live-Assessment terminiert oder verfügbar." },
      { question: "Wer darf Skills-Evidenz sehen?", answer: "Jede künftige Weitergabe muss einwilligungsbasiert und zweckgebunden sein. Lernende müssen Publikum, Dauer und Rückzugsweg vor Auffindbarkeit kennen." },
      { question: "Bedeutet Arbeitgeber-Discovery, dass ich mich beworben habe?", answer: "Nein. Discovery oder Vorstellung ist keine Jobbewerbung. Eine Person muss sich separat auf eine reale verifizierte Arbeitgeberrolle bewerben." },
      { question: "Entscheidet CRAYS, wer eingestellt wird?", answer: "Nein. Screening, Interviews, Angebote, Absagen und Beschäftigung liegen beim Arbeitgeber. CRAYS garantiert weder Treffen, Interview, Gehalt, Rolle noch Einstellung." },
      { question: "Gibt es jetzt verifizierte Jobs auf dieser Seite?", answer: "Nein. Die Rollenfläche bleibt leer, bis Arbeitgeberidentität, Rollenautorität, Gültigkeit und autorisiertes Bewerbungsziel belegt sind." },
      { question: "Ist School & Jobs dasselbe wie Clubs-Mitgliedschaft?", answer: "Nein. Mitgliedschaft, Programmbewerbung, Lernteilnahme, Evidenzweitergabe, Arbeitgebervorstellung und Jobbewerbung sind getrennte Journeys und Entscheidungen." }
    ]
  },
  closing: {
    kicker: "Evidenz vor Opportunity",
    title: "Erst den Weg bauen, dann das Versprechen veröffentlichen.",
    text: "CRAYS Club & Jobs wird durch klare Programme, beobachtbare Arbeit, lernendengesteuerte Evidenz und verifizierte Arbeitgeberrollen nützlich. Bis diese Inputs freigegeben sind, bleibt diese Seite eine ehrliche Karte statt eines falschen Marktplatzes.",
    primary: "CRAYS Clubs kontaktieren",
    secondary: "Zur Homepage zurück"
  },
  alts: {
    heroWorkshop: "Internationale junge Erwachsene arbeiten in einer modernen Forest-City-Learning-Lounge zusammen",
    learningRoom: "Junge Erwachsene lernen und arbeiten in einem hellen modernen Studio zusammen",
    skillsPractice: "Kreative Lernende üben gemeinsam Medien- und Prototyping-Fähigkeiten",
    programmeWorkshop: "Internationales Projektteam begutachtet ein nachhaltiges Stadtmodell",
    assessmentStudio: "Junge Designerin bespricht einen Prototyp mit einer unterstützenden Review-Gruppe",
    employerExchange: "Kreative Fachleute tauschen Portfolio-Feedback in einer Lounge am Wasser aus"
  }
};

type CompactLocale = {
  metaTitle: string;
  metaDescription: string;
  mediaNotice: string;
  navLabel: string;
  hero: [string, string, string, string, string, string, string, string];
  nav: string[];
  four: [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string];
  states: [string, string, string, ...string[]];
  skills: [string, string, string, ...string[]];
  programme: [string, string, string, ...string[]];
  assessment: [string, string, string, ...string[]];
  employer: [string, string, string, ...string[]];
  roles: [string, string, string, string, string, string, string, string, string, string];
  interest: [string, string, string, string, string, string];
  faq: [string, string, string, string, ...string[]];
  closing: [string, string, string, string, string];
  alts: [string, string, string, string, string, string];
};

function buildLocale(d: CompactLocale): SchoolJobsPublicCopy {
  const pair = (values: string[], start: number, count: number): Item[] =>
    Array.from({ length: count }, (_, index) => ({ title: values[start + index * 2], text: values[start + index * 2 + 1] }));
  return {
    metaTitle: d.metaTitle,
    metaDescription: d.metaDescription,
    mediaNotice: d.mediaNotice,
    navLabel: d.navLabel,
    hero: { eyebrow: d.hero[0], title: fixedTitle, lead: d.hero[1], boundary: d.hero[2], primary: d.hero[3], secondary: d.hero[4], caption: d.hero[5], signalLabel: d.hero[6], signalValue: d.hero[7] },
    nav: ["#four-step", "#evidence", "#programmes", "#employers", "#questions"].map((href, index) => ({ href, label: d.nav[index] })),
    four: {
      kicker: d.four[0], title: d.four[1], lead: d.four[2],
      items: [
        { title: d.four[3], text: d.four[4], gate: d.four[5] },
        { title: d.four[6], text: d.four[7], gate: d.four[8] },
        { title: d.four[9], text: d.four[10], gate: d.four[11] },
        { title: d.four[12], text: d.four[13], gate: d.four[14] }
      ],
      caption: d.four[15]
    },
    states: { kicker: d.states[0], title: d.states[1], lead: d.states[2], items: pair(d.states, 3, 8) },
    skills: { kicker: d.skills[0], title: d.skills[1], lead: d.skills[2], items: pair(d.skills, 3, 8), boundary: d.skills[19], caption: d.skills[20] },
    programme: { kicker: d.programme[0], title: d.programme[1], lead: d.programme[2], requirements: pair(d.programme, 3, 6), gate: d.programme[15], caption: d.programme[16] },
    assessment: { kicker: d.assessment[0], title: d.assessment[1], text: d.assessment[2], items: pair(d.assessment, 3, 4), caption: d.assessment[11] },
    employer: { kicker: d.employer[0], title: d.employer[1], lead: d.employer[2], items: pair(d.employer, 3, 6), caption: d.employer[15] },
    roles: { kicker: d.roles[0], title: d.roles[1], lead: d.roles[2], columns: d.roles.slice(3, 7), emptyTitle: d.roles[7], emptyText: d.roles[8], gate: d.roles[9] },
    interest: { kicker: d.interest[0], title: d.interest[1], lead: d.interest[2], disabled: d.interest[3], contact: d.interest[4], membership: d.interest[5] },
    faq: { kicker: d.faq[0], title: d.faq[1], lead: d.faq[2], permalink: d.faq[3], items: Array.from({ length: 8 }, (_, index) => ({ question: d.faq[4 + index * 2], answer: d.faq[5 + index * 2] })) },
    closing: { kicker: d.closing[0], title: d.closing[1], text: d.closing[2], primary: d.closing[3], secondary: d.closing[4] },
    alts: { heroWorkshop: d.alts[0], learningRoom: d.alts[1], skillsPractice: d.alts[2], programmeWorkshop: d.alts[3], assessmentStudio: d.alts[4], employerExchange: d.alts[5] }
  };
}

const es = buildLocale({
  metaTitle: "School & Jobs | CRAYS Clubs",
  metaDescription: "El recorrido CRAYS Club & Jobs basado en evidencias: descubrimiento, solicitud, evaluación, habilidades e introducción empresarial.",
  mediaNotice: "Referencia editorial con licencia; no documenta un programa, alumno o empleador de CRAYS.",
  navLabel: "Secciones de School & Jobs",
  hero: ["CRAYS Clubs / School & Jobs", "Aprender resulta útil cuando otras personas entienden qué practicaste, cómo se observó tu trabajo y qué evidencia decides compartir. Esta página define el recorrido completo sin fingir un programa, empleo, empleador o resultado disponible.", "Estado público: función diseñada; programas, evaluaciones, empleadores y puestos aún sin evidencia.", "Seguir la función de cuatro pasos", "Ver todos los estados", "Visual creativo de aprendizaje colaborativo de estilo de vida; no muestra participantes reales de programas CRAYS ni resultados.", "Estado actual", "Ningún puesto verificado publicado"],
  nav: ["Función de cuatro pasos", "Evidencia de habilidades", "Programas", "Función empresarial", "Preguntas"],
  four: ["La función completa", "Cuatro pasos sin un salto oculto del aprendizaje al empleo.", "La Homepage nombra cuatro funciones. Aquí cada una recibe significado completo y un límite de evidencia; ninguna crea automáticamente la siguiente.", "Construir habilidades verificadas", "Elegir una capacidad, practicar mediante trabajo definido y reunir evidencia de tarea, contribución, revisión y fecha.", "Arquitectura definida; no se emite credencial CRAYS.", "Unirse a CRAYS Club", "Descubrir un programa publicado, revisar propósito y requisitos y solicitar solo si está abierto.", "No hay catálogo, convocatoria ni ventana aprobada.", "Completar una evaluación en vivo", "Realizar una tarea observada con rúbrica publicada, revisor identificado y vía de corrección.", "No hay evaluación, rúbrica, revisor ni fecha aprobados.", "Conocer empleadores", "Con consentimiento, la evidencia podría apoyar descubrimiento o introducción atribuida; el empleador conserva puesto y decisión.", "No hay empleador, introducción ni vacante verificados.", "Visual creativo de una sala moderna de aprendizaje colaborativo; no muestra participantes reales de programas CRAYS ni resultados."],
  states: ["Estados separados", "El progreso es una cadena de decisiones explícitas.", "Cada persona debe saber qué ocurrió, quién responde y qué no ocurrió. Ocho estados no pueden convertirse en un único mensaje de éxito.", "Descubrimiento del aprendizaje", "Consultar propósitos y expectativas confirmados sin ser solicitante.", "Solicitud de programa", "Enviar datos solo a un programa abierto y autorizado; enviar no es aceptación.", "Evaluación de solicitud", "El equipo responsable revisa criterios publicados y registra un resultado separado.", "Participación", "Solo una aceptación explícita establece alcance, tiempo y condiciones.", "Evidencia de habilidades", "La evidencia nace de trabajo y revisión reales; participar no verifica capacidad.", "Descubrimiento o introducción empresarial", "La persona controla si su evidencia puede encontrarse o usarse para una introducción.", "Solicitud de empleo", "La persona solicita por separado a un puesto real y verificado.", "Decisión del empleador", "Selección, entrevista, oferta, rechazo y empleo pertenecen al empleador y no están garantizados."],
  skills: ["Evidencia de habilidades", "Hacer el trabajo legible, no más ruidoso.", "Un registro útil explica capacidad, contexto, estándar y contribución propia, no solo una insignia.", "Declaración de capacidad", "Descripción precisa sin extenderse a experiencia no probada.", "Muestra de trabajo", "Artefacto con procedencia, propiedad y permiso de uso.", "Tarea observada", "Tarea, condiciones, herramientas y ayuda documentadas.", "Rúbrica", "Criterios visibles antes del resultado.", "Identidad del revisor", "Responsable, cometido y conflictos registrados.", "Registro de contribución", "El trabajo en equipo separa aporte individual y resultado común.", "Consentimiento y audiencia", "La persona decide qué compartir, con quién y para qué.", "Versión y corrección", "Fecha, versión, sustitución y reclamación mantienen la evidencia vigente.", "Esta página no emite evidencia, credencial, puntuación ni perfil.", "Visual creativo de práctica de medios y prototipado; no muestra participantes reales de programas CRAYS ni resultados."],
  programme: ["Descubrimiento de programas", "Un programa debe explicarse antes de pedir una solicitud.", "Cada futura oferta necesita información verificada para valorar relevancia, esfuerzo, acceso y consecuencias.", "Propósito y resultados", "Capacidades, límites y evidencias previstos en lenguaje concreto.", "Criterios de entrada", "Experiencia, herramientas, idioma y requisitos publicados.", "Formato y carga", "Lugar, modalidad, tiempo, asistencia y colaboración aprobados.", "Método de evaluación", "Tarea, rúbrica, revisor, repetición, corrección y uso de evidencia claros.", "Apoyo y accesibilidad", "Apoyo, acceso y ajustes específicos del programa.", "Fechas, capacidad y coste", "Solo se publican tras aprobación responsable.", "Gate: ningún programa tiene responsable, currículo, convocatoria, fechas, capacidad, precio o contrato verificados.", "Visual creativo de un estudio internacional de proyectos; no muestra participantes reales de programas CRAYS ni resultados."],
  assessment: ["Trabajo observado", "Evaluar es trabajar con evidencia, no hacer teatro.", "Una tarea en vivo exige propósito, condiciones y responsabilidad visibles; no es un atajo hacia empleo.", "Antes", "Publicar capacidad, tarea, herramientas, acceso, rúbrica y uso de datos.", "Durante", "Registrar condiciones, ayuda e incidencias sin vigilancia oculta.", "Después", "Separar feedback, resultado, publicación y permiso empresarial.", "Reclamación", "Ofrecer corrección, apelación y retirada adecuadas.", "Visual creativo de una revisión de prototipos con apoyo; no muestra participantes reales de programas CRAYS ni resultados."],
  employer: ["Función empresarial", "El descubrimiento abre una conversación; no decide el resultado.", "La capa empresarial hace comprensible evidencia consentida y mantiene introducciones auditables sin inventar socios, vacantes o contrataciones.", "Verificación del empleador", "Identidad, contacto, autoridad y permiso antes de aparecer.", "Verificación del puesto", "Título, lugar, disciplina, modalidad, requisitos y destino proceden del empleador.", "Descubrimiento consentido", "La persona elige y puede retirar la visibilidad.", "Introducción atribuida", "Fuente, propósito, participantes y estado quedan registrados.", "Solicitud separada", "El proceso real empieza cuando la persona elige solicitar.", "Decisión independiente", "El empleador decide; CRAYS no promete entrevista, oferta, salario o empleo.", "Visual creativo de un intercambio profesional de portfolios; no muestra participantes reales de programas CRAYS ni resultados."],
  roles: ["Oportunidades verificadas", "Ninguna vacante es mejor que una vacante ficticia.", "Solo aparecerán puestos con identidad, autoridad, fuente, vigencia y destino demostrados.", "Puesto", "Lugar", "Disciplina", "Estado de evidencia", "No hay vacantes verificadas publicadas.", "No se infieren empleador, título, lugar, salario, fecha ni disponibilidad.", "Gate: verificación, fuente, consentimiento, responsable, vigencia y ruta requeridos."],
  interest: ["Siguiente acción", "Explorar la función sin crear una solicitud falsa.", "No existe endpoint autorizado de programa o empleo. Contacto sirve para preguntas generales; membresía sigue separada.", "Solicitud de programa no disponible", "Hacer una pregunta general", "Explorar membresía por separado"],
  faq: ["Preguntas", "Entender exactamente cada señal.", "Aprendizaje, evidencia, introducción y empleo siguen separados.", "Enlace a esta respuesta", "¿CRAYS Club acepta solicitudes?", "No hay programa o convocatoria autorizados; antes deben publicarse responsable, propósito, criterios, formato, fechas, capacidad, condiciones y contrato.", "¿Completar un programa verifica una habilidad?", "No. Participación y evidencia son estados distintos; se requiere trabajo definido, método aprobado, revisión responsable y registro preciso.", "¿Qué significa evaluación en vivo?", "Una tarea observada con condiciones y rúbrica publicadas. No hay evaluación CRAYS disponible.", "¿Quién puede ver la evidencia?", "El intercambio futuro debe basarse en consentimiento, propósito, audiencia, duración y retirada.", "¿Descubrimiento empresarial significa solicitud?", "No. Introducción no es solicitud; la persona debe solicitar por separado a un puesto real.", "¿CRAYS decide la contratación?", "No. El empleador controla selección, entrevistas, ofertas, rechazos y empleo.", "¿Hay empleos verificados ahora?", "No. La superficie queda vacía hasta verificar identidad, autoridad, vigencia y destino.", "¿Es lo mismo que membresía?", "No. Membresía, programa, participación, evidencia, introducción y empleo son decisiones separadas."],
  closing: ["Evidencia antes que oportunidad", "Construir el camino antes de publicar la promesa.", "School & Jobs será útil mediante programas claros, trabajo observable, evidencia controlada por la persona y puestos verificados. Hasta entonces es un mapa honesto, no un mercado falso.", "Contactar con CRAYS Clubs", "Volver a la Homepage"],
  alts: ["Jóvenes internacionales colaboran en un moderno salón de aprendizaje de Forest City", "Jóvenes aprenden y colaboran en un estudio moderno y luminoso", "Alumnos creativos practican juntos habilidades de medios y prototipado", "Un equipo internacional revisa un modelo de ciudad sostenible", "Una joven diseñadora presenta un prototipo a un grupo de revisión", "Profesionales creativos intercambian comentarios sobre portfolios en un salón frente al mar"]
});

const ca = buildLocale({
  ...({
    metaTitle: "School & Jobs | CRAYS Clubs",
    metaDescription: "El recorregut CRAYS Club & Jobs basat en evidències: descoberta, sol·licitud, avaluació, habilitats i introducció empresarial.",
    mediaNotice: "Referència editorial amb llicència; no documenta cap programa, alumne o ocupador de CRAYS.",
    navLabel: "Seccions de School & Jobs",
    hero: ["CRAYS Clubs / School & Jobs", "Aprendre és útil quan altres persones entenen què has practicat, com s'ha observat la feina i quina evidència decideixes compartir. Aquesta pàgina defineix el recorregut complet sense fingir programa, feina, ocupador o resultat disponible.", "Estat públic: funció dissenyada; programes, avaluacions, ocupadors i llocs encara sense evidència.", "Seguir la funció de quatre passos", "Veure tots els estats", "Visual creatiu d'aprenentatge col·laboratiu d'estil de vida; no mostra participants reals de programes CRAYS ni resultats.", "Estat actual", "Cap lloc verificat publicat"],
    nav: ["Funció de quatre passos", "Evidència d'habilitats", "Programes", "Funció empresarial", "Preguntes"],
    four: ["La funció completa", "Quatre passos sense un salt ocult de l'aprenentatge a la feina.", "La Homepage anomena quatre funcions. Aquí cadascuna rep significat complet i límit d'evidència; cap crea automàticament la següent.", "Construir habilitats verificades", "Triar una capacitat, practicar amb feina definida i reunir evidència de tasca, contribució, revisió i data.", "Arquitectura definida; no s'emet credencial CRAYS.", "Unir-se a CRAYS Club", "Descobrir un programa publicat, revisar propòsit i requisits i sol·licitar només si està obert.", "No hi ha catàleg, convocatòria ni finestra aprovats.", "Completar una avaluació en viu", "Fer una tasca observada amb rúbrica publicada, revisor identificat i via de correcció.", "No hi ha avaluació, rúbrica, revisor ni data aprovats.", "Conèixer ocupadors", "Amb consentiment, l'evidència podria donar suport a descoberta o introducció atribuïda; l'ocupador conserva lloc i decisió.", "No hi ha ocupador, introducció ni vacant verificats.", "Visual creatiu d'una sala moderna d'aprenentatge col·laboratiu; no mostra participants reals de programes CRAYS ni resultats."],
    states: ["Estats separats", "El progrés és una cadena de decisions explícites.", "Cada persona ha de saber què ha passat, qui respon i què no ha passat. Vuit estats no poden convertir-se en un sol missatge d'èxit.", "Descoberta de l'aprenentatge", "Consultar propòsits i expectatives confirmats sense ser sol·licitant.", "Sol·licitud de programa", "Enviar dades només a un programa obert i autoritzat; enviar no és acceptació.", "Avaluació de sol·licitud", "L'equip responsable revisa criteris publicats i registra un resultat separat.", "Participació", "Només una acceptació explícita estableix abast, temps i condicions.", "Evidència d'habilitats", "L'evidència neix de feina i revisió reals; participar no verifica capacitat.", "Descoberta o introducció empresarial", "La persona controla si l'evidència es pot trobar o usar per a una introducció.", "Sol·licitud de feina", "La persona sol·licita separadament un lloc real i verificat.", "Decisió de l'ocupador", "Selecció, entrevista, oferta, rebuig i feina pertanyen a l'ocupador i no estan garantits."],
    skills: ["Evidència d'habilitats", "Fer la feina llegible, no més sorollosa.", "Un registre útil explica capacitat, context, estàndard i contribució pròpia, no només una insígnia.", "Declaració de capacitat", "Descripció precisa sense experiència no provada.", "Mostra de feina", "Artefacte amb procedència, propietat i permís.", "Tasca observada", "Tasca, condicions, eines i ajuda documentades.", "Rúbrica", "Criteris visibles abans del resultat.", "Identitat del revisor", "Responsable, encàrrec i conflictes registrats.", "Registre de contribució", "El treball en equip separa aportació i resultat comú.", "Consentiment i audiència", "La persona decideix què comparteix, amb qui i per què.", "Versió i correcció", "Data, versió, substitució i reclamació mantenen vigència.", "Aquesta pàgina no emet evidència, credencial, puntuació ni perfil.", "Visual creatiu de pràctica de mitjans i prototipatge; no mostra participants reals de programes CRAYS ni resultats."],
    programme: ["Descoberta de programes", "Un programa s'ha d'explicar abans de demanar una sol·licitud.", "Cada futura oferta necessita informació verificada per valorar rellevància, esforç, accés i conseqüències.", "Propòsit i resultats", "Capacitats, límits i evidències previstos en llenguatge concret.", "Criteris d'entrada", "Experiència, eines, idioma i requisits publicats.", "Format i càrrega", "Lloc, modalitat, temps, assistència i col·laboració aprovats.", "Mètode d'avaluació", "Tasca, rúbrica, revisor, repetició, correcció i ús clars.", "Suport i accessibilitat", "Suport, accés i ajustos específics.", "Dates, capacitat i cost", "Només es publiquen després d'aprovació.", "Gate: cap programa té responsable, currículum, convocatòria, dates, capacitat, preu o contracte verificats.", "Visual creatiu d'un estudi internacional de projectes; no mostra participants reals de programes CRAYS ni resultats."],
    assessment: ["Feina observada", "Avaluar és treballar amb evidència, no fer teatre.", "Una tasca en viu exigeix propòsit, condicions i responsabilitat visibles; no és una drecera cap a feina.", "Abans", "Publicar capacitat, tasca, eines, accés, rúbrica i ús de dades.", "Durant", "Registrar condicions, ajuda i incidències sense vigilància oculta.", "Després", "Separar feedback, resultat, publicació i permís empresarial.", "Reclamació", "Oferir correcció, apel·lació i retirada.", "Visual creatiu d'una revisió de prototips amb suport; no mostra participants reals de programes CRAYS ni resultats."],
    employer: ["Funció empresarial", "La descoberta obre una conversa; no decideix el resultat.", "La capa empresarial fa comprensible evidència consentida i manté introduccions auditables sense inventar socis, vacants o contractacions.", "Verificació de l'ocupador", "Identitat, contacte, autoritat i permís abans d'aparèixer.", "Verificació del lloc", "Títol, lloc, disciplina, modalitat, requisits i destí provenen de l'ocupador.", "Descoberta consentida", "La persona tria i pot retirar la visibilitat.", "Introducció atribuïda", "Font, propòsit, participants i estat queden registrats.", "Sol·licitud separada", "El procés real comença quan la persona decideix sol·licitar.", "Decisió independent", "L'ocupador decideix; CRAYS no promet entrevista, oferta, salari o feina.", "Visual creatiu d'un intercanvi professional de portafolis; no mostra participants reals de programes CRAYS ni resultats."],
    roles: ["Oportunitats verificades", "Cap vacant és millor que una vacant fictícia.", "Només apareixeran llocs amb identitat, autoritat, font, vigència i destí demostrats.", "Lloc", "Ubicació", "Disciplina", "Estat d'evidència", "No hi ha vacants verificades publicades.", "No s'infereixen ocupador, títol, ubicació, salari, data ni disponibilitat.", "Gate: verificació, font, consentiment, responsable, vigència i ruta requerits."],
    interest: ["Acció següent", "Explorar la funció sense crear una sol·licitud falsa.", "No existeix endpoint autoritzat de programa o feina. Contacte serveix per a preguntes; membresia continua separada.", "Sol·licitud de programa no disponible", "Fer una pregunta general", "Explorar membresia separadament"],
    faq: ["Preguntes", "Entendre exactament cada senyal.", "Aprenentatge, evidència, introducció i feina continuen separats.", "Enllaç a aquesta resposta", "CRAYS Club accepta sol·licituds?", "No hi ha programa o convocatòria autoritzats; abans s'han de publicar responsable, propòsit, criteris, format, dates, capacitat, condicions i contracte.", "Completar un programa verifica una habilitat?", "No. Participació i evidència són estats diferents; cal feina definida, mètode aprovat, revisió responsable i registre precís.", "Què significa avaluació en viu?", "Una tasca observada amb condicions i rúbrica publicades. No hi ha avaluació CRAYS disponible.", "Qui pot veure l'evidència?", "L'intercanvi futur ha de basar-se en consentiment, propòsit, audiència, durada i retirada.", "Descoberta empresarial significa sol·licitud?", "No. Introducció no és sol·licitud; la persona ha de sol·licitar separadament un lloc real.", "CRAYS decideix la contractació?", "No. L'ocupador controla selecció, entrevistes, ofertes, rebutjos i feina.", "Hi ha feines verificades ara?", "No. La superfície resta buida fins a verificar identitat, autoritat, vigència i destí.", "És igual que membresia?", "No. Membresia, programa, participació, evidència, introducció i feina són decisions separades."],
    closing: ["Evidència abans que oportunitat", "Construir el camí abans de publicar la promesa.", "School & Jobs serà útil mitjançant programes clars, feina observable, evidència controlada per la persona i llocs verificats. Fins llavors és un mapa honest.", "Contactar amb CRAYS Clubs", "Tornar a la Homepage"],
    alts: ["Joves internacionals col·laboren en un saló d'aprenentatge modern de Forest City", "Joves aprenen i col·laboren en un estudi modern i lluminós", "Aprenents creatius practiquen habilitats de mitjans i prototipatge", "Un equip internacional revisa un model de ciutat sostenible", "Una jove dissenyadora presenta un prototip a un grup de revisió", "Professionals creatius intercanvien comentaris sobre portafolis en un saló davant del mar"]
  } as CompactLocale)
});

function otherRomance(locale: "fr" | "pt" | "it"): SchoolJobsPublicCopy {
  const d: Record<"fr" | "pt" | "it", CompactLocale> = {
    fr: {
      metaTitle: "School & Jobs | CRAYS Clubs",
      metaDescription: "Le parcours CRAYS Club & Jobs fondé sur les preuves : découverte, candidature, évaluation, compétences et introduction employeur.",
      mediaNotice: "Référence éditoriale sous licence, pas la documentation d'un programme, apprenant ou employeur CRAYS.",
      navLabel: "Sections de School & Jobs",
      hero: ["CRAYS Clubs / School & Jobs", "Apprendre devient utile lorsque d'autres comprennent ce qui a été pratiqué, comment le travail a été observé et quelles preuves la personne choisit de partager. Cette page définit le parcours complet sans inventer programme, emploi, employeur ou résultat disponible.", "État public : fonction conçue ; programmes, évaluations, employeurs et rôles non démontrés.", "Suivre les quatre étapes", "Voir tous les états", "Visuel créatif d'un apprentissage collaboratif axé sur le mode de vie ; il ne montre ni participants réels à un programme CRAYS ni résultats.", "État actuel", "Aucun rôle vérifié publié"],
      nav: ["Fonction en quatre étapes", "Preuves de compétences", "Programmes", "Fonction employeur", "Questions"],
      four: ["La fonction complète", "Quatre étapes sans saut caché de l'apprentissage à l'emploi.", "La Homepage nomme quatre fonctions. Ici chacune reçoit son sens complet et sa limite de preuve ; aucune ne crée automatiquement la suivante.", "Construire des compétences vérifiées", "Choisir une capacité, pratiquer un travail défini et réunir tâche, contribution, revue et date.", "Architecture définie ; aucun titre CRAYS émis.", "Rejoindre CRAYS Club", "Découvrir un programme publié, examiner son but et candidater seulement s'il est ouvert.", "Aucun catalogue, appel ou fenêtre approuvé.", "Effectuer une évaluation en direct", "Réaliser une tâche observée avec grille publiée, évaluateur identifié et voie de correction.", "Aucune évaluation, grille, personne ou date approuvée.", "Rencontrer des employeurs", "Avec consentement, les preuves pourraient soutenir découverte ou introduction attribuée ; l'employeur conserve rôle et décision.", "Aucun employeur, introduction ou poste vérifié.", "Visuel créatif d'un espace moderne d'apprentissage collaboratif ; il ne montre ni participants réels à un programme CRAYS ni résultats."],
      states: ["États séparés", "Le progrès est une chaîne de décisions explicites.", "Chacun doit savoir ce qui s'est produit, qui répond et ce qui ne s'est pas produit. Huit états ne deviennent pas un message de réussite.", "Découverte de l'apprentissage", "Consulter buts et attentes confirmés sans devenir candidat.", "Candidature au programme", "Envoyer des données seulement à un programme ouvert et autorisé ; envoi n'est pas acceptation.", "Évaluation de candidature", "L'équipe responsable applique les critères publiés et consigne un résultat séparé.", "Participation", "Seule une acceptation explicite établit périmètre, temps et conditions.", "Preuves de compétences", "Les preuves viennent d'un travail et d'une revue réels ; participer ne vérifie pas une capacité.", "Découverte ou introduction employeur", "La personne contrôle si ses preuves sont découvrables ou utilisables.", "Candidature à un emploi", "La personne candidate séparément à un rôle réel et vérifié.", "Décision employeur", "Sélection, entretien, offre, refus et emploi appartiennent à l'employeur et ne sont pas garantis."],
      skills: ["Preuves de compétences", "Rendre le travail lisible, pas plus bruyant.", "Un dossier utile explique capacité, contexte, standard et contribution, pas seulement un badge.", "Énoncé de capacité", "Description précise sans expertise voisine inventée.", "Échantillon de travail", "Artefact avec provenance, propriété et permission.", "Tâche observée", "Tâche, conditions, outils et aide documentés.", "Grille", "Critères visibles avant le résultat.", "Identité de l'évaluateur", "Responsable, mandat et conflits consignés.", "Contribution", "Le travail collectif distingue l'apport individuel.", "Consentement et public", "La personne choisit quoi partager, avec qui et pourquoi.", "Version et correction", "Date, version, remplacement et contestation maintiennent la validité.", "Cette page n'émet ni preuve, titre, score ou profil.", "Visuel créatif d'une pratique des médias et du prototypage ; il ne montre ni participants réels à un programme CRAYS ni résultats."],
      programme: ["Découverte des programmes", "Un programme doit s'expliquer avant de demander une candidature.", "Chaque future offre exige des faits vérifiés pour juger pertinence, effort, accès et conséquences.", "But et résultats", "Capacités, limites et preuves attendues en langage concret.", "Critères d'entrée", "Expérience, outils, langue et prérequis publiés.", "Format et charge", "Lieu, mode, temps, présence et collaboration approuvés.", "Évaluation", "Tâche, grille, évaluateur, reprise, correction et usage clairs.", "Soutien et accessibilité", "Soutien, accès et ajustements propres au programme.", "Dates, capacité et coût", "Publication seulement après approbation.", "Gate : aucun programme n'a responsable, cursus, appel, dates, capacité, prix ou contrat vérifiés.", "Visuel créatif d'un studio de projet international ; il ne montre ni participants réels à un programme CRAYS ni résultats."],
      assessment: ["Travail observé", "Évaluer, c'est travailler avec des preuves, pas jouer un rôle.", "Une tâche en direct exige but, conditions et responsabilité visibles ; ce n'est pas un raccourci vers l'emploi.", "Avant", "Publier capacité, tâche, outils, accès, grille et usage des données.", "Pendant", "Consigner conditions, aide et incidents sans surveillance cachée.", "Après", "Séparer feedback, résultat, publication et permission employeur.", "Contestation", "Offrir correction, appel et retrait.", "Visuel créatif d'une revue de prototype bienveillante ; il ne montre ni participants réels à un programme CRAYS ni résultats."],
      employer: ["Fonction employeur", "La découverte ouvre une conversation ; elle ne décide pas.", "Cette couche rend les preuves consenties compréhensibles et les introductions traçables sans inventer partenaires, postes ou embauches.", "Vérification employeur", "Identité, contact, autorité et permission avant affichage.", "Vérification du rôle", "Titre, lieu, discipline, mode, exigences et destination viennent de l'employeur.", "Découverte consentie", "La personne choisit et peut retirer la visibilité.", "Introduction attribuée", "Source, but, participants et état sont consignés.", "Candidature séparée", "Le processus réel commence lorsque la personne choisit de candidater.", "Décision indépendante", "L'employeur décide ; CRAYS ne promet entretien, offre, salaire ou emploi.", "Visuel créatif d'un échange professionnel de portfolios ; il ne montre ni participants réels à un programme CRAYS ni résultats."],
      roles: ["Opportunités vérifiées", "Aucune offre vaut mieux qu'une offre fictive.", "Seuls apparaîtront les rôles avec identité, autorité, source, validité et destination démontrées.", "Rôle", "Lieu", "Discipline", "État de preuve", "Aucune offre vérifiée publiée.", "Aucun employeur, titre, lieu, salaire, date ou disponibilité n'est déduit.", "Gate : vérification, source, consentement, responsable, validité et route requis."],
      interest: ["Action suivante", "Explorer la fonction sans créer une fausse candidature.", "Aucun endpoint autorisé de programme ou emploi. Contact sert aux questions ; l'adhésion reste séparée.", "Candidature indisponible", "Poser une question générale", "Explorer l'adhésion séparément"],
      faq: ["Questions", "Comprendre exactement chaque signal.", "Apprentissage, preuves, introduction et emploi restent séparés.", "Lien vers cette réponse", "CRAYS Club accepte-t-elle des candidatures ?", "Aucun programme ou appel n'est autorisé ; responsable, but, critères, format, dates, capacité, conditions et contrat doivent d'abord être publiés.", "Terminer un programme vérifie-t-il une compétence ?", "Non. Participation et preuves sont distinctes ; travail défini, méthode approuvée, revue responsable et dossier précis sont nécessaires.", "Que signifie évaluation en direct ?", "Une tâche observée avec conditions et grille publiées. Aucune évaluation CRAYS n'est disponible.", "Qui peut voir les preuves ?", "Tout partage futur exige consentement, but, public, durée et retrait.", "Découverte employeur signifie-t-elle candidature ?", "Non. Une introduction n'est pas une candidature ; la personne candidate séparément.", "CRAYS décide-t-elle de l'embauche ?", "Non. L'employeur contrôle sélection, entretiens, offres, refus et emploi.", "Y a-t-il des emplois vérifiés maintenant ?", "Non. La surface reste vide jusqu'à vérification de l'identité, autorité, validité et destination.", "Est-ce identique à l'adhésion ?", "Non. Adhésion, programme, participation, preuves, introduction et emploi sont des décisions séparées."],
      closing: ["Les preuves avant l'opportunité", "Construire la voie avant de publier la promesse.", "School & Jobs deviendra utile par des programmes clairs, un travail observable, des preuves contrôlées par la personne et des rôles vérifiés. D'ici là, c'est une carte honnête.", "Contacter CRAYS Clubs", "Retour à la Homepage"],
      alts: ["De jeunes adultes internationaux collaborent dans un salon d'apprentissage moderne de Forest City", "De jeunes adultes apprennent et collaborent dans un studio moderne et lumineux", "Des apprenants créatifs pratiquent ensemble les médias et le prototypage", "Une équipe internationale examine une maquette de ville durable", "Une jeune designer présente un prototype à un groupe de revue", "Des professionnels créatifs échangent des avis sur leurs portfolios dans un salon au bord de l'eau"]
    },
    pt: {
      metaTitle: "School & Jobs | CRAYS Clubs",
      metaDescription: "A jornada CRAYS Club & Jobs baseada em evidência: descoberta, candidatura, avaliação, competências e introdução a empregadores.",
      mediaNotice: "Referência editorial licenciada; não documenta programa, aluno ou empregador CRAYS.",
      navLabel: "Secções de School & Jobs",
      hero: ["CRAYS Clubs / School & Jobs", "Aprender torna-se útil quando outros entendem o que foi praticado, como o trabalho foi observado e que evidência a pessoa escolhe partilhar. Esta página define a jornada completa sem fingir programa, emprego, empregador ou resultado disponível.", "Estado público: função desenhada; programas, avaliações, empregadores e funções sem evidência.", "Seguir os quatro passos", "Ver todos os estados", "Visual criativo de aprendizagem colaborativa orientada ao estilo de vida; não mostra participantes reais de programas CRAYS nem resultados.", "Estado atual", "Nenhuma função verificada publicada"],
      nav: ["Função em quatro passos", "Evidência de competências", "Programas", "Função do empregador", "Perguntas"],
      four: ["A função completa", "Quatro passos sem salto oculto da aprendizagem para o emprego.", "A Homepage nomeia quatro funções. Aqui cada uma recebe significado completo e limite de evidência; nenhuma cria automaticamente a seguinte.", "Construir competências verificadas", "Escolher uma capacidade, praticar trabalho definido e reunir tarefa, contribuição, revisão e data.", "Arquitetura definida; nenhuma credencial CRAYS emitida.", "Entrar na CRAYS Club", "Descobrir programa publicado, rever propósito e requisitos e candidatar-se apenas se estiver aberto.", "Sem catálogo, intake ou janela aprovados.", "Completar avaliação ao vivo", "Realizar tarefa observada com rubrica publicada, revisor identificado e correção.", "Sem avaliação, rubrica, revisor ou data aprovados.", "Conhecer empregadores", "Com consentimento, evidência poderia apoiar descoberta ou introdução atribuída; o empregador mantém função e decisão.", "Sem empregador, introdução ou vaga verificados.", "Visual criativo de uma sala moderna de aprendizagem colaborativa; não mostra participantes reais de programas CRAYS nem resultados."],
      states: ["Estados separados", "O progresso é uma cadeia de decisões explícitas.", "Cada pessoa deve saber o que aconteceu, quem responde e o que não aconteceu. Oito estados não viram uma mensagem de sucesso.", "Descoberta da aprendizagem", "Consultar propósitos e expectativas confirmados sem ser candidato.", "Candidatura ao programa", "Enviar dados só a programa aberto e autorizado; envio não é aceitação.", "Avaliação da candidatura", "A equipa responsável aplica critérios publicados e regista resultado separado.", "Participação", "Só aceitação explícita estabelece âmbito, tempo e condições.", "Evidência de competências", "Evidência nasce de trabalho e revisão reais; participar não verifica capacidade.", "Descoberta ou introdução", "A pessoa controla se a evidência pode ser encontrada ou usada.", "Candidatura a emprego", "A pessoa candidata-se separadamente a função real e verificada.", "Decisão do empregador", "Seleção, entrevista, oferta, rejeição e emprego pertencem ao empregador e não são garantidos."],
      skills: ["Evidência de competências", "Tornar o trabalho legível, não mais ruidoso.", "Um registo útil explica capacidade, contexto, padrão e contribuição, não apenas um selo.", "Declaração de capacidade", "Descrição precisa sem experiência adjacente inventada.", "Amostra de trabalho", "Artefacto com proveniência, propriedade e permissão.", "Tarefa observada", "Tarefa, condições, ferramentas e ajuda documentadas.", "Rubrica", "Critérios visíveis antes do resultado.", "Identidade do revisor", "Responsável, mandato e conflitos registados.", "Contribuição", "Trabalho de equipa distingue o contributo individual.", "Consentimento e público", "A pessoa escolhe o que partilhar, com quem e porquê.", "Versão e correção", "Data, versão, substituição e contestação mantêm validade.", "Esta página não emite evidência, credencial, pontuação ou perfil.", "Visual criativo de prática de media e prototipagem; não mostra participantes reais de programas CRAYS nem resultados."],
      programme: ["Descoberta de programas", "Um programa deve explicar-se antes de pedir candidatura.", "Cada futura oferta exige factos verificados para avaliar relevância, esforço, acesso e consequências.", "Propósito e resultados", "Capacidades, limites e evidências em linguagem concreta.", "Critérios de entrada", "Experiência, ferramentas, idioma e requisitos publicados.", "Formato e carga", "Local, modo, tempo, presença e colaboração aprovados.", "Avaliação", "Tarefa, rubrica, revisor, repetição, correção e uso claros.", "Apoio e acessibilidade", "Apoio, acesso e adaptações específicas.", "Datas, capacidade e custo", "Publicação apenas após aprovação.", "Gate: nenhum programa tem responsável, currículo, intake, datas, capacidade, preço ou contrato verificados.", "Visual criativo de um estúdio internacional de projetos; não mostra participantes reais de programas CRAYS nem resultados."],
      assessment: ["Trabalho observado", "Avaliar é trabalhar com evidência, não fazer teatro.", "Uma tarefa ao vivo exige propósito, condições e responsabilidade visíveis; não é atalho para emprego.", "Antes", "Publicar capacidade, tarefa, ferramentas, acesso, rubrica e dados.", "Durante", "Registar condições, ajuda e incidentes sem vigilância oculta.", "Depois", "Separar feedback, resultado, publicação e permissão do empregador.", "Contestação", "Oferecer correção, recurso e retirada.", "Visual criativo de uma revisão de protótipos com apoio; não mostra participantes reais de programas CRAYS nem resultados."],
      employer: ["Função do empregador", "A descoberta abre uma conversa; não decide o resultado.", "Esta camada torna evidência consentida compreensível e introduções auditáveis sem inventar parceiros, vagas ou contratações.", "Verificação do empregador", "Identidade, contacto, autoridade e permissão antes de aparecer.", "Verificação da função", "Título, local, disciplina, modo, requisitos e destino vêm do empregador.", "Descoberta consentida", "A pessoa escolhe e pode retirar visibilidade.", "Introdução atribuída", "Fonte, propósito, participantes e estado ficam registados.", "Candidatura separada", "O processo real começa quando a pessoa escolhe candidatar-se.", "Decisão independente", "O empregador decide; CRAYS não promete entrevista, oferta, salário ou emprego.", "Visual criativo de uma troca profissional de portefólios; não mostra participantes reais de programas CRAYS nem resultados."],
      roles: ["Oportunidades verificadas", "Nenhuma vaga é melhor que uma vaga fictícia.", "Só aparecem funções com identidade, autoridade, fonte, validade e destino demonstrados.", "Função", "Local", "Disciplina", "Estado de evidência", "Nenhuma vaga verificada publicada.", "Não se inferem empregador, título, local, salário, data ou disponibilidade.", "Gate: verificação, fonte, consentimento, responsável, validade e rota exigidos."],
      interest: ["Próxima ação", "Explorar a função sem criar candidatura falsa.", "Não existe endpoint autorizado de programa ou emprego. Contacto serve para perguntas; membership fica separada.", "Candidatura indisponível", "Fazer pergunta geral", "Explorar membership separadamente"],
      faq: ["Perguntas", "Entender exatamente cada sinal.", "Aprendizagem, evidência, introdução e emprego ficam separados.", "Ligação para esta resposta", "CRAYS Club aceita candidaturas?", "Não existe programa ou intake autorizado; responsável, propósito, critérios, formato, datas, capacidade, condições e contrato devem ser publicados.", "Concluir programa verifica competência?", "Não. Participação e evidência são diferentes; trabalho definido, método aprovado, revisão e registo são necessários.", "O que é avaliação ao vivo?", "Tarefa observada com condições e rubrica publicadas. Não há avaliação CRAYS disponível.", "Quem pode ver a evidência?", "Partilha futura exige consentimento, propósito, público, duração e retirada.", "Descoberta significa candidatura?", "Não. Introdução não é candidatura; a pessoa candidata-se separadamente.", "CRAYS decide contratação?", "Não. O empregador controla seleção, entrevistas, ofertas, rejeições e emprego.", "Há empregos verificados agora?", "Não. A superfície fica vazia até verificar identidade, autoridade, validade e destino.", "É igual à membership?", "Não. Membership, programa, participação, evidência, introdução e emprego são decisões separadas."],
      closing: ["Evidência antes da oportunidade", "Construir o caminho antes de publicar a promessa.", "School & Jobs será útil com programas claros, trabalho observável, evidência controlada pela pessoa e funções verificadas. Até lá é um mapa honesto.", "Contactar CRAYS Clubs", "Voltar à Homepage"],
      alts: ["Jovens internacionais colaboram num salão de aprendizagem moderno de Forest City", "Jovens aprendem e colaboram num estúdio moderno e luminoso", "Alunos criativos praticam competências de media e prototipagem", "Uma equipa internacional analisa uma maquete de cidade sustentável", "Uma jovem designer apresenta um protótipo a um grupo de revisão", "Profissionais criativos trocam feedback sobre portefólios num salão à beira-mar"]
    },
    it: {
      metaTitle: "School & Jobs | CRAYS Clubs",
      metaDescription: "Il percorso CRAYS Club & Jobs basato su evidenze: scoperta, candidatura, valutazione, competenze e introduzione ai datori.",
      mediaNotice: "Riferimento editoriale con licenza; non documenta programmi, studenti o datori CRAYS.",
      navLabel: "Sezioni School & Jobs",
      hero: ["CRAYS Clubs / School & Jobs", "Imparare diventa utile quando altri comprendono cosa è stato praticato, come il lavoro è stato osservato e quali evidenze la persona sceglie di condividere. Questa pagina definisce il percorso completo senza inventare programma, lavoro, datore o risultato disponibile.", "Stato pubblico: funzione progettata; programmi, valutazioni, datori e ruoli senza evidenza.", "Segui i quattro passaggi", "Vedi tutti gli stati", "Visual creativo di apprendimento collaborativo orientato allo stile di vita; non mostra partecipanti reali a programmi CRAYS né risultati.", "Stato attuale", "Nessun ruolo verificato pubblicato"],
      nav: ["Funzione in quattro passaggi", "Evidenze delle competenze", "Programmi", "Funzione del datore", "Domande"],
      four: ["La funzione completa", "Quattro passaggi senza salto nascosto dall'apprendimento al lavoro.", "La Homepage nomina quattro funzioni. Qui ognuna riceve significato completo e limite di evidenza; nessuna crea automaticamente la successiva.", "Costruire competenze verificate", "Scegliere una capacità, praticare lavoro definito e riunire compito, contributo, revisione e data.", "Architettura definita; nessuna credenziale CRAYS emessa.", "Entrare in CRAYS Club", "Scoprire un programma pubblicato, esaminare scopo e requisiti e candidarsi solo se aperto.", "Nessun catalogo, intake o finestra approvati.", "Completare valutazione dal vivo", "Svolgere compito osservato con rubrica pubblicata, revisore identificato e correzione.", "Nessuna valutazione, rubrica, persona o data approvate.", "Incontrare datori", "Con consenso, le evidenze potrebbero sostenere scoperta o introduzione attribuita; il datore mantiene ruolo e decisione.", "Nessun datore, introduzione o posto verificati.", "Visual creativo di uno spazio moderno per l'apprendimento collaborativo; non mostra partecipanti reali a programmi CRAYS né risultati."],
      states: ["Stati separati", "Il progresso è una catena di decisioni esplicite.", "Ogni persona deve sapere cosa è accaduto, chi risponde e cosa non è accaduto. Otto stati non diventano un messaggio di successo.", "Scoperta dell'apprendimento", "Consultare scopi e aspettative confermati senza diventare candidato.", "Candidatura al programma", "Inviare dati solo a programma aperto e autorizzato; invio non è accettazione.", "Valutazione candidatura", "Il team responsabile applica criteri pubblicati e registra esito separato.", "Partecipazione", "Solo accettazione esplicita stabilisce ambito, tempo e condizioni.", "Evidenze delle competenze", "Le evidenze nascono da lavoro e revisione reali; partecipare non verifica capacità.", "Scoperta o introduzione", "La persona controlla se le evidenze sono trovabili o utilizzabili.", "Candidatura lavorativa", "La persona si candida separatamente a ruolo reale e verificato.", "Decisione del datore", "Selezione, colloquio, offerta, rifiuto e impiego appartengono al datore e non sono garantiti."],
      skills: ["Evidenze delle competenze", "Rendere il lavoro leggibile, non più rumoroso.", "Un dossier utile spiega capacità, contesto, standard e contributo, non solo un badge.", "Dichiarazione di capacità", "Descrizione precisa senza competenze adiacenti inventate.", "Campione di lavoro", "Artefatto con provenienza, proprietà e permesso.", "Compito osservato", "Compito, condizioni, strumenti e aiuto documentati.", "Rubrica", "Criteri visibili prima del risultato.", "Identità del revisore", "Responsabile, mandato e conflitti registrati.", "Contributo", "Il lavoro di squadra distingue l'apporto individuale.", "Consenso e pubblico", "La persona sceglie cosa condividere, con chi e perché.", "Versione e correzione", "Data, versione, sostituzione e contestazione mantengono validità.", "Questa pagina non emette evidenze, credenziali, punteggi o profili.", "Visual creativo di una pratica di media e prototipazione; non mostra partecipanti reali a programmi CRAYS né risultati."],
      programme: ["Scoperta dei programmi", "Un programma deve spiegarsi prima di chiedere candidatura.", "Ogni futura offerta richiede fatti verificati per valutare rilevanza, impegno, accesso e conseguenze.", "Scopo e risultati", "Capacità, limiti ed evidenze in linguaggio concreto.", "Criteri d'ingresso", "Esperienza, strumenti, lingua e requisiti pubblicati.", "Formato e carico", "Luogo, modalità, tempo, presenza e collaborazione approvati.", "Valutazione", "Compito, rubrica, revisore, ripetizione, correzione e uso chiari.", "Supporto e accessibilità", "Supporto, accesso e adattamenti specifici.", "Date, capacità e costo", "Pubblicazione solo dopo approvazione.", "Gate: nessun programma ha responsabile, curriculum, intake, date, capacità, prezzo o contratto verificati.", "Visual creativo di uno studio internazionale di progetto; non mostra partecipanti reali a programmi CRAYS né risultati."],
      assessment: ["Lavoro osservato", "Valutare è lavorare con evidenze, non fare teatro.", "Un compito dal vivo richiede scopo, condizioni e responsabilità visibili; non è scorciatoia verso il lavoro.", "Prima", "Pubblicare capacità, compito, strumenti, accesso, rubrica e dati.", "Durante", "Registrare condizioni, aiuto e incidenti senza sorveglianza nascosta.", "Dopo", "Separare feedback, esito, pubblicazione e permesso del datore.", "Contestazione", "Offrire correzione, ricorso e ritiro.", "Visual creativo di una revisione collaborativa di un prototipo; non mostra partecipanti reali a programmi CRAYS né risultati."],
      employer: ["Funzione del datore", "La scoperta apre una conversazione; non decide l'esito.", "Questa funzione rende comprensibili evidenze consentite e introduzioni tracciabili senza inventare partner, posti o assunzioni.", "Verifica datore", "Identità, contatto, autorità e permesso prima della presenza.", "Verifica ruolo", "Titolo, luogo, disciplina, modalità, requisiti e destinazione vengono dal datore.", "Scoperta consentita", "La persona sceglie e può ritirare visibilità.", "Introduzione attribuita", "Fonte, scopo, partecipanti e stato vengono registrati.", "Candidatura separata", "Il processo reale inizia quando la persona sceglie di candidarsi.", "Decisione indipendente", "Il datore decide; CRAYS non promette colloquio, offerta, salario o impiego.", "Visual creativo di uno scambio professionale di portfolio; non mostra partecipanti reali a programmi CRAYS né risultati."],
      roles: ["Opportunità verificate", "Nessuna offerta è meglio di un'offerta fittizia.", "Appariranno solo ruoli con identità, autorità, fonte, validità e destinazione dimostrate.", "Ruolo", "Luogo", "Disciplina", "Stato evidenza", "Nessun posto verificato pubblicato.", "Non si inferiscono datore, titolo, luogo, salario, data o disponibilità.", "Gate: verifica, fonte, consenso, responsabile, validità e percorso richiesti."],
      interest: ["Azione successiva", "Esplorare la funzione senza creare falsa candidatura.", "Non esiste endpoint autorizzato di programma o lavoro. Contatti serve alle domande; membership resta separata.", "Candidatura non disponibile", "Fare una domanda generale", "Esplorare membership separatamente"],
      faq: ["Domande", "Capire esattamente ogni segnale.", "Apprendimento, evidenze, introduzione e lavoro restano separati.", "Link a questa risposta", "CRAYS Club accetta candidature?", "Non esiste programma o intake autorizzato; responsabile, scopo, criteri, formato, date, capacità, condizioni e contratto devono essere pubblicati.", "Completare un programma verifica competenza?", "No. Partecipazione ed evidenza sono diverse; servono lavoro definito, metodo approvato, revisione e dossier preciso.", "Cos'è valutazione dal vivo?", "Compito osservato con condizioni e rubrica pubblicate. Nessuna valutazione CRAYS è disponibile.", "Chi può vedere le evidenze?", "Ogni condivisione futura richiede consenso, scopo, pubblico, durata e ritiro.", "Scoperta significa candidatura?", "No. Introduzione non è candidatura; la persona si candida separatamente.", "CRAYS decide l'assunzione?", "No. Il datore controlla selezione, colloqui, offerte, rifiuti e impiego.", "Ci sono lavori verificati ora?", "No. La superficie resta vuota fino a verifica di identità, autorità, validità e destinazione.", "È uguale alla membership?", "No. Membership, programma, partecipazione, evidenze, introduzione e lavoro sono decisioni separate."],
      closing: ["Evidenze prima dell'opportunità", "Costruire il percorso prima di pubblicare la promessa.", "School & Jobs sarà utile con programmi chiari, lavoro osservabile, evidenze controllate dalla persona e ruoli verificati. Fino ad allora è una mappa onesta.", "Contatta CRAYS Clubs", "Torna alla Homepage"],
      alts: ["Giovani internazionali collaborano in una moderna lounge di apprendimento di Forest City", "Giovani adulti imparano e collaborano in uno studio moderno e luminoso", "Studenti creativi praticano insieme competenze multimediali e di prototipazione", "Un team internazionale esamina un modello di città sostenibile", "Una giovane designer presenta un prototipo a un gruppo di revisione", "Professionisti creativi si scambiano feedback sui portfolio in una lounge sul lungomare"]
    }
  };
  return buildLocale(d[locale]);
}

const copyByLocale: Record<SchoolJobsLocale, SchoolJobsPublicCopy> = {
  en,
  de,
  es,
  ca,
  fr: otherRomance("fr"),
  pt: otherRomance("pt"),
  it: otherRomance("it")
};

type UnknownRecord = Record<string, unknown>;
function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function resolveShell(locale: SchoolJobsLocale): unknown {
  const source = familiesCopyModule as UnknownRecord;
  for (const key of ["getFamiliesContent", "getFamiliesCopy", "getFamiliesPageCopy"]) {
    const candidate = source[key];
    if (typeof candidate === "function") {
      const result = (candidate as (value: SchoolJobsLocale) => unknown)(locale);
      if (isRecord(result) && isRecord(result.shell)) return result.shell;
    }
  }
  for (const key of ["familiesContent", "familiesCopy", "familiesPageCopy", "FAMILIES_COPY"]) {
    const candidate = source[key];
    if (!isRecord(candidate)) continue;
    const localized = candidate[locale] ?? candidate.en;
    if (isRecord(localized) && isRecord(localized.shell)) return localized.shell;
  }
  throw new Error("Existing localized JourneyShell copy could not be resolved.");
}

export function getSchoolJobsPublicContent(locale: SchoolJobsLocale) {
  const titles:Record<SchoolJobsLocale,string>={en:fixedTitle,de:"Lerne hier. Werde überall entdeckt.",es:"Aprende aquí. Hazte visible en cualquier lugar.",ca:"Aprèn aquí. Fes-te descobrir arreu.",fr:"Apprenez ici. Faites-vous découvrir partout.",pt:"Aprenda aqui. Seja descoberto em qualquer lugar.",it:"Impara qui. Fatti conoscere ovunque."};
  const copy=copyByLocale[locale];
  return { ...copy, hero:{...copy.hero,title:titles[locale]}, shell: resolveShell(locale) };
}
