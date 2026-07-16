import Link from "next/link";
import { CheckCircle2, CircleAlert, Eye, Save } from "lucide-react";
import { AdminSection, AdminStatus, PartyAdminNav } from "@/components/admin/AdminWorkspace";
import { SensitiveActionPanel } from "@/components/admin/SensitiveActionPanel";
import { AppShell } from "@/components/ui/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PartySetupView({ partyId, mode }: { partyId: string; mode: "create" | "edit" }) {
  const isCreate = mode === "create";
  return (
    <AppShell
      audience="Admin"
      eyebrow={isCreate ? "Nouvelle partie" : "Configuration"}
      title={isCreate ? "Créer un brouillon" : "Qualificatif Douala #07"}
      subtitle="Configuration, validation des gates et aperçu public avant toute publication."
      actions={
        <Button variant="outline">
          <Save />
          Enregistrer le brouillon
        </Button>
      }
    >
      <div className="space-y-4">
        {!isCreate ? <PartyAdminNav partyId={partyId} current="setup" /> : null}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
          <AdminSection
            title="Configuration"
            description="Les erreurs restent liées aux champs; aucune action ne lance le live."
          >
            <form className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="party-name">Nom public</Label>
                <Input
                  id="party-name"
                  defaultValue={isCreate ? "" : "Qualificatif Douala #07"}
                  placeholder="Nom de la partie"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-date">Date et heure</Label>
                <Input id="party-date" type="datetime-local" defaultValue="2026-07-15T18:30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-capacity">Capacité</Label>
                <Input id="party-capacity" type="number" defaultValue="64" min="2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-price">Prix d’entrée (XAF)</Label>
                <Input id="party-price" type="number" defaultValue="2500" min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="party-game">Mini-jeu pilote</Label>
                <select
                  id="party-game"
                  className="h-9 w-full border border-input bg-transparent px-3 text-sm"
                >
                  <option>Memory Sequence v1.4</option>
                  <option>Tap Rush v1.1</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="party-description">Description publique</Label>
                <Textarea
                  id="party-description"
                  defaultValue="Une soirée compétitive en quatre manches, ouverte aux joueurs confirmés."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="party-conditions">Conditions d’admission</Label>
                <Textarea
                  id="party-conditions"
                  defaultValue="Compte vérifié, paiement confirmé et présence au lobby 15 minutes avant le départ."
                />
              </div>
            </form>
          </AdminSection>
          <div className="space-y-4">
            <AdminSection
              title="Aperçu public"
              description="Projection exacte des informations accessibles au joueur."
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <AdminStatus tone="info">Ouverture des inscriptions</AdminStatus>
                  <Eye size={18} className="text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Qualificatif Douala #07</h3>
                <p className="mt-2 text-sm text-muted-foreground">15 juillet · 18:30 · 2 500 XAF</p>
                <p className="mt-3 text-sm">Quatre manches, 64 places. Compte vérifié requis.</p>
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  Exclus: gates internes, scores provisoires, audit et configuration runtime.
                </p>
              </div>
            </AdminSection>
            <AdminSection title="Gates de validation">
              <div className="space-y-3 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span>Conformité contenu</span>
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 size={15} />
                    OK
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Configuration paiement</span>
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 size={15} />
                    OK
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Assets mini-jeu</span>
                  <span className="flex items-center gap-1 text-amber-200">
                    <CircleAlert size={15} />1 avertissement
                  </span>
                </div>
              </div>
            </AdminSection>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SensitiveActionPanel
            title="Publier la fiche"
            description="Rend la partie visible au catalogue public sans ouvrir la préparation ni démarrer le live."
            actionLabel="Confirmer la publication"
            consequence="la fiche publique devient visible, mais aucun live ne démarre."
          />
          <SensitiveActionPanel
            title="Planifier l’ouverture"
            description="Programme l’ouverture de la préparation et les rappels. Le départ restera une commande admin."
            actionLabel="Confirmer la planification"
            consequence="la préparation s’ouvrira à l’horaire prévu sans lancer de manche."
          />
        </div>
        {isCreate ? (
          <Button variant="outline" render={<Link href="/admin/parties" />}>
            Retour aux parties
          </Button>
        ) : null}
      </div>
    </AppShell>
  );
}
