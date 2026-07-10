import Link from "next/link";
import { SessionService } from "@/services/sessions/SessionService";
import type { CatalogueSession } from "@/services/sessions/types";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import SessionCard from "@/components/SessionCard";

const LIMIT = 20;

const FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "open", label: "Ouvertes" },
  { key: "live", label: "En cours" },
  { key: "today", label: "Aujourd'hui" },
  { key: "capacity", label: "Capacité" },
] as const;

export async function CatalogueGridContent({ page, filter }: { page: number; filter: string }) {
  const sessionService = new SessionService();
  const result = await sessionService.getCatalogue({ page: String(page), limit: String(LIMIT), filter });
  const sessions = result.sessions ?? [];
  const total = result.total ?? sessions.length;
  const totalPages = Math.ceil(total / LIMIT);

  if (sessions.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <FiltersRow filter={filter} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-4xl">🎮</p>
          <p className="font-head text-lg font-black uppercase">Aucune session</p>
          <p className="max-w-xs text-sm text-muted-foreground">Aucune session ne correspond à ce filtre.</p>
          <Link href="/catalogue?filter=all"><Button variant="outline" size="sm">Voir toutes</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <FiltersRow filter={filter} />
      <div className="flex items-center justify-between border-b-2 border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{total} session(s)</Badge>
          <Badge>{sessions.length} affichée(s)</Badge>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session: CatalogueSession) => (
            <SessionCard key={session.code} {...session} />
          ))}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t-2 border-border px-6 py-3">
          {page > 1 && (
            <Link href={`/catalogue?filter=${filter}&page=${page - 1}`}>
              <Button variant="outline" size="sm">Précédent</Button>
            </Link>
          )}
          <Badge variant="outline">{page} / {totalPages}</Badge>
          {page < totalPages && (
            <Link href={`/catalogue?filter=${filter}&page=${page + 1}`}>
              <Button variant="outline" size="sm">Suivant</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FiltersRow({ filter }: { filter: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b-2 border-border px-6 py-3">
      <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtres</span>
      {FILTERS.map((f) => {
        const active = f.key === filter;
        return (
          <Link key={f.key} href={`/catalogue?filter=${f.key}`}>
            <Button size="sm" variant={active ? "default" : "outline"} className="h-7 text-xs">
              {f.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
