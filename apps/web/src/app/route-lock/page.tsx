// apps/web/src/app/route-lock/page.tsx
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/Card";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function SectionCard({ title, href }: { title: string; href: string }) {
  return (
    <Card>
      <Link
        href={href}
        className={cls("to-btn", "to-btn--secondary", "px-4 py-3", "w-full", "text-center")}
      >
        {title}
      </Link>
    </Card>
  );
}

export default async function RouteLockPage() {
  return (
    <PageShell>
      <PageHeader title="Route Lock" subtitle="Configure schedule, quotas, routes, and validation." />

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Schedule" href="/route-lock/schedule" />
        <SectionCard title="Quota" href="/route-lock/quota" />
        <SectionCard title="Routes" href="/route-lock/routes" />
        <SectionCard title="Shift Validation" href="/route-lock/shift-validation" />
      </div>
    </PageShell>
  );
}
