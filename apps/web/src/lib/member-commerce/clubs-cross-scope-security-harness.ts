export type CraysVentureRoot = "clubs" | "gym" | "coffee" | "retail";
export type ScopedOperatingRole = "holiday-manager" | "studio-manager" | "franchise-partner" | "finance";
export type ScopedObjectKind =
  | "CLUBS_PROPERTY"
  | "CLUBS_BOOKING"
  | "CLUBS_FINANCIAL"
  | "GYM_STUDIO"
  | "GYM_MEMBER"
  | "ERP_POSTING"
  | "FRANCHISE_PARTNER_PORTFOLIO";

export interface SecuritySubjectContext {
  authenticated: boolean;
  subjectId: string;
  tenantId: string;
  ventureRoot: CraysVentureRoot;
  role: ScopedOperatingRole;
  franchisePartnerId: string | null;
  propertyScopeIds: readonly string[];
  studioScopeIds: readonly string[];
}

export interface ScopedSecurityObject {
  objectId: string;
  tenantId: string;
  ventureRoot: CraysVentureRoot;
  kind: ScopedObjectKind;
  franchisePartnerId: string | null;
  propertyId: string | null;
  studioId: string | null;
}

export type ScopedSecurityDecision =
  | { allowed: true; status: 200; code: "ALLOWED" }
  | { allowed: false; status: 404; code: "RESOURCE_NOT_FOUND"; publicBody: "Resource not found" }
  | { allowed: false; status: 403; code: "ROLE_CAPABILITY_DENIED"; publicBody: "Action not permitted" };

const NOT_FOUND: ScopedSecurityDecision = Object.freeze({
  allowed: false,
  status: 404,
  code: "RESOURCE_NOT_FOUND",
  publicBody: "Resource not found",
});
const CAPABILITY_DENIED: ScopedSecurityDecision = Object.freeze({
  allowed: false,
  status: 403,
  code: "ROLE_CAPABILITY_DENIED",
  publicBody: "Action not permitted",
});

const ROLE_OBJECT_CAPABILITIES: Readonly<Record<ScopedOperatingRole, readonly ScopedObjectKind[]>> = {
  "holiday-manager": ["CLUBS_PROPERTY", "CLUBS_BOOKING"],
  "studio-manager": ["GYM_STUDIO", "GYM_MEMBER"],
  "franchise-partner": [
    "CLUBS_PROPERTY",
    "CLUBS_BOOKING",
    "CLUBS_FINANCIAL",
    "GYM_STUDIO",
    "FRANCHISE_PARTNER_PORTFOLIO",
  ],
  finance: ["CLUBS_FINANCIAL", "ERP_POSTING"],
};

function hasExactAssignment(subject: SecuritySubjectContext, object: ScopedSecurityObject): boolean {
  if (subject.role === "holiday-manager") {
    return (
      subject.franchisePartnerId !== null &&
      subject.franchisePartnerId === object.franchisePartnerId &&
      object.propertyId !== null &&
      subject.propertyScopeIds.includes(object.propertyId)
    );
  }
  if (subject.role === "studio-manager") {
    return object.studioId !== null && subject.studioScopeIds.includes(object.studioId);
  }
  if (subject.role === "franchise-partner") {
    if (!subject.franchisePartnerId || subject.franchisePartnerId !== object.franchisePartnerId) return false;
    if (object.propertyId) return subject.propertyScopeIds.includes(object.propertyId);
    if (object.studioId) return subject.studioScopeIds.includes(object.studioId);
    return object.kind === "FRANCHISE_PARTNER_PORTFOLIO";
  }
  return true;
}

export function authorizeScopedObject(
  subject: SecuritySubjectContext,
  object: ScopedSecurityObject | null,
): ScopedSecurityDecision {
  if (!subject.authenticated || !object) return NOT_FOUND;
  if (subject.tenantId !== object.tenantId) return NOT_FOUND;
  if (subject.ventureRoot !== object.ventureRoot) return NOT_FOUND;
  if (!hasExactAssignment(subject, object)) return NOT_FOUND;
  if (!ROLE_OBJECT_CAPABILITIES[subject.role].includes(object.kind)) return CAPABILITY_DENIED;
  return { allowed: true, status: 200, code: "ALLOWED" };
}

export interface CrossScopeSecurityCase {
  name: string;
  subject: SecuritySubjectContext;
  object: ScopedSecurityObject | null;
  expectedAllowed: boolean;
  expectedStatus: 200 | 403 | 404;
}

export function runCrossScopeSecurityMatrix(cases: readonly CrossScopeSecurityCase[]): Readonly<{
  total: number;
  passed: number;
  failed: readonly string[];
  denialBodies: readonly string[];
}> {
  const failed: string[] = [];
  const denialBodies: string[] = [];
  for (const testCase of cases) {
    const decision = authorizeScopedObject(testCase.subject, testCase.object);
    if (decision.allowed !== testCase.expectedAllowed || decision.status !== testCase.expectedStatus) {
      failed.push(testCase.name);
    }
    if (!decision.allowed) denialBodies.push(decision.publicBody);
  }
  return Object.freeze({ total: cases.length, passed: cases.length - failed.length, failed, denialBodies });
}
