import { clubsPageMetadata } from "@/lib/clubs/seo";
import { AgenticLifeLocalizedPage } from "@/components/crays-clubs/public/agentic-life-localized-page";
import { agenticLifeTranslator, AGENTIC_LIFE_LOCALES } from "@/components/crays-clubs/public/agentic-life-translation";
const t = agenticLifeTranslator("es");
export const metadata = clubsPageMetadata("es", "agentic-life", {
 title: t("Agentic Life — Your next chapter, connected | CRAYS"),
 description: t("Your personal AI, your community and real-world services. Explore the planned CRAYS Agentic Life experience."),
}, { availableLocales: AGENTIC_LIFE_LOCALES });
export default function Page() { return <AgenticLifeLocalizedPage locale="es" />; }
