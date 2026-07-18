"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import {
  AdminSection,
  AdminStatus,
  AdminTable,
  adminCell,
} from "@/components/admin/AdminWorkspace";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { listAdminParties } from "@/services/admin/adminPartyClient";

function toneForStatus(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status.includes("VERIFICATION")) return "warning";
  if (status.includes("ACTIVE") || status.includes("BRIEFING")) return "success";
  if (status.includes("CANCEL")) return "danger";
  if (status.includes("PREPARATION") || status === "SCHEDULED") return "info";
  return "neutral";
}

export default function AdminPartiesPage() {
  const partiesQuery = useQuery({
    queryKey: ["admin", "parties", "list"],
    queryFn: async () => {
      const res = await listAdminParties({ take: 100 });
      if (!res.success) throw new Error(`${res.error.code}: ${res.error.message}`);
      return res.data;
    },
    refetchInterval: 12_000,
  });

  const parties = partiesQuery.data?.parties ?? [];

  return (
    <AppShell
      audience="Admin"
      eyebrow="Catalogue opérationnel"
      title="Parties"
      subtitle="Création, configuration et pilotage. Aucune donnée fictive."
      actions={
        <Button render={<Link href="/admin/parties/new" />}>
          <Plus />
          Nouvelle partie
        </Button>
      }
    >
      <AdminSection
        title="Toutes les parties"
        description={
          partiesQuery.isFetching
            ? "Actualisation en cours…"
            : `${partiesQuery.data?.total ?? 0} partie(s)`
        }
      >
        {partiesQuery.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
        ) : null}
        {partiesQuery.isError ? (
          <p className="p-4 text-sm text-rose-300" role="alert">
            {partiesQuery.error instanceof Error
              ? partiesQuery.error.message
              : "Erreur de chargement"}
          </p>
        ) : null}
        {!partiesQuery.isLoading && !partiesQuery.isError && parties.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Aucune partie enregistrée.</p>
        ) : null}
        {parties.length > 0 ? (
          <AdminTable
            headers={["Partie", "Phase", "Planifié", "Participants", "Frais", "MAJ", "Actions"]}
            label="Liste des parties admin"
          >
            {parties.map((party) => (
              <tr key={party.id}>
                <td className={`${adminCell} font-medium`}>
                  {party.name}
                  <div className="font-mono text-xs text-muted-foreground">{party.code}</div>
                </td>
                <td className={adminCell}>
                  <AdminStatus tone={toneForStatus(party.status)}>{party.status}</AdminStatus>
                </td>
                <td className={adminCell}>
                  {party.scheduledAt ? new Date(party.scheduledAt).toLocaleString() : "—"}
                </td>
                <td className={adminCell}>
                  {party.participantCount}
                  {party.maxPlayers != null ? ` / ${party.maxPlayers}` : ""}
                </td>
                <td className={adminCell}>
                  {party.entryFeeAmount != null
                    ? `${party.entryFeeAmount} ${party.entryFeeCurrency}`
                    : "Gratuit"}
                </td>
                <td className={adminCell}>{new Date(party.updatedAt).toLocaleString()}</td>
                <td className={adminCell}>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/admin/parties/${party.id}/setup`} />}
                    >
                      Setup
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/admin/parties/${party.id}/control`} />}
                    >
                      Contrôle
                      <ArrowRight />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : null}
      </AdminSection>
    </AppShell>
  );
}
