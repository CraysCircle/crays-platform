import type {Metadata} from "next";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {isPermittedClubsPublicHost} from "@/lib/clubs/public-site";
import {ClubsPublicShell} from "@/components/crays-clubs/public/clubs-public-shell";
import tokens from "@/components/crays-clubs/public/clubs-public-design-tokens.module.css";
import memberStyles from "@/components/crays-clubs/member/clubs-member-home.module.css";
import {MemberAmbassadorRecruitment} from "@/components/crays-clubs/member/member-ambassador-recruitment";
import styles from "@/components/crays-clubs/member/member-ambassador-recruitment.module.css";

export const metadata:Metadata={...clubsPageMetadata("en", "ambassador-programme", {title:"Become a CRAYS Ambassador",description:"Bring your community, stories and ideas to CRAYS in Forest City."}, {availableLocales:["en"],index:false}),robots:{index:false,follow:false}};
export default async function AmbassadorProgrammePage() {
  const requestHeaders=await headers();
  if(!isPermittedClubsPublicHost(requestHeaders.get("host")))notFound();
  return <div className={`${tokens.theme} ${memberStyles.root}`}>
    <ClubsPublicShell locale="en" availableLocales={["en"]} headerTone="navy">
      <main className={styles.publicPage}>
        <h1>Become a CRAYS Ambassador.</h1>
        <MemberAmbassadorRecruitment locale="en"/>
      </main>
    </ClubsPublicShell>
  </div>;
}
