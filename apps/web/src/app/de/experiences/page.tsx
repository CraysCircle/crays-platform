import { ExperiencesScreenTwo } from "@/components/crays-clubs/public/experiences-screen-two";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import messages from "@/components/crays-clubs/public/experience-messages/de.json";
export const metadata=clubsPageMetadata("de","experiences",{});
export default function ExperiencesRoute(){return <ExperiencesScreenTwo locale="de" messages={messages}/>;}
