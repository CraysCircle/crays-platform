"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { FamiliesShellCopy } from "./families-copy";
import { JourneyShell } from "./journey-shell";
import * as hospitalityCopyModule from "./hospitality-copy";
import { HOSPITALITY_MEDIA_V2, type HospitalityMediaSlot } from "./hospitality-media-v2";
import {
  getClubsPublicShellCopy,
  getClubsPublicShellLinkLabels,
} from "../public/clubs-public-shell";
import styles from "./hospitality-page.module.css";

type HospitalityLocale = "en" | "de" | "es" | "ca" | "fr" | "pt" | "it";
type AnyRecord = Record<string, any>;
type Boundary = {
  heroLabel: string;
  editorialLabel: string;
  editorialTitle: string;
  editorialBody: string;
  golfBody: string;
  marinaBody: string;
  golfLink: string;
  marinaLink: string;
  evidenceGate: string;
  stateTitle: string;
  stateBody: string;
  states: Array<{ name: string; detail: string; active?: boolean }>;
  formGate: string;
  formGateBody: string;
  legacyPriceNote: string;
  mediaDisclosure: string;
};

const boundaryCopy: Record<HospitalityLocale, Boundary> = {
  en: {
    heroLabel: "Hospitality, connected with care",
    editorialLabel: "Forest City hospitality",
    editorialTitle: "Two distinct detail journeys",
    editorialBody: "This overview is editorial. It does not expose room inventory, dates, prices or availability.",
    golfBody: "Discover the Golf Hotel context here. Any booking function begins only on its dedicated detail journey and remains separate from admission and payment.",
    marinaBody: "Discover the Marina Hotel context here. The journey remains invitation-led and admission-gated; this page does not imply access or availability.",
    golfLink: "Explore the Golf Hotel journey",
    marinaLink: "Explore the Marina Hotel journey",
    evidenceGate: "Named-property media withheld until a CRAYS rights receipt is attached.",
    stateTitle: "One journey, deliberately separate decisions",
    stateBody: "Discovery can inform the next step, but it cannot silently become admission, booking or payment.",
    states: [
      { name: "Discover", detail: "Read the hospitality model and place context.", active: true },
      { name: "Apply or request", detail: "Express interest through an authorised journey only." },
      { name: "Admission", detail: "A separate CRAYS decision; never inferred from interest." },
      { name: "Booking", detail: "Available only on an authorised detail journey." },
      { name: "Payment", detail: "A distinct confirmed transaction, never initiated here." },
    ],
    formGate: "Source-retained intake, currently closed",
    formGateBody: "The complete legacy field purpose is preserved below for parity. No controller, endpoint, upload handling, retention policy or response responsibility is authorised in this scope, so submission is disabled.",
    legacyPriceNote: "Legacy membership option text is retained exactly as source evidence. It is not a current offer, price, inventory statement or checkout control.",
    mediaDisclosure: "Generic editorial media depicts hospitality roles only and does not depict CRAYS, Forest City or a named CRAYS property.",
  },
  de: {
    heroLabel: "Hospitality, sorgfaeltig verbunden",
    editorialLabel: "Hospitality in Forest City",
    editorialTitle: "Zwei getrennte Detailreisen",
    editorialBody: "Diese Uebersicht ist redaktionell. Sie zeigt weder Zimmerbestand noch Daten, Preise oder Verfuegbarkeit.",
    golfBody: "Hier beginnt die Einordnung des Golf Hotels. Eine Buchungsfunktion beginnt ausschliesslich auf der eigenen Detailreise und bleibt von Aufnahme und Zahlung getrennt.",
    marinaBody: "Hier beginnt die Einordnung des Marina Hotels. Die Reise bleibt einladungsgefuehrt und aufnahmegebunden; diese Seite verspricht weder Zugang noch Verfuegbarkeit.",
    golfLink: "Golf-Hotel-Reise entdecken",
    marinaLink: "Marina-Hotel-Reise entdecken",
    evidenceGate: "Medien zum benannten Objekt bleiben gesperrt, bis ein CRAYS-Rechtebeleg vorliegt.",
    stateTitle: "Eine Reise, bewusst getrennte Entscheidungen",
    stateBody: "Entdeckung kann den naechsten Schritt vorbereiten, wird aber niemals stillschweigend zu Aufnahme, Buchung oder Zahlung.",
    states: [
      { name: "Entdecken", detail: "Hospitality-Modell und Ortskontext verstehen.", active: true },
      { name: "Anfragen", detail: "Interesse nur ueber eine autorisierte Reise mitteilen." },
      { name: "Aufnahme", detail: "Eine getrennte CRAYS-Entscheidung, nie aus Interesse abgeleitet." },
      { name: "Buchung", detail: "Nur auf einer autorisierten Detailreise moeglich." },
      { name: "Zahlung", detail: "Eine eigene bestaetigte Transaktion, niemals hier gestartet." },
    ],
    formGate: "Quellengetreuer Intake, derzeit geschlossen",
    formGateBody: "Die vollstaendige Funktion der Legacy-Felder bleibt zur Paritaet erhalten. Controller, Endpoint, Upload-Verarbeitung, Aufbewahrung und Antwortverantwortung sind nicht autorisiert; deshalb ist die Uebermittlung deaktiviert.",
    legacyPriceNote: "Legacy-Mitgliedschaftsoptionen bleiben wortgetreu als Quellenbeleg sichtbar. Sie sind kein aktuelles Angebot, kein Preis, kein Bestand und kein Checkout.",
    mediaDisclosure: "Generische redaktionelle Medien zeigen nur Hospitality-Rollen, nicht CRAYS, Forest City oder ein benanntes CRAYS-Objekt.",
  },
  es: {
    heroLabel: "Hospitality conectada con cuidado",
    editorialLabel: "Hospitality en Forest City",
    editorialTitle: "Dos recorridos de detalle distintos",
    editorialBody: "Esta vista es editorial. No muestra inventario, fechas, precios ni disponibilidad.",
    golfBody: "Descubre aqui el contexto del Golf Hotel. Cualquier reserva comienza solo en su recorrido de detalle y permanece separada de la admision y el pago.",
    marinaBody: "Descubre aqui el contexto del Marina Hotel. El recorrido depende de invitacion y admision; esta pagina no implica acceso ni disponibilidad.",
    golfLink: "Explorar el recorrido del Golf Hotel",
    marinaLink: "Explorar el recorrido del Marina Hotel",
    evidenceGate: "El medio del establecimiento queda bloqueado hasta adjuntar una prueba de derechos de CRAYS.",
    stateTitle: "Un recorrido, decisiones deliberadamente separadas",
    stateBody: "Descubrir puede orientar el siguiente paso, pero nunca se convierte automaticamente en admision, reserva o pago.",
    states: [
      { name: "Descubrir", detail: "Comprender el modelo y el contexto del lugar.", active: true },
      { name: "Solicitar", detail: "Expresar interes solo mediante un recorrido autorizado." },
      { name: "Admision", detail: "Decision separada de CRAYS, nunca inferida del interes." },
      { name: "Reserva", detail: "Solo disponible en un recorrido de detalle autorizado." },
      { name: "Pago", detail: "Transaccion confirmada separada, nunca iniciada aqui." },
    ],
    formGate: "Formulario heredado, actualmente cerrado",
    formGateBody: "Se conserva la funcion completa de los campos para paridad. No hay autoridad para controlador, endpoint, cargas, retencion o respuesta; el envio esta desactivado.",
    legacyPriceNote: "El texto heredado de opciones se conserva como evidencia de fuente. No es una oferta, precio, inventario ni checkout actual.",
    mediaDisclosure: "Las imagenes editoriales genericas solo representan funciones de hospitality; no muestran CRAYS, Forest City ni una propiedad CRAYS.",
  },
  ca: {
    heroLabel: "Hospitality connectada amb cura",
    editorialLabel: "Hospitality a Forest City",
    editorialTitle: "Dos recorreguts de detall diferents",
    editorialBody: "Aquesta vista es editorial. No mostra inventari, dates, preus ni disponibilitat.",
    golfBody: "Descobreix aqui el context del Golf Hotel. Qualsevol reserva comenca nomes al seu recorregut de detall i resta separada de l'admissio i el pagament.",
    marinaBody: "Descobreix aqui el context del Marina Hotel. El recorregut depen d'invitacio i admissio; aquesta pagina no implica acces ni disponibilitat.",
    golfLink: "Explorar el recorregut del Golf Hotel",
    marinaLink: "Explorar el recorregut del Marina Hotel",
    evidenceGate: "El mitja de la propietat queda bloquejat fins que hi hagi una prova de drets de CRAYS.",
    stateTitle: "Un recorregut, decisions deliberadament separades",
    stateBody: "Descobrir pot orientar el pas seguent, pero mai es converteix automaticament en admissio, reserva o pagament.",
    states: [
      { name: "Descobrir", detail: "Entendre el model i el context del lloc.", active: true },
      { name: "Sol.licitar", detail: "Expressar interes nomes mitjancant un recorregut autoritzat." },
      { name: "Admissio", detail: "Decisio separada de CRAYS, mai inferida de l'interes." },
      { name: "Reserva", detail: "Nomes disponible en un recorregut de detall autoritzat." },
      { name: "Pagament", detail: "Transaccio confirmada separada, mai iniciada aqui." },
    ],
    formGate: "Intake heretat, actualment tancat",
    formGateBody: "Es conserva tota la funcio dels camps per paritat. No hi ha autoritat per al controlador, endpoint, carregues, retencio o resposta; l'enviament esta desactivat.",
    legacyPriceNote: "El text heretat de les opcions es conserva com a evidencia. No es una oferta, preu, inventari ni checkout actual.",
    mediaDisclosure: "Les imatges editorials generiques nomes representen funcions de hospitality; no mostren CRAYS, Forest City ni una propietat CRAYS.",
  },
  fr: {
    heroLabel: "Hospitality reliee avec soin",
    editorialLabel: "Hospitality a Forest City",
    editorialTitle: "Deux parcours de detail distincts",
    editorialBody: "Cette vue est editoriale. Elle n'affiche ni inventaire, ni dates, ni prix, ni disponibilite.",
    golfBody: "Decouvrez ici le contexte du Golf Hotel. Toute reservation commence uniquement dans son parcours detaille et reste distincte de l'admission et du paiement.",
    marinaBody: "Decouvrez ici le contexte du Marina Hotel. Le parcours reste sur invitation et soumis a admission; cette page n'implique ni acces ni disponibilite.",
    golfLink: "Explorer le parcours Golf Hotel",
    marinaLink: "Explorer le parcours Marina Hotel",
    evidenceGate: "Le media du lieu nomme reste bloque jusqu'a la fourniture d'une preuve de droits CRAYS.",
    stateTitle: "Un parcours, des decisions volontairement separees",
    stateBody: "La decouverte peut guider l'etape suivante, sans jamais devenir automatiquement admission, reservation ou paiement.",
    states: [
      { name: "Decouvrir", detail: "Comprendre le modele et le contexte du lieu.", active: true },
      { name: "Demander", detail: "Exprimer un interet uniquement dans un parcours autorise." },
      { name: "Admission", detail: "Decision CRAYS separee, jamais deduite de l'interet." },
      { name: "Reservation", detail: "Disponible uniquement dans un parcours detaille autorise." },
      { name: "Paiement", detail: "Transaction confirmee distincte, jamais initiee ici." },
    ],
    formGate: "Intake historique, actuellement ferme",
    formGateBody: "La fonction complete des champs est conservee pour la parite. Aucun controleur, endpoint, traitement d'upload, retention ou responsabilite de reponse n'est autorise; l'envoi est desactive.",
    legacyPriceNote: "Le texte historique des options reste visible comme preuve source. Il ne constitue ni offre, ni prix, ni inventaire, ni checkout actuel.",
    mediaDisclosure: "Les medias editoriaux generiques illustrent uniquement des roles hospitality; ils ne montrent ni CRAYS, ni Forest City, ni un lieu CRAYS.",
  },
  pt: {
    heroLabel: "Hospitality ligada com cuidado",
    editorialLabel: "Hospitality em Forest City",
    editorialTitle: "Dois percursos de detalhe distintos",
    editorialBody: "Esta visao e editorial. Nao apresenta inventario, datas, precos ou disponibilidade.",
    golfBody: "Descubra aqui o contexto do Golf Hotel. Qualquer reserva comeca apenas no percurso de detalhe e permanece separada de admissao e pagamento.",
    marinaBody: "Descubra aqui o contexto do Marina Hotel. O percurso depende de convite e admissao; esta pagina nao implica acesso ou disponibilidade.",
    golfLink: "Explorar o percurso Golf Hotel",
    marinaLink: "Explorar o percurso Marina Hotel",
    evidenceGate: "A imagem da propriedade permanece bloqueada ate existir comprovativo de direitos CRAYS.",
    stateTitle: "Um percurso, decisoes deliberadamente separadas",
    stateBody: "A descoberta pode orientar o passo seguinte, mas nunca se transforma automaticamente em admissao, reserva ou pagamento.",
    states: [
      { name: "Descobrir", detail: "Compreender o modelo e o contexto do lugar.", active: true },
      { name: "Solicitar", detail: "Manifestar interesse apenas num percurso autorizado." },
      { name: "Admissao", detail: "Decisao CRAYS separada, nunca inferida do interesse." },
      { name: "Reserva", detail: "Disponivel apenas num percurso de detalhe autorizado." },
      { name: "Pagamento", detail: "Transacao confirmada distinta, nunca iniciada aqui." },
    ],
    formGate: "Intake herdado, atualmente fechado",
    formGateBody: "A funcao completa dos campos e preservada para paridade. Nao existe autoridade para controlador, endpoint, uploads, retencao ou resposta; o envio esta desativado.",
    legacyPriceNote: "O texto herdado das opcoes permanece como evidencia da fonte. Nao e oferta, preco, inventario ou checkout atual.",
    mediaDisclosure: "As imagens editoriais genericas representam apenas funcoes de hospitality; nao mostram CRAYS, Forest City ou uma propriedade CRAYS.",
  },
  it: {
    heroLabel: "Hospitality connessa con cura",
    editorialLabel: "Hospitality a Forest City",
    editorialTitle: "Due percorsi di dettaglio distinti",
    editorialBody: "Questa panoramica e editoriale. Non mostra inventario, date, prezzi o disponibilita.",
    golfBody: "Scopri qui il contesto del Golf Hotel. Ogni prenotazione inizia solo nel percorso di dettaglio e resta separata da ammissione e pagamento.",
    marinaBody: "Scopri qui il contesto del Marina Hotel. Il percorso dipende da invito e ammissione; questa pagina non implica accesso o disponibilita.",
    golfLink: "Esplora il percorso Golf Hotel",
    marinaLink: "Esplora il percorso Marina Hotel",
    evidenceGate: "Il media della struttura resta bloccato finche non viene allegata una prova dei diritti CRAYS.",
    stateTitle: "Un percorso, decisioni volutamente separate",
    stateBody: "La scoperta puo orientare il passo successivo, ma non diventa mai automaticamente ammissione, prenotazione o pagamento.",
    states: [
      { name: "Scopri", detail: "Comprendi il modello e il contesto del luogo.", active: true },
      { name: "Richiedi", detail: "Esprimi interesse solo tramite un percorso autorizzato." },
      { name: "Ammissione", detail: "Decisione CRAYS separata, mai dedotta dall'interesse." },
      { name: "Prenotazione", detail: "Disponibile solo in un percorso di dettaglio autorizzato." },
      { name: "Pagamento", detail: "Transazione confermata distinta, mai avviata qui." },
    ],
    formGate: "Intake storico, attualmente chiuso",
    formGateBody: "La funzione completa dei campi resta per parita. Non esiste autorita per controller, endpoint, upload, conservazione o risposta; l'invio e disattivato.",
    legacyPriceNote: "Il testo storico delle opzioni resta come prova della fonte. Non e un'offerta, prezzo, inventario o checkout attuale.",
    mediaDisclosure: "I media editoriali generici rappresentano solo ruoli hospitality; non mostrano CRAYS, Forest City o una struttura CRAYS.",
  },
};

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function resolveCopy(locale: HospitalityLocale): AnyRecord {
  const source = hospitalityCopyModule as unknown as AnyRecord;
  for (const key of ["hospitalityCopy", "hospitalityCopyByLocale", "HOSPITALITY_COPY", "copyByLocale"]) {
    if (isRecord(source[key]) && isRecord(source[key][locale])) return source[key][locale];
  }
  for (const key of ["getHospitalityCopy", "resolveHospitalityCopy"]) {
    if (typeof source[key] === "function") {
      const value = source[key](locale);
      if (isRecord(value)) return value;
    }
  }
  throw new Error(`Hospitality copy is unavailable for locale: ${locale}`);
}
function directStrings(record: AnyRecord): Array<[string, string]> {
  return Object.entries(record).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0,
  );
}
function findText(record: AnyRecord, pattern: RegExp): string | undefined {
  const direct = directStrings(record).find(([key]) => pattern.test(key));
  if (direct) return direct[1];
  for (const [key, value] of Object.entries(record)) {
    if (isRecord(value)) {
      const nested = findText(value, pattern);
      if (nested) return nested;
    }
    if (Array.isArray(value) && pattern.test(key)) {
      const first = value.find((item) => typeof item === "string");
      if (typeof first === "string") return first;
    }
  }
}
function findStringArray(record: AnyRecord, pattern: RegExp): string[] {
  for (const [key, value] of Object.entries(record)) {
    if (pattern.test(key) && Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === "string");
      if (strings.length) return strings;
    }
    if (isRecord(value)) {
      const nested = findStringArray(value, pattern);
      if (nested.length) return nested;
    }
  }
  return [];
}
function nestedCopyItems(record: AnyRecord): AnyRecord[] {
  const result: AnyRecord[] = [];
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) for (const item of value) if (isRecord(item)) result.push(item);
    else if (isRecord(value) && directStrings(value).length) result.push(value);
  }
  return result;
}
function modelSection(record: AnyRecord) {
  const entries = directStrings(record);
  const eyebrow = findText(record, /^(eyebrow|kicker|overline|label)$/i);
  const title = findText(record, /^(title|heading)$/i) ?? entries.find(([key]) => /title|heading/i.test(key))?.[1] ?? entries[0]?.[1] ?? "";
  const actions = /(cta|action|button|link|primary|secondary|alliance|explore)/i;
  const reserved = /(eyebrow|kicker|overline|title|heading)/i;
  return {
    eyebrow,
    title,
    paragraphs: entries.filter(([key, value]) => !reserved.test(key) && !actions.test(key) && value !== title).map(([, value]) => value),
    actions: entries.filter(([key]) => actions.test(key)).map(([, value]) => value),
    items: nestedCopyItems(record),
  };
}

function CopyItem({ item, index }: { item: AnyRecord; index: number }) {
  const values = directStrings(item);
  const title = findText(item, /^(title|heading|name|label)$/i) ?? values[0]?.[1] ?? "";
  const details = values.filter(([, value]) => value !== title).map(([, value]) => value);
  const lists = Object.values(item).filter(
    (value): value is string[] => Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string"),
  );
  return (
    <article className={styles.copyItem}>
      <span className={styles.itemIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <h3 className={styles.itemTitle}>{title}</h3>
      {details.map((detail, detailIndex) => <p className={styles.itemText} key={`${index}-detail-${detailIndex}`}>{detail}</p>)}
      {lists.map((list, listIndex) => <ul className={styles.itemList} key={`${index}-list-${listIndex}`}>{list.map((entry) => <li key={entry}>{entry}</li>)}</ul>)}
    </article>
  );
}
function Media({ slot, className }: { slot: HospitalityMediaSlot; className?: string }) {
  const style = slot.approved && slot.url ? ({ backgroundImage: `url("${slot.url}")` } as CSSProperties) : undefined;
  return (
    <figure className={`${styles.mediaFrame} ${className ?? ""}`}>
      {style
        ? <div className={styles.mediaImage} style={style} role="img" aria-label={slot.alt} />
        : <div className={styles.mediaPlaceholder} role="status"><span>{slot.statusLabel}</span></div>}
      <figcaption className={styles.mediaCredit}>{slot.approved ? slot.caption : slot.blockedReason}</figcaption>
    </figure>
  );
}
function Chapter({ id, data, media, tone = "light", children }: {
  id: string;
  data: AnyRecord;
  media?: HospitalityMediaSlot;
  tone?: "light" | "blue" | "navy";
  children?: ReactNode;
}) {
  const section = modelSection(data);
  const toneClass = tone === "navy" ? styles.chapterNavy : tone === "blue" ? styles.chapterBlue : styles.chapterLight;
  return (
    <section className={`${styles.chapter} ${toneClass}`} id={id}>
      <div className={styles.chapterGrid}>
        <header className={styles.chapterIntro}>
          {section.eyebrow && <p className={styles.sectionTag}>{section.eyebrow}</p>}
          <h2 className={styles.chapterTitle}>{section.title}</h2>
          <div className={styles.prose}>{section.paragraphs.map((paragraph, index) => <p key={`${id}-paragraph-${index}`}>{paragraph}</p>)}</div>
        </header>
        {media && <Media slot={media} className={styles.chapterMedia} />}
      </div>
      {section.items.length > 0 && <div className={styles.itemRail}>{section.items.map((item, index) => <CopyItem item={item} index={index} key={`${id}-item-${index}`} />)}</div>}
      {children}
    </section>
  );
}
function DisabledIntake({ form, boundary }: { form: AnyRecord; boundary: Boundary }) {
  const model = modelSection(form);
  const languages = findStringArray(form, /language/i);
  const regions = findStringArray(form, /(region|place)/i);
  const memberships = findStringArray(form, /membership/i);
  const statuses = directStrings(form).filter(([key]) => /(success|error|response|status)/i.test(key)).map(([, value]) => value);
  const label = (pattern: RegExp, fallback: string) => findText(form, pattern) ?? fallback;
  return (
    <section className={styles.formSection} id="hospitality-intake" aria-labelledby="hospitality-intake-title">
      <header className={styles.formHeader}>
        <p className={styles.sectionTag}>{boundary.formGate}</p>
        <h2 id="hospitality-intake-title">{model.title || "Hospitality Brand Alliance"}</h2>
        {model.paragraphs.map((paragraph, index) => <p key={`form-copy-${index}`}>{paragraph}</p>)}
      </header>
      <div className={styles.formBoundary}><p>{boundary.formGateBody}</p><p className={styles.sourcePriceNote}>{boundary.legacyPriceNote}</p></div>
      {languages.length > 0 && <div className={styles.languageRail} aria-label="Source-retained form languages">{languages.map((language) => <span key={language}>{language}</span>)}</div>}
      <form className={styles.intakeForm} aria-describedby="hospitality-form-gate">
        <p className={styles.srOnly} id="hospitality-form-gate">{boundary.formGateBody}</p>
        <fieldset className={styles.fieldset} disabled>
          <legend className={styles.srOnly}>{model.title || "Hospitality Brand Alliance"}</legend>
          <div className={styles.fieldGrid}>
            <label className={styles.field}><span>{label(/email/i, "Email")}</span><input className={styles.input} type="email" autoComplete="email" /></label>
            <label className={styles.field}><span>{label(/(current.*job|job)/i, "Current job")}</span><input className={styles.input} type="text" autoComplete="organization-title" /></label>
            <label className={styles.field}><span>{label(/(residence|location)/i, "Current residence")}</span><input className={styles.input} type="text" autoComplete="country-name" /></label>
            <label className={styles.field}><span>{label(/(region|place)/i, "Favourable places")}</span><select className={styles.select} defaultValue=""><option value="">--</option>{regions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>{label(/membership/i, "Membership")}</span>
              <select className={styles.select} defaultValue=""><option value="">--</option>{(memberships.length ? memberships : ["Fashion Membership - 1.850€", "Sphere Membership - 2.500€", "Falcon Membership - 3.750€"]).map((option) => <option value={option} key={option}>{option}</option>)}</select>
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}><span>{label(/(upload|image|blueprint)/i, "Image / blueprint upload")}</span><input className={styles.input} type="file" /></label>
            <label className={`${styles.checkboxGroup} ${styles.fieldWide}`}><input className={styles.checkbox} type="checkbox" /><span>{label(/(terms|consent|agree)/i, "Terms acknowledgement")}</span></label>
          </div>
          <button className={styles.submit} type="submit" disabled>{model.actions[0] ?? boundary.formGate}</button>
        </fieldset>
      </form>
      {statuses.length > 0 && <div className={styles.statusList} aria-label="Source-retained response states">{statuses.map((entry) => <p key={entry}>{entry}</p>)}</div>}
    </section>
  );
}

export function HospitalityPage({ locale }: { locale: HospitalityLocale }) {
  const copy = resolveCopy(locale);
  const boundary = boundaryCopy[locale];
  const hero = modelSection(copy.hero ?? {});
  const promise = modelSection(copy.promise ?? {});
  const publicCopy = getClubsPublicShellCopy(locale);
  const labels = getClubsPublicShellLinkLabels(locale);
  const localizedShell: FamiliesShellCopy = {
    skip: publicCopy.skip,
    menu: publicCopy.menuTitle,
    close: publicCopy.close,
    primaryNav: publicCopy.primaryNav,
    footerNav: publicCopy.primaryNav,
    about: labels.about,
    lifestyle: labels.lifestyle,
    hospitality: labels.hospitality,
    community: labels.communityLife,
    families: labels.families,
    teams: labels.teams,
    events: labels.events,
    companies: labels.portfolioCompanies,
    conference: labels.conference,
    ambassadors: labels.ambassadors,
    membership: publicCopy.footerCta,
    contact: labels.contact,
    brandService: labels.brandService,
    account: labels.account,
    legal: labels.legal,
    association: labels.association,
    associationNote: publicCopy.associationLayer,
    footerLine: publicCopy.footerHeadline,
    siteNote: publicCopy.rights,
  };
  const shell = locale === "en" ? copy.shell : localizedShell;
  return (
    <JourneyShell locale={locale} copy={shell}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroBackdrop} aria-hidden="true" />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{hero.eyebrow ?? boundary.heroLabel}</p>
              <h1 className={styles.heroTitle}>{hero.title || "Crays Hospitality"}</h1>
              <div className={styles.heroBody}>{hero.paragraphs.map((paragraph, index) => <p key={`hero-paragraph-${index}`}>{paragraph}</p>)}</div>
              <div className={styles.heroActions}>
                <a className={styles.primaryAction} href="#hospitality-intake">{hero.actions[0] ?? "Hospitality Brand Alliance"}</a>
                <a className={styles.secondaryAction} href="#hospitality-model">{hero.actions[1] ?? "Explore the model"}</a>
              </div>
            </div>
            <div className={styles.collage} aria-label={boundary.mediaDisclosure}>
              <Media slot={HOSPITALITY_MEDIA_V2.arrival} className={styles.collageTall} />
              <Media slot={HOSPITALITY_MEDIA_V2.coffee} className={styles.collageSmall} />
              <Media slot={HOSPITALITY_MEDIA_V2.lounge} className={styles.collageWide} />
            </div>
          </div>
          <p className={styles.mediaDisclosure}>{boundary.mediaDisclosure}</p>
        </section>

        <section className={styles.propertyBand} aria-labelledby="forest-city-hospitality">
          <header className={styles.propertyHeader}>
            <p className={styles.sectionTag}>{boundary.editorialLabel}</p>
            <h2 id="forest-city-hospitality">{boundary.editorialTitle}</h2>
            <p>{boundary.editorialBody}</p>
          </header>
          <div className={styles.propertyGrid}>
            <article className={styles.propertyStory}>
              <Media slot={HOSPITALITY_MEDIA_V2.golfHotel} className={styles.propertyMedia} />
              <div className={styles.propertyContent}>
                <p className={styles.propertyMeta}>Golf Hotel / editorial discovery</p>
                <h3>Golf Hotel</h3>
                <p>{boundary.golfBody}</p>
                <Link className={styles.propertyLink} href={`/${locale}/hospitality/golf`}>{boundary.golfLink}</Link>
                <p className={styles.evidenceGate}>{boundary.evidenceGate}</p>
              </div>
            </article>
            <article className={`${styles.propertyStory} ${styles.propertyStoryReverse}`}>
              <Media slot={HOSPITALITY_MEDIA_V2.marinaHotel} className={styles.propertyMedia} />
              <div className={styles.propertyContent}>
                <p className={styles.propertyMeta}>Marina Hotel / invitation-led discovery</p>
                <h3>Marina Hotel</h3>
                <p>{boundary.marinaBody}</p>
                <Link className={styles.propertyLink} href={`/${locale}/hospitality/marina`}>{boundary.marinaLink}</Link>
                <p className={styles.evidenceGate}>{boundary.evidenceGate}</p>
              </div>
            </article>
          </div>
        </section>

        <Chapter id="hospitality-model" data={copy.journey ?? {}} media={HOSPITALITY_MEDIA_V2.reception} />
        <Chapter id="hospitality-engine" data={copy.engine ?? {}} media={HOSPITALITY_MEDIA_V2.terrace} tone="navy" />
        <Chapter id="hospitality-culture" data={copy.culture ?? {}} media={HOSPITALITY_MEDIA_V2.dining} tone="blue" />
        <Chapter id="hospitality-guest-flow" data={copy.guestFlow ?? {}}>
          <div className={styles.stateBoundary}>
            <div className={styles.stateIntro}><p className={styles.sectionTag}>State boundary</p><h3>{boundary.stateTitle}</h3><p>{boundary.stateBody}</p></div>
            <ol className={styles.stateRail}>{boundary.states.map((state, index) => (
              <li className={state.active ? styles.stateActive : styles.statePending} key={state.name}>
                <span className={styles.stateNumber}>{String(index + 1).padStart(2, "0")}</span><strong>{state.name}</strong><p>{state.detail}</p>
              </li>
            ))}</ol>
          </div>
        </Chapter>
        <Chapter id="hospitality-operator" data={copy.operator ?? {}} tone="blue" />
        <Chapter id="hospitality-digital" data={copy.digital ?? {}} tone="navy" />

        <section className={styles.promise} id="hospitality-promise">
          <div className={styles.promiseInner}>
            {promise.eyebrow && <p className={styles.sectionTag}>{promise.eyebrow}</p>}
            <h2>{promise.title}</h2>
            <div className={styles.prose}>{promise.paragraphs.map((paragraph, index) => <p key={`promise-paragraph-${index}`}>{paragraph}</p>)}</div>
            <div className={styles.promiseActions}>
              <a className={styles.primaryAction} href="#hospitality-intake">{promise.actions[0] ?? "Start Project Intake"}</a>
              <Link className={styles.secondaryAction} href={`/${locale}/contact`}>{promise.actions[1] ?? "Talk to Crays"}</Link>
            </div>
          </div>
        </section>
        <DisabledIntake form={copy.form ?? {}} boundary={boundary} />
      </main>
    </JourneyShell>
  );
}
export default HospitalityPage;
