"use client";

import { createContext, useContext, forwardRef, type AnchorHTMLAttributes } from 'react';

/** Only the separate public entry opts in; private module links keep original semantics. */
export const OriginalPublicLinksContext = createContext(false);
export function originalPublicHref(href:string, enabled:boolean):string {
  if (!enabled || !/^\/(?:en|de|es|ca|fr|pt|it)(?:\/|[?#]|$)/.test(href)) return href;
  if (/^\/(?:en|de|es|ca|fr|pt|it)\/account\/?(?:[?#]|$)/.test(href)) return href;
  return 'https://www.craysclub.com'+href;
}

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
};

/** Preserve native navigation/download/auth semantics; never consume API links in a client router. */
export default forwardRef<HTMLAnchorElement, Props>(function MemberBrowserLink(
  { prefetch: _prefetch, scroll: _scroll, replace: _replace, ...props }, ref,
) {
  const publicEntry = useContext(OriginalPublicLinksContext);
  return <a {...props} href={originalPublicHref(props.href,publicEntry)} ref={ref} />;
});
