import { permanentRedirect } from "next/navigation";

type ClubsSearchRedirectProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClubsSearchRedirect({
  searchParams,
}: ClubsSearchRedirectProps) {
  const query = await searchParams;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value !== undefined) {
      params.append(key, value);
    }
  });
  permanentRedirect(`/en/search${params.size ? `?${params.toString()}` : ""}`);
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
