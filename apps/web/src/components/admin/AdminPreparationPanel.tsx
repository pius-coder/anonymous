"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Megaphone,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  AdminMetric,
  AdminSection,
  AdminStatus,
  AdminTable,
  adminCell,
} from "@/components/admin/AdminWorkspace";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmStart,
  getAdminPreparationState,
  openPreparation,
  sendAnnouncement,
  type PreparationState,
} from "@/services/preparationClient";

const STALE_MS = 12_000;

type Props = {
  partyId: string;
};

export function AdminPreparationPanel({ partyId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["preparation", "admin", partyId] as const;
  const [title, setTitle] = useState("Rappel préparation");
  const [body, setBody] = useState(
    "Le lobby est ouvert. Vérifiez votre connexion et confirmez présence puis prêt.",
  );
  const [overrideReason, setOverrideReason] = useState("");
  const [forceWithAbsents, setForceWithAbsents] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  const stateQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await getAdminPreparationState(partyId);
      if (!res.success) {
        throw Object.assign(new Error(res.error.message), { code: res.error.code });
      }
      return res.data;
    },
    refetchInterval: 6_000,
    staleTime: STALE_MS,
    retry: 1,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const openMutation = useMutation({
    mutationFn: async () => {
      const res = await openPreparation(partyId);
      if (!res.success) throw Object.assign(new Error(res.error.message), { code: res.error.code });
      return res.data;
    },
    onSuccess: () => {
      setLocalError(null);
      void invalidate();
    },
    onError: (e: Error) => setLocalError(e.message),
  });

  const announceMutation = useMutation({
    mutationFn: async () => {
      const res = await sendAnnouncement(partyId, title, body);
      if (!res.success) throw Object.assign(new Error(res.error.message), { code: res.error.code });
      return res.data;
    },
    onSuccess: (data) => {
      setLocalError(null);
      if (data.notificationJobId) setLastJobId(data.notificationJobId);
      void invalidate();
    },
    onError: (e: Error) => setLocalError(e.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await confirmStart(partyId, {
        forceWithAbsents,
        overrideReason: overrideReason.trim() || undefined,
      });
      if (!res.success) throw Object.assign(new Error(res.error.message), { code: res.error.code });
      return res.data;
    },
    onSuccess: () => {
      setLocalError(null);
      void invalidate();
    },
    onError: (e: Error) => setLocalError(e.message),
  });

  const submitting =
    openMutation.isPending || announceMutation.isPending || confirmMutation.isPending;
  const isStale = stateQuery.isFetched && stateQuery.isStale && !stateQuery.isFetching;

  if (stateQuery.isLoading) {
    return (
      <AdminSection title="Préparation" description="Chargement de l’état serveur…">
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" aria-busy="true">
          <RefreshCw className="size-4 animate-spin" />
          Synchronisation admin…
        </div>
      </AdminSection>
    );
  }

  if (stateQuery.isError) {
    return (
      <AdminSection title="Préparation" description="Erreur de lecture">
        <div className="space-y-3 p-4" role="alert">
          <p className="text-sm text-rose-400">
            {stateQuery.error instanceof Error
              ? stateQuery.error.message
              : "État de préparation indisponible"}
          </p>
          <Button type="button" size="sm" onClick={() => stateQuery.refetch()}>
            <RefreshCw />
            Reconnecter
          </Button>
        </div>
      </AdminSection>
    );
  }

  const state = stateQuery.data as PreparationState;
  const absents = state.participants.filter(
    (p) => p.status === "REGISTERED" || p.status === "PAID" || p.status === "INVITED",
  );
  const canOpen = state.status === "SCHEDULED";
  const canConfirm = state.status === "PREPARATION_OPEN";
  const locked = state.status === "PREPARATION_LOCKED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-amber-700/60 bg-amber-950/30 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-amber-200">{state.status}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isStale
              ? "Snapshot potentiellement obsolète"
              : `Snapshot · ${new Date(stateQuery.dataUpdatedAt).toLocaleTimeString()}`}
            {" · "}aucune ouverture automatique par timer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus
            state={stateQuery.isFetching ? "reconnecting" : isStale ? "stale" : "stable"}
          />
          {absents.length > 0 ? (
            <AdminStatus tone="warning">{absents.length} absents</AdminStatus>
          ) : (
            <AdminStatus tone="success">Aucun absent</AdminStatus>
          )}
        </div>
      </div>

      {localError ? (
        <p className="text-sm text-rose-400" role="alert">
          {localError}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Synthèse préparation">
        <AdminMetric
          icon={Users}
          label="Participants"
          value={String(state.stats.total)}
          detail={`${state.stats.present} présents`}
        />
        <AdminMetric
          icon={ShieldCheck}
          label="Prêts"
          value={String(state.stats.ready)}
          detail={`${state.stats.noResponse} sans réponse`}
          tone={state.stats.ready < state.stats.total ? "warning" : "neutral"}
        />
        <AdminMetric
          icon={Megaphone}
          label="Annonces"
          value={String(state.announcements.length)}
          detail={lastJobId ? `Job ${lastJobId.slice(0, 8)}…` : "Intent PENDING seulement"}
        />
        <AdminMetric
          icon={AlertTriangle}
          label="Absents"
          value={String(absents.length)}
          detail="Confirm start exige une raison"
          tone={absents.length > 0 ? "danger" : "neutral"}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => openMutation.mutate()}
          disabled={!canOpen || submitting}
          aria-busy={openMutation.isPending}
        >
          {openMutation.isPending ? "Ouverture…" : "Ouvrir la préparation"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => stateQuery.refetch()}>
          <RefreshCw className={stateQuery.isFetching ? "animate-spin" : undefined} />
          Actualiser
        </Button>
      </div>

      <AdminSection
        title="Participants et readiness"
        description="Projection opérationnelle; aucune action ne contrôle le client joueur."
      >
        {state.participants.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground" role="status">
            Aucun participant attaché — état vide.
          </p>
        ) : (
          <AdminTable
            headers={["User", "Rôle", "Statut", "Readiness"]}
            label="Participants et états de préparation"
          >
            {state.participants.map((row) => (
              <tr key={row.id}>
                <td className={adminCell}>
                  <span className="font-medium">{row.userName ?? row.userId.slice(0, 10)}</span>
                </td>
                <td className={adminCell}>{row.role}</td>
                <td className={adminCell}>
                  <AdminStatus
                    tone={
                      row.status === "READY" || row.status === "PRESENT" ? "success" : "warning"
                    }
                  >
                    {row.status}
                  </AdminStatus>
                </td>
                <td className={adminCell}>{row.readinessState}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminSection>

      <AdminSection
        title="Annonce de préparation"
        description="Persiste Announcement + AuditLog + NotificationJob (PENDING). Ne livre pas le message."
      >
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ann-title">Titre</Label>
              <input
                id="ann-title"
                className="h-9 w-full border border-input bg-transparent px-3 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting || locked}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-body">Message</Label>
              <Textarea
                id="ann-body"
                aria-label="Message de l’annonce"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={submitting || locked}
              />
            </div>
            <Button
              type="button"
              onClick={() => announceMutation.mutate()}
              disabled={
                submitting ||
                locked ||
                !title.trim() ||
                !body.trim() ||
                state.status === "SCHEDULED"
              }
              aria-busy={announceMutation.isPending}
            >
              <Send />
              {announceMutation.isPending ? "Envoi…" : "Envoyer l’annonce"}
            </Button>
          </div>
          <div className="space-y-2 text-xs">
            <p className="font-semibold">Intent notification</p>
            <p className="text-muted-foreground">
              Job PENDING créé atomiquement. Livraison = A-WORKERS.
            </p>
            {lastJobId ? <p className="break-all">job: {lastJobId}</p> : null}
            {state.announcements[0] ? (
              <p>Dernière: {state.announcements[0].title}</p>
            ) : (
              <p className="text-muted-foreground">Aucune annonce</p>
            )}
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Confirmer le départ (lock préparation)"
        description="Ne démarre pas de manche. Absents → raison obligatoire."
      >
        <div className="space-y-3 p-4">
          {absents.length > 0 ? (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={forceWithAbsents}
                  onChange={(e) => setForceWithAbsents(e.target.checked)}
                  disabled={!canConfirm || submitting}
                />
                Forcer avec {absents.length} absent(s)
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="override-reason">Raison d’audit (obligatoire si absents)</Label>
                <Textarea
                  id="override-reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Contexte exploitable pour l’audit (min. 1 caractère non vide)"
                  disabled={!canConfirm || submitting}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Tous les participants sont présents ou prêts.</p>
          )}
          <Button
            type="button"
            variant={absents.length > 0 ? "destructive" : "default"}
            onClick={() => confirmMutation.mutate()}
            disabled={
              !canConfirm ||
              submitting ||
              (absents.length > 0 && (!forceWithAbsents || !overrideReason.trim()))
            }
            aria-busy={confirmMutation.isPending}
          >
            {confirmMutation.isPending
              ? "Confirmation…"
              : locked
                ? "Préparation verrouillée"
                : absents.length > 0
                  ? "Confirmer avec absents"
                  : "Confirmer le départ"}
          </Button>
          {locked ? (
            <AdminStatus tone="success">PREPARATION_LOCKED — pas de round auto</AdminStatus>
          ) : null}
        </div>
      </AdminSection>
    </div>
  );
}
