// apps/web/src/app/kit/BreadcrumbsDemo.tsx
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function BreadcrumbsDemo() {
  return (
    <div className="space-y-3">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/home" },
          { label: "Org", href: "/org" },
          { label: "Roster" },
        ]}
      />

      <div className="text-xs text-[var(--to-ink-muted)]">
        Keep crumbs short; last item is the current page and should not be a link.
      </div>
    </div>
  );
}
