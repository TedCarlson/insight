//apps/web/src/features/roster/OnboardDrawer.tsx
"use client";

import { useMemo, useState } from "react";
import { Drawer } from "@/features/ui/Drawer";

export type UnassignedPersonRow = {
  person_id: string;
  full_name: string | null;
  emails: unknown; // can be string | string[] | null depending on DB/type
  mobile: string | null;
  person_active: boolean | null;
  person_role: string | null;
};

function TabButton(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "rounded-xl border px-3 py-1.5 text-sm",
        props.active
          ? "border-[var(--to-border)] bg-[var(--to-surface-soft)]"
          : "border-[var(--to-border)] bg-[var(--to-surface)] hover:bg-[var(--to-surface-soft)]",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--to-ink-muted)]">{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="mt-1 w-full rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm"
      />
    </label>
  );
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function formatEmails(emails: unknown): string {
  if (!emails) return "";
  if (Array.isArray(emails)) {
    return emails
      .filter((x) => typeof x === "string" && x.trim().length > 0)
      .join(", ");
  }
  if (typeof emails === "string") return emails;
  try {
    return JSON.stringify(emails);
  } catch {
    return String(emails);
  }
}

export function OnboardDrawer(props: {
  open: boolean;
  onClose: () => void;
  unassigned: UnassignedPersonRow[];
}) {
  const [mode, setMode] = useState<"pick" | "new">("pick");
  const [search, setSearch] = useState("");

  // New person draft (UI only for now)
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return props.unassigned;

    return props.unassigned.filter((p) => {
      const name = normalize(p.full_name ?? "");
      const mob = normalize(p.mobile ?? "");
      const em = normalize(formatEmails(p.emails));
      return name.includes(q) || mob.includes(q) || em.includes(q);
    });
  }, [search, props.unassigned]);

  // Very simple "possible duplicates" heuristic (UI-only)
  const possibleDuplicates = useMemo(() => {
    const full = normalize(`${first} ${last}`.trim());
    const mob = normalize(mobile);
    const em = normalize(email);

    // don’t start scoring until we have some signal
    if (full.length < 3 && mob.length < 7 && em.length < 5) return [];

    return props.unassigned
      .map((p) => {
        const name = normalize(p.full_name ?? "");
        const mob2 = normalize(p.mobile ?? "");
        const emails2 = normalize(formatEmails(p.emails));

        const nameHit = Boolean(full) && name.includes(full);
        const mobileHit = Boolean(mob) && Boolean(mob2) && mob2.includes(mob);
        const emailHit = Boolean(em) && Boolean(emails2) && emails2.includes(em);

        const score = (nameHit ? 1 : 0) + (mobileHit ? 2 : 0) + (emailHit ? 2 : 0);
        return { p, score, nameHit, mobileHit, emailHit };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [first, last, mobile, email, props.unassigned]);

  return (
    <Drawer
      open={props.open}
      onClose={props.onClose}
      title="+ Onboard"
      description="Pick an unassigned person or create a new person. Duplicate heads-up appears before creation."
    >
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={mode === "pick"}
          label="Unassigned People"
          onClick={() => setMode("pick")}
        />
        <TabButton active={mode === "new"} label="New Person" onClick={() => setMode("new")} />
      </div>

      {mode === "pick" ? (
        <div className="mt-4 space-y-3">
          <Input label="Search" value={search} onChange={setSearch} placeholder="Name, phone, email…" />

          <div className="overflow-hidden rounded-2xl border border-[var(--to-border)]">
            <div className="bg-[var(--to-surface-soft)] px-4 py-2 text-xs font-semibold">
              Unassigned ({filtered.length})
            </div>

            <div className="divide-y divide-[var(--to-border)]">
              {filtered.map((p) => (
                <div key={p.person_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{p.full_name ?? "—"}</div>
                    <div className="mt-0.5 text-xs text-[var(--to-ink-muted)]">
                      {p.mobile ?? "—"} • {formatEmails(p.emails) || "—"}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
                  >
                    Select
                  </button>
                </div>
              ))}

              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-sm text-[var(--to-ink-muted)]">No matches.</div>
              ) : null}
            </div>
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            “Select” will proceed to Org Context in the next step (membership creation).
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="First name" value={first} onChange={setFirst} />
            <Input label="Last name" value={last} onChange={setLast} />
          </div>

          <Input label="Email" value={email} onChange={setEmail} placeholder="name@domain.com" />
          <Input label="Mobile" value={mobile} onChange={setMobile} placeholder="(xxx) xxx-xxxx" />

          <div className="rounded-2xl border border-[var(--to-border)] bg-[var(--to-surface-soft)] p-3">
            <div className="text-xs font-semibold">Possible duplicates</div>
            <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
              Heads-up only. Use existing when appropriate.
            </div>

            <div className="mt-3 divide-y divide-[var(--to-border)] overflow-hidden rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)]">
              {possibleDuplicates.length ? (
                possibleDuplicates.map(({ p, score, nameHit, mobileHit, emailHit }) => (
                  <div key={p.person_id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{p.full_name ?? "—"}</div>
                      <div className="text-xs text-[var(--to-ink-muted)]">
                        {p.mobile ?? "—"} • {formatEmails(p.emails) || "—"}
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">
                        score {score} • {nameHit ? "name " : ""}
                        {mobileHit ? "mobile " : ""}
                        {emailHit ? "email" : ""}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
                      >
                        Use existing
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-[var(--to-ink-muted)]">
                  No potential duplicates yet.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-[var(--to-border)] bg-[var(--to-surface)] px-3 py-2 text-sm hover:bg-[var(--to-surface-soft)]"
            >
              Ignore & create new
            </button>
            <button
              type="button"
              className="rounded-xl bg-[var(--to-ink)] px-3 py-2 text-sm text-[var(--to-surface)]"
            >
              Create person
            </button>
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            Next step after creation: Org Context (membership) → Assignments → Leadership.
          </div>
        </div>
      )}
    </Drawer>
  );
}
