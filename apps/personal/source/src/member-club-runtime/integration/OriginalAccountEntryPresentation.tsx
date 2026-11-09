"use client";

import {ArrowRight,CheckCircle2,CircleAlert,LoaderCircle,RefreshCw,UserRound} from 'lucide-react';
import Image from './browser-image';
import {OriginalPublicLinksContext} from './browser-link';
import {originalSdkStartOrigin} from './original-platform-identity';
import {ClubsPublicShell} from '../components/crays-clubs/public/clubs-public-shell';
import {TodayLocaleProvider,TodayLocalizedContent} from '../components/crays-clubs/public/today-localized-content';
import {accountAccessMessages} from '../components/crays-clubs/public/account-access-messages';
import styles from '../components/crays-clubs/public/clubs-member-account.module.css';
import {CLUBS_LOCALES,clubsPath,type ClubsLocale} from '../lib/clubs/public-site';

/** Presentation only. The global original identity reader alone decides app admission. */
export type OriginalAccountEntryState =
 | {kind:'loading'}
 | {kind:'signed_out'}
 | {kind:'unavailable';status?:string;retryable?:boolean};
export type OriginalAccountEntryProps={locale:ClubsLocale;state:OriginalAccountEntryState;onRetry:()=>void};

/** Original public entry, outside the whole app shell. No account, role, token or session is created here. */
export function OriginalAccountEntryPresentation({locale,state,onRetry}:OriginalAccountEntryProps){
 const accountPath=clubsPath(locale,'account');
 const sdkOrigin=originalSdkStartOrigin(typeof window==='undefined'?undefined:window.location.origin);
 const loginHref=sdkOrigin+'/auth/login?returnTo='+encodeURIComponent(accountPath);
 const signupHref=sdkOrigin+'/auth/login?screen_hint=signup&returnTo='+encodeURIComponent(accountPath);
 return <OriginalPublicLinksContext.Provider value={true}><div className={`crays-club-member-global ${styles.globalEntry}`}>
  <ClubsPublicShell availableLocales={CLUBS_LOCALES} headerTone="navy" locale={locale}>
   <TodayLocaleProvider locale={locale} messages={accountAccessMessages[locale]}><TodayLocalizedContent>
    <main className={styles.account} lang={locale} data-original-account-entry>
     {state.kind==='loading'?<section className={styles.accountOpening} role="status" aria-live="polite" aria-busy="true"><LoaderCircle size={28} aria-hidden="true"/><p>{({en:'Opening your account…',de:'Dein Account wird geöffnet…',es:'Abriendo tu cuenta…',ca:'Obrint el teu compte…',fr:'Ouverture de votre compte…',pt:'A abrir a sua conta…',it:'Apertura del tuo account…'} satisfies Record<ClubsLocale,string>)[locale]}</p></section>:
      <section className={styles.signedOutHero}>
       <div className={styles.accountStory}>
        <Image alt="Forest City Marina Hotel and waterfront" fill priority sizes="(max-width: 820px) 100vw, 62vw" src="/__crays-clubs/forest-city-v2552/marina/001-d1eb2e058f0c76ba.jpg"/>
        <div className={styles.storyShade}/><div className={styles.storyContent}>
         <p className={styles.kicker}>ACCOUNT &amp; BOOKING</p><h1>Create your CRAYS account for stays, membership and access.</h1>
         <p className={styles.lead}>Keep saved stays, booking requests, member services and support together in one secure place.</p>
         <ol className={styles.storySteps}>
          <li><span>01</span><strong>Create account</strong><p>Use secure CRAYS sign-in for your guest or member profile.</p></li>
          <li><span>02</span><strong>Save stays</strong><p>Return to the Forest City properties you are considering.</p></li>
          <li><span>03</span><strong>Manage requests</strong><p>Keep bookings, services and stay details easy to find.</p></li>
          <li><span>04</span><strong>Get support</strong><p>Continue stay conversations from one account.</p></li>
         </ol>
        </div>
       </div>
       <div className={styles.accessPanelWrap}><div className={styles.accessPanel} aria-live="polite">
        {state.kind==='signed_out'?<><UserRound size={32} aria-hidden/><p className={styles.kicker}>CRAYS ACCOUNT</p><h2>Sign in to continue</h2><p>Access your saved stays, requests, services and member support.</p>
         <div className={styles.accessActions}><a className={styles.primaryAction} href={loginHref}>Log in <ArrowRight size={17} aria-hidden/></a><a className={styles.secondaryAction} href={signupHref}>Create account</a></div>
         <div className={styles.accessTrust}><CheckCircle2 size={18} aria-hidden/><span>Secure CRAYS sign-in. No booking is confirmed by signing in.</span></div>
        </>:<><CircleAlert size={32} aria-hidden/><p className={styles.kicker}>ACCOUNT STATUS</p><h2>{state.status==='invalid_session_provenance'?'This sign-in session cannot be used here':'Your account is temporarily unavailable'}</h2>
         <p>{state.status==='configuration_not_ready'?'Secure account access is not available yet. Please return shortly.':'We could not open your CRAYS account safely. No account action was completed.'}</p>
         <div className={styles.accessActions}>{state.retryable&&<button className={styles.secondaryAction} type="button" onClick={onRetry}><RefreshCw size={17} aria-hidden/>Try again</button>}<a className={styles.primaryAction} href={loginHref}>Log in <ArrowRight size={17} aria-hidden/></a></div>
        </>}
       </div></div>
      </section>}
    </main>
   </TodayLocalizedContent></TodayLocaleProvider>
  </ClubsPublicShell>
 </div></OriginalPublicLinksContext.Provider>;
}
