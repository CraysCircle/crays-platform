import type { ProductWorld, Entity } from "./productModel.ts";
export const matchingPurposes = ["Business", "Socializing", "Dating"];
export const instruments = [
  "Myers–Briggs",
  "OCEAN",
  "Predictive Index",
  "Enneagram",
];
export function matchingAssessments(
  w: ProductWorld,
  purpose: string,
  now = Date.now(),
): Entity[] {
  return w.objects.filter(
    (r) =>
      r.kind === "assessment" &&
      r.owner === w.owner &&
      r.status !== "revoked" &&
      w.objects.some(
        (g) =>
          g.owner === w.owner &&
          g.kind === "assessment-permission" &&
          g.resultId === r.id &&
          g.version === r.version &&
          g.status === "active" &&
          g.use === "matching" &&
          Array.isArray(g.purposes) &&
          g.purposes.includes(purpose) &&
          (!g.expiresAt || Number(g.expiresAt) > now),
      ),
  );
}
