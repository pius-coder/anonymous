import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type AdminTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<AdminTone, string> = {
  neutral: "border-zinc-700 bg-zinc-900 text-zinc-300",
  success: "border-emerald-700/70 bg-emerald-950/50 text-emerald-300",
  warning: "border-amber-700/70 bg-amber-950/50 text-amber-200",
  danger: "border-rose-700/70 bg-rose-950/50 text-rose-200",
  info: "border-cyan-700/70 bg-cyan-950/50 text-cyan-200",
};

export function AdminStatus({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: AdminTone;
}) {
  return (
    <Badge variant="outline" className={toneClasses[tone]}>
      {children}
    </Badge>
  );
}

export function AdminMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: AdminTone;
}) {
  return (
    <div className="min-w-0 border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 text-muted-foreground">
        <p className="text-xs font-semibold uppercase">{label}</p>
        <Icon
          className={
            tone === "danger"
              ? "text-rose-400"
              : tone === "warning"
                ? "text-amber-400"
                : "text-cyan-400"
          }
          size={18}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function AdminSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-card" aria-labelledby={`section-${slug(title)}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 id={`section-${slug(title)}`} className="text-sm font-semibold text-foreground">
            {title}
          </h2>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PartyAdminNav({
  partyId,
  current,
}: {
  partyId: string;
  current: "setup" | "control" | "monitor" | "scores" | "audit" | "incidents";
}) {
  const links = [
    ["setup", "Configuration"],
    ["control", "Décider"],
    ["monitor", "Superviser"],
    ["scores", "Scores"],
    ["incidents", "Incidents"],
    ["audit", "Audit"],
  ] as const;
  return (
    <nav
      className="flex gap-1 overflow-x-auto border border-border bg-card p-1"
      aria-label="Navigation administration de la partie"
    >
      {links.map(([key, label]) => (
        <Link
          key={key}
          href={`/admin/parties/${partyId}/${key}`}
          aria-current={current === key ? "page" : undefined}
          className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors ${current === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminEmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <CircleAlert className="text-muted-foreground" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p>
      {href && action ? (
        <Button className="mt-4" size="sm" render={<Link href={href} />}>
          {action}
          <ArrowUpRight />
        </Button>
      ) : null}
    </div>
  );
}

export function AdminTable({
  headers,
  children,
  label,
}: {
  headers: string[];
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs" aria-label={label}>
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export const adminCell = "px-4 py-3 align-middle text-foreground";

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}
