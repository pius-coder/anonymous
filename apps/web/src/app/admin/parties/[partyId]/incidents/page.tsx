import { AlertTriangle, Search, ShieldAlert } from "lucide-react";
import {
  AdminMetric,
  AdminSection,
  AdminStatus,
  AdminTable,
  PartyAdminNav,
  adminCell,
} from "@/components/admin/AdminWorkspace";
import { SensitiveActionPanel } from "@/components/admin/SensitiveActionPanel";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function AdminPartyIncidentsPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId: raw } = await params;
  const partyId = decodeURIComponent(raw);
  return (
    <AppShell
      audience="Admin"
      eyebrow="Risques et support"
      title="Incidents et signaux"
      subtitle="Signaux anti-triche redigés, ownership et résolution traçable. Les preuves secrètes restent côté serveur."
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="incidents" />
        <section className="grid gap-3 sm:grid-cols-3">
          <AdminMetric
            icon={ShieldAlert}
            label="Ouverts"
            value="03"
            detail="1 priorité élevée"
            tone="danger"
          />
          <AdminMetric
            icon={AlertTriangle}
            label="Signaux à qualifier"
            value="07"
            detail="5 regroupés"
            tone="warning"
          />
          <AdminMetric
            icon={ShieldAlert}
            label="Résolus aujourd’hui"
            value="04"
            detail="délai médian 18 min"
          />
        </section>
        <AdminSection title="Recherche et filtres">
          <div className="flex flex-wrap gap-3 p-4">
            <label className="relative min-w-64 flex-1">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
              <Input
                className="pl-9"
                placeholder="Incident, joueur, round ou corrélation"
                aria-label="Rechercher un incident"
              />
            </label>
            <select className="h-9 border border-input bg-transparent px-3 text-xs">
              <option>Toutes sévérités</option>
              <option>Élevée</option>
              <option>Moyenne</option>
              <option>Faible</option>
            </select>
            <select className="h-9 border border-input bg-transparent px-3 text-xs">
              <option>Tous statuts</option>
              <option>Ouvert</option>
              <option>En cours</option>
              <option>Résolu</option>
            </select>
            <Button>Filtrer</Button>
          </div>
        </AdminSection>
        <AdminSection
          title="Incidents actifs"
          description="Les actions sont limitées au workflow incident; aucune correction de score depuis cet écran."
        >
          <AdminTable
            headers={["ID", "Sévérité", "Statut", "Owner", "Lié à", "Résumé", "Action"]}
            label="Incidents actifs"
          >
            <tr>
              <td className={adminCell}>INC-184</td>
              <td className={adminCell}>
                <AdminStatus tone="danger">Élevée</AdminStatus>
              </td>
              <td className={adminCell}>
                <AdminStatus tone="warning">En cours</AdminStatus>
              </td>
              <td className={adminCell}>support.aline</td>
              <td className={adminCell}>Cedric M. · R2</td>
              <td className={adminCell}>Rafale de commandes hors fenêtre</td>
              <td className={adminCell}>
                <Button size="sm" variant="outline">
                  Ouvrir
                </Button>
              </td>
            </tr>
            <tr>
              <td className={adminCell}>INC-181</td>
              <td className={adminCell}>
                <AdminStatus tone="warning">Moyenne</AdminStatus>
              </td>
              <td className={adminCell}>
                <AdminStatus tone="info">Assigné</AdminStatus>
              </td>
              <td className={adminCell}>admin.nadine</td>
              <td className={adminCell}>Junior T. · Lobby</td>
              <td className={adminCell}>Reconnexions répétées</td>
              <td className={adminCell}>
                <Button size="sm" variant="outline">
                  Ouvrir
                </Button>
              </td>
            </tr>
            <tr>
              <td className={adminCell}>INC-179</td>
              <td className={adminCell}>
                <AdminStatus>Faible</AdminStatus>
              </td>
              <td className={adminCell}>
                <AdminStatus tone="warning">Ouvert</AdminStatus>
              </td>
              <td className={adminCell}>Non assigné</td>
              <td className={adminCell}>Annonce #904</td>
              <td className={adminCell}>Échec livraison redigé</td>
              <td className={adminCell}>
                <Button size="sm" variant="outline">
                  Assigner
                </Button>
              </td>
            </tr>
          </AdminTable>
        </AdminSection>
        <div className="grid gap-4 xl:grid-cols-2">
          <AdminSection
            title="Risk signals regroupés"
            description="Corrélation redigée par le service anti-triche."
          >
            <div className="divide-y divide-border text-xs">
              <div className="p-4">
                <div className="flex justify-between">
                  <strong>RATE_PATTERN · cluster 7</strong>
                  <AdminStatus tone="warning">À qualifier</AdminStatus>
                </div>
                <p className="mt-2 text-muted-foreground">
                  4 signaux · 1 participant · round 2 · confiance modérée
                </p>
              </div>
              <div className="p-4">
                <div className="flex justify-between">
                  <strong>NONCE_DUPLICATE · cluster 3</strong>
                  <AdminStatus tone="success">Expliqué</AdminStatus>
                </div>
                <p className="mt-2 text-muted-foreground">
                  Rejeu réseau pendant recovery window; aucun impact score.
                </p>
              </div>
            </div>
          </AdminSection>
          <SensitiveActionPanel
            title="Résoudre INC-184"
            description="La résolution clôt le dossier mais ne change ni score ni sanction automatiquement."
            actionLabel="Confirmer la résolution"
            consequence="l’incident sera clôturé avec la raison saisie et restera dans l’audit."
            tone="danger"
          />
        </div>
      </div>
    </AppShell>
  );
}
