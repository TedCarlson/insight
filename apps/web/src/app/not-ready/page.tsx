import Link from "next/link";
import { PageHeader, PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function NotReadyPage() {
  return (
    <PageShell>
      <PageHeader
        title="Profile not ready"
        subtitle="Your account is authenticated, but your org/profile setup isn’t complete yet."
      />

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          If you believe this is a mistake, contact your administrator to finish provisioning your profile and assign an
          organization.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/login" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Back to login
          </Link>

          <Link href="/auth/signout" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Sign out
          </Link>

          <Link href="/admin" className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "text-center")}>
            Admin
          </Link>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-[var(--to-ink-muted)]">
          Next step: once your org exists for the target LOB, you’ll be able to select it from the header and proceed.
        </p>
      </Card>
    </PageShell>
  );
}