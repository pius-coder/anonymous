"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LockKeyhole, Trophy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/PageState";
import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoringService } from "@/services/rpcServices";
import { observerPublishedResultsFromRpc } from "./observer-view-model";

type PublishedResultsRpcData = {
  finalScores?: Array<{
    playerId?: { value?: string };
    score?: number;
    rank?: number;
    eliminated?: boolean;
  }>;
  publishedAt?: { seconds: bigint; nanos: number };
};

export function ObserverResults({ partyId }: { partyId: string }) {
  const resultsQuery = useQuery({
    queryKey: ["observer", "published-results", partyId],
    enabled: Boolean(partyId),
    queryFn: async () => {
      const result = await ScoringService.published(partyId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return observerPublishedResultsFromRpc(result.data as PublishedResultsRpcData);
    },
    refetchInterval: 8_000,
  });

  if (resultsQuery.isLoading) {
    return (
      <PageState
        kind="loading"
        title="Chargement des résultats publics"
        message="Vérification de la publication officielle pour l’audience observateur."
      />
    );
  }

  if (resultsQuery.isError) {
    return (
      <PageState
        kind="error"
        title="Résultats publics indisponibles"
        message={(resultsQuery.error as Error).message}
        action={
          <Button variant="outline" onClick={() => void resultsQuery.refetch()}>
            Réessayer
          </Button>
        }
      />
    );
  }

  const results = resultsQuery.data;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReadonlyBadge label="Résultats publics" />
        <Button variant="outline" render={<Link href={`/observe/parties/${partyId}`} />}>
          <ArrowLeft /> Retour au direct
        </Button>
      </div>
      {!results?.published ? (
        <Alert status="info">
          <LockKeyhole />
          <AlertTitle>Résultats en attente</AlertTitle>
          <AlertDescription>
            Le classement n’est pas encore publié. Aucun score provisoire n’est visible dans cet
            espace.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Classement officiel</CardTitle>
            <CardDescription>
              Version publiée{results.publishedAt ? ` · ${new Date(results.publishedAt).toLocaleString("fr-FR")}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rang</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Score officiel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.rows.map((row) => (
                  <TableRow key={row.rank}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 font-head">
                        {row.rank === 1 ? <Trophy className="size-4 text-primary" /> : null}#
                        {row.rank}
                      </span>
                    </TableCell>
                    <TableCell>{row.player}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
