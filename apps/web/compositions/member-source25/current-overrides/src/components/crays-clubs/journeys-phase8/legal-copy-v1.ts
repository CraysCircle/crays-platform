import { CLUBS_OPERATING_DETAILS, CLUBS_OPERATING_BOARD } from "@/lib/clubs/operating-entity";
import localizedLegalCopy from "./legal-localized.generated.json";

export const legalDocumentSlugs = [
  "imprint",
  "terms-and-conditions",
  "data-protection",
  "privacy-policy",
] as const;

export type LegalDocumentSlug = (typeof legalDocumentSlugs)[number];
export type LegalLocale = "en" | "de" | "es" | "ca" | "fr" | "pt" | "it";

export type LegalLink = {
  href: string;
  text: string;
};

export type LegalRecord = {
  tag: string;
  id: string | null;
  text: string;
  links: readonly LegalLink[];
};

export type LegalDocument = {
  url: string;
  records: readonly LegalRecord[];
};

export const legalUiCopy = {
  "en": {
    "eyebrow": "CRAYS Club legal surface",
    "hubTitle": "Legal",
    "hubIntro": "Choose the document you want to read. Every text below remains available in its complete published form.",
    "documentIndex": "Legal documents",
    "onThisPage": "On this page",
    "openDocument": "Read document",
    "backToIndex": "All legal documents",
    "preservedLabel": "Published legal document"
  },
  "de": {
    "eyebrow": "Rechtliche Informationen des CRAYS Club",
    "hubTitle": "Rechtliches",
    "hubIntro": "Wähle das Dokument, das du lesen möchtest. Jeder Text bleibt in seiner vollständig veröffentlichten Fassung verfügbar.",
    "documentIndex": "Rechtliche Dokumente",
    "onThisPage": "Auf dieser Seite",
    "openDocument": "Dokument lesen",
    "backToIndex": "Alle rechtlichen Dokumente",
    "preservedLabel": "Veröffentlichtes Rechtsdokument"
  },
  "es": {
    "eyebrow": "Información legal de CRAYS Club",
    "hubTitle": "Información legal",
    "hubIntro": "Elige el documento que quieras leer. Cada texto permanece disponible en su versión publicada completa.",
    "documentIndex": "Documentos legales",
    "onThisPage": "En esta página",
    "openDocument": "Leer documento",
    "backToIndex": "Todos los documentos legales",
    "preservedLabel": "Documento legal publicado"
  },
  "ca": {
    "eyebrow": "Informació legal de CRAYS Club",
    "hubTitle": "Informació legal",
    "hubIntro": "Tria el document que vulguis llegir. Cada text continua disponible en la seva versió publicada completa.",
    "documentIndex": "Documents legals",
    "onThisPage": "En aquesta pàgina",
    "openDocument": "Llegir el document",
    "backToIndex": "Tots els documents legals",
    "preservedLabel": "Document legal publicat"
  },
  "fr": {
    "eyebrow": "Informations juridiques de CRAYS Club",
    "hubTitle": "Informations juridiques",
    "hubIntro": "Choisissez le document que vous souhaitez lire. Chaque texte reste disponible dans son intégralité publiée.",
    "documentIndex": "Documents juridiques",
    "onThisPage": "Sur cette page",
    "openDocument": "Lire le document",
    "backToIndex": "Tous les documents juridiques",
    "preservedLabel": "Document juridique publié"
  },
  "pt": {
    "eyebrow": "Informações legais do CRAYS Club",
    "hubTitle": "Informações legais",
    "hubIntro": "Escolha o documento que pretende ler. Cada texto permanece disponível na sua versão publicada completa.",
    "documentIndex": "Documentos legais",
    "onThisPage": "Nesta página",
    "openDocument": "Ler documento",
    "backToIndex": "Todos os documentos legais",
    "preservedLabel": "Documento legal publicado"
  },
  "it": {
    "eyebrow": "Informazioni legali di CRAYS Club",
    "hubTitle": "Informazioni legali",
    "hubIntro": "Scegli il documento che desideri leggere. Ogni testo resta disponibile nella versione pubblicata completa.",
    "documentIndex": "Documenti legali",
    "onThisPage": "In questa pagina",
    "openDocument": "Leggi il documento",
    "backToIndex": "Tutti i documenti legali",
    "preservedLabel": "Documento legale pubblicato"
  }
} as const;

export const legalSource = {
  "en": {
    "imprint": {
      "url": "https://www.craysclub.com/en/legal/imprint",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Imprint",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Company and contact information for Crays Clubs.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Official Information",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The following company details identify the Crays entities shown in the current Crays legal framework.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contact",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Email for Crays Club guest access and operating inquiries: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        },
        {
          "tag": "p",
          "id": null,
          "text": "General legal contact from the referenced Crays framework: info@craysclub.com.",
          "links": [
            {
              "href": "mailto:info@craysclub.com",
              "text": "info@craysclub.com"
            }
          ]
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Disclaimer",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The information on this website is provided for general information. Crays makes reasonable efforts to keep content current, but no guarantee is made that all information is complete, accurate or available at all times.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "External links may lead to third-party websites. Crays is not responsible for third-party content and does not automatically endorse it by linking to it.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Copyright and Trademark",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Texts, imagery, logos, layouts, concepts and other website elements are protected by copyright, trademark and related rights unless stated otherwise. Any use beyond normal website viewing requires prior written consent from the rights holder.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays and related marks are used as protected brand identifiers within the Crays ecosystem.",
          "links": []
        }
      ]
    },
    "terms-and-conditions": {
      "url": "https://www.craysclub.com/en/legal/terms-and-conditions",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Terms and Conditions",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Clear operating terms for website use, early access requests and Crays Club communication.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Scope",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "These terms apply to the use of CraysClub.com, the information presented on this website and any early access, guest access or membership interest submitted through Crays Club contact channels.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Specific paid products, stays, events, memberships or partner services may be subject to separate agreements, booking terms or local requirements. If separate terms apply, those terms take priority for the relevant transaction.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Content",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club content describes concepts, planned features, community layers, locations and service ideas. Some elements may be in development, limited by availability or adapted before launch.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We may update, remove or restructure website content at any time to keep the Crays Club experience accurate and current.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Access Requests",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Submitting a request for guest access, membership access or information does not create an automatic right to admission, booking or participation. Crays may review requests, contact applicants and decide access based on availability, operational fit and applicable rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You are responsible for providing accurate contact information and for keeping your communication respectful, lawful and relevant to the requested Crays service.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Third-Party Services",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club may link to or cooperate with third-party platforms, venues, hospitality providers, payment providers, social networks or community tools. Those providers may apply their own terms and privacy rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays is not responsible for third-party websites or services unless responsibility is mandatory under applicable law.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Liability",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays works to keep the website available and reliable, but uninterrupted access cannot be guaranteed. Liability is limited to the extent permitted by applicable law.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Nothing in these terms limits mandatory statutory rights or liability that cannot legally be excluded.",
          "links": []
        }
      ]
    },
    "data-protection": {
      "url": "https://www.craysclub.com/en/legal/data-protection",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Data Protection",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "How Crays Club handles personal data when people visit the website, request access or contact the team.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Personal Data We Process",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "When you visit CraysClub.com, request Crays access or contact us, we may process contact details, message content, technical browser information, usage data and information needed to respond to your request.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We only ask for information that is useful for operating the Crays Club experience, handling communication, improving the website or preparing requested services.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Purposes",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Providing and improving the website.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Responding to inquiries and access requests.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Preparing guest, member, partner or community communication.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Protecting the website against misuse, spam and security incidents.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Meeting legal, accounting or compliance obligations where required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Legal Bases",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on the context, processing may be based on contractual steps, consent, legal obligations or legitimate interests such as secure website operation, communication management and product improvement.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You may withdraw consent where processing is based on consent. Withdrawal does not affect processing that took place before the withdrawal.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Sharing and Service Providers",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays may use technical providers for hosting, analytics, communication, security, forms and related operational services. Providers are selected to support secure and reliable operation.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Where information is transferred internationally, Crays uses appropriate safeguards where legally required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Rights",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on applicable law, you may have rights to access, correct, delete, restrict or receive your personal data, object to certain processing and complain to a supervisory authority.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "To exercise privacy rights, contact team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    },
    "privacy-policy": {
      "url": "https://www.craysclub.com/en/legal/privacy-policy",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Privacy Policy",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "A practical privacy overview for visitors, early access applicants and Crays Club community contacts.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Overview",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club uses personal data to operate the website, answer messages, manage access interest and improve the community experience. We aim to keep data collection focused and understandable.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "This policy complements the Data Protection page and explains the practical handling of privacy-relevant information on CraysClub.com.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Visits",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "When the website is visited, technical information such as browser type, device data, access times, requested pages and security-related logs may be processed by hosting and infrastructure providers.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "This information helps deliver pages, prevent abuse, troubleshoot errors and keep the service secure.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contact and Access Forms",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "If you contact Crays or request access, we process the details you provide, such as your name, email address, message and relevant context for the request. This information is used to respond and to evaluate the requested Crays Club interaction.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Please do not send sensitive information unless it is necessary for the specific request.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Cookies and Similar Technologies",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The site may use technologies that support basic functionality, security, analytics or embedded third-party services. Where required, consent or additional information will be provided before optional technologies are used.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Retention",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Data is kept only for as long as needed for the relevant purpose, legal requirements, dispute prevention or legitimate operational needs. After that, data is deleted or anonymized where appropriate.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Choices",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You can contact Crays to ask about your personal data, request correction or deletion, object to certain uses or withdraw consent where processing depends on consent.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Contact: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    }
  },
  "de": {
    "imprint": {
      "url": "https://www.craysclub.com/de/legal/imprint",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Impressum",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Company- und Kontaktinformationen für Crays Clubs.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Offizielle Informationen",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The following company details identify the Crays entities shown in the current Crays legal framework.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Kontakt",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Email for Crays Club guest access and operating inquiries: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        },
        {
          "tag": "p",
          "id": null,
          "text": "General legal contact from the referenced Crays framework: info@craysclub.com.",
          "links": [
            {
              "href": "mailto:info@craysclub.com",
              "text": "info@craysclub.com"
            }
          ]
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Disclaimer",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The information on this website is provided for general information. Crays makes reasonable efforts to keep content current, but no guarantee is made that all information is complete, accurate or available at all times.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "External links may lead to third-party websites. Crays is not responsible for third-party content and does not automatically endorse it by linking to it.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Copyright und Trademark",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Texts, imagery, logos, layouts, concepts and other website elements are protected by copyright, trademark and related rights unless stated otherwise. Any use beyond normal website viewing requires prior written consent from the rights holder.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays and related marks are used as protected brand identifiers within the Crays ecosystem.",
          "links": []
        }
      ]
    },
    "terms-and-conditions": {
      "url": "https://www.craysclub.com/de/legal/terms-and-conditions",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "AGB",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Klare Operating Terms für Website-Nutzung, Early-Access-Anfragen und Crays Club Kommunikation.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Geltungsbereich",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "These terms apply to the use of CraysClub.com, the information presented on this website and any early access, guest access or membership interest submitted through Crays Club contact channels.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Specific paid products, stays, events, memberships or partner services may be subject to separate agreements, booking terms or local requirements. If separate terms apply, those terms take priority for the relevant transaction.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Content",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club content describes concepts, planned features, community layers, locations and service ideas. Some elements may be in development, limited by availability or adapted before launch.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We may update, remove or restructure website content at any time to keep the Crays Club experience accurate and current.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Access Requests",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Submitting a request for guest access, membership access or information does not create an automatic right to admission, booking or participation. Crays may review requests, contact applicants and decide access based on availability, operational fit and applicable rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You are responsible for providing accurate contact information and for keeping your communication respectful, lawful and relevant to the requested Crays service.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Third-Party Services",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club may link to or cooperate with third-party platforms, venues, hospitality providers, payment providers, social networks or community tools. Those providers may apply their own terms and privacy rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays is not responsible for third-party websites or services unless responsibility is mandatory under applicable law.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Haftung",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays works to keep the website available and reliable, but uninterrupted access cannot be guaranteed. Liability is limited to the extent permitted by applicable law.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Nothing in these terms limits mandatory statutory rights or liability that cannot legally be excluded.",
          "links": []
        }
      ]
    },
    "data-protection": {
      "url": "https://www.craysclub.com/de/legal/data-protection",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Datenschutz",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Wie Crays Club personenbezogene Daten behandelt, wenn Menschen die Website besuchen, Access anfragen oder das Team kontaktieren.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Verarbeitete personenbezogene Daten",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "When you visit CraysClub.com, request Crays access or contact us, we may process contact details, message content, technical browser information, usage data and information needed to respond to your request.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We only ask for information that is useful for operating the Crays Club experience, handling communication, improving the website or preparing requested services.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Zwecke",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Providing and improving the website.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Responding to inquiries and access requests.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Preparing guest, member, partner or community communication.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Protecting the website against misuse, spam and security incidents.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Meeting legal, accounting or compliance obligations where required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Rechtsgrundlagen",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on the context, processing may be based on contractual steps, consent, legal obligations or legitimate interests such as secure website operation, communication management and product improvement.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You may withdraw consent where processing is based on consent. Withdrawal does not affect processing that took place before the withdrawal.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Weitergabe und Service Provider",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays may use technical providers for hosting, analytics, communication, security, forms and related operational services. Providers are selected to support secure and reliable operation.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Where information is transferred internationally, Crays uses appropriate safeguards where legally required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Deine Rechte",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on applicable law, you may have rights to access, correct, delete, restrict or receive your personal data, object to certain processing and complain to a supervisory authority.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "To exercise privacy rights, contact team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    },
    "privacy-policy": {
      "url": "https://www.craysclub.com/de/legal/privacy-policy",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Datenschutzerklärung",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Ein praktischer Privacy-Überblick für Besucher, Early-Access-Anfragen und Crays Club Community-Kontakte.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Überblick",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club nutzt personenbezogene Daten, um die Website zu betreiben, Nachrichten zu beantworten, Access-Interesse zu verwalten und die Community Experience zu verbessern. Die Datenerhebung bleibt fokussiert und verständlich.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Diese Policy ergänzt die Datenschutzseite und erklärt den praktischen Umgang mit privacy-relevanten Informationen auf CraysClub.com.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website-Besuche",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Beim Besuch der Website können technische Informationen wie Browsertyp, Gerätedaten, Zugriffszeiten, aufgerufene Seiten und sicherheitsrelevante Logs durch Hosting- und Infrastruktur-Provider verarbeitet werden.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Diese Informationen helfen, Seiten auszuliefern, Missbrauch zu verhindern, Fehler zu beheben und den Service sicher zu halten.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Kontakt- und Access-Formulare",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Wenn du Crays kontaktierst oder Access anfragst, verarbeiten wir die von dir angegebenen Daten wie Name, E-Mail, Nachricht und relevanten Kontext. Diese Informationen werden zur Antwort und Bewertung der gewünschten Crays Club Interaktion genutzt.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Bitte sende keine sensiblen Informationen, außer sie sind für die konkrete Anfrage erforderlich.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Cookies und ähnliche Technologien",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Die Website kann Technologien für Grundfunktionen, Sicherheit, Analytics oder eingebundene Drittanbieter nutzen. Wo erforderlich, werden Consent oder zusätzliche Informationen bereitgestellt, bevor optionale Technologien eingesetzt werden.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Aufbewahrung",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck, rechtliche Anforderungen, Streitvermeidung oder legitime operative Bedürfnisse nötig ist. Danach werden sie gelöscht oder anonymisiert.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Deine Optionen",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Du kannst Crays kontaktieren, um Auskunft, Korrektur oder Löschung deiner Daten zu verlangen, bestimmten Nutzungen zu widersprechen oder Consent zu widerrufen, soweit die Verarbeitung darauf beruht.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Kontakt: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    }
  },
  "es": {
    "imprint": {
      "url": "https://www.craysclub.com/es/legal/imprint",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Aviso legal",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Información de empresa y contacto de Crays Clubs.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Official Information",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The following company details identify the Crays entities shown in the current Crays legal framework.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contacto",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Email for Crays Club guest access and operating inquiries: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        },
        {
          "tag": "p",
          "id": null,
          "text": "General legal contact from the referenced Crays framework: info@craysclub.com.",
          "links": [
            {
              "href": "mailto:info@craysclub.com",
              "text": "info@craysclub.com"
            }
          ]
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Disclaimer",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The information on this website is provided for general information. Crays makes reasonable efforts to keep content current, but no guarantee is made that all information is complete, accurate or available at all times.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "External links may lead to third-party websites. Crays is not responsible for third-party content and does not automatically endorse it by linking to it.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Copyright and Trademark",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Texts, imagery, logos, layouts, concepts and other website elements are protected by copyright, trademark and related rights unless stated otherwise. Any use beyond normal website viewing requires prior written consent from the rights holder.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays and related marks are used as protected brand identifiers within the Crays ecosystem.",
          "links": []
        }
      ]
    },
    "terms-and-conditions": {
      "url": "https://www.craysclub.com/es/legal/terms-and-conditions",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Términos y condiciones",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Términos operativos claros para el uso de la web, solicitudes de early access y comunicación de Crays Club.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Alcance",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "These terms apply to the use of CraysClub.com, the information presented on this website and any early access, guest access or membership interest submitted through Crays Club contact channels.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Specific paid products, stays, events, memberships or partner services may be subject to separate agreements, booking terms or local requirements. If separate terms apply, those terms take priority for the relevant transaction.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Content",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club content describes concepts, planned features, community layers, locations and service ideas. Some elements may be in development, limited by availability or adapted before launch.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We may update, remove or restructure website content at any time to keep the Crays Club experience accurate and current.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Access Requests",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Submitting a request for guest access, membership access or information does not create an automatic right to admission, booking or participation. Crays may review requests, contact applicants and decide access based on availability, operational fit and applicable rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You are responsible for providing accurate contact information and for keeping your communication respectful, lawful and relevant to the requested Crays service.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Third-Party Services",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club may link to or cooperate with third-party platforms, venues, hospitality providers, payment providers, social networks or community tools. Those providers may apply their own terms and privacy rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays is not responsible for third-party websites or services unless responsibility is mandatory under applicable law.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Responsabilidad",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays works to keep the website available and reliable, but uninterrupted access cannot be guaranteed. Liability is limited to the extent permitted by applicable law.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Nothing in these terms limits mandatory statutory rights or liability that cannot legally be excluded.",
          "links": []
        }
      ]
    },
    "data-protection": {
      "url": "https://www.craysclub.com/es/legal/data-protection",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Protección de datos",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Cómo Crays Club gestiona datos personales cuando se visita la web, se solicita access o se contacta con el equipo.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Personal Data We Process",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "When you visit CraysClub.com, request Crays access or contact us, we may process contact details, message content, technical browser information, usage data and information needed to respond to your request.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We only ask for information that is useful for operating the Crays Club experience, handling communication, improving the website or preparing requested services.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Purposes",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Providing and improving the website.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Responding to inquiries and access requests.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Preparing guest, member, partner or community communication.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Protecting the website against misuse, spam and security incidents.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Meeting legal, accounting or compliance obligations where required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Legal Bases",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on the context, processing may be based on contractual steps, consent, legal obligations or legitimate interests such as secure website operation, communication management and product improvement.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You may withdraw consent where processing is based on consent. Withdrawal does not affect processing that took place before the withdrawal.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Sharing and Service Providers",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays may use technical providers for hosting, analytics, communication, security, forms and related operational services. Providers are selected to support secure and reliable operation.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Where information is transferred internationally, Crays uses appropriate safeguards where legally required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Rights",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on applicable law, you may have rights to access, correct, delete, restrict or receive your personal data, object to certain processing and complain to a supervisory authority.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "To exercise privacy rights, contact team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    },
    "privacy-policy": {
      "url": "https://www.craysclub.com/es/legal/privacy-policy",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Política de privacidad",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Un resumen práctico de privacidad para visitantes, solicitudes de early access y contactos de la Crays Club community.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Resumen",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club usa datos personales para operar la web, responder mensajes, gestionar interés de access y mejorar la community experience. Buscamos que la recogida de datos sea clara y limitada.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Esta política complementa la página de Data Protection y explica cómo se maneja la información relevante para la privacidad en CraysClub.com.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Visits",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Al visitar la web, proveedores de hosting e infraestructura pueden tratar datos técnicos como tipo de navegador, dispositivo, horas de acceso, páginas solicitadas y logs de seguridad.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Esta información ayuda a entregar páginas, prevenir abusos, resolver errores y mantener seguro el servicio.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contact and Access Forms",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Si contactas con Crays o solicitas access, tratamos los datos que aportas, como nombre, email, mensaje y contexto relevante. Se usan para responder y evaluar la interacción solicitada con Crays Club.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "No envíes información sensible salvo que sea necesaria para esa solicitud concreta.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Cookies and Similar Technologies",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "La web puede usar tecnologías para funcionalidad básica, seguridad, analytics o servicios externos integrados. Cuando sea necesario, se pedirá consentimiento o se dará información adicional antes de usar tecnologías opcionales.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Retention",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Los datos se conservan solo durante el tiempo necesario para la finalidad, requisitos legales, prevención de disputas o necesidades operativas legítimas. Después se eliminan o anonimizan cuando procede.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Choices",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Puedes contactar con Crays para preguntar por tus datos, pedir corrección o eliminación, oponerte a ciertos usos o retirar el consentimiento cuando el tratamiento dependa de él.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Contacto: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    }
  },
  "ca": {
    "imprint": {
      "url": "https://www.craysclub.com/ca/legal/imprint",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Avís legal",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Informació d'empresa i contacte de Crays Clubs.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Official Information",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The following company details identify the Crays entities shown in the current Crays legal framework.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contacte",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Email for Crays Club guest access and operating inquiries: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        },
        {
          "tag": "p",
          "id": null,
          "text": "General legal contact from the referenced Crays framework: info@craysclub.com.",
          "links": [
            {
              "href": "mailto:info@craysclub.com",
              "text": "info@craysclub.com"
            }
          ]
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Disclaimer",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The information on this website is provided for general information. Crays makes reasonable efforts to keep content current, but no guarantee is made that all information is complete, accurate or available at all times.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "External links may lead to third-party websites. Crays is not responsible for third-party content and does not automatically endorse it by linking to it.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Copyright and Trademark",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Texts, imagery, logos, layouts, concepts and other website elements are protected by copyright, trademark and related rights unless stated otherwise. Any use beyond normal website viewing requires prior written consent from the rights holder.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays and related marks are used as protected brand identifiers within the Crays ecosystem.",
          "links": []
        }
      ]
    },
    "terms-and-conditions": {
      "url": "https://www.craysclub.com/ca/legal/terms-and-conditions",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Termes i condicions",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Termes operatius clars per a l'ús de la web, sol·licituds d'early access i comunicació de Crays Club.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Scope",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "These terms apply to the use of CraysClub.com, the information presented on this website and any early access, guest access or membership interest submitted through Crays Club contact channels.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Specific paid products, stays, events, memberships or partner services may be subject to separate agreements, booking terms or local requirements. If separate terms apply, those terms take priority for the relevant transaction.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Content",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club content describes concepts, planned features, community layers, locations and service ideas. Some elements may be in development, limited by availability or adapted before launch.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We may update, remove or restructure website content at any time to keep the Crays Club experience accurate and current.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Access Requests",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Submitting a request for guest access, membership access or information does not create an automatic right to admission, booking or participation. Crays may review requests, contact applicants and decide access based on availability, operational fit and applicable rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You are responsible for providing accurate contact information and for keeping your communication respectful, lawful and relevant to the requested Crays service.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Third-Party Services",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club may link to or cooperate with third-party platforms, venues, hospitality providers, payment providers, social networks or community tools. Those providers may apply their own terms and privacy rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays is not responsible for third-party websites or services unless responsibility is mandatory under applicable law.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Liability",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays works to keep the website available and reliable, but uninterrupted access cannot be guaranteed. Liability is limited to the extent permitted by applicable law.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Nothing in these terms limits mandatory statutory rights or liability that cannot legally be excluded.",
          "links": []
        }
      ]
    },
    "data-protection": {
      "url": "https://www.craysclub.com/ca/legal/data-protection",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Protecció de dades",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Com Crays Club tracta dades personals quan es visita la web, es demana access o es contacta amb l'equip.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Personal Data We Process",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "When you visit CraysClub.com, request Crays access or contact us, we may process contact details, message content, technical browser information, usage data and information needed to respond to your request.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We only ask for information that is useful for operating the Crays Club experience, handling communication, improving the website or preparing requested services.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Purposes",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Providing and improving the website.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Responding to inquiries and access requests.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Preparing guest, member, partner or community communication.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Protecting the website against misuse, spam and security incidents.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Meeting legal, accounting or compliance obligations where required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Legal Bases",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on the context, processing may be based on contractual steps, consent, legal obligations or legitimate interests such as secure website operation, communication management and product improvement.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You may withdraw consent where processing is based on consent. Withdrawal does not affect processing that took place before the withdrawal.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Sharing and Service Providers",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays may use technical providers for hosting, analytics, communication, security, forms and related operational services. Providers are selected to support secure and reliable operation.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Where information is transferred internationally, Crays uses appropriate safeguards where legally required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Rights",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on applicable law, you may have rights to access, correct, delete, restrict or receive your personal data, object to certain processing and complain to a supervisory authority.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "To exercise privacy rights, contact team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    },
    "privacy-policy": {
      "url": "https://www.craysclub.com/ca/legal/privacy-policy",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Política de privacitat",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Un resum pràctic de privacitat per a visitants, sol·licituds d'early access i contactes de la Crays Club community.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Overview",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club utilitza dades personals per operar la web, respondre missatges, gestionar interès d'access i millorar la community experience. Volem que la recollida de dades sigui clara i limitada.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Aquesta política complementa la pàgina de Data Protection i explica el tractament pràctic de la informació rellevant per a la privacitat a CraysClub.com.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Visits",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Quan es visita la web, proveïdors de hosting i infraestructura poden tractar informació tècnica com navegador, dispositiu, hores d'accés, pàgines sol·licitades i logs de seguretat.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Aquesta informació ajuda a servir pàgines, prevenir abusos, resoldre errors i mantenir segur el servei.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contact and Access Forms",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Si contactes amb Crays o demanes access, tractem les dades que facilites, com nom, email, missatge i context rellevant. S'utilitzen per respondre i avaluar la interacció sol·licitada amb Crays Club.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "No enviïs informació sensible llevat que sigui necessària per a la petició concreta.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Cookies and Similar Technologies",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "La web pot usar tecnologies per a funcionalitat bàsica, seguretat, analytics o serveis externs integrats. Quan calgui, es demanarà consentiment o es donarà informació addicional abans d'usar tecnologies opcionals.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Retention",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Les dades es conserven només el temps necessari per a la finalitat, requisits legals, prevenció de conflictes o necessitats operatives legítimes. Després s'eliminen o anonimitzen quan correspongui.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Choices",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Pots contactar amb Crays per preguntar per les teves dades, demanar correcció o eliminació, oposar-te a certs usos o retirar consentiment quan el tractament en depengui.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Contacte: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    }
  },
  "fr": {
    "imprint": {
      "url": "https://www.craysclub.com/fr/legal/imprint",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Mentions légales",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Informations société et contact pour Crays Clubs.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Official Information",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The following company details identify the Crays entities shown in the current Crays legal framework.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contact",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Email for Crays Club guest access and operating inquiries: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        },
        {
          "tag": "p",
          "id": null,
          "text": "General legal contact from the referenced Crays framework: info@craysclub.com.",
          "links": [
            {
              "href": "mailto:info@craysclub.com",
              "text": "info@craysclub.com"
            }
          ]
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Disclaimer",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The information on this website is provided for general information. Crays makes reasonable efforts to keep content current, but no guarantee is made that all information is complete, accurate or available at all times.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "External links may lead to third-party websites. Crays is not responsible for third-party content and does not automatically endorse it by linking to it.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Copyright and Trademark",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Texts, imagery, logos, layouts, concepts and other website elements are protected by copyright, trademark and related rights unless stated otherwise. Any use beyond normal website viewing requires prior written consent from the rights holder.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays and related marks are used as protected brand identifiers within the Crays ecosystem.",
          "links": []
        }
      ]
    },
    "terms-and-conditions": {
      "url": "https://www.craysclub.com/fr/legal/terms-and-conditions",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Conditions générales",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Conditions opérationnelles claires pour l'usage du site, les demandes d'early access et la communication Crays Club.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Scope",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "These terms apply to the use of CraysClub.com, the information presented on this website and any early access, guest access or membership interest submitted through Crays Club contact channels.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Specific paid products, stays, events, memberships or partner services may be subject to separate agreements, booking terms or local requirements. If separate terms apply, those terms take priority for the relevant transaction.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Content",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club content describes concepts, planned features, community layers, locations and service ideas. Some elements may be in development, limited by availability or adapted before launch.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We may update, remove or restructure website content at any time to keep the Crays Club experience accurate and current.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Access Requests",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Submitting a request for guest access, membership access or information does not create an automatic right to admission, booking or participation. Crays may review requests, contact applicants and decide access based on availability, operational fit and applicable rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You are responsible for providing accurate contact information and for keeping your communication respectful, lawful and relevant to the requested Crays service.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Third-Party Services",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club may link to or cooperate with third-party platforms, venues, hospitality providers, payment providers, social networks or community tools. Those providers may apply their own terms and privacy rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays is not responsible for third-party websites or services unless responsibility is mandatory under applicable law.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Liability",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays works to keep the website available and reliable, but uninterrupted access cannot be guaranteed. Liability is limited to the extent permitted by applicable law.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Nothing in these terms limits mandatory statutory rights or liability that cannot legally be excluded.",
          "links": []
        }
      ]
    },
    "data-protection": {
      "url": "https://www.craysclub.com/fr/legal/data-protection",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Protection des données",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Comment Crays Club traite les données personnelles lors des visites, demandes d'access ou contacts avec l'équipe.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Personal Data We Process",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "When you visit CraysClub.com, request Crays access or contact us, we may process contact details, message content, technical browser information, usage data and information needed to respond to your request.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We only ask for information that is useful for operating the Crays Club experience, handling communication, improving the website or preparing requested services.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Purposes",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Providing and improving the website.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Responding to inquiries and access requests.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Preparing guest, member, partner or community communication.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Protecting the website against misuse, spam and security incidents.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Meeting legal, accounting or compliance obligations where required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Legal Bases",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on the context, processing may be based on contractual steps, consent, legal obligations or legitimate interests such as secure website operation, communication management and product improvement.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You may withdraw consent where processing is based on consent. Withdrawal does not affect processing that took place before the withdrawal.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Sharing and Service Providers",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays may use technical providers for hosting, analytics, communication, security, forms and related operational services. Providers are selected to support secure and reliable operation.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Where information is transferred internationally, Crays uses appropriate safeguards where legally required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Rights",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on applicable law, you may have rights to access, correct, delete, restrict or receive your personal data, object to certain processing and complain to a supervisory authority.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "To exercise privacy rights, contact team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    },
    "privacy-policy": {
      "url": "https://www.craysclub.com/fr/legal/privacy-policy",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Politique de confidentialité",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Un aperçu privacy pratique pour visiteurs, demandes d'early access et contacts de la Crays Club community.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Overview",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club utilise des données personnelles pour exploiter le site, répondre aux messages, gérer l'intérêt access et améliorer la community experience. La collecte reste ciblée et lisible.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Cette politique complète la page Data Protection et explique le traitement pratique des informations liées à la privacy sur CraysClub.com.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Visits",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Lors d'une visite, des informations techniques comme navigateur, appareil, heures d'accès, pages demandées et logs de sécurité peuvent être traitées par les fournisseurs d'hébergement et d'infrastructure.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Ces informations aident à servir les pages, prévenir les abus, corriger les erreurs et sécuriser le service.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contact and Access Forms",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Si vous contactez Crays ou demandez access, nous traitons les données fournies, comme nom, email, message et contexte utile. Elles servent à répondre et évaluer l'interaction Crays Club demandée.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "N'envoyez pas d'informations sensibles sauf si elles sont nécessaires à la demande précise.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Cookies and Similar Technologies",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Le site peut utiliser des technologies pour les fonctions de base, la sécurité, analytics ou des services tiers intégrés. Lorsque nécessaire, un consentement ou des informations supplémentaires seront fournis avant toute technologie optionnelle.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Retention",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Les données sont conservées seulement le temps nécessaire à la finalité, aux obligations légales, à la prévention des litiges ou aux besoins opérationnels légitimes. Ensuite, elles sont supprimées ou anonymisées.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Choices",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Vous pouvez contacter Crays pour vos données personnelles, demander correction ou suppression, vous opposer à certains usages ou retirer un consentement lorsque le traitement en dépend.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Contact : team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    }
  },
  "pt": {
    "imprint": {
      "url": "https://www.craysclub.com/pt/legal/imprint",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Ficha legal",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Informação de empresa e contacto da Crays Clubs.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Official Information",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The following company details identify the Crays entities shown in the current Crays legal framework.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contacto",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Email for Crays Club guest access and operating inquiries: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        },
        {
          "tag": "p",
          "id": null,
          "text": "General legal contact from the referenced Crays framework: info@craysclub.com.",
          "links": [
            {
              "href": "mailto:info@craysclub.com",
              "text": "info@craysclub.com"
            }
          ]
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Disclaimer",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The information on this website is provided for general information. Crays makes reasonable efforts to keep content current, but no guarantee is made that all information is complete, accurate or available at all times.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "External links may lead to third-party websites. Crays is not responsible for third-party content and does not automatically endorse it by linking to it.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Copyright and Trademark",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Texts, imagery, logos, layouts, concepts and other website elements are protected by copyright, trademark and related rights unless stated otherwise. Any use beyond normal website viewing requires prior written consent from the rights holder.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays and related marks are used as protected brand identifiers within the Crays ecosystem.",
          "links": []
        }
      ]
    },
    "terms-and-conditions": {
      "url": "https://www.craysclub.com/pt/legal/terms-and-conditions",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Termos e condições",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Termos operacionais claros para uso do site, pedidos de early access e comunicação Crays Club.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Scope",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "These terms apply to the use of CraysClub.com, the information presented on this website and any early access, guest access or membership interest submitted through Crays Club contact channels.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Specific paid products, stays, events, memberships or partner services may be subject to separate agreements, booking terms or local requirements. If separate terms apply, those terms take priority for the relevant transaction.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Content",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club content describes concepts, planned features, community layers, locations and service ideas. Some elements may be in development, limited by availability or adapted before launch.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We may update, remove or restructure website content at any time to keep the Crays Club experience accurate and current.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Access Requests",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Submitting a request for guest access, membership access or information does not create an automatic right to admission, booking or participation. Crays may review requests, contact applicants and decide access based on availability, operational fit and applicable rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You are responsible for providing accurate contact information and for keeping your communication respectful, lawful and relevant to the requested Crays service.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Third-Party Services",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club may link to or cooperate with third-party platforms, venues, hospitality providers, payment providers, social networks or community tools. Those providers may apply their own terms and privacy rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays is not responsible for third-party websites or services unless responsibility is mandatory under applicable law.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Liability",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays works to keep the website available and reliable, but uninterrupted access cannot be guaranteed. Liability is limited to the extent permitted by applicable law.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Nothing in these terms limits mandatory statutory rights or liability that cannot legally be excluded.",
          "links": []
        }
      ]
    },
    "data-protection": {
      "url": "https://www.craysclub.com/pt/legal/data-protection",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Proteção de dados",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Como a Crays Club trata dados pessoais quando pessoas visitam o site, pedem access ou contactam a equipa.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Personal Data We Process",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "When you visit CraysClub.com, request Crays access or contact us, we may process contact details, message content, technical browser information, usage data and information needed to respond to your request.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We only ask for information that is useful for operating the Crays Club experience, handling communication, improving the website or preparing requested services.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Purposes",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Providing and improving the website.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Responding to inquiries and access requests.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Preparing guest, member, partner or community communication.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Protecting the website against misuse, spam and security incidents.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Meeting legal, accounting or compliance obligations where required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Legal Bases",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on the context, processing may be based on contractual steps, consent, legal obligations or legitimate interests such as secure website operation, communication management and product improvement.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You may withdraw consent where processing is based on consent. Withdrawal does not affect processing that took place before the withdrawal.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Sharing and Service Providers",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays may use technical providers for hosting, analytics, communication, security, forms and related operational services. Providers are selected to support secure and reliable operation.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Where information is transferred internationally, Crays uses appropriate safeguards where legally required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Rights",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on applicable law, you may have rights to access, correct, delete, restrict or receive your personal data, object to certain processing and complain to a supervisory authority.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "To exercise privacy rights, contact team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    },
    "privacy-policy": {
      "url": "https://www.craysclub.com/pt/legal/privacy-policy",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Política de privacidade",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Um resumo prático de privacidade para visitantes, pedidos de early access e contactos da Crays Club community.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Overview",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "A Crays Club usa dados pessoais para operar o site, responder a mensagens, gerir interesse de access e melhorar a community experience. A recolha de dados deve ser focada e compreensível.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Esta política complementa a página Data Protection e explica o tratamento prático de informação relevante para privacidade em CraysClub.com.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Visits",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Ao visitar o site, fornecedores de hosting e infraestrutura podem tratar informação técnica como navegador, dispositivo, horas de acesso, páginas pedidas e logs de segurança.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Esta informação ajuda a entregar páginas, prevenir abuso, resolver erros e manter o serviço seguro.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contact and Access Forms",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Se contactar a Crays ou pedir access, tratamos os dados fornecidos, como nome, email, mensagem e contexto relevante. A informação é usada para responder e avaliar a interação Crays Club pedida.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Não envie informação sensível salvo se for necessária para o pedido específico.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Cookies and Similar Technologies",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "O site pode usar tecnologias para funcionalidade básica, segurança, analytics ou serviços terceiros integrados. Quando necessário, será pedido consentimento ou dada informação adicional antes de tecnologias opcionais.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Retention",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Os dados são guardados apenas pelo tempo necessário para a finalidade, requisitos legais, prevenção de litígios ou necessidades operacionais legítimas. Depois são apagados ou anonimizados.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Choices",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Pode contactar a Crays para perguntar sobre os seus dados, pedir correção ou eliminação, opor-se a certos usos ou retirar consentimento quando o tratamento dependa dele.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Contacto: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    }
  },
  "it": {
    "imprint": {
      "url": "https://www.craysclub.com/it/legal/imprint",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Note legali",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Informazioni aziendali e contatti per Crays Clubs.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Official Information",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The following company details identify the Crays entities shown in the current Crays legal framework.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contatto",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Email for Crays Club guest access and operating inquiries: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        },
        {
          "tag": "p",
          "id": null,
          "text": "General legal contact from the referenced Crays framework: info@craysclub.com.",
          "links": [
            {
              "href": "mailto:info@craysclub.com",
              "text": "info@craysclub.com"
            }
          ]
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Disclaimer",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "The information on this website is provided for general information. Crays makes reasonable efforts to keep content current, but no guarantee is made that all information is complete, accurate or available at all times.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "External links may lead to third-party websites. Crays is not responsible for third-party content and does not automatically endorse it by linking to it.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Copyright and Trademark",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Texts, imagery, logos, layouts, concepts and other website elements are protected by copyright, trademark and related rights unless stated otherwise. Any use beyond normal website viewing requires prior written consent from the rights holder.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays and related marks are used as protected brand identifiers within the Crays ecosystem.",
          "links": []
        }
      ]
    },
    "terms-and-conditions": {
      "url": "https://www.craysclub.com/it/legal/terms-and-conditions",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Termini e condizioni",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Termini operativi chiari per uso del sito, richieste di early access e comunicazione Crays Club.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Scope",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "These terms apply to the use of CraysClub.com, the information presented on this website and any early access, guest access or membership interest submitted through Crays Club contact channels.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Specific paid products, stays, events, memberships or partner services may be subject to separate agreements, booking terms or local requirements. If separate terms apply, those terms take priority for the relevant transaction.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Content",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club content describes concepts, planned features, community layers, locations and service ideas. Some elements may be in development, limited by availability or adapted before launch.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We may update, remove or restructure website content at any time to keep the Crays Club experience accurate and current.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Access Requests",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Submitting a request for guest access, membership access or information does not create an automatic right to admission, booking or participation. Crays may review requests, contact applicants and decide access based on availability, operational fit and applicable rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You are responsible for providing accurate contact information and for keeping your communication respectful, lawful and relevant to the requested Crays service.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Third-Party Services",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club may link to or cooperate with third-party platforms, venues, hospitality providers, payment providers, social networks or community tools. Those providers may apply their own terms and privacy rules.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays is not responsible for third-party websites or services unless responsibility is mandatory under applicable law.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Liability",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays works to keep the website available and reliable, but uninterrupted access cannot be guaranteed. Liability is limited to the extent permitted by applicable law.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Nothing in these terms limits mandatory statutory rights or liability that cannot legally be excluded.",
          "links": []
        }
      ]
    },
    "data-protection": {
      "url": "https://www.craysclub.com/it/legal/data-protection",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Protezione dati",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Come Crays Club gestisce dati personali quando si visita il sito, si richiede access o si contatta il team.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Personal Data We Process",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "When you visit CraysClub.com, request Crays access or contact us, we may process contact details, message content, technical browser information, usage data and information needed to respond to your request.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "We only ask for information that is useful for operating the Crays Club experience, handling communication, improving the website or preparing requested services.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Purposes",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Providing and improving the website.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Responding to inquiries and access requests.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Preparing guest, member, partner or community communication.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Protecting the website against misuse, spam and security incidents.",
          "links": []
        },
        {
          "tag": "li",
          "id": null,
          "text": "Meeting legal, accounting or compliance obligations where required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Legal Bases",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on the context, processing may be based on contractual steps, consent, legal obligations or legitimate interests such as secure website operation, communication management and product improvement.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "You may withdraw consent where processing is based on consent. Withdrawal does not affect processing that took place before the withdrawal.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Sharing and Service Providers",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays may use technical providers for hosting, analytics, communication, security, forms and related operational services. Providers are selected to support secure and reliable operation.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Where information is transferred internationally, Crays uses appropriate safeguards where legally required.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Rights",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Depending on applicable law, you may have rights to access, correct, delete, restrict or receive your personal data, object to certain processing and complain to a supervisory authority.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "To exercise privacy rights, contact team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    },
    "privacy-policy": {
      "url": "https://www.craysclub.com/it/legal/privacy-policy",
      "records": [
        {
          "tag": "h1",
          "id": null,
          "text": "Privacy Policy",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Una panoramica privacy pratica per visitatori, richieste di early access e contatti della Crays Club community.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Overview",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Crays Club usa dati personali per gestire il sito, rispondere ai messaggi, gestire l'interesse access e migliorare la community experience. La raccolta dati resta chiara e mirata.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Questa policy integra la pagina Data Protection e spiega la gestione pratica delle informazioni privacy su CraysClub.com.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Website Visits",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Quando il sito viene visitato, provider di hosting e infrastruttura possono trattare informazioni tecniche come browser, dispositivo, orari di accesso, pagine richieste e log di sicurezza.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Queste informazioni aiutano a servire le pagine, prevenire abusi, risolvere errori e mantenere sicuro il servizio.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Contact and Access Forms",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Se contatti Crays o richiedi access, trattiamo i dati forniti, come nome, email, messaggio e contesto utile. Sono usati per rispondere e valutare l'interazione Crays Club richiesta.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Non inviare informazioni sensibili salvo se necessarie per la richiesta specifica.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Cookies and Similar Technologies",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Il sito può usare tecnologie per funzionalità base, sicurezza, analytics o servizi terzi integrati. Dove necessario, verranno forniti consenso o informazioni aggiuntive prima dell'uso di tecnologie opzionali.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Retention",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "I dati sono conservati solo per il tempo necessario allo scopo, agli obblighi legali, alla prevenzione di controversie o a esigenze operative legittime. Poi sono cancellati o anonimizzati.",
          "links": []
        },
        {
          "tag": "h2",
          "id": null,
          "text": "Your Choices",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Puoi contattare Crays per chiedere informazioni sui tuoi dati, richiedere correzione o cancellazione, opporti a certi usi o revocare il consenso quando il trattamento dipende da esso.",
          "links": []
        },
        {
          "tag": "p",
          "id": null,
          "text": "Contatto: team@craysclub.com.",
          "links": [
            {
              "href": "mailto:team@craysclub.com",
              "text": "team@craysclub.com"
            }
          ]
        }
      ]
    }
  }
} as const;

export function getLegalDocument(
  locale: LegalLocale,
  slug: LegalDocumentSlug,
): LegalDocument {
  const document = locale === "en" ? legalSource.en[slug] as LegalDocument : (localizedLegalCopy as unknown as Record<Exclude<LegalLocale, "en">, Record<LegalDocumentSlug, LegalDocument>>)[locale][slug];
  if (slug !== "imprint") return document;
  const records = [...document.records];
  records.splice(4, 0,
    {tag: "h3", id: null, text: "Association", links: []},
    {tag: "address", id: null, text: "Crays Business Nomads Club Association; Schindellegistrasse 73; CH-8808 Pfäffikon, Switzerland", links: []},
    {tag: "p", id: null, text: "President: Kai Thorben Biesenbach", links: []},
    {tag: "h3", id: null, text: "Operating Entity", links: []},
    {tag: "address", id: null, text: CLUBS_OPERATING_DETAILS, links: []},
    {tag: "p", id: null, text: CLUBS_OPERATING_BOARD, links: []},
  );
  return {...document, records};
}

export function getLegalDocumentTitle(
  locale: LegalLocale,
  slug: LegalDocumentSlug,
): string {
  return getLegalDocument(locale, slug).records[0]?.text ?? slug;
}
