"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PageState } from "@/components/ui/PageState";
import { financeTransactions } from "./finance-data";
import { TransactionTable } from "./TransactionTable";

export function FinanceLedger() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tous");
  const [exported, setExported] = useState(false);
  const filtered = useMemo(
    () =>
      financeTransactions.filter((item) => {
        const search = query.toLocaleLowerCase("fr");
        return (
          (status === "Tous" || item.reconciliation === status) &&
          [item.id, item.user, item.party, item.providerRef, item.idempotency].some((value) =>
            value.toLocaleLowerCase("fr").includes(search),
          )
        );
      }),
    [query, status],
  );

  return (
    <Card className="dashboard-table-card">
      <CardHeader className="border-b-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Ledger et mouvements</CardTitle>
            <CardDescription>
              Recherche par transaction, joueur, partie ou référence redigée.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => setExported(true)}>
            <Download /> Exporter la vue
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {exported ? (
          <p className="text-sm text-primary" role="status">
            Export local préparé avec {filtered.length} lignes autorisées.
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative">
            <span className="sr-only">Rechercher dans le ledger</span>
            <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Transaction, joueur, partie…"
            />
          </label>
          <NativeSelect
            className="w-full"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="État de rapprochement"
          >
            <NativeSelectOption>Tous</NativeSelectOption>
            <NativeSelectOption>Rapprochée</NativeSelectOption>
            <NativeSelectOption>À vérifier</NativeSelectOption>
            <NativeSelectOption>Divergente</NativeSelectOption>
          </NativeSelect>
        </div>
        {filtered.length ? (
          <TransactionTable transactions={filtered} showAction />
        ) : (
          <PageState
            kind="empty"
            title="Aucun mouvement"
            message="Aucune transaction autorisée ne correspond à la recherche."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus("Tous");
                }}
              >
                Réinitialiser
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
