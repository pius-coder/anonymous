"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Gamepad2, RefreshCw, Search, Users } from "lucide-react";
import {
  listPublicParties,
  sessionQueryKeys,
} from "@/services/session/sessionAdapter";
import type { PublicPartyCard, PublicPartyStatus } from "@/services/session/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/PageState";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusLabel: Record<PublicPartyStatus, string> = {
  scheduled: "À venir",
  preparation: "Préparation",
  live: "Live",
  review: "Vérification",
  published: "Publiée",
  unknown: "Statut",
};

type Props = {
  /** Optional static list (tests); default loads real public catalogue. */
  parties?: PublicPartyCard[];
};

export function PartyCatalogue({ parties: injected }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const catalogueQuery = useQuery({
    queryKey: sessionQueryKeys.catalogue(),
    queryFn: async () => {
      const result = await listPublicParties({ skip: 0, take: 50 });
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    enabled: injected === undefined,
    staleTime: 30_000,
  });

  const parties = useMemo(
    () => injected ?? catalogueQuery.data?.parties ?? [],
    [injected, catalogueQuery.data?.parties],
  );

  const visible = useMemo(
    () =>
      parties.filter((party) => {
        const matchesQuery = `${party.name} ${party.code} ${party.game}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter = filter === "all" || party.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [filter, parties, query],
  );

  if (injected === undefined && catalogueQuery.isLoading) {
    return (
      <PageState
        kind="loading"
        title="Chargement du catalogue"
        message="Récupération des parties publiées…"
      />
    );
  }

  if (injected === undefined && catalogueQuery.isError) {
    const message =
      catalogueQuery.error instanceof Error
        ? catalogueQuery.error.message
        : "Le catalogue est temporairement indisponible.";
    return (
      <PageState
        kind="error"
        title="Catalogue indisponible"
        message={message}
        action={
          <Button type="button" onClick={() => void catalogueQuery.refetch()}>
            <RefreshCw /> Réessayer
          </Button>
        }
      />
    );
  }

  if (parties.length === 0) {
    return (
      <PageState
        kind="empty"
        title="Aucune partie publiée"
        message="Revenez plus tard ou demandez à un organisateur de publier une session."
        action={
          injected === undefined ? (
            <Button type="button" variant="outline" onClick={() => void catalogueQuery.refetch()}>
              <RefreshCw /> Actualiser
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="catalogue-stack">
      <div className="catalogue-toolbar">
        <div className="table-search catalogue-search">
          <Search />
          <Input
            placeholder="Nom, code ou mini-jeu…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={filter} onValueChange={(value) => setFilter(String(value))}>
            <TabsList>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="scheduled">À venir</TabsTrigger>
              <TabsTrigger value="preparation">Préparation</TabsTrigger>
              <TabsTrigger value="live">Live</TabsTrigger>
            </TabsList>
          </Tabs>
          {injected === undefined ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={catalogueQuery.isFetching}
              onClick={() => void catalogueQuery.refetch()}
            >
              <RefreshCw className={catalogueQuery.isFetching ? "animate-spin" : undefined} />
              {catalogueQuery.isStale ? "Données à actualiser" : "Actualiser"}
            </Button>
          ) : null}
        </div>
      </div>

      {catalogueQuery.isFetching && !catalogueQuery.isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Mise à jour du catalogue…
        </p>
      ) : null}

      {visible.length === 0 ? (
        <PageState
          kind="empty"
          title="Aucun résultat"
          message="Aucune partie ne correspond à votre recherche ou filtre."
        />
      ) : (
        <section className="catalogue-grid" aria-label="Sessions disponibles">
          {visible.map((party) => (
            <PartyCard key={party.id} party={party} />
          ))}
        </section>
      )}
    </div>
  );
}

function PartyCard({ party }: { party: PublicPartyCard }) {
  const capacity = Math.max(party.capacity, 0);
  const progress = capacity > 0 ? Math.min(100, (party.players / capacity) * 100) : 0;
  const full = capacity > 0 && party.players >= capacity;

  return (
    <Card className="party-card">
      <CardHeader>
        <div className="party-card-topline">
          <Badge variant="outline" className={`status-badge status-badge--${party.status}`}>
            {statusLabel[party.status]}
          </Badge>
          <Badge variant="outline">{party.entryFee}</Badge>
        </div>
        <CardTitle>{party.name}</CardTitle>
        <CardDescription>{party.code}</CardDescription>
      </CardHeader>
      <CardContent className="party-card-body">
        <div className="party-meta">
          <Gamepad2 />
          <span>{party.game}</span>
        </div>
        <div className="party-meta">
          <CalendarClock />
          <span>{party.startsAt}</span>
        </div>
        <div className="party-capacity">
          <div>
            <span>
              <Users /> Joueurs
            </span>
            <strong>
              {party.players}/{capacity || "—"}
            </strong>
          </div>
          <Progress value={progress} />
        </div>
        {full ? <p className="text-sm text-muted-foreground">Partie complète</p> : null}
      </CardContent>
      <CardFooter>
        <Button
          render={<Link href={`/parties/${party.code}`} />}
          className="w-full"
          variant={party.status === "live" ? "default" : "secondary"}
        >
          Voir la session <ArrowRight />
        </Button>
      </CardFooter>
    </Card>
  );
}
