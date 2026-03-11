"use client";

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtBool(value: boolean | null | undefined) {
  if (value == null) return "—";
  return value ? "Yes" : "No";
}

export function FieldLogSubmissionCard(props: {
  createdAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  photoCount: number;
  evidenceDeclared: string | null;
  xmDeclared: boolean;
  xmLinkValid: boolean;
  xmLink: string | null;
  pcOrgId: string | null | undefined;
}) {
  const {
    createdAt,
    submittedAt,
    approvedAt,
    photoCount,
    evidenceDeclared,
    xmDeclared,
    xmLinkValid,
    xmLink,
    pcOrgId,
  } = props;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Submission</div>
      <div className="mt-3 space-y-2 text-sm">
        <div>Created: {fmtDate(createdAt)}</div>
        <div>Submitted: {fmtDate(submittedAt)}</div>
        <div>Approved: {fmtDate(approvedAt)}</div>
        <div>Photos: {photoCount}</div>
        <div>Evidence Declared: {evidenceDeclared ?? "—"}</div>
        <div>XM Declared: {fmtBool(xmDeclared)}</div>
        <div>XM Valid: {fmtBool(xmLinkValid)}</div>
        <div>XM Link: {xmLink ?? "—"}</div>
        <div>PC Org: {pcOrgId ?? "—"}</div>
      </div>
    </section>
  );
}