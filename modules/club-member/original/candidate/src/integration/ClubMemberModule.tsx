"use client";

import integrationStyles from "./club-global-layout.module.css";

import { ClubsMemberAccount, type SessionState } from '../components/crays-clubs/public/clubs-member-account';
import { getClubsCopy } from '../lib/clubs/public-site-copy';
import type { ClubsLocale } from '../lib/clubs/public-site';
import { MemberRouteProvider, type MemberRoutePort } from './member-route';

export type ClubMemberModuleProps = {
  locale: ClubsLocale;
  route: MemberRoutePort;
  /** UI consistency guard from original global identity; grants no data or command authority. */
  expectedAccountId?: string;
  /** Existing global topbar slot; preserves original Club layout controller and Cart. */
  toolbarTarget?: HTMLElement | null;
  /** Notification of original BFF session resolution, never a supplied identity. */
  onSessionChange?: (state: SessionState) => void;
};

/**
 * Mount inside the real unified platform shell. Original member/session and
 * persisted-operation endpoints must be served securely on this same origin.
 * This component supplies no demo account, provider credentials or fake feeds.
 */
export function ClubMemberModule({ locale, route, expectedAccountId, toolbarTarget, onSessionChange }: ClubMemberModuleProps) {
  return <div className={`crays-club-member-global ${integrationStyles.integrationRoot}`} style={{minWidth:0}}><MemberRouteProvider port={route}>
    <ClubsMemberAccount key={expectedAccountId ?? "original-session"} locale={locale} copy={getClubsCopy(locale)} embedded expectedAccountId={expectedAccountId} toolbarTarget={toolbarTarget}
      onSessionChange={onSessionChange} />
  </MemberRouteProvider></div>;
}

export type { MemberRoutePort, SessionState };

export {readOriginalPlatformIdentity, projectOriginalPlatformIdentity, type OriginalPlatformIdentity} from './original-platform-identity';

export {OriginalAccountEntryPresentation,type OriginalAccountEntryState,type OriginalAccountEntryProps} from "./OriginalAccountEntryPresentation";
