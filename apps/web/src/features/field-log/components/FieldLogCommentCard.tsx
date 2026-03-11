"use client";

export function FieldLogCommentCard(props: {
  comment: string | null;
  followupNote: string | null;
}) {
  const { comment, followupNote } = props;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="text-base font-semibold">Comment</div>
      <div className="mt-3 text-sm text-muted-foreground">
        {comment?.trim() ? comment : "No comment provided."}
      </div>

      {followupNote ? (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <div className="font-medium">Follow-up Note</div>
          <div className="mt-1">{followupNote}</div>
        </div>
      ) : null}
    </section>
  );
}