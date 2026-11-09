import {localPreviewId} from "./localPreviewId.ts";
import { prepareManagedAppAction } from "./appActionRequests.ts";
import type { ProductWorld, Entity } from "./productModel.ts";
export type AppScope = { id: string; label: string; detail: string };
export type AppProvider = {
  id: string;
  name: string;
  category: string;
  summary: string;
  sourceIds: string[];
  scopes: AppScope[];
  accountRequired: boolean;
  platformRequirement?: string;
};
const scope = (id: string, label: string, detail: string): AppScope => ({
  id,
  label,
  detail,
});
const mail = [
  scope(
    "read",
    "Read chosen messages",
    "Only the mailbox and messages you permit.",
  ),
  scope("draft", "Prepare drafts", "Keep drafts for your review."),
  scope(
    "send",
    "Send approved messages",
    "Review the exact recipient and message before sending.",
  ),
  scope(
    "automatic-replies",
    "Limited automatic replies",
    "Requires its own audience, purpose, duration and stop controls.",
  ),
];
const calendar = [
  scope(
    "read",
    "Read selected calendars",
    "Use selected calendars to plan around your time.",
  ),
  scope(
    "create",
    "Create approved events",
    "Review guests, time, timezone and reminders.",
  ),
  scope(
    "change",
    "Change approved events",
    "Only the specific event and changes you approve.",
  ),
  scope(
    "cancel",
    "Cancel approved events",
    "Review cancellation and invitations separately.",
  ),
  scope(
    "invite",
    "Send approved calendar invitations",
    "Separate approval for the exact recipients and appointment. Reading or creating an event does not grant this permission.",
  ),
];
const travel = [
  scope(
    "search",
    "Find and compare options",
    "Search availability without making a reservation.",
  ),
  scope(
    "read",
    "Read your trips",
    "Only your authorised reservations and receipts.",
  ),
  scope(
    "book",
    "Prepare and confirm a booking",
    "Exact provider, guests, quote, payment and final approval remain separate.",
  ),
  scope(
    "change",
    "Request booking changes",
    "Review updated terms, dates and any costs.",
  ),
  scope(
    "cancel",
    "Request cancellations",
    "Review the cancellation terms and refund status.",
  ),
];
const social = [
  scope(
    "read",
    "Read selected conversations",
    "Only conversations allowed by this account and its service.",
  ),
  scope(
    "draft",
    "Prepare messages",
    "Drafts stay private until you approve them.",
  ),
  scope(
    "send",
    "Send approved messages",
    "The intended account, recipient and exact wording stay visible.",
  ),
  scope(
    "publish",
    "Publish approved originals",
    "Review the format, audience and original before publishing.",
  ),
  scope(
    "automatic-replies",
    "Limited automatic replies",
    "An explicit audience, duration and revocation are required.",
  ),
];
const files = [
  scope("read", "Read selected files", "Only the files or folders you choose."),
  scope("create", "Create files", "New files stay in the selected location."),
  scope(
    "change",
    "Edit selected files",
    "Keep versions and ask before overwriting or deleting.",
  ),
];
const everyday = [
  scope(
    "read",
    "Read selected information",
    "Only your chosen records or devices.",
  ),
  scope(
    "change",
    "Make approved changes",
    "Keep the exact action and result connected to your request.",
  ),
];
const p = (
  id: string,
  name: string,
  category: string,
  summary: string,
  sourceIds: string[],
  scopes: AppScope[],
  platformRequirement?: string,
): AppProvider => ({
  id,
  name,
  category,
  summary,
  sourceIds,
  scopes,
  accountRequired: true,
  platformRequirement,
});
export const appProviders: AppProvider[] = [
  p(
    "research-preview",
    "Fictional public research preview",
    "Research",
    "A local source-account scenario only. No real search provider, credential or web retrieval is connected.",
    ["B2C-CAP-011"],
    [
      scope("public-search", "Simulate approved public research", "Only the exact reviewed question and selected public excerpt scenario. No live search."),
      scope("chosen-page-read", "Read chosen preview page excerpts", "Only selected public excerpts in the fictional scenario; no private pages or other account data."),
    ],
    "Explicitly fictional local preview; actual web_search/web_fetch provider access remains unproven.",
  ),
  p(
    "gmail",
    "Gmail",
    "Mail & calendar",
    "Your messages, drafts and approved replies.",
    ["ECOSYSTEM-004", "ECOSYSTEM-067", "ECOSYSTEM-068"],
    mail,
  ),
  p(
    "microsoft",
    "Microsoft 365",
    "Mail & calendar",
    "Outlook, calendars and your chosen files.",
    ["ECOSYSTEM-006", "ECOSYSTEM-069"],
    [
      ...mail,
      ...calendar
        .filter((s) => s.id !== "read")
        .map((s) => ({
          ...s,
          id: "calendar-" + s.id,
          label: s.label.replace("events", "calendar events"),
        })),
      scope(
        "calendar-read",
        "Read selected calendars",
        "Your chosen Outlook calendars only.",
      ),
      scope(
        "files-read",
        "Read selected OneDrive files",
        "Files you explicitly choose, independent of email access.",
      ),
    ],
  ),
  p(
    "google-calendar",
    "Google Calendar",
    "Mail & calendar",
    "Plan with your chosen calendars.",
    ["ECOSYSTEM-004", "ECOSYSTEM-067", "ECOSYSTEM-068"],
    calendar,
  ),
  p(
    "caldav",
    "CalDAV calendar",
    "Mail & calendar",
    "Connect another supported calendar.",
    ["ECOSYSTEM-005"],
    calendar,
  ),
  p(
    "icloud-calendar",
    "iCloud Calendar",
    "Mail & calendar",
    "Your selected calendars and event permissions.",
    ["ECOSYSTEM-070"],
    calendar,
  ),
  p(
    "icloud-contacts",
    "iCloud Contacts",
    "Mail & calendar",
    "Choose which of your address-book details Chuck may use.",
    ["ECOSYSTEM-071"],
    [
      scope(
        "read",
        "Read selected contacts",
        "Does not turn an address-book entry into a CRAYS VIF.",
      ),
      scope(
        "change",
        "Update approved contact details",
        "Review the exact person and fields first.",
      ),
    ],
  ),
  p(
    "other-mail",
    "Another email account",
    "Mail & calendar",
    "Your own supported email account.",
    ["ECOSYSTEM-007"],
    mail,
  ),
  p(
    "expedia",
    "Expedia",
    "Travel",
    "Trip search, stays, flights and permitted reservation actions.",
    ["ECOSYSTEM-052"],
    travel,
    "Availability and actions depend on the platform’s authorised Expedia connection. Your approval alone does not enable a missing provider action.",
  ),
  p(
    "booking",
    "Booking.com",
    "Travel",
    "Your stay, from search to approved changes and cancellation.",
    ["ECOSYSTEM-092", "ECOSYSTEM-BOOKING-OFFICIAL"],
    travel,
    "Bookings require an authorised Booking.com partner connection and supported operations. Public search access is separate.",
  ),
  p(
    "kiwi",
    "Kiwi.com",
    "Travel",
    "Find flights and review your trip options.",
    ["ECOSYSTEM-054"],
    travel,
  ),
  p(
    "waltz",
    "Waltz Flight Assistant",
    "Travel",
    "Flight planning and authorised check-in assistance.",
    ["ECOSYSTEM-055"],
    [
      ...travel,
      scope(
        "check-in",
        "Review check-in & seat selection",
        "Review passenger, flight, seat and any fee before confirming.",
      ),
    ],
  ),
  p(
    "letsfg",
    "LetsFG",
    "Travel",
    "Your selected travel service connection.",
    ["ECOSYSTEM-056"],
    travel,
  ),
  p(
    "restaurant",
    "Restaurant reservations",
    "Travel",
    "Search and manage an approved restaurant reservation.",
    ["ECOSYSTEM-053", "B2C-CAP-105"],
    travel,
    "Choose a supported restaurant/provider, such as an authorised OpenTable, TheFork or SevenRooms integration. Personal approval does not grant partner access.",
  ),
  p(
    "linkedin",
    "LinkedIn",
    "Social",
    "Your network, inbox and approved publications.",
    ["ECOSYSTEM-044", "OWNER-COMM-LINKEDIN-OWN-CHANNEL"],
    social,
  ),
  p(
    "whatsapp",
    "WhatsApp",
    "Social",
    "Your own selected account and allowed conversations.",
    [
      "ECOSYSTEM-045",
      "OWNER-COMM-WHATSAPP-THIRD-PARTY",
      "OWNER-COMM-PERSONAL-SPANISH-WHATSAPP-REPLIES",
    ],
    social.filter((s) => s.id !== "publish"),
    "Personal and Business accounts are separate. A connected Business gateway does not authorise your personal inbox.",
  ),
  p(
    "whatsapp-business",
    "WhatsApp Business",
    "Social",
    "Your own approved Business account and its channel scope.",
    ["ECOSYSTEM-045", "OWNER-COMM-WHATSAPP-THIRD-PARTY"],
    social.filter((s) => s.id !== "publish"),
    "Separate from personal WhatsApp. Existing Business language, sender and automation rules cannot be silently replaced.",
  ),
  p(
    "signal",
    "Signal",
    "Social",
    "The Signal account and conversations you explicitly allow.",
    ["OWNER-CHAT-SIGNAL-INTEGRATION"],
    social.filter((s) => s.id !== "publish"),
    "Use only the authorised Signal connection supported by the separate integration. No access to private conversations is inferred from a phone number.",
  ),
  p(
    "nextcloud",
    "Nextcloud",
    "Files & notes",
    "Your files, calendars and chosen workspace.",
    ["CHUCK-167", "OWNER-CHAT-NEXTCLOUD-INTEGRATION"],
    [
      ...files,
      scope(
        "calendar-read",
        "Read selected calendars",
        "Use only chosen Nextcloud calendars.",
      ),
      scope(
        "calendar-change",
        "Change approved calendar events",
        "Review the exact event and invitations first.",
      ),
      scope("calendar-create", "Create approved calendar events", "Prepare the exact selected Nextcloud calendar event; recipients need their own invitation approval."),
      scope("calendar-cancel", "Cancel approved calendar events", "Review the same original event and cancellation; this does not silently notify guests."),
      scope("calendar-invite", "Send approved calendar invitations", "Choose the exact recipients, event and invitation message separately."),
      scope(
        "contacts-read",
        "Read selected contacts",
        "Your chosen address-book fields, not automatic VIF connections.",
      ),
    ],
  ),
  p(
    "telegram",
    "Telegram",
    "Social",
    "Your own Telegram access and approved messages.",
    ["ECOSYSTEM-046", "OWNER-COMM-TELEGRAM-END-TO-END"],
    social.filter((s) => s.id !== "publish"),
    "A bot connection does not reveal all of your personal Telegram conversations.",
  ),
  p(
    "instagram",
    "Instagram",
    "Social",
    "Your selected account, conversations and content.",
    ["ECOSYSTEM-089", "OWNER-COMM-INSTAGRAM-OWN-CHANNEL"],
    [...social,
      scope("own-posts-read", "Read my own new posts", "Only the selected account’s own posts. Planned local permission; production Meta scopes are qualified separately."),
      scope("import-posts-as-drafts", "Import own posts as private drafts", "Prepare a private CRAYS draft under a separately reviewed import rule. Does not publish, sign or import conversations."),
    ],
    "Account type, available API actions and formats are checked separately. A login is not universal DM access.",
  ),
  p(
    "x",
    "X / Twitter",
    "Social",
    "Approved posts and actions on your own account.",
    ["ECOSYSTEM-090"],
    social,
  ),
  p(
    "publishing",
    "Your publishing service",
    "Social",
    "Your supported Upload-Post or Postify connection.",
    ["ECOSYSTEM-047", "ECOSYSTEM-091"],
    [
      scope(
        "read",
        "Read your own publishing status",
        "Only your own connected accounts.",
      ),
      scope(
        "publish",
        "Publish approved originals",
        "Select the account, exact original, format and audience.",
      ),
    ],
  ),
  p(
    "todoist",
    "Todoist",
    "Everyday",
    "Tasks, reminders and lists you choose to share.",
    ["ECOSYSTEM-008", "ECOSYSTEM-009", "ECOSYSTEM-072"],
    everyday,
  ),
  p(
    "notion",
    "Notion",
    "Files & notes",
    "Your selected pages and documents.",
    ["ECOSYSTEM-011"],
    files,
  ),
  p(
    "obsidian",
    "Obsidian",
    "Files & notes",
    "Your chosen notes and vault.",
    ["ECOSYSTEM-010"],
    files,
  ),
  p(
    "apple-notes",
    "Apple Notes",
    "Files & notes",
    "The notes you choose to use with Chuck.",
    ["ECOSYSTEM-050"],
    files,
  ),
  p(
    "apple-reminders",
    "Apple Reminders",
    "Everyday",
    "Selected lists and reminders.",
    ["ECOSYSTEM-051"],
    everyday,
  ),
  p(
    "paperless",
    "Paperless-ngx",
    "Files & notes",
    "Your personal documents and archive.",
    ["ECOSYSTEM-073", "B2C-CAP-107"],
    files,
  ),
  p(
    "parcel",
    "Parcel & delivery tracking",
    "Everyday",
    "Only the deliveries you are entitled to follow.",
    ["ECOSYSTEM-074", "B2C-CAP-101"],
    [
      scope(
        "read",
        "Read authorised tracking updates",
        "No access to unrelated deliveries or recipient details.",
      ),
    ],
  ),
  p(
    "home-assistant",
    "Home Assistant",
    "Everyday",
    "Chosen devices in your own home.",
    ["ECOSYSTEM-043", "ECOSYSTEM-075", "B2C-CAP-106"],
    everyday,
  ),
  p(
    "hue",
    "Philips Hue",
    "Everyday",
    "Your own bridge and selected lights.",
    ["ECOSYSTEM-042"],
    everyday,
  ),
  p(
    "sonos",
    "Sonos",
    "Media & wellbeing",
    "Your own speakers and playback.",
    ["ECOSYSTEM-041"],
    everyday,
  ),
  p(
    "spotify",
    "Spotify",
    "Media & wellbeing",
    "Your music, playlists and chosen playback actions.",
    ["ECOSYSTEM-040", "ECOSYSTEM-076"],
    everyday,
  ),
  p(
    "youtube",
    "YouTube",
    "Media & wellbeing",
    "Chosen videos and permitted account information.",
    ["ECOSYSTEM-028", "ECOSYSTEM-077", "ECOSYSTEM-078"],
    [
      scope(
        "read",
        "Read selected videos & transcripts",
        "Availability and private content access remain separate.",
      ),
    ],
  ),
  p(
    "strava",
    "Strava",
    "Media & wellbeing",
    "Only the activity data you choose to share.",
    ["ECOSYSTEM-084"],
    everyday,
  ),
  p(
    "sportsos",
    "SportsOS",
    "Media & wellbeing",
    "Your authorised training and activity records.",
    ["ECOSYSTEM-085"],
    everyday,
  ),
  p(
    "groceryos",
    "GroceryOS",
    "Everyday",
    "Your lists, pantry and approved shopping actions.",
    ["ECOSYSTEM-086"],
    [
      ...everyday,
      scope(
        "order",
        "Place approved orders",
        "A reviewed basket, supplier, exact quote and separate payment approval are required.",
      ),
    ],
  ),
  p(
    "brie",
    "Brie",
    "Everyday",
    "Meal plans, recipes and shared shopping lists.",
    ["ECOSYSTEM-087"],
    everyday,
  ),
  p(
    "splitwise",
    "Splitwise",
    "Everyday",
    "Your shared expenses and permitted balances.",
    ["B2C-CAP-103"],
    everyday,
  ),
  p(
    "codex",
    "Your code workspace",
    "Files & notes",
    "An isolated workspace you explicitly authorise.",
    ["ECOSYSTEM-061", "ECOSYSTEM-083", "OWNER-MODEL-CODEX-CODEX-EXECUTION"],
    [
      scope(
        "read",
        "Read selected workspace files",
        "Only the specific workspace you choose.",
      ),
      scope(
        "change",
        "Edit approved files",
        "Keep versions and review the change.",
      ),
      scope(
        "run",
        "Run approved programs",
        "Use an isolated environment, limits and stop controls.",
      ),
    ],
  ),
];
export const appById = (id: string) => appProviders.find((p) => p.id === id);
export function ownAppAccount(w:ProductWorld){return w.identity.signedIn===true&&typeof w.owner==='string'&&!!w.owner.trim()&&w.owner===w.owner.trim();}
export function connectionFor(w: ProductWorld, providerId: string) {
 const provider=appById(providerId);if(!ownAppAccount(w)||!provider)return;
 const rows=w.objects.filter(o=>o.owner===w.owner&&o.kind==='app-connection'&&o.providerId===providerId);
 if(rows.length!==1)return;const c=rows[0];
 if(w.objects.filter(o=>o.id===c.id).length!==1||typeof c.account!=='string'||!c.account.trim()||!Number.isInteger(c.version)||Number(c.version)<1||!['connected-demo','disconnected'].includes(String(c.status))||!Array.isArray(c.scopes)||new Set(c.scopes).size!==c.scopes.length||c.scopes.some(s=>typeof s!=='string'||!provider.scopes.some(v=>v.id===s))||c.status==='connected-demo'&&!c.scopes.length)return;
 return c;
}
export function mayUseApp(
  w: ProductWorld,
  providerId: string,
  scopeId: string,
) {
  const c = connectionFor(w, providerId);
  return !!(
    ownAppAccount(w) && appById(providerId)?.scopes.some(s=>s.id===scopeId) &&
    c?.status === "connected-demo" &&
    Array.isArray(c.scopes) &&
    c.scopes.includes(scopeId)
  );
}
export function applyAppConnection(
  w: ProductWorld,
  op: string,
  data: Record<string, string>,
  objectId?: string,
): { objectId: string; message: string } | undefined {
  if (!op.startsWith("complete.app.")) return;
  const provider = appById(data.providerId);
  if (!provider) throw new Error("Choose a supported app from your settings.");
  if (!ownAppAccount(w))
    throw new Error("Sign in before changing your app permissions.");
  let c = connectionFor(w, provider.id);
  const originals=w.objects.filter(o=>o.owner===w.owner&&o.kind==='app-connection'&&o.providerId===provider.id);
  if(originals.length&&!c)throw Error('This original app connection needs review. Its account and permissions have not been replaced.');
  if(op==='complete.app.save'||op==='complete.app.disconnect'){
    if(data.expectedVersion!==String(c?.version||0)||(c?objectId!==c.id:!!objectId))throw Error('The original connection changed. Review its current account and permissions again.');
  }
  if (op === "complete.app.save") {
    if (data.approved !== "Yes")
      throw new Error(
        "Review the account and each selected permission before connecting.",
      );
    const scopes: unknown = JSON.parse(data.scopes || "[]");
    if (
      !Array.isArray(scopes) ||
      !scopes.length || new Set(scopes).size!==scopes.length ||
      scopes.some(
        (s) =>
          typeof s !== "string" || !provider.scopes.some((x) => x.id === s),
      )
    )
      throw new Error("Choose specific supported permissions for this app.");
    if (!data.account?.trim())
      throw new Error("Name the account you are connecting.");
    if (!c) {
      c = {
        id: localPreviewId(),
        owner: w.owner,
        kind: "app-connection",
        providerId: provider.id,
        name: provider.name,
      };
      w.objects.unshift(c);
    }
    Object.assign(c, {
      account: data.account.trim(),
      scopes: [...new Set(scopes)],
      status: "connected-demo",
      version: Number(c.version || 0) + 1,
      approvedAt: Date.now(),
      realConnection: false,
      sourceIds: provider.sourceIds,
    });
    for (const o of w.objects) {
      if (
        o.owner === w.owner &&
        o.connectionId === c.id &&
        ["prepared", "pending", "queued", "pending-approval", "running"].includes(
          String(o.status),
        ) &&
        (Array.isArray(o.requiredScopes)
          ? o.requiredScopes.some((scope) => !scopes.includes(String(scope)))
          : !scopes.includes(String(o.scope)))
      )
        o.status = "paused-permission-revoked";
    }
    return {
      objectId: c.id,
      message:
        "Your preview account and exact permissions are saved. No real sign-in or provider access was performed.",
    };
  }
  if (op === "complete.app.disconnect") {
    if (!c || c.id !== objectId)
      throw new Error("Choose your own current app connection.");
    if (data.approved !== "Yes")
      throw new Error("Confirm disconnecting this account.");
    c.status = "disconnected";
    c.scopes = [];
    c.version = Number(c.version || 0) + 1;
    c.revokedAt = Date.now();
    for (const o of w.objects)
      if (
        o.owner === w.owner &&
        o.connectionId === c.id &&
        ["prepared", "pending", "queued", "pending-approval", "running"].includes(
          String(o.status),
        )
      )
        o.status = "paused-connection-revoked";
    return {
      objectId: c.id,
      message:
        "This connection and its permissions are revoked in the preview. Dependent unfinished work is paused; past external actions and receipts are retained.",
    };
  }
  if (op === "complete.app.prepare") {
    if (!c || !mayUseApp(w, provider.id, data.scope))
      throw new Error(
        "This account is disconnected or the required permission was revoked.",
      );
    if (data.actionId) return prepareManagedAppAction(w, provider, c, data, objectId);
    if (!data.request?.trim())
      throw new Error("Describe this specific action.");
    const duplicate = w.objects.find(
      (o) =>
        o.owner === w.owner &&
        o.kind === "app-action" &&
        o.connectionId === c!.id &&
        o.request === data.request.trim() &&
        ["prepared", "pending", "unknown"].includes(String(o.status)),
    );
    if (duplicate)
      return {
        objectId: duplicate.id,
        message:
          "This exact action already has a request. Continue its original status instead of creating another.",
      };
    const o: Entity = {
      id: localPreviewId(),
      owner: w.owner,
      kind: "app-action",
      name: provider.name,
      providerId: provider.id,
      connectionId: c.id,
      connectionVersion: c.version,
      scope: data.scope,
      request: data.request.trim(),
      status: "prepared",
      approved: false,
      realExecution: false,
      createdAt: Date.now(),
    };
    w.objects.unshift(o);
    return {
      objectId: o.id,
      message:
        "Prepared for review using this account and permission. No message, booking, payment or device action was executed.",
    };
  }
  throw new Error("This app permission action is unavailable.");
}
