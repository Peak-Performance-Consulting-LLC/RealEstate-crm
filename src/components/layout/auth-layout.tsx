import type { PropsWithChildren } from "react";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-hero-mesh">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="flex flex-col justify-between rounded-[2rem] bg-slate-950/90 p-8 text-white shadow-soft">
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              Phase 1 Foundations
            </span>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
              AI-first CRM infrastructure for high-velocity real estate teams.
            </h1>
            <p className="max-w-xl text-base text-slate-300">
              Start with tenant isolation, pipeline control, lead visibility, and activity foundations that are ready for automation and AI later.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Workspace-safe data access",
              "Unified lead timeline foundation",
              "Edge function first business writes",
            ].map((item) => (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>
        <section className="flex items-center justify-center">{children}</section>
      </div>
    </div>
  );
}
