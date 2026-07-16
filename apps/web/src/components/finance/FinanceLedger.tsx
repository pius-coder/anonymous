"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PageState } from "@/components/ui/PageState";
import { paymentApi } from "@/services/payment/payment-api";
import { mapPaymentToFinanceRow } from "./finance-data";
import { TransactionTable } from "./TransactionTable";

export function FinanceLedger() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tous");
  const [exported, setExported] = useState(false);

  const listQuery = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const res = await paymentApi.listAdminPayments({ take: 100 });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  const rows = useMemo(
    () => (listQuery.data?.transactions ?? []).map(mapPaymentToFinanceRow),
    [listQuery.data],
  );

  const filtered = useMemo(
    () =>
      rows.filter((item) => {
        const search = query.toLocaleLowerCase("fr");
        return (
          (status === "Tous" || item.reconciliation === status) &&
          [item.id, item.user, item.party, item.providerRef, item.idempotency].some((value) =>
            value.toLocaleLowerCase("fr").includes(search),
          )
        );
      }),
    [query, status, rows],
  );

  return (
    <Card className="dashboard-table-card">
      <CardHeader className="border-b-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Ledger et mouvements</CardTitle>
            <CardDescription>
              Données serveur (finance read-only). La réconciliation est une commande audité
              séparée.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => setExported(true)} disabled={!filtered.length}>
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
        {listQuery.isLoading ? (
          <PageState kind="loading" title="Chargement finance" message="Lecture des transactions serveur…" />
        ) : null}
        {listQuery.isError ? (
          <PageState
            kind="error"
            title="Finance indisponible"
            message={(listQuery.error as Error).message}
          />
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
        {!listQuery.isLoading && !listQuery.isError && filtered.length ? (
          <TransactionTable transactions={filtered} showAction />
        ) : null}
        {!listQuery.isLoading && !listQuery.isError && !filtered.length ? (
          <PageState
            kind="empty"
            title="Aucun mouvement"
            message="Aucune transaction ne correspond aux filtres, ou le ledger est vide."
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
