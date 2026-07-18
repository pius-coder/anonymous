"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PageState } from "@/components/ui/PageState";
import { supportCases } from "./support-data";

export function SupportQueue() {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("Toutes");
  const filtered = useMemo(
    () =>
      supportCases.filter((item) => {
        const search = query.toLocaleLowerCase("fr");
        return (
          (priority === "Toutes" || item.priority === priority) &&
          [item.id, item.player, item.title].some((value) =>
            value.toLocaleLowerCase("fr").includes(search),
          )
        );
      }),
    [priority, query],
  );

  return (
    <Card className="min-h-0 flex-1">
      <CardHeader className="border-b-2">
        <CardTitle>Demandes prioritaires</CardTitle>
        <CardDescription>
          Recherche limitée aux références, joueurs et parties autorisés.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative">
            <span className="sr-only">Rechercher un dossier</span>
            <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Dossier, joueur ou motif…"
            />
          </label>
          <NativeSelect
            className="w-full"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            aria-label="Filtrer par priorité"
          >
            <NativeSelectOption>Toutes</NativeSelectOption>
            <NativeSelectOption>Urgent</NativeSelectOption>
            <NativeSelectOption>Finance</NativeSelectOption>
            <NativeSelectOption>Normal</NativeSelectOption>
          </NativeSelect>
        </div>
        {filtered.length === 0 ? (
          <PageState
            kind="empty"
            title="Aucun dossier"
            message="Aucun dossier autorisé ne correspond à ces critères."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setPriority("Toutes");
                }}
              >
                Réinitialiser
              </Button>
            }
          />
        ) : (
          <div className="min-h-0 space-y-2 overflow-auto">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 rounded border-2 bg-muted/20 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="grid size-9 place-items-center rounded border-2 bg-background">
                  <UserRoundCheck className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                    <Badge variant="outline">{item.priority}</Badge>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                  <h2 className="truncate font-medium">{item.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {item.player} · {item.updated}
                  </p>
                </div>
                <Button
                  variant="outline"
                  render={<Link href={`/support/parties/${item.partyId}`} />}
                >
                  Ouvrir <ArrowRight />
                </Button>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
