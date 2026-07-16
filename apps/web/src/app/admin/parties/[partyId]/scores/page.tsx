import { AlertTriangle, CheckCircle2, FileCheck2, Trophy } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function AdminPartyScoresPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId: raw } = await params;
  const partyId = decodeURIComponent(raw);
  const scores = [
    ["Mireille N.", "8 420", "ev_84c…19a", "Aucune", "Vérifié"],
    ["Cedric M.", "8 190", "ev_f11…3cd", "Late inputs x2", "À revoir"],
    ["Aïcha B.", "7 980", "ev_29d…b80", "Aucune", "Vérifié"],
    ["Junior T.", "7 110", "ev_c72…fa1", "Déconnexion", "À revoir"],
  ];
  return (
    <AppShell
      audience="Admin"
      eyebrow="Publication · accès restreint"
      title="Scores provisoires"
      subtitle="Vérifier les preuves redigées, documenter les corrections, puis publier une version officielle explicite."
    >
      <div className="space-y-4">
        <PartyAdminNav partyId={partyId} current="scores" />
        <div className="flex flex-wrap items-center justify-between gap-3 border border-amber-700/60 bg-amber-950/30 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-amber-200">
              SCORE_UNDER_REVIEW · version provisoire 4
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Joueurs et observateurs ne voient aucun de ces scores.
            </p>
          </div>
          <AdminStatus tone="danger">Publication bloquée · 2 revues</AdminStatus>
        </div>
        <section className="grid gap-3 sm:grid-cols-3">
          <AdminMetric
            icon={Trophy}
            label="Scores reçus"
            value="39 / 39"
            detail="calcul serveur terminé"
          />
          <AdminMetric
            icon={CheckCircle2}
            label="Vérifiés"
            value="37"
            detail="2 revues restantes"
            tone="warning"
          />
          <AdminMetric
            icon={AlertTriangle}
            label="Anomalies"
            value="02"
            detail="aucune critique"
            tone="warning"
          />
        </section>
        <AdminSection
          title="Table de vérification"
          description="Evidence sous forme d’identifiant redigé; les payloads privés restent hors interface."
        >
          <AdminTable
            headers={["Joueur", "Score provisoire", "Evidence", "Anomalie", "Review", "Action"]}
            label="Scores provisoires"
          >
            <>
              {scores.map(([player, score, evidence, anomaly, review]) => (
                <tr key={player}>
                  <td className={`${adminCell} font-medium`}>{player}</td>
                  <td className={adminCell}>{score}</td>
                  <td className={`${adminCell} font-mono`}>{evidence}</td>
                  <td className={adminCell}>{anomaly}</td>
                  <td className={adminCell}>
                    <AdminStatus tone={review === "Vérifié" ? "success" : "warning"}>
                      {review}
                    </AdminStatus>
                  </td>
                  <td className={adminCell}>
                    <Button size="sm" variant="outline">
                      Examiner
                    </Button>
                  </td>
                </tr>
              ))}
            </>
          </AdminTable>
        </AdminSection>
        <div className="grid gap-4 xl:grid-cols-2">
          <AdminSection
            title="Correction auditée"
            description="Disponible avec la permission RESULT_VERIFY."
          >
            <form className="grid gap-3 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="score-player">Participant</Label>
                <select
                  id="score-player"
                  className="h-9 border border-input bg-transparent px-3 text-sm"
                >
                  <option>Cedric M. · 8 190</option>
                  <option>Junior T. · 7 110</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="score-value">Nouveau score</Label>
                <Input id="score-value" type="number" defaultValue="8190" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="score-reason">Raison obligatoire</Label>
                <Textarea
                  id="score-reason"
                  placeholder="Expliquer l’écart et référencer l’évidence"
                />
              </div>
              <div className="border border-border bg-muted/30 p-3 text-xs">
                <p className="font-medium">Preview version 5</p>
                <p className="mt-1 text-muted-foreground">
                  Ancien score 8 190 → nouveau score saisi · classement recalculé côté serveur
                </p>
              </div>
              <Button type="button" variant="outline">
                <FileCheck2 />
                Valider la correction
              </Button>
            </form>
          </AdminSection>
          <SensitiveActionPanel
            title="Publier les résultats"
            description="Crée la version officielle visible par les audiences autorisées et débloque les jobs de gains. Cette action ne modifie jamais le ledger directement."
            actionLabel="Publier la version officielle"
            consequence="les résultats deviennent publics et les gains post-publication peuvent être traités."
            disabled
            disabledReason="2 scores doivent encore être vérifiés."
            tone="danger"
          />
        </div>
      </div>
    </AppShell>
  );
}
