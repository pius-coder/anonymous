import type { SessionDetail } from "@/services/sessions/types";
import { Badge } from "@/components/retroui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";
import { Progress } from "@/components/retroui/progress";

export function SessionCapacityCard({
  session,
  isFull,
  registeredPlayers,
  fillPercent,
}: {
  session: SessionDetail;
  isFull: boolean;
  registeredPlayers: number;
  fillPercent: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-2xl uppercase">Capacité</CardTitle>
        <CardAction>
          <Badge variant={isFull ? "destructive" : "outline"}>
            {isFull ? "Complet" : `${session.placesRemaining} libre(s)`}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Capacité maximale</span>
          <span>{session.maxPlayers} joueurs</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Inscrits</span>
          <span>{registeredPlayers}</span>
        </div>
        <Progress value={fillPercent} aria-label="Remplissage de la session" />
      </CardContent>
    </Card>
  );
}
