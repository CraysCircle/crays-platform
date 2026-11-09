import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { getIdentityBundleByProviderSubject } from "@/db/core-identity-repository";
import { createCraysSessionFromIdentityBundle } from "@/lib/auth-session-mapping";
import { createProviderAuthenticatedSession } from "@/lib/auth-boundary";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  role?: string;
  provisioned?: string;
}>;

type ProviderUser = {
  sub?: string;
  name?: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
};

function statusLine(label: string, value: string | boolean | number | undefined) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/10 py-3 text-sm">
      <span className="font-medium text-black/55">{label}</span>
      <span className="text-right font-semibold text-black">{String(value ?? "none")}</span>
    </div>
  );
}

export default async function ProviderAccountPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const providerSession = await auth0.getSession();
  const providerUser = providerSession?.user as ProviderUser | undefined;
  const requestedRole = params.role === "gym-member" || params.role === "investor" ? params.role : "franchise-candidate";

  if (!providerUser?.sub) {
    return (
      <main className="min-h-screen bg-[#f7f7f8] px-6 py-12 text-black">
        <section className="mx-auto max-w-2xl rounded-[8px] border border-black/10 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#ff0f5f]">CRAYS Identity</p>
          <h1 className="mt-3 text-3xl font-black tracking-normal">Provider Account Mapping</h1>
          <p className="mt-4 text-sm leading-6 text-black/65">No active provider session was found in this browser.</p>
        </section>
      </main>
    );
  }

  const bundle = await getIdentityBundleByProviderSubject("auth0", providerUser.sub);
  const session = bundle ? createCraysSessionFromIdentityBundle(bundle) : createProviderAuthenticatedSession();

  return (
    <main className="min-h-screen bg-[#f7f7f8] px-6 py-12 text-black">
      <section className="mx-auto max-w-2xl rounded-[8px] border border-black/10 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase text-[#ff0f5f]">CRAYS Identity</p>
        <h1 className="mt-3 text-3xl font-black tracking-normal">Provider Account Mapping</h1>
        <p className="mt-4 text-sm leading-6 text-black/65">
          This local development view maps the active provider session into a reviewed CRAYS account context.
        </p>

        <div className="mt-8 rounded-[8px] border border-black/10 bg-[#fbfbfc] px-5">
          {statusLine("Provider session", true)}
          {statusLine("Account mapped", Boolean(bundle))}
          {statusLine("Provisioned now", params.provisioned === "1")}
          {statusLine("Session status", session.status)}
          {statusLine("Requested role", requestedRole)}
          {statusLine("Required actions", session.requiredActions.join(", ") || "none")}
          {statusLine("Secrets returned", false)}
          {statusLine("Private keys returned", false)}
        </div>

        {!bundle ? (
          <form className="mt-8" action="/auth/provider-account/review" method="post">
            <input type="hidden" name="requestedRole" value={requestedRole} />
            <button className="inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-bold text-white" type="submit">
              Create Reviewed CRAYS Mapping
            </button>
          </form>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="inline-flex h-11 items-center rounded-full bg-black px-5 text-sm font-bold text-white" href="/auth/nostr-handoff">
              Continue Identity Review
            </Link>
            <Link className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm font-bold text-black" href="/dashboard">
              Open Dashboard
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
