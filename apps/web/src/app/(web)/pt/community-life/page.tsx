import { clubsPageMetadata } from "@/lib/clubs/seo";
import type { Metadata } from "next";
import { ClubsCommunityLifePage } from "../../../../components/crays-clubs/public/clubs-community-life-page";
import { communityCopy } from "../../../../components/crays-clubs/public/community-life-copy";

const copy = communityCopy["pt"];
export const metadata: Metadata = clubsPageMetadata("pt", "community-life", { title: copy.meta.title, description: copy.meta.description });
export default function CommunityLifePage() { return <ClubsCommunityLifePage locale="pt" />; }
