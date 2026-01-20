import Link from "next/link";

export default function LeadRosterPage() {
  return (
    <div className="mt-6 rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
      <div className="text-sm font-semibold">Roster (v2 placeholder)</div>
      <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
        Next step: this page will host the shared Roster feature (Person-in-PC_Org table + segmented overlay).
      </div>

      <div className="mt-4 text-sm">
        Temporary: current roster/planning work still lives under{" "}
        <Link href="/org" className="underline">
          /org
        </Link>
        .
      </div>
    </div>
  );
}
