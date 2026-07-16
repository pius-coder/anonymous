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

export default async function AdminPartyMonitorPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId: raw } = await params;
  const partyId = decodeURIComponent(raw);
  return (
    <AppShell
      audience="Admin"
      eyebrow="Supervision"
      title="Monitor live"
      subtitle="Projection filtrée en lecture seule. Aucune commande de manche, correction ou publication n’est disponible ici."
      actions={
        <div className="flex gap-2">
          <ReadonlyBadge />
          <ConnectionStatus state="stable" />
        </div>
      }
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="monitor" />
        <div className="flex items-center justify-between border border-cyan-800 bg-cyan-950/30 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-cyan-200">ROUND_ACTIVE · Manche 2/4</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Deadline serveur 18:27:30 · snapshot il y a 3 s
            </p>
          </div>
          <AdminStatus tone="success">LIVE STABLE</AdminStatus>
        </div>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetric icon={Users} label="Connectés" value="38 / 39" detail="1 reconnexion" />
          <AdminMetric
            icon={Activity}
            label="Progression"
            value="64%"
            detail="24 joueurs terminés"
          />
          <AdminMetric icon={Radio} label="Latence P95" value="86 ms" detail="dans la cible" />
          <AdminMetric icon={Eye} label="Spectateurs" value="127" detail="snapshot public filtré" />
        </section>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <AdminSection
            title="Progression participants"
            description="État autorisé uniquement; aucune réponse privée ni score provisoire."
          >
            <AdminTable
              headers={["Joueur", "Connexion", "État", "Dernier événement", "Anomalie"]}
              label="Progression des participants"
            >
              <tr>
                <td className={adminCell}>Mireille N.</td>
                <td className={adminCell}>
                  <AdminStatus tone="success">Connectée</AdminStatus>
                </td>
                <td className={adminCell}>En jeu</td>
                <td className={adminCell}>commande acceptée · 4 s</td>
                <td className={adminCell}>Aucune</td>
              </tr>
              <tr>
                <td className={adminCell}>Cedric M.</td>
                <td className={adminCell}>
                  <AdminStatus tone="warning">Reconnexion</AdminStatus>
                </td>
                <td className={adminCell}>Gelé</td>
                <td className={adminCell}>socket fermé · 18 s</td>
                <td className={adminCell}>Recovery #2</td>
              </tr>
              <tr>
                <td className={adminCell}>Aïcha B.</td>
                <td className={adminCell}>
                  <AdminStatus tone="success">Connectée</AdminStatus>
                </td>
                <td className={adminCell}>Terminé</td>
                <td className={adminCell}>round completed · 31 s</td>
                <td className={adminCell}>Aucune</td>
              </tr>
            </AdminTable>
          </AdminSection>
          <AdminSection title="Snapshot public">
            <div className="aspect-video bg-zinc-950 p-4">
              <div className="flex h-full items-center justify-center border border-dashed border-zinc-700 text-center">
                <div>
                  <Eye className="mx-auto text-cyan-400" />
                  <p className="mt-3 text-sm font-medium">Memory Sequence · vue filtrée</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Séquences privées et réponses masquées
                  </p>
                </div>
              </div>
            </div>
          </AdminSection>
        </div>
        <AdminSection title="Événements live filtrés">
          <AdminTable
            headers={["Heure", "Type", "Audience", "Résumé", "Corrélation"]}
            label="Événements live filtrés"
          >
            <tr>
              <td className={adminCell}>18:24:27</td>
              <td className={adminCell}>player.progressed</td>
              <td className={adminCell}>ADMIN_READONLY</td>
              <td className={adminCell}>Progression agrégée mise à jour</td>
              <td className={adminCell}>evt_c82f</td>
            </tr>
            <tr>
              <td className={adminCell}>18:24:12</td>
              <td className={adminCell}>player.reconnecting</td>
              <td className={adminCell}>ADMIN_READONLY</td>
              <td className={adminCell}>Recovery window ouverte</td>
              <td className={adminCell}>evt_c7aa</td>
            </tr>
          </AdminTable>
        </AdminSection>
      </div>
    </AppShell>
  );
}
