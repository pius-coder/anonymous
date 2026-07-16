import Link from "next/link";
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

const activeParties = [
  {
    id: "arena-qualifier-07",
    name: "Qualificatif Douala #07",
    phase: "Préparation",
    schedule: "Aujourd’hui 18:30",
    participants: "42 / 64",
    alert: "3 absents",
    action: "Ouvrir le contrôle",
  },
  {
    id: "friday-rush-12",
    name: "Friday Rush #12",
    phase: "Manche active",
    schedule: "En direct depuis 08:12",
    participants: "31 / 32",
    alert: "1 reconnexion",
    action: "Superviser",
  },
  {
    id: "champions-night",
    name: "Champions Night",
    phase: "Vérification",
    schedule: "Manche 4 terminée",
    participants: "16 / 16",
    alert: "2 scores à revoir",
    action: "Vérifier",
  },
];

export default function AdminDashboardPage() {
  return (
    <AppShell
      audience="Admin"
      eyebrow="Centre d’opérations"
      title="Tableau de bord admin"
      subtitle="Priorités live, décisions attendues et incidents. Les données financières restent dans l’espace Finance."
      actions={<Button render={<Link href="/admin/parties/new" />}>Créer une partie</Button>}
    >
      <div className="space-y-4">
        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Indicateurs opérationnels"
        >
          <AdminMetric icon={CalendarClock} label="Planifiées" value="06" detail="2 aujourd’hui" />
          <AdminMetric icon={Radio} label="En direct" value="01" detail="état live stable" />
          <AdminMetric
            icon={Users}
            label="En préparation"
            value="42/64"
            detail="3 participants absents"
            tone="warning"
          />
          <AdminMetric
            icon={AlertTriangle}
            label="Incidents ouverts"
            value="03"
            detail="1 priorité élevée"
            tone="danger"
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <AdminSection
            title="Parties nécessitant une attention"
            description="Triées par prochaine décision explicite."
          >
            <AdminTable
              headers={["Partie", "Phase", "Horaire", "Participants", "Signal", "Action"]}
              label="Parties nécessitant une attention"
            >
              {activeParties.map((party) => (
                <tr key={party.id}>
                  <td className={`${adminCell} font-medium`}>{party.name}</td>
                  <td className={adminCell}>
                    <AdminStatus
                      tone={
                        party.phase === "Vérification"
                          ? "warning"
                          : party.phase === "Manche active"
                            ? "success"
                            : "info"
                      }
                    >
                      {party.phase}
                    </AdminStatus>
                  </td>
                  <td className={adminCell}>{party.schedule}</td>
                  <td className={adminCell}>{party.participants}</td>
                  <td className={adminCell}>{party.alert}</td>
                  <td className={adminCell}>
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <Link
                          href={
                            party.phase === "Vérification"
                              ? `/admin/parties/${party.id}/scores`
                              : party.phase === "Manche active"
                                ? `/admin/parties/${party.id}/monitor`
                                : `/admin/parties/${party.id}/control`
                          }
                        />
                      }
                    >
                      {party.action}
                      <ArrowRight />
                    </Button>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </AdminSection>

          <div className="space-y-4">
            <AdminSection title="Prochaine action" description="Qualificatif Douala #07">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-amber-400" />
                  <AdminStatus tone="warning">Décision requise</AdminStatus>
                </div>
                <p className="mt-3 text-sm font-medium">Confirmer l’ouverture avec 3 absents</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Le démarrage reste manuel et demandera une raison auditée.
                </p>
                <Button
                  className="mt-4 w-full"
                  render={<Link href="/admin/parties/arena-qualifier-07/control" />}
                >
                  Examiner la préparation
                  <ArrowRight />
                </Button>
              </div>
            </AdminSection>
            <AdminSection title="Santé plateforme">
              <div className="space-y-3 p-4 text-xs">
                <div className="flex justify-between">
                  <span>Transport temps réel</span>
                  <AdminStatus tone="success">Stable</AdminStatus>
                </div>
                <div className="flex justify-between">
                  <span>Dernier snapshot</span>
                  <span>il y a 4 s</span>
                </div>
                <div className="flex justify-between">
                  <span>Command lease</span>
                  <AdminStatus tone="success">Détenu</AdminStatus>
                </div>
              </div>
            </AdminSection>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
