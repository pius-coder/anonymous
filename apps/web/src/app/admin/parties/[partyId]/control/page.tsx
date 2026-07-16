import { Activity, AlertTriangle, Clock3, Radio, Send, ShieldCheck, Users } from "lucide-react";
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
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { Textarea } from "@/components/ui/textarea";

export default async function AdminRoundControlPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId: rawPartyId } = await params;
  const partyId = decodeURIComponent(rawPartyId);
  const participants = [
    ["Mireille N.", "REGISTERED", "OK", "PRESENT", "READY", "Connecté"],
    ["Junior T.", "REGISTERED", "OK", "ABSENT", "WAITING", "Hors ligne"],
    ["Aïcha B.", "REGISTERED", "BLOCKED", "PRESENT", "WAITING", "Connecté"],
    ["Cedric M.", "REGISTERED", "OK", "PRESENT", "READY", "Reconnexion"],
  ];
  return (
    <AppShell
      audience="Admin"
      eyebrow="Command center · décideur"
      title="Qualificatif Douala #07"
      subtitle="Commandes manuelles auditables. La lecture, la décision et la publication utilisent des surfaces séparées."
      actions={
        <div className="flex items-center gap-2">
          <ConnectionStatus state="stable" />
          <AdminStatus tone="success">Lease: vous · 04:32</AdminStatus>
        </div>
      }
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="control" />
        <div className="flex flex-wrap items-center justify-between gap-3 border border-amber-700/60 bg-amber-950/30 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-amber-200">PREPARATION_OPEN</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Snapshot synchronisé il y a 4 secondes · décision attendue
            </p>
          </div>
          <AdminStatus tone="warning">3 absents</AdminStatus>
        </div>

        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Synthèse de la préparation"
        >
          <AdminMetric icon={Users} label="Participants" value="42 / 64" detail="39 présents" />
          <AdminMetric
            icon={ShieldCheck}
            label="Prêts"
            value="36"
            detail="3 présents en attente"
            tone="warning"
          />
          <AdminMetric icon={Radio} label="Connexions" value="38" detail="1 reconnexion en cours" />
          <AdminMetric
            icon={AlertTriangle}
            label="Signaux"
            value="03"
            detail="1 blocage paiement"
            tone="danger"
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <div className="space-y-4">
            <AdminSection
              title="Participants et readiness"
              description="Projection opérationnelle; aucune action ne contrôle le client joueur."
              action={
                <Button size="sm" variant="outline">
                  Paiement bloqué · 1
                </Button>
              }
            >
              <AdminTable
                headers={["Joueur", "Participation", "Paiement", "Présence", "Prêt", "Connexion"]}
                label="Participants et états de préparation"
              >
                {participants.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td key={cell} className={adminCell}>
                        {index === 0 ? (
                          <span className="font-medium">{cell}</span>
                        ) : index === 2 && cell === "BLOCKED" ? (
                          <AdminStatus tone="danger">{cell}</AdminStatus>
                        ) : index >= 3 ? (
                          <AdminStatus
                            tone={
                              cell === "READY" || cell === "PRESENT" || cell === "Connecté"
                                ? "success"
                                : "warning"
                            }
                          >
                            {cell}
                          </AdminStatus>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </AdminTable>
            </AdminSection>

            <AdminSection
              title="Annonce de préparation"
              description="L’annonce est tracée et notifiée; elle ne change jamais le lifecycle."
            >
              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  <Textarea
                    aria-label="Message de l’annonce"
                    defaultValue="Le lobby ferme dans 10 minutes. Vérifiez votre connexion et votre statut prêt."
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      className="h-9 border border-input bg-transparent px-3 text-xs"
                      aria-label="Cible de l’annonce"
                    >
                      <option>Participants éligibles</option>
                      <option>Tous les inscrits</option>
                      <option>Absents uniquement</option>
                    </select>
                    <Button>
                      <Send />
                      Envoyer l’annonce
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="font-semibold">Dernière livraison · job #ANN-904</p>
                  <div className="flex justify-between">
                    <span>Envoyés</span>
                    <span className="text-emerald-300">39</span>
                  </div>
                  <div className="flex justify-between">
                    <span>En attente</span>
                    <span>2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Échec</span>
                    <span className="text-rose-300">1 · canal indisponible</span>
                  </div>
                  <Button size="sm" variant="outline">
                    Réessayer l’échec
                  </Button>
                </div>
              </div>
            </AdminSection>

            <AdminSection
              title="Timeline récente"
              description="Événements live et commandes corrélées."
            >
              <AdminTable
                headers={["Heure", "Acteur", "Événement", "Résultat", "Corrélation"]}
                label="Timeline récente"
              >
                <tr>
                  <td className={adminCell}>18:14:04</td>
                  <td className={adminCell}>système</td>
                  <td className={adminCell}>snapshot.updated</td>
                  <td className={adminCell}>
                    <AdminStatus tone="success">OK</AdminStatus>
                  </td>
                  <td className={adminCell}>cor_74bf</td>
                </tr>
                <tr>
                  <td className={adminCell}>18:12:30</td>
                  <td className={adminCell}>admin.nadine</td>
                  <td className={adminCell}>announcement.sent</td>
                  <td className={adminCell}>
                    <AdminStatus tone="warning">PARTIEL</AdminStatus>
                  </td>
                  <td className={adminCell}>cor_739a</td>
                </tr>
                <tr>
                  <td className={adminCell}>18:09:11</td>
                  <td className={adminCell}>player.021</td>
                  <td className={adminCell}>participant.reconnected</td>
                  <td className={adminCell}>
                    <AdminStatus tone="success">OK</AdminStatus>
                  </td>
                  <td className={adminCell}>cor_71d2</td>
                </tr>
              </AdminTable>
            </AdminSection>
          </div>

          <aside className="space-y-4" aria-label="Rail de décisions sensibles">
            <AdminSection title="Configuration de la manche">
              <div className="space-y-3 p-4 text-xs">
                <div className="flex justify-between">
                  <span>Mini-jeu</span>
                  <strong>Memory Sequence</strong>
                </div>
                <div className="flex justify-between">
                  <span>Manifest</span>
                  <span>v1.4.2</span>
                </div>
                <div className="flex justify-between">
                  <span>Durée</span>
                  <span>180 s</span>
                </div>
                <div className="flex justify-between">
                  <span>Admis</span>
                  <span>39</span>
                </div>
                <div className="flex justify-between">
                  <span>Phase cible</span>
                  <AdminStatus tone="info">BRIEFING</AdminStatus>
                </div>
              </div>
            </AdminSection>
            <SensitiveActionPanel
              title="Confirmer avec absents"
              description="3 inscrits ne sont pas présents. Leur exclusion sera enregistrée dans l’audit."
              actionLabel="Confirmer les admis"
              consequence="3 absents ne seront pas admis à cette manche."
              tone="danger"
            />
            <SensitiveActionPanel
              title="Lancer le briefing"
              description="Fige la liste des admis et diffuse les règles publiques. Aucun input compétitif n’est encore accepté."
              actionLabel="Lancer le briefing"
              consequence="39 joueurs recevront le briefing, sans démarrer la manche."
            />
            <SensitiveActionPanel
              title="Démarrer la manche"
              description="Disponible après le briefing et un snapshot live récent."
              actionLabel="Démarrer la manche"
              consequence="les inputs compétitifs seront acceptés pendant 180 secondes."
              disabled
              disabledReason="La phase actuelle est PREPARATION_OPEN; lancer d’abord le briefing."
            />
          </aside>
        </div>

        <AdminSection
          title="Signaux live"
          description="Données redigées, sans payload brut ni secret anti-triche."
        >
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card p-4">
              <Clock3 size={17} className="text-amber-400" />
              <p className="mt-2 text-xl font-semibold">2</p>
              <p className="text-xs text-muted-foreground">late inputs</p>
            </div>
            <div className="bg-card p-4">
              <Activity size={17} className="text-cyan-400" />
              <p className="mt-2 text-xl font-semibold">0</p>
              <p className="text-xs text-muted-foreground">duplicate nonce</p>
            </div>
            <div className="bg-card p-4">
              <Radio size={17} className="text-amber-400" />
              <p className="mt-2 text-xl font-semibold">1</p>
              <p className="text-xs text-muted-foreground">reconnexion</p>
            </div>
            <div className="bg-card p-4">
              <AlertTriangle size={17} className="text-rose-400" />
              <p className="mt-2 text-xl font-semibold">0</p>
              <p className="text-xs text-muted-foreground">suspicious rate</p>
            </div>
          </div>
        </AdminSection>
      </div>
    </AppShell>
  );
}
