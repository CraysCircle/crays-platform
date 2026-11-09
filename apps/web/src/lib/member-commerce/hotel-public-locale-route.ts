/** Public route matching only. This does not grant property or booking access. */
export function isLocalizedPublicHotelPath(pathname: string, propertyId: string): boolean {
  const slug = propertyId === "property-clubs-forest-city-marina" ? "marina-hotel"
    : propertyId === "property-clubs-forest-city-golf" ? "golf-hotel" : null;
  if (!slug) return false;
  const parts = pathname.split("/");
  return parts.length === 4 && parts[0] === ""
    && ["en", "de", "es", "ca", "fr", "pt", "it"].includes(parts[1])
    && parts[2] === "hospitality" && parts[3] === slug;
}
