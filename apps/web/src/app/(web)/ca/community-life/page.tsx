import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";
import { ClubsCommunityLifePage } from "../../../../components/crays-clubs/public/clubs-community-life-page";
import { communityCopy } from "../../../../components/crays-clubs/public/community-life-copy";

const copy = communityCopy["ca"];
export const metadata: Metadata = clubsPageMetadata("ca", "community-life", { title: copy.meta.title, description: copy.meta.description });
export default function CommunityLifePage() { return <ClubsCommunityLifePage locale="ca" />; }
