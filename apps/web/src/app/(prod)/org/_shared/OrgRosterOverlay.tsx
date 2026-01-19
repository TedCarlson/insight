// apps/web/src/app/(prod)/org/_shared/OrgRosterOverlay.tsx

"use client";

import { useEffect, useState } from "react";
import AdminOverlay from "../../_shared/AdminOverlay";
import type { MasterRosterRow } from "./OrgRosterPanel";

import { OrgRosterSegmentPerson } from "./OrgRosterSegmentPerson";
import { OrgRosterSegmentAssignment } from "./OrgRosterSegmentAssignment";
import { OrgRosterSegmentLeadership } from "./OrgRosterSegmentLeadership";
import { OrgRosterSegmentSchedule } from "./OrgRosterSegmentSchedule";

type Mode = "add" | "edit";

type PositionTitleRow = {
  position_title: string;
  sort_order?: number | null;
  active?: boolean | null;
};

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Prevents: Unexpected token '<' ... is not valid JSON
 * by checking the Content-Type first and surfacing a readable error.
 */
async function fetchJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    const text = await res.text().catch(() => "");
    const preview = (text || "").slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `API returned non-JSON (${res.status} ${res.statusText}). ` +
        `This usually means a wrong route or redirect. Preview: ${preview || "—"}`
    );
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error((json && (json.error || json.message)) || `Request failed (${res.status})`);
  }
  return json;
}

export function OrgRosterOverlay(props: {
  open: boolean;
  mode: Mode;
  pcOrgId: string;
  row?: MasterRosterRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isAdd = props.mode === "add";

  // shared
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // person selection (add)
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");

  // assignment
  const [techId, setTechId] = useState<string>("");
  const [positionTitle, setPositionTitle] = useState<string>("Rep");
  const [startDate, setStartDate] = useState<string>(isoToday());
  const [endDate, setEndDate] = useState<string>("");

  // titles
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [titles, setTitles] = useState<PositionTitleRow[]>([]);

  // TODO(grants): replace these with role + edge task grants
  const canCreatePerson = true;
  const canEditAssignment = true;
  const canEditLeadership = false; // start read-only until you wire the existing update path
  const canEditSchedule = true;

  // init/reset on open
  useEffect(() => {
    if (!props.open) return;

    setError(null);
    setSaving(false);

    // load titles
    (async () => {
      setTitlesLoading(true);
      try {
        const json = await fetchJson<{ ok: boolean; titles: PositionTitleRow[]; error?: string }>(
          "/api/meta/position-titles",
          { method: "GET" }
        );
        if (!json.ok) throw new Error(json.error || "Failed to load position titles");
        setTitles(json.titles || []);
      } catch (e: any) {
        setTitles([]);
        setError(e?.message || "Failed to load position titles");
      } finally {
        setTitlesLoading(false);
      }
    })();

    if (isAdd) {
      setSelectedPersonId("");
      setTechId("");
      setPositionTitle("Rep");
      setStartDate(isoToday());
      setEndDate("");
      return;
    }

    const r = props.row;
    setSelectedPersonId(r?.person_id || "");
    setTechId(r?.tech_id || "");
    setPositionTitle(r?.position_title || "Rep");
    setStartDate((r?.start_date as any) || "");
    setEndDate((r?.end_date as any) || "");
  }, [props.open, isAdd, props.row]);

  // scheduling lock should reflect current form state
  const isTech = (positionTitle ?? "").trim().toLowerCase() === "technician";
  const isActive = !!props.row?.assignment_active;
  const missingTechId = !techId || techId.trim() === "";
  const schedulingLocked = !isAdd && isActive && isTech && missingTechId;

  async function submitAssignment() {
    if (!canEditAssignment) return;

    setSaving(true);
    setError(null);
    try {
      if (isAdd) {
        if (!selectedPersonId) throw new Error("Select a person (or create one).");
        if (!positionTitle) throw new Error("Select a position title");
        if (!startDate) throw new Error("Start date is required");

        const json = await fetchJson<{ ok: boolean; error?: string }>("/api/org/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pc_org_id: props.pcOrgId,
            person_id: selectedPersonId,
            position_title: positionTitle,
            start_date: startDate,
            tech_id: techId || null,
          }),
        });

        if (!json.ok) throw new Error(json.error || "Assign failed");

        props.onSaved();
        props.onClose();
        return;
      }

      const assignment_id = props.row?.assignment_id;
      if (!assignment_id) throw new Error("Missing assignment_id");
      if (!positionTitle) throw new Error("Select a position title");

      const normalizedEndDate = endDate?.trim() ? endDate.trim() : null;
      const active = normalizedEndDate ? false : true;

      const json = await fetchJson<{ ok: boolean; error?: string }>("/api/org/assignment/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id,
          tech_id: techId || null,
          position_title: positionTitle || null,
          start_date: startDate || null,
          end_date: normalizedEndDate,
          active,
        }),
      });

      if (!json.ok) throw new Error(json.error || "Update failed");

      props.onSaved();
      // keep overlay open in edit mode
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!props.open) return null;

  const title = isAdd ? "Add to Roster" : "Edit Roster Entry";
  const subtitle = isAdd
    ? "Select a person and create an assignment in this org."
    : "Edit assignment details and person schedule.";

  return (
    <AdminOverlay
      open={props.open}
      onClose={props.onClose}
      title={title}
      subtitle={subtitle}
      mode={isAdd ? "create" : "edit"}
      widthClassName="w-full max-w-4xl"
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Roster</div>

      <div className="space-y-6">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {/* 1) Person */}
        <OrgRosterSegmentPerson
          isAdd={isAdd}
          row={props.row}
          selectedPersonId={selectedPersonId}
          onSelectPersonId={setSelectedPersonId}
          onError={setError}
          saving={saving}
          canCreatePerson={canCreatePerson}
        />

        {/* 2) Assignment */}
        <OrgRosterSegmentAssignment
          pcOrgId={props.pcOrgId}
          pcOrgName={props.row?.pc_org_name || null}
          reportsToName={props.row?.reports_to_full_name || null}
          titles={titles}
          titlesLoading={titlesLoading}
          positionTitle={positionTitle}
          setPositionTitle={setPositionTitle}
          techId={techId}
          setTechId={setTechId}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          isAdd={isAdd}
          saving={saving}
          canEditAssignment={canEditAssignment}
          schedulingLocked={schedulingLocked}
          onCancel={props.onClose}
          onSave={submitAssignment}
        />

        {/* 3) Leadership */}
        <OrgRosterSegmentLeadership
          row={props.row}
          isAdd={isAdd}
          canEditLeadership={canEditLeadership}
          onRequestEdit={() => {
            // TODO(grants + wiring): connect to existing leadership update mechanism (no new /org APIs).
            setError("Leadership editing is not wired yet (pending existing update path).");
          }}
        />

        {/* 4) Schedule */}
        <OrgRosterSegmentSchedule
          isAdd={isAdd}
          pcOrgId={props.pcOrgId}
          assignmentId={props.row?.assignment_id || null}
          assignmentActive={props.row?.assignment_active ?? null}
          positionTitle={positionTitle}
          techId={techId}
          canEditSchedule={canEditSchedule}
          onError={setError}
        />
      </div>
    </AdminOverlay>
  );
}
