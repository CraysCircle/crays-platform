import { ForestCityBookingExperience } from "@/components/forest-city-booking-experience";
import styles from "./page.module.css";

export const metadata = {
  title: "Forest City Hotels | CRAYS Clubs",
  description: "Forest City Golf Hotel and Marina Hotel CRAYS prelaunch booking experience.",
};

export default function ForestCityPage() {
  return (
    <main className={styles.page}>
      <ForestCityBookingExperience />
    </main>
  );
}
