import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export function AdminKpiCard({
  label,
  value,
  icon: Icon,
  accent = "var(--arena-cyan)",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <Card className="group overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-white/40">Indicateur</p>
          <CardTitle className="mt-1 text-sm font-semibold text-white/62">{label}</CardTitle>
        </div>
        <div
          className="grid size-10 place-items-center rounded-2xl border border-white/12 bg-white/5 shadow-sm transition group-hover:-translate-y-0.5"
          style={{ color: accent }}
        >
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-head text-3xl font-black tracking-tight" style={{ color: accent }}>{value}</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-2/3 rounded-full opacity-60" style={{ backgroundColor: accent }} />
        </div>
      </CardContent>
    </Card>
  );
}
