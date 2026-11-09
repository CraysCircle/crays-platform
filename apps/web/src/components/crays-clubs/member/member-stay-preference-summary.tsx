import type {HotelPreferenceSummary} from "@/lib/clubs/hotel-preference-summary";
import styles from "./member-stay-preference-summary.module.css";
export function MemberStayPreferenceSummary({summary}:{summary?:HotelPreferenceSummary}) {
 if(!summary || summary.status==="absent")return null;
 if(summary.status!=="valid_preferences_only")return <section role="status" className={styles.summary}><h2>Let’s check those stay choices.</h2><p>Please check your dates and guests on the hotel page and try again.</p></section>;
 return <section role="status" aria-label="Your stay choices" className={styles.summary} data-public-label-version={summary.labelVersion}><h2>Let’s plan your stay.</h2><p className={styles.property}>{summary.propertyName} · {summary.roomName}</p><dl><div><dt>Dates</dt><dd>{summary.dateLabel}<small>{summary.durationLabel}{summary.checkoutLabel?` · ${summary.checkoutLabel}`:""}</small></dd></div><div><dt>Guests</dt><dd>{summary.guestLabel}</dd></div><div><dt>Ambassador preference</dt><dd>{summary.ambassadorLabel}</dd></div><div><dt>Payment preference</dt><dd>{summary.paymentLabel}</dd></div></dl><p className={styles.note}>Your choices are here. Availability, price and booking confirmation are still to come. This plan hasn’t been saved to your account yet.</p></section>;
}
