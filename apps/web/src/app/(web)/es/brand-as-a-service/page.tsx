import { clubsPageMetadata } from "@/lib/clubs/seo";
import { BrandAsAServicePage } from "@/components/crays-clubs/public/brand-as-a-service-page";
import messages from "@/components/crays-clubs/public/brand-messages/es.json";
export const metadata=clubsPageMetadata("es","brand-as-a-service",{});
export default function BrandRoute(){return <BrandAsAServicePage locale="es" messages={messages}/>;}
