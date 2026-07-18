"use client";

import { useQuery } from "@tanstack/react-query";
import { Boxes, Code2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniGameService } from "@/services/rpcServices";

type CatalogGame = {
  id: string;
  name?: string;
  family?: string;
  version?: string | number;
  status?: string;
};

function normalizeCatalog(data: unknown): CatalogGame[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as CatalogGame[];
  if (typeof data === "object" && data !== null) {
    const obj = data as { minigames?: CatalogGame[]; games?: CatalogGame[]; items?: CatalogGame[] };
    return obj.minigames ?? obj.games ?? obj.items ?? [];
  }
  return [];
}

export default function AdminMinigamesPage() {
  const catalogQuery = useQuery({
    queryKey: ["admin", "minigames"],
    queryFn: async () => {
      const res = await MiniGameService.list();
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return normalizeCatalog(res.data);
    },
    retry: 1,
  });

  const games = catalogQuery.data ?? [];

  return (
    <AppShell
      audience="Admin"
      eyebrow="Catalogue runtime"
      title="Mini-jeux"
      subtitle="Manifestes exposés par l’API publique. Composition six jeux prouvée par P-SEQ-06."
    >
      {catalogQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement du catalogue…</p>
      ) : null}
      {catalogQuery.isError ? (
        <p className="text-sm text-rose-300" role="alert">
          Catalogue indisponible:{" "}
          {catalogQuery.error instanceof Error ? catalogQuery.error.message : "erreur"}
        </p>
      ) : null}
      {!catalogQuery.isLoading && !catalogQuery.isError && games.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun manifeste disponible. Aucune donnée fictive n’est affichée.
        </p>
      ) : null}
      {games.length > 0 ? (
        <div className="minigame-grid">
          {games.map((game) => (
            <Card key={game.id} className="minigame-card">
              <CardHeader>
                <div className="minigame-glyph">
                  <Boxes />
                </div>
                <CardTitle>{game.name ?? game.id}</CardTitle>
                <CardDescription>{game.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="minigame-tags">
                  {game.family ? <Badge variant="outline">{game.family}</Badge> : null}
                  {game.version != null ? (
                    <Badge variant="outline">v{String(game.version)}</Badge>
                  ) : null}
                  {game.status ? <Badge>{game.status}</Badge> : null}
                </div>
                <div className="minigame-rule">
                  <Code2 />
                  <span>
                    <small>Resolver</small>
                    <strong>{game.id}</strong>
                  </span>
                </div>
                <div className="minigame-rule">
                  <ShieldCheck />
                  <span>
                    <small>Politique</small>
                    <strong>Server authoritative</strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
