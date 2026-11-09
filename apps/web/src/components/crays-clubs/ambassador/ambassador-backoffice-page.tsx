"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CircleAlert,
  FileCheck2,
  Landmark,
  LoaderCircle,
  ReceiptText,
  ShieldCheck,
  Split,
  WalletCards,
} from "lucide-react";

import type { ClubsLocale } from "@/lib/clubs/public-site";

type Paperwork = {
  documentKind: string;
  documentReference: string;
  documentSha256: string;
  storageProvider: string;
  documentState: string;
  createdAt: string;
};

type BookingAllocation = {
  bookingId: string;
  orderId: string;
  allocationCode: string;
  rateBps: number;
  amountMinor: number;
  currency: string;
  destinationStripeAccountId: string;
  stripeDeliveryState: string;
  transferProviderObjectId: string | null;
  erpDeliveryState: string | null;
  erpReconciliationState: string | null;
  createdAt: string;
};

type Backoffice = {
  state: "AMBASSADOR_BACKOFFICE";
  projectId: string;
  ambassadorPartyId: string;
  authority: {
    readinessState: string;
    readinessSnapshot: unknown;
    readinessReceiptSha256: string;
    createdAt: string;
  };
  paperwork: Paperwork[];
  bookingAllocations: BookingAllocation[];
  foreignAmbassadorAccess: false;
  foreignProjectAccess: false;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "authentication" }
  | { kind: "denied"; message: string }
  | { kind: "error" }
  | { kind: "ready"; backoffice: Backoffice };

const copy = {
  en: {
    eyebrow: "Ambassador backoffice",
    title: "Your work. Your bookings. Every receipt.",
    intro:
      "One protected workspace for admission, agreements, attributed bookings, automatic Stripe splits and ERP reconciliation.",
    back: "Back to account",
    secure: "AAL2 protected",
    loading: "Opening your protected workspace",
    loginTitle: "Sign in to continue",
    loginBody:
      "Your Ambassador workspace opens only with your mapped CRAYS account and strong authentication.",
    login: "Sign in securely",
    deniedTitle: "Access is not active yet",
    deniedBody:
      "Your project role, admission, paperwork or strong-auth session still needs attention.",
    errorTitle: "Workspace temporarily unavailable",
    errorBody:
      "No financial state has been assumed. Try again after the authority service is available.",
    attention: "My attention",
    ready: "Ready",
    blocked: "Action required",
    paperwork: "Paperwork",
    bookings: "Attributed bookings",
    settlement: "Automatic split",
    erp: "ERP reconciliation",
    noPaperwork: "No released paperwork receipts yet.",
    noBookings: "No durably attributed bookings yet.",
    project: "Project scope",
    protected: "Only your own project and Ambassador records are visible.",
    stripe: "Stripe transfer",
    amount: "Your 10% allocation",
    created: "Recorded",
    receipt: "Receipt",
    open: "Open items",
  },
  de: {
    eyebrow: "Ambassador-Backend",
    title: "Deine Arbeit. Deine Buchungen. Jeder Beleg.",
    intro:
      "Ein geschuetzter Arbeitsbereich fuer Aufnahme, Vertraege, zugeordnete Buchungen, automatische Stripe-Splits und ERP-Abgleich.",
    back: "Zurueck zum Konto",
    secure: "AAL2-geschuetzt",
    loading: "Geschuetzter Arbeitsbereich wird geoeffnet",
    loginTitle: "Sicher anmelden",
    loginBody:
      "Dein Ambassador-Backend oeffnet nur mit deinem zugeordneten CRAYS-Konto und starker Anmeldung.",
    login: "Sicher anmelden",
    deniedTitle: "Zugang noch nicht aktiv",
    deniedBody:
      "Projektrolle, Aufnahme, Unterlagen oder starke Anmeldung benoetigen noch Aufmerksamkeit.",
    errorTitle: "Arbeitsbereich voruebergehend nicht verfuegbar",
    errorBody:
      "Es wurde kein Finanzstatus angenommen. Bitte spaeter erneut versuchen.",
    attention: "Meine Aufgaben",
    ready: "Bereit",
    blocked: "Aktion erforderlich",
    paperwork: "Unterlagen",
    bookings: "Zugeordnete Buchungen",
    settlement: "Automatischer Split",
    erp: "ERP-Abgleich",
    noPaperwork: "Noch keine freigegebenen Unterlagenbelege.",
    noBookings: "Noch keine dauerhaft zugeordneten Buchungen.",
    project: "Projektbereich",
    protected: "Nur deine eigenen Projekt- und Ambassador-Daten sind sichtbar.",
    stripe: "Stripe-Transfer",
    amount: "Deine 10%-Zuteilung",
    created: "Erfasst",
    receipt: "Beleg",
    open: "Offene Punkte",
  },
  es: {
    eyebrow: "Panel de Ambassador",
    title: "Tu trabajo. Tus reservas. Cada comprobante.",
    intro:
      "Un espacio protegido para admision, contratos, reservas atribuidas, reparto automatico de Stripe y conciliacion ERP.",
    back: "Volver a la cuenta",
    secure: "Protegido con AAL2",
    loading: "Abriendo tu espacio protegido",
    loginTitle: "Inicia sesion para continuar",
    loginBody:
      "Tu panel solo se abre con tu cuenta CRAYS vinculada y autenticacion reforzada.",
    login: "Iniciar sesion",
    deniedTitle: "El acceso aun no esta activo",
    deniedBody: "Tu rol, admision, documentos o sesion reforzada requieren atencion.",
    errorTitle: "Panel no disponible temporalmente",
    errorBody: "No se ha supuesto ningun estado financiero. Intentalo mas tarde.",
    attention: "Mi atencion",
    ready: "Listo",
    blocked: "Accion necesaria",
    paperwork: "Documentos",
    bookings: "Reservas atribuidas",
    settlement: "Reparto automatico",
    erp: "Conciliacion ERP",
    noPaperwork: "Aun no hay comprobantes documentales publicados.",
    noBookings: "Aun no hay reservas atribuidas de forma duradera.",
    project: "Ambito del proyecto",
    protected: "Solo son visibles tus propios datos de proyecto y Ambassador.",
    stripe: "Transferencia Stripe",
    amount: "Tu asignacion del 10%",
    created: "Registrado",
    receipt: "Comprobante",
    open: "Pendientes",
  },
  ca: {
    eyebrow: "Tauler d'Ambassador",
    title: "La teva feina. Les teves reserves. Cada rebut.",
    intro:
      "Un espai protegit per a admissio, contractes, reserves atribuides, repartiment automatic de Stripe i conciliacio ERP.",
    back: "Tornar al compte",
    secure: "Protegit amb AAL2",
    loading: "Obrint el teu espai protegit",
    loginTitle: "Inicia sessio per continuar",
    loginBody: "El tauler nomes s'obre amb el teu compte CRAYS vinculat i autenticacio reforcada.",
    login: "Iniciar sessio",
    deniedTitle: "L'acces encara no esta actiu",
    deniedBody: "El rol, l'admissio, els documents o la sessio reforcada requereixen atencio.",
    errorTitle: "Tauler temporalment no disponible",
    errorBody: "No s'ha assumit cap estat financer. Torna-ho a provar mes tard.",
    attention: "La meva atencio",
    ready: "Preparat",
    blocked: "Accio necessaria",
    paperwork: "Documents",
    bookings: "Reserves atribuides",
    settlement: "Repartiment automatic",
    erp: "Conciliacio ERP",
    noPaperwork: "Encara no hi ha rebuts documentals publicats.",
    noBookings: "Encara no hi ha reserves atribuides de manera durable.",
    project: "Ambit del projecte",
    protected: "Nomes son visibles les teves dades de projecte i Ambassador.",
    stripe: "Transferencia Stripe",
    amount: "La teva assignacio del 10%",
    created: "Registrat",
    receipt: "Rebut",
    open: "Pendents",
  },
  fr: {
    eyebrow: "Espace Ambassador",
    title: "Votre travail. Vos reservations. Chaque justificatif.",
    intro:
      "Un espace protege pour admission, contrats, reservations attribuees, repartition Stripe automatique et rapprochement ERP.",
    back: "Retour au compte",
    secure: "Protege AAL2",
    loading: "Ouverture de votre espace protege",
    loginTitle: "Connectez-vous pour continuer",
    loginBody: "Votre espace requiert votre compte CRAYS associe et une authentification forte.",
    login: "Connexion securisee",
    deniedTitle: "L'acces n'est pas encore actif",
    deniedBody: "Votre role, admission, dossier ou session forte demande une action.",
    errorTitle: "Espace temporairement indisponible",
    errorBody: "Aucun etat financier n'a ete suppose. Reessayez plus tard.",
    attention: "Mon attention",
    ready: "Pret",
    blocked: "Action requise",
    paperwork: "Dossier",
    bookings: "Reservations attribuees",
    settlement: "Repartition automatique",
    erp: "Rapprochement ERP",
    noPaperwork: "Aucun justificatif publie pour le moment.",
    noBookings: "Aucune reservation attribuee durablement.",
    project: "Perimetre du projet",
    protected: "Seules vos donnees de projet et Ambassador sont visibles.",
    stripe: "Virement Stripe",
    amount: "Votre allocation de 10 %",
    created: "Enregistre",
    receipt: "Justificatif",
    open: "Elements ouverts",
  },
  pt: {
    eyebrow: "Backend de Ambassador",
    title: "O seu trabalho. As suas reservas. Cada comprovativo.",
    intro:
      "Um espaco protegido para admissao, contratos, reservas atribuidas, divisao Stripe automatica e reconciliacao ERP.",
    back: "Voltar a conta",
    secure: "Protegido por AAL2",
    loading: "A abrir o seu espaco protegido",
    loginTitle: "Inicie sessao para continuar",
    loginBody: "O backend abre apenas com a sua conta CRAYS associada e autenticacao forte.",
    login: "Iniciar sessao",
    deniedTitle: "O acesso ainda nao esta ativo",
    deniedBody: "A funcao, admissao, documentos ou sessao forte requerem atencao.",
    errorTitle: "Backend temporariamente indisponivel",
    errorBody: "Nenhum estado financeiro foi presumido. Tente novamente mais tarde.",
    attention: "Minha atencao",
    ready: "Pronto",
    blocked: "Acao necessaria",
    paperwork: "Documentos",
    bookings: "Reservas atribuidas",
    settlement: "Divisao automatica",
    erp: "Reconciliacao ERP",
    noPaperwork: "Ainda nao existem comprovativos publicados.",
    noBookings: "Ainda nao existem reservas atribuidas de forma duradoura.",
    project: "Ambito do projeto",
    protected: "Apenas os seus dados de projeto e Ambassador sao visiveis.",
    stripe: "Transferencia Stripe",
    amount: "A sua alocacao de 10%",
    created: "Registado",
    receipt: "Comprovativo",
    open: "Itens em aberto",
  },
  it: {
    eyebrow: "Backend Ambassador",
    title: "Il tuo lavoro. Le tue prenotazioni. Ogni ricevuta.",
    intro:
      "Uno spazio protetto per ammissione, contratti, prenotazioni attribuite, split Stripe automatico e riconciliazione ERP.",
    back: "Torna all'account",
    secure: "Protetto AAL2",
    loading: "Apertura dello spazio protetto",
    loginTitle: "Accedi per continuare",
    loginBody: "Il backend si apre solo con il tuo account CRAYS associato e autenticazione forte.",
    login: "Accesso sicuro",
    deniedTitle: "L'accesso non e ancora attivo",
    deniedBody: "Ruolo, ammissione, documenti o sessione forte richiedono attenzione.",
    errorTitle: "Backend temporaneamente non disponibile",
    errorBody: "Nessuno stato finanziario e stato presunto. Riprova piu tardi.",
    attention: "La mia attenzione",
    ready: "Pronto",
    blocked: "Azione richiesta",
    paperwork: "Documenti",
    bookings: "Prenotazioni attribuite",
    settlement: "Split automatico",
    erp: "Riconciliazione ERP",
    noPaperwork: "Nessuna ricevuta documentale pubblicata.",
    noBookings: "Nessuna prenotazione attribuita in modo durevole.",
    project: "Ambito del progetto",
    protected: "Sono visibili solo i tuoi dati di progetto e Ambassador.",
    stripe: "Trasferimento Stripe",
    amount: "La tua quota del 10%",
    created: "Registrato",
    receipt: "Ricevuta",
    open: "Elementi aperti",
  },
} satisfies Record<ClubsLocale, Record<string, string>>;

function humanState(value: string | null): string {
  if (!value) return "PENDING";
  return value.replaceAll("_", " ");
}

function money(amountMinor: number, currency: string, locale: ClubsLocale) {
  const tags: Record<ClubsLocale, string> = {
    en: "en-GB",
    de: "de-DE",
    es: "es-ES",
    ca: "ca-ES",
    fr: "fr-FR",
    pt: "pt-PT",
    it: "it-IT",
  };
  return new Intl.NumberFormat(tags[locale], {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export function ClubsAmbassadorBackofficePage({
  locale,
}: {
  locale: ClubsLocale;
}) {
  const text = copy[locale];
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/crays/clubs/ambassador/backoffice", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          status?: string;
          backoffice?: Backoffice;
        } | null;
        if (response.status === 401) {
          setView({ kind: "authentication" });
        } else if (response.status === 403) {
          setView({
            kind: "denied",
            message: payload?.status ?? "authority_required",
          });
        } else if (response.ok && payload?.backoffice?.state === "AMBASSADOR_BACKOFFICE") {
          setView({ kind: "ready", backoffice: payload.backoffice });
        } else {
          setView({ kind: "error" });
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setView({ kind: "error" });
      });
    return () => controller.abort();
  }, []);

  const attentionCount = useMemo(() => {
    if (view.kind !== "ready") return 0;
    const backoffice = view.backoffice;
    const paperworkOpen = backoffice.paperwork.filter(
      (item) => !["VERIFIED", "SIGNED"].includes(item.documentState),
    ).length;
    const settlementsOpen = backoffice.bookingAllocations.filter(
      (item) =>
        item.stripeDeliveryState !== "ACKNOWLEDGED_PENDING_RECONCILIATION" ||
        item.erpReconciliationState !== "RECONCILED",
    ).length;
    return (
      paperworkOpen +
      settlementsOpen +
      (backoffice.authority.readinessState ===
      "READY_FOR_ATTRIBUTION_AND_AUTOMATIC_SETTLEMENT"
        ? 0
        : 1)
    );
  }, [view]);

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#071c35]">
      <section className="relative overflow-hidden bg-[#071c35] text-white">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_15%_20%,rgba(40,153,214,.35),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(232,55,91,.2),transparent_25%)]" />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-14 pt-6 sm:px-8 lg:pb-20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={"/" + locale + "/account"}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {text.back}
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {text.secure}
            </span>
          </div>
          <div className="mt-16 max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#7dc9f2]">
              {text.eyebrow}
            </p>
            <h1 className="mt-5 text-[clamp(2.8rem,7vw,6.6rem)] font-semibold leading-[0.91] tracking-[-0.055em]">
              {text.title}
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              {text.intro}
            </p>
          </div>
        </div>
      </section>

      {view.kind === "loading" ? (
        <StatePanel
          icon={<LoaderCircle className="h-7 w-7 animate-spin" />}
          title={text.loading}
          body={text.protected}
        />
      ) : null}
      {view.kind === "authentication" ? (
        <StatePanel
          icon={<ShieldCheck className="h-7 w-7" />}
          title={text.loginTitle}
          body={text.loginBody}
          action={
            <a
              href={
                "/auth/login?returnTo=" +
                encodeURIComponent("/" + locale + "/account/ambassador")
              }
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#e8375b] px-5 py-3 text-sm font-bold text-white"
            >
              {text.login}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          }
        />
      ) : null}
      {view.kind === "denied" ? (
        <StatePanel
          icon={<CircleAlert className="h-7 w-7" />}
          title={text.deniedTitle}
          body={text.deniedBody}
          detail={view.message}
        />
      ) : null}
      {view.kind === "error" ? (
        <StatePanel
          icon={<CircleAlert className="h-7 w-7" />}
          title={text.errorTitle}
          body={text.errorBody}
        />
      ) : null}

      {view.kind === "ready" ? (
        <div className="mx-auto grid max-w-[1240px] gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
          <section className="space-y-6">
            <article className="rounded-[28px] border border-[#c8dceb] bg-white p-6 shadow-[0_22px_70px_rgba(7,28,53,.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#267cac]">
                    {text.attention}
                  </p>
                  <p className="mt-3 text-6xl font-semibold tracking-[-0.06em]">
                    {attentionCount}
                  </p>
                  <p className="mt-2 text-sm text-[#51708c]">{text.open}</p>
                </div>
                <CircleAlert className="h-8 w-8 text-[#e8375b]" />
              </div>
            </article>

            <article className="rounded-[28px] bg-[#cfeeff] p-6">
              <BadgeCheck className="h-7 w-7 text-[#146b9c]" />
              <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#146b9c]">
                {text.project}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {view.backoffice.projectId}
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#315c77]">
                {text.protected}
              </p>
              <div className="mt-5 rounded-2xl bg-white/65 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#315c77]">
                {humanState(view.backoffice.authority.readinessState)}
              </div>
            </article>

            <article className="rounded-[28px] border border-[#c8dceb] bg-white p-6">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-6 w-6 text-[#267cac]" />
                <h2 className="text-xl font-semibold">{text.paperwork}</h2>
              </div>
              <div className="mt-5 space-y-3">
                {view.backoffice.paperwork.length === 0 ? (
                  <p className="text-sm text-[#51708c]">{text.noPaperwork}</p>
                ) : (
                  view.backoffice.paperwork.map((item) => (
                    <div
                      key={item.documentSha256}
                      className="rounded-2xl border border-[#dce9f2] bg-[#f8fbfd] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold">
                          {humanState(item.documentKind)}
                        </p>
                        <span className="rounded-full bg-[#e5f4ec] px-2.5 py-1 text-[10px] font-black uppercase text-[#19734b]">
                          {humanState(item.documentState)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs text-[#51708c]">
                        {text.receipt}: {item.documentReference}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="rounded-[32px] border border-[#c8dceb] bg-white p-5 shadow-[0_22px_70px_rgba(7,28,53,.08)] sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dce9f2] pb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#267cac]">
                  {text.bookings}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
                  {view.backoffice.bookingAllocations.length}
                </h2>
              </div>
              <Split className="h-8 w-8 text-[#e8375b]" />
            </div>

            <div className="mt-6 space-y-5">
              {view.backoffice.bookingAllocations.length === 0 ? (
                <div className="rounded-[24px] bg-[#f4f8fb] p-8 text-center text-sm text-[#51708c]">
                  {text.noBookings}
                </div>
              ) : (
                view.backoffice.bookingAllocations.map((item) => (
                  <article
                    key={item.bookingId + item.allocationCode}
                    className="overflow-hidden rounded-[26px] border border-[#dce9f2]"
                  >
                    <div className="grid gap-5 bg-[#f4f8fb] p-5 sm:grid-cols-[1fr_auto]">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#51708c]">
                          {item.bookingId}
                        </p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                          {money(item.amountMinor, item.currency, locale)}
                        </p>
                        <p className="mt-1 text-sm text-[#51708c]">
                          {text.amount}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start rounded-full bg-[#071c35] px-3 py-1.5 text-xs font-bold text-white">
                        <WalletCards className="h-4 w-4" />
                        {(item.rateBps / 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="grid gap-px bg-[#dce9f2] sm:grid-cols-2">
                      <StatusCell
                        icon={<Split className="h-5 w-5" />}
                        label={text.stripe}
                        value={humanState(item.stripeDeliveryState)}
                      />
                      <StatusCell
                        icon={<Landmark className="h-5 w-5" />}
                        label={text.erp}
                        value={humanState(
                          item.erpReconciliationState ??
                            item.erpDeliveryState,
                        )}
                      />
                    </div>
                    <div className="flex flex-wrap justify-between gap-3 border-t border-[#dce9f2] px-5 py-4 text-xs text-[#51708c]">
                      <span>
                        {text.created}:{" "}
                        {new Intl.DateTimeFormat(locale).format(
                          new Date(item.createdAt),
                        )}
                      </span>
                      <span className="max-w-[220px] truncate">
                        {item.orderId}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function StatePanel({
  icon,
  title,
  body,
  detail,
  action,
}: {
  icon: import("react").ReactNode;
  title: string;
  body: string;
  detail?: string;
  action?: import("react").ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[900px] px-5 py-16 sm:px-8 lg:py-24">
      <div className="rounded-[32px] border border-[#c8dceb] bg-white p-8 text-center shadow-[0_22px_70px_rgba(7,28,53,.08)] sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#cfeeff] text-[#146b9c]">
          {icon}
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#51708c]">
          {body}
        </p>
        {detail ? (
          <p className="mt-4 font-mono text-xs text-[#7a8792]">{detail}</p>
        ) : null}
        {action}
      </div>
    </section>
  );
}

function StatusCell({
  icon,
  label,
  value,
}: {
  icon: import("react").ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-5">
      <div className="flex items-center gap-2 text-[#267cac]">
        {icon}
        <span className="text-xs font-black uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold">{value}</p>
    </div>
  );
}

