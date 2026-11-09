"use client";



import Image from "next/image";
import { CLUBS_OPERATING_ENTITY, CLUBS_OPERATING_CEO } from "@/lib/clubs/operating-entity";
import {
  ArrowRight,
  Mail,
  MessageCircle,
  Radio,
  type LucideIcon,
} from "lucide-react";

import { contactCopy, type ContactLocale } from "./contact-copy";
import { ClubsPublicShell } from "./clubs-public-shell";
import styles from "./contact-screen-one.module.css";

type Props = { locale: ContactLocale };

const CONTACT_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;

type Channel = {
  href: string;
  icon?: LucideIcon;
  image?: string;
};

const channels: readonly Channel[] = [
  { href: "mailto:info@craysclub.com", icon: Mail },
  {
    href: "https://www.linkedin.com/company/crays/",
    image: "/assets/footer-icons/linkedin.svg",
  },
  {
    href: "https://t.me/thorben_around_the_world",
    image: "/assets/footer-icons/telegram.svg",
  },
  {
    href: "https://wa.me/34655149302",
    image: "/assets/footer-icons/whatsapp.svg",
  },
  { href: "https://signal.me/#p/+34655149302", icon: Radio },
] as const;

const deskEmails = [
  "info@craysclub.com",
  "access@craysclub.com",
  "partners@craysclub.com",
  "support@craysclub.com",
] as const;

const requestValues = [
  "guest-access",
  "club-stay",
  "membership",
  "hospitality-partnership",
  "technical-support",
  "legal-entity",
] as const;

const formBodies: Record<ContactLocale, string> = {
  en: "Use this form for access, stays, partnerships, press, support or official entity questions.",
  de: "Nutze dieses Formular für Zugang, Aufenthalte, Partnerschaften, Presse, Support oder Fragen zu offiziellen Einheiten.",
  es: "Utiliza este formulario para acceso, estancias, colaboraciones, prensa, soporte o preguntas sobre entidades oficiales.",
  ca: "Utilitza aquest formulari per a accés, estades, col·laboracions, premsa, suport o preguntes sobre entitats oficials.",
  fr: "Utilisez ce formulaire pour l’accès, les séjours, les partenariats, la presse, le support ou les questions relatives aux entités officielles.",
  pt: "Utilize este formulário para acesso, estadias, parcerias, imprensa, suporte ou questões sobre entidades oficiais.",
  it: "Usa questo modulo per accesso, soggiorni, collaborazioni, stampa, supporto o domande sulle entità ufficiali.",
};

function ContactScreenOne({ locale }: Props) {
  const copy = contactCopy[locale];
  const heroTitleLines =
    locale === "en"
      ? copy.hero.title
          .replace("Reach the right ", "Reach the right|")
          .replace("desk inside the ", "desk inside the|")
          .split("|")
      : [copy.hero.title];
  const formTitleLines =
    locale === "en"
      ? copy.form.title.replace(" with context.", "|with context.").split("|")
      : [copy.form.title];
  const deskTitleLines =
    [copy.desk.title];
  const officialTitleLines =
    locale === "en"
      ? [copy.official.title]
      : [copy.official.title];
  const communityTitleLines =
    locale === "en"
      ? [copy.community.title]
      : [copy.community.title];

  return (
    <ClubsPublicShell
      availableLocales={CONTACT_LOCALES}
      headerTone="overlay"
      locale={locale}
    >
      <main className={styles.main} id="contact-main">
        <section className={styles.hero} aria-labelledby="contact-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
            <h1 aria-label={copy.hero.title} id="contact-title">
              {heroTitleLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p className={styles.heroLead}>{copy.hero.body}</p>
            <div className={styles.heroActions}>
              <a
                className={styles.primaryAction}
                href="mailto:info@craysclub.com"
              >
                <span>{copy.hero.primary}</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
              </a>
              <a className={styles.secondaryAction} href="#contact-form">
                <span>{copy.hero.secondary}</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
              </a>
            </div>
          </div>

          <figure className={styles.heroMedia}>
            <Image
              alt={copy.hero.mediaAlt}
              data-crays-photo-treatment="none"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 56vw"
              src="/__crays-clubs/contact/design-1/contact-hero-forest-city-v1.png"
              unoptimized
            />
          </figure>
        </section>

        <section
          className={styles.formSection}
          id="contact-form"
          aria-labelledby="contact-form-title"
        >
          <div className={styles.formIntro} id="host-company-inquiry">
            <p className={styles.eyebrow}>{copy.form.eyebrow}</p>
            <h2 aria-label={copy.form.title} id="contact-form-title">
              {formTitleLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p>{formBodies[locale]}</p>
          </div>

          <form
            action="mailto:info@craysclub.com"
            className={styles.form}
            encType="text/plain"
            method="post"
          >
            <div className={styles.fieldPair}>
              <label>
                <span>{copy.form.fullName}</span>
                <input
                  autoComplete="name"
                  name="full_name"
                  required
                  type="text"
                />
              </label>
              <label>
                <span>{copy.form.email}</span>
                <input
                  autoComplete="email"
                  name="email"
                  required
                  type="email"
                />
              </label>
            </div>
            <label>
              <span>{copy.form.requestType}</span>
              <select defaultValue="" name="request_type" required>
                <option value="">{copy.form.requestPlaceholder}</option>
                {copy.form.requestOptions.map((option, index) => (
                  <option
                    key={requestValues[index]}
                    value={requestValues[index]}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{copy.form.message}</span>
              <textarea name="message" required rows={7} />
            </label>
            <label className={styles.consent}>
              <input name="privacy_acceptance" required type="checkbox" />
              <span>
                {copy.form.consentPrefix}{" "}
                <a href={`/${locale}/legal/privacy-policy`}>
                  {copy.form.consentLink}
                </a>
                {copy.form.consentSuffix}
              </span>
            </label>
            <button type="submit">
              <span>{copy.form.send}</span>
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </button>
          </form>

        </section>

        <section className={styles.desk} aria-labelledby="desk-title">
          <div className={styles.deskIntro}>
            <p className={styles.eyebrow}>{copy.desk.eyebrow}</p>
            <h2 aria-label={copy.desk.title} id="desk-title">
              {deskTitleLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>

          </div>
          <div className={styles.deskRoutes}>
            {copy.desk.items.map((item, index) => (
              <article key={item.eyebrow}>
                <span className={styles.routeNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className={styles.eyebrow}>{item.eyebrow}</p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <a href={`mailto:${deskEmails[index]}`}>
                    {deskEmails[index]}
                    <ArrowRight
                      aria-hidden="true"
                      size={16}
                      strokeWidth={1.7}
                    />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.channels} aria-labelledby="channels-title">
          <p className={styles.eyebrow}>{copy.channels.eyebrow}</p>
          <h2 className={styles.visuallyHidden} id="channels-title">
            {copy.channels.title}
          </h2>
          <div className={styles.channelList}>
            {channels.map((channel, index) => {
              const item = copy.channels.items[index];
              const external = channel.href.startsWith("http");
              const ChannelIcon = channel.icon;

              return (
                <a
                  href={channel.href}
                  key={channel.href}
                  rel={external ? "noreferrer noopener" : undefined}
                  target={external ? "_blank" : undefined}
                >
                  <span className={styles.channelMark} aria-hidden="true">
                    {channel.image ? (
                      <Image
                        alt=""
                        data-crays-photo-treatment="none"
                        height={21}
                        src={channel.image}
                        width={21}
                      />
                    ) : ChannelIcon ? (
                      <ChannelIcon size={21} strokeWidth={1.6} />
                    ) : null}
                  </span>
                  <span className={styles.channelText}>
                    <strong>{item.label}</strong>
                    <small>{item.detail} <ArrowRight aria-hidden="true" size={14}/></small>
                  </span>

                </a>
              );
            })}
          </div>
        </section>

        <div className={styles.bottomGrid}>
        <section className={styles.official} aria-labelledby="official-title">
          <header className={styles.officialHeader}>
            <div>
              <p className={styles.eyebrow}>{copy.official.eyebrow}</p>
              <h2 aria-label={copy.official.title} id="official-title">
                {officialTitleLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h2>
            </div>
            <div className={styles.operatingEntity}>
              <h3>{CLUBS_OPERATING_ENTITY.displayName}</h3>
              <address>{CLUBS_OPERATING_ENTITY.streetAddress}<br />
                {CLUBS_OPERATING_ENTITY.postalCode} {CLUBS_OPERATING_ENTITY.locality}, {CLUBS_OPERATING_ENTITY.country}
              </address>
              <p>{CLUBS_OPERATING_CEO}</p>
            </div>
            <a href={`/${locale}/legal/imprint`}>
              {copy.official.imprint}
              <ArrowRight aria-hidden="true" size={17} strokeWidth={1.7} />
            </a>
          </header>
        </section>

        <section className={styles.community} aria-labelledby="community-title">
          <div className={styles.communityCopy}>
            <MessageCircle aria-hidden="true" size={36} strokeWidth={1.2} />
            <p className={styles.eyebrow}>{copy.community.eyebrow}</p>
            <h2 aria-label={copy.community.title} id="community-title">
              {communityTitleLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>


          </div>

        </section>
        </div>
      </main>
    </ClubsPublicShell>
  );
}

export function ClubsContactPage({locale}:Props){return <ContactScreenOne locale={locale}/>;}
