import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";
import { ClubsLifestylePage } from "@/components/crays-clubs/public/clubs-lifestyle-page";
import { lifestyleCopy } from "@/components/crays-clubs/public/lifestyle-copy";
const copy = lifestyleCopy["ca"];
export const metadata: Metadata = clubsPageMetadata("ca", "lifestyle", { title: copy.metadata.title, description: copy.metadata.description });
export default function LifestyleRoutePage(){ return <ClubsLifestylePage locale="ca" />; }
