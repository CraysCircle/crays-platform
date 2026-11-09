import { clubsPageMetadata } from "@/lib/clubs/seo";
import { BrandAsAServicePage } from "@/components/crays-clubs/public/brand-as-a-service-page";
import messages from "@/components/crays-clubs/public/brand-messages/pt.json";
export const metadata=clubsPageMetadata("pt","brand-as-a-service",{});
export default function BrandRoute(){return <BrandAsAServicePage locale="pt" messages={messages}/>;}
