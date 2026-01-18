import InviteUserForm from "./InviteUserForm";

export default function OpsPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-[var(--to-ink)]">Ops</h1>
      <p className="mt-2 text-sm text-[var(--to-ink-muted)]">
        Minimal ops surface (temporary): invite flow for test users.
      </p>

      <div className="mt-6">
        <InviteUserForm />
      </div>
    </main>
  );
}
