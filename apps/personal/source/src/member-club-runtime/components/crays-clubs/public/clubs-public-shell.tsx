"use client";

import Image from "../../../integration/browser-image";
import Link from "../../../integration/browser-link";
import { usePathname } from "../../../integration/browser-navigation";
import { ArrowRight, ArrowUpRight, Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import tokens from "./clubs-public-design-tokens.module.css";
import {
  getClubsLocaleSwitches,
  type CraysPublicLocale,
} from "./clubs-public-locale-contract";
import styles from "./clubs-public-shell.module.css";

export type ClubsPublicShellCopy = {
  home: string;
  skip: string;
  login: string;
  associationHeader: string;
  menu: string;
  close: string;
  primaryNav: string;
  shortcuts: string;
  languages: string;
  privateMembersClub: string;
  applyTitle: string;
  applyLead: string;
  applyDirect: string;
  applyAmbassador: string;
  applicationSteps: readonly [string, string, string, string];
  menuTitle: string;
  explore: string;
  buildLearn: string;
  connect: string;
  footerEyebrow: string;
  footerHeadline: string;
  footerCta: string;
  footerBrand: string;
  footerGroups: readonly [string, string, string, string];
  associationName: string;
  associationLayer: string;
  rights: string;
  privacy: string;
  terms: string;
  dataProtectionMenu: string;
  dataProtection: string;
  imprint: string;
};

const defaultCopy: ClubsPublicShellCopy = {
  home: "CRAYS Clubs home",
  skip: "Skip to content",
  login: "LOG IN",
  associationHeader: "A MEMBER OF THE CRAYS ASSOCIATION",
  menu: "MENU",
  close: "CLOSE",
  primaryNav: "Main menu",
  shortcuts: "shortcuts",
  languages: "Language",
  privateMembersClub: "Private Members Club",
  applyTitle: "Apply to CRAYS Clubs",
  applyLead:
    "Apply directly. Every application is reviewed, and the final admission decision always remains with the CRAYS team.",
  applyDirect: "Start your application",
  applyAmbassador: "Apply through an Ambassador",
  applicationSteps: [
    "Application",
    "CRAYS review",
    "Conversation or invitation",
    "CRAYS team decision",
  ],
  menuTitle: "Menu",
  explore: "Explore",
  buildLearn: "Build & Learn",
  connect: "Connect",
  footerEyebrow: "CLAIM YOUR GLOBAL HOME",
  footerHeadline:
    "Meet friends, collaborators, and business partners across the Crays Club world.",
  footerCta: "Become a member",
  footerBrand:
    "An invitation-led community for people building international lives, companies and creative work.",
  footerGroups: ["CRAYS Clubs", "Belong", "Build", "Connect"],
  associationName: "CRAYS Business Nomads Club Association",
  associationLayer: "The Crays operating layer.",
  rights: "© 2026 CRAYS. All rights reserved.",
  privacy: "Privacy",
  terms: "Terms",
  dataProtectionMenu: "Data Protection",
  dataProtection: "Data protection",
  imprint: "Imprint",
};

export type ShellLinkLabels = {
  forestCity: string;
  golfHotel: string;
  marinaHotel: string;
  communityLife: string;
  lifestyle: string;
  hospitality: string;
  families: string;
  teams: string;
  events: string;
  learnForLife: string;
  schoolJobs: string;
  hostCompany: string;
  portfolioCompanies: string;
  conference: string;
  brandService: string;
  franchise: string;
  ambassadors: string;
  about: string;
  contact: string;
  account: string;
  legal: string;
  association: string;
};

const localizedShellCopy: Record<Exclude<CraysPublicLocale, "en">, ClubsPublicShellCopy> = {
  de: {
    home: "CRAYS Clubs Startseite", skip: "Zum Inhalt springen", login: "ANMELDEN",
    associationHeader: "MITGLIED DER CRAYS ASSOCIATION", menu: "MENÜ", close: "SCHLIESSEN",
    primaryNav: "Hauptmenü", shortcuts: "Direktlinks", languages: "Sprache",
    privateMembersClub: "Privater Mitgliederclub", applyTitle: "Bei CRAYS Clubs bewerben",
    applyLead: "Bewirb dich direkt. Jede Bewerbung wird geprüft; die endgültige Aufnahmeentscheidung liegt immer beim CRAYS-Team.",
    applyDirect: "Bewerbung starten", applyAmbassador: "Über einen Ambassador bewerben",
    applicationSteps: ["Bewerbung", "Prüfung durch CRAYS", "Gespräch oder Einladung", "Entscheidung des CRAYS-Teams"],
    menuTitle: "Menü", explore: "Entdecken", buildLearn: "Aufbauen & Lernen", connect: "Vernetzen",
    footerEyebrow: "DEIN GLOBALES ZUHAUSE", footerHeadline: "Triff Freunde, Mitstreiter und Geschäftspartner in der Welt der Crays Clubs.",
    footerCta: "Mitglied werden", footerBrand: "Eine Community auf Einladung für Menschen, die ein internationales Leben, Unternehmen und kreative Arbeit aufbauen.",
    footerGroups: ["CRAYS Clubs", "Dazugehören", "Aufbauen", "Vernetzen"],
    associationName: "CRAYS Business Nomads Club Association", associationLayer: "Die operative Ebene von Crays.",
    rights: "© 2026 CRAYS. Alle Rechte vorbehalten.", privacy: "Datenschutz", terms: "Bedingungen",
    dataProtectionMenu: "Datenschutz", dataProtection: "Datenschutz", imprint: "Impressum",
  },
  es: {
    home: "Inicio de CRAYS Clubs", skip: "Saltar al contenido", login: "INICIAR SESIÓN",
    associationHeader: "MIEMBRO DE LA ASOCIACIÓN CRAYS", menu: "MENÚ", close: "CERRAR",
    primaryNav: "Menú principal", shortcuts: "accesos directos", languages: "Idioma",
    privateMembersClub: "Club privado de socios", applyTitle: "Solicita acceso a CRAYS Clubs",
    applyLead: "Presenta tu solicitud directamente. Todas las solicitudes se revisan y la decisión final de admisión corresponde siempre al equipo de CRAYS.",
    applyDirect: "Iniciar solicitud", applyAmbassador: "Solicitar mediante un embajador",
    applicationSteps: ["Solicitud", "Revisión de CRAYS", "Conversación o invitación", "Decisión del equipo de CRAYS"],
    menuTitle: "Menú", explore: "Explorar", buildLearn: "Crear y aprender", connect: "Conectar",
    footerEyebrow: "TU HOGAR GLOBAL", footerHeadline: "Conoce a amigos, colaboradores y socios empresariales en el mundo de Crays Clubs.",
    footerCta: "Hazte miembro", footerBrand: "Una comunidad por invitación para quienes construyen vidas internacionales, empresas y proyectos creativos.",
    footerGroups: ["CRAYS Clubs", "Pertenecer", "Crear", "Conectar"],
    associationName: "CRAYS Business Nomads Club Association", associationLayer: "La capa operativa de Crays.",
    rights: "© 2026 CRAYS. Todos los derechos reservados.", privacy: "Privacidad", terms: "Condiciones",
    dataProtectionMenu: "Protección de datos", dataProtection: "Protección de datos", imprint: "Aviso legal",
  },
  ca: {
    home: "Inici de CRAYS Clubs", skip: "Ves al contingut", login: "INICIA SESSIÓ",
    associationHeader: "MEMBRE DE L’ASSOCIACIÓ CRAYS", menu: "MENÚ", close: "TANCA",
    primaryNav: "Menú principal", shortcuts: "accessos directes", languages: "Idioma",
    privateMembersClub: "Club privat de membres", applyTitle: "Sol·licita accés a CRAYS Clubs",
    applyLead: "Presenta la sol·licitud directament. Totes les sol·licituds es revisen i la decisió final d'admissió correspon sempre a l'equip de CRAYS.",
    applyDirect: "Inicia la sol·licitud", applyAmbassador: "Sol·licita-ho mitjançant un ambaixador",
    applicationSteps: ["Sol·licitud", "Revisió de CRAYS", "Conversa o invitació", "Decisió de l'equip de CRAYS"],
    menuTitle: "Menú", explore: "Explora", buildLearn: "Crea i aprèn", connect: "Connecta",
    footerEyebrow: "LA TEVA LLAR GLOBAL", footerHeadline: "Coneix amics, col·laboradors i socis empresarials al món de Crays Clubs.",
    footerCta: "Fes-te membre", footerBrand: "Una comunitat per invitació per a persones que construeixen vides internacionals, empreses i projectes creatius.",
    footerGroups: ["CRAYS Clubs", "Pertinença", "Crear", "Connectar"],
    associationName: "CRAYS Business Nomads Club Association", associationLayer: "La capa operativa de Crays.",
    rights: "© 2026 CRAYS. Tots els drets reservats.", privacy: "Privacitat", terms: "Condicions",
    dataProtectionMenu: "Protecció de dades", dataProtection: "Protecció de dades", imprint: "Avís legal",
  },
  fr: {
    home: "Accueil de CRAYS Clubs", skip: "Aller au contenu", login: "SE CONNECTER",
    associationHeader: "MEMBRE DE L’ASSOCIATION CRAYS", menu: "MENU", close: "FERMER",
    primaryNav: "Menu principal", shortcuts: "raccourcis", languages: "Langue",
    privateMembersClub: "Club privé de membres", applyTitle: "Postuler à CRAYS Clubs",
    applyLead: "Postulez directement. Chaque candidature est examinée et la décision finale d'admission appartient toujours à l'équipe CRAYS.",
    applyDirect: "Commencer la candidature", applyAmbassador: "Postuler via un ambassadeur",
    applicationSteps: ["Candidature", "Examen par CRAYS", "Échange ou invitation", "Décision de l'équipe CRAYS"],
    menuTitle: "Menu", explore: "Explorer", buildLearn: "Construire et apprendre", connect: "Créer des liens",
    footerEyebrow: "VOTRE FOYER DANS LE MONDE", footerHeadline: "Rencontrez amis, collaborateurs et partenaires commerciaux dans l'univers des Crays Clubs.",
    footerCta: "Devenir membre", footerBrand: "Une communauté sur invitation pour les personnes qui construisent une vie internationale, des entreprises et des projets créatifs.",
    footerGroups: ["CRAYS Clubs", "Appartenance", "Construire", "Créer des liens"],
    associationName: "CRAYS Business Nomads Club Association", associationLayer: "La couche opérationnelle de Crays.",
    rights: "© 2026 CRAYS. Tous droits réservés.", privacy: "Confidentialité", terms: "Conditions",
    dataProtectionMenu: "Protection des données", dataProtection: "Protection des données", imprint: "Mentions légales",
  },
  pt: {
    home: "Início dos CRAYS Clubs", skip: "Ir para o conteúdo", login: "INICIAR SESSÃO",
    associationHeader: "MEMBRO DA ASSOCIAÇÃO CRAYS", menu: "MENU", close: "FECHAR",
    primaryNav: "Menu principal", shortcuts: "atalhos", languages: "Idioma",
    privateMembersClub: "Clube privado de membros", applyTitle: "Candidatar-se aos CRAYS Clubs",
    applyLead: "Candidate-se diretamente. Todas as candidaturas são analisadas e a decisão final de admissão pertence sempre à equipa CRAYS.",
    applyDirect: "Iniciar candidatura", applyAmbassador: "Candidatar-se através de um embaixador",
    applicationSteps: ["Candidatura", "Análise da CRAYS", "Conversa ou convite", "Decisão da equipa CRAYS"],
    menuTitle: "Menu", explore: "Explorar", buildLearn: "Construir e aprender", connect: "Criar ligações",
    footerEyebrow: "A SUA CASA GLOBAL", footerHeadline: "Encontre amigos, colaboradores e parceiros de negócios no mundo dos Crays Clubs.",
    footerCta: "Tornar-se membro", footerBrand: "Uma comunidade por convite para quem constrói vidas internacionais, empresas e trabalho criativo.",
    footerGroups: ["CRAYS Clubs", "Pertencer", "Construir", "Criar ligações"],
    associationName: "CRAYS Business Nomads Club Association", associationLayer: "A camada operacional da Crays.",
    rights: "© 2026 CRAYS. Todos os direitos reservados.", privacy: "Privacidade", terms: "Termos",
    dataProtectionMenu: "Proteção de dados", dataProtection: "Proteção de dados", imprint: "Aviso legal",
  },
  it: {
    home: "Home di CRAYS Clubs", skip: "Vai al contenuto", login: "ACCEDI",
    associationHeader: "MEMBRO DELL’ASSOCIAZIONE CRAYS", menu: "MENU", close: "CHIUDI",
    primaryNav: "Menu principale", shortcuts: "collegamenti rapidi", languages: "Lingua",
    privateMembersClub: "Club privato per membri", applyTitle: "Candidati a CRAYS Clubs",
    applyLead: "Presenta direttamente la candidatura. Ogni richiesta viene esaminata e la decisione finale sull'ammissione spetta sempre al team CRAYS.",
    applyDirect: "Inizia la candidatura", applyAmbassador: "Candidati tramite un ambassador",
    applicationSteps: ["Candidatura", "Esame di CRAYS", "Colloquio o invito", "Decisione del team CRAYS"],
    menuTitle: "Menu", explore: "Esplora", buildLearn: "Costruisci e impara", connect: "Connettiti",
    footerEyebrow: "LA TUA CASA GLOBALE", footerHeadline: "Incontra amici, collaboratori e partner commerciali nel mondo dei Crays Clubs.",
    footerCta: "Diventa membro", footerBrand: "Una community su invito per chi costruisce vite internazionali, aziende e progetti creativi.",
    footerGroups: ["CRAYS Clubs", "Appartenenza", "Costruire", "Connettersi"],
    associationName: "CRAYS Business Nomads Club Association", associationLayer: "Il livello operativo di Crays.",
    rights: "© 2026 CRAYS. Tutti i diritti riservati.", privacy: "Privacy", terms: "Termini",
    dataProtectionMenu: "Protezione dei dati", dataProtection: "Protezione dei dati", imprint: "Note legali",
  },
};

const shellLinkLabels: Record<CraysPublicLocale, ShellLinkLabels> = {
  en: { forestCity: "Forest City", golfHotel: "Golf Hotel", marinaHotel: "Marina Hotel", communityLife: "Community Life", lifestyle: "Lifestyle", hospitality: "Hospitality", families: "Families", teams: "Teams", events: "Events", learnForLife: "Learn for Life", schoolJobs: "School & Jobs", hostCompany: "Host Company", portfolioCompanies: "Portfolio Companies", conference: "Conference", brandService: "Brand as a Service", franchise: "Crays Franchise", ambassadors: "Ambassadors", about: "About Us", contact: "Contact", account: "Account", legal: "Legal", association: "Crays Association" },
  de: { forestCity: "Forest City", golfHotel: "Golfhotel", marinaHotel: "Marina-Hotel", communityLife: "Community-Leben", lifestyle: "Lebensstil", hospitality: "Aufenthalte", families: "Familien", teams: "Teams", events: "Veranstaltungen", learnForLife: "Lernen fürs Leben", schoolJobs: "Schule & Jobs", hostCompany: "Unternehmen zu Gast", portfolioCompanies: "Portfoliounternehmen", conference: "Konferenz", brandService: "Marke als Service", franchise: "Crays Franchise", ambassadors: "Botschafter", about: "Über uns", contact: "Kontakt", account: "Konto", legal: "Rechtliches", association: "Crays Association" },
  es: { forestCity: "Forest City", golfHotel: "Hotel Golf", marinaHotel: "Hotel Marina", communityLife: "Vida en comunidad", lifestyle: "Estilo de vida", hospitality: "Hospitalidad", families: "Familias", teams: "Equipos", events: "Eventos", learnForLife: "Aprender para la vida", schoolJobs: "Escuela y empleo", hostCompany: "Acoge a tu empresa", portfolioCompanies: "Empresas de la cartera", conference: "Conferencia", brandService: "Marca como servicio", franchise: "Franquicia Crays", ambassadors: "Embajadores", about: "Sobre nosotros", contact: "Contacto", account: "Cuenta", legal: "Legal", association: "Crays Association" },
  ca: { forestCity: "Forest City", golfHotel: "Hotel Golf", marinaHotel: "Hotel Marina", communityLife: "Vida comunitària", lifestyle: "Estil de vida", hospitality: "Hospitalitat", families: "Famílies", teams: "Equips", events: "Esdeveniments", learnForLife: "Aprendre per a la vida", schoolJobs: "Escola i feina", hostCompany: "Acull la teva empresa", portfolioCompanies: "Empreses de la cartera", conference: "Conferència", brandService: "Marca com a servei", franchise: "Franquícia Crays", ambassadors: "Ambaixadors", about: "Sobre nosaltres", contact: "Contacte", account: "Compte", legal: "Legal", association: "Crays Association" },
  fr: { forestCity: "Forest City", golfHotel: "Hôtel Golf", marinaHotel: "Hôtel Marina", communityLife: "Vie communautaire", lifestyle: "Art de vivre", hospitality: "Hospitalité", families: "Familles", teams: "Équipes", events: "Événements", learnForLife: "Apprendre pour la vie", schoolJobs: "École et emplois", hostCompany: "Accueillir votre entreprise", portfolioCompanies: "Sociétés du portefeuille", conference: "Conférence", brandService: "La marque comme service", franchise: "Franchise Crays", ambassadors: "Ambassadeurs", about: "À propos", contact: "Contact", account: "Compte", legal: "Juridique", association: "Crays Association" },
  pt: { forestCity: "Forest City", golfHotel: "Hotel Golf", marinaHotel: "Hotel Marina", communityLife: "Vida comunitária", lifestyle: "Estilo de vida", hospitality: "Hospitalidade", families: "Famílias", teams: "Equipas", events: "Eventos", learnForLife: "Aprender para a vida", schoolJobs: "Escola e empregos", hostCompany: "Receber a sua empresa", portfolioCompanies: "Empresas do portefólio", conference: "Conferência", brandService: "Marca como serviço", franchise: "Franquia Crays", ambassadors: "Embaixadores", about: "Sobre nós", contact: "Contacto", account: "Conta", legal: "Informação legal", association: "Crays Association" },
  it: { forestCity: "Forest City", golfHotel: "Golf Hotel", marinaHotel: "Marina Hotel", communityLife: "Vita di comunità", lifestyle: "Stile di vita", hospitality: "Ospitalità", families: "Famiglie", teams: "Team", events: "Eventi", learnForLife: "Imparare per la vita", schoolJobs: "Scuola e lavoro", hostCompany: "Ospita la tua azienda", portfolioCompanies: "Società in portafoglio", conference: "Conferenza", brandService: "Brand come servizio", franchise: "Franchising Crays", ambassadors: "Ambassador", about: "Chi siamo", contact: "Contatti", account: "Account", legal: "Note legali", association: "Crays Association" },
};

export function getClubsPublicShellCopy(
  locale: CraysPublicLocale,
  copyOverrides?: Partial<ClubsPublicShellCopy>,
): ClubsPublicShellCopy {
  return {
    ...defaultCopy,
    ...(locale === "en" ? {} : localizedShellCopy[locale]),
    ...copyOverrides,
  };
}

export function getClubsPublicShellLinkLabels(
  locale: CraysPublicLocale,
): ShellLinkLabels {
  return shellLinkLabels[locale];
}

const SOCIAL_LINKS = [
  {
    label: "GitHub",
    href: "https://github.com/CraysCircle",
    icon: "/__crays-clubs/assets/footer-icons/github.svg",
  },
  {
    label: "X",
    href: "https://x.com/CraysCircle",
    icon: "/__crays-clubs/assets/footer-icons/x.svg",
  },
  {
    label: "Open Collective",
    href: "https://opencollective.com/crays",
    icon: "/__crays-clubs/assets/footer-icons/opencollective.svg",
  },
  {
    label: "Reddit",
    href: "https://www.reddit.com/r/Crays/",
    icon: "/__crays-clubs/assets/footer-icons/reddit.svg",
  },
  {
    label: "Telegram",
    href: "https://t.me/craysclub",
    icon: "/__crays-clubs/assets/footer-icons/telegram.svg",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@thorbenbiesenbac1",
    icon: "/__crays-clubs/assets/footer-icons/tiktok.svg",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@CraysCircle",
    icon: "/__crays-clubs/assets/footer-icons/youtube.svg",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/crays/",
    icon: "/__crays-clubs/assets/footer-icons/linkedin.svg",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/crays_circle/",
    icon: "/__crays-clubs/assets/footer-icons/instagram.svg",
  },
  {
    label: "Nostr / Crays Network",
    href: "https://www.crays.net",
    icon: "/__crays-clubs/assets/footer-icons/nostr.webp",
  },
  {
    label: "Discord",
    href: "https://discord.gg/dpYZk8xAvR",
    icon: "/__crays-clubs/assets/footer-icons/discord.svg",
  },
] as const;

type ShellItem = {
  href: string;
  label: string;
  external?: boolean;
};

type ClubsPublicShellProps = {
  availableLocales: readonly CraysPublicLocale[];
  children: ReactNode;
  locale: CraysPublicLocale;
  copy?: Partial<ClubsPublicShellCopy>;
  headerTone?: "overlay" | "navy" | "light";
  headerAction?: ReactNode;
  footer?: ReactNode;
  footerCtaHref?: string;
  footerCtaLabel?: string;
};

export function ClubsPublicShell({
  availableLocales,
  children,
  locale,
  copy: copyOverrides,
  headerTone = "overlay",
  headerAction,
  footer,
  footerCtaHref,
  footerCtaLabel,
}: ClubsPublicShellProps) {
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuDialogRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const copy = useMemo<ClubsPublicShellCopy>(
    () => getClubsPublicShellCopy(locale, copyOverrides),
    [copyOverrides, locale],
  );
  const links = shellLinkLabels[locale];

  const root = `/${locale}`;
  const normalizedPathname = pathname || root;
  const pathParts = normalizedPathname.split("/").filter(Boolean);
  const currentRoute = pathParts
    .slice(pathParts[0] === locale ? 1 : 0)
    .join("/");
  const routeKey = currentRoute.replaceAll("/", "-") || "home";
  const menuId = `clubs-${routeKey}-menu`;
  const contentId = `clubs-${routeKey}-content`;
  const menuOpen = menuPath === normalizedPathname;

  const isCurrent = (href: string) =>
    href.startsWith("/") &&
    (normalizedPathname === href || normalizedPathname.startsWith(`${href}/`));

  const localeSwitches = getClubsLocaleSwitches(
    normalizedPathname,
    locale,
    availableLocales,
  );

  const groups: readonly (readonly ShellItem[])[] = [
    [
      { href: `${root}/discover`, label: links.forestCity },
      { href: `${root}/hospitality/golf-hotel`, label: links.golfHotel },
      { href: `${root}/hospitality/marina-hotel`, label: links.marinaHotel },
      { href: `${root}/community-life`, label: links.communityLife },
      { href: `${root}/lifestyle`, label: links.lifestyle },
      { href: `${root}/hospitality`, label: links.hospitality },
      { href: `${root}/families`, label: links.families },
      { href: `${root}/teams`, label: links.teams },
      { href: `${root}/experiences`, label: "Experiences" },
    ],
    [
      { href: `${root}/school-jobs`, label: links.learnForLife },
      { href: `${root}/host-company`, label: links.hostCompany },
      {
        href: `${root}/brand-as-a-service`,
        label: links.brandService,
        external: true,
      },
    ],
    [
      {
        href: "https://www.crays.pro/",
        label: links.franchise,
        external: true,
      },
      {
        href: `${root}/ambassadors`,
        label: links.ambassadors,
      },
      { href: `${root}/about-us`, label: links.about },
      { href: `${root}/contact`, label: links.contact },
      { href: `${root}/legal/imprint`, label: copy.imprint },
    ],
  ];

  const footerGroups: readonly (readonly ShellItem[])[] = [
    [
      { href: `${root}/about-us`, label: links.about },
      { href: `${root}/experiences`, label: "Experiences" },
      { href: `${root}/lifestyle`, label: links.lifestyle },
      { href: `${root}/community-life`, label: links.communityLife },
    ],
    [
      { href: `${root}/become-a-member`, label: copy.footerCta },
      { href: `${root}/ambassadors`, label: links.ambassadors },
      { href: `${root}/families`, label: links.families },
      { href: `${root}/teams`, label: links.teams },
    ],
    [
      { href: `${root}/hospitality`, label: links.hospitality },
      { href: `${root}/school-jobs`, label: links.learnForLife },
      { href: `${root}/host-company`, label: links.hostCompany },
      { href: `${root}/brand-as-a-service`, label: links.brandService },
    ],
    [
      { href: `${root}/contact`, label: links.contact },
      { href: `${root}/legal`, label: links.legal },
      { href: "https://www.crays.org/", label: links.association, external: true },
      { href: "https://www.crays.pro/", label: links.franchise, external: true },
    ],
  ];

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    menuDialogRef.current
      ?.querySelector<HTMLElement>("section a[href], nav a[href]")
      ?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuPath(null);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = menuDialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusable?.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuPath(null);

  const renderItem = (item: ShellItem) => {
    const content = (
      <>
        <span>{item.label}</span>
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.5} />
      </>
    );

    if (item.external) {
      return (
        <a
          href={item.href}
          key={item.href}
          onClick={closeMenu}
          rel="noreferrer noopener"
          target="_blank"
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        aria-current={isCurrent(item.href) ? "page" : undefined}
        href={item.href}
        key={item.href}
        onClick={closeMenu}
      >
        {content}
      </Link>
    );
  };

  return (
    <div className={`${tokens.theme} ${styles.shell}`}>
      <a className={styles.skipLink} href={`#${contentId}`}>
        {copy.skip}
      </a>

      <header className={`${styles.header} ${styles[`header_${headerTone}`]}`}>
        <Link
          aria-label={copy.home}
          className={styles.logoLink}
          href={root}
        >
          <Image
            alt="CRAYS"
            className={styles.logo}
            height={35}
            priority
            src="/brand/crays-logo-dark.svg"
            width={142}
          />
        </Link>

        <nav
          aria-label={`${copy.primaryNav} ${copy.shortcuts}`}
          className={styles.utilityNav}
        >
          {[
            { href: `${root}/discover`, label: links.forestCity },
            { href: `${root}/community-life`, label: links.communityLife },
            { href: `${root}/school-jobs`, label: links.schoolJobs },
            {
              href: `${root}/ambassadors`,
              label: links.ambassadors,
            },
          ].map((item) => (
            <Link
              aria-current={isCurrent(item.href) ? "page" : undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={`${styles.headerActions} ${headerAction ? styles.customHeaderActions : ""}`}>
          {headerAction ?? <>
          <Link className={styles.loginHeader} href={`${root}/account`}>
            {copy.login}
          </Link>
          <a
            className={styles.associationHeader}
            href="https://www.crays.org/"
            rel="noreferrer noopener"
            target="_blank"
          >
            {copy.associationHeader}
          </a>
          </>}
          <button
            aria-controls={menuId}
            aria-expanded={menuOpen}
            className={styles.menuButton}
            onClick={() =>
              setMenuPath((current) =>
                current === normalizedPathname ? null : normalizedPathname,
              )
            }
            ref={menuButtonRef}
            type="button"
          >
            <span>{copy.menu}</span>
            <Menu aria-hidden="true" size={28} strokeWidth={1} />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div
          aria-label={copy.primaryNav}
          aria-modal="true"
          className={styles.menuOverlay}
          id={menuId}
          ref={menuDialogRef}
          role="dialog"
        >
          <div className={styles.menuPanel}>
            <section className={styles.menuBrandRail}>
              <Image
                alt=""
                aria-hidden="true"
                className={styles.menuWatermark}
                height={256}
                src="/assets/favicon.png"
                width={256}
              />
              <div className={styles.menuApplyCard}>
                <p className={styles.menuKicker}>{copy.privateMembersClub}</p>
                <h2>{copy.applyTitle}</h2>
                <p>{copy.applyLead}</p>
                <div className={styles.menuApplyActions}>
                  <Link
                    href={`${root}/apply-directly?returnTo=${encodeURIComponent(`${root}/account?view=membership`)}`}
                    onClick={closeMenu}
                  >
                    {copy.applyDirect}
                    <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                  <Link
                    href={`${root}/ambassadors`}
                    onClick={closeMenu}
                  >
                    {copy.applyAmbassador}
                  </Link>
                </div>
                <ol className={styles.menuApplySteps}>
                  {copy.applicationSteps.map((step, index) => (
                    <li key={step}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <nav aria-label={copy.primaryNav} className={styles.menuNavigation}>
              <p className={styles.menuTitle}>{copy.menuTitle}</p>
              <div className={styles.menuGroups}>
                {groups.map((group, index) => (
                  <section className={styles.menuGroup} key={index}>
                    <p>
                      {[copy.explore, copy.buildLearn, copy.connect][index]}
                    </p>
                    {group.map(renderItem)}
                  </section>
                ))}
              </div>

              <div aria-label={copy.languages} className={styles.menuLanguages}>
                <span>{copy.languages}</span>
                {localeSwitches.map((item) => (
                  <a
                    aria-current={item.current ? "page" : undefined}
                    href={item.href}
                    hrefLang={item.hreflang}
                    key={item.locale}
                    lang={item.htmlLang}
                    title={item.label}
                  >
                    {item.locale.toUpperCase()}
                  </a>
                ))}
              </div>
            </nav>
          </div>
        </div>
      ) : null}

      <div className={styles.content} id={contentId} tabIndex={-1}>
        {children}
      </div>

      {footer ?? <ClubsPublicFooter locale={locale} copy={copy} footerCtaHref={footerCtaHref} footerCtaLabel={footerCtaLabel}/>}
    </div>
  );
}

/** Same public footer markup, fonts and styles for the Member workspace. */
export function ClubsPublicFooter({locale,copy:copyOverride,footerCtaHref,footerCtaLabel}:{locale:CraysPublicLocale;copy?:ClubsPublicShellCopy;footerCtaHref?:string;footerCtaLabel?:string}){
 const copy=copyOverride??getClubsPublicShellCopy(locale);
 const links=shellLinkLabels[locale];
 const root=`/${locale}`;
 const isCurrent=(_href:string)=>false;
  const footerGroups: readonly (readonly ShellItem[])[] = [
    [
      { href: `${root}/about-us`, label: links.about },
      { href: `${root}/experiences`, label: "Experiences" },
      { href: `${root}/lifestyle`, label: links.lifestyle },
      { href: `${root}/community-life`, label: links.communityLife },
    ],
    [
      { href: `${root}/become-a-member`, label: copy.footerCta },
      { href: `${root}/ambassadors`, label: links.ambassadors },
      { href: `${root}/families`, label: links.families },
      { href: `${root}/teams`, label: links.teams },
    ],
    [
      { href: `${root}/hospitality`, label: links.hospitality },
      { href: `${root}/school-jobs`, label: links.learnForLife },
      { href: `${root}/host-company`, label: links.hostCompany },
      { href: `${root}/brand-as-a-service`, label: links.brandService },
    ],
    [
      { href: `${root}/contact`, label: links.contact },
      { href: `${root}/legal`, label: links.legal },
      { href: "https://www.crays.org/", label: links.association, external: true },
      { href: "https://www.crays.pro/", label: links.franchise, external: true },
    ],
  ];

 return <footer className={styles.footer} id="site-footer">
        <section className={styles.footerCta}>
          <p>{copy.footerEyebrow}</p>
          <h2>{copy.footerHeadline}</h2>
          <Link
            className={styles.footerButton}
            href={footerCtaHref ?? `${root}/become-a-member`}
          >
            {footerCtaLabel ?? copy.footerCta}
            <ArrowRight aria-hidden="true" size={19} />
          </Link>
        </section>

        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <Image
              alt="CRAYS"
              height={35}
              src="/brand/crays-logo-dark.svg"
              width={142}
            />
            <p>{copy.footerBrand}</p>
          </div>

          {footerGroups.map((group, groupIndex) => (
            <nav
              aria-label={copy.footerGroups[groupIndex]}
              className={styles.footerColumn}
              key={copy.footerGroups[groupIndex]}
            >
              <strong>{copy.footerGroups[groupIndex]}</strong>
              {group.map((item) =>
                item.external ? (
                  <a
                    href={item.href}
                    key={item.href}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    aria-current={isCurrent(item.href) ? "page" : undefined}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>

        <div className={styles.associationLine}>
          <a
            href="https://www.crays.org/"
            rel="noreferrer noopener"
            target="_blank"
          >
            {copy.associationName}
            <ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.6} />
          </a>
          <span>{copy.associationLayer}</span>
        </div>

        <div className={styles.legalLine}>
          <span>{copy.rights}</span>
          <nav aria-label="CRAYS social media" className={styles.socialLinks}>
            {SOCIAL_LINKS.map((social) => (
              <a
                aria-label={social.label}
                href={social.href}
                key={social.label}
                rel="noreferrer noopener"
                target="_blank"
              >
                <Image
                  alt=""
                  data-crays-photo-treatment="none"
                  height={24}
                  src={social.icon}
                  width={24}
                />
              </a>
            ))}
          </nav>
          <div>
            <Link href={`${root}/legal/privacy-policy`}>{copy.privacy}</Link>
            <Link href={`${root}/legal/terms-and-conditions`}>
              {copy.terms}
            </Link>
            <Link href={`${root}/legal/data-protection`}>
              {copy.dataProtection}
            </Link>
            <Link href={`${root}/legal/imprint`}>{copy.imprint}</Link>
          </div>
        </div>
      </footer>;
}
