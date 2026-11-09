import type { Metadata } from "next";
import { clubsSocialPath } from "./social-images";
import socialDimensions from "./social-image-dimensions.json";
import { clubsEditorialMetadata } from "./seo-editorial";

import {
  CLUBS_LOCALES,
  CLUBS_PUBLIC_RUNTIME_CONTRACT,
  clubsCanonicalUrl,
  type ClubsLocale,
} from "./public-site";

export const CLUBS_SEO_ORIGIN = `https://${CLUBS_PUBLIC_RUNTIME_CONTRACT.canonicalHost}`;
export const CLUBS_SEO_SOCIAL_IMAGE =
  `${CLUBS_SEO_ORIGIN}/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-city-aerial.webp`;
export const CLUBS_HOME_SOCIAL_IMAGE =
  `${CLUBS_SEO_ORIGIN}/__crays-clubs/social/crays-community-preview-20261010.png`;
const CLUBS_HOME_SOCIAL_ALT:Record<ClubsLocale,string>={en:"CRAYS community together at Forest City",de:"CRAYS-Gemeinschaft zusammen in Forest City",es:"La comunidad CRAYS reunida en Forest City",ca:"La comunitat CRAYS reunida a Forest City",fr:"La communauté CRAYS réunie à Forest City",pt:"A comunidade CRAYS reunida em Forest City",it:"La community CRAYS riunita a Forest City"};
export const CLUBS_SEO_LAST_SIGNIFICANT_UPDATE = "2026-10-10";

export const CLUBS_INDEXABLE_LOCALIZED_ROUTES = [
  "",
  "about-us",
  "become-a-member",
  "community-life",
  "contact",
  "experiences",
  "families",
  "discover",
  "hospitality",
  "hospitality/golf-hotel",
  "hospitality/marina-hotel",
  "host-company",
  "legal",
  "legal/data-protection",
  "legal/imprint",
  "legal/privacy-policy",
  "legal/terms-and-conditions",
  "lifestyle",
  "school-jobs",
  "teams",
  "this-your-kinda-crowd",
  "ambassadors",
  "agentic-life",
  "brand-as-a-service",
] as const;

const localeDescriptions: Readonly<Record<ClubsLocale, string>> = {
  en: "A private members club and work-live community in Forest City, Malaysia, for founders, remote professionals, creators and families.",
  de: "Ein privater Mitgliederclub und eine Work-Live-Community in Forest City, Malaysia, für Gründer, Remote-Professionals, Kreative und Familien.",
  es: "Un club privado y una comunidad para vivir y trabajar en Forest City, Malasia, para fundadores, profesionales remotos, creadores y familias.",
  ca: "Un club privat i una comunitat per viure i treballar a Forest City, Malàisia, per a fundadors, professionals remots, creadors i famílies.",
  fr: "Un club privé et une communauté pour vivre et travailler à Forest City, en Malaisie, destinés aux fondateurs, professionnels à distance, créateurs et familles.",
  pt: "Um clube privado e uma comunidade para viver e trabalhar em Forest City, Malásia, para fundadores, profissionais remotos, criadores e famílias.",
  it: "Un club privato e una community per vivere e lavorare a Forest City, in Malesia, per founder, professionisti da remoto, creator e famiglie.",
};

const localeOpenGraph: Readonly<Record<ClubsLocale, string>> = {
  en: "en_US",
  de: "de_DE",
  es: "es_ES",
  ca: "ca_ES",
  fr: "fr_FR",
  pt: "pt_PT",
  it: "it_IT",
};

const titleOverrides: Readonly<
  Record<ClubsLocale, Readonly<Record<string, string>>>
> = {
  en: {
    "": "Private Members Club in Forest City, Malaysia | CRAYS",
    "about-us": "About CRAYS Clubs | Private Members Club in Forest City",
    "become-a-member": "Join CRAYS Club Forest City | Membership",
    "community-life": "Coworking & Community in Forest City | CRAYS Clubs",
    contact: "Contact CRAYS Club Forest City",
    families: "Family Life in Forest City, Malaysia | CRAYS Clubs",
    "discover": "Living & Working in Forest City, Malaysia | CRAYS Clubs",
    hospitality: "Forest City Hotels & Member Stays | CRAYS Clubs",
    "host-company": "Company Residencies in Forest City, Malaysia | CRAYS",
    lifestyle: "Coliving, Coworking & Community in Malaysia | CRAYS Clubs",
    "school-jobs": "Jobs, Skills & Founder Opportunities | CRAYS Clubs",
    teams: "Team Offsites in Forest City, Malaysia | CRAYS Clubs",
    legal: "Legal Information | CRAYS Clubs",
    "legal/data-protection": "Data Protection | CRAYS Clubs",
    "legal/imprint": "Legal Notice & Imprint | CRAYS Clubs",
    "legal/privacy-policy": "Privacy Policy | CRAYS Clubs",
    "legal/terms-and-conditions": "Terms & Conditions | CRAYS Clubs",
  },
  de: {
    "": "Privater Mitgliederclub in Forest City, Malaysia | CRAYS",
    "about-us": "Über CRAYS Clubs | Privater Mitgliederclub in Forest City",
    "become-a-member": "Mitglied im CRAYS Club Forest City werden",
    "community-life": "Coworking & Gemeinschaft in Forest City | CRAYS Clubs",
    contact: "CRAYS Club Forest City kontaktieren",
    families: "Familienleben in Forest City, Malaysia | CRAYS Clubs",
    "discover": "Leben & Arbeiten in Forest City, Malaysia | CRAYS Clubs",
    hospitality: "Hotels & Mitgliederaufenthalte in Forest City | CRAYS Clubs",
    "host-company": "Firmen-Residencies in Forest City, Malaysia | CRAYS",
    lifestyle: "Coliving, Coworking & Gemeinschaft in Malaysia | CRAYS Clubs",
    "school-jobs": "Jobs, Skills & Gründerchancen | CRAYS Clubs",
    teams: "Team-Offsites in Forest City, Malaysia | CRAYS Clubs",
    legal: "Rechtliche Hinweise | CRAYS Clubs",
    "legal/data-protection": "Datenschutz | CRAYS Clubs",
    "legal/imprint": "Impressum | CRAYS Clubs",
    "legal/privacy-policy": "Datenschutzerklärung | CRAYS Clubs",
    "legal/terms-and-conditions": "Allgemeine Geschäftsbedingungen | CRAYS Clubs",
  },
  es: {
    "": "Club privado en Forest City, Malasia | CRAYS",
    "about-us": "Sobre CRAYS Clubs | Club privado en Forest City",
    "become-a-member": "Hazte miembro de CRAYS Club Forest City",
    "community-life": "Coworking y comunidad en Forest City | CRAYS Clubs",
    contact: "Contactar con CRAYS Club Forest City",
    families: "Vida familiar en Forest City, Malasia | CRAYS Clubs",
    "discover": "Vivir y trabajar en Forest City, Malasia | CRAYS Clubs",
    hospitality: "Hoteles y estancias en Forest City | CRAYS Clubs",
    "host-company": "Residencias para empresas en Forest City | CRAYS",
    lifestyle: "Coliving, coworking y comunidad en Malasia | CRAYS Clubs",
    "school-jobs": "Empleo, habilidades y oportunidades | CRAYS Clubs",
    teams: "Retiros de equipo en Forest City, Malasia | CRAYS Clubs",
    legal: "Información legal | CRAYS Clubs",
    "legal/data-protection": "Protección de datos | CRAYS Clubs",
    "legal/imprint": "Aviso legal | CRAYS Clubs",
    "legal/privacy-policy": "Política de privacidad | CRAYS Clubs",
    "legal/terms-and-conditions": "Términos y condiciones | CRAYS Clubs",
  },
  ca: {
    "": "Club privat a Forest City, Malàisia | CRAYS",
    "about-us": "Sobre CRAYS Clubs | Club privat a Forest City",
    "become-a-member": "Fes-te membre de CRAYS Club Forest City",
    "community-life": "Coworking i comunitat a Forest City | CRAYS Clubs",
    contact: "Contacta amb CRAYS Club Forest City",
    families: "Vida familiar a Forest City, Malàisia | CRAYS Clubs",
    "discover": "Viure i treballar a Forest City, Malàisia | CRAYS Clubs",
    hospitality: "Hotels i estades a Forest City | CRAYS Clubs",
    "host-company": "Residències d'empresa a Forest City | CRAYS",
    lifestyle: "Coliving, coworking i comunitat a Malàisia | CRAYS Clubs",
    "school-jobs": "Feina, habilitats i oportunitats | CRAYS Clubs",
    teams: "Retirs d'equip a Forest City, Malàisia | CRAYS Clubs",
    legal: "Informació legal | CRAYS Clubs",
    "legal/data-protection": "Protecció de dades | CRAYS Clubs",
    "legal/imprint": "Avís legal | CRAYS Clubs",
    "legal/privacy-policy": "Política de privacitat | CRAYS Clubs",
    "legal/terms-and-conditions": "Termes i condicions | CRAYS Clubs",
  },
  fr: {
    "": "Club privé à Forest City, Malaisie | CRAYS",
    "about-us": "À propos de CRAYS Clubs | Club privé à Forest City",
    "become-a-member": "Devenir membre du CRAYS Club Forest City",
    "community-life": "Coworking et communauté à Forest City | CRAYS Clubs",
    contact: "Contacter CRAYS Club Forest City",
    families: "Vie de famille à Forest City, Malaisie | CRAYS Clubs",
    "discover": "Vivre et travailler à Forest City, Malaisie | CRAYS Clubs",
    hospitality: "Hôtels et séjours à Forest City | CRAYS Clubs",
    "host-company": "Résidences d'entreprise à Forest City | CRAYS",
    lifestyle: "Coliving, coworking et communauté en Malaisie | CRAYS Clubs",
    "school-jobs": "Emplois, compétences et opportunités | CRAYS Clubs",
    teams: "Séminaires d'équipe à Forest City, Malaisie | CRAYS Clubs",
    legal: "Informations légales | CRAYS Clubs",
    "legal/data-protection": "Protection des données | CRAYS Clubs",
    "legal/imprint": "Mentions légales | CRAYS Clubs",
    "legal/privacy-policy": "Politique de confidentialité | CRAYS Clubs",
    "legal/terms-and-conditions": "Conditions générales | CRAYS Clubs",
  },
  pt: {
    "": "Clube privado em Forest City, Malásia | CRAYS",
    "about-us": "Sobre os CRAYS Clubs | Clube privado em Forest City",
    "become-a-member": "Torne-se membro do CRAYS Club Forest City",
    "community-life": "Coworking e comunidade em Forest City | CRAYS Clubs",
    contact: "Contactar o CRAYS Club Forest City",
    families: "Vida familiar em Forest City, Malásia | CRAYS Clubs",
    "discover": "Viver e trabalhar em Forest City, Malásia | CRAYS Clubs",
    hospitality: "Hotéis e estadias em Forest City | CRAYS Clubs",
    "host-company": "Residências empresariais em Forest City | CRAYS",
    lifestyle: "Coliving, coworking e comunidade na Malásia | CRAYS Clubs",
    "school-jobs": "Emprego, competências e oportunidades | CRAYS Clubs",
    teams: "Retiros de equipa em Forest City, Malásia | CRAYS Clubs",
    legal: "Informação legal | CRAYS Clubs",
    "legal/data-protection": "Proteção de dados | CRAYS Clubs",
    "legal/imprint": "Identificação legal e contactos | CRAYS Clubs",
    "legal/privacy-policy": "Política de privacidade | CRAYS Clubs",
    "legal/terms-and-conditions": "Termos e condições | CRAYS Clubs",
  },
  it: {
    "": "Club privato a Forest City, Malesia | CRAYS",
    "about-us": "Chi siamo | CRAYS Clubs Forest City",
    "become-a-member": "Diventa membro del CRAYS Club Forest City",
    "community-life": "Coworking e community a Forest City | CRAYS Clubs",
    contact: "Contatta CRAYS Club Forest City",
    families: "Vita familiare a Forest City, Malesia | CRAYS Clubs",
    "discover": "Vivere e lavorare a Forest City, Malesia | CRAYS Clubs",
    hospitality: "Hotel e soggiorni a Forest City | CRAYS Clubs",
    "host-company": "Residenze aziendali a Forest City | CRAYS",
    lifestyle: "Coliving, coworking e community in Malesia | CRAYS Clubs",
    "school-jobs": "Lavoro, competenze e opportunità | CRAYS Clubs",
    teams: "Ritiri aziendali a Forest City, Malesia | CRAYS Clubs",
    legal: "Informazioni legali | CRAYS Clubs",
    "legal/data-protection": "Protezione dei dati | CRAYS Clubs",
    "legal/imprint": "Note legali | CRAYS Clubs",
    "legal/privacy-policy": "Informativa sulla privacy | CRAYS Clubs",
    "legal/terms-and-conditions": "Termini e condizioni | CRAYS Clubs",
  },
};

const descriptionOverrides: Readonly<
  Record<ClubsLocale, Readonly<Record<string, string>>>
> = {
  en: {
    "about-us": "Learn how CRAYS is building a private members club and real-world community for founders, remote professionals, creators and families in Forest City, Malaysia.",
    "become-a-member": "Explore CRAYS Club membership for living, coworking, events, hospitality and community in Forest City, Malaysia.",
    legal: "Access the legal information, privacy terms, data protection notices and membership conditions for CRAYS Clubs.",
    "legal/data-protection": "Learn how CRAYS Clubs protects personal data and which safeguards apply to members, applicants and website visitors.",
    "legal/imprint": "Company, association and contact details for the organisations responsible for CRAYS Clubs and this website.",
    "legal/privacy-policy": "Read how CRAYS Clubs collects, uses, stores and protects personal data when you use our website and services.",
    "legal/terms-and-conditions": "Read the terms and conditions governing CRAYS Clubs memberships, applications, bookings and related services.",
  },
  de: {
    "about-us": "Erfahre, wie CRAYS in Forest City einen privaten Mitgliederclub und eine reale Gemeinschaft für Gründer, Remote-Professionals, Kreative und Familien aufbaut.",
    "become-a-member": "Entdecke die CRAYS-Clubmitgliedschaft für Wohnen, Coworking, Events, Hospitality und Gemeinschaft in Forest City, Malaysia.",
    legal: "Rechtliche Informationen, Datenschutzbestimmungen und Mitgliedschaftsbedingungen der CRAYS Clubs im Überblick.",
    "legal/data-protection": "Erfahre, wie CRAYS Clubs personenbezogene Daten von Mitgliedern, Bewerbern und Websitebesuchern schützt.",
    "legal/imprint": "Unternehmens-, Vereins- und Kontaktdaten der für CRAYS Clubs und diese Website verantwortlichen Organisationen.",
    "legal/privacy-policy": "Erfahre, wie CRAYS Clubs personenbezogene Daten bei der Nutzung der Website und Services erhebt, nutzt, speichert und schützt.",
    "legal/terms-and-conditions": "Lies die Bedingungen für Mitgliedschaften, Bewerbungen, Buchungen und verbundene Leistungen der CRAYS Clubs.",
  },
  es: {
    "about-us": "Descubre cómo CRAYS crea en Forest City un club privado y una comunidad real para fundadores, profesionales remotos, creadores y familias.",
    "become-a-member": "Explora la membresía de CRAYS Club para vivir, trabajar, asistir a eventos y formar parte de la comunidad en Forest City, Malasia.",
    legal: "Consulta la información legal, privacidad, protección de datos y condiciones de membresía de CRAYS Clubs.",
    "legal/data-protection": "Descubre cómo CRAYS Clubs protege los datos personales de miembros, solicitantes y visitantes del sitio web.",
    "legal/imprint": "Datos societarios, de la asociación y de contacto de las organizaciones responsables de CRAYS Clubs y este sitio web.",
    "legal/privacy-policy": "Consulta cómo CRAYS Clubs recopila, utiliza, almacena y protege datos personales al usar el sitio web y los servicios.",
    "legal/terms-and-conditions": "Lee las condiciones que regulan membresías, solicitudes, reservas y servicios relacionados de CRAYS Clubs.",
  },
  ca: {
    "about-us": "Descobreix com CRAYS crea a Forest City un club privat i una comunitat real per a fundadors, professionals remots, creadors i famílies.",
    "become-a-member": "Explora la membresia de CRAYS Club per viure, treballar, assistir a esdeveniments i formar part de la comunitat a Forest City, Malàisia.",
    legal: "Consulta la informació legal, la privacitat, la protecció de dades i les condicions de membresia de CRAYS Clubs.",
    "legal/data-protection": "Descobreix com CRAYS Clubs protegeix les dades personals de membres, sol·licitants i visitants del web.",
    "legal/imprint": "Dades de l'empresa, l'associació i contacte de les organitzacions responsables de CRAYS Clubs i aquest web.",
    "legal/privacy-policy": "Consulta com CRAYS Clubs recull, utilitza, emmagatzema i protegeix dades personals en utilitzar el web i els serveis.",
    "legal/terms-and-conditions": "Llegeix les condicions que regulen les membresies, sol·licituds, reserves i serveis relacionats de CRAYS Clubs.",
  },
  fr: {
    "about-us": "Découvrez comment CRAYS développe à Forest City un club privé et une communauté réelle pour fondateurs, professionnels à distance, créateurs et familles.",
    "become-a-member": "Découvrez l'adhésion au CRAYS Club pour vivre, travailler, participer à des événements et rejoindre la communauté de Forest City, en Malaisie.",
    legal: "Consultez les informations légales, la confidentialité, la protection des données et les conditions d'adhésion de CRAYS Clubs.",
    "legal/data-protection": "Découvrez comment CRAYS Clubs protège les données personnelles des membres, candidats et visiteurs du site.",
    "legal/imprint": "Coordonnées des sociétés et associations responsables de CRAYS Clubs et de ce site internet.",
    "legal/privacy-policy": "Découvrez comment CRAYS Clubs collecte, utilise, conserve et protège les données personnelles lors de l'utilisation du site et des services.",
    "legal/terms-and-conditions": "Consultez les conditions régissant les adhésions, candidatures, réservations et services associés de CRAYS Clubs.",
  },
  pt: {
    "about-us": "Descubra como a CRAYS cria em Forest City um clube privado e uma comunidade real para fundadores, profissionais remotos, criadores e famílias.",
    "become-a-member": "Conheça a adesão ao CRAYS Club para viver, trabalhar, participar em eventos e integrar a comunidade de Forest City, Malásia.",
    legal: "Consulte a informação legal, privacidade, proteção de dados e condições de adesão aos CRAYS Clubs.",
    "legal/data-protection": "Saiba como os CRAYS Clubs protegem os dados pessoais de membros, candidatos e visitantes do site.",
    "legal/imprint": "Dados empresariais, associativos e de contacto das organizações responsáveis pelos CRAYS Clubs e por este site.",
    "legal/privacy-policy": "Saiba como a CRAYS Clubs recolhe, utiliza, armazena e protege dados pessoais ao usar o site e os serviços.",
    "legal/terms-and-conditions": "Leia as condições que regulam adesões, candidaturas, reservas e serviços relacionados dos CRAYS Clubs.",
  },
  it: {
    "about-us": "Scopri come CRAYS sta creando a Forest City un club privato e una comunità reale per fondatori, professionisti da remoto, creativi e famiglie.",
    "become-a-member": "Scopri l'iscrizione a CRAYS Club per vivere, lavorare, partecipare a eventi ed entrare nella comunità di Forest City, in Malesia.",
    legal: "Consulta le informazioni legali, la privacy, la protezione dei dati e le condizioni di iscrizione di CRAYS Clubs.",
    "legal/data-protection": "Scopri come CRAYS Clubs protegge i dati personali di membri, candidati e visitatori del sito.",
    "legal/imprint": "Dati societari, associativi e di contatto delle organizzazioni responsabili di CRAYS Clubs e di questo sito.",
    "legal/privacy-policy": "Scopri come CRAYS Clubs raccoglie, utilizza, conserva e protegge i dati personali nell'uso del sito e dei servizi.",
    "legal/terms-and-conditions": "Leggi le condizioni che regolano iscrizioni, candidature, prenotazioni e servizi collegati di CRAYS Clubs.",
  },
};

function normalizeRoute(route: string): string {
  return route.replace(/^\/+|\/+$/g, "");
}

function metadataTitleText(value: Metadata["title"], fallback: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if ("absolute" in value && typeof value.absolute === "string") return value.absolute;
    if ("default" in value && typeof value.default === "string") return value.default;
  }
  return fallback;
}

export function clubsSeoAlternates(
  locale: ClubsLocale,
  route: string,
  availableLocales: readonly ClubsLocale[] = CLUBS_LOCALES,
): NonNullable<Metadata["alternates"]> {
  const normalizedRoute = normalizeRoute(route);
  const languages = Object.fromEntries(
    availableLocales.map((targetLocale) => [
      targetLocale,
      clubsCanonicalUrl(targetLocale, normalizedRoute),
    ]),
  );
  const defaultLocale = availableLocales.includes("en")
    ? "en"
    : (availableLocales[0] ?? locale);
  languages["x-default"] = clubsCanonicalUrl(defaultLocale, normalizedRoute);

  return {
    canonical: clubsCanonicalUrl(locale, normalizedRoute),
    languages,
  };
}

export function clubsLocaleScopeMetadata(locale: ClubsLocale): Metadata {
  const homeEditorial = clubsEditorialMetadata(locale, "")!;
  const description = homeEditorial.description;
  return {
    metadataBase: new URL(CLUBS_SEO_ORIGIN),
    applicationName: "CRAYS Clubs",
    title: homeEditorial.title,
    description,
    creator: "CRAYS",
    publisher: "CRAYS Business Nomads Club Association",
    category: "travel, hospitality and community",
    referrer: "strict-origin-when-cross-origin",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: homeEditorial.title,
      description,
      url: clubsCanonicalUrl(locale),
      siteName: "CRAYS Clubs",
      locale: localeOpenGraph[locale],
      alternateLocale: CLUBS_LOCALES.filter((target) => target !== locale).map(
        (target) => localeOpenGraph[target],
      ),
      type: "website",
      images: [
        {
          url: CLUBS_HOME_SOCIAL_IMAGE,
          width: 1536,
          height: 1024,
          alt: CLUBS_HOME_SOCIAL_ALT[locale],
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: homeEditorial.title,
      description,
      images: [
        {
          url: CLUBS_HOME_SOCIAL_IMAGE,
          alt: CLUBS_HOME_SOCIAL_ALT[locale],
        },
      ],
    },
  };
}

export function clubsPageMetadata(
  locale: ClubsLocale,
  route: string,
  input: Metadata,
  options: Readonly<{
    availableLocales?: readonly ClubsLocale[];
    index?: boolean;
  }> = {},
): Metadata {
  const normalizedRoute = normalizeRoute(route);
  const isHomepage = normalizedRoute === "";
  const editorial = clubsEditorialMetadata(locale, normalizedRoute);
  const socialPath = clubsSocialPath(normalizedRoute, locale);
  const dimensions = socialPath ? (socialDimensions as Record<string, {width:number;height:number}>)[socialPath] : undefined;
  const pageImage = socialPath ? `${CLUBS_SEO_ORIGIN}${socialPath}` : undefined;
  const fallbackTitle = clubsEditorialMetadata(locale, "")!.title;
  const title =
    editorial?.title ?? titleOverrides[locale][normalizedRoute] ??
    metadataTitleText(input.title, fallbackTitle);
  const description =
    editorial?.description ?? descriptionOverrides[locale][normalizedRoute] ??
    input.description ??
    localeDescriptions[locale];
  const availableLocales = options.availableLocales ?? CLUBS_LOCALES;
  const canonical = clubsCanonicalUrl(locale, normalizedRoute);
  const inputOpenGraph = input.openGraph ?? {};
  const inputTwitter = input.twitter ?? {};
  const inputRobots =
    input.robots && typeof input.robots === "object" ? input.robots : {};
  const inputGoogleBot =
    "googleBot" in inputRobots &&
    inputRobots.googleBot &&
    typeof inputRobots.googleBot === "object"
      ? inputRobots.googleBot
      : {};
  const shouldIndex = options.index !== false;

  return {
    ...input,
    metadataBase: new URL(CLUBS_SEO_ORIGIN),
    title,
    description,
    alternates: clubsSeoAlternates(locale, normalizedRoute, availableLocales),
    robots: shouldIndex
      ? {
          ...inputRobots,
          index: true,
          follow: true,
          googleBot: {
            ...inputGoogleBot,
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: true,
          googleBot: { index: false, follow: true },
        },
    openGraph: {
      ...inputOpenGraph,
      title,
      description,
      url: canonical,
      siteName: "CRAYS Clubs",
      locale: localeOpenGraph[locale],
      alternateLocale: availableLocales
        .filter((target) => target !== locale)
        .map((target) => localeOpenGraph[target]),
      type: "website",
      images: !pageImage && inputOpenGraph.images ? inputOpenGraph.images : [
        {
          url: pageImage ?? CLUBS_SEO_SOCIAL_IMAGE,
          width: dimensions?.width ?? (normalizedRoute.startsWith("legal") ? 1200 : 1280),
          height: dimensions?.height ?? (normalizedRoute.startsWith("legal") ? 630 : 720),
          alt: isHomepage ? CLUBS_HOME_SOCIAL_ALT[locale] : title,
        },
      ],
    },
    twitter: {
      ...inputTwitter,
      card: "summary_large_image",
      title,
      description,
      images: !pageImage && inputTwitter.images ? inputTwitter.images : [
        {
          url: pageImage ?? CLUBS_SEO_SOCIAL_IMAGE,
          alt: isHomepage ? CLUBS_HOME_SOCIAL_ALT[locale] : title,
        },
      ],
    },
  };
}

export function clubsUtilityMetadata(locale: ClubsLocale, route?:string): Metadata {
  if(route==="account") {
    const titles:Record<ClubsLocale,string>={en:"Account & Sign-in | CRAYS",de:"Konto & Anmeldung | CRAYS",es:"Cuenta e inicio de sesión | CRAYS",ca:"Compte i inici de sessió | CRAYS",fr:"Compte et connexion | CRAYS",pt:"Conta e início de sessão | CRAYS",it:"Account e accesso | CRAYS"};
    const descriptions:Record<ClubsLocale,string>={en:"Access your CRAYS account for saved stays, membership requests and support.",de:"Öffne dein CRAYS-Konto für gespeicherte Aufenthalte, Mitgliedschaftsanfragen und Support.",es:"Accede a tu cuenta CRAYS para estancias guardadas, solicitudes de membresía y soporte.",ca:"Accedeix al teu compte CRAYS per a estades desades, sol·licituds de membresia i suport.",fr:"Accédez à votre compte CRAYS pour vos séjours enregistrés, demandes d’adhésion et assistance.",pt:"Aceda à sua conta CRAYS para estadias guardadas, pedidos de adesão e apoio.",it:"Accedi al tuo account CRAYS per soggiorni salvati, richieste di adesione e assistenza."};
    return clubsPageMetadata(locale,route,{title:titles[locale],description:descriptions[locale]}, {index:false});
  }
  return {
    metadataBase: new URL(CLUBS_SEO_ORIGIN),
    openGraph: { locale: localeOpenGraph[locale] },
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

