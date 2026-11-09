import { ExperiencesScreenTwo } from "@/components/crays-clubs/public/experiences-screen-two";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import messages from "@/components/crays-clubs/public/experience-messages/fr.json";
export const metadata=clubsPageMetadata("fr","experiences",{});
export default function ExperiencesRoute(){return <ExperiencesScreenTwo locale="fr" messages={messages}/>;}
