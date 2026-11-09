import { ExperiencesScreenTwo } from "@/components/crays-clubs/public/experiences-screen-two";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import messages from "@/components/crays-clubs/public/experience-messages/it.json";
export const metadata=clubsPageMetadata("it","experiences",{});
export default function ExperiencesRoute(){return <ExperiencesScreenTwo locale="it" messages={messages}/>;}
