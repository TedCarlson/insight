"use client";

type Attachment = {
  attachment_id: string;
  photo_label_key: string | null;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  deleted_at: string | null;
};

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function FieldLogAttachmentsCard(props: {
  attachments: Attachment[];
}) {
  const { attachments } = props;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Attachments</div>

      {attachments?.length ? (
        <div className="mt-3 space-y-3">
          {attachments.map((item) => (
            <div key={item.attachment_id} className="rounded-xl border p-3 text-sm">
              <div className="font-medium">{item.file_name ?? item.file_path}</div>
              <div className="mt-1 text-muted-foreground">
                {item.photo_label_key ?? "general_evidence"}
              </div>
              <div className="mt-1 text-muted-foreground">
                Uploaded: {fmtDate(item.uploaded_at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-sm text-muted-foreground">
          No attachments recorded.
        </div>
      )}
    </section>
  );
}