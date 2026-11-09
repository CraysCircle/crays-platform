type ClubsTeamIssueOriginEnvironment = Readonly<
  Record<string, string | undefined>
>;

const productionOrigin = "https://www.crays.pro";

function configuredPreviewOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:"
      || !parsed.hostname.endsWith(".vercel.app")
      || parsed.username
      || parsed.password
      || parsed.port
      || parsed.pathname !== "/"
      || parsed.search
      || parsed.hash
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function validClubsTeamProductionIssueOrigin(
  origin: string | null,
  environment: ClubsTeamIssueOriginEnvironment,
) {
  if (origin === productionOrigin) return true;
  if (environment.VERCEL_ENV !== "preview") return false;
  const previewOrigin = configuredPreviewOrigin(environment.APP_BASE_URL);
  return previewOrigin !== null && origin === previewOrigin;
}
