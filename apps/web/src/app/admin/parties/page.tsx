import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import {
  AdminSection,
  AdminStatus,
  AdminTable,
  adminCell,
} from "@/components/admin/AdminWorkspace";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";

export default function AdminPartiesPage() {
  const parties = [
    [
      "arena-qualifier-07",
      "Qualificatif Douala #07",
      "Préparation",
      "15 juil. 18:30",
      "42 / 64",
      "3 absents",
      "il y a 1 min",
    ],
    [
      "friday-rush-12",
      "Friday Rush #12",
      "Manche active",
      "En direct",
      "31 / 32",
      "1 reconnexion",
      "il y a 4 s",
    ],
    [
      "champions-night",
      "Champions Night",
      "Vérification",
      "Manche terminée",
      "16 / 16",
      "2 revues",
      "il y a 22 s",
    ],
    ["august-open", "Open d’août", "Brouillon", "2 août 19:00", "0 / 128", "Gate contenu", "hier"],
    [
      "saturday-finals",
      "Finale du samedi",
      "Terminée",
      "12 juil. 20:00",
      "24 / 24",
      "Aucun",
      "12 juil.",
    ],
  ];
  return (
    <AppShell
      audience="Admin"
      eyebrow="Opérations"
      title="Parties"
      subtitle="Créer, planifier et piloter les sessions. Publier une fiche ne démarre jamais le live."
      actions={
        <Button render={<Link href="/admin/parties/new" />}>
          <Plus />
          Nouvelle partie
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" aria-label="Filtres de phases">
          {[
            "Toutes 12",
            "Brouillon 3",
            "Planifiées 4",
            "Préparation 2",
            "Live 1",
            "Vérification 1",
            "Terminées 1",
          ].map((filter, index) => (
            <Button key={filter} size="sm" variant={index === 0 ? "default" : "outline"}>
              {filter}
            </Button>
          ))}
        </div>
        <AdminSection
          title="Toutes les parties"
          description="État autoritaire, anomalies et raccourcis vers la surface adaptée."
        >
          <AdminTable
            headers={[
              "Nom",
              "État",
              "Horaire",
              "Participants",
              "Anomalies",
              "Dernière mise à jour",
              "Actions",
            ]}
            label="Liste des parties administrées"
          >
            {parties.map(([id, name, phase, schedule, participants, anomaly, updated]) => (
              <tr key={id}>
                <td className={`${adminCell} font-medium`}>{name}</td>
                <td className={adminCell}>
                  <AdminStatus
                    tone={
                      phase === "Manche active"
                        ? "success"
                        : phase === "Vérification" || phase === "Préparation"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {phase}
                  </AdminStatus>
                </td>
                <td className={adminCell}>{schedule}</td>
                <td className={adminCell}>{participants}</td>
                <td className={adminCell}>{anomaly}</td>
                <td className={adminCell}>{updated}</td>
                <td className={adminCell}>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/admin/parties/${id}/setup`} />}
                    >
                      Setup
                    </Button>
                    <Button size="sm" render={<Link href={`/admin/parties/${id}/control`} />}>
                      Ouvrir
                      <ArrowRight />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        </AdminSection>
      </div>
    </AppShell>
  );
}
