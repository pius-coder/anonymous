import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Clock3, Wifi } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadonlyBadge } from "@/components/ui/ReadonlyBadge";

export function PlayerReadonlySnapshot({
  partyId,
  playerId,
}: {
  partyId: string;
  playerId: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReadonlyBadge label="Snapshot joueur support" />
        <Button variant="outline" render={<Link href={`/support/parties/${partyId}`} />}>
          <ArrowLeft /> Retour au dossier
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Malo K.</CardTitle>
            <CardDescription>Référence redigée {playerId} · Partie AURORA-21</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <State icon={Clock3} label="Phase joueur" value="Manche active" />
            <State icon={Wifi} label="Connexion" value="Reconnexion requise" />
            <State icon={CheckCircle2} label="Dernier input" value="Reçu à 15:41:08" />
            <State icon={Ban} label="Erreur bloquante" value="Fenêtre expirée" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Statuts autorisés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Status label="Préparation" value="Présent et prêt" />
            <Status label="Admission" value="Confirmée" />
            <Status label="Round" value="Déconnecté temporairement" />
            <Status label="Feedback" value="Dernière commande reçue" />
          </CardContent>
        </Card>
      </div>
      <Alert>
        <Ban />
        <AlertTitle>Champs absents de cette projection</AlertTitle>
        <AlertDescription>
          Réponses cachées, score provisoire, token live et secrets provider ne sont pas transmis au
          composant support.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function State({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border-2 bg-muted/20 p-3">
      <Icon className="mb-2 size-4 text-primary" />
      <span className="block text-xs text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline">{value}</Badge>
    </div>
  );
}
