import { Badge } from "@/components/retroui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export function SessionStatesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-2xl uppercase">États préparés</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge>Lobby</Badge>
        <Badge variant="secondary">Check-in</Badge>
        <Badge variant="outline">Round</Badge>
        <Badge variant="outline">Résultats</Badge>
      </CardContent>
    </Card>
  );
}
