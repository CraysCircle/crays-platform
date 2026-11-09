import { ExperiencesScreenTwo } from "@/components/crays-clubs/public/experiences-screen-two";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import messages from "@/components/crays-clubs/public/experience-messages/pt.json";
export const metadata=clubsPageMetadata("pt","experiences",{});
export default function ExperiencesRoute(){return <ExperiencesScreenTwo locale="pt" messages={messages}/>;}
