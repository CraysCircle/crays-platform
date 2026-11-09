import Image from "next/image";
import {ArrowRight, CheckCircle2, UserRound} from "lucide-react";
import type {ReactNode} from "react";
import {accountAccessMessages, type ClubsLocale} from "./account-access-messages";
import styles from "./clubs-member-account.module.css";
import tokens from "./clubs-public-design-tokens.module.css";

export type AccountEntryLinks = Readonly<{
  login: string;
  signup: string;
  team: string;
}>;

export type AccountEntryProps = Readonly<{
  locale: ClubsLocale;
  /** The server auth adapter supplies validated transaction links, never user input. */
  links: AccountEntryLinks;
  /** The shared public shell owns real menu navigation and its accessible state. */
  header: ReactNode;
  footer?: ReactNode;
}>;

const steps = [
  ["Create account", "Use secure CRAYS sign-in for your guest or member profile."],
  ["Save stays", "Return to the Forest City properties you are considering."],
  ["Manage requests", "Keep bookings, services and stay details easy to find."],
  ["Get support", "Continue stay conversations from one account."],
] as const;

/** Anonymous entry only. Authenticated routing and entitlements remain server-owned. */
export function AccountEntry({locale, links, header, footer}: AccountEntryProps) {
  const t = (text: string) => accountAccessMessages[locale][text] ?? text;

  return (
    <div className={tokens.theme}>
      {header}
      <main className={styles.account} lang={locale}>
        <section className={styles.signedOutHero}>
          <div className={styles.accountStory}>
            <Image
              alt={t("Forest City Marina Hotel and waterfront")}
              fill
              preload
              sizes="(max-width: 820px) 100vw, 62vw"
              src="/__crays-account/v1/forest-city-marina.jpg"
            />
            <div className={styles.storyShade} />
            <div className={styles.storyContent}>
              <p className={styles.kicker}>{t("ACCOUNT & BOOKING")}</p>
              <h1>{t("Create your CRAYS account for stays, membership and access.")}</h1>
              <p className={styles.lead}>
                {t("Keep saved stays, booking requests, member services and support together in one secure place.")}
              </p>
              <ol className={styles.storySteps}>
                {steps.map(([title, body], index) => (
                  <li key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{t(title)}</strong>
                    <p>{t(body)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className={styles.accessPanelWrap}>
            <div className={styles.accessPanel}>
              <UserRound size={32} aria-hidden />
              <p className={styles.kicker}>{t("CRAYS ACCOUNT")}</p>
              <h2>{t("Sign in to continue")}</h2>
              <p>{t("Access your saved stays, requests, services and member support.")}</p>
              <div className={styles.accessActions}>
                <a className={styles.primaryAction} href={links.login}>
                  {t("Log in")} <ArrowRight size={17} aria-hidden />
                </a>
                <a className={styles.teamLogin} href={links.team}>{t("Team Login")}</a>
                <a className={styles.secondaryAction} href={links.signup}>
                  {t("Create account")}
                </a>
              </div>
              <div className={styles.accessTrust}>
                <CheckCircle2 size={18} aria-hidden />
                <span>{t("Secure CRAYS sign-in. No booking is confirmed by signing in.")}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      {footer}
    </div>
  );
}
