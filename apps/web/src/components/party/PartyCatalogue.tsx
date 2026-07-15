"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Gamepad2, Search, Users } from "lucide-react";
import type { UiParty } from "@/lib/ui-data";
import { StatusBadge } from "@/components/dashboard/PartyDataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PartyCatalogue({ parties }: { parties: UiParty[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = useMemo(() => parties.filter((party) => {
    const matchesQuery = `${party.name} ${party.code} ${party.game}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || party.status === filter;
    return matchesQuery && matchesFilter;
  }), [filter, parties, query]);

  return (
    <div className="catalogue-stack">
      <div className="catalogue-toolbar">
        <div className="table-search catalogue-search">
          <Search />
          <Input placeholder="Nom, code ou mini-jeu…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Tabs value={filter} onValueChange={(value) => setFilter(String(value))}>
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="scheduled">À venir</TabsTrigger>
            <TabsTrigger value="preparation">Préparation</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <section className="catalogue-grid" aria-label="Sessions disponibles">
        {visible.map((party) => (
          <Card key={party.id} className="party-card">
            <CardHeader>
              <div className="party-card-topline">
                <StatusBadge status={party.status} />
                <Badge variant="outline">{party.entryFee}</Badge>
              </div>
              <CardTitle>{party.name}</CardTitle>
              <CardDescription>{party.code}</CardDescription>
            </CardHeader>
            <CardContent className="party-card-body">
              <div className="party-meta"><Gamepad2 /><span>{party.game}</span></div>
              <div className="party-meta"><CalendarClock /><span>{party.startsAt}</span></div>
              <div className="party-capacity">
                <div><span><Users /> Joueurs</span><strong>{party.players}/{party.capacity}</strong></div>
                <Progress value={(party.players / party.capacity) * 100} />
              </div>
            </CardContent>
            <CardFooter>
              <Button render={<Link href={`/parties/${party.code}`} />} className="w-full" variant={party.status === "live" ? "default" : "secondary"}>
                Voir la session <ArrowRight />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>
    </div>
  );
}
