import { clubsPageMetadata } from "@/lib/clubs/seo";
import { BrandAsAServicePage } from "@/components/crays-clubs/public/brand-as-a-service-page";
import messages from "@/components/crays-clubs/public/brand-messages/de.json";
export const metadata=clubsPageMetadata("de","brand-as-a-service",{});
export default function BrandRoute(){return <BrandAsAServicePage locale="de" messages={messages}/>;}
