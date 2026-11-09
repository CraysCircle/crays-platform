"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Dumbbell,
  FileText,
  Hotel,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ClubsLocale } from "../../../lib/clubs/public-site";
import {
  getApprovedAmbassador,
  type ApprovedAmbassadorSlug,
  type ClubsMembershipApplicationInput,
} from "../../../lib/clubs/public-ambassador-registry";
import {
  createPublicAmbassadorApplicationAttempt,
  PUBLIC_AMBASSADOR_APPLICATION_CLIENT_CONTRACT,
  submitDirectMembershipApplication,
  submitPublicAmbassadorReferralAttribution,
  type DirectApplicationSubmissionResult,
  type PublicAmbassadorApplicationAttempt,
  type PublicAmbassadorApplicationVisibleState,
  type ReferralAttributionSubmissionResult,
} from "../../../lib/clubs/public-ambassador-application-client";
import { ambassadorJourneyCopy } from "./clubs-ambassador-journey-copy";
import styles from "./clubs-ambassador-apply-page.module.css";
import profileStyles from "./clubs-ambassador-profile-page.module.css";
import tokens from "./clubs-public-design-tokens.module.css";
import { ClubsPublicShell } from "./clubs-public-shell";
import { forestCityPublicCopy } from "./forest-city-public-copy";

type Props = { locale: ClubsLocale; ambassadorSlug?: ApprovedAmbassadorSlug };
type Errors = Partial<Record<keyof ClubsMembershipApplicationInput, string>>;
type ApplicantType = ClubsMembershipApplicationInput["applicantType"];
type ApplicationAccessState =
  | "checking"
  | "authenticated"
  | "signed_out"
  | "unavailable";

const ambassadorApplyLocales: readonly ClubsLocale[] = [
  "en",
  "de",
  "es",
  "ca",
  "fr",
  "pt",
  "it",
];

type EditorialMedia = Readonly<{
  alt: string;
  position?: string;
  src: string;
}>;

const heroMedia: EditorialMedia = {
  src: "/__crays-clubs/phase9-owner/forest-city-v16/hero-forest-city-city-aerial.webp",
  alt: "Forest City towers, shoreline and tropical waterfront seen from above",
  position: "50% 48%",
};

const destinationMedia: EditorialMedia = {
  src: "/__crays-clubs/phase9-owner/isabel-apply/forest-city-coast-panorama-v2.webp",
  alt: "Forest City skyline, tropical shoreline and blue sea seen in a wide coastal panorama",
  position: "50% 50%",
};

const stayMedia = [
  {
    src: "/__crays-clubs/phase9-owner/owner-golf-hotel.png",
    alt: "Marina Hotel in Forest City beside the waterfront",
    position: "50% 50%",
  },
  {
    src: "/__crays-clubs/phase9-owner/owner-marina-hotel.png",
    alt: "Golf Hotel in Forest City at blue hour",
    position: "50% 48%",
  },
] as const satisfies readonly EditorialMedia[];

const communityMedia: EditorialMedia = {
  src: "/__crays-clubs/phase9-owner/homepage-v35/community-invitation.webp",
  alt: "People in a broad community conversation",
  position: "50% 46%",
};

const functionIcons = [
  BriefcaseBusiness,
  BookOpen,
  Dumbbell,
  UsersRound,
] as const;

const functionInterestValues = [
  "company-residency",
  "school-jobs",
  "fitness-wellbeing",
  "family",
] as const;

const applicantIcons = {
  individual: UserRound,
  family: UsersRound,
  team: BriefcaseBusiness,
} as const;

const referralIcons = [UserRound, FileText, UsersRound] as const;

const englishWireframe = {
  heroEyebrow: "A personal CRAYS introduction",
  heroTitle: "Your next chapter in Forest City starts here.",
  heroIntro:
    "Discover the CRAYS Club vision, see what your time in Forest City could be built around, then tell us who you are.",
  exploreCta: "Explore CRAYS",
  applyCta: "Start your application",
  authority: "A referral adds context. CRAYS alone reviews and decides.",
  destinationEyebrow: "Forest City, Malaysia",
  destinationTitle: "Work, live, play and build by the sea.",
  destinationBody:
    "A purpose-built international city on the Johor coast. CRAYS Clubs brings together founders, creators, remote professionals, families and teams to focus, collaborate and live well—surrounded by nature, connected to the world.",
  chapterTitle: "Build your CRAYS chapter",
  stays: [
    {
      eyebrow: "Forest City Marina Hotel",
      title: "Marina Hotel path — Stay by the waterfront",
    },
    {
      eyebrow: "Forest City Golf Hotel",
      title: "Golf Hotel path — Stay closer to the green",
    },
  ],
  functions: [
    {
      eyebrow: "People of CRAYS Clubs",
      title: "Community — Meet around shared interests",
    },
    { title: "Work & build", body: "Focus, create and exchange" },
    { title: "Learn", body: "Learn here. Get discovered anywhere." },
    {
      title: "Fitness & wellbeing",
      body: "Make movement part of the rhythm",
    },
    { title: "Families & teams", body: "Plan the chapter together" },
  ],
  hotelBoundary:
    "Hotel discovery, admission, availability and booking remain separate later journeys.",
  referralBody:
    "A referral adds context. Every application is reviewed on its own.",
  referralSteps: [
    { title: "Introduction", body: "A personal door opens." },
    {
      title: "Application",
      body: "You introduce yourself and your intentions.",
    },
    { title: "CRAYS review", body: "Our team reviews and decides." },
  ],
  pathTitle: "Choose your path",
  pathIntro:
    "Pick the path that fits you now. You can grow and shift over time.",
  paths: {
    individual: {
      title: "Individual",
      body: "Build your chapter. Focus, connect and create with like-minded people.",
    },
    family: {
      title: "Family",
      body: "Bring your people. Balance learning, wellbeing and quality time together.",
    },
    team: {
      title: "Team",
      body: "Grow together. Align, build and collaborate in a high-performing environment.",
    },
  },
  formTitle: "Your application",
  formIntro:
    "Tell us about you. Submission happens only after secure server confirmation.",
  submit: "Submit application",
  faqTitle: "Questions we get",
  faqs: [
    {
      q: "Does a referral guarantee admission?",
      a: "No. A referral adds context. CRAYS alone reviews and decides every application.",
    },
    {
      q: "Does this application book or charge me?",
      a: "No. This is an application only. It does not book or charge for any hotel, service or activity.",
    },
    {
      q: "Are Golf Hotel and Marina Hotel part of this application?",
      a: "No. Hotel discovery, admission, availability and booking are separate later journeys.",
    },
  ],
  closingTitle: "Ready to introduce yourself?",
  closingBody: "Your next chapter in Forest City starts with a conversation.",
} as const;

const emptyInput: ClubsMembershipApplicationInput = {
  applicantType: "individual",
  fullName: "",
  email: "",
  basedIn: "",
  interest: "",
  preferredArrivalWindow: "",
  preferredParticipationLength: "",
  linkedinUrl: "",
  socialUrl: "",
  profileUrl: "",
  motivation: "",
  contribution: "",
  consent: false,
};

type SubmissionView = Readonly<{
  canReconcileApplication: boolean;
  canReconcileAttribution: boolean;
  detail: string;
  showLogin: boolean;
  status: PublicAmbassadorApplicationVisibleState;
}>;

const nothingSent: SubmissionView = Object.freeze({
  canReconcileApplication: false,
  canReconcileAttribution: false,
  detail:
    "Your application is sent only after secure sign-in and a server-confirmed receipt.",
  showLogin: false,
  status: "Nothing sent yet",
});

function isHttpsUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function directFailureView(
  result: Exclude<DirectApplicationSubmissionResult, { kind: "confirmed" }>,
): SubmissionView {
  if (result.kind === "sign_in_required") {
    return {
      ...nothingSent,
      detail:
        "Sign in with your CRAYS member account to submit. No application or attribution has been created.",
      showLogin: true,
      status: "Sign in required",
    };
  }
  if (result.kind === "unknown_outcome") {
    return {
      ...nothingSent,
      canReconcileApplication: true,
      detail:
        "The server outcome is not confirmed. Reconciliation will reuse the same protected request.",
      status: "Submitting",
    };
  }
  const detail =
    result.kind === "denied"
      ? "This session cannot submit the application. Nothing was claimed as received."
      : result.kind === "validation_error"
        ? "The server rejected the application fields. Review them before trying again."
        : result.kind === "conflict"
          ? "The current application state could not be reconciled safely. No new request will be invented."
          : "Applications are temporarily unavailable. Nothing was claimed as received.";
  return { ...nothingSent, detail };
}

function referralFailureView(
  result: Exclude<ReferralAttributionSubmissionResult, { kind: "complete" }>,
): SubmissionView {
  const detail =
    result.kind === "sign_in_required"
      ? "The application is received. Sign in again to reconcile its Ambassador attribution."
      : result.kind === "cross_ambassador"
        ? "The application is received, but the selected Ambassador attribution was denied and will not be changed."
        : result.kind === "not_found"
          ? "The application is received, but its Ambassador attribution could not be found safely."
          : result.kind === "conflict"
            ? "The application is received, but the attribution payload conflicts with its immutable receipt."
            : result.kind === "unknown_outcome"
              ? "The application is received. Attribution is not confirmed; reconciliation will reuse the same protected request."
              : "The application is received. Attribution is temporarily unavailable and no completion is claimed.";
  return {
    canReconcileApplication: false,
    canReconcileAttribution: result.kind === "unknown_outcome",
    detail,
    showLogin: result.kind === "sign_in_required",
    status: "Attribution pending reconciliation",
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

export function ClubsAmbassadorApplyPage({ locale, ambassadorSlug }: Props) {
  const copy = ambassadorJourneyCopy[locale];
  const forestCopy = forestCityPublicCopy[locale];
  const ambassador = ambassadorSlug
    ? getApprovedAmbassador(ambassadorSlug)
    : null;
  const wireframe = locale === "en" && ambassador ? englishWireframe : null;
  const [input, setInput] =
    useState<ClubsMembershipApplicationInput>(emptyInput);
  const [errors, setErrors] = useState<Errors>({});
  const [submission, setSubmission] =
    useState<SubmissionView>(nothingSent);
  const [applicationAccess, setApplicationAccess] =
    useState<ApplicationAccessState>("checking");
  const [loginHref, setLoginHref] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const attemptRef = useRef<PublicAmbassadorApplicationAttempt | null>(null);
  const applicationIdRef = useRef<string | null>(null);
  const submissionLocked = ![
    "Nothing sent yet",
    "Sign in required",
  ].includes(submission.status);
  const signedOutReturnTo = ambassador
    ? `/${locale}/ambassadors/${ambassador.slug}#application`
    : `/${locale}/apply-directly#application`;
  const signedOutLoginHref = `/auth/login?returnTo=${encodeURIComponent(signedOutReturnTo)}`;

  useEffect(() => {
    const controller = new AbortController();

    void fetch(
      PUBLIC_AMBASSADOR_APPLICATION_CLIENT_CONTRACT.endpoints
        .directApplication,
      {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    )
      .then((response) => {
        if (response.status === 401) {
          setApplicationAccess("signed_out");
          return;
        }
        setApplicationAccess(response.ok ? "authenticated" : "unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) setApplicationAccess("unavailable");
      });

    return () => controller.abort();
  }, []);

  const setValue = <K extends keyof ClubsMembershipApplicationInput>(
    key: K,
    value: ClubsMembershipApplicationInput[K],
  ) => {
    if (submissionLocked) return;
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    attemptRef.current = null;
    applicationIdRef.current = null;
    setLoginHref(null);
    setSubmission(nothingSent);
  };

  const continueToApplication = () => {
    document.getElementById("application")?.scrollIntoView({ block: "start" });
  };

  const chooseInterest = (value: string) => {
    setValue("interest", value);
    continueToApplication();
  };

  const chooseApplicantType = (type: ApplicantType) => {
    setValue("applicantType", type);
    continueToApplication();
  };

  const finishAttribution = async (
    attempt: PublicAmbassadorApplicationAttempt,
    applicationId: string,
  ) => {
    const result = await submitPublicAmbassadorReferralAttribution(
      attempt,
      applicationId,
    );
    if (result.kind === "complete") {
      setSubmission({
        canReconcileApplication: false,
        canReconcileAttribution: false,
        detail: attempt.referral
          ? "The application and selected Ambassador attribution are confirmed by server receipts. Membership, booking and payment remain separate."
          : "The application is confirmed by the server receipt. Membership, booking and payment remain separate.",
        showLogin: false,
        status: "Complete",
      });
      return;
    }
    setSubmission(referralFailureView(result));
  };

  const runApplicationAttempt = async (
    attempt: PublicAmbassadorApplicationAttempt,
  ) => {
    setSubmission({
      canReconcileApplication: false,
      canReconcileAttribution: false,
      detail: "Waiting for the persisted application receipt.",
      showLogin: false,
      status: "Submitting",
    });
    const result = await submitDirectMembershipApplication(attempt);
    if (result.kind !== "confirmed") {
      setSubmission(directFailureView(result));
      return;
    }
    applicationIdRef.current = result.applicationId;
    setSubmission({
      canReconcileApplication: false,
      canReconcileAttribution: false,
      detail:
        "The application is persisted and receipt-confirmed. No membership, booking or payment is created.",
      showLogin: false,
      status: "Application received",
    });
    await finishAttribution(attempt, result.applicationId);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mobileExpanded && window.matchMedia("(max-width: 760px)").matches) {
      setMobileExpanded(true);
      return;
    }
    const next: Errors = {};
    for (const key of [
      "fullName",
      "basedIn",
      "interest",
      "preferredArrivalWindow",
      "preferredParticipationLength",
      "motivation",
      "contribution",
    ] as const) {
      if (!input[key].trim()) next[key] = copy.missing;
    }
    for (const key of ["linkedinUrl", "socialUrl", "profileUrl"] as const) {
      if (!isHttpsUrl(input[key])) next[key] = copy.invalidUrl;
    }
    for (const key of ["motivation", "contribution"] as const) {
      if (input[key].trim().length > 0 && input[key].trim().length < 20) {
        next[key] = "Please provide at least 20 characters.";
      }
    }
    if (!input.consent) next.consent = copy.consentRequired;
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      const attempt =
        attemptRef.current ??
        createPublicAmbassadorApplicationAttempt({
          ambassadorSlug,
          applicant: {
            applicantType: input.applicantType,
            basedIn: input.basedIn,
            consent: true,
            contribution: input.contribution,
            fullName: input.fullName,
            interest: input.interest,
            linkedinUrl: input.linkedinUrl,
            motivation: input.motivation,
            preferredArrivalWindow: input.preferredArrivalWindow,
            preferredParticipationLength: input.preferredParticipationLength,
            profileUrl: input.profileUrl,
            socialUrl: input.socialUrl,
          },
      });
      attemptRef.current = attempt;
      setLoginHref(attempt.loginHref);
      await runApplicationAttempt(attempt);
    } catch {
      setSubmission({
        ...nothingSent,
        detail:
          "Secure request preparation is unavailable. Nothing was sent or claimed as received.",
      });
    }
  };

  const reconcileApplication = async () => {
    if (attemptRef.current) await runApplicationAttempt(attemptRef.current);
  };

  const reconcileAttribution = async () => {
    if (!attemptRef.current || !applicationIdRef.current) return;
    setSubmission({
      canReconcileApplication: false,
      canReconcileAttribution: false,
      detail:
        "Reconciling the immutable attribution receipt with the same protected request.",
      showLogin: false,
      status: "Attribution pending reconciliation",
    });
    await finishAttribution(attemptRef.current, applicationIdRef.current);
  };

  const heroTitle =
    wireframe?.heroTitle ??
    (ambassador ? copy.referralTitle : copy.directTitle);
  const heroIntro =
    wireframe?.heroIntro ??
    (ambassador ? copy.referralIntro : copy.directIntro);
  const referralTitle = ambassador
    ? `${ambassador.name} opens the conversation. CRAYS makes the decision.`
    : copy.referralTitle;

  return (
    <ClubsPublicShell
      availableLocales={ambassadorApplyLocales}
      headerTone="navy"
      locale={locale}
    >
      <main
        className={`${tokens.theme} ${styles.page}`}
        id="ambassador-apply-main"
      >
        <section className={styles.hero} aria-labelledby="membership-title">
          <div className={styles.heroVisual}>
            {ambassador?.media.renderable && ambassador.media.url ? (
              <>
                <Image
                  alt={ambassador.media.alt}
                  className={styles.heroPortrait}
                  fill
                  priority
                  sizes="(max-width: 760px) 100vw, 39vw"
                  src={ambassador.media.url}
                  style={{
                    objectPosition: `${ambassador.media.focalPoint.x * 100}% ${ambassador.media.focalPoint.y * 100}%`,
                  }}
                />
                <div className={styles.portraitCaption}>
                  <span>CRAYS Ambassador</span>
                  <strong>{ambassador.name}</strong>
                  <small>{ambassador.publicRoleLabel}</small>
                </div>
              </>
            ) : ambassador ? (
              <div
                aria-label={`${ambassador.name}, ${ambassador.publicRoleLabel}`}
                className={profileStyles.applyHeroMonogram}
              >
                <span aria-hidden="true" className={profileStyles.applyHeroInitials}>
                  {initials(ambassador.name)}
                </span>
                <div className={profileStyles.applyHeroMeta}>
                  <strong>{ambassador.name}</strong>
                  <span>{ambassador.publicRoleLabel} · CRAYS Ambassador</span>
                </div>
              </div>
            ) : (
              <Image
                alt={heroMedia.alt}
                className={styles.heroDestination}
                fill
                priority
                sizes="(max-width: 760px) 100vw, 38vw"
                src={heroMedia.src}
                style={{ objectPosition: heroMedia.position }}
              />
            )}
          </div>

          <div className={styles.heroPanel}>
            <a className={styles.mobileApplyBar} href="#application">
              {wireframe?.applyCta ?? copy.primaryCta}
            </a>
            <p className={styles.eyebrow}>
              {wireframe?.heroEyebrow ??
                (ambassador ? copy.referralEyebrow : copy.directEyebrow)}
            </p>
            <h1 id="membership-title">{heroTitle}</h1>
            <p className={styles.heroIntro}>{heroIntro}</p>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href="#forest-city">
                {wireframe?.exploreCta ?? forestCopy.exploreAction}
                <ArrowDown aria-hidden="true" size={18} />
              </a>
              <a className={styles.secondaryButton} href="#application">
                {wireframe?.applyCta ?? copy.primaryCta}
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            </div>
            <p className={styles.heroAuthority}>
              <Check aria-hidden="true" size={18} />
              {wireframe?.authority ?? copy.authorityNote}
            </p>
          </div>
        </section>

        <section
          className={styles.destination}
          id="forest-city"
          aria-labelledby="forest-city-title"
        >
          <div className={styles.destinationMedia}>
            <Image
              alt={destinationMedia.alt}
              fill
              sizes="100vw"
              src={destinationMedia.src}
              style={{ objectPosition: destinationMedia.position }}
            />
            <span>{wireframe?.destinationEyebrow ?? forestCopy.eyebrow}</span>
          </div>
          <div className={styles.destinationCopy}>
            <p className={styles.eyebrow}>
              {wireframe?.destinationEyebrow ?? forestCopy.contextEyebrow}
            </p>
            <h2 id="forest-city-title">
              {wireframe?.destinationTitle ?? forestCopy.title}
            </h2>
            <p>{wireframe?.destinationBody ?? forestCopy.intro}</p>
          </div>
        </section>

        <section className={styles.stays} aria-labelledby="stay-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="stay-title">
                {wireframe?.chapterTitle ?? forestCopy.pathsTitle}
              </h2>
            </div>
          </div>
          <div className={styles.stayGrid}>
            {[forestCopy.marina, forestCopy.golf].map((item, index) => {
              const media = stayMedia[index]!;
              const wireframeStay = wireframe?.stays[index];
              return (
                <article className={styles.stayCard} key={item.eyebrow}>
                  <div className={styles.stayImage}>
                    <Image
                      alt={media.alt}
                      fill
                      sizes="(max-width: 760px) 100vw, 50vw"
                      src={media.src}
                      style={{ objectPosition: media.position }}
                    />
                  </div>
                  <div className={styles.stayCopy}>
                    <h3>{wireframeStay?.title ?? item.title}</h3>
                    <p className={styles.eyebrow}>
                      {wireframeStay?.eyebrow ?? item.eyebrow}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.functions} aria-labelledby="functions-title">
          <h2 className={styles.visuallyHidden} id="functions-title">
            {copy.functionTitle}
          </h2>
          <div className={styles.functionMosaic}>
            <article className={styles.communityFeature}>
              <div className={styles.communityImage}>
                <Image
                  alt={communityMedia.alt}
                  fill
                  sizes="(max-width: 760px) 100vw, 52vw"
                  src={communityMedia.src}
                  style={{ objectPosition: communityMedia.position }}
                />
              </div>
              <div className={styles.communityCopy}>
                <h3>
                  {wireframe?.functions[0].title ?? copy.functions[0]!.title}
                </h3>
                <p className={styles.communityEyebrow}>
                  {wireframe?.functions[0].eyebrow ?? copy.functions[0]!.body}
                </p>
                <button
                  type="button"
                  onClick={() => chooseInterest(copy.interests[0]!.value)}
                >
                  {copy.primaryCta}
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </div>
            </article>

            <div className={styles.functionList}>
              {copy.functions.slice(1, 5).map((item, index) => {
                const Icon = functionIcons[index]!;
                const interestValue = functionInterestValues[index]!;
                const wireframeFunction = wireframe?.functions[index + 1];
                return (
                  <button
                    className={styles.functionRow}
                    key={item.title}
                    type="button"
                    onClick={() => chooseInterest(interestValue)}
                  >
                    <Icon aria-hidden="true" size={28} strokeWidth={1.55} />
                    <span>
                      <strong>{wireframeFunction?.title ?? item.title}</strong>
                      <small>
                        {wireframeFunction && "body" in wireframeFunction
                          ? wireframeFunction.body
                          : item.body}
                      </small>
                    </span>
                    <ArrowRight aria-hidden="true" size={17} />
                  </button>
                );
              })}
            </div>
          </div>
          <p className={styles.hotelBoundary}>
            {wireframe?.hotelBoundary ?? copy.authorityNote}
          </p>
        </section>

        {ambassador ? (
          <section
            className={styles.referral}
            id="decision-path"
            aria-labelledby="decision-title"
          >
            <div className={styles.referralLead}>
              <p className={styles.eyebrow}>{copy.confirmedLabel}</p>
              <h2 id="decision-title">
                {wireframe ? referralTitle : copy.referralTitle}
              </h2>
              <p>{wireframe?.referralBody ?? copy.authorityNote}</p>
              <a className={styles.primaryButton} href="#application">
                {wireframe?.applyCta ?? copy.primaryCta}
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            </div>
            <ol className={styles.referralSteps}>
              {(
                wireframe?.referralSteps ?? [
                  copy.states[1],
                  copy.states[2],
                  copy.states[3],
                ]
              ).map((state, index) => (
                <li key={state.title}>
                  <div className={styles.stepGraphic}>
                    {(() => {
                      const StepIcon = referralIcons[index]!;
                      return (
                        <span>
                          <StepIcon
                            aria-hidden="true"
                            size={29}
                            strokeWidth={1.45}
                          />
                        </span>
                      );
                    })()}
                    {index < 2 ? (
                      <ArrowRight
                        aria-hidden="true"
                        className={styles.stepArrow}
                        size={24}
                      />
                    ) : null}
                  </div>
                  <div>
                    <h3>{state.title}</h3>
                    <p>{state.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className={styles.applicantPaths} aria-labelledby="path-title">
          <div className={styles.pathIntro}>
            <h2 id="path-title">
              {wireframe?.pathTitle ?? copy.applicantType}
            </h2>
            <p>{wireframe?.pathIntro ?? copy.formIntro}</p>
          </div>
          <div className={styles.pathGrid}>
            {(["individual", "family", "team"] as const).map((type, index) => {
              const Icon = applicantIcons[type];
              return (
                <button
                  className={
                    input.applicantType === type ? styles.pathActive : undefined
                  }
                  key={type}
                  type="button"
                  onClick={() => chooseApplicantType(type)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <Icon aria-hidden="true" size={30} strokeWidth={1.55} />
                  <strong>
                    {wireframe?.paths[type].title ?? copy.types[type]}
                  </strong>
                  {wireframe ? (
                    <small>{wireframe.paths[type].body}</small>
                  ) : null}
                  <ArrowRight aria-hidden="true" size={18} />
                </button>
              );
            })}
          </div>
        </section>

        <section
          className={styles.application}
          id="application"
          aria-labelledby="form-title"
        >
          <div className={styles.formIntro}>
            <h2 id="form-title">
              {wireframe?.formTitle ??
                (ambassador ? copy.referralFormTitle : copy.directFormTitle)}
            </h2>
            <p>{wireframe?.formIntro ?? copy.formIntro}</p>
            <p>
              Your verified CRAYS account email is resolved securely after sign-in
              and is never placed in the URL.
            </p>
            {ambassador ? (
              <div className={styles.sponsorStamp}>
                <Check aria-hidden="true" size={20} />
                <span>{copy.referralLabel}</span>
                <strong>{ambassador.name}</strong>
                <small>{ambassador.publicRoleLabel} · CRAYS Ambassador</small>
              </div>
            ) : null}
            <div className={styles.formBoundary}>
              <Hotel aria-hidden="true" size={22} strokeWidth={1.5} />
              <p>{copy.authorityNote}</p>
            </div>
          </div>

          {applicationAccess === "authenticated" ? (
            <form
              className={`${styles.form} ${mobileExpanded ? styles.formExpanded : ""}`}
              onSubmit={onSubmit}
              noValidate
            >
            <div className={styles.twoColumns}>
              <Field label={copy.applicantType}>
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
              <Field label={copy.fullName} error={errors.fullName} required>
                <input
                  aria-invalid={Boolean(errors.fullName)}
                  autoComplete="name"
                  placeholder="Your full name"
                  required
                  value={input.fullName}
                  onChange={(event) => setValue("fullName", event.target.value)}
                />
              </Field>
              <Field label={copy.basedIn} error={errors.basedIn} required>
                <input
                  aria-invalid={Boolean(errors.basedIn)}
                  autoComplete="country-name"
                  placeholder="City, country"
                  required
                  value={input.basedIn}
                  onChange={(event) => setValue("basedIn", event.target.value)}
                />
              </Field>
              <Field label={copy.interest} error={errors.interest} required>
                <select
                  aria-invalid={Boolean(errors.interest)}
                  required
                  value={input.interest}
                  onChange={(event) => setValue("interest", event.target.value)}
                >
                  <option value="">Select an option</option>
                  {copy.interests.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={copy.arrival}
                hint={copy.arrivalHint}
                error={errors.preferredArrivalWindow}
                required
              >
                <input
                  aria-invalid={Boolean(errors.preferredArrivalWindow)}
                  placeholder="Select an option"
                  required
                  value={input.preferredArrivalWindow}
                  onChange={(event) =>
                    setValue("preferredArrivalWindow", event.target.value)
                  }
                />
              </Field>
              <Field
                label={copy.length}
                hint={copy.lengthHint}
                error={errors.preferredParticipationLength}
                required
              >
                <input
                  aria-invalid={Boolean(errors.preferredParticipationLength)}
                  placeholder="Select an option"
                  required
                  value={input.preferredParticipationLength}
                  onChange={(event) =>
                    setValue("preferredParticipationLength", event.target.value)
                  }
                />
              </Field>
              <Field label={copy.linkedin} error={errors.linkedinUrl}>
                <input
                  aria-invalid={Boolean(errors.linkedinUrl)}
                  inputMode="url"
                  placeholder="linkedin.com/in/yourprofile"
                  value={input.linkedinUrl}
                  onChange={(event) =>
                    setValue("linkedinUrl", event.target.value)
                  }
                />
              </Field>
              <Field label={copy.social} error={errors.socialUrl}>
                <input
                  aria-invalid={Boolean(errors.socialUrl)}
                  inputMode="url"
                  placeholder="https://..."
                  value={input.socialUrl}
                  onChange={(event) =>
                    setValue("socialUrl", event.target.value)
                  }
                />
              </Field>
            </div>

            <Field label={copy.website} error={errors.profileUrl}>
              <input
                aria-invalid={Boolean(errors.profileUrl)}
                inputMode="url"
                placeholder="https://..."
                value={input.profileUrl}
                onChange={(event) => setValue("profileUrl", event.target.value)}
              />
            </Field>
            <Field label={copy.motivation} error={errors.motivation} required>
              <textarea
                aria-invalid={Boolean(errors.motivation)}
                placeholder="What brings you to CRAYS and Forest City?"
                required
                rows={5}
                value={input.motivation}
                onChange={(event) => setValue("motivation", event.target.value)}
              />
            </Field>
            <Field
              label={copy.contribution}
              error={errors.contribution}
              required
            >
              <textarea
                aria-invalid={Boolean(errors.contribution)}
                placeholder="What skills, experience or ideas would you bring to the community?"
                required
                rows={5}
                value={input.contribution}
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

            <button
              className={styles.submit}
              disabled={submissionLocked}
              type="submit"
            >
              <span className={styles.desktopSubmitLabel}>
                {submission.status === "Submitting"
                  ? "Submitting…"
                  : wireframe?.submit ?? copy.submit}
              </span>
              <span className={styles.mobileSubmitLabel}>
                {submission.status === "Submitting" ? "Submitting…" : "Submit"}
              </span>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
            <div aria-live="polite" className={styles.preview} role="status">
              <span>{submission.status}</span>
              <p>{submission.detail}</p>
              {submission.showLogin && loginHref ? (
                <Link
                  className={styles.primaryButton}
                  href={loginHref}
                  prefetch={false}
                >
                  Sign in to continue
                </Link>
              ) : null}
              {submission.canReconcileApplication ? (
                <button
                  className={styles.secondaryButton}
                  onClick={() => void reconcileApplication()}
                  type="button"
                >
                  Reconcile application
                </button>
              ) : null}
              {submission.canReconcileAttribution ? (
                <button
                  className={styles.secondaryButton}
                  onClick={() => void reconcileAttribution()}
                  type="button"
                >
                  Reconcile attribution
                </button>
              ) : null}
            </div>
            </form>
          ) : (
            <div className={styles.form}>
              <div aria-live="polite" className={styles.preview} role="status">
                <span>
                  {applicationAccess === "signed_out"
                    ? "Sign in required"
                    : applicationAccess === "checking"
                      ? "Checking sign-in"
                      : "Sign-in check unavailable"}
                </span>
                <p>
                  {applicationAccess === "signed_out"
                    ? "Sign in with your CRAYS member account before entering or submitting application details. Nothing has been sent."
                    : applicationAccess === "checking"
                      ? "Checking whether this browser has an eligible CRAYS member session."
                      : "The secure sign-in check is temporarily unavailable. No application can be entered or submitted."}
                </p>
                {applicationAccess === "signed_out" ? (
                  <Link
                    className={styles.primaryButton}
                    href={signedOutLoginHref}
                    prefetch={false}
                  >
                    Sign in to continue
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.faqIntro}>
            <h2 id="faq-title">{wireframe?.faqTitle ?? copy.faqTitle}</h2>
          </div>
          <div className={styles.faqList}>
            {(wireframe?.faqs ?? copy.faqs).map((item) => (
              <details key={item.q} open>
                <summary>
                  <CircleHelp aria-hidden="true" size={20} />
                  {item.q}
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.closing}>
          <div>
            <h2>{wireframe?.closingTitle ?? copy.closeTitle}</h2>
            <p>{wireframe?.closingBody ?? copy.closeBody}</p>
          </div>
          <a className={styles.primaryButton} href="#application">
            {wireframe?.applyCta ?? copy.primaryCta}
            <ArrowRight aria-hidden="true" size={18} />
          </a>
        </section>
      </main>
    </ClubsPublicShell>
  );
}

function Field({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
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
