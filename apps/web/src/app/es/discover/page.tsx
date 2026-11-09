import { ClubsTodayForestCityPage } from "@/components/crays-clubs/public/clubs-today-forest-city-page";
import { todayMessages, todayMetadata } from "@/components/crays-clubs/public/today-page-copy";
export function generateMetadata() { return todayMetadata("es", "forest-city"); }
export default async function Page() {
  return <ClubsTodayForestCityPage locale="es" messages={await todayMessages("es")} />;
}
