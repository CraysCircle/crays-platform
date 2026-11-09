import { PublicInformationPage } from "@/components/public-information-page";

export default function GermanLanguagePage() {
  return <PublicInformationPage eyebrow="Sprache" title="Deutsch" intro="Die vollständige deutsche Fassung wird vor General Availability veröffentlicht. Bis dahin bleibt die verifizierte englische Produktoberfläche maßgeblich." sections={[{ title: "Kein falscher Sprachwechsel", copy: "Dieser Link führt zu einem echten Statusziel und behauptet keine Übersetzung, die noch nicht vollständig geprüft wurde." }, { title: "Nächster Schritt", copy: "Die deutsche Fassung muss Navigation, Rechtstexte, Registrierung, Anmeldung, Fehler, Wiederherstellung und Barrierefreiheit vollständig abdecken." }]} />;
}
