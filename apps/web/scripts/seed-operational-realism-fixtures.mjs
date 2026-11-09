import { createHash } from "node:crypto";
import { Pool } from "pg";
import { getRedactedDatabaseTarget, loadLocalEnv } from "./env-loader.mjs";

loadLocalEnv();

const apply = process.argv.includes("--apply");
const confirm = process.env.CONFIRM_CRAYS_OPERATIONAL_REALISM === "APPLY_OPERATIONAL_REALISM_FIXTURES";
const connectionString = process.env.CRAYS_DATABASE_URL;
const generatedAt = new Date().toISOString();
const crmSeedBatch = "crays-operational-realism-20260713-v1";
const projectSeedBatch = "crays-opening-project-20260713-v1";
const crmExternalSystem = "crm-operational-fixture";
const projectExternalSystem = "opening-project-engine";

const crmTargets = {
  companies: 2_173,
  people: 5_348,
  leads: 10_427,
  opportunities: 5_183,
  emails: 1_947,
  "calendar-events": 973,
  tasks: 2_741,
  activities: 2_683,
  notes: 1_119,
};

if (!connectionString) {
  console.error("CRAYS_DATABASE_URL is required.");
  process.exit(1);
}

if (apply && !confirm) {
  console.error("Set CONFIRM_CRAYS_OPERATIONAL_REALISM=APPLY_OPERATIONAL_REALISM_FIXTURES to apply operational realism fixtures.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: Number.parseInt(process.env.CRAYS_DATABASE_POOL_MAX ?? "5", 10),
  ssl:
    process.env.CRAYS_DATABASE_SSL === "require"
      ? { rejectUnauthorized: process.env.CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
  options: "-c crays.app_role=core_service",
});

function digest(value, length = 24) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isoDate(dayOffset, hour = 9, minute = 0) {
  const base = new Date("2026-07-13T00:00:00.000Z");
  base.setUTCDate(base.getUTCDate() + dayOffset);
  base.setUTCHours(hour, minute, 0, 0);
  return base.toISOString();
}

function dueDate(dayOffset) {
  return isoDate(dayOffset).slice(0, 10);
}

function pick(list, index) {
  return list[Math.abs(index) % list.length];
}

const cities = [
  ["Munich", "Bavaria", "Leopoldstrasse", "80333"],
  ["Berlin", "Berlin", "Invalidenstrasse", "10115"],
  ["Hamburg", "Hamburg", "Eppendorfer Landstrasse", "20249"],
  ["Cologne", "NRW", "Venloer Strasse", "50823"],
  ["Frankfurt", "Hesse", "Bockenheimer Landstrasse", "60325"],
  ["Stuttgart", "Baden-Wuerttemberg", "Koenigstrasse", "70173"],
  ["Duesseldorf", "NRW", "Lorettostrasse", "40219"],
  ["Leipzig", "Saxony", "Karl-Liebknecht-Strasse", "04107"],
  ["Dresden", "Saxony", "Koenigsbruecker Strasse", "01099"],
  ["Nuremberg", "Bavaria", "Allersberger Strasse", "90461"],
  ["Hanover", "Lower Saxony", "Lister Meile", "30161"],
  ["Bremen", "Bremen", "Ostertorsteinweg", "28203"],
  ["Essen", "NRW", "Ruttenscheider Strasse", "45130"],
  ["Dortmund", "NRW", "Hohe Strasse", "44139"],
  ["Mainz", "Rhineland-Palatinate", "Grosse Bleiche", "55116"],
  ["Mannheim", "Baden-Wuerttemberg", "Augustaanlage", "68165"],
  ["Augsburg", "Bavaria", "Maximilianstrasse", "86150"],
  ["Freiburg", "Baden-Wuerttemberg", "Habsburgerstrasse", "79104"],
  ["Bonn", "NRW", "Poppelsdorfer Allee", "53115"],
  ["Wiesbaden", "Hesse", "Rheinstrasse", "65185"],
  ["Muenster", "NRW", "Warendorfer Strasse", "48145"],
  ["Karlsruhe", "Baden-Wuerttemberg", "Kaiserstrasse", "76133"],
  ["Regensburg", "Bavaria", "Donaustaufer Strasse", "93059"],
  ["Heidelberg", "Baden-Wuerttemberg", "Bergheimer Strasse", "69115"],
  ["Kiel", "Schleswig-Holstein", "Holtenauer Strasse", "24105"],
  ["Rostock", "Mecklenburg-Vorpommern", "Kroepeliner Strasse", "18055"],
  ["Potsdam", "Brandenburg", "Zeppelinstrasse", "14471"],
  ["Saarbruecken", "Saarland", "Mainzer Strasse", "66111"],
  ["Bielefeld", "NRW", "Obernstrasse", "33602"],
  ["Wuerzburg", "Bavaria", "Juliuspromenade", "97070"],
  ["Aachen", "NRW", "Pontstrasse", "52062"],
  ["Magdeburg", "Saxony-Anhalt", "Breiter Weg", "39104"],
  ["Trier", "Rhineland-Palatinate", "Simeonstrasse", "54290"],
];

const firstNames = ["Lea", "Johannes", "Mara", "Lukas", "Aylin", "Noah", "Clara", "Felix", "Sophie", "Jonas", "Miriam", "David", "Sarah", "Nina", "Tobias", "Laura", "Emil", "Amira", "Ben", "Lara", "Elias", "Hanna", "Oskar", "Mila"];
const lastNames = ["Schneider", "Adler", "Weber", "Keller", "Hoffmann", "Becker", "Fischer", "Wagner", "Meyer", "Neumann", "Schulz", "Koch", "Bauer", "Richter", "Wolf", "Hartmann", "Krause", "Lehmann", "Schmitt", "Werner"];
const companyRoots = ["Fitness Beteiligungs", "Urban Health Ventures", "Mobility Fit", "Prime Studio", "Wellness Capital", "Active Life", "Metro Training", "Core Shape", "Health Growth", "Studio Partners"];
const owners = ["Deal Manager", "Expansion Manager", "CRAYS Finance", "Reviewer", "Partner Operations", "Opening PMO"];
const statuses = ["qualified", "screening", "needs-review", "bank-readiness", "property-search", "offer-review", "blocked", "active"];
const priorities = ["critical", "high", "medium", "low"];

function addressFor(index) {
  const [city, state, street, zip] = pick(cities, index);
  const house = 3 + (index % 187);
  return {
    city,
    state,
    street,
    zip,
    address: `${street} ${house}, ${zip} ${city}`,
  };
}

function companyName(index) {
  return `${pick(lastNames, index)} ${pick(companyRoots, index)} GmbH`;
}

function personName(index) {
  return `${pick(firstNames, index)} ${pick(lastNames, index * 7)}`;
}

function emailFor(name, index) {
  return `${slug(name)}.${String(index).padStart(5, "0")}@example.crays.test`;
}

function crmEntityType(family) {
  if (family === "companies") return "organization";
  if (family === "people") return "account";
  if (family === "leads") return "candidate-intent";
  if (family === "emails" || family === "activities" || family === "notes" || family === "tasks") return "message";
  if (family === "calendar-events") return "conversation";
  return "deal";
}

function mapRecord({ family, index, label, status, owner, priority = "medium", fields, syncStatus = "synced", externalSystem = crmExternalSystem, seedBatch = crmSeedBatch, craysEntityType = crmEntityType(family), craysEntityId }) {
  const stable = String(index).padStart(5, "0");
  const externalId = `${family.replace(/-/g, "_")}_${stable}`;
  const entityId = craysEntityId ?? `crm_${family.replace(/-/g, "_")}_${stable}_${digest([family, index], 8)}`;
  const row = {
    id: externalId,
    label,
    status,
    owner,
    priority,
    modifiedAt: isoDate(-(index % 14), 8 + (index % 10), index % 60),
    fields: {
      ...fields,
      moduleKey: "crm",
      seedBatch,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      externalSendingEnabled: false,
    },
  };
  return {
    mapId: `map_${digest([externalSystem, family, externalId], 30)}`,
    craysEntityType,
    craysEntityId: entityId,
    externalSystem,
    externalEntityType: family,
    externalEntityId: externalId,
    syncStatus,
    metadata: {
      moduleKey: "crm",
      family,
      seedBatch,
      operationalRealismBatch: true,
      generatedAt,
      row,
      sourceDigest: digest(row, 32),
    },
  };
}

function buildCompanies() {
  return Array.from({ length: crmTargets.companies }, (_, i) => {
    const address = addressFor(i);
    const name = companyName(i);
    return mapRecord({
      family: "companies",
      index: i + 1,
      label: name,
      status: i % 11 === 0 ? "needs-review" : "active",
      owner: pick(owners, i),
      priority: pick(priorities, i),
      fields: {
        companyId: `company_${String(i + 1).padStart(5, "0")}`,
        companyType: pick(["candidate-holding", "property-owner", "supplier", "bank", "partner-operator", "landlord"], i),
        domain: `${slug(name)}.example.crays.test`,
        address: address.address,
        city: address.city,
        state: address.state,
        country: "DE",
        peopleCount: 1 + (i % 9),
        opportunityCount: i % 6,
        nextAction: i % 11 === 0 ? "Verify company ownership and address before release review." : "Keep relationship record current.",
      },
    });
  });
}

function buildPeople() {
  return Array.from({ length: crmTargets.people }, (_, i) => {
    const name = personName(i);
    const companyIndex = i % crmTargets.companies;
    const address = addressFor(i + 5);
    return mapRecord({
      family: "people",
      index: i + 1,
      label: name,
      status: i % 13 === 0 ? "needs-review" : "active",
      owner: pick(owners, i + 1),
      priority: pick(priorities, i + 2),
      fields: {
        personId: `person_${String(i + 1).padStart(5, "0")}`,
        companyId: `company_${String(companyIndex + 1).padStart(5, "0")}`,
        company: companyName(companyIndex),
        role: pick(["Franchise candidate", "Managing Director", "Property owner", "Bank relationship manager", "Expansion contact", "Studio operator"], i),
        email: emailFor(name, i + 1),
        phone: `+49 30 ${String(2000000 + i).padStart(7, "0")}`,
        address: address.address,
        city: address.city,
        nextContactAt: dueDate((i % 21) - 3),
        opportunityCount: i % 5,
        nextAction: i % 13 === 0 ? "Confirm contact consent and relationship scope." : "Schedule next relationship follow-up.",
      },
    });
  });
}

function buildLeads() {
  return Array.from({ length: crmTargets.leads }, (_, i) => {
    const name = personName(i + 400);
    const address = addressFor(i + 11);
    return mapRecord({
      family: "leads",
      index: i + 1,
      label: `${address.city} franchise lead - ${name}`,
      status: pick(statuses, i),
      owner: pick(["Deal Manager", "Expansion Manager", "Reviewer"], i),
      priority: pick(priorities, i + 5),
      syncStatus: i % 41 === 0 ? "conflict" : "synced",
      fields: {
        leadId: `lead_${String(i + 1).padStart(5, "0")}`,
        person: name,
        email: emailFor(name, i + 1),
        source: pick(["candidate-portal", "linkedin", "partner-referral", "broker-intro", "event", "web-form"], i),
        city: address.city,
        address: address.address,
        score: 40 + (i % 61),
        investmentCapacityEur: 120_000 + (i % 900) * 1_000,
        desiredOpeningMonth: pick(["2026-10", "2026-11", "2026-12", "2027-01", "2027-02"], i),
        blocker: i % 41 === 0 ? "Lead has incomplete consent or capital evidence." : "",
        nextAction: i % 41 === 0 ? "Resolve consent/capital evidence before opportunity conversion." : "Qualify lead and attach intake evidence.",
      },
    });
  });
}

function buildOpportunities() {
  return Array.from({ length: crmTargets.opportunities }, (_, i) => {
    const address = addressFor(i + 17);
    const companyIndex = i % crmTargets.companies;
    return mapRecord({
      family: "opportunities",
      index: i + 1,
      label: `${address.city} ${pick(["Franchise Studio", "Expansion Deal", "Partner Opening", "Owner Site"], i)} ${String(i + 1).padStart(4, "0")}`,
      status: pick(["candidate-intent", "property-shortlist", "bank-package-readiness", "offer-review", "partner-decision", "opening-handoff", "blocked"], i),
      owner: pick(["Deal Manager", "Expansion Manager", "CRAYS Finance", "Reviewer"], i),
      priority: pick(priorities, i + 3),
      syncStatus: i % 29 === 0 ? "conflict" : "synced",
      fields: {
        opportunityId: `opportunity_${String(i + 1).padStart(5, "0")}`,
        companyId: `company_${String(companyIndex + 1).padStart(5, "0")}`,
        company: companyName(companyIndex),
        city: address.city,
        address: address.address,
        pipelineStage: pick(["lead", "qualified", "proposal", "bank-review", "contracting", "opening"], i),
        amountEur: 350_000 + (i % 700) * 2_500,
        closeDate: dueDate(7 + (i % 120)),
        probability: 20 + (i % 71),
        blocker: i % 29 === 0 ? "Bank package or property evidence needs review." : "",
        nextAction: i % 29 === 0 ? "Stage guarded review and resolve evidence dependency." : "Advance opportunity through the next review gate.",
      },
    });
  });
}

function buildEmails() {
  const lanes = ["needs-reply", "waiting-on-us", "bank-review", "property-owner", "candidate-follow-up", "internal-review"];
  return Array.from({ length: crmTargets.emails }, (_, i) => {
    const person = personName(i + 900);
    const address = addressFor(i + 23);
    return mapRecord({
      family: "emails",
      index: i + 1,
      label: `${pick(["Bank package question", "Site visit confirmation", "Candidate evidence update", "Lease document request", "Follow-up on CRAYS package"], i)} - ${address.city}`,
      status: pick(lanes, i),
      owner: pick(["Deal Manager", "Expansion Manager", "CRAYS Finance", "Reviewer"], i),
      priority: pick(priorities, i + 1),
      fields: {
        emailId: `email_${String(i + 1).padStart(5, "0")}`,
        from: `${person} <${emailFor(person, i + 1)}>`,
        subject: `${pick(["Bank package question", "Site visit confirmation", "Candidate evidence update", "Lease document request", "Follow-up on CRAYS package"], i)} - ${address.city}`,
        receivedAt: isoDate(-(i % 10), 8 + (i % 9), i % 60),
        relatedRecord: `${address.city} opportunity ${String((i % crmTargets.opportunities) + 1).padStart(5, "0")}`,
        relatedFamily: pick(["opportunities", "companies", "people", "leads"], i),
        nextAction: "Draft scoped follow-up in CRAYS; external sending remains closed.",
        summary: "Operational email summary for CRM inbox triage.",
      },
    });
  });
}

function buildCalendarEvents() {
  return Array.from({ length: crmTargets["calendar-events"] }, (_, i) => {
    const address = addressFor(i + 31);
    return mapRecord({
      family: "calendar-events",
      index: i + 1,
      label: `${pick(["Candidate qualification call", "Bank readiness review", "Property site visit", "Opening handoff", "Partner decision review"], i)} - ${address.city}`,
      status: pick(["scheduled", "needs-brief", "waiting-confirmation", "completed"], i),
      owner: pick(["Deal Manager", "Expansion Manager", "CRAYS Finance", "Opening PMO"], i),
      priority: pick(priorities, i + 2),
      fields: {
        calendarEventId: `calendar_event_${String(i + 1).padStart(5, "0")}`,
        startAt: isoDate((i % 28) - 4, 8 + (i % 9), i % 2 ? 30 : 0),
        endAt: isoDate((i % 28) - 4, 9 + (i % 9), i % 2 ? 15 : 45),
        location: address.address,
        attendees: 2 + (i % 6),
        relatedRecord: `${address.city} opportunity ${String((i % crmTargets.opportunities) + 1).padStart(5, "0")}`,
        nextAction: "Prepare meeting brief in CRAYS; calendar write/apply remains closed.",
      },
    });
  });
}

function buildTasks() {
  return Array.from({ length: crmTargets.tasks }, (_, i) => {
    const address = addressFor(i + 43);
    return mapRecord({
      family: "tasks",
      index: i + 1,
      label: `${pick(["Call candidate", "Review bank evidence", "Request property plans", "Update opportunity stage", "Prepare partner summary"], i)} - ${address.city}`,
      status: pick(["open", "due-today", "blocked", "in-review", "done"], i),
      owner: pick(["Deal Manager", "Expansion Manager", "CRAYS Finance", "Reviewer"], i),
      priority: pick(priorities, i + 6),
      syncStatus: i % 37 === 0 ? "conflict" : "synced",
      fields: {
        taskId: `task_${String(i + 1).padStart(5, "0")}`,
        dueDate: dueDate((i % 25) - 5),
        relatedRecord: `${address.city} opportunity ${String((i % crmTargets.opportunities) + 1).padStart(5, "0")}`,
        blocker: i % 37 === 0 ? "Task target needs source identity review." : "",
        nextAction: i % 37 === 0 ? "Resolve task target mapping before apply." : "Complete the next safe CRM follow-up.",
      },
    });
  });
}

function buildActivities() {
  return Array.from({ length: crmTargets.activities }, (_, i) => {
    const address = addressFor(i + 61);
    return mapRecord({
      family: "activities",
      index: i + 1,
      label: `${pick(["Call logged", "Meeting note", "Pipeline stage changed", "Evidence reviewed", "Owner message received"], i)} - ${address.city}`,
      status: pick(["logged", "reviewed", "needs-review", "resolved"], i),
      owner: pick(owners, i),
      priority: pick(priorities, i + 8),
      fields: {
        activityId: `activity_${String(i + 1).padStart(5, "0")}`,
        activityType: pick(["call", "meeting", "email", "note", "stage-change"], i),
        activityAt: isoDate(-(i % 20), 7 + (i % 11), i % 60),
        relatedRecord: `${address.city} CRM record ${String((i % 5000) + 1).padStart(5, "0")}`,
        summary: "Bounded CRM activity summary from the source-map projection.",
      },
    });
  });
}

function buildNotes() {
  return Array.from({ length: crmTargets.notes }, (_, i) => {
    const address = addressFor(i + 79);
    return mapRecord({
      family: "notes",
      index: i + 1,
      label: `${pick(["Qualification note", "Property note", "Finance review note", "Partner summary note"], i)} - ${address.city}`,
      status: pick(["reviewed", "draft", "needs-review"], i),
      owner: pick(owners, i + 3),
      priority: pick(priorities, i + 4),
      fields: {
        noteId: `note_${String(i + 1).padStart(5, "0")}`,
        relatedRecord: `${address.city} opportunity ${String((i % crmTargets.opportunities) + 1).padStart(5, "0")}`,
        summary: "Scoped CRM note summary; body/private source payload is not exposed.",
        nextAction: "Review note context in CRAYS before any source update.",
      },
    });
  });
}

const projectContexts = cities.map(([city, state, street, zip], index) => {
  const district = pick(["Central", "West", "North", "East", "Harbor", "University", "Old Town", "South"], index);
  const partner = personName(index + 250);
  const company = companyName(index + 250);
  return {
    index,
    city,
    state,
    studioName: `${city} ${district} Studio`,
    siteName: `${street} ${11 + index} Studio Lease`,
    address: `${street} ${11 + index}, ${zip} ${city}`,
    partnerName: partner,
    partnerCompany: company,
    projectId: `opening_project_${slug(city)}_${slug(district)}_2026`,
    decisionId: `partner_decision_${slug(city)}_${slug(partner)}_${index + 1}`,
    dealId: `deal_case_${slug(city)}_${slug(company)}_${index + 1}`,
    propertyCaseId: `property_case_${slug(city)}_${slug(street)}_${index + 1}`,
    studioId: `studio_${slug(city)}_${slug(district)}_opening`,
    targetOpeningDate: dueDate(45 + index * 3),
  };
});

function projectMapRecord(context, family, localIndex, label, options) {
  const externalId = `${context.projectId}_${family.replace(/-/g, "_")}_${String(localIndex).padStart(2, "0")}`;
  const row = {
    id: externalId,
    label,
    status: options.status,
    owner: options.owner,
    priority: options.priority ?? "medium",
    dueDate: options.dueDate,
    modifiedAt: isoDate(-(context.index % 8), 9 + (localIndex % 8), localIndex * 5),
    fields: {
      moduleKey: "project",
      seedBatch: projectSeedBatch,
      projectId: context.projectId,
      decisionId: context.decisionId,
      dealId: context.dealId,
      propertyCaseId: context.propertyCaseId,
      studioId: context.studioId,
      studioName: context.studioName,
      siteName: context.siteName,
      address: context.address,
      partnerName: context.partnerName,
      partnerCompany: context.partnerCompany,
      targetOpeningDate: context.targetOpeningDate,
      currentState: options.currentState ?? "Review required.",
      nextAction: options.nextAction ?? "Review next safe action.",
      context: options.context ?? `${context.studioName} opening work item.`,
      milestoneId: options.milestoneId ?? null,
      predecessorId: options.predecessorId ?? null,
      successorId: options.successorId ?? null,
      linkedObjectId: options.linkedObjectId ?? null,
      identifier: options.identifier ?? externalId,
      audience: options.audience ?? "Internal",
      value: options.value ?? null,
      unit: options.unit ?? null,
      sourceWritesEnabled: false,
      syncApplyEnabled: false,
      targetApplyEnabled: false,
      planeNativeWritesEnabled: false,
    },
  };
  const mappedProjectEntityId = `project_source_${family.replace(/-/g, "_")}_${digest(externalId, 18)}`;
  return {
    mapId: `map_${digest([projectExternalSystem, family, externalId], 30)}`,
    craysEntityType: family === "evidence-link" ? "evidence-package" : "property-case",
    craysEntityId: family === "evidence-link" ? `evidence_${digest(externalId, 18)}` : mappedProjectEntityId,
    externalSystem: projectExternalSystem,
    externalEntityType: family,
    externalEntityId: externalId,
    syncStatus: options.syncStatus ?? "synced",
    metadata: {
      moduleKey: "project",
      family,
      seedBatch: projectSeedBatch,
      operationalRealismBatch: crmSeedBatch,
      generatedAt,
      row,
      sourceDigest: digest(row, 32),
    },
  };
}

function buildProjectRecords() {
  const records = [];
  for (const context of projectContexts) {
    records.push(
      projectMapRecord(context, "project-summary", 1, `${context.studioName} opening readiness`, {
        status: context.index % 5 === 0 ? "blocked" : "attention",
        owner: "Opening PMO",
        priority: context.index % 5 === 0 ? "critical" : "high",
        dueDate: context.targetOpeningDate,
        currentState: "Opening project is active and source-mapped.",
        nextAction: "Review critical path and owner dependencies.",
        context: `${context.studioName} is one of 30 active opening projects in the operational fixture.`,
        value: 62 + (context.index % 26),
        unit: "score",
      }),
      projectMapRecord(context, "project-summary", 2, `${context.studioName} critical path metric`, {
        status: "attention",
        owner: "Opening PMO",
        priority: "high",
        dueDate: context.targetOpeningDate,
        currentState: "Critical path metric is tracked from project source-map data.",
        nextAction: "Focus blocked work items before staging Project command drafts.",
        context: "Metric row used by the Project portfolio read model.",
        value: 4 + (context.index % 5),
        unit: "score",
        milestoneId: "critical-path",
      }),
    );

    const milestones = ["permit", "lease-handover", "fit-out", "equipment", "staffing", "training"];
    milestones.forEach((milestone, milestoneIndex) => {
      records.push(
        projectMapRecord(context, "milestone", milestoneIndex + 1, `${context.studioName} ${milestone.replace("-", " ")} milestone`, {
          status: milestoneIndex === context.index % milestones.length ? "blocked" : milestoneIndex % 2 ? "attention" : "ready",
          owner: pick(["Expansion Manager", "Fit-out Lead", "Studio Manager", "Learning Lead"], milestoneIndex + context.index),
          priority: milestoneIndex === context.index % milestones.length ? "critical" : "medium",
          dueDate: dueDate(10 + context.index + milestoneIndex * 7),
          milestoneId: milestone,
          currentState: `${milestone.replace("-", " ")} milestone is source-mapped for this opening project.`,
          nextAction: "Review owner, evidence and dependency before any project-system apply.",
          audience: milestoneIndex > 3 ? "Studio Manager" : "Internal",
        }),
      );
    });

    const workItems = [
      ["Confirm municipal permit evidence", "permit", "Expansion Manager"],
      ["Approve electrical fit-out drawing", "fit-out", "Fit-out Lead"],
      ["Confirm equipment delivery slot", "equipment", "Operations"],
      ["Assign studio manager onboarding", "staffing", "Studio Manager"],
      ["Schedule launch training week", "training", "Learning Lead"],
      ["Prepare bank condition update", "permit", "CRAYS Finance"],
      ["Confirm handover access protocol", "lease-handover", "Expansion Manager"],
      ["Review signage approval", "fit-out", "Expansion Manager"],
      ["Close supplier dependency", "equipment", "Operations"],
      ["Prepare opening readiness review", "training", "Deal Manager"],
    ];
    workItems.forEach(([title, milestone, owner], itemIndex) => {
      const blocked = itemIndex === context.index % workItems.length || (context.index + itemIndex) % 11 === 0;
      records.push(
        projectMapRecord(context, "work-item", itemIndex + 1, title, {
          status: blocked ? "blocked" : itemIndex % 3 === 0 ? "attention" : "ready",
          owner,
          priority: blocked ? "critical" : pick(["high", "medium", "low"], itemIndex),
          dueDate: dueDate(4 + context.index + itemIndex * 2),
          milestoneId: milestone,
          identifier: `${context.projectId}_WI_${String(itemIndex + 1).padStart(3, "0")}`,
          currentState: blocked ? "Blocked by evidence or dependency." : "Owned work item is ready for review.",
          nextAction: blocked ? "Review the task, dependency and evidence before staging the Project command draft." : "Confirm owner progress and next safe action.",
          context: blocked ? `${title} blocks ${context.studioName} opening path.` : `${title} is tracked for ${context.studioName}.`,
          audience: ["Studio Manager", "Learning Lead", "Operations"].includes(owner) ? "Studio Manager" : "Internal",
          syncStatus: blocked ? "conflict" : "synced",
        }),
      );
    });

    records.push(
      projectMapRecord(context, "dependency", 1, `${context.studioName} permit-to-fit-out dependency`, {
        status: context.index % 4 === 0 ? "blocked" : "attention",
        owner: "Expansion Manager",
        priority: context.index % 4 === 0 ? "critical" : "high",
        dueDate: dueDate(8 + context.index),
        milestoneId: "critical-path",
        predecessorId: `${context.projectId}_WI_001`,
        successorId: `${context.projectId}_WI_002`,
        currentState: "Dependency is source-mapped from opening project data.",
        nextAction: "Resolve predecessor evidence before fit-out command staging.",
      }),
      projectMapRecord(context, "evidence-link", 1, `${context.studioName} opening evidence package`, {
        status: context.index % 6 === 0 ? "blocked" : "attention",
        owner: "Reviewer",
        priority: context.index % 6 === 0 ? "critical" : "medium",
        dueDate: dueDate(9 + context.index),
        linkedObjectId: `evidence_package_${context.projectId}`,
        currentState: "Evidence metadata is linked; file upload/private preview remains closed.",
        nextAction: "Review evidence metadata and request missing documents through safe workflow.",
        audience: "Reviewer",
      }),
      projectMapRecord(context, "opening-review-actions", 1, `${context.studioName} project review draft`, {
        status: "attention",
        owner: "Deal Manager",
        priority: "high",
        dueDate: dueDate(5 + context.index),
        currentState: "Project review can be staged as CRAYS Core command draft only.",
        nextAction: "Stage guarded Project review after verifying selected work item.",
        audience: "Internal",
      }),
    );
  }
  return records;
}

function buildCrmRecords() {
  return [
    ...buildCompanies(),
    ...buildPeople(),
    ...buildLeads(),
    ...buildOpportunities(),
    ...buildEmails(),
    ...buildCalendarEvents(),
    ...buildTasks(),
    ...buildActivities(),
    ...buildNotes(),
  ];
}

async function upsertConnection(client, { connectionId, moduleKey, systemKey, connectionName, ownerRole, rowsSeen, families }) {
  await client.query(
    `
      insert into crays_core.integration_connections (
        connection_id, module_key, system_key, connection_name, owner_role, status,
        connection_mode, secret_reference_status, connection_health, metadata, updated_at
      )
      values ($1, $2, $3, $4, $5, 'active', 'sync_read_model', 'configured_reference', 'healthy', $6::jsonb, now())
      on conflict (connection_id) do update set
        status = excluded.status,
        connection_mode = excluded.connection_mode,
        secret_reference_status = excluded.secret_reference_status,
        connection_health = excluded.connection_health,
        metadata = excluded.metadata,
        updated_at = now()
    `,
    [
      connectionId,
      moduleKey,
      systemKey,
      connectionName,
      ownerRole,
      JSON.stringify({
        seedBatch: moduleKey === "crm" ? crmSeedBatch : projectSeedBatch,
        operationalRealismBatch: crmSeedBatch,
        generatedAt,
        rowsSeen,
        families,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      }),
    ],
  );

  await client.query(
    `
      insert into crays_core.sync_jobs (
        job_id, connection_id, job_type, direction, status, attempt_count,
        payload_summary, scheduled_at, started_at, finished_at, updated_at
      )
      values ($1, $2, 'read_sync', 'read', 'succeeded', 1, $3::jsonb, now(), now(), now(), now())
      on conflict (job_id) do update set
        status = excluded.status,
        attempt_count = crays_core.sync_jobs.attempt_count + 1,
        payload_summary = excluded.payload_summary,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        updated_at = now()
    `,
    [
      `sync_job_${digest([connectionId, crmSeedBatch], 28)}`,
      connectionId,
      JSON.stringify({
        moduleKey,
        rowsSeen,
        families,
        generatedAt,
        sourceWritesEnabled: false,
        syncApplyEnabled: false,
        targetApplyEnabled: false,
      }),
    ],
  );
}

async function upsertMaps(client, records, chunkSize = 400) {
  let written = 0;
  for (let start = 0; start < records.length; start += chunkSize) {
    const chunk = records.slice(start, start + chunkSize);
    const values = [];
    const placeholders = chunk.map((record, index) => {
      const base = index * 8;
      values.push(
        record.mapId,
        record.craysEntityType,
        record.craysEntityId,
        record.externalSystem,
        record.externalEntityType,
        record.externalEntityId,
        record.syncStatus,
        JSON.stringify(record.metadata),
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, 'read', $${base + 7}, now(), $${base + 8}::jsonb, now())`;
    });
    const result = await client.query(
      `
        insert into crays_core.external_record_maps (
          map_id, crays_entity_type, crays_entity_id, external_system, external_entity_type,
          external_entity_id, sync_direction, sync_status, last_synced_at, metadata, updated_at
        )
        values ${placeholders.join(",")}
        on conflict (external_system, external_entity_type, external_entity_id) do update set
          crays_entity_type = excluded.crays_entity_type,
          crays_entity_id = excluded.crays_entity_id,
          sync_direction = excluded.sync_direction,
          sync_status = excluded.sync_status,
          last_synced_at = excluded.last_synced_at,
          metadata = excluded.metadata,
          updated_at = now()
      `,
      values,
    );
    written += result.rowCount ?? 0;
  }
  return written;
}

function summarize(records) {
  const grouped = new Map();
  for (const record of records) {
    const key = `${record.externalSystem}:${record.externalEntityType}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  return [...grouped.entries()].map(([key, rows]) => ({ key, rows })).sort((a, b) => a.key.localeCompare(b.key));
}

async function applySeed(crmRecords, projectRecords) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('crays.app_role', 'core_service', true)");
    await upsertConnection(client, {
      connectionId: "core_source_crm_operational_realism",
      moduleKey: "crm",
      systemKey: crmExternalSystem,
      connectionName: "CRM operational realism source-map fixture",
      ownerRole: "admin",
      rowsSeen: crmRecords.length,
      families: Object.keys(crmTargets),
    });
    await upsertConnection(client, {
      connectionId: "core_source_project_operational_realism",
      moduleKey: "project",
      systemKey: projectExternalSystem,
      connectionName: "Project opening portfolio operational realism fixture",
      ownerRole: "admin",
      rowsSeen: projectRecords.length,
      families: ["project-summary", "milestone", "work-item", "dependency", "evidence-link", "opening-review-actions"],
    });
    const crmWritten = await upsertMaps(client, crmRecords);
    const projectWritten = await upsertMaps(client, projectRecords);
    await client.query("commit");
    return { crmWritten, projectWritten };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

const crmRecords = buildCrmRecords();
const projectRecords = buildProjectRecords();
const summary = {
  status: apply ? "apply_requested" : "dry_run",
  target: getRedactedDatabaseTarget(connectionString),
  crmSeedBatch,
  projectSeedBatch,
  crmRecords: crmRecords.length,
  projectRecords: projectRecords.length,
  activeOpeningProjects: projectContexts.length,
  crmTargets,
  gates: {
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    targetApplyEnabled: false,
    externalSendingEnabled: false,
    destructiveResetEnabled: false,
  },
  families: summarize([...crmRecords, ...projectRecords]),
};

try {
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    const result = await applySeed(crmRecords, projectRecords);
    console.log(JSON.stringify({ ...summary, status: "applied", ...result }, null, 2));
  }
} finally {
  await pool.end();
}
