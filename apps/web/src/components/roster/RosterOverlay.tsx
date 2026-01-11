// apps/web/src/components/roster/RosterOverlay.tsx
//
// RosterOverlay (v0.2.9) — IMMERSIVE overlay
// - Single scroll: ovRoot
// - Sticky header: ovHeader
// - No internal scroll containers (ovScroll has no overflow/height constraints)
// - Preserve person_id gating + locked banner
// - Backdrop blur

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./RosterOverlay.module.css";

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

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

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
    return "edit";
}

function safeConfirm(msg: string) {
    return window.confirm(msg);
}

function SectionHeader(props: { title: string; subtitle: string; right?: React.ReactNode }) {
    return (
        <div className={styles.secHead}>
            <div className={styles.secHeadLeft}>
                <div className={styles.secTitle}>{props.title}</div>
                <div className={styles.secSub}>{props.subtitle}</div>
            </div>
            {props.right ? <div className={styles.secHeadRight}>{props.right}</div> : null}
        </div>
    );
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className={styles.field}>
            <div className={styles.fieldTop}>
                <div className={styles.fieldLabel}>{props.label}</div>
                {props.hint ? <div className={styles.fieldHint}>{props.hint}</div> : null}
            </div>
            {props.children}
        </div>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cx(styles.input, props.className)} />;
}

function Toggle(props: { value?: boolean; onChange: (vv: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            className={cx(styles.toggle, props.value ? styles.toggleOn : "")}
            disabled={props.disabled}
            onClick={() => props.onChange(!(props.value ?? false))}
        >
            {props.value ? "On" : "Off"}
        </button>
    );
}

function BlockedBanner(props: { title: string; message: string }) {
    return (
        <div className={styles.lockBanner} role="note" aria-label="Locked section">
            <div className={styles.lockBannerLeft}>
                <span className={styles.lockIcon}>🔒</span>
                <div>
                    <div className={styles.lockTitle}>{props.title}</div>
                    <div className={styles.lockMsg}>{props.message}</div>
                </div>
            </div>
        </div>
    );
}

function AutoGrowTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const { className, value, onInput, ...domProps } = props;
    const ref = useRef<HTMLTextAreaElement | null>(null);

    const resize = () => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
        resize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <textarea
            {...domProps}
            value={value}
            ref={(n) => {
                ref.current = n;
            }}
            className={cx(styles.textarea, styles.textareaAuto, className)}
            onInput={(e) => {
                resize();
                onInput?.(e);
            }}
        />
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

    const prevAssignmentsLockedRef = useRef<boolean>(false);
    const [unlockPulse, setUnlockPulse] = useState(false);

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

    useEffect(() => {
        const prev = prevAssignmentsLockedRef.current;
        prevAssignmentsLockedRef.current = assignmentsLocked;

        if (open && mode === "create" && prev === true && assignmentsLocked === false) {
            setUnlockPulse(true);
            const t = window.setTimeout(() => setUnlockPulse(false), 900);
            return () => window.clearTimeout(t);
        }
    }, [open, mode, assignmentsLocked]);

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

    const lockableSectionClass = cx(
        styles.sec,
        assignmentsLocked ? styles.secLocked : "",
        unlockPulse ? styles.secUnlockPulse : ""
    );

    const lockDisabled = assignmentsLocked;

    return (
        <div className={styles.ovRoot} aria-modal="true" role="dialog">
            <div className={styles.ovBackdrop} onClick={requestClose} />

            <div className={styles.ovPanel} onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
                <div className={styles.ovHeader}>
                    <div className={styles.ovHeaderLeft}>
                        <div className={styles.ovTitleRow}>
                            <div className={styles.ovTitle}>{mode === "create" ? "Add Person" : "Edit Person"}</div>
                            <span className={cx(styles.ovBadge, mode === "create" ? styles.ovBadgeCreate : styles.ovBadgeEdit)}>
                                {mode === "create" ? "CREATE" : "EDIT"}
                            </span>
                            {dirty.any ? (
                                <span className={styles.ovDirtyPill} title="Unsaved changes">
                                    Unsaved
                                </span>
                            ) : null}
                        </div>

                        <div className={styles.ovSub}>
                            {mode === "edit" ? (
                                <span>
                                    person_id: <span className={styles.ovMono}>{props.personId}</span>
                                </span>
                            ) : creationStage === "pre_person" ? (
                                <span className={styles.ovGateMsg}>Save person to open assignments</span>
                            ) : (
                                <span>
                                    person_id: <span className={styles.ovMono}>{personId ?? "—"}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={styles.ovHeaderRight}>
                        <button className={styles.ovBtn} onClick={requestClose} type="button" disabled={saving}>
                            Close
                        </button>

                        <button className={cx(styles.ovBtn, styles.ovBtnPrimary)} onClick={onSave} type="button" disabled={!saveEnabled}>
                            {saving ? "Saving…" : mode === "create" && creationStage === "pre_person" ? "Save Person" : "Save"}
                        </button>
                    </div>
                </div>

                <div className={styles.ovBody}>
                    {errorMsg ? <div className={styles.ovError}>{errorMsg}</div> : null}

                    {loading ? (
                        <div className={styles.ovLoading}>
                            <div className={styles.ovSkeletonLine} />
                            <div className={styles.ovSkeletonLine} />
                            <div className={cx(styles.ovSkeletonLine, styles.ovSkeletonLineShort)} />
                        </div>
                    ) : (
                        <div className={styles.ovScroll}>
                            <section className={styles.sec}>
                                <SectionHeader
                                    title="Person"
                                    subtitle={mode === "create" ? "Minimal required: full name." : "Edit person identity fields."}
                                    right={dirty.person ? <span className={styles.secDirty}>Edited</span> : null}
                                />

                                <div className={styles.grid2}>
                                    <Field label="Full Name" hint={mode === "create" ? "required" : undefined}>
                                        <Input
                                            value={personDraft.full_name}
                                            onChange={(e) => setPersonDraft({ ...personDraft, full_name: e.target.value })}
                                            placeholder="Full name"
                                        />
                                        {!personValid ? <div className={styles.fieldNote}>Enter at least 2 characters.</div> : null}
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

                                    <div className={styles.span2}>
                                        <Field label="Notes" hint="optional">
                                            <AutoGrowTextarea
                                                className={styles.notesTextarea}
                                                value={personDraft.notes ?? ""}
                                                onChange={(e) => setPersonDraft({ ...personDraft, notes: e.target.value })}
                                                placeholder="Notes about this person (internal)…"
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </section>

                            <section className={lockableSectionClass}>
                                <SectionHeader
                                    title="Location"
                                    subtitle={assignmentsLocked ? "Locked until person is saved." : "Optional. Can be saved later."}
                                    right={dirty.location ? <span className={styles.secDirty}>Edited</span> : null}
                                />

                                {assignmentsLocked ? (
                                    <BlockedBanner title="Locked" message="Save the person first to enable Location fields." />
                                ) : null}

                                <div className={cx(styles.grid2, assignmentsLocked ? styles.lockedFields : "")}>
                                    <Field label="Region ID" hint="optional">
                                        <Input
                                            value={locationDraft.region_id ?? ""}
                                            onChange={(e) => setLocationDraft({ ...locationDraft, region_id: e.target.value })}
                                            placeholder="region_id"
                                            disabled={lockDisabled}
                                        />
                                    </Field>

                                    <Field label="Office ID" hint="optional">
                                        <Input
                                            value={locationDraft.office_id ?? ""}
                                            onChange={(e) => setLocationDraft({ ...locationDraft, office_id: e.target.value })}
                                            placeholder="office_id"
                                            disabled={lockDisabled}
                                        />
                                    </Field>
                                </div>
                            </section>

                            <section className={lockableSectionClass}>
                                <SectionHeader
                                    title="Activity"
                                    subtitle={assignmentsLocked ? "Locked until person is saved." : "Optional. Can be saved later."}
                                    right={dirty.activity ? <span className={styles.secDirty}>Edited</span> : null}
                                />

                                {assignmentsLocked ? (
                                    <BlockedBanner title="Locked" message="Save the person first to enable Activity fields." />
                                ) : null}

                                <div className={cx(styles.grid2, styles.alignEnd, assignmentsLocked ? styles.lockedFields : "")}>
                                    <Field label="Active" hint="optional">
                                        <Toggle
                                            value={activityDraft.active_flag}
                                            onChange={(v) => setActivityDraft({ ...activityDraft, active_flag: v })}
                                            disabled={lockDisabled}
                                        />
                                    </Field>

                                    <Field label="Tech ID" hint="optional">
                                        <Input
                                            value={activityDraft.tech_id ?? ""}
                                            onChange={(e) => setActivityDraft({ ...activityDraft, tech_id: e.target.value })}
                                            placeholder="tech_id"
                                            disabled={lockDisabled}
                                        />
                                    </Field>
                                </div>
                            </section>

                            <section className={cx(styles.sec, styles.secFuture)}>
                                <SectionHeader title="Schedule" subtitle="Future (disabled)" />
                                <BlockedBanner title="Not enabled" message="Schedule module will be implemented later." />
                            </section>

                            <div className={styles.ovBottomPad} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
