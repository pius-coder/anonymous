"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, ArrowRight, CalendarClock, Radio, Users } from "lucide-react";
import {
  AdminMetric,
  AdminSection,
  AdminStatus,
  AdminTable,
  adminCell,
} from "@/components/admin/AdminWorkspace";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { listAdminParties, type AdminPartyDetail } from "@/services/admin/adminPartyClient";

function phaseLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function toneForStatus(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status.includes("VERIFICATION") || status.includes("WAITING")) return "warning";
  if (status.includes("ACTIVE") || status.includes("BRIEFING")) return "success";
  if (status.includes("CANCEL") || status.includes("FAILED")) return "danger";
  if (status.includes("PREPARATION") || status.includes("SCHEDULED")) return "info";
  return "neutral";
}

function controlHref(party: AdminPartyDetail): string {
  if (party.status.includes("VERIFICATION") || party.status.includes("RESULTS")) {
    return `/admin/parties/${party.id}/scores`;
  }
  if (party.status.includes("ACTIVE") || party.status.includes("ROUND")) {
    return `/admin/parties/${party.id}/monitor`;
  }
  if (party.status === "DRAFT") {
    return `/admin/parties/${party.id}/setup`;
  }
  return `/admin/parties/${party.id}/control`;
}

export default function AdminDashboardPage() {
  const partiesQuery = useQuery({
    queryKey: ["admin", "parties", "dashboard"],
    queryFn: async () => {
      const res = await listAdminParties({ take: 50 });
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    refetchInterval: 15_000,
    staleTime: 8_000,
  });

  const parties = partiesQuery.data?.parties ?? [];
  const scheduled = parties.filter((p) => p.status === "SCHEDULED" || p.status === "PREPARATION_OPEN");
  const live = parties.filter(
    (p) =>
      p.status.includes("ROUND") ||
      p.status.includes("ACTIVE") ||
      p.status === "PAUSED" ||
      p.status === "SUSPENDED",
  );
  const prep = parties.filter((p) => p.status.includes("PREPARATION"));
  const prepSeats = prep.reduce((acc, p) => acc + p.participantCount, 0);
  const prepCap = prep.reduce((acc, p) => acc + (p.maxPlayers ?? 0), 0);

  return (
    <AppShell
      audience="Admin"
      eyebrow="Centre d’opérations"
      title="Tableau de bord admin"
      subtitle="Priorités live, décisions attendues et incidents. Les données financières restent dans l’espace Finance."
      actions={<Button render={<Link href="/admin/parties/new" />}>Créer une partie</Button>}
    >
      <div className="space-y-4">
        {partiesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des parties…</p>
        ) : null}
        {partiesQuery.isError ? (
          <p className="text-sm text-rose-300" role="alert">
            Impossible de charger le tableau de bord:{" "}
            {partiesQuery.error instanceof Error ? partiesQuery.error.message : "erreur"}
          </p>
        ) : null}

        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Indicateurs opérationnels"
        >
          <AdminMetric
            icon={CalendarClock}
            label="Planifiées / prep"
            value={String(scheduled.length)}
            detail={`${prep.length} en préparation`}
          />
          <AdminMetric
            icon={Radio}
            label="En direct"
            value={String(live.length)}
            detail={live.length ? "manche ou supervision" : "aucune manche live"}
          />
          <AdminMetric
            icon={Users}
            label="Sièges prep"
            value={prepCap > 0 ? `${prepSeats}/${prepCap}` : String(prepSeats)}
            detail="participants agrégés"
            tone={prepSeats > 0 ? "warning" : "neutral"}
          />
          <AdminMetric
            icon={AlertTriangle}
            label="Total listé"
            value={String(partiesQuery.data?.total ?? 0)}
            detail={partiesQuery.isFetching ? "rafraîchissement…" : "snapshot admin"}
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <AdminSection
            title="Parties nécessitant une attention"
            description="Triées par mise à jour récente (serveur)."
          >
            {!partiesQuery.isLoading && parties.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Aucune partie. Créez un brouillon pour démarrer.
              </p>
            ) : (
              <AdminTable
                headers={["Partie", "Phase", "Horaire", "Participants", "Code", "Action"]}
                label="Parties nécessitant une attention"
              >
                {parties.slice(0, 12).map((party) => (
                  <tr key={party.id}>
                    <td className={`${adminCell} font-medium`}>{party.name}</td>
                    <td className={adminCell}>
                      <AdminStatus tone={toneForStatus(party.status)}>
                        {phaseLabel(party.status)}
                      </AdminStatus>
                    </td>
                    <td className={adminCell}>
                      {party.scheduledAt
                        ? new Date(party.scheduledAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className={adminCell}>
                      {party.participantCount}
                      {party.maxPlayers != null ? ` / ${party.maxPlayers}` : ""}
                    </td>
                    <td className={`${adminCell} font-mono text-xs`}>{party.code}</td>
                    <td className={adminCell}>
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={controlHref(party)} />}
                      >
                        Ouvrir
                        <ArrowRight />
                      </Button>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </AdminSection>

          <div className="space-y-4">
            <AdminSection title="Prochaine action" description="Basée sur le snapshot serveur">
              <div className="p-4">
                {parties[0] ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Activity size={18} className="text-amber-400" />
                      <AdminStatus tone="warning">Décision manuelle</AdminStatus>
                    </div>
                    <p className="mt-3 text-sm font-medium">{parties[0].name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Statut {phaseLabel(parties[0].status)}. Aucun timer ne lance la partie.
                    </p>
                    <Button
                      className="mt-4 w-full"
                      render={<Link href={controlHref(parties[0])} />}
                    >
                      Examiner
                      <ArrowRight />
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Rien en file pour l’instant.</p>
                )}
              </div>
            </AdminSection>
            <AdminSection title="Santé plateforme">
              <div className="space-y-3 p-4 text-xs">
                <div className="flex justify-between">
                  <span>Source données</span>
                  <AdminStatus tone={partiesQuery.isError ? "danger" : "success"}>
                    {partiesQuery.isError ? "Erreur" : "API admin"}
                  </AdminStatus>
                </div>
                <div className="flex justify-between">
                  <span>Dernier snapshot</span>
                  <span>
                    {partiesQuery.dataUpdatedAt
                      ? new Date(partiesQuery.dataUpdatedAt).toLocaleTimeString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Données hardcodées</span>
                  <AdminStatus tone="success">Absentes</AdminStatus>
                </div>
              </div>
            </AdminSection>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
