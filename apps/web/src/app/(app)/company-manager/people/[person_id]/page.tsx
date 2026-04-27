// path: apps/web/src/app/(app)/company-manager/people/[person_id]/page.tsx

type Props = {
  params: Promise<{
    person_id: string;
  }>;
};

export default async function CompanyManagerPersonRecordPage({ params }: Props) {
  const { person_id } = await params;

  return (
    <main className="space-y-4 p-6">
      <section className="rounded-2xl border bg-background p-5">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          People
        </div>
        <h1 className="mt-1 text-xl font-semibold">Person Record</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Person editor pending. This route is now wired for:
        </p>
        <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
          {person_id}
        </div>
      </section>
    </main>
  );
}