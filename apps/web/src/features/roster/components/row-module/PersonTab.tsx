// apps/web/src/features/roster/components/row-module/PersonTab.tsx
"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Notice } from "@/components/ui/Notice";
import { AffiliationSelector, type AffiliationOption } from "@/components/affiliation/AffiliationSelector";

import { KVRow, rowFallbackFullName, ensurePersonIdentity, type TabKey } from "../rosterRowModule.helpers";

type Position = { position_title: string; sort_order?: number | null; active?: boolean | null };

export function PersonTab(props: {
  // identity / context
  row: any;
  personId: string | null;

  // person state
  person: any;
  personHuman: any;
  personErr: string | null;
  loadingPerson: boolean;

  editingPerson: boolean;
  savingPerson: boolean;

  personBaseline: any | null;
  personDraft: any | null;

  // setters
  setPersonDraft: (updater: any) => void;

  // actions
  beginEditPerson: () => void;
  cancelEditPerson: () => void;
  savePerson: () => void;

  // affiliation
  coResolved: { kind: "company" | "contractor"; name: string; matched_on: "id" | "code" } | null;
  setCoResolved: (v: any) => void;
}) {
  const {
    row,
    personId,
    person,
    personHuman,
    personErr,
    loadingPerson,
    editingPerson,
    savingPerson,
    personBaseline,
    personDraft,
    setPersonDraft,
    beginEditPerson,
    cancelEditPerson,
    savePerson,
    coResolved,
  } = props;

  const PERSON_FIELDS = [
    { key: "full_name", label: "Full name" },
    { key: "emails", label: "Emails" },
    { key: "mobile", label: "Mobile" },
    { key: "fuse_emp_id", label: "Fuse employee ID" },
    { key: "person_nt_login", label: "NT login" },
    { key: "person_csg_id", label: "CSG ID" },
    { key: "active", label: "Status" },
    { key: "person_notes", label: "Notes" },
  ] as const;

  return (
    <div className="space-y-3">
      {personErr ? (
        <Notice variant="danger" title="Could not load person">
          {personErr}
        </Notice>
      ) : null}

      <Card>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Person (api.person_get) — all fields (human readable)</div>
            <div className="text-xs text-[var(--to-ink-muted)]">
              This view is the source of truth. Edit inline to test hydration and write.
            </div>
          </div>

          {!editingPerson ? (
            <Button onClick={beginEditPerson} disabled={!person || loadingPerson}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={cancelEditPerson} disabled={savingPerson}>
                Cancel
              </Button>
              <Button onClick={savePerson} disabled={savingPerson}>
                {savingPerson ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>

        {!personId ? (
          <div className="text-sm text-[var(--to-ink-muted)]">No person_id on this roster row.</div>
        ) : loadingPerson && !person ? (
          <div className="text-sm text-[var(--to-ink-muted)]">Loading person…</div>
        ) : !person ? (
          <div className="text-sm text-[var(--to-ink-muted)]">No person record returned.</div>
        ) : (
          <div className="space-y-2">
            {PERSON_FIELDS.map(({ key, label }) => {
              const displayPerson = (personHuman ?? person) as any;
              const src: any = (editingPerson ? personDraft : displayPerson) ?? {};
              const v = src[key as any];
              const editable = [
                "full_name",
                "emails",
                "mobile",
                "fuse_emp_id",
                "person_notes",
                "person_nt_login",
                "person_csg_id",
                "active",
              ].includes(String(key));

              if (editingPerson && editable) {
                if (key === "person_notes") {
                  return (
                    <div key={String(key)} className="grid grid-cols-12 gap-2 text-sm">
                      <div className="col-span-4 text-[var(--to-ink-muted)]">{label}</div>
                      <div className="col-span-8">
                        <textarea
                          className="to-input h-auto min-h-[96px] py-2"
                          value={(personDraft as any)?.[key] ?? ""}
                          onChange={(e) =>
                            setPersonDraft((p: any) => {
                              const next: any = ensurePersonIdentity(p, row as any);
                              next[key] = e.target.value;
                              if (!next.full_name || String(next.full_name).trim() === "") {
                                const fb =
                                  (personBaseline as any)?.full_name ?? rowFallbackFullName(row as any);
                                if (fb) next.full_name = fb;
                              }
                              return next;
                            })
                          }
                        />
                      </div>
                    </div>
                  );
                }

                if (key === "active") {
                  return (
                    <div key={String(key)} className="grid grid-cols-12 gap-2 text-sm">
                      <div className="col-span-4 text-[var(--to-ink-muted)]">{label}</div>
                      <div className="col-span-8">
                        <SegmentedControl
                          value={String(Boolean((personDraft as any)?.active))}
                          onChange={(next) =>
                            setPersonDraft((p: any) => {
                              const n: any = ensurePersonIdentity(p, row as any);
                              n.active = next === "true";
                              if (!n.full_name || String(n.full_name).trim() === "") {
                                const fb =
                                  (personBaseline as any)?.full_name ?? rowFallbackFullName(row as any);
                                if (fb) n.full_name = fb;
                              }
                              return n;
                            })
                          }
                          options={[
                            { value: "true", label: "Active" },
                            { value: "false", label: "Inactive" },
                          ]}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={String(key)} className="grid grid-cols-12 gap-2 text-sm">
                    <div className="col-span-4 text-[var(--to-ink-muted)]">{label}</div>
                    <div className="col-span-8">
                      <TextInput
                        value={(personDraft as any)?.[key] ?? ""}
                        onChange={(e) =>
                          setPersonDraft((p: any) => {
                            const next: any = ensurePersonIdentity(p, row as any);
                            next[key] = e.target.value;
                            if (
                              key !== "full_name" &&
                              (!next.full_name || String(next.full_name).trim() === "")
                            ) {
                              const fb =
                                (personBaseline as any)?.full_name ?? rowFallbackFullName(row as any);
                              if (fb) next.full_name = fb;
                            }
                            return next;
                          })
                        }
                      />
                    </div>
                  </div>
                );
              }

              const display = key === "active" ? (Boolean(v) ? "Active" : "Inactive") : v ?? "—";
              return <KVRow key={String(key)} label={label} value={display} />;
            })}
          </div>
        )}
      </Card>

      {person ? (
        <Card title="Company / Role">
          {editingPerson ? (
            <AffiliationSelector
              value={(() => {
                const src: any = (personDraft ?? person ?? {}) as any;
                const co_ref_id = String(src?.co_ref_id ?? "").trim();
                if (!co_ref_id) return null;

                const roleRaw = String(src?.role ?? "").toLowerCase();
                const kind: "company" | "contractor" =
                  (coResolved?.kind as any) ??
                  ((row as any)?.co_type === "contractor" || roleRaw.includes("contract")
                    ? "contractor"
                    : "company");

                return {
                  kind,
                  co_ref_id,
                  co_code: src?.co_code ? String(src.co_code) : null,
                  name: coResolved?.name ?? (src?.co_code ? String(src.co_code) : co_ref_id),
                } as AffiliationOption;
              })()}
              onChange={(next) =>
                setPersonDraft((p: any) => {
                  const n: any = ensurePersonIdentity(p, row as any);

                  if (!next) {
                    n.co_ref_id = null;
                    n.co_code = null;
                    n.role = null;
                  } else {
                    n.co_ref_id = String(next.co_ref_id);
                    n.co_code = next.co_code ? String(next.co_code) : null;
                    n.role = next.kind === "contractor" ? "contractor" : null;
                  }

                  if (!n.full_name || String(n.full_name).trim() === "") {
                    const fb = (personBaseline as any)?.full_name ?? rowFallbackFullName(row as any);
                    if (fb) n.full_name = fb;
                  }

                  return n;
                })
              }
              help="Set the person’s Organization. This writes co_ref_id/co_code and updates role so contractor/company type derives correctly."
            />
          ) : null}

          <div className="space-y-1">
            <KVRow
              label="Organization"
              value={coResolved?.name ?? (person as any)?.co_code ?? (person as any)?.co_ref_id ?? "—"}
            />
            <KVRow label="Type" value={coResolved?.kind ?? (row as any)?.co_type ?? "—"} />
            <KVRow label="Role" value={(person as any)?.role ?? (row as any)?.role ?? "—"} />
            <KVRow label="Code" value={(person as any)?.co_code ?? "—"} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}