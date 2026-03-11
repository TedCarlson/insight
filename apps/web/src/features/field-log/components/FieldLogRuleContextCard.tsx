"use client";

function fmtBool(value: boolean | null | undefined) {
  if (value == null) return "—";
  return value ? "Yes" : "No";
}

type PhotoRequirement = {
  photo_label_key: string;
  label: string;
  required: boolean;
  sort_order: number;
};

export function FieldLogRuleContextCard(props: {
  minPhotoCount: number | null | undefined;
  xmAllowed: boolean | null | undefined;
  commentRequired: boolean | null | undefined;
  locationRequired: boolean | null | undefined;
  toleranceMeters: number | null | undefined;
  showUcode: boolean | null | undefined;
  selectedUcode: string | null | undefined;
  photoRequirements: PhotoRequirement[] | null | undefined;
}) {
  const {
    minPhotoCount,
    xmAllowed,
    commentRequired,
    locationRequired,
    toleranceMeters,
    showUcode,
    selectedUcode,
    photoRequirements,
  } = props;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Rule Context</div>

      <div className="mt-3 space-y-2 text-sm">
        <div>Min Photos: {minPhotoCount ?? 0}</div>
        <div>XM Allowed: {fmtBool(xmAllowed)}</div>
        <div>Comment Required: {fmtBool(commentRequired)}</div>
        <div>Location Required: {fmtBool(locationRequired)}</div>
        <div>
          Tolerance:{" "}
          {toleranceMeters != null ? `${toleranceMeters}m` : "—"}
        </div>

        {showUcode ? (
          <div>Selected U-Code: {selectedUcode ?? "—"}</div>
        ) : null}
      </div>

      {photoRequirements?.length ? (
        <div className="mt-4">
          <div className="mb-2 text-sm font-medium">Photo Requirements</div>

          <div className="space-y-2 text-sm text-muted-foreground">
            {photoRequirements.map((item) => (
              <div key={item.photo_label_key}>
                {item.label} {item.required ? "• required" : "• optional"}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}