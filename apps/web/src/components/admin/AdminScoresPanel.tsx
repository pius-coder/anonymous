"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileCheck2, RefreshCw, ShieldAlert, Trophy, Wallet } from "lucide-react";
import { useState } from "react";
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
import {
  correctAdminScore,
  getAdminScoreDossier,
  publishAdminScores,
} from "@/services/admin/adminScoringClient";

type AdminScoresPanelProps = {
  partyId: string;
  roundId?: string;
};

function evidenceTone(
  status: "VALID" | "BLOCKED",
): "success" | "warning" | "danger" | "neutral" {
  return status === "VALID" ? "success" : "danger";
}

export function AdminScoresPanel({ partyId, roundId = "" }: AdminScoresPanelProps) {
  const queryClient = useQueryClient();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [correctedScore, setCorrectedScore] = useState("");
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const dossierQuery = useQuery({
    queryKey: ["admin", "score-dossier", partyId, roundId],
    enabled: Boolean(partyId && roundId),
    queryFn: async () => {
      const result = await getAdminScoreDossier(partyId, roundId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });

  const rows = dossierQuery.data?.rows ?? [];
  const selectedRow = rows.find((row) => row.playerId === selectedPlayerId) ?? null;
  const blockedEvidenceCount = rows.filter((row) => row.evidence.validationStatus === "BLOCKED").length;
  const unverifiedCount = rows.filter((row) => row.status !== "PUBLISHED" && row.status !== "VERIFIED").length;
  const isPublished = dossierQuery.data?.published ?? false;

  const correctMutation = useMutation({
    mutationFn: async () => {
      if (!roundId) throw new Error("Manche non configurée");
      if (!selectedRow) throw new Error("Sélectionnez un participant");
      if (!reason.trim()) throw new Error("Une raison d'audit est obligatoire");
      const value = Number(correctedScore);
      if (!Number.isFinite(value)) throw new Error("Score invalide");
      const result = await correctAdminScore(partyId, roundId, {
        playerId: selectedRow.playerId,
        correctedScore: value,
        reason: reason.trim(),
        expectedVersion: selectedRow.version,
      });
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      setActionError(null);
      setActionOk("Correction enregistrée avec audit et version serveur.");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "score-dossier", partyId, roundId] });
    },
    onError: (error: Error) => {
      setActionOk(null);
      setActionError(error.message);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!roundId) throw new Error("Manche non configurée");
      const result = await publishAdminScores(partyId, roundId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      setActionError(null);
      setActionOk("Résultats publiés. Le ledger officiel peut désormais refléter les gains.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "score-dossier", partyId, roundId] }),
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
            {isPublished ? "RESULTS_PUBLISHED · dossier figé" : "SCORE_UNDER_REVIEW · vérification admin"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Le joueur et l&apos;observateur restent sur la projection publiée uniquement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminStatus
            tone={
              isPublished ? "success" : blockedEvidenceCount > 0 ? "danger" : unverifiedCount > 0 ? "warning" : "success"
            }
          >
            {isPublished
              ? "Publié"
              : blockedEvidenceCount > 0
                ? `Publication bloquée · ${blockedEvidenceCount} preuve(s)`
                : unverifiedCount > 0
                  ? `Publication en revue · ${unverifiedCount}`
                  : "Prêt à publier"}
          </AdminStatus>
          <Button size="sm" variant="outline" onClick={() => void dossierQuery.refetch()}>
            <RefreshCw /> Actualiser
          </Button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <AdminMetric
          icon={Trophy}
          label="Scores reçus"
          value={String(rows.length)}
          detail={roundId ? `manche ${roundId.slice(0, 8)}…` : "manche non fournie"}
        />
        <AdminMetric
          icon={ShieldAlert}
          label="Preuves bloquées"
          value={String(blockedEvidenceCount)}
          detail="hash/version/refs"
          tone={blockedEvidenceCount > 0 ? "warning" : "success"}
        />
        <AdminMetric
          icon={CheckCircle2}
          label="Reviews"
          value={String(dossierQuery.data?.metrics.reviewCount ?? 0)}
          detail={
            dossierQuery.data?.metrics.publicationDelayMs != null
              ? `${Math.round(dossierQuery.data.metrics.publicationDelayMs / 1000)}s avant publication`
              : "publication en attente"
          }
        />
        <AdminMetric
          icon={Wallet}
          label="Gains prévus / crédités"
          value={`${dossierQuery.data?.metrics.expectedGainTotal ?? 0} / ${dossierQuery.data?.metrics.creditedGainTotal ?? 0}`}
          detail="ledger officiel"
          tone={isPublished ? "success" : "neutral"}
        />
      </section>

      {!roundId ? (
        <p className="border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground" role="status">
          Fournissez un identifiant de manche pour charger le dossier scoring.
        </p>
      ) : null}

      {dossierQuery.isError ? (
        <p className="border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert">
          {(dossierQuery.error as Error).message}
        </p>
      ) : null}

      <AdminSection
        title="Dossier de vérification"
        description="Audience admin uniquement. Version stale, preuve runtime et preview gains restent hors surface joueur."
      >
        <AdminTable
          headers={["Joueur", "Score", "Rang", "Preuve", "Gain", "Action"]}
          label="Dossier scoring"
        >
          <>
            {rows.length === 0 ? (
              <tr>
                <td className={adminCell} colSpan={6}>
                  {dossierQuery.isLoading ? "Chargement…" : "Aucun score provisoire pour cette manche."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.provisionalScoreId}>
                  <td className={adminCell}>
                    <div className="flex flex-col">
                      <strong className="font-mono text-xs">{row.playerId}</strong>
                      <span className="text-xs text-muted-foreground">{row.playerName ?? row.playerEmail}</span>
                    </div>
                  </td>
                  <td className={adminCell}>{row.score.toLocaleString("fr-FR")}</td>
                  <td className={adminCell}>{row.publishedRank ?? row.rank ?? "—"}</td>
                  <td className={adminCell}>
                    <div className="space-y-1">
                      <AdminStatus tone={evidenceTone(row.evidence.validationStatus)}>
                        {row.evidence.validationStatus === "VALID" ? "Preuve valide" : row.evidence.validationCode ?? "Bloquée"}
                      </AdminStatus>
                      <p className="text-xs text-muted-foreground">{row.evidence.evidenceHash ?? "hash absent"}</p>
                    </div>
                  </td>
                  <td className={adminCell}>
                    <div className="space-y-1 text-xs">
                      <div>{row.gainPreview.expectedAmount} XAF prévu</div>
                      <div className="text-muted-foreground">
                        {row.gainPreview.credited ? `${row.gainPreview.creditedAmount} XAF crédité` : "ledger en attente"}
                      </div>
                    </div>
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
          description="Version attendue, acteur serveur, motif et historique restent tracés côté backend."
        >
          <form
            className="grid gap-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              correctMutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="score-player">Participant</Label>
              <Input
                id="score-player"
                value={selectedPlayerId}
                onChange={(event) => setSelectedPlayerId(event.target.value)}
                placeholder="user id du joueur"
                required
              />
              {selectedRow ? (
                <p className="text-xs text-muted-foreground">
                  Version attendue {selectedRow.version} · preuve {selectedRow.evidence.validationStatus.toLowerCase()}
                </p>
              ) : null}
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
                placeholder="Expliquer l'écart et référencer la preuve"
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={correctMutation.isPending || !roundId}>
              <FileCheck2 />
              Valider la correction
            </Button>
          </form>
        </AdminSection>

        <AdminSection
          title="Preuve et historique"
          description="Lecture serveur uniquement. Les refs retention et revues précédentes restent privées à l'admin."
        >
          <div className="space-y-3 p-4 text-sm">
            {selectedRow ? (
              <>
                <div className="space-y-1">
                  <p className="font-medium">Validation preuve</p>
                  <AdminStatus tone={evidenceTone(selectedRow.evidence.validationStatus)}>
                    {selectedRow.evidence.validationStatus === "VALID"
                      ? "Prête pour publication"
                      : selectedRow.evidence.validationReason ?? "Bloquée"}
                  </AdminStatus>
                  <p className="text-xs text-muted-foreground">
                    hash={selectedRow.evidence.evidenceHash ?? "—"} · version={selectedRow.evidence.minigameVersion ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    input={selectedRow.evidence.inputRef ?? "—"} · config={selectedRow.evidence.configRef ?? "—"} · seed={selectedRow.evidence.seedRef ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Historique review</p>
                  {selectedRow.reviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune review enregistrée.</p>
                  ) : (
                    selectedRow.reviews.map((review) => (
                      <div key={review.id} className="rounded border border-border/70 p-2 text-xs">
                        <p>
                          {review.action} · {review.reviewedBy}
                        </p>
                        <p className="text-muted-foreground">
                          {review.previousScore ?? "—"} → {review.newScore ?? "—"} · {review.reason ?? "sans motif"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Sélectionnez un participant pour afficher sa preuve et ses revues.</p>
            )}
          </div>
        </AdminSection>
      </div>

      <SensitiveActionPanel
        title="Publier les résultats"
        description="Publication officielle + ledger de gains si la preuve runtime est valide et la concurrence est résolue."
        actionLabel="Publier la version officielle"
        consequence="les résultats deviennent publics et le wallet ne peut être crédité qu'une seule fois."
        disabled={isPublished || !roundId || publishMutation.isPending || blockedEvidenceCount > 0}
        disabledReason={
          isPublished
            ? "Résultats déjà publiés."
            : !roundId
              ? "Manche requise."
              : blockedEvidenceCount > 0
                ? `${blockedEvidenceCount} preuve(s) bloquent la publication.`
                : undefined
        }
        tone="danger"
        onConfirm={() => publishMutation.mutate()}
      />

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

      {rows.length > 0 ? (
        <AdminSection
          title="Signalements de blocage"
          description="Mismatches et lecture stale à lever avant publication."
        >
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {rows
              .filter((row) => row.evidence.validationStatus === "BLOCKED")
              .map((row) => (
                <div key={`${row.provisionalScoreId}-block`} className="rounded border border-rose-800/60 p-3 text-sm">
                  <p className="font-medium">
                    <AlertTriangle className="mr-2 inline size-4" />
                    {row.playerId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.evidence.validationCode}: {row.evidence.validationReason}
                  </p>
                </div>
              ))}
            {rows.every((row) => row.evidence.validationStatus === "VALID") ? (
              <p className="text-sm text-muted-foreground">Aucun blocage evidence en cours.</p>
            ) : null}
          </div>
        </AdminSection>
      ) : null}
    </div>
  );
}
