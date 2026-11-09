"use client";
import type { ReactElement } from "react";
import type { ClubsMembershipApplicationInput } from "../../../lib/clubs/public-ambassador-registry";
import type { ClubsLocale } from "../../../lib/clubs/public-site";
import { ambassadorJourneyCopy } from "./clubs-ambassador-journey-copy";
type ApplicantType = ClubsMembershipApplicationInput["applicantType"];
type Props = {
  locale: ClubsLocale;
  input: ClubsMembershipApplicationInput;
  errors: Partial<Record<keyof ClubsMembershipApplicationInput, string>>;
  setValue: <K extends keyof ClubsMembershipApplicationInput>(name: K, value: ClubsMembershipApplicationInput[K]) => void;
  styles: Record<string, string>;
};
export function ClubsAmbassadorApplicationFields({locale,input,errors,setValue,styles}:Props) {
 const copy=ambassadorJourneyCopy[locale];
 return <>            <div className={styles.twoColumns}>
              <Field styles={styles} label={copy.applicantType}>
                <select
                  value={input.applicantType}
                  onChange={(event) =>
                    setValue(
                      "applicantType",
                      event.target.value as ApplicantType,
                    )
                  }
                >
                  {(["individual", "family", "team"] as const).map((type) => (
                    <option key={type} value={type}>
                      {copy.types[type]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field styles={styles} label={copy.fullName} error={errors.fullName} required>
                <input
                  aria-invalid={Boolean(errors.fullName)}
                  autoComplete="name"
                  required
                  name="fullName" maxLength={120} minLength={2} value={input.fullName}
                  onChange={(event) => setValue("fullName", event.target.value)}
                />
              </Field>
              <Field styles={styles} label={copy.email} error={errors.email} required>
                <input name="email" type="email" autoComplete="email" required maxLength={254}
                  aria-invalid={Boolean(errors.email)} value={input.email}
                  onChange={(event) => setValue("email", event.target.value)} />
              </Field>
              <Field styles={styles} label={copy.basedIn} error={errors.basedIn} required>
                <input
                  aria-invalid={Boolean(errors.basedIn)}
                  autoComplete="country-name"
                  required
                  name="basedIn" maxLength={120} minLength={2} value={input.basedIn}
                  onChange={(event) => setValue("basedIn", event.target.value)}
                />
              </Field>
              <Field styles={styles} label={copy.interest} error={errors.interest} required>
                <select
                  aria-invalid={Boolean(errors.interest)}
                  required
                  value={input.interest}
                  onChange={(event) => setValue("interest", event.target.value)}
                >
                  <option value="">{copy.interest}</option>
                  {copy.interests.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field styles={styles}
                label={copy.arrival}
                hint={copy.arrivalHint}
                error={errors.preferredArrivalWindow}
                required
              >
                <input
                  aria-invalid={Boolean(errors.preferredArrivalWindow)}
                  required
                  name="preferredArrivalWindow" maxLength={120} minLength={2} value={input.preferredArrivalWindow}
                  onChange={(event) =>
                    setValue("preferredArrivalWindow", event.target.value)
                  }
                />
              </Field>
              <Field styles={styles}
                label={copy.length}
                hint={copy.lengthHint}
                error={errors.preferredParticipationLength}
                required
              >
                <input
                  aria-invalid={Boolean(errors.preferredParticipationLength)}
                  required
                  name="preferredParticipationLength" maxLength={120} minLength={2} value={input.preferredParticipationLength}
                  onChange={(event) =>
                    setValue("preferredParticipationLength", event.target.value)
                  }
                />
              </Field>
              <Field styles={styles} label={copy.linkedin} error={errors.linkedinUrl}>
                <input
                  aria-invalid={Boolean(errors.linkedinUrl)}
                  inputMode="url"
                  name="linkedinUrl" maxLength={500} value={input.linkedinUrl}
                  onChange={(event) =>
                    setValue("linkedinUrl", event.target.value)
                  }
                />
              </Field>
              <Field styles={styles} label={copy.social} error={errors.socialUrl}>
                <input
                  aria-invalid={Boolean(errors.socialUrl)}
                  inputMode="url"
                  name="socialUrl" maxLength={500} value={input.socialUrl}
                  onChange={(event) =>
                    setValue("socialUrl", event.target.value)
                  }
                />
              </Field>
            </div>

            <Field styles={styles} label={copy.website} error={errors.profileUrl}>
              <input
                aria-invalid={Boolean(errors.profileUrl)}
                inputMode="url"
                name="profileUrl" maxLength={500} value={input.profileUrl}
                onChange={(event) => setValue("profileUrl", event.target.value)}
              />
            </Field>
            <Field styles={styles} label={copy.motivation} error={errors.motivation} required>
              <textarea
                aria-invalid={Boolean(errors.motivation)}
                required
                rows={5}
                name="motivation" maxLength={2000} minLength={20} value={input.motivation}
                onChange={(event) => setValue("motivation", event.target.value)}
              />
            </Field>
            <Field styles={styles}
              label={copy.contribution}
              error={errors.contribution}
              required
            >
              <textarea
                aria-invalid={Boolean(errors.contribution)}
                required
                rows={5}
                name="contribution" maxLength={2000} minLength={20} value={input.contribution}
                onChange={(event) =>
                  setValue("contribution", event.target.value)
                }
              />
            </Field>

            <label className={styles.consent}>
              <input
                checked={input.consent}
                type="checkbox"
                onChange={(event) => setValue("consent", event.target.checked)}
              />
              <span>{copy.consent}</span>
            </label>
            {errors.consent ? (
              <p className={styles.error} role="alert">
                {errors.consent}
              </p>
            ) : null}
</>;
}

function Field({
  label,
  hint,
  error,
  required = false,
  styles,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  styles: Record<string, string>;
  children: ReactElement;
}) {
  return (
    <label className={styles.field}>
      <span>
        {label}
        {required ? <b aria-hidden="true">*</b> : null}
      </span>
      {children}
      {hint ? <small>{hint}</small> : null}
      {error ? (
        <small className={styles.error} role="alert">
          {error}
        </small>
      ) : null}
    </label>
  );
}
