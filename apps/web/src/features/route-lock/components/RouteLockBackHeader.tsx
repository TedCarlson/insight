import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Toolbar } from "@/components/ui/Toolbar";

export function RouteLockBackHeader(props?: { title?: string; subtitle?: string }) {
  const title = props?.title ?? "Route Lock";
  const subtitle = props?.subtitle ?? "Route Lock";

  return (
    <Card variant="subtle">
      <Toolbar
        left={
          <div className="min-w-0 flex items-center gap-2">
            <Link href="/route-lock" className="to-btn to-btn--secondary h-8 px-3 text-xs inline-flex items-center">
              Back
            </Link>
            <span className="px-2 text-[var(--to-ink-muted)]">•</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-5 truncate">{title}</div>
              <div className="text-[11px] text-[var(--to-ink-muted)] leading-4 truncate">{subtitle}</div>
            </div>
          </div>
        }
        right={null}
      />
    </Card>
  );
}