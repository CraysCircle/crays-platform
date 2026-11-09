"use client";
import type {ClubsLocale} from "../../../lib/clubs/public-site";
import type {ClubsMembershipApplicationInput} from "../../../lib/clubs/public-ambassador-registry";
import {ClubsAmbassadorEditorialEnding} from "./clubs-ambassador-editorial";
import {ClubsAmbassadorLifeStory} from "./clubs-ambassador-life-story";

type Props={locale:ClubsLocale;ambassadorName:string;input:ClubsMembershipApplicationInput;disabled:boolean;setValue:<K extends keyof ClubsMembershipApplicationInput>(name:K,value:ClubsMembershipApplicationInput[K])=>void};
export function ClubsAmbassadorOriginalContent({locale,input,disabled,setValue}:Props){
 return <ClubsAmbassadorLifeStory locale={locale} input={input} disabled={disabled} setValue={setValue}/>;
}
export function ClubsAmbassadorOriginalEnding({locale}:{locale:ClubsLocale}){
 return <ClubsAmbassadorEditorialEnding locale={locale}/>;
}
