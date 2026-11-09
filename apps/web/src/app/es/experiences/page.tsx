import { ExperiencesScreenTwo } from "@/components/crays-clubs/public/experiences-screen-two";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import messages from "@/components/crays-clubs/public/experience-messages/es.json";
export const metadata=clubsPageMetadata("es","experiences",{});
export default function ExperiencesRoute(){return <ExperiencesScreenTwo locale="es" messages={messages}/>;}
