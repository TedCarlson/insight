import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList } from "lucide-react";

function JumpTile(props: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const Icon = props.icon;

  return (
    <Link
      href={props.href}
      className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-4 transition hover:bg-muted/40"
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm font-medium">{props.label}</span>
    </Link>
  );
}

export default function TechHomePage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Team Message
        </div>
        <div className="mt-3 text-sm leading-6 text-foreground">
          No active broadcast right now.
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Leadership updates will land here.</div>
      </section>

      <section className="grid grid-cols-1 gap-3">
        <JumpTile href="/tech/schedule" label="Schedule" icon={CalendarDays} />
        <JumpTile href="/tech/metrics" label="Metrics" icon={BarChart3} />
        <JumpTile href="/tech/field-log" label="Field Log" icon={ClipboardList} />
      </section>
    </div>
  );
}
