/**
 * NCRV2 Vendure administration is not a vertical-neutral role surface.
 * Studio Manager is the Gym operating role and must never acquire Clubs,
 * Coffee or Retail authority from a generic Store grant.
 */
export function isCommerceRoleVerticalAuthorized(
  role: string,
  verticalRoot: string,
) {
  if (role === "studio-manager") return verticalRoot === "gym";
  return role === "finance" || role === "franchise-partner";
}
