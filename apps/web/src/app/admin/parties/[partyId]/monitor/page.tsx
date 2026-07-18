"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Eye, Radio, Users } from "lucide-react";
import {
  AdminMetric,
  AdminSection,
  AdminStatus,
  AdminTable,
  PartyAdminNav,
  adminCell,
} from "@/components/admin/AdminWorkspace";
import { AppShell } from "@/components/ui/AppShell";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";
import { getAdminParty } from "@/services/admin/adminPartyClient";
import { getAdminPreparationState } from "@/services/preparationClient";
import { use } from "react";

export default function AdminPartyMonitorPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId: raw } = use(params);
  const partyId = decodeURIComponent(raw);

  const partyQuery = useQuery({
    queryKey: ["admin", "party", partyId, "monitor"],
    queryFn: async () => {
      const res = await getAdminParty(partyId);
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    refetchInterval: 8_000,
    staleTime: 5_000,
  });

  const prepQuery = useQuery({
    queryKey: ["preparation", "admin", partyId, "monitor"],
    queryFn: async () => {
      const res = await getAdminPreparationState(partyId);
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    refetchInterval: 8_000,
    retry: 1,
  });

  const party = partyQuery.data;
  const participants = prepQuery.data?.participants ?? [];
  // Derive stale only from React Query flags (no Date.now — purity lint).
  const stale = partyQuery.isStale || prepQuery.isStale;
  const connState =
    partyQuery.isError || prepQuery.isError
      ? "offline"
      : partyQuery.isFetching || prepQuery.isFetching
        ? "reconnecting"
        : stale
          ? "stale"
          : "stable";

  return (
    <AppShell
      audience="Admin"
      eyebrow="Supervision"
      title="Monitor live"
      subtitle="Projection filtrée en lecture seule. Aucune commande de manche, correction ou publication n’est disponible ici."
      actions={
        <div className="flex gap-2">
          <ReadonlyBadge />
          <ConnectionStatus state={connState} />
        </div>
      }
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="monitor" />
        {partyQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement de l’état…</p>
        ) : null}
        {partyQuery.isError ? (
          <p className="text-sm text-rose-300" role="alert">
            {partyQuery.error instanceof Error ? partyQuery.error.message : "Erreur"}
          </p>
        ) : null}
        {party ? (
          <div className="flex items-center justify-between border border-cyan-800 bg-cyan-950/30 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-cyan-200">
                {party.status} · {party.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Snapshot{" "}
                {partyQuery.dataUpdatedAt
                  ? new Date(partyQuery.dataUpdatedAt).toLocaleTimeString()
                  : "—"}
                {stale ? " · données potentiellement obsolètes" : ""}
              </p>
            </div>
            <AdminStatus tone={stale ? "warning" : "success"}>
              {stale ? "STALE" : "LIVE"}
            </AdminStatus>
          </div>
        ) : null}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetric
            icon={Users}
            label="Participants"
            value={String(prepQuery.data?.stats.total ?? party?.participantCount ?? "—")}
            detail={`${prepQuery.data?.stats.present ?? "—"} présents`}
          />
          <AdminMetric
            icon={Activity}
            label="Prêts"
            value={String(prepQuery.data?.stats.ready ?? "—")}
            detail={`${prepQuery.data?.stats.absent ?? 0} absents`}
          />
          <AdminMetric
            icon={Radio}
            label="Phase"
            value={party?.status ?? "—"}
            detail="état serveur"
          />
          <AdminMetric
            icon={Eye}
            label="Capacité"
            value={party?.maxPlayers != null ? String(party.maxPlayers) : "—"}
            detail="lecture seule"
          />
        </section>
        <AdminSection
          title="Progression participants"
          description="État autorisé uniquement; aucune commande joueur."
        >
          {prepQuery.isError ? (
            <p className="p-4 text-sm text-amber-300">
              Préparation indisponible:{" "}
              {prepQuery.error instanceof Error ? prepQuery.error.message : "erreur"}
            </p>
          ) : null}
          {!prepQuery.isLoading && participants.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun participant à afficher.</p>
          ) : null}
          {participants.length > 0 ? (
            <AdminTable
              headers={["Joueur", "Connexion", "État", "Ready", "Anomalie"]}
              label="Progression des participants"
            >
              {participants.map((p) => (
                <tr key={p.id}>
                  <td className={adminCell}>{p.userName ?? p.userId}</td>
                  <td className={adminCell}>
                    <AdminStatus tone="info">{p.status}</AdminStatus>
                  </td>
                  <td className={adminCell}>{p.readinessState}</td>
                  <td className={adminCell}>
                    {p.readinessState === "ready" || p.readinessState === "READY" ? "oui" : "non"}
                  </td>
                  <td className={adminCell}>—</td>
                </tr>
              ))}
            </AdminTable>
          ) : null}
        </AdminSection>
      </div>
    </AppShell>
  );
}
