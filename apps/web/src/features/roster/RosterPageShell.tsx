import Link from "next/link";

export type RosterPageShellProps = {
  surface: "lead" | "admin";
};

export function RosterPageShell({ surface }: RosterPageShellProps) {
  const surfaceLabel = surface === "admin" ? "Admin" : "Leadership";

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Roster</div>
            <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
              {surfaceLabel} roster workspace (v2). Canonical row: Person-in-PC_Org.
            </div>
          </div>

          <button
            type="button"
            className="rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
          >
            + Onboard
          </button>
        </div>

        <div className="mt-3 text-sm text-[var(--to-ink-muted)]">
          Next: this page will render a roster table from{" "}
          <code className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-soft)] px-1.5 py-0.5">
            public.v_roster_active
          </code>{" "}
          and “Unassigned People” from{" "}
          <code className="rounded-md border border-[var(--to-border)] bg-[var(--to-surface-soft)] px-1.5 py-0.5">
            public.v_people_unassigned
          </code>
          .
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface)] p-4">
        <div className="text-sm font-semibold">Legacy access</div>
        <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
          Until Roster v2 is fully wired, legacy pages remain available.
        </div>

        <div className="mt-3 text-sm">
          <Link href="/org" className="underline">
            Go to /org
          </Link>
        </div>
      </div>
    </div>
  );
}
