"use client";
import type { FormEventHandler, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { ClubsMembershipApplicationInput } from "../../../lib/clubs/public-ambassador-registry";
import type { ClubsLocale } from "../../../lib/clubs/public-site";
import { ambassadorEditorialCopy } from "./clubs-ambassador-editorial-copy";
import { ambassadorJourneyCopy } from "./clubs-ambassador-journey-copy";
import { AMBASSADOR_DIRECTORY_COPY } from "./clubs-ambassador-directory-copy";
import { ClubsAmbassadorApplicationFields } from "./clubs-ambassador-application-fields";
import styles from "./clubs-public-contact-form.module.css";
type Props = {
 locale: ClubsLocale;
 ambassadorName: string;
 input: ClubsMembershipApplicationInput;
 errors: Partial<Record<keyof ClubsMembershipApplicationInput, string>>;
 setValue: <K extends keyof ClubsMembershipApplicationInput>(name:K,value:ClubsMembershipApplicationInput[K]) => void;
 onSubmit: FormEventHandler<HTMLFormElement>;
 submissionLocked: boolean;
 fieldsLocked: boolean;
 submitLabel: string;
 status: ReactNode;
};
// Presentation only: the real application controller owns submission and immutable URL attribution.
export function ClubsAmbassadorApplicationForm({locale,ambassadorName,input,errors,setValue,onSubmit,submissionLocked,fieldsLocked,submitLabel,status}:Props) {
 const copy=ambassadorJourneyCopy[locale];
 return <section id="ambassador-contact" className={styles.section} aria-labelledby="application-title">
  <header><h2 id="application-title">{ambassadorEditorialCopy[locale].formTitle}</h2><p>{AMBASSADOR_DIRECTORY_COPY[locale].noAccount}</p></header>
  <form onSubmit={onSubmit} noValidate>
   <p className={styles.recipient}>{copy.referralLabel}: {ambassadorName}</p>
   <fieldset disabled={fieldsLocked}>
    <ClubsAmbassadorApplicationFields locale={locale} input={input} errors={errors} setValue={setValue}
      styles={{...styles,twoColumns:styles.row}} />
   </fieldset>
   <button type="submit" disabled={submissionLocked}>{submitLabel}<ArrowRight size={18} aria-hidden="true"/></button>
   <div role="status" aria-live="polite">{status}</div>
  </form>
 </section>;
}
