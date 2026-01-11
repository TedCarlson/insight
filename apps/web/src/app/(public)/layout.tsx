export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white">
      <div
        className="fixed inset-0 bg-center bg-no-repeat bg-cover opacity-60"
        style={{ backgroundImage: "url(/bg.jpg)" }}
      />
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative min-h-screen w-full flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-black/40 backdrop-blur border border-white/10 shadow-xl p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
