import "server-only";

import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const routePath =
  "/api/crays/auth/clubs-management-tenant-session/preview-control";
const managementSessionPath =
  "/api/crays/auth/clubs-management-tenant-session";
const authorityReadinessPath =
  "/api/crays/clubs/team/booking-party-team-go-evidence/preview-proof?mode=authority_readiness";
const allowedOrigins = [
  "http://localhost:43172",
  "http://127.0.0.1:43172",
] as const;
const allowedHosts = {
  "localhost:43172": allowedOrigins[0],
  "127.0.0.1:43172": allowedOrigins[1],
} as const;
const forbiddenAuthorityHeaders = [
  "authorization",
  "proxy-authorization",
  "forwarded",
  "x-auth-request-user",
  "x-crays-account-id",
  "x-crays-actor-id",
  "x-crays-organization-id",
  "x-crays-qa-host",
  "x-crays-review-role",
  "x-crays-role",
  "x-crays-tenant-id",
  "x-crays-clubs-team-host",
  "x-crays-clubs-team-local-preview",
  "x-original-host",
] as const;

const baseHeaders = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

function deploymentBlocked() {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_URL) ||
    Boolean(process.env.VERCEL_DEPLOYMENT_ID)
  );
}

function exactPreviewNavigation(request: NextRequest) {
  const directHost = request.headers.get("host")?.trim().toLowerCase();
  if (!directHost || directHost.includes(",")) return { denial: "host" } as const;
  const pageOrigin = allowedHosts[directHost as keyof typeof allowedHosts];
  if (!pageOrigin) return { denial: "host" } as const;
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return { denial: "url" } as const;
  }
  if (
    url.protocol !== "http:" ||
    url.pathname !== routePath ||
    url.search !== "" ||
    url.hash !== "" ||
    request.nextUrl.pathname !== routePath ||
    request.nextUrl.search !== "" ||
    request.body !== null
  ) {
    return { denial: "shape" } as const;
  }
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== pageOrigin) return { denial: "origin" } as const;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "none" && fetchSite !== "same-origin") {
    return { denial: "fetch_site" } as const;
  }
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && contentLength.trim() !== "0") {
    return { denial: "content_length" } as const;
  }
  if (request.headers.has("transfer-encoding")) {
    return { denial: "transfer_encoding" } as const;
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (
    forwardedHost !== null &&
    forwardedHost.trim().toLowerCase() !== directHost
  ) {
    return { denial: "forwarded_host" } as const;
  }
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto !== null && forwardedProto.trim().toLowerCase() !== "http") {
    return { denial: "forwarded_proto" } as const;
  }
  if (forbiddenAuthorityHeaders.some((header) => request.headers.has(header))) {
    return { denial: "authority_header" } as const;
  }
  return { pageOrigin } as const;
}

function notFound() {
  return new Response("", { status: 404, headers: baseHeaders });
}

function controlHtml(nonce: string, pageOrigin: (typeof allowedOrigins)[number]) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CRAYS Clubs local auth gate</title>
<style nonce="${nonce}">
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui,sans-serif;background:#001c2d;color:#f7fafc}body{margin:0;min-height:100vh;display:grid;place-items:center}.panel{width:min(42rem,calc(100vw - 2rem));padding:1.5rem;border:1px solid #557083;border-radius:1rem;background:#06283b}h1{font-size:1.25rem;margin:0 0 .5rem}p{line-height:1.5;color:#cbd8e0}button{width:100%;margin-top:.75rem;padding:.8rem 1rem;border:0;border-radius:.6rem;font:inherit;font-weight:700;background:#ff1654;color:white;cursor:pointer}button.secondary{background:#dce8ee;color:#001c2d}button:disabled{cursor:not-allowed;opacity:.45}output{display:block;margin-top:1rem;padding:1rem;min-height:1.5rem;border-radius:.6rem;background:#00131f;color:#e7f4fa;overflow-wrap:anywhere}
</style>
</head>
<body>
<main class="panel">
<h1>CRAYS Clubs local auth gate</h1>
<p data-role="scope"></p>
<button type="button" data-role="primary"></button>
<button type="button" class="secondary" data-role="secondary">Check authority readiness</button>
<output data-role="result" aria-live="polite">Ready</output>
</main>
<script nonce="${nonce}">
"use strict";
const pageOrigin=${JSON.stringify(pageOrigin)};
const localhostOrigin="http://localhost:43172";
const memberOrigin="http://127.0.0.1:43172";
const managementSessionPath=${JSON.stringify(managementSessionPath)};
const authorityReadinessPath=${JSON.stringify(authorityReadinessPath)};
const primary=document.querySelector('[data-role="primary"]');
const secondary=document.querySelector('[data-role="secondary"]');
const result=document.querySelector('[data-role="result"]');
const scope=document.querySelector('[data-role="scope"]');
const tenantStatuses=new Set(["active","misdirected_or_untrusted_preview_request","empty_request_body_required","exact_b2b_session_unavailable","wrong_vertical_session","core_identity_unavailable","mapped_b2b_core_account_required","management_role_required","fresh_aal2_or_aal3_required","session_proof_context_mismatch","tenant_binding_unavailable","unique_active_management_binding_required","tenant_session_unknown_outcome"]);
const readinessStatuses=new Set(["real_session_actor_authorized","wrong_vertical_session","exact_b2b_session_unavailable","actor_authority_unavailable","local_preview_only","validation_error","permission_denied","not_found","unknown_outcome"]);
const safeBooleanKeys=["durableGolfWorkflowAuthorized","t3SandboxUnlocked","marinaMembershipReady","marinaAdmissionReady","sandboxE2ePassed","productionPassed"];
function safeStatus(value,allowed){return typeof value==="string"&&allowed.has(value)?value:"unrecognized_status"}
function safeBooleans(value){if(!value||typeof value!=="object")return[];return safeBooleanKeys.filter((key)=>typeof value[key]==="boolean").map((key)=>key+"="+String(value[key]))}
function show(httpStatus,status,gate,booleans=[]){result.textContent=["HTTP "+String(httpStatus),status,"gate="+gate,...booleans].join(" | ")}
async function readSafeResponse(response,allowed){let value=null;try{value=await response.json()}catch{}return{status:safeStatus(value&&value.status,allowed),booleans:safeBooleans(value)}}
async function checkReadiness(){primary.disabled=true;secondary.disabled=true;try{const response=await fetch(authorityReadinessPath,{method:"GET",credentials:"same-origin",cache:"no-store",headers:{accept:"application/json"}});const safe=await readSafeResponse(response,readinessStatuses);const passed=pageOrigin===localhostOrigin?response.status===200&&safe.status==="real_session_actor_authorized":response.status===403&&safe.status==="wrong_vertical_session";show(response.status,safe.status,passed?"passed":"failed",safe.booleans)}catch{show(0,"network_error","failed")}finally{primary.disabled=false;secondary.disabled=pageOrigin===memberOrigin}}
async function startManagementSession(){primary.disabled=true;secondary.disabled=true;try{const response=await fetch(managementSessionPath,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{accept:"application/json","content-type":"application/json"},body:""});const safe=await readSafeResponse(response,tenantStatuses);const passed=response.status===200&&safe.status==="active";show(response.status,safe.status,passed?"passed":"failed");if(passed)await checkReadiness()}catch{show(0,"network_error","failed")}finally{primary.disabled=false;secondary.disabled=false}}
if(pageOrigin===localhostOrigin){scope.textContent="Local B2B management session and authority readiness.";primary.textContent="Start management tenant session";primary.addEventListener("click",startManagementSession);secondary.addEventListener("click",checkReadiness)}else{scope.textContent="Local B2C wrong-vertical boundary.";primary.textContent="Verify wrong vertical session";primary.addEventListener("click",checkReadiness);secondary.hidden=true;secondary.disabled=true}
</script>
</body>
</html>
`;
}

export async function GET(request: NextRequest) {
  if (deploymentBlocked()) return notFound();
  const navigation = exactPreviewNavigation(request);
  if ("denial" in navigation) return notFound();
  const pageOrigin = navigation.pageOrigin;
  const nonce = randomBytes(18).toString("base64url");
  const contentSecurityPolicy = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "connect-src 'self'",
    "img-src 'none'",
    "font-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
  return new Response(controlHtml(nonce, pageOrigin), {
    status: 200,
    headers: {
      ...baseHeaders,
      "content-security-policy": contentSecurityPolicy,
      "content-type": "text/html; charset=utf-8",
    },
  });
}
