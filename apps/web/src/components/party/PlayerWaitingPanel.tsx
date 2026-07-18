"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoringService } from "@/services/rpcServices";

type PlayerWaitingPanelProps = {
  partyId: string;
  partyCode: string;
};

/**
 * Explicit waiting surface while provisional scores exist but are not published.
 * Never requests or renders provisional scores (AC-13-01).
 */
export function PlayerWaitingPanel({ partyId, partyCode }: PlayerWaitingPanelProps) {
  const router = useRouter();
  const publishedQuery = useQuery({
    queryKey: ["player", "published-results", partyId],
    enabled: Boolean(partyId),
    queryFn: async () => {
      const result = await ScoringService.published(partyId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    refetchInterval: 8_000,
  });

  const published =
    (publishedQuery.data?.finalScores?.length ?? 0) > 0 &&
    Boolean(publishedQuery.data?.publishedAt);

  if (published) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Résultats publiés</CardTitle>
          <CardDescription>
            L&apos;administrateur a publié le classement officiel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => router.push(`/parties/${partyCode}/results`)}>
            Voir mes résultats
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Prochaine étape</CardTitle>
        <CardDescription>
          Les scores et rangs restent invisibles pendant la vérification. La publication peut
          rester bloquée par une revue admin ou une preuve runtime incomplète, sans jamais
          transmettre de score provisoire à cette vue.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => void publishedQuery.refetch()}
          disabled={publishedQuery.isFetching}
        >
          <RefreshCw /> {publishedQuery.isFetching ? "Actualisation…" : "Actualiser le statut"}
        </Button>
        <Button disabled>Résultats pas encore publiés</Button>
        <Button variant="ghost" render={<Link href="/me/tickets" />}>
          Retour à mes parties
        </Button>
      </CardContent>
      {publishedQuery.isError ? (
        <p className="px-6 pb-4 text-xs text-muted-foreground" role="status">
          Statut temporairement indisponible — réessayez.
        </p>
      ) : null}
    </Card>
  );
}
