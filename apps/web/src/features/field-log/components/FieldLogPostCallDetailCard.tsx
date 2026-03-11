"use client";

function fmtBool(value: boolean | null | undefined) {
  if (value == null) return "—";
  return value ? "Yes" : "No";
}

export function FieldLogPostCallDetailCard(props: {
  visible: boolean;
  riskLevel: string | null;
  tnpsRiskFlag: boolean | null;
  followupRecommended: boolean | null;
}) {
  const { visible, riskLevel, tnpsRiskFlag, followupRecommended } = props;

  if (!visible) return null;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Post Call Detail</div>

      <div className="mt-3 space-y-2 text-sm">
        <div>Risk Level: {riskLevel ?? "—"}</div>
        <div>TNPS Risk: {fmtBool(tnpsRiskFlag)}</div>
        <div>Follow-up Recommended: {fmtBool(followupRecommended)}</div>
      </div>
    </section>
  );
}