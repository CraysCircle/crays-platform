import type { ClubsLocale } from "./public-site";

export type ClubsAmbassadorApplyCopy = {
  metaTitle: string; navBack: string; eyebrow: string; title: string; titlePersonalized: string;
  intro: string; previewBadge: string; previewNotice: string; formTitle: string; fullName: string;
  email: string; basedIn: string; interest: string; motivation: string; contribution: string;
  profileUrl: string; consent: string; submit: string; resultTitle: string; resultBody: string;
  required: string; invalidEmail: string; min80: string; invalidUrl: string; consentRequired: string;
  interests: Record<string, string>;
};

type BaseCopy = Omit<ClubsAmbassadorApplyCopy, "interests">;
const interestKeys = ["community", "school-jobs", "fitness-wellbeing", "family", "company-residency", "culture-events"];
const interestLabels: Record<ClubsLocale, string[]> = {
  en: ["Community & living", "School & jobs", "Fitness & wellbeing", "Family", "Company residency", "Culture & events"],
  de: ["Community & Wohnen", "School & Jobs", "Fitness & Wohlbefinden", "Familie", "Unternehmensaufenthalt", "Kultur & Events"],
  es: ["Comunidad y vida", "School y empleo", "Fitness y bienestar", "Familia", "Residencia de empresa", "Cultura y eventos"],
  ca: ["Comunitat i vida", "School i feina", "Fitness i benestar", "Família", "Residència d’empresa", "Cultura i esdeveniments"],
  fr: ["Communauté & vie", "School & emplois", "Fitness & bien-être", "Famille", "Résidence d’entreprise", "Culture & événements"],
  pt: ["Comunidade e vida", "School e empregos", "Fitness e bem-estar", "Família", "Residência empresarial", "Cultura e eventos"],
  it: ["Community e vita", "School e lavoro", "Fitness e benessere", "Famiglia", "Residenza aziendale", "Cultura ed eventi"],
};

const sharedValidation: Pick<BaseCopy, "required" | "invalidEmail" | "min80" | "invalidUrl" | "consentRequired"> = {
  required: "Please complete this field within the stated limit.",
  invalidEmail: "Enter a valid email address.",
  min80: "Write between 80 and 1,500 characters.",
  invalidUrl: "Use a valid HTTPS URL.",
  consentRequired: "Confirm the preview boundary to continue.",
};

const copy: Record<ClubsLocale, BaseCopy> = {
  en: {
    metaTitle: "Apply through an Ambassador | CRAYS Clubs", navBack: "Back to Forest City",
    eyebrow: "CRAYS CLUBS · AMBASSADOR APPLICATION", title: "Come through someone you trust.",
    titlePersonalized: "Apply through {name}.",
    intro: "Tell us what you want to build, learn and contribute in Forest City. CRAYS is invitation-led: Ambassadors introduce people who add value to the community.",
    previewBadge: "LOCAL PRODUCT PREVIEW", previewNotice: "Preview only. Your application will not be sent or saved.",
    formTitle: "Start your introduction", fullName: "Full name", email: "Email",
    basedIn: "Where are you based? (optional)", interest: "What brings you to CRAYS?",
    motivation: "Why do you want to join?", contribution: "What will you contribute?",
    profileUrl: "Profile or portfolio URL (optional)",
    consent: "I understand this is a local product preview and no application is sent or saved.",
    submit: "Preview application", resultTitle: "Preview complete",
    resultBody: "Nothing was sent or stored. The live application flow will only be activated after its privacy and persistence gates are approved.",
    ...sharedValidation,
  },
  de: {
    metaTitle: "Über einen Ambassador bewerben | CRAYS Clubs", navBack: "Zurück zu Forest City",
    eyebrow: "CRAYS CLUBS · AMBASSADOR-BEWERBUNG", title: "Komm über jemanden, dem du vertraust.",
    titlePersonalized: "Bewirb dich über {name}.",
    intro: "Erzähl uns, was du in Forest City aufbauen, lernen und beitragen möchtest. CRAYS ist einladungsbasiert: Ambassadors empfehlen Menschen, die der Community echten Mehrwert geben.",
    previewBadge: "LOKALE PRODUKTVORSCHAU", previewNotice: "Nur Vorschau. Deine Bewerbung wird weder gesendet noch gespeichert.",
    formTitle: "Starte deine Empfehlung", fullName: "Vollständiger Name", email: "E-Mail",
    basedIn: "Wo lebst du? (optional)", interest: "Was führt dich zu CRAYS?",
    motivation: "Warum möchtest du teilnehmen?", contribution: "Was wirst du beitragen?",
    profileUrl: "Profil- oder Portfolio-URL (optional)",
    consent: "Ich verstehe, dass dies eine lokale Produktvorschau ist und keine Bewerbung gesendet oder gespeichert wird.",
    submit: "Bewerbung ansehen", resultTitle: "Vorschau vollständig",
    resultBody: "Nichts wurde gesendet oder gespeichert. Der Live-Prozess wird erst nach Freigabe der Datenschutz- und Persistenz-Gates aktiviert.",
    required: "Bitte fülle dieses Feld innerhalb der angegebenen Grenze aus.", invalidEmail: "Gib eine gültige E-Mail-Adresse ein.",
    min80: "Schreibe zwischen 80 und 1.500 Zeichen.", invalidUrl: "Verwende eine gültige HTTPS-URL.",
    consentRequired: "Bestätige die Vorschaugrenze, um fortzufahren.",
  },
  es: {
    metaTitle: "Solicita a través de un Ambassador | CRAYS Clubs", navBack: "Volver a Forest City",
    eyebrow: "CRAYS CLUBS · SOLICITUD AMBASSADOR", title: "Llega a través de alguien de confianza.",
    titlePersonalized: "Solicita a través de {name}.",
    intro: "Cuéntanos qué quieres construir, aprender y aportar en Forest City. CRAYS funciona por invitación: los Ambassadors presentan a personas que aportan valor real.",
    previewBadge: "VISTA PREVIA LOCAL", previewNotice: "Solo vista previa. Tu solicitud no se enviará ni guardará.",
    formTitle: "Inicia tu presentación", fullName: "Nombre completo", email: "Correo electrónico",
    basedIn: "¿Dónde vives? (opcional)", interest: "¿Qué te trae a CRAYS?",
    motivation: "¿Por qué quieres unirte?", contribution: "¿Qué aportarás?",
    profileUrl: "URL de perfil o portfolio (opcional)",
    consent: "Entiendo que es una vista previa local y que no se envía ni guarda ninguna solicitud.",
    submit: "Previsualizar solicitud", resultTitle: "Vista previa completa",
    resultBody: "No se envió ni almacenó nada. El flujo real solo se activará tras aprobar privacidad y persistencia.",
    ...sharedValidation,
  },
  ca: {
    metaTitle: "Sol·licita a través d’un Ambassador | CRAYS Clubs", navBack: "Torna a Forest City",
    eyebrow: "CRAYS CLUBS · SOL·LICITUD AMBASSADOR", title: "Arriba a través d’algú de confiança.",
    titlePersonalized: "Sol·licita a través de {name}.",
    intro: "Explica’ns què vols construir, aprendre i aportar a Forest City. CRAYS funciona per invitació: els Ambassadors presenten persones que aporten valor real.",
    previewBadge: "PREVISUALITZACIÓ LOCAL", previewNotice: "Només previsualització. La sol·licitud no s’enviarà ni es desarà.",
    formTitle: "Inicia la teva presentació", fullName: "Nom complet", email: "Correu electrònic",
    basedIn: "On vius? (opcional)", interest: "Què et porta a CRAYS?",
    motivation: "Per què t’hi vols unir?", contribution: "Què hi aportaràs?",
    profileUrl: "URL de perfil o portafoli (opcional)",
    consent: "Entenc que és una previsualització local i que no s’envia ni es desa cap sol·licitud.",
    submit: "Previsualitza la sol·licitud", resultTitle: "Previsualització completa",
    resultBody: "No s’ha enviat ni desat res. El flux real només s’activarà després d’aprovar privacitat i persistència.",
    ...sharedValidation,
  },
  fr: {
    metaTitle: "Postuler via un Ambassador | CRAYS Clubs", navBack: "Retour à Forest City",
    eyebrow: "CRAYS CLUBS · CANDIDATURE AMBASSADOR", title: "Venez par une personne de confiance.",
    titlePersonalized: "Postulez via {name}.",
    intro: "Dites-nous ce que vous voulez construire, apprendre et apporter à Forest City. CRAYS fonctionne sur invitation : les Ambassadors présentent des personnes qui créent une vraie valeur.",
    previewBadge: "APERÇU PRODUIT LOCAL", previewNotice: "Aperçu uniquement. Votre candidature ne sera ni envoyée ni enregistrée.",
    formTitle: "Commencez votre introduction", fullName: "Nom complet", email: "E-mail",
    basedIn: "Où vivez-vous ? (facultatif)", interest: "Qu’est-ce qui vous attire chez CRAYS ?",
    motivation: "Pourquoi voulez-vous nous rejoindre ?", contribution: "Qu’allez-vous apporter ?",
    profileUrl: "URL de profil ou portfolio (facultatif)",
    consent: "Je comprends qu’il s’agit d’un aperçu local et qu’aucune candidature n’est envoyée ni enregistrée.",
    submit: "Prévisualiser la candidature", resultTitle: "Aperçu terminé",
    resultBody: "Rien n’a été envoyé ni stocké. Le parcours réel ne sera activé qu’après validation des règles de confidentialité et de persistance.",
    ...sharedValidation,
  },
  pt: {
    metaTitle: "Candidatar através de um Ambassador | CRAYS Clubs", navBack: "Voltar a Forest City",
    eyebrow: "CRAYS CLUBS · CANDIDATURA AMBASSADOR", title: "Entre através de alguém em quem confia.",
    titlePersonalized: "Candidate-se através de {name}.",
    intro: "Conte-nos o que quer construir, aprender e contribuir em Forest City. A CRAYS funciona por convite: Ambassadors apresentam pessoas que acrescentam valor real.",
    previewBadge: "PRÉ-VISUALIZAÇÃO LOCAL", previewNotice: "Apenas pré-visualização. A candidatura não será enviada nem guardada.",
    formTitle: "Inicie a sua apresentação", fullName: "Nome completo", email: "E-mail",
    basedIn: "Onde vive? (opcional)", interest: "O que o traz à CRAYS?",
    motivation: "Porque quer participar?", contribution: "O que irá contribuir?",
    profileUrl: "URL de perfil ou portefólio (opcional)",
    consent: "Compreendo que esta é uma pré-visualização local e nenhuma candidatura será enviada ou guardada.",
    submit: "Pré-visualizar candidatura", resultTitle: "Pré-visualização concluída",
    resultBody: "Nada foi enviado ou armazenado. O fluxo real só será ativado após aprovação de privacidade e persistência.",
    ...sharedValidation,
  },
  it: {
    metaTitle: "Candidati tramite un Ambassador | CRAYS Clubs", navBack: "Torna a Forest City",
    eyebrow: "CRAYS CLUBS · CANDIDATURA AMBASSADOR", title: "Entra tramite una persona di fiducia.",
    titlePersonalized: "Candidati tramite {name}.",
    intro: "Raccontaci cosa vuoi costruire, imparare e portare a Forest City. CRAYS è su invito: gli Ambassadors presentano persone che creano valore reale.",
    previewBadge: "ANTEPRIMA LOCALE", previewNotice: "Solo anteprima. La candidatura non verrà inviata né salvata.",
    formTitle: "Inizia la tua presentazione", fullName: "Nome completo", email: "E-mail",
    basedIn: "Dove vivi? (facoltativo)", interest: "Cosa ti porta in CRAYS?",
    motivation: "Perché vuoi partecipare?", contribution: "Cosa porterai alla community?",
    profileUrl: "URL profilo o portfolio (facoltativo)",
    consent: "Capisco che questa è un’anteprima locale e nessuna candidatura verrà inviata o salvata.",
    submit: "Anteprima candidatura", resultTitle: "Anteprima completata",
    resultBody: "Nulla è stato inviato o memorizzato. Il flusso reale sarà attivato solo dopo l’approvazione dei gate privacy e persistenza.",
    ...sharedValidation,
  },
};

export function getClubsAmbassadorApplyCopy(locale: ClubsLocale): ClubsAmbassadorApplyCopy {
  return {
    ...copy[locale],
    interests: Object.fromEntries(interestKeys.map((key, index) => [key, interestLabels[locale][index]])),
  };
}