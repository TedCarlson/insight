import Link from "next/link";
import { redirect } from "next/navigation";

import { getHomePayload } from "@/features/home/lib/getHomePayload.server";

function resolveLandingHref(role: Awaited<ReturnType<typeof getHomePayload>>["role"]) {
  if (role === "APP_OWNER" || role === "ADMIN") return "/home";
  if (role === "BP_OWNER" || role === "BP_LEAD" || role === "BP_SUPERVISOR") {
    return "/bp/view";
  }
  if (role === "COMPANY_MANAGER") return "/company-manager";
  if (role === "ITG_SUPERVISOR") return "/company-supervisor";
  if (role === "TECH") return "/tech";
  return "/home";
}

export default async function Page() {
  const payload = await getHomePayload();

  const shouldRedirect =
    payload.role === "APP_OWNER" ||
    payload.role === "ADMIN" ||
    payload.has_linked_person;

  if (shouldRedirect) {
    redirect(resolveLandingHref(payload.role));
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        ITG • Insight powered by TeamOptix
      </h1>
      <p className="text-base text-muted-foreground">
        Please sign in to continue.
      </p>

      <div className="flex gap-3">
        <Link
          className="to-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium"
          href="/login"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}