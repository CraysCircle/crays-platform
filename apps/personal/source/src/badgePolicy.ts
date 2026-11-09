import {planContractActive} from "./craysPlans.ts";
import type { ProductWorld } from "./productModel.ts";
export const founderBadge = {
  id: "BADGE-FOUNDER",
  name: "Founder Badge",
  family: "FOUNDER",
  lifetime: true,
};
export function publicBadgeAwards(w: ProductWorld, personId: string) {
  const awards = w.objects.filter(
    (o) =>
      o.kind === "badge-award" &&
      o.personId === personId &&
      o.status === "issued-demo" &&
      o.displayPublic === true &&
      (!o.contractId || w.objects.some(c=>c.id===o.contractId&&c.kind==="crays-plan-contract"&&c.owner===o.owner&&planContractActive(c)&&Number(o.startsAt)<=Date.now()&&Number(o.endsAt)>Date.now())) &&
      o.badgeId !== founderBadge.id &&
      !(personId === "thorben" && o.badgeId === "BADGE-C01"),
  );
  if (personId === "thorben")
    awards.unshift({
      id: "founder-thorben",
      owner: w.owner,
      kind: "badge-award",
      personId: "thorben",
      badgeId: founderBadge.id,
      status: "issued-demo",
      displayPublic: true,
      issuer: "Explicit CRAYS owner designation",
      notForSale: true,
    });
  return awards;
}
