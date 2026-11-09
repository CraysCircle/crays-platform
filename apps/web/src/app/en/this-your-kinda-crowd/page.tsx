import { ClubsTodayCrowdPage } from "@/components/crays-clubs/public/clubs-today-crowd-page";
import { todayMessages, todayMetadata } from "@/components/crays-clubs/public/today-page-copy";
export function generateMetadata() { return todayMetadata("en", "this-your-kinda-crowd"); }
export default async function Page() {
  return <ClubsTodayCrowdPage locale="en" messages={await todayMessages("en")} />;
}
