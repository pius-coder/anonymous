import type { ReactNode } from "react";

export function AdminMetricSection({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/36">{eyebrow}</p>
          <h2 className="retro-title mt-1 text-xl font-black">{title}</h2>
        </div>
        <span className="status-dot text-[--arena-green]" aria-label="Données synchronisées" />
      </div>
      {children}
    </section>
  );
}
