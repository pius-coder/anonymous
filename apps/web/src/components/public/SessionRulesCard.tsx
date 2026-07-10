import { Badge } from "@/components/retroui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/retroui/card";

export function SessionRulesCard() {
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="font-head text-2xl uppercase">Règles essentielles</CardTitle>
        <CardAction>
          <Badge variant="outline">Lisible avant inscription</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm leading-7 text-muted-foreground md:grid-cols-2">
        <p>&bull; Les sessions sont supervisées par serveur pour garantir l&apos;équité.</p>
        <p>&bull; Les résultats sont auditables après validation officielle.</p>
        <p>&bull; Le paiement doit être confirmé avant l&apos;accès à la session.</p>
        <p>&bull; La politique d&apos;annulation doit être consultée avant inscription.</p>
      </CardContent>
    </Card>
  );
}
