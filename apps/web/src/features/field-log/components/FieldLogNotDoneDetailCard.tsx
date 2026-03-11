"use client";

function fmtBool(value: boolean | null | undefined) {
  if (value == null) return "—";
  return value ? "Yes" : "No";
}

export function FieldLogNotDoneDetailCard(props: {
  visible: boolean;
  selectedUcode: string | null;
  customerContactAttempted: boolean | null;
  accessIssue: boolean | null;
  safetyIssue: boolean | null;
  escalationRequired: boolean | null;
  escalationType: string | null;
}) {
  const {
    visible,
    selectedUcode,
    customerContactAttempted,
    accessIssue,
    safetyIssue,
    escalationRequired,
    escalationType,
  } = props;

  if (!visible) return null;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Not Done / U-Code Detail</div>

      <div className="mt-3 space-y-2 text-sm">
        <div>Selected U-Code: {selectedUcode ?? "—"}</div>
        <div>
          Customer Contact Attempted: {fmtBool(customerContactAttempted)}
        </div>
        <div>Access Issue: {fmtBool(accessIssue)}</div>
        <div>Safety Issue: {fmtBool(safetyIssue)}</div>
        <div>Escalation Required: {fmtBool(escalationRequired)}</div>
        <div>Escalation Type: {escalationType ?? "—"}</div>
      </div>
    </section>
  );
}