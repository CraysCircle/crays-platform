"use client";
import { Children, cloneElement, createContext, isValidElement, useContext, type ReactNode, type ReactElement } from "react";
import type { ClubsLocale } from "../../../lib/clubs/public-site";
export type TodayMessages = Record<string, string>;
const TodayLocale = createContext<{locale: ClubsLocale; messages: TodayMessages}>({locale: "en", messages: {}});
export function TodayLocaleProvider({locale, messages, children}: {locale: ClubsLocale; messages: TodayMessages; children: ReactNode}) {
  return <TodayLocale.Provider value={{locale, messages}}>{children}</TodayLocale.Provider>;
}
export function useTodayText() {
  const {locale, messages} = useContext(TodayLocale);
  const text = (value: string) => {
    const key = value.replace(/\s+/g, " ").trim();
    if (!key || locale === "en") return value;
    if(messages[key]!==undefined)return (value.match(/^\s*/)?.[0]??"")+messages[key]+(value.match(/\s*$/)?.[0]??"");
    const flexible = /^Flexible · (night|week|month)$/.exec(key);
    if(flexible&&messages["Flexible"]&&messages[flexible[1]])return `${messages["Flexible"]} · ${messages[flexible[1]]}`;
    const gallery = /^Open (.+) image gallery at image (\d+)$/.exec(key);
    const galleryTitle = /^(.+) image gallery$/.exec(key);
    const stayLengths = /^Stay lengths: (.+)\.$/.exec(key);
    const template = gallery ? messages["Open {hotel} image gallery at image {n}"]
      : galleryTitle ? messages["{hotel} image gallery"]
      : stayLengths ? messages["Stay lengths: {units}."] : undefined;
    if(template){
      const translated=gallery?template.replace("{hotel}",gallery[1]).replace("{n}",gallery[2])
        :galleryTitle?template.replace("{hotel}",galleryTitle[1])
        :template.replace("{units}",stayLengths![1].split(", ").map(unit=>messages[unit]??unit).join(", "));
      return translated;
    }
    const rate = /^From (\$[\d,]+(?:\.\d{2})?) \/ (night|week|month|calendar month)$/.exec(key);
    const translated = messages[key] ?? (rate && messages["From"] && messages[rate[2]]
      ? `${messages["From"]} ${rate[1]} / ${messages[rate[2]]}` : undefined);
    return translated === undefined ? value : (value.match(/^\s*/)?.[0] ?? "") + translated + (value.match(/\s*$/)?.[0] ?? "");
  };
  const href = (value: string) => value.replace(/^(?:https:\/\/www\.craysclub\.com)?\/en(?=\/|$)/, `/${locale}`);
  return {text, href, locale};
}
/** Translate the explicit presentation tree, never state keys, identifiers or CSS. Runs during SSR as well as client renders. */
export function TodayLocalizedContent({children}: {children: ReactNode}) {
 const {text, href, locale} = useTodayText();
 function localize(node: ReactNode): ReactNode {
  if(typeof node === "string") return text(node);
  if(Array.isArray(node)) return Children.map(node, localize);
  if(!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props: Record<string, unknown> = {};
  if (element.type === "main") { props.lang = locale; props["data-today-locale"] = locale; }
  for(const name of ["alt", "title", "aria-label", "placeholder"]) if(typeof element.props[name] === "string") props[name] = text(element.props[name] as string);
  for(const name of ["href", "to"]) if(typeof element.props[name] === "string") props[name] = href(element.props[name] as string);
  if(element.props.children !== undefined) props.children = Children.map(element.props.children as ReactNode, localize);
  return cloneElement(element, props);
 }
 return localize(children);
}
