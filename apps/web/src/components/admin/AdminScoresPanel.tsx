"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileCheck2, RefreshCw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AdminMetric,
  AdminSection,
  AdminStatus,
  AdminTable,
  adminCell,
} from "@/components/admin/AdminWorkspace";
import { SensitiveActionPanel } from "@/components/admin/SensitiveActionPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScoringService } from "@/services/rpcServices";

type AdminScoresPanelProps = {
  partyId: string;
  /** Optional seed round for API calls; empty shows empty/loading states. */
  roundId?: string;
};

type ProvisionalRow = {
  playerId: string;
  score: number;
  rank: number;
  statusLabel: string;
};

function statusTone(label: string): "success" | "warning" | "danger" | "neutral" {
  if (label === "Publié" || label === "Vérifié") return "success";
  if (label === "À revoir" || label === "Corrigé") return "warning";
  if (label === "Invalidé") return "danger";
  return "neutral";
}

export function AdminScoresPanel({ partyId, roundId = "" }: AdminScoresPanelProps) {
  const queryClient = useQueryClient();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [correctedScore, setCorrectedScore] = useState("");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const provisionalQuery = useQuery({
    queryKey: ["admin", "provisional-scores", roundId],
    enabled: Boolean(roundId),
    queryFn: async () => {
      const result = await ScoringService.provisional(roundId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  const publishedQuery = useQuery({
    queryKey: ["admin", "published-results", partyId],
    enabled: Boolean(partyId),
    queryFn: async () => {
      const result = await ScoringService.published(partyId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  const rows: ProvisionalRow[] = useMemo(() => {
    const scores = provisionalQuery.data?.scores ?? [];
    return scores.map((score) => ({
      playerId: score.playerId?.value ?? "—",
      score: score.score,
      rank: score.rank,
      statusLabel: mapStatus(provisionalQuery.data?.status),
    }));
  }, [provisionalQuery.data]);

  const isPublished =
    (publishedQuery.data?.finalScores?.length ?? 0) > 0 &&
    Boolean(publishedQuery.data?.publishedAt);

  const unverifiedCount = isPublished
    ? 0
    : rows.filter((row) => row.statusLabel === "À revoir" || row.statusLabel === "Provisoire").length;

  const correctMutation = useMutation({
    mutationFn: async () => {
      if (!roundId) throw new Error("Manche non configurée");
      if (!selectedPlayerId.trim()) throw new Error("Sélectionnez un participant");
      if (!reason.trim()) throw new Error("Une raison d'audit est obligatoire");
      const value = Number(correctedScore);
      if (!Number.isFinite(value)) throw new Error("Score invalide");
      const result = await ScoringService.correct(roundId, selectedPlayerId.trim(), value, reason.trim());
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      setActionError(null);
      setActionOk("Correction enregistrée avec audit.");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "provisional-scores", roundId] });
    },
    onError: (error: Error) => {
      setActionOk(null);
      setActionError(error.message);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!roundId) throw new Error("Manche non configurée");
      const result = await ScoringService.publish(roundId, partyId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      setActionError(null);
      setActionOk("Résultats publiés. Les joueurs peuvent consulter le classement.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "provisional-scores", roundId] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "published-results", partyId] }),
        queryClient.invalidateQueries({ queryKey: ["player", "published-results", partyId] }),
      ]);
    },
    onError: (error: Error) => {
      setActionOk(null);
      setActionError(error.message);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-amber-700/60 bg-amber-950/30 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-amber-200">
            {isPublished ? "RESULTS_PUBLISHED · version officielle" : "SCORE_UNDER_REVIEW · scores provisoires"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Joueurs et observateurs ne voient aucun score provisoire avant publication explicite.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminStatus tone={isPublished ? "success" : unverifiedCount > 0 ? "danger" : "warning"}>
            {isPublished
              ? "Publié"
              : unverifiedCount > 0
                ? `Publication bloquée · ${unverifiedCount} revues`
                : "Prêt à publier"}
          </AdminStatus>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void provisionalQuery.refetch();
              void publishedQuery.refetch();
            }}
          >
            <RefreshCw /> Actualiser
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminMetric
          icon={Trophy}
          label="Scores reçus"
          value={String(rows.length)}
          detail={roundId ? `manche ${roundId.slice(0, 8)}…` : "manche non fournie"}
        />
        <AdminMetric
          icon={CheckCircle2}
          label="Vérifiés / prêts"
          value={String(rows.length - unverifiedCount)}
          detail={isPublished ? "projection figée" : "avant publication"}
          tone={unverifiedCount > 0 ? "warning" : "success"}
        />
        <AdminMetric
          icon={AlertTriangle}
          label="À revoir"
          value={String(unverifiedCount)}
          detail="aucun score joueur"
          tone={unverifiedCount > 0 ? "warning" : "neutral"}
        />
      </section>

      {!roundId ? (
        <p className="border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground" role="status">
          Fournissez un identifiant de manche pour charger les scores provisoires via ScoringService.
        </p>
      ) : null}

      {provisionalQuery.isError ? (
        <p className="border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert">
          {(provisionalQuery.error as Error).message}
        </p>
      ) : null}

      <AdminSection
        title="Table de vérification"
        description="Audience admin uniquement. Les payloads d'évidence restent hors interface joueur."
      >
        <AdminTable
          headers={["Joueur", "Score provisoire", "Rang", "Review", "Action"]}
          label="Scores provisoires"
        >
          <>
            {rows.length === 0 ? (
              <tr>
                <td className={adminCell} colSpan={5}>
                  {provisionalQuery.isLoading ? "Chargement…" : "Aucun score provisoire pour cette manche."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.playerId}>
                  <td className={`${adminCell} font-medium font-mono text-xs`}>{row.playerId}</td>
                  <td className={adminCell}>{row.score.toLocaleString("fr-FR")}</td>
                  <td className={adminCell}>{row.rank || "—"}</td>
                  <td className={adminCell}>
                    <AdminStatus tone={statusTone(row.statusLabel)}>{row.statusLabel}</AdminStatus>
                  </td>
                  <td className={adminCell}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPlayerId(row.playerId);
                        setCorrectedScore(String(row.score));
                        setActionOk(null);
                        setActionError(null);
                      }}
                    >
                      Examiner
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </>
        </AdminTable>
      </AdminSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSection
          title="Correction auditée"
          description="Raison, acteur (session admin) et conflit de version gérés côté serveur."
        >
          <form
            className="grid gap-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              correctMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="score-player">Participant (player_id)</Label>
              <Input
                id="score-player"
                value={selectedPlayerId}
                onChange={(event) => setSelectedPlayerId(event.target.value)}
                placeholder="user id du joueur"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score-value">Nouveau score</Label>
              <Input
                id="score-value"
                type="number"
                value={correctedScore}
                onChange={(event) => setCorrectedScore(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score-reason">Raison obligatoire</Label>
              <Textarea
                id="score-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Expliquer l'écart et référencer l'évidence"
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={correctMutation.isPending || !roundId}>
              <FileCheck2 />
              Valider la correction
            </Button>
          </form>
        </AdminSection>

        <SensitiveActionPanel
          title="Publier les résultats"
          description="Crée la projection officielle visible par joueurs et observateurs. Idempotent si déjà publiée."
          actionLabel="Publier la version officielle"
          consequence="les résultats deviennent publics et les gains post-publication peuvent être traités."
          disabled={isPublished || !roundId || publishMutation.isPending}
          disabledReason={
            isPublished
              ? "Résultats déjà publiés."
              : !roundId
                ? "Manche requise."
                : unverifiedCount > 0
                  ? `${unverifiedCount} score(s) encore à vérifier avant publication.`
                  : undefined
          }
          tone="danger"
          onConfirm={() => publishMutation.mutate()}
        />
      </div>

      {actionError ? (
        <p className="border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert">
          {actionError}
        </p>
      ) : null}
      {actionOk ? (
        <p className="border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200" role="status">
          {actionOk}
        </p>
      ) : null}
    </div>
  );
}

function mapStatus(status: number | undefined): string {
  switch (status) {
    case 1:
      return "Provisoire";
    case 2:
      return "À revoir";
    case 3:
      return "Corrigé";
    case 4:
      return "Publié";
    case 5:
      return "Invalidé";
    default:
      return "Provisoire";
  }
}
