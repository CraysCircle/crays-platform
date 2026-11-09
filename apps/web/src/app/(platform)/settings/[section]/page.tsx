import { notFound } from "next/navigation";
import { SettingsAdminPage } from "@/components/settings-admin-page";
import { settingsSectionByKey } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionKey } = await params;
  const section = settingsSectionByKey(sectionKey);
  return {
    title: section ? `${section.label} Settings | CRAYS Platform` : "Settings | CRAYS Platform",
  };
}

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionKey } = await params;
  const section = settingsSectionByKey(sectionKey);

  if (!section) notFound();

  return <SettingsAdminPage section={section} />;
}
