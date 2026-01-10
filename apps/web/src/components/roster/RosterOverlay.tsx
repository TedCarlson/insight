// apps/web/src/components/roster/RosterOverlay.tsx
//
// RosterOverlay (v0.2.4) — Overlay scroll lock + Notes section clip fix
// - Locks page/body scroll while overlay is open (background no longer scrolls)
// - Keeps overlay scrolling inside .ovScroll (wheel + touch)
// - Fixes Notes field being visually clipped by section:
//   - Section no longer clips vertically (overflow-y: visible)
//   - Still prevents horizontal bleed (overflow-x: hidden)

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type OverlayMode = "create" | "edit";
export type CreationStage = "pre_person" | "post_person";

type PersonDraft = {
    full_name: string;
    email?: string;
    mobile?: string;
    notes?: string;
};

type LocationDraft = {
    region_id?: string;
    office_id?: string;
};

type ActivityDraft = {
    active_flag?: boolean;
    tech_id?: string;
};

type ScheduleDraft = {
    // future
};

type HydratedBundle = {
    person?: Partial<PersonDraft>;
    location?: Partial<LocationDraft>;
    activity?: Partial<ActivityDraft>;
    schedule?: Partial<ScheduleDraft>;
};

type DirtyFlags = {
    person: boolean;
    location: boolean;
    activity: boolean;
    schedule: boolean;
    any: boolean;
};

export type RosterOverlayProps = {
    open: boolean;
    mode: "create" | "existing" | "edit";
    creationStage?: CreationStage;
    personId?: string;

    initialPerson?: Partial<PersonDraft>;
    initialLocation?: Partial<LocationDraft>;
    initialActivity?: Partial<ActivityDraft>;
    initialSchedule?: Partial<ScheduleDraft>;

    onHydrateBundle?: (args: { personId: string }) => Promise<HydratedBundle>;

    onCreatePerson?: (args: { person: PersonDraft }) => Promise<{ personId: string }>;
    onUpdatePerson?: (args: { personId: string; person: PersonDraft }) => Promise<void>;

    onUpsertLocation?: (args: { personId: string; location: LocationDraft }) => Promise<void>;
    onUpsertActivity?: (args: { personId: string; activity: ActivityDraft }) => Promise<void>;
    onUpsertSchedule?: (args: { personId: string; schedule: ScheduleDraft }) => Promise<void>;

    onClose: () => void;
};

function normalizeString(v: unknown) {
    const s = v === null || v === undefined ? "" : String(v);
    return s.trim();
}

function normalizeBool(v: unknown) {
    if (v === true) return true;
    if (v === false) return false;
    return undefined;
}

function eqNorm(a: unknown, b: unknown) {
    return normalizeString(a) === normalizeString(b);
}

function eqBool(a: unknown, b: unknown) {
    return normalizeBool(a) === normalizeBool(b);
}

function isValidFullName(full_name: string) {
    const s = normalizeString(full_name);
    if (s.length < 2) return false;
    return /[A-Za-z0-9]/.test(s);
}

function coerceMode(mode: RosterOverlayProps["mode"]): OverlayMode {
    if (mode === "create") return "create";
    if (mode === "edit") return "edit";
    return "edit"; // legacy "existing"
}

function safeConfirm(msg: string) {
    return window.confirm(msg);
}

function SectionHeader(props: { title: string; subtitle: string; right?: React.ReactNode }) {
    return (
        <div className="secHead">
            <div className="secHeadLeft">
                <div className="secTitle">{props.title}</div>
                <div className="secSub">{props.subtitle}</div>
            </div>
            {props.right ? <div className="secHeadRight">{props.right}</div> : null}
        </div>
    );
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="field">
            <div className="fieldTop">
                <div className="fieldLabel">{props.label}</div>
                {props.hint ? <div className="fieldHint">{props.hint}</div> : null}
            </div>
            {props.children}
        </div>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={["input", props.className ?? ""].join(" ")} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={["textarea", props.className ?? ""].join(" ")} />;
}

function Toggle(props: { value?: boolean; onChange: (vv: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            className={["toggle", props.value ? "toggleOn" : ""].join(" ")}
            disabled={props.disabled}
            onClick={() => props.onChange(!(props.value ?? false))}
        >
            {props.value ? "On" : "Off"}
        </button>
    );
}

function BlockedSection(props: { title: string; message: string }) {
    return (
        <div className="blocked">
            <div className="blockedTitle">{props.title}</div>
            <div className="blockedMsg">{props.message}</div>
        </div>
    );
}

export function RosterOverlay(props: RosterOverlayProps) {
    const open = props.open;
    const mode: OverlayMode = coerceMode(props.mode);

    const [personId, setPersonId] = useState<string | undefined>(props.personId);
    const [creationStage, setCreationStage] = useState<CreationStage>(props.creationStage ?? "pre_person");

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string>("");

    const baselineRef = useRef<{
        person: PersonDraft;
        location: LocationDraft;
        activity: ActivityDraft;
        schedule: ScheduleDraft;
    } | null>(null);

    const [personDraft, setPersonDraft] = useState<PersonDraft>({ full_name: "" });
    const [locationDraft, setLocationDraft] = useState<LocationDraft>({});
    const [activityDraft, setActivityDraft] = useState<ActivityDraft>({});
    const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({});

    // Lock page scroll while overlay is open (prevents background scroll)
    useEffect(() => {
        if (!open) return;

        const body = document.body;
        const prevOverflow = body.style.overflow;
        const prevPaddingRight = body.style.paddingRight;

        const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
        body.style.overflow = "hidden";
        if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`;

        return () => {
            body.style.overflow = prevOverflow;
            body.style.paddingRight = prevPaddingRight;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        setErrorMsg("");
        setLoading(false);
        setSaving(false);

        const resolvedPersonId = mode === "edit" ? props.personId : undefined;
        setPersonId(resolvedPersonId);

        const stage: CreationStage = mode === "create" ? props.creationStage ?? "pre_person" : "post_person";
        setCreationStage(stage);

        const initPerson: PersonDraft = {
            full_name: normalizeString(props.initialPerson?.full_name ?? ""),
            email: props.initialPerson?.email ? normalizeString(props.initialPerson.email) : undefined,
            mobile: props.initialPerson?.mobile ? normalizeString(props.initialPerson.mobile) : undefined,
            notes: props.initialPerson?.notes ? String(props.initialPerson.notes) : undefined,
        };

        const initLocation: LocationDraft = {
            region_id: props.initialLocation?.region_id ? normalizeString(props.initialLocation.region_id) : undefined,
            office_id: props.initialLocation?.office_id ? normalizeString(props.initialLocation.office_id) : undefined,
        };

        const initActivity: ActivityDraft = {
            active_flag: props.initialActivity?.active_flag,
            tech_id: props.initialActivity?.tech_id ? normalizeString(props.initialActivity.tech_id) : undefined,
        };

        const initSchedule: ScheduleDraft = { ...(props.initialSchedule ?? {}) };

        baselineRef.current = {
            person: { ...initPerson },
            location: { ...initLocation },
            activity: { ...initActivity },
            schedule: { ...initSchedule },
        };

        setPersonDraft(initPerson);
        setLocationDraft(initLocation);
        setActivityDraft(initActivity);
        setScheduleDraft(initSchedule);

        (async () => {
            if (mode !== "edit") return;
            if (!resolvedPersonId) return;
            if (!props.onHydrateBundle) return;

            setLoading(true);
            try {
                const bundle = await props.onHydrateBundle({ personId: resolvedPersonId });

                const bPerson: PersonDraft = {
                    full_name: normalizeString(bundle.person?.full_name ?? initPerson.full_name ?? ""),
                    email: bundle.person?.email ? normalizeString(bundle.person.email) : undefined,
                    mobile: bundle.person?.mobile ? normalizeString(bundle.person.mobile) : undefined,
                    notes: bundle.person?.notes ? String(bundle.person.notes) : undefined,
                };

                const bLocation: LocationDraft = {
                    region_id: bundle.location?.region_id ? normalizeString(bundle.location.region_id) : undefined,
                    office_id: bundle.location?.office_id ? normalizeString(bundle.location.office_id) : undefined,
                };

                const bActivity: ActivityDraft = {
                    active_flag: bundle.activity?.active_flag,
                    tech_id: bundle.activity?.tech_id ? normalizeString(bundle.activity.tech_id) : undefined,
                };

                const bSchedule: ScheduleDraft = { ...(bundle.schedule ?? initSchedule) };

                baselineRef.current = { person: bPerson, location: bLocation, activity: bActivity, schedule: bSchedule };

                setPersonDraft(bPerson);
                setLocationDraft(bLocation);
                setActivityDraft(bActivity);
                setScheduleDraft(bSchedule);
            } catch (e: any) {
                setErrorMsg(e?.message ? String(e.message) : "Failed to load record.");
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                requestClose();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, saving]);

    const dirty: DirtyFlags = useMemo(() => {
        const b = baselineRef.current;
        if (!b) return { person: false, location: false, activity: false, schedule: false, any: false };

        const personDirty =
            !eqNorm(personDraft.full_name, b.person.full_name) ||
            !eqNorm(personDraft.email ?? "", b.person.email ?? "") ||
            !eqNorm(personDraft.mobile ?? "", b.person.mobile ?? "") ||
            !eqNorm(personDraft.notes ?? "", b.person.notes ?? "");

        const locationDirty =
            !eqNorm(locationDraft.region_id ?? "", b.location.region_id ?? "") ||
            !eqNorm(locationDraft.office_id ?? "", b.location.office_id ?? "");

        const activityDirty =
            !eqBool(activityDraft.active_flag, b.activity.active_flag) ||
            !eqNorm(activityDraft.tech_id ?? "", b.activity.tech_id ?? "");

        const scheduleDirty = false;

        const any = personDirty || locationDirty || activityDirty || scheduleDirty;
        return { person: personDirty, location: locationDirty, activity: activityDirty, schedule: scheduleDirty, any };
    }, [personDraft, locationDraft, activityDraft, scheduleDraft]);

    const personValid = useMemo(() => isValidFullName(personDraft.full_name), [personDraft.full_name]);

    const assignmentsLocked = useMemo(() => {
        if (mode === "create") return creationStage !== "post_person";
        return false;
    }, [mode, creationStage]);

    const saveEnabled = useMemo(() => {
        if (saving || loading) return false;

        if (mode === "create") {
            if (creationStage === "pre_person") return personValid;
            return dirty.any;
        }

        return dirty.any;
    }, [saving, loading, mode, creationStage, personValid, dirty.any]);

    function requestClose() {
        if (saving) return;
        if (dirty.any) {
            const ok = safeConfirm("You have unsaved changes. Close anyway?");
            if (!ok) return;
        }
        props.onClose();
    }

    async function onSave() {
        if (!saveEnabled) return;

        setErrorMsg("");
        setSaving(true);

        try {
            if (mode === "create" && creationStage === "pre_person") {
                if (!personValid) {
                    setErrorMsg("Full name is required.");
                    return;
                }

                if (props.onCreatePerson) {
                    const res = await props.onCreatePerson({ person: { ...personDraft } });
                    setPersonId(res.personId);
                } else {
                    const tempId = `temp_${Math.random().toString(16).slice(2)}`;
                    setPersonId(tempId);
                }

                setCreationStage("post_person");

                baselineRef.current = baselineRef.current
                    ? {
                        ...baselineRef.current,
                        person: { ...personDraft },
                        location: { ...locationDraft },
                        activity: { ...activityDraft },
                        schedule: { ...scheduleDraft },
                    }
                    : {
                        person: { ...personDraft },
                        location: { ...locationDraft },
                        activity: { ...activityDraft },
                        schedule: { ...scheduleDraft },
                    };

                return;
            }

            const pid = personId ?? props.personId;
            if (!pid) {
                setErrorMsg("Missing person id.");
                return;
            }

            if (dirty.person && props.onUpdatePerson) {
                await props.onUpdatePerson({ personId: pid, person: { ...personDraft } });
            }

            if (dirty.location && props.onUpsertLocation) {
                await props.onUpsertLocation({ personId: pid, location: { ...locationDraft } });
            }

            if (dirty.activity && props.onUpsertActivity) {
                await props.onUpsertActivity({ personId: pid, activity: { ...activityDraft } });
            }

            if (dirty.schedule && props.onUpsertSchedule) {
                await props.onUpsertSchedule({ personId: pid, schedule: { ...scheduleDraft } });
            }

            baselineRef.current = baselineRef.current
                ? {
                    ...baselineRef.current,
                    person: { ...personDraft },
                    location: { ...locationDraft },
                    activity: { ...activityDraft },
                    schedule: { ...scheduleDraft },
                }
                : {
                    person: { ...personDraft },
                    location: { ...locationDraft },
                    activity: { ...activityDraft },
                    schedule: { ...scheduleDraft },
                };
        } catch (e: any) {
            setErrorMsg(e?.message ? String(e.message) : "Save failed.");
        } finally {
            setSaving(false);
        }
    }

    if (!open) return null;

    return (
        <div className="ovRoot" aria-modal="true" role="dialog">
            <div className="ovBackdrop" onClick={requestClose} />

            <div className="ovPanel" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                <div className="ovHeader">
                    <div className="ovHeaderLeft">
                        <div className="ovTitleRow">
                            <div className="ovTitle">{mode === "create" ? "Add Person" : "Edit Person"}</div>
                            <span className={["ovBadge", mode === "create" ? "ovBadgeCreate" : "ovBadgeEdit"].join(" ")}>
                                {mode === "create" ? "CREATE" : "EDIT"}
                            </span>
                            {dirty.any ? (
                                <span className="ovDirtyPill" title="Unsaved changes">
                                    Unsaved
                                </span>
                            ) : null}
                        </div>

                        <div className="ovSub">
                            {mode === "edit" ? (
                                <span>
                                    person_id: <span className="ovMono">{props.personId}</span>
                                </span>
                            ) : creationStage === "pre_person" ? (
                                <span className="ovGateMsg">Save person to open assignments</span>
                            ) : (
                                <span>
                                    person_id: <span className="ovMono">{personId ?? "—"}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="ovHeaderRight">
                        <button className="ovBtn" onClick={requestClose} type="button" disabled={saving}>
                            Close
                        </button>

                        <button className="ovBtn ovBtnPrimary" onClick={onSave} type="button" disabled={!saveEnabled}>
                            {saving ? "Saving…" : mode === "create" && creationStage === "pre_person" ? "Save Person" : "Save"}
                        </button>
                    </div>
                </div>

                <div className="ovBody">
                    {errorMsg ? <div className="ovError">{errorMsg}</div> : null}

                    {loading ? (
                        <div className="ovLoading">
                            <div className="ovSkeletonLine" />
                            <div className="ovSkeletonLine" />
                            <div className="ovSkeletonLine short" />
                        </div>
                    ) : (
                        <div className="ovScroll">
                            <section className="sec">
                                <SectionHeader
                                    title="Person"
                                    subtitle={mode === "create" ? "Minimal required: full name." : "Edit person identity fields."}
                                    right={dirty.person ? <span className="secDirty">Edited</span> : null}
                                />

                                <div className="grid2">
                                    <Field label="Full Name" hint={mode === "create" ? "required" : undefined}>
                                        <Input
                                            value={personDraft.full_name}
                                            onChange={(e) => setPersonDraft({ ...personDraft, full_name: e.target.value })}
                                            placeholder="Full name"
                                        />
                                        {!personValid ? <div className="fieldNote">Enter at least 2 characters.</div> : null}
                                    </Field>

                                    <Field label="Email" hint="optional">
                                        <Input
                                            value={personDraft.email ?? ""}
                                            onChange={(e) => setPersonDraft({ ...personDraft, email: e.target.value })}
                                            placeholder="email@company.com"
                                        />
                                    </Field>

                                    <Field label="Mobile" hint="optional">
                                        <Input
                                            value={personDraft.mobile ?? ""}
                                            onChange={(e) => setPersonDraft({ ...personDraft, mobile: e.target.value })}
                                            placeholder="Phone number"
                                        />
                                    </Field>

                                    <div className="span2">
                                        <Field label="Notes" hint="optional">
                                            <Textarea
                                                className="notesTextarea"
                                                value={personDraft.notes ?? ""}
                                                onChange={(e) => setPersonDraft({ ...personDraft, notes: e.target.value })}
                                                placeholder="Notes about this person (internal)…"
                                                rows={5}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </section>

                            <section className={["sec", assignmentsLocked ? "secLocked" : ""].join(" ")}>
                                <SectionHeader
                                    title="Location"
                                    subtitle={assignmentsLocked ? "Locked until person is saved." : "Optional. Can be saved later."}
                                    right={dirty.location ? <span className="secDirty">Edited</span> : null}
                                />

                                {assignmentsLocked ? (
                                    <BlockedSection title="Locked" message="Save the person first to enable Location." />
                                ) : (
                                    <div className="grid2">
                                        <Field label="Region ID" hint="optional">
                                            <Input
                                                value={locationDraft.region_id ?? ""}
                                                onChange={(e) => setLocationDraft({ ...locationDraft, region_id: e.target.value })}
                                                placeholder="region_id"
                                            />
                                        </Field>

                                        <Field label="Office ID" hint="optional">
                                            <Input
                                                value={locationDraft.office_id ?? ""}
                                                onChange={(e) => setLocationDraft({ ...locationDraft, office_id: e.target.value })}
                                                placeholder="office_id"
                                            />
                                        </Field>
                                    </div>
                                )}
                            </section>

                            <section className={["sec", assignmentsLocked ? "secLocked" : ""].join(" ")}>
                                <SectionHeader
                                    title="Activity"
                                    subtitle={assignmentsLocked ? "Locked until person is saved." : "Optional. Can be saved later."}
                                    right={dirty.activity ? <span className="secDirty">Edited</span> : null}
                                />

                                {assignmentsLocked ? (
                                    <BlockedSection title="Locked" message="Save the person first to enable Activity." />
                                ) : (
                                    <div className="grid2 alignEnd">
                                        <Field label="Active" hint="optional">
                                            <Toggle
                                                value={activityDraft.active_flag}
                                                onChange={(v) => setActivityDraft({ ...activityDraft, active_flag: v })}
                                            />
                                        </Field>

                                        <Field label="Tech ID" hint="optional">
                                            <Input
                                                value={activityDraft.tech_id ?? ""}
                                                onChange={(e) => setActivityDraft({ ...activityDraft, tech_id: e.target.value })}
                                                placeholder="tech_id"
                                            />
                                        </Field>
                                    </div>
                                )}
                            </section>

                            <section className="sec secFuture">
                                <SectionHeader title="Schedule" subtitle="Future (disabled)" />
                                <BlockedSection title="Not enabled" message="Schedule module will be implemented later." />
                            </section>

                            <div className="ovBottomPad" />
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        /* Overlay */
        .ovRoot {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
        }

        .ovBackdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.42);
        }

        .ovPanel {
          position: relative;
          width: min(980px, calc(100vw - 24px));
          height: min(760px, calc(100vh - 24px));
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.10);
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.28);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        .ovHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: linear-gradient(to bottom, #ffffff, #fbfbfc);
          min-width: 0;
        }

        .ovHeaderLeft,
        .ovHeaderRight {
          min-width: 0;
        }

        .ovTitleRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .ovTitle {
          font-size: 15px;
          font-weight: 850;
          letter-spacing: -0.01em;
        }

        .ovSub {
          margin-top: 5px;
          font-size: 12px;
          opacity: 0.78;
          min-width: 0;
        }

        .ovGateMsg {
          color: rgba(220, 38, 38, 0.95);
          font-weight: 750;
          opacity: 1;
        }

        .ovMono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 12px;
          opacity: 0.9;
        }

        .ovBadge {
          font-size: 11px;
          font-weight: 850;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.10);
          opacity: 0.92;
        }

        .ovBadgeCreate {
          background: rgba(59, 130, 246, 0.10);
          border-color: rgba(59, 130, 246, 0.22);
        }

        .ovBadgeEdit {
          background: rgba(16, 185, 129, 0.10);
          border-color: rgba(16, 185, 129, 0.22);
        }

        .ovDirtyPill {
          font-size: 11px;
          font-weight: 850;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.10);
          background: rgba(0, 0, 0, 0.04);
          opacity: 0.9;
        }

        .ovHeaderRight {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .ovBtn {
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #fff;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          max-width: 100%;
          box-sizing: border-box;
        }

        .ovBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .ovBtnPrimary {
          background: #111;
          color: #fff;
          border-color: rgba(0, 0, 0, 0.20);
        }

        .ovBody {
          padding: 12px 16px;
          overflow: hidden;
          flex: 1;
          min-height: 0;
          min-width: 0;
        }

        .ovScroll {
          height: 100%;
          overflow: auto;
          padding-right: 4px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          overscroll-behavior: contain; /* prevent chaining to page */
          -webkit-overflow-scrolling: touch;
        }

        .ovBottomPad {
          height: 10px;
        }

        .ovError {
          border: 1px solid rgba(239, 68, 68, 0.26);
          background: rgba(239, 68, 68, 0.08);
          color: #7f1d1d;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 12px;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }

        .ovLoading {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 8px 2px;
          min-width: 0;
        }

        .ovSkeletonLine {
          height: 14px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.06);
          max-width: 100%;
        }

        .ovSkeletonLine.short {
          width: 55%;
        }

        /* Sections */
        .sec {
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
          border-radius: 16px;
          padding: 14px;
          box-sizing: border-box;
          min-width: 0;
          overflow-x: hidden;  /* keep bleed fix */
          overflow-y: visible; /* allow Notes bottom to show */
        }

        .secLocked {
          background: rgba(0, 0, 0, 0.02);
        }

        .secFuture {
          opacity: 0.85;
        }

        .secHead {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          min-width: 0;
        }

        .secHeadLeft,
        .secHeadRight {
          min-width: 0;
        }

        .secTitle {
          font-size: 14px;
          font-weight: 850;
          letter-spacing: -0.01em;
        }

        .secSub {
          margin-top: 3px;
          font-size: 12px;
          opacity: 0.68;
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .secDirty {
          font-size: 11px;
          font-weight: 850;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.04);
          opacity: 0.85;
          white-space: nowrap;
          max-width: 100%;
        }

        .blocked {
          border: 1px dashed rgba(0,0,0,0.14);
          background: rgba(0,0,0,0.03);
          border-radius: 14px;
          padding: 14px;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }

        .blockedTitle {
          font-size: 13px;
          font-weight: 850;
          opacity: 0.85;
        }

        .blockedMsg {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.72;
        }

        /* Fields */
        .grid2 {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 12px;
          min-width: 0;
        }

        .alignEnd {
          align-items: end;
        }

        .span2 {
          grid-column: 1 / span 2;
          min-width: 0;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .fieldTop {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }

        .fieldLabel {
          font-size: 12px;
          font-weight: 800;
          opacity: 0.75;
          min-width: 0;
        }

        .fieldHint {
          font-size: 12px;
          opacity: 0.60;
          white-space: nowrap;
        }

        .fieldNote {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.68;
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .input {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          background: #fff;
          min-width: 0;
        }

        .textarea {
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          background: #fff;
          min-width: 0;
          overflow: auto;
          resize: vertical;
        }

        .notesTextarea {
          height: 140px;
          min-height: 140px;
          max-height: 260px;
          overflow: auto;
          resize: vertical;
        }

        .toggle {
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #fff;
          color: #111;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          cursor: pointer;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          text-align: left;
          min-width: 0;
        }

        .toggleOn {
          background: #111;
          color: #fff;
          border-color: rgba(0, 0, 0, 0.20);
        }

        @media (max-width: 900px) {
          .grid2 {
            grid-template-columns: minmax(0, 1fr);
          }
          .span2 {
            grid-column: auto;
          }
        }
      `}</style>
        </div>
    );
}
