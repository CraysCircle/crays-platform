import {TodayLocalizedContent} from "./today-localized-content";
import styles from "./clubs-membership-process-notice.module.css";
/** Process explanation; profile, decision delivery and durable-plan authority remain in the SaaS. */
export function ClubsMembershipProcessNotice() {
  return <TodayLocalizedContent><div className={styles.notice}>
    <p>Create a member-area profile and sign in while your application is being reviewed. Registration and login do not require the Crays team&apos;s final approval.</p>
    <p>Apply through your personal Ambassador. If you do not have one, the Crays team acts as your Ambassador and supports your application. The Ambassador&apos;s recommendation is followed by the Crays team&apos;s final approval; a recommendation alone does not unlock booking or payment.</p>
    <p>Your final decision is always sent by email. Your assigned Ambassador is notified too. Once approved, use the email to sign in and resume your saved stay plan at the same booking step. Room availability and the final price are checked again before confirmation and payment.</p>
    <p>Questions and conversations can use the communication channels available in your application.</p>
    {process.env.NODE_ENV === "development" ? <p className={styles.preview}>In this local preview, permanent profile-linked stay-plan saving and decision emails are not connected yet.</p> : null}
  </div></TodayLocalizedContent>;
}
