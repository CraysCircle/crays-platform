import { clubsPageMetadata } from "@/lib/clubs/seo";
import { BrandAsAServicePage } from "@/components/crays-clubs/public/brand-as-a-service-page";
import messages from "@/components/crays-clubs/public/brand-messages/fr.json";
export const metadata=clubsPageMetadata("fr","brand-as-a-service",{});
export default function BrandRoute(){return <BrandAsAServicePage locale="fr" messages={messages}/>;}
