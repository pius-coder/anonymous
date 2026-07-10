import type { SessionDetail } from "@/services/sessions/types";
import { Badge } from "@/components/retroui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date à confirmer";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionInfoCard({ session }: { session: SessionDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-2xl uppercase">Détails</CardTitle>
        <CardAction>
          <Badge variant="secondary">Serveur</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Début</span>
          <span className="text-right font-medium">{formatDate(session.startTime)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Inscription</span>
          <span className="font-mono font-black tabular-nums">
            {formatCurrency(session.entryFee)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Crédits internes configurés</span>
          <span className="font-mono font-black tabular-nums">
            {formatCurrency(session.prizePool)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
