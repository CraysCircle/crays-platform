import { CLUBS_OPERATING_ENTITY, CLUBS_OPERATING_CEO } from "@/lib/clubs/operating-entity";

import { ClubsPublicShell } from "./clubs-public-shell";
import { LegalFamilyNav, LegalReadingLayout } from "./legal-family-layout";
import family from "./legal-family-layout.module.css";
import styles from "./imprint-page.module.css";

const LEGAL_LOCALES = ["en", "de", "es", "ca", "fr", "pt", "it"] as const;


export function ImprintPage() {
  return (
    <ClubsPublicShell
      availableLocales={LEGAL_LOCALES}
      headerTone="overlay"
      locale="en"
    >
      <main className={`${styles.page} ${family.root}`} id="clubs-legal-imprint-content">
        <section className={styles.hero} aria-labelledby="imprint-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Legal</p>
              <h1 id="imprint-title">Imprint</h1>
              <p className={styles.heroIntro}>
                Company and contact information for Crays Clubs.
              </p>
            </div>

            <aside className={styles.legalContact} aria-labelledby="legal-contact-title">
              <h2 id="legal-contact-title">Legal contact</h2>
              <p>For Crays Club inquiries, use the operating Crays contact channel.</p>
              <a href="mailto:team@craysclub.com">team@craysclub.com</a>
            </aside>
          </div>
        </section>

        

        <LegalFamilyNav current="imprint"/>
        <LegalReadingLayout current="imprint" items={[
          {id:"official-information-title",title:"Official Information"},
          {id:"contact-title",title:"Contact"},
          {id:"imprint-disclaimer",title:"Disclaimer"},
          {id:"imprint-copyright",title:"Copyright and Trademark"}
        ]}>
        <section className={styles.officialSection} aria-labelledby="official-information-title">
          <div className={styles.contentInner}>
            <header className={styles.sectionHeader}>
              <h2 id="official-information-title">Official Information</h2>
              <p>
                The following details identify Crays AG as the operating entity.
              </p>
            </header>

            <div className={`${styles.entityGrid} ${styles.singleEntity}`}>
              <article className={styles.entity}>
                <p className={styles.entityLabel}>Operating Entity</p>
                <h3>{CLUBS_OPERATING_ENTITY.displayName}</h3>
                <address>{CLUBS_OPERATING_ENTITY.streetAddress}<br />
                  {CLUBS_OPERATING_ENTITY.postalCode} {CLUBS_OPERATING_ENTITY.locality}, {CLUBS_OPERATING_ENTITY.country}
                </address>
                <p className={styles.director}>{CLUBS_OPERATING_CEO}</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.contactSection} aria-labelledby="contact-title">
          <div className={styles.contactInner}>
            <h2 id="contact-title">Contact</h2>
            <div>
              <p>
                Email for Crays Club guest access and operating inquiries:{" "}
                <a href="mailto:team@craysclub.com">team@craysclub.com</a>.
              </p>
              <p>
                General legal contact from the referenced Crays framework:{" "}
                <a href="mailto:info@craysclub.com">info@craysclub.com</a>.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.disclosureSection} aria-label="Legal notices">
          <div className={styles.disclosureGrid}>
            <article className={styles.disclosure}>
              <h2 id="imprint-disclaimer">Disclaimer</h2>
              <p>
                The information on this website is provided for general information. Crays makes reasonable efforts to keep content current, but no guarantee is made that all information is complete, accurate or available at all times.
              </p>
              <p>
                External links may lead to third-party websites. Crays is not responsible for third-party content and does not automatically endorse it by linking to it.
              </p>
            </article>

            <article className={`${styles.disclosure} ${styles.copyright}`}>
              <h2 id="imprint-copyright">Copyright and Trademark</h2>
              <p>
                Texts, imagery, logos, layouts, concepts and other website elements are protected by copyright, trademark and related rights unless stated otherwise. Any use beyond normal website viewing requires prior written consent from the rights holder.
              </p>
              <p>
                Crays and related marks are used as protected brand identifiers within the Crays ecosystem.
              </p>
            </article>
          </div>
        </section>

        
        </LegalReadingLayout>
      </main>
    </ClubsPublicShell>
  );
}
