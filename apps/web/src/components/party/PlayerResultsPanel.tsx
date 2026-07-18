"use client";

import { useQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Crown, LockKeyhole, RefreshCw, RotateCcw, Share2, Trophy } from "lucide-react";
import Link from "next/link";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { paymentApi } from "@/services/payment/payment-api";
import { ScoringService } from "@/services/rpcServices";

type PlayerResultsPanelProps = {
  partyId: string;
  partyCode: string;
  /** When true, force waiting UI even if query has not run. */
  preferWaiting?: boolean;
};

export function PlayerResultsPanel({ partyId, partyCode, preferWaiting = false }: PlayerResultsPanelProps) {
  const resultsQuery = useQuery({
    queryKey: ["player", "published-results", partyId],
    enabled: Boolean(partyId),
    queryFn: async () => {
      const result = await ScoringService.published(partyId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || !data.finalScores?.length || !data.publishedAt) return 8_000;
      return false;
    },
  });

  const ledgerQuery = useQuery({
    queryKey: ["player", "wallet-ledger", partyId],
    enabled: Boolean(partyId) && Boolean(resultsQuery.data?.publishedAt) && Boolean(resultsQuery.data?.roundId),
    queryFn: async () => {
      const result = await paymentApi.getLedger();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  const scores = resultsQuery.data?.finalScores ?? [];
  const published = scores.length > 0 && Boolean(resultsQuery.data?.publishedAt);
  const waiting = preferWaiting || !published;
  const ledgerEntries = ledgerQuery.data?.items ?? [];
  const ledgerPrize = ledgerEntries.find(
    (entry) =>
      entry.credit > 0 &&
      entry.reason.toLowerCase().includes("prize round") &&
      resultsQuery.data?.roundId &&
      entry.reason.includes(resultsQuery.data.roundId),
  );

  if (resultsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Résultats indisponibles</CardTitle>
          <CardDescription>{(resultsQuery.error as Error).message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void resultsQuery.refetch()}>
            <RefreshCw /> Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (waiting) {
    return (
      <Card>
        <CardHeader>
          <Badge variant="outline">Vérification en cours</Badge>
          <CardTitle className="mt-2 flex items-center gap-2">
            <LockKeyhole className="size-5" />
            Résultats en attente de publication
          </CardTitle>
          <CardDescription>
            Aucun score provisoire n&apos;est affiché. Le classement deviendra visible uniquement après
            la publication explicite de l&apos;administrateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => void resultsQuery.refetch()} disabled={resultsQuery.isFetching}>
            <RefreshCw /> {resultsQuery.isFetching ? "Actualisation…" : "Actualiser le statut"}
          </Button>
          <Button disabled>Résultats pas encore publiés</Button>
          <Button variant="ghost" render={<Link href={`/parties/${partyCode}/waiting`} />}>
            Écran d&apos;attente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ranking = scores
    .map((row) => ({
      id: row.playerId?.value ?? "—",
      points: row.score,
      rank: row.rank,
    }))
    .sort((a, b) => a.rank - b.rank || b.points - a.points);

  const you = ranking[0];

  function celebrate() {
    void confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.72 },
      colors: ["#69f58d", "#f1d75b", "#bd88ff", "#effff4"],
    });
  }

  return (
    <div className="results-layout">
      <Card className="result-highlight">
        <CardHeader>
          <Badge>Résultats publiés</Badge>
          <span className="result-trophy">
            <Trophy />
          </span>
          <CardTitle className="font-head text-3xl">
            {you ? `#${you.rank}` : "Classement officiel"}
          </CardTitle>
          <CardDescription>Vos scores sont désormais officiels et visibles.</CardDescription>
        </CardHeader>
        <CardContent>
          <strong className="result-points">
            {you ? you.points.toLocaleString("fr-FR") : "—"} <small>PTS</small>
          </strong>
          <div className="wallet-actions">
            <Button onClick={celebrate}>
              <Crown /> Célébrer
            </Button>
            <Button variant="outline">
              <Share2 /> Partager
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {ledgerPrize
              ? `Gain officiel crédité : +${ledgerPrize.credit.toLocaleString("fr-FR")} XAF dans le ledger.`
              : "Aucun gain crédité pour cette manche, ou ledger en attente de synchronisation officielle."}
          </p>
        </CardContent>
      </Card>
      <Card className="ranking-card">
        <CardHeader>
          <CardTitle>Classement final</CardTitle>
          <CardDescription>Publication vérifiée par l&apos;administrateur.</CardDescription>
        </CardHeader>
        <CardContent className="ranking-list">
          {ranking.map((player) => (
            <div className="ranking-row" key={`${player.id}-${player.rank}`}>
              <strong>#{player.rank}</strong>
              <PixelAvatar seed={player.id} size="sm" />
              <span className="font-mono text-xs">{player.id}</span>
              <b>{player.points.toLocaleString("fr-FR")}</b>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="result-actions">
        <Button variant="secondary" render={<Link href="/me/tickets" />}>
          <RotateCcw /> Retour à mes parties
        </Button>
      </div>
    </div>
  );
}
