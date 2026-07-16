import { Download, Search } from "lucide-react";
import {
  AdminSection,
  AdminStatus,
  AdminTable,
  PartyAdminNav,
  adminCell,
} from "@/components/admin/AdminWorkspace";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";

export default async function AdminPartyAuditPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId: raw } = await params;
  const partyId = decodeURIComponent(raw);
  const events = [
    [
      "18:12:30",
      "nadine.m",
      "ADMIN",
      "announcement.send",
      "announcement:904",
      "Prévenir fermeture lobby",
      "PARTIEL",
      "cor_739a",
    ],
    [
      "18:05:02",
      "worker.prepare",
      "SYSTEM",
      "preparation.open",
      "party:arena-07",
      "Horaire planifié",
      "OK",
      "cor_6f42",
    ],
    [
      "17:58:44",
      "nadine.m",
      "ADMIN",
      "participant.exclude",
      "participant:021",
      "Paiement non confirmé",
      "OK",
      "cor_6b11",
    ],
    [
      "17:42:09",
      "jules.k",
      "ADMIN",
      "control.lease.acquire",
      "party:arena-07",
      "Prise de service",
      "OK",
      "cor_61e0",
    ],
  ];
  return (
    <AppShell
      audience="Admin"
      eyebrow="Traçabilité"
      title="Audit de la partie"
      subtitle="Journal immuable des décisions et résultats redigés. Aucun token, secret ou payload provider."
      actions={
        <div className="flex gap-2">
          <ReadonlyBadge />
          <Button variant="outline">
            <Download />
            Exporter CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="audit" />
        <AdminSection
          title="Filtres d’audit"
          description="Recherche par acteur, action, entité, résultat ou corrélation."
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
              <Input
                className="pl-9"
                placeholder="Action, entité ou correlationId"
                aria-label="Recherche audit"
              />
            </label>
            <select
              className="h-9 border border-input bg-transparent px-3 text-xs"
              aria-label="Acteur"
            >
              <option>Tous les acteurs</option>
              <option>Administrateurs</option>
              <option>Système</option>
            </select>
            <select
              className="h-9 border border-input bg-transparent px-3 text-xs"
              aria-label="Résultat"
            >
              <option>Tous les résultats</option>
              <option>OK</option>
              <option>REFUSÉ</option>
              <option>PARTIEL</option>
            </select>
            <Button>Appliquer les filtres</Button>
          </div>
        </AdminSection>
        <AdminSection
          title="Timeline immuable"
          description="842 événements · rétention selon politique de conformité."
        >
          <AdminTable
            headers={[
              "Heure",
              "Acteur",
              "Rôle",
              "Action",
              "Entité",
              "Raison",
              "Résultat",
              "Corrélation",
            ]}
            label="Journal d’audit de la partie"
          >
            <>
              {events.map((row) => (
                <tr key={row[7]}>
                  {row.map((cell, index) => (
                    <td
                      key={`${row[7]}-${index}`}
                      className={`${adminCell} ${index === 7 ? "font-mono" : ""}`}
                    >
                      {index === 6 ? (
                        <AdminStatus tone={cell === "OK" ? "success" : "warning"}>
                          {cell}
                        </AdminStatus>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </>
          </AdminTable>
        </AdminSection>
      </div>
    </AppShell>
  );
}
