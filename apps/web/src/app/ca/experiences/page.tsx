import { ExperiencesScreenTwo } from "@/components/crays-clubs/public/experiences-screen-two";
import { clubsPageMetadata } from "@/lib/clubs/seo";
import messages from "@/components/crays-clubs/public/experience-messages/ca.json";
export const metadata=clubsPageMetadata("ca","experiences",{});
export default function ExperiencesRoute(){return <ExperiencesScreenTwo locale="ca" messages={messages}/>;}
